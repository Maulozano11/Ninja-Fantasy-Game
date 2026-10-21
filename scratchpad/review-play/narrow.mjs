import { chromium } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pw/node_modules/playwright/index.mjs';
const out = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/review-play/shots';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const w of [1024, 820]) {
  const page = await browser.newPage({ viewport: { width: w, height: 720 }, locale: 'es-MX' });
  await page.goto('http://127.0.0.1:5310/', { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); for (const k of ['tip_move', 'tip_attack', 'tip_jutsu', 'tip_cover', 'tip_stealth', 'tip_hands', 'tip_hydra', 'tip_mirai', 'tip_koton', 'tip_ryusei', 'tip_northstar']) localStorage.setItem(`shinobi.${k}`, '1'); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Renegados en el claro').click();
  await page.waitForFunction(() => { const s = window.__battle?.state(); if (!s) return false; const u = s.units[s.order[s.turn]]; return !window.__battle.busy() && u?.team === 'party'; }, null, { timeout: 120000 });
  // go to Solen's turn
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, team: u?.team, busy: window.__battle.busy(), pending: !!s.pending }; });
    if (!st.busy && st.pending) await page.keyboard.press('n');
    else if (!st.busy && st.team === 'party') { if (st.cur === 'preset_founder') break; await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), st.cur); }
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1000);
  const bar = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => /Fin$|Fin\n/.test(x.innerText) || x.innerText.trim() === 'Fin'); const r = b[0]?.getBoundingClientRect(); return { endBtn: r ? { x: r.x, right: r.right } : null, vw: innerWidth, scrollW: document.documentElement.scrollWidth }; });
  console.log(w, JSON.stringify(bar));
  await page.screenshot({ path: `${out}/narrow-${w}.png` });
  await page.close();
}
await browser.close();
