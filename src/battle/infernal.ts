// The Mirai's Path of the Infernal Fire in battle (docs/CLANS_DESIGN.md, the owner's numbers of
// 2026-10-29, D-T24): the Ember Armour (level 6), the Colossal Avatar (level 9) and the improved
// avatar (level 12). Pure and seeded like the rest of the engine; the avatar's art and cinematic are
// the screen's (components/battle).

import { addEffect, effectMods, hasEffect, removeEffect } from '../rules/effects';
import { infernalSteps } from '../rules/paths';
import type { AreaShape, AvatarStance, BattleEvent, BattleState, Hit, Pt, Unit } from './types';
import { cellKey, cellOf, dist } from './map';
import { damage, rollDiceExpr } from './combat';
import { cellsInArea } from './ground';

export const EMBER = 'ember_armour';
/** Its chakra (a bonus action too). */
export const EMBER_COST = 4;
export const EMBER_BLOW = '1d4';
export const EMBER_BURN = '1d6';

export const emberOn = (u: Unit): boolean => hasEffect(u.effects, EMBER) && !u.down;

/**
 * The ninja puts on the Ember Armour (bonus action, EMBER_COST chakra, 3 of its turns): in the
 * fighting, with the Path's step, its bonus action and chakra, not sealed. Putting it on again
 * renews it.
 */
export function emberArmour(s: BattleState, u: Unit, ev: BattleEvent[]): string | null {
  if (s.phase !== 'combat') return 'combatOnly';
  if (!infernalSteps(u.character).ember) return 'noPath';
  if (!u.turn.bonus) return 'noBonus';
  if (effectMods(u.effects).noJutsu) return 'chakraSealed';
  if (u.chakra < EMBER_COST) return 'noChakra';
  u.turn.bonus = false;
  u.chakra -= EMBER_COST;
  u.effects = addEffect(u.effects, EMBER, { source: 'Ember Armour' }).effects;
  ev.push({ t: 'chakra', unit: u.id, delta: -EMBER_COST, chakra: u.chakra, reason: EMBER });
  ev.push({ t: 'effect', unit: u.id, effect: EMBER, on: true });
  return null;
}

/** Fire resistance while it is on (combat.ts adjustDamage). */
export const resistsFire = (t: Unit): boolean => hasEffect(t.effects, EMBER);

/** A melee weapon blow by a ninja in the armour carries its fire (dealt after the blow); the avatar's spear, more (in place of it). */
export function emberBlow(a: Unit, h: Hit, roll: (expr: string, crit: boolean) => number): void {
  if (!h.melee) return;
  if (a.avatar?.stance === 'spear') h.ember = roll(a.avatar.plus ? SPEAR_BLOW_PLUS : SPEAR_BLOW, !!h.crit);
  else if (emberOn(a)) h.ember = roll(EMBER_BLOW, !!h.crit);
}

// --- the Colossal Avatar ---------------------------------------------------------------------

/** The numbers of the avatar (level 9) and the improved one (level 12), as the owner approved them. */
export const AVATAR = {
  cost: 10,
  turns: 3,
  tempHp: 15,
  magma: '1d6',
  shieldAc: 3,
  coverM: 3,
  guards: 1,
  blow: '2d6',
  throwM: 18,
  throwDice: '4d10',
  burnRounds: 1,
} as const;
export const AVATAR_PLUS = {
  cost: 12,
  turns: 4,
  tempHp: 30,
  magma: '2d6',
  shieldAc: 4,
  coverM: 4.5,
  guards: 2,
  blow: '3d6',
  throwM: 24,
  throwDice: '6d10',
  burnRounds: 2,
} as const;
const SPEAR_BLOW = AVATAR.blow;
const SPEAR_BLOW_PLUS = AVATAR_PLUS.blow;
export const numbersOf = (u: Unit) => (u.avatar?.plus ?? infernalSteps(u.character).plus ? AVATAR_PLUS : AVATAR);
/** How wide the spear's burning line is (m). */
export const THROW_WIDTH = 1.5;
/**
 * How long the ground stays magma where the avatar stepped (our proposal: the owner gave the
 * damage, not how long it lasts): the rest of the round and one more, like steam.
 */
export const MAGMA_ROUNDS = 2;
/** Reach of the shield's guard: a comrade beside the ninja. */
export const GUARD_REACH = 1.6;

export const avatarUp = (u: Unit): boolean => !!u.avatar && !u.down;

/**
 * The ninja summons its avatar (an action, once a mission): in the stance chosen, for its turns, with
 * temporary HP and the Ember Armour for as long as it stands.
 */
export function summonAvatar(s: BattleState, u: Unit, stance: AvatarStance, ev: BattleEvent[]): string | null {
  if (s.phase !== 'combat') return 'combatOnly';
  const steps = infernalSteps(u.character);
  if (!steps.colossal) return 'noPath';
  if (u.avatar) return 'avatarUp';
  if (u.avatarSpent) return 'avatarSpent';
  if (!u.turn.action) return 'noAction';
  if (effectMods(u.effects).noJutsu) return 'chakraSealed';
  const n = steps.plus ? AVATAR_PLUS : AVATAR;
  if (u.chakra < n.cost) return 'noChakra';
  u.turn.action = false;
  u.chakra -= n.cost;
  u.avatarSpent = true;
  u.avatar = { stance, turns: n.turns, plus: steps.plus, guards: n.guards };
  ev.push({ t: 'chakra', unit: u.id, delta: -n.cost, chakra: u.chakra, reason: 'colossal_avatar' });
  ev.push({ t: 'avatar', unit: u.id, on: true, stance, plus: steps.plus });
  if (u.tempHp < n.tempHp) u.tempHp = n.tempHp;
  // its armour lasts as long as it stands
  u.effects = addEffect(u.effects, EMBER, { source: 'Colossal Avatar', count: n.turns }).effects;
  ev.push({ t: 'effect', unit: u.id, effect: EMBER, on: true });
  // up from the ground at once
  if (u.cond.prone) {
    u.cond.prone = false;
    ev.push({ t: 'condition', unit: u.id, cond: 'prone', on: false });
  }
  return null;
}

/** The stance switch: a bonus action; the improved avatar's first one each turn is free. */
export function switchStance(s: BattleState, u: Unit, stance: AvatarStance, ev: BattleEvent[]): string | null {
  const a = u.avatar;
  if (!a || u.down) return 'noAvatar';
  if (a.stance === stance) return 'sameStance';
  if (a.plus && !a.freeSwitch) a.freeSwitch = true;
  else if (u.turn.bonus) u.turn.bonus = false;
  else return 'noBonus';
  a.stance = stance;
  ev.push({ t: 'stance', unit: u.id, stance });
  return null;
}

/** The spear's line, from the ninja toward `at`, its whole length. */
export function throwLine(u: Unit, at: Pt): AreaShape {
  const n = numbersOf(u);
  return { kind: 'line', origin: { ...u.pos }, dir: Math.atan2(at.z - u.pos.z, at.x - u.pos.x), length: n.throwM, width: THROW_WIDTH };
}

/** Why the throw can't be made now (null: it can): the spear stance, once a turn, its action. */
export function throwBlocker(u: Unit): string | null {
  if (!u.avatar || u.down) return 'noAvatar';
  if (u.avatar.stance !== 'spear') return 'notSpear';
  if (u.avatar.threw) return 'threwAlready';
  if (!u.turn.action) return 'noAction';
  return null;
}

/** AC the shield stance adds to its ninja (the armour's +2 comes on top, as an effect). */
export const shieldAc = (t: Unit): number => (t.avatar && !t.down && t.avatar.stance === 'shield' ? (t.avatar.plus ? AVATAR_PLUS.shieldAc : AVATAR.shieldAc) : 0);

/** A comrade within the shield's reach has half cover (not the ninja itself: it has the shield's AC). */
export function shieldCover(s: BattleState, t: Unit): boolean {
  return Object.values(s.units).some((o) => o.id !== t.id && o.team === t.team && o.avatar?.stance === 'shield' && !o.down && dist(o.pos, t.pos) <= (o.avatar.plus ? AVATAR_PLUS.coverM : AVATAR.coverM) + 0.05);
}

/** Immune to being knocked down or pushed while its avatar stands. */
export const unshakable = (u: Unit): boolean => avatarUp(u);

/** The avatar beside the blow's target whose shield can take it (null: none). */
export function guardFor(s: BattleState, h: Hit): Unit | null {
  const t = s.units[h.unit];
  if (!t || s.phase !== 'combat' || !h.aimed || h.amount <= 0 || h.unblockable || h.interposedFor) return null;
  return (
    Object.values(s.units).find(
      (r) => r.id !== t.id && r.team === t.team && r.avatar?.stance === 'shield' && !r.down && r.avatar.guards > 0 && !r.cond.surprised && !(h.guardDeclined ?? []).includes(r.id) && dist(r.pos, t.pos) <= GUARD_REACH,
    ) ?? null
  );
}

/** The shield takes the blow: the damage is cancelled completely (the owner, 2026-10-29). */
export function guard(r: Unit, h: Hit, ev: BattleEvent[]): void {
  r.avatar!.guards -= 1;
  ev.push({ t: 'avatarGuard', unit: r.id, for: h.unit });
}

/** Its ninja's turn begins: the guards come back, and the free switch and the throw are there again. */
export function avatarTurnStarts(u: Unit): void {
  if (!u.avatar) return;
  const n = u.avatar.plus ? AVATAR_PLUS : AVATAR;
  u.avatar.guards = n.guards;
  u.avatar.freeSwitch = false;
  u.avatar.threw = false;
}

/** Its ninja's turn ends: one of the avatar's turns is gone; with the last it fades, and so does its armour. */
export function avatarTurnEnds(u: Unit, ev: BattleEvent[]): void {
  const a = u.avatar;
  if (!a) return;
  a.turns -= 1;
  if (a.turns > 0 && !u.down) return;
  u.avatar = undefined;
  ev.push({ t: 'avatar', unit: u.id, on: false, stance: a.stance, plus: a.plus });
  if (hasEffect(u.effects, EMBER) && u.effects.find((e) => e.id === EMBER)?.source === 'Colossal Avatar') {
    u.effects = removeEffect(u.effects, EMBER);
    ev.push({ t: 'effect', unit: u.id, effect: EMBER, on: false });
  }
}

// --- magma ---------------------------------------------------------------------------------

/** Turns ground to magma (or sets a line burning) for `rounds`; returns the new cells. */
export function setMagma(s: BattleState, cells: string[], by: string, dice: string, rounds: number, ev: BattleEvent[]): string[] {
  const fresh = cells.filter((k) => !s.magma?.[k]);
  s.magma = { ...(s.magma ?? {}) };
  for (const k of cells) s.magma[k] = { rounds: Math.max(s.magma[k]?.rounds ?? 0, rounds), by, dice };
  if (fresh.length) ev.push({ t: 'ground', kind: 'magma', cells: fresh, on: true, by });
  return fresh;
}

/** The avatar's step leaves magma under it. */
export function magmaStep(s: BattleState, u: Unit, p: Pt, ev: BattleEvent[]): void {
  if (!avatarUp(u)) return;
  setMagma(s, [cellKey(cellOf(p))], u.id, numbersOf(u).magma, MAGMA_ROUNDS, ev);
}

/** The spear's line burns. */
export function burnLine(s: BattleState, u: Unit, area: AreaShape, ev: BattleEvent[]): void {
  const n = numbersOf(u);
  setMagma(s, cellsInArea(s, area).map(cellKey), u.id, n.magma, n.burnRounds + 1, ev);
}

export const magmaAt = (s: BattleState, p: Pt) => s.magma?.[cellKey(cellOf(p))];

/**
 * Magma (or the burning line) burns whoever walks in or starts a turn there: its dice in fire, no
 * save. Not its maker nor the maker's side (our proposal: it is the enemy's ground to fear).
 */
export function magmaBurns(s: BattleState, u: Unit, ev: BattleEvent[]): void {
  const m = magmaAt(s, u.pos);
  if (!m || u.down) return;
  const maker = s.units[m.by];
  if (m.by === u.id || (maker && maker.team === u.team)) return;
  ev.push({ t: 'note', key: 'magmaBurns', params: { name: u.name } });
  damage(s, u, rollDiceExpr(s, m.dice), 'Fire', { source: m.by }, ev);
}

/** A new round: magma cools where its rounds ran out. */
export function tickMagma(s: BattleState, ev: BattleEvent[]): void {
  if (!s.magma) return;
  const cold: string[] = [];
  const next: BattleState['magma'] = {};
  for (const [k, v] of Object.entries(s.magma)) {
    if (v.rounds > 1) next[k] = { ...v, rounds: v.rounds - 1 };
    else cold.push(k);
  }
  s.magma = next;
  if (cold.length) ev.push({ t: 'ground', kind: 'magma', cells: cold, on: false });
}
