// 数据确定性探针：各筛选条件的条数，供测试断言使用
import { chromium } from '@playwright/test';
import fs from 'fs';

const base = 'https://s6.ink/testpilot-demo';
const out = 'explore/probe';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const result = {};

const waitLoaded = async () => {
  await page
    .waitForFunction(() => !/正在加载|加载中|正在加载报告详情|加载设置/.test(document.body.innerText), null, { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(350);
};
const nav = async (name) => {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await waitLoaded();
};
const text = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const countIn = async (re) => {
  const t = await text();
  const m = t.match(re);
  return m ? m[1] : null;
};
const main = () => page.locator('main');

await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
await waitLoaded();

// 用例库
await nav('用例库');
result.cases = {};
result.cases.total = await countIn(/共 (\d+) 条 · 用例库合计/);
const typeSel = page.getByRole('combobox').nth(1);
const prioSel = page.getByRole('combobox').nth(2);
const statSel = page.getByRole('combobox').nth(3);
const search = page.getByPlaceholder('搜索用例编号 / 标题 / 模块');
for (const v of ['安全', '功能', '接口', 'UI', '性能', '兼容性']) {
  await typeSel.selectOption({ label: v });
  await page.waitForTimeout(400);
  result.cases[`type_${v}`] = await main().locator('table tbody tr').count();
}
await typeSel.selectOption({ label: '全部类型' });
await page.waitForTimeout(300);
for (const v of ['P0', 'P1', 'P2', 'P3']) {
  await prioSel.selectOption({ label: v });
  await page.waitForTimeout(400);
  result.cases[`prio_${v}`] = await main().locator('table tbody tr').count();
}
await prioSel.selectOption({ label: '全部优先级' });
await page.waitForTimeout(300);
for (const v of ['草稿', '评审中', '已通过', '已废弃']) {
  await statSel.selectOption({ label: v });
  await page.waitForTimeout(400);
  result.cases[`status_${v}`] = await main().locator('table tbody tr').count();
}
await statSel.selectOption({ label: '全部状态' });
await page.waitForTimeout(300);
await search.fill('退款');
await page.waitForTimeout(700);
result.cases.search_refund = await main().locator('table tbody tr').count();
await search.fill('不存在XYZ');
await page.waitForTimeout(700);
result.cases.search_none_text = (await main().innerText()).replace(/\s+/g, ' ').slice(0, 160);
await search.fill('');

// 缺陷：模块筛选在列表视图下的行数
await nav('缺陷管理');
result.defects = {};
await page.getByRole('button', { name: '列表视图', exact: true }).click();
await waitLoaded();
result.defects.total = await main().locator('table tbody tr').count();
for (const v of ['退款中心', '消息推送', '交易链路', '收银台', '购物车']) {
  await page.getByRole('combobox').nth(2).selectOption({ label: v });
  await page.waitForTimeout(500);
  result.defects[`module_${v}`] = await main().locator('table tbody tr').count();
}
await page.getByRole('combobox').nth(2).selectOption({ label: '全部模块' });
await page.waitForTimeout(300);
for (const v of ['致命', '严重', '一般', '轻微']) {
  await page.getByRole('combobox').nth(1).selectOption({ label: v });
  await page.waitForTimeout(500);
  result.defects[`level_${v}`] = await main().locator('table tbody tr').count();
}
await page.getByRole('combobox').nth(1).selectOption({ label: '全部级别' });
await page.getByPlaceholder('搜索缺陷编号 / 标题').fill('BUG-2209');
await page.waitForTimeout(700);
result.defects.search_bug = await main().locator('table tbody tr').count();
await page.getByPlaceholder('搜索缺陷编号 / 标题').fill('');

// 执行：筛选卡片数
await nav('测试执行');
result.runs = {};
const cards = main().locator('button').filter({ hasText: /^RUN-\d{4}/ });
result.runs.全部 = await cards.count();
for (const v of ['执行中', '存在失败', '已通过']) {
  await page.getByRole('button', { name: v, exact: true }).click();
  await page.waitForTimeout(600);
  result.runs[v] = await cards.count();
}
await page.getByRole('button', { name: '全部', exact: true }).click();

// 知识库类型筛选
await nav('知识库');
result.knowledge = {};
for (const v of ['链接', '文档', '文本']) {
  await page.getByRole('combobox').nth(1).selectOption({ label: v });
  await page.waitForTimeout(700);
  result.knowledge[v] = await countIn(/共 (\d+) 条/);
}
await page.getByRole('combobox').nth(1).selectOption({ label: '全部类型' });

// 面试题库：关键词搜索
await nav('面试题库');
result.interview = {};
const isearch = page.getByPlaceholder('搜索面试题关键词…');
for (const kw of ['Agent', '幻觉', '不存在的关键词XYZ']) {
  await isearch.fill(kw);
  await page.waitForTimeout(800);
  result.interview[`kw_${kw}`] = await countIn(/共 (\d+) 条/);
  result.interview[`empty_${kw}`] = (await main().innerText()).includes('暂无面试题');
}
await isearch.fill('');
// 翻页与筛选
await page.getByRole('button', { name: '2', exact: true }).first().click();
await page.waitForTimeout(600);
result.interview.page2_first = (await main().locator('button').first().innerText()).replace(/\s+/g, ' ').slice(0, 20);
await page.getByRole('button', { name: '1', exact: true }).first().click();
await page.getByRole('combobox').nth(1).selectOption({ label: 'LLM 评测' });
await page.getByRole('button', { name: '筛选', exact: true }).click();
await page.waitForTimeout(800);
result.interview.category_llm = await countIn(/共 (\d+) 条/);

// 助手页快捷提示
await nav('AI 助手');
const inlineTa = main().getByPlaceholder(/输入需求或问题/);
await inlineTa.fill('这是自动化探针消息');
await inlineTa.press('Enter');
await page.waitForTimeout(2500);
const assistantText = (await main().innerText()).replace(/\s+/g, ' ');
result.assistant = {
  replied: /这是自动化探针消息/.test(assistantText),
  tail: assistantText.slice(0, 200),
  messages: await countIn(/共 (\d+) 条/),
};

fs.writeFileSync(`${out}/counts.json`, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result));
await browser.close();
