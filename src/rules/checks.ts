// d20 checks and saving throws with the % of success known before rolling (shown on the cards),
// skills, proficiency by level, and the no-randomness mode where the d20 counts as 10.

import { CLANS_DATA, SHINOBI_CLASSES } from '../data/shinobiData';
import type { AbilityScores, ClanType, DiceRollResult, ShinobiCharacter, ShinobiClassType } from '../types/shinobi';
import type { CheckOutcome, SkillId } from '../types/mission';
import { effectMods, hasEffect } from './effects';
import { Rng, rollDie } from './rng';

export type Ability = keyof AbilityScores;
export type Advantage = 'none' | 'advantage' | 'disadvantage';

export const SKILL_ABILITY: Record<SkillId, Ability> = {
  athletics: 'str',
  acrobatics: 'dex',
  stealth: 'dex',
  ninja_tools: 'dex',
  perception: 'wis',
  insight: 'wis',
  survival: 'wis',
  medicine: 'wis',
  investigation: 'int',
  persuasion: 'cha',
  intimidation: 'cha',
  deception: 'cha',
};

/** Skills a ninja is proficient in when the sheet doesn't list any (older characters). */
export const CLASS_SKILLS: Record<ShinobiClassType, SkillId[]> = {
  'Ninjutsu Specialist': ['investigation', 'perception', 'survival'],
  'Taijutsu Master': ['athletics', 'acrobatics', 'survival'],
  'Genjutsu Adept': ['deception', 'persuasion', 'insight'],
  'Medical Specialist': ['medicine', 'insight', 'perception'],
  'Bukijutsu Master': ['ninja_tools', 'stealth', 'acrobatics'],
};

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** The ability bonus a clan gives (docs/CLANS_DESIGN.md, D2): Mirai +2 DEX +1 INT, Kōton +2 CON +1 INT… */
export function clanBonus(clan: ClanType): Partial<AbilityScores> {
  const out: Partial<AbilityScores> = {};
  if (!Object.hasOwn(CLANS_DATA, clan)) return out;
  for (const b of CLANS_DATA[clan].statBonuses) out[b.stat] = (out[b.stat] ?? 0) + b.bonus;
  return out;
}

/**
 * The scores a ninja plays with: the base scores the player rolled or bought plus the clan's bonus.
 * The sheet keeps only the base scores (its `stats`); the bonus is added here, where the numbers
 * are derived, and nowhere else, so it can never count twice.
 */
export function effectiveScores(stats: AbilityScores, clan: ClanType): AbilityScores {
  const b = clanBonus(clan);
  return Object.fromEntries(ABILITIES.map((k) => [k, stats[k] + (b[k] ?? 0)])) as unknown as AbilityScores;
}

/** A character's ability scores with its clan's bonus (what every check, save and derived number uses). */
export const abilityScores = (c: Pick<ShinobiCharacter, 'stats' | 'clan'>): AbilityScores => effectiveScores(c.stats, c.clan);

/** 5e proficiency: +2 at levels 1–4, +3 at 5–8, +4 at 9–12… */
export const proficiencyBonus = (level: number): number => 2 + Math.floor((Math.max(1, Math.floor(level)) - 1) / 4);

/** Advantage and disadvantage cancel out, however many of each (5e). */
export function combineAdvantage(...sources: Advantage[]): Advantage {
  const adv = sources.includes('advantage');
  const dis = sources.includes('disadvantage');
  return adv === dis ? 'none' : adv ? 'advantage' : 'disadvantage';
}

/**
 * Chance (0..1) that d20 + mod reaches the DC. Attacks always hit on a natural 20 and miss on a
 * natural 1; checks and saves don't (5e).
 */
export function successChance(mod: number, dc: number, adv: Advantage = 'none', attack = false): number {
  let faces = 0;
  for (let f = 1; f <= 20; f++) if (attack ? f === 20 || (f !== 1 && f + mod >= dc) : f + mod >= dc) faces++;
  const p = faces / 20;
  return adv === 'advantage' ? 1 - (1 - p) ** 2 : adv === 'disadvantage' ? p * p : p;
}

/** Rolls a check. With no `rng` (no-randomness mode) the d20 counts as 10. */
export function rollCheck(rng: Rng | null, mod: number, dc: number, adv: Advantage = 'none', attack = false): CheckOutcome {
  const chance = successChance(mod, dc, adv, attack);
  if (!rng) {
    const total = 10 + mod;
    return { d20: 10, rolls: [10], modifier: mod, total, dc, success: total >= dc, chance, natural20: false, natural1: false };
  }
  const rolls = adv === 'none' ? [rollDie(rng, 20)] : [rollDie(rng, 20), rollDie(rng, 20)];
  const d20 = adv === 'advantage' ? Math.max(...rolls) : adv === 'disadvantage' ? Math.min(...rolls) : rolls[0];
  const total = d20 + mod;
  const success = attack ? d20 === 20 || (d20 !== 1 && total >= dc) : total >= dc;
  return { d20, rolls, modifier: mod, total, dc, success, chance, natural20: d20 === 20, natural1: d20 === 1 };
}

/** −2 to every d20 roll per Exhaustion level (5e 2024). */
export const exhaustionPenalty = (c: ShinobiCharacter): number => 2 * (c.exhaustion ?? 0);

export const skillsOf = (c: ShinobiCharacter): SkillId[] => c.skillProficiencies ?? CLASS_SKILLS[c.shinobiClass] ?? [];

export function skillModifier(c: ShinobiCharacter, skill: SkillId): number {
  const ability = SKILL_ABILITY[skill];
  const m = effectMods(c.effects);
  const prof = skillsOf(c).includes(skill) ? proficiencyBonus(c.level) : 0;
  return abilityMod(abilityScores(c)[ability]) + prof - exhaustionPenalty(c) + m.allRolls + (ability === 'dex' ? m.dexRolls : 0);
}

export function checkAdvantage(c: ShinobiCharacter, skill: SkillId): Advantage {
  const m = effectMods(c.effects);
  return combineAdvantage(m.disadvChecks ? 'disadvantage' : 'none', skill === 'stealth' && m.advStealth ? 'advantage' : 'none');
}

/** Passive score (10 + modifier, ±5 for advantage or disadvantage), e.g. passive Perception. */
export function passiveScore(c: ShinobiCharacter, skill: SkillId): number {
  const adv = checkAdvantage(c, skill);
  return 10 + skillModifier(c, skill) + (adv === 'advantage' ? 5 : adv === 'disadvantage' ? -5 : 0);
}

const isSaveProficient = (c: ShinobiCharacter, ability: Ability): boolean =>
  (SHINOBI_CLASSES[c.shinobiClass]?.savingProficiencies ?? []).includes(ability.toUpperCase());

export function saveModifier(c: ShinobiCharacter, ability: Ability): number {
  const m = effectMods(c.effects);
  const prof = isSaveProficient(c, ability) ? proficiencyBonus(c.level) : 0;
  return abilityMod(abilityScores(c)[ability]) + prof - exhaustionPenalty(c) + m.allRolls + m.saves + (ability === 'dex' ? m.dexRolls : 0);
}

/** Advantage on a save: Mirai against genjutsu, the shrine's blessing on the Tension save, Hungry on CON… */
export function saveAdvantage(c: ShinobiCharacter, ability: Ability, opts: { vsGenjutsu?: boolean; tensionSave?: boolean } = {}): Advantage {
  const m = effectMods(c.effects);
  return combineAdvantage(
    opts.vsGenjutsu && c.clan === 'Mirai' ? 'advantage' : 'none',
    opts.tensionSave && m.advTensionSave ? 'advantage' : 'none',
    ability === 'con' && m.disadvConSaves ? 'disadvantage' : 'none',
    ability === 'wis' && m.disadvWisSaves ? 'disadvantage' : 'none',
  );
}

/** Rolls a skill check for a character against a DC. */
export function skillCheck(rng: Rng | null, c: ShinobiCharacter, skill: SkillId, dc: number, extra: Advantage = 'none'): CheckOutcome {
  return rollCheck(rng, skillModifier(c, skill), dc, combineAdvantage(checkAdvantage(c, skill), extra));
}

/** Rolls a saving throw for a character against a DC. */
export function savingThrow(
  rng: Rng | null,
  c: ShinobiCharacter,
  ability: Ability,
  dc: number,
  opts: { vsGenjutsu?: boolean; tensionSave?: boolean } = {},
): CheckOutcome {
  return rollCheck(rng, saveModifier(c, ability), dc, saveAdvantage(c, ability, opts));
}

/** A check shaped for the existing dice window. */
export function toDiceRollResult(o: CheckOutcome, reason: string): DiceRollResult {
  return {
    diceType: 'd20',
    roll: o.d20,
    modifier: o.modifier,
    total: o.total,
    isCritical: o.natural20,
    isFumble: o.natural1,
    targetDC: o.dc,
    isSuccess: o.success,
    reason,
  };
}

/** True when a character can't be surprised: Watchful. */
export const cannotBeSurprised = (c: ShinobiCharacter): boolean => hasEffect(c.effects, 'watchful');
