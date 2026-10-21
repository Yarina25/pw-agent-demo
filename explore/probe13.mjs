import { chromium } from '@playwright/test';
import fs from 'node:fs';

const APP = 'https://s6.ink/testpilot-demo';
const out = { send: [], navReq: [], navRes: [] };
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

try {
  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('heading', { level: 1, name: '质量概览' }).waitFor({ timeout: 30_000 });
  await waitLoaded();

  const rec = (e, bucket) => {
    const r = e.request ? e.request() : e;
    const item = { method: r.method(), url: r.url().slice(0, 160) };
    if (e.status) item.status = e.status();
    bucket.push(item);
  };
  page.on('request', (r) => {
    if (r.method() !== 'GET') rec(r, out.send);
  });
  page.on('response', (r) => {
    if (r.request().method() !== 'GET') out.send.push({ res: r.status(), url: r.url().slice(0, 160) });
  });

  const floatPanel = page
    .locator('div.fixed')
    .filter({ hasText: 'TestPilot AI 助手' })
    .filter({ has: page.locator('textarea') });
  const input = floatPanel.getByPlaceholder('输入需求或问题，Enter 发送，Shift+Enter 换行');
  await input.fill(`网络探针-${Date.now()}`);
  await input.press('Enter');
  await page.getByText(/网络探针-/).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(2500);

  page.on('request', (r) => {
    if (r.url().includes('assistant') || r.url().includes('conversation') || r.url().includes('chat')) {
      out.navReq.push({ method: r.method(), url: r.url().slice(0, 160) });
    }
  });
  page.on('response', (r) => {
    if (r.url().includes('assistant') || r.url().includes('conversation') || r.url().includes('chat')) {
      out.navRes.push({ status: r.status(), url: r.url().slice(0, 160) });
    }
  });
  await page.getByRole('navigation').getByRole('link', { name: 'AI 助手', exact: true }).click();
  await page.waitForTimeout(5000);
  out.afterNavHasMsg = await page.locator('main').getByText(/网络探针-/).count();
  out.mainTail = (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(-200);
} catch (e) {
  out.error = String(e).slice(0, 1200);
} finally {
  fs.writeFileSync('explore/probe13.json', JSON.stringify(out, null, 2), 'utf8');
  await browser.close();
}
console.log('done');
