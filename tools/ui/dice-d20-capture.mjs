// Captures real battle-screen frames for the dice mockups (tools/ui/dice-d20-mock.ts lays the dice
// over them). Practice battle 1: Akira steps up to the Rogue and strikes, once hitting and once
// missing; the frames come every 40 ms of game time (Playwright's fake clock steps the game, so
// every frame is exact however slow the screenshots are). The game's own damage numbers and roll
// toast, and the enemies' intent marks, are hidden, since the mockup draws the new ones over a
// clean scene.
//
//   npx vite --port 5471 --strictPort &          (the dev server, from the repo root)
//   node tools/ui/dice-d20-capture.mjs <outDir> [port]
//
// Playwright is not a dependency: in cloud sessions it is at /opt/node-tools (see CLAUDE.md).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
const port = process.argv[3] ?? '5471';
if (!out) throw new Error('usage: node tools/ui/dice-d20-capture.mjs <outDir> [port]');
mkdirSync(out, { recursive: true });
const pw = process.env.PLAYWRIGHT ?? '/opt/node-tools/node_modules/playwright/index.mjs';
const { chromium } = await import(pw);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') });
await page.addInitScript(() => {
  localStorage.setItem('shinobi.lang', 'es');
  localStorage.setItem('shinobi.battleSpeed', '1');
  localStorage.setItem('shinobi.tips.off', '1');
  // The floating numbers (bold 800 canvas text) are drawn by the mockup instead.
  const fill = CanvasRenderingContext2D.prototype.fillText, stroke = CanvasRenderingContext2D.prototype.strokeText;
  CanvasRenderingContext2D.prototype.fillText = function (...a) {
    if (String(this.font).startsWith('800')) return;
    return fill.apply(this, a);
  };
  CanvasRenderingContext2D.prototype.strokeText = function (...a) {
    if (String(this.font).startsWith('800')) return;
    return stroke.apply(this, a);
  };
});
const settle = async (ms) => {
  for (let t = 0; t < ms; t += 100) {
    await page.clock.runFor(100);
    await page.waitForTimeout(15);
  }
};
await page.goto(`http://127.0.0.1:${port}/#combat`);
await page.waitForTimeout(2500);
await settle(1500);
await page.getByText('Pelear').first().click();
for (let i = 0; i < 100; i++) {
  await settle(200);
  if (await page.evaluate(() => typeof window.__battle === 'object')) break;
}
// Let the enemy's first turn play out, until it is a party ninja's turn.
for (let i = 0; i < 120; i++) {
  await settle(250);
  const ok = await page.evaluate(() => {
    const b = window.__battle;
    const s = b.state();
    const u = s.units[s.order[s.turn]];
    return !b.busy() && u && u.team === 'party';
  });
  if (ok) break;
}
await page.addStyleTag({ content: '[class*="w-[min(236px"]{display:none!important}' });

// The scene: Akira (katana) beside the Rogue, his turn, the camera between them.
const setup = async (ac) =>
  page.evaluate((ac) => {
    const b = window.__battle;
    const s = b.state();
    const akira = s.units.preset_ember, rogue = s.units.rogue_0;
    akira.pos = { x: rogue.pos.x - 1.25, z: rogue.pos.z };
    akira.facing = 1;
    akira.controller = 'player';
    akira.turn = { move: akira.speed, action: true, bonus: true, reaction: true, moved: 0 };
    rogue.ac = ac;
    // No Kawarimi or Evasion: the mockup's blow has to land on the Rogue himself.
    rogue.turn = { ...rogue.turn, reaction: false };
    rogue.hp = 999;
    rogue.maxHp = 999;
    for (const u of Object.values(s.units)) delete u.intent;
    s.turn = s.order.indexOf('preset_ember');
    b.sync();
    b.centerOn(rogue.pos.x - 0.6, rogue.pos.z - 1.2);
    const a = b.screenOf(akira.pos.x, akira.pos.z), r = b.screenOf(rogue.pos.x, rogue.pos.z);
    return { actor: a, target: r };
  }, ac);

// The clock runs freely while the scene settles, and stands still while a sequence is shot.
const pause = async () => {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 50);
};
const shoot = async (name, frames, before) => {
  const dir = join(out, name);
  mkdirSync(dir, { recursive: true });
  await pause();
  if (before) await page.evaluate(before);
  for (let i = 0; i < frames; i++) {
    await page.screenshot({ path: join(dir, String(i).padStart(3, '0') + '.png') });
    await page.clock.runFor(40);
  }
  await page.clock.resume();
};
const attack = () => window.__battle.act({ type: 'attack', unit: 'preset_ember', target: 'rogue_0' });

const meta = {};
meta.pos = await setup(1);
await settle(1200);
meta.pos = await page.evaluate(() => {
  const b = window.__battle, s = b.state();
  const a = s.units.preset_ember, r = s.units.rogue_0;
  return { actor: b.screenOf(a.pos.x, a.pos.z), target: b.screenOf(r.pos.x, r.pos.z) };
});
await shoot('idle', 60);
await shoot('hit', 40, attack);
await settle(1500);
await setup(99);
await settle(1200);
await shoot('miss', 40, attack);
meta.actorChakra = await page.evaluate(() => window.__battle.state().units.preset_ember.character?.appearance?.chakra ?? null);
writeFileSync(join(out, 'meta.json'), JSON.stringify(meta, null, 1));
console.log(JSON.stringify(meta));
await browser.close();
