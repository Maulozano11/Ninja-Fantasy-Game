// Frame times around a Warp Strike in the real battle screen (dev build).
//   node perf2.mjs [speed] [look: solen|aiden|stowed] [castAfterMs]
// 1. the battle loads; the party's turn; Solen set up (no Node of his): record a while (what is made ahead, no Node)
// 2. a Node appears: record (what is made once the Node is known)
// 3. a second Node appears and the warp is cast `castAfterMs` later: record the warp itself
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const SPEED = Number(process.argv[2] ?? 1);
const look = process.argv[3] ?? 'solen';
const castAfter = Number(process.argv[4] ?? 260);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.addInitScript((speed) => {
  let seed = 99;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); localStorage.setItem('shinobi.battleSpeed', String(speed));
}, SPEED);
await page.goto('http://127.0.0.1:5296/#combat');
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 60000 });
const rec = (ms) => page.evaluate((ms) => new Promise((res) => { const ts = []; const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < ms) requestAnimationFrame(f); else res(ts.slice(1).map((x, i) => Math.round(x - ts[i]))); }; requestAnimationFrame(f); }), ms);
const stats = (d) => ({ n: d.length, max: Math.max(...d), over34: d.filter((x) => x > 34).length, over50: d.filter((x) => x > 50).length, slowMs: d.filter((x) => x > 34).reduce((a, b) => a + b, 0) });
const load = await rec(6000);
console.log('battle start (first 6 s)', JSON.stringify(stats(load)), load.filter((x) => x > 20).join(' '));
await page.waitForFunction(() => { const b = window.__battle; const s = b.state(); return !b.busy() && s.units[s.order[s.turn]]?.team === 'party'; }, null, { timeout: 120000 });
await page.evaluate(async (look) => {
  const b = window.__battle; const s = b.state();
  const r = s.units.preset_founder; const foe = s.units.rogue_0;
  if (look === 'aiden') { const { LEGENDARY_PRESETS } = await import('/src/data/shinobiData.ts'); r.look = structuredClone(LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden').character.appearance); }
  s.turn = s.order.indexOf(r.id); r.turn.bonus = true; r.turn.action = true; r.chakra = r.maxChakra; r.armed = look !== 'stowed';
  for (const o of Object.values(s.units)) if (o.team === 'enemy') delete o.intent;
  let k = 0; for (const o of Object.values(s.units)) if (o.id !== r.id && o.id !== foe.id) o.pos = { x: 2.25 + (k++) * 1.5, z: 19.25 };
  r.pos = { x: 10.25, z: 10.25 }; foe.pos = { x: 17.75, z: 11.25 };
  s.nodes = s.nodes.filter((n) => n.owner !== r.id);
  b.sync();
  b.centerOn(14, 10.75);
}, look);
const noNode = await rec(5000);
console.log('his turn, no Node yet (5 s)', JSON.stringify(stats(noNode)), noNode.filter((x) => x > 20).join(' '));
await page.evaluate(() => { const s = window.__battle.state(); s.nodes.push({ id: 'n_a', owner: 'preset_founder', pos: { x: 16.75, z: 11.25 } }); window.__battle.sync(); });
const node1 = await rec(3000);
console.log('a Node appears (3 s)', JSON.stringify(stats(node1)), node1.filter((x) => x > 20).join(' '));
// The weapon put away (as seals do), then the warp cast the way the AI does: 260 ms after the screen settles.
const res = await page.evaluate(async () => {
  const b = window.__battle;
  const rec = [];
  let t = performance.now();
  let stop = false;
  const f = (x) => { rec.push(Math.round(x - t)); t = x; if (!stop) requestAnimationFrame(f); };
  requestAnimationFrame(f);
  const ok1 = b.act({ type: 'draw', unit: 'preset_founder' });
  while (b.busy()) await new Promise((r) => setTimeout(r, 5));
  const settled = rec.length;
  await new Promise((r) => setTimeout(r, 260));
  const before = rec.length;
  const s = b.state();
  const n = s.nodes.find((n) => n.owner === 'preset_founder');
  const ok2 = b.act({ type: 'jutsu', unit: 'preset_founder', jutsu: 'ryusei_warp', at: n.pos });
  await new Promise((r) => setTimeout(r, 1600));
  stop = true;
  return { ok1, ok2, armed: s.units.preset_founder.armed, stowPart: rec.slice(1, before), warp: rec.slice(before) };
});
console.log('stow', JSON.stringify(res.ok1), 'warp', JSON.stringify(res.ok2), 'armed after', res.armed);
console.log('stow and wait', JSON.stringify(stats(res.stowPart)), res.stowPart.join(' '));
console.log('the warp, weapon stowed (1.6 s)', JSON.stringify(stats(res.warp)), res.warp.join(' '));
await browser.close();
