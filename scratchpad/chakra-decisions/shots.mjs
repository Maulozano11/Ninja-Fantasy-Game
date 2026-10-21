// Screenshots of the creator for the chakra decisions: node shots.mjs <port>
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions';
const port = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

async function open(hero) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript((h) => {
    localStorage.clear();
    localStorage.setItem('shinobi.lang', 'es');
    localStorage.setItem('shinobi.tips.off', '1');
    if (h) localStorage.setItem('shinobi5e.hero.v1', h);
  }, hero ? JSON.stringify(hero) : '');
  await page.goto(`http://127.0.0.1:${port}/#creator`);
  await page.waitForSelector('nav[aria-label="Steps"]');
  return page;
}
const step = (page, name) => page.locator('nav[aria-label="Steps"] button', { hasText: name }).click();
const section = (page, name) => page.locator('nav[aria-label="Sections"] button', { hasText: name }).click();
const pause = (page, ms = 700) => page.waitForTimeout(ms);
/** Opens a jutsu slot's list (a click toggles it, and the creator remembers the open slot). */
async function openSlot(page, label) {
  const row = page.locator('button', { hasText: label }).first();
  if ((await row.innerText()).includes('▸')) await row.click();
}

// 1. A Fire ninja (Solen, the starting sheet): the Jutsu step with Element I open.
{
  const page = await open(null);
  await step(page, 'Jutsus');
  await pause(page);
  await openSlot(page, 'Elemento I ·');
  await pause(page);
  await page.screenshot({ path: `${OUT}/jutsus-fuego.png` });

  // 2. Appearance > Chakra, then pick Lightning: the types without Shadow/Spirit, the Light/Void hint, the swap note.
  await step(page, 'Apariencia');
  await pause(page);
  await section(page, 'Chakra');
  await pause(page);
  await page.screenshot({ path: `${OUT}/tipos-antes.png` });
  await page.locator('[data-nature] button', { hasText: 'Rayo' }).click();
  await pause(page, 1200);
  await page.screenshot({ path: `${OUT}/tipos.png` });

  // 3. The Jutsu step again, now Lightning.
  await step(page, 'Jutsus');
  await pause(page);
  await openSlot(page, 'Elemento I ·');
  await pause(page);
  await page.screenshot({ path: `${OUT}/jutsus-rayo.png` });
  console.log('fire/lightning texts:', await page.locator('p', { hasText: 'Naturaleza:' }).allInnerTexts());
  await page.close();
}

// 4. A Kaien saved before the change (the ghost warrior, violet, no colour of his own).
{
  const mod = await import('./kaien-old.json', { with: { type: 'json' } });
  const page = await open(mod.default);
  await step(page, 'Apariencia');
  await pause(page);
  await section(page, 'Chakra');
  await pause(page, 1200);
  await page.screenshot({ path: `${OUT}/leyenda-guardada.png` });
  console.log('kaien nature:', await page.locator('[data-nature]').getAttribute('data-nature'));
  await step(page, 'Jutsus');
  await pause(page);
  await openSlot(page, 'Elemento II ·');
  await pause(page);
  await page.screenshot({ path: `${OUT}/leyenda-jutsus.png` });
  await page.close();
}

// 5. An own ninja that already has Spirit (pending): its tile marked, the others not offered.
{
  const mod = await import('./spirit-own.json', { with: { type: 'json' } });
  const page = await open(mod.default);
  await step(page, 'Apariencia');
  await pause(page);
  await section(page, 'Chakra');
  await pause(page, 1200);
  await page.screenshot({ path: `${OUT}/tipo-pendiente.png` });
  console.log('spirit nature:', await page.locator('[data-nature]').getAttribute('data-nature'));
  await page.close();
}

console.log('errors:', errors);
await browser.close();
