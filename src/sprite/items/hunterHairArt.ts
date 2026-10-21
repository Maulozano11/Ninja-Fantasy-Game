// The owner's messy black hair on his Cazador 1, his pixels (tools/refs/cazador1-hair-from-ref.py
// from docs/reference/cazador1-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HUNTER_HAIR_BASE = '#18171f';
export const HUNTER_HAIR_SKIN = '#e7bb98';

/** What each colour of his is, as the script sorts them; his black line is never tinted. */
export const HUNTER_HAIR_KIND: Record<string, 'line' | 'hair' | 'skin'> = {
  '#030303': 'line',
  '#080909': 'line',
  '#0f0c12': 'hair',
  '#110e17': 'hair',
  '#141219': 'hair',
  '#16151d': 'hair',
  '#190d0d': 'hair',
  '#1a110f': 'hair',
  '#202028': 'hair',
  '#22212c': 'hair',
  '#231726': 'hair',
  '#25252f': 'hair',
  '#272733': 'hair',
  '#2c2f3b': 'hair',
  '#3d485b': 'hair',
  '#414d60': 'hair',
  '#ab725f': 'skin',
  '#fefefe': 'hair',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const HUNTER_HAIR_REST: Record<string, [number, number]> = {
  HUNTER_HAIR: [112, 122],
};

/** His hair over the head, pinned on the face anchor. */
export const HUNTER_HAIR: PaintedPiece = {
  pivot: [11, 17],
  angle: 0.00,
  rows: [
    '.............a..............',
    '............aaa.aaa.........',
    '........aabaabbacccaa.......',
    '......aacacabccccbbbca......',
    '.....accbabbabbccccbba......',
    '....acbbbabdddcbecbba.......',
    '...acbfcceeeddbbbcbccddd.a..',
    '.aacbhebbcddibbbbjbbbddaa...',
    '.abbbkhhcbccbbbcbbebclejaa..',
    '..aaabfcbhmcbfbcbfcbfjhjjca.',
    '..abbbcbbbjhfbcanfpchjfbaa..',
    '.ajbbebbbabhbcaabbeqbfcbea..',
    'aeccajbcabfbja..cbe.efceba..',
    '.aaacbeecbbba...cje.ebbcbca.',
    '...acccaebba....cjp..cbccca.',
    '..acceaabba.....ck...cbcaca.',
    '.acccacabp...........raeaea.',
    '..accaeaba..........rraaaca.',
    '..aaaccaaa............aacaaa',
    '..a.acasca.............aca..',
    '...aaeacca............aaca..',
    '.a.acccaca............acaa..',
    '.aacccccaaa..........aaca...',
    '..acaaccama..........ataa...',
    '..aacacaamma.........ata....',
  ],
  colors: {
    a: '#030303',
    b: '#25252f',
    c: '#16151d',
    d: '#1a110f',
    e: '#141219',
    f: '#414d60',
    h: '#3d485b',
    i: '#190d0d',
    j: '#202028',
    k: '#0f0c12',
    l: '#2c2f3b',
    m: '#22212c',
    n: '#272733',
    p: '#110e17',
    q: '#080909',
    r: '#231726',
    s: '#ab725f',
    t: '#fefefe',
  },
};
