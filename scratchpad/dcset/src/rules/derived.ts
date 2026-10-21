// Derived combat stats (HP, chakra, AC, save DC…) from a character's build. Shared by the
// creator and the mission rules so camps and level-ups recompute them the same way.

import { ARMOR_STYLES, SHINOBI_CLASSES } from '../data/shinobiData';
import type { AbilityScores, ArmorStyleType, ClanType, ShinobiCharacter, ShinobiClassType } from '../types/shinobi';
import { abilityMod, effectiveScores, proficiencyBonus } from './checks';
import { effectMods } from './effects';

/**
 * The sheet version this code writes. Version 2 (2026-10-20): the stored numbers (max HP and chakra,
 * AC, jutsu DC and attack) count the clan's ability bonus (docs/CLANS_DESIGN.md, D2). Older sheets
 * get it counted once when they load (rules/ninja.ts, migrateCharacter).
 */
export const SHEET_VERSION = 2;

export interface BuildInput {
  level: number;
  /** The base scores, as rolled or bought (the clan's bonus is added here). */
  stats: AbilityScores;
  clan: ClanType;
  shinobiClass: ShinobiClassType;
  armor: ArmorStyleType;
  feats: string[];
}

export interface DerivedStats {
  maxHp: number;
  maxChakra: number;
  armorClass: number;
  /** Tiles (the legacy grid); the new battles use meters. */
  speed: number;
  jutsuSaveDC: number;
  jutsuAttackBonus: number;
}

/**
 * The numbers a build gives, with the clan's ability bonus on the base scores. `clanBonus: false`
 * gives what the formula gave before the bonus counted (to read and convert an older sheet).
 */
export function deriveStats(b: BuildInput, opts: { clanBonus?: boolean } = {}): DerivedStats {
  const classInfo = SHINOBI_CLASSES[b.shinobiClass];
  const scores = opts.clanBonus === false ? b.stats : effectiveScores(b.stats, b.clan);
  const castStatMod = abilityMod(scores[classInfo.castingStat]);
  const conMod = abilityMod(scores.con);
  const dexMod = abilityMod(scores.dex);
  const prof = proficiencyBonus(b.level);

  const armorAC = ARMOR_STYLES.find((a) => a.id === b.armor)?.acBonus ?? 2;
  const ironSkinBonus = b.feats.includes('iron_skin') ? 1 : 0;

  const maxHp = classInfo.hitDie + conMod + (b.level - 1) * (Math.floor(classInfo.hitDie / 2) + 1 + conMod);

  let maxChakra = b.level * (Math.floor(classInfo.chakraDie / 2) + 2) + Math.max(1, conMod);
  if (b.feats.includes('chakra_prodigy')) maxChakra += 4;

  return {
    maxHp: Math.max(15, maxHp),
    maxChakra: Math.max(12, maxChakra),
    armorClass: Math.max(10, 10 + dexMod + armorAC + ironSkinBonus),
    speed: b.armor === 'Ronin Wanderer Cloak' ? 7 : 6,
    jutsuSaveDC: 8 + prof + castStatMod,
    jutsuAttackBonus: prof + castStatMod,
  };
}

/** Max HP after effects that change it (a Grave wound takes 10 %). */
export function effectiveMaxHp(c: ShinobiCharacter): number {
  const pct = effectMods(c.effects).maxHpPct;
  return Math.max(1, Math.floor((c.maxHp * (100 + pct)) / 100));
}

/** AC after effects (Fall aftermath −2…). */
export const effectiveAC = (c: ShinobiCharacter): number => c.armorClass + effectMods(c.effects).ac;
