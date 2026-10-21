// 复核：用例库筛选是否生效、面试题库搜索/筛选结果
import { chromium } from '@playwright/test';
import fs from 'fs';

const base = 'https://s6.ink/testpilot-demo';
const out = 'explore/probe';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const r = {};

const waitLoaded = async () => {
  await page
    .waitForFunction(() => !/正在加载|加载中|加载面试题/.test(document.body.innerText), null, { timeout: 25000 })
    .catch(() => {});
  await page.waitForTimeout(500);
};
const nav = async (name) => {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await waitLoaded();
};
const mainText = async () => (await page.locator('main').innerText()).replace(/\s+/g, ' ');

await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
await waitLoaded();

// 用例库：类型=安全
await nav('用例库');
const rows = () => page.locator('main table tbody tr');
r.cases_total = await rows().count();
await page.getByRole('combobox').nth(1).selectOption({ label: '安全' });
await page.waitForTimeout(1500);
r.cases_after_type_safe = await rows().count();
r.cases_after_type_safe_titles = await page.locator('main table tbody tr').evaluateAll((trs) =>
  trs.map((t) => t.innerText.replace(/\s+/g, ' ').slice(0, 40))
);
await page.screenshot({ path: `${out}/cases_type_safe.png`, fullPage: true });
// 搜索
await page.getByRole('combobox').nth(1).selectOption({ label: '全部类型' });
await page.waitForTimeout(500);
await page.getByPlaceholder('搜索用例编号 / 标题 / 模块').fill('TC-2111');
await page.waitForTimeout(1500);
r.cases_search_tc2111 = await rows().count();

// 面试题库
await nav('面试题库');
const isearch = page.getByPlaceholder('搜索面试题关键词…');
await isearch.fill('幻觉');
await waitLoaded();
await page.waitForTimeout(800);
r.interview_kw_huanjue = await mainText();
await page.screenshot({ path: `${out}/interview_huanjue.png`, fullPage: true });
await isearch.fill('');
await waitLoaded();
await page.getByRole('combobox').nth(1).selectOption({ label: 'LLM 评测' });
await page.getByRole('button', { name: '筛选', exact: true }).click();
await waitLoaded();
await page.waitForTimeout(800);
r.interview_llm = (await mainText()).slice(0, 400);
await page.getByRole('combobox').nth(2).selectOption({ label: '简单' });
await page.getByRole('button', { name: '筛选', exact: true }).click();
await waitLoaded();
await page.waitForTimeout(600);
r.interview_llm_simple = (await mainText()).slice(0, 300);

// 知识库 文本类型
await nav('知识库');
await page.getByRole('combobox').nth(1).selectOption({ label: '文本' });
await page.waitForTimeout(1200);
r.knowledge_text = (await mainText()).slice(0, 300);

fs.writeFileSync(`${out}/probe4.json`, JSON.stringify(r, null, 2), 'utf8');
console.log('OK');
await browser.close();
