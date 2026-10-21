import { expect, type Page } from '@playwright/test';

/** 测试入口：s6.ink 短链会重定向到实际托管的 SPA */
export const APP_URL = 'https://s6.ink/testpilot-demo';

/** 页面业务内容区（悬浮 AI 助手、侧边栏、顶栏均在 main 之外，可避免同名文案干扰） */
export const main = (page: Page) => page.locator('main');

/** 顶部当前项目选择器（页面第一个 combobox） */
export const projectSelect = (page: Page) => page.getByRole('combobox').first();

/** 等待 SPA 的异步加载占位消失（共享 Demo 后端偶发慢响应，等待上限放宽） */
export async function waitForLoaded(page: Page) {
  await page
    .waitForFunction(
      () =>
        !/正在加载|加载中|加载面试题|加载知识条目|正在加载报告详情|加载设置|正在加载会话/.test(
          document.body.innerText,
        ),
      null,
      { timeout: 30_000 },
    )
    .catch(() => {});
  await expect(page.locator('header h1')).toBeVisible();
}

/** 从入口进入应用；子路由深链会被短链站点重定向，必须走入口 */
export async function gotoApp(page: Page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await expect(page.getByRole('heading', { level: 1, name: '质量概览' })).toBeVisible({
    timeout: 30_000,
  });
  // 首屏指标异步拉取，先等占位消失再断言，避免与加载态竞争
  await waitForLoaded(page);
  await expect(main(page)).toContainText('用例总数', { timeout: 30_000, useInnerText: true });
}

/** 从入口进入并等待首屏异步数据加载完成 */
export async function gotoAppReady(page: Page) {
  await gotoApp(page);
  await waitForLoaded(page);
}

/** 通过左侧导航做 SPA 导航并等待加载完成 */
export async function nav(page: Page, name: string) {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await waitForLoaded(page);
}

/** 读取 main 区域的规范化文本，便于做包含断言 */
export async function mainText(page: Page) {
  return (await main(page).innerText()).replace(/\s+/g, ' ');
}
