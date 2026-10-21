import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const camp = readFileSync('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/i18n/camp.json', 'utf8');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
await ctx.addInitScript((run) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('shinobi5e.mission.v1', run); localStorage.setItem('shinobi.lang', 'es'); sessionStorage.setItem('seeded', '1'); } }, camp);
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5231/#missions'); await p.waitForTimeout(1500);
const out = await p.evaluate(() => {
  const res = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > 401 && r.width > 0) {
      // only report if no ancestor is also overflowing with overflow hidden
      let a = el.parentElement, clipped = false;
      while (a) { const cs = getComputedStyle(a); if (cs.overflowX !== 'visible' && a.getBoundingClientRect().right <= 401) { clipped = true; break; } a = a.parentElement; }
      if (!clipped) res.push(`${el.tagName}.${(el.className?.baseVal ?? el.className ?? '').toString().slice(0, 80)} right=${Math.round(r.right)} text=${(el.textContent||'').slice(0,30)}`);
    }
  }
  return res.slice(0, 15);
});
console.log(out.join('\n'));
await browser.close();
