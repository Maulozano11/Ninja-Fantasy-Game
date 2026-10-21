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

/** Whether a ninja of this nature may learn the jutsu: it is not gated, or it is of the ninja's element. */
export const jutsuFitsNature = (j: JutsuDefinition, nature: ChakraNature): boolean => !natureGated(j) || j.nature === nature;

/** The jutsu a slot offers a ninja of this nature and clan, in the game's order. */
export function jutsuChoices(slot: JutsuSlot, nature: ChakraNature, clan: ClanType): JutsuDefinition[] {
  const category = SLOT_CATEGORY[slot];
  return JUTSUS_DATA.filter(
    (j) => j.category === category && (category !== 'Clan' || !j.requiredClan || j.requiredClan === clan) && jutsuFitsNature(j, nature),
  );
}

/** A slot's choices for a replacement: its own element first, lowest rank first, then the rest. */
function replacements(slot: JutsuSlot, nature: ChakraNature, clan: ClanType): JutsuDefinition[] {
  const list = jutsuChoices(slot, nature, clan);
  const own = list.filter((j) => j.nature === nature).sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));
  return [...own, ...list.filter((j) => j.nature !== nature)];
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
 * empty ('') when there is none. The other jutsu stay.
 */
export function refitSlots(
  loadout: Loadout,
  nature: ChakraNature,
  clan: ClanType,
  slots: JutsuSlot[],
  wrong: (j: JutsuDefinition) => boolean,
  allow: (j: JutsuDefinition) => boolean = () => true,
): { loadout: Loadout; swaps: JutsuSwap[] } {
  const out: Loadout = { ...loadout };
  const swaps: JutsuSwap[] = [];
  for (const slot of slots) {
    const j = JUTSUS_DATA.find((x) => x.id === out[slot]);
    if (!j || !wrong(j)) continue;
    const taken = new Set(slots.filter((s) => s !== slot).map((s) => out[s]));
    const list = replacements(slot, nature, clan).filter(allow);
    const to = list.find((x) => !taken.has(x.id)) ?? list[0];
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
export function fitLoadout(loadout: Loadout, nature: ChakraNature, clan: ClanType, allow?: (j: JutsuDefinition) => boolean): { loadout: Loadout; swaps: JutsuSwap[] } {
  return refitSlots(loadout, nature, clan, GATED_SLOTS, (j) => !jutsuFitsNature(j, nature), allow);
}

/** The gated jutsu of a loadout that are of another element (a legend's own second element, an older sheet). */
export function offNatureJutsus(loadout: Loadout, nature: ChakraNature): string[] {
  return GATED_SLOTS.map((s) => loadout[s]).filter((id) => {
    const j = JUTSUS_DATA.find((x) => x.id === id);
    return !!j && !jutsuFitsNature(j, nature);
  });
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
