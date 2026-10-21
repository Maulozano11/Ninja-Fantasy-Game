// node cap.mjs '<json config>'
// config: { name, look, where, speed, step, dur, dpr, body, hidden, flip }
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const cfg = JSON.parse(process.argv[2]);
const OUT = `/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/warp-throw/review/cap/${cfg.name}`;
mkdirSync(OUT, { recursive: true });
const SPEED = cfg.speed ?? 1;
const STEP = cfg.step ?? 20;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: cfg.dpr ?? 2 });
const logs = [];
page.on('pageerror', (e) => { console.log('pageerror:', e.message); logs.push('pageerror ' + e.message); });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { console.log('console', m.type(), m.text()); logs.push(m.text()); } });
await page.addInitScript((speed) => {
  let seed = 777;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); localStorage.setItem('shinobi.battleSpeed', String(speed));
  const real = performance.now.bind(performance);
  let frozen = null, offset = 0;
  performance.now = () => (frozen !== null ? frozen : real() + offset);
  window.__clock = { freeze() { frozen = real() + offset; }, step(ms) { frozen += ms; }, resume() { offset = frozen - real(); frozen = null; }, now() { return performance.now(); } };
}, SPEED);
await page.goto('http://127.0.0.1:5293/#combat');
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.waitForFunction(() => { const b = window.__battle; const s = b.state(); return !b.busy() && s.units[s.order[s.turn]]?.team === 'party'; }, null, { timeout: 120000 });
const setup = await page.evaluate(async (cfg) => {
  const b = window.__battle;
  const s = b.state();
  const { LEGENDARY_PRESETS } = await import('/src/data/shinobiData.ts');
  const { waterAtPt } = await import('/src/battle/map.ts');
  const r = s.units[cfg.unit ?? 'preset_founder'];
  const foe = s.units[cfg.foe ?? 'rogue_0'];
  s.turn = s.order.indexOf(r.id);
  r.turn.bonus = true; r.turn.action = true; r.chakra = r.maxChakra;
  const base = structuredClone(r.look ?? r.character.appearance);
  if (cfg.look === 'aiden') r.look = structuredClone(LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden').character.appearance);
  else if (cfg.look && cfg.look.startsWith('held_')) { base.slots.held = { id: cfg.look, colors: [] }; r.look = base; }
  else if (cfg.look === 'bare') { delete base.slots.held; r.look = base; }
  if (cfg.body) { r.look = structuredClone(r.look ?? base); r.look.body = cfg.body; }
  if (cfg.stowed) r.armed = false; else r.armed = true;
  for (const o of Object.values(s.units)) if (o.team === 'enemy') delete o.intent;
  const cell = (x, z) => ({ x: Math.floor(x / 0.5) * 0.5 + 0.25, z: Math.floor(z / 0.5) * 0.5 + 0.25 });
  const park = (o, p) => { o.pos = p; };
  // move everyone else away
  let k = 0;
  for (const o of Object.values(s.units)) if (o.id !== r.id && o.id !== foe.id) park(o, cell(2 + (k++) * 1.5, 19));
  const P = cfg.pos;
  r.pos = cell(P.r[0], P.r[1]);
  if (P.foe) foe.pos = cell(P.foe[0], P.foe[1]); else foe.pos = cell(38, 4);
  const node = cell(P.node[0], P.node[1]);
  s.nodes = s.nodes.filter((n) => n.owner !== r.id);
  s.nodes.push({ id: 'n_test', owner: r.id, pos: node });
  if (cfg.facing) r.facing = cfg.facing;
  if (cfg.hidden) r.cond.hidden = 15;
  if (cfg.swapWith) { const o = s.units[cfg.swapWith]; o.pos = { ...node }; }
  b.sync();
  return { r: r.id, foe: foe.id, from: r.pos, node, foePos: foe.pos, waterFrom: waterAtPt(s, r.pos), waterNode: waterAtPt(s, node), held: (r.look ?? r.character.appearance).slots.held?.id, armed: r.armed, weaponHeld: r.weapon?.held };
}, cfg);
console.log('setup', JSON.stringify(setup));
await page.waitForTimeout(2500); // let warming finish
await page.evaluate(({ from, node, c }) => c ? window.__battle.centerOn(c[0], c[1]) : window.__battle.centerOn((from.x + node.x) / 2, (from.z + node.z) / 2), { ...setup, c: cfg.center });
await page.waitForTimeout(1500);
let action;
if (cfg.jutsu === 'swap') action = { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_swap', at: setup.node, target: cfg.swapWith };
else action = { type: 'jutsu', unit: setup.r, jutsu: 'ryusei_warp', at: setup.node };
if (cfg.landAt) action.at = cfg.landAt;
const a = await page.evaluate(({ from }) => window.__battle.screenOf(from.x, from.z), setup);
const b2 = await page.evaluate(({ node }) => window.__battle.screenOf(node.x, node.z), setup);
const fp = await page.evaluate(({ foePos }) => window.__battle.screenOf(foePos.x, foePos.z), setup);
const xs = [a.x, b2.x].concat(cfg.pos.foe ? [fp.x] : []);
const ys = [a.y, b2.y].concat(cfg.pos.foe ? [fp.y] : []);
const x0 = Math.max(0, Math.min(...xs) - 130), x1 = Math.min(1280, Math.max(...xs) + 130);
const y0 = Math.max(0, Math.min(...ys) - 190), y1 = Math.min(760, Math.max(...ys) + 40);
const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
await page.evaluate(() => window.__clock.freeze());
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/f000.png`, clip });
const ok = await page.evaluate((action) => window.__battle.act(action), action);
console.log('acted', JSON.stringify(ok));
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
await page.waitForTimeout(120);
const frames = Math.ceil((cfg.dur ?? 1400) / STEP);
const trace = [];
for (let i = 1; i <= frames; i++) {
  await page.evaluate((ms) => window.__clock.step(ms), STEP);
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${OUT}/f${String(i).padStart(3, '0')}.png`, clip });
  trace.push(await page.evaluate(() => ({ busy: window.__battle.busy() })));
}
await page.evaluate(() => window.__clock.resume());
await page.waitForTimeout(1500);
const after = await page.evaluate(({ r, foe }) => { const s = window.__battle.state(); return { pos: s.units[r].pos, facing: s.units[r].facing, edge: s.units[r].cond.warpEdge, hidden: s.units[r].cond.hidden, busy: window.__battle.busy() }; }, setup);
console.log('after', JSON.stringify(after));
const busyEnd = trace.findIndex((t) => !t.busy);
console.log('busy false at frame', busyEnd, 'ms', busyEnd * STEP);
await page.screenshot({ path: `${OUT}/after.png`, clip });
writeFileSync(`${OUT}/meta.json`, JSON.stringify({ cfg, setup, clip, after, step: STEP, busyEnd, logs }));
await browser.close();
