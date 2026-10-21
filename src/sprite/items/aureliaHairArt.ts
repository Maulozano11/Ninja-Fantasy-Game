// Aurelia's hair, the owner's pixels brought down to our scale (tools/refs/aurelia-hair-from-ref.py
// from docs/reference/aurelia-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** Her colours, one character each (both parts share them). */
const AURELIA_HAIR_COLORS: Record<string, string> = {
  k: '#030101',
  i: '#feefc6',
  h: '#f9dfac',
  c: '#e6c593',
  y: '#d8b286',
  t: '#c79e76',
  q: '#b38761',
  m: '#a17354',
  J: '#8e6447',
  j: '#86583d',
  I: '#794f38',
  H: '#6c4427',
  E: '#4a312c',
  D: '#36221f',
  f: '#fcd77a',
  Z: '#ecc268',
  X: '#deb05c',
  U: '#d4a251',
  R: '#c4934c',
  N: '#a9793c',
  P: '#966536',
};

/** Every pixel of her hair over the head: the bun, the ornament, the crown, the bangs, the near lock and the far side. Its pivot is the cell on our face anchor (the near eye's first column, its lash row). */
export const AURELIA_HAIR_FRONT: PaintedPart = {
  pivot: [11, 14],
  rows: [
    '.....kkkkk.kkkkkk........',
    '....khhcymkhhhmyykk......',
    '...kmyyImhiihhcytttkk....',
    '..kyihtIihhhcchhhytyck...',
    '.ktcicHcchicchhcyhchyhk..',
    '.ktchHtchccJhhcchhhhcchE.',
    'kyjcyHyychjhhhyhhhhhhchj.',
    'kyjyHqIfHfjiiccihiiihtihJ',
    'ktyjHcZffHHchmccichhhjhhJ',
    '.kttHcPXDRfZcqchchjhjjchj',
    '.kyZHtDUDUNjqcJyyjcyJjhcj',
    'kIqqfHjhhcJtJJtj.Jq.Jjytj',
    'ktqJHZjhhcJjjjj.tj..jJtyj',
    'kqymIyIhcj....jjj...jJtyj',
    '.kmyD.Ihcj.............yj',
    '.kmmJ.jhcj.............yj',
    '..kmJ.Iccj...............',
    '..ktDJIchj...............',
    '..kmEJIyhj...............',
    '...kIkmyhj...............',
    '....kqkJhj...............',
    '.....kkJhj...............',
    '.......kyhI..............',
    '........Jhj.........yj...',
    '........Jcj.........yj...',
    '........jcj.........Jyj..',
    '.........j...........I...',
  ],
  colors: AURELIA_HAIR_COLORS,
};

/** The front with the far lock beside the cheek and what her bangs hide filled in, drawn behind the head; also her head's outline above the eyes. */
export const AURELIA_HAIR_BACK: PaintedPart = {
  pivot: [11, 14],
  rows: [
    '.....kkkkk.kkkkkk........',
    '....khhcymkhhhmyykk......',
    '...kmyyImhiihhcytttkk....',
    '..kyihtIihhhcchhhytyck...',
    '.ktcicHcchicchhcyhchyhk..',
    '.ktchHtchccJhhcchhhhcchE.',
    'kyjcyHyychjhhhyhhhhhhchj.',
    'kyjyHqIfHfjiiccihiiihtihJ',
    'ktyjHcZffHHchmccichhhjhhJ',
    '.kttHcPXDRfZcqchchjhjjchj',
    '.kyZHtDUDUNjqcJyyjcyJjhcj',
    'kIqqfHjhhcJtJJtjyJqyJjytj',
    'ktqJHZjhhcJjjjjjtjqyjJtyj',
    'kqymIyIhcjJjjjjjjjqyjJtyj',
    '.kmyD.Ihcj............Jyj',
    '.kmmJ.jhcj............Jyj',
    '..kmJ.Iccj...........Jyj.',
    '..ktDJIchj...........jcj.',
    '..kmEJIyhj..........Jcj..',
    '...kIkmyhj..........jcI..',
    '....kqkJhj..........mcj..',
    '.....kkJhj..........Icj..',
    '.......kyhI........Jcj...',
    '........Jhj.........yj...',
    '........Jcj.........yj...',
    '........jcj.........Jyj..',
    '.........j...........I...',
  ],
  colors: AURELIA_HAIR_COLORS,
};

/** Her black line: kept as she drew it when the hair is recoloured. */
export const AURELIA_HAIR_LINE = 'k';

/** Her golds (the ornament and the pin): they follow the ornament's colour slot. */
export const AURELIA_HAIR_ORNAMENT = 'fZXURNP';

/** Her mid blonde, the lit face of most of her locks: the hair colour slot's default; her other blondes and browns follow it. */
export const AURELIA_HAIR_BASE = '#e6c593';

/** Her gold: the ornament colour slot's default; her other golds follow it. */
export const AURELIA_ORNAMENT_BASE = '#ecc268';
