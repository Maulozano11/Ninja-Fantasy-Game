const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.addInitScript(() => {
  localStorage.setItem('shinobi.lang', 'es');
  localStorage.setItem('shinobi.battleSpeed', '1');
  localStorage.setItem('shinobi.tips.off', '1');
});
await page.goto('http://127.0.0.1:5391/#combat');
await page.waitForTimeout(1500);
await page.screenshot({ path: out + '/practice.png' });
await page.getByText('Pelear').first().click();
await page.waitForFunction(() => typeof window.__battle === 'object', null, { timeout: 30000 });
await page.waitForFunction(() => !window.__battle.busy(), null, { timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: out + '/battle0.png' });
const info = await page.evaluate(() => {
  const s = window.__battle.state();
  return { keys: Object.keys(s), active: s.active, order: s.order, units: Object.values(s.units).map((u) => ({ id: u.id, name: u.name, team: u.team, kind: u.kind, pos: u.pos, hp: u.hp })) };
});
console.log(JSON.stringify(info));
await browser.close();
