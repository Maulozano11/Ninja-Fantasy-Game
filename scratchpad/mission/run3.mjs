// The camp, step by step, from an injected save at the Shrine Clearing with a wounded party.
import { chromium } from '../pw/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.type() + ': ' + m.text()); });
await p.goto('http://127.0.0.1:3017/#missions');
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForTimeout(1200);
await p.getByRole('button', { name: /Bring/ }).first().click(); // a third companion (Akira, a Mirai)
await p.getByRole('button', { name: /Set out with/ }).click();
await p.waitForTimeout(800);
// Jump to the camp node with a battered party.
await p.evaluate(() => {
  const k = 'shinobi5e.mission.v1';
  const r = JSON.parse(localStorage.getItem(k));
  r.pos = { zone: 1, node: 1 };
  r.battle = null; r.nodeDone = false; r.zoneEnd = false;
  r.party.progress.zone = 1; r.party.progress.hoursSpent = 9; r.party.progress.hoursSinceCamp = 9; r.party.progress.stopsTaken = [0];
  const m = r.party.members;
  m[0].currentHp = 21; m[0].currentChakra = 12; m[0].tension = 4; m[0].hitDiceSpent = 2;
  m[0].effects = [{ id: 'sharpened', remaining: 2 }, { id: 'bleeding', source: 'Kunai' }];
  m[1].currentHp = 14; m[1].currentChakra = 30; m[1].tension = 2;
  m[2].currentHp = 9; m[2].currentChakra = 6; m[2].tension = 6; m[2].exhaustion = 1; m[2].effects = [{ id: 'poisoned', sinceCamp: 0 }];
  if (m[3]) { m[3].currentHp = 30; m[3].currentChakra = 10; m[3].tension = 3; }
  r.entry = r.party;
  localStorage.setItem(k, JSON.stringify(r));
});
await p.reload();
await p.waitForTimeout(1200);
await p.waitForTimeout(300);
await p.waitForTimeout(800);
await p.screenshot({ path: '10-camp-node.png', fullPage: true });
await p.getByRole('button', { name: /Make camp/ }).click();
await p.waitForTimeout(1500);
await p.screenshot({ path: '11-camp-fire.png', fullPage: true });
await p.getByRole('button', { name: /Katon fire by/ }).first().click();
await p.waitForTimeout(1200);
await p.screenshot({ path: '12-camp-activities.png', fullPage: true });
// Hana bandages Solen, then heals Kenji with Mystical Palm.
await p.getByRole('button', { name: 'Select Hana' }).click();
await p.waitForTimeout(400);
await p.getByRole('button', { name: /^Bandage/ }).click();
await p.waitForTimeout(400);
await p.screenshot({ path: '13-activity-open.png', fullPage: true });
await p.getByRole('button', { name: /^Solen Valcaire \d+\/\d+$/ }).click();
await p.getByRole('button', { name: /^Do it/ }).click();
await p.waitForTimeout(600);
await p.getByRole('button', { name: /^Heal with jutsu/ }).click();
await p.waitForTimeout(300);
await p.getByRole('button', { name: /^Kenji \d+\/\d+$/ }).click();
await p.getByRole('button', { name: /^Do it/ }).click();
await p.waitForTimeout(600);
// Kenji: Seal... no, Kenji is Uddo Genjutsu: wood shelter.
await p.getByRole('button', { name: 'Select Kenji' }).click();
await p.waitForTimeout(300);
await p.screenshot({ path: '13b-kenji.png', fullPage: true });
await p.getByRole('button', { name: /^Wood shelter/ }).click();
await p.waitForTimeout(300);
await p.screenshot({ path: '13c-kenji-open.png', fullPage: true });
await p.getByRole('button', { name: /^Do it/ }).click();
await p.waitForTimeout(600);
// Solen keeps watch.
await p.getByRole('button', { name: 'Select Solen Valcaire' }).click();
await p.waitForTimeout(300);
await p.getByRole('button', { name: /^Keep watch/ }).click();
await p.getByRole('button', { name: /^Do it/ }).click();
await p.waitForTimeout(800);
await p.screenshot({ path: '14-activities-done.png', fullPage: true });
await p.getByRole('button', { name: /Go to dinner/ }).click();
await p.waitForTimeout(600);
await p.screenshot({ path: '15-dinner.png', fullPage: true });
await p.getByRole('button', { name: /^Hot meal/ }).click();
await p.waitForTimeout(800);
await p.screenshot({ path: '16-night.png', fullPage: true });
await p.getByRole('button', { name: /^Sleep$/ }).click();
await p.waitForTimeout(1200);
await p.screenshot({ path: '17-after-roll.png', fullPage: true });
const wake = p.getByRole('button', { name: /Wake up/ });
if (await wake.count()) { await wake.click(); await p.waitForTimeout(1500); }
await p.screenshot({ path: '18-morning.png', fullPage: true });
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('shinobi5e.mission.v1') || 'null'));
console.log('camp', JSON.stringify({ fire: saved.camp?.fire, food: saved.camp?.food, night: saved.camp?.night, morningDone: saved.camp?.morningDone, done: saved.camp?.done }));
console.log('hp', saved.party.members.map((m) => `${m.name}:${m.currentHp}/${m.maxHp} ck ${m.currentChakra} ten ${m.tension} fx ${(m.effects||[]).map(e=>e.id).join('+')}`).join(' | '));
console.log(errors.join('\n') || 'no errors');
await b.close();
