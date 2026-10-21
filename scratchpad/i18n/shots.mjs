import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const D = process.argv[2];
const URL = 'http://127.0.0.1:5199/#missions';
const camp = readFileSync(`${D}/camp.json`, 'utf8');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
async function page(locale, init) {
  const ctx = await browser.newContext({ locale, viewport: { width: 1360, height: 1000 } });
  if (init) await ctx.addInitScript(init.fn, init.arg);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${locale}: ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && errors.push(`${locale} console: ${m.text()}`));
  await p.goto(URL);
  await p.waitForTimeout(1500);
  return p;
}
// 1. Spanish browser, no saved choice: the village board starts in Spanish.
let p = await page('es-MX');
console.log('lang attr / first heading (es-MX):', await p.evaluate(() => document.querySelector('h1')?.textContent));
await p.screenshot({ path: `${D}/village-es.png`, fullPage: true });
await p.getByRole('button', { name: /Partir con/ }).click();
await p.waitForTimeout(1200);
await p.screenshot({ path: `${D}/road-es.png`, fullPage: true });
console.log('road es h2:', await p.locator('h2').first().textContent());
// Switch to English with the toggle: everything follows, and the choice is remembered.
await p.getByRole('button', { name: 'EN', exact: true }).first().click();
await p.waitForTimeout(500);
await p.screenshot({ path: `${D}/road-en.png`, fullPage: true });
console.log('road en h2:', await p.locator('h2').first().textContent());
console.log('stored lang:', await p.evaluate(() => localStorage.getItem('shinobi.lang')));
await p.reload(); await p.waitForTimeout(1200);
console.log('after reload h2:', await p.locator('h2').first().textContent());
await p.context().close();
// 2. The camp screen from a saved run, in both languages.
for (const [locale, file] of [['es-MX', 'camp-es.png'], ['en-US', 'camp-en.png']]) {
  p = await page(locale, { fn: (run) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('shinobi5e.mission.v1', run); sessionStorage.setItem('seeded', '1'); } }, arg: camp });
  await p.screenshot({ path: `${D}/${file}`, fullPage: true });
  console.log(locale, 'camp h2:', await p.locator('h2').first().textContent());
  // open the first activity card and the log, to cover options and the log lines
  await p.context().close();
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
