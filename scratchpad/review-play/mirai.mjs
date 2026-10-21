import { open, helpers, out, turnOf } from './lib.mjs';
const locale = process.argv[2] ?? 'es-MX';
const L = locale.slice(0, 2);
const { browser, page, errs } = await open(locale);
const h = helpers(page);
await page.getByText(L === 'es' ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await h.idle(); await h.playerTurn(); await turnOf(page, 'preset_ember'); await page.waitForTimeout(800);
console.log('cur', JSON.stringify(await h.cur()));
// Eye of Tomorrow overlay near the enemies
const intents = await h.st(() => { const s = window.__battle.state(); return Object.values(s.units).filter((u) => u.team === 'enemy').map((u) => ({ id: u.id, pos: u.pos, intent: u.intent })); });
console.log('intents', JSON.stringify(intents));
await page.evaluate(() => window.__battle.centerOn(14, 11));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/mirai-1-eye-${L}.png` });
// hover rogue_0 to see the intent chip
let p = await h.at(19.25, 9.75);
await page.mouse.move(p.x, p.y - 30);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/mirai-2-hover-${L}.png` });
// Move Akira closer by clicking the ground
const ak = await h.st(() => window.__battle.state().units.preset_ember.pos);
p = await h.at(ak.x + 4, ak.z - 1.5);
await page.mouse.move(p.x, p.y);
await page.waitForTimeout(300);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(300);
await h.idle();
console.log('after move', JSON.stringify(await h.cur()));
// Pursuing flame via button
const btn = page.locator('button', { hasText: L === 'es' ? 'Persecut' : 'Pursuing' }).first();
await btn.hover();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/mirai-3-btnhelp-${L}.png` });
await btn.click();
await page.waitForTimeout(300);
const r0 = await h.st(() => window.__battle.state().units.rogue_0.pos);
p = await h.at(r0.x, r0.z);
await page.mouse.move(p.x, p.y - 30);
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/mirai-4-aim-${L}.png` });
const before = await h.st(() => { const s = window.__battle.state(); return { hp: s.units.rogue_0.hp, ch: s.units.preset_ember.chakra, log: s.log?.length }; });
await page.mouse.click(p.x, p.y - 30);
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/mirai-5-cast-mid-${L}.png` });
await h.idle();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/mirai-6-cast-after-${L}.png` });
const after = await h.st(() => { const s = window.__battle.state(); return { hp: s.units.rogue_0.hp, ch: s.units.preset_ember.chakra, rogue: s.units.rogue_0.pos, akira: s.units.preset_ember.pos, react: s.units.rogue_0.turn.reaction }; });
console.log('flame', JSON.stringify(before), JSON.stringify(after));
// End Akira's turn; keep playing: other party just end turn, and watch for the Evasion prompt on Akira.
await page.keyboard.press('Space');
let prompt = false;
for (let i = 0; i < 600; i++) {
  await page.waitForTimeout(200);
  const s = await h.st(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, team: u?.team, busy: window.__battle.busy(), pending: s.pending ? { kind: s.pending.kind, unit: s.pending.unit } : null, round: s.round, phase: s.phase, akiraHp: s.units.preset_ember.hp, akiraPos: s.units.preset_ember.pos, akiraCh: s.units.preset_ember.chakra }; });
  if (s.pending && !s.busy) {
    console.log('pending', JSON.stringify(s));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/mirai-7-prompt-${s.pending.kind}-${L}.png` });
    if (s.pending.kind === 'evasion' && !prompt) {
      prompt = true;
      const yes = page.locator('button', { hasText: L === 'es' ? /Esquivar|Evadir|Evasi/ : /Evade|Evasion|Sidestep/ }).first();
      const txt = await page.locator('button').allInnerTexts();
      console.log('buttons', JSON.stringify(txt.filter((t) => t.length < 40)));
      await yes.click().catch((e) => console.log('noclick', e.message));
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/mirai-8-evaded-${L}.png` });
      await h.idle();
      const s2 = await h.st(() => { const s = window.__battle.state(); return { hp: s.units.preset_ember.hp, pos: s.units.preset_ember.pos, ch: s.units.preset_ember.chakra }; });
      console.log('after evade', JSON.stringify(s2));
      await page.screenshot({ path: `${out}/mirai-9-evaded-after-${L}.png` });
      break;
    } else {
      // decline other prompts
      const txt = await page.locator('button').allInnerTexts();
      console.log('buttons', JSON.stringify(txt.filter((t) => t.length < 40)));
      await page.keyboard.press('Escape');
    }
  }
  if (!s.busy && s.team === 'party' && !s.pending) {
    if (s.round >= 4) break;
    await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), s.cur);
  }
}
await page.getByRole('button', { name: L === 'es' ? 'Registro' : 'Log' }).click().catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/mirai-10-log-${L}.png` });
console.log('errors', JSON.stringify(errs));
await browser.close();
