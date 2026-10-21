// 复核辅助：悬浮助手发送行为、助手页回复文案
import { chromium } from '@playwright/test';
import fs from 'fs';

const base = 'https://s6.ink/testpilot-demo';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const r = {};
const uniq = `自动化探针-${Date.now()}`;
const waitLoaded = async () => {
  await page.waitForFunction(() => !/正在加载|加载中/.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
};

await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
await waitLoaded();

// 悬浮助手
const floatTa = page.getByPlaceholder('输入需求或问题，Enter 发送，Shift+Enter 换行');
r.floatCount = await floatTa.count();
await floatTa.fill(uniq);
await floatTa.press('Enter');
await page.waitForTimeout(2500);
r.float_after = {
  inputValue: await floatTa.inputValue().catch(() => 'n/a'),
  occurrences: await page.getByText(uniq).count(),
  bodyTail: (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(-500),
};

// AI 助手页发送
await page.getByRole('navigation').getByRole('link', { name: 'AI 助手', exact: true }).click();
await waitLoaded();
const inlineTa = page.locator('main').getByPlaceholder('输入需求或问题，Enter 发送，Shift+Enter 换行');
const uniq2 = `自动化探针B-${Date.now()}`;
await inlineTa.fill(uniq2);
await inlineTa.press('Enter');
await page.waitForTimeout(3000);
const mainText = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
r.assistant_after = {
  inputValue: await inlineTa.inputValue().catch(() => 'n/a'),
  occurrences: await page.getByText(uniq2).count(),
  tail: mainText.slice(-900),
};

fs.writeFileSync('explore/probe/assistant.json', JSON.stringify(r, null, 2), 'utf8');
console.log('OK');
await browser.close();
