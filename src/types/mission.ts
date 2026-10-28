// Types for missions: status effects, skills, supplies and the mission state a party carries
// from battle to battle. The rules live in src/rules/ (docs/MISSION_DESIGN.md).

import type { ShinobiCharacter } from './shinobi';

/** How long a status effect lasts (R, B, Z, C, T, M, P in the design doc). */
export type DurationKind = 'rounds' | 'battles' | 'zone' | 'untilCamp' | 'untilTreated' | 'mission' | 'permanent';

export type EffectId =
  // buffs
  | 'well_fed'
  | 'sharpened'
  | 'centered_chakra'
  | 'watchful'
  | 'open_eyes'
  | 'hidden_in_mist'
  | 'gates_open'
  | 'shrine_blessing'
  | 'warding_seal'
  | 'wood_skin'
  | 'comrades_bond'
  | 'encouraged'
  | 'will_of_fire'
  // debuffs
  | 'bleeding'
  | 'burning'
  | 'frozen'
  | 'missing_arm'
  | 'missing_eye'
  | 'missing_leg'
  | 'implant_wood_arm'
  | 'implant_eye'
  | 'implant_steel_leg'
  | 'chakra_sealed'
  | 'confused'
  | 'marked'
  | 'poisoned'
  | 'wounded_leg'
  | 'numb'
  | 'jolted'
  | 'hungry'
  | 'crash'
  | 'fever'
  | 'fall_aftermath'
  | 'shrine_curse'
  | 'breakdown'
  | 'grave_wound';

/** One effect on a character. Plain data, so it saves and travels to a server as is. */
export interface StatusEffect {
  id: EffectId;
  /** Rounds or battles left, for effects that count them. */
  remaining?: number;
  /** Camp number when an until-camp effect was gained; it expires on the morning after a later camp. */
  sinceCamp?: number;
  /** Extra detail: the element of a Warding seal, the kind of Breakdown… */
  detail?: string;
  /** Who or what caused it, for the log. */
  source?: string;
}

export type BreakdownKind = 'panic' | 'paranoia' | 'blind_rage' | 'despair';

export type SkillId =
  | 'athletics'
  | 'acrobatics'
  | 'stealth'
  | 'ninja_tools'
  | 'perception'
  | 'insight'
  | 'survival'
  | 'medicine'
  | 'investigation'
  | 'persuasion'
  | 'intimidation'
  | 'deception';

/** Values a ninja can hold as their conviction (the first one is the main value). */
export type ConvictionValue = 'protect_innocents' | 'village_loyalty' | 'complete_mission' | 'clan_honour' | 'protect_comrades' | 'seek_truth';

export type Difficulty = 'story' | 'normal' | 'legend';

/** Who plays a character: this device's player, another player on this device, a remote player or the AI. */
export type Controller = { kind: 'local'; player: number } | { kind: 'remote'; player: string } | { kind: 'ai' };

/** The party's shared backpack. */
export interface Supplies {
  rations: number;
  campKits: number;
  bandages: number;
  antidotes: number;
  soldierPills: number;
  explosiveTags: number;
  wireRolls: number;
}
export type SupplyId = keyof Supplies;

/** Where a party is in a mission, kept between battles and in the save. */
export interface MissionProgress {
  /** Dice seed: every roll derives from it plus the ids of what is rolled. */
  seed: number;
  difficulty: Difficulty;
  /** Zero-based zone index. */
  zone: number;
  /** Zones where the party already took its short stop. */
  stopsTaken: number[];
  /** Camps held so far in this mission. */
  campNo: number;
  /** Hours spent on the road since the last camp (raise the night danger when there is no deadline). */
  hoursSinceCamp: number;
  /** Total hours spent in the mission. */
  hoursSpent: number;
  /** Deadline in hours, only in some missions. */
  deadlineHours?: number;
  /** Ambush % added up so far, for the no-randomness mode counter. */
  ambushCounter: number;
  noRandomness: boolean;
  /** Zones whose traps were revealed by scouting. */
  revealedZones: number[];
}

/** A party on a mission: its ninjas, the shared backpack, the bonds between them and the progress. */
export interface PartyState {
  members: ShinobiCharacter[];
  /** Ninjas who died in this mission (only in Legend), for the Chronicle. */
  dead: ShinobiCharacter[];
  supplies: Supplies;
  /** Bond for each pair of ninjas, keyed by their sorted ids joined with '|'. */
  bonds: Record<string, number>;
  leaderId: string;
  progress: MissionProgress;
}

/** A dice-check outcome the screens can show (the % is computed before rolling). */
export interface CheckOutcome {
  d20: number;
  /** Both dice when rolled with advantage or disadvantage. */
  rolls: number[];
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
  /** Chance of success before rolling, 0..1. */
  chance: number;
  natural20: boolean;
  natural1: boolean;
}

/** What happened, in order, so screens can animate it and the log can tell it. */
export type RuleEvent =
  | { type: 'hp'; who: string; delta: number; hp: number; reason: string }
  | { type: 'chakra'; who: string; delta: number; chakra: number; reason: string }
  | { type: 'tension'; who: string; delta: number; tension: number; reason: string }
  | { type: 'exhaustion'; who: string; delta: number; exhaustion: number; reason: string }
  | { type: 'effect'; who: string; effect: EffectId; change: 'added' | 'refreshed' | 'removed' | 'expired'; reason: string }
  | { type: 'check'; who: string; what: string; outcome: CheckOutcome }
  | { type: 'breakdown'; who: string; kind: BreakdownKind }
  | { type: 'awakening'; who: string }
  | { type: 'unconscious'; who: string }
  | { type: 'death_saves'; who: string; rolls: number[]; result: 'stable' | 'revived' | 'dead' }
  | { type: 'died'; who: string }
  | { type: 'dice'; who: string; kind: 'hit' | 'chakra'; delta: number; left: number; reason: string }
  | { type: 'supplies'; item: SupplyId; delta: number; left: number; reason: string }
  | { type: 'ambush'; chance: number; happened: boolean }
  | { type: 'note'; text: string };
