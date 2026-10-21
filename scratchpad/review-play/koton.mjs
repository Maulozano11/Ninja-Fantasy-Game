import { open, helpers, out, turnOf } from './lib.mjs';
const locale = process.argv[2] ?? 'es-MX';
const L = locale.slice(0, 2);
const { browser, page, errs } = await open(locale);
const h = helpers(page);
await page.getByText(L === 'es' ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await h.idle(); await h.playerTurn();
await turnOf(page, 'companion_hana');
await page.waitForTimeout(1500);
const me = await h.cur();
console.log('cur', JSON.stringify(me));
const foes = await h.st(() => Object.values(window.__battle.state().units).filter((u) => u.team === 'enemy' && !u.down).map((u) => ({ id: u.id, pos: u.pos })));
console.log('foes', JSON.stringify(foes));
const shot = async (n) => page.screenshot({ path: `${out}/koton-${n}-${L}.png` });
const hover = async (x, z) => { const p = await h.at(x, z); await page.mouse.move(p.x, p.y); await page.waitForTimeout(500); return p; };
// Block button
const blockBtn = page.locator('button', { hasText: L === 'es' ? 'Bloque' : 'Block' }).first();
await blockBtn.hover(); await page.waitForTimeout(500); await shot('1-blockhelp');
await blockBtn.click(); await page.waitForTimeout(400);
const f0 = foes[0].pos;
const dx = f0.x - me.pos.x, dz = f0.z - me.pos.z, dl = Math.hypot(dx, dz);
const ux = dx / dl, uz = dz / dl;
await hover(me.pos.x + ux * 2.5, me.pos.z + uz * 2.5); await shot('2-block-preview');
// on an ally
const ally = await h.st(() => window.__battle.state().units.preset_founder.pos);
await hover(ally.x, ally.z); await shot('3-block-occupied');
await hover(me.pos.x + ux * 8, me.pos.z + uz * 8); await shot('4-block-far');
const p = await hover(me.pos.x + ux * 2.5, me.pos.z + uz * 2.5);
await page.mouse.click(p.x, p.y); await page.waitForTimeout(700); await shot('5-block-rising');
await h.idle(); await page.waitForTimeout(300); await shot('6-block-raised');
let walls = await h.st(() => window.__battle.state().walls.map((w) => ({ id: w.id, kind: w.kind, hp: w.hp, owner: w.owner, a: w.a, b: w.b })));
console.log('walls', JSON.stringify(walls), JSON.stringify(await h.cur()));
// Wall button
const wallBtn = page.locator('button', { hasText: L === 'es' ? 'Muro metal' : 'Metal wall' }).first();
await wallBtn.hover(); await page.waitForTimeout(500); await shot('7-wallhelp');
await wallBtn.click(); await page.waitForTimeout(400);
const perp = { x: -uz, z: ux };
const wp = { x: me.pos.x + ux * 4 + perp.x * 3, z: me.pos.z + uz * 4 + perp.z * 3 };
let q = await hover(wp.x, wp.z); await shot('8-wall-preview');
// press E (should do nothing now)
await page.keyboard.press('e'); await page.waitForTimeout(300); await shot('8b-wall-E');
await page.mouse.click(q.x, q.y); await page.waitForTimeout(700); await shot('9-wall-rising');
await h.idle(); await page.waitForTimeout(300); await shot('10-wall-raised');
walls = await h.st(() => window.__battle.state().walls.map((w) => ({ id: w.id, kind: w.kind, hp: w.hp, owner: w.owner, a: w.a, b: w.b })));
console.log('walls', JSON.stringify(walls), JSON.stringify(await h.cur()));
await page.keyboard.press('Escape');
await page.getByRole('button', { name: L === 'es' ? 'Registro' : 'Log' }).click().catch(() => {});
await page.waitForTimeout(400); await shot('12-log');
await page.getByRole('button', { name: L === 'es' ? 'Registro' : 'Log' }).click().catch(() => {});
// End the turn and watch the enemies for two rounds (other party just end).
await page.keyboard.press('Space');
let k = 0;
for (let i = 0; i < 400 && k < 12; i++) {
  await page.waitForTimeout(250);
  const s = await h.st(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, team: u?.team, busy: window.__battle.busy(), pending: !!s.pending, round: s.round, phase: s.phase }; });
  if (s.phase === 'ended') break;
  if (s.pending && !s.busy) { await page.keyboard.press('n'); continue; }
  if (s.busy && s.team === 'enemy' && i % 4 === 0) { await shot(`13-enemy-${String(k).padStart(2, '0')}`); k++; }
  if (!s.busy && s.team === 'party') { if (s.round >= 3) break; await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), s.cur); }
}
const log = await h.st(() => (window.__battle.state().log ?? []).slice(-40));
console.log('log', JSON.stringify(log).slice(0, 3000));
walls = await h.st(() => window.__battle.state().walls.map((w) => ({ id: w.id, kind: w.kind, hp: w.hp })));
console.log('walls end', JSON.stringify(walls));
await page.getByRole('button', { name: L === 'es' ? 'Registro' : 'Log' }).click().catch(() => {});
await page.waitForTimeout(400); await shot('14-log-end');
console.log('errors', JSON.stringify(errs));
await browser.close();
