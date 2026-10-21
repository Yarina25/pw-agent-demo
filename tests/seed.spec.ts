import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // 统一打开被测页面，作为所有自动化场景的起始环境
  // 【替换点】如需换成其他被测站点，改下面地址即可，例如：
  //   await page.goto('https://your-app.example.com/login');
  await page.goto('https://s6.ink/testpilot-demo');
});

// 空种子用例，仅用于初始化浏览器上下文
test('seed', async () => {});
