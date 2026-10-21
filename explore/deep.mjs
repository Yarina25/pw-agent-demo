// 逐路由抓取页面结构，直接写 UTF-8 JSON，避免控制台编码问题
import { chromium } from '@playwright/test';
import fs from 'fs';

const base = 'https://s6.ink/testpilot-demo';
const routes = ['/', '/requirements', '/cases', '/runs', '/reports', '/defects', '/assistant', '/interview', '/knowledge', '/settings'];
fs.mkdirSync('explore', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const route of routes) {
  await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(600);

  const data = await page.evaluate(() => {
    const clean = (s) => (s || '').trim().replace(/\s+/g, ' ');
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const collect = (sel) =>
      [...document.querySelectorAll(sel)].filter(visible).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: clean(el.innerText).slice(0, 120),
        type: el.getAttribute('type') || '',
        placeholder: el.getAttribute('placeholder') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        testid: el.getAttribute('data-testid') || '',
        href: el.getAttribute('href') || '',
        disabled: !!el.disabled,
        options: el.tagName === 'SELECT' ? [...el.options].map((o) => clean(o.text)) : undefined,
      }));
    return {
      title: document.title,
      headings: collect('h1, h2, h3'),
      buttons: collect('button, [role=button], [role=tab]'),
      inputs: collect('input, textarea, select'),
      links: collect('a[href]'),
      tableText: [...document.querySelectorAll('table')].map((t) => clean(t.innerText).slice(0, 800)),
      bodyText: clean(document.body.innerText).slice(0, 3500),
    };
  });
  data.route = route;
  data.url = page.url();

  const slug = route === '/' ? 'root' : route.slice(1).replace(/\//g, '_');
  fs.writeFileSync(`explore/route_${slug}.json`, JSON.stringify(data, null, 2), 'utf8');
  await page.screenshot({ path: `explore/shot_${slug}.png`, fullPage: true });
  console.log('OK', route, 'buttons=' + data.buttons.length, 'inputs=' + data.inputs.length, 'tables=' + data.tableText.length);
}

await browser.close();
