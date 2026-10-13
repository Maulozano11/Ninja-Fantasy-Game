// A party on the road: starting a mission, travelling legs and zones, and folding a battle's
// result back into the party (Tension, falls, soldier pills, effect durations).

import type { ShinobiCharacter } from '../types/shinobi';
import type { Difficulty, PartyState, RuleEvent, Supplies } from '../types/mission';
import { effectiveMaxHp } from './derived';
import { rollDice } from './dice';
import { EFFECTS, endBattle, hasEffect, leaveZone } from './effects';
import { changeExhaustion, changeHp, changeTension, giveEffect, returnToVillage, Step } from './ninja';
import { Dice, rngFor } from './rng';

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

/** One leg of the road: hours pass, and Bleeding ninjas lose 1d4. */
export function travelLeg(party: PartyState, nodeId: string, hours: number): { party: PartyState; events: RuleEvent[] } {
  const events: RuleEvent[] = [];
  let p = eachMember(
    party,
    (c) => {
      if (!hasEffect(c.effects, 'bleeding') || c.currentHp <= 0) return { character: c, events: [] };
      const dmg = rollDice(rngFor(party.progress.seed, 'leg', nodeId, c.id, 'bleeding'), '1d4').total;
      return changeHp(c, -dmg, 'Bleeding on the road');
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
}

export interface BattleResult {
  victory: boolean;
  members: BattleMemberResult[];
  xp?: number;
}

/**
 * After a battle: HP and chakra as they ended, Tension (+1 per critical taken and per fallen ally,
 * −1 per critical landed, at most ±2 from criticals, −1 for a victory), Fall aftermath and Grave
 * wounds, Crash and Exhaustion from soldier pills, and battle-counted effects tick down.
 */
export function applyBattleResult(party: PartyState, result: BattleResult, battleId: string): { party: PartyState; events: RuleEvent[] } {
  const events: RuleEvent[] = [];
  const fallen = result.members.filter((m) => m.fell).map((m) => m.id);
  const campNo = party.progress.campNo;
  const p = eachMember(
    party,
    (c) => {
      const r = result.members.find((m) => m.id === c.id);
      if (!r) return { character: c, events: [] };
      const dice: Dice = { rng: rngFor(party.progress.seed, 'battle', battleId, c.id), noRandomness: party.progress.noRandomness };
      const ev: RuleEvent[] = [];
      let ch: ShinobiCharacter = { ...c, currentHp: Math.max(0, Math.min(effectiveMaxHp(c), r.hp)), currentChakra: Math.max(0, Math.min(c.maxChakra, r.chakra)) };
      const step = (s: Step) => {
        ch = s.character;
        ev.push(...s.events);
      };

      if (r.fell) step(giveEffect(ch, 'fall_aftermath', 'Fell in battle', { campNo }));
      if (r.fellToCrit) step(giveEffect(ch, 'grave_wound', 'Dropped by a critical hit', { campNo }));

      const fromCrits = Math.max(-2, Math.min(2, (r.critsTaken ?? 0) - (r.critsLanded ?? 0)));
      const alliesFell = fallen.filter((id) => id !== c.id).length;
      const tension = fromCrits + alliesFell - (result.victory ? 1 : 0);
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
  return { party: p, events };
}

/** Back at the village: everyone is restored; the mission's progress resets. */
export function endMissionAtVillage(party: PartyState): { party: PartyState; events: RuleEvent[] } {
  const events: RuleEvent[] = [];
  const p = eachMember(party, returnToVillage, events);
  return { party: { ...p, progress: { ...p.progress, zone: 0, stopsTaken: [], campNo: 0, hoursSinceCamp: 0, hoursSpent: 0, revealedZones: [] } }, events };
}
