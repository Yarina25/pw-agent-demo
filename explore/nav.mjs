// 通过侧边栏点击逐页探索（SPA 内部路由），结果写 UTF-8 JSON
import { chromium } from '@playwright/test';
import fs from 'fs';

const base = 'https://s6.ink/testpilot-demo';
const navs = [
  '需求 & AI 生成',
  '用例库',
  '测试执行',
  '测试报告',
  '缺陷管理',
  'AI 助手',
  '面试题库',
  '知识库',
  '设置',
  '质量概览',
];

fs.mkdirSync('explore/nav', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });

const capture = async (label) => {
  await page.waitForTimeout(900);
  const data = await page.evaluate(() => {
    const clean = (s) => (s || '').trim().replace(/\s+/g, ' ');
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const collect = (sel) =>
      [...document.querySelectorAll(sel)].filter(visible).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: clean(el.innerText).slice(0, 100),
        placeholder: el.getAttribute('placeholder') || '',
        type: el.getAttribute('type') || '',
        href: el.getAttribute('href') || '',
        disabled: !!el.disabled,
        options: el.tagName === 'SELECT' ? [...el.options].map((o) => clean(o.text)) : undefined,
      }));
    return {
      title: document.title,
      h1: collect('h1').map((x) => x.text),
      h2: collect('h2').map((x) => x.text),
      buttons: collect('button, [role=button], [role=tab]'),
      inputs: collect('input, textarea, select'),
      tableText: [...document.querySelectorAll('table')].map((t) => clean(t.innerText).slice(0, 600)),
      bodyText: clean(document.body.innerText).slice(0, 3000),
      dialogs: [...document.querySelectorAll('[role=dialog]')].map((d) => clean(d.innerText).slice(0, 1000)),
    };
  });
  data.label = label;
  data.url = page.url();
  fs.writeFileSync(`explore/nav/${label.replace(/[\\/:*?"<>|\s&]/g, '_')}.json`, JSON.stringify(data, null, 2), 'utf8');
  console.log('OK', label, 'url=' + page.url(), 'buttons=' + data.buttons.length);
};

for (const name of navs) {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await capture(name);
}

await browser.close();
