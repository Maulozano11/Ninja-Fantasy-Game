import { open, helpers, out, turnOf } from './lib.mjs';
const locale = process.argv[2] ?? 'en-US';
const L = locale.slice(0, 2);
const es = L === 'es';
const { browser, page, errs } = await open(locale, { hash: '#creator' });
const h = helpers(page);
await page.getByText('Shiori, the Gentle Fist').click(); await page.waitForTimeout(300);
await page.getByText('ENTER BATTLEFIELD').click(); await page.waitForTimeout(800);
const labelText = () => page.evaluate(() => [...document.querySelectorAll('div.font-semibold')].map((d) => d.parentElement?.innerText.replace(/\n/g, ' | ')).filter(Boolean).join(' // '));
const res = [];
await page.getByText(es ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await h.idle(); await h.playerTurn();
await turnOf(page, 'preset_gentle');
const me = await page.evaluate(() => { const s = window.__battle.state(); const u = s.units.preset_gentle; s.units.raider_0.pos = { x: u.pos.x + 6, z: u.pos.z }; s.units.rogue_0.pos = { x: u.pos.x + 7, z: u.pos.z - 3 }; return u.pos; });
await page.evaluate(() => window.__battle.act({ type: 'crouch', unit: 'preset_gentle' })); await h.idle();
await page.evaluate(() => window.__battle.act({ type: 'crouch', unit: 'preset_gentle' })); await h.idle();
await page.evaluate(() => { const u = window.__battle.state().units.preset_gentle; u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 }; window.__battle.act({ type: 'setController', unit: 'preset_gentle', controller: 'player' }); });
await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [me.x + 3, me.z]); await page.waitForTimeout(1300);
for (const [k, b] of [['command', 'Command'], ['submission', es ? 'Sumisi' : 'Submit']]) {
  await page.locator('button', { hasText: b }).first().click(); await page.waitForTimeout(300);
  for (const id of ['raider_0', 'rogue_0', 'companion_hana']) {
    const q = await page.evaluate((id) => window.__battle.state().units[id].pos, id);
    const p = await h.at(q.x, q.z);
    await page.mouse.move(p.x, p.y - 25); await page.waitForTimeout(450);
    res.push({ k, id, label: await labelText() });
    await page.screenshot({ path: `${out}/n3-${k}-${id}-${L}.png` });
  }
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
}
await browser.close();
console.log(JSON.stringify(res, null, 1));
console.log('errors', JSON.stringify(errs));
