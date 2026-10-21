import { chromium } from '../pw/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('file://' + process.cwd() + '/descansos.html');
await p.waitForTimeout(800);
const r = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const rc = el.getBoundingClientRect();
    if (rc.right > 392 && !el.closest('.table-wrap') && !el.closest('pre')) out.push([el.tagName, el.className, Math.round(rc.right), (el.textContent || '').slice(0, 40)]);
  }
  return out.slice(0, 15);
});
console.log(JSON.stringify(r, null, 1));
await b.close();
