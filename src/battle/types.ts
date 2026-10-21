// Types for the party battle engine (docs/GAMEPLAY_DESIGN.md). Everything here is plain data: a
// battle state can be saved, sent over the network and replayed. The rules live in the other
// modules of src/battle and never touch the screen.

import type { AbilityScores, ShinobiCharacter, WeatherType } from '../types/shinobi';
import type { Difficulty, EffectId, StatusEffect } from '../types/mission';
import type { SpriteAppearance, SpritePose } from '../sprite/types';

/** A point on the battle map in meters: x across, z depth from the back edge. */
export interface Pt {
  x: number;
  z: number;
}

/** A cell of the hidden navigation grid (0.5 m). */
export interface Cell {
  c: number;
  r: number;
}

export type Team = 'party' | 'enemy';
export type WaterKind = 'none' | 'shallow' | 'deep';
export type AiOrder = 'aggressive' | 'defensive' | 'support';
export type TimeOfDay = 'day' | 'night';

/** Damage types: the jutsu ones plus weapons and poison. */
export type DamageType = 'Fire' | 'Cold' | 'Bludgeoning' | 'Slashing' | 'Piercing' | 'Lightning' | 'Psychic' | 'Force' | 'Poison';

export interface Weapon {
  name: string;
  dice: string;
  type: DamageType;
  /** Melee reach in meters. */
  reach: number;
  /** Uses the better of STR and DEX. */
  finesse: boolean;
  /** Held in the hand (a blade, a polearm); palm techniques and fists keep the hands free. */
  held: boolean;
  /** Needs both hands (greatsword, naginata). */
  twoHanded?: boolean;
}

/** What a unit is. */
export type UnitKind = 'ninja' | 'hydra_body' | 'hydra_head';

/** An enemy's rank (Command and the shadows need it; bosses can't be controlled). */
export type Rank = 'minion' | 'captain' | 'subboss' | 'boss';

/** Short battle conditions, separate from the mission's status effects. */
export interface Conditions {
  prone?: boolean;
  /** Dodge: attacks against it have disadvantage until its next turn. */
  dodging?: boolean;
  /** Disengage: its movement this turn provokes no opportunity attacks. */
  disengaged?: boolean;
  /** Focusing chakra: attacks against it have advantage until its next turn. */
  focusing?: boolean;
  /** Can't act on its first turn. */
  surprised?: boolean;
  /** Shadow clone decoy: the next attack that would hit it strikes the clone instead. */
  clone?: boolean;
  /** Crouched (stealth and behind cover). */
  crouched?: boolean;
  /** Hidden, with the Stealth total enemies must beat with passive Perception. */
  hidden?: number;
  /** Paid 2 chakra to walk on deep water this turn. */
  waterWalk?: boolean;
  /** Ninja jump ready: climbing and dropping cost little this turn. */
  ninjaJump?: boolean;
  /** Warped in next to a foe (Ryusei): the next attack this turn comes from behind. */
  warpEdge?: boolean;
}

/** What an enemy will do on its next turn (it commits to it; a Mirai can see it). */
export interface Intent {
  kind: 'melee' | 'ranged' | 'jutsu' | 'bite' | 'spit' | 'roar' | 'heal' | 'defend' | 'move' | 'command';
  /** The weapon name or jutsu id (Command or Natural Submission, for a Northstar's 'command'). */
  what: string;
  target?: string;
  at?: Pt;
  /** Where it means to walk first (the Eye of Tomorrow shows it on the ground). */
  to?: Pt;
}

/** 0 HP states. */
export type Down = 'downed' | 'stable' | 'dead' | 'ko' | 'fled';

export interface TurnBudget {
  /** Meters of movement left. */
  move: number;
  action: boolean;
  bonus: boolean;
  reaction: boolean;
  /** Meters moved this turn (running in the stealth phase is noisy). */
  moved: number;
  dashed?: boolean;
  /** The free object interaction of the turn (drawing or stowing the weapon) was used. */
  interacted?: boolean;
}

/** A guard's state in the stealth phase. */
export interface Guard {
  /** Patrol route (meters); the guard walks it in a loop. */
  route: Pt[];
  next: number;
  /** Suspicion per party unit, 0..100 (100 = alarm). */
  suspicion: Record<string, number>;
  /** Where it goes to look (a noise, a glimpse). */
  investigate?: Pt;
  /** Where it looks, in degrees (0 = toward +x); its facing if unset. */
  look?: number;
  alerted: boolean;
}

export interface HydraHeadState {
  body: string;
  index: number;
  /** The hydra's own turns a severed head still misses before it grows back. */
  regrowIn: number;
  severed: boolean;
  /** The stump was burned, electrified or blown up after the cut: it never grows back. */
  sealed: boolean;
}

export interface Unit {
  id: string;
  name: string;
  /** The Spanish name, when it isn't the same (an enemy's "Renegado 1"). */
  nameEs?: string;
  /**
   * The article a generic name takes in a Spanish sentence ("el Asaltante", "la Sombra"). Proper
   * names (the party's ninjas, Kagero) have none.
   */
  articleEs?: 'el' | 'la';
  team: Team;
  kind: UnitKind;
  /** Mission characters keep their sheet here (party members and enemy ninjas). */
  character?: ShinobiCharacter;
  look?: SpriteAppearance;
  level: number;
  stats: AbilityScores;
  prof: number;
  pos: Pt;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  tempHp: number;
  chakra: number;
  maxChakra: number;
  ac: number;
  /** Walking speed in meters. */
  speed: number;
  saveDC: number;
  jutsuAttack: number;
  /** Casting ability modifier (Focus chakra). */
  castMod: number;
  weapon: Weapon;
  /** The weapon is in hand (hand seals need free hands: stow it, or have One-Handed Seals). */
  armed: boolean;
  /** Jutsu ids it can cast. */
  jutsus: string[];
  /** Mission status effects (carried over between battles). */
  effects: StatusEffect[];
  cond: Conditions;
  down?: Down;
  deathSaves: { ok: number; bad: number };
  turn: TurnBudget;
  controller: 'player' | 'ai';
  aiOrder: AiOrder;
  /** Damage and HP scale for enemies in Story difficulty (1 = normal). */
  power: number;
  guard?: Guard;
  /** The enemy's next move, planned at the end of its turn. */
  intent?: Intent;
  head?: HydraHeadState;
  /** Hydra body: how many cells around its position it occupies (radius in meters). */
  bulk?: number;
  /** An enemy's rank; party units have none. */
  rank?: Rank;
  /**
   * Under a Northstar's Command: it fights on the Northstar's side (its `team` for now) for `rounds`
   * more of its own turns, then goes back to the side it left. Kept out of `cond`, which a fall wipes.
   */
  commanded?: { by: string; team: Team; rounds: number };
  /** A beast or a summon rather than a ninja (Natural Submission takes them). */
  creature?: 'beast' | 'summon';
  /** A beast or summon that joined the Northstar's side for the rest of the battle, and the side it left. */
  joined?: { by: string; team: Team };
  /** Battle bookkeeping for the mission result. */
  stats2: { critsTaken: number; critsLanded: number; pills: number; fell: boolean; fellToCrit: boolean; tension: number; jutsuCast: number };
  /** Skill proficiencies (Stealth, Perception, Medicine...). */
  skills: string[];
}

/** The side a unit belongs to, whichever side a Command has it fighting on for now. */
export const homeTeam = (u: Unit): Team => u.commanded?.team ?? u.team;

/** A prop placed on the map (sprite plus gameplay). */
export interface PropDef {
  id: string;
  group: string;
  name: string;
  x: number;
  z: number;
  level: number;
  anim?: string;
  mirror?: boolean;
  /** Pixels the sprite floats above the ground (birds on a fence). */
  lift?: number;
  glow?: [number, number, number];
  /** Drawn in a different depth slot (bridge parts). */
  sortZ?: number;
}

/** Gameplay of a prop kind: footprint, cover and what it allows. */
export interface PropRules {
  /** Footprint radius in meters (0 = no collision). */
  radius: number;
  cover: 0 | 2 | 5;
  blocksSight: boolean;
  /** Bushes, tall grass, reeds: a ninja inside can hide; it doesn't block walking. */
  hideSpot: boolean;
  /** Walkable decoration (flowers, ferns, lily pads). */
  passable: boolean;
  hp?: number;
  explosive?: boolean;
  flammable?: boolean;
  animal?: boolean;
}

export interface PropState {
  def: PropDef;
  hp?: number;
  destroyed?: boolean;
  /** An animal that fled (it flies or runs off). */
  fled?: boolean;
  /** The frame an animal fled, for its animation. */
  fledAt?: number;
}

/**
 * An obstacle made by a jutsu (earth wall, water barrier) or a Kōton structure: a metal wall from
 * `a` to `b`, or a metal block, a 1.5 m square centred on `a` (with `b` the same point).
 */
export interface Wall {
  id: string;
  kind: 'earth' | 'water' | 'metal' | 'metalBlock';
  a: Pt;
  b: Pt;
  hp: number;
  /** Rounds left (water barriers fade). */
  rounds?: number;
  /** The unit that raised it (Kōton structures). */
  owner?: string;
  /** Structures that can be broken show their HP against this. */
  maxHp?: number;
}

/** A trap on the ground (explosive tag, camp perimeter trap). */
export interface Trap {
  id: string;
  kind: 'tag' | 'wire';
  pos: Pt;
  owner: Team;
  dc: number;
  dice: string;
  radius: number;
  /** Seen by the other team (Perception or scouting). */
  spotted?: boolean;
}

/**
 * A Ryusei's Weapon Node: where a kunai or a missed blow landed. Static and seen by both sides; a
 * Ryusei keeps three at most. (Not `Node`: that name is the DOM's.)
 */
export interface WeaponNode {
  id: string;
  /** The Ryusei who left it (it stays when the owner falls). */
  owner: string;
  pos: Pt;
}

/** A body left in the stealth phase (it raises the alarm if a guard sees it). */
export interface Body {
  unit: string;
  pos: Pt;
  hidden: boolean;
}

export interface BattleSupplies {
  soldierPills: number;
  bandages: number;
  antidotes: number;
  explosiveTags: number;
}

export type BattlePhase = 'stealth' | 'combat' | 'ended';
export type BattleOutcome = 'victory' | 'defeat' | 'fled';

/** Damage about to land on a unit (queued, so a Kawarimi prompt can pause it). */
export interface Hit {
  unit: string;
  amount: number;
  type: DamageType;
  /** Who dealt it, and with what (a jutsu id, a weapon name, 'explosion'…). */
  source?: string;
  what: string;
  crit?: boolean;
  knockout?: boolean;
  melee?: boolean;
  explosion?: boolean;
  /** One attack aimed at this unit (a clone takes it; Kawarimi can dodge it). */
  aimed?: boolean;
  /** A status effect it leaves on a failed save or a hit. */
  effect?: EffectId;
  /** A failed save against fear (the hydra's roar): +1 Tension. */
  tension?: boolean;
  /** Struck from hiding: a Mirai can't have seen it coming. */
  unseen?: boolean;
  /** Can't be blocked: no clone, Kawarimi or Premonitory Evasion stops it. */
  unblockable?: boolean;
  /** The Mirai let Premonitory Evasion go for this hit (Kawarimi may still be offered). */
  evadeDeclined?: boolean;
}

/** What still has to happen once the queued hits have landed. */
export interface AfterHits {
  /** A stealth-phase attack: silent if the guard dropped and nobody saw. */
  stealthAttack?: { attacker: string; target: string };
  /** A loud action in the stealth phase: the battle begins with the unaware guards surprised. */
  openFightBy?: string;
  /** Something loud the party didn't mean (a trap, the bells): the alarm goes off. */
  alarmAt?: Pt;
  /** A move paused by an opportunity attack goes on (if the mover is still where it was). */
  resumeWalk?: { unit: string; path: Cell[]; stepIndex: number; skip: string[]; at: Cell };
}

/** A reaction the engine is waiting for (reactions always ask the player). */
export type PendingReaction =
  | { kind: 'opportunity'; reactor: string; mover: string; path: Cell[]; stepIndex: number; skip: string[] }
  | { kind: 'kawarimi'; reactor: string; hit: Hit; rest: Hit[]; after: AfterHits }
  | { kind: 'evasion'; reactor: string; hit: Hit; rest: Hit[]; after: AfterHits };

export interface BattleState {
  version: 1;
  seed: number;
  /** Counter for dice streams, so every roll differs and replays exactly. */
  rolls: number;
  mapId: string;
  time: TimeOfDay;
  weather: WeatherType;
  difficulty: Difficulty;
  phase: BattlePhase;
  outcome?: BattleOutcome;
  round: number;
  stealthTurn: number;
  /** Initiative order (unit ids) and whose turn it is. */
  order: string[];
  turn: number;
  initiative: Record<string, number>;
  units: Record<string, Unit>;
  props: PropState[];
  walls: Wall[];
  traps: Trap[];
  /** The Ryusei's Weapon Nodes, oldest first. */
  nodes: WeaponNode[];
  bodies: Body[];
  pending?: PendingReaction;
  /** Party units that already acted in this stealth turn. */
  stealthDone: string[];
  /** The party's backpack for items used in battle. */
  supplies: BattleSupplies;
  /** Frame counter for animal flight animations (ticks with each action). */
  tick: number;
}

/** What a player or the AI wants to do. */
export type Action =
  | { type: 'move'; unit: string; to: Cell; sneak?: boolean }
  | { type: 'attack'; unit: string; target: string; ranged?: boolean; knockout?: boolean }
  | { type: 'jutsu'; unit: string; jutsu: string; at: Pt; target?: string; enhanced?: boolean; target2?: string }
  | { type: 'dash' | 'disengage' | 'dodge' | 'hide' | 'focus' | 'crouch' | 'jump' | 'draw'; unit: string }
  | { type: 'shove'; unit: string; target: string; mode: 'prone' | 'push' }
  | { type: 'item'; unit: string; item: 'pill' | 'bandage' | 'antidote' | 'tag'; target?: string; at?: Pt }
  | { type: 'stabilize'; unit: string; target: string }
  | { type: 'flee'; unit: string }
  | { type: 'endTurn'; unit: string }
  | { type: 'react'; unit: string; take: boolean }
  // stealth phase
  | { type: 'stone'; unit: string; at: Pt }
  | { type: 'drag'; unit: string; body: string; to: Cell }
  | { type: 'endStealthTurn' }
  | { type: 'setController'; unit: string; controller: 'player' | 'ai'; order?: AiOrder };

/** A roll the screens show (the % was known before rolling). */
export interface RollInfo {
  kind: 'attack' | 'save' | 'check' | 'death' | 'initiative';
  d20: number;
  rolls: number[];
  mod: number;
  total: number;
  dc: number;
  success: boolean;
  chance: number;
  crit?: boolean;
  fumble?: boolean;
  /** Two d20 were rolled: with advantage (the higher kept) or disadvantage (the lower). */
  adv?: 'advantage' | 'disadvantage';
}

/** What happened, in order, for the screens to animate and the log to tell. */
export type BattleEvent =
  | { t: 'move'; unit: string; path: Pt[]; run: boolean }
  /** `how`: 'phase' for a Ryusei's Shooting-Star Thrust and Spatial Swap (the screen plays them as a body of blue light crossing over). */
  | { t: 'teleport'; unit: string; from: Pt; to: Pt; log?: boolean; how?: 'phase' }
  | { t: 'pushed'; unit: string; from: Pt; to: Pt; fall: number }
  | { t: 'weapon'; unit: string; armed: boolean; cost: 'free' | 'bonus' }
  | { t: 'act'; unit: string; act: 'dash' | 'disengage' | 'dodge' | 'focus' | 'crouch' | 'stand' | 'jump' | 'item' | 'stone' }
  /** `reasons`: why the roll had advantage or disadvantage (the preview's keys: 'aura', 'behind'…). */
  | { t: 'attack'; unit: string; target: string; what: string; roll: RollInfo; ranged: boolean; reasons?: string[] }
  /** `ab`: the ability the save is made with (dex, wis…). */
  | { t: 'save'; unit: string; what: string; roll: RollInfo; ab?: string }
  | { t: 'check'; unit: string; what: string; roll: RollInfo }
  | { t: 'damage'; unit: string; amount: number; dmgType: DamageType; hp: number; crit?: boolean; source?: string }
  | { t: 'heal'; unit: string; amount: number; hp: number; source?: string }
  | { t: 'chakra'; unit: string; delta: number; chakra: number; reason: string }
  | { t: 'jutsu'; unit: string; jutsu: string; at: Pt; shape: AreaShape | null; enhanced: boolean }
  | { t: 'down'; unit: string; state: Down }
  | { t: 'condition'; unit: string; cond: keyof Conditions | 'stood'; on: boolean }
  | { t: 'effect'; unit: string; effect: string; on: boolean }
  | { t: 'deathSave'; unit: string; roll: RollInfo; ok: number; bad: number }
  | { t: 'turn'; unit: string; round: number }
  | { t: 'round'; round: number }
  | { t: 'combatStart'; by?: string; surprised: string[] }
  | { t: 'initiative'; order: string[]; rolls: Record<string, number> }
  | { t: 'suspicion'; guard: string; target: string; value: number }
  | { t: 'alert'; guard: string; at?: Pt }
  | { t: 'noise'; at: Pt; radius: number; source: string }
  | { t: 'animalFlees'; prop: number }
  | { t: 'investigate'; guard: string; at: Pt }
  | { t: 'body'; unit: string; hidden: boolean }
  | { t: 'wall'; wall: Wall; on: boolean }
  | { t: 'wallHit'; wall: string; amount: number; hp: number; at: Pt }
  | { t: 'prop'; prop: number; state: 'burnt' | 'cut' | 'broken' | 'exploded' }
  | { t: 'electrified'; at: Pt; radius: number }
  | { t: 'trap'; trap: Trap; on: boolean }
  | { t: 'node'; node: WeaponNode; on: boolean }
  | { t: 'explode'; at: Pt; radius: number }
  | { t: 'kawarimi'; unit: string; from: Pt; to: Pt }
  /** `what`: the blow or jutsu stepped away from. */
  | { t: 'evade'; unit: string; from: Pt; to: Pt; source?: string; what?: string }
  | { t: 'clone'; unit: string; on: boolean }
  | { t: 'sever'; unit: string }
  | { t: 'seal'; unit: string; how: 'fire' | 'lightning' | 'explosion' }
  | { t: 'regrow'; unit: string }
  | { t: 'reactionAsk'; pending: PendingReaction }
  | { t: 'intent'; unit: string; intent: Intent }
  | { t: 'command'; unit: string; by: string; on: boolean; rounds?: number }
  | { t: 'joined'; unit: string; by: string }
  | { t: 'slowed'; unit: string; by: string; move: number }
  | { t: 'fled'; unit: string }
  | { t: 'end'; outcome: BattleOutcome }
  | { t: 'note'; key: string; params?: Record<string, string | number> };

/** An area of effect on the ground plane, in meters. */
export type AreaShape =
  | { kind: 'circle'; center: Pt; radius: number }
  | { kind: 'cone'; origin: Pt; dir: number; angle: number; length: number }
  | { kind: 'line'; origin: Pt; dir: number; length: number; width: number };

export interface Outcome {
  ok: boolean;
  reason?: string;
  state: BattleState;
  events: BattleEvent[];
}

/** How the screen should draw a unit right now. */
export interface UnitView {
  pose: SpritePose;
}
