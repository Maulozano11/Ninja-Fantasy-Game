// Lyra's skirt, tabard and belt: the owner's picture of her at our game scale, his pixels one for one
// (tools/refs/lyra-lower-from-ref.py from docs/reference/lyra-game-scale-owner-reference.jpg). Each
// piece sits in our 256 x 256 frame on the female body at idle frame 0; lyraLower.ts carries it onto
// the rig. Generated: rerun the script to change it.

import type { DrapedPiece } from './lyraLower';

/** One character per colour of his (all the pieces share them). */
export const LYRA_LOWER_COLORS: Record<string, string> = {
  k: '#010101',
  a: '#3b1023',
  b: '#301f25',
  c: '#4e1524',
  d: '#282834',
  e: '#5a1723',
  f: '#2b313f',
  g: '#681d24',
  h: '#40302f',
  i: '#73182d',
  j: '#4d3635',
  l: '#821c32',
  m: '#902132',
  n: '#454350',
  o: '#5b3e3b',
  p: '#9e2739',
  q: '#674a47',
  r: '#7e5d54',
  s: '#bb4d32',
  t: '#b65054',
  u: '#a4682c',
  v: '#b3752d',
  w: '#9d7e6a',
  x: '#8f929c',
  y: '#ac8e71',
  z: '#cc8e3b',
  A: '#939aa9',
  B: '#9e9fa1',
  C: '#da9a42',
  D: '#c49d79',
  E: '#cbad8d',
  F: '#fdcc5e',
  G: '#f3e3c2',
};

/** The skirt (bottom_striped_pleats, torso.bottom): his pleats, stripes and hem. */
export const LYRA_SKIRT: DrapedPiece = {
  x: 115,
  y: 174,
  rows: [
    'kkkkkkkkkkkkkkkkkkkkkk.....',
    'k...dk....dk........dk.....',
    'kkkkdkdkkkdkdkkkdkdkdk.....',
    'kddkdkdddkdkdddkdkdddk.....',
    'klkdnkklkdnkndnknkndnd.....',
    'kkdnnkdkdnnkndnknkndnnkdk..',
    'kkdnnddkdnnknnnanknnknknk..',
    'kdnnknkdnnkcnnnnkcnnkndknk.',
    'kdnndnadnnknnnnnknnnknnknk.',
    'knndnkdnnnknnnnnknnnknnkndk',
    'kmnelkmmnnknnnnnknnnknmkllk',
    'km.kkkkmmmkmmmmmkmmmkmmkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkk....',
  ],
  colors: LYRA_LOWER_COLORS,
};

/** The tabard's near panel and the far panel's top (skirt_gilded_tabard, over the skirt and the near leg). */
export const LYRA_FRONT: DrapedPiece = {
  x: 95,
  y: 174,
  rows: [
    '....................kkkkkkkkkClk........kmGEk....',
    '...................kwEEGGGGGGmk..........kCGk....',
    '..................kwEEGGzCGGCk...........kmGCk...',
    '.................kkEEGGCllsGmk...........kmCmk...',
    '................kEEGGGzlGk................kkkkkk.',
    '...............kEEGEGGzlGk..................kGk..',
    '..............kEEGEGGClGk...................kGk..',
    '.............kEEGGGCzllGk....................kGk.',
    '............kEEGGGGlmlGk.....................kGk.',
    '...........kEEGGGGzlDGk......................kGk.',
    '..........kEEGGGGGGlGGk.......................kGk',
    '.........kEEGGGGGGGGGk........................kGk',
    '........kEEGGGGGGGGGG............................',
    '........kEEEEGEGGGk..............................',
    '.........kEEGGEGGk...............................',
    '........kEEGGEGGGGk..............................',
    '.......kEEGGGGGGGk...............................',
    '......kEEGGGGGGGk................................',
    '.....kEEGGGGGGGk.................................',
    '....kEEGGGEGGGEb.................................',
    '...kEiGGGEGGGGk..................................',
    '..kEiEGGEGGGGk...................................',
    '.kEigGGEEGGGCk...................................',
    '.kiiEGEEGGGCk....................................',
    'kgviGGiEGGFCk....................................',
    'kgiEGiiGGtCk.....................................',
    'kuiviiEGClCk.....................................',
    'kvigiiEGplCk.....................................',
    '.kviCiGCmCk......................................',
    '.kviiCClmCk......................................',
    '..kClmCllCk......................................',
    '..kCmlmlCk.......................................',
    '...kClmlCk.......................................',
    '....kCCmCk.......................................',
    '.....kkCCk.......................................',
    '.......kkk.......................................',
  ],
  colors: LYRA_LOWER_COLORS,
};

/** The tabard's lining and far tail (skirt_gilded_tabard, backGear: behind the legs). */
export const LYRA_BACK: DrapedPiece = {
  x: 102,
  y: 183,
  rows: [
    '............krrrrrrryrrrrrrrrrrrrrrrrrrkk.......',
    '............krrrrrrryrrrrrrrrrrrrrrrrrrkGk......',
    '...........krrrrrrrryrrrrrrrrrrrrrrrrrrkGk......',
    '..........krrrrrrrrrrrrrrrrrrrrrrrrrrrrkGk......',
    '........krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrkGk.....',
    '.......krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrkGk.....',
    '........krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrkGk.....',
    '.......krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrkGk....',
    '......krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrkGk....',
    '.....krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrGGk...',
    '.....krryrrrrrryrrrrrryrrrrrrrrrrrrrrrrrrrzGk...',
    '....krryrrrrrryyrryyryyrrrrryyyyyrrrrrryrrkGk...',
    '...krrrrryrrrrrrrrrrryrrrrrryyyyyrrrrrryrrkGGk..',
    '...krrrryyryyrryyrrrryrrrrrryyyyyrrrrrryrrrCGk..',
    '..krrrrryrrrrrryrrrrryrrrrrryyyyyrrrrrryrrrkGEk.',
    '..krrrryyrrrryyyrrrryyyrryrryyyyyyrrrrryyrrkCGk.',
    '.krrrryyrrrrryyrrrrryyyrrrryyyyyyyrrrryyyrrkClk.',
    '.krrrryyrrrryyyrrrryyyrrrrryyyyyyyrrrryyyrrkCmk.',
    '.krrryyyyrrryyyyrrryyyyrrrryyyyyyyyrrryyyyrrkCmk',
    'kkkkkkyrrrryyyyrrryyyyrrrykkkkkkkkkkkkkyyyrrkCmk',
    '......kkkrryyrrrrryykkkkkk.............kkkrrkClk',
    '.........kkkkkkkkkkk......................krkCmk',
    '...........................................kkCmk',
    '............................................kCCk',
    '............................................kCk.',
    '............................................kk..',
  ],
  colors: LYRA_LOWER_COLORS,
};

/** The belts, the flap and the pouch (waist_pouch_belt, waist). */
export const LYRA_BELT: DrapedPiece = {
  x: 115,
  y: 169,
  rows: [
    '...kbbojkkkjjkkkkkkkkbkhk....',
    '..kkkkbboobkkkqqqqqqjbkkhkkk.',
    '..kEEEkkkkkhqqqhhhhhkkkbkaAfk',
    '.kkkkkxbboojokkkkkkkbbbkaibBk',
    '.bbbokxxbkkkkobkkkkkkkkkiilak',
    'kkkkkkkkk..kCjbCCCCCk...klak.',
    '............kCCkkkkk....kakkk',
  ],
  colors: LYRA_LOWER_COLORS,
};

/** The characters each colour slot moves, and the colour of his it starts from. */
export const LYRA_SKIRT_CLOTH = 'dn';
export const LYRA_SKIRT_CLOTH_BASE = '#454350';
export const LYRA_SKIRT_STRIPES = 'acelm';
export const LYRA_SKIRT_STRIPES_BASE = '#902132';
export const LYRA_TABARD_CLOTH = 'DEGrwy';
export const LYRA_TABARD_CLOTH_BASE = '#f3e3c2';
export const LYRA_TABARD_TRIM = 'gilmpst';
export const LYRA_TABARD_TRIM_BASE = '#821c32';
export const LYRA_TABARD_GOLD = 'CFuvz';
export const LYRA_TABARD_GOLD_BASE = '#da9a42';
export const LYRA_BELT_LEATHER = 'Ehjoq';
export const LYRA_BELT_LEATHER_BASE = '#5b3e3b';
export const LYRA_BELT_STEEL = 'ABfx';
export const LYRA_BELT_STEEL_BASE = '#8f929c';
export const LYRA_BELT_POUCH = 'ail';
export const LYRA_BELT_POUCH_BASE = '#73182d';
export const LYRA_BELT_GOLD = 'C';
export const LYRA_BELT_GOLD_BASE = '#da9a42';
