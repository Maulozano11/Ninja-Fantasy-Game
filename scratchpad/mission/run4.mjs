// Short stop, a forced night raid, the end screens and the phone layout, from injected saves.
import { chromium } from '../pw/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const errors = [];
const K = 'shinobi5e.mission.v1';
async function page(w = 1440, h = 1000) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await p.goto('http://127.0.0.1:3017/#missions');
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1000);
  await p.getByRole('button', { name: /Set out with/ }).click();
  await p.waitForTimeout(600);
  return p;
}
async function inject(p, f) {
  await p.evaluate(([k, src]) => {
    const r = JSON.parse(localStorage.getItem(k));
    const fn = new Function('r', src);
    fn(r);
    r.entry = r.party;
    localStorage.setItem(k, JSON.stringify(r));
  }, [K, f]);
  await p.reload();
  await p.waitForTimeout(900);
  await p.waitForTimeout(300);
  await p.waitForTimeout(900);
}

// A. zone end and the short stop
let p = await page();
await inject(p, `r.battle = null; r.nodeDone = true; r.zoneEnd = true;
  const m = r.party.members; m[0].currentHp = 20; m[0].currentChakra = 10; m[0].effects = [{ id: 'bleeding' }];
  m[1].currentHp = 12; m[1].currentChakra = 25; m[2].currentHp = 15; m[2].currentChakra = 4;`);
await p.screenshot({ path: '20-zone-end.png', fullPage: true });
await p.getByRole('button', { name: /Take a short stop/ }).click();
await p.waitForTimeout(500);
await p.getByRole('button', { name: /Hit Die/ }).first().click();
await p.waitForTimeout(300);
await p.getByRole('button', { name: /^Bandage/ }).nth(1).click(); // Hana bandages the most hurt
await p.waitForTimeout(500);
await p.screenshot({ path: '21-short-stop.png', fullPage: true });
await p.getByRole('button', { name: /Back on the road/ }).click();
await p.waitForTimeout(700);
await p.screenshot({ path: '22-next-zone.png', fullPage: true });
const s1 = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), K);
console.log('A zone', s1.pos, 'stops', s1.party.progress.stopsTaken, 'hours', s1.party.progress.hoursSpent, 'battle', s1.battle?.id);

// B. a forced night raid (no-randomness counter at 95)
p = await page();
await inject(p, `r.pos = { zone: 1, node: 1 }; r.battle = null; r.nodeDone = false; r.party.progress.zone = 1;
  r.party.progress.noRandomness = true; r.party.progress.ambushCounter = 95; r.party.progress.hoursSinceCamp = 4;`);
await p.getByRole('button', { name: /Make camp/ }).click();
await p.waitForTimeout(500);
await p.getByRole('button', { name: /Light a low fire/ }).click();
await p.waitForTimeout(400);
await p.getByRole('button', { name: 'Select Hana' }).click();
await p.getByRole('button', { name: /^Wire with bells/ }).click();
await p.getByRole('button', { name: /^Do it/ }).click();
await p.waitForTimeout(300);
await p.getByRole('button', { name: /Go to dinner/ }).click();
await p.getByRole('button', { name: /^Dry ration/ }).click();
await p.waitForTimeout(300);
await p.screenshot({ path: '23-night-counter.png', fullPage: true });
await p.getByRole('button', { name: /^Sleep$/ }).click();
await p.waitForTimeout(800);
await p.screenshot({ path: '24-ambush.png', fullPage: true });
await p.getByRole('button', { name: /Defend the camp/ }).click();
await p.waitForTimeout(700);
await p.screenshot({ path: '25-ambush-prep.png', fullPage: true });
const s2 = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), K);
console.log('B night', JSON.stringify(s2.camp.night), 'counter', s2.party.progress.ambushCounter, 'battle', s2.battle?.id, s2.battle?.ambush, 'fighter', s2.battle?.fighterId);

// C. mission complete
p = await page();
await inject(p, `r.outcome = 'complete'; r.battle = null; r.stats = { battlesWon: 3, falls: 1, camps: 1, ambushes: 0, retries: 0 }; r.party.progress.hoursSpent = 17;`);
await p.screenshot({ path: '26-complete.png', fullPage: true });
await p.getByRole('button', { name: /Return to the village/ }).click();
await p.waitForTimeout(700);
const s3 = await p.evaluate((k) => localStorage.getItem(k), K);
console.log('C save after return', s3);

// D. Legend game over
p = await page();
await inject(p, `r.outcome = 'gameOver'; r.battle = null; r.party.progress.difficulty = 'legend'; r.party.dead = r.party.members; r.party.members = [];`);
await p.screenshot({ path: '27-game-over.png', fullPage: true });

// E. phone
p = await page(390, 844);
await p.screenshot({ path: '28-phone-road.png', fullPage: true });
await inject(p, `r.pos = { zone: 1, node: 1 }; r.battle = null; r.nodeDone = false; r.party.progress.zone = 1;`);
await p.getByRole('button', { name: /Make camp/ }).click();
await p.waitForTimeout(600);
await p.screenshot({ path: '29-phone-camp.png', fullPage: true });
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log('phone scrollWidth', sw);

console.log(errors.join('\n') || 'no errors');
await b.close();
