// The player against an enemy Kōton block: attack label, hit, kunai Node on its face, warp preview.
import { open, helpers, out, turnOf } from './lib.mjs';
const locale = process.argv[2] ?? 'es-MX';
const L = locale.slice(0, 2);
const es = L === 'es';
const { browser, page, errs } = await open(locale);
const h = helpers(page);
let n = 0;
const shot = async (name) => { n++; await page.screenshot({ path: `${out}/s-${String(n).padStart(2, '0')}-${name}-${L}.png` }); };
const labelText = () => page.evaluate(() => [...document.querySelectorAll('div.font-semibold')].map((d) => d.parentElement?.innerText.replace(/\n/g, ' | ')).filter(Boolean).join(' // '));
const res = [];
await page.getByText(es ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await h.idle(); await h.playerTurn();
await turnOf(page, 'preset_founder');
const P = await page.evaluate(() => {
  const s = window.__battle.state(); const u = s.units.preset_founder;
  const c = { x: Math.floor((u.pos.x + 3) / 0.5) * 0.5 + 0.25, z: Math.floor(u.pos.z / 0.5) * 0.5 + 0.25 };
  s.walls.push({ id: 'wall_test_block', kind: 'metalBlock', a: c, b: c, hp: 20, maxHp: 20, owner: 'raider_0' });
  return { me: u.pos, block: c };
});
await page.evaluate(() => window.__battle.act({ type: 'crouch', unit: 'preset_founder' })); await h.idle();
await page.evaluate(() => window.__battle.act({ type: 'crouch', unit: 'preset_founder' })); await h.idle();
await page.evaluate(() => { const u = window.__battle.state().units.preset_founder; u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 }; window.__battle.act({ type: 'setController', unit: 'preset_founder', controller: 'player' }); });
await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), [P.block.x, P.block.z]); await page.waitForTimeout(1300);
await shot('block');
await page.locator('button', { hasText: 'Kunai' }).first().click(); await page.waitForTimeout(300);
let q = await h.at(P.block.x, P.block.z);
await page.mouse.move(q.x, q.y - 20); await page.waitForTimeout(500);
res.push({ kunaiBlockLabel: await labelText() });
await shot('kunai-aim-block');
await page.mouse.click(q.x, q.y - 20); await page.waitForTimeout(400); await h.idle(); await page.waitForTimeout(900);
await shot('kunai-hit-block');
res.push({ after: await page.evaluate(() => { const s = window.__battle.state(); return { walls: s.walls.map((w) => ({ id: w.id, hp: w.hp })), nodes: s.nodes }; }) });
// Walk to the far side of the block and warp back to the Node on the face
await page.evaluate(() => { const s = window.__battle.state(); const u = s.units.preset_founder; u.turn.action = true; });
await page.locator('button', { hasText: 'Warp' }).first().click(); await page.waitForTimeout(300);
const nd = await page.evaluate(() => window.__battle.state().nodes.filter((x) => x.owner === 'preset_founder').at(-1));
if (nd) { q = await h.at(nd.pos.x, nd.pos.z); await page.mouse.move(q.x, q.y); await page.waitForTimeout(500); res.push({ warpLabel: await labelText(), node: nd.pos }); await shot('warp-to-face'); }
await page.keyboard.press('Escape');
// melee the block
await page.locator('button', { hasText: es ? 'Atacar' : 'Attack' }).first().click(); await page.waitForTimeout(300);
q = await h.at(P.block.x, P.block.z);
await page.mouse.move(q.x, q.y - 20); await page.waitForTimeout(500);
res.push({ meleeBlockLabel: await labelText() });
await shot('melee-aim-block');
console.log(JSON.stringify(res, null, 1));
console.log('errors', JSON.stringify(errs));
await browser.close();
