// The owner's armoured outfit: the thigh plates and knee plates, his pixels at our scale (tools/refs/warden-cuisses-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const WARDEN_CUISSES_STEEL = '#323338';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const WARDEN_CUISSES_KIND: Record<string, 'blue' | 'brown' | 'dark' | 'hair' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#000430': 'line',
  '#0e101d': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#1c2234': 'hair',
  '#1c3c82': 'blue',
  '#1e1e2a': 'hair',
  '#212227': 'dark',
  '#222b3c': 'hair',
  '#225491': 'blue',
  '#23467a': 'blue',
  '#2b3244': 'hair',
  '#2c2b31': 'dark',
  '#322826': 'brown',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#45484f': 'steel',
  '#4f5259': 'steel',
  '#5391d4': 'blue',
  '#575c62': 'steel',
  '#585556': 'steel',
  '#5a534a': 'brown',
  '#8fbad2': 'hair',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const WARDEN_CUISSES_REST: Record<string, [number, number]> = {
  WARDEN_CUISSES_THIGH_N: [107, 182],
  WARDEN_CUISSES_THIGH_F: [127, 183],
};

/** His near thigh plates and round knee plate. It rides the thigh about the hip. */
export const WARDEN_CUISSES_THIGH_N: PaintedPiece = {
  pivot: [9, -4],
  angle: 95.04,
  rows: [
    '................a..',
    'a..............abaa',
    'ac..............aaa',
    'ade.............fa.',
    'aeeaaaa..........a.',
    'aaaahhia...........',
    '...aaeaaaj.........',
    '.....akaaa.........',
    '.....almnnaa.......',
    '.....alpqkqpar.....',
    '....asatnmmkmauv...',
    '....asakpmmmwmaa...',
    '....aaaqtmmmeka....',
    '...akaaxttttxaa...a',
    '...axtakktttpa.....',
    '..aeahhaeeepaa.....',
    '..a.aa..aaaaa......',
  ],
  colors: {
    a: '#000116',
    b: '#2c2b31',
    c: '#5a534a',
    d: '#585556',
    e: '#3b3c40',
    f: '#225491',
    h: '#212227',
    i: '#2b3244',
    j: '#1c3c82',
    k: '#141a2a',
    l: '#181822',
    m: '#575c62',
    n: '#4f5259',
    p: '#45484f',
    q: '#1e1e2a',
    r: '#00011f',
    s: '#322826',
    t: '#323338',
    u: '#000430',
    v: '#5391d4',
    w: '#0e101d',
    x: '#1c2234',
  },
};

/** His far thigh plates and knee plate. It rides the thigh about the hip. */
export const WARDEN_CUISSES_THIGH_F: PaintedPiece = {
  pivot: [6, -7],
  angle: 81.63,
  rows: [
    'a...a...a..a',
    'abbbaacdacea',
    'aaaafadeehea',
    'abbffaddeaea',
    'aabbaiahcjaa',
    'aakaeebaaaa.',
    'lakajbcicha.',
    'aaiimiicicna',
    '..aiimciciha',
    '...aaaccihha',
    '.....acphhha',
    '.....aapphha',
    '.......iippa',
    '....q...aada',
    '..........aa',
  ],
  colors: {
    a: '#000116',
    b: '#212227',
    c: '#45484f',
    d: '#3b3c40',
    e: '#2c2b31',
    f: '#322826',
    h: '#575c62',
    i: '#141a2a',
    j: '#1c2234',
    k: '#1e1e2a',
    l: '#23467a',
    m: '#0e101d',
    n: '#222b3c',
    p: '#323338',
    q: '#8fbad2',
  },
};
