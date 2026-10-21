// The creator in the fix worktree's dev server, driven by steps, then a screenshot.
// node shot.mjs <out.png> <lang> <WxH> [steps...]
//   hero=<file.json>   put this sheet in shinobi5e.hero.v1 before loading (the creator opens it)
//   chakra             go to Appearance > Chakra
//   step:<label>       click a creator step tab (e.g. step:Clan)
//   title:<t>          click the element with that title attribute
//   color:<#hex>       set the custom colour input
//   <text>             click the first element with exactly that text
// Prints the nature in the chakra section (data-nature) and on the sheet panel after each step.
import { readFileSync } from 'node:fs';
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const [out, lang, size, ...steps] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const port = process.env.PORT ?? '5297';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
const hero = steps.find((s) => s.startsWith('hero='));
await page.addInitScript(
  ([l, heroJson]) => {
    localStorage.setItem('shinobi.lang', l);
    localStorage.setItem('shinobi.tips.off', '1');
    if (heroJson && !sessionStorage.getItem('heroSet')) {
      localStorage.setItem('shinobi5e.hero.v1', heroJson);
      sessionStorage.setItem('heroSet', '1');
    }
  },
  [lang, hero ? readFileSync(hero.slice(5), 'utf8') : ''],
);
await page.goto(`http://127.0.0.1:${port}/#creator`);
await page.waitForTimeout(1500);
const appearance = lang === 'es' ? 'Apariencia' : 'Appearance';
const sheetNature = () =>
  page.evaluate((label) => {
    const el = [...document.querySelectorAll('span')].find((s) => s.textContent === label);
    return el?.nextElementSibling?.textContent ?? null;
  }, lang === 'es' ? 'Naturaleza' : 'Nature');
const report = async (what) =>
  console.log(what.padEnd(22), 'section:', await page.evaluate(() => document.querySelector('[data-nature]')?.getAttribute('data-nature') ?? '-'), ' sheet:', await sheetNature());
await report('start');
for (const s of steps) {
  if (s.startsWith('hero=')) continue;
  if (s === 'chakra') {
    await page.getByText(appearance, { exact: true }).first().click();
    await page.waitForTimeout(400);
    await page.locator('nav[aria-label="Sections"] button', { hasText: 'Chakra' }).click();
  } else if (s.startsWith('step:')) await page.getByText(s.slice(5), { exact: true }).first().click();
  else if (s.startsWith('title:')) await page.locator(`[title="${s.slice(6)}"]`).first().click();
  else if (s.startsWith('color:'))
    await page.locator('input[type="color"]').first().evaluate((el, v) => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, s.slice(6));
  else await page.getByText(s, { exact: true }).first().click();
  await page.waitForTimeout(450);
  await report(s);
}
await page.waitForTimeout(900);
await page.screenshot({ path: out });
// Where the pose bar and the left panel are, to check that the bar never covers the panel.
const boxes = await page.evaluate(() => {
  const bar = [...document.querySelectorAll('button')].find((b) => /^(Reposo|Idle)$/.test(b.textContent ?? ''))?.parentElement;
  const panel = document.querySelector('nav[aria-label="Sections"]')?.closest('.absolute');
  const r = (e) => (e ? (({ left, top, right, bottom }) => ({ left: Math.round(left), top: Math.round(top), right: Math.round(right), bottom: Math.round(bottom) }))(e.getBoundingClientRect()) : null);
  return { bar: r(bar), panel: r(panel) };
});
console.log('pose bar', JSON.stringify(boxes.bar), 'left panel', JSON.stringify(boxes.panel));
await browser.close();
