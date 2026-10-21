// The owner's belt with its H buckle and pouches, his pixels (tools/refs/trunks-belt-from-ref.py from
// docs/reference/trunks2-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const BELT_LEATHER = '#412f22';
export const BELT_BUCKLE = '#d9c290';

/** Which colour slot recolours each of his colours ('line': his black line and what else stays as he drew it). */
export const BELT_SLOT: Record<string, 'buckle' | 'line' | 'main'> = {
  '#000000': 'line',
  '#040404': 'line',
  '#2e1616': 'main',
  '#321b19': 'main',
  '#361f1a': 'main',
  '#3e241e': 'main',
  '#412f22': 'main',
  '#421f1e': 'main',
  '#42261f': 'main',
  '#462a20': 'main',
  '#523629': 'main',
  '#563a2b': 'main',
  '#583628': 'main',
  '#5b3c2b': 'main',
  '#5c3828': 'main',
  '#6c4a35': 'main',
  '#76563b': 'main',
  '#7c5a3e': 'main',
  '#815e41': 'main',
  '#896543': 'main',
  '#9d6f48': 'buckle',
  '#9fb1c0': 'main',
  '#a4764d': 'buckle',
  '#ab7c53': 'buckle',
  '#b18257': 'buckle',
  '#d6c5af': 'buckle',
  '#d8be88': 'buckle',
  '#d9c290': 'buckle',
  '#e5d6bc': 'buckle',
  '#ede5d4': 'buckle',
  '#fcf8ec': 'buckle',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const BELT_REST: Record<string, [number, number]> = {
  BELT: [115, 168],
};

/** The belt, its H buckle, the near pouch and the far strap: it rides the pelvis. */
export const BELT: PaintedPiece = {
  pivot: [12, 8],
  angle: -89.65,
  rows: [
    'abcaaaaaa.....aaaaaaad...',
    'aceeeecfaaaaaahiaajklm...',
    'acccbeadadjcndpilljqlc...',
    'arrbceadadscndptuvkwdcla.',
    'dadxeaydadcjndpzlAbqldaaa',
    'BdaaadCdaaaaaapiaajqaadda',
    'BbddddCda....aaaaaaaaDcda',
    'yccbcdrd............aDedd',
    'faablcyd............aDEdl',
    'a.Fafrda.............axrb',
    '...adlda.............acdd',
    '...aaaa..............aaaG',
  ],
  colors: {
    a: '#000000',
    b: '#523629',
    c: '#563a2b',
    d: '#361f1a',
    e: '#815e41',
    f: '#3e241e',
    h: '#fcf8ec',
    i: '#a4764d',
    j: '#5c3828',
    k: '#e5d6bc',
    l: '#321b19',
    m: '#6c4a35',
    n: '#421f1e',
    p: '#d6c5af',
    q: '#b18257',
    r: '#7c5a3e',
    s: '#583628',
    t: '#d9c290',
    u: '#d8be88',
    v: '#ede5d4',
    w: '#ab7c53',
    x: '#5b3c2b',
    y: '#462a20',
    z: '#9d6f48',
    A: '#2e1616',
    B: '#42261f',
    C: '#76563b',
    D: '#412f22',
    E: '#896543',
    F: '#9fb1c0',
    G: '#040404',
  },
};
