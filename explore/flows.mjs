// 交互流探索：逐模块等待数据加载、执行安全交互并落盘 JSON + 截图
import { chromium } from '@playwright/test';
import fs from 'fs';

const base = 'https://s6.ink/testpilot-demo';
const out = 'explore/flows';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const runtimeErrors = [];
page.on('pageerror', (e) => runtimeErrors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') runtimeErrors.push(m.text());
});

const waitLoaded = async () => {
  await page
    .waitForFunction(
      () => !/正在加载|加载中|加载面试题|加载知识条目|正在加载报告详情|加载设置/.test(document.body.innerText),
      null,
      { timeout: 20000 }
    )
    .catch(() => {});
  await page.waitForTimeout(600);
};

const collect = () =>
  page.evaluate(() => {
    const clean = (s) => (s || '').trim().replace(/\s+/g, ' ');
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const grab = (sel) =>
      [...document.querySelectorAll(sel)].filter(visible).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: clean(el.innerText).slice(0, 120),
        placeholder: el.getAttribute('placeholder') || '',
        type: el.getAttribute('type') || '',
        href: el.getAttribute('href') || '',
        disabled: !!el.disabled,
        options: el.tagName === 'SELECT' ? [...el.options].map((o) => clean(o.text)) : undefined,
      }));
    return {
      h1: grab('h1').map((x) => x.text),
      h2: grab('h2').map((x) => x.text),
      buttons: grab('button, [role=button], [role=tab]'),
      inputs: grab('input, textarea, select'),
      links: grab('a[href]').map((x) => `${x.text} -> ${x.href}`),
      tables: [...document.querySelectorAll('table')].map((t) => clean(t.innerText).slice(0, 700)),
      dialogs: [...document.querySelectorAll('[role=dialog]')].map((d) => clean(d.innerText).slice(0, 1200)),
      bodyText: clean(document.body.innerText).slice(0, 4500),
    };
  });

const snap = async (name, note = '') => {
  await page.waitForTimeout(300);
  const data = await collect();
  data.url = page.url();
  data.note = note;
  fs.writeFileSync(`${out}/${name}.json`, JSON.stringify(data, null, 2), 'utf8');
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log('SNAP', name, page.url());
};

const nav = async (name) => {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await waitLoaded();
};

const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    console.log('FAIL', name, String(e.message).split('\n')[0]);
    fs.writeFileSync(`${out}/error_${name}.txt`, String(e.stack || e), 'utf8');
    await page.screenshot({ path: `${out}/error_${name}.png`, fullPage: true }).catch(() => {});
  }
};

await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
await page.getByRole('heading', { name: '质量概览', level: 1 }).waitFor({ timeout: 20000 });
await snap('01_dashboard');

await step('project_switch', async () => {
  const proj = page.getByRole('combobox').first();
  await proj.selectOption({ label: '会员增长系统' });
  await waitLoaded();
  await snap('02_project_member');
  await proj.selectOption({ label: '电商交易中台' });
  await waitLoaded();
});

await step('global_search', async () => {
  const gs = page.getByPlaceholder('搜索用例 / 缺陷 / 执行记录');
  await gs.fill('BUG-2201');
  await gs.press('Enter');
  await page.waitForTimeout(1200);
  await snap('03_global_search');
  await gs.fill('');
});

await step('requirements', async () => {
  await nav('需求 & AI 生成');
  await snap('04_requirements');
  await page.getByRole('button', { name: 'AI 生成用例', exact: true }).click();
  await page.waitForTimeout(4000);
  await waitLoaded();
  await snap('05_requirements_generated');
});

await step('cases', async () => {
  await nav('用例库');
  await snap('06_cases');
});

await step('runs', async () => {
  await nav('测试执行');
  await snap('07_runs');
  await page.getByRole('button', { name: '存在失败', exact: true }).click();
  await page.waitForTimeout(800);
  await snap('08_runs_failed_filter');
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByRole('link', { name: /查看执行明细/ }).first().click();
  await waitLoaded();
  await snap('09_run_detail');
});

await step('reports', async () => {
  await nav('测试报告');
  await snap('10_reports');
  await page.getByRole('button', { name: /RUN-3080/ }).first().click();
  await page.waitForTimeout(2500);
  await waitLoaded();
  await snap('11_report_detail');
});

await step('defects', async () => {
  await nav('缺陷管理');
  await snap('12_defects_kanban');
  const selects = page.getByRole('combobox');
  await selects.nth(1).selectOption({ label: '致命' });
  await page.waitForTimeout(900);
  await snap('13_defects_critical');
  await selects.nth(1).selectOption({ label: '全部级别' });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '列表视图', exact: true }).click();
  await waitLoaded();
  await snap('14_defects_list');
  await page.getByRole('button', { name: /BUG-2209/ }).first().click();
  await page.waitForTimeout(1200);
  await snap('15_defect_detail');
  await page.keyboard.press('Escape');
});

await step('assistant', async () => {
  await nav('AI 助手');
  await snap('16_assistant');
  await page.getByRole('button', { name: '为订单部分退款生成边界用例', exact: true }).first().click();
  await page.waitForTimeout(4000);
  await snap('17_assistant_quick_prompt');
});

await step('interview', async () => {
  await nav('面试题库');
  await snap('18_interview');
  const selects = page.getByRole('combobox');
  await selects.nth(1).selectOption({ label: 'LLM 评测' });
  await page.getByRole('button', { name: '筛选', exact: true }).click();
  await waitLoaded();
  await snap('19_interview_llm');
});

await step('knowledge', async () => {
  await nav('知识库');
  await snap('20_knowledge');
  const ksearch = page.getByPlaceholder('搜索标题 / 备注 / 内容…');
  await ksearch.fill('回归');
  await page.waitForTimeout(1000);
  await snap('21_knowledge_search');
});

await step('settings', async () => {
  await nav('设置');
  await waitLoaded();
  await snap('22_settings');
});

await step('back_dashboard', async () => {
  await nav('质量概览');
  await snap('23_back_dashboard');
});

fs.writeFileSync(`${out}/runtime_errors.json`, JSON.stringify(runtimeErrors, null, 2), 'utf8');
console.log('DONE errors=', runtimeErrors.length);
await browser.close();
