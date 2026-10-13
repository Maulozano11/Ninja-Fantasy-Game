// Appearance data for the layered sprite system. This is the only thing a
// character needs to store to be drawn; the engine turns it into pixels.

import type { PartId } from './raster';

export type BodyType = 'male' | 'female' | 'bulky';

export type SpritePose = 'idle' | 'handsigns' | 'attack' | 'cast' | 'hurt' | 'victory' | 'charge';

export const SPRITE_POSES: SpritePose[] = ['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge'];

export type EyeShape = 'standard' | 'sharp' | 'round' | 'calm' | 'fierce' | 'bright' | 'piercing';

/** Back of the neck behind the jaw: slender (default) or thick. */
export type NeckType = 'slim' | 'strong';

/** Near-side cheek and jaw: V-line (default), fuller, or a strong flat jaw. */
export type FaceShape = 'tapered' | 'soft' | 'square';

/** Single-choice equipment slots, drawn back-to-front by depth (see compose.ts). */
export type SlotId =
  | 'hair'
  | 'face'
  | 'top'
  | 'bottom'
  | 'armor'
  | 'skirt'
  | 'waist'
  | 'feet'
  | 'hands'
  | 'cape'
  | 'held';

export const SLOT_IDS: SlotId[] = ['hair', 'face', 'top', 'bottom', 'armor', 'skirt', 'waist', 'feet', 'hands', 'cape', 'held'];

export interface ItemChoice {
  id: string;
  /** One color per color slot the item declares, in order. */
  colors: string[];
}

export type HeadbandPosition = 'none' | 'forehead' | 'neck' | 'arm' | 'waist';

export type EmblemId = 'crescent' | 'wave' | 'peak' | 'bolt' | 'sun' | 'spiral' | 'blank';

export interface HeadbandChoice {
  position: HeadbandPosition;
  slashed: boolean;
  tails: boolean;
  emblem: EmblemId;
  cloth: string;
  plate: string;
}

export type ChakraColorId = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet' | 'white' | 'black';

export interface ChakraChoice {
  /** The burst: its element and shape (fire, water, lightning...) and natural color. */
  color: ChakraColorId;
  /**
   * Optional recolor of the burst: another chakra color id (its palette) or any
   * '#rrggbb'. Missing = the burst's natural color.
   */
  tint?: string;
  onCharge: boolean;
  onCast: boolean;
  onVictory: boolean;
}

/**
 * A player's hand-painted pixel. It is stored relative to the body part it
 * was painted on, so it follows that part into every pose.
 * `color: null` erases the pixel instead of painting it.
 */
export interface PixelEdit {
  part: PartId;
  a: number;
  b: number;
  color: string | null;
}

export interface SpriteAppearance {
  version: 1;
  body: BodyType;
  skin: string;
  eyeShape: EyeShape;
  eyeColor: string;
  /** Missing on older saves; treated as 'slim'. */
  neck?: NeckType;
  /** Missing on older saves; treated as 'tapered'. */
  faceShape?: FaceShape;
  slots: Partial<Record<SlotId, ItemChoice>>;
  accessories: ItemChoice[];
  headband: HeadbandChoice;
  chakra: ChakraChoice;
  pixelEdits: PixelEdit[];
}

/** Special eye patterns, derived from the character's dojutsu. */
export type EyeSpecial = 'none' | 'tomoe1' | 'tomoe3' | 'pinwheel' | 'pale' | 'paleVeins' | 'sage';
