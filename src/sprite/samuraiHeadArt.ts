// The owner's samurai face, his pixels at our scale (tools/refs/samurai-head-from-ref.py from
// docs/reference/samurai-owner-reference.jpg, shrunk and cleaned by tools/refs/samurai_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from './painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const SAMURAI_SKIN = '#cd885e';

/** What each of his colours is, as the script sorts them (tools/refs/samurai_ref.py kind). */
export const SAMURAI_HEAD_KIND: Record<string, 'dark' | 'line' | 'skin' | 'white'> = {
  '#000113': 'line',
  '#3b2c27': 'dark',
  '#4c2b1d': 'dark',
  '#4c2f27': 'dark',
  '#573522': 'dark',
  '#60322c': 'dark',
  '#69382c': 'dark',
  '#70482c': 'dark',
  '#7a4333': 'dark',
  '#844835': 'dark',
  '#8a513a': 'skin',
  '#8a5a35': 'skin',
  '#98553a': 'skin',
  '#9f5e3c': 'skin',
  '#a86341': 'skin',
  '#c38055': 'skin',
  '#cd885e': 'skin',
  '#d0906c': 'skin',
  '#d19163': 'skin',
  '#d99a74': 'skin',
  '#dc9968': 'skin',
  '#ffffff': 'white',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const SAMURAI_HEAD_REST: Record<string, [number, number]> = {
  SAMURAI_HEAD: [119, 124],
};

/** The owner's samurai face (the 'samurai' face shape): his skin, nose, mouth and jaw; his forehead continued to a skull under his hair; the skin under his eyes. */
export const SAMURAI_HEAD: PaintedPiece = {
  pivot: [4, 13],
  angle: 0.00,
  rows: [
    '.......a..........',
    '....aaabaaa.......',
    '...abbbbbbba......',
    '..abbbbbbbbba.....',
    '.abbbbbbbbbbba....',
    'abbbbbbbbbbbbba...',
    'abbbbbbbbbbbbba...',
    'abbbbbbbbbbbbba...',
    'abbbbbbbbbbbbba...',
    'abbbbbbbbbbbbbaa..',
    'abbbbbbbbbcbbbdea.',
    'abbbbbbfbbcbbhija.',
    'abbabaaabbaabkaaa.',
    '..alcbicciccbdmcna',
    '..alcciihilfcclhha',
    '..adkccccicccpmcca',
    '..babccccccccqmcca',
    '..bbdrcccccdcqmcla',
    '..bkkdkcccchfskka.',
    '..tkkkkccccccccda.',
    '..adkkkcchuvuuca..',
    '..tadkkjbwccccxa..',
  ],
  colors: {
    a: '#000113',
    b: '#98553a',
    c: '#cd885e',
    d: '#844835',
    e: '#8a5a35',
    f: '#69382c',
    h: '#9f5e3c',
    i: '#a86341',
    j: '#d0906c',
    k: '#c38055',
    l: '#7a4333',
    m: '#3b2c27',
    n: '#ffffff',
    p: '#dc9968',
    q: '#d99a74',
    r: '#8a513a',
    s: '#4c2f27',
    t: '#60322c',
    u: '#573522',
    v: '#4c2b1d',
    w: '#d19163',
    x: '#70482c',
  },
};

/** How much higher than ours he drew the head, on his longer neck (fine pixels): on the male bodies the game raises the head that far under his face. */
export const SAMURAI_HEAD_UP = 2;

/** Where his eyes start from the face anchor's column: the near eye, the far eye. */
export const SAMURAI_EYE_COLS: [number, number] = [3, 9];
