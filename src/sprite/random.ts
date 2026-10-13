// Random appearance for the creator's Randomize button.

import { itemsForSlot } from './catalog';
import { CHAKRA_CHOICES } from './chakraInfo';
import type { ItemDef } from './ctx';
import { EMBLEMS } from './items/headband';
import { CLOTH_PALETTE, EYE_COLORS, HAIR_COLORS, SKIN_TONES } from './palettes';
import type { BodyType, EyeShape, FaceShape, HeadbandPosition, ItemChoice, NeckType, SlotId, SpriteAppearance } from './types';

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const chance = (p: number) => Math.random() < p;

function randomChoice(def: ItemDef): ItemChoice {
  // Keep each item's own default for metal/glow slots; randomize cloth, leather and hair.
  return {
    id: def.id,
    colors: def.colors.map((c) =>
      c.kind === 'hair' ? pick(HAIR_COLORS) : c.kind === 'metal' || c.kind === 'glow' ? c.default : chance(0.6) ? pick(CLOTH_PALETTE) : c.default,
    ),
  };
}

function slotItem(slot: SlotId): ItemChoice | undefined {
  const items = itemsForSlot(slot).filter((d) => !d.id.endsWith('_none'));
  return items.length ? randomChoice(pick(items)) : undefined;
}

export function randomAppearance(): SpriteAppearance {
  const slots: SpriteAppearance['slots'] = {};
  const put = (slot: SlotId, p: number) => {
    if (!chance(p)) return;
    const c = slotItem(slot);
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
    body: pick<BodyType>(['male', 'female', 'bulky']),
    skin: pick(SKIN_TONES.slice(0, 9)),
    eyeShape: pick<EyeShape>(['standard', 'sharp', 'round', 'calm', 'fierce', 'bright', 'piercing']),
    faceShape: pick<FaceShape>(['tapered', 'tapered', 'soft', 'square']),
    neck: pick<NeckType>(['slim', 'slim', 'strong']),
    eyeColor: pick(EYE_COLORS),
    slots,
    accessories,
    headband: {
      position: pick(positions),
      slashed: chance(0.15),
      tails: chance(0.4),
      emblem: pick(EMBLEMS).id,
      cloth: pick(CLOTH_PALETTE),
      plate: '#cbd5e1',
    },
    chakra: { color: pick(CHAKRA_CHOICES).id, onCharge: true, onCast: true, onVictory: chance(0.5) },
    pixelEdits: [],
  };
}
