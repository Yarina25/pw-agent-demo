import { chromium } from '@playwright/test';
import fs from 'node:fs';

const APP = 'https://s6.ink/testpilot-demo';
const out = {};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(20_000);

const waitLoaded = () =>
  page
    .waitForFunction(
      () => !/正在加载|加载中|加载面试题|加载知识条目|正在加载报告详情|加载设置/.test(document.body.innerText),
      null,
      { timeout: 25_000 },
    )
    .catch(() => {});
const nav = async (name) => {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await waitLoaded();
};

try {
  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('heading', { level: 1, name: '质量概览' }).waitFor({ timeout: 30_000 });
  await waitLoaded();

  const unique = `持久化探针-${Date.now()}`;
  const floatPanel = page
    .locator('div.fixed')
    .filter({ hasText: 'TestPilot AI 助手' })
    .filter({ has: page.locator('textarea') });
  await floatPanel
    .getByPlaceholder('输入需求或问题，Enter 发送，Shift+Enter 换行')
    .fill(unique);
  await floatPanel.getByPlaceholder('输入需求或问题，Enter 发送，Shift+Enter 换行').press('Enter');
  await page.getByText(unique).waitFor({ timeout: 15_000 });
  out.echoMs = 'ok';

  const replies = () => floatPanel.getByText(/请告诉我你要针对哪个需求或缺陷/);
  const before = await replies().count();
  const t0 = Date.now();
  await page
    .waitForFunction(
      (n) => document.querySelectorAll('div.fixed')[0].innerText.split('请告诉我你要针对哪个需求或缺陷').length - 1 > n,
      before,
      { timeout: 20_000 },
    )
    .catch(() => {});
  out.replyWaitMs = Date.now() - t0;

  // 额外等待 3s，观察是否是写入延迟
  await page.waitForTimeout(3000);
  await nav('AI 助手');
  out.inMainImmediately = await page.locator('main').getByText(unique).count();
  out.mainTail = (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(-260);

  await page.waitForTimeout(3000);
  out.inMainAfter3s = await page.locator('main').getByText(unique).count();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitLoaded();
  out.inMainAfterReload = await page.locator('main').getByText(unique).count();
  out.mainTailAfterReload = (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(-260);
} catch (e) {
  out.error = String(e).slice(0, 1200);
} finally {
  fs.writeFileSync('explore/probe12.json', JSON.stringify(out, null, 2), 'utf8');
  await browser.close();
}
console.log('done');
