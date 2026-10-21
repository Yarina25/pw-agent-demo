import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav } from './helpers';

test.describe('测试报告', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppReady(page);
    await nav(page, '测试报告');
  });

  test('报告列表与默认详情', async ({ page }) => {
    const m = main(page);

    await expect(m.getByRole('button', { name: /RUN-3080/ })).toHaveCount(1);
    await expect(m.getByRole('button', { name: /RUN-3077/ })).toHaveCount(1);
    await expect(m.getByRole('button', { name: /RUN-3080/ })).toContainText('高风险', { useInnerText: true });
    await expect(m.getByRole('button', { name: /RUN-3077/ })).toContainText('100%', { useInnerText: true });

    // 默认选中 RUN-3080
    await expect(
      m.getByRole('heading', { level: 2, name: '质量报告 · 退款中心 · 部分退款专项' }),
    ).toBeVisible();
    await expect(m).toContainText('RUN-3080 · 预发布 STAGING', { useInnerText: true });
    await expect(m).toContainText('用例总数 14', { useInnerText: true });
    await expect(m).toContainText('通过 11', { useInnerText: true });
    await expect(m).toContainText('失败 3', { useInnerText: true });
    await expect(m).toContainText('通过率 79%', { useInnerText: true });
    await expect(m).toContainText('1m 36s', { useInnerText: true });

    await expect(m).toContainText('TC-2111', { useInnerText: true });
    await expect(m).toContainText('TC-2112', { useInnerText: true });
    await expect(m).toContainText('TC-2113', { useInnerText: true });
    await expect(m).toContainText('期望 132.22，实际 132.02', { useInnerText: true });

    for (const section of ['通过率趋势', '结果构成', '失败用例', '关联缺陷', 'AI 改进建议']) {
      await expect(m.getByRole('heading', { level: 2, name: section })).toBeVisible();
    }
    await expect(m).toContainText('BUG-2201', { useInnerText: true });
    await expect(m).toContainText('BUG-2202', { useInnerText: true });
    await expect(m.getByRole('button', { name: '导出报告', exact: true })).toBeVisible();
  });

  test('切换到满分报告', async ({ page }) => {
    const m = main(page);

    await m.getByRole('button', { name: /RUN-3077/ }).click();
    await expect(
      m.getByRole('heading', { level: 2, name: '质量报告 · 大促下单压测 5000TPS' }),
    ).toBeVisible();
    await expect(m).toContainText('RUN-3077 · 性能环境 PERF', { useInnerText: true });
    await expect(m).toContainText('用例总数 6', { useInnerText: true });
    await expect(m).toContainText('通过率 100%', { useInnerText: true });
    await expect(m).toContainText('本次执行无失败用例', { useInnerText: true });
    await expect(m).toContainText('BUG-2207', { useInnerText: true });
    await expect(m).toContainText('BUG-2210', { useInnerText: true });
  });

  test('导出报告触发文件下载', async ({ page }) => {
    const m = main(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      m.getByRole('button', { name: '导出报告', exact: true }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('report-RUN-3080.txt');
  });
});
