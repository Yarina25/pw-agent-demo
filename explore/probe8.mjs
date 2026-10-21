import { chromium } from '@playwright/test';
import fs from 'node:fs';

const APP = 'https://s6.ink/testpilot-demo';
const out = { steps: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(20_000);

async function waitLoaded() {
  await page
    .waitForFunction(
      () => !/正在加载|加载中|加载面试题|加载知识条目|正在加载报告详情|加载设置/.test(document.body.innerText),
      null,
      { timeout: 25_000 },
    )
    .catch(() => {});
}

async function nav(name) {
  const t0 = Date.now();
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await waitLoaded();
  return Date.now() - t0;
}

const mainText = async () => (await page.locator('main').innerText()).replace(/\s+/g, ' ');

try {
  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('heading', { level: 1, name: '质量概览' }).waitFor({ timeout: 30_000 });
  await waitLoaded();
  out.gotoMs = 'ok';

  // ---- 面试题库 ----
  out.interviewNavMs = await nav('面试题库');
  out.interviewText = (await mainText()).slice(0, 1200);
  out.interviewRows = await page.locator('main table tbody tr').count();
  out.interviewPager = await page
    .locator('main')
    .getByText(/第 \d+ \/ \d+ 页/)
    .first()
    .innerText()
    .catch(() => 'n/a');
  out.interviewCodes = await page
    .locator('main')
    .getByText(/^IV-\d{3}$/)
    .allInnerTexts()
    .catch(() => []);

  // ---- 用例库 ----
  out.casesNavMs = await nav('用例库');
  out.casesText = (await mainText()).slice(0, 700);
  out.casesRows = await page.locator('main table tbody tr').count();

  // ---- 测试报告 ----
  out.reportsNavMs = await nav('测试报告');
  out.reportsText = (await mainText()).slice(0, 900);

  // ---- 需求 ----
  out.reqNavMs = await nav('需求 & AI 生成');
  out.reqText = (await mainText()).slice(0, 1200);
  out.reqHasConfidence = await page.locator('main').getByText(/置信度/).count();

  // ---- 缺陷 ----
  out.defectsNavMs = await nav('缺陷管理');
  out.defectsText = (await mainText()).slice(0, 900);

  // ---- 知识库 ----
  out.kbNavMs = await nav('知识库');
  out.kbText = (await mainText()).slice(0, 600);
  out.kbTitlePlaceholders = await page.getByPlaceholder('标题').count();

  // ---- 设置 ----
  out.settingsNavMs = await nav('设置');
  out.settingsText = (await mainText()).slice(0, 600);

  // ---- AI 助手：textarea 归属 ----
  out.assistantNavMs = await nav('AI 助手');
  out.textareas = await page.$$eval('textarea', (els) =>
    els.map((el, i) => ({
      i,
      placeholder: el.getAttribute('placeholder'),
      inMain: !!el.closest('main'),
      outer: (el.parentElement?.parentElement?.className || '').toString().slice(0, 80),
      visible: !!(el.offsetWidth || el.offsetHeight),
    })),
  );

  // ---- 运行 ----
  out.runsNavMs = await nav('测试执行');
  out.runsText = (await mainText()).slice(0, 900);

  // ---- 缺陷列表行结构 ----
  await nav('缺陷管理');
  out.defectRowTexts = await page
    .locator('main table tbody tr')
    .allInnerTexts()
    .catch(() => []);
  out.defectRowCount = out.defectRowTexts.length;
  out.defectListNonTable = (await mainText()).slice(0, 700);
} catch (e) {
  out.error = String(e).slice(0, 1200);
} finally {
  fs.writeFileSync('explore/probe8.json', JSON.stringify(out, null, 2), 'utf8');
  await browser.close();
}
console.log('done');
