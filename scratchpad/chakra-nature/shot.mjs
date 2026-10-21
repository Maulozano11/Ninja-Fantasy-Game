// Opens the creator, goes to Appearance > Chakra and takes a screenshot.
// node shot.mjs <out.png> [clicks...]   each click is a visible text to click, in order
// (prefix "title:" to click the element with that title attribute).
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const [out, ...clicks] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
await page.addInitScript(() => {
  localStorage.setItem('shinobi.lang', 'es');
  localStorage.setItem('shinobi.tips.off', '1');
});
await page.goto('http://127.0.0.1:5295/#creator');
await page.waitForTimeout(1500);
await page.getByText('Apariencia', { exact: true }).first().click();
await page.waitForTimeout(400);
await page.locator('nav[aria-label="Sections"] button', { hasText: 'Chakra' }).click();
await page.waitForTimeout(500);
for (const c of clicks) {
  if (c.startsWith('title:')) await page.locator(`[title="${c.slice(6)}"]`).first().click();
  else if (c.startsWith('color:')) {
    await page.locator('input[type="color"]').first().evaluate((el, v) => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, c.slice(6));
  } else await page.getByText(c, { exact: true }).first().click();
  await page.waitForTimeout(400);
}
await page.waitForTimeout(900);
await page.screenshot({ path: out });
const info = await page.evaluate(() => document.querySelector('[data-nature]')?.getAttribute('data-nature') ?? null);
console.log('nature shown:', info);
await browser.close();
