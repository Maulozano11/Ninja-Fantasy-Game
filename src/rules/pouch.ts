// The tools a ninja carries in its own pouch, and the explosive tag that stopped being a jutsu.
//
// The owner (2026-10-21): "sello explosivo es un item o herramienta consumible". The explosive tag
// was a Utility jutsu ("Explosive Tag Ambush", id `trap_setter_tag`); it is a consumable tool now, like
// the soldier pill: the party's backpack carries tags, and in battle the item slot throws one (it
// blows up where it lands) or hides one on the ground (it blows up when an enemy steps on it, the
// jutsu's old effect). A sheet that had the jutsu gets tags in its pouch instead, and the pouch joins
// the backpack at the start of every mission and practice battle. Pure data, no React.

import { DEFAULT_CHARACTER } from '../data/shinobiData';
import type { ShinobiCharacter } from '../types/shinobi';

/** The explosive tag's old jutsu id: no longer a jutsu, only read to convert older sheets. */
export const TAG_JUTSU = 'trap_setter_tag';

/** The tags a sheet that had the explosive tag as a jutsu carries in its pouch instead. */
export const TAG_JUTSU_POUCH = 2;

/** The explosive tags in a ninja's own pouch (a missing or broken count is none). */
export function pouchTags(c: Pick<ShinobiCharacter, 'pouch'>): number {
  const n = c.pouch?.explosiveTags;
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(99, Math.floor(n))) : 0;
}

/**
 * A sheet that still has the explosive tag as a jutsu: the slot gets the starting sheet's jutsu for
 * that slot (in the Utility slot, Body Flicker) and the pouch gets TAG_JUTSU_POUCH tags, once. A
 * sheet without the old jutsu comes back as it is, so converting twice changes nothing.
 */
export function tagJutsuToItem(c: ShinobiCharacter): ShinobiCharacter {
  const slots = c.selectedJutsus;
  if (!slots) return c;
  const keys = (Object.keys(slots) as (keyof ShinobiCharacter['selectedJutsus'])[]).filter((k) => slots[k] === TAG_JUTSU);
  if (!keys.length) return c;
  const selectedJutsus = { ...slots };
  for (const k of keys) selectedJutsus[k] = DEFAULT_CHARACTER.selectedJutsus[k];
  return { ...c, selectedJutsus, pouch: { ...c.pouch, explosiveTags: pouchTags(c) + TAG_JUTSU_POUCH } };
}

/** The backpack with every member's own tags added (a mission's start, a practice battle). */
export function withPouches<S extends { explosiveTags: number }>(supplies: S, members: Pick<ShinobiCharacter, 'pouch'>[]): S {
  const tags = members.reduce((n, m) => n + pouchTags(m), 0);
  return tags ? { ...supplies, explosiveTags: supplies.explosiveTags + tags } : supplies;
}
