import { open, helpers } from './lib.mjs';
const { browser, page } = await open('es-MX');
const h = helpers(page);
await page.getByText('Renegados en el claro').click();
await h.idle(); await h.playerTurn(); await page.waitForTimeout(1000);
const r = await page.evaluate(() => {
  const out = [];
  for (const [x, y] of [[330, 260], [300, 260], [350, 260], [360, 300], [330, 500], [300, 600], [200, 520]]) {
    const el = document.elementFromPoint(x, y);
    const rect = el?.getBoundingClientRect();
    out.push({ x, y, tag: el?.tagName, cls: (el?.className ?? '').toString().slice(0, 90), rect: rect ? [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)] : null });
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
