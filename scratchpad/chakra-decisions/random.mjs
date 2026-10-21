// Clicks "Ninja al azar" a number of times and prints each random ninja's nature and jutsu rows.
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  localStorage.clear();
  localStorage.setItem('shinobi.lang', 'es');
  localStorage.setItem('shinobi.tips.off', '1');
});
await page.goto(`http://127.0.0.1:${process.argv[2]}/#creator`);
await page.waitForSelector('nav[aria-label="Steps"]');
await page.locator('nav[aria-label="Steps"] button', { hasText: 'Jutsus' }).click();
for (let i = 0; i < 25; i++) {
  await page.getByText('Ninja al azar').click();
  await page.waitForTimeout(150);
  const rule = await page.locator('p', { hasText: 'Naturaleza:' }).first().innerText();
  const rows = await page.locator('button', { hasText: /Elemento I ·|Elemento II ·|Rango S ·|Secreto del clan ·/ }).allInnerTexts();
  console.log(rule.split('.')[0], '|', rows.map((r) => r.replace(/\s+/g, ' ').replace(/[▸▾]/g, '').trim()).join(' | '));
}
console.log('errors:', errors);
await browser.close();
