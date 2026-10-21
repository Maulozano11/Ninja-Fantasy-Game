// The owner's leather tassets, his pixels (tools/refs/akira-tassets-from-ref.py from
// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const TASSET_LEATHER = '#482b21';
export const TASSET_LACE = '#321a17';

/** What each of his colours is, as the script sorts them. */
export const TASSET_KIND: Record<string, 'lace' | 'leather' | 'line' | 'rivet'> = {
  '#00020e': 'line',
  '#010312': 'line',
  '#010316': 'line',
  '#080814': 'line',
  '#0c0915': 'line',
  '#161014': 'line',
  '#1b1014': 'line',
  '#1d181f': 'line',
  '#211615': 'line',
  '#212432': 'rivet',
  '#231819': 'line',
  '#262733': 'rivet',
  '#2b1819': 'lace',
  '#301a1a': 'lace',
  '#351c1c': 'leather',
  '#362927': 'leather',
  '#382e2c': 'leather',
  '#391d1b': 'leather',
  '#3a322c': 'leather',
  '#3d241f': 'leather',
  '#3e332f': 'leather',
  '#402822': 'leather',
  '#462a23': 'leather',
  '#4a2c24': 'leather',
  '#573d30': 'leather',
  '#5b3f31': 'leather',
  '#795845': 'leather',
  '#7d5c47': 'leather',
  '#835f49': 'leather',
};

/** Where each piece lands in Akira's idle frame 0 (male), where he drew it: the fine pixel of its first row's first cell. */
export const TASSET_REST: Record<string, [number, number]> = {
  TASSET_FRONT: [114, 171],
};

/** The near plates, the dark strips between the legs and the far plates: they ride the torso about the pelvis. */
export const TASSET_FRONT: PaintedPiece = {
  pivot: [13, 5],
  angle: -89.65,
  rows: [
    '.aaaaaabbcbadaddddacb.....',
    '.acccbccebcadafffhace.....',
    '.ibceeeeeecadafjjkdal.....',
    '.lmbbbmaaaainfanfkaaaa....',
    '.aaaaaabbcbadaddddacb.a...',
    '.acccbccebcadafffhacebpa..',
    'iibceeeeeecadafjjkdalmqa..',
    'almbbbmbbmrinfanfkdastua..',
    'aaaattssssaadfafkkdaevea..',
    'avvvavvvvewdddiarxdaevey..',
    'azvvizvveeandaadnfdaeee.a.',
    'aeeeaeeeeeadadddrnddamlma.',
    'abmabbmbbAadadddnnBdassea.',
    'asCatsCCsearaddfffndaDvei.',
    'aaaaaazveadiiaddffndaeveEw',
    '.....aa..a...idndnddaDeeEi',
    '.............adddfdfaEEAqa',
    '.............aaaaaafalhaaa',
    '.....................aa...',
  ],
  colors: {
    a: '#010312',
    b: '#351c1c',
    c: '#391d1b',
    d: '#231819',
    e: '#462a23',
    f: '#3e332f',
    h: '#161014',
    i: '#00020e',
    j: '#1d181f',
    k: '#080814',
    l: '#301a1a',
    m: '#212432',
    n: '#382e2c',
    p: '#1b1014',
    q: '#2b1819',
    r: '#211615',
    s: '#7d5c47',
    t: '#835f49',
    u: '#4a2c24',
    v: '#5b3f31',
    w: '#010316',
    x: '#362927',
    y: '#0c0915',
    z: '#573d30',
    A: '#262733',
    B: '#3a322c',
    C: '#795845',
    D: '#402822',
    E: '#3d241f',
  },
};
