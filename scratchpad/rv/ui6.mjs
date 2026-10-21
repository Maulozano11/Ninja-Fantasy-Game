import fs from 'node:fs';
const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-nature/review';
const hero = fs.readFileSync('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/rv/legacy.json', 'utf8').trim();
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.addInitScript((hero) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('shinobi5e.hero.v1', hero); sessionStorage.setItem('x', '1'); } localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); }, hero);
await page.goto('http://127.0.0.1:5296/#creator');
await page.waitForTimeout(1500);
const step = (n) => page.locator('text=' + n).first().click();
const nat = async (tag) => { await step('Apariencia'); await page.waitForTimeout(300); await page.getByText('Chakra', { exact: true }).first().click(); await page.waitForTimeout(500); console.log(tag, await page.locator('[data-nature]').first().getAttribute('data-nature')); };
await nat('loaded (Northstar, aura #06b6d4)');
await page.screenshot({ path: `${OUT}/legacy-antes-clan.png` });
for (const clan of ['Mirai', 'Ryusei']) {
  await step('Clan'); await page.waitForTimeout(300);
  await page.getByText(clan, { exact: true }).first().click(); await page.waitForTimeout(300);
  await nat('after clan ' + clan);
}
await page.screenshot({ path: `${OUT}/legacy-despues-clan.png` });
await browser.close();
