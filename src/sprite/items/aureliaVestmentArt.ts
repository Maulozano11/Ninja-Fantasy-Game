// Aurelia's dress bodice and detached sleeves (armor_dawn_vestment), the owner's picture
// (docs/reference/aurelia-owner-reference.jpg) brought down to our scale in her colours by
// tools/refs/aurelia-upper-from-ref.py: one piece per segment of the rig, pivot on its joint, angle
// the segment's on our female at idle frame 0. Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** Her white: the Cloth slot's default (her cloth, its creams and greys follow it). */
export const AURELIA_CLOTH = '#f9f2e1';
/** Her gold: the Gold slot's default (her golds follow it). */
export const AURELIA_GOLD = '#ecc268';
/** Her gem's blue: the Gem slot's default. */
export const AURELIA_GEM = '#73bcda';
export const AURELIA_CLOTH_CHARS = 'XwWcCvV';
export const AURELIA_GOLD_CHARS = 'yYoO';
export const AURELIA_GEM_CHARS = 'gGi';
/** Her black line. */
export const AURELIA_LINE = '#030101';

/**
 * Where the bodice and its waist stand for our torso, in fine pixels below the neck along the torso:
 * from under her armholes (the far shoulder above stays bare) to the waist's lower edge.
 */
export const AURELIA_TORSO_SPAN: [number, number] = [6.16, 23.16];

/** The collar, the gem and the bodice to the sash's line (pivot: the base of the neck). */
export const AURELIA_BODICE: PaintedPiece = {
  pivot: [8, 1],
  angle: -89.50,
  rows: [
    '....kkkkkkk....',
    '....kYwwwYk....',
    '....kYwWwYk....',
    '....kYWGWYk....',
    '...kkYgigYkk...',
    '..k..kYgYk..k..',
    '.kwwwwkYkwwwwk.',
    'kowwwwoYowwwwWk',
    'koXwwwwYwwwwwWk',
    'kowwoYoYoYowwWk',
    'kWwwwoYYYowwWCk',
    'kCcWwwoYowwcCCk',
    '.kCcWwwYwwWcCk.',
    '.kWwwwoYowwwWk.',
    '.kWwwwwYwwwWWk.',
    '.kWWwwoYowwWWk.',
    '.kWWwwwYwwwWWk.',
    '.kWWwwoYowwWck.',
  ],
  colors: {
    k: '#030101',
    X: '#ffffff',
    w: '#f9f2e1',
    W: '#eadeca',
    c: '#d6c7b7',
    C: '#c2b0a2',
    Y: '#ecc268',
    o: '#d4a251',
    g: '#329cbd',
    G: '#73bcda',
    i: '#c6e9f5',
  },
};

/** The bodice on under the sash to the hips (pivot: the base of the neck). */
export const AURELIA_WAIST: PaintedPiece = {
  pivot: [7, -17],
  angle: -89.50,
  rows: [
    'kWWwwwYwwwWWk',
    'kWWwwoYowwWck',
    'kWWwwwYwwwWck',
    'kWWwwwYwwwWck',
    'kWWwwwwwwwWck',
    'kWWwwwwwwwWck',
    'kkkkkkkkkkkkk',
  ],
  colors: {
    k: '#030101',
    w: '#f9f2e1',
    W: '#eadeca',
    c: '#d6c7b7',
    Y: '#ecc268',
    o: '#d4a251',
  },
};

/** The near sleeve to the elbow: its gold band (pivot: the shoulder). */
export const AURELIA_SLEEVE_UPPER_N: PaintedPiece = {
  pivot: [8, -2],
  angle: 107.97,
  rows: [
    '..kYoYoYoYoYk',
    '..kOYYYYYYYOk',
    '..kwwwWWccCk.',
    '..kwwwWWccCk.',
    '..kwwwWWcCk..',
    '.kwwwwWWcCk..',
    '.kwwwWWWcCk..',
    '.kwwwWWWcCk..',
    'kwwwWWWoCk...',
    '...wWYYoCk...',
    '......coCk...',
  ],
  colors: {
    k: '#030101',
    w: '#f9f2e1',
    W: '#eadeca',
    c: '#d6c7b7',
    C: '#c2b0a2',
    Y: '#ecc268',
    o: '#d4a251',
    O: '#b88744',
  },
};

/** The near sleeve from the elbow to its gold cuff (pivot: the elbow). */
export const AURELIA_SLEEVE_FORE_N: PaintedPiece = {
  pivot: [9, 4],
  angle: 103.11,
  rows: [
    '.......kk.....',
    '.......kwkkk..',
    '.......kwWWWkk',
    '.....kwwwWYYkk',
    '....kwwwWYcck.',
    '....kwwYYWcoCk',
    '...kwwYVWWcoCk',
    '...kYYvVWWcoCk',
    '..kYvvVwWWcoCk',
    '.kYvvVwWWcoCk.',
    'kYvvvVwWWcoCk.',
    'kYvvvVwWWcoCk.',
    'kYvvvVwWWcoCk.',
    'kYoYoYoYoYoOk.',
    'kkkOOOOOOOOkk.',
    '..kkkkkkkkkk..',
  ],
  colors: {
    k: '#030101',
    w: '#f9f2e1',
    W: '#eadeca',
    c: '#d6c7b7',
    C: '#c2b0a2',
    v: '#a08c84',
    V: '#8e7b79',
    Y: '#ecc268',
    o: '#d4a251',
    O: '#b88744',
  },
};

/** The near sleeve along its arm: its band's top on the upper arm (0 shoulder, 1 elbow) and its
 * lower edge on the forearm (0 elbow, 1 wrist). */
export const AURELIA_SLEEVE_SPAN_N: [number, number] = [0.136, 1.182];

/** The far sleeve to the elbow: its gold band (pivot: the shoulder). */
export const AURELIA_SLEEVE_UPPER_F: PaintedPiece = {
  pivot: [1, -2],
  angle: 77.78,
  rows: [
    '.kYoYoYok..',
    '.kOYYYYOk..',
    'kwwwwWcCk..',
    'kwwwwWcCk..',
    'kwwwwWWcCk.',
    'kwwwwWWcCk.',
    'kwwwwWWccCk',
    'kwwwwWWccCk',
    'kwwwwWWccC.',
    'kwwwwW.....',
    'k..........',
  ],
  colors: {
    k: '#030101',
    w: '#f9f2e1',
    W: '#eadeca',
    c: '#d6c7b7',
    C: '#c2b0a2',
    Y: '#ecc268',
    o: '#d4a251',
    O: '#b88744',
  },
};

/** The far sleeve from the elbow to its gold cuff (pivot: the elbow). */
export const AURELIA_SLEEVE_FORE_F: PaintedPiece = {
  pivot: [4, 3],
  angle: 59.54,
  rows: [
    '.....kkkk......',
    '.kkkkWWckk.....',
    '.kwwwWWcckk....',
    '.kwwwWWccCCk...',
    '.wwwwWWWcCCk...',
    'kwwwwWWWcCCYk..',
    'kwwwwWWWcCYok..',
    '.kwwwwWWcCYoYk.',
    '.kwwwwWWcYoYvk.',
    '.kwwwwWWcYoYvvk',
    '.kYoYoYoYoYoYok',
    '.kOOOOOOOOOOOOk',
    '.kkkkkkkkkkkkk.',
  ],
  colors: {
    k: '#030101',
    w: '#f9f2e1',
    W: '#eadeca',
    c: '#d6c7b7',
    C: '#c2b0a2',
    v: '#a08c84',
    Y: '#ecc268',
    o: '#d4a251',
    O: '#b88744',
  },
};

/** The far sleeve along its arm: its band's top on the upper arm (0 shoulder, 1 elbow) and its
 * lower edge on the forearm (0 elbow, 1 wrist). */
export const AURELIA_SLEEVE_SPAN_F: [number, number] = [0.217, 0.925];
