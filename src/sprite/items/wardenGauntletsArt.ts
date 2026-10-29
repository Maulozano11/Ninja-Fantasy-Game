// The owner's armoured outfit: the bracers and gauntlets, his pixels at our scale (tools/refs/warden-gauntlets-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const WARDEN_GAUNTLETS_STEEL = '#323338';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const WARDEN_GAUNTLETS_KIND: Record<string, 'blue' | 'brown' | 'dark' | 'hair' | 'line' | 'skin' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#0e101d': 'hair',
  '#101e45': 'hair',
  '#132854': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#212227': 'dark',
  '#2c2b31': 'dark',
  '#2d2d2f': 'steel',
  '#305592': 'blue',
  '#322826': 'brown',
  '#323338': 'steel',
  '#324a6d': 'blue',
  '#3b3c40': 'steel',
  '#42517a': 'blue',
  '#45484f': 'steel',
  '#4f5259': 'steel',
  '#575c62': 'steel',
  '#63686e': 'steel',
  '#673338': 'brown',
  '#6a7179': 'steel',
  '#737c7f': 'steel',
  '#7d8286': 'steel',
  '#865748': 'skin',
  '#874c4a': 'skin',
  '#898c93': 'steel',
  '#904e48': 'skin',
  '#ac6857': 'skin',
  '#bb7961': 'skin',
  '#c38267': 'skin',
  '#d49070': 'skin',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const WARDEN_GAUNTLETS_REST: Record<string, [number, number]> = {
  WARDEN_GAUNTLETS_FORE_N: [102, 164],
  WARDEN_GAUNTLETS_FORE_F: [132, 165],
  WARDEN_GAUNTLETS_HAND_N: [99, 171],
  WARDEN_GAUNTLETS_HAND_F: [136, 173],
};

/** His near bracer, two plates over the forearm. It rides the forearm about the elbow. */
export const WARDEN_GAUNTLETS_FORE_N: PaintedPiece = {
  pivot: [4, 3],
  angle: 98.13,
  rows: [
    '.....a.....',
    '..aaabcaaaa',
    '..aadeacfca',
    '..acch.aaia',
    '..acfjhdaka',
    '..alhjhmaka',
    'aaaachhmaa.',
    'alfmmndaaa.',
    'a...fppaaa.',
    '...aajpa.a.',
    '.......a...',
  ],
  colors: {
    a: '#000116',
    b: '#00011f',
    c: '#323338',
    d: '#737c7f',
    e: '#7d8286',
    f: '#3b3c40',
    h: '#45484f',
    i: '#212227',
    j: '#63686e',
    k: '#322826',
    l: '#2c2b31',
    m: '#6a7179',
    n: '#898c93',
    p: '#4f5259',
  },
};

/** His far bracer. It rides the forearm about the elbow. */
export const WARDEN_GAUNTLETS_FORE_F: PaintedPiece = {
  pivot: [8, 1],
  angle: 78.11,
  rows: [
    '..aa.a.aaa..',
    '.aabbcaada..',
    '.aaaaaaeda..',
    'afaafaaehha.',
    'ifaaaccadaa.',
    'afaajjkaada.',
    'aaaaaaafaea.',
    'aaacaaffaha.',
    'ae.aaafaaaha',
    '.....a...a.a',
  ],
  colors: {
    a: '#000116',
    b: '#2c2b31',
    c: '#323338',
    d: '#45484f',
    e: '#575c62',
    f: '#322826',
    h: '#3b3c40',
    i: '#00011f',
    j: '#181822',
    k: '#2d2d2f',
  },
};

/** His near gauntlet, the fist round the sword's grip, his fingers bare under it. It rides the hand about the wrist. */
export const WARDEN_GAUNTLETS_HAND_N: PaintedPiece = {
  pivot: [6, 6],
  angle: 98.13,
  rows: [
    '...a.........',
    '.bcadee...aaa',
    'afhiaaaa..aja',
    'aikljmmnmmaaa',
    '.aaamppqqmama',
    '...ampeqqpama',
    '...appqrramaa',
    '....aaaaama..',
    '.....ammjja..',
    '......astua..',
    '.......aata..',
    '.........a...',
  ],
  colors: {
    a: '#000116',
    b: '#305592',
    c: '#132854',
    d: '#181822',
    e: '#3b3c40',
    f: '#101e45',
    h: '#42517a',
    i: '#141a2a',
    j: '#2c2b31',
    k: '#324a6d',
    l: '#0e101d',
    m: '#323338',
    n: '#4f5259',
    p: '#45484f',
    q: '#575c62',
    r: '#63686e',
    s: '#bb7961',
    t: '#874c4a',
    u: '#d49070',
  },
};

/** His far gauntlet, a fist, his fingers bare. It rides the hand about the wrist. */
export const WARDEN_GAUNTLETS_HAND_F: PaintedPiece = {
  pivot: [6, 3],
  angle: 78.11,
  rows: [
    '.a.aaa.a.',
    'aabcdaea.',
    'aabfechha',
    'aiajkbala',
    'faajmbna.',
    'f.apqraa.',
    'eaaaaa...',
    'ea.......',
    '.a.......',
  ],
  colors: {
    a: '#000116',
    b: '#181822',
    c: '#141a2a',
    d: '#212227',
    e: '#323338',
    f: '#2c2b31',
    h: '#3b3c40',
    i: '#00011f',
    j: '#d49070',
    k: '#865748',
    l: '#45484f',
    m: '#bb7961',
    n: '#673338',
    p: '#ac6857',
    q: '#904e48',
    r: '#c38267',
  },
};
