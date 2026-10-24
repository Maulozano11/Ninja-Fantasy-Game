// The owner's tactical outfit: the forearm wraps and fingerless gloves, his pixels at our scale (tools/refs/vanguard-wraps-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const VANGUARD_WRAPS_CLOTH = '#323338';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const VANGUARD_WRAPS_KIND: Record<string, 'brown' | 'dark' | 'hair' | 'line' | 'skin' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#0e101d': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#1f0f17': 'brown',
  '#212227': 'dark',
  '#272a32': 'hair',
  '#2c2b31': 'dark',
  '#2e131c': 'brown',
  '#322826': 'brown',
  '#323338': 'steel',
  '#38151b': 'brown',
  '#3b3c40': 'steel',
  '#413833': 'brown',
  '#45484f': 'steel',
  '#4f5259': 'steel',
  '#575c62': 'steel',
  '#63686e': 'steel',
  '#673338': 'brown',
  '#737c7f': 'steel',
  '#874c4a': 'skin',
  '#888888': 'steel',
  '#904e48': 'skin',
  '#9b584f': 'skin',
  '#ac6857': 'skin',
  '#b6705a': 'skin',
  '#bb7961': 'skin',
  '#bf7858': 'skin',
  '#c38267': 'skin',
  '#d49070': 'skin',
  '#de976e': 'skin',
  '#de9d77': 'skin',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const VANGUARD_WRAPS_REST: Record<string, [number, number]> = {
  VANGUARD_WRAPS_FORE_N: [104, 165],
  VANGUARD_WRAPS_FORE_F: [133, 165],
  VANGUARD_WRAPS_HAND_N: [105, 176],
  VANGUARD_WRAPS_HAND_F: [137, 174],
};

/** His near forearm, wrapped. It rides the forearm about the elbow. */
export const VANGUARD_WRAPS_FORE_N: PaintedPiece = {
  pivot: [4, 0],
  angle: 95.71,
  rows: [
    'a.........',
    'abbcdcefh.',
    'aijjjjkla.',
    'aiijmjnla.',
    'appjlnma..',
    '.amklmma..',
    '.amjjjma..',
    '.aaaaaaq..',
    '.akjlara..',
    'akllsara.a',
    '.aaaaaaaaa',
    '.aamtmmmia',
    '.........a',
  ],
  colors: {
    a: '#000116',
    b: '#ac6857',
    c: '#de9d77',
    d: '#de976e',
    e: '#bb7961',
    f: '#904e48',
    h: '#2e131c',
    i: '#141a2a',
    j: '#45484f',
    k: '#3b3c40',
    l: '#2c2b31',
    m: '#323338',
    n: '#4f5259',
    p: '#0e101d',
    q: '#00011f',
    r: '#413833',
    s: '#888888',
    t: '#575c62',
  },
};

/** His far forearm, wrapped. It rides the forearm about the elbow. */
export const VANGUARD_WRAPS_FORE_F: PaintedPiece = {
  pivot: [6, 0],
  angle: 72.47,
  rows: [
    '.a.....a...',
    '.abcdbea...',
    '.fehhija...',
    '.afjhkhha..',
    '.ajalkmha..',
    '.aiajmhaaa.',
    '.aiahaaaaka',
    '.aiaainnapa',
    '.aiaaqaaaaa',
    '.ra.aalhjia',
    'a.a.......a',
  ],
  colors: {
    a: '#000116',
    b: '#c38267',
    c: '#bb7961',
    d: '#bf7858',
    e: '#9b584f',
    f: '#00011f',
    h: '#2c2b31',
    i: '#212227',
    j: '#323338',
    k: '#45484f',
    l: '#141a2a',
    m: '#3b3c40',
    n: '#413833',
    p: '#63686e',
    q: '#322826',
    r: '#181822',
  },
};

/** His near fingerless glove, a fist. It rides the hand about the wrist. */
export const VANGUARD_WRAPS_HAND_N: PaintedPiece = {
  pivot: [2, -1],
  angle: 95.71,
  rows: [
    'aa......aaaa',
    'abcdeccfaah.',
    'acdehbcciaaa',
    'abjklkaamaaa',
    'abddnliapnla',
    '.aqhrsitulc.',
    '..aaaaanaaba',
    '.......aavv.',
    '........a..a',
  ],
  colors: {
    a: '#000116',
    b: '#3b3c40',
    c: '#323338',
    d: '#45484f',
    e: '#737c7f',
    f: '#272a32',
    h: '#141a2a',
    i: '#de9d77',
    j: '#63686e',
    k: '#888888',
    l: '#2c2b31',
    m: '#d49070',
    n: '#212227',
    p: '#874c4a',
    q: '#ac6857',
    r: '#b6705a',
    s: '#673338',
    t: '#bb7961',
    u: '#1f0f17',
    v: '#181822',
  },
};

/** His far fingerless glove, a fist. It rides the hand about the wrist. */
export const VANGUARD_WRAPS_HAND_F: PaintedPiece = {
  pivot: [5, 0],
  angle: 72.47,
  rows: [
    'aa....a',
    '.bcddea',
    '.adcaba',
    '.afhaia',
    '.jfikka',
    'ajjllaa',
    'a.aaa..',
    'aa.....',
    'aa.....',
  ],
  colors: {
    a: '#000116',
    b: '#141a2a',
    c: '#2c2b31',
    d: '#323338',
    e: '#212227',
    f: '#d49070',
    h: '#b6705a',
    i: '#874c4a',
    j: '#38151b',
    k: '#9b584f',
    l: '#ac6857',
  },
};
