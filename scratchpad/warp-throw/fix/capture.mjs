// Drives the real battle screen: starts "Renegados en el claro" with Solen (Ryusei), gives him a look
// (Solen, Aiden, or bare hands), sets a Node beside a foe or on empty ground, and plays a Warp Strike
// (or a Spatial Swap) with a frozen clock, stepping it to capture frames.
//   node capture.mjs <look: solen|aiden|bare> <where: foe|empty|behind|swap|explore|perf> [stepMs] [outName]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/warp-throw/fix/cap';
const lookName = process.argv[2] ?? 'solen';
const where = process.argv[3] ?? 'explore';
const STEP = Number(process.argv[4] ?? 40);
const name = process.argv[5] ?? `${lookName}-${where}`;
const SPEED = Number(process.env.SPEED ?? 1);
mkdirSync(`${OUT}/${name}`, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: Number(process.env.DPR ?? 2) });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
await page.addInitScript((speed) => {
  // The same battle every run (the practice screen seeds it from Math.random on the click).
  let seed = 424242;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  try { localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); localStorage.setItem('shinobi.battleSpeed', String(speed)); } catch {}
  const real = performance.now.bind(performance);
  let frozen = null;
  let offset = 0;
  performance.now = () => (frozen !== null ? frozen : real() + offset);
  window.__clock = {
    freeze() { frozen = real() + offset; },
    step(ms) { frozen += ms; },
    resume() { offset = frozen - real(); frozen = null; },
  };
}, SPEED);
await page.goto('http://127.0.0.1:5294/#combat');
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.waitForFunction(() => {
  const b = window.__battle;
  const s = b.state();
  const id = s.order[s.turn];
  return !b.busy() && s.units[id]?.team === 'party';
}, null, { timeout: 90000 });
const tip = page.locator('button', { hasText: 'No más consejos' });
if (await tip.count()) await tip.first().click().catch(() => {});
const summary = await page.evaluate(() => {
  const s = window.__battle.state();
  return { phase: s.phase, turn: s.order[s.turn], units: Object.values(s.units).map((u) => ({ id: u.id, name: u.name, team: u.team, clan: u.character?.clan, kind: u.kind, pos: u.pos, down: u.down, held: u.look?.slots?.held?.id ?? u.character?.appearance?.slots?.held?.id })) };
});
if (where === 'explore') {
  console.log(JSON.stringify(summary, null, 1));
  await page.screenshot({ path: `${OUT}/${name}/explore.png` });
  await browser.close();
  process.exit(0);
}

// The scene: the Ryusei's turn with its bonus action and chakra, its look, a foe a few metres off.
const setup = await page.evaluate(async ({ lookName, where }) => {
  const b = window.__battle;
  const s = b.state();
  const { LEGENDARY_PRESETS } = await import('/src/data/shinobiData.ts');
  const r = Object.values(s.units).find((u) => u.character?.clan === 'Ryusei' && u.team === 'party');
  const ally = Object.values(s.units).find((u) => u.team === 'party' && u.id !== r.id && u.kind === 'ninja' && !u.down);
  const foe = Object.values(s.units).filter((u) => u.team === 'enemy' && !u.down && u.kind === 'ninja').sort((a, c) => Math.hypot(a.pos.x - r.pos.x, a.pos.z - r.pos.z) - Math.hypot(c.pos.x - r.pos.x, c.pos.z - r.pos.z))[0];
  s.turn = s.order.indexOf(r.id);
  r.turn.bonus = true;
  r.turn.action = true;
  r.chakra = r.maxChakra;
  r.armed = true;
  const base = r.character.appearance;
  if (lookName === 'aiden') r.look = structuredClone(LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden').character.appearance);
  else if (lookName === 'bare') {
    const l = structuredClone(base);
    delete l.slots.held;
    r.look = l;
  } else if (lookName === 'stowed') r.armed = false;
  else if (lookName === 'spiral') {
    const l = structuredClone(base);
    l.slots.held = { id: 'held_spiral', colors: [] };
    r.look = l;
  }
  const cell = (x, z) => ({ x: Math.floor(x / 0.5) * 0.5 + 0.25, z: Math.floor(z / 0.5) * 0.5 + 0.25 });
  // Everyone else out of the way of the shot.
  const clear = (p, rad) => {
    for (const o of Object.values(s.units)) {
      if (o.id === r.id || o.id === foe.id || o.id === ally.id) continue;
      if (Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < rad) o.pos = { x: o.pos.x, z: Math.min(19.5, o.pos.z + rad + 1) };
    }
  };
  r.pos = cell(r.pos.x, r.pos.z);
  // No foreseen intents (the Mirai's red lines) over the shot.
  for (const o of Object.values(s.units)) if (o.team === 'enemy') delete o.intent;
  if (where === 'swap') {
    ally.pos = cell(r.pos.x + 6.5, r.pos.z + 2.2);
    s.nodes.push({ id: 'n_test', owner: r.id, pos: { ...ally.pos } });
    foe.pos = cell(r.pos.x + 3, r.pos.z + 6);
    clear(ally.pos, 3);
    b.sync();
    return { r: r.id, other: ally.id, from: r.pos, to: ally.pos, node: ally.pos };
  }
  // The foe 7 m ahead; the Node 1 m before it (foe), behind it (behind), or on open ground (empty).
  foe.pos = cell(r.pos.x + 7.5, r.pos.z + 1.0);
  ally.pos = cell(r.pos.x - 2, r.pos.z + 3);
  let node;
  if (where === 'foe') node = cell(foe.pos.x - 1.0, foe.pos.z);
  else if (where === 'behind') node = cell(foe.pos.x + 1.0, foe.pos.z);
  else {
    foe.pos = cell(r.pos.x + 9, r.pos.z + 5.5);
    node = cell(r.pos.x + 6.5, r.pos.z + 1.0);
  }
  clear(node, 3.5);
  clear(r.pos, 2);
  s.nodes = s.nodes.filter((n) => n.owner !== r.id);
  s.nodes.push({ id: 'n_test', owner: r.id, pos: node });
  b.sync();
  return { r: r.id, other: foe.id, from: r.pos, to: node, node, foe: foe.pos };
}, { lookName, where });
console.log('setup', JSON.stringify(setup));

const action = where === 'swap' ? { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_swap', at: setup.to, target: setup.other } : { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_warp', at: setup.to };

const rafStats = (ts) => {
  const d = ts.slice(1).map((t, i) => t - ts[i]);
  const s = [...d].sort((x, y) => x - y);
  return { n: d.length, avg: +(d.reduce((p, q) => p + q, 0) / d.length).toFixed(1), p50: +s[Math.floor(s.length / 2)].toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), max: +s[s.length - 1].toFixed(1), over25: d.filter((x) => x > 25).length };
};
// The first frames of the turn: what the screen makes ahead of the warp is made here.
const warmT = await page.evaluate(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 120) requestAnimationFrame(f); else res(ts); }; requestAnimationFrame(f); }));
console.log('turn start (warming)', JSON.stringify(rafStats(warmT)));
await page.evaluate(({ from, to }) => window.__battle.centerOn((from.x + to.x) / 2, (from.z + to.z) / 2), setup);
await page.waitForTimeout(1800);

if (where === 'perf' || process.env.PERF) {
  const idle = await page.evaluate(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 61) requestAnimationFrame(f); else res(ts); }; requestAnimationFrame(f); }));
  const during = await page.evaluate((action) => new Promise((res) => {
    const ts = [];
    const f = (t) => { ts.push(t); if (ts.length < 90) requestAnimationFrame(f); else res(ts); };
    requestAnimationFrame((t) => { ts.push(t); window.__battle.act(action); requestAnimationFrame(f); });
  }), action);
  const seq = during.slice(1).map((t, i) => Math.round(t - during[i])).join(' ');
  console.log('idle', JSON.stringify(rafStats(idle)));
  console.log('during', JSON.stringify(rafStats(during)), seq);
  writeFileSync(`${OUT}/${name}/perf.json`, JSON.stringify({ idle: rafStats(idle), during: rafStats(during), seq }));
  await browser.close();
  process.exit(0);
}

const a = await page.evaluate(({ from }) => window.__battle.screenOf(from.x, from.z), setup);
const b2 = await page.evaluate(({ to }) => window.__battle.screenOf(to.x, to.z), setup);
console.log('screen', JSON.stringify({ a, b2 }));
const x0 = Math.max(0, Math.min(a.x, b2.x) - 110);
const x1 = Math.min(1280, Math.max(a.x, b2.x) + 120);
const y0 = Math.max(0, Math.min(a.y, b2.y) - 175);
const y1 = Math.min(760, Math.max(a.y, b2.y) + 30);
const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
await page.evaluate(() => window.__clock.freeze());
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/${name}/f000.png`, clip });
const ok = await page.evaluate((action) => window.__battle.act(action), action);
console.log('acted', ok);
// Let the screen take the click's first events at the click's own time before the clock moves on.
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
await page.waitForTimeout(150);
const frames = Math.ceil(Number(process.env.DUR ?? 1300) / STEP);
for (let i = 1; i <= frames; i++) {
  await page.evaluate((ms) => window.__clock.step(ms), STEP);
  await page.waitForTimeout(70);
  await page.screenshot({ path: `${OUT}/${name}/f${String(i).padStart(3, '0')}.png`, clip });
}
await page.evaluate(() => window.__clock.resume());
await page.waitForTimeout(800);
const after = await page.evaluate(({ r, other }) => { const s = window.__battle.state(); return { r: s.units[r].pos, facing: s.units[r].facing, edge: s.units[r].cond.warpEdge, other: s.units[other].pos, busy: window.__battle.busy() }; }, setup);
console.log('after', JSON.stringify(after));
await page.screenshot({ path: `${OUT}/${name}/full.png` });
writeFileSync(`${OUT}/${name}/meta.json`, JSON.stringify({ step: STEP, frames, clip, setup, look: lookName, where }));
await browser.close();
