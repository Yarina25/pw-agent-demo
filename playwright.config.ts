import { defineConfig } from '@playwright/test';

export default defineConfig({
  // 测试文件所在目录（Planner/Generator 生成的用例都会落到 tests/ 下）
  testDir: './tests',

  // 单条用例超时：共享 Demo 后端偶发慢响应，留足导航与断言余量
  timeout: 60_000,

  // 断言超时：页面数据多为异步渲染
  expect: { timeout: 10_000 },

  // Demo 数据由所有用例共享，串行执行避免互相污染
  fullyParallel: false,
  workers: 1,

  // 默认不重试（自愈由 Healer 负责，避免普通重试掩盖问题）
  retries: 0,

  // HTML 报告：生成后不自动打开浏览器；JSON 报告直接落盘（避免 PowerShell 重定向破坏 UTF-8）
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'explore/run_final.json' }],
  ],

  use: {
    // 失败时录制 trace，便于 Healer 与人工定位
    trace: 'on-first-retry',
    // 子路由深链会被短链站点拦截，用例必须从入口做 SPA 导航；baseURL 仅作相对路径基准
    baseURL: 'https://s6.ink/testpilot-demo',
  },
});
