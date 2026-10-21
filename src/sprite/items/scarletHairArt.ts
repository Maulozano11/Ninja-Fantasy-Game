// The owner's hair on his Scarlet, brought down to our scale in his colours
// (tools/refs/scarlet-hair-from-ref.py from docs/reference/scarlet-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** One character per colour of his (both parts share them). */
const SCARLET_HAIR_COLORS: Record<string, string> = {
  c: '#26060d',
  i: '#3a0f1e',
  l: '#4e172a',
  r: '#601f35',
  w: '#70273e',
  A: '#87324c',
  G: '#9a3e58',
  L: '#ac5068',
};

/** Every pixel of his hair, over the head: his crimsons and his line. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const SCARLET_HAIR_FRONT: PaintedPart = {
  pivot: [9, 13],
  rows: [
    '...........cccc...........',
    '.........ccwwrwcc.........',
    '.....ccccAAwwrlwwcc..c....',
    '..c..cwGAAAAAlAlwllcc.....',
    '...ccwGGLLLAAwwwwllwrc....',
    '....cAAGGLAwGwAAAlwlwc....',
    '..ccrrlAGGAAwGAGAAAwGAc...',
    '..clllrGAwGAwGGGAAwrAGGc..',
    '...crlAAAAGGGGAGGGiiwwGc..',
    '..cwwllAArAAGAAGGl..cwlc..',
    'ccwwllwAwrAAAAAlGl..clrlc.',
    '..clwArwwAAwll.lwl...clc..',
    '.crAAiiAAAArw..rrr...cic..',
    'ccwiirAlAArr....rl....ilc.',
    '..ccrliiwAwc....l.....licc',
    '.ccwlirwrAw..........clc..',
    '..cwilrwlrw...........c...',
    '..cciilrwlll..........c...',
    '.cc.clilrwl..........icc..',
    '...ciiilirl..........c....',
    '.......ll...........i.....',
  ],
  colors: SCARLET_HAIR_COLORS,
};

/** His hair with what his face hides filled in (his forehead between the strands of his fringe, his cheeks and jaw between his side locks), drawn behind the head; also his head's outline at the top. */
export const SCARLET_HAIR_BACK: PaintedPart = {
  pivot: [9, 13],
  rows: [
    '...........cccc...........',
    '.........ccwwrwcc.........',
    '.....ccccAAwwrlwwccwwc....',
    '..cwwcwGAAAAAlAlwllcc.....',
    '...ccwGGLLLAAwwwwllwrc....',
    '....cAAGGLAwGwAAAlwlwc....',
    '..ccrrlAGGAAwGAGAAAwGAc...',
    '..clllrGAwGAwGGGAAwrAGGc..',
    '...crlAAAAGGGGAGGGiiwwGc..',
    '..cwwllAArAAGAAGGliicwlc..',
    'ccwwllwAwrAAAAAlGliiclrlc.',
    '..clwArwwAAwllAlwliiwclc..',
    '.crAAiiAAAArwlArrriiwcic..',
    'ccwiirAlAArrwlArrliiwlilc.',
    '..ccrliiwAwciiiiliiiiilicc',
    '.ccwlirwrAwiiiiiiiiiiclc..',
    '..cwilrwlrwiiiiiiiiiiic...',
    '..cciilrwllliiiiiiiiiic...',
    '.cciclilrwliiiiiiiiiiicc..',
    '...ciiilirliiiiiiiiiic....',
    '.......ll...........i.....',
  ],
  colors: SCARLET_HAIR_COLORS,
};

/** His line, his darkest crimson: kept as he drew it when the hair is recoloured. */
export const SCARLET_HAIR_LINE = 'c';

/** His crimson on the lit face of most locks: the colour slot's default; his other crimsons follow it. */
export const SCARLET_HAIR_BASE = '#87324c';
