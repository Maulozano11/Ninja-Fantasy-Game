// Visual check of the Northstar step: the aura ring, Command's aim and refusals, the command and its
// crown, the commanded raider's turn, the aura's disadvantage in the aim, a dash slowed by the aura, the log.
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
await page.goto('http://127.0.0.1:5350/', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.clear(); for (const k of ['tip_move', 'tip_attack', 'tip_jutsu', 'tip_cover', 'tip_stealth', 'tip_hands', 'tip_hydra', 'tip_mirai', 'tip_koton', 'tip_ryusei']) localStorage.setItem(`shinobi.${k}`, '1'); localStorage.setItem('shinobi.battleSpeed', '1'); });
await page.reload({ waitUntil: 'networkidle' });
await page.getByText(es ? 'Renegados en el claro' : 'Rogues in the clearing').click();
const idle = () => page.waitForFunction(() => window.__battle && !window.__battle.busy(), null, { timeout: 120000 });
const playerTurn = () => page.waitForFunction(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return !window.__battle.busy() && u?.team === 'party' && u.controller === 'player'; }, null, { timeout: 120000 });
await idle();
await playerTurn();
await page.waitForTimeout(600);
const at = (x, z) => page.evaluate(([x, z]) => window.__battle.screenOf(x, z), [x, z]);
// The ninja whose turn it is becomes a Northstar; the raider (WIS 1, it can't make the save) comes within 6 m.
const info = await page.evaluate(() => {
  const s = window.__battle.state();
  const u = s.units[s.order[s.turn]];
  u.character = { ...u.character, clan: 'Northstar' };
  u.jutsus = ['northstar_command', 'northstar_submission', ...u.jutsus.filter((j) => !/^(mirai_|katon_|koton_|ryusei_|northstar_)/.test(j))];
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  u.chakra = Math.max(u.chakra, 20);
  const r = s.units.raider_0;
  r.pos = { x: u.pos.x + 5.5, z: u.pos.z + 0.5 };
  r.stats = { ...r.stats, wis: 1 };
  const rogue = s.units.rogue_0;
  rogue.pos = { x: u.pos.x + 6.5, z: u.pos.z - 2.5 };
  return { id: u.id, name: u.name, pos: u.pos, raider: r.pos, rogue: rogue.pos };
});
console.log(JSON.stringify(info));
// Crouch and stand so the screen plays something and snaps every unit to the edited state; then a fresh turn.
const resync = async (id) => {
  await page.evaluate((id) => window.__battle.act({ type: 'crouch', unit: id }), id);
  await idle();
  await page.evaluate((id) => window.__battle.act({ type: 'crouch', unit: id }), id);
  await idle();
  await page.evaluate((id) => {
    const s = window.__battle.state(); const u = s.units[id];
    u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
    window.__battle.act({ type: 'setController', unit: id, controller: 'player' });
  }, id);
  await page.waitForTimeout(300);
};
await resync(info.id);
await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [info.pos.x + 3, info.pos.z]);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/1-tip-aura-${locale}.png` });
await page.keyboard.press('3');
await page.waitForTimeout(250);
let p = await at(info.rogue.x, info.rogue.z);
await page.mouse.move(p.x, p.y - 40);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/2-aim-mirai-${locale}.png` });
p = await at(info.raider.x, info.raider.z);
await page.mouse.move(p.x, p.y - 40);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/3-aim-raider-${locale}.png` });
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(1300);
await page.screenshot({ path: `${out}/4-command-mid-${locale}.png` });
await idle();
await page.mouse.move(640, 200);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/5-commanded-${locale}.png` });
const after = await page.evaluate(() => { const r = window.__battle.state().units.raider_0; return { team: r.team, commanded: r.commanded }; });
console.log('after command', JSON.stringify(after));
// End the turn and let the others play until the raider has had its turn under command.
await page.keyboard.press('Space');
let shot = false;
for (let i = 0; i < 400; i++) {
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, team: u?.team, ctrl: u?.controller, busy: window.__battle.busy(), raider: s.units.raider_0.team, phase: s.phase }; });
  if (!shot && st.cur === 'raider_0') {
    const r = await page.evaluate(() => window.__battle.state().units.raider_0.pos);
    await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [r.x, r.z]);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/6-raider-turn-${locale}.png` });
    shot = true;
  }
  if (st.phase !== 'combat' || (!st.busy && st.team === 'party' && st.ctrl === 'player' && shot)) break;
  // Other party ninjas just end their turns.
  if (!st.busy && st.team === 'party' && st.ctrl === 'player') await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), st.cur);
}
await idle();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/7-after-raider-${locale}.png` });
// A party ninja inside an enemy Northstar's aura: the aim shows the disadvantage.
const aim = await page.evaluate((nid) => {
  const s = window.__battle.state();
  const u = s.units[s.order[s.turn]];
  const foe = Object.values(s.units).find((e) => e.team === 'enemy' && !e.down && e.kind === 'ninja');
  foe.character = { ...foe.character, clan: 'Northstar' };
  foe.pos = { x: u.pos.x + 3, z: u.pos.z };
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
  return { id: u.id, foe: foe.id, at: foe.pos };
}, info.id);
console.log('aim', JSON.stringify(aim));
await resync(aim.id);
await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [aim.at.x - 1.5, aim.at.z]);
await page.waitForTimeout(1200);
await page.keyboard.press('2');
await page.waitForTimeout(250);
p = await at(aim.at.x, aim.at.z);
await page.mouse.move(p.x, p.y - 40);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/8-aura-aim-${locale}.png` });
await page.keyboard.press('Escape');
// Dash, then walk past the enemy Northstar: slowed at the aura's edge.
const dash = await page.evaluate(([id, fid]) => {
  const s = window.__battle.state();
  const u = s.units[id]; const f = s.units[fid];
  f.pos = { x: u.pos.x + 9, z: u.pos.z + 3 };
  return { from: u.pos, foe: f.pos };
}, [aim.id, aim.foe]);
await resync(aim.id);
await page.evaluate((id) => window.__battle.act({ type: 'dash', unit: id }), aim.id);
await idle();
await page.evaluate(([id, x, z]) => window.__battle.act({ type: 'move', unit: id, to: { c: Math.floor(x / 0.5), r: Math.floor(z / 0.5) } }), [aim.id, dash.from.x + 13, dash.from.z]);
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${out}/9-slowed-${i}-${locale}.png` });
}
await idle();
const moved = await page.evaluate((id) => { const u = window.__battle.state().units[id]; return { pos: u.pos, move: u.turn.move, moved: u.turn.moved }; }, aim.id);
console.log('dash', JSON.stringify(dash), JSON.stringify(moved));
await page.getByRole('button', { name: es ? 'Registro' : 'Log' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/10-log-${locale}.png` });
console.log('errors', JSON.stringify(errs));
await browser.close();
