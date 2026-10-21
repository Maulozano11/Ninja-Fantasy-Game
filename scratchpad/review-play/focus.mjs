// Focused HUD checks with a staged position: Pursuing Flame aim, Evasion prompt, Warp + edge strike.
import { open, helpers, out, turnOf } from './lib.mjs';
const locale = process.argv[2] ?? 'es-MX';
const L = locale.slice(0, 2);
const es = L === 'es';
const { browser, page, errs } = await open(locale);
const h = helpers(page);
let n = 0;
const shot = async (name) => { n++; await page.screenshot({ path: `${out}/f-${String(n).padStart(2, '0')}-${name}-${L}.png` }); };
const btn = (re) => page.locator('button', { hasText: re }).first();
const hoverPt = async (x, z, dy = 0) => { const q = await h.at(x, z); await page.mouse.move(q.x, q.y + dy); await page.waitForTimeout(600); return { x: q.x, y: q.y + dy }; };
const resync = async (id) => {
  await page.evaluate((id) => window.__battle.act({ type: 'crouch', unit: id }), id); await h.idle();
  await page.evaluate((id) => window.__battle.act({ type: 'crouch', unit: id }), id); await h.idle();
  await page.evaluate((id) => { const u = window.__battle.state().units[id]; u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 }; window.__battle.act({ type: 'setController', unit: id, controller: 'player' }); }, id);
  await page.waitForTimeout(400);
};
const out2 = [];
await page.getByText(es ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await h.idle(); await h.playerTurn();
// --- A: Akira's turn, Pursuing Flame aim at 8 m and at 12.6 m
await turnOf(page, 'preset_ember');
const A = await page.evaluate(() => {
  const s = window.__battle.state(); const u = s.units.preset_ember;
  s.units.rogue_1.pos = { x: u.pos.x + 8, z: u.pos.z - 0.5 };
  s.units.rogue_0.pos = { x: u.pos.x + 12.75, z: u.pos.z - 3 };
  s.units.raider_0.pos = { x: u.pos.x + 1.0, z: u.pos.z + 0.5 };
  s.units.raider_0.intent = { kind: 'melee', what: s.units.raider_0.weapon.name, target: 'preset_ember' };
  return { me: u.pos, r1: s.units.rogue_1.pos, r0: s.units.rogue_0.pos, rd: s.units.raider_0.pos };
});
await resync('preset_ember');
await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [A.me.x + 6, A.me.z]);
await page.waitForTimeout(1300);
await shot('eye-staged');
await btn(es ? 'Persecut' : 'Pursuing').click(); await page.waitForTimeout(300);
await hoverPt(A.r1.x, A.r1.z, -30); await shot('flame-aim-8m');
await hoverPt(A.r0.x, A.r0.z, -30); await shot('flame-aim-far');
await hoverPt(A.rd.x, A.rd.z, -30); await shot('flame-aim-adjacent');
await page.keyboard.press('Escape');
// end Akira's turn; the raider (next enemies) attacks Akira in melee
await page.evaluate(() => { const s = window.__battle.state(); window.__battle.act({ type: 'endTurn', unit: 'preset_ember' }); });
let got = false;
for (let i = 0; i < 600 && !got; i++) {
  await page.waitForTimeout(150);
  const st = await page.evaluate(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, team: u?.team, busy: window.__battle.busy(), pending: s.pending ? { kind: s.pending.kind, reactor: s.pending.reactor, dmg: s.pending.hit?.amount, src: s.pending.hit?.source } : null }; });
  if (st.busy) continue;
  if (st.pending) {
    await page.waitForTimeout(300);
    await shot(`prompt-${st.pending.kind}-${st.pending.reactor}`);
    out2.push({ prompt: st.pending });
    if (st.pending.kind === 'evasion') {
      const b = await page.evaluate((r) => { const u = window.__battle.state().units[r]; return { pos: u.pos, hp: u.hp, ch: u.chakra }; }, st.pending.reactor);
      await page.keyboard.press('y');
      for (let k = 0; k < 6; k++) { await page.waitForTimeout(220); await shot(`evade-${k}`); }
      await h.idle();
      const a = await page.evaluate((r) => { const u = window.__battle.state().units[r]; return { pos: u.pos, hp: u.hp, ch: u.chakra, reaction: u.turn.reaction }; }, st.pending.reactor);
      out2.push({ evade: { b, a } });
      got = true;
    } else await page.keyboard.press('n');
    continue;
  }
  if (st.team === 'party') {
    if (st.cur === 'preset_founder') break;
    await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), st.cur);
  }
}
// --- C: Solen: stage a Node of his near a rogue, then Warp + edge strike from the HUD
await turnOf(page, 'preset_founder');
await page.waitForTimeout(800);
const C = await page.evaluate(() => {
  const s = window.__battle.state(); const u = s.units.preset_founder;
  const r = s.units.rogue_1.down ? s.units.rogue_0 : s.units.rogue_1;
  r.pos = { x: u.pos.x + 11, z: u.pos.z + 0.5 };
  s.nodes.push({ id: 'node_test_solen', owner: u.id, pos: { x: r.pos.x - 1, z: r.pos.z } });
  r.hp = 3; r.chakra = 19; r.turn.reaction = true;
  return { me: u.pos, r: r.id, rp: r.pos, node: { x: r.pos.x - 1, z: r.pos.z } };
});
await resync('preset_founder');
await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [C.me.x + 6, C.me.z]);
await page.waitForTimeout(1300);
await btn(/Warp/).click(); await page.waitForTimeout(300);
let q = await hoverPt(C.node.x, C.node.z); await shot('warp-aim');
await page.mouse.click(q.x, q.y);
for (let k = 0; k < 4; k++) { await page.waitForTimeout(250); await shot(`warp-anim-${k}`); }
await h.idle(); await page.waitForTimeout(900); await shot('warp-landed');
const C2 = await page.evaluate(() => { const u = window.__battle.state().units.preset_founder; return { pos: u.pos, edge: u.cond.warpEdge, ch: u.chakra, bonus: u.turn.bonus }; });
out2.push({ warp: C2 });
await btn(es ? 'Atacar' : 'Attack').click(); await page.waitForTimeout(300);
const rp = await page.evaluate((id) => window.__battle.state().units[id].pos, C.r);
q = await hoverPt(rp.x, rp.z, -30); await shot('edge-aim');
await page.mouse.click(q.x, q.y);
for (let k = 0; k < 4; k++) { await page.waitForTimeout(250); await shot(`edge-hit-${k}`); }
await h.idle(); await page.waitForTimeout(500); await shot('edge-done');
const C3 = await page.evaluate((id) => { const s = window.__battle.state(); return { r: s.units[id].hp, down: s.units[id].down, pending: s.pending, edge: s.units.preset_founder.cond.warpEdge }; }, C.r);
out2.push({ edgeHit: C3 });
await page.getByRole('button', { name: es ? 'Registro' : 'Log' }).click().catch(() => {});
await page.waitForTimeout(400); await shot('log');
console.log(JSON.stringify(out2, null, 1));
console.log('errors', JSON.stringify(errs));
await browser.close();
