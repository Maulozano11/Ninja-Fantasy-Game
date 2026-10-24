// A melee jutsu held charged in the hand (the owner, 2026-10-21: "chidori sera una habilidad que
// actives", and "lo mismo para el rasengan"; docs/GAMEPLAY_DESIGN.md, "The Chidori becomes an
// activated state"). Activating it is a bonus action that pays its chakra; it stays charged up to
// 3 of the ninja's own turns; the moment the ninja moves within reach of a foe its blow goes off by
// itself (one melee jutsu attack) and the charge ends. While it is charged the ground cracks under
// each step, and the cracks are difficult terrain until the start of the ninja's next turn ("terreno
// dificil 1 turno"). Generic: any jutsu with `handCharge` works this way (engine.ts strikes).
//
// What ends it early (the builders' choice, the owner's rule says only "3 rounds" and the blow): the
// ninja falls (any 0 HP state), its chakra is sealed, or it lets the hand go: it weaves hand seals
// for another jutsu (Kawarimi too) or draws its weapon (both need the charged hand).
//
// Where it meets the elements on the ground (wet ground and steam, `jutsu/gap-set-2`, built at the
// same time): both keep plain data per navigation cell keyed "c,r" on the state (`cracks` here,
// `wet` and `steam` there) and tick on the battle's own clock. Merged, the key helper can be the
// shared `cellKey` of map.ts, and the 'cracks' event can join their 'ground' event as one more kind.

import type { BattleEvent, BattleState, Cell, ChargeEnd, Unit } from './types';
import { fullCoverBetween, rangeDist, gridFor, idx, inGrid, tooHigh } from './map';
import { passivePerception } from './combat';
import { JUTSU } from './jutsu';
import { crackKey } from './nav';

export { crackKey };

/** How far the charged hand's blow reaches to `t` (the jutsu's reach; a hydra's head rises high, its body is big). */
export const chargedReach = (u: Unit, t: Unit): number => (JUTSU[u.charged?.jutsu ?? '']?.range ?? 1.5) + (t.kind === 'hydra_head' ? 2.5 : 0) + (t.bulk ?? 0);

/**
 * The foe a charged hand strikes now, if any: the nearest foe within its reach that the ninja knows
 * about (standing, not hidden from it, not the hydra's body, which nobody fights directly) with no
 * metal wall between and not two levels above or below; ties go to the first id, so it replays.
 */
export function chargedFoe(s: BattleState, u: Unit): Unit | undefined {
  if (!u.charged || u.down) return undefined;
  let best: { f: Unit; d: number } | undefined;
  for (const f of Object.values(s.units)) {
    if (f.team === u.team || f.down || f.head?.severed || f.kind === 'hydra_body') continue;
    if (f.cond.hidden !== undefined && passivePerception(u) < f.cond.hidden) continue;
    const d = rangeDist(u.pos, f.pos);
    if (d > chargedReach(u, f) + 0.1 || fullCoverBetween(s, u.pos, f.pos) || tooHigh(s, u.pos, f.pos)) continue;
    if (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) <= 1e-9 && f.id < best.f.id)) best = { f, d };
  }
  return best?.f;
}

/** Ends a charge (and tells the screen and the log why). */
export function endCharge(u: Unit, end: ChargeEnd, ev: BattleEvent[]): void {
  const c = u.charged;
  if (!c) return;
  u.charged = undefined;
  ev.push({ t: 'charged', unit: u.id, jutsu: c.jutsu, on: false, end });
}

/** A charge that can't hold any more ends: its ninja fell, or its chakra was sealed. */
export function chargeHolds(u: Unit, sealed: boolean, ev: BattleEvent[]): void {
  if (!u.charged) return;
  if (u.down) endCharge(u, 'down', ev);
  else if (sealed) endCharge(u, 'sealed', ev);
}

/**
 * A charged ninja steps on `c`: the ground there cracks (not water, which has no ground to crack).
 * Returns the cell's key when it cracked now.
 */
export function crackUnder(s: BattleState, u: Unit, c: Cell): string | null {
  if (!u.charged || s.phase !== 'combat') return null;
  const g = gridFor(s.mapId);
  if (!inGrid(g, c) || g.water[idx(g, c)] > 0) return null;
  const k = crackKey(c);
  const was = s.cracks?.[k];
  s.cracks = { ...(s.cracks ?? {}), [k]: { by: u.id, round: s.round } };
  return was && was.by === u.id && was.round === s.round ? null : k;
}

/**
 * The cracks mend: those `by` made (at the start of its next turn), or with `by` unset, those a whole
 * round old (when a new round begins: their ninja took no turn since).
 */
export function mendCracks(s: BattleState, by: string | undefined, ev: BattleEvent[]): void {
  if (!s.cracks) return;
  const gone: Record<string, string[]> = {};
  for (const [k, c] of Object.entries(s.cracks)) {
    if (by !== undefined ? c.by !== by : s.round - c.round < 2) continue;
    (gone[c.by] ??= []).push(k);
    delete s.cracks[k];
  }
  for (const [unit, cells] of Object.entries(gone)) ev.push({ t: 'cracks', unit, cells, on: false });
}

/**
 * At the start of a charged ninja's turn its charge loses a round; with none left it fades unused.
 * (The activation's own turn is the first of its rounds.)
 */
export function tickCharge(u: Unit, ev: BattleEvent[]): void {
  if (!u.charged) return;
  u.charged.rounds -= 1;
  if (u.charged.rounds <= 0) endCharge(u, 'expired', ev);
}
