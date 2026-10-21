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

/**
 * His fist under the chin: the hand at the end of the forearm rising from the elbow turns level
 * under the chin, the back of the curled fingers lit on top where the chin rests on them, the
 * finger ends below. In our hand shades (o D s b l), stamped unrotated, the pivot on the wrist at
 * its lower left.
 */
export const HAND_CHIN: PixelTemplate = {
  pivot: [0, 4],
  rows: [
    '....ooooooo...',
    '..oobllllllbo.',
    '.osbbllllbbsDo',
    'osbbbbbbsDDoo.',
    'os.ooooooo....',
  ],
};

/**
 * His hand holding the book up by its right board: the back of the hand over the cover, the fingers
 * up the board with dark skin between them, the light on their tips and knuckles. In our hand
 * shades, stamped unrotated, the pivot on the wrist under it.
 */
export const HAND_BOOK: PixelTemplate = {
  pivot: [4, 5],
  rows: [
    '.....o.o..',
    '...o.l.lo.',
    '.o.l.b.bo.',
    '.l.b.b.bo.',
    'obsbsbssDo',
    'osbbllbsDo',
    '.obbbbbsDo',
    '..osbbsDo.',
    '...ossDo..',
    '....ooo...',
  ],
};
