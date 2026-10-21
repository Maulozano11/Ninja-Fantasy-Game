// The owner's wrapped open-toe shin boots on his Cazador 2, his pixels (tools/refs/cazador2-boots-from-ref.py
// from docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const BOOT_F_CLOTH = '#2a2935';
export const BOOT_F_SKIN = '#ebc0a0';

/** What each colour of his is, as the script sorts them; his black line is never tinted. */
export const BOOT_F_KIND: Record<string, 'line' | 'boot' | 'skin'> = {
  '#050611': 'line',
  '#060611': 'line',
  '#070713': 'line',
  '#080813': 'line',
  '#080815': 'line',
  '#080816': 'line',
  '#080818': 'line',
  '#090817': 'line',
  '#0f0e1c': 'boot',
  '#13111e': 'boot',
  '#141220': 'boot',
  '#22212e': 'boot',
  '#22222e': 'boot',
  '#252330': 'boot',
  '#262431': 'boot',
  '#272532': 'boot',
  '#282834': 'boot',
  '#292735': 'boot',
  '#2a2935': 'boot',
  '#373844': 'boot',
  '#393a45': 'boot',
  '#40404c': 'boot',
  '#40414e': 'boot',
  '#41424e': 'boot',
  '#444450': 'boot',
  '#454450': 'boot',
  '#844947': 'skin',
  '#96534d': 'skin',
  '#9a554f': 'skin',
  '#a15e54': 'skin',
  '#a55f56': 'skin',
  '#a66358': 'skin',
  '#ad6355': 'skin',
  '#b46a5e': 'skin',
  '#b86c5e': 'skin',
  '#ba7062': 'skin',
  '#ba7464': 'skin',
  '#c27a67': 'skin',
  '#e6ac8d': 'skin',
  '#eab292': 'skin',
  '#eec09e': 'skin',
  '#efc4a2': 'skin',
  '#efc4a4': 'skin',
  '#f1c8a9': 'skin',
};

/** Where each piece lands in our female idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const BOOT_F_REST: Record<string, [number, number]> = {
  BOOT_F_SHIN_N: [111, 196],
  BOOT_F_FOOT_N: [110, 216],
  BOOT_F_SHIN_F: [131, 196],
  BOOT_F_FOOT_F: [132, 213],
};

/** Her legs' joints at rest (fine pixels of our female idle frame 0): her pieces hang from them (painted.ts hisLeg). */
export const BOOT_F_LEGS = {
  N: { hip: [119.5, 177.0] as [number, number], knee: [120.0, 193.0] as [number, number], ankle: [114.5, 213.0] as [number, number] },
  F: { hip: [133.0, 175.0] as [number, number], knee: [135.0, 194.0] as [number, number], ankle: [135.5, 210.0] as [number, number] },
};

/** The near wrapped shaft: it turns with the shin about her ankle. */
export const BOOT_F_SHIN_N: PaintedPiece = {
  pivot: [3, 17],
  angle: 104.16,
  rows: [
    '....abbccccd',
    '...debbbeefa',
    '...aafbbbfa.',
    '..afhaaaaad.',
    '..aebbbbbia.',
    '..aaabbbbea.',
    '..abbaaaaa..',
    '..adbhbbed..',
    '..dbabbfd...',
    '..abbddfa...',
    '..aabbba....',
    '..abaaed....',
    '..aebhd.....',
    '..aaaaa.....',
    '.achbea.....',
    '.afaaaa.....',
    '.abbffa.....',
    'afbbbea.....',
    'debbbea.....',
    'abbbbba.....',
  ],
  colors: {
    a: '#080815',
    b: '#41424e',
    c: '#141220',
    d: '#060611',
    e: '#22222e',
    f: '#272532',
    h: '#454450',
    i: '#373844',
  },
};

/** The near foot, open toes: it stays flat on the ground. */
export const BOOT_F_FOOT_N: PaintedPiece = {
  pivot: [4, -3],
  angle: 104.16,
  rows: [
    'abcdeefa.',
    'hieddddba',
    'addidjedh',
    'hjklmjenh',
    '.haahaaa.',
  ],
  colors: {
    a: '#080816',
    b: '#2a2935',
    c: '#262431',
    d: '#eec09e',
    e: '#efc4a4',
    f: '#393a45',
    h: '#050611',
    i: '#c27a67',
    j: '#96534d',
    k: '#eab292',
    l: '#844947',
    m: '#e6ac8d',
    n: '#a15e54',
  },
};

/** The far wrapped shaft: it turns with the shin about her ankle. */
export const BOOT_F_SHIN_F: PaintedPiece = {
  pivot: [4, 14],
  angle: 98.82,
  rows: [
    'abcccdda...',
    'aaccbbca...',
    'acaaaaaa...',
    'ebbffhfa...',
    'aaachffa...',
    'acciidda...',
    'ecccffa....',
    '.aaaffa....',
    '.accaaa....',
    '.aaahha....',
    '..ajfaa....',
    '..aaafa....',
    '..abbfa....',
    '..aaaaca...',
    '..acccca...',
    '.aacchffe..',
    '.acdcfffhaa',
  ],
  colors: {
    a: '#080813',
    b: '#22212e',
    c: '#262431',
    d: '#13111e',
    e: '#080818',
    f: '#40404c',
    h: '#444450',
    i: '#0f0e1c',
    j: '#282834',
  },
};

/** The far foot, open toes: it stays flat on the ground. */
export const BOOT_F_FOOT_F: PaintedPiece = {
  pivot: [3, -3],
  angle: 98.82,
  rows: [
    'abbbbccddeaa.',
    'abbbbbcbfhijk',
    '.aakbbblminpa',
    '....aabqrlsea',
    '......aaaaaa.',
  ],
  colors: {
    a: '#070713',
    b: '#252330',
    c: '#444450',
    d: '#40414e',
    e: '#292735',
    f: '#a66358',
    h: '#a55f56',
    i: '#eec09e',
    j: '#9a554f',
    k: '#090817',
    l: '#ba7464',
    m: '#efc4a2',
    n: '#ad6355',
    p: '#f1c8a9',
    q: '#ba7062',
    r: '#b86c5e',
    s: '#b46a5e',
  },
};
