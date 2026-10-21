import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const PORT = process.argv[2] ?? '5290';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
await page.addInitScript(() => {
  try { localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); localStorage.setItem('shinobi.battleSpeed', '1'); } catch {}
  window.__ts = []; const f = (t) => { window.__ts.push(t); requestAnimationFrame(f); }; requestAnimationFrame(f);
});
await page.goto(`http://127.0.0.1:${PORT}/#combat`);
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 30000 });
const t0 = await page.evaluate(() => performance.now());
await page.waitForTimeout(8000);
const r = await page.evaluate((t0) => { const ts = window.__ts.filter((t) => t >= t0); const d = ts.slice(1).map((t, i) => t - ts[i]); return { n: d.length, over40: d.filter((x) => x > 40).map((x) => Math.round(x)), sum: Math.round(d.filter((x) => x > 40).reduce((a, b) => a + b, 0)) }; }, t0);
console.log(PORT, JSON.stringify(r));
// Next: party turn, idle; measure again 3 s
await page.waitForFunction(() => { const b = window.__battle; const s = b.state(); const id = s.order[s.turn]; return !b.busy() && s.units[id]?.team === 'party'; }, null, { timeout: 90000 });
const t1 = await page.evaluate(() => performance.now());
await page.waitForTimeout(3000);
const r2 = await page.evaluate((t0) => { const ts = window.__ts.filter((t) => t >= t0); const d = ts.slice(1).map((t, i) => t - ts[i]); return { n: d.length, over40: d.filter((x) => x > 40).map((x) => Math.round(x)) }; }, t1);
console.log(PORT, 'party idle', JSON.stringify(r2));
await browser.close();
