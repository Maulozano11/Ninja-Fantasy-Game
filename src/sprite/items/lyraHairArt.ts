// Lyra's hair, the owner's picture of her at our game scale, his pixels (tools/refs/lyra-hair-from-ref.py
// from docs/reference/lyra-game-scale-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';
import type { PaintedPart } from './capeArt';

/** One character per colour of his (all the pieces share them). */
export const LYRA_HAIR_COLORS: Record<string, string> = {
  k: '#010101',
  a: '#0e0408',
  b: '#190f18',
  c: '#2a0e1c',
  d: '#3b1023',
  e: '#4e1524',
  f: '#282834',
  g: '#5a1723',
  h: '#681d24',
  i: '#772523',
  j: '#454350',
  l: '#872e27',
  m: '#983324',
  n: '#a33f27',
  o: '#b24325',
  p: '#bb4d32',
  q: '#d3673a',
  r: '#cb7862',
  s: '#c88530',
  t: '#da9a42',
  u: '#e2a545',
  v: '#ea987f',
  w: '#fec8a6',
};

/** Over the head (hairFront): crown, fringe, far lock, the back of the head, the pin, the bow and her ear. Its pivot is the cell on our face anchor. */
export const LYRA_HAIR_HEAD: PaintedPart = {
  pivot: [16, 12],
  rows: [
    '............kkkkkkkkkkk.......',
    '..........kknnnniddinnnkk.....',
    '.........knqnnnnnnndhhhnhk....',
    '........klnnnunnnhhidddhnnk...',
    '........klinuduninnnnnndnhik..',
    '.......kniiucisdnnnddddndqqnk.',
    '.......kihduuudnqqddddddddnqk.',
    '......kkedoudddnnqd......ddqk.',
    '......knhhtdndnnnd........dnnk',
    '....kkkddsdidnnhnd........ddnk',
    '..kkjfkdsdddnnhnd.........cdnk',
    '..kjfkkkkhnnnnnd..........kdhk',
    '...kkfkhdddddddd..........kdhk',
    '....kfkhdhdvrgnd..........kdhk',
    '...kjkhndndweod...........khk.',
    '..kjjkhndnndnd............kc..',
    '...kkohndongnd............kd..',
    '...knhongdnhdhd............dd.',
    '.kkohhnnddghdnd...............',
    'knkkdnnnddnndld...............',
    '...konngdddhgend..............',
  ],
  colors: LYRA_HAIR_COLORS,
};

/** The same over her own face (face shape 'fine', lyraFaceArt.ts): his pixels where he drew them, the far side not moved out. */
export const LYRA_HAIR_HEAD_FINE: PaintedPart = {
  pivot: [16, 12],
  rows: [
    '............kkkkkkkkk.......',
    '..........kknnnniddinkk.....',
    '.........knqnnnnnnndhnhk....',
    '........klnnnunnnhhidhnnk...',
    '........klinuduninnnndnhik..',
    '.......kniiucisdnnnddndqqnk.',
    '.......kihduuudnqqddddddnqk.',
    '......kkedoudddnnqd....ddqk.',
    '......knhhtdndnnnd......dnnk',
    '....kkkddsdidnnhnd......ddnk',
    '..kkjfkdsdddnnhnd.......cdnk',
    '..kjfkkkkhnnnnnd........kdhk',
    '...kkfkhdddddddd........kdhk',
    '....kfkhdhdvrgnd........kdhk',
    '...kjkhndndweod.........khk.',
    '..kjjkhndnndnd..........kc..',
    '...kkohndongnd..........kd..',
    '...knhongdnhdhd..........dd.',
    '.kkohhnnddghdnd.............',
    'knkkdnnnddnndld.............',
    '...konngdddhgend............',
  ],
  colors: LYRA_HAIR_COLORS,
};

/** Behind the body (hairBack): her wavy hair to the waist. Pivot on our face anchor; it turns with the torso (angle: our idle torso's). */
export const LYRA_HAIR_LONG: PaintedPiece = {
  pivot: [24, -2],
  angle: -90.1,
  rows: [
    '..............hndnddeo.......',
    '..............hndnndnd.......',
    '.............ohndongnd.......',
    '...........knhongdnhdh.......',
    '.........kkohhnnddghdn.......',
    '........knkkdnnnddnndl.......',
    '.......kok.konngdddhge.......',
    '......kmk.knnnoddddgnngd....d',
    '......kmkkongnhddddddg.......',
    '......kmnnhdoghdddddcn.......',
    '.....kppmhhohghdddddcc.......',
    '....kpphhhngdghdddddcc.......',
    '...kpphdhoidkghddddegc.......',
    '..kppidknmhddghddddekc.......',
    '..kppdkhnhddkggggddegc.......',
    '..knndknnhdddggggddegc.......',
    '..knnddnnhdddggggddegc.......',
    '..knnhdnnhdddggggdeegc.......',
    '...knndnnhdddggggkeegc.......',
    '....knhhnndddgggkddegc.......',
    '....knhhnndddggggddegc.......',
    'k..knnhhnndddgggddddgc.......',
    'kkknnhhhnndddgggddddgc.......',
    '.kllhkhhnndddgggddddac.......',
    '..kkkkhhnndddgggdkddgc.......',
    '.....khhnndddggddkhdgc.......',
    '.....khknndddghhdkhdgc.......',
    '......kknnddkdhhddkdgc.......',
    '........kkdddddhhdhdgc.......',
    '..........kdddkhhdhdgc.......',
    '...........kkdkkhdhdgc.......',
    '............kk..kkkkkk.......',
  ],
  colors: LYRA_HAIR_COLORS,
};

/** Over the near shoulder onto the chest (hairFront, behind the near arm): her braid. Pivot on our face anchor; it turns with the torso. */
export const LYRA_HAIR_BRAID: PaintedPiece = {
  pivot: [5, -9],
  angle: -90.1,
  rows: [
    'gnngd...',
    'ddgdnd..',
    '.cnnhd..',
    '.cchdob.',
    '.kcnngb.',
    'egcbek..',
    '....kgk.',
    '....kbkk',
    '....dhod',
    '....dnnd',
    '....dhnd',
    '....kdhk',
    '.....dd.',
  ],
  colors: LYRA_HAIR_COLORS,
};

/** His dark line: kept as he drew it when the hair is recoloured. */
export const LYRA_HAIR_LINE = 'kab';
/** The bow (its greys follow the ribbon colour) and the pin (its golds follow the ornament colour). */
export const LYRA_HAIR_BOW = 'fj';
export const LYRA_HAIR_PIN = 'stu';
/** Her ear, in our skin ramp's shades. */
export const LYRA_HAIR_EAR: Record<string, number> = { r: 2, v: 2, w: 3 };
/** The colour slots' defaults: his mid auburn, the bow's grey, the pin's gold. */
export const LYRA_HAIR_BASE = '#a33f27';
export const LYRA_RIBBON_BASE = '#454350';
export const LYRA_PIN_BASE = '#e2a545';
