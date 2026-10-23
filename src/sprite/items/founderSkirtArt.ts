// The owner's studded war skirt over a red tunic, his pixels (tools/refs/solen-skirt-from-ref.py from
// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const FOUNDER_SKIRT_TUNIC = '#ab2e31';
export const FOUNDER_SKIRT_LEATHER = '#7e5537';
export const FOUNDER_SKIRT_STUD = '#f3c045';

/** What each of his colours is, as the script sorts them (tools/refs/solen_ref.py kind). */
export const FOUNDER_SKIRT_KIND: Record<string, 'line' | 'skin' | 'red' | 'gold' | 'leather' | 'steel' | 'stud' | 'white' | 'grey' | 'navy' | 'ice'> = {
  '#00020b': 'line',
  '#010310': 'line',
  '#010314': 'line',
  '#422a28': 'leather',
  '#462d29': 'leather',
  '#4c302a': 'leather',
  '#54372b': 'leather',
  '#59392c': 'leather',
  '#5e3e2b': 'leather',
  '#633f2c': 'leather',
  '#66432d': 'leather',
  '#681527': 'red',
  '#6d182a': 'red',
  '#704c32': 'leather',
  '#74182a': 'red',
  '#7a5335': 'leather',
  '#7d5736': 'leather',
  '#815636': 'leather',
  '#835a38': 'leather',
  '#875d39': 'leather',
  '#8b603b': 'leather',
  '#8c7d6a': 'stud',
  '#8f633a': 'leather',
  '#907e69': 'leather',
  '#93673d': 'leather',
  '#938370': 'stud',
  '#a62e2f': 'red',
  '#a9a392': 'stud',
  '#ac2b31': 'red',
  '#ac2f30': 'red',
  '#b02d32': 'red',
  '#ebb039': 'gold',
  '#f2bd43': 'gold',
  '#f4c452': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const FOUNDER_SKIRT_REST: Record<string, [number, number]> = {
  FOUNDER_SKIRT: [112, 170],
};

/** The belt, the studded leather strips and the red tunic under them: it rides the torso about the pelvis. */
export const FOUNDER_SKIRT: PaintedPiece = {
  pivot: [15, 6],
  angle: -89.65,
  rows: [
    '...abbaabbaa.................',
    '..acddaeddeabb........abb....',
    '..afchbiidbjakbabbaabbkkia...',
    '..bccaalidjaakkkammkbkkana...',
    '..bbbjaaaacaampkakmmaqkajja..',
    '..accmaccccaaimmbrsjakkmalb..',
    'abccbahddtaaiiimafjjbmnjbla..',
    'aacauvatddbawuvaacfhbjulbh...',
    'aaxiraadtfabirwbbfufaaliaa...',
    'aydibaddcbyaiiiabiznablnna...',
    'ayfuaftdcbyaulraaiwiabiuib.aa',
    'aciwaccccabiwibAaiiibaanlbfBa',
    'aCiiiabaaCbiiiaAbiulaCaiiaaDb',
    'aCiCnCAaCybiEnaAbiiiaybiFabaa',
    'aylwiyyybyalwiaybiiiaAbinbAa.',
    'aGGGGyHGibGabbyHaiFiaGAaaCAb.',
    '.aaayCGIilibIyCGbiliaJyAHJyb.',
    '....aCGyCCa.bCCGybabGGyabaaa.',
    '.....aIGGJa...bIGGJGGCa......',
    '......aaaaa....bHGGGGb.......',
    '................aaaba........',
  ],
  colors: {
    a: '#010314',
    b: '#010310',
    c: '#66432d',
    d: '#8f633a',
    e: '#93673d',
    f: '#633f2c',
    h: '#5e3e2b',
    i: '#815636',
    j: '#4c302a',
    k: '#422a28',
    l: '#7a5335',
    m: '#462d29',
    n: '#875d39',
    p: '#907e69',
    q: '#8c7d6a',
    r: '#59392c',
    s: '#938370',
    t: '#8b603b',
    u: '#a9a392',
    v: '#7d5736',
    w: '#835a38',
    x: '#00020b',
    y: '#6d182a',
    z: '#54372b',
    A: '#681527',
    B: '#f4c452',
    C: '#74182a',
    D: '#704c32',
    E: '#ebb039',
    F: '#f2bd43',
    G: '#ac2b31',
    H: '#ac2f30',
    I: '#a62e2f',
    J: '#b02d32',
  },
};
