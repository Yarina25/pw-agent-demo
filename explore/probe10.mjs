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

  // ===== 缺陷详情弹窗定位器 =====
  await nav('缺陷管理');
  await page.locator('main').getByRole('button', { name: '列表视图', exact: true }).click();
  await waitLoaded();
  await page.locator('main table tbody tr').filter({ hasText: 'BUG-2209' }).click();
  await page.getByText('缺陷详情 · BUG-2209').waitFor({ timeout: 10_000 });
  out.modalCount = await page.locator('div.fixed.inset-0.z-50').count();
  out.modalHasH3 = await page
    .locator('div.fixed.inset-0.z-50')
    .getByText('缺陷详情 · BUG-2209')
    .count();
  out.modalModuleMatches = await page
    .locator('div.fixed.inset-0.z-50')
    .getByText('交易链路', { exact: true })
    .count();
  out.modalText = await page
    .locator('div.fixed.inset-0.z-50')
    .innerText()
    .then((t) => t.replace(/\s+/g, ' ').slice(0, 400));
  await page.getByRole('button', { name: '✕', exact: true }).click();

  // ===== AI 生成：真实跑一次，抓生成结果 DOM =====
  await nav('需求 & AI 生成');
  const m = page.locator('main');
  await m
    .getByRole('button', { name: /REQ-1043/ })
    .click();
  await waitLoaded();
  const genBtn = m.getByRole('button', { name: /AI 生成用例|重新生成/ }).first();
  out.genBtnText = (await genBtn.innerText()).trim();
  const t0 = Date.now();
  await genBtn.click();
  await m.getByText(/已生成 \d+ 条用例/).waitFor({ timeout: 90_000 });
  out.genMs = Date.now() - t0;
  out.genText = (await m.innerText()).replace(/\s+/g, ' ');
  out.genTextSlice = out.genText.slice(0, 2600);
  out.confidenceMatches = await m.getByText(/置信度/).allInnerTexts();
  out.confidenceRe = await m.getByText(/置信度 \d+%/).count();
  out.confidencePct = await m.getByText(/^\d+%$/).allInnerTexts();
  out.buttons = await m.getByRole('button').allInnerTexts();
} catch (e) {
  out.error = String(e).slice(0, 1500);
} finally {
  fs.writeFileSync('explore/probe10.json', JSON.stringify(out, null, 2), 'utf8');
  await browser.close();
}
console.log('done');
