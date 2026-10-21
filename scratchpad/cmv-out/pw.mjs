const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.addInitScript(() => {
  localStorage.setItem('shinobi.lang', 'es');
  localStorage.setItem('shinobi.battleSpeed', '1');
  localStorage.setItem('shinobi.tips.off', '1');
});
await page.goto('http://127.0.0.1:5471/#combat');
await page.getByText('Pelear').first().click();
await page.waitForFunction(() => typeof window.__battle === 'object', null, { timeout: 30000 });
console.log(await page.evaluate(() => Object.keys(window.__battle).join(',')));
await page.screenshot({ path: '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/cmv-out/battle.png' });
await browser.close();
