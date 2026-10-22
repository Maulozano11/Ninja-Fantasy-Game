// The owner's cowl with its gold studs and the white stud on the far shoulder, his pixels (tools/refs/
// solen-cowl-from-ref.py from docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const FOUNDER_COWL = '#3a353c';
export const FOUNDER_COWL_GOLD = '#ebb646';
export const FOUNDER_COWL_STUD = '#d1d2ce';

/** What each of his colours is, as the script sorts them (tools/refs/solen_ref.py kind). */
export const FOUNDER_COWL_KIND: Record<string, 'line' | 'skin' | 'red' | 'gold' | 'leather' | 'steel' | 'stud' | 'white' | 'grey' | 'navy' | 'ice'> = {
  '#00010d': 'line',
  '#00010f': 'line',
  '#000213': 'line',
  '#01010b': 'line',
  '#01020e': 'line',
  '#010211': 'line',
  '#010212': 'line',
  '#010216': 'line',
  '#010316': 'line',
  '#010317': 'line',
  '#060410': 'line',
  '#0a0712': 'line',
  '#19161e': 'line',
  '#1c1920': 'grey',
  '#1d1920': 'grey',
  '#231e25': 'grey',
  '#252025': 'grey',
  '#27232a': 'grey',
  '#28242a': 'grey',
  '#2c262c': 'grey',
  '#2c272e': 'grey',
  '#2e2930': 'grey',
  '#332e35': 'grey',
  '#343138': 'grey',
  '#363339': 'grey',
  '#38363b': 'grey',
  '#3b383f': 'grey',
  '#3c383f': 'grey',
  '#3d3a41': 'grey',
  '#54545e': 'grey',
  '#56535f': 'grey',
  '#57585e': 'grey',
  '#585860': 'grey',
  '#5a5962': 'grey',
  '#8fa1af': 'steel',
  '#96a4b1': 'steel',
  '#9d9081': 'stud',
  '#bf7e20': 'gold',
  '#c57f1d': 'gold',
  '#c8c8c2': 'stud',
  '#cc8825': 'gold',
  '#d1d2cd': 'white',
  '#d5d6d1': 'white',
  '#ebb646': 'gold',
  '#eeeeed': 'white',
  '#fcda80': 'gold',
  '#fde497': 'gold',
  '#ffffff': 'white',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const FOUNDER_COWL_REST: Record<string, [number, number]> = {
  FOUNDER_COWL_NECK: [121, 145],
  FOUNDER_COWL_NEAR: [107, 144],
  FOUNDER_COWL_STUD_F: [134, 151],
};

/** The cowl wound round the neck and over the far shoulder, its gold stud: it rides the torso about the neck. */
export const FOUNDER_COWL_NECK: PaintedPiece = {
  pivot: [6, 2],
  angle: -89.65,
  rows: [
    '...........a.....',
    '..........bca....',
    'ab.......ddebd...',
    'fehddbdbhacedid..',
    'cjjfeccccejcbkld.',
    'dadclejfeeccamcnd',
    'dikbacccccphqr.dd',
    'cebkkddddhdkjab..',
    'lljddbdqsqeecd...',
    'bcclleeeffltba...',
    '.ab........d.....',
  ],
  colors: {
    a: '#01010b',
    b: '#010317',
    c: '#363339',
    d: '#00010f',
    e: '#5a5962',
    f: '#57585e',
    h: '#000213',
    i: '#27232a',
    j: '#54545e',
    k: '#2c272e',
    l: '#3c383f',
    m: '#fcda80',
    n: '#252025',
    p: '#1c1920',
    q: '#060410',
    r: '#bf7e20',
    s: '#0a0712',
    t: '#332e35',
  },
};

/** The cowl over the near shoulder with its gold stud, in front of the sleeve: it rides the near shoulder. */
export const FOUNDER_COWL_NEAR: PaintedPiece = {
  pivot: [7, 8],
  angle: -89.65,
  rows: [
    '.........aba..',
    '........bcdcba',
    '......aaaeedfa',
    '....aaffhaifjd',
    '...aiekfddlbfd',
    '..afddjfamffaa',
    '.afjjkkiiaaanp',
    '.afkffddddfaqr',
    'aikfddfhhsmhaa',
    'afjfmkaatabaaa',
    '...ata........',
  ],
  colors: {
    a: '#010211',
    b: '#010216',
    c: '#2e2930',
    d: '#56535f',
    e: '#2c262c',
    f: '#38363b',
    h: '#343138',
    i: '#28242a',
    j: '#585860',
    k: '#231e25',
    l: '#3b383f',
    m: '#1d1920',
    n: '#cc8825',
    p: '#fde497',
    q: '#ebb646',
    r: '#c57f1d',
    s: '#19161e',
    t: '#00010d',
  },
};

/** The white stud on the far shoulder: it rides the far shoulder. */
export const FOUNDER_COWL_STUD_F: PaintedPiece = {
  pivot: [0, 0],
  angle: -89.65,
  rows: [
    '.abb..',
    'cdefb.',
    'bheic.',
    'chjijb',
    '.bjkib',
    'lchkjc',
    'mcdhhb',
    'mbbcdd',
    '.b....',
  ],
  colors: {
    a: '#3d3a41',
    b: '#010212',
    c: '#01020e',
    d: '#010316',
    e: '#eeeeed',
    f: '#c8c8c2',
    h: '#9d9081',
    i: '#ffffff',
    j: '#d1d2cd',
    k: '#d5d6d1',
    l: '#96a4b1',
    m: '#8fa1af',
  },
};
