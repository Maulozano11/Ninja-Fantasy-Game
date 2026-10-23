// Which jutsu a ninja's nature lets it learn in the creator (docs/GAMEPLAY_DESIGN.md, "Chakra type").
//
// The owner: the elemental nature is the chakra type, and it decides the elemental jutsu a ninja can
// learn. So the Element slots and the S-rank slot offer jutsu of the ninja's own element, plus the
// jutsu that are no element (taijutsu, kenjutsu, genjutsu). The Utility slot (the medical palm, a
// utility jutsu: the owner, 2026-10-21) and the clan secret are never gated. A type without an element (Light, Void; Shadow and Spirit are
// pending) learns no elemental jutsu: its own jutsu come later. Pure data, no React.

import { JUTSUS_DATA } from '../data/shinobiData';
import { TAG_JUTSU } from './pouch';
import type { ChakraNature, ClanType, ElementalNature, JutsuDefinition, JutsuSlotCategory, ShinobiCharacter } from '../types/shinobi';

export type JutsuSlot = keyof ShinobiCharacter['selectedJutsus'];
export type Loadout = ShinobiCharacter['selectedJutsus'];

/** The five elements. A jutsu of one of them is elemental. */
export const ELEMENTS: readonly ElementalNature[] = ['Fire', 'Water', 'Wind', 'Lightning', 'Earth'];

/** What each of the five slots holds. */
export const SLOT_CATEGORY: Record<JutsuSlot, JutsuSlotCategory> = {
  slot1Utility: 'Utility',
  slot2Elemental: 'Elemental',
  slot3Elemental: 'Elemental',
  slot4Clan: 'Clan',
  slot5Ultimate: 'Ultimate',
};

/** The slots the nature gates, in the order they are filled. */
const GATED_SLOTS: JutsuSlot[] = ['slot2Elemental', 'slot3Elemental', 'slot5Ultimate'];

const RANK_ORDER = ['D', 'C', 'B', 'A', 'S'];

/**
 * Whether the nature decides if a ninja may learn this jutsu: an elemental jutsu in the Element or
 * S-rank slots. Utility jutsu (the medical palm, a Water jutsu open to every nature) and clan secrets
 * are not gated.
 */
export const natureGated = (j: JutsuDefinition): boolean => (j.category === 'Elemental' || j.category === 'Ultimate') && ELEMENTS.includes(j.nature);

/**
 * Whether a ninja of this nature may learn the jutsu: it is not gated, or it is of the ninja's element,
 * or of one of its `extra` elements (a second element at level 5, a third with a feat:
 * rules/natureGrowth.ts).
 */
export const jutsuFitsNature = (j: JutsuDefinition, nature: ChakraNature, extra: readonly ChakraNature[] = []): boolean =>
  !natureGated(j) || j.nature === nature || (extra as readonly string[]).includes(j.nature);

/** The jutsu a slot offers a ninja of this nature (and `extra` elements) and clan, in the game's order. */
export function jutsuChoices(slot: JutsuSlot, nature: ChakraNature, clan: ClanType, extra: readonly ChakraNature[] = []): JutsuDefinition[] {
  const category = SLOT_CATEGORY[slot];
  return JUTSUS_DATA.filter(
    (j) => j.category === category && (category !== 'Clan' || !j.requiredClan || j.requiredClan === clan) && jutsuFitsNature(j, nature, extra),
  );
}

/** A slot's choices for a replacement: its own element first, lowest rank first, then its other elements', then the rest. */
function replacements(slot: JutsuSlot, nature: ChakraNature, clan: ClanType, extra: readonly ChakraNature[] = []): JutsuDefinition[] {
  const list = jutsuChoices(slot, nature, clan, extra);
  const byRank = (a: JutsuDefinition, b: JutsuDefinition) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
  const of = (n: ChakraNature) => list.filter((j) => j.nature === n).sort(byRank);
  const mine = [nature, ...extra];
  return [...mine.flatMap(of), ...list.filter((j) => !(mine as string[]).includes(j.nature))];
}

/** `to` is '' when the slot was left empty: nothing the ninja may learn fits it (a new ninja's S-rank slot). */
export interface JutsuSwap {
  slot: JutsuSlot;
  from: string;
  to: string;
}

/**
 * Each slot of `slots` whose jutsu is `wrong` gets a replacement the ninja may learn and `allow`s (of
 * its own element first, the lowest rank first, not one another of those slots holds), or is left
 * empty ('') when there is none: an empty slot the player can see, never the same jutsu twice (since the
 * class gates the taijutsu, kenjutsu and genjutsu jutsu, a nature and class may have one jutsu for two
 * slots, rules/jutsuClass.ts). The other jutsu stay.
 */
export function refitSlots(
  loadout: Loadout,
  nature: ChakraNature,
  clan: ClanType,
  slots: JutsuSlot[],
  wrong: (j: JutsuDefinition) => boolean,
  allow: (j: JutsuDefinition) => boolean = () => true,
  extra: readonly ChakraNature[] = [],
): { loadout: Loadout; swaps: JutsuSwap[] } {
  const out: Loadout = { ...loadout };
  const swaps: JutsuSwap[] = [];
  for (const slot of slots) {
    const j = JUTSUS_DATA.find((x) => x.id === out[slot]);
    if (!j || !wrong(j)) continue;
    const taken = new Set(slots.filter((s) => s !== slot).map((s) => out[s]));
    const list = replacements(slot, nature, clan, extra).filter(allow);
    const to = list.find((x) => !taken.has(x.id));
    out[slot] = to?.id ?? '';
    swaps.push({ slot, from: j.id, to: out[slot] });
  }
  return { loadout: out, swaps };
}

/**
 * A loadout fitted to a nature: each gated jutsu of another element is swapped for one the ninja may
 * learn (of its own element first, the lowest rank first, not one another Element slot holds). The
 * other jutsu stay. Used when the player changes the chakra type in the creator, where `allow` is the
 * rank a new ninja may pick (rules/progression.ts): a slot with nothing left to offer is emptied.
 */
export function fitLoadout(
  loadout: Loadout,
  nature: ChakraNature,
  clan: ClanType,
  allow?: (j: JutsuDefinition) => boolean,
  extra: readonly ChakraNature[] = [],
): { loadout: Loadout; swaps: JutsuSwap[] } {
  return refitSlots(loadout, nature, clan, GATED_SLOTS, (j) => !jutsuFitsNature(j, nature, extra), allow, extra);
}

/** The gated jutsu of a loadout that are of none of the ninja's elements (an older sheet, a second element it doesn't have). */
export function offNatureJutsus(loadout: Loadout, nature: ChakraNature, extra: readonly ChakraNature[] = []): string[] {
  return GATED_SLOTS.map((s) => loadout[s]).filter((id) => {
    const j = JUTSUS_DATA.find((x) => x.id === id);
    return !!j && !jutsuFitsNature(j, nature, extra);
  });
}

/**
 * A jutsu in the S-rank slot that is an Element slot's now (the Devouring Tide, rank S until the
 * owner made it rank A, 2026-10-21; asked whether to move it, "si") goes to an Element slot: an empty
 * one, else the one with the lower rank (the second on a tie), whose jutsu it takes the place of.
 * The S-rank slot is left empty for the player to fill. Null when there is nothing to move.
 */
export function ultimateToElement(loadout: Loadout): { loadout: Loadout; swap: JutsuSwap } | null {
  const j = JUTSUS_DATA.find((x) => x.id === loadout.slot5Ultimate);
  if (!j || j.category !== 'Elemental') return null;
  const rank = (slot: JutsuSlot) => {
    const id = loadout[slot];
    return !id || id === j.id ? -1 : RANK_ORDER.indexOf(JUTSUS_DATA.find((x) => x.id === id)?.rank ?? 'D');
  };
  const slot: JutsuSlot = rank('slot2Elemental') < rank('slot3Elemental') ? 'slot2Elemental' : 'slot3Elemental';
  return { loadout: { ...loadout, [slot]: j.id, slot5Ultimate: '' }, swap: { slot, from: loadout[slot], to: j.id } };
}

/**
 * An imported sheet's jutsu slots: each must name a jutsu that exists (an old id is read through
 * `renamed`), or be empty (a new ninja's S-rank slot), or else it gets `defaults`' jutsu for that
 * slot. The old explosive tag jutsu goes through: migrateCharacter turns it into the item.
 */
export function importedSlots(slots: Record<string, unknown>, defaults: Loadout, renamed: Record<string, string> = {}): Loadout {
  const out = { ...defaults };
  for (const k of Object.keys(defaults) as JutsuSlot[]) {
    const raw = slots[k];
    const id = typeof raw === 'string' ? (renamed[raw] ?? raw) : undefined;
    if (id !== undefined && (id === '' || id === TAG_JUTSU || JUTSUS_DATA.some((j) => j.id === id))) out[k] = id;
  }
  return out;
}
