// The owner's padded tactical vest, his pixels (tools/refs/tactical-vest-from-ref.py from
// docs/reference/tactical-coat-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const TACTICAL_VEST_GREEN = '#5b6347';
export const TACTICAL_VEST_TRIM = '#191820';

/** What each of his colours is, as the script sorts them (tools/refs/tactical_ref.py kind). */
export const TACTICAL_VEST_KIND: Record<string, 'dark' | 'green' | 'line'> = {
  '#000000': 'line',
  '#030305': 'line',
  '#0c0d0d': 'dark',
  '#0d0c14': 'dark',
  '#16151c': 'dark',
  '#181d1a': 'dark',
  '#1b1a20': 'dark',
  '#1b1a24': 'dark',
  '#1e241f': 'green',
  '#232821': 'green',
  '#242c21': 'green',
  '#27272e': 'dark',
  '#292f23': 'green',
  '#2b3324': 'green',
  '#2d2f36': 'dark',
  '#2f3339': 'dark',
  '#2f3628': 'green',
  '#313a29': 'green',
  '#353d2d': 'green',
  '#38412f': 'green',
  '#585d46': 'green',
  '#5a6346': 'green',
  '#5c614a': 'green',
  '#5f6549': 'green',
  '#818867': 'green',
  '#848b6b': 'green',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const TACTICAL_VEST_REST: Record<string, [number, number]> = {
  TACTICAL_VEST: [118, 155],
};

/** The padded vest from its top binding to its bottom bands: it rides the torso about the neck. */
export const TACTICAL_VEST: PaintedPiece = {
  pivot: [9, -8],
  angle: -89.65,
  rows: [
    'abccbbccaaaaaadcbed',
    'acbcfabcfcccfcddadh',
    'adbiiaaaaaaaaaaaidb',
    'ajkkkjkkkkklmmmnpab',
    'akjpkkjpkkkkplnnkeb',
    'aqpnjqpnjnnjnnklkla',
    'apklkpklkkklkkpmkla',
    'apqlkpqlkkknkkklkla',
    'akklqkklqrqlrrqknja',
    'ajjlkjjlkpplkkppkka',
    'aqrrqqrrqpplkpkrqka',
    'apkpkpkpkkkjpkkkpka',
    'alssslsssstsslmllla',
    'arrrrrrrrrpukqrqrpa',
    'akpvpkpvpvplppppppa',
    'apvvvpvvvvpkupkppka',
    'almmmlmmmmmslllmmla',
    'arqrrrqrrrrpukrqppa',
    'akkppkkppppplkppkka',
    'akppkkppkkkpjppvkka',
    'ampkkmpkkvkkuvkkkpa',
    'awuuuwuuuuwuuuuluxl',
    'aqrmrqrmrqrrtqrrqvl',
    'apysppyspvpktvvvpvl',
    'auulluulluuxxuulllz',
    'addddddddddddddddda',
    'aAAAAAAAAAAAAABddda',
    'ahhhhaaaaaaaaaaaaah',
  ],
  colors: {
    a: '#000000',
    b: '#1b1a20',
    c: '#2d2f36',
    d: '#16151c',
    e: '#030305',
    f: '#2f3339',
    h: '#0d0c14',
    i: '#0c0d0d',
    j: '#232821',
    k: '#5f6549',
    l: '#2f3628',
    m: '#313a29',
    n: '#1e241f',
    p: '#5c614a',
    q: '#848b6b',
    r: '#818867',
    s: '#353d2d',
    t: '#38412f',
    u: '#292f23',
    v: '#5a6346',
    w: '#242c21',
    x: '#2b3324',
    y: '#585d46',
    z: '#181d1a',
    A: '#27272e',
    B: '#1b1a24',
  },
};
