// Planner 探索脚本：抓取页面结构、可交互元素与基础截图
import { chromium } from '@playwright/test';
import fs from 'fs';

const outDir = 'explore';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

const resp = await page.goto('https://s6.ink/testpilot-demo', { waitUntil: 'networkidle', timeout: 60000 });
console.log('STATUS', resp?.status());
console.log('URL', page.url());
console.log('TITLE', await page.title());

console.log('\n=== ARIA SNAPSHOT ===');
console.log(await page.locator('body').ariaSnapshot());

console.log('\n=== INTERACTIVE ELEMENTS ===');
const elements = await page.locator('a, button, input, textarea, select, [role=button], [role=tab], [data-testid]').evaluateAll((els) =>
  els.map((el) => ({
    tag: el.tagName.toLowerCase(),
    type: el.getAttribute('type') || '',
    testid: el.getAttribute('data-testid') || '',
    role: el.getAttribute('role') || '',
    name: (el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.innerText || el.value || '').trim().slice(0, 80),
    href: el.getAttribute('href') || '',
    visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
  }))
);
console.log(JSON.stringify(elements, null, 2));

await page.screenshot({ path: `${outDir}/home.png`, fullPage: true });
console.log('\n=== CONSOLE ERRORS ===');
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)');

await browser.close();
