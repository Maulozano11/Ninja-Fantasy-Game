// The owner's boots on his navy officer, the owner's pixels at our scale (tools/refs/navy-boots-from-ref.py from
// docs/reference/navy-officer-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NAVY_BOOTS_LEATHER = '#19182a';
export const NAVY_BOOTS_CUFF = '#291a21';
export const NAVY_BOOTS_GOLD = '#e8b564';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const NAVY_BOOTS_KIND: Record<string, 'cloth' | 'cuff' | 'gold' | 'line' | 'skin'> = {
  '#000000': 'line',
  '#000316': 'line',
  '#0c1124': 'cloth',
  '#14141e': 'cloth',
  '#19182a': 'cloth',
  '#1c223a': 'cloth',
  '#1e1e26': 'cloth',
  '#291a21': 'cuff',
  '#2d2729': 'cuff',
  '#2e2e3a': 'cloth',
  '#383641': 'cloth',
  '#412b2e': 'cuff',
  '#4f3332': 'cuff',
  '#5d3f3e': 'skin',
  '#5d4035': 'skin',
  '#624b3e': 'skin',
  '#6d4830': 'skin',
  '#6d5042': 'skin',
  '#79512e': 'skin',
  '#7a5136': 'skin',
  '#88562f': 'gold',
  '#925e32': 'gold',
  '#926140': 'gold',
  '#a47040': 'gold',
  '#aa7c4b': 'gold',
  '#ad7642': 'gold',
  '#e8b564': 'gold',
  '#eab45c': 'gold',
  '#ecbd66': 'gold',
  '#eebd5d': 'gold',
  '#f2c46e': 'gold',
  '#f4be66': 'gold',
  '#f4cc76': 'gold',
  '#fad576': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NAVY_BOOTS_REST: Record<string, [number, number]> = {
  NAVY_BOOTS_SHIN_N: [108, 192],
  NAVY_BOOTS_FOOT_N: [109, 209],
  NAVY_BOOTS_SHIN_F: [127, 193],
  NAVY_BOOTS_FOOT_F: [129, 208],
};

/** The near boot's shaft and its folded cuff, pivoted on his near ankle at his shin's angle. */
export const NAVY_BOOTS_SHIN_N: PaintedPiece = {
  pivot: [7, 16],
  angle: 103.24,
  rows: [
    '......a.......',
    'abca..aadeeed.',
    'afha.aijaaadd.',
    '.afa.aikllmaa.',
    '.aa..ainpaqkk.',
    '..a..akraasqk.',
    '..a..attaualia',
    '.....aaaavawna',
    '.....aauauaaa.',
    '.....aaaaxua..',
    '.....aaakxaa..',
    '.....aaauxaa..',
    '.....aaauua...',
    '.....ahahaa...',
    '.....aakhaa...',
    '....aayyaaa...',
    '....aaaaya....',
    '....aayyaa....',
    '....aaaaya....',
  ],
  colors: {
    a: '#000316',
    b: '#925e32',
    c: '#ad7642',
    d: '#0c1124',
    e: '#1c223a',
    f: '#a47040',
    h: '#1e1e26',
    i: '#291a21',
    j: '#5d4035',
    k: '#412b2e',
    l: '#f2c46e',
    m: '#aa7c4b',
    n: '#ecbd66',
    p: '#f4be66',
    q: '#e8b564',
    r: '#eebd5d',
    s: '#926140',
    t: '#88562f',
    u: '#14141e',
    v: '#2d2729',
    w: '#6d4830',
    x: '#19182a',
    y: '#2e2e3a',
  },
};

/** The near boot's foot, pivoted on his near ankle. */
export const NAVY_BOOTS_FOOT_N: PaintedPiece = {
  pivot: [6, -1],
  angle: 0.00,
  rows: [
    '...aaabaa.',
    '...acddaea',
    '..accfddaa',
    '..aabbacca',
    '.aabbbbaca',
    'aaebhibeaa',
    'aaeeeeeaaa',
    '.ajaaaaca.',
    '..aaaaaa..',
  ],
  colors: {
    a: '#000316',
    b: '#2e2e3a',
    c: '#291a21',
    d: '#4f3332',
    e: '#14141e',
    f: '#6d5042',
    h: '#926140',
    i: '#624b3e',
    j: '#412b2e',
  },
};

/** The far boot's shaft and its folded cuff, pivoted on his far ankle at his shin's angle. */
export const NAVY_BOOTS_SHIN_F: PaintedPiece = {
  pivot: [5, 14],
  angle: 86.42,
  rows: [
    '.aaabbcaa.',
    '.adeaaafha',
    '.aiiddfaja',
    'aiiiddfaka',
    'almidfaana',
    '.apqmnraaa',
    '.aaaaaraa.',
    '..aaasra..',
    '..aasrra..',
    '..aasrra..',
    '...abbra..',
    '...aabraa.',
    '...aasrta.',
    '...abstaa.',
    '...aaaasaa',
    '...abstaau',
    '...aaaasaa',
  ],
  colors: {
    a: '#000316',
    b: '#0c1124',
    c: '#1c223a',
    d: '#412b2e',
    e: '#5d3f3e',
    f: '#f2c46e',
    h: '#624b3e',
    i: '#291a21',
    j: '#eab45c',
    k: '#ecbd66',
    l: '#7a5136',
    m: '#79512e',
    n: '#a47040',
    p: '#925e32',
    q: '#88562f',
    r: '#1e1e26',
    s: '#14141e',
    t: '#2e2e3a',
    u: '#000000',
  },
};

/** The far boot's foot, pivoted on his far ankle. */
export const NAVY_BOOTS_FOOT_F: PaintedPiece = {
  pivot: [3, -1],
  angle: 0.00,
  rows: [
    '.aabcada........',
    'aaabaedda.......',
    'aeaafaedda......',
    'aaabfbaeahaa....',
    'abeeabbaccccaaa.',
    '.aeeaaaabbcccija',
    '..aaa.aaaaaaaaaa',
    '........aaaaaaaa',
  ],
  colors: {
    a: '#000316',
    b: '#14141e',
    c: '#2e2e3a',
    d: '#4f3332',
    e: '#291a21',
    f: '#0c1124',
    h: '#383641',
    i: '#f4cc76',
    j: '#fad576',
  },
};
