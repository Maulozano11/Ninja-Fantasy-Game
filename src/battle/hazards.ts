// Traps, explosions and what jutsu do to the ground around them: fire burns bushes and trees, wind
// cuts the foliage, explosive barrels and tags blow up (and set each other off), lightning runs
// through the water, blasts dent metal structures. These return the hits to apply; the engine
// applies them.

import type { Advantage } from '../rules/checks';
import type { AreaShape, BattleEvent, BattleState, DamageType, Hit, Pt, Trap, Unit } from './types';
import { dist, fullCoverBetween, getMap, propRules, waterAtPt } from './map';
import { inArea } from './jutsu';
import { rollDiceExpr, savingThrow } from './combat';
import { hitStructuresIn } from './structures';

/** Explosive barrels and tags: 3d6 fire in 1.5 m, DEX save for half. */
export const BARREL = { dice: '3d6', radius: 1.5, dc: 13 };
/**
 * An explosive tag (an item): thrown up to `range` (DEX save against `dc`), or hidden on the ground up
 * to `plant` away (the save is against the hider's jutsu DC, as the old jutsu's was).
 */
export const TAG = { dice: '3d6', radius: 1.5, dc: 13, range: 9, plant: 4.5 };
/** A trap goes off when someone of the other team steps this close. */
const TRAP_TRIGGER = 0.75;
/** Lightning in the water reaches everyone in the water this far away. */
export const ELECTRIFY_RADIUS = 4.5;

export const onMapUnits = (s: BattleState): Unit[] => Object.values(s.units).filter((u) => u.down !== 'dead' && u.down !== 'fled' && u.down !== 'ko');

/** Where a unit is hit by areas: hydra bodies are big. */
const padOf = (u: Unit): number => (u.bulk ? u.bulk * 0.7 : 0.25);

/**
 * Units inside an area (a severed head's stump counts too: fire, lightning and blasts seal it).
 * From `origin` (where it bursts or the caster), a metal wall shelters whoever is behind it.
 */
export function unitsInArea(s: BattleState, area: AreaShape, exclude: string[] = [], origin?: Pt): Unit[] {
  return onMapUnits(s).filter((u) => !exclude.includes(u.id) && inArea(area, u.pos, padOf(u)) && !(origin && fullCoverBetween(s, origin, u.pos)));
}

/** A trap of the other team right where a unit steps. */
export function trapAt(s: BattleState, u: Unit, p: Pt): Trap | undefined {
  return s.traps.find((t) => t.owner !== u.team && dist(t.pos, p) <= TRAP_TRIGGER);
}

/**
 * A trap goes off: a tag explodes, a wire rings the camp's bells (the engine raises the alarm).
 * Returns the hits of the blast.
 */
export function springTrap(s: BattleState, trap: Trap, ev: BattleEvent[]): Hit[] {
  s.traps = s.traps.filter((t) => t.id !== trap.id);
  ev.push({ t: 'trap', trap, on: false });
  if (trap.kind === 'wire') {
    ev.push({ t: 'noise', at: trap.pos, radius: 30, source: 'bells' });
    return [];
  }
  return explode(s, trap.pos, trap.radius, trap.dice, trap.dc, `trap:${trap.id}`, ev);
}

/**
 * An explosion: everyone in the radius makes a DEX save (half on a success), stumps are sealed,
 * bushes burn, and other barrels and tags in reach go off too.
 */
export function explode(s: BattleState, at: Pt, radius: number, dice: string, dc: number, source: string, ev: BattleEvent[], seen = new Set<string>()): Hit[] {
  ev.push({ t: 'explode', at, radius });
  const area: AreaShape = { kind: 'circle', center: at, radius };
  const amount = rollDiceExpr(s, dice);
  const hits: Hit[] = [];
  for (const u of unitsInArea(s, area, [], at)) hits.push(saveHit(s, u, 'dex', dc, amount, 'Fire', true, source, 'explosion', { explosion: true }, ev));
  hitStructuresIn(s, area, amount, ev);
  hits.push(...groundEffects(s, area, 'Fire', ev, seen));
  return hits;
}

/**
 * One unit's save against a jutsu or a blast: full damage on a failure, half (or none) on a
 * success. `adv` is the jutsu's own (Pursuing Flame is saved against with disadvantage).
 */
export function saveHit(
  s: BattleState,
  u: Unit,
  ab: 'dex' | 'con' | 'wis' | 'str' | 'int' | 'cha',
  dc: number,
  amount: number,
  type: DamageType,
  half: boolean,
  source: string | undefined,
  what: string,
  extra: Partial<Hit>,
  ev: BattleEvent[],
  adv: Advantage = 'none',
): Hit {
  if (u.head?.severed) return { unit: u.id, amount: 0, type, source, what, ...extra, effect: undefined };
  const roll = savingThrow(s, u, ab, dc, adv);
  ev.push({ t: 'save', unit: u.id, what, roll, ab });
  const got = roll.success ? (half ? Math.floor(amount / 2) : 0) : amount;
  return { unit: u.id, amount: got, type, source, what, ...extra, effect: roll.success ? undefined : extra.effect };
}

/**
 * What an area does to the props in it: fire burns flammable props (no more cover or hiding) and
 * sets off explosive barrels and tags, lightning sets them off too, wind cuts bushes and grass.
 */
export function groundEffects(s: BattleState, area: AreaShape, type: DamageType | 'Wind', ev: BattleEvent[], seen = new Set<string>(), clearFoliage = false): Hit[] {
  const hits: Hit[] = [];
  const map = getMap(s.mapId);
  const fiery = type === 'Fire' || type === 'Lightning';
  map.props.forEach((p, i) => {
    const st = s.props[i];
    if (!st || st.destroyed || st.fled) return;
    const rules = propRules(p);
    if (!inArea(area, p, rules.radius)) return;
    if (rules.explosive && fiery && !seen.has(`prop:${i}`)) {
      seen.add(`prop:${i}`);
      st.destroyed = true;
      ev.push({ t: 'prop', prop: i, state: 'exploded' });
      hits.push(...explode(s, { x: p.x, z: p.z }, BARREL.radius, BARREL.dice, BARREL.dc, `prop:${i}`, ev, seen));
    } else if (rules.flammable && type === 'Fire' && waterAtPt(s, p) === 0) {
      st.destroyed = true;
      ev.push({ t: 'prop', prop: i, state: 'burnt' });
    } else if (clearFoliage && rules.hideSpot) {
      st.destroyed = true;
      ev.push({ t: 'prop', prop: i, state: 'cut' });
    }
  });
  if (fiery) {
    for (const t of [...s.traps]) {
      if (t.kind !== 'tag' || seen.has(t.id) || !inArea(area, t.pos, 0.3)) continue;
      seen.add(t.id);
      s.traps = s.traps.filter((x) => x.id !== t.id);
      ev.push({ t: 'trap', trap: t, on: false });
      hits.push(...explode(s, t.pos, t.radius, t.dice, t.dc, `trap:${t.id}`, ev, seen));
    }
  }
  // Hiding places that burned or were cut no longer hide anyone.
  for (const u of onMapUnits(s)) if (u.cond.hidden !== undefined && inArea(area, u.pos)) u.cond.hidden = undefined;
  return hits;
}

/**
 * Lightning that lands in water runs through it: everyone else standing in water nearby makes a
 * DEX save against half the damage (not behind a metal wall from where it landed).
 */
export function electrify(s: BattleState, points: Pt[], amount: number, dc: number, source: string, already: string[], ev: BattleEvent[]): Hit[] {
  const wet = points.filter((p) => waterAtPt(s, p) > 0);
  if (!wet.length || amount <= 0) return [];
  for (const p of wet) ev.push({ t: 'electrified', at: p, radius: ELECTRIFY_RADIUS });
  const hits: Hit[] = [];
  for (const u of onMapUnits(s)) {
    if (already.includes(u.id) || waterAtPt(s, u.pos) === 0) continue;
    if (!wet.some((p) => dist(p, u.pos) <= ELECTRIFY_RADIUS + (u.bulk ?? 0) && !fullCoverBetween(s, p, u.pos))) continue;
    hits.push(saveHit(s, u, 'dex', dc, Math.floor(amount / 2), 'Lightning', true, source, 'electrified water', {}, ev));
  }
  return hits;
}

/** A thrown explosive tag (the party's supplies): it seals a hydra stump like fire does. */
export function throwTag(s: BattleState, u: Unit, at: Pt, ev: BattleEvent[]): Hit[] {
  return explode(s, at, TAG.radius, TAG.dice, TAG.dc, u.id, ev);
}

/**
 * An explosive tag hidden on the ground (the party's supplies; until 2026-10-21 the jutsu "Explosive
 * Tag Ambush"): it waits, unseen by the other team, and blows up when one of them steps on it, or
 * when fire or lightning reaches it. Its save is the hider's jutsu DC, as the jutsu's was, so the item
 * does what the jutsu did.
 */
export function plantTag(s: BattleState, u: Unit, at: Pt, ev: BattleEvent[]): Trap {
  const trap: Trap = { id: `tag_${s.tick}_${u.id}_${s.traps.length}`, kind: 'tag', pos: { ...at }, owner: u.team, dc: u.saveDC, dice: TAG.dice, radius: TAG.radius };
  s.traps.push(trap);
  ev.push({ t: 'trap', trap, on: true });
  return trap;
}
