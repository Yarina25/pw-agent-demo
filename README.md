# Playwright Test Agents 端到端流水线项目

> 把「探索（Planner）→ 生成（Generator）→ 自愈（Healer）」三段式 AI 测试流水线落地为可直接运行的项目。
> 基于 Playwright 1.56+ Test Agents 官方能力与实战踩坑整理，Windows / Mac 通用。

---

## 一、这个项目能做什么

| 智能体 | 职责 | 产出 | 对应人工流程 |
|---|---|---|---|
| 🎭 Planner | 自动拉起浏览器探索被测应用，遍历交互元素，识别正常+边界场景 | `specs/*.md` 结构化测试计划（只梳理，不写代码） | 梳理测试场景 |
| 🎭 Generator | 读取测试计划，实时联动浏览器校验元素，优先语义化定位器 | `tests/*.spec.ts` 可直接运行的脚本 | 编写测试用例 |
| 🎭 Healer | 批量执行用例，失败时回放步骤、读页面源码与日志，自动修复测试代码问题；产品真 bug 则标记 fixme 跳过 | 修复后的最终用例 + 执行日志 | 执行并维护用例 |

三者可串联成闭环：**零用例编写 → 自动执行 → 故障自动修复**。

## 二、环境要求（先自查，缺哪个装哪个）

| 依赖 | 要求 | 检查命令 | 获取地址 |
|---|---|---|---|
| Node.js | 20+（本机已装 v22.23.2 ✅） | `node -v` | https://nodejs.org |
| npm | 随 Node 自带（本机 10.9.8 ✅） | `npm -v` | — |
| VS Code | **v1.105+**（2025-10-09 后版本，Agent 配置才能被识别） | `code --version` | https://code.visualstudio.com |
| AI 助手 | VS Code 内已启用（Copilot Chat 等） | 界面右上角可见聊天图标 | VS Code 扩展市场 |

> ⚠️ 若 `code --version` 显示的版本号低于 1.105，请先升级 VS Code，否则 `.vscode/agents` 配置不会被加载。

## 三、目录结构

```
pw-agent-demo/
├── README.md                 # 本手册
├── init.ps1                  # ⭐ 一键初始化脚本（先跑这个）
├── playwright.config.ts      # Playwright 基础配置
├── .gitignore
├── specs/                    # Planner 产出的测试计划（人类可读）
│   └── testpilot-plan.md     #   输出目标占位，运行后会被自动覆盖
├── tests/                    # Generator 产出的测试脚本
│   └── seed.spec.ts          #   ⭐ 种子脚本：统一初始化浏览器环境（可改被测地址）
└── prompts/
    └── pipeline-prompt.md    # ⭐ 给 VS Code AI 助手的完整流水线指令（可直接复制）
```

流水线跑完后会新增：
- `tests/todo-scenarios.spec.ts` 等生成用例（Generator 产出）
- `test-results/`、`playwright-report/`（Healer 执行日志与报告）
- `.vscode/mcp.json`（init 时生成的 Test Agents MCP 配置，勿删）

## 四、快速开始（总共 3 步）

### 第 1 步：一键初始化环境

在项目目录内打开 PowerShell，执行：

```powershell
.\init.ps1
```

脚本会自动完成：路径合法性检测 → Node/npm 检测 → `npm init` → 安装 `@playwright/test` → 安装浏览器内核 → 生成 Agent MCP 配置（`.vscode/mcp.json`）→ 生成种子文件 `tests/seed.spec.ts`。

> 可选参数：`.\init.ps1 -Loop claude`（AI 客户端选 claude/codex/opencode）；`.\init.ps1 -Target "https://你的站点"`（直接把默认被测地址写进种子文件）。

### 第 2 步：确认种子脚本（被测站点）

用编辑器打开 `tests/seed.spec.ts`：

```ts
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // 【替换点】改成你的被测站点；如需登录等前置操作，加在 goto 之后
  await page.goto('https://s6.ink/testpilot-demo');
});

// 空种子用例，仅用于初始化浏览器上下文
test('seed', async () => {});
```

- 当前被测站：TestPilot Demo（`https://s6.ink/testpilot-demo`），已完成配置。
- 换成自己的项目：改 `page.goto` 地址；有登录态要求就在 `beforeEach` 里补登录步骤。

### 第 3 步：用 VS Code 打开并交给 AI 助手

1. 打开 VS Code → **File → Open Folder…** → 选择本 `pw-agent-demo` 文件夹。
   > ⚠️ 必须把项目目录作为工作区打开，否则无法识别 `.vscode/mcp.json` 配置。
2. 打开 AI 助手（如 Copilot Chat，快捷键 `Ctrl+Shift+I` 或点击右上角聊天图标）。
3. 让 AI 助手读取 `prompts/pipeline-prompt.md`（可直接说："读取 prompts/pipeline-prompt.md 并执行里面的指令"），或把该文件中【复制以下全部内容】整段粘贴给它。
4. 回车执行。AI 会自动完成：**探索 → 生成测试计划 → 生成脚本 → 执行并自愈**，全程无需人工干预。

## 五、执行后看什么（产物核对）

| 产物 | 路径 | 作用 |
|---|---|---|
| 测试计划 | `specs/testpilot-plan.md` | 人工评审、场景核对用 |
| 生成脚本 | `tests/todo-scenarios.spec.ts` 等 | 浏览器预校验过的稳定用例 |
| 自愈后用例 | `tests/` 下修复版 | 适配当前 UI 版本，可直接入库 |
| 执行日志/报告 | `test-results/`、`playwright-report/` | 失败回放、trace 定位 |

## 六、目录选择红线（踩坑预警）

| 场景 | 结论 |
|---|---|
| 未初始化 npm 的裸文件夹 | ❌ `init-agents` 依赖 package.json，会直接失败 → 用本项目的 init.ps1 |
| 含中文 / 空格 / 特殊符号的路径 | ❌ 浏览器下载失败、文件写入异常、Agent 工具加载失效（init.ps1 会自动检测警告） |
| 系统保护目录（Windows、Program Files 等） | ❌ 权限受限，无法拉起浏览器 → 放到用户目录或磁盘根目录 |
| 新建纯英文无空格空目录 | ✅ 最稳方案（本项目的默认形态） |

> 本机用户名含空格（`C:\Users\X1 Yoga\...`）时，init.ps1 会提示但可继续；若安装/运行出现异常，把整个文件夹复制到 `C:\pw-agent-demo` 再执行一遍即可。

## 七、核心注意事项（来自实战）

1. **三大智能体不能独立命令行调用**：必须依托 MCP 协议、由 VS Code 等 AI 客户端调度，`npx` 敲命令无法一键执行。
2. **Healer 只修测试代码**（定位器失效、超时不足、测试数据异常），不修产品功能 bug——发现真 bug 会标记 `fixme` 跳过，避免无效重试。
3. **文件读写以当前项目为根**：目录干净、路径规范是流水线稳定的前提，别把用例文件乱放。
4. **CI 里不能直接跑 AI 智能体**：先在本地生成稳定用例，再放到 CI 批量执行（如 `npx playwright test`）。

## 八、常见问题排查

| 现象 | 原因 | 解决 |
|---|---|---|
| init-agents 报错/没生成 .vscode/mcp.json | Playwright 版本 < 1.56 | `npx playwright --version` 查看，`npm i -D @playwright/test@latest` 升级 |
| VS Code 识别不到 Agent | VS Code < 1.105 | 升级 VS Code 后重开工作区 |
| 浏览器下载失败 | 路径含中文/空格 或网络问题 | 换纯英文路径重跑 `npx playwright install`，或设置镜像环境变量后重试 |
| 用例报"定位器找不到" | UI 已变更 | 交给 Healer 自愈（最大 3 轮），不要手工批量改 |
| AI 助手没反应 | 没把项目目录作为工作区打开 | File → Open Folder 重新打开本项目 |
