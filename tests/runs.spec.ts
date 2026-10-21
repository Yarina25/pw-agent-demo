import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav, waitForLoaded } from './helpers';

test.describe('测试执行', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppReady(page);
    await nav(page, '测试执行');
  });

  const cards = (page: import('@playwright/test').Page) =>
    main(page)
      .locator('button')
      .filter({ hasText: /^RUN-\d{4}/ });

  test('展示执行统计与四条执行记录', async ({ page }) => {
    const m = main(page);

    await expect(m).toContainText('执行中', { useInnerText: true });
    await expect(m).toContainText('今日执行', { useInnerText: true });
    await expect(m).toContainText('平均通过率', { useInnerText: true });
    await expect(m).toContainText('73%', { useInnerText: true });
    await expect(m).toContainText('待处理缺陷', { useInnerText: true });

    await expect(cards(page)).toHaveCount(4);
    await expect(cards(page).filter({ hasText: 'RUN-3081' })).toContainText('执行进度 72%', { useInnerText: true });
    await expect(cards(page).filter({ hasText: 'RUN-3080' })).toContainText('1m 36s', { useInnerText: true });
    await expect(cards(page).filter({ hasText: 'RUN-3080' })).toContainText('CI / main-8f2c', { useInnerText: true });
    await expect(cards(page).filter({ hasText: 'RUN-3077' })).toContainText('已通过', { useInnerText: true });
    await expect(cards(page).filter({ hasText: 'RUN-3076' })).toContainText('已中止', { useInnerText: true });
  });

  test('按执行状态筛选', async ({ page }) => {
    const m = main(page);

    await m.getByRole('button', { name: '执行中', exact: true }).click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('RUN-3081', { useInnerText: true });

    await m.getByRole('button', { name: '存在失败', exact: true }).click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('RUN-3080', { useInnerText: true });

    await m.getByRole('button', { name: '已通过', exact: true }).click();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('RUN-3077', { useInnerText: true });

    await m.getByRole('button', { name: '全部', exact: true }).click();
    await expect(cards(page)).toHaveCount(4);
  });

  test('查看执行明细与失败用例证据', async ({ page }) => {
    const m = main(page);

    await cards(page).filter({ hasText: 'RUN-3080' }).click();
    await expect(page).toHaveURL(/\/runs\/RUN-3080$/);
    await waitForLoaded(page);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('执行详情');
    await expect(
      m.getByRole('heading', { level: 2, name: '退款中心 · 部分退款专项' }),
    ).toBeVisible();

    await expect(m).toContainText('执行进度', { useInnerText: true });
    await expect(m).toContainText('100%', { useInnerText: true });
    await expect(m).toContainText('共 14 条用例', { useInnerText: true });
    await expect(m).toContainText('1m 36s', { useInnerText: true });

    const rows = m.locator('table tbody tr');
    await expect(rows).toHaveCount(14);
    for (const code of ['TC-2111', 'TC-2112', 'TC-2113']) {
      await expect(rows.filter({ hasText: code })).toContainText('失败', { useInnerText: true });
      await expect(rows.filter({ hasText: code })).toContainText('截图', { useInnerText: true });
    }
    await expect(rows.filter({ hasText: 'TC-2100' })).toContainText('通过', { useInnerText: true });

    for (const action of ['重新执行', '生成报告', '实时日志']) {
      await expect(m.getByRole('button', { name: action, exact: true })).toBeVisible();
    }
  });

  test('新建执行弹窗字段完整且可取消', async ({ page }) => {
    const m = main(page);

    await m.getByRole('button', { name: '新建执行', exact: true }).click();
    await expect(page.getByText('新建测试执行', { exact: true })).toBeVisible();

    for (const field of ['执行名称', '执行环境', '执行引擎', '用例范围', '并发数']) {
      await expect(page.getByText(field, { exact: true })).toBeVisible();
    }

    const modalSelects = page.getByRole('combobox');
    await expect(modalSelects.nth(1).locator('option')).toHaveText([
      '测试环境 TEST',
      '预发布 STAGING',
      '性能环境 PERF',
    ]);
    await expect(modalSelects.nth(2).locator('option')).toHaveText([
      'AI Agent',
      '接口驱动',
      '手工',
    ]);
    await expect(modalSelects.nth(3).locator('option')).toHaveText([
      '全量回归',
      '冒烟测试',
      '退款专项',
      '性能压测',
    ]);

    await page.getByRole('button', { name: '取消', exact: true }).click();
    await expect(page.getByText('新建测试执行', { exact: true })).toBeHidden();
    await expect(cards(page)).toHaveCount(4);
  });
});
