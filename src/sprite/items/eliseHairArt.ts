// The owner's Elise: her hair brought down to our scale in her colours
// (tools/refs/elise-hair-from-ref.py from docs/reference/elise-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';
import type { PaintedPart } from './capeArt';

/** One character per colour of hers (the three parts share them). */
const ELISE_HAIR_COLORS: Record<string, string> = {
  k: '#080613',
  K: '#1a101a',
  n: '#342325',
  '7': '#4c2924',
  b: '#683c30',
  c: '#764534',
  d: '#804936',
  e: '#865339',
  f: '#905f3c',
  g: '#a47043',
  G: '#b27b44',
  h: '#b88652',
  i: '#c48d52',
  j: '#cb9658',
  J: '#cf9b48',
  l: '#d4a362',
  m: '#dcb06e',
  o: '#ecc476',
  p: '#f4d389',
  q: '#f8dc92',
  r: '#fce89e',
  s: '#feeeb8',
  '1': '#342325',
  '2': '#683c30',
  '3': '#a47043',
  '4': '#cf9b48',
  '5': '#ddac5a',
  '6': '#e6b75e',
  '8': '#f4d389',
  '9': '#fce89e',
};

/** Over the head: her crown, bangs, ornament and side locks. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const ELISE_HAIR_FRONT: PaintedPart = {
  pivot: [13, 15],
  rows: [
    '.......KKkkkkkkkkkK..........',
    '.....KkqqqppoqqoGmpkK........',
    '....krqqpopqqpopqqmpqkk......',
    '...krrqqpqqqqqqqqqqopjpk.....',
    '..kppsrrqqqqqqqoqqqqqppqk....',
    '.Kqoqrqqsqqqqqpqqqqqqrgqqk...',
    '.kpoqqqqqesrrpqqqqprqrgpppk..',
    '.kppp111qrrrresqrorsqs7qrqk..',
    'Kppp18963qqqeqosrpsqqrbbsok..',
    'kppq162361qqeqqpopqdqpJjlprk.',
    'kppq1582561flopmeqcdqbJnjrsk.',
    'klqqp14531qjmmljlmjdjlJnjppk.',
    'klqqlqjiqoqll.j..j..jdkndjllk',
    'klqqlmdnqoqdb.........jndjlbk',
    '.......cqpqd.................',
    '........qlqd.................',
    '........qqpe.................',
    '........qplq.................',
    '.......cqpmoq................',
    '.......dqqo..................',
    '.......dmqo..................',
    '.......dlqqb.................',
    '.......hjrqd.................',
    '.......kqpld.................',
    '........kqpdk................',
    '........kqldk................',
    '.........kpjk................',
    '.........kpdk................',
    '..........klk................',
    '..........kjk................',
    '...........k.................',
  ],
  colors: ELISE_HAIR_COLORS,
};

/** Behind the head: all of its hair, the mass behind it down to the shoulders and the far lock down to the jaw, with what the face hides filled in; also the head's outline above the eyes. */
export const ELISE_HAIR_BACK: PaintedPart = {
  pivot: [17, 15],
  rows: [
    '...........KKkkkkkkkkkK..........',
    '.........KkqqqppoqqoGmpkK........',
    '........krqqpopqqpopqqmpqkk......',
    '.......krrqqpqqqqqqqqqqopjpk.....',
    '......kppsrrqqqqqqqoqqqqqppqk....',
    '.....Kqoqrqqsqqqqqpqqqqqqrgqqk...',
    '.....kpoqqqqqesrrpqqqqprqrgpppk..',
    '.....kppp111qrrrresqrorsqs7qrqk..',
    '....Kppp18963qqqeqosrpsqqrbbsok..',
    '....kppq162361qqeqqpopqdqpJjlprk.',
    '....kppq1582561flopmeqcdqbJnjrsk.',
    '....klqqp14531qjmmljlmjdjlJnjppk.',
    '....klqqlqjiqoqllmjjljjdjdkndjllk',
    '....klqqlmdnqoqdbmjjljjdjdjndjlbk',
    '....klqppodcqpqdbmjjljjdjdjndlqk.',
    '...Kllqpreccqlqdccccccccccccdlqk.',
    '...kllqlreccqqpeccccccccccccdlqk.',
    '...kllqlredcqplqccccccccccccdlqk.',
    '..Klllqsqhdcqpmoqccccccccccdlqk..',
    '..kmplosmcddqqoccccccccccccdlpk..',
    '.klpkrpsdjddmqocccccccccccddlpk..',
    '.kkrrpJpdjddlqqbccccccccccddljk..',
    'kkrrppJpjjdhjrqdccccccccccdljk...',
    '...........kqpld...........djk...',
    '............kqpdk..........dk....',
    '............kqldk...........k....',
    '.............kpjk................',
    '.............kpdk................',
    '..............klk................',
    '..............kjk................',
    '...............k.................',
  ],
  colors: ELISE_HAIR_COLORS,
};

/** The long fall down her back, behind the body: it hangs from the back of the head and turns with the torso (`angle` is our torso's at idle). */
export const ELISE_HAIR_FALL: PaintedPiece = {
  pivot: [12, 9],
  angle: -92.00,
  rows: [
    '..............rsqplpqoljpql',
    '..............rsqplpqoljpql',
    '..............rsqplpqoljpql',
    '.............rsqplpqoljpqll',
    '.............rsqplpqoljpqll',
    '.............rsqplpqoljpqll',
    '............rsqplpqoljpqllG',
    '............rsqplpqoljpqllG',
    '...........rsqplpqoljpqllgf',
    '...........rsqplpqoljpqllgf',
    '..........rsqplpqoljpqllgfe',
    '.......Krsqplpqoljpqllgfecj',
    '......KrsqplpqoljpqllfecjGg',
    '.....KrsqplpqoljpqllfecjGgf',
    '....KrsqplpqoljpqllfecjGgfe',
    '...KrsqplpqoljpqllfecjGgfec',
    '..KrsqplpqoljpqllecjGgfecjG',
    '..KrsqplpqoljpqllecjGgfecjG',
    '.KrsqplpqoljpqllecjGgfecjGg',
    '.KrsqplpqoljpqllecjGgfecjGg',
    'KrsqplpqoljpqllcjGgfecjGgfe',
    'KrsqplpqoljpqllcjGgfecjGgfe',
    'KrqqplpqoljppllcjGgfecjGgfe',
    'KrqqplpqoljppllcjGgfecjGgfe',
    'KrqqplpqoljpplljGgfecjGgfec',
    'KrqqplpqoljpplljGgfecjGgfec',
    'KrqqplpqoljpplljGgfecjGgfec',
    'KrqqplpqoljpplljGgfecjGgfec',
    '.KqqplpqoljppllGgfecjGgfecj',
    '.KqqplpqoljppllGgfecjGgfecj',
    '.Kqpj7pqoljppllGgfecjGgfecj',
    '..7j77pqljjppllGgfecjGgfecj',
    '...7.7lpjdjppllgfecjGgfecjG',
    '......7lj7jppllgfecjGgfecjG',
    '.......7j7lppllgfecjGgfecjG',
    '........7.7plllgfecjGgfecjG',
    '...........7lj7fecjGgfecjGg',
    '............7i7fecjGgfecjGg',
    '.............7.7ecjG7fecjGg',
    '................7cj7.7ecj7.',
    '.................77...7j7..',
    '.......................7...',
  ],
  colors: ELISE_HAIR_COLORS,
};

/** The loose strand at the top of the fall, outside the mass: it rides with the fall (the same pivot). */
export const ELISE_HAIR_WISP: PaintedPiece = {
  pivot: [14, -1],
  angle: -92.00,
  rows: [
    '......777',
    '....77lmm',
    '...7lljj.',
    '..7lj7...',
    '.7lj7....',
    '7J7......',
    '7........',
  ],
  colors: ELISE_HAIR_COLORS,
};

/** Where the fall's pivot sits from the face anchor (fine pixels). */
export const ELISE_HAIR_FALL_AT: [number, number] = [-13, 6];

/** Her darkest line: kept as she has it when the hair is recoloured. */
export const ELISE_HAIR_LINE = 'kK';

/** Her blonde on the lit face of most of her hair: the Hair slot's default; her other golds and browns follow it. */
export const ELISE_HAIR_BASE = '#f8dc92';

/** The gold flower's characters: the Ornament slot recolours them. */
export const ELISE_ORNAMENT = '12345689';

/** The flower's gold: the Ornament slot's default. */
export const ELISE_ORNAMENT_BASE = '#ddac5a';
