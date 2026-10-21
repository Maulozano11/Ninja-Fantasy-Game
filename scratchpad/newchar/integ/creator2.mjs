// Opens the creator, picks Valen in the legends list, screenshots it; then the jutsu step.
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const out = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/newchar';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('ERR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await page.addInitScript(() => {
  localStorage.setItem('shinobi.lang', 'es');
  localStorage.setItem('shinobi.tips.off', '1');
});
await page.goto('http://127.0.0.1:5291/#creator');
await page.waitForTimeout(3000);
await page.getByText('Valen, el Duque Escarlata').first().click();
await page.waitForTimeout(1500);
await page.mouse.move(5, 5);
await page.waitForTimeout(800);
await page.getByText("Cargar", { exact: true }).first().click(); await page.waitForTimeout(1200); await page.screenshot({ path: `${out}/integ/creador-carga.png` }); await page.getByText("APARIENCIA").first().click().catch(async () => { await page.getByText("Apariencia").first().click(); }); await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/integ/creador-apariencia.png` });
console.log(errors.join('\n') || 'no errors');
await browser.close();
