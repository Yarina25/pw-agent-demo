# Playwright Test Agents 完整流水线指令（给 VS Code AI 助手）

> 用法：用 VS Code 打开本项目目录后，把下面「【复制以下全部内容】」中的指令原样粘贴给 AI 助手
> （Copilot Chat / 任何已接入本工作区的 AI 客户端），即可自动执行 Planner → Generator → Healer 全流程。
>
> ⚠️ 必须先执行 init.ps1 完成环境初始化，且 VS Code 版本 ≥ 1.105。

---

## 【复制以下全部内容】

使用 Playwright Test Agents 完整流水线，按顺序执行 Planner → Generator → Healer 全流程

被测目标地址：https://s6.ink/testpilot-demo
项目种子文件：tests/seed.spec.ts

执行规则：
1. 调用 Planner：基于种子脚本启动浏览器，完整探索 TestPilot Demo 全部业务场景，覆盖主要用户流程与关键功能场景（含边界场景），生成标准化测试计划，输出到 specs/testpilot-plan.md
2. Planner 执行完成后，自动调用 Generator：读取测试计划，生成稳定可执行的 Playwright 测试脚本，优先使用语义化定位器，写入 tests/ 目录，生成前实时浏览器校验场景有效性
3. Generator 完成后，调用 Healer：批量执行所有生成的测试用例，开启自动自愈能力
   - 针对定位器失效、超时、测试数据等测试代码问题，自动修复并回写源码
   - 识别产品功能 bug，自动标记 fixme 跳过，不无效重试
   - 最大自愈重试 3 轮

最终输出：完整测试计划、可运行测试脚本、自愈修复后的最终用例及执行日志

---

## 换成你自己的被测项目（参数对照表）

粘贴前，按下表替换指令中的 4 处占位内容：

| 占位内容 | 当前示例值 | 替换为 |
|---|---|---|
| 被测目标地址 | `https://s6.ink/testpilot-demo` | 你被测站点的 URL（与 seed.spec.ts 中 page.goto 保持一致） |
| 被测应用名 | TestPilot Demo | 你的应用名称 |
| 探索的业务场景 | 主要用户流程与关键功能场景 | 按你的应用主流程列出，例如：登录、搜索、下单、退款 |
| 计划文件路径 | specs/testpilot-plan.md | 建议保持 specs/ 下，文件名可改，如 specs/login-plan.md |

配套修改：
1. `tests/seed.spec.ts`：把 `page.goto('...')` 改成你的站点地址；如需登录等前置操作，在 `beforeEach` 中补上（Planner 会基于此统一上下文探索）。
2. `prompts/pipeline-prompt.md`：把示例指令替换成你的场景描述，便于重复使用。

## 单独调用某个智能体（可选）

- 只做探索梳理：粘贴「调用 Planner：…… 输出到 specs/xxx.md」单条指令即可。
- 只生成脚本：粘贴「调用 Generator：读取 specs/xxx.md，生成测试脚本写入 tests/」。
- 只自愈：粘贴「调用 Healer：执行 tests/ 下全部用例，开启自动自愈，最大重试 3 轮」。
