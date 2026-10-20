import type { CastStyle, SpriteAppearance } from '../sprite/types';
import type { ConvictionValue, SkillId, StatusEffect } from './mission';

export type ClanType = 'Mirai' | 'Koton' | 'Ryusei' | 'Northstar';

export type DojutsuType =
  | 'None'
  | 'Sharingan (1-Tomoe)'
  | 'Sharingan (2-Tomoe)'
  | 'Sharingan (3-Tomoe)'
  | 'Mangekyo Sharingan (Kamui)'
  | 'Mangekyo Sharingan (Amaterasu)'
  | 'Byakugan (Pure)'
  | 'Byakugan (Active Veined)'
  | 'Sage Eyes (Toad)';

export type HairstyleType =
  | 'Naruto Spike'
  | 'Sasuke Rogue Fringe'
  | 'Minato Winged Flare'
  | 'Kakashi Tilt'
  | 'Madara Wild Cascade'
  | 'Itachi Low Ribbon'
  | 'Cloud Chocobo Spikes'
  | 'Sephiroth Parted Flow'
  | 'Squall Modern Fringe'
  | 'Knight Pointed Helm'
  | 'Somnus Caelum'
  | 'Noctis Caelum';

export type ArmorStyleType =
  | 'Leaf Chunin Flak'
  | 'Sand Wind Guard'
  | 'Mist Storm Vest'
  | 'Samurai O-Yoroi'
  | 'Roman Legionary Segmentata'
  | 'Greek Hoplite Cuirass'
  | 'Ronin Wanderer Cloak'
  | 'ANBU Spec-Ops'
  | 'Dark Knight Plate';

export type HeadbandPositionType = 'Forehead' | 'Neck' | 'Arm' | 'Waist' | 'Rogue Scratched';

export type WeaponStyleType =
  | 'Katana Blade'
  | 'Kunai & Tag'
  | 'Rasengan Sphere'
  | 'Chidori Lightning'
  | 'Gentle Fist Palm'
  | 'Unarmed Brawler';

export type CapeStyleType =
  | 'None'
  | 'Hokage White Haori'
  | 'Akatsuki Black Cloak'
  | 'Sasuke Shimenawa Rope'
  | 'Ronin Traveler Cape'
  | 'Crimson Billowing Knight Cape';

export type RibbonStyleType = 'Long Fluttering' | 'Short' | 'None';

export type LowerStyleType = 'Shinobi Wraps & Holster' | 'Armored Greaves' | 'Open Sandals' | 'Padded Shin Guards';

export type ShinobiClassType =
  | 'Ninjutsu Specialist'
  | 'Taijutsu Master'
  | 'Genjutsu Adept'
  | 'Medical Specialist'
  | 'Bukijutsu Master';

export type ElementalNature = 'Fire' | 'Water' | 'Earth' | 'Wind' | 'Lightning' | 'Taijutsu' | 'Kenjutsu' | 'Genjutsu';

export type JutsuRank = 'D' | 'C' | 'B' | 'A' | 'S';

export type JutsuSlotCategory = 'Utility' | 'Elemental' | 'Clan' | 'Ultimate';

export interface JutsuDefinition {
  id: string;
  name: string;
  /** The Spanish name shown on the Spanish screens. */
  nameEs?: string;
  /** What the enhanced cast is called, when it has a name of its own ("Great Fireball"), and in Spanish. */
  nameEnh?: string;
  nameEnhEs?: string;
  japaneseName: string;
  rank: JutsuRank;
  category: JutsuSlotCategory;
  nature: ElementalNature;
  chakraCost: number;
  castTime: 'Action' | 'Bonus Action' | 'Reaction';
  range: number; // in tiles
  areaOfEffect?: 'Single' | 'Line' | 'Cone' | 'Sphere' | 'Wall';
  aoeRadius?: number; // tiles
  damageDice?: string; // e.g. "3d6"
  damageType?: 'Fire' | 'Cold' | 'Bludgeoning' | 'Slashing' | 'Lightning' | 'Psychic' | 'Force' | 'Healing';
  savingThrow?: 'DEX' | 'CON' | 'WIS' | 'STR';
  saveEffect?: 'Half Damage' | 'Negates' | 'Break Illusion';
  enhancementChakraCost: number; // cost to upcast/empower
  enhancementEffect: string;
  description: string;
  environmentalEffect?: 'Ignites Wood' | 'Creates Earth Wall' | 'Creates Water Barrier' | 'Clears Foliage' | 'Electrifies Water' | 'Freezes Water' | 'Sets Trap';
  requiredClan?: ClanType;
}

export interface CharacterPalette {
  skinTone: string;
  hairColor: string;
  eyeColor: string;
  armorPrimary: string;
  armorSecondary: string;
  clothColor: string;
  headbandCloth: string;
  headbandPlate: string;
  chakraAuraColor: string;
  capeColor?: string;
  accentColor?: string;
}

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface ShinobiFeat {
  id: string;
  name: string;
  description: string;
  statBonus?: Partial<AbilityScores>;
}

export interface ShinobiCharacter {
  id: string;
  name: string;
  title: string;
  level: number;
  clan: ClanType;
  shinobiClass: ShinobiClassType;
  /** The base ability scores, as rolled or bought; the clan's bonus is added when numbers are derived. */
  stats: AbilityScores;
  palette: CharacterPalette;
  hairstyle: HairstyleType;
  armorStyle: ArmorStyleType;
  headbandPosition: HeadbandPositionType;
  weaponStyle?: WeaponStyleType;
  capeStyle?: CapeStyleType;
  ribbonStyle?: RibbonStyleType;
  lowerStyle?: LowerStyleType;
  dojutsu: DojutsuType;
  selectedFeats: string[]; // feat IDs
  selectedJutsus: {
    slot1Utility: string;
    slot2Elemental: string;
    slot3Elemental: string;
    slot4Clan: string;
    slot5Ultimate: string;
  };
  /**
   * Missing (1) on sheets from before 2026-10-20, whose numbers below don't count the clan's ability
   * bonus yet; 2 when they do (rules/derived.ts, SHEET_VERSION).
   */
  sheetVersion?: number;
  // Derived combat stats (the clan's ability bonus counted in)
  maxHp: number;
  currentHp: number;
  maxChakra: number;
  currentChakra: number;
  armorClass: number;
  speed: number; // tiles (default 6)
  jutsuSaveDC: number;
  jutsuAttackBonus: number;
  isEnhancedMode?: boolean;
  /** Layered sprite appearance. Older characters without it are converted on the fly. */
  appearance?: SpriteAppearance;

  // Mission state carried between battles (docs/MISSION_DESIGN.md). Missing on older sheets: fresh.
  hitDiceSpent?: number;
  chakraDiceSpent?: number;
  /** Stress, 0–10. */
  tension?: number;
  /** Exhaustion level, 0–6. */
  exhaustion?: number;
  effects?: StatusEffect[];
  /** Soldier pills taken since the last camp. */
  pillsSinceCamp?: number;
  /** Permanent scars. */
  scars?: string[];
  /** Small traits left by a Breakdown or an Awakening. */
  traits?: string[];
  /** 1 or 2 values; the first is the main one. */
  conviction?: ConvictionValue[];
  /** Skills the ninja is proficient in; older sheets use their class's defaults. */
  skillProficiencies?: SkillId[];
}

export type TileTerrain =
  | 'plain'
  | 'foliage'
  | 'tree'
  | 'wooden_house'
  | 'charred_ruins'
  | 'water'
  | 'ice'
  | 'earth_wall'
  | 'water_barrier'
  | 'fire_blaze'
  | 'explosive_tag'
  | 'stone_precipice';

export interface BattlefieldTile {
  x: number;
  y: number;
  terrain: TileTerrain;
  hp?: number; // for destructible objects
  maxHp?: number;
  isFlammable?: boolean;
  coverBonus: number; // +2 for half, +5 for 3/4
  blocksLineOfSight: boolean;
  isElectrified?: boolean;
  trapArmingPlayerId?: string;
}

export type WeatherType = 'Clear' | 'Downpour' | 'Scorching Drought' | 'Sandstorm';

export interface CombatEntity {
  id: string;
  name: string;
  isPlayer: boolean;
  team: 'player' | 'enemy' | 'ally';
  x: number;
  y: number;
  size: number; // 1 for regular shinobi, 2 or 3 for Giant Beasts / Titans
  character: ShinobiCharacter;
  isBossTitan?: boolean;
  conditions: Array<'Burning' | 'Paralyzed' | 'Stunned' | 'InCover' | 'ChakraSurge' | 'IllusionConfused'>;
  actionUsed: boolean;
  bonusActionUsed: boolean;
  reactionUsed: boolean;
  movementRemaining: number;
  spriteState: 'idle' | 'handsigns' | 'attack' | 'cast' | 'hurt' | 'victory' | 'charge';
  /** Cast style of the jutsu being cast (shown while spriteState is 'cast'). */
  castStyle?: CastStyle;
}

export interface DiceRollResult {
  diceType: 'd20' | 'damage';
  roll: number;
  diceCount?: number;
  diceSides?: number;
  rollsBreakdown?: number[];
  modifier: number;
  total: number;
  isCritical: boolean;
  isFumble: boolean;
  targetDC?: number;
  targetAC?: number;
  isSuccess?: boolean;
  reason: string;
}

export interface CombatLogEntry {
  id: string;
  round: number;
  sourceName: string;
  text: string;
  type: 'action' | 'damage' | 'environmental' | 'roll' | 'defeat' | 'crit';
  timestamp: number;
}
