import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav } from './helpers';

test.describe('需求 & AI 生成', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppReady(page);
    await nav(page, '需求 & AI 生成');
  });

  test('需求列表与详情面板联动', async ({ page }) => {
    const m = main(page);

    await expect(m).toContainText('需求总数', { useInnerText: true });
    await expect(m).toContainText('累计生成用例', { useInnerText: true });
    await expect(m).toContainText('平均覆盖率', { useInnerText: true });
    await expect(m.getByRole('button', { name: /^REQ-10\d\d/ })).toHaveCount(4);

    // 默认选中第一条需求
    await expect(
      m.getByRole('heading', { level: 2, name: '购物车跨店铺合并结算' }),
    ).toBeVisible();
    await expect(m).toContainText('多店铺商品可在购物车合并结算', { useInnerText: true });

    await m.getByRole('button', { name: /REQ-1042/ }).click();
    await expect(
      m.getByRole('heading', { level: 2, name: '支持订单部分退款与差异金额核算' }),
    ).toBeVisible();
    await expect(m).toContainText('用例覆盖 14 条', { useInnerText: true });

    await m.getByRole('button', { name: /REQ-1047/ }).click();
    await expect(
      m.getByRole('heading', { level: 2, name: '订单状态变更实时推送' }),
    ).toBeVisible();
    await expect(m).toContainText('用例覆盖 8 条', { useInnerText: true });
  });

  test('AI 生成用例产出结构化用例矩阵', async ({ page }) => {
    // 生成过程包含多步解析，单测放宽到 2 分钟
    test.setTimeout(120_000);
    const m = main(page);

    await m.getByRole('button', { name: /REQ-1043/ }).click();
    await expect(
      m.getByRole('heading', { level: 2, name: '新增「先享后付」支付方式' }),
    ).toBeVisible();

    // 首次为「AI 生成用例」，已生成过则按钮变为「重新生成」，两种都兼容
    await m.getByRole('button', { name: /AI 生成用例|重新生成/ }).first().click();

    await expect(m.getByText(/已生成 \d+ 条用例/)).toBeVisible({ timeout: 90_000 });
    await expect(m).toContainText('平均置信度', { useInnerText: true });
    await expect(m.getByRole('button', { name: '全部加入用例库' })).toBeVisible();

    // 六类结构化用例覆盖
    for (const keyword of [
      '主流程正向用例',
      '边界值用例',
      '并发幂等用例',
      '权限与越权用例',
      '异常与降级用例',
      '兼容性用例',
    ]) {
      await expect(m.getByText(new RegExp(keyword))).toBeVisible();
    }
    // 用例卡片的标签与数值分行渲染，需用可见文本 + 允许多空白匹配
    await expect(m).toContainText(/置信度\s+\d+%/, { useInnerText: true });
  });

  test('需求详情展示来源、负责人与生成状态', async ({ page }) => {
    const m = main(page);

    await m.getByRole('button', { name: /REQ-1047/ }).click();
    await expect(
      m.getByRole('heading', { level: 2, name: '订单状态变更实时推送' }),
    ).toBeVisible();

    await expect(m).toContainText('来源', { useInnerText: true });
    await expect(m).toContainText('负责人', { useInnerText: true });
    await expect(m.getByText('生成状态')).toBeVisible();
    await expect(m).toContainText('覆盖率', { useInnerText: true });
  });
});
