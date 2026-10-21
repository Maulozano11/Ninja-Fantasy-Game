// The read pose's book and hands, lifted from the owner's camp picture
// (docs/reference/camp-poses-owner-reference.webp, his first "leer") by
// tools/refs/camp-read-from-ref.py. Generated: rerun the script to change it.

import type { PixelTemplate } from './rotsprite';

/** A prop painted in his colours: one character per colour; '.' is empty. */
export interface PaintedProp extends PixelTemplate {
  colors: Record<string, string>;
}

/** His colours for the book (and its turning pages): line, shadows, panels, frames, page tops. */
export const READ_BOOK_COLORS: Record<string, string> = {
    o: '#1c0d0a',
    k: '#2b130d',
    g: '#39231b',
    m: '#401714',
    n: '#532d24',
    f: '#6e4a2b',
    h: '#8e6d4d',
    a: '#9e7668',
    q: '#ae8f81',
    c: '#bfa696',
    p: '#d0ccc1',
    P: '#ebe8dd',
};

/**
 * His open book, held up before the face and tilted toward it: the left board facing the viewer
 * (a lighter frame round a darker panel), the right board turned away, the spine between them, the
 * thick bottom edge, and the cream page tops making a V, a thin line on the left and a broad band
 * rising to the upper right. The pivot is the far wrist, under his hand on the right board.
 */
export const READ_BOOK: PaintedProp = {
  pivot: [19, 15],
  rows: [
    '.......................ooo.',
    '......................ocPpo',
    '....................ocpPPco',
    '...................ocPPPaho',
    '....oqqpPPPpcoo...oqPPqgkko',
    '...oggghqqpPPPco.oqPpcgnno.',
    '...ohfnnnghqpPPPckPpannfno.',
    '...ohfffhhngkkapppahknfngo.',
    '...ohfnnnnhfffgfhggmffnfgo.',
    '..ohfnnnnnnnnnfkhmmmmfhggo.',
    '..ohfnnnnnnnnnfkhmmmmfhggo.',
    '..ohfnnnnnnnnnfkhmmmmfhggo.',
    '..ohfnnnnnnnnfkhmmmmfhggo..',
    '.ohfnnnnnnnnnfkhmmmmfhggo..',
    '.ohfnnnnnnnnnfkhmmmmfhggo..',
    '.ohfnnnnnnnnnfkhmmmmfhggo..',
    '.ohffnnnnnnnfkhmmmmfhggo...',
    '.offfffffffffkfffffffggo...',
    '..oggggggggggkggggggggo....',
    '...ooooooooooooooooooo.....',
  ],
  colors: READ_BOOK_COLORS,
};

/**
 * A page of the right half turning over to the left, in three steps (lifting off, standing over the
 * spine, settling onto the left half), hinged at the bottom of the V. Stamped over the book at its
 * pivot, in its colours.
 */
export const READ_PAGE_TURN: PaintedProp[] = [
  {
    pivot: [4, 17],
    rows: [
      '.....oo',
      '....oPPo',
      '...oPPqo',
      '...oPqqo',
      '..oPPqo',
      '..oPqo',
      '.oPqqo',
      'oPPqo',
      'oPqo',
    ],
    colors: READ_BOOK_COLORS,
  },
  {
    pivot: [4, 16],
    rows: [
      '.oo',
      'oPqo',
      'oPqo',
      'oPqo',
      'oPqo',
      'oPqo',
      'oPqo',
      'oPqo',
    ],
    colors: READ_BOOK_COLORS,
  },
  {
    pivot: [9, 17],
    rows: [
      '.oo',
      'oPqo',
      'oPPqo',
      '.oPqqo',
      '..oPqo',
      '..oPPqo',
      '...oPPqo',
      '....oPPqo',
      '.....oPo',
    ],
    colors: READ_BOOK_COLORS,
  },
];

/** His skin on the read pose's hands and forearm (his base, the 'b' step): a character's skin moves them as far. */
export const READ_SKIN = '#e4ad93';

/** His colours for the near arm's steps: line, dark, shadow, base, light, the pale rim. */
export const READ_ARM_COLORS: Record<string, string> = {
  o: '#27150f',
  D: '#9c7a68',
  s: '#ce9b86',
  b: '#e4ad93',
  l: '#f1bb9d',
  h: '#f4c4aa',
};

/** His colours for the hand on the book (a hand in shadow, darker and redder): line, darkest, dark, mid, lit. */
export const READ_BOOK_HAND_COLORS: Record<string, string> = {
  o: '#20120e',
  k: '#8c5e52',
  d: '#9d6f66',
  m: '#bb786b',
  t: '#c48f87',
};

/** His steps as our ramp shades, for gloves, sleeves and bracers drawn on his shapes. */
export const READ_STEPS: Record<string, number> = {
  o: 0,
  D: 1,
  s: 2,
  b: 3,
  l: 4,
  h: 4,
  k: 1,
  d: 2,
  m: 3,
  t: 4,
};

/**
 * His hand under the chin, his pixels at his size: two rows of skin lying level under the jaw from the
 * wrist to the fingers' ends past the chin, lit, its ends in shadow, outlined. Stamped unrotated, the
 * pivot on the near wrist (its lower left, where the forearm's wrist turns up to it).
 */
export const HAND_CHIN: PaintedProp = {
  pivot: [-2, 4],
  rows: [
    'oooooooo',
    'oDDbhlbso',
    'obbllllbDo',
    '.Doooooooo',
  ],
  colors: READ_ARM_COLORS,
};

/**
 * His forearm rising to the hand under the chin, his pixels at his size: a broad block from the elbow
 * at its lower left (where the sleeve ends, closed by his line) up to the book's top left corner, lit
 * toward the book with a pale rim, its top left edge in shadow; the wrist turns up from its top corner
 * to the hand. The line down its right side is the book's left edge. Same pivot as HAND_CHIN.
 */
export const FOREARM_CHIN: PaintedProp = {
  pivot: [9, 2],
  rows: [
    '..........o',
    '.........oDs',
    '........oDo',
    '......ooDbo',
    '....ooDshbo',
    '..ooDDbhhbo',
    '..osssllhbo',
    '.osbbbllho',
    'ossbblllho',
    'oosbblllho',
    '.oDsbllhDo',
    '..oDsbbbo',
    '...oDsDso',
    '....ooooo',
  ],
  colors: READ_ARM_COLORS,
};

/**
 * His hand holding the book up by its right board, his pixels at his size: three fingers up the cover a
 * pixel apart with the board between them and a short one on the outside, the back of the hand below
 * them, outlined below and down its outer side. Stamped unrotated, the pivot on the far wrist (the
 * book's pivot).
 */
export const HAND_BOOK: PaintedProp = {
  pivot: [3, 3],
  rows: [
    '...d.t.d',
    '...m.m.d',
    '.d.t.d.d',
    'odmmmmdd',
    'okmmmtto',
    '.okdmmko',
    '.okdmko',
    '.ooooo',
  ],
  colors: READ_BOOK_HAND_COLORS,
};

/**
 * Under a glove that leaves the fingers bare: the hand under the chin up to its knuckles (pixels right
 * of the wrist), the hand on the book below its fingers (rows below the wrist).
 */
export const READ_KNUCKLES = { chin: 6, book: 0 };
