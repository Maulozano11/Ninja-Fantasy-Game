// Visual check: an enemy Kōton raises a metal block for cover on its own.
import { chromium } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pw/node_modules/playwright/index.mjs';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'es-MX' });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://127.0.0.1:5330/', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('shinobi.tips.off', '1'); localStorage.setItem('shinobi.battleSpeed', '2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.getByText('Renegados en el claro').click();
await page.waitForFunction(() => window.__battle && !window.__battle.busy(), null, { timeout: 120000 });
// Every enemy becomes a Kōton (their clan abilities first).
await page.evaluate(() => {
  const s = window.__battle.state();
  for (const u of Object.values(s.units)) if (u.team === 'enemy' && u.kind === 'ninja') {
    u.character = { ...u.character, clan: 'Koton' };
    u.jutsus = ['koton_block', 'koton_wall', ...u.jutsus];
  }
});
let shot = null;
for (let i = 0; i < 120 && !shot; i++) {
  await page.waitForTimeout(250);
  shot = await page.evaluate(() => {
    const b = window.__battle; const s = b.state();
    const w = s.walls.find((x) => s.units[x.owner]?.team === 'enemy');
    if (w) { b.centerOn(w.a.x, w.a.z); return { w, owner: s.units[w.owner].name }; }
    const u = s.units[s.order[s.turn]];
    if (!b.busy() && s.phase === 'combat' && u?.team === 'party' && u.controller === 'player' && !s.pending) b.act({ type: 'endTurn', unit: u.id });
    if (!b.busy() && s.pending) b.act({ type: 'react', unit: s.pending.reactor, take: false });
    return null;
  });
}
console.log('block', JSON.stringify(shot));
await page.waitForFunction(() => !window.__battle.busy(), null, { timeout: 60000 });
await page.evaluate((w) => window.__battle.centerOn(w.a.x + 2, w.a.z), shot.w);
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/ai-block.png` });
console.log('errors', JSON.stringify(errs));
await browser.close();
