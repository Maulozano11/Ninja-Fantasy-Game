import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/warp-throw/review/cap/ai';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console error', m.text()); });
await page.addInitScript(() => { let seed = 5; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); localStorage.setItem('shinobi.battleSpeed', '1'); });
await page.goto('http://127.0.0.1:5293/#combat');
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.waitForFunction(() => { const b = window.__battle; const s = b.state(); return !b.busy() && s.units[s.order[s.turn]]?.team === 'party'; }, null, { timeout: 120000 });
const info = await page.evaluate(() => {
  const b = window.__battle; const s = b.state();
  const r = s.units.raider_0; const t = s.units.preset_founder;
  let k = 0; for (const o of Object.values(s.units)) if (o.id !== r.id && o.id !== t.id) o.pos = { x: 2.25 + (k++) * 1.5, z: 19.25 };
  t.pos = { x: 12.25, z: 10.25 }; r.pos = { x: 24.25, z: 10.25 };
  s.nodes = s.nodes.filter((n) => n.owner !== r.id);
  s.nodes.push({ id: 'n_ai', owner: r.id, pos: { x: 13.25, z: 10.25 } });
  r.chakra = r.maxChakra; r.turn.action = true; r.turn.bonus = true; r.turn.move = r.speed;
  delete r.intent;
  return { jutsus: r.jutsus, clan: r.character?.clan, held: r.weapon?.held, armed: r.armed, order: s.order, turn: s.turn };
});
console.log(JSON.stringify(info));
await page.evaluate(() => window.__battle.centerOn(18, 10.25));
await page.waitForTimeout(3000); // warming at idle (player's turn)
// hand the turn to the raider
const t0 = await page.evaluate(() => { const b = window.__battle; const s = b.state(); s.turn = s.order.indexOf('raider_0'); b.sync(); return performance.now(); });
const rec = await page.evaluate(() => new Promise((res) => { const ts = []; const ev = []; const t0 = performance.now(); const f = (t) => { ts.push(t); const s = window.__battle.state(); ev.push(s.units.raider_0.pos.x); if (t - t0 < 4000) requestAnimationFrame(f); else res({ d: ts.slice(1).map((x, i) => Math.round(x - ts[i])), pos: ev }); }; requestAnimationFrame(f); }));
console.log('frames >34:', rec.d.filter((x) => x > 34).join(' '), 'max', Math.max(...rec.d));
const log = await page.evaluate(() => { const s = window.__battle.state(); return { r: s.units.raider_0.pos, cond: s.units.raider_0.cond, solen: s.units.preset_founder.hp }; });
console.log(JSON.stringify(log));
await page.screenshot({ path: `${OUT}/end.png` });
await browser.close();
