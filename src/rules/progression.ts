// What a new ninja may learn, and what is fixed once it is made (docs/GAMEPLAY_DESIGN.md, "Chakra
// type", the owner's answers of 2026-10-21, later):
// - "d y c y los de su clan": a new ninja picks jutsu of rank D and C, plus its own clan's (the clan
//   secret, whatever its rank). The S-rank slot opens later. A sheet keeps the jutsu it already has
//   (the legends, older sheets): only the creator's picks are capped.
// - "no se puede cambiar de tipo": the chakra type, the ninja's nature, is fixed once the ninja is
//   made. Changing it in the creator before that is fine (the jutsu of another element are swapped).
//   A second element at a higher level and a third with a special feat come later (not built; the
//   level and the feat are still to decide).
// - "los que elijan de clase genjutsu kenjutsu o taijutsu": the taijutsu, kenjutsu and genjutsu jutsu
//   belong to their class (rules/jutsuClass.ts). The creator offers them only to that class, and a new
//   class in the creator swaps the ones of another class, as a new type does.
// Pure data, no React.

import { JUTSUS_DATA, LEGENDARY_PRESETS } from '../data/shinobiData';
import type { ChakraNature, ClanType, JutsuDefinition, JutsuRank, ShinobiCharacter, ShinobiClassType } from '../types/shinobi';
import { jutsuFitsClass } from './jutsuClass';
import { fitLoadout, jutsuChoices, jutsuFitsNature, type JutsuSlot, type JutsuSwap, type Loadout, refitSlots } from './jutsuNature';

/** The ranks a new ninja may learn in the creator. */
export const NEW_NINJA_RANKS: readonly JutsuRank[] = ['D', 'C'];

/** The slots a new ninja fills from the creator's offers (the clan secret comes with the clan). */
const PICKED_SLOTS: JutsuSlot[] = ['slot1Utility', 'slot2Elemental', 'slot3Elemental', 'slot5Ultimate'];

/** A new ninja may learn it: one of its own clan's jutsu (whatever the rank), or a jutsu of rank D or C. */
export const rankOpen = (j: JutsuDefinition, clan: ClanType): boolean => (j.requiredClan ? j.requiredClan === clan : NEW_NINJA_RANKS.includes(j.rank));

/** The jutsu a slot offers a ninja of this nature, clan and class, at every rank: what the nature (rules/jutsuNature.ts) and the class (rules/jutsuClass.ts) allow. */
export function learnable(slot: JutsuSlot, nature: ChakraNature, clan: ClanType, cls: ShinobiClassType): JutsuDefinition[] {
  return jutsuChoices(slot, nature, clan).filter((j) => jutsuFitsClass(j, cls));
}

/** The jutsu the creator offers a new ninja's slot: what its nature and class allow, at the ranks a new ninja may take. */
export function creatorChoices(slot: JutsuSlot, nature: ChakraNature, clan: ClanType, cls: ShinobiClassType): JutsuDefinition[] {
  return learnable(slot, nature, clan, cls).filter((j) => rankOpen(j, clan));
}

/**
 * A slot locked by rank: its nature and class have jutsu for it, none a new ninja may take (the S-rank
 * slot: it opens later). A slot with nothing for its nature and class at any rank is not locked, it is
 * empty (a type with no element in a class with no kind of jutsu of its own, until their jutsu come).
 */
export const slotLocked = (slot: JutsuSlot, nature: ChakraNature, clan: ClanType, cls: ShinobiClassType): boolean =>
  creatorChoices(slot, nature, clan, cls).length === 0 && learnable(slot, nature, clan, cls).length > 0;

/** The jutsu of a loadout above the ranks a new ninja may take (a legend's, an older sheet's): they stay, marked. */
export function aboveRank(loadout: Loadout, clan: ClanType): string[] {
  return PICKED_SLOTS.map((s) => loadout[s]).filter((id) => {
    const j = JUTSUS_DATA.find((x) => x.id === id);
    return !!j && !rankOpen(j, clan);
  });
}

/**
 * A new ninja's loadout: each picked jutsu its nature or its rank doesn't allow is swapped for one it
 * may learn (its own element first, the lowest rank first), and a slot with nothing to offer (the
 * S-rank slot) is left empty. The clan secret stays. Used for a new game's sheet, a copy made from a
 * legend and the random ninja.
 */
export function fitNewNinja(loadout: Loadout, nature: ChakraNature, clan: ClanType, cls: ShinobiClassType): { loadout: Loadout; swaps: JutsuSwap[] } {
  return refitSlots(
    loadout,
    nature,
    clan,
    PICKED_SLOTS,
    (j) => !rankOpen(j, clan) || !jutsuFitsNature(j, nature) || !jutsuFitsClass(j, cls),
    (j) => rankOpen(j, clan) && jutsuFitsClass(j, cls),
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
export const isLegend = (c: Pick<ShinobiCharacter, 'id'>): boolean => LEGENDARY_PRESETS.some((p) => p.character.id === c.id);

/**
 * The sheet is a new ninja's: not made yet and not a legend's own sheet (a new game's sheet, a copy
 * made from a legend, the random ninja). Only a new ninja is held to the ranks it may learn; a legend
 * keeps its sheet and a made ninja its own (the owner's answer was about creating a ninja).
 */
export const learnsAsNew = (c: Pick<ShinobiCharacter, 'id' | 'created'>): boolean => !typeFixed(c) && !isLegend(c);

/**
 * The jutsu the creator offers a slot of this sheet: at a new ninja's ranks while the ninja is being
 * created (a new ninja, or a legend picked as a starting point: its own higher jutsu stay, marked),
 * every rank its nature allows once it is made.
 */
export function slotChoices(c: Pick<ShinobiCharacter, 'id' | 'created' | 'shinobiClass'>, slot: JutsuSlot, nature: ChakraNature, clan: ClanType): JutsuDefinition[] {
  return typeFixed(c) ? learnable(slot, nature, clan, c.shinobiClass) : creatorChoices(slot, nature, clan, c.shinobiClass);
}

/** What a sheet being swapped may get in a slot: what its class allows, at a new ninja's ranks while it is one. */
const swapAllow = (c: Pick<ShinobiCharacter, 'id' | 'created' | 'clan'>, cls: ShinobiClassType) => (j: JutsuDefinition) =>
  jutsuFitsClass(j, cls) && (!learnsAsNew(c) || rankOpen(j, c.clan));

/**
 * A new chakra type in the creator: the jutsu of another element are swapped for the new element's.
 * A new ninja gets ones it may learn (a slot with nothing left, the S-rank one, is emptied); a legend
 * keeps its sheet, so its S-rank jutsu becomes one of the new element's (or one of its class's kind),
 * or the slot is emptied when its nature and class have none.
 */
export function fitToType(c: Pick<ShinobiCharacter, 'id' | 'created' | 'selectedJutsus' | 'clan' | 'shinobiClass'>, nature: ChakraNature): { loadout: Loadout; swaps: JutsuSwap[] } {
  return fitLoadout(c.selectedJutsus, nature, c.clan, swapAllow(c, c.shinobiClass));
}

/** The slots a class gates, in the order they are filled (Utility and the clan secret are open). */
const CLASS_SLOTS: JutsuSlot[] = ['slot2Elemental', 'slot3Elemental', 'slot5Ultimate'];

/**
 * A new class in the creator, as a new type: the jutsu of another class's kind (taijutsu, kenjutsu,
 * genjutsu) are swapped for ones the ninja may learn (its own element first, the lowest rank first), at
 * a new ninja's ranks while it is one; a slot with nothing left is emptied. The other jutsu stay.
 */
export function fitToClass(c: Pick<ShinobiCharacter, 'id' | 'created' | 'selectedJutsus' | 'clan'>, nature: ChakraNature, cls: ShinobiClassType): { loadout: Loadout; swaps: JutsuSwap[] } {
  return refitSlots(c.selectedJutsus, nature, c.clan, CLASS_SLOTS, (j) => !jutsuFitsClass(j, cls), swapAllow(c, cls));
}
