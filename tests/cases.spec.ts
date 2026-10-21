import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav } from './helpers';

test.describe('用例库', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppReady(page);
    await nav(page, '用例库');
  });

  // main 内的三个下拉依次为：类型 / 优先级 / 状态
  const filters = (page: import('@playwright/test').Page) => main(page).getByRole('combobox');
  const searchBox = (page: import('@playwright/test').Page) =>
    main(page).getByPlaceholder('搜索用例编号 / 标题 / 模块');

  test('展示统计与十六条用例', async ({ page }) => {
    const m = main(page);
    const rows = m.locator('table tbody tr');

    await expect(m).toContainText('用例总数', { useInnerText: true });
    await expect(m).toContainText('16', { useInnerText: true });
    await expect(m).toContainText('AI 生成 11', { useInnerText: true });
    await expect(m).toContainText('可自动化 12', { useInnerText: true });
    await expect(m).toContainText('最近通过 12', { useInnerText: true });

    await expect(rows).toHaveCount(16);
    await expect(rows.filter({ hasText: 'TC-2121' })).toContainText('退款到账后优惠券返还规则', { useInnerText: true });
    await expect(rows.filter({ hasText: 'TC-2100' })).toContainText(
      '单商品全额退款金额等于实付金额',
    );

    for (const header of ['用例', '模块', '类型', '优先级', '状态', '来源', '最近结果', '最近执行']) {
      await expect(m.locator('table thead')).toContainText(header);
    }
  });

  test('按类型筛选安全用例', async ({ page }) => {
    const rows = main(page).locator('table tbody tr');

    await filters(page).nth(0).selectOption({ label: '安全' });
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: 'TC-2120' })).toBeVisible();
    await expect(rows.filter({ hasText: 'TC-2104' })).toBeVisible();
    await expect(rows.nth(0)).toContainText('安全', { useInnerText: true });
    await expect(rows.nth(1)).toContainText('安全', { useInnerText: true });

    await filters(page).nth(0).selectOption({ label: '全部类型' });
    await expect(rows).toHaveCount(16);
  });

  test('按优先级与状态筛选，并展示空态', async ({ page }) => {
    const m = main(page);
    const rows = m.locator('table tbody tr');

    await filters(page).nth(1).selectOption({ label: 'P0' });
    await expect(rows).toHaveCount(7);
    await filters(page).nth(1).selectOption({ label: '全部优先级' });
    await expect(rows).toHaveCount(16);

    await filters(page).nth(2).selectOption({ label: '草稿' });
    await expect(rows).toHaveCount(2);

    await filters(page).nth(2).selectOption({ label: '已废弃' });
    await expect(rows).toHaveCount(0);
    await expect(m).toContainText('没有匹配的用例', { useInnerText: true });
    await expect(m).toContainText('共 0 条 · 用例库合计 16 条', { useInnerText: true });

    await filters(page).nth(2).selectOption({ label: '全部状态' });
    await expect(rows).toHaveCount(16);
  });

  test('关键词搜索命中与未命中', async ({ page }) => {
    const m = main(page);
    const rows = m.locator('table tbody tr');

    await searchBox(page).fill('TC-2100');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('单商品全额退款金额等于实付金额', { useInnerText: true });

    await searchBox(page).fill('不存在XYZ');
    await expect(rows).toHaveCount(0);
    await expect(m).toContainText('没有匹配的用例', { useInnerText: true });

    await searchBox(page).fill('');
    await expect(rows).toHaveCount(16);
  });
});
