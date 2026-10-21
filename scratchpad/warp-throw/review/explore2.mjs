import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
await page.addInitScript(() => { localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); });
await page.goto('http://127.0.0.1:5293/#combat');
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 60000 });
const out = await page.evaluate(async () => {
  const s = window.__battle.state();
  const { gridFor } = await import('/src/battle/map.ts');
  const g = gridFor(s.mapId);
  const rows = [];
  for (let r = 0; r < g.rows; r++) {
    let row = String(r).padStart(3) + ' ';
    for (let c = 0; c < g.cols; c++) { const i = r * g.cols + c; row += g.water[i] === 2 ? '#' : g.water[i] === 1 ? '~' : (g.blocked?.[i] ? 'X' : '.'); }
    rows.push(row);
  }
  return { cols: g.cols, rows: g.rows, cell: g.cell ?? g.size, keys: Object.keys(g), txt: rows.join('\n') };
});
console.log(out.cols, out.rows, out.cell, out.keys.join(','));
console.log(out.txt);
await browser.close();
