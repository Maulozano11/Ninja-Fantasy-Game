// Bridges the older character format (hairstyle/armorStyle/palette strings)
// to the layered sprite appearance, so saved characters and enemy clones
// keep working.

import { rgbToHsl, hexToRgb } from './color';
import type { ChakraColorId, EyeSpecial, ItemChoice, SpriteAppearance } from './types';
import type { ShinobiCharacter } from '../types/shinobi';

const HAIR: Record<string, string> = {
  'Naruto Spike': 'hair_sunburst',
  'Sasuke Rogue Fringe': 'hair_raven',
  'Minato Winged Flare': 'hair_flash',
  'Kakashi Tilt': 'hair_gravity',
  'Madara Wild Cascade': 'hair_warlord',
  'Itachi Low Ribbon': 'hair_lowtail',
  'Cloud Chocobo Spikes': 'hair_storm',
  'Sephiroth Parted Flow': 'hair_silver',
  'Squall Modern Fringe': 'hair_lion',
  'Knight Pointed Helm': 'hair_helm',
  'Somnus Caelum': 'hair_founder',
  'Noctis Caelum': 'hair_midnight',
};

const ARMOR: Record<string, string> = {
  'Leaf Chunin Flak': 'armor_flak',
  'Sand Wind Guard': 'armor_desert',
  'Mist Storm Vest': 'armor_storm',
  'Samurai O-Yoroi': 'armor_lamellar',
  'Roman Legionary Segmentata': 'armor_legion',
  'Greek Hoplite Cuirass': 'armor_bronze',
  'Ronin Wanderer Cloak': 'armor_wanderer',
  'ANBU Spec-Ops': 'armor_shadowops',
  'Dark Knight Plate': 'armor_dread',
};

const CAPE: Record<string, string> = {
  'Hokage White Haori': 'cape_haori',
  'Akatsuki Black Cloak': 'cape_rogue',
  'Ronin Traveler Cape': 'cape_traveler',
  'Crimson Billowing Knight Cape': 'cape_knight',
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
    headband: { position: 'forehead', tails: false, cloth: '#1e3a8a' },
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
      look.slots.feet = choice('feet_greaves');
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
  // The headband is plain cloth now: a rogue's scratched plate is a forehead band, and the plate's colour is not used.
  const pos = c.headbandPosition;
  look.headband = {
    position: pos === 'Rogue Scratched' ? 'forehead' : pos ? (pos.toLowerCase() as SpriteAppearance['headband']['position']) : 'none',
    tails: c.ribbonStyle === 'Long Fluttering',
    cloth: p.headbandCloth || '#1e3a8a',
  };
  look.chakra = { color: hexToChakraId(p.chakraAuraColor), onCharge: true, onCast: true, onVictory: false };
  return look;
}

/** The appearance to draw for a character (new format if present, else converted). */
export function getAppearance(c: ShinobiCharacter): SpriteAppearance {
  return c.appearance ?? appearanceFromLegacy(c);
}

/**
 * A saved look as today's creator draws it: the headband without what the old metal plate had
 * (`slashed`, `emblem`, `plate`; the owner, 2026-10-22, "deja la pura bandana la pura tela"). Its
 * position, tails and cloth stay. The slender body is gone (the owner, 2026-10-22, "elimina el tipo
 * de cuerpo delgado"): a look saved on it is drawn on the female body. The neck option is gone (the
 * owner, 2026-10-22, "quitar el cuello del creador y dejar a todos con el cuello de hoy"): a saved
 * `neck` ('slim' or the thick 'strong') is dropped, and every look has today's slim nape; only his Lyra's
 * long neck, part of her picture and never a creator choice, stays (types.ts NeckType). A look
 * with none of these comes back as it is.
 */
export function migrateAppearance(look: SpriteAppearance): SpriteAppearance {
  if ((look.body as string) === 'slender') look = { ...look, body: 'female' };
  if ('neck' in look && look.neck !== 'long') {
    const { neck: _neck, ...rest } = look as SpriteAppearance & { neck?: unknown };
    look = rest;
  }
  const hb = look.headband;
  if (!hb || !('slashed' in hb || 'emblem' in hb || 'plate' in hb)) return look;
  const { slashed: _slashed, emblem: _emblem, plate: _plate, ...cloth } = hb;
  return { ...look, headband: cloth };
}
