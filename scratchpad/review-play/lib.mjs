import { chromium } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/pw/node_modules/playwright/index.mjs';
export const out = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/review-play/shots';
export async function open(locale = 'es-MX', { tips = false, hash = '' } = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5310/' + hash, { waitUntil: 'networkidle' });
  await page.evaluate((tips) => {
    localStorage.clear();
    if (!tips) for (const k of ['tip_move', 'tip_attack', 'tip_jutsu', 'tip_cover', 'tip_stealth', 'tip_hands', 'tip_hydra', 'tip_mirai', 'tip_koton', 'tip_ryusei', 'tip_northstar']) localStorage.setItem(`shinobi.${k}`, '1');
    localStorage.setItem('shinobi.battleSpeed', '1');
  }, tips);
  await page.reload({ waitUntil: 'networkidle' });
  return { browser, page, errs };
}
export const helpers = (page) => {
  const idle = () => page.waitForFunction(() => window.__battle && !window.__battle.busy(), null, { timeout: 120000 });
  const playerTurn = () => page.waitForFunction(() => { const s = window.__battle?.state(); if (!s) return false; const u = s.units[s.order[s.turn]]; return !window.__battle.busy() && u?.team === 'party' && u.controller === 'player'; }, null, { timeout: 120000 });
  const at = (x, z) => page.evaluate(([x, z]) => window.__battle.screenOf(x, z), [x, z]);
  const st = (f) => page.evaluate(f);
  const cur = () => page.evaluate(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { id: u.id, name: u.name, clan: u.character?.clan, pos: u.pos, chakra: u.chakra, turn: u.turn, jutsus: u.jutsus }; });
  return { idle, playerTurn, at, st, cur };
};
/** End other party turns (declining prompts, or calling onPrompt) until it's `id`'s turn as player. */
export async function turnOf(page, id, onPrompt) {
  for (let i = 0; i < 2000; i++) {
    await page.waitForTimeout(150);
    const s = await page.evaluate(() => { const s = window.__battle.state(); const u = s.units[s.order[s.turn]]; return { cur: u?.id, team: u?.team, ctrl: u?.controller, busy: window.__battle.busy(), pending: s.pending ? { kind: s.pending.kind, reactor: s.pending.reactor, dmg: s.pending.hit?.amount, src: s.pending.hit?.source } : null, phase: s.phase, round: s.round }; });
    if (s.phase === 'ended') return s;
    if (s.busy) continue;
    if (s.pending) {
      const rc = await page.evaluate((r) => window.__battle.state().units[r].controller, s.pending.reactor);
      if (rc === 'player') {
        const take = onPrompt ? await onPrompt(s) : false;
        await page.keyboard.press(take ? 'y' : 'n');
      }
      continue;
    }
    if (s.team === 'party' && s.ctrl === 'player') {
      if (s.cur === id) return s;
      await page.evaluate((id) => window.__battle.act({ type: 'endTurn', unit: id }), s.cur);
    }
  }
}
