// 生成前实时校验：确认每个路由 main 作用域可用并采集断言基线
import { chromium } from '@playwright/test';
import fs from 'fs';

const base = 'https://s6.ink/testpilot-demo';
const routes = ['质量概览', '需求 & AI 生成', '用例库', '测试执行', '测试报告', '缺陷管理', 'AI 助手', '面试题库', '知识库', '设置'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const out = {};

const waitLoaded = async () => {
  await page
    .waitForFunction(() => !/正在加载|加载中|加载面试题|加载知识条目|正在加载报告详情|加载设置/.test(document.body.innerText), null, { timeout: 25000 })
    .catch(() => {});
  await page.waitForTimeout(500);
};

await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
await waitLoaded();

for (const r of routes) {
  await page.getByRole('navigation').getByRole('link', { name: r, exact: true }).click();
  await waitLoaded();
  const main = page.locator('main');
  out[r] = {
    url: page.url(),
    mainCount: await main.count(),
    mainLen: (await main.innerText().catch(() => '')).length,
    head: (await main.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160),
    h1: await page.locator('h1').allInnerTexts(),
    comboboxes: await page.getByRole('combobox').count(),
    mainSelects: await page.locator('main select').count(),
    mainRows: await page.locator('main table tbody tr').count(),
  };
}

fs.writeFileSync('explore/probe/routes.json', JSON.stringify(out, null, 2), 'utf8');
console.log('OK');
await browser.close();
