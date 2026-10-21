// The creator's chakra section in English, Water type with a red colour: node shot-en.mjs <out.png>
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.addInitScript(() => {
  localStorage.setItem('shinobi.lang', 'en');
  localStorage.setItem('shinobi.tips.off', '1');
});
await page.goto('http://127.0.0.1:5295/#creator');
await page.waitForTimeout(1500);
await page.getByText('Appearance', { exact: true }).first().click();
await page.waitForTimeout(400);
await page.locator('nav[aria-label="Sections"] button', { hasText: 'Chakra' }).click();
await page.waitForTimeout(500);
await page.getByText('Water', { exact: true }).first().click();
await page.waitForTimeout(300);
await page.locator('[title="Red"]').first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: out });
console.log('nature shown:', await page.evaluate(() => document.querySelector('[data-nature]')?.getAttribute('data-nature')));
await browser.close();
