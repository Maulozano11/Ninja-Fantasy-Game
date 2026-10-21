// Visual check of the Ryusei step: Nodes from a kunai, the warp aim and landing, the edge, the swap, the tip and the log.
import { chromium } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pw/node_modules/playwright/index.mjs';
const out = process.argv[2];
const locale = process.argv[3] ?? 'es-MX';
const es = locale.startsWith('es');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
await page.goto('http://127.0.0.1:5340/', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.clear(); for (const k of ['tip_move', 'tip_attack', 'tip_jutsu', 'tip_cover', 'tip_stealth', 'tip_hands', 'tip_hydra', 'tip_mirai', 'tip_koton']) localStorage.setItem(`shinobi.${k}`, '1'); localStorage.setItem('shinobi.battleSpeed', '1'); });
await page.reload({ waitUntil: 'networkidle' });
await page.getByText(es ? 'Renegados en el claro' : 'Rogues in the clearing').click();
const idle = () => page.waitForFunction(() => window.__battle && !window.__battle.busy(), null, { timeout: 120000 });
await idle();
await page.waitForFunction(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return !window.__battle.busy() && u?.team === 'party' && u.controller === 'player'; }, null, { timeout: 120000 });
await page.waitForTimeout(600);
// The ninja whose turn it is becomes a Ryusei (its clan abilities first, as unitFrom gives them).
const fresh = (id) => page.evaluate((id) => {
  const b = window.__battle; const s = b.state(); const u = s.units[id];
  s.turn = s.order.indexOf(id);
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  u.chakra = Math.max(u.chakra, 20);
  b.act({ type: 'setController', unit: id, controller: 'player' });
}, id);
const info = await page.evaluate(() => {
  const b = window.__battle;
  const s = b.state();
  const u = s.units[s.order[s.turn]];
  u.character = { ...u.character, clan: 'Ryusei' };
  u.jutsus = ['ryusei_warp', 'ryusei_swap', ...u.jutsus.filter((j) => !/^(mirai_|katon_|koton_|ryusei_)/.test(j))];
  const foes = Object.values(s.units).filter((e) => e.team === 'enemy' && !e.down).map((e) => ({ id: e.id, name: e.name, pos: e.pos, d: Math.hypot(e.pos.x - u.pos.x, e.pos.z - u.pos.z) })).sort((a, c) => a.d - c.d);
  const allies = Object.values(s.units).filter((e) => e.team === 'party' && e.id !== u.id && !e.down).map((e) => ({ id: e.id, name: e.name, pos: e.pos }));
  return { id: u.id, name: u.name, pos: u.pos, foes, allies };
});
console.log(JSON.stringify(info));
await fresh(info.id);
await idle();
await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [info.pos.x + 4, info.pos.z]);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/1-tip-${locale}.png` });
const at = (x, z) => page.evaluate(([x, z]) => window.__battle.screenOf(x, z), [x, z]);
const foe = info.foes[0];
// A kunai at the nearest foe: a Node lands under it.
await page.evaluate(([u, t]) => window.__battle.act({ type: 'attack', unit: u, target: t, ranged: true }), [info.id, foe.id]);
await idle();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/2-node-${locale}.png` });
// Its next turn: a metal wall stands between, and another Node lies beyond it.
await page.evaluate(([id, fx, fz]) => {
  const s = window.__battle.state(); const u = s.units[id];
  const mx = (u.pos.x + fx) / 2; const mz = (u.pos.z + fz) / 2;
  s.walls.push({ id: 'wcheck', kind: 'metal', a: { x: mx, z: mz - 2.2 }, b: { x: mx, z: mz + 2.2 }, hp: 20, maxHp: 20, owner: 'nobody' });
}, [info.id, foe.pos.x, foe.pos.z]);
await fresh(info.id);
await idle();
await page.keyboard.press('3');
await page.waitForTimeout(250);
let p = await at(foe.pos.x, foe.pos.z);
await page.mouse.move(p.x + 2, p.y + 4);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/3-warp-aim-${locale}.png` });
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/4-warp-mid-${locale}.png` });
await idle();
await page.waitForTimeout(400);
p = await at(foe.pos.x, foe.pos.z);
await page.mouse.move(p.x, p.y - 40);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/5-edge-${locale}.png` });
const after = await page.evaluate((id) => { const s = window.__battle.state(); return { pos: s.units[id].pos, edge: s.units[id].cond.warpEdge, nodes: s.nodes }; }, info.id);
console.log('after warp', JSON.stringify(after));
await page.mouse.down();
await page.mouse.up();
await idle();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/6-strike-${locale}.png` });
// Next turn: a Node under an ally, then Spatial Swap with it.
const ally = info.allies[0];
await page.evaluate(([id, ally]) => {
  const s = window.__battle.state(); const a = s.units[ally];
  s.nodes.push({ id: 'nally', owner: id, pos: { ...a.pos } });
}, [info.id, ally.id]);
await fresh(info.id);
await idle();
await page.keyboard.press('4');
await page.waitForTimeout(250);
const allyPos = await page.evaluate((a) => window.__battle.state().units[a].pos, ally.id);
p = await at(allyPos.x, allyPos.z);
await page.mouse.move(p.x, p.y - 40);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/7-swap-aim-${locale}.png` });
// Hovering an enemy on a Node shows the STR save.
const foePos = await page.evaluate((f) => window.__battle.state().units[f]?.pos, foe.id);
const foeUp = await page.evaluate((f) => !window.__battle.state().units[f]?.down, foe.id);
if (foeUp) {
  await page.evaluate(([id, f]) => { const s = window.__battle.state(); s.nodes.push({ id: 'nfoe', owner: id, pos: { ...s.units[f].pos } }); }, [info.id, foe.id]);
  await page.waitForTimeout(200);
  p = await at(foePos.x, foePos.z);
  await page.mouse.move(p.x, p.y - 40);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/8-swap-enemy-${locale}.png` });
}
p = await at(allyPos.x, allyPos.z);
await page.mouse.move(p.x, p.y - 40);
await page.waitForTimeout(300);
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/9-swap-mid-${locale}.png` });
await idle();
const swapped = await page.evaluate(([id, a]) => { const s = window.__battle.state(); return [s.units[id].pos, s.units[a].pos]; }, [info.id, ally.id]);
console.log('swapped', JSON.stringify(swapped), 'ally was', JSON.stringify(allyPos));
await page.waitForTimeout(300);
await page.getByRole('button', { name: es ? 'Registro' : 'Log' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/10-log-${locale}.png` });
console.log('errors', JSON.stringify(errs));
await browser.close();
