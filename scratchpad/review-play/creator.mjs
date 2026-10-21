import { chromium } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pw/node_modules/playwright/index.mjs';
const out = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/review-play/shots';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'es-MX' });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://127.0.0.1:5310/#creator', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const heading = page.getByText('Noble Clan Heritage');
await heading.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const box = await heading.boundingBox();
await page.screenshot({ path: `${out}/creator-clans.png`, fullPage: false });
const texts = await page.evaluate(() => {
  const lab = [...document.querySelectorAll('label')].find((l) => l.textContent.includes('Noble Clan'));
  const grid = lab.nextElementSibling;
  return [...grid.children].map((c) => c.innerText);
});
console.log(JSON.stringify(texts, null, 1));
// Pick each clan and read the header and lineage section
for (const name of ['Mirai', 'Kōton', 'Ryusei', 'Northstar']) {
  await page.locator('label:has-text("Noble Clan Heritage") + div > div').filter({ hasText: name }).first().click();
  await page.waitForTimeout(300);
  const hdr = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /Clan ·|Lineage Arts/.test(e.textContent)).map((e) => e.textContent));
  console.log(name, JSON.stringify(hdr));
}
await page.screenshot({ path: `${out}/creator-northstar.png`, fullPage: true });
console.log('errors', JSON.stringify(errs));
await browser.close();
