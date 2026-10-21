// Is everything a Warp Strike draws made before it plays? Checks the screen's own caches (unitArt.ts)
// at the moments that matter, independent of how loaded the machine is.
//   node ready.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.addInitScript(() => {
  let seed = 99;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); localStorage.setItem('shinobi.battleSpeed', '1');
});
await page.goto('http://127.0.0.1:5296/#combat');
await page.locator('button', { hasText: 'Renegados en el claro' }).click();
await page.waitForFunction(() => !!window.__battle, null, { timeout: 60000 });
await page.waitForFunction(() => { const b = window.__battle; const s = b.state(); return !b.busy() && s.units[s.order[s.turn]]?.team === 'party'; }, null, { timeout: 120000 });
const missing = (armed) => page.evaluate(async (armed) => {
  const ua = await import('/src/components/battle/unitArt.ts');
  const s = window.__battle.state();
  const u = s.units.preset_founder;
  const look = ua.lookOf({ ...u, armed });
  const caught = ua.catchLookOf(look);
  const out = [];
  for (let f = 0; f <= 3; f++) if (!ua.hasUnitFrame(u, look, 'throw', f)) out.push(`throw ${f}`);
  for (const f of [3, 4]) if (!ua.hasPhaseFrame(u, look, 'throw', f)) out.push(`light throw ${f}`);
  if (!ua.hasPhaseFrame(u, caught, 'pierce', 1)) out.push('light pierce 1');
  for (let f = 1; f <= 4; f++) if (!ua.hasUnitFrame(u, caught, 'pierce', f)) out.push(`pierce ${f}`);
  if (caught !== look && !ua.hasUnitFrame(u, look, 'pierce', 4)) out.push('pierce 4 (kunai fading)');
  if (!ua.hasReleaseClear(look)) out.push('release clear');
  return { armed, stowed: !!look.stowed, missing: out };
}, armed);
const ryusei = await page.evaluate(() => Object.values(window.__battle.state().units).filter((u) => u.character?.clan === 'Ryusei').map((u) => `${u.id} (${u.team}, weapon ${u.weapon.held ? 'held' : 'none'})`));
console.log('Ryusei on the field:', ryusei.join(', '));
await page.evaluate(() => {
  const b = window.__battle; const s = b.state();
  const r = s.units.preset_founder; const foe = s.units.rogue_0;
  s.turn = s.order.indexOf(r.id); r.turn.bonus = true; r.turn.action = true; r.chakra = r.maxChakra; r.armed = true;
  for (const o of Object.values(s.units)) if (o.team === 'enemy') delete o.intent;
  let k = 0; for (const o of Object.values(s.units)) if (o.id !== r.id && o.id !== foe.id) o.pos = { x: 2.25 + (k++) * 1.5, z: 19.25 };
  r.pos = { x: 10.25, z: 10.25 }; foe.pos = { x: 17.75, z: 11.25 };
  s.nodes = s.nodes.filter((n) => n.owner !== r.id);
  b.sync();
  b.centerOn(14, 10.75);
});
for (const wait of [0, 1000, 3000, 6000]) {
  if (wait) await page.waitForTimeout(wait - (wait === 1000 ? 0 : wait === 3000 ? 1000 : 3000));
  console.log(`his turn, no Node, after ${wait} ms:`, JSON.stringify(await missing(true)), JSON.stringify(await missing(false)));
}
await page.evaluate(() => { const s = window.__battle.state(); s.nodes.push({ id: 'n_a', owner: 'preset_founder', pos: { x: 16.75, z: 11.25 } }); window.__battle.sync(); });
await page.waitForTimeout(1000);
// The weapon put away, then the warp the way the AI casts it: 260 ms after the screen settles.
const r = await page.evaluate(async () => {
  const b = window.__battle;
  const ok1 = b.act({ type: 'draw', unit: 'preset_founder' });
  while (b.busy()) await new Promise((r) => setTimeout(r, 5));
  await new Promise((r) => setTimeout(r, 260));
  return { ok1, armed: b.state().units.preset_founder.armed };
});
console.log('stowed:', JSON.stringify(r), 'at the cast:', JSON.stringify(await missing(false)));
await browser.close();
