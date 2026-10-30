// The hair of the owner's bare female body, his pixels (tools/refs/female-base-hair-from-ref.py from
// docs/reference/female-base-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** His messy ponytail over the head, its pivot on the face anchor (the near eye's lash column and row). */
export const BASE_HAIR: PaintedPart = {
  pivot: [16, 16],
  rows: [
    '.....aaaa..a..................',
    '.......cba..a.................',
    '....aaaaaba.aaaaaaaaaa........',
    '...abbbdbccaacbbbccbbcaa......',
    'abcbabccbcacccccbbbcccbbaa....',
    '.aaaccbccacbbbbccbebbbbbbba...',
    '..acdbccacbdbbcbbbbebbbbdbba..',
    '.abcbcccaccbdbcdbcbecdbcdbbba.',
    '.acabcbaabcbbeddfdbaabdabdcba.',
    'aeabcbcacbbccebbaba..ebacbbaba',
    'aaababcaccbbccbefa...ebaacbaba',
    'a.abaccacccbebbaccccc.ca.abbaa',
    '..baaccacccaabba.....c.a.acbaa',
    '..a.accacca..bba........aaaba.',
    '..a..acacca..cba........baaca.',
    '.....acaaca..cba........baac..',
    '....aaa.acca.cba..........aa..',
    '.........accacba..........a...',
    '..........aacaca..............',
    '............aaca..............',
    '.............aea..............',
    '.............a.a..............',
    '.............a.e..............',
  ],
  colors: {
    a: '#070819',
    b: '#363844',
    c: '#1f1f2b',
    d: '#56586b',
    e: '#141320',
    f: '#27262e',
  },
};

/** His head above the eyes (his hair and what it frames): our skull is trimmed to it. */
export const BASE_HAIR_SKULL: PaintedPart = {
  pivot: [16, 16],
  rows: [
    '.....aaaa..a..................',
    '.......aaa..a.................',
    '....aaaaaaa.aaaaaaaaaa........',
    '...aaaaaaaaaaaaaaaaaaaaa......',
    'aaaaaaaaaaaaaaaaaaaaaaaaaa....',
    '.aaaaaaaaaaaaaaaaaaaaaaaaaa...',
    '..aaaaaaaaaaaaaaaaaaaaaaaaaa..',
    '.aaaaaaaaaaaaaaaaaaaaaaaaaaaa.',
    '.aaaaaaaaaaaaaaaaaaaaaaaaaaaa.',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'a.aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '..aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '..a.aaaaaaaaaaaaaaaaaaaaaaaaa.',
    '..a..aaaaaaaaaaaaaaaaaaaaaaaa.',
    '.....aaaaaaaaaaaaaaaaaaaaaaa..',
    '....aaa.aaaa.aaa..........aa..',
    '.........aaaaaaa..........a...',
    '..........aaaaaa..............',
    '............aaaa..............',
    '.............aaa..............',
    '.............a.a..............',
    '.............a.a..............',
  ],
  colors: { a: '#000000' },
};

/** His line's characters (never recoloured) and his main grey (the hair colour slot moves it). */
export const BASE_HAIR_LINE = 'ae';
export const BASE_HAIR_BASE = '#363844';
