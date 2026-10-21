// 结构探针：定位器作用域、导出下载、设置保存反馈、全局搜索是否发请求
import { chromium } from '@playwright/test';
import fs from 'fs';

const base = 'https://s6.ink/testpilot-demo';
const out = 'explore/probe';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const log = (...a) => console.log(...a);
const reqs = [];
page.on('request', (r) => {
  if (!/\.(png|jpg|svg|css|woff2?|js)(\?|$)/.test(r.url())) reqs.push(`${r.method()} ${r.url()}`);
});

const waitLoaded = async () => {
  await page
    .waitForFunction(() => !/正在加载|加载中|正在加载报告详情|加载设置/.test(document.body.innerText), null, { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(400);
};
const nav = async (name) => {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await waitLoaded();
};

await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
await waitLoaded();

// 1) DOM 结构
const dom = await page.evaluate(() => {
  const chain = (el) => {
    const out = [];
    let n = el;
    for (let i = 0; i < 6 && n; i++, n = n.parentElement)
      out.push(`${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`);
    return out;
  };
  const h1 = document.querySelector('h1');
  const navEl = document.querySelector('[role=navigation], nav');
  const ta = [...document.querySelectorAll('textarea')];
  return {
    mains: document.querySelectorAll('main').length,
    h1Chain: h1 ? chain(h1) : null,
    navChain: navEl ? chain(navEl) : null,
    textareas: ta.map((t) => ({ ph: t.getAttribute('placeholder'), chain: chain(t).slice(0, 4) })),
    testIds: [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid')),
  };
});
fs.writeFileSync(`${out}/dom.json`, JSON.stringify(dom, null, 2), 'utf8');
log('DOM', JSON.stringify(dom, null, 2));

// 2) 全局搜索是否发请求
reqs.length = 0;
const gs = page.getByPlaceholder('搜索用例 / 缺陷 / 执行记录');
await gs.fill('BUG-2201');
await gs.press('Enter');
await page.waitForTimeout(2000);
const afterEnter = await page.evaluate(() => ({
  url: location.pathname,
  hasResultText: /搜索结果|未找到|无结果/.test(document.body.innerText),
}));
fs.writeFileSync(`${out}/search.json`, JSON.stringify({ afterEnter, reqs }, null, 2), 'utf8');
log('SEARCH', JSON.stringify({ afterEnter, reqs }));
await gs.fill('');

// 3) 报告导出
await nav('测试报告');
let download = null;
try {
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 6000 }),
    page.getByRole('button', { name: '导出报告', exact: true }).click(),
  ]);
  download = { suggestedFilename: dl.suggestedFilename() };
} catch (e) {
  download = { error: String(e.message).split('\n')[0] };
  await page.screenshot({ path: `${out}/export_fail.png`, fullPage: true });
}
log('DOWNLOAD', JSON.stringify(download));
fs.writeFileSync(`${out}/download.json`, JSON.stringify(download, null, 2), 'utf8');

// 4) 设置保存
await nav('设置');
const before = await page.evaluate(() => document.body.innerText.match(/默认并发数\s*([\d]+)/)?.[1]);
const nums = page.locator('input[type=number]');
const beforeVal = await nums.first().inputValue();
reqs.length = 0;
await nums.first().fill('6');
await page.getByRole('button', { name: '保存配置', exact: true }).click();
await page.waitForTimeout(2000);
const afterSave = await page.evaluate(() => ({
  body: document.body.innerText.replace(/\s+/g, ' ').slice(-600),
  toast: [...document.querySelectorAll('[role=status],[role=alert],[class*=toast]')].map((e) => e.innerText.trim()),
}));
fs.writeFileSync(`${out}/settings_save.json`, JSON.stringify({ before, beforeVal, afterSave, reqs }, null, 2), 'utf8');
log('SETTINGS', JSON.stringify({ before, beforeVal, afterSave, reqs }));

// 还原
await nums.first().fill(beforeVal);
await page.getByRole('button', { name: '保存配置', exact: true }).click();
await page.waitForTimeout(1200);
const restored = await nums.first().inputValue();
log('RESTORED', restored);

await browser.close();
