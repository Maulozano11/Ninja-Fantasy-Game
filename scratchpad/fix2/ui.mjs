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
// Walk Akira toward the first rogue, so it stands within 12 m.
await page.evaluate(() => {
  const s = window.__battle.state(); const u = s.units.preset_ember; const f = s.units.rogue_0;
  const d = Math.hypot(f.pos.x - u.pos.x, f.pos.z - u.pos.z);
  for (const k of [5.5, 5, 4.5, 4, 6, 3.5, 3]) {
    const x = u.pos.x + (f.pos.x - u.pos.x) * k / d, z = u.pos.z + (f.pos.z - u.pos.z) * k / d;
    window.__battle.act({ type: 'move', unit: 'preset_ember', to: { c: Math.floor(x / 0.5), r: Math.floor(z / 0.5) } });
    const n = window.__battle.state().units.preset_ember.pos; if (n.x !== u.pos.x || n.z !== u.pos.z) return;
  }
});
await h.idle(); await page.waitForTimeout(800);
const me = await page.evaluate(() => window.__battle.state().units.preset_ember.pos);
await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [me.x + 5, me.z]);
await page.waitForTimeout(1300);
// The action bar: label, hotkey, disabled.
const bar = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => ({ t: b.innerText.replace(/\n/g, '|'), d: b.disabled, cut: [...b.querySelectorAll('*')].some((e) => e.children.length === 0 && e.scrollWidth > e.clientWidth + 1) })).filter((b) => b.t && b.t.length < 40 && /\|/.test(b.t)));
console.log('BAR', JSON.stringify(bar));
const labelText = () => page.evaluate(() => [...document.querySelectorAll('div.font-semibold')].map((d) => d.parentElement?.innerText).filter(Boolean));
const results = [];
await page.locator('button', { hasText: es ? 'Persigue' : 'Pursuing' }).first().click(); await page.waitForTimeout(300);
const foes = await page.evaluate(() => Object.values(window.__battle.state().units).filter((u) => u.team === 'enemy').map((u) => ({ id: u.id, pos: u.pos })));
for (const f of foes) {
  const p = await h.at(f.pos.x, f.pos.z);
  for (const dy of [-10, -25, -40]) {
    await page.mouse.move(p.x, p.y + dy); await page.waitForTimeout(350);
    const d = Math.hypot(f.pos.x - me.x, f.pos.z - me.z).toFixed(1);
    results.push({ foe: f.id, d, dy, label: (await labelText()).join(' / ') });
  }
}
await page.screenshot({ path: `${out}/flame-${L}.png` });
console.log(JSON.stringify(results.filter((r) => r.label), null, 0));
console.log('errors', JSON.stringify(errs));
await browser.close();
