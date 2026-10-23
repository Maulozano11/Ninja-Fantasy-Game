// Random appearance for the creator's Randomize button.

import { fitsBody, itemsForSlot } from './catalog';
import { TINT_CHOICES } from './chakraInfo';
import { OFFERED_TYPES } from './chakraNature';
import type { ItemDef } from './ctx';
import { CLOTH_PALETTE, EYE_COLORS, HAIR_COLORS, SKIN_TONES } from './palettes';
import { CAST_STYLES, type BodyType, type EyeShape, type FaceShape, type HeadbandPosition, type ItemChoice, type SlotId, type SpriteAppearance } from './types';

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const chance = (p: number) => Math.random() < p;

function randomChoice(def: ItemDef): ItemChoice {
  // Keep each item's own default for metal/glow slots; randomize cloth, leather and hair, and parts.
  const choice: ItemChoice = {
    id: def.id,
    colors: def.colors.map((c) =>
      c.kind === 'hair' ? pick(HAIR_COLORS) : c.kind === 'metal' || c.kind === 'glow' ? c.default : chance(0.6) ? pick(CLOTH_PALETTE) : c.default,
    ),
  };
  if (def.parts) choice.parts = Object.fromEntries(def.parts.map((p) => [p.key, pick(p.options).id]));
  return choice;
}

function slotItem(slot: SlotId, body: BodyType): ItemChoice | undefined {
  const items = itemsForSlot(slot).filter((d) => !d.id.endsWith('_none') && fitsBody(d, body));
  return items.length ? randomChoice(pick(items)) : undefined;
}

export function randomAppearance(): SpriteAppearance {
  const body = pick<BodyType>(['male', 'female', 'bulky']);
  const slots: SpriteAppearance['slots'] = {};
  const put = (slot: SlotId, p: number) => {
    if (!chance(p)) return;
    const c = slotItem(slot, body);
    if (c) slots[slot] = c;
  };
  put('hair', 0.97);
  put('top', 0.9);
  put('bottom', 1);
  put('feet', 0.95);
  put('armor', 0.55);
  put('skirt', 0.15);
  put('waist', 0.5);
  put('hands', 0.35);
  put('cape', 0.3);
  put('held', 0.6);
  put('face', 0.15);
  const accessories = itemsForSlot('accessory')
    .filter(() => chance(0.12))
    .slice(0, 2)
    .map(randomChoice);
  const positions: HeadbandPosition[] = ['none', 'forehead', 'forehead', 'neck', 'arm', 'waist'];
  return {
    version: 1,
    body,
    skin: pick(SKIN_TONES.slice(0, 9)),
    eyeShape: pick<EyeShape>(['standard', 'sharp', 'round', 'calm', 'fierce', 'bright', 'piercing', 'valiant', 'roman', 'stern']),
    faceShape: pick<FaceShape>(['tapered', 'tapered', 'soft', 'square', 'valiant', 'roman', 'founder', 'stern']),
    cast: { style: pick(CAST_STYLES) },
    eyeColor: pick(EYE_COLORS),
    slots,
    accessories,
    headband: {
      position: pick(positions),
      tails: chance(0.4),
      cloth: pick(CLOTH_PALETTE),
    },
    // a type the player could pick (its nature), one of its bursts, and now and then another color: the color never changes the type
    chakra: { color: pick(pick(OFFERED_TYPES).bursts), tint: chance(0.25) ? pick(TINT_CHOICES).id : undefined, onCharge: true, onCast: true, onVictory: chance(0.5) },
    pixelEdits: [],
  };
}
