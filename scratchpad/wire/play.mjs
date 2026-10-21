// Drives a practice battle: the hero (green chakra) casts elemental jutsu; screenshots of the effects.
import { readFileSync } from 'node:fs';
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs');
const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/wire/shots';
const PORT = process.argv[2] ?? '5471';
const SCEN = process.argv[3] ?? 'green';
const hero = readFileSync(`/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/wire/hero-${SCEN}.json`, 'utf8');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text()); });
page.on('worker', (w) => console.log('WORKER', w.url()));
await page.addInitScript((h) => {
  localStorage.setItem('shinobi.lang', 'es');
  localStorage.setItem('shinobi.battleSpeed', '1');
  localStorage.setItem('shinobi.tips.off', '1');
  localStorage.setItem('shinobi5e.hero.v1', h);
  window.__long = [];
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true });
  } catch {}
}, hero);
await page.goto(`http://127.0.0.1:${PORT}/#combat`);
await page.getByText('Pelear').first().click();
await page.waitForFunction(() => typeof window.__battle === 'object');
const t0 = await page.evaluate(() => performance.now());
const idle = async () => page.waitForFunction(() => !window.__battle.busy(), null, { timeout: 60000 });
await idle();
const info = await page.evaluate(() => {
  const s = window.__battle.state();
  return { phase: s.phase, order: s.order, turn: s.turn, units: Object.values(s.units).map((u) => [u.id, u.team, u.pos, u.look?.chakra?.tint, u.jutsus]) };
});
console.log(JSON.stringify(info));

/** Makes it the hero's turn with a fresh budget, then casts. */
async function cast(jutsu, at, opts = {}) {
  await idle();
  await page.evaluate(({ jutsu, opts }) => {
    const s = window.__battle.state();
    const u = s.units.test_hero;
    if (opts.tint !== undefined) u.look.chakra.tint = opts.tint;
    if (!u.jutsus.includes(jutsu)) u.jutsus.push(jutsu);
    u.chakra = u.maxChakra = 300;
    u.armed = false;
    if (opts.pos) u.pos = opts.pos;
    // The targets stay standing through every cast.
    for (const e of Object.values(s.units)) if (e.team === 'enemy') { e.hp = e.maxHp = 999; e.down = undefined; }
    const i = s.order.indexOf('test_hero');
    s.turn = i;
    u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
    window.__battle.sync();
  }, { jutsu, opts });
  await page.waitForTimeout(300);
  if (at === 'enemy') at = await page.evaluate(() => Object.values(window.__battle.state().units).find((e) => e.id === 'rogue_0').pos);
  const t = await page.evaluate(() => window.__battle.tints());
  console.log('tints before', jutsu, JSON.stringify(t));
  const r = await page.evaluate(({ jutsu, at, enh }) => window.__battle.act({ type: 'jutsu', unit: 'test_hero', jutsu, at, target: 'rogue_0', enhanced: !!enh }), { jutsu, at, enh: opts.enhanced });
  if (!r) {
    const why = await page.evaluate(async ({ jutsu, at, enh }) => {
      const { applyAction } = await import('/src/battle/engine.ts');
      return { reason: applyAction(window.__battle.state(), { type: 'jutsu', unit: 'test_hero', jutsu, at, enhanced: !!enh }).reason, busy: window.__battle.busy() };
    }, { jutsu, at, enh: opts.enhanced });
    console.log('refused', jutsu, JSON.stringify(why));
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/refused-${jutsu}.png` });
  }
  return r;
}

async function shoot(name, center, times, half = 260) {
  await page.evaluate(([x, z]) => window.__battle.centerOn(x, z), center);
  const start = Date.now();
  for (const ms of times) {
    const wait = ms - (Date.now() - start);
    if (wait > 0) await page.waitForTimeout(wait);
    const p = await page.evaluate(([x, z]) => window.__battle.screenOf(x, z), center);
    await page.screenshot({ path: `${OUT}/${name}-${ms}.png`, clip: { x: Math.max(0, p.x - half * 1.4), y: Math.max(0, p.y - half * 1.3), width: half * 2.8, height: half * 1.8 } });
  }
}

const s0 = await page.evaluate(() => window.__battle.state());
const hero0 = s0.units.test_hero;
const enemy = Object.values(s0.units).find((u) => u.team === 'enemy' && !u.down);
console.log('hero at', JSON.stringify(hero0.pos), 'enemy', enemy.id, JSON.stringify(enemy.pos));
const mid = (a, b) => [(a.x + b.x) / 2, (a.z + b.z) / 2];
// Where the hero stands: 6 m from the enemy.
const stand = { x: enemy.pos.x - 6, z: enemy.pos.z };

if (SCEN === 'green') {
  const r1 = await cast('fireball_goukakyu', 'enemy', { pos: stand });
  console.log('fireball', r1);
  await shoot('fireball-green', mid(stand, enemy.pos), [700, 1000, 1300, 1700, 2100]);
  const wallAt = { x: stand.x + 3, z: stand.z + 2 };
  console.log('wall', await cast('earth_wall_doryuheki', wallAt, {}));
  await shoot('earthwall-green', [wallAt.x, wallAt.z], [900, 2500]);
  // Lazy path: a jutsu the battle did not prepare for this ninja (Hana's green water dragon was).
  console.log('dragon', await cast('water_dragon_suiryuudan', 'enemy', {}));
  await shoot('waterdragon-green', mid(stand, enemy.pos), [900, 1300, 1700, 2100]);
  console.log('annihilation', await cast('great_fire_annihilation', 'enemy', {}));
  await shoot('annihilation-green', [stand.x + 5, stand.z], [1200, 2000, 3000], 330);
} else {
  // Black from the start: Kirin and the fireball are prepared while the battle opens.
  await page.waitForTimeout(6000);
  const r1 = await cast('fireball_goukakyu', 'enemy', { pos: stand });
  console.log('fireball', r1);
  await shoot('fireball-black', mid(stand, enemy.pos), [700, 1000, 1300, 1700, 2100]);
  console.log('kirin', await cast('kirin_thunder', 'enemy', {}));
  const e = await page.evaluate(() => window.__battle.state().units.rogue_0.pos);
  await shoot('kirin-black', [e.x, e.z], [900, 1500, 2100, 2800], 330);
  const wallAt = { x: stand.x + 3, z: stand.z - 2 };
  console.log('wall (lazy, black)', await cast('earth_wall_doryuheki', wallAt, {}));
  await shoot('earthwall-black', [wallAt.x, wallAt.z], [900, 2500]);
}
console.log('tints at the end', JSON.stringify(await page.evaluate(() => window.__battle.tints())));
const long = await page.evaluate((t0) => window.__long.filter(([s]) => s >= t0), t0);
console.log('long tasks after battle start (start ms, duration ms):', JSON.stringify(long));
await page.screenshot({ path: `${OUT}/final.png` });
await browser.close();
