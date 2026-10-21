// Opens Práctica, starts a battle, and screenshots the hotbar of whoever acts, for each party member
// with a clan ability (tries several reloads to see different first actors).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const out = process.argv[2];
const step = process.argv[3] ?? 'list';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: Number(process.env.DPR ?? 1), locale: 'es-MX' });
await page.goto('http://127.0.0.1:5288/', { waitUntil: 'networkidle' });
await page.evaluate(() => (localStorage.setItem('shinobi.battleSpeed', '1'), localStorage.setItem('shinobi.tips.off', '1')));
await page.reload({ waitUntil: 'networkidle' });
await page.getByText('Práctica').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/p0.png` });
const texts = await page.evaluate(() => [...document.querySelectorAll('button, a, h2, h3')].map((b) => b.innerText.trim().replace(/\n/g, ' | ')).filter(Boolean).slice(0, 80));
console.log(JSON.stringify(texts));
if (step !== 'list') {
  await page.getByText(step).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/p1.png` });
  const t2 = await page.evaluate(() => [...document.querySelectorAll('button, a, h2, h3')].map((b) => b.innerText.trim().replace(/\n/g, ' | ')).filter(Boolean).slice(0, 80));
  console.log(JSON.stringify(t2));
}
await browser.close();
