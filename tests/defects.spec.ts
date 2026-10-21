import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav, waitForLoaded } from './helpers';

test.describe('缺陷管理', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppReady(page);
    await nav(page, '缺陷管理');
  });

  const bugCards = (page: import('@playwright/test').Page) =>
    main(page)
      .locator('button')
      .filter({ hasText: /^BUG-\d{4}/ });

  // 详情弹窗：右侧/居中遮罩层内的卡片，避免与列表单元格、下拉 option 全局重名
  const detailPanel = (page: import('@playwright/test').Page) =>
    page.locator('div.fixed.inset-0.z-50').filter({ hasText: /缺陷详情 · BUG-/ });

  test('看板统计、分列与缺陷详情', async ({ page }) => {
    const m = main(page);

    await expect(m).toContainText('缺陷总数', { useInnerText: true });
    await expect(m).toContainText('未关闭', { useInnerText: true });
    await expect(m).toContainText('致命缺陷', { useInnerText: true });
    await expect(m).toContainText('修复率', { useInnerText: true });
    await expect(m).toContainText('22%', { useInnerText: true });

    await expect(bugCards(page)).toHaveCount(9);
    for (const column of ['待处理', '处理中', '已修复', '已验证', '已关闭', '已拒绝']) {
      await expect(m.getByText(column, { exact: true }).first()).toBeVisible();
    }
    for (const bug of [
      'BUG-2212',
      'BUG-2209',
      'BUG-2206',
      'BUG-2202',
      'BUG-2210',
      'BUG-2207',
      'BUG-2201',
      'BUG-2203',
      'BUG-2208',
    ]) {
      await expect(bugCards(page).filter({ hasText: bug })).toBeVisible();
    }

    // 打开看板卡片详情
    await bugCards(page).filter({ hasText: 'BUG-2210' }).click();
    const panel = detailPanel(page);
    await expect(panel).toContainText('缺陷详情 · BUG-2210', { useInnerText: true });
    await expect(panel).toContainText('复现率 30%', { useInnerText: true });
    await expect(panel.getByText('TC-2118')).toBeVisible();
    await expect(panel.getByText('RUN-3077')).toBeVisible();
    await expect(panel).toContainText('AI 定级与根因分析', { useInnerText: true });

    await page.getByRole('button', { name: '✕', exact: true }).click();
    await expect(panel).toBeHidden();
  });

  test('按级别与模块筛选', async ({ page }) => {
    const m = main(page);

    // 级别筛选（下拉在 main 内第 1 个）
    await m.getByRole('combobox').nth(0).selectOption({ label: '致命' });
    await expect(bugCards(page)).toHaveCount(3);
    for (const bug of ['BUG-2209', 'BUG-2202', 'BUG-2203']) {
      await expect(bugCards(page).filter({ hasText: bug })).toBeVisible();
    }
    await expect(bugCards(page).filter({ hasText: 'BUG-2212' })).toHaveCount(0);

    await m.getByRole('combobox').nth(0).selectOption({ label: '全部级别' });
    await expect(bugCards(page)).toHaveCount(9);

    // 列表视图 + 模块筛选
    await m.getByRole('button', { name: '列表视图', exact: true }).click();
    await waitForLoaded(page);
    const rows = m.locator('table tbody tr');
    await expect(rows).toHaveCount(9);

    await m.getByRole('combobox').nth(1).selectOption({ label: '退款中心' });
    await expect(rows).toHaveCount(3);
    for (const bug of ['BUG-2202', 'BUG-2203', 'BUG-2201']) {
      await expect(rows.filter({ hasText: bug })).toBeVisible();
    }

    await m.getByRole('combobox').nth(1).selectOption({ label: '全部模块' });
    await expect(rows).toHaveCount(9);
  });

  test('列表视图搜索并打开缺陷详情', async ({ page }) => {
    const m = main(page);

    await m.getByRole('button', { name: '列表视图', exact: true }).click();
    await waitForLoaded(page);

    const rows = m.locator('table tbody tr');
    await expect(rows).toHaveCount(9);

    await m.getByPlaceholder('搜索缺陷编号 / 标题').fill('BUG-2209');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('支付回调验签算法未覆盖时间戳字段', { useInnerText: true });

    await m.getByRole('row', { name: /BUG-2209/ }).click();
    const panel = detailPanel(page);
    await expect(panel).toContainText('缺陷详情 · BUG-2209', { useInnerText: true });
    await expect(panel).toContainText('复现率 100%', { useInnerText: true });
    await expect(panel.getByText('交易链路', { exact: true })).toBeVisible();
    await expect(panel.getByText('TC-2120')).toBeVisible();
    await expect(panel.getByText('RUN-3081')).toBeVisible();
    await expect(panel).toContainText('AI 定级与根因分析', { useInnerText: true });

    for (const action of ['标记拒绝', '指派处理', 'AI 定级与根因']) {
      await expect(panel.getByRole('button', { name: action, exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: '✕', exact: true }).click();
    await expect(panel).toBeHidden();
  });
});
