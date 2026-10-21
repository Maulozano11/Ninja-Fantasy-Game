// Recipe test: open the dev server at a hash screen, switch to Spanish, screenshot, report errors.
// node check-dev.mjs <url> <out.png>
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(e.message));
await page.addInitScript(() => {
  localStorage.setItem('shinobi.lang', 'es');
  localStorage.setItem('shinobi.battleSpeed', '1');
  localStorage.setItem('shinobi.tips.off', '1');
});
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
if (url.endsWith('#combat')) {
  await page.getByText('Pelear').first().click();
  await page.waitForFunction(() => typeof window.__battle === 'object', null, { timeout: 30000 });
}
await page.waitForTimeout(3000);
await page.screenshot({ path: out });
console.log(JSON.stringify({ problems, hasBattle: await page.evaluate(() => typeof window.__battle) }));
await browser.close();
