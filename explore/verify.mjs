// 定向验证：修复上一轮未确认的交互点
import { chromium } from '@playwright/test';
import fs from 'fs';

const base = 'https://s6.ink/testpilot-demo';
const out = 'explore/verify';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

const log = (...a) => console.log(...a);
const waitLoaded = async (ms = 20000) => {
  await page
    .waitForFunction(
      () => !/正在加载|加载中|加载面试题|加载知识条目|正在加载报告详情|加载设置/.test(document.body.innerText),
      null,
      { timeout: ms }
    )
    .catch(() => {});
  await page.waitForTimeout(400);
};

const collect = () =>
  page.evaluate(() => {
    const clean = (s) => (s || '').trim().replace(/\s+/g, ' ');
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const grab = (sel) =>
      [...document.querySelectorAll(sel)].filter(visible).map((el) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || '',
        text: clean(el.innerText).slice(0, 160),
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
      tables: [...document.querySelectorAll('table')].map((t) => clean(t.innerText).slice(0, 900)),
      dialogs: [...document.querySelectorAll('[role=dialog]')].map((d) => clean(d.innerText).slice(0, 1500)),
      bodyText: clean(document.body.innerText).slice(0, 5000),
    };
  });

const snap = async (name, note = '') => {
  await page.waitForTimeout(250);
  const data = await collect();
  data.url = page.url();
  data.note = note;
  fs.writeFileSync(`${out}/${name}.json`, JSON.stringify(data, null, 2), 'utf8');
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  log('SNAP', name, '->', page.url());
};

const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    log('FAIL', name, String(e.message).split('\n')[0]);
    fs.writeFileSync(`${out}/error_${name}.txt`, String(e.stack || e), 'utf8');
    await page.screenshot({ path: `${out}/error_${name}.png`, fullPage: true }).catch(() => {});
  }
};

const nav = async (name) => {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await waitLoaded();
};

await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
await page.getByRole('heading', { name: '质量概览', level: 1 }).waitFor({ timeout: 20000 });

// A. 需求：等待 AI 生成完成（轮询 120s）
await step('requirement_generate', async () => {
  await nav('需求 & AI 生成');
  await snap('a1_req_initial', '验证生成的当前状态');
  await page.getByRole('button', { name: /REQ-1043/ }).first().click();
  await page.waitForTimeout(600);
  await snap('a2_req_selected_1043');
  await page.getByRole('button', { name: 'AI 生成用例', exact: true }).click();
  const states = [];
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(3000);
    const txt = await page.evaluate(() => document.body.innerText);
    const m = txt.match(/AI 正在生成测试用例…|生成完成|生成失败|用例覆盖\s*\d+\s*条|生成状态\s*\S+/g);
    states.push(`${(i + 1) * 3}s: ${m ? m.join(' | ') : 'no-mark'}`);
    if (/生成完成|用例覆盖\s*[1-9]/.test(txt)) break;
    if (!/AI 正在生成/.test(txt) && i > 2) break;
  }
  fs.writeFileSync(`${out}/a3_generation_states.txt`, states.join('\n'), 'utf8');
  log(states.join('\n'));
  await snap('a3_req_after_generate', '生成结果');
});

// B. 执行：点击卡片按钮进入明细
await step('run_detail', async () => {
  await nav('测试执行');
  await page.getByRole('button', { name: /RUN-3080/ }).first().click();
  await waitLoaded();
  await page.waitForTimeout(800);
  await snap('b1_run_detail', '执行明细');
  log('URL after run click:', page.url());
});

// C. 缺陷：列表视图行点击
await step('defect_detail', async () => {
  await nav('缺陷管理');
  await page.getByRole('button', { name: '列表视图', exact: true }).click();
  await waitLoaded();
  await snap('c1_defects_list');
  await page.getByRole('row', { name: /BUG-2209/ }).click();
  await page.waitForTimeout(1000);
  await snap('c2_defect_detail', '缺陷详情');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await snap('c3_after_escape', 'ESC 后是否关闭');
});

// D. 全局搜索：输入后观察下拉
await step('global_search', async () => {
  await nav('质量概览');
  const gs = page.getByPlaceholder('搜索用例 / 缺陷 / 执行记录');
  await gs.click();
  await gs.fill('退款');
  await page.waitForTimeout(1500);
  await snap('d1_search_suggest', '输入后联想');
  await gs.press('Enter');
  await page.waitForTimeout(1500);
  await snap('d2_search_enter', '回车后');
  await gs.fill('');
  await page.keyboard.press('Escape');
});

// E. 面试题库：分页 + 组合筛选（LLM 评测 + 困难）
await step('interview_paging', async () => {
  await nav('面试题库');
  await page.getByRole('button', { name: '2', exact: true }).first().click();
  await waitLoaded();
  await snap('e1_interview_page2', '第二页');
  await page.getByRole('combobox').nth(1).selectOption({ label: 'LLM 评测' });
  await page.getByRole('combobox').nth(2).selectOption({ label: '困难' });
  await page.getByRole('button', { name: '筛选', exact: true }).click();
  await waitLoaded();
  await snap('e2_interview_llm_hard', 'LLM 评测 + 困难');
});

// F. 新建执行：只打开弹窗，不提交
await step('new_run_dialog', async () => {
  await nav('测试执行');
  await page.getByRole('button', { name: '新建执行', exact: true }).click();
  await page.waitForTimeout(900);
  await snap('f1_new_run_dialog', '新建执行弹窗');
  const close = page.getByRole('button', { name: /取消|关闭/ }).first();
  if (await close.count()) await close.click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await snap('f2_new_run_closed');
});

// G. 深链直连执行明细
await step('deep_link', async () => {
  await page.goto(`${base}/runs/RUN-3080`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const info = {
    url: page.url(),
    h1: await page.locator('h1').allInnerTexts().catch(() => []),
    body: (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300),
  };
  fs.writeFileSync(`${out}/g1_deep_link.json`, JSON.stringify(info, null, 2), 'utf8');
  log('DEEP LINK', JSON.stringify(info));
});

// H. 知识库：类型筛选 + 关键词搜索
await step('knowledge_filter', async () => {
  await page.goto(base, { waitUntil: 'networkidle', timeout: 45000 });
  await nav('知识库');
  await page.getByRole('combobox').nth(1).selectOption({ label: '文档' });
  await page.waitForTimeout(900);
  await snap('h1_knowledge_docs', '仅文档类型');
  const ks = page.getByPlaceholder('搜索标题 / 备注 / 内容…');
  await ks.fill('TestPilot');
  await page.waitForTimeout(900);
  await snap('h2_knowledge_search', '搜索 TestPilot');
});

fs.writeFileSync(`${out}/runtime_errors.json`, JSON.stringify(errors, null, 2), 'utf8');
log('DONE errors=', errors.length);
await browser.close();
