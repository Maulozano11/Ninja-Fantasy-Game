// Bridges the older character format (hairstyle/armorStyle/palette strings)
// to the layered sprite appearance, so saved characters and enemy clones
// keep working.

import { rgbToHsl, hexToRgb } from './color';
import { NO_HEADBAND, type ChakraColorId, type EyeSpecial, type ItemChoice, type SlotId, type SpriteAppearance } from './types';
import type { ShinobiCharacter } from '../types/shinobi';

const HAIR: Record<string, string> = {
  'Naruto Spike': 'hair_sunburst',
  'Sasuke Rogue Fringe': 'hair_raven',
  'Minato Winged Flare': 'hair_sunburst',
  'Kakashi Tilt': 'hair_bristle',
  'Madara Wild Cascade': 'hair_warlord',
  'Itachi Low Ribbon': 'hair_lowtail',
  'Cloud Chocobo Spikes': 'hair_storm',
  'Sephiroth Parted Flow': 'hair_long',
  'Squall Modern Fringe': 'hair_lion',
  'Knight Pointed Helm': 'hair_helm',
  'Somnus Caelum': 'hair_warlord',
  'Noctis Caelum': 'hair_midnight',
};

const ARMOR: Record<string, string> = {
  'Leaf Chunin Flak': 'armor_flak',
  'Sand Wind Guard': 'armor_flak',
  'Mist Storm Vest': 'armor_flak',
  'Samurai O-Yoroi': 'armor_lamellar',
  'Roman Legionary Segmentata': 'armor_legion',
  'Greek Hoplite Cuirass': 'armor_bronze',
  'Ronin Wanderer Cloak': 'armor_wanderer',
  'ANBU Spec-Ops': 'armor_shadowops',
  'Dark Knight Plate': 'armor_crimson_plate',
};

const CAPE: Record<string, string> = {
  'Hokage White Haori': 'cape_haori',
  'Akatsuki Black Cloak': 'cape_rogue',
  'Ronin Traveler Cape': 'cape_traveler',
  'Crimson Billowing Knight Cape': 'cape_crimson',
};

const HELD: Record<string, string> = {
  'Katana Blade': 'held_katana',
  'Kunai & Tag': 'held_kunai',
  'Rasengan Sphere': 'held_spiral',
  'Chidori Lightning': 'held_lightning',
  'Gentle Fist Palm': 'held_palm',
};

export function dojutsuToEye(dojutsu: string | undefined): EyeSpecial {
  if (!dojutsu || dojutsu === 'None') return 'none';
  if (dojutsu.startsWith('Mangekyo')) return 'pinwheel';
  if (dojutsu.includes('1-Tomoe')) return 'tomoe1';
  if (dojutsu.includes('Sharingan')) return 'tomoe3';
  if (dojutsu.includes('Veined')) return 'paleVeins';
  if (dojutsu.includes('Byakugan')) return 'pale';
  if (dojutsu.includes('Sage')) return 'sage';
  return 'none';
}

export function hexToChakraId(hex: string | undefined): ChakraColorId {
  if (!hex) return 'blue';
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  if (s < 0.25) return l > 0.6 ? 'white' : 'black';
  if (h < 15 || h >= 345) return 'red';
  if (h < 40) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 232) return 'blue';
  if (h < 262) return 'indigo';
  return 'violet';
}

const choice = (id: string, ...colors: (string | undefined)[]): ItemChoice => ({
  id,
  colors: colors.filter((c): c is string => !!c),
});

export function defaultAppearance(): SpriteAppearance {
  return {
    version: 1,
    body: 'male',
    skin: '#f2c7a0',
    eyeShape: 'standard',
    eyeColor: '#3b82f6',
    slots: {
      hair: choice('hair_sunburst'),
      top: choice('top_tee'),
      bottom: choice('bottom_shinobi'),
      feet: choice('feet_shinobi'),
    },
    accessories: [],
    headband: { ...NO_HEADBAND },
    chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false },
    pixelEdits: [],
  };
}

export function appearanceFromLegacy(c: ShinobiCharacter): SpriteAppearance {
  const p = c.palette;
  const look = defaultAppearance();
  look.skin = p.skinTone || look.skin;
  look.eyeColor = p.eyeColor || look.eyeColor;
  look.slots.hair = choice(HAIR[c.hairstyle] || 'hair_sunburst', p.hairColor);
  look.slots.top = choice('top_highcollar', p.clothColor, p.armorSecondary);
  look.slots.bottom = choice('bottom_shinobi', p.clothColor);
  const armor = ARMOR[c.armorStyle];
  if (armor) look.slots.armor = choice(armor, p.armorPrimary, p.armorSecondary, p.accentColor);
  const cape = c.capeStyle && CAPE[c.capeStyle];
  if (cape) look.slots.cape = choice(cape, p.capeColor, p.accentColor);
  if (c.capeStyle === 'Sasuke Shimenawa Rope') {
    look.slots.waist = choice('waist_rope', '#7c3aed');
    look.slots.skirt = choice('skirt_apron', '#1e1b4b');
  }
  const held = c.weaponStyle && HELD[c.weaponStyle];
  if (held) look.slots.held = choice(held);
  switch (c.lowerStyle) {
    case 'Armored Greaves':
      look.slots.feet = choice('feet_crimson_sabatons');
      break;
    case 'Open Sandals':
      look.slots.feet = choice('feet_sandals');
      break;
    case 'Padded Shin Guards':
      look.slots.feet = choice('feet_leather');
      break;
    default:
      look.slots.feet = choice('feet_shinobi');
      look.accessories = [choice('acc_kunai_leg')];
  }
  // (Its headbandPosition, ribbonStyle and headband colours are no longer drawn: the headband was removed.)
  look.chakra = { color: hexToChakraId(p.chakraAuraColor), onCharge: true, onCast: true, onVictory: false };
  // Like a saved look (it names no deleted piece now, but a later deletion needs only DELETED_PIECES).
  return migrateAppearance(look);
}

/** The appearance to draw for a character (new format if present, else converted). */
export function getAppearance(c: ShinobiCharacter): SpriteAppearance {
  return c.appearance ?? appearanceFromLegacy(c);
}

/**
 * Pieces deleted from the creator (the owner, 2026-10-21: "borrar piezas marcadas", the clothes
 * inventory) and what a look that still wears one gets instead: the nearest piece that is left, or
 * nothing (`to: null`). `colors` makes the new piece's colours from the old ones; without it the new
 * piece keeps its own (the owner's pixels where it is his).
 */
export const DELETED_PIECES: Record<string, { to: string | null; colors?: (old: string[]) => string[] }> = {
  // hairstyles copied from other series or duplicated: the nearest kept style, in the same hair colour
  hair_flash: { to: 'hair_sunburst', colors: hairOf('#fde047') },
  hair_gravity: { to: 'hair_bristle', colors: hairOf('#c9ccd6') },
  hair_silver: { to: 'hair_long', colors: hairOf('#dfe3ee') },
  hair_founder: { to: 'hair_warlord', colors: hairOf('#191620') },
  hair_youth: { to: 'hair_midnight', colors: hairOf('#33333d') },
  hair_gale: { to: 'hair_midnight', colors: hairOf('#23232f') },
  hair_storm2: { to: 'hair_surge', colors: hairOf('#e6c020') },
  hair_charlotte: { to: 'hair_ribbon', colors: hairOf('#f2cb52') },
  // face marks copied from Naruto
  face_beast: { to: null },
  face_sage: { to: null },
  // the Leaf, Mist and Sand vests: the field vest
  armor_desert: { to: 'armor_flak' },
  armor_storm: { to: 'armor_flak' },
  // the black plate: the owner's plate in the dread plate's black steel and gold
  armor_dread: { to: 'armor_crimson_plate', colors: (old) => [old[0] ?? '#565a6b', old[1] ?? '#d0a12e'] },
  // the female armours ("muy probablemente las borremos")
  armor_oath: { to: null },
  armor_rose: { to: null },
  armor_lionheart: { to: null },
  armor_seraph: { to: null },
  armor_lioness: { to: null },
  // duplicates of the owner's pieces: his
  feet_greaves: { to: 'feet_crimson_sabatons' },
  hands_gauntlets: { to: 'hands_crimson_gauntlets' },
  cape_knight: { to: 'cape_crimson' },
  cape_rose: { to: null },
  held_crystal: { to: 'held_ice_crystal' },
};

function hairOf(def: string): (old: string[]) => string[] {
  return (old) => [old[0] ?? def];
}

/**
 * A saved look as today's creator draws it: a deleted piece swapped for its replacement
 * (DELETED_PIECES), and the old headband taken off (removed, "quitar bandanas"). A look with
 * neither comes back as it is.
 */
export function migrateAppearance(look: SpriteAppearance): SpriteAppearance {
  let slots = look.slots;
  for (const slot of Object.keys(look.slots) as SlotId[]) {
    const was = look.slots[slot];
    if (!was || !Object.hasOwn(DELETED_PIECES, was.id)) continue;
    const r = DELETED_PIECES[was.id];
    if (slots === look.slots) slots = { ...look.slots };
    if (r.to) slots[slot] = { id: r.to, colors: r.colors ? r.colors(was.colors ?? []) : [] };
    else delete slots[slot];
  }
  const headband = !look.headband ? { ...NO_HEADBAND } : look.headband.position !== 'none' ? { ...look.headband, position: 'none' as const } : look.headband;
  if (slots === look.slots && headband === look.headband) return look;
  return { ...look, slots, headband };
}
