// A party on the road: starting a mission, travelling legs and zones, and folding a battle's
// result back into the party (Tension, falls, death saves, soldier pills, effect durations).

import type { ShinobiCharacter } from '../types/shinobi';
import type { Difficulty, PartyState, RuleEvent, StatusEffect, Supplies, SupplyId } from '../types/mission';
import { effectiveMaxHp } from './derived';
import { rollDice } from './dice';
import { addEffect, EFFECTS, endBattle, hasEffect, leaveZone } from './effects';
import { changeChakra, changeExhaustion, changeHp, changeTension, giveEffect, isUnconscious, returnToVillage, Step } from './ninja';
import type { Outcome } from './rest';
import { Dice, rngFor, rollDie } from './rng';

export const DEFAULT_SUPPLIES: Supplies = {
  rations: 8,
  campKits: 2,
  bandages: 3,
  antidotes: 1,
  soldierPills: 2,
  explosiveTags: 2,
  wireRolls: 1,
};

export function newMission(
  members: ShinobiCharacter[],
  opts: { seed: number; difficulty?: Difficulty; deadlineHours?: number; supplies?: Partial<Supplies>; leaderId?: string; noRandomness?: boolean },
): PartyState {
  return {
    members,
    dead: [],
    supplies: { ...DEFAULT_SUPPLIES, ...opts.supplies },
    bonds: {},
    leaderId: opts.leaderId ?? members[0]?.id ?? '',
    progress: {
      seed: opts.seed >>> 0,
      difficulty: opts.difficulty ?? 'normal',
      zone: 0,
      stopsTaken: [],
      campNo: 0,
      hoursSinceCamp: 0,
      hoursSpent: 0,
      deadlineHours: opts.deadlineHours,
      ambushCounter: 0,
      noRandomness: opts.noRandomness ?? false,
      revealedZones: [],
    },
  };
}

function eachMember(party: PartyState, f: (c: ShinobiCharacter) => Step, events: RuleEvent[]): PartyState {
  return {
    ...party,
    members: party.members.map((m) => {
      const r = f(m);
      events.push(...r.events);
      return r.character;
    }),
  };
}

const same = (c: ShinobiCharacter): Step => ({ character: c, events: [] });

/** On their feet: above 0 HP and not knocked out by Exhaustion. */
export const isStanding = (c: ShinobiCharacter): boolean => c.currentHp > 0 && !isUnconscious(c);

/** One leg of the road: hours pass, and Bleeding ninjas lose 1d4 (never below 1 HP on the road). */
export function travelLeg(party: PartyState, nodeId: string, hours: number): { party: PartyState; events: RuleEvent[] } {
  const events: RuleEvent[] = [];
  let p = eachMember(
    party,
    (c) => {
      if (!hasEffect(c.effects, 'bleeding') || c.currentHp <= 1) return same(c);
      const dmg = rollDice(rngFor(party.progress.seed, 'leg', nodeId, c.id, 'bleeding'), '1d4').total;
      return changeHp(c, -Math.min(dmg, c.currentHp - 1), 'Bleeding on the road');
    },
    events,
  );
  p = { ...p, progress: { ...p.progress, hoursSpent: p.progress.hoursSpent + hours, hoursSinceCamp: p.progress.hoursSinceCamp + hours } };
  return { party: p, events };
}

/** Into the next zone: effects that last the zone end, and scouted traps show. */
export function enterNextZone(party: PartyState): { party: PartyState; events: RuleEvent[] } {
  const events: RuleEvent[] = [];
  let p = eachMember(
    party,
    (c) => {
      const r = leaveZone(c.effects);
      return { character: { ...c, effects: r.effects }, events: r.expired.map((e) => ({ type: 'effect' as const, who: c.id, effect: e, change: 'expired' as const, reason: 'Left the zone' })) };
    },
    events,
  );
  const zone = p.progress.zone + 1;
  p = { ...p, progress: { ...p.progress, zone } };
  if (p.progress.revealedZones.includes(zone)) {
    p = eachMember(p, (c) => giveEffect(c, 'open_eyes', 'Scouted the night before', { campNo: p.progress.campNo }), events);
  }
  return { party: p, events };
}

/** What a battle did to one party member, for folding it back into the party. */
export interface BattleMemberResult {
  id: string;
  hp: number;
  chakra: number;
  critsTaken?: number;
  critsLanded?: number;
  pillsTaken?: number;
  /** Dropped to 0 HP during the battle (by a critical hit, for a Grave wound). */
  fell?: boolean;
  fellToCrit?: boolean;
  /** Died during the battle (Legend only: failed death saves). */
  died?: boolean;
  /** Effects as the battle ended, for battles that track them; they replace the ninja's own. */
  effects?: StatusEffect[];
  /** Tension gained in the battle itself (failed saves against fear, such as the hydra's roar). */
  tension?: number;
}

export interface BattleResult {
  victory: boolean;
  members: BattleMemberResult[];
  xp?: number;
}

export interface BattleAftermath {
  party: PartyState;
  events: RuleEvent[];
  /** Nobody was left standing at the end. */
  wholePartyFell: boolean;
  /** Legend: the whole party died, and the campaign starts again. */
  gameOver: boolean;
}

/**
 * 5e death saves rolled until the end: 10 or more is a success, a natural 1 counts as two
 * failures and a natural 20 wakes the ninja with 1 HP. Three successes: stable; three failures:
 * dead. With the no-randomness mode the d20 counts as 10, so the ninja always stabilizes.
 */
export function rollDeathSaves(dice: Dice, disadvantage = false): { result: 'stable' | 'revived' | 'dead'; rolls: number[] } {
  if (dice.noRandomness) return { result: 'stable', rolls: [10, 10, 10] };
  let ok = 0;
  let bad = 0;
  const rolls: number[] = [];
  while (ok < 3 && bad < 3) {
    const first = rollDie(dice.rng, 20);
    const d20 = disadvantage ? Math.min(first, rollDie(dice.rng, 20)) : first;
    rolls.push(d20);
    if (d20 === 20) return { result: 'revived', rolls };
    if (d20 === 1) bad += 2;
    else if (d20 >= 10) ok += 1;
    else bad += 1;
  }
  return { result: ok >= 3 ? 'stable' : 'dead', rolls };
}

/** The dead leave the party (a new leader takes over if needed). */
function bury(party: PartyState, ids: ReadonlySet<string>): PartyState {
  if (!ids.size) return party;
  const members = party.members.filter((m) => !ids.has(m.id));
  const dead = [...party.dead, ...party.members.filter((m) => ids.has(m.id))];
  const leaderId = members.some((m) => m.id === party.leaderId) ? party.leaderId : members[0]?.id ?? party.leaderId;
  return { ...party, members, dead, leaderId };
}

/** A lost ambush in Story or Normal: half of each supply is lost (rounded down). */
function loseHalfSupplies(party: PartyState, events: RuleEvent[]): PartyState {
  const supplies = { ...party.supplies };
  for (const item of Object.keys(supplies) as SupplyId[]) {
    const lost = Math.floor(supplies[item] / 2);
    if (!lost) continue;
    supplies[item] -= lost;
    events.push({ type: 'supplies', item, delta: -lost, left: supplies[item], reason: 'Lost in the ambush' });
  }
  return { ...party, supplies };
}

/** Effect changes between two lists, as events (for battles that report effects). */
function effectDiff(who: string, before: readonly StatusEffect[] = [], after: readonly StatusEffect[] = []): RuleEvent[] {
  const had = new Set(before.map((e) => e.id));
  const has = new Set(after.map((e) => e.id));
  return [
    ...after.filter((e) => !had.has(e.id)).map((e) => ({ type: 'effect' as const, who, effect: e.id, change: 'added' as const, reason: e.source ?? 'In battle' })),
    ...before.filter((e) => !has.has(e.id)).map((e) => ({ type: 'effect' as const, who, effect: e.id, change: 'removed' as const, reason: 'In battle' })),
  ];
}

/**
 * After a battle: HP and chakra as they ended, Tension (+1 per critical taken and per fallen ally,
 * −1 per critical landed, at most ±2 from criticals, plus what the battle added, −1 for a victory), Fall aftermath and Grave
 * wounds, Crash and Exhaustion from soldier pills, and battle-counted effects tick down.
 *
 * Then the fallen: if anyone is still standing, they are stabilized and wake up with 1 HP. If
 * nobody is, Legend rolls death saves for each one (Fall aftermath from an earlier fall gives
 * disadvantage) and the dead leave the party; Story and Normal wake everyone up with 1 HP, and a
 * lost ambush (`opts.ambush`) costs half of the supplies. In Story and Normal a lost battle that
 * is not an ambush repeats from the node's entry instead: the caller restores its snapshot.
 */
export function applyBattleResult(party: PartyState, result: BattleResult, battleId: string, opts: { ambush?: boolean } = {}): BattleAftermath {
  const events: RuleEvent[] = [];
  const fallen = result.members.filter((m) => m.fell || m.died).map((m) => m.id);
  const campNo = party.progress.campNo;
  const fellBefore = new Set(party.members.filter((m) => hasEffect(m.effects, 'fall_aftermath')).map((m) => m.id));
  let p = eachMember(
    party,
    (c) => {
      const r = result.members.find((m) => m.id === c.id);
      if (!r) return same(c);
      if (r.died) return { character: { ...c, currentHp: 0 }, events: [{ type: 'died', who: c.id }] };
      const dice: Dice = { rng: rngFor(party.progress.seed, 'battle', battleId, c.id), noRandomness: party.progress.noRandomness };
      const ev: RuleEvent[] = [];
      let ch: ShinobiCharacter = { ...c, effects: r.effects ?? c.effects };
      if (r.effects) ev.push(...effectDiff(c.id, c.effects, r.effects));
      ch = { ...ch, currentHp: Math.max(0, Math.min(effectiveMaxHp(ch), r.hp)), currentChakra: Math.max(0, Math.min(ch.maxChakra, r.chakra)) };
      if (ch.currentHp !== c.currentHp) ev.push({ type: 'hp', who: c.id, delta: ch.currentHp - c.currentHp, hp: ch.currentHp, reason: 'Battle' });
      if (ch.currentChakra !== c.currentChakra) ev.push({ type: 'chakra', who: c.id, delta: ch.currentChakra - c.currentChakra, chakra: ch.currentChakra, reason: 'Battle' });
      const step = (s: Step) => {
        ch = s.character;
        ev.push(...s.events);
      };

      if (r.fell) step(giveEffect(ch, 'fall_aftermath', 'Fell in battle', { campNo }));
      if (r.fellToCrit) step(giveEffect(ch, 'grave_wound', 'Dropped by a critical hit', { campNo }));

      const fromCrits = Math.max(-2, Math.min(2, (r.critsTaken ?? 0) - (r.critsLanded ?? 0)));
      const alliesFell = fallen.filter((id) => id !== c.id).length;
      const tension = fromCrits + alliesFell + (r.tension ?? 0) - (result.victory ? 1 : 0);
      if (tension) step(changeTension(ch, tension, result.victory ? 'Battle won' : 'Battle lost', dice, campNo));

      const pills = r.pillsTaken ?? 0;
      if (pills > 0) {
        const before = ch.pillsSinceCamp ?? 0;
        ch = { ...ch, pillsSinceCamp: before + pills };
        step(giveEffect(ch, 'crash', 'Soldier pill wore off', { campNo }));
        const extra = Math.max(0, before + pills - 1) - Math.max(0, before - 1);
        if (extra) step(changeExhaustion(ch, extra, 'Too many soldier pills'));
      }

      const tick = endBattle(ch.effects);
      ch = { ...ch, effects: tick.effects };
      for (const id of tick.expired) {
        ev.push({ type: 'effect', who: c.id, effect: id, change: 'expired', reason: 'End of battle' });
        if (id === 'gates_open') step(changeExhaustion(ch, 1, `${EFFECTS.gates_open.name} closed`));
      }
      return { character: ch, events: ev };
    },
    events,
  );
  p = bury(p, new Set(result.members.filter((m) => m.died).map((m) => m.id)));

  const wholePartyFell = !p.members.some(isStanding);
  if (!wholePartyFell) {
    p = eachMember(p, (c) => (c.currentHp > 0 ? same(c) : changeHp(c, 1, 'Stabilized by the party')), events);
  } else if (p.progress.difficulty === 'legend') {
    const died = new Set<string>();
    p = eachMember(
      p,
      (c) => {
        if (c.currentHp > 0) return same(c);
        const saves = rollDeathSaves({ rng: rngFor(p.progress.seed, 'battle', battleId, c.id, 'death'), noRandomness: p.progress.noRandomness }, fellBefore.has(c.id));
        const ev: RuleEvent[] = [{ type: 'death_saves', who: c.id, rolls: saves.rolls, result: saves.result }];
        if (saves.result === 'dead') {
          died.add(c.id);
          return { character: c, events: [...ev, { type: 'died', who: c.id }] };
        }
        const h = changeHp(c, 1, saves.result === 'revived' ? 'A natural 20 on a death save' : 'Stable: wakes up later');
        return { character: h.character, events: [...ev, ...h.events] };
      },
      events,
    );
    p = bury(p, died);
  } else {
    p = eachMember(p, (c) => (c.currentHp > 0 ? same(c) : changeHp(c, 1, 'Woke up after the defeat')), events);
    if (opts.ambush) p = loseHalfSupplies(p, events);
  }
  return { party: p, events, wholePartyFell, gameOver: p.members.length === 0 };
}

/**
 * Prototype stand-in until the party battle engine: the old battle screen fights with one ninja,
 * so the others hold the flanks off-screen. Each loses 10–35 % of max HP (times `threat`, never
 * below 1 HP) and 10–35 % of max chakra, may take or land a critical, and may come back Bleeding
 * (or Poisoned by a venomous beast).
 */
export function flankWear(
  party: PartyState,
  battleId: string,
  fighters: readonly string[],
  opts: { threat?: number; venom?: boolean } = {},
): BattleMemberResult[] {
  const threat = opts.threat ?? 1;
  const campNo = party.progress.campNo;
  return party.members
    .filter((m) => !fighters.includes(m.id) && isStanding(m))
    .map((m) => {
      const rng = rngFor(party.progress.seed, 'flank', battleId, m.id);
      const hpLoss = Math.round(effectiveMaxHp(m) * (0.1 + 0.25 * rng()) * threat);
      const chakraUse = Math.round(m.maxChakra * (0.1 + 0.25 * rng()));
      const critsTaken = rng() < 0.15 ? 1 : 0;
      const critsLanded = rng() < 0.2 ? 1 : 0;
      let effects: StatusEffect[] = [...(m.effects ?? [])];
      if (rng() < 0.2 * threat) effects = addEffect(effects, 'bleeding', { source: 'Cut on the flank' }).effects;
      if (opts.venom && rng() < 0.35) effects = addEffect(effects, 'poisoned', { campNo, source: 'Venom' }).effects;
      return { id: m.id, hp: Math.max(1, m.currentHp - hpLoss), chakra: Math.max(0, m.currentChakra - chakraUse), critsTaken, critsLanded, effects };
    });
}

/**
 * A soldier pill: +2d6 chakra now (prototype: taken before the battle; in the new battle engine it
 * is a bonus action). The battle result counts it, for Crash and the Exhaustion of extra pills.
 * `nth` numbers the pills this ninja took for this battle, so each one rolls its own dice.
 */
export function takeSoldierPill(party: PartyState, who: string, battleId: string, nth = 0): Outcome<null> {
  const c = party.members.find((m) => m.id === who);
  if (!c) return { ok: false, reason: 'Unknown ninja' };
  if (party.supplies.soldierPills < 1) return { ok: false, reason: 'No soldier pills left' };
  if (c.currentChakra >= c.maxChakra) return { ok: false, reason: 'Already at full chakra' };
  const gain = rollDice(rngFor(party.progress.seed, 'pill', battleId, who, nth), '2d6').total;
  const left = party.supplies.soldierPills - 1;
  const g = changeChakra(c, gain, 'Soldier pill');
  return {
    ok: true,
    party: { ...party, supplies: { ...party.supplies, soldierPills: left }, members: party.members.map((m) => (m.id === who ? g.character : m)) },
    state: null,
    events: [{ type: 'supplies', item: 'soldierPills', delta: -1, left, reason: `Soldier pill for ${c.name}` }, ...g.events],
  };
}

/** Back at the village: everyone is restored; the mission's progress resets. */
export function endMissionAtVillage(party: PartyState): { party: PartyState; events: RuleEvent[] } {
  const events: RuleEvent[] = [];
  const p = eachMember(party, returnToVillage, events);
  return { party: { ...p, progress: { ...p.progress, zone: 0, stopsTaken: [], campNo: 0, hoursSinceCamp: 0, hoursSpent: 0, revealedZones: [] } }, events };
}
