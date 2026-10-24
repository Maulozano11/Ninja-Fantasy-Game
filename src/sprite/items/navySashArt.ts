// The owner's sash on his dark-coated officer, the owner's pixels at our scale (tools/refs/navy-sash-from-ref.py from
// docs/reference/navy-officer-dark-coat-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NAVY_SASH_CLOTH = '#3c0f2e';
export const NAVY_SASH_GOLD = '#c69248';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const NAVY_SASH_KIND: Record<string, 'cloth' | 'gold' | 'line' | 'skin'> = {
  '#000116': 'line',
  '#080e1e': 'cloth',
  '#10121f': 'cloth',
  '#1c1020': 'cloth',
  '#1d1b26': 'cloth',
  '#1d1e23': 'cloth',
  '#2a2a32': 'cloth',
  '#2f1321': 'cloth',
  '#370e1c': 'cloth',
  '#3c0f2e': 'cloth',
  '#414246': 'cloth',
  '#5a1c3c': 'cloth',
  '#5d4132': 'skin',
  '#614b36': 'skin',
  '#621c3e': 'cloth',
  '#671b2e': 'cloth',
  '#6a4630': 'skin',
  '#744d2f': 'skin',
  '#762234': 'cloth',
  '#775630': 'skin',
  '#785a42': 'skin',
  '#7b583a': 'skin',
  '#7c522f': 'gold',
  '#825b34': 'gold',
  '#8a5f36': 'gold',
  '#92683d': 'gold',
  '#97703b': 'gold',
  '#9f7440': 'gold',
  '#b68a46': 'gold',
  '#be8446': 'gold',
  '#c69248': 'gold',
  '#cea14e': 'gold',
  '#d39e46': 'gold',
  '#deaa56': 'gold',
  '#e8ba5c': 'gold',
  '#f2c05a': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NAVY_SASH_REST: Record<string, [number, number]> = {
  NAVY_SASH: [121, 164],
};

/** The sash, its hanging end and the gold chain. Its pivot is the cell on the pelvis joint, at the torso's angle. */
export const NAVY_SASH: PaintedPiece = {
  pivot: [6, 12],
  angle: -89.65,
  rows: [
    '..aa.bccccccdc..',
    '.eaafdchiiccjc..',
    'eakelcmcccnmcc..',
    'kkkcpcccccccqkc.',
    'kkkkrssticuvcwc.',
    '.kkkrcxccicccyc.',
    'ckkzcqcsArBscCrc',
    'DckEcFcjcmcsccrc',
    'ckkzccccncccGcdc',
    'CkHccemcccnnGhcc',
    'kkIccc....mcJJcr',
    'kKcmc.....Lmchcq',
    '.IcL........Jhh.',
    '.c..........Jhh.',
    '...........cchh.',
    '...........mmch.',
    '...........mmJh.',
  ],
  colors: {
    a: '#1d1e23',
    b: '#7c522f',
    c: '#000116',
    d: '#744d2f',
    e: '#10121f',
    f: '#5d4132',
    h: '#3c0f2e',
    i: '#762234',
    j: '#92683d',
    k: '#2a2a32',
    l: '#6a4630',
    m: '#080e1e',
    n: '#414246',
    p: '#7b583a',
    q: '#8a5f36',
    r: '#c69248',
    s: '#2f1321',
    t: '#370e1c',
    u: '#671b2e',
    v: '#1c1020',
    w: '#be8446',
    x: '#785a42',
    y: '#b68a46',
    z: '#cea14e',
    A: '#9f7440',
    B: '#deaa56',
    C: '#825b34',
    D: '#f2c05a',
    E: '#775630',
    F: '#614b36',
    G: '#621c3e',
    H: '#e8ba5c',
    I: '#d39e46',
    J: '#5a1c3c',
    K: '#97703b',
    L: '#1d1b26',
  },
};
