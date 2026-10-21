import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav, waitForLoaded } from './helpers';

test.describe('AI 助手', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppReady(page);
    await nav(page, 'AI 助手');
  });

  test('展示助手能力与本次上下文', async ({ page }) => {
    const m = main(page);

    for (const section of ['AI 测试助手', '能做什么', '本次上下文']) {
      await expect(m.getByRole('heading', { level: 2, name: section })).toBeVisible();
    }

    await expect(m).toContainText('gpt-4o', { useInnerText: true });
    await expect(m).toContainText('TRADE', { useInnerText: true });
    for (const keyword of ['用例设计', '缺陷分析', '质量总结', '脚本生成']) {
      await expect(m.getByText(keyword, { exact: true })).toBeVisible();
    }

    await expect(m).toContainText('需求 4 条', { useInnerText: true });
    await expect(m).toContainText('用例 16 条', { useInnerText: true });
    await expect(m).toContainText('未关闭缺陷 7 个', { useInnerText: true });

    await expect(
      m.getByPlaceholder('输入需求或问题，Enter 发送，Shift+Enter 换行'),
    ).toBeVisible();
  });

  test('快捷提示生成结构化用例建议', async ({ page }) => {
    const m = main(page);
    const replies = () => m.getByText(/已基于当前需求生成/);

    const before = await replies().count();
    await m.getByRole('button', { name: '为订单部分退款生成边界用例', exact: true }).click();

    await expect.poll(async () => replies().count(), { timeout: 20_000 }).toBeGreaterThan(before);
    await expect(m).toContainText('结构化用例', { useInnerText: true });
    await expect(m).toContainText('置信度', { useInnerText: true });
  });

  test('手动发送消息并获得回复', async ({ page }) => {
    const m = main(page);
    const unique = `自动化验证消息-${Date.now()}`;
    const replies = () => m.getByText(/请告诉我你要针对哪个需求或缺陷/);

    const before = await replies().count();
    const input = m.getByPlaceholder('输入需求或问题，Enter 发送，Shift+Enter 换行');
    await input.fill(unique);
    await input.press('Enter');

    await expect(m).toContainText(unique);
    await expect.poll(async () => replies().count(), { timeout: 20_000 }).toBeGreaterThan(before);
  });

  test('悬浮助手与助手页共享同一会话', async ({ page }) => {
    const unique = `跨页消息-${Date.now()}`;
    // 悬浮助手在 main 之外（右侧固定面板），DOM 中排在助手页输入框之后
    const floatPanel = page
      .locator('div.fixed')
      .filter({ hasText: 'TestPilot AI 助手' })
      .filter({ has: page.locator('textarea') });
    const floatingInput = floatPanel.getByPlaceholder(
      '输入需求或问题，Enter 发送，Shift+Enter 换行',
    );

    await floatingInput.fill(unique);
    // 等落库完成（POST 消息接口 200），否则跳转时的历史拉取会早于写入
    const [sent] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' && r.url().includes('/assistant/conversations/'),
      ),
      floatingInput.press('Enter'),
    ]);
    expect(sent.ok()).toBeTruthy();
    await expect(page.getByText(unique)).toBeVisible();

    await nav(page, 'AI 助手');
    // 共享会话写入存在秒级延迟：未命中时重新拉取历史（重载）后再判定
    await expect
      .poll(
        async () => {
          if (await main(page).getByText(unique).count()) return true;
          await page.reload({ waitUntil: 'domcontentloaded' });
          await waitForLoaded(page);
          return (await main(page).getByText(unique).count()) > 0;
        },
        { timeout: 30_000, intervals: [2_000, 4_000, 6_000] },
      )
      .toBe(true);
  });
});
