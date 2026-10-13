// The battles of the river forest: where the party starts, who waits for it and how (a patrol in
// the stealth phase, a night raid on the hill camp, the hydra in the river). Missions and the
// battle demo build their setups from these.

import type { ShinobiCharacter, WeatherType } from '../types/shinobi';
import type { Difficulty } from '../types/mission';
import type { AiOrder, BattleSupplies, Pt, TimeOfDay, Trap } from './types';
import type { BattleSetup, EnemySetup } from './engine';

export type EncounterId = 'river_patrol' | 'cedar_rogues' | 'night_raid' | 'hydra';

export interface Encounter {
  id: EncounterId;
  mapId: string;
  time: TimeOfDay;
  stealth: boolean;
  /** Where the party's ninjas start, in order. */
  partyAt: Pt[];
  enemies: EnemySetup[];
  traps?: Trap[];
}

export const ENCOUNTERS: Record<EncounterId, Encounter> = {
  // Rogues guard the crossing: one walks the clearing, one paces the bridge, a hunter keeps the hill camp.
  river_patrol: {
    id: 'river_patrol',
    mapId: 'river_forest',
    time: 'day',
    stealth: true,
    partyAt: [
      { x: 6, z: 10 },
      { x: 7.5, z: 12.5 },
      { x: 4.5, z: 8.5 },
      { x: 8.5, z: 14.5 },
    ],
    enemies: [
      { kind: 'rogue', pos: { x: 20, z: 9 }, route: [{ x: 20, z: 9 }, { x: 23, z: 12 }, { x: 19.5, z: 15 }], look: 180 },
      { kind: 'rogue', pos: { x: 25.5, z: 8.3 }, route: [{ x: 25.5, z: 8.3 }, { x: 31, z: 8.3 }], look: 180 },
      { kind: 'hunter', pos: { x: 42, z: 6 }, route: [{ x: 40.5, z: 5 }, { x: 44, z: 8.5 }], look: 180 },
    ],
  },
  // Rogues on the cedar road: no hiding, a straight fight in the clearing.
  cedar_rogues: {
    id: 'cedar_rogues',
    mapId: 'river_forest',
    time: 'day',
    stealth: false,
    partyAt: [
      { x: 7, z: 10 },
      { x: 8, z: 12.5 },
      { x: 5.5, z: 8.5 },
      { x: 6, z: 14 },
    ],
    enemies: [
      { kind: 'rogue', pos: { x: 19, z: 9.5 } },
      { kind: 'rogue', pos: { x: 21, z: 13 } },
      { kind: 'raider', pos: { x: 22, z: 10.5 } },
    ],
  },
  // A night raid on the camp on the hill: raiders come up from the river and down from the lookout.
  night_raid: {
    id: 'night_raid',
    mapId: 'river_forest',
    time: 'night',
    stealth: false,
    partyAt: [
      { x: 43, z: 6.8 },
      { x: 46.6, z: 6.8 },
      { x: 43.6, z: 4 },
      { x: 46.2, z: 9 },
    ],
    enemies: [
      { kind: 'raider', pos: { x: 34, z: 12 } },
      { kind: 'raider', pos: { x: 35, z: 15.5 } },
      { kind: 'raider', pos: { x: 55, z: 9 } },
      { kind: 'jonin', pos: { x: 56.5, z: 12.5 } },
    ],
  },
  // The hydra rises from the river pool below the bridge.
  hydra: {
    id: 'hydra',
    mapId: 'river_forest',
    time: 'day',
    stealth: false,
    partyAt: [
      { x: 21, z: 13.5 },
      { x: 21.5, z: 16.5 },
      { x: 19, z: 11 },
      { x: 18.5, z: 15 },
    ],
    enemies: [{ kind: 'hydra', pos: { x: 28.4, z: 15.2 } }],
  },
};

export interface EncounterParty {
  character: ShinobiCharacter;
  controller?: 'player' | 'ai';
  aiOrder?: AiOrder;
}

/** Perimeter traps set at camp (explosive tags, bell wires), placed on the raiders' paths. */
export function campTraps(kinds: ('tag' | 'wire')[]): Trap[] {
  const spots: Pt[] = [
    { x: 38, z: 12.5 },
    { x: 52, z: 9.5 },
    { x: 38.5, z: 15 },
    { x: 51.5, z: 12 },
  ];
  return kinds.map((kind, i) => ({
    id: `camp_${kind}_${i}`,
    kind,
    pos: spots[i % spots.length],
    owner: 'party' as const,
    dc: 13,
    dice: kind === 'tag' ? '3d6' : '0',
    radius: kind === 'tag' ? 1.5 : 0.75,
  }));
}

/** A battle setup for an encounter with this party. */
export function encounterSetup(
  id: EncounterId,
  party: EncounterParty[],
  o: { seed: number; difficulty: Difficulty; weather?: WeatherType; supplies: BattleSupplies; partySurprised?: boolean; traps?: Trap[] },
): BattleSetup {
  const e = ENCOUNTERS[id];
  return {
    seed: o.seed,
    mapId: e.mapId,
    time: e.time,
    weather: o.weather ?? 'Clear',
    difficulty: o.difficulty,
    party: party.map((p, i) => ({ character: p.character, controller: p.controller, aiOrder: p.aiOrder, pos: e.partyAt[i % e.partyAt.length] })),
    enemies: e.enemies,
    stealth: e.stealth,
    partySurprised: o.partySurprised,
    supplies: o.supplies,
    traps: [...(e.traps ?? []), ...(o.traps ?? [])],
  };
}
