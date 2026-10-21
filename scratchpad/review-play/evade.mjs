// Premonitory Evasion as the player: a raider strikes Akira in melee.
import { open, helpers, out, turnOf } from './lib.mjs';
const locale = process.argv[2] ?? 'es-MX';
const L = locale.slice(0, 2);
const es = L === 'es';
const { browser, page, errs } = await open(locale);
const h = helpers(page);
let n = 0;
const shot = async (name) => { n++; await page.screenshot({ path: `${out}/e-${String(n).padStart(2, '0')}-${name}-${L}.png` }); };
const res = [];
await page.getByText(es ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await h.idle(); await h.playerTurn();
await turnOf(page, 'preset_ember');
const A = await page.evaluate(() => {
  const s = window.__battle.state(); const u = s.units.preset_ember;
  u.pos = { x: 14, z: 12 };
  const others = ['preset_founder', 'companion_hana', 'companion_kenji'];
  others.forEach((id, i) => { s.units[id].pos = { x: 2.5, z: 6 + i * 2 }; });
  const near = [['raider_0', 1.0, 0.5], ['rogue_0', -1.0, 0.5], ['rogue_1', 0, -1.0]];
  for (const [id, dx, dz] of near) {
    const e = s.units[id];
    e.pos = { x: u.pos.x + dx, z: u.pos.z + dz };
    e.chakra = 0;
    e.intent = { kind: 'melee', what: e.weapon.name, target: 'preset_ember' };
  }
  return { me: u.pos };
});
await page.evaluate(() => window.__battle.act({ type: 'crouch', unit: 'preset_ember' })); await h.idle();
await page.evaluate(() => window.__battle.act({ type: 'crouch', unit: 'preset_ember' })); await h.idle();
await page.evaluate(() => window.__battle.act({ type: 'endTurn', unit: 'preset_ember' }));
for (let i = 0; i < 1500; i++) {
  await page.waitForTimeout(100);
  const st = await page.evaluate(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, team: u?.team, busy: window.__battle.busy(), round: s.round, pending: s.pending ? { kind: s.pending.kind, reactor: s.pending.reactor, dmg: s.pending.hit?.amount, src: s.pending.hit?.source } : null }; });
  if (st.busy) continue;
  if (st.round > 4) break;
  if (st.pending) {
    await page.waitForTimeout(300);
    await shot(`prompt-${st.pending.kind}`);
    res.push(st.pending);
    if (st.pending.kind === 'evasion' && st.pending.reactor === 'preset_ember') {
      const b = await page.evaluate(() => { const u = window.__battle.state().units.preset_ember; return { pos: u.pos, hp: u.hp, ch: u.chakra }; });
      // click the dialog's yes button if present
      const btns = await page.locator('button').allInnerTexts();
      res.push({ buttons: btns.filter((t) => t.length < 30).slice(-8) });
      await page.keyboard.press('y');
      for (let k = 0; k < 7; k++) { await page.waitForTimeout(160); await shot(`evade-${k}`); }
      await h.idle();
      const a = await page.evaluate(() => { const u = window.__battle.state().units.preset_ember; return { pos: u.pos, hp: u.hp, ch: u.chakra, reaction: u.turn.reaction }; });
      res.push({ b, a });
      break;
    }
    await page.keyboard.press('n');
    continue;
  }
  if (st.team === 'party') await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), st.cur);
}
await page.getByRole('button', { name: es ? 'Registro' : 'Log' }).click().catch(() => {});
await page.waitForTimeout(400); await shot('log');
console.log(JSON.stringify(res, null, 1));
console.log('errors', JSON.stringify(errs));
await browser.close();
