import { expect, test } from '@playwright/test';
import { gotoAppReady, main, nav, waitForLoaded } from './helpers';

test.describe('设置', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppReady(page);
    await nav(page, '设置');
  });

  test('展示 AI Agent 配置表', async ({ page }) => {
    const m = main(page);

    await expect(m).toContainText('启用 Agent', { useInnerText: true });
    await expect(m).toContainText('累计调用', { useInnerText: true });
    await expect(m).toContainText('1880', { useInnerText: true });
    await expect(m).toContainText('40.8k', { useInnerText: true });

    const rows = m.locator('table tbody tr');
    await expect(rows).toHaveCount(4);
    for (const keyword of [
      'agent-1',
      'agent-2',
      'agent-3',
      'agent-4',
      '用例生成',
      '执行调度',
      '缺陷分析',
      '报告总结',
      'gpt-4o-mini',
      'deepseek-v3',
      'doubao-pro',
    ]) {
      await expect(m).toContainText(keyword);
    }
  });

  test('展示模型服务与执行配置', async ({ page }) => {
    const m = main(page);

    for (const service of [
      'OpenAI · gpt-4o',
      '火山方舟 · doubao-pro-32k',
      'DeepSeek · deepseek-v3',
      'Ollama · qwen2.5-14b',
    ]) {
      await expect(m).toContainText(service);
    }
    await expect(m).toContainText('已连接', { useInnerText: true });
    await expect(m).toContainText('未配置', { useInnerText: true });
    await expect(m).toContainText('640ms', { useInnerText: true });
    await expect(m).toContainText('320ms', { useInnerText: true });
    await expect(m).toContainText('480ms', { useInnerText: true });

    const selects = m.locator('select');
    await expect(selects.nth(0).locator('option')).toHaveText([
      'gpt-4o',
      'doubao-pro-32k',
      'deepseek-v3',
    ]);
    await expect(selects.nth(1).locator('option')).toHaveText([
      '测试环境 TEST',
      '预发布 STAGING',
      '性能环境 PERF',
    ]);
    await expect(selects.nth(2).locator('option')).toHaveText([
      'Playwright / Chromium 128',
      'Playwright / Firefox',
      'Selenium / Chrome',
    ]);

    await expect(m.locator('input[type=number]')).toHaveValue('8');
    await expect(m).toContainText('自动生成测试用例', { useInnerText: true });
    await expect(m).toContainText('失败自动定级与派单', { useInnerText: true });
    await expect(m.getByRole('button', { name: '保存配置', exact: true })).toBeVisible();
  });

  test('保存配置并刷新后保持', async ({ page }) => {
    const original = await main(page).locator('input[type=number]').inputValue();
    const target = original === '6' ? '5' : '6';

    try {
      await main(page).locator('input[type=number]').fill(target);
      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/settings/execution') && r.request().method() === 'PUT',
        ),
        main(page).getByRole('button', { name: '保存配置', exact: true }).click(),
      ]);
      expect(response.ok()).toBeTruthy();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForLoaded(page);
      await expect(main(page).locator('input[type=number]')).toHaveValue(target);
    } finally {
      const input = main(page).locator('input[type=number]');
      if ((await input.count()) > 0) {
        await input.fill(original);
        await Promise.all([
          page
            .waitForResponse(
              (r) => r.url().includes('/settings/execution') && r.request().method() === 'PUT',
            )
            .catch(() => null),
          main(page).getByRole('button', { name: '保存配置', exact: true }).click(),
        ]);
      }
    }
  });
});
