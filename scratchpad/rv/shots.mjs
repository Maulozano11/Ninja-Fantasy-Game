const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad';
const OUT = `${S}/rv/shots`;
const fs = await import('node:fs');
fs.mkdirSync(OUT, { recursive: true });
const port = 5823;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
const kaien = fs.readFileSync(`${S}/chakra-decisions/kaien-old.json`, 'utf8');
const spirit = fs.readFileSync(`${S}/chakra-decisions/spirit-own.json`, 'utf8');
const W = { 'es': { app: 'Apariencia', jut: 'Jutsus', el1: 'Elemento I ·', el2: 'Elemento II ·', light: 'Rayo', s: 'Rango S ·' }, 'en': { app: 'Appearance', jut: 'Jutsu', el1: 'Element I ·', el2: 'Element II ·', light: 'Lightning', s: 'S-rank ·' } };
async function open(lang, w, h, hero) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(`${lang}${w} ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${lang}${w} ${m.text()}`));
  await page.addInitScript(([l, hh]) => {
    if (!sessionStorage.getItem('init')) {
      localStorage.clear();
      localStorage.setItem('shinobi.lang', l);
      localStorage.setItem('shinobi.tips.off', '1');
      if (hh) localStorage.setItem('shinobi5e.hero.v1', hh);
      sessionStorage.setItem('init', '1');
    }
  }, [lang, hero ?? '']);
  await page.goto(`http://127.0.0.1:${port}/#creator`);
  await page.waitForSelector('nav[aria-label="Steps"]');
  return page;
}
const step = (page, name) => page.locator('nav[aria-label="Steps"] button', { hasText: name }).first().click();
const section = (page, name) => page.locator('nav[aria-label="Sections"] button', { hasText: name }).first().click();
const pause = (page, ms = 600) => page.waitForTimeout(ms);
async function openSlot(page, label) {
  const row = page.locator('button', { hasText: label }).first();
  if ((await row.innerText()).includes('▸')) await row.click();
}
for (const [w, h] of [[1366, 768], [1600, 900], [1920, 1080]]) {
  for (const lang of ['es', 'en']) {
    const t = W[lang];
    const tag = `${lang}-${w}`;
    {
      const page = await open(lang, w, h);
      await step(page, t.app); await pause(page);
      await section(page, 'Chakra'); await pause(page);
      await page.screenshot({ path: `${OUT}/${tag}-tipos-antes.png` });
      await page.locator('[data-nature] button', { hasText: t.light }).first().click();
      await pause(page, 900);
      await page.screenshot({ path: `${OUT}/${tag}-tipos-rayo.png` });
      // scroll the left panel to the note
      await page.locator('[data-nature]').scrollIntoViewIfNeeded();
      await step(page, t.jut); await pause(page);
      await openSlot(page, t.el1); await pause(page);
      await page.screenshot({ path: `${OUT}/${tag}-jutsus-rayo.png` });
      console.log(tag, 'texts:', await page.locator('p', { hasText: /Naturaleza:|Nature:/ }).allInnerTexts());
      await page.close();
    }
    {
      const page = await open(lang, w, h, spirit);
      await step(page, t.app); await pause(page);
      await section(page, 'Chakra'); await pause(page, 900);
      await page.screenshot({ path: `${OUT}/${tag}-pendiente.png` });
      await step(page, t.jut); await pause(page);
      await openSlot(page, t.el1); await pause(page);
      await page.screenshot({ path: `${OUT}/${tag}-pendiente-jutsus.png` });
      await page.close();
    }
    {
      const page = await open(lang, w, h, kaien);
      await step(page, t.jut); await pause(page);
      await openSlot(page, t.el2); await pause(page);
      await page.screenshot({ path: `${OUT}/${tag}-kaien-jutsus.png` });
      console.log(tag, 'kaien nature', await page.locator('p', { hasText: /Naturaleza:|Nature:/ }).first().innerText());
      await page.close();
    }
  }
}
console.log('errors:', errors);
await browser.close();
