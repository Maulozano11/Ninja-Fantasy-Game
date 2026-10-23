// The clone jutsu's clones (the jutsu with special 'clone'; docs/GAMEPLAY_DESIGN.md, "Shadow Clone",
// the owner's answer of 2026-10-23): copies of the ninja standing on the map beside it. A clone is a
// unit of its own (so it is drawn, struck, moved and aimed at like one) that takes no turns: it acts
// in its summoner's. It flanks the foes it stands next to (+2 to melee attacks against them), joins
// its summoner's blows and taijutsu in a combo, takes the blow aimed at its summoner, lasts 3 of the
// summoner's turns or one blow, and can cast a little of the summoner's jutsu with the summoner's
// chakra. Pure rules: no dice here (the engine rolls them).

import type { BattleEvent, BattleState, Pt, Unit } from './types';
import { dist, fullCoverBetween, levelAtPt, steamAt } from './map';
import { freeSpot } from './nav';
import { JUTSU } from './jutsu';
import type { JutsuSpec } from './jutsu';
import { wielded } from './units';

/**
 * The clones' numbers. The counts, the 3 turns and the jutsu they may cast are the owner's; the rest
 * are the builder's proposals, waiting for his look (docs/GAMEPLAY_DESIGN.md).
 */
export const CLONE = {
  /** Clones a cast makes: plain 1, enhanced 2 (the owner). */
  count: { plain: 1, enhanced: 2 },
  /** Its summoner's turns a clone lasts, the one it is summoned in counted (the owner: "dura 3 turnos"). */
  turns: 3,
  /** Melee attacks against a foe a clone stands next to: +2 (the owner's yes to the proposal). */
  flank: 2,
  /** How near (m) a clone stands to a foe to flank it or join a blow at it: next to it. */
  reach: 1.6,
  /** Where a clone stands beside its summoner (m): apart enough to be told apart, near enough to stay "beside". */
  near: 0.9,
  far: 1.6,
  /** A clone's blow joining its summoner's weapon blow that lands (proposal): 1d6, no modifier. */
  comboDice: '1d6',
  /** The jutsu the clones may cast together, in points (the owner): plain 1 rank D; enhanced 1 rank C or 2 rank D. */
  points: { plain: 1, enhanced: 2 },
  /** Foes fooled: a plan at a ninja with n clones goes at a clone n times in n + `fooled` (proposal: 1 in 3, 1 in 2). */
  fooled: 2,
  /** What a jutsu of each rank takes of those points. */
  rankCost: { D: 1, C: 2 } as Record<string, number>,
};

/** A clone still standing on the map (one that took its blow or ran out is gone: down 'fled'). */
export const standingClone = (u: Unit | undefined): u is Unit => !!u?.clone && !u.down;

/** A ninja's clones still standing, oldest first. */
export function clonesOf(s: BattleState, id: string): Unit[] {
  return Object.values(s.units).filter((c) => standingClone(c) && c.clone!.of === id);
}

/** The ninja a clone is a copy of. */
export const summonerOf = (s: BattleState, u: Unit): Unit | undefined => (u.clone ? s.units[u.clone.of] : undefined);

/** What a jutsu takes of the clones' points (null: a clone can't cast it). */
export const cloneRankCost = (spec: JutsuSpec | undefined): number | null => (spec ? CLONE.rankCost[spec.rank] ?? null : null);

/**
 * The jutsu of its summoner's a clone may cast: its own list's rank D ones (and rank C, enhanced), but
 * no clan ability, reaction, charged hand, nor the clone jutsu itself.
 */
export function cloneJutsuOf(owner: Unit, enhanced: boolean): string[] {
  return owner.jutsus.filter((id) => {
    const j = JUTSU[id];
    if (!j || j.ability || j.cast === 'reaction' || j.handCharge || j.special === 'clone') return false;
    return j.rank === 'D' || (enhanced && j.rank === 'C');
  });
}

/** Why a clone can't cast this jutsu now (its rank, the points its summoner's clones have left), or null. */
export function cloneJutsuBlocker(s: BattleState, c: Unit, spec: JutsuSpec): string | null {
  const owner = summonerOf(s, c);
  if (!owner || owner.down) return 'cantAct';
  const cost = cloneRankCost(spec);
  if (cost === null || !c.jutsus.includes(spec.id)) return 'cloneRank';
  if ((owner.clonePoints ?? 0) < cost) return 'cloneSpent';
  return null;
}

/** The foes a ninja is in melee with: standing, within its weapon's reach (and no metal wall between). */
function engaged(s: BattleState, owner: Unit, at: Pt = owner.pos): Unit[] {
  return Object.values(s.units).filter(
    (f) => f.team !== owner.team && !f.down && !f.clone && f.kind !== 'hydra_body' && !f.head?.severed && dist(at, f.pos) <= wielded(owner).reach + 0.1 + (f.bulk ?? 0) && !fullCoverBetween(s, at, f.pos),
  );
}

/** A clone at `p` stands next to `f` (to flank it, or join a blow at it). */
export const besideFoe = (s: BattleState, p: Pt, f: Unit): boolean => dist(p, f.pos) <= CLONE.reach + (f.bulk ?? 0) + (f.kind === 'hydra_head' ? 2.5 : 0) && !fullCoverBetween(s, p, f.pos);

/**
 * Where a clone stands beside its summoner (the builder's proposal: the clones keep to their
 * summoner's side and follow it; the player doesn't walk them). A free cell 0.9–1.6 m from the
 * summoner, on its level, out of the steam: best one next to a foe the summoner is in melee with,
 * on the far side of that foe (a flank); otherwise the nearest to where the clone stood (or, for a
 * new clone, toward the nearest foe). Null if no cell is free.
 */
export function cloneSpot(s: BattleState, owner: Unit, c: Unit, taken: Pt[] = []): Pt | null {
  const foes = engaged(s, owner);
  const nearest = Object.values(s.units)
    .filter((f) => f.team !== owner.team && !f.down && !f.clone && f.kind !== 'hydra_body')
    .sort((a, b) => dist(a.pos, owner.pos) - dist(b.pos, owner.pos))[0];
  const fresh = dist(c.pos, owner.pos) < 0.1;
  const lvl = levelAtPt(s, owner.pos);
  // Nobody else within CLONE.near of where it stands, so it is never drawn over another unit.
  const others = Object.values(s.units).filter((o) => o.id !== c.id && o.id !== owner.id && o.down !== 'fled' && o.down !== 'dead' && o.kind !== 'hydra_head' && !o.bulk);
  const score = (p: Pt): number => {
    if (taken.some((q) => dist(q, p) < CLONE.near) || others.some((o) => dist(o.pos, p) < CLONE.near)) return -Infinity;
    let v = -Math.abs(levelAtPt(s, p) - lvl) * 4 - (steamAt(s, p) ? 6 : 0);
    let flank = 0;
    for (const f of foes) {
      if (!besideFoe(s, p, f)) continue;
      // The far side of the foe from the summoner flanks best (the angle between them, 0..π).
      const a1 = Math.atan2(owner.pos.z - f.pos.z, owner.pos.x - f.pos.x);
      const a2 = Math.atan2(p.z - f.pos.z, p.x - f.pos.x);
      let d = Math.abs(a1 - a2);
      if (d > Math.PI) d = 2 * Math.PI - d;
      flank = Math.max(flank, 10 + d);
    }
    v += flank;
    v -= fresh ? (nearest ? dist(p, nearest.pos) * 0.3 : 0) : dist(p, c.pos) * 0.5;
    return v;
  };
  const p = freeSpot(s, c, owner.pos, CLONE.near, CLONE.far, score);
  return p === owner.pos || score(p) === -Infinity ? null : p;
}

/** A clone of `owner`: the same look, sheet and numbers; 1 HP, no chakra of its own, no turns. */
export function makeClone(s: BattleState, owner: Unit, n: number, enhanced: boolean): Unit {
  const c: Unit = structuredClone(owner);
  c.id = `${owner.id}_clone${s.tick}_${n}`;
  c.name = `${owner.name}'s clone`;
  c.nameEs = owner.articleEs ? `Clon ${owner.articleEs === 'la' ? 'de la' : 'del'} ${owner.nameEs ?? owner.name}` : `Clon de ${owner.nameEs ?? owner.name}`;
  c.articleEs = 'el';
  c.clone = { of: owner.id, turns: CLONE.turns, enhanced };
  c.clonePoints = undefined;
  c.hp = 1;
  c.maxHp = 1;
  c.tempHp = 0;
  c.chakra = 0;
  c.maxChakra = 0;
  c.jutsus = cloneJutsuOf(owner, enhanced);
  c.effects = [];
  c.cond = {};
  c.down = undefined;
  c.deathSaves = { ok: 0, bad: 0 };
  c.turn = { move: 0, action: true, bonus: true, reaction: false, moved: 0 };
  c.intent = undefined;
  c.guard = undefined;
  c.charged = undefined;
  c.commanded = undefined;
  c.joined = undefined;
  c.tripleNature = undefined;
  c.lastNature = undefined;
  c.stats2 = { critsTaken: 0, critsLanded: 0, pills: 0, fell: false, fellToCrit: false, tension: 0, jutsuCast: 0 };
  return c;
}

/** Where a cast's clones would stand (as many as there are free cells for, up to the count). */
export function summonSpots(s: BattleState, owner: Unit, enhanced: boolean): Pt[] {
  const n = enhanced ? CLONE.count.enhanced : CLONE.count.plain;
  // Its standing clones go as the new ones come: their cells are free for them.
  const without: BattleState = { ...s, units: Object.fromEntries(Object.entries(s.units).filter(([, u]) => !(standingClone(u) && u.clone!.of === owner.id))) };
  const probe = { ...owner, id: `${owner.id}_probe`, pos: { ...owner.pos } };
  const spots: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = cloneSpot(without, owner, probe, spots);
    if (!p) break;
    spots.push(p);
  }
  return spots;
}

/**
 * The cast: its clones stand up beside the ninja (the ones still standing from an earlier cast go
 * first), with the points of jutsu they share.
 */
export function summonClones(s: BattleState, owner: Unit, enhanced: boolean, ev: BattleEvent[]): Unit[] {
  const spots = summonSpots(s, owner, enhanced);
  for (const old of clonesOf(s, owner.id)) popClone(s, old, 'recast', ev);
  owner.clonePoints = enhanced ? CLONE.points.enhanced : CLONE.points.plain;
  const made: Unit[] = [];
  spots.forEach((p, i) => {
    const c = makeClone(s, owner, i, enhanced);
    c.pos = { ...p };
    c.facing = owner.facing;
    s.units[c.id] = c;
    made.push(c);
    ev.push({ t: 'clone', unit: c.id, on: true, by: owner.id, at: { ...p } });
  });
  return made;
}

/** Why a clone goes. */
export type CloneEnd = 'blow' | 'hit' | 'expired' | 'down' | 'recast';

/**
 * A clone goes up in smoke: it took a blow, ran out of turns, its summoner fell, or a new cast
 * replaced it. It stays in the units as a fled one (the screen fades it out where it stood).
 */
export function popClone(s: BattleState, c: Unit, why: CloneEnd, ev: BattleEvent[], at: Pt = c.pos): void {
  if (!c.clone || c.down) return;
  c.down = 'fled';
  c.cond = {};
  c.hp = 0;
  ev.push({ t: 'clone', unit: c.id, on: false, by: c.clone.of, at: { ...at }, why });
  const owner = s.units[c.clone.of];
  // The last of them gone: their jutsu go with them.
  if (owner && !clonesOf(s, owner.id).length) owner.clonePoints = undefined;
}

/** Every clone of a ninja goes (it fell, fled, or cast them again). */
export function popClonesOf(s: BattleState, id: string, why: CloneEnd, ev: BattleEvent[]): void {
  for (const c of clonesOf(s, id)) popClone(s, c, why, ev);
}

/** The summoner's turn begins: its clones may cast again (an action and a bonus action each). */
export function refreshClones(s: BattleState, owner: Unit): void {
  for (const c of clonesOf(s, owner.id)) c.turn = { move: 0, action: true, bonus: true, reaction: false, moved: 0 };
}

/** The summoner's turn ends: each clone has one turn fewer, and goes at 0. */
export function tickClones(s: BattleState, owner: Unit, ev: BattleEvent[]): void {
  for (const c of clonesOf(s, owner.id)) {
    c.clone!.turns -= 1;
    if (c.clone!.turns <= 0) popClone(s, c, 'expired', ev);
  }
}

/**
 * The summoner moved (a walk, a flash-in, a warp, Kawarimi, a push): its clones follow, each to the
 * best cell beside it (cloneSpot), at a run. One already where it should be stays.
 */
export function followClones(s: BattleState, owner: Unit, ev: BattleEvent[]): void {
  if (owner.down) return;
  const placed: Pt[] = [];
  for (const c of clonesOf(s, owner.id)) {
    const p = cloneSpot(s, owner, c, placed);
    if (!p) continue;
    placed.push(p);
    if (dist(p, c.pos) < 0.1) continue;
    if (Math.abs(p.x - c.pos.x) > 0.05) c.facing = p.x > c.pos.x ? 1 : -1;
    c.pos = { ...p };
    ev.push({ t: 'move', unit: c.id, path: [{ ...p }], run: true });
  }
  // They face the way their summoner does once beside it.
  for (const c of clonesOf(s, owner.id)) {
    const f = engaged(s, owner)[0];
    if (f && Math.abs(f.pos.x - c.pos.x) > 0.05) c.facing = f.pos.x > c.pos.x ? 1 : -1;
  }
}

/** The +2 a melee attack at `t` gets when a clone of the attacker's side stands next to `t` (never twice). */
export function cloneFlank(s: BattleState, a: Unit, t: Unit): number {
  for (const c of Object.values(s.units)) {
    if (!standingClone(c) || c.id === a.id || c.team !== a.team) continue;
    if (besideFoe(s, c.pos, t)) return CLONE.flank;
  }
  return 0;
}

/** The clones of a ninja that stand next to its target: they join its blow in a combo. */
export const comboClones = (s: BattleState, a: Unit, t: Unit): Unit[] => (a.clone ? [] : clonesOf(s, a.id).filter((c) => besideFoe(s, c.pos, t)));

/**
 * The clone that takes a blow aimed at its summoner: the nearest one (the blow struck a clone; the
 * real ninja stood where that clone was).
 */
export function cloneTakesBlow(s: BattleState, t: Unit): Unit | undefined {
  return clonesOf(s, t.id).sort((a, b) => dist(a.pos, t.pos) - dist(b.pos, t.pos))[0];
}

/** One die of a jutsu's dice ("2d8+3" → "1d8"): a clone's blow in a taijutsu combo (proposal). */
export const oneDieOf = (dice: string | undefined): string => {
  const m = dice?.match(/^\d+d(\d+)/);
  return m ? `1d${m[1]}` : CLONE.comboDice;
};
