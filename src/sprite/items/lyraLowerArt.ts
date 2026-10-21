// Lyra's skirt, tabard and belt (tools/refs/lyra-lower-from-ref.py from
// docs/reference/lyra-owner-reference.jpg): drawn by hand at our scale in her colours, each piece placed
// in our 256 x 256 frame on the female body at idle frame 0 (lyraLower.ts carries them onto the rig).
// Generated: rerun the script to change it.

import type { DrapedPiece } from './lyraLower';

export const LYRA_SKIRT: DrapedPiece = {
  x: 112,
  y: 170,
  rows: [
    '.kkkkkkkkkkkkkkkkkkkkkkkkk.',
    'kXXkJXXXkJXXXXkJXXXXkJXXXXk',
    'kXekqXeekqXeeekqXeeekqXeeXk',
    'kXekqXemkqXmEmkqXmmekqXeeXk',
    'kXekqXmmkqXEEmkqXmEmkqXmeXk',
    'kXekqXmEkqXEtEkqXmEmkqXmeXk',
    'kXekqXmmkqXEXmkqXmXekqXeeXk',
    'kXekqXmmkqXmXmkqXmXekqXeXXk',
    'kXXkqXmekqXmXmkqXeXekqXeXXk',
    'kXXkqXeekqXeXekqXeXekqXXXXk',
    'kXXkJXeXkJXeXXkJXXXXkJXXXXk',
    'krrkqrrrkqrrrrkqrrrrkqrrrqk',
    'kqrkqqrrkqqrrrkqqrrrkqqrqqk',
    '.kkkkkkkkkkkkkkkkkkkkkkkkk.',
  ],
  colors: {
    k: '#04010d',
    X: '#2a2a37',
    e: '#404049',
    m: '#464654',
    E: '#565862',
    t: '#686a74',
    J: '#3b0d21',
    q: '#590f26',
    r: '#8c1c35',
  },
};

export const LYRA_TABARD_FRONT: DrapedPiece = {
  x: 106,
  y: 170,
  rows: [
    '............................kkkkkkk.',
    '......kkkkkkkkkkkkkk........kGrCCvk.',
    '......kccCCCCCCCCrGk........kGrCCvk.',
    '......kccCCCCYGGCrGk.........kGrCvk.',
    '.....kccCCCCYrrrrGk..........kGrCvk.',
    '....kccCCCCCYrCrGk............kGrvk.',
    '....kccCCCCCvYoGk.............kGrCvk',
    '...kccCCucCvvrGk...............kGrvk',
    '...kccCCucvvrGk................kGrvk',
    '..kccCCucvvrGk..................kGrk',
    '..kccCCuvvrGk...................kGrk',
    '.kccCCuvvrGk....................kGrk',
    '.kccCCvvrGk.........................',
    'kccCCuvvrGk.........................',
  ],
  colors: {
    k: '#04010d',
    r: '#8c1c35',
    c: '#f6e8cd',
    C: '#e4d0af',
    u: '#cfb599',
    v: '#cbb194',
    G: '#f4c66e',
    Y: '#e8b45e',
    o: '#ce9242',
  },
};

export const LYRA_TABARD_NEAR: DrapedPiece = {
  x: 99,
  y: 184,
  rows: [
    '.......kccCCuvVVlk',
    '......kccCCucvVVlk',
    '......kccCCucvVVlk',
    '.....kccCCucCvVVlk',
    '.....kccCCucCvVVlk',
    '....kccCCucCCvVVlk',
    '....kccCCucCCvVVlk',
    '...kccCCucCCCvVVlk',
    '...kYrrrYcCCvVVlk.',
    '..kYrrrYcCCCvVVlk.',
    '..kYrrrYcCCCvVVlk.',
    '.kYrrrYcCCCCvVVlk.',
    '.kYrrrYcCCCCvVVYk.',
    'kYrCCYcCCCCuvYYrk.',
    'kYrCCYcCCCCuYrrrk.',
    'kYrCCrYCCCYYrrrrk.',
    '.kYrrrrYCYCrrrrYk.',
    '..kYrrrrYrCrrYYk..',
    '...kYYrqrrrrYkk...',
    '....kkYrrrYYk.....',
    '......kYrYkk......',
    '.......kYk........',
    '........k.........',
  ],
  colors: {
    k: '#04010d',
    q: '#590f26',
    r: '#8c1c35',
    c: '#f6e8cd',
    C: '#e4d0af',
    u: '#cfb599',
    v: '#cbb194',
    V: '#ac937a',
    l: '#9a7e6a',
    Y: '#e8b45e',
  },
};

export const LYRA_TABARD_BACK: DrapedPiece = {
  x: 117,
  y: 180,
  rows: [
    'bbbbbbbbbbbbbbbbbbbbbkcCk........',
    'bbbbbbbbbbbbbbbbbbbbbkcCk........',
    'bbbbbbbbbbbbbbbbbbbbbbkcCk.......',
    'bbbbbbbbbbbbbbbbbbbbbbkcCk.......',
    'LLLLLLLLlVLLLlVLLLlLLLkcCk.......',
    'LLLLLLLLlVLLLlVLLLlLLLlkcCk......',
    'LLLLLLLLlVLLLlVLLLlLLLlkcCk......',
    'LLLLLLLLlVLLLlVLLLlLLLlkcCk......',
    'LLLLLLLLlVLLLlVLLLlLLLlVkcCk.....',
    'LLLLLLLLlVLLLlVLLLlLLLlVkcCk.....',
    'LLLLLLLLlVLLLlVLLLlLLLlVkcCk.....',
    'LLLLLLLLlVLLLlVLLLlLLLlVLkcCk....',
    'LLLLLLLLlVLLLlVLLLlLLLlVLkcCk....',
    'LLLLLLLLlVLLLlVLLLlLLLlVVkcCk....',
    'LLLLLLLLlVLLLlVLLLlLLLlVVkcCk....',
    'LLLLLLLLlVLLLlVLLLlLLLlVVLkcCk...',
    'LLLLLLLLlVVLLlVLLLlLLLlVVLkcCk...',
    'LLLLLLLLlVVLLlVLLLlLLLlVVLkcCk...',
    'LLLLLLLLlVVLLlVLLLlLLLlVVLLYrrk..',
    'LLLLLLLLlVVLLlVLLLlLLLlVVLLYrrk..',
    'LLLLLLLLlVVLLlVLLLlLLLlVVLLYrrk..',
    'LLLLLLLLlVVLLlVLLLlLLLlVVLLLYrrk.',
    'LLLLLLLLlVVLLlVLLLlLLLlVVLLLYrrk.',
    'LLLLLLLLlVVLkkkkkkkkkLlVVLLLYrrk.',
    'kkkkkkkkkkkk.........kkkkkkkLYYYk',
    '............................kkkkk',
    '............................kkkkk',
  ],
  colors: {
    k: '#04010d',
    r: '#8c1c35',
    c: '#f6e8cd',
    C: '#e4d0af',
    V: '#ac937a',
    l: '#9a7e6a',
    L: '#795d58',
    b: '#634947',
    Y: '#e8b45e',
  },
};

export const LYRA_BELT: DrapedPiece = {
  x: 114,
  y: 165,
  rows: [
    '......................kkkkk.',
    '.....................kfiitIk',
    '.....................k3iI8Ek',
    '.....................kkkkkkk',
    '....kkk..............kJq0qJk',
    'kkkkfiikkkkkkkkkkkkkkkJq0qJk',
    'k6NkiKik6NNNNNN6NNNNNkJq0qJk',
    'knnkittknn5nnnnnn5nnnkJqqqJk',
    'kkkkkkkkkkkkkkkkkkkkkk%JqJ%k',
    '.........kG^6^gk......kkkkk.',
    '..........kG6gk.............',
    '...........kgk..............',
    '............k...............',
  ],
  colors: {
    k: '#04010d',
    E: '#565862',
    t: '#686a74',
    J: '#3b0d21',
    q: '#590f26',
    '%': '#300918',
    '0': '#691f24',
    G: '#f4c66e',
    g: '#be8442',
    K: '#160a17',
    '5': '#2a1c24',
    n: '#352628',
    N: '#473435',
    '6': '#503b3c',
    '^': '#6c4636',
    f: '#d4e4ea',
    i: '#b0b6bc',
    '3': '#98a4aa',
    I: '#788c9a',
    '8': '#727882',
  },
};

/** The characters each colour slot recolours, and the colour of hers it starts from. */
export const LYRA_SKIRT_CLOTH = 'XemEt';
export const LYRA_SKIRT_CLOTH_BASE = '#464654';
export const LYRA_SKIRT_STRIPES = 'Jqr';
export const LYRA_SKIRT_STRIPES_BASE = '#8c1c35';
export const LYRA_TABARD_CLOTH = 'cCuvVlLb';
export const LYRA_TABARD_CLOTH_BASE = '#e4d0af';
export const LYRA_TABARD_TRIM = 'qr';
export const LYRA_TABARD_TRIM_BASE = '#8c1c35';
export const LYRA_TABARD_GOLD = 'GYog';
export const LYRA_TABARD_GOLD_BASE = '#e8b45e';
export const LYRA_BELT_LEATHER = 'K5nN6^';
export const LYRA_BELT_LEATHER_BASE = '#473435';
export const LYRA_BELT_STEEL = 'fi3I8tE';
export const LYRA_BELT_STEEL_BASE = '#b0b6bc';
export const LYRA_BELT_POUCH = '%Jq0';
export const LYRA_BELT_POUCH_BASE = '#590f26';
export const LYRA_BELT_GOLD = 'GYog';
export const LYRA_BELT_GOLD_BASE = '#e8b45e';
