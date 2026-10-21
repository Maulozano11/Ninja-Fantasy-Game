// Which jutsu a ninja's nature lets it learn in the creator (docs/GAMEPLAY_DESIGN.md, "Chakra type").
//
// The owner: the elemental nature is the chakra type, and it decides the elemental jutsu a ninja can
// learn. So the Element slots and the S-rank slot offer jutsu of the ninja's own element, plus the
// jutsu that are no element (taijutsu, kenjutsu, genjutsu). The Utility slot (tools, the medical palm)
// and the clan secret are never gated. A type without an element (Light, Void; Shadow and Spirit are
// pending) learns no elemental jutsu: its own jutsu come later. Pure data, no React.

import { JUTSUS_DATA } from '../data/shinobiData';
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
 * S-rank slots. Utility jutsu (the explosive tag, the medical palm) and clan secrets are not gated.
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

export interface JutsuSwap {
  slot: JutsuSlot;
  from: string;
  to: string;
}

/**
 * A loadout fitted to a nature: each gated jutsu of another element is swapped for one the ninja may
 * learn (of its own element first, the lowest rank first, not one another Element slot holds). The
 * other jutsu stay. Used when the player changes the chakra type in the creator.
 */
export function fitLoadout(loadout: Loadout, nature: ChakraNature, clan: ClanType): { loadout: Loadout; swaps: JutsuSwap[] } {
  const out: Loadout = { ...loadout };
  const swaps: JutsuSwap[] = [];
  for (const slot of GATED_SLOTS) {
    const j = JUTSUS_DATA.find((x) => x.id === out[slot]);
    if (!j || jutsuFitsNature(j, nature)) continue;
    const taken = new Set(GATED_SLOTS.filter((s) => s !== slot).map((s) => out[s]));
    const to = replacements(slot, nature, clan).find((x) => !taken.has(x.id)) ?? replacements(slot, nature, clan)[0];
    if (!to) continue;
    out[slot] = to.id;
    swaps.push({ slot, from: j.id, to: to.id });
  }
  return { loadout: out, swaps };
}

/** The gated jutsu of a loadout that are of another element (a legend's own second element, an older sheet). */
export function offNatureJutsus(loadout: Loadout, nature: ChakraNature): string[] {
  return GATED_SLOTS.map((s) => loadout[s]).filter((id) => {
    const j = JUTSUS_DATA.find((x) => x.id === id);
    return !!j && !jutsuFitsNature(j, nature);
  });
}
