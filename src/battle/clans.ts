// The clans' own rules (docs/CLANS_DESIGN.md, phase 1), one section per clan. The engine, the AI
// and the screen call these; nothing here calls the engine, the AI or the turns back.

import { effectMods } from '../rules/effects';
import type { BattleEvent, BattleState, Hit, Pt, Unit } from './types';
import { cellCenter, coverBetween, dist, gridFor, lineOfSight, waterAtPt } from './map';
import { canStop, occupancy, reachable } from './nav';
import { passivePerception } from './combat';
import { JUTSU } from './jutsu';
import { trapAt } from './hazards';

// --- Mirai: Eye of Tomorrow, Premonitory Evasion -------------------------------------------

/** How far a Mirai's Eye of Tomorrow reads an enemy's next move (and sees a blow coming). */
export const FORESIGHT_RANGE = 18;

export const EVASION = 'mirai_evasion';

/** The step aside is one square (1.5 m): a cell 1 to 1.6 m away, at most 2.2 m of walking. */
const STEP_MIN = 1;
const STEP_MAX = 1.6;
const STEP_WALK = 2.2;

/**
 * The Mirai saw the blow coming: the attacker is a foe within the Eye's reach, in sight and not
 * hidden from it. (A blow struck from hiding is marked on the hit itself: `unseen`.)
 */
export function sawComing(s: BattleState, m: Unit, attacker: Unit | undefined): boolean {
  if (!attacker || attacker.team === m.team) return false;
  if (attacker.cond.hidden !== undefined && passivePerception(m) < attacker.cond.hidden) return false;
  return dist(m.pos, attacker.pos) <= FORESIGHT_RANGE && lineOfSight(s, m.pos, attacker.pos);
}

/**
 * Where a Mirai steps to make a blow miss: a free cell 1 to 1.6 m away that it can walk to (no
 * wall, prop or foe in between), dry and with no enemy trap; as far from the attacker as it can,
 * and behind cover if there is some. Null if there is nowhere to step.
 */
export function evasionSpot(s: BattleState, m: Unit, h: Hit): Pt | null {
  const a = h.source ? s.units[h.source] : undefined;
  const danger = a?.pos ?? m.pos;
  const g = gridFor(s.mapId);
  const occ = occupancy(s);
  let best: Pt | null = null;
  let bestScore = -Infinity;
  for (const i of reachable(s, m, STEP_WALK).cost.keys()) {
    const c = { c: i % g.cols, r: Math.floor(i / g.cols) };
    const p = cellCenter(c);
    const d = dist(p, m.pos);
    if (d < STEP_MIN || d > STEP_MAX || !canStop(s, m, c, occ) || waterAtPt(s, p) === 2 || trapAt(s, m, p)) continue;
    const score = dist(p, danger) + (a && coverBetween(s, a.pos, p, [a.id, m.id]) >= 2 ? 1 : 0);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Premonitory Evasion can answer this hit: one attack on the Mirai alone (not an area), that it saw
 * coming and that can be blocked, in the fighting, with its reaction and 2 chakra left and room to
 * step aside.
 */
export function canEvade(s: BattleState, t: Unit, h: Hit): boolean {
  if (s.phase !== 'combat' || !h.aimed || h.amount <= 0 || h.unseen || h.unblockable) return false;
  if (t.kind !== 'ninja' || t.down || !t.jutsus.includes(EVASION) || !t.turn.reaction || t.cond.surprised) return false;
  if (effectMods(t.effects).noJutsu || t.chakra < JUTSU[EVASION].cost) return false;
  return sawComing(s, t, h.source ? s.units[h.source] : undefined) && evasionSpot(s, t, h) !== null;
}

/**
 * Premonitory Evasion: the Mirai pays 2 chakra and its reaction and steps aside, and the blow
 * misses (the hit is dropped). The step provokes no opportunity attack and sets off no trap.
 */
export function evade(s: BattleState, t: Unit, h: Hit, ev: BattleEvent[]): void {
  const to = evasionSpot(s, t, h);
  if (!to) return;
  const cost = JUTSU[EVASION].cost;
  t.chakra -= cost;
  t.turn.reaction = false;
  ev.push({ t: 'chakra', unit: t.id, delta: -cost, chakra: t.chakra, reason: EVASION });
  const from = { ...t.pos };
  t.pos = to;
  ev.push({ t: 'evade', unit: t.id, from, to, source: h.source });
}
