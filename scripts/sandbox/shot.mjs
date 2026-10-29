const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const [url, out, w, h, ...acts] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await page.addInitScript(() => { localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); });
await page.goto(url);
await page.waitForTimeout(2500);
for (const a of acts) { if (a.startsWith('click:')) { await page.getByText(a.slice(6), { exact: false }).first().click({ timeout: 8000 }); await page.waitForTimeout(900); } }
await page.screenshot({ path: out });
await browser.close();
