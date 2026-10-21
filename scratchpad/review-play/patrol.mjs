// River patrol: stealth phase HUD (clan buttons), a loud block starts the fight, then the AI Kōton hunter.
import { open, helpers, out } from './lib.mjs';
const locale = process.argv[2] ?? 'es-MX';
const L = locale.slice(0, 2);
const es = L === 'es';
const { browser, page, errs } = await open(locale);
const h = helpers(page);
let n = 0;
const shot = async (name) => { n++; await page.screenshot({ path: `${out}/p-${String(n).padStart(2, '0')}-${name}-${L}.png` }); };
const btn = (re) => page.locator('button', { hasText: re }).first();
const res = [];
await page.getByText(es ? 'Patrulla en el cruce' : 'Patrol at the crossing').click();
await h.idle();
await page.waitForTimeout(1500);
const st0 = await page.evaluate(() => { const s = window.__battle.state(); return { phase: s.phase, cur: s.order[s.turn], units: Object.values(s.units).map((u) => ({ id: u.id, team: u.team, clan: u.character?.clan, rank: u.rank, pos: u.pos })) }; });
res.push(st0);
await shot('stealth-start');
// Select Hana (Tab cycles the stealth party)
for (let i = 0; i < 5; i++) {
  const sel = await page.evaluate(() => document.body.innerText.includes('Kōton ·'));
  if (sel) break;
  await page.keyboard.press('Tab'); await page.waitForTimeout(300);
}
await page.waitForTimeout(800);
await shot('stealth-hana');
// Swap and Command in stealth for Kenji: check buttons
const kb = await page.locator('button').allInnerTexts();
res.push({ buttons: kb.filter((t) => t.length < 30 && t.length > 0).slice(-16) });
const me = await page.evaluate(() => window.__battle.state().units.companion_hana.pos);
await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [me.x + 2, me.z - 2]);
await page.waitForTimeout(1200);
await btn(es ? 'Bloque' : 'Block').click(); await page.waitForTimeout(300);
let q = await h.at(me.x + 2, me.z);
await page.mouse.move(q.x, q.y); await page.waitForTimeout(500); await shot('stealth-block-aim');
await page.mouse.click(q.x, q.y); await page.waitForTimeout(500);
await h.idle(); await page.waitForTimeout(800); await shot('stealth-block-done');
const st1 = await page.evaluate(() => { const s = window.__battle.state(); return { phase: s.phase, walls: s.walls.length, cur: s.order[s.turn] }; });
res.push({ afterBlock: st1 });
// Bring the hunter close (12 m east of Hana) once in combat
await page.evaluate(() => { const s = window.__battle.state(); const hn = Object.values(s.units).find((u) => u.id.startsWith('hunter')); const hana = s.units.companion_hana; hn.pos = { x: hana.pos.x + 11, z: hana.pos.z + 1 }; hn.intent = undefined; });
let shots = 0;
for (let i = 0; i < 2500; i++) {
  await page.waitForTimeout(120);
  const st = await page.evaluate(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, team: u?.team, ctrl: u?.controller, busy: window.__battle.busy(), round: s.round, phase: s.phase, pending: !!s.pending, walls: s.walls.map((w) => w.kind + ':' + w.owner) }; });
  if (st.phase === 'ended' || st.round > 4) break;
  if (st.cur?.startsWith('hunter') && st.busy && shots < 10) { shots++; const p = await page.evaluate(() => { const s = window.__battle.state(); return Object.values(s.units).find((u) => u.id.startsWith('hunter')).pos; }); await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [p.x - 3, p.z]); await page.waitForTimeout(300); await shot(`hunter-${shots}`); }
  if (st.busy) continue;
  if (st.pending) { await page.keyboard.press('n'); continue; }
  if (st.team === 'party' && st.ctrl === 'player') await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), st.cur);
}
const st2 = await page.evaluate(() => { const s = window.__battle.state(); return { phase: s.phase, round: s.round, walls: s.walls.map((w) => ({ kind: w.kind, owner: w.owner, hp: w.hp })) }; });
res.push({ end: st2 });
await page.getByRole('button', { name: es ? 'Registro' : 'Log' }).click().catch(() => {});
await page.waitForTimeout(400);
const logText = await page.evaluate(() => { const el = [...document.querySelectorAll('div')].find((d) => /^(Registro|Log)$/.test(d.firstElementChild?.innerText?.trim() ?? '')); return el ? el.innerText : ''; });
await shot('log');
console.log(JSON.stringify(res, null, 1));
console.log('LOG', logText.slice(0, 2500));
console.log('errors', JSON.stringify(errs));
await browser.close();
