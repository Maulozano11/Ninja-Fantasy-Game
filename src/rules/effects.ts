// Status effects: the catalog from docs/MISSION_DESIGN.md and how durations run out.
// Effects are plain data on the character; these functions return new lists.

import type { DurationKind, EffectId, StatusEffect } from '../types/mission';

/** Numbers and flags an effect adds; the rules read the sum over all of a character's effects. */
export interface EffectMods {
  ac: number;
  /** Added to every d20 roll (attacks, checks, saves). */
  allRolls: number;
  /** Added to saving throws only. */
  saves: number;
  /** Added to DEX-based rolls. */
  dexRolls: number;
  speedM: number;
  initiative: number;
  meleeDamage: number;
  firstJutsuDiscount: number;
  tempHpAtBattleStart: number;
  /** Max HP change in percent (−10 for a Grave wound). */
  maxHpPct: number;
  disadvAttacks: boolean;
  disadvChecks: boolean;
  disadvConSaves: boolean;
  disadvWisSaves: boolean;
  advAttacks: boolean;
  advStealth: boolean;
  advTensionSave: boolean;
  noJutsu: boolean;
  noRestHp: boolean;
  cannotBeSurprised: boolean;
  refusesAllyHealing: boolean;
}

export interface EffectDef {
  id: EffectId;
  name: string;
  /** Spanish name shown in the game. */
  nameEs: string;
  kind: 'buff' | 'debuff';
  duration: DurationKind;
  /** Rounds or battles it lasts, for those kinds. */
  count?: number;
  /** Can be removed by these camp or road treatments. */
  curedBy?: string[];
  description: string;
  mods?: Partial<EffectMods>;
}

const def = (d: EffectDef): EffectDef => d;

export const EFFECTS: Record<EffectId, EffectDef> = {
  well_fed: def({ id: 'well_fed', name: 'Well fed', nameEs: 'Bien alimentado', kind: 'buff', duration: 'untilCamp', description: '+5 temporary HP at the start of each battle.', mods: { tempHpAtBattleStart: 5 } }),
  sharpened: def({ id: 'sharpened', name: 'Sharpened', nameEs: 'Hoja afilada', kind: 'buff', duration: 'battles', count: 3, description: '+2 damage on melee weapon attacks.', mods: { meleeDamage: 2 } }),
  centered_chakra: def({ id: 'centered_chakra', name: 'Centered chakra', nameEs: 'Chakra centrado', kind: 'buff', duration: 'untilCamp', description: 'The first jutsu of each battle costs 3 chakra less.', mods: { firstJutsuDiscount: 3 } }),
  watchful: def({ id: 'watchful', name: 'Watchful', nameEs: 'Guardia atenta', kind: 'buff', duration: 'battles', count: 1, description: 'Cannot be surprised, +2 initiative.', mods: { cannotBeSurprised: true, initiative: 2 } }),
  open_eyes: def({ id: 'open_eyes', name: 'Open eyes', nameEs: 'Ojos abiertos', kind: 'buff', duration: 'zone', description: 'Traps in this zone are revealed.' }),
  hidden_in_mist: def({ id: 'hidden_in_mist', name: 'Hidden in mist', nameEs: 'Oculto en la niebla', kind: 'buff', duration: 'rounds', count: 3, description: 'Advantage on Stealth.', mods: { advStealth: true } }),
  gates_open: def({ id: 'gates_open', name: 'Gates open', nameEs: 'Puertas abiertas', kind: 'buff', duration: 'rounds', count: 2, description: '+1d8 taijutsu damage and more movement; +1 Exhaustion when it ends.', mods: { speedM: 3 } }),
  shrine_blessing: def({ id: 'shrine_blessing', name: "Shrine's blessing", nameEs: 'Bendición del santuario', kind: 'buff', duration: 'untilCamp', description: 'Advantage on the next WIS save for reaching 10 Tension.', mods: { advTensionSave: true } }),
  warding_seal: def({ id: 'warding_seal', name: 'Warding seal', nameEs: 'Sello protector', kind: 'buff', duration: 'untilCamp', description: 'Resistance to one element.' }),
  wood_skin: def({ id: 'wood_skin', name: 'Wood skin', nameEs: 'Piel de madera', kind: 'buff', duration: 'battles', count: 2, description: '+5 temporary HP at the start of each battle.', mods: { tempHpAtBattleStart: 5 } }),
  comrades_bond: def({ id: 'comrades_bond', name: "Comrades' bond", nameEs: 'Lazo de camaradas', kind: 'buff', duration: 'mission', description: '+1 AC within 3 m of the bonded partner.' }),
  encouraged: def({ id: 'encouraged', name: 'Encouraged', nameEs: 'Ánimo', kind: 'buff', duration: 'untilCamp', description: 'The next Tension gain is 1 lower, then it is lost.' }),
  will_of_fire: def({ id: 'will_of_fire', name: 'Will of Fire', nameEs: 'Voluntad de Fuego', kind: 'buff', duration: 'mission', description: 'Awakening: +2 to saves, immune to fear.', mods: { saves: 2 } }),

  bleeding: def({ id: 'bleeding', name: 'Bleeding', nameEs: 'Sangrando', kind: 'debuff', duration: 'untilTreated', curedBy: ['bandage', 'close_tenketsu'], description: '1d4 damage per round in battle and per road leg.' }),
  burning: def({ id: 'burning', name: 'Burning', nameEs: 'Quemado', kind: 'debuff', duration: 'rounds', count: 2, description: '1d6 per round; water or an action puts it out.' }),
  chakra_sealed: def({ id: 'chakra_sealed', name: 'Chakra sealed', nameEs: 'Chakra sellado', kind: 'debuff', duration: 'rounds', count: 2, description: 'Cannot cast jutsu.', mods: { noJutsu: true } }),
  confused: def({ id: 'confused', name: 'Confused', nameEs: 'Confundido', kind: 'debuff', duration: 'rounds', count: 2, description: '25 % chance to attack a random target.' }),
  marked: def({ id: 'marked', name: 'Marked', nameEs: 'Marcado', kind: 'debuff', duration: 'rounds', count: 3, description: 'Visible even when hidden.' }),
  poisoned: def({ id: 'poisoned', name: 'Poisoned', nameEs: 'Envenenado', kind: 'debuff', duration: 'untilCamp', curedBy: ['antidote', 'seal_poison'], description: 'Disadvantage on attacks and checks.', mods: { disadvAttacks: true, disadvChecks: true } }),
  wounded_leg: def({ id: 'wounded_leg', name: 'Wounded leg', nameEs: 'Pierna herida', kind: 'debuff', duration: 'untilCamp', description: '−3 m speed.', mods: { speedM: -3 } }),
  numb: def({ id: 'numb', name: 'Numb', nameEs: 'Entumecido', kind: 'debuff', duration: 'untilCamp', description: '−2 to DEX rolls.', mods: { dexRolls: -2 } }),
  hungry: def({ id: 'hungry', name: 'Hungry', nameEs: 'Hambriento', kind: 'debuff', duration: 'untilTreated', curedBy: ['food'], description: 'Disadvantage on CON saves; eating removes it.', mods: { disadvConSaves: true } }),
  crash: def({ id: 'crash', name: 'Crash', nameEs: 'Bajón', kind: 'debuff', duration: 'untilCamp', description: '−2 to all rolls (after a soldier pill).', mods: { allRolls: -2 } }),
  fever: def({ id: 'fever', name: 'Fever', nameEs: 'Fiebre', kind: 'debuff', duration: 'untilTreated', curedBy: ['field_surgery'], description: 'No HP back from rests.', mods: { noRestHp: true } }),
  fall_aftermath: def({ id: 'fall_aftermath', name: 'Fall aftermath', nameEs: 'Secuelas de caída', kind: 'debuff', duration: 'mission', description: '−2 AC, death saves with disadvantage.', mods: { ac: -2 } }),
  shrine_curse: def({ id: 'shrine_curse', name: "Shrine's curse", nameEs: 'Maldición del santuario', kind: 'debuff', duration: 'mission', curedBy: ['seal_poison'], description: '−1 to all saves.', mods: { saves: -1 } }),
  breakdown: def({ id: 'breakdown', name: 'Breakdown', nameEs: 'Quiebre', kind: 'debuff', duration: 'mission', description: 'Panic, Paranoia, Blind rage or Despair until the village.' }),
  grave_wound: def({ id: 'grave_wound', name: 'Grave wound', nameEs: 'Herida grave', kind: 'debuff', duration: 'mission', curedBy: ['field_surgery'], description: '−10 % max HP; badly treated, it leaves a scar.', mods: { maxHpPct: -10 } }),
};

/** What each kind of Breakdown does on top of the effect itself. */
export const BREAKDOWN_MODS: Record<string, Partial<EffectMods>> = {
  panic: {},
  paranoia: { refusesAllyHealing: true },
  blind_rage: { advAttacks: true, disadvWisSaves: true },
  despair: { saves: -2 },
};

const ZERO: EffectMods = {
  ac: 0, allRolls: 0, saves: 0, dexRolls: 0, speedM: 0, initiative: 0, meleeDamage: 0, firstJutsuDiscount: 0, tempHpAtBattleStart: 0, maxHpPct: 0,
  disadvAttacks: false, disadvChecks: false, disadvConSaves: false, disadvWisSaves: false, advAttacks: false, advStealth: false, advTensionSave: false,
  noJutsu: false, noRestHp: false, cannotBeSurprised: false, refusesAllyHealing: false,
};

function addMods(into: EffectMods, m: Partial<EffectMods>): void {
  for (const [k, v] of Object.entries(m) as [keyof EffectMods, number | boolean][]) {
    if (typeof v === 'number') (into[k] as number) += v;
    else if (v) (into[k] as boolean) = true;
  }
}

/** Sum of every effect's numbers and flags. */
export function effectMods(effects: readonly StatusEffect[] = []): EffectMods {
  const out = { ...ZERO };
  for (const e of effects) {
    const d = EFFECTS[e.id];
    if (!d) continue;
    if (d.mods) addMods(out, d.mods);
    if (e.id === 'breakdown' && e.detail && BREAKDOWN_MODS[e.detail]) addMods(out, BREAKDOWN_MODS[e.detail]);
  }
  return out;
}

export const hasEffect = (effects: readonly StatusEffect[] = [], id: EffectId): boolean => effects.some((e) => e.id === id);

/**
 * Adds an effect. The same effect doesn't stack: a new one replaces the old (fresh duration).
 * `campNo` is the number of camps already held, so until-camp effects know when they started.
 */
export function addEffect(
  effects: readonly StatusEffect[] = [],
  id: EffectId,
  opts: { campNo?: number; detail?: string; source?: string; count?: number } = {},
): { effects: StatusEffect[]; change: 'added' | 'refreshed' } {
  const d = EFFECTS[id];
  const e: StatusEffect = { id };
  if (d.duration === 'rounds' || d.duration === 'battles') e.remaining = opts.count ?? d.count ?? 1;
  if (d.duration === 'untilCamp') e.sinceCamp = opts.campNo ?? 0;
  if (opts.detail) e.detail = opts.detail;
  if (opts.source) e.source = opts.source;
  const had = hasEffect(effects, id);
  return { effects: [...effects.filter((x) => x.id !== id), e], change: had ? 'refreshed' : 'added' };
}

export const removeEffect = (effects: readonly StatusEffect[] = [], id: EffectId): StatusEffect[] => effects.filter((e) => e.id !== id);

/** Effects that a treatment removes ('bandage', 'antidote', 'food', 'field_surgery'…). */
export function treat(effects: readonly StatusEffect[] = [], treatment: string): { effects: StatusEffect[]; removed: EffectId[] } {
  const removed = effects.filter((e) => EFFECTS[e.id]?.curedBy?.includes(treatment)).map((e) => e.id);
  return { effects: effects.filter((e) => !removed.includes(e.id)), removed };
}

type Expiry = { effects: StatusEffect[]; expired: EffectId[] };

function split(effects: readonly StatusEffect[], keep: (e: StatusEffect) => StatusEffect | null): Expiry {
  const out: StatusEffect[] = [];
  const expired: EffectId[] = [];
  for (const e of effects) {
    const k = keep(e);
    if (k) out.push(k);
    else expired.push(e.id);
  }
  return { effects: out, expired };
}

/** End of the bearer's turn: round-counted effects lose a round. */
export const tickRound = (effects: readonly StatusEffect[] = []): Expiry =>
  split(effects, (e) => {
    if (EFFECTS[e.id]?.duration !== 'rounds') return e;
    const left = (e.remaining ?? 1) - 1;
    return left > 0 ? { ...e, remaining: left } : null;
  });

/** End of a battle (the night ambush counts): round effects end, battle-counted ones lose one. */
export const endBattle = (effects: readonly StatusEffect[] = []): Expiry =>
  split(effects, (e) => {
    const kind = EFFECTS[e.id]?.duration;
    if (kind === 'rounds') return null;
    if (kind !== 'battles') return e;
    const left = (e.remaining ?? 1) - 1;
    return left > 0 ? { ...e, remaining: left } : null;
  });

/** Leaving a zone of the road. */
export const leaveZone = (effects: readonly StatusEffect[] = []): Expiry => split(effects, (e) => (EFFECTS[e.id]?.duration === 'zone' ? null : e));

/** The morning after camp number `campNo`: until-camp effects gained before this camp expire. */
export const morningAfter = (effects: readonly StatusEffect[] = [], campNo: number): Expiry =>
  split(effects, (e) => (EFFECTS[e.id]?.duration === 'untilCamp' && (e.sinceCamp ?? 0) < campNo ? null : e));

/** Back at the village: only permanent effects (scars) remain. Mission traits are handled by the caller. */
export const endMission = (effects: readonly StatusEffect[] = []): Expiry => split(effects, (e) => (EFFECTS[e.id]?.duration === 'permanent' ? e : null));

/** Keeps only well-formed effects with known ids (for imported or old saves). */
export function sanitizeEffects(raw: unknown): StatusEffect[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is StatusEffect => !!e && typeof e === 'object' && typeof (e as StatusEffect).id === 'string' && (e as StatusEffect).id in EFFECTS)
    .map((e) => {
      const out: StatusEffect = { id: e.id };
      if (typeof e.remaining === 'number' && e.remaining > 0) out.remaining = Math.floor(e.remaining);
      if (typeof e.sinceCamp === 'number' && e.sinceCamp >= 0) out.sinceCamp = Math.floor(e.sinceCamp);
      if (typeof e.detail === 'string') out.detail = e.detail;
      if (typeof e.source === 'string') out.source = e.source;
      return out;
    });
}
