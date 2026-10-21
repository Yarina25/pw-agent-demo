import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav } from './helpers';

test.describe('面试题库', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppReady(page);
    await nav(page, '面试题库');
  });

  const items = (page: import('@playwright/test').Page) =>
    main(page)
      .locator('button')
      .filter({ hasText: /^IV-\d{3}/ });

  test('展示题库统计与默认列表', async ({ page }) => {
    const m = main(page);

    await expect(m).toContainText('题库总数', { useInnerText: true });
    await expect(m).toContainText('135', { useInnerText: true });
    await expect(m).toContainText('简单 4', { useInnerText: true });
    await expect(m).toContainText('中等 129', { useInnerText: true });
    await expect(m).toContainText('困难 2', { useInnerText: true });

    await expect(items(page)).toHaveCount(10);
    await expect(items(page).first()).toContainText('IV-001', { useInnerText: true });
    await expect(items(page).first()).toContainText('什么是 AI 驱动的测试', { useInnerText: true });

    await expect(m).toContainText('共 135 条', { useInnerText: true });
    await expect(m).toContainText('第 1 / 14 页', { useInnerText: true });
  });

  test('分页切换到第二页', async ({ page }) => {
    const m = main(page);

    await m.getByRole('button', { name: '2', exact: true }).first().click();
    await expect(m).toContainText('第 2 / 14 页', { useInnerText: true });
    await expect(items(page).first()).toContainText('IV-011', { useInnerText: true });
    await expect(m).toContainText('IV-101', { useInnerText: true });
  });

  test('关键词搜索命中与恢复', async ({ page }) => {
    const m = main(page);
    const search = m.getByPlaceholder('搜索面试题关键词…');

    await search.fill('幻觉');
    await expect(m).toContainText('题库总数 8', { useInnerText: true });
    await expect(m).toContainText('共 8 条', { useInnerText: true });
    await expect(m).toContainText('第 1 / 1 页', { useInnerText: true });
    await expect(m).toContainText('IV-004', { useInnerText: true });
    await expect(m).toContainText('IV-182', { useInnerText: true });

    await search.fill('');
    await expect(m).toContainText('共 135 条', { useInnerText: true });
  });

  test('分类筛选与组合筛选空态', async ({ page }) => {
    const m = main(page);
    const selects = m.getByRole('combobox');

    await selects.nth(0).selectOption({ label: 'LLM 评测' });
    await m.getByRole('button', { name: '筛选', exact: true }).click();
    await expect(m).toContainText('题库总数 23', { useInnerText: true });
    await expect(m).toContainText('共 23 条', { useInnerText: true });
    await expect(m).toContainText('IV-175', { useInnerText: true });

    await selects.nth(1).selectOption({ label: '简单' });
    await m.getByRole('button', { name: '筛选', exact: true }).click();
    await expect(m).toContainText('暂无面试题', { useInnerText: true });
    await expect(m).toContainText('试试调整筛选条件', { useInnerText: true });
    await expect(items(page)).toHaveCount(0);
  });
});
