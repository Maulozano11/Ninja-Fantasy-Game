// Aurelia's hair, the owner's pixels at our scale (tools/refs/aurelia-hair-from-ref.py from
// docs/reference/aurelia-escala-juego-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** His colours, one character each (both parts share them). */
const AURELIA_HAIR_COLORS: Record<string, string> = {
  k: '#030519',
  b: '#553a32',
  c: '#6d4a32',
  e: '#7e523d',
  g: '#926446',
  n: '#d0a474',
  u: '#e6c08a',
  w: '#f6daa2',
  x: '#fae1be',
  z: '#fbeecc',
  l: '#dda83a',
  t: '#fdd258',
  p: '#e4967d',
};

/** Every pixel of her hair: the bun and its ornament, the crown, the bangs, the near lock and the far lock. Its pivot is the cell on our face anchor (the near eye's first column, its lash row). */
export const AURELIA_HAIR_FRONT: PaintedPart = {
  pivot: [13, 13],
  rows: [
    '....kkkkk..................',
    '...kuzwwnkkkkkkkk..........',
    '..knnnwnenwwxzunwkkk.......',
    '.knwzwegwzzwnnnnnnwnk......',
    '.kgwwnewwwwewwwwwnnwwe.....',
    'knewnenwzwewwwnwwwwwwwe....',
    'kweuencccczwwnwwwwwznwwe...',
    'kwnnectctczzzewwzwwzewze...',
    'knwggcccccwwwnwzzuzzewwzxe.',
    'kenccwctctcwenuwwezwennzne.',
    'knectccccccwennweewneeeewne',
    'knncclcnnewwennepeuepepenne',
    'kgnneccncewweneepeeppbpbnne',
    '.kgnenn..ewwe...........ene',
    '..keeeg..ewne...........eee',
    '..knkkg..ewne...........ne.',
    '..knk.kekewne..........ene.',
    '...kgkkkeenwne.........ene.',
    '....keeekenwe...........e..',
    '.....kkk.knwe..........ne..',
    '.........kewe.........ne...',
    '........kkene........ene...',
    '...........ee.........ee...',
    '......................e....',
  ],
  colors: AURELIA_HAIR_COLORS,
};

/** The front with the skin between her bang strands filled, drawn behind the head; also her head's outline above the eyes. */
export const AURELIA_HAIR_BACK: PaintedPart = {
  pivot: [13, 13],
  rows: [
    '....kkkkk..................',
    '...kuzwwnkkkkkkkk..........',
    '..knnnwnenwwxzunwkkk.......',
    '.knwzwegwzzwnnnnnnwnk......',
    '.kgwwnewwwwewwwwwnnwwe.....',
    'knewnenwzwewwwnwwwwwwwe....',
    'kweuencccczwwnwwwwwznwwe...',
    'kwnnectctczzzewwzwwzewze...',
    'knwggcccccwwwnwzzuzzewwzxe.',
    'kenccwctctcwenuwwezwennzne.',
    'knectccccccwennweewneeeewne',
    'knncclcnnewwenneeeueeeeenne',
    'kgnneccncewweneeeeeeebebnne',
    '.kgnenn..ewwe...........ene',
    '..keeeg..ewne...........eee',
    '..knkkg..ewne...........ne.',
    '..knk.kekewne..........ene.',
    '...kgkkkeenwne.........ene.',
    '....keeekenwe...........e..',
    '.....kkk.knwe..........ne..',
    '.........kewe.........ne...',
    '........kkene........ene...',
    '...........ee.........ee...',
    '......................e....',
  ],
  colors: AURELIA_HAIR_COLORS,
};

/** His black line: kept as he drew it when the hair is recoloured. */
export const AURELIA_HAIR_LINE = 'k';

/** His golds (the ornament): they follow the ornament's colour slot. */
export const AURELIA_HAIR_ORNAMENT = 'lt';

/** His brow's shaded skin between her bang strands: it follows the player's skin. */
export const AURELIA_HAIR_SKIN = 'p';

/** His lit skin: the skin his brow's shade is measured from. */
export const AURELIA_SKIN_BASE = '#f5c7a6';

/** His mid blonde, the lit face of most of her strands: the hair colour slot's default; his other blondes and browns follow it. */
export const AURELIA_HAIR_BASE = '#f6daa2';

/** His bright gold: the ornament colour slot's default; his other gold follows it. */
export const AURELIA_ORNAMENT_BASE = '#fdd258';
