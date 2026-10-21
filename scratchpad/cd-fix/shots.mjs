// Screenshots of the creator after the review fixes on chakra/decisions: node shots.mjs <port>
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions';
const port = process.argv[2];
const URL = `http://127.0.0.1:${port}/#creator`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
const { readFileSync } = await import('node:fs');
const json = (f) => JSON.parse(readFileSync(`${OUT}/${f}`, 'utf8'));

/** A page with the given hero saved; the storage is set once per page, so a reload keeps what the page saved. */
async function open(hero, width = 1600, height = 900) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript((h) => {
    if (sessionStorage.getItem('init')) return;
    sessionStorage.setItem('init', '1');
    localStorage.clear();
    localStorage.setItem('shinobi.lang', 'es');
    localStorage.setItem('shinobi.tips.off', '1');
    if (h) localStorage.setItem('shinobi5e.hero.v1', h);
  }, hero ? JSON.stringify(hero) : '');
  await page.goto(URL);
  await page.waitForSelector('nav[aria-label="Steps"]');
  return page;
}
const step = (page, name) => page.locator('nav[aria-label="Steps"] button', { hasText: name }).first().click();
const section = (page, name) => page.locator('nav[aria-label="Sections"] button', { hasText: name }).first().click();
const pause = (page, ms = 700) => page.waitForTimeout(ms);
/** Opens a jutsu slot's list (a click toggles it, and the creator remembers the open slot). */
async function openSlot(page, label) {
  const row = page.locator('button', { hasText: label }).first();
  if ((await row.innerText()).includes('▸')) await row.click();
}
const notes = (page) => page.locator('p', { hasText: 'Ahora ' }).allInnerTexts();

// 1. Solen (Fire): the Jutsu step, Appearance > Chakra before and after picking Lightning, the Jutsu step after.
{
  const page = await open(null);
  await step(page, 'Jutsus');
  await pause(page);
  await openSlot(page, 'Elemento I ·');
  await pause(page);
  await page.screenshot({ path: `${OUT}/jutsus-fuego.png` });
  await step(page, 'Apariencia');
  await pause(page);
  await section(page, 'Chakra');
  await pause(page);
  await page.screenshot({ path: `${OUT}/tipos-antes.png` });
  await page.locator('[data-nature] button', { hasText: 'Rayo' }).click();
  await pause(page, 1200);
  await page.screenshot({ path: `${OUT}/tipos.png` });
  await step(page, 'Jutsus');
  await pause(page);
  await openSlot(page, 'Elemento I ·');
  await pause(page);
  await page.screenshot({ path: `${OUT}/jutsus-rayo.png` });
  console.log('1600 swap note:', await notes(page));
  // 2. The player picks Element I again: that swap drops out of the note.
  await page.locator('button', { hasText: 'Chidori' }).first().click();
  await pause(page);
  await page.screenshot({ path: `${OUT}/nota-actualizada.png` });
  console.log('after picking Element I again:', await notes(page));
  await page.close();
}

// 3. A short screen (1366x768): the swap note right after the click, and a legend's off-nature mark.
{
  const page = await open(null, 1366, 768);
  await step(page, 'Apariencia');
  await pause(page);
  await section(page, 'Chakra');
  await pause(page);
  await page.locator('[data-nature] button', { hasText: 'Rayo' }).click();
  await pause(page, 1200);
  await page.screenshot({ path: `${OUT}/tipos-1366.png` });
  const box = await page.locator('p', { hasText: 'Ahora Rayo' }).boundingBox();
  console.log('1366 note box:', box);
  await page.close();
}
{
  const page = await open(json('kaien-old.json'), 1366, 768);
  await step(page, 'Jutsus');
  await pause(page);
  await page.screenshot({ path: `${OUT}/jutsus-1366-kaien.png` });
  console.log('1366 Kaien off-nature mark:', await page.locator('span', { hasText: 'no es de tu naturaleza' }).allInnerTexts());
  await page.close();
}

// 4. A Kaien saved before the change (the ghost warrior, violet, no colour of his own): now Lightning in his violet.
{
  const page = await open(json('kaien-old.json'));
  await step(page, 'Apariencia');
  await pause(page);
  await section(page, 'Chakra');
  await pause(page, 1200);
  await page.screenshot({ path: `${OUT}/leyenda-guardada.png` });
  console.log('old Kaien nature:', await page.locator('[data-nature]').getAttribute('data-nature'));
  await step(page, 'Jutsus');
  await pause(page);
  await openSlot(page, 'Elemento II ·');
  await pause(page);
  await page.screenshot({ path: `${OUT}/leyenda-jutsus.png` });
  await page.close();
}

// 5. An own ninja that already has Spirit (pending): its tile marked, the others not offered.
{
  const page = await open(json('spirit-own.json'));
  await step(page, 'Apariencia');
  await pause(page);
  await section(page, 'Chakra');
  await pause(page, 1200);
  await page.screenshot({ path: `${OUT}/tipo-pendiente.png` });
  console.log('own Spirit nature:', await page.locator('[data-nature]').getAttribute('data-nature'));
  await page.close();
}

// 6. The review's case: Ren turned to Water and saved stays Water, with his Water jutsu, after a reload.
{
  const page = await open(null);
  await page.locator('button').filter({ hasText: /Pr[ií]ncipe de la [Nn]oche/ }).first().click();
  await pause(page, 400);
  await step(page, 'Apariencia');
  await pause(page, 400);
  await section(page, 'Chakra');
  await pause(page, 400);
  await page.locator('[data-nature] button', { hasText: 'Agua' }).click();
  await pause(page, 600);
  await step(page, 'Jutsus');
  await pause(page, 400);
  await page.locator('button', { hasText: 'Aceptar' }).last().click();
  await pause(page, 800);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('shinobi5e.hero.v1')));
  console.log('Ren saved:', saved?.id, JSON.stringify(saved?.appearance?.chakra), JSON.stringify(saved?.selectedJutsus));
  for (let i = 0; i < 2; i++) {
    await page.goto(URL);
    await page.reload();
    await page.waitForSelector('nav[aria-label="Steps"]');
    await step(page, 'Apariencia');
    await pause(page, 400);
    await section(page, 'Chakra');
    await pause(page, 900);
    console.log(`Ren after reload ${i + 1}:`, await page.locator('[data-nature]').getAttribute('data-nature'));
  }
  await page.screenshot({ path: `${OUT}/ren-agua-recargado.png` });
  await step(page, 'Jutsus');
  await pause(page, 600);
  await page.screenshot({ path: `${OUT}/ren-agua-recargado-jutsus.png` });
  console.log('Ren off-nature marks:', await page.locator('span', { hasText: 'no es de tu naturaleza' }).count());
  await page.close();
}

console.log('errors:', errors);
await browser.close();
