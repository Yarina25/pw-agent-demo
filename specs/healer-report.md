# TestPilot Demo — Healer 自愈与执行报告

> 被测应用：`https://s6.ink/testpilot-demo`
> 测试计划：[`specs/testpilot-plan.md`](./testpilot-plan.md)
> 执行时间：2026-10-21，单实例串行（`workers=1`）

## 1. 执行摘要

| 轮次 | 范围 | 结果 | 说明 |
| --- | --- | --- | --- |
| 第 1 轮 | 全量 38 条 | 23 passed / 11 failed / 3 timed out / 1 skipped | 失败均为断言与定位器问题；3 条超时源于同机并发跑了两份 Playwright + 共享后端 |
| 第 2 轮 | 失败用例定向修复 | 逐文件复跑收敛 | 修复 7 类根因，见第 2 节 |
| 第 3 轮 | 全量 38 条 | **37 passed / 1 skipped / 0 failed / 0 flaky** | 耗时 7.5 分钟，exit=0 |

最终统计（`explore/run_final.summary.json`）：

```json
{
  "total": 38,
  "byStatus": { "passed": 37, "skipped": 1 },
  "failed": []
}
```

跳过项为已知产品缺陷，使用 `test.fixme` 标记：

- `tests/dashboard.spec.ts` › 全局搜索可检索缺陷（已知缺陷：搜索无响应）

## 2. 自愈修复清单（按根因归类）

| # | 根因 | 表现 | 修复 |
| --- | --- | --- | --- |
| 1 | `toContainText` 默认取 `textContent`，块级元素拼接后无空格 | `用例总数 14`、`AI 生成 11`、`执行进度 72%`、`题库总数 23` 等标签+数值断言全部失败 | 147 处字符串断言统一加 `{ useInnerText: true }`（按可见文本、空白归一化后匹配） |
| 2 | 详情弹窗文案与列表单元格、下拉 `option` 全局重名 | `getByText('交易链路')` 命中隐藏的 `<option>`，`toBeVisible` 失败 | 新增 `detailPanel()` 限定 `div.fixed.inset-0.z-50` 作用域；关闭后用 `toBeHidden()` 校验弹窗消失 |
| 3 | `getByPlaceholder('标题')` 子串匹配 | 同时命中「标题」输入框与「搜索标题 / 备注 / 内容…」 | 改为 `getByPlaceholder('标题', { exact: true })` |
| 4 | 悬浮助手与助手页输入框同 placeholder（严格模式冲突） | `locator.fill` 解析到 2 个 textarea | 悬浮面板改为 `div.fixed` + 标题 + `textarea` 的组合定位 |
| 5 | 需求 AI 生成的置信度分两行渲染（`置信度` / `80%`） | `getByText(/置信度 \d+%/)` 找不到元素 | 改为 `toContainText(/置信度\s+\d+%/, { useInnerText: true })` |
| 6 | 助手会话写入后端存在秒级最终一致性 | POST 返回后立即进入助手页，历史 GET 仍是旧数据 | 先等 `POST /assistant/conversations/.../messages` 返回 200，再用有界 `expect.poll`（未命中时重载拉取）判定共享会话 |
| 7 | 首屏指标异步拉取与断言竞争 | 报告页 `beforeEach` 停在「正在加载质量概览…」超时 | `gotoApp` 先等加载占位消失，再用 30s 超时断言首屏；`waitForLoaded` 覆盖「正在加载会话」，上限 30s；用例超时 45s→60s |

## 3. 环境与数据说明

- 后端为共享 Demo（`*.trycloudflare.com`），数据为可变种子数据。第 1 轮并发压力下曾返回不完整的面试题库（23 条），单实例复测恢复 135 条；因此所有数值断言均在单实例串行下复核通过。
- 第 1 轮出现单条用例卡死 42 分钟：同机同时运行了两份 Playwright 进程，后续严格单实例执行未复现。`workers=1` + `retries=0` 保持不变，避免重试掩盖真实问题。
- 写入型用例已做幂等/还原：AI 生成兼容「重新生成」，设置保存用 `try/finally` 还原并发数，新建执行只开弹窗不提交。

## 4. 产物清单

| 类型 | 路径 |
| --- | --- |
| 测试计划 | `specs/testpilot-plan.md`（11 个场景域 / 38 条用例设计） |
| 执行脚本 | `tests/*.spec.ts`（10 个业务 spec + `navigation.spec.ts` + `seed.spec.ts` + `helpers.ts`） |
| 运行配置 | `playwright.config.ts`（60s 用例超时、10s 断言超时、`workers=1`、HTML + JSON 报告） |
| 执行日志（JSON） | `explore/run_final.json` |
| 执行日志（汇总） | `explore/run_final.summary.json` |
| 执行日志（控制台） | `explore/run_final.list.txt` |
| HTML 报告 | `playwright-report/index.html` |
| 探索产物 | `explore/`（23 份页面快照、7 轮定向探针脚本与结果） |

## 5. 复现方式

```powershell
cd d:\projects\pw-agent-demo
npx playwright test                 # 全量执行，自动生成 HTML + JSON 报告
npx playwright show-report          # 查看 HTML 报告
npx playwright test tests/runs.spec.ts   # 单文件执行
```

## 6. 遗留风险

1. 全局搜索无响应为产品缺陷，`test.fixme` 保留；产品修复后移除标记即可作为回归用例。
2. 缺陷详情按 `✕` 关闭（ESC 不生效），与常规弹窗习惯不一致，属交互不一致而非阻断缺陷，用例按实际行为编写。
3. 共享 Demo 后端存在慢响应与数据波动，用例已放宽超时并改用可见文本断言；若后端长期不稳定，建议改用独立环境或固定数据快照。
