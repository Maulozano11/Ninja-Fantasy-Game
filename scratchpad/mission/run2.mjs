// Lose the first battle on purpose (end turns until the fighter falls) to test the real battle-end wiring.
import { chromium } from '../pw/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.type() + ': ' + m.text()); });
await p.goto('http://127.0.0.1:3017/#missions');
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForTimeout(1500);
await p.getByRole('button', { name: /Set out with/ }).click();
await p.waitForTimeout(800);
await p.getByRole('button', { name: /^Fight$/ }).click();
await p.waitForTimeout(1500);
let done = false;
for (let i = 0; i < 120 && !done; i++) {
  const cont = p.getByRole('button', { name: /^Continue$|Continue the mission/ });
  if (await cont.count()) {
    await p.screenshot({ path: '04-battle-over.png' });
    await cont.first().click();
    done = true;
    break;
  }
  const end = p.getByRole('button', { name: /END TURN/i });
  if (await end.count() && await end.first().isEnabled()) await end.first().click().catch(() => {});
  // close a dice window if one is open
  const close = p.getByRole('button', { name: /Close|Continue Battle|Dismiss|OK/i });
  if (await close.count()) await close.first().click().catch(() => {});
  await p.waitForTimeout(1000);
}
await p.waitForTimeout(1200);
await p.screenshot({ path: '05-after-fall.png', fullPage: true });
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('shinobi5e.mission.v1') || 'null'));
console.log('done', done, 'phase', saved?.battle?.phase, 'fighter', saved?.battle?.fighterId, 'fallen', JSON.stringify(saved?.battle?.fallen));
console.log('hp', saved?.party.members.map((m) => m.name + ':' + m.currentHp).join(' '));
console.log(errors.join('\n') || 'no errors');
await b.close();
