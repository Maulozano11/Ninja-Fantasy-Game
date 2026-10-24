// The owner's officer's under-layer (dark), the owner's pixels at our scale (tools/refs/navy-vest-from-ref.py from
// docs/reference/navy-officer-dark-coat-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const VEST_BROCADE_SHIRT = '#2a2a32';
export const VEST_BROCADE_VEST = '#2f1321';
export const VEST_BROCADE_GOLD = '#b8763a';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const VEST_BROCADE_KIND: Record<string, 'gold' | 'line' | 'shirt' | 'skin' | 'vest'> = {
  '#000116': 'line',
  '#13182b': 'shirt',
  '#1d1e23': 'shirt',
  '#2a2a32': 'shirt',
  '#2f1321': 'vest',
  '#352839': 'shirt',
  '#371722': 'vest',
  '#414246': 'shirt',
  '#472331': 'vest',
  '#502428': 'vest',
  '#58262c': 'vest',
  '#614b36': 'skin',
  '#744d2f': 'skin',
  '#7c522f': 'gold',
  '#7f503e': 'skin',
  '#825b34': 'gold',
  '#8a5f36': 'gold',
  '#8d6735': 'gold',
  '#945a40': 'skin',
  '#97703b': 'gold',
  '#982922': 'vest',
  '#9f7440': 'gold',
  '#a33428': 'vest',
  '#af6e38': 'gold',
  '#b08044': 'gold',
  '#b68a46': 'gold',
  '#b8763a': 'gold',
  '#b87b44': 'gold',
  '#c8835a': 'skin',
  '#cea14e': 'gold',
  '#fabf5b': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const VEST_BROCADE_REST: Record<string, [number, number]> = {
  VEST_BROCADE: [120, 144],
};

/** The shirt and the vest over the front of the torso, continued under the coat. Its pivot is the cell on the neck joint, at the torso's angle. */
export const VEST_BROCADE: PaintedPiece = {
  pivot: [7, 3],
  angle: -89.65,
  rows: [
    '.aaa..........',
    '.aaaa......bb.',
    'aaaaaabbbbcada',
    'aaaaabbefbcbdc',
    'ccccbccbhhbbdh',
    'iiiiibabhhbcdc',
    'iiiiibabhhbada',
    'iiiiibaabebada',
    'jjjjjcbachbcbc',
    'jjjjjbjbaabbdd',
    'kkkkkblmbbcndd',
    'ppppkpbqmbrbdr',
    'ssssksbtumbqdq',
    'vvvvkvbttbwtdt',
    'xxxxkxbttbytdt',
    'zzzzkzbttbmtd.',
    'ttttkbbttbAtd.',
    'BBBBkBbttbAtd.',
    'CCCCkbCtDbmtd.',
    'EEEEkEFtubGtd.',
    'EEEEkbFtumGtd.',
    'EEEEkEFtumGtd.',
    'EEEEkEFtumGtd.',
    'EEEEkEFtumGtd.',
    'EEEEkEFtumGtd.',
    'EEEEkEFtumGtd.',
    '.EEEkEFtumGt..',
    '.EEEkEFtumGt..',
    '...EkEFtum....',
  ],
  colors: {
    a: '#414246',
    b: '#000116',
    c: '#2a2a32',
    d: '#cea14e',
    e: '#945a40',
    f: '#7f503e',
    h: '#c8835a',
    i: '#352839',
    j: '#b87b44',
    k: '#b8763a',
    l: '#472331',
    m: '#b08044',
    n: '#b68a46',
    p: '#9f7440',
    q: '#502428',
    r: '#13182b',
    s: '#982922',
    t: '#2f1321',
    u: '#58262c',
    v: '#af6e38',
    w: '#825b34',
    x: '#a33428',
    y: '#744d2f',
    z: '#97703b',
    A: '#fabf5b',
    B: '#7c522f',
    C: '#614b36',
    D: '#371722',
    E: '#1d1e23',
    F: '#8d6735',
    G: '#8a5f36',
  },
};
