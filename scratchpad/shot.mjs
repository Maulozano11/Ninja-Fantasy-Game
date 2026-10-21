const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const out = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.addInitScript(() => {
  localStorage.setItem('shinobi.lang', 'es');
  localStorage.setItem('shinobi.battleSpeed', '1');
  localStorage.setItem('shinobi.tips.off', '1');
});
await page.goto('http://127.0.0.1:5611/#combat');
await page.getByText('Pelear').first().click();
await page.waitForFunction(() => typeof window.__battle === 'object');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/b0.png` });
// Hand every party unit to the AI so the battle plays itself.
await page.evaluate(() => {
  const b = window.__battle;
  for (const u of Object.values(b.state().units)) if (u.team === 'party') b.act({ type: 'setController', unit: u.id, controller: 'ai' });
});
const t0 = Date.now();
let i = 0;
while (Date.now() - t0 < 40000) {
  await page.waitForTimeout(350);
  const info = await page.evaluate(() => {
    const b = window.__battle; const s = b.state();
    return { phase: s.phase, round: s.round, rolls: s.rolls };
  });
  await page.screenshot({ path: `${out}/s${String(i).padStart(3, '0')}.png` });
  i++;
  if (info.phase === 'ended') break;
}
console.log('frames', i);
await browser.close();
