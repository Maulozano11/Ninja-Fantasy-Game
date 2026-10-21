// The clan tips as a new player sees them (tips on), in turn order.
import { open, helpers, out } from './lib.mjs';
const locale = process.argv[2] ?? 'en-US';
const L = locale.slice(0, 2);
const es = L === 'es';
const { browser, page, errs } = await open(locale, { tips: true, hash: process.argv[3] === 'shiori' ? '#creator' : '' });
const h = helpers(page);
if (process.argv[3] === 'shiori') {
  await page.getByText('Shiori, the Gentle Fist').click(); await page.waitForTimeout(300);
  await page.getByText('ENTER BATTLEFIELD').click(); await page.waitForTimeout(800);
}
await page.getByText(es ? 'Renegados en el claro' : 'Rogues in the clearing').click();
await h.idle();
const seen = [];
for (let i = 0; i < 400 && seen.length < 12; i++) {
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, clan: u?.character?.clan, team: u?.team, busy: window.__battle.busy(), round: s.round, pending: !!s.pending }; });
  if (st.busy) continue;
  if (st.pending) { await page.keyboard.press('n'); continue; }
  if (st.team !== 'party') continue;
  // a tip box has a "Got it" button
  const got = page.locator('button', { hasText: es ? 'Entendido' : 'Got it' });
  if (await got.count()) {
    const txt = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Got it|Entendido/.test(x.innerText)); return b?.parentElement?.parentElement?.innerText ?? ''; });
    seen.push({ cur: st.cur, clan: st.clan, txt: txt.replace(/\n/g, ' | ').slice(0, 400) });
    await page.screenshot({ path: `${out}/tip-${seen.length}-${st.clan}-${L}.png` });
    await got.first().click();
    await page.waitForTimeout(400);
    continue;
  }
  if (st.round > 2) break;
  await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), st.cur);
}
console.log(JSON.stringify(seen, null, 1));
console.log('errors', JSON.stringify(errs));
await browser.close();
