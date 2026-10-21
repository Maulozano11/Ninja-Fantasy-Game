const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-nature/review';
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.addInitScript(() => { localStorage.setItem('shinobi.lang', 'es'); localStorage.setItem('shinobi.tips.off', '1'); });
await page.goto('http://127.0.0.1:5296/#creator');
await page.waitForTimeout(1500);
await page.getByText('Apariencia').first().click();
await page.waitForTimeout(400);
await page.getByText('Chakra', { exact: true }).first().click();
await page.waitForTimeout(800);
const sec = page.locator('[data-nature]').first();
const state = async (tag) => {
  const n = await sec.getAttribute('data-nature');
  const side = await page.getByText('Naturaleza', { exact: true }).last().locator('..').innerText();
  console.log(tag, 'data-nature=', n, '| side panel=', JSON.stringify(side));
};
const tile = (name) => sec.locator('button', { hasText: name }).first();
const swatch = (title) => page.locator(`button[title="${title}"]`).first();
await state('start');
await tile('Agua').click(); await page.waitForTimeout(400); await state('click Agua');
await swatch('Verde').click(); await page.waitForTimeout(400); await state('swatch Verde');
await tile('Fuego').click(); await page.waitForTimeout(600); await state('click Fuego');
await page.screenshot({ path: `${OUT}/ui-fuego-verde.png` });
await swatch('Negro').click(); await page.waitForTimeout(300);
await tile('Rayo').click(); await page.waitForTimeout(600); await state('negro + Rayo');
await page.screenshot({ path: `${OUT}/ui-rayo-negro.png` });
// burst choice inside Fire
await tile('Fuego').click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Nova de brasas' }).click(); await page.waitForTimeout(300); await state('Fuego / Nova');
await tile('Agua').click(); await page.waitForTimeout(300); await tile('Fuego').click(); await page.waitForTimeout(300);
console.log('after Agua->Fuego burst panel:', JSON.stringify(await page.locator('text=Fuego ·').first().innerText()));
// custom hex colour
await page.locator('input[type=color]').evaluate((el) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, '#ff00ff'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
await page.waitForTimeout(500); await state('custom #ff00ff');
await tile('Tierra').click(); await page.waitForTimeout(600); await state('Tierra (custom)');
await page.screenshot({ path: `${OUT}/ui-tierra-magenta.png` });
// Natural
await page.getByRole('button', { name: 'Natural' }).click(); await page.waitForTimeout(500); await state('Natural');
// tooltips
const titles = await page.locator('button[title]').evaluateAll((els) => els.map((e) => e.getAttribute('title')).filter(Boolean));
console.log('titles', titles.join(' | '));
// random ninja several times
for (let i = 0; i < 6; i++) {
  await page.getByText('Ninja al azar').click(); await page.waitForTimeout(500);
  await state('random ' + i);
}
await page.screenshot({ path: `${OUT}/ui-random.png` });
await browser.close();
