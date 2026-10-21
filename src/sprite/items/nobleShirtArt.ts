// The owner's Scarlet's shirt and cravat, the reduced reference's pixels in the coat's opening and
// our body's shape under the coat in his whites (tools/refs/scarlet-upper-from-ref.py from
// docs/reference/scarlet-owner-reference.jpg): pieces laid on our male at idle frame 0, turned with
// their segment (pivot on its joint, angle the segment's there). Generated: rerun the script to
// change it.

import type { PaintedPiece } from '../painted';

/** His colours the slots retint: his shirt (Shirt), his cravat (Cravat) and his neck (the skin), each shade by its character. */
export const NOBLE_SHIRT = '#cfc9c8';
export const NOBLE_CRAVAT = '#7c1e2c';
export const NOBLE_NECK_SKIN = '#f8d4b8';
export const NOBLE_WHITE_CHARS = '7530YVRN';
export const NOBLE_RED_CHARS = 'cikrsulx';
export const NOBLE_SKIN_CHARS = 'zUXZMQq246';

/** The shirt with the cravat, and the neck's skin in its open collar (pivot: the neck). */
export const SHIRT_BODY: PaintedPiece = {
  pivot: [15, 2],
  angle: -89.65,
  rows: [
    '.......iilirl..........c.',
    '......akkllkcaaaaaaa..i..',
    '......akckcckkckkckkaa...',
    '....aa7ckkccuckkckkckka..',
    '.aaa777kkkkukkUzckuckkka.',
    'a577777kkkkkkuZXukckkkkka',
    '.a5777777777ckUkuuk00YYYa',
    '.a57777777777kurukc00YYYa',
    '.a57777777777ckuukc00YYYa',
    '.a5777777777777ikuk50YYYa',
    '.a57777777777775kuc30YYYa',
    '.a57777777777775ukc00YYYa',
    '..a5777777777773kuiY0YYYa',
    '..a5777777777753kuc0YVVVa',
    '..a5777777777770kucYYVVVa',
    '..a3555555555553ckuVYVVVa',
    '...a577777777770ikuYYVVVa',
    '...a355555555553kuk0YVVVa',
    '...a577777777770ckiVVVVa.',
    '....a57777777753Ykc0YYYa.',
    '....a577777777703iYVYYYa.',
    '....a57777777770330YYYYa.',
    '....a5777777775303YVYYYa.',
    '....a3555555557053YVYYYa.',
    '....a0333333333503YRYVVVa',
    '....a033333333V03YVNYVVVa',
    '....0033333333RVYVNRYVVVV',
  ],
  colors: {
    a: '#040405',
    c: '#26060d',
    i: '#3a0f1e',
    k: '#5d0e1a',
    l: '#4e172a',
    r: '#601f35',
    u: '#7c1e2c',
    z: '#6f442a',
    N: '#767276',
    R: '#86868a',
    U: '#be8867',
    V: '#9c9496',
    X: '#ca9c75',
    Y: '#aca7a6',
    Z: '#e2af8c',
    '0': '#beb9b8',
    '3': '#cfc9c8',
    '5': '#dcd6d4',
    '7': '#ebe6e4',
  },
};

/** The near upper arm's sleeve (pivot: the near shoulder). */
export const SHIRT_SLEEVE_UPPER_N: PaintedPiece = {
  pivot: [8, 5],
  angle: 107.93,
  rows: [
    '......aaaa....',
    '....aa0035aa..',
    '...a00333577a.',
    '..a003335577a.',
    '..a0033355777a',
    '..a0033355777a',
    '.a00033355777a',
    '..a0333555777a',
    '.a00035557777a',
    '.a0033355777a.',
    '.a003355777a..',
    '.a003355777a..',
    'a000335577a...',
    'a003335577a...',
    'a500357777a...',
    'a00035777a....',
    '.00355777a....',
    '.0335577a.....',
    '.333557.a.....',
    '.335577.......',
    '..3557........',
  ],
  colors: {
    a: '#040405',
    '0': '#beb9b8',
    '3': '#cfc9c8',
    '5': '#dcd6d4',
    '7': '#ebe6e4',
  },
};

/** The near forearm's sleeve (pivot: the near elbow). */
export const SHIRT_SLEEVE_FORE_N: PaintedPiece = {
  pivot: [6, 3],
  angle: 103.19,
  rows: [
    '....0035...',
    '...000357..',
    '.a0003557..',
    '.a00335577.',
    'a003335577.',
    'a003355777a',
    'a003355777a',
    'a003355777a',
    'a003355777a',
    'a00335577a.',
    'aY0355777a.',
    'a3YYYY77a..',
    'a33577YYa..',
    'a335777a...',
    '.aaaaa7a...',
    '......a....',
  ],
  colors: {
    a: '#040405',
    Y: '#aca7a6',
    '0': '#beb9b8',
    '3': '#cfc9c8',
    '5': '#dcd6d4',
    '7': '#ebe6e4',
  },
};

/** The far upper arm's sleeve (pivot: the far shoulder). */
export const SHIRT_SLEEVE_UPPER_F: PaintedPiece = {
  pivot: [6, 5],
  angle: 77.06,
  rows: [
    '....aaaa......',
    '...a3355aa....',
    '..aY003355a...',
    '.aYY0033555a..',
    '.aYY0033555a..',
    'aYY000335555a.',
    'aYY000333555a.',
    'aYYY00033555a.',
    '.aYY00033555a.',
    '.aYY00033555a.',
    '..aYY0033555a.',
    '..aYY0033555a.',
    '..aYY0003355a.',
    '...aYY003355a.',
    '...aYY0555555a',
    '...aYYY335553a',
    '...aYYY033555.',
    '....aYY033355.',
    '....aYY003335.',
    '....a.YY0333..',
    '.......Y0033..',
    '........00....',
  ],
  colors: {
    a: '#040405',
    Y: '#aca7a6',
    '0': '#beb9b8',
    '3': '#cfc9c8',
    '5': '#dcd6d4',
  },
};

/** The far forearm's sleeve (pivot: the far elbow). */
export const SHIRT_SLEEVE_FORE_F: PaintedPiece = {
  pivot: [4, 3],
  angle: 60.43,
  rows: [
    '..3355.......',
    '.Y03355.a....',
    '.Y0333555a...',
    '.Y0033355a...',
    'YYY0333555a..',
    'aYY0033355a..',
    'aYY00033555a.',
    'aYYY0033355a.',
    '.aYYY00335Va.',
    '..aYYY033VV7a',
    '...aYY0VV557a',
    '....aVV33035a',
    '.....a0aaaaa.',
    '......a......',
  ],
  colors: {
    a: '#040405',
    V: '#9c9496',
    Y: '#aca7a6',
    '0': '#beb9b8',
    '3': '#cfc9c8',
    '5': '#dcd6d4',
    '7': '#ebe6e4',
  },
};
