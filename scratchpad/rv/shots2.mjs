const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad';
const OUT = `${S}/rv/shots`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [lang, w, h, light, app] of [['es', 1366, 768, 'Rayo', 'Apariencia'], ['en', 1366, 768, 'Lightning', 'Appearance'], ['en', 1920, 1080, 'Lightning', 'Appearance']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.addInitScript((l) => { localStorage.clear(); localStorage.setItem('shinobi.lang', l); localStorage.setItem('shinobi.tips.off', '1'); }, lang);
  await page.goto('http://127.0.0.1:5823/#creator');
  await page.waitForSelector('nav[aria-label="Steps"]');
  await page.locator('nav[aria-label="Steps"] button', { hasText: app }).first().click();
  await page.waitForTimeout(500);
  await page.locator('nav[aria-label="Sections"] button', { hasText: 'Chakra' }).first().click();
  await page.waitForTimeout(500);
  await page.locator('[data-nature] button', { hasText: light }).first().click();
  await page.waitForTimeout(800);
  const note = page.locator('[data-nature] p').last();
  const box1 = await note.boundingBox();
  console.log(lang, w, 'note box before scroll', JSON.stringify(box1), 'viewport h', h);
  await note.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${lang}-${w}-tipos-rayo-scrolled.png` });
  await page.close();
}
await browser.close();
