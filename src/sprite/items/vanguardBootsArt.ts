// The owner's tactical outfit: the armoured boots, his pixels at our scale (tools/refs/vanguard-boots-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const VANGUARD_BOOTS_CLOTH = '#2c2b31';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const VANGUARD_BOOTS_KIND: Record<string, 'brown' | 'dark' | 'hair' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#0e101d': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#212227': 'dark',
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
  '#575c62': 'steel',
  '#63686e': 'steel',
  '#6a7179': 'steel',
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
    '..a..aaaaaa',
    'aabcdeeeffa',
    '.aaachhbea.',
    '.aieeeejea.',
    'aaikllmka..',
    'acaknldfa..',
    'acannddaa..',
    'aacefhaca..',
    'akaaaaaa...',
    'aadlpdda...',
    '......aa...',
  ],
  colors: {
    a: '#000116',
    b: '#38302f',
    c: '#413833',
    d: '#323338',
    e: '#212227',
    f: '#181822',
    h: '#493d3e',
    i: '#141a2a',
    j: '#0e101d',
    k: '#2c2b31',
    l: '#4f5259',
    m: '#3b3c40',
    n: '#45484f',
    p: '#575c62',
  },
};

/** His far boot's armoured shaft. It rides the shin about the ankle. */
export const VANGUARD_BOOTS_BOOT_F: PaintedPiece = {
  pivot: [8, 9],
  angle: 94.40,
  rows: [
    '.a.........',
    'aabbbcbbba.',
    'adaaaaaaaa.',
    'adddaeedfa.',
    '.aaaaddhia.',
    '.ajkaccfha.',
    '.aaaaccfha.',
    '.addaddfha.',
    '..aaaddfea.',
    '..ajlaiema.',
    '..aaaacana.',
    '.aadidapiaa',
    '...a..a.a..',
  ],
  colors: {
    a: '#000116',
    b: '#141a2a',
    c: '#2c2b31',
    d: '#212227',
    e: '#4f5259',
    f: '#575c62',
    h: '#45484f',
    i: '#323338',
    j: '#322826',
    k: '#413833',
    l: '#493d3e',
    m: '#3b3c40',
    n: '#6a7179',
    p: '#4e4d50',
  },
};

/** His near boot's foot. It stands on the ankle, flat on the ground. */
export const VANGUARD_BOOTS_FOOT_N: PaintedPiece = {
  pivot: [5, -1],
  angle: 98.13,
  rows: [
    '.aa......',
    '.abbcdeaa',
    'afaaaaaha',
    'afaiiijha',
    'aijbbbkja',
    'aiklmmbka',
    'aiilllkia',
    'ajjjjjjia',
    '.aaaaaaa.',
  ],
  colors: {
    a: '#000116',
    b: '#323338',
    c: '#6a7179',
    d: '#4f5259',
    e: '#45484f',
    f: '#322826',
    h: '#413833',
    i: '#181822',
    j: '#212227',
    k: '#2c2b31',
    l: '#3b3c40',
    m: '#63686e',
  },
};

/** His far boot's foot. It stands on the ankle, flat on the ground. */
export const VANGUARD_BOOTS_FOOT_F: PaintedPiece = {
  pivot: [7, -2],
  angle: 94.40,
  rows: [
    'aa...a..aa......',
    'ababcacacaa.....',
    'abbcacacacaaaa..',
    'addacacacabceea.',
    'adaaabcdddccccba',
    'aaaaaabbdddddbfa',
    '......aaaaaaaaaa',
  ],
  colors: {
    a: '#000116',
    b: '#181822',
    c: '#323338',
    d: '#2c2b31',
    e: '#63686e',
    f: '#141a2a',
  },
};
