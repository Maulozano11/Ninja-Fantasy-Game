// Lyra's thigh-high boots and the bare thigh above them: the owner's pixels from his picture of her at
// our game's scale (docs/reference/lyra-game-scale-owner-reference.jpg, one of his pixels is one of
// ours), cut by tools/refs/lyra-boots-from-ref.py. Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** Her colours the colour slots move the others from (at these, every pixel is his). */
export const LYRA_BOOT_LEATHER = '#301f25';
export const LYRA_BOOT_GOLD = '#cc8e3b';
export const LYRA_BOOT_BUCKLE = '#da9a42';
export const LYRA_BOOT_SKIN = '#fbc9aa';

/** What each letter of these pieces is: his black line (it stays), her skin, leather, gold or the strap's studs. */
export const LYRA_BOOT_KIND: Record<string, 'line' | 'skin' | 'leather' | 'gold' | 'buckle'> = {
  '0': 'line',
  '2': 'leather',
  'i': 'leather',
  '8': 'leather',
  '7': 'leather',
  's': 'leather',
  'l': 'leather',
  'n': 'leather',
  'r': 'leather',
  'd': 'skin',
  'J': 'skin',
  'B': 'gold',
  'E': 'gold',
  'c': 'gold',
  'I': 'gold',
  'K': 'gold',
  'U': 'buckle',
  'V': 'buckle',
};

/**
 * Each leg at our female idle frame 0, fine pixels: our hip and ankle, and his knee and ankle. The
 * boots ride a leg from our hip to his knee and his ankle (src/sprite/items/lyraBoots.ts).
 */
export const LYRA_BOOT_LEGS = {
  N: { hip: [119.88, 177.11], ankle: [116.78, 207.65], hisKnee: [117.5, 195.5], hisAnkle: [112.5, 210.5] },
  F: { hip: [132.94, 173.66], ankle: [137.28, 203.04], hisKnee: [134.5, 195.5], hisAnkle: [133.5, 209.5] },
} as const;

/** The near bare thigh, the gold cuff and the shaft to below the knee guard: they turn with her thigh about her knee. */
export const LYRA_BOOT_THIGH_N: PaintedPiece = {
  pivot: [3, 14],
  angle: 97.3741,
  rows: [
    '....0ddddd0..',
    '....0ddddd0..',
    '....0ddddd0..',
    '...0dddddd0..',
    '....0dJJJddd0',
    '....0000JJJ00',
    '..00cKII000E0',
    '.00BcKKIKcB0.',
    '.0BBccKKKcB0.',
    '..000000000..',
    '..02i2220....',
    '.00002220....',
    '.0n077720....',
    '0r0277770....',
    '000227720....',
    '020722220....',
  ],
  colors: {
    '0': '#010101',
    '2': '#301f25',
    i: '#3d282a',
    '7': '#5b3e3b',
    n: '#583025',
    r: '#6b3b2b',
    d: '#d58771',
    J: '#fbc9aa',
    B: '#945a29',
    E: '#b47831',
    c: '#cc8e3b',
    I: '#fbc65c',
    K: '#fccc69',
  },
};

/** The near shaft down the shin and the ankle strap with its studs: they turn with her shin about her ankle. */
export const LYRA_BOOT_SHIN_N: PaintedPiece = {
  pivot: [3, 16],
  angle: 108.4349,
  rows: [
    '.....0r0277770',
    '.....000227720',
    '.....020722220',
    '....022022220.',
    '....02820000..',
    '...022880220..',
    '...0288s220...',
    '...02880720...',
    '...088s0220...',
    '..02880720....',
    '..028s0220....',
    '..028s820.....',
    '..0280220.....',
    '..087020......',
    '.0280820......',
    '.0200220......',
    '.00i700.......',
    '02U87U0.......',
    '0227720.......',
    '0800070.......',
  ],
  colors: {
    '0': '#010101',
    '2': '#301f25',
    i: '#3d282a',
    '8': '#4b3333',
    '7': '#5b3e3b',
    s: '#6c4b48',
    r: '#6b3b2b',
    U: '#da9a42',
  },
};

/** The near foot, seen from the front: it stays flat under her ankle. */
export const LYRA_BOOT_FOOT_N: PaintedPiece = {
  pivot: [4, -1],
  angle: 108.4349,
  rows: [
    '.02U87U0.',
    '.0227720.',
    '.0800070.',
    '.0022200.',
    '022777220',
    '027777720',
    '022222220',
    '.0000000.',
  ],
  colors: {
    '0': '#010101',
    '2': '#301f25',
    '8': '#4b3333',
    '7': '#5b3e3b',
    U: '#da9a42',
  },
};

/** The far bare thigh, the gold cuff and the shaft to below the knee guard: they turn with her thigh about her knee. */
export const LYRA_BOOT_THIGH_F: PaintedPiece = {
  pivot: [6, 13],
  angle: 85.9144,
  rows: [
    '0dddddddd0.',
    '0dddddddd0.',
    '0dddddddd0.',
    '0ddddddJJ0.',
    '00ddJJJJ000',
    '0c000000IB0',
    '0BBBcKKIcB0',
    '0BBBccKKcB0',
    '.00BccIIc0.',
    '.020000000.',
    '.022770220.',
    '.0007077i0.',
    '.0rr027si0.',
    '.0ll0227i0.',
    '.000072220.',
    '.022i0220..',
  ],
  colors: {
    '0': '#010101',
    '2': '#301f25',
    i: '#3d282a',
    '7': '#5b3e3b',
    s: '#6c4b48',
    l: '#4a2925',
    r: '#6b3b2b',
    d: '#d58771',
    J: '#fbc9aa',
    B: '#945a29',
    c: '#cc8e3b',
    I: '#fbc65c',
    K: '#fccc69',
  },
};

/** The far shaft down the shin and the ankle strap with its studs: they turn with her shin about her ankle. */
export const LYRA_BOOT_SHIN_F: PaintedPiece = {
  pivot: [4, 14],
  angle: 94.0856,
  rows: [
    '0ll0227i0.',
    '000072220.',
    '022i0220..',
    '.022200...',
    '.0222i0...',
    '.0222i0...',
    '0222880...',
    '0222880...',
    '022880....',
    '.022880...',
    '.022880...',
    '.022880...',
    '..02880...',
    '..028070..',
    '..020870..',
    '.0202Ui70.',
    '.0220iV020',
  ],
  colors: {
    '0': '#010101',
    '2': '#301f25',
    i: '#3d282a',
    '8': '#4b3333',
    '7': '#5b3e3b',
    l: '#4a2925',
    U: '#da9a42',
    V: '#cc8e3b',
  },
};

/** The far foot pointing right, with its heel: it stays flat under her ankle. */
export const LYRA_BOOT_FOOT_F: PaintedPiece = {
  pivot: [3, -1],
  angle: 94.0856,
  rows: [
    '0202Ui70......',
    '0220iV020.....',
    '0222008770....',
    '0002222777000.',
    '02200222277720',
    '.000.022222220',
    '......00000000',
  ],
  colors: {
    '0': '#010101',
    '2': '#301f25',
    i: '#3d282a',
    '8': '#4b3333',
    '7': '#5b3e3b',
    U: '#da9a42',
    V: '#cc8e3b',
  },
};
