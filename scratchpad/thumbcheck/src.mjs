import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, locale: 'es-MX' });
await page.goto('http://127.0.0.1:5287/', { waitUntil: 'networkidle' });
await page.getByText('Nueva partida').first().click();
await page.waitForTimeout(1500);
await page.getByText('Aiden, el Caballero Carmesí').first().click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: /apariencia/i }).first().click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: /^arma$/i }).first().click();
await page.waitForTimeout(800);
await page.getByText('Acero', { exact: true }).first().scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const res = await page.evaluate(() => {
  const c = [...document.querySelectorAll('canvas')].find(c => c.width === 67);
  const d = c.getContext('2d').getImageData(0, 0, 67, 25).data;
  const out = [];
  for (const y of [11, 12]) {
    const runs = []; let prev = null, n = 0;
    for (let x = 0; x < 67; x++) { const k = `${d[(y*67+x)*4]},${d[(y*67+x)*4+1]},${d[(y*67+x)*4+2]},${d[(y*67+x)*4+3]}`; if (k === prev) n++; else { if (prev) runs.push([n, prev]); prev = k; n = 1; } }
    runs.push([n, prev]); out.push({ y, runs: runs.slice(0, 16) });
  }
  return out;
});
console.log(JSON.stringify(res));
await browser.close();
