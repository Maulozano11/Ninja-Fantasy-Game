// The owner's tactical outfit: the cargo trousers, his pixels at our scale (tools/refs/vanguard-cargo-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const VANGUARD_CARGO_CLOTH = '#2c2b31';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const VANGUARD_CARGO_KIND: Record<string, 'brown' | 'dark' | 'hair' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#01010d': 'line',
  '#0e101d': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#1c2234': 'hair',
  '#1e1e2a': 'hair',
  '#212227': 'dark',
  '#222b3c': 'hair',
  '#282421': 'brown',
  '#2c2b31': 'dark',
  '#322826': 'brown',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#413833': 'brown',
  '#45484f': 'steel',
  '#575c62': 'steel',
  '#63686e': 'steel',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const VANGUARD_CARGO_REST: Record<string, [number, number]> = {
  VANGUARD_CARGO_THIGH_N: [108, 174],
  VANGUARD_CARGO_THIGH_F: [124, 174],
  VANGUARD_CARGO_SHIN_N: [107, 198],
  VANGUARD_CARGO_SHIN_F: [129, 199],
};

/** His near cargo trouser leg with the knee pad. It rides the thigh about the hip. */
export const VANGUARD_CARGO_THIGH_N: PaintedPiece = {
  pivot: [10, 6],
  angle: 108.43,
  rows: [
    '.........a...a....',
    '.....aabbaaaacccd.',
    '.....aaaadceacbbc.',
    '........cbeacdeee.',
    '.......aaaacdedcb.',
    '........acbeeeeda.',
    '........aabeeeccc.',
    '........eadeeeebca',
    '........aabeeecbca',
    '.....a..eabeecccaa',
    '....aaeeabeeeebca.',
    '...adaecabeeefba..',
    '...adcddadeebbba..',
    '...aaaaahedfddfa..',
    '....abbcieeeeda...',
    '....abaaaaaedja...',
    '...aaaaklcmada....',
    '...aaaedcecafa....',
    '..aaaedcecenaa....',
    '..apaedececda.....',
    '..aaanececcda.....',
    '.affadcecenaa.....',
    '.affaddccdda......',
    'afbfjaheedaa......',
    'andfjjaaaafa......',
    '.aa........a......',
  ],
  colors: {
    a: '#000116',
    b: '#212227',
    c: '#181822',
    d: '#2c2b31',
    e: '#323338',
    f: '#141a2a',
    h: '#1c2234',
    i: '#222b3c',
    j: '#1e1e2a',
    k: '#45484f',
    l: '#3b3c40',
    m: '#575c62',
    n: '#0e101d',
    p: '#322826',
  },
};

/** His far cargo trouser leg with the knee pad. It rides the thigh about the hip. */
export const VANGUARD_CARGO_THIGH_F: PaintedPiece = {
  pivot: [10, 5],
  angle: 75.07,
  rows: [
    '..aaa...a..a....',
    '.bababbccaca....',
    '.cabaddbbeaa....',
    '.bacabbbeeeaf...',
    '.daeeheecchea...',
    'aeaeaahccbbhaa..',
    '.ihaaeeeddbcea..',
    '.aaaaaedbbbbea..',
    '.aaeiicbbbbbea..',
    '..aeehicbbbcea..',
    '..ajadddcbbbdea.',
    '...aaidbebbbbda.',
    '...aeaedbbbbbea.',
    '...aaeaddbbbbea.',
    '....aeaeedbbcca.',
    '....aeaeeekaaaa.',
    '....aaeahhalmkda',
    '.....aaaaallcmca',
    '.....adnnaacmmba',
    '.....aeepabecmma',
    '.....aapqaccccca',
    '....ahaaaacceeaa',
    '....ahahdhabcca.',
    '....ahahbbeaaaaa',
    '....ahahhcbbbbha',
    '.....aa.......a.',
  ],
  colors: {
    a: '#000116',
    b: '#323338',
    c: '#2c2b31',
    d: '#212227',
    e: '#181822',
    f: '#01010d',
    h: '#141a2a',
    i: '#0e101d',
    j: '#00011f',
    k: '#1c2234',
    l: '#45484f',
    m: '#3b3c40',
    n: '#322826',
    p: '#282421',
    q: '#413833',
  },
};

/** His near trouser leg below the knee pad, tucked into the boot. It rides the shin about the knee. */
export const VANGUARD_CARGO_SHIN_N: PaintedPiece = {
  pivot: [6, -3],
  angle: 98.13,
  rows: [
    '.......aaaa.a',
    '..aabbccccdba',
    '.aaaaabbbbbaa',
    'aeaafaaaaaaa.',
    'aa.a.........',
  ],
  colors: {
    a: '#000116',
    b: '#141a2a',
    c: '#323338',
    d: '#181822',
    e: '#413833',
    f: '#63686e',
  },
};

/** His far trouser leg below the knee pad. It rides the shin about the knee. */
export const VANGUARD_CARGO_SHIN_F: PaintedPiece = {
  pivot: [9, -5],
  angle: 94.40,
  rows: [
    'a',
  ],
  colors: {
    a: '#000116',
  },
};
