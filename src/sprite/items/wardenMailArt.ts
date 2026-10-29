// The owner's armoured outfit: the mail sleeves, his pixels at our scale (tools/refs/warden-mail-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const WARDEN_MAIL_MAIL = '#323338';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const WARDEN_MAIL_KIND: Record<string, 'dark' | 'hair' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#0e101d': 'hair',
  '#181822': 'dark',
  '#212227': 'dark',
  '#2c2b31': 'dark',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#45484f': 'steel',
  '#4f5259': 'steel',
  '#575c62': 'steel',
  '#63686e': 'steel',
  '#6a7179': 'steel',
  '#737c7f': 'steel',
  '#888888': 'steel',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const WARDEN_MAIL_REST: Record<string, [number, number]> = {
  WARDEN_MAIL_UPPER_N: [102, 148],
  WARDEN_MAIL_UPPER_F: [133, 150],
};

/** His near mail sleeve with the round elbow plate, below the shoulder plate. It rides the upper arm about the shoulder. */
export const WARDEN_MAIL_UPPER_N: PaintedPiece = {
  pivot: [6, 6],
  angle: 98.75,
  rows: [
    '.......aa......',
    '......bcdaa....',
    '.....dcdeefa...',
    '.....dcdeefa...',
    '.....dcdeefha..',
    '.....acdeafha..',
    '.....acdeifhaa.',
    '.....aaaaiffja.',
    '....aaffaaiifaa',
    '....abafbcaaaja',
    '....abfafafakaa',
    '...aafafafafaaa',
    '..aadjlafafaaj.',
    '..aeimafafafaj.',
    '.abcinaccaaa.j.',
    '.accfdaaafaa.a.',
    '.acceafffaa....',
    '..aaapfaaaf....',
    '..cceffffff....',
    '..ccef.ffff....',
    '..ccefffffa....',
    '..cedfffffa....',
    'cccedffffa.....',
    'bccedffffa.....',
    'aacedffaa......',
    '..aaaaa........',
  ],
  colors: {
    a: '#000116',
    b: '#45484f',
    c: '#3b3c40',
    d: '#6a7179',
    e: '#575c62',
    f: '#323338',
    h: '#181822',
    i: '#63686e',
    j: '#2c2b31',
    k: '#212227',
    l: '#4f5259',
    m: '#888888',
    n: '#737c7f',
    p: '#00011f',
  },
};

/** His far mail sleeve. It rides the upper arm about the shoulder. */
export const WARDEN_MAIL_UPPER_F: PaintedPiece = {
  pivot: [3, 3],
  angle: 71.57,
  rows: [
    '..aaa.....',
    '.abcca....',
    'accdcca...',
    'accbcca...',
    'accbcca...',
    '.accdca...',
    '.aaaac....',
    '.eacaa....',
    '.eaaba....',
    '.aacaa....',
    '.accada...',
    '.aaaaaa...',
    '.aacaaa...',
    '.acaaca...',
    '.aacccaa..',
    '.aacacaaa.',
    '...acaadc.',
    '....acccd.',
    '.....accda',
    '......aaa.',
  ],
  colors: {
    a: '#000116',
    b: '#212227',
    c: '#2c2b31',
    d: '#0e101d',
    e: '#323338',
  },
};
