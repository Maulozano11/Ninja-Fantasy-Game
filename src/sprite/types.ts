// Appearance data for the layered sprite system. This is the only thing a
// character needs to store to be drawn; the engine turns it into pixels.

import type { PartId } from './raster';

export type BodyType = 'male' | 'female' | 'bulky';

/** Bodies drawn with the female face, lashes, lips and slimmer feet. */
export const isFemaleBody = (b: BodyType | string): boolean => b === 'female';

export type SpritePose = 'idle' | 'handsigns' | 'attack' | 'cast' | 'hurt' | 'victory' | 'charge' | StrikePose | MovePose | CampPose;

/**
 * Weapon techniques: 'throw' hurls the held weapon (it is out of the hand from the release frame on,
 * see grip.ts throwRelease; the battle draws it in flight), 'pierce' is a lunging thrust, 'tackle'
 * a shoulder charge with the weapon put away (the Rush), 'combo' an unarmed punch-and-kick combo
 * with the weapon put away (the Leaf Hurricane).
 */
export type StrikePose = 'throw' | 'pierce' | 'tackle' | 'combo';

/** Poses for moving around the battle map: walking, running, crouching, sneaking and lying downed. */
export type MovePose = 'walk' | 'run' | 'crouch' | 'sneak' | 'downed';

/** The poses the character creator previews. */
export const SPRITE_POSES: SpritePose[] = ['idle', 'handsigns', 'attack', 'throw', 'pierce', 'tackle', 'combo', 'cast', 'hurt', 'victory', 'charge'];

export const MOVE_POSES: MovePose[] = ['walk', 'run', 'crouch', 'sneak', 'downed'];

/**
 * Looping poses for the camp around the fire: leaning back against a tree,
 * rock or tent pole; sitting on a log seat; reading a book on the seat; and
 * training alone with the held weapon (a blade kata, a polearm drill, or a
 * strike and kick drill with bare hands).
 */
export type CampPose = 'lean' | 'sit' | 'read' | 'train';

export const CAMP_POSES: CampPose[] = ['lean', 'sit', 'read', 'train'];

/**
 * How a character casts: hand signs, runes floating before an open palm, a
 * grimoire in hand, or energy charged in the hands (a spinning sphere,
 * crackling lightning, a two-handed wave charged at the hip, or a flash
 * charged with both arms forward).
 */
export type CastStyle = 'signs' | 'runes' | 'book' | 'script' | 'sphere' | 'lightning' | 'wave' | 'flash' | 'eye';

/** The styles offered in the creator ('eye', Ocular Surge, is kept in the game but not offered). */
export const CAST_STYLES: CastStyle[] = ['signs', 'runes', 'book', 'script', 'sphere', 'lightning', 'wave', 'flash'];

/** Default cast style, with optional overrides per jutsu id. */
export interface CastChoice {
  style: CastStyle;
  jutsu?: Record<string, CastStyle>;
}

/** The eye options; valiant and roman are the owner's own eyes from his Aiden and Roman pictures, in his pixels; keen is his Lyra's, in her colours at our scale. */
export type EyeShape = 'standard' | 'sharp' | 'round' | 'calm' | 'fierce' | 'bright' | 'piercing' | 'valiant' | 'keen' | 'roman';

/**
 * The owner's heroines' long neck (neck.ts): his Lyra carries the head further forward on a slimmer neck.
 * Not a creator option: the owner removed the neck picker (2026-10-22, "quitar el cuello del creador y
 * dejar a todos con el cuello de hoy"), so every look keeps the neck it has today, and only Lyra's
 * preset has this one. The old 'slim' and 'strong' choices are dropped on load (migrateAppearance).
 */
export type NeckType = 'long';

/** Arm length: the body's own (default), or long: his Lyra's longer forearms, her free hand hanging open (rig.ts LONG_ARMS). */
export type ArmType = 'standard' | 'long';

/**
 * Near-side cheek and jaw: V-line (default), fuller, or a strong flat jaw; or the owner's own head
 * from his Aiden picture (valiant: his skull, ear, cheeks, jaw and chin in his pixels); or his Lyra's
 * face (fine: her narrower face, mouth and chin in his pixels, under our skull).
 * Or roman, from his Roman paint-over (his whole face with his nose and mouth, in his pixels).
 */
export type FaceShape = 'tapered' | 'soft' | 'square' | 'valiant' | 'founder' | 'fine' | 'roman';

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
  /** The version picked for each of the item's parts (ItemDef.parts), by part key. */
  parts?: Record<string, string>;
}

export type HeadbandPosition = 'none' | 'forehead' | 'neck' | 'arm' | 'waist';

/**
 * The headband: plain cloth only (the owner, 2026-10-22: "deja la pura bandana la pura tela"). It had a
 * metal plate with an engraved emblem, which could be slashed; those are gone. Older saves and looks may
 * still carry `slashed`, `emblem` and `plate`: nothing reads them, and migrateAppearance (legacy.ts)
 * drops them on load.
 */
export interface HeadbandChoice {
  position: HeadbandPosition;
  tails: boolean;
  cloth: string;
  /** Legacy, ignored (the scratch across the old plate). */
  slashed?: boolean;
  /** Legacy, ignored (the old plate's emblem). */
  emblem?: string;
  /** Legacy, ignored (the old plate's colour). */
  plate?: string;
}

export type ChakraColorId = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet' | 'white' | 'black' | 'brown' | 'cyan';

export interface ChakraChoice {
  /**
   * The burst, by id: its shape (flames, bolts, water rings...) and natural color. It is the chakra's
   * TYPE: the burst's nature (chakraNature.ts, BURST_NATURE) is the ninja's elemental nature in the
   * rules. The ids are color words because the bursts were first picked by color; the color the
   * chakra shows is `tint`, and it never changes the nature.
   */
  color: ChakraColorId;
  /**
   * Optional recolor of the burst: another chakra color id (its palette) or any
   * '#rrggbb'. Missing = the burst's natural color. Only a look: any type takes any color.
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
  /** Only Lyra's preset has one (her long neck, NeckType); missing on every other look. */
  neck?: NeckType;
  /** Missing on older saves; treated as 'standard'. */
  arms?: ArmType;
  /** Missing on older saves; treated as 'tapered'. */
  faceShape?: FaceShape;
  /** How jutsus are cast. Missing on older saves; treated as 'runes'. */
  cast?: CastChoice;
  slots: Partial<Record<SlotId, ItemChoice>>;
  accessories: ItemChoice[];
  headband: HeadbandChoice;
  chakra: ChakraChoice;
  pixelEdits: PixelEdit[];
  /** In battle: the held weapon is put away (at the belt or on the back) to keep the hands free. */
  stowed?: boolean;
  /**
   * In battle: a kunai from the pouch in the near fist, whatever the held slot has (a Shooting-Star Thrust
   * thrown without a weapon in the hand catches its kunai and thrusts with it: a stowed weapon stays
   * put, a technique in the palm is not drawn meanwhile). See grip.ts throwsKunai.
   */
  pouchKunai?: boolean;
}

/** Special eye patterns, derived from the character's dojutsu. */
export type EyeSpecial = 'none' | 'tomoe1' | 'tomoe3' | 'pinwheel' | 'pale' | 'paleVeins' | 'sage';
