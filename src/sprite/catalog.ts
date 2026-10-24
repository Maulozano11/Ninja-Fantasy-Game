// Registry of every equippable item. Adding a new item = adding one entry to
// one of the item modules; the creator UI lists items from here.

import type { ItemDef } from './ctx';
import { ACCESSORY_ITEMS, FACE_ITEMS, HELD_ITEMS } from './items/accessories';
import { ARMOR_ITEMS, SKIRT_ITEMS } from './items/armor';
import { CAPE_ITEMS } from './items/capes';
import { BOTTOM_ITEMS, HAND_ITEMS, TOP_ITEMS, WAIST_ITEMS } from './items/clothes';
import { FEET_ITEMS } from './items/feet';
import { HAIR_ITEMS } from './items/hair';
import { KNIGHT_ITEMS } from './items/knights';
import type { BodyType, SlotId } from './types';

export const ALL_ITEMS: ItemDef[] = [
  ...HAIR_ITEMS,
  ...FACE_ITEMS,
  ...TOP_ITEMS,
  ...BOTTOM_ITEMS,
  ...ARMOR_ITEMS,
  ...SKIRT_ITEMS,
  ...WAIST_ITEMS,
  ...FEET_ITEMS,
  ...HAND_ITEMS,
  ...CAPE_ITEMS,
  ...HELD_ITEMS,
  ...ACCESSORY_ITEMS,
  ...KNIGHT_ITEMS,
];

const byId = new Map(ALL_ITEMS.map((d) => [d.id, d]));

export function getItem(id: string): ItemDef | undefined {
  return byId.get(id);
}

/** Whether a body type can wear the item (see ItemDef.bodies). */
export const fitsBody = (d: ItemDef, body: BodyType): boolean => !d.bodies || d.bodies.includes(body);

export function itemsForSlot(slot: SlotId | 'accessory'): ItemDef[] {
  return ALL_ITEMS.filter((d) => d.slot === slot);
}
