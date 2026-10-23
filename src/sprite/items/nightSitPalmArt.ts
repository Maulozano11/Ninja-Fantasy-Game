// Ren's far hand when seated: the owner's open hand, palm up, his pixels from his Trunks sit picture
// (tools/refs/ren-sit-palm-from-ref.py from docs/reference/trunks-sit-owner-reference.jpg, at our scale).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His skin and his glove the colour slots recolour from (at these, every pixel is his). */
export const NIGHT_SIT_PALM_SKIN = '#9f5b52';
export const NIGHT_SIT_PALM_GLOVE = '#3b3139';

/** What each of his colours is: his line, his skin (it follows the character's), his glove (it follows the glove's colour). */
export const NIGHT_SIT_PALM_KIND: Record<string, 'glove' | 'line' | 'skin'> = {
  '#000000': 'line',
  '#0a090f': 'line',
  '#1d1a39': 'glove',
  '#23212c': 'line',
  '#23261f': 'line',
  '#2d1219': 'skin',
  '#3b3139': 'glove',
  '#7f4446': 'skin',
  '#9f5b52': 'skin',
  '#b76d5e': 'skin',
  '#d28569': 'skin',
  '#db9677': 'skin',
  '#edb18d': 'skin',
  '#f3bf98': 'skin',
};

/** Where the piece lands in his Trunks sit frame, as he drew it: the fine pixel of its first row's first cell. */
export const NIGHT_SIT_PALM_REST: [number, number] = [137, 158];

/** The far hand open, palm up, reaching forward: it rides the hand about the wrist, turned with his forearm's angle. */
export const NIGHT_SIT_PALM_F: PaintedPiece = {
  pivot: [0, 11],
  angle: -7.59,
  rows: [
    '........a........',
    '.......aba.......',
    '......acda.......',
    '.....aeda..aaaaa.',
    '....aefhaaaedicia',
    '...aeffeaejhdddda',
    '.aaaffffjeeaaaaa.',
    'aefkfffeeeadcba..',
    'affeefeajhaadba..',
    'affjeeejeaclma...',
    'aeffajeejancna...',
    '.affeajeaiaaaa...',
    '.aefaaaaadpna....',
    '.daaa....aaa.....',
    '.aa..............',
  ],
  colors: {
    a: '#000000',
    b: '#d28569',
    c: '#f3bf98',
    d: '#9f5b52',
    e: '#23261f',
    f: '#3b3139',
    h: '#1d1a39',
    i: '#db9677',
    j: '#23212c',
    k: '#0a090f',
    l: '#7f4446',
    m: '#2d1219',
    n: '#b76d5e',
    p: '#edb18d',
  },
};
