import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav } from './helpers';

test.describe('知识库', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppReady(page);
    await nav(page, '知识库');
  });

  const typeFilter = (page: import('@playwright/test').Page) =>
    main(page).getByRole('combobox').nth(0);

  test('展示知识库统计与全部条目', async ({ page }) => {
    const m = main(page);

    await expect(m).toContainText('全部条目 5', { useInnerText: true });
    await expect(m).toContainText('链接收藏 2', { useInnerText: true });
    await expect(m).toContainText('知识文档 3', { useInnerText: true });
    await expect(m).toContainText('自定义文本 0', { useInnerText: true });

    for (const code of ['KB-005', 'KB-004', 'KB-003', 'KB-002', 'KB-001']) {
      await expect(m.getByText(code)).toBeVisible();
    }
    await expect(m).toContainText('共 5 条', { useInnerText: true });
    await expect(m).toContainText('第 1 / 1 页', { useInnerText: true });
  });

  test('按类型筛选并展示空态', async ({ page }) => {
    const m = main(page);

    await typeFilter(page).selectOption({ label: '链接' });
    await expect(m).toContainText('共 2 条', { useInnerText: true });
    await expect(m.getByText('KB-001')).toBeVisible();
    await expect(m.getByText('KB-002')).toBeVisible();

    await typeFilter(page).selectOption({ label: '文档' });
    await expect(m).toContainText('共 3 条', { useInnerText: true });
    await expect(m.getByRole('button', { name: /点击下载/ })).toHaveCount(3);

    await typeFilter(page).selectOption({ label: '文本' });
    await expect(m).toContainText('暂无知识条目', { useInnerText: true });

    await typeFilter(page).selectOption({ label: '全部类型' });
    await expect(m).toContainText('共 5 条', { useInnerText: true });
  });

  test('关键词搜索命中与空态', async ({ page }) => {
    const m = main(page);
    const search = m.getByPlaceholder('搜索标题 / 备注 / 内容…');

    await search.fill('小林');
    await expect(m).toContainText('共 1 条', { useInnerText: true });
    await expect(m.getByText('KB-002')).toBeVisible();
    await expect(m).toContainText('小林 coding', { useInnerText: true });

    await search.fill('回归');
    await expect(m).toContainText('暂无知识条目', { useInnerText: true });

    await search.fill('');
    await expect(m).toContainText('共 5 条', { useInnerText: true });
  });

  test('新增知识表单包含链接收藏字段', async ({ page }) => {
    const m = main(page);

    await m.getByRole('button', { name: '链接收藏', exact: true }).click();

    await expect(m.getByPlaceholder('标题', { exact: true })).toBeVisible();
    await expect(m.getByPlaceholder('备注（可选）')).toBeVisible();
    await expect(m.getByPlaceholder('链接地址，如 https://…')).toBeVisible();
    await expect(m.getByRole('button', { name: '保存', exact: true })).toBeVisible();
    await expect(m.getByRole('button', { name: '导入面试题库', exact: true })).toBeVisible();
    await expect(m.getByRole('button', { name: '刷新', exact: true })).toBeVisible();
  });
});
