// Visual check of the Mirai step: Eye of Tomorrow ground marks, Pursuing Flame aim, Evasion prompt and step.
import { chromium } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pw/node_modules/playwright/index.mjs';
const out = process.argv[2];
const locale = process.argv[3] ?? 'es-MX';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
await page.goto('http://127.0.0.1:5310/', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.clear(); for (const k of ['tip_move', 'tip_attack', 'tip_jutsu', 'tip_cover', 'tip_stealth', 'tip_hands', 'tip_hydra']) localStorage.setItem(`shinobi.${k}`, '1'); localStorage.setItem('shinobi.battleSpeed', '1'); });
await page.reload({ waitUntil: 'networkidle' });
await page.getByText(locale.startsWith('es') ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await page.waitForFunction(() => window.__battle && !window.__battle.busy(), null, { timeout: 120000 });
// Wait for a player's turn (the enemies may act first).
await page.waitForFunction(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return !window.__battle.busy() && u?.team === 'party' && u.controller === 'player'; }, null, { timeout: 120000 });
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const b = window.__battle;
  const s = b.state();
  const mirai = Object.values(s.units).find((u) => u.team === 'party' && u.character?.clan === 'Mirai');
  const cur = s.units[s.order[s.turn]];
  // Put the turn on the Mirai so its buttons and the Eye show.
  if (mirai && cur.id !== mirai.id) {
    s.turn = s.order.indexOf(mirai.id);
    mirai.turn = { move: mirai.speed, action: true, bonus: true, reaction: true, moved: 0 };
  }
  b.act({ type: 'draw', unit: mirai.id });
  const enemies = Object.values(b.state().units).filter((u) => u.team === 'enemy');
  b.centerOn(mirai.pos.x + 5, mirai.pos.z);
  return { mirai: mirai.name, id: mirai.id, jutsus: mirai.jutsus, intents: enemies.map((e) => [e.id, JSON.stringify(e.intent), Math.hypot(e.pos.x - mirai.pos.x, e.pos.z - mirai.pos.z).toFixed(1)]) };
});
console.log(JSON.stringify(info, null, 1));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/1-eye-${locale}.png` });
// Pursuing Flame: aim at the nearest enemy.
await page.keyboard.press('3');
await page.waitForTimeout(300);
const tgt = await page.evaluate(() => {
  const b = window.__battle; const s = b.state(); const m = s.units[s.order[s.turn]];
  const e = Object.values(s.units).filter((u) => u.team === 'enemy' && !u.down).sort((a, c) => Math.hypot(a.pos.x - m.pos.x, a.pos.z - m.pos.z) - Math.hypot(c.pos.x - m.pos.x, c.pos.z - m.pos.z))[0];
  return { ...b.screenOf(e.pos.x, e.pos.z), id: e.id };
});
await page.mouse.move(tgt.x, tgt.y - 40);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/2-aim-${locale}.png` });
await page.keyboard.press('Escape');
// Evasion: the nearest rogue strikes the Mirai on its turn, until a blow lands.
let ask = null;
for (let i = 0; i < 40 && !ask; i++) {
  await page.waitForFunction(() => !window.__battle.busy(), null, { timeout: 60000 });
  ask = await page.evaluate((i) => {
    const b = window.__battle;
    const s = b.state();
    const m = Object.values(s.units).find((u) => u.team === 'party' && u.character?.clan === 'Mirai');
    const r = Object.values(s.units).filter((u) => u.team === 'enemy' && !u.down && u.kind === 'ninja').sort((a, c) => Math.hypot(a.pos.x - m.pos.x, a.pos.z - m.pos.z) - Math.hypot(c.pos.x - m.pos.x, c.pos.z - m.pos.z))[0];
    s.turn = s.order.indexOf(r.id);
    r.turn = { move: r.speed, action: true, bonus: true, reaction: true, moved: 0 };
    r.pos = { x: m.pos.x + 1.5, z: m.pos.z };
    s.seed = 1000 + i;
    m.turn.reaction = true;
    m.hp = m.maxHp;
    b.act({ type: 'attack', unit: r.id, target: m.id });
    const p = b.state().pending;
    return p ? { kind: p.kind, i, by: r.name } : null;
  }, i);
}
console.log('ask', JSON.stringify(ask));
await page.waitForTimeout(1600);
await page.screenshot({ path: `${out}/3-prompt-${locale}.png` });
await page.keyboard.press('y');
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/4-evade-${locale}.png` });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/5-evaded-${locale}.png` });
const after = await page.evaluate(() => { const s = window.__battle.state(); const m = Object.values(s.units).find((u) => u.team === 'party' && u.character?.clan === 'Mirai'); return { pending: s.pending?.kind, reaction: m.turn.reaction, chakra: m.chakra, hp: m.hp }; });
console.log('after', JSON.stringify(after));
// The log.
await page.getByRole('button', { name: locale.startsWith('es') ? 'Registro' : 'Log' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/6-log-${locale}.png` });
console.log('errors', JSON.stringify(errs));
await browser.close();
