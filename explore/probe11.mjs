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

  const unique = `跨页探针-${Date.now()}`;
  const input = page.getByPlaceholder('输入需求或问题，Enter 发送，Shift+Enter 换行');
  out.inputCount = await input.count();
  await input.fill(unique);
  await input.press('Enter');
  await page.getByText(unique).waitFor({ timeout: 15_000 });

  // 悬浮面板容器：从 textarea 向上找最近的 fixed 容器
  out.floatChain = await input.last().evaluate((el) => {
    const chain = [];
    let n = el;
    while (n && chain.length < 10) {
      const cls = (n.className || '').toString();
      chain.push({ tag: n.tagName, cls: cls.slice(0, 140), fixed: cls.includes('fixed') });
      n = n.parentElement;
    }
    return chain;
  });

  out.fixedCount = await page.locator('div.fixed').count();
  out.fixedClasses = await page.locator('div.fixed').evaluateAll((els) =>
    els.map((e) => (e.className || '').toString().slice(0, 160)),
  );

  // 跨页面：导航到用例库后，消息是否仍在悬浮面板
  await nav('用例库');
  out.afterNavFloatVisible = await page.getByText(unique).isVisible().catch(() => false);
  out.afterNavInMain = await page.locator('main').getByText(unique).count();
  out.afterNavInFixed = await page
    .locator('div.fixed')
    .getByText(unique)
    .count()
    .catch(() => -1);

  // 助手页 main 是否包含该消息
  await nav('AI 助手');
  out.assistantMainHasMsg = await page.locator('main').getByText(unique).count();
  out.assistantMainConvHead = (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(-420);

  // 通过悬浮面板候选定位器
  out.candidates = {
    fixedZ50: await page.locator('div.fixed.inset-0.z-50').count(),
    fixedZ40: await page.locator('div.fixed.z-40').count(),
    hasHeader: await page
      .locator('div.fixed')
      .filter({ hasText: 'TestPilot AI 助手' })
      .count(),
    hasHeaderAndTextarea: await page
      .locator('div.fixed')
      .filter({ hasText: 'TestPilot AI 助手' })
      .filter({ has: page.locator('textarea') })
      .count(),
  };

  await page.getByText(unique).first().waitFor({ timeout: 5000 }).catch(() => {});
  out.floatText = await page
    .locator('div.fixed')
    .filter({ hasText: 'TestPilot AI 助手' })
    .filter({ has: page.locator('textarea') })
    .first()
    .innerText()
    .then((t) => t.replace(/\s+/g, ' ').slice(-300))
    .catch((e) => String(e).slice(0, 200));
} catch (e) {
  out.error = String(e).slice(0, 1200);
} finally {
  fs.writeFileSync('explore/probe11.json', JSON.stringify(out, null, 2), 'utf8');
  await browser.close();
}
console.log('done');
