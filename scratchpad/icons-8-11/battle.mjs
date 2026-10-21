// Starts "Renegados en el claro" and, for each party ninja's turn, screenshots the window and the
// hotbar (the bottom strip), listing the skill slots, then ends the turn. DPR=2 for a dense screen.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const out = process.argv[2];
const turns = Number(process.argv[3] ?? 4);
const dpr = Number(process.env.DPR ?? 1);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: dpr, locale: 'es-MX' });
await page.goto('http://127.0.0.1:5288/', { waitUntil: 'networkidle' });
await page.evaluate(() => (localStorage.setItem('shinobi.battleSpeed', '1'), localStorage.setItem('shinobi.tips.off', '1')));
await page.reload({ waitUntil: 'networkidle' });
await page.getByText('Práctica').first().click();
await page.getByText('Batallas de práctica').first().click();
await page.waitForTimeout(800);
const card = page.locator('button, a, div').filter({ hasText: 'Renegados en el claro' }).filter({ hasText: 'Pelear' }).last();
await card.getByText('Pelear').first().click();
const seen = new Set();
for (let t = 0; t < turns * 4 && seen.size < turns; t++) {
  // Wait for a party turn (the attack slot becomes pressable).
  try {
    await page.locator('button[aria-label="Atacar"]:not([aria-disabled="true"])').first().waitFor({ timeout: 90000 });
  } catch {
    console.log('no party turn');
    break;
  }
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const slots = [...document.querySelectorAll('button[aria-label]')].filter((b) => b.querySelector('img'));
    return {
      who: document.body.innerText.match(/(Mirai|Northstar|Ryusei|K[oō]ton)[^\n]*/)?.[0] ?? '',
      slots: slots.map((b) => `${b.getAttribute('aria-label')} -> ${b.querySelector('img').getAttribute('src').split('/').pop()}`),
    };
  });
  const key = info.slots.filter((s) => !/^(Atacar|Arrojar|Correr|Esquivar|Ocultarse|Guardar|Desenvainar|Más|Terminar)/.test(s)).join("|");
  console.log(`turn ${t}: ${key}`);

  if (!seen.has(key)) {
    seen.add(key);
    const n = seen.size;
    await page.screenshot({ path: `${out}/battle-${dpr}x-${n}.png` });
    await page.screenshot({ path: `${out}/hotbar-${dpr}x-${n}.png`, clip: { x: 300, y: 740, width: 1000, height: 160 } });
  }
  await page.getByRole('button', { name: /Terminar turno/ }).first().click();
  await page.waitForTimeout(800);
}
await browser.close();
