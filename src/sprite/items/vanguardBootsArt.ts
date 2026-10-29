// The owner's tactical outfit: the armoured boots, his pixels at our scale (tools/refs/vanguard-boots-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const VANGUARD_BOOTS_CLOTH = '#323338';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const VANGUARD_BOOTS_KIND: Record<string, 'brown' | 'dark' | 'hair' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#0e101d': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#212227': 'dark',
  '#2a2524': 'dark',
  '#2c2b31': 'dark',
  '#322826': 'brown',
  '#323338': 'steel',
  '#38302f': 'brown',
  '#3b3c40': 'steel',
  '#413833': 'brown',
  '#45484f': 'steel',
  '#493d3e': 'brown',
  '#4e4d50': 'steel',
  '#4f5259': 'steel',
  '#51473e': 'brown',
  '#575c62': 'steel',
  '#63686e': 'steel',
  '#6a7179': 'steel',
  '#888888': 'steel',
  '#898c93': 'steel',
  '#90959b': 'steel',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const VANGUARD_BOOTS_REST: Record<string, [number, number]> = {
  VANGUARD_BOOTS_BOOT_N: [107, 201],
  VANGUARD_BOOTS_BOOT_F: [129, 198],
  VANGUARD_BOOTS_FOOT_N: [106, 210],
  VANGUARD_BOOTS_FOOT_F: [130, 209],
};

/** His near boot's armoured shaft. It rides the shin about the ankle. */
export const VANGUARD_BOOTS_BOOT_N: PaintedPiece = {
  pivot: [4, 8],
  angle: 98.13,
  rows: [
    '..aa.aaaaaa',
    'aabacdeefha',
    '.aaaijjbka.',
    '.alkkkkmka.',
    'aalnkpqna..',
    'aianrpcha..',
    'aiaastcaa..',
    'aaiijjaia..',
    'aaaaaaaa...',
    'aacptcaa...',
    'ar....a....',
    '.aa........',
  ],
  colors: {
    a: '#000116',
    b: '#38302f',
    c: '#323338',
    d: '#90959b',
    e: '#898c93',
    f: '#6a7179',
    h: '#181822',
    i: '#413833',
    j: '#493d3e',
    k: '#212227',
    l: '#141a2a',
    m: '#0e101d',
    n: '#2c2b31',
    p: '#4f5259',
    q: '#3b3c40',
    r: '#45484f',
    s: '#63686e',
    t: '#575c62',
  },
};

/** His far boot's armoured shaft. It rides the shin about the ankle. */
export const VANGUARD_BOOTS_BOOT_F: PaintedPiece = {
  pivot: [8, 9],
  angle: 94.40,
  rows: [
    '.a.........',
    'aabbb.bbba.',
    'aaaaaaaaaa.',
    'acccaddeea.',
    '.aaaafhija.',
    '.aklafmfia.',
    '.aaaafmfia.',
    '.annafifia.',
    '..aaaaffda.',
    '..akpahdda.',
    '..aaaaaaaa.',
    '.aaajnaqrha',
    '...a.a.a...',
  ],
  colors: {
    a: '#000116',
    b: '#141a2a',
    c: '#51473e',
    d: '#4f5259',
    e: '#90959b',
    f: '#575c62',
    h: '#63686e',
    i: '#45484f',
    j: '#323338',
    k: '#322826',
    l: '#413833',
    m: '#2c2b31',
    n: '#212227',
    p: '#493d3e',
    q: '#4e4d50',
    r: '#888888',
  },
};

/** His near boot's foot. It stands on the ankle, flat on the ground. */
export const VANGUARD_BOOTS_FOOT_N: PaintedPiece = {
  pivot: [5, -1],
  angle: 98.13,
  rows: [
    '..a....a.',
    '.a.bcbdaa',
    'aeaaaaafa',
    'aeahhhiaa',
    'aaibbbjia',
    'ahjkllbja',
    'ahhkkkjha',
    'aiiiiiiha',
    '.aaaaaaa.',
  ],
  colors: {
    a: '#000116',
    b: '#323338',
    c: '#6a7179',
    d: '#45484f',
    e: '#322826',
    f: '#413833',
    h: '#181822',
    i: '#212227',
    j: '#2c2b31',
    k: '#3b3c40',
    l: '#63686e',
  },
};

/** His far boot's foot. It stands on the ankle, flat on the ground. */
export const VANGUARD_BOOTS_FOOT_F: PaintedPiece = {
  pivot: [7, -2],
  angle: 94.40,
  rows: [
    'aaa..a...a......',
    'ababacadefa.....',
    'abbabaaafaaaaa..',
    'aahaaabhabbijja.',
    'ahaaabihhhiiiiba',
    'aaaaaabbhhhhhbka',
    '......aaaaaaaaaa',
  ],
  colors: {
    a: '#000116',
    b: '#181822',
    c: '#2a2524',
    d: '#3b3c40',
    e: '#898c93',
    f: '#4f5259',
    h: '#2c2b31',
    i: '#323338',
    j: '#63686e',
    k: '#141a2a',
  },
};
