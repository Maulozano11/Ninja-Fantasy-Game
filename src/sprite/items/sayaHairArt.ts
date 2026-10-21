// The owner's hair on his Saya, copied 1:1 from his picture at our game's scale
// (tools/refs/saya-hair-from-ref.py from docs/reference/saya-game-scale-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';
import type { PaintedPart } from './capeArt';

/** A part on the face: its far side rides the far eye, from row `farFrom` down, from column `farCols[row - farFrom]` on. */
export interface SayaFacePart extends PaintedPart {
  farFrom: number;
  farCols: number[];
}

/** One character per colour of his (all three parts share them). */
const SAYA_HAIR_COLORS: Record<string, string> = {
  k: '#020101',
  z: '#683c31',
  t: '#734b29',
  q: '#754930',
  y: '#7e4f35',
  E: '#905e3a',
  J: '#aa7640',
  P: '#be8e4e',
  S: '#cfa359',
  X: '#d8ae60',
  T: '#edc653',
  o: '#e7c26c',
  h: '#f5d679',
  H: '#f6e190',
  W: '#f9edb6',
};

/** Over the head: his hair above the chin (crown, bangs, ornament, the near side hair round the ear) and the two locks in front of the face below it. Its pivot is the cell on our face anchor (the near eye's start). */
export const SAYA_HAIR_FRONT: SayaFacePart = {
  pivot: [11, 13],
  farFrom: 9,
  farCols: [16, 16, 20, 19, 19, 19, 19, 19, 19, 19, 18, 18, 19, 20, 20, 21, 21, 21, 22, 21],
  rows: [
    '........kkkkkkkkk........',
    '......kkhhhhhPPhhkk......',
    '.....kXhhJhhhhhShhXk.....',
    '....kShhEhEJhhhhhhhSk....',
    '...kXhhEhyhhhhhhhhhhXk...',
    '..kXhhyhEhhhhhhhhhhhhSk..',
    '..kXhyoyohhXhhWhhWhXhhk..',
    '..kXtTyhtHPWhWWXhWWyhWk..',
    '.kXoPtTthhqhhWhPhWhyhWok.',
    '.kXotTtTtXyXhhXyhhhyyhok.',
    '.kXyTtEthyXXXXyyXhhyyXok.',
    '.kXhqXyhhyXXyy.yXoy.yXok.',
    '.kXhJyyhhyyyy..yXy.yyXok.',
    'kXXhz.yhhy....yXy..kyXEk.',
    'kXhhz.yhhy....yy...kyXk..',
    'kXhhq.yhhy.........kyk...',
    'XXhhEyyhhy.........kyk...',
    'XhhXEEyhhy.........kXk...',
    'XhhEEEyhhy.........kXk...',
    'hhXEEkyhhy........yyXk...',
    '......yhhPk.......kyXhk..',
    '......yhhPkk.......kXhk..',
    '.......yhhq.........khhk.',
    '.......yXhy.........kShk.',
    '........qhy..........khyk',
    '........yhy..........khyk',
    '.......kyhy..........khyk',
    '........ySz...........yyk',
    '........yy...........ky..',
  ],
  colors: SAYA_HAIR_COLORS,
};

/** Behind the head: the front's outline filled in to the chin (his strands run on behind the forehead, his shade below), also the head's outline at the top. Pivot on the face anchor. */
export const SAYA_HAIR_BACK: SayaFacePart = {
  pivot: [11, 13],
  farFrom: 9,
  farCols: [16, 16, 20, 19, 19, 19, 19, 19, 19, 19, 18, 18, 19, 20, 20, 21, 21, 21, 22, 21],
  rows: [
    '........kkkkkkkkk........',
    '......kkhhhhhPPhhkk......',
    '.....kXhhJhhhhhShhXk.....',
    '....kShhEhEJhhhhhhhSk....',
    '...kXhhEhyhhhhhhhhhhXk...',
    '..kXhhyhEhhhhhhhhhhhhSk..',
    '..kXhyoyohhXhhWhhWhXhhk..',
    '..kXtTyhtHPWhWWXhWWyhWk..',
    '.kXoPtTthhqhhWhPhWhyhWok.',
    '.kXotTtTtXyXhhXyhhhyyhok.',
    '.kXyTtEthyXXXXyyXhhyyXok.',
    '.kXhqXyhhyXXyyyyXoyyyXok.',
    '.kXhJyyhhyyyyyyyXyyyyXok.',
    'kXXhzEyhhyEEEEyXyEEkyXEk.',
    'kXhhzEyhhyEEEEyyEEEkyXk..',
    'kXhhqEyhhyEEEEEEEEEkyk...',
    'XXhhEyyhhyEEEEEEEEEkyk...',
    'XhhXEEyhhyEEEEEEEEEkXk...',
    'XhhEEEyhhyEEEEEEEEEkXk...',
    'hhXEEkyhhyEEEEEEEEyyXk...',
    '......yhhPkEEEEEEEkyXhk..',
    '......yhhPkk.......kXhk..',
    '.......yhhq.........khhk.',
    '.......yXhy.........kShk.',
    '........qhy..........khyk',
    '........yhy..........khyk',
    '.......kyhy..........khyk',
    '........ySz...........yyk',
    '........yy...........ky..',
  ],
  colors: SAYA_HAIR_COLORS,
};

/** Down the back from the near side of the head, behind the body: its pivot is the cell on the neck, its angle the torso's (neck to pelvis) at idle. */
export const SAYA_HAIR_LONG: PaintedPiece = {
  pivot: [26, 7],
  angle: 90.50,
  rows: [
    '...........kXhhzEyh',
    '...........kXhhqEyh',
    '..........kXXhhEyyh',
    '.........kyXhhXEEyh',
    '.........khXhhEEEyh',
    '........khXhhXEEkyh',
    '......kkhXhhXyyEEyh',
    '.....khhPhhhEEyEEyh',
    '....khhJhhXyEEyEEqk',
    '...khhJhhhEyEEyEEqk',
    '...khEhhhEEyEEyEEqk',
    '..khhPhhEEEyEEyEEqk',
    '..khJhhEEEEyEEyEEqk',
    '.khhJhEEEEEyEEyEEqk',
    '.khhJhEEyEEyEEyEEqk',
    'kXhyXXEEyEEyEEyEqk.',
    'kXXyXXEEyEEyEEyEqk.',
    'kXyyXXyEyEEyEEyEqk.',
    'kXkyXXEEyEEyEEyEqk.',
    'kXkyXXkEyEEyEEyqk..',
    'kX.kXXkEyEEyEEqk...',
    '.k.kXkkkEEqkEqk....',
    '....k...kqk.k......',
    '.........k.........',
  ],
  colors: SAYA_HAIR_COLORS,
};

/** His far eye's distance from his near one (fx - ex in our face anchor's terms). */
export const SAYA_HAIR_EYES = 7;

/** His black line: kept as he has it when the hair is recoloured, and laid along hair cut away when she lies down. */
export const SAYA_HAIR_LINE = 'k';

/** His gold ornament's characters: they take the ornament's colour, not the hair's. */
export const SAYA_HAIR_ORNAMENT = 'Tt';

/** His hair's lit face, most of the crown: the hair slot's default; his other hair colours follow it. */
export const SAYA_HAIR_BASE = '#f5d679';

/** His ornament's gold: the ornament slot's default. */
export const SAYA_HAIR_ORNAMENT_BASE = '#edc653';
