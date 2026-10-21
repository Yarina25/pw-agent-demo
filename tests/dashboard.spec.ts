import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav, projectSelect } from './helpers';

test.describe('质量概览', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppReady(page);
  });

  test('首屏展示核心质量指标与最近执行记录', async ({ page }) => {
    const m = main(page);

    await expect(page.locator('header')).toContainText('TRADE', { useInnerText: true });
    await expect(page.getByRole('heading', { level: 1, name: '质量概览' })).toBeVisible();

    // 核心指标
    await expect(m).toContainText('用例总数', { useInnerText: true });
    await expect(m).toContainText('388', { useInnerText: true });
    await expect(m).toContainText('AI 生成 274 条', { useInnerText: true });
    await expect(m).toContainText('平均覆盖率', { useInnerText: true });
    await expect(m).toContainText('91.4%', { useInnerText: true });
    await expect(m).toContainText('68.3%', { useInnerText: true });
    await expect(m).toContainText('94.2%', { useInnerText: true });
    await expect(m).toContainText('AI 节省工时', { useInnerText: true });
    await expect(m).toContainText('126h', { useInnerText: true });

    // 图表与列表区块
    for (const section of [
      '通过率与执行量趋势',
      '缺陷开闭趋势',
      '用例类型分布',
      '缺陷级别分布',
      '进行中的执行',
      '最近执行记录',
      '高风险缺陷',
    ]) {
      await expect(m.getByRole('heading', { level: 2, name: section })).toBeVisible();
    }

    // 最近执行记录
    const rows = m.locator('table tbody tr');
    await expect(rows).toHaveCount(4);
    await expect(rows.filter({ hasText: 'RUN-3081' })).toContainText('执行中', { useInnerText: true });
    await expect(rows.filter({ hasText: 'RUN-3080' })).toContainText('存在失败', { useInnerText: true });
    await expect(rows.filter({ hasText: 'RUN-3080' })).toContainText('79%', { useInnerText: true });
    await expect(rows.filter({ hasText: 'RUN-3077' })).toContainText('100%', { useInnerText: true });
    await expect(rows.filter({ hasText: 'RUN-3076' })).toContainText('已中止', { useInnerText: true });

    // 高风险缺陷
    for (const bug of ['BUG-2210', 'BUG-2209', 'BUG-2207', 'BUG-2203']) {
      await expect(m).toContainText(bug);
    }
  });

  test('侧边导航可到达全部十个模块', async ({ page }) => {
    const routes = [
      { link: '需求 & AI 生成', path: '/requirements', title: '需求 & AI 生成' },
      { link: '用例库', path: '/cases', title: '用例库' },
      { link: '测试执行', path: '/runs', title: '测试执行' },
      { link: '测试报告', path: '/reports', title: '测试报告' },
      { link: '缺陷管理', path: '/defects', title: '缺陷管理' },
      { link: 'AI 助手', path: '/assistant', title: 'AI 助手' },
      { link: '面试题库', path: '/interview', title: 'AI 测试面试题' },
      { link: '知识库', path: '/knowledge', title: 'TestPilot' },
      { link: '设置', path: '/settings', title: '设置' },
      { link: '质量概览', path: '/', title: '质量概览' },
    ];

    for (const route of routes) {
      await nav(page, route.link);
      await expect(page).toHaveURL(new RegExp(`${route.path.replace(/\//g, '\\/')}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.title);
      await expect(main(page)).toBeVisible();
    }
  });

  test('切换项目后徽标与执行记录联动', async ({ page }) => {
    const m = main(page);

    await projectSelect(page).selectOption({ label: '会员增长系统' });
    await expect(page.locator('header')).toContainText('GROW', { useInnerText: true });
    await expect(m).toContainText('RUN-3079', { useInnerText: true });
    await expect(m).toContainText('会员等级升降级回归', { useInnerText: true });
    await expect(m).toContainText('11/11', { useInnerText: true });
    await expect(m).not.toContainText('RUN-3080', { useInnerText: true });

    await projectSelect(page).selectOption({ label: '电商交易中台' });
    await expect(page.locator('header')).toContainText('TRADE', { useInnerText: true });
    await expect(m).toContainText('RUN-3080', { useInnerText: true });
  });

  // 已知产品缺陷：顶部全局搜索输入关键词并回车后，无下拉、无请求、无跳转、无结果提示。
  // 期望行为如下；待产品修复后去掉 test.fixme 即可作为回归用例。
  test.fixme('全局搜索可检索缺陷（已知缺陷：搜索无响应）', async ({ page }) => {
    const search = page.getByPlaceholder('搜索用例 / 缺陷 / 执行记录');
    await search.fill('BUG-2201');
    await search.press('Enter');

    await expect(page.getByText('BUG-2201').first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('质量概览');
  });
});
