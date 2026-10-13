// Derived combat stats (HP, chakra, AC, save DC…) from a character's build. Shared by the
// creator and the mission rules so camps and level-ups recompute them the same way.

import { ARMOR_STYLES, SHINOBI_CLASSES } from '../data/shinobiData';
import type { AbilityScores, ArmorStyleType, ClanType, ShinobiCharacter, ShinobiClassType } from '../types/shinobi';
import { abilityMod, proficiencyBonus } from './checks';
import { effectMods } from './effects';

export interface BuildInput {
  level: number;
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

export function deriveStats(b: BuildInput): DerivedStats {
  const classInfo = SHINOBI_CLASSES[b.shinobiClass];
  const castStatMod = abilityMod(b.stats[classInfo.castingStat]);
  const conMod = abilityMod(b.stats.con);
  const dexMod = abilityMod(b.stats.dex);
  const prof = proficiencyBonus(b.level);

  const armorAC = ARMOR_STYLES.find((a) => a.id === b.armor)?.acBonus ?? 2;
  const ironSkinBonus = b.feats.includes('iron_skin') ? 1 : 0;

  let maxHp = classInfo.hitDie + conMod + (b.level - 1) * (Math.floor(classInfo.hitDie / 2) + 1 + conMod);
  if (b.clan === 'Uddo') maxHp += 6;

  let maxChakra = b.level * (Math.floor(classInfo.chakraDie / 2) + 2) + Math.max(1, conMod);
  if (b.clan === 'Akkai') maxChakra = Math.floor(maxChakra * 1.25);
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
