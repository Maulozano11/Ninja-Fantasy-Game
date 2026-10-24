// The owner's leather rogue: the lace-up boots, his pixels at our scale (tools/refs/drifter-boots-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const DRIFTER_BOOTS_LEATHER = '#322826';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const DRIFTER_BOOTS_KIND: Record<string, 'brown' | 'dark' | 'hair' | 'line'> = {
  '#000116': 'line',
  '#0e101d': 'hair',
  '#181822': 'dark',
  '#212227': 'dark',
  '#282421': 'brown',
  '#2a2524': 'dark',
  '#2c2b31': 'dark',
  '#322826': 'brown',
  '#38302f': 'brown',
  '#413833': 'brown',
  '#493d3e': 'brown',
  '#51473e': 'brown',
  '#544a48': 'brown',
  '#5a534a': 'brown',
  '#635b54': 'brown',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const DRIFTER_BOOTS_REST: Record<string, [number, number]> = {
  DRIFTER_BOOTS_BOOT_N: [108, 202],
  DRIFTER_BOOTS_BOOT_F: [130, 202],
  DRIFTER_BOOTS_FOOT_N: [108, 211],
  DRIFTER_BOOTS_FOOT_F: [131, 208],
};

/** His near boot's laced shaft. It rides the shin about the ankle. */
export const DRIFTER_BOOTS_BOOT_N: PaintedPiece = {
  pivot: [4, 6],
  angle: 100.12,
  rows: [
    '..a.....aaa',
    '..abaaaaaca',
    '..adeaeaeaa',
    '..afaaaeca.',
    '..ahabaaha.',
    '..ahaabba..',
    '..acaeaca..',
    '.aiijaca...',
    'aaiaccea...',
    'aacaaaea...',
    '...a.a.a...',
  ],
  colors: {
    a: '#000116',
    b: '#181822',
    c: '#322826',
    d: '#282421',
    e: '#413833',
    f: '#212227',
    h: '#2a2524',
    i: '#2c2b31',
    j: '#493d3e',
  },
};

/** His far boot's laced shaft. It rides the shin about the ankle. */
export const DRIFTER_BOOTS_BOOT_F: PaintedPiece = {
  pivot: [7, 5],
  angle: 90.00,
  rows: [
    '......a..',
    'aabccdaaa',
    '.abccddaa',
    '.abcccaaa',
    '.abdcccaa',
    '.abddeaca',
    '.abbddaaa',
    '.aa......',
  ],
  colors: {
    a: '#000116',
    b: '#212227',
    c: '#322826',
    d: '#413833',
    e: '#51473e',
  },
};

/** His near boot's foot. It stands on the ankle, flat on the ground. */
export const DRIFTER_BOOTS_FOOT_N: PaintedPiece = {
  pivot: [4, -3],
  angle: 100.12,
  rows: [
    'aa.a.a.a',
    'abcaaada',
    'abbbeaba',
    'aacccbea',
    'acfhdcia',
    'aeccceea',
    'ajeeejja',
    'ajjjjja.',
    '.aaaaaa.',
  ],
  colors: {
    a: '#000116',
    b: '#322826',
    c: '#413833',
    d: '#51473e',
    e: '#212227',
    f: '#5a534a',
    h: '#544a48',
    i: '#2a2524',
    j: '#181822',
  },
};

/** His far boot's foot. It stands on the ankle, flat on the ground. */
export const DRIFTER_BOOTS_FOOT_F: PaintedPiece = {
  pivot: [6, -1],
  angle: 90.00,
  rows: [
    '.....aaa.......',
    'aabcddaea......',
    'ababcccaaa.....',
    'ababbcccaaa....',
    'abbbbfaaddhaaa.',
    'aaaaaabiichhhja',
    'aaaaababffkffaa',
    '.....aaaaaaaaaa',
  ],
  colors: {
    a: '#000116',
    b: '#212227',
    c: '#413833',
    d: '#322826',
    e: '#635b54',
    f: '#181822',
    h: '#51473e',
    i: '#2a2524',
    j: '#38302f',
    k: '#0e101d',
  },
};
