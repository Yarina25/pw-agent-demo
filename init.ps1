# ============================================================
#  Playwright Test Agents 一键初始化脚本 (Windows / PowerShell 7)
# ------------------------------------------------------------
#  功能：路径检测 -> 环境检测 -> npm 初始化 -> 安装 Playwright
#        -> 安装浏览器内核 -> 生成 Planner/Generator/Healer 配置
#  用法：
#   方式A（推荐）: 在项目目录内打开 PowerShell，执行
#        .\init.ps1
#   方式B: 右键 init.ps1 -> "使用 PowerShell 运行"
#   方式C: 指定 AI 客户端 loop 与默认被测地址
#        .\init.ps1 -Loop vscode -Target "https://demo.playwright.dev/todomvc"
#  可选参数：
#   -Loop       vscode / claude / codex / opencode，默认 vscode
#   -Target     默认被测站点地址（会写入 seed 种子文件），默认 TodoMVC 官方演示
#   -SkipBrowserInstall  跳过浏览器内核下载（已装过时使用）
# ============================================================

param(
    [ValidateSet('vscode', 'claude', 'codex', 'opencode')]
    [string]$Loop = 'vscode',
    [string]$Target = 'https://demo.playwright.dev/todomvc',
    [switch]$SkipBrowserInstall
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $ProjectRoot

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Playwright Test Agents 一键初始化" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ---------- 0. 路径合法性检测（对应文章"二、目录选择"） ----------
if ($ProjectRoot -match '[\u4e00-\u9fff]') {
    Write-Host "[警告] 当前路径包含中文字符：" -ForegroundColor Yellow
    Write-Host "        $ProjectRoot" -ForegroundColor Yellow
    Write-Host "        Node/Playwright 对中文路径兼容性差，会导致浏览器下载失败、文件写入异常、Agent 工具加载失效。" -ForegroundColor Yellow
    Write-Host "        【建议】把整个 pw-agent-demo 文件夹复制到纯英文路径（如 C:\pw-agent-demo）后再运行本脚本。" -ForegroundColor Yellow
    $ans = Read-Host "是否仍要在此路径继续？(输入 y 继续 / 其他任意键退出)"
    if ($ans -notmatch '^[yY]') { Write-Host "已退出。"; exit 1 }
}
elseif ($ProjectRoot -match '\s') {
    Write-Host "[提示] 当前路径包含空格：" -ForegroundColor Yellow
    Write-Host "        $ProjectRoot" -ForegroundColor Yellow
    Write-Host "        现代 Node 一般可正常处理空格路径；若后续安装或运行异常，请复制到 C:\pw-agent-demo 再试。" -ForegroundColor Yellow
}
else {
    Write-Host "[OK]   路径合法（纯英文、无空格）" -ForegroundColor Green
}

# ---------- 1. Node / npm 检测 ----------
try { $nodeVer = node -v } catch { Write-Host "[失败] 未检测到 Node.js，请先到 https://nodejs.org 安装 Node 20 及以上版本" -ForegroundColor Red; exit 1 }
try { $npmVer = npm -v } catch { Write-Host "[失败] 未检测到 npm" -ForegroundColor Red; exit 1 }
Write-Host "[OK]   Node $nodeVer / npm $npmVer" -ForegroundColor Green

# ---------- 2. VS Code 版本提示 ----------
try {
    $codeVer = (code --version 2>$null | Select-Object -First 1)
    if ($codeVer) {
        Write-Host "[提示] VS Code 版本：$codeVer（Test Agents 要求 v1.105+，即 2025-10-09 之后版本）" -ForegroundColor Yellow
    }
}
catch { }

# ---------- 3. npm 初始化 ----------
if (-not (Test-Path -LiteralPath "$ProjectRoot\package.json")) {
    Write-Host "`n[1/4] 初始化 npm 项目 ..." -ForegroundColor Cyan
    npm init -y
    if ($LASTEXITCODE -ne 0) { Write-Host "[失败] npm init 执行失败" -ForegroundColor Red; exit 1 }
    Write-Host "[OK]   package.json 已生成" -ForegroundColor Green
}
else {
    Write-Host "`n[1/4] package.json 已存在，跳过 npm init" -ForegroundColor DarkGray
}

# ---------- 4. 安装 @playwright/test（必须本地安装） ----------
Write-Host "`n[2/4] 安装 @playwright/test（本地依赖，请稍候）..." -ForegroundColor Cyan
npm i -D @playwright/test
if ($LASTEXITCODE -ne 0) { Write-Host "[失败] npm install 失败，请检查网络后重试" -ForegroundColor Red; exit 1 }
Write-Host "[OK]   @playwright/test 已安装" -ForegroundColor Green

# ---------- 5. 安装浏览器内核 ----------
if (-not $SkipBrowserInstall) {
    Write-Host "`n[3/4] 安装浏览器内核（首次需下载 100-300MB，请耐心等待）..." -ForegroundColor Cyan
    npx playwright install
    if ($LASTEXITCODE -ne 0) { Write-Host "[警告] 浏览器安装未完成，可稍后手动重试：npx playwright install" -ForegroundColor Yellow }
    else { Write-Host "[OK]   浏览器内核已安装" -ForegroundColor Green }
}
else {
    Write-Host "`n[3/4] 已按参数跳过浏览器安装（-SkipBrowserInstall）" -ForegroundColor DarkGray
}

# ---------- 6. 生成 Test Agents 配置（.vscode/mcp.json） ----------
Write-Host "`n[4/4] 生成 Test Agents 配置（--loop=$Loop）..." -ForegroundColor Cyan
npx playwright init-agents --loop=$Loop
if ($LASTEXITCODE -ne 0) {
    Write-Host "[警告] init-agents 未成功，请确认 @playwright/test 版本 >= 1.56（npx playwright --version 查看）" -ForegroundColor Yellow
}
else {
    Write-Host "[OK]   Agent 配置已生成（.vscode/mcp.json）" -ForegroundColor Green
}

# ---------- 7. 创建约定目录 + 种子文件 ----------
New-Item -ItemType Directory -Force -Path "$ProjectRoot\specs", "$ProjectRoot\tests" | Out-Null
$seedPath = "$ProjectRoot\tests\seed.spec.ts"
if (-not (Test-Path -LiteralPath $seedPath)) {
    $seedContent = @"
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // 统一打开被测页面，作为所有自动化场景的起始环境
  await page.goto('$Target');
});

// 空种子用例，仅用于初始化浏览器上下文
test('seed', async () => {});
"@
    Set-Content -LiteralPath $seedPath -Value $seedContent -Encoding utf8
    Write-Host "[OK]   已生成 tests/seed.spec.ts（默认被测地址：$Target）" -ForegroundColor Green
    Write-Host "      如需换成自己的被测站点，用编辑器打开该文件修改 page.goto 地址即可" -ForegroundColor DarkGray
}
else {
    Write-Host "[提示] tests/seed.spec.ts 已存在，保留原文件" -ForegroundColor DarkGray
}

# ---------- 8. 完成提示 ----------
Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  初始化完成！接下来三步：" -ForegroundColor Green
Write-Host "  1) 用 VS Code 打开本目录：File -> Open Folder -> 选择 pw-agent-demo" -ForegroundColor Green
Write-Host "  2) 打开 AI 助手（Copilot Chat），让它读取 prompts/pipeline-prompt.md" -ForegroundColor Green
Write-Host "  3) 按指令执行 Planner -> Generator -> Healer 全流程" -ForegroundColor Green
Write-Host "  详细说明见 README.md" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
