import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const DPR = Number(process.argv[2] ?? 1);
const mode = process.argv[3] ?? 'warp';
const cold = process.argv[4] === 'cold';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: DPR });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.addInitScript(() => { try { localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); localStorage.setItem('shinobi.battleSpeed', '1'); } catch {} });
await page.goto('http://127.0.0.1:5290/#combat');
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.waitForFunction(() => { const b = window.__battle; const s = b.state(); const id = s.order[s.turn]; return !b.busy() && s.units[id]?.team === 'party'; }, null, { timeout: 90000 });
const setup = await page.evaluate(({ mode, cold }) => {
  const b = window.__battle; const s = b.state();
  const r = Object.values(s.units).find((u) => u.character?.clan === 'Ryusei' && u.team === 'party');
  const ally = Object.values(s.units).find((u) => u.team === 'party' && u.id !== r.id && u.kind === 'ninja' && !u.down);
  // cold: not this Ryusei's turn when the screen idles, so its phases are not made ahead... (other Ryusei still warm). Use the ally's own look changes? Just set turn after.
  if (!cold) s.turn = s.order.indexOf(r.id);
  r.turn.bonus = true; r.turn.action = true; r.chakra = r.maxChakra;
  const cell = (x, z) => ({ x: Math.floor(x / 0.5) * 0.5 + 0.25, z: Math.floor(z / 0.5) * 0.5 + 0.25 });
  const p = cell(r.pos.x + 6.5, r.pos.z + 1.5);
  if (mode === 'swap') { ally.pos = p; }
  s.nodes.push({ id: 'n_test', owner: r.id, pos: p });
  b.sync();
  return { r: r.id, other: ally.id, from: { ...r.pos }, to: p };
}, { mode, cold });
await page.evaluate(({ from, to }) => window.__battle.centerOn((from.x + to.x) / 2, (from.z + to.z) / 2), setup);
await page.waitForTimeout(2500);
const action = mode === 'swap' ? { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_swap', at: setup.to, target: setup.other } : { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_warp', at: setup.to };
const stats = (ts) => { const d = ts.slice(1).map((t, i) => t - ts[i]); const s = [...d].sort((x, y) => x - y); return { n: d.length, avg: +(d.reduce((p, q) => p + q, 0) / d.length).toFixed(1), p50: +s[Math.floor(s.length / 2)].toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), max: +s[s.length - 1].toFixed(1), over25: d.filter((x) => x > 25).length, seq: d.map((x) => Math.round(x)).join(' ') }; };
const idle = await page.evaluate(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 61) requestAnimationFrame(f); else res(ts); }; requestAnimationFrame(f); }));
const during = await page.evaluate(({ action, cold, r }) => new Promise((res) => {
  const ts = [];
  const f = (t) => { ts.push(t); if (ts.length < 61) requestAnimationFrame(f); else res(ts); };
  requestAnimationFrame((t) => { ts.push(t); const s = window.__battle.state(); if (cold) { s.turn = s.order.indexOf(r); } window.__battle.act(action); requestAnimationFrame(f); });
}), { action, cold, r: setup.r });
console.log(DPR, mode, cold ? 'cold' : 'warm', 'idle', JSON.stringify(stats(idle)));
console.log(DPR, mode, cold ? 'cold' : 'warm', 'during', JSON.stringify(stats(during)));
await browser.close();
