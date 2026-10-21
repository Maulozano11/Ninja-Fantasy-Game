// node perf.mjs <mode: warm|kunai|cold> [speed]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const mode = process.argv[2] ?? 'warm';
const SPEED = Number(process.argv[3] ?? 1);
const look = process.argv[4] ?? '';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.addInitScript((speed) => {
  let seed = 99;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); localStorage.setItem('shinobi.battleSpeed', String(speed));
}, SPEED);
await page.goto('http://127.0.0.1:5293/#combat');
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.waitForFunction(() => { const b = window.__battle; const s = b.state(); return !b.busy() && s.units[s.order[s.turn]]?.team === 'party'; }, null, { timeout: 120000 });
const rec = (ms) => page.evaluate((ms) => new Promise((res) => { const ts = []; const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < ms) requestAnimationFrame(f); else res(ts.slice(1).map((x, i) => Math.round(x - ts[i]))); }; requestAnimationFrame(f); }), ms);
const stats = (d) => ({ n: d.length, max: Math.max(...d), over34: d.filter((x) => x > 34).length, over50: d.filter((x) => x > 50).length, sum_over: d.filter((x) => x > 34).reduce((a, b) => a + b, 0) });
await page.evaluate(async (look) => {
  const b = window.__battle; const s = b.state();
  const r = s.units.preset_founder; const foe = s.units.rogue_0;
  if (look === 'aiden') { const { LEGENDARY_PRESETS } = await import('/src/data/shinobiData.ts'); r.look = structuredClone(LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden').character.appearance); }
  s.turn = s.order.indexOf(r.id); r.turn.bonus = true; r.turn.action = true; r.chakra = r.maxChakra; r.armed = true;
  for (const o of Object.values(s.units)) if (o.team === 'enemy') delete o.intent;
  let k = 0; for (const o of Object.values(s.units)) if (o.id !== r.id && o.id !== foe.id) o.pos = { x: 2.25 + (k++) * 1.5, z: 19.25 };
  r.pos = { x: 10.25, z: 10.25 }; foe.pos = { x: 17.75, z: 11.25 };
  s.nodes = s.nodes.filter((n) => n.owner !== r.id);
  b.sync();
  b.centerOn(14, 10.75);
}, look);
if (mode === 'kunai') {
  await page.waitForTimeout(3000);
  const ok = await page.evaluate(() => window.__battle.act({ type: 'attack', unit: 'preset_founder', target: 'rogue_0', ranged: true }));
  console.log('kunai act', JSON.stringify(ok));
  const during = await rec(2500);
  console.log('kunai throw', JSON.stringify(stats(during)), during.join(' '));
  await page.waitForFunction(() => !window.__battle.busy(), null, { timeout: 20000 });
  await page.waitForTimeout(260 / SPEED);
} else if (mode === 'cold') {
  await page.evaluate(() => { const s = window.__battle.state(); s.nodes.push({ id: 'n_test', owner: 'preset_founder', pos: { x: 16.75, z: 11.25 } }); window.__battle.sync(); });
  await page.waitForTimeout(260 / SPEED);
} else {
  await page.evaluate(() => { const s = window.__battle.state(); s.nodes.push({ id: 'n_test', owner: 'preset_founder', pos: { x: 16.75, z: 11.25 } }); window.__battle.sync(); });
  const warmT = await rec(3000);
  console.log('warming', JSON.stringify(stats(warmT)), warmT.filter((x) => x > 20).join(' '));
  await page.waitForTimeout(2000);
}
if (process.env.MOVE) {
  for (const to of [{ c: 24, r: 20 }, { c: 27, r: 17 }]) {
    const ok = await page.evaluate((to) => window.__battle.act({ type: 'move', unit: 'preset_founder', to }), to);
    const d = await rec(3500);
    console.log('move', JSON.stringify(ok), JSON.stringify(stats(d)), d.filter((x) => x > 20).join(' '));
  }
  const t = await page.evaluate(async () => { const ua = await import('/src/components/battle/unitArt.ts'); const s = window.__battle.state(); const u = s.units.preset_founder; const look = ua.lookOf(u); const out = []; for (const a of [11, 13, 15, 17, 19]) { const t0 = performance.now(); ua.thrownFrame(look, a); out.push(Math.round(performance.now() - t0)); } return out; });
  console.log('thrownFrame ms', JSON.stringify(t));
}
const node = await page.evaluate(() => { const s = window.__battle.state(); return s.nodes.filter((n) => n.owner === 'preset_founder').map((n) => n.pos); });
console.log('nodes', JSON.stringify(node));
const { landing } = await page.evaluate(async () => { const s = window.__battle.state(); const u = s.units.preset_founder; const n = s.nodes.filter((n) => n.owner === u.id).at(-1); return { landing: n.pos }; });
console.log('landing', JSON.stringify(landing));
console.log('why', JSON.stringify(await page.evaluate(async (landing) => { const { applyAction } = await import('/src/battle/engine.ts'); const s = window.__battle.state(); const o = applyAction(s, { type: 'jutsu', unit: 'preset_founder', jutsu: 'ryusei_warp', at: landing }); return { ok: o.ok, reason: o.reason, turn: s.order[s.turn], bonus: s.units.preset_founder.turn.bonus, busy: window.__battle.busy() }; }, landing)));
const res = await page.evaluate(async (landing) => {
  const p = new Promise((res) => { const ts = []; const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < 1600) requestAnimationFrame(f); else res(ts.slice(1).map((x, i) => Math.round(x - ts[i]))); }; requestAnimationFrame(f); });
  const ok = window.__battle.act({ type: 'jutsu', unit: 'preset_founder', jutsu: 'ryusei_warp', at: landing });
  return { ok, d: await p };
}, landing);
console.log('warp act', JSON.stringify(res.ok));
console.log('warp', JSON.stringify(stats(res.d)), res.d.join(' '));
await browser.close();
