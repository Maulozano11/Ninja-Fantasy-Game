import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
// usage: node shots.mjs <outdir> <prefix> [extra]
const [OUT, PREFIX, EXTRA] = process.argv.slice(2);
const URL = 'http://127.0.0.1:5231/#missions';
const camp = readFileSync('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/i18n/camp.json', 'utf8');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
async function page(width, locale = 'es-MX') {
  const ctx = await browser.newContext({ locale, viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([run, lang]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('shinobi5e.mission.v1', run); localStorage.setItem('shinobi.lang', lang); sessionStorage.setItem('seeded', '1'); } }, [camp, process.env.L ?? 'es']);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${width}: ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && errors.push(`${width} console: ${m.text()}`));
  await p.goto(URL);
  await p.waitForTimeout(1800);
  return p;
}
for (const [w, tag] of [[1360, 'desktop'], [400, 'phone']]) {
  const p = await page(w);
  await p.screenshot({ path: `${OUT}/${PREFIX}-${tag}.png`, fullPage: true });
  const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  console.log(tag, 'scrollWidth/clientWidth', sw);
  if (EXTRA) {
    // open the first activity card
    const card = p.getByRole('button', { name: /Vendar/ }).first();
    if (await card.count()) { await card.click(); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${PREFIX}-${tag}-open.png`, fullPage: true }); }
    // keyboard focus check
    await p.keyboard.press('Tab');
  }
  await p.context().close();
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
