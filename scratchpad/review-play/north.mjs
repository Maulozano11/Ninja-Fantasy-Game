// Northstar from the creator: Shiori in the practice battle; aura, Command, Submission from the HUD.
import { open, helpers, out, turnOf } from './lib.mjs';
const locale = process.argv[2] ?? 'es-MX';
const L = locale.slice(0, 2);
const es = L === 'es';
const { browser, page, errs } = await open(locale, { hash: '#creator' });
const h = helpers(page);
let n = 0;
const shot = async (name) => { n++; await page.screenshot({ path: `${out}/n-${String(n).padStart(2, '0')}-${name}-${L}.png` }); };
const btn = (re) => page.locator('button', { hasText: re }).first();
const hoverUnit = async (id, dy = -30) => { const p = await page.evaluate((id) => window.__battle.state().units[id].pos, id); const q = await h.at(p.x, p.z); await page.mouse.move(q.x, q.y + dy); await page.waitForTimeout(600); return { x: q.x, y: q.y + dy }; };
const res = [];
await page.getByText('Shiori, the Gentle Fist').click();
await page.waitForTimeout(400);
await page.getByText('ENTER BATTLEFIELD').click();
await page.waitForTimeout(800);
await page.getByText(es ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await h.idle(); await h.playerTurn();
const me0 = await turnOf(page, 'preset_gentle');
await page.waitForTimeout(1300);
const st0 = await page.evaluate(() => { const s = window.__battle.state(); return Object.values(s.units).map((u) => ({ id: u.id, clan: u.character?.clan, rank: u.rank, pos: u.pos, wis: u.stats.wis, jutsus: u.jutsus.slice(0, 3) })); });
res.push({ units: st0 });
await shot('aura-start');
// move toward the raider: 8 m
const P = await page.evaluate(() => { const s = window.__battle.state(); return { me: s.units.preset_gentle.pos, r: s.units.raider_0.pos, move: s.units.preset_gentle.turn.move }; });
const d = Math.hypot(P.r.x - P.me.x, P.r.z - P.me.z);
const k = Math.min(P.move - 0.5, d - 6) / d;
let q = await h.at(P.me.x + (P.r.x - P.me.x) * k, P.me.z + (P.r.z - P.me.z) * k);
await page.mouse.move(q.x, q.y); await page.waitForTimeout(300); await page.mouse.click(q.x, q.y);
await page.waitForTimeout(300); await h.idle(); await page.waitForTimeout(1300);
await shot('aura-moved');
await btn('Command').hover(); await page.waitForTimeout(500); await shot('command-help');
await btn('Command').click(); await page.waitForTimeout(400);
await page.mouse.move(640, 300); await page.waitForTimeout(400); await shot('command-mode');
for (const id of ['rogue_0', 'rogue_1', 'companion_hana', 'raider_0']) { await hoverUnit(id); await shot(`command-hover-${id}`); }
q = await hoverUnit('raider_0');
await page.mouse.click(q.x, q.y);
for (let i = 0; i < 4; i++) { await page.waitForTimeout(300); await shot(`command-cast-${i}`); }
await h.idle(); await page.waitForTimeout(500); await shot('command-after');
const r1 = await page.evaluate(() => { const s = window.__battle.state(); const r = s.units.raider_0; const u = s.units.preset_gentle; return { team: r.team, commanded: r.commanded, chakra: u.chakra, action: u.turn.action }; });
res.push({ afterCommand: r1 });
// Submission button
const sub = btn(es ? 'Sumisi' : 'Submit');
await sub.hover(); await page.waitForTimeout(500); await shot('submission-help');
res.push({ subDisabled: await sub.isDisabled() });
await page.keyboard.press('Escape');
await page.getByRole('button', { name: es ? 'Registro' : 'Log' }).click().catch(() => {});
await page.waitForTimeout(400); await shot('log-1');
await page.getByRole('button', { name: es ? 'Registro' : 'Log' }).click().catch(() => {});
// End turn; watch the next turns (other party ends) and capture the commanded raider's turn.
await page.evaluate(() => window.__battle.act({ type: 'endTurn', unit: 'preset_gentle' }));
let k2 = 0;
for (let i = 0; i < 1500; i++) {
  await page.waitForTimeout(120);
  const st = await page.evaluate(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, team: u?.team, busy: window.__battle.busy(), round: s.round, phase: s.phase, pending: s.pending ? { kind: s.pending.kind, reactor: s.pending.reactor } : null, raider: s.units.raider_0.team }; });
  if (st.phase === 'ended') break;
  if (st.cur === 'raider_0' && st.busy && k2 < 6) { k2++; await shot(`raider-turn-${k2}`); await page.waitForTimeout(250); }
  if (st.busy) continue;
  if (st.pending) { await page.keyboard.press('n'); continue; }
  if (st.team === 'party' && st.cur !== 'raider_0') {
    if (st.cur === 'preset_gentle') break;
    await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), st.cur);
  }
}
await page.waitForTimeout(800);
await shot('shiori-turn-2');
const r2 = await page.evaluate(() => { const s = window.__battle.state(); const r = s.units.raider_0; return { team: r.team, commanded: r.commanded, hp: r.hp }; });
res.push({ round2: r2 });
await page.getByRole('button', { name: es ? 'Registro' : 'Log' }).click().catch(() => {});
await page.waitForTimeout(400); await shot('log-2');
console.log(JSON.stringify(res, null, 1));
console.log('errors', JSON.stringify(errs));
await browser.close();
