import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav } from './helpers';

test.describe('跨页面一致性', () => {
  test('各模块异步加载占位最终收敛', async ({ page }) => {
    await gotoAppReady(page);

    const checks = [
      { link: '用例库', marker: 'TC-2121' },
      { link: '测试报告', marker: 'RUN-3080' },
      { link: '面试题库', marker: 'IV-001' },
      { link: '知识库', marker: 'KB-001' },
      { link: '设置', marker: 'agent-1' },
    ];

    for (const check of checks) {
      await nav(page, check.link);
      await expect(main(page)).toContainText(check.marker);
      await expect(page.locator('body')).not.toContainText('正在加载', { useInnerText: true });
      await expect(page.locator('body')).not.toContainText('加载中', { useInnerText: true });
      await expect(page.getByText('TestPilot AI 助手').first()).toBeVisible();
    }
  });
});
