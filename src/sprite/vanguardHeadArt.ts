// The owner's tactical figure's face, his pixels at our scale (tools/refs/vanguard-head-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from './painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const VANGUARD_SKIN = '#de9d77';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const VANGUARD_HEAD_KIND: Record<string, 'brown' | 'dark' | 'line' | 'skin'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#0a000e': 'line',
  '#110319': 'dark',
  '#2f1a2d': 'dark',
  '#4b2c3d': 'brown',
  '#552a36': 'brown',
  '#644e5a': 'brown',
  '#673338': 'brown',
  '#6d3642': 'brown',
  '#793f47': 'skin',
  '#874c4a': 'skin',
  '#ac6857': 'skin',
  '#b6705a': 'skin',
  '#ba7c6a': 'skin',
  '#bb7961': 'skin',
  '#bf7858': 'skin',
  '#c38267': 'skin',
  '#d29f82': 'skin',
  '#d49070': 'skin',
  '#de9d77': 'skin',
  '#e7b386': 'skin',
  '#e8b992': 'skin',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const VANGUARD_HEAD_REST: Record<string, [number, number]> = {
  VANGUARD_HEAD: [118, 125],
};

/** The owner's tactical figure's face (the 'vanguard' face shape): his skin, nose, mouth and jaw; his forehead continued to a skull under his hair; the skin under his eyes. */
export const VANGUARD_HEAD: PaintedPiece = {
  pivot: [5, 14],
  angle: 0.00,
  rows: [
    '......aaaa.......',
    '....aabbbbba.....',
    '...abbbbbbbbba...',
    '..abbbbbbbbbbba..',
    '..abbbbbbbbbbba..',
    '.abbbbbbbbbbbbba.',
    '.abbbbbbbbbbbbba.',
    '.abbbbbbbbbbbbba.',
    '.abbbbbbbbbbbbba.',
    'abbbbbbbbbbbbbbba',
    '.abbbbbbbbbbbbba.',
    '.abbbbbbbbbbbbba.',
    '.abbbbbacbbbbaba.',
    '.abbbbbaadababaa.',
    '.e....abaaa..a...',
    '.c....ffhff.ij...',
    '.k....ffhlfaija..',
    '.m...nefhffpqjr..',
    '.ma..bffhffsijt..',
    '.ua.abfffffsbvr..',
    '.a..awfffffvbba..',
    '.....nbffwcvvca..',
    '.....axwfffbka...',
    '......aywffc.....',
  ],
  colors: {
    a: '#000116',
    b: '#b6705a',
    c: '#6d3642',
    d: '#bf7858',
    e: '#c38267',
    f: '#de9d77',
    h: '#d29f82',
    i: '#793f47',
    j: '#ba7c6a',
    k: '#874c4a',
    l: '#673338',
    m: '#d49070',
    n: '#00011f',
    p: '#e8b992',
    q: '#644e5a',
    r: '#0a000e',
    s: '#e7b386',
    t: '#110319',
    u: '#4b2c3d',
    v: '#bb7961',
    w: '#ac6857',
    x: '#552a36',
    y: '#2f1a2d',
  },
};

/** Where his eyes start from the face anchor's column: the near eye, the far eye. */
export const VANGUARD_EYE_COLS: [number, number] = [1, 7];
