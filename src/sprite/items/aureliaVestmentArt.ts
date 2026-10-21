// Aurelia's dress bodice and detached sleeves (armor_dawn_vestment): the owner's pixels from his
// picture of her at our scale (docs/reference/aurelia-escala-juego-owner-reference.jpg), one for one,
// by tools/refs/aurelia-upper-from-ref.py: one piece per segment of the rig, pivot on its joint, angle
// the segment's on our female at idle frame 0. Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His white: the Cloth slot's default (his creams and greys follow it). */
export const AURELIA_CLOTH = '#f5eddb';
/** His gold: the Gold slot's default (his golds and the gem's dark cord follow it). */
export const AURELIA_GOLD = '#f5bc47';
/** His gem's blue: the Gem slot's default. */
export const AURELIA_GEM = '#5eacc8';
export const AURELIA_CLOTH_CHARS = 'abcdefhijlmn';
export const AURELIA_GOLD_CHARS = 'ABCDEFHJ';
export const AURELIA_GEM_CHARS = 'GI';
/** His skin (the keyhole, the armpit): drawn in the body's skin, at these shades of it. */
export const AURELIA_SKIN_SHADES: Record<string, number> = { 0: 1, S: 3, T: 2, U: 2 };
/** His black line. */
export const AURELIA_LINE = '#030518';

/**
 * Where the bodice and its waist stand for our torso, in fine pixels below the neck along the torso:
 * [near side from, far side from, to]: from under his near armhole (the shoulder above stays bare),
 * from the neck on the far side (his far shoulder does not show), to the waist's lower edge.
 */
export const AURELIA_TORSO_SPAN: [number, number, number] = [12.77, 0.00, 31.77];

/** The collar, the gem and the bodice to the sash's line (pivot: the base of the neck). */
export const AURELIA_BODICE: PaintedPiece = {
  pivot: [9, 0],
  angle: -90.10,
  rows: [
    '....kkkk..........',
    '..kkEEEEkkkk......',
    '..kFbJJHDkDk......',
    '...kDbJbDkDkk.....',
    '....kDbaJJJAk.....',
    '....kDaDJIGJDk....',
    '....kDaDDJIJJDkk..',
    '....kDaaDDJSSJBk..',
    '....kDDDDDDJSJDDk.',
    '.k0kHDaDaaDDJDDaDk',
    'k00kHbaaDaaDDDaDak',
    'kkkHHbbaaDaaDaDabk',
    '.kHbbHbbbbHbHHbb.k',
    '.kebbbHbbbbHHbbck.',
    '..kebbbHbbbbHbbk..',
    '..kebbaDaaaFaDak..',
    '...kebaaDaaaaaHk..',
    '...kkebaDaaaDaHk..',
    '.....kkkDaaaaakk..',
    '........kkkkkk....',
  ],
  colors: {
    k: '#030518',
    a: '#f5eddb',
    b: '#c6b4a1',
    c: '#bba692',
    e: '#99837c',
    A: '#fde6a1',
    B: '#fee496',
    D: '#f5bc47',
    E: '#e2a842',
    F: '#d69c33',
    H: '#bb852d',
    J: '#80533e',
    G: '#d7e7e9',
    I: '#5eacc8',
    S: '#f6c9a7',
    0: '#c17067',
  },
};

/** The bodice on under the sash to the hips (pivot: the base of the neck). */
export const AURELIA_WAIST: PaintedPiece = {
  pivot: [9, -19],
  angle: -90.10,
  rows: [
    '....kbaaDaaaDDak....',
    '....kbaaDaaaDDak....',
    '....kbaaDaaaDDak....',
    '...kbbaDDaaaaDaak...',
    '...kbbaDDaaaaDaak...',
    '...kbbaDDaaaaDaak...',
    '..kbbaaDaaaaaDDaak..',
    '..kbbaaDaaaaaDDaak..',
    '..kbbaaDaaaaaDDaak..',
    '.kbbaaDDaaaaaaDDaak.',
    '.kbbaaDDaaaaaaDDaak.',
    '.kbbaaDDaaaaaaDDaak.',
    'kkkkkkkkkkkkkkkkkkkk',
  ],
  colors: {
    k: '#030518',
    a: '#f5eddb',
    b: '#c6b4a1',
    D: '#f5bc47',
  },
};

/** The near sleeve to the elbow: its gold band (pivot: the shoulder). */
export const AURELIA_SLEEVE_UPPER_N: PaintedPiece = {
  pivot: [7, 3],
  angle: 107.95,
  rows: [
    '.........kkk.',
    '.......kkTUUk',
    '......kUSSSS.',
    '.....kUSSSSS.',
    '.....kUSSSSS.',
    '....kkSSSSSU.',
    '....kDUSSSU..',
    '....kDkSSUk..',
    '...kHDCkkk...',
    '...kDDCCHk...',
    '..kDDnnnnk...',
    '..kkkaabk....',
    '.kbaabak.....',
    'keaaaabk.....',
    '.baDDabk.....',
    '....Daek.....',
  ],
  colors: {
    k: '#030518',
    a: '#f5eddb',
    b: '#c6b4a1',
    e: '#99837c',
    n: '#423d3f',
    C: '#fdcf53',
    D: '#f5bc47',
    H: '#bb852d',
    S: '#f6c9a7',
    T: '#ecab8e',
    U: '#ea9e83',
  },
};

/** The near sleeve from the elbow to its gold cuff (pivot: the elbow). */
export const AURELIA_SLEEVE_FORE_N: PaintedPiece = {
  pivot: [9, 3],
  angle: 103.11,
  rows: [
    '.........kk..',
    '........kkakk',
    '......kkkkkkk',
    '.....kbaDkkk.',
    '....kbaDkkDak',
    '...kkaDkbkDbk',
    '..kDlkbaakDk.',
    '.kFhkbaaekDk.',
    'kHhhkaabkhDk.',
    'kHhkbaaekhDk.',
    'kHhkaaDkhHk..',
    'kHkdDDkkHk...',
    '.kkDkk.kk....',
    '..kk.........',
  ],
  colors: {
    k: '#030518',
    a: '#f5eddb',
    b: '#c6b4a1',
    d: '#b29e90',
    e: '#99837c',
    h: '#88736d',
    l: '#4f4441',
    D: '#f5bc47',
    F: '#d69c33',
    H: '#bb852d',
  },
};

/** The near sleeve along its arm: under its band on the upper arm (0 shoulder, 1 elbow) and its
 * lower edge on the forearm (0 elbow, 1 wrist). */
export const AURELIA_SLEEVE_SPAN_N: [number, number] = [-0.298, 1.144];

/** The far sleeve to the elbow: its gold band (pivot: the shoulder). */
export const AURELIA_SLEEVE_UPPER_F: PaintedPiece = {
  pivot: [2, -3],
  angle: 79.34,
  rows: [
    'kkkkk..',
    'kDDCk..',
    'kHDHk..',
    'kDDnkk.',
    'kkkkek.',
    'kbbbkk.',
    'kbbbek.',
    'kbbbbbk',
    'kbbbbbk',
    'kbb....',
  ],
  colors: {
    k: '#030518',
    b: '#c6b4a1',
    e: '#99837c',
    n: '#423d3f',
    C: '#fdcf53',
    D: '#f5bc47',
    H: '#bb852d',
  },
};

/** The far sleeve from the elbow to its gold cuff (pivot: the elbow). */
export const AURELIA_SLEEVE_FORE_F: PaintedPiece = {
  pivot: [4, 3],
  angle: 57.69,
  rows: [
    '...kk.......',
    '.kkbk.......',
    '.kbbkk......',
    '.kbbbHHk....',
    'kbbbkHiFk...',
    'kbbbbHdiFk..',
    'kbbbbdkkbHk.',
    'kbbbbdkmkHk.',
    'kbbbbdkmkfk.',
    'kbbbbdkkbek.',
    '...kHkkdHHFk',
    '...kk.kHkkkk',
    '.......k....',
  ],
  colors: {
    k: '#030518',
    b: '#c6b4a1',
    d: '#b29e90',
    e: '#99837c',
    f: '#947769',
    i: '#7d615b',
    m: '#553634',
    F: '#d69c33',
    H: '#bb852d',
  },
};

/** The far sleeve along its arm: under its band on the upper arm (0 shoulder, 1 elbow) and its
 * lower edge on the forearm (0 elbow, 1 wrist). */
export const AURELIA_SLEEVE_SPAN_F: [number, number] = [-1.000, 0.933];
