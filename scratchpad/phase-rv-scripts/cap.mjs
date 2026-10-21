// node cap.mjs <mode: warp|swap|flicker|swapEnemy|hiddenSwap> <speed> <stepMs> <dpr>
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const mode = process.argv[2] ?? 'warp';
const SPEED = Number(process.argv[3] ?? 1);
const STEP = Number(process.argv[4] ?? 16);
const DPR = Number(process.argv[5] ?? 1);
const OUT = `/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase/review/cap/${mode}_s${SPEED}_d${DPR}`;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: DPR });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
await page.addInitScript((speed) => {
  try { localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); localStorage.setItem('shinobi.battleSpeed', String(speed)); } catch {}
  const real = performance.now.bind(performance);
  let frozen = null; let offset = 0;
  performance.now = () => (frozen !== null ? frozen : real() + offset);
  window.__clock = { freeze() { frozen = real() + offset; }, step(ms) { frozen += ms; }, resume() { offset = frozen - real(); frozen = null; } };
}, SPEED);
await page.goto('http://127.0.0.1:5290/#combat');
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.waitForFunction(() => { const b = window.__battle; const s = b.state(); const id = s.order[s.turn]; return !b.busy() && s.units[id]?.team === 'party'; }, null, { timeout: 90000 });
const tip = page.locator('button', { hasText: 'No más consejos' });
if (await tip.count()) await tip.first().click().catch(() => {});
const setup = await page.evaluate((mode) => {
  const b = window.__battle; const s = b.state();
  const r = Object.values(s.units).find((u) => u.character?.clan === 'Ryusei' && u.team === 'party');
  const ally = Object.values(s.units).find((u) => u.team === 'party' && u.id !== r.id && u.kind === 'ninja' && !u.down);
  const enemy = Object.values(s.units).find((u) => u.team === 'enemy' && u.kind === 'ninja' && !u.down);
  s.turn = s.order.indexOf(r.id); r.turn.bonus = true; r.turn.action = true; r.chakra = r.maxChakra;
  const cell = (x, z) => ({ x: Math.floor(x / 0.5) * 0.5 + 0.25, z: Math.floor(z / 0.5) * 0.5 + 0.25 });
  if (mode === 'swap' || mode === 'hiddenSwap' || mode === 'swapEnemy') {
    const t = mode === 'swapEnemy' ? enemy : ally;
    t.pos = cell(r.pos.x + 6.5, r.pos.z + 2.2);
    if (mode === 'swapEnemy') { t.abilities && (t.abilities.str = 30); }
    if (mode === 'hiddenSwap') { r.cond.hidden = 15; t.cond.hidden = 15; }
    s.nodes.push({ id: 'n_test', owner: r.id, pos: { ...t.pos } });
    b.sync();
    return { r: r.id, other: t.id, from: { ...r.pos }, to: { ...t.pos }, units: Object.values(s.units).map((u) => [u.id, u.name, u.team, u.character?.clan, u.pos]) };
  }
  const p = cell(r.pos.x + 6.5, r.pos.z + 1.5);
  if (mode === 'warp') s.nodes.push({ id: 'n_test', owner: r.id, pos: p });
  b.sync();
  return { r: r.id, other: ally.id, from: { ...r.pos }, to: p, units: Object.values(s.units).map((u) => [u.id, u.name, u.team, u.character?.clan, u.pos]) };
}, mode);
console.log('setup', JSON.stringify(setup));
let action;
if (mode === 'warp') action = { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_warp', at: setup.to };
else if (mode === 'flicker') action = { type: 'jutsu', unit: setup.r, jutsu: 'body_flicker', at: setup.to };
else action = { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_swap', at: setup.to, target: setup.other };
await page.evaluate(({ from, to }) => window.__battle.centerOn((from.x + to.x) / 2, (from.z + to.z) / 2), setup);
await page.waitForTimeout(2500);
const a = await page.evaluate(({ from }) => window.__battle.screenOf(from.x, from.z), setup);
const b2 = await page.evaluate(({ to }) => window.__battle.screenOf(to.x, to.z), setup);
const pad = 130;
const x0 = Math.max(0, Math.min(a.x, b2.x) - pad); const x1 = Math.min(1280, Math.max(a.x, b2.x) + pad);
const y0 = Math.max(0, Math.min(a.y, b2.y) - 200); const y1 = Math.min(760, Math.max(a.y, b2.y) + 40);
const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
await page.evaluate(() => window.__clock.freeze());
await page.waitForTimeout(100);
await page.screenshot({ path: `${OUT}/f000.png`, clip });
const ok = await page.evaluate((action) => { const r = window.__battle.act(action); return r; }, action);
console.log('acted', JSON.stringify(ok ?? null));
const track = [];
const frames = Math.ceil(1200 / STEP);
for (let i = 1; i <= frames; i++) {
  await page.evaluate((ms) => window.__clock.step(ms), STEP);
  await page.waitForTimeout(50);
  const info = await page.evaluate(({ r, other }) => ({ busy: window.__battle.busy(), r: window.__battle.shownAt(r), o: window.__battle.shownAt(other) }), setup);
  track.push({ ms: i * STEP, ...info });
  await page.screenshot({ path: `${OUT}/f${String(i).padStart(3, '0')}.png`, clip });
}
await page.evaluate(() => window.__clock.resume());
await page.waitForTimeout(800);
const after = await page.evaluate(({ r, other }) => { const s = window.__battle.state(); return { r: s.units[r].pos, other: s.units[other].pos, log: (s.log ?? []).slice(-4) }; }, setup);
console.log('after', JSON.stringify(after));
writeFileSync(`${OUT}/meta.json`, JSON.stringify({ step: STEP, frames, clip, setup, track, after, a, b2 }, null, 1));
await browser.close();
