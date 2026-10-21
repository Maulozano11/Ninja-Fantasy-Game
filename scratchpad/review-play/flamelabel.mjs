import { open, helpers, out, turnOf } from './lib.mjs';
const locale = process.argv[2] ?? 'en-US';
const L = locale.slice(0, 2);
const es = L === 'es';
const { browser, page, errs } = await open(locale);
const h = helpers(page);
await page.getByText(es ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await h.idle(); await h.playerTurn();
await turnOf(page, 'preset_ember');
await page.waitForTimeout(800);
const me = await page.evaluate(() => window.__battle.state().units.preset_ember.pos);
await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [me.x + 5, me.z]);
await page.waitForTimeout(1300);
const labelText = () => page.evaluate(() => { const el = [...document.querySelectorAll('div.font-semibold')].map((d) => d.parentElement?.innerText).filter(Boolean); return el; });
const results = [];
for (const [name, key] of [['flame', es ? 'Persecut' : 'Pursuing'], ['fireball', es ? 'Bola fuego' : 'Fireball']]) {
  await page.locator('button', { hasText: key }).first().click(); await page.waitForTimeout(300);
  // sweep the pointer around each foe to find the hover that targets it
  const foes = await page.evaluate(() => Object.values(window.__battle.state().units).filter((u) => u.team === 'enemy').map((u) => ({ id: u.id, pos: u.pos })));
  for (const f of foes) {
    const p = await h.at(f.pos.x, f.pos.z);
    for (const dy of [-10, -25, -40]) {
      await page.mouse.move(p.x, p.y + dy); await page.waitForTimeout(350);
      const d = Math.hypot(f.pos.x - me.x, f.pos.z - me.z).toFixed(1);
      results.push({ jutsu: name, foe: f.id, d, dy, label: (await labelText()).join(' / ') });
    }
  }
  await page.screenshot({ path: `${out}/label-${name}-${L}.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
}
console.log(JSON.stringify(results, null, 0));
console.log('errors', JSON.stringify(errs));
await browser.close();
