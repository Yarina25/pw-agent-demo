// 断言基线：报告切换、用例筛选计数、知识库搜索、看板筛选、项目徽标
import { chromium } from '@playwright/test';
import fs from 'fs';

const base = 'https://s6.ink/testpilot-demo';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const r = {};

const waitLoaded = async () => {
  await page
    .waitForFunction(() => !/正在加载|加载中|加载面试题|加载知识条目|正在加载报告详情|加载设置/.test(document.body.innerText), null, { timeout: 25000 })
    .catch(() => {});
  await page.waitForTimeout(500);
};
const nav = async (name) => {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await waitLoaded();
};
const main = () => page.locator('main');
const mainText = async () => (await main().innerText()).replace(/\s+/g, ' ');

await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
await waitLoaded();

// 项目切换徽标
r.header_trade = (await page.locator('header').innerText()).replace(/\s+/g, ' ');
await page.getByRole('combobox').first().selectOption({ label: '会员增长系统' });
await page.waitForTimeout(1200);
r.header_grow = (await page.locator('header').innerText()).replace(/\s+/g, ' ');
r.main_grow = (await mainText()).slice(0, 400);
await page.getByRole('combobox').first().selectOption({ label: '电商交易中台' });
await page.waitForTimeout(1200);
r.header_back = (await page.locator('header').innerText()).replace(/\s+/g, ' ');

// 报告切换 RUN-3077
await nav('测试报告');
await page.getByRole('button', { name: /RUN-3077/ }).first().click();
await waitLoaded();
await page.waitForTimeout(800);
r.report_3077 = (await mainText()).slice(0, 900);

// 用例库 P0 / 草稿
await nav('用例库');
const rows = () => page.locator('main table tbody tr');
await page.getByRole('combobox').nth(2).selectOption({ label: 'P0' });
await page.waitForTimeout(1500);
r.cases_p0 = await rows().count();
await page.getByRole('combobox').nth(2).selectOption({ label: '全部优先级' });
await page.getByRole('combobox').nth(3).selectOption({ label: '草稿' });
await page.waitForTimeout(1500);
r.cases_draft = await rows().count();
await page.getByRole('combobox').nth(3).selectOption({ label: '全部状态' });
await page.getByRole('combobox').nth(3).selectOption({ label: '已废弃' });
await page.waitForTimeout(1500);
r.cases_deprecated_rows = await rows().count();
r.cases_deprecated_text = (await mainText()).slice(0, 260);
await page.getByRole('combobox').nth(3).selectOption({ label: '全部状态' });
await page.getByPlaceholder('搜索用例编号 / 标题 / 模块').fill('不存在XYZ');
await page.waitForTimeout(1500);
r.cases_search_none = (await mainText()).slice(0, 300);

// 缺陷：看板模块筛选 + 卡片点击详情
await nav('缺陷管理');
await page.getByRole('combobox').nth(2).selectOption({ label: '退款中心' });
await page.waitForTimeout(1200);
r.defects_kanban_refund = (await mainText()).slice(0, 700);
await page.getByRole('combobox').nth(2).selectOption({ label: '全部模块' });
await page.waitForTimeout(800);
await page.getByRole('button', { name: /BUG-2210/ }).first().click();
await page.waitForTimeout(1000);
r.defect_kanban_detail = (await mainText()).slice(-900);
await page.getByRole('button', { name: '✕' }).first().click().catch(() => {});
await page.waitForTimeout(400);

// 知识库搜索 小林 + 回归
await nav('知识库');
const ks = page.getByPlaceholder('搜索标题 / 备注 / 内容…');
await ks.fill('小林');
await page.waitForTimeout(1200);
r.knowledge_xiaolin = (await mainText()).slice(0, 500);
await ks.fill('回归');
await page.waitForTimeout(1200);
r.knowledge_huigui = (await mainText()).slice(0, 400);

fs.writeFileSync('explore/probe/assertions.json', JSON.stringify(r, null, 2), 'utf8');
console.log('OK');
await browser.close();
