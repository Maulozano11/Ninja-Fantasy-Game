// What a new ninja may learn, and what is fixed once it is made (docs/GAMEPLAY_DESIGN.md, "Chakra
// type", the owner's answers of 2026-10-21, later):
// - "d y c y los de su clan": a new ninja picks jutsu of rank D and C, plus its own clan's (the clan
//   secret, whatever its rank). A sheet keeps the jutsu it already has (the legends, older sheets): only
//   the creator's picks are capped.
// - "al subir al nivel 7 te un rango A y al 10 un rango S": every ninja learns rank A jutsu from level 7
//   (of its elements, and of its class's kind) and the S-rank slot opens at level 10. Enemies are not
//   built in the creator: this gates the player's choices, never a sheet's own jutsu or a battle.
// - "no se puede cambiar de tipo": the chakra type, the ninja's nature, is fixed once the ninja is
//   made. Changing it in the creator before that is fine (the jutsu of another element are swapped).
//   A second element at a higher level and a third with a special feat: "nivel 5 suena bien para segundo
//   elemento o subir de rango tu elemento principal" (rules/natureGrowth.ts). The ranks below follow it:
//   every ninja learns rank D and C jutsu and its clan's; at level 5 one that chose a higher rank also
//   learns its main element's rank B jutsu, and one that chose a second element that element's D and C;
//   at level 7 rank A, at level 10 rank S (the ladder: docs/GAMEPLAY_DESIGN.md).
// - "los que elijan de clase genjutsu kenjutsu o taijutsu": the taijutsu, kenjutsu and genjutsu jutsu
//   belong to their class (rules/jutsuClass.ts). The creator offers them only to that class, and a new
//   class in the creator swaps the ones of another class, as a new type does.
// Pure data, no React.

import { ALL_PRESETS, JUTSUS_DATA } from '../data/shinobiData';
import type { ChakraNature, ClanType, JutsuDefinition, JutsuRank, ShinobiCharacter, ShinobiClassType } from '../types/shinobi';
import { jutsuFitsClass } from './jutsuClass';
import { byRankDown, fitLoadout, jutsuChoices, jutsuFitsNature, type JutsuSlot, type JutsuSwap, type Loadout, natureGated, rankAtMost, refitSlots, REMOVED_JUTSUS, SLOT_CATEGORY } from './jutsuNature';
import { type Growth, growthOf, NO_GROWTH } from './natureGrowth';

/** The ranks a new ninja may learn in the creator. */
export const NEW_NINJA_RANKS: readonly JutsuRank[] = ['D', 'C'];

/** The level at which every ninja learns rank A jutsu: "al subir al nivel 7 te un rango A". */
export const RANK_A_LEVEL = 7;

/** The level at which the S-rank slot opens: "y al 10 un rango S". */
export const RANK_S_LEVEL = 10;

/** The ranks a ninja's level opens beyond D and C, whatever its level-5 choice: A at 7, S at 10. */
export const levelRanks = (level = 0): JutsuRank[] => [...(level >= RANK_A_LEVEL ? (['A'] as const) : []), ...(level >= RANK_S_LEVEL ? (['S'] as const) : [])];

/** The slots a new ninja fills from the creator's offers (the clan secret comes with the clan). */
const PICKED_SLOTS: JutsuSlot[] = ['slot1Utility', 'slot2Elemental', 'slot3Elemental', 'slot5Ultimate'];

/**
 * A ninja may learn it at its rank: one of its own clan's jutsu (whatever the rank), a jutsu of rank D or
 * C, when `rankUp` names its main element (the level-5 choice of a higher rank, rules/natureGrowth.ts) a
 * rank B jutsu of that element in the Element slots, and from `level` 7 a rank A jutsu, from 10 a rank S.
 * Which element and class a jutsu must be of is the nature's and the class's gate (`learnable`).
 */
export const rankOpen = (j: JutsuDefinition, clan: ClanType, rankUp?: ChakraNature, level?: number): boolean =>
  j.requiredClan
    ? j.requiredClan === clan
    : NEW_NINJA_RANKS.includes(j.rank) || (!!rankUp && j.rank === 'B' && natureGated(j) && j.nature === rankUp) || levelRanks(level).includes(j.rank);

/** The main element whose rank B jutsu a ninja of this nature and growth may learn, if any. */
const rankUpOf = (nature: ChakraNature, growth: Growth): ChakraNature | undefined => (growth.rankUp ? nature : undefined);

/** Whether a ninja of this nature, clan and growth (its level-5 choice and its level) may learn the jutsu at its rank. */
const rankFits = (j: JutsuDefinition, nature: ChakraNature, clan: ClanType, growth: Growth): boolean => rankOpen(j, clan, rankUpOf(nature, growth), growth.level);

/**
 * The jutsu a slot offers a ninja of this nature (and the other elements of its growth), clan and class,
 * at every rank: what the nature (rules/jutsuNature.ts) and the class (rules/jutsuClass.ts) allow.
 */
export function learnable(slot: JutsuSlot, nature: ChakraNature, clan: ClanType, cls: ShinobiClassType, growth: Growth = NO_GROWTH): JutsuDefinition[] {
  return jutsuChoices(slot, nature, clan, growth.extra).filter((j) => jutsuFitsClass(j, cls));
}

/**
 * The jutsu the creator offers a slot: what the ninja's nature, growth and class allow, at the ranks it
 * may take (D and C and its clan's; at level 5, its growth's too; A from level 7, S from level 10).
 */
export function creatorChoices(slot: JutsuSlot, nature: ChakraNature, clan: ClanType, cls: ShinobiClassType, growth: Growth = NO_GROWTH): JutsuDefinition[] {
  return learnable(slot, nature, clan, cls, growth).filter((j) => rankFits(j, nature, clan, growth));
}

/**
 * A slot locked by rank: its nature and class have jutsu for it, none the ninja may take yet (the S-rank
 * slot below level 10). A slot with nothing for its nature and class at any rank is not locked, it is
 * empty (a type with no element in a class with no kind of jutsu of its own, until their jutsu come).
 */
export const slotLocked = (slot: JutsuSlot, nature: ChakraNature, clan: ClanType, cls: ShinobiClassType, growth: Growth = NO_GROWTH): boolean =>
  creatorChoices(slot, nature, clan, cls, growth).length === 0 && learnable(slot, nature, clan, cls, growth).length > 0;

/**
 * The level at which a locked slot opens with the level alone (7 for rank A, 10 for the S-rank slot), or
 * undefined when the level doesn't open it (or it is not locked).
 */
export function slotOpensAt(slot: JutsuSlot, nature: ChakraNature, clan: ClanType, cls: ShinobiClassType, growth: Growth = NO_GROWTH): number | undefined {
  if (!slotLocked(slot, nature, clan, cls, growth)) return undefined;
  return [RANK_A_LEVEL, RANK_S_LEVEL].find((l) => l > (growth.level ?? 0) && creatorChoices(slot, nature, clan, cls, { ...growth, level: l }).length > 0);
}

/**
 * The jutsu of a loadout above the ranks the ninja may take (a legend's, an older sheet's): they stay,
 * marked. `rankUp` is its main element when it chose a higher rank at level 5, `level` its level.
 */
export function aboveRank(loadout: Loadout, clan: ClanType, rankUp?: ChakraNature, level?: number): string[] {
  return PICKED_SLOTS.map((s) => loadout[s]).filter((id) => {
    const j = JUTSUS_DATA.find((x) => x.id === id);
    return !!j && !rankOpen(j, clan, rankUp, level);
  });
}

/**
 * A new ninja's loadout: each picked jutsu its nature or its rank doesn't allow is swapped for one it
 * may learn (its own element first, the lowest rank first), and a slot with nothing to offer (the
 * S-rank slot below level 10) is left empty. The clan secret stays. Used for a new game's sheet, a copy made from a
 * legend and the random ninja.
 */
export function fitNewNinja(
  loadout: Loadout,
  nature: ChakraNature,
  clan: ClanType,
  cls: ShinobiClassType,
  growth: Growth = NO_GROWTH,
): { loadout: Loadout; swaps: JutsuSwap[] } {
  return refitSlots(
    loadout,
    nature,
    clan,
    PICKED_SLOTS,
    (j) => !rankFits(j, nature, clan, growth) || !jutsuFitsNature(j, nature, growth.extra) || !jutsuFitsClass(j, cls),
    (j) => rankFits(j, nature, clan, growth) && jutsuFitsClass(j, cls),
    growth.extra,
  );
}

/**
 * The ninja's chakra type can no longer change: it has been made (the creator's Accept, a saved or
 * imported sheet). A new ninja and a legend picked as a starting point can still change it.
 */
export const typeFixed = (c: Pick<ShinobiCharacter, 'created'>): boolean => c.created === true;

/** A sheet saved on this device or imported is a ninja that has been made. */
export const asMade = (c: ShinobiCharacter): ShinobiCharacter => (c.created === true ? c : { ...c, created: true });

/** A legend's own sheet (picked in the creator as a starting point): it keeps its jutsu, whatever their rank. */
export const isLegend = (c: Pick<ShinobiCharacter, 'id'>): boolean => ALL_PRESETS.some((p) => p.character.id === c.id);

/**
 * The sheet is a new ninja's: not made yet and not a legend's own sheet (a new game's sheet, a copy
 * made from a legend, the random ninja). A new ninja's sheet is fitted to the ranks it may learn; a
 * legend keeps its sheet and a made ninja its own (marked where they are above its ranks).
 */
export const learnsAsNew = (c: Pick<ShinobiCharacter, 'id' | 'created'>): boolean => !typeFixed(c) && !isLegend(c);

/** The sheet's fields its growth is read from (rules/natureGrowth.ts). */
type Sheet = Pick<ShinobiCharacter, 'id' | 'created' | 'level'> & Partial<Pick<ShinobiCharacter, 'natureGrowth' | 'extraNatures' | 'selectedFeats'>>;

/**
 * The jutsu the creator offers a slot of this sheet, for every ninja (a new one, a legend picked as a
 * starting point, a made one): its nature, growth and class, at the ranks its level and growth open
 * (D and C and its clan's; at level 5 its growth's; A from 7; S from 10). A sheet's own higher jutsu
 * stay, marked. (Before
 * the owner's level-5 answer a made ninja was offered every rank; with ranks earned at level 5, it is
 * held to its level as every ninja is: the builder's reading, docs/GAMEPLAY_DESIGN.md.)
 */
export function slotChoices(c: Sheet & Pick<ShinobiCharacter, 'shinobiClass'>, slot: JutsuSlot, nature: ChakraNature, clan: ClanType): JutsuDefinition[] {
  return creatorChoices(slot, nature, clan, c.shinobiClass, growthOf(c, nature));
}

/** What a sheet being swapped may get in a slot: what its class allows, at its ranks while it is a new ninja's. */
const swapAllow = (c: Sheet & Pick<ShinobiCharacter, 'clan'>, cls: ShinobiClassType, nature: ChakraNature, growth: Growth) => (j: JutsuDefinition) =>
  jutsuFitsClass(j, cls) && (!learnsAsNew(c) || rankFits(j, nature, c.clan, growth));

/**
 * A new chakra type in the creator: the jutsu of another element are swapped for the new element's.
 * A new ninja gets ones it may learn (a slot with nothing left, the S-rank one, is emptied); a legend
 * keeps its sheet, so its S-rank jutsu becomes one of the new element's (or one of its class's kind),
 * or the slot is emptied when its nature and class have none.
 */
export function fitToType(c: Sheet & Pick<ShinobiCharacter, 'selectedJutsus' | 'clan' | 'shinobiClass'>, nature: ChakraNature): { loadout: Loadout; swaps: JutsuSwap[] } {
  const growth = growthOf(c, nature);
  return fitLoadout(c.selectedJutsus, nature, c.clan, swapAllow(c, c.shinobiClass, nature, growth), growth.extra);
}

/** The slots a class gates, in the order they are filled (Utility and the clan secret are open). */
const CLASS_SLOTS: JutsuSlot[] = ['slot2Elemental', 'slot3Elemental', 'slot5Ultimate'];

/**
 * A new class in the creator, as a new type: the jutsu of another class's kind (taijutsu, kenjutsu,
 * genjutsu) are swapped for ones the ninja may learn (its own element first, the lowest rank first), at
 * a new ninja's ranks while it is one; a slot with nothing left is emptied. The other jutsu stay.
 */
export function fitToClass(c: Sheet & Pick<ShinobiCharacter, 'selectedJutsus' | 'clan'>, nature: ChakraNature, cls: ShinobiClassType): { loadout: Loadout; swaps: JutsuSwap[] } {
  const growth = growthOf(c, nature);
  return refitSlots(c.selectedJutsus, nature, c.clan, CLASS_SLOTS, (j) => !jutsuFitsClass(j, cls), swapAllow(c, cls, nature, growth), growth.extra);
}

/**
 * A new level-5 choice in the creator (`next` is the sheet with it, `before` the sheet without): the
 * jutsu it no longer opens are swapped for ones the ninja may learn (its own element first, the lowest
 * rank first), as a new type does: those of an element it no longer has, and the rank B jutsu of its
 * main element when it no longer has the higher rank. A legend's own jutsu of a rank above its own stay
 * (marked), as they do on a type change. A slot with nothing left is emptied.
 */
export function fitToGrowth(
  before: Sheet,
  next: Sheet & Pick<ShinobiCharacter, 'selectedJutsus' | 'clan' | 'shinobiClass'>,
  nature: ChakraNature,
): { loadout: Loadout; swaps: JutsuSwap[] } {
  const was = growthOf(before, nature);
  const now = growthOf(next, nature);
  const lostB = (j: JutsuDefinition) => was.rankUp && !now.rankUp && !isLegend(next) && !rankOpen(j, next.clan, undefined, now.level) && rankOpen(j, next.clan, nature, now.level);
  return refitSlots(
    next.selectedJutsus,
    nature,
    next.clan,
    PICKED_SLOTS,
    (j) => !jutsuFitsNature(j, nature, now.extra) || lostB(j),
    swapAllow(next, next.shinobiClass, nature, now),
    now.extra,
  );
}

/**
 * A saved sheet's slots that name a removed jutsu (rules/jutsuNature.ts, REMOVED_JUTSUS: Yasaka no
 * Magatama, the owner, 2026-10-22), each given the best jutsu the ninja may learn in that slot: what
 * its nature (and its growth's elements), clan and class allow, of the removed jutsu's rank or lower,
 * not one another slot holds. Of the removed jutsu's kind first (a genjutsu for the genjutsu), then of
 * the ninja's own elements, then the rest; the highest rank first, so the slot loses as little as it
 * can. A saved sheet is a made ninja and keeps its ranks, as on a type change (fitToType), so a lost
 * rank S becomes a rank S. A slot with nothing to offer is left empty (''), as a type change leaves it.
 * The other slots stay.
 */
export function refitRemoved(
  c: Sheet & Pick<ShinobiCharacter, 'selectedJutsus' | 'clan' | 'shinobiClass'>,
  nature: ChakraNature,
): { loadout: Loadout; swaps: JutsuSwap[] } {
  const growth = growthOf(c, nature);
  const mine: string[] = [nature, ...growth.extra];
  const out: Loadout = { ...c.selectedJutsus };
  const swaps: JutsuSwap[] = [];
  const slots = Object.keys(SLOT_CATEGORY) as JutsuSlot[];
  for (const slot of slots) {
    const from = out[slot];
    const lost = Object.hasOwn(REMOVED_JUTSUS, from) ? REMOVED_JUTSUS[from] : undefined;
    if (!lost) continue;
    const taken = new Set(slots.filter((s) => s !== slot).map((s) => out[s]));
    const kind = (j: JutsuDefinition) => (j.nature === lost.nature ? 0 : mine.includes(j.nature) ? 1 : 2);
    const list = learnable(slot, nature, c.clan, c.shinobiClass, growth)
      .filter((j) => rankAtMost(j.rank, lost.rank) && !taken.has(j.id))
      .sort((a, b) => kind(a) - kind(b) || byRankDown(a, b));
    out[slot] = list[0]?.id ?? '';
    swaps.push({ slot, from, to: out[slot] });
  }
  return { loadout: out, swaps };
}
