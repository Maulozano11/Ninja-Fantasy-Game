// Drives the real battle screen: starts "Renegados en el claro" with Solen (Ryusei), sets up a Node
// and plays a Warp Strike or a Spatial Swap with a frozen clock, stepping it to capture frames.
//   node capture.mjs warp|swap|perf|explore [stepMs]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase/fix2/cap';
const mode = process.argv[2] ?? 'explore';
const STEP = Number(process.argv[3] ?? 40);
mkdirSync(`${OUT}/${mode}`, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: Number(process.env.DPR ?? 2) });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
await page.addInitScript(() => {
  try { localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); } catch {}
  const real = performance.now.bind(performance);
  let frozen = null;
  let offset = 0;
  performance.now = () => (frozen !== null ? frozen : real() + offset);
  window.__clock = {
    freeze() { frozen = real() + offset; },
    step(ms) { frozen += ms; },
    resume() { offset = frozen - real(); frozen = null; },
  };
});
await page.goto('http://127.0.0.1:5291/#combat');
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 30000 });
await page.waitForTimeout(1500);
// Wait for a party turn with nothing playing.
await page.waitForFunction(() => {
  const b = window.__battle;
  const s = b.state();
  const id = s.order[s.turn];
  return !b.busy() && s.units[id]?.team === 'party';
}, null, { timeout: 60000 });

const tip = page.locator('button', { hasText: 'No más consejos' });
if (await tip.count()) await tip.first().click().catch(() => {});
const summary = await page.evaluate(() => {
  const s = window.__battle.state();
  return { phase: s.phase, turn: s.order[s.turn], units: Object.values(s.units).map((u) => ({ id: u.id, name: u.name, team: u.team, clan: u.character?.clan, kind: u.kind, pos: u.pos, down: u.down })) };
});
console.log(JSON.stringify(summary));
if (mode === 'explore') {
  await page.screenshot({ path: `${OUT}/explore.png` });
  await browser.close();
  process.exit(0);
}

// Set the scene: the Ryusei's turn with its bonus action and chakra, a Node ahead of it (warp), or
// an ally standing on a Node (swap).
const setup = await page.evaluate((mode) => {
  const b = window.__battle;
  const s = b.state();
  const r = Object.values(s.units).find((u) => u.character?.clan === 'Ryusei' && u.team === 'party');
  const ally = Object.values(s.units).find((u) => u.team === 'party' && u.id !== r.id && u.kind === 'ninja' && !u.down);
  s.turn = s.order.indexOf(r.id);
  r.turn.bonus = true;
  r.turn.action = true;
  r.chakra = r.maxChakra;
  const cell = (x, z) => ({ x: Math.floor(x / 0.5) * 0.5 + 0.25, z: Math.floor(z / 0.5) * 0.5 + 0.25 });
  if (mode === 'swap') {
    // The ally a few metres off, on a Node.
    ally.pos = cell(r.pos.x + 6.5, r.pos.z + 2.2);
    s.nodes.push({ id: 'n_test', owner: r.id, pos: { ...ally.pos } });
    b.sync();
    return { r: r.id, other: ally.id, from: r.pos, to: ally.pos };
  }
  if (mode === 'waterout' || mode === 'waterin') {
    // From deep water in the river to the bank, or the other way.
    const wet = { x: 27.75, z: 16.25 };
    const dry = { x: 33.25, z: 16.25 };
    r.pos = mode === 'waterout' ? wet : dry;
    b.sync();
    return { r: r.id, from: r.pos, other: ally.id, otherPos: ally.pos, to: mode === 'waterout' ? dry : wet };
  }
  if (mode === 'waterswap') {
    // The Ryusei on the bank, the ally in deep water on a Node: the Ryusei lands in the river.
    r.pos = { x: 33.25, z: 16.25 };
    ally.pos = { x: 27.75, z: 16.25 };
    s.nodes.push({ id: 'n_test', owner: r.id, pos: { ...ally.pos } });
    b.sync();
    return { r: r.id, other: ally.id, from: r.pos, to: ally.pos };
  }
  if (mode === 'hiddenswap') {
    // The ally hidden, a few metres off, on a Node.
    ally.pos = cell(r.pos.x + 6.5, r.pos.z + 2.2);
    ally.cond.hidden = 14;
    s.nodes.push({ id: 'n_test', owner: r.id, pos: { ...ally.pos } });
    b.sync();
    return { r: r.id, other: ally.id, from: r.pos, to: ally.pos };
  }
  return { r: r.id, from: r.pos, other: ally.id, otherPos: ally.pos };
}, mode);
console.log('setup', JSON.stringify(setup));

let action;
if (mode === 'swap' || mode === 'hiddenswap' || mode === 'waterswap') {
  action = { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_swap', at: setup.to, target: setup.other };
} else if (mode === 'waterout' || mode === 'waterin') {
  await page.evaluate(({ r, at }) => {
    const b = window.__battle;
    b.state().nodes.push({ id: 'n_test', owner: r, pos: at });
    b.sync();
  }, { r: setup.r, at: setup.to });
  action = { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_warp', at: setup.to };
} else {
  // A Node 6-7 m ahead, on a cell the warp can land on.
  const at = await page.evaluate(({ r }) => {
    const b = window.__battle;
    const s = b.state();
    const u = s.units[r];
    const cell = (x, z) => ({ x: Math.floor(x / 0.5) * 0.5 + 0.25, z: Math.floor(z / 0.5) * 0.5 + 0.25 });
    const tries = [[6.5, 1.5], [6.5, -1.5], [-6.5, 1.5], [-6.5, -1.5], [5, 3], [-5, 3], [5, -3]];
    const occupied = (p) => Object.values(s.units).some((o) => Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < 1.2);
    for (const [dx, dz] of tries) {
      const p = cell(u.pos.x + dx, u.pos.z + dz);
      if (!occupied(p)) return p;
    }
    return cell(u.pos.x + 6, u.pos.z);
  }, setup);
  setup.to = at;
  await page.evaluate(({ r, at }) => {
    const b = window.__battle;
    b.state().nodes.push({ id: 'n_test', owner: r, pos: at });
    b.sync();
  }, { r: setup.r, at });
  action = { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_warp', at };
}
// Frame times right after the Ryusei's turn comes up (its light bodies are made then, one a frame).
const rafStats = (ts) => {
  const d = ts.slice(1).map((t, i) => t - ts[i]);
  d.sort((x, y) => x - y);
  return { n: d.length, avg: +(d.reduce((p, q) => p + q, 0) / d.length).toFixed(1), p50: +d[Math.floor(d.length / 2)].toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), max: +d[d.length - 1].toFixed(1) };
};
const warmT = await page.evaluate(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 90) requestAnimationFrame(f); else res(ts); }; requestAnimationFrame(f); }));
console.log('turn start (warming)', JSON.stringify(rafStats(warmT)));
const warmT2 = await page.evaluate(() => new Promise((res) => { window.__battle.sync(); const ts = []; const f = (t) => { ts.push(t); if (ts.length < 90) requestAnimationFrame(f); else res(ts); }; requestAnimationFrame(f); }));
console.log('turn start again (warm)', JSON.stringify(rafStats(warmT2)));
// Centre between both ends and let the camera settle.
await page.evaluate(({ from, to }) => window.__battle.centerOn((from.x + to.x) / 2, (from.z + to.z) / 2), setup);
await page.waitForTimeout(1800);
const a = await page.evaluate(({ from }) => window.__battle.screenOf(from.x, from.z), setup);
const b2 = await page.evaluate(({ to }) => window.__battle.screenOf(to.x, to.z), setup);
console.log('screen', JSON.stringify({ a, b2 }));

if (mode === 'perf') {
  // Real time: frame intervals while idle, then during the warp.
  const idle = await page.evaluate(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 90) requestAnimationFrame(f); else res(ts); }; requestAnimationFrame(f); }));
  const during = await page.evaluate((action) => new Promise((res) => {
    const ts = [];
    const f = (t) => { ts.push(t); if (ts.length < 90) requestAnimationFrame(f); else res(ts); };
    requestAnimationFrame((t) => { ts.push(t); window.__battle.act(action); requestAnimationFrame(f); });
  }), action);
  const stats = (ts) => {
    const d = ts.slice(1).map((t, i) => t - ts[i]);
    d.sort((x, y) => x - y);
    return { n: d.length, avg: +(d.reduce((p, q) => p + q, 0) / d.length).toFixed(1), p50: +d[Math.floor(d.length / 2)].toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), max: +d[d.length - 1].toFixed(1) };
  };
  console.log('idle', JSON.stringify(stats(idle)));
  console.log('during', JSON.stringify(stats(during)));
  writeFileSync(`${OUT}/perf.json`, JSON.stringify({ idle: stats(idle), during: stats(during) }));
  await browser.close();
  process.exit(0);
}

// Frozen clock: act, then step it and shoot each frame.
const pad = 150;
const x0 = Math.max(0, Math.min(a.x, b2.x) - pad - 20);
const x1 = Math.min(1280, Math.max(a.x, b2.x) + pad + 20);
const y0 = Math.max(0, Math.min(a.y, b2.y) - 260);
const y1 = Math.min(760, Math.max(a.y, b2.y) + 40);
const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
await page.evaluate(() => window.__clock.freeze());
await page.waitForTimeout(100);
await page.screenshot({ path: `${OUT}/${mode}/f000.png`, clip });
const ok = await page.evaluate((action) => window.__battle.act(action), action);
console.log('acted', ok);
const frames = Math.ceil(1100 / STEP);
for (let i = 1; i <= frames; i++) {
  await page.evaluate((ms) => window.__clock.step(ms), STEP);
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${OUT}/${mode}/f${String(i).padStart(3, '0')}.png`, clip });
}
await page.evaluate(() => window.__clock.resume());
await page.waitForTimeout(600);
const after = await page.evaluate(({ r, other }) => { const s = window.__battle.state(); return { r: s.units[r].pos, other: s.units[other].pos }; }, setup);
console.log('after', JSON.stringify(after));
await page.screenshot({ path: `${OUT}/${mode}/full.png` });
writeFileSync(`${OUT}/${mode}/meta.json`, JSON.stringify({ step: STEP, frames, clip, setup }));
await browser.close();
