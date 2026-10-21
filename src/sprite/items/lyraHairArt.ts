// Lyra's hair, the owner's first heroine (tools/refs/lyra-hair-from-ref.py from
// docs/reference/lyra-owner-reference.jpg), brought down to our scale in her colours. Generated: rerun
// the script to change it.

import type { PaintedPiece } from '../painted';
import type { PaintedPart } from './capeArt';

/** One character per colour of hers (all the pieces share them). */
export const LYRA_HAIR_COLORS: Record<string, string> = {
  k: '#04010d',
  J: '#3b0d21',
  q: '#590f26',
  Q: '#691f24',
  p: '#963b2b',
  h: '#a6442d',
  P: '#b24f33',
  H: '#d07344',
  X: '#2a2a37',
  e: '#404049',
  E: '#464654',
  f: '#565862',
  O: '#9c5d27',
  o: '#ce9242',
  Y: '#e8b45e',
  G: '#f4c66e',
  y: '#fdd36c',
  S: '#fdceb0',
  s: '#eea692',
  z: '#df9180',
  Z: '#c8756a',
};

/** Over the head (hairFront): crown, fringe, far lock, the back of the head, the pin, the bow and her ear. Its pivot is the cell on our face anchor. */
export const LYRA_HAIR_HEAD: PaintedPart = {
  pivot: [19, 16],
  rows: [
    '...............kkkkkkkk.............',
    '.............kkQhhhhJQQkk...........',
    '...........kQQhHHhhhhQJhhQk.........',
    '..........khHHhhQhhhhhhQJhhQk.......',
    '.........khhhhpHhhhhhQQQQQhhpk......',
    '........khhhhhyGhhhhhhhhhhJQhhk.....',
    '.......kQhhhhYJpohQhhhhhhhhJQQhk....',
    '.......kQQhQhoJpOJQHhhHhQJhJhhhhk...',
    '......kQQhJJJhoOhQHhHHHhhhQhJhhhk...',
    '......kJJhJhYhphJhhhhhJQJJJQJJHQhk..',
    '.....kpphhhoJJpJJhhhhQ.......JJhpk..',
    '.....kpJJpoQQQQJhhhhQ........JQhhpk.',
    '..kkkJJQQOQJJJJhhhhhJ........JJhhpk.',
    '.kfEXkJJJJJQQhhhhQhh..........JQhpk.',
    '.kEeXXkJJJJJJJQQhQ..............Jhpk',
    '.kXXkXkQJJJJSSshJ...............Jhpk',
    '..kkEXkQQJQJSZshJ...............Jhpk',
    '..kEXkQQQQQJSZzhJ...............JQpk',
    '.kfeXkQQhQQJSzJhJ..............JQhpk',
    'kEeXkhhQQhhJsSJpJ..............JQhpk',
    'kkXkQhQhQQQJJsJQJ..............JQpk.',
    '.kk.hJhhQJQhJhQJQ..............JQk..',
    '....pJhhQQJhhJhQJ..............Jk...',
    '....hhQhJJQJJhQJQ..............k....',
    '.....hQJJQJQJJJJQ...................',
  ],
  colors: LYRA_HAIR_COLORS,
};

/** Behind the body (hairBack): her waist-long wavy hair. Pivot on our face anchor; it turns with the torso (angle: our idle torso's). */
export const LYRA_HAIR_LONG: PaintedPiece = {
  pivot: [29, 3],
  angle: -89.5,
  rows: [
    '..............hpQJhpQJhpQJpQ..',
    '..............hpQJhpQJhpQJpQ..',
    '..............hpQJhpQJhpQJpQ..',
    '..............hpQJhpQJhpQJpQ..',
    '..............hpQJhpQJhpQJpQ..',
    '..............hpQJhpQJhpQJpQ..',
    '..............hpQJhpQJhpQJpQ..',
    '..............hpQJhpQJhpQJpQ..',
    '.........kHPhphpQJhpQJhpQJpQk.',
    '........kHPhpJPhpQqQqJpQqJQJk.',
    '........kHPhpPhppQqQqJpQqJQJk.',
    '.......kHPhpJPhppQqQqJpQqJQJk.',
    '......kHhhpJPhpJpQqQqJpQqJQJk.',
    '.....kHhhpJJPhpJpQqQqJpQqJQJk.',
    '.....kHhhpJhhpJpQqpQqJpQqJQJk.',
    '....kHhhpJJhhpJpQqpQqJpQqJQJk.',
    '....kHhhpJhhpJJpQqpQqJpQqJQJk.',
    '....kHhhpJhpJJJpQqpQqJpQqJQJk.',
    '....kPhpJJhpJJJpQqpQqJpQqJQJk.',
    '....kPhpJJhpJJJpQqpQqJpQqJQJk.',
    '....kPhpJJhpJJJpQqpQqJpQqJQJk.',
    '....kPhpJJhpJJJpQqpQqJpQqJQJk.',
    '....khpQJJhpJJJpQqpQqJpQqJQJk.',
    '.....khpQhhhpJJpQqpQqJpQqJQJk.',
    '.....khpQJhhpJpJpQqQqJpQqJQJk.',
    '.....khpQJhhpJpJpQqQqJpQqJQJk.',
    '....kPhpkkkhhppQJpQqqJpQqJQJk.',
    '...kHpkk..khhppQJpQqqJpQqJQJk.',
    '....kk....khpQpQJpQqqJpQqJQJk.',
    '...........khpQQqJpQqJpQqJQJk.',
    '...........khpQQqJpQqJpQqJQJk.',
    '............kpQQqJpQqJpQqJkk..',
    '............kpQQqJJpQqpQqJk...',
    '.............kQQqJJpQqpQqJk...',
    '.............kpQqJJpQqpQqJk...',
    '.............kpQqJpQJpQQqk....',
    '.............kpQqJpQJpQkk.....',
    '..............kQqJpQqpQk......',
    '...............kkkkQqkk.......',
    '...................kk.........',
  ],
  colors: LYRA_HAIR_COLORS,
};

/** In front of the near shoulder (hairFront, behind the near arm): her braid. Pivot on our face anchor; it turns with the torso. */
export const LYRA_HAIR_BRAID: PaintedPiece = {
  pivot: [7, -5],
  angle: -89.5,
  rows: [
    'kHhQk.....',
    'kPhpJk....',
    '.kJQHhk...',
    '.kHhpQk...',
    '..kQPhJk..',
    '..kJQHhk..',
    '...kHhpQk.',
    '...kQPhJk.',
    '...kJQHhk.',
    '....kHhpQk',
    '....kQPhJk',
    '....kJQHhk',
    '....kHhpQk',
    '.....kPhJk',
    '.....kQHhk',
    '.....kHpk.',
    '......kQk.',
    '......kk..',
  ],
  colors: LYRA_HAIR_COLORS,
};

/** Her dark line: kept as she drew it when the hair is recoloured. */
export const LYRA_HAIR_LINE = 'k';
/** The bow (its greys follow the ribbon colour) and the pin (its golds follow the ornament colour). */
export const LYRA_HAIR_BOW = 'XeEf';
export const LYRA_HAIR_PIN = 'OoYGy';
/** Her ear, in our skin ramp's shades. */
export const LYRA_HAIR_EAR: Record<string, number> = { S: 3, s: 2, z: 2, Z: 1 };
/** The colour slots' defaults: her mid auburn, the bow's mid grey, the pin's mid gold. */
export const LYRA_HAIR_BASE = '#a6442d';
export const LYRA_RIBBON_BASE = '#404049';
export const LYRA_PIN_BASE = '#ce9242';
