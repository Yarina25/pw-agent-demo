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

  // ===== 缺陷管理：列表视图 + 详情面板 DOM =====
  await nav('缺陷管理');
  await page.locator('main').getByRole('button', { name: '列表视图', exact: true }).click();
  await waitLoaded();
  out.listRows = await page.locator('main table tbody tr').count();
  out.firstRowHtml = (await page.locator('main table tbody tr').first().innerHTML()).slice(0, 600);
  await page.locator('main table tbody tr').filter({ hasText: 'BUG-2209' }).click();
  await page.getByText('缺陷详情 · BUG-2209').waitFor({ timeout: 10_000 });
  out.detailHeader = 'ok';
  // 详情面板容器：找包含标题文本的最近祖先 div（非全屏）
  out.panelChain = await page.getByText('缺陷详情 · BUG-2209').evaluate((el) => {
    const chain = [];
    let n = el;
    for (let i = 0; i < 5 && n; i++) {
      chain.push({
        tag: n.tagName,
        cls: (n.className || '').toString().slice(0, 120),
        role: n.getAttribute && n.getAttribute('role'),
        w: n.getBoundingClientRect ? Math.round(n.getBoundingClientRect().width) : 0,
      });
      n = n.parentElement;
    }
    return chain;
  });
  out.panelText = await page
    .getByText('缺陷详情 · BUG-2209')
    .evaluate((el) => {
      let n = el;
      for (let i = 0; i < 4 && n.parentElement; i++) n = n.parentElement;
      return (n.innerText || '').replace(/\s+/g, ' ').slice(0, 800);
    });
  out.moduleMatches = await page.getByText('交易链路').count();
  out.moduleMatchTags = await page.getByText('交易链路').evaluateAll((els) =>
    els.map((e) => ({ tag: e.tagName, hidden: !(e.offsetWidth || e.offsetHeight), parent: e.parentElement?.tagName })),
  );

  // ===== 需求：默认选中项 & 点击 REQ-1042 后的面板 =====
  await nav('需求 & AI 生成');
  out.reqDefaultDetail = await page
    .locator('main')
    .evaluate((el) => (el.innerText || '').replace(/\s+/g, ' ').slice(0, 400));
  const reqButtons = page.locator('main button').filter({ hasText: /^REQ-\d{4}/ });
  out.reqButtonCount = await reqButtons.count();
  await reqButtons.filter({ hasText: 'REQ-1042' }).click();
  await waitLoaded();
  out.reqAfterClick = await page
    .locator('main')
    .evaluate((el) => (el.innerText || '').replace(/\s+/g, ' ').slice(0, 1400));
  out.confidenceCount = await page.locator('main').getByText(/置信度/).count();
  out.confidenceTexts = await page.locator('main').getByText(/置信度/).allInnerTexts();

  // 重新进入看默认选中
  await nav('质量概览');
  await nav('需求 & AI 生成');
  out.reqReenter = await page
    .locator('main')
    .evaluate((el) => (el.innerText || '').replace(/\s+/g, ' ').slice(0, 300));

  // ===== AI 助手：悬浮输入框定位 =====
  await nav('AI 助手');
  out.assistantTextareas = await page.$$eval('textarea', (els) =>
    els.map((el) => ({
      inMain: !!el.closest('main'),
      placeholder: el.getAttribute('placeholder'),
      parentCls: (el.closest('div.border-t')?.className || '').toString(),
      formCls: (el.closest('form')?.className || '').toString().slice(0, 120),
    })),
  );

  // ===== 用例库：统计区文本节点结构（验证 textContent 无空格） =====
  await nav('用例库');
  out.casesStatTextContent = await page.locator('main').evaluate((el) => el.textContent.slice(0, 200));
  out.casesStatInnerText = await page.locator('main').evaluate((el) => (el.innerText || '').replace(/\s+/g, ' ').slice(0, 200));
} catch (e) {
  out.error = String(e).slice(0, 1500);
} finally {
  fs.writeFileSync('explore/probe9.json', JSON.stringify(out, null, 2), 'utf8');
  await browser.close();
}
console.log('done');
