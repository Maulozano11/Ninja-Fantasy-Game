import { chromium } from '../pw/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
for (const hash of ['#missions', '#creator', '']) {
  await p.goto('http://127.0.0.1:3017/' + hash);
  await p.waitForTimeout(1500);
  const wide = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 0.5 && r.width > 0) out.push(el.tagName + '.' + (el.className?.toString?.() || '').slice(0, 80) + ' right=' + r.right.toFixed(1));
    }
    return { sw: document.documentElement.scrollWidth, out: out.slice(0, 6) };
  });
  console.log(hash || '(combat)', JSON.stringify(wide, null, 1));
}
await b.close();
