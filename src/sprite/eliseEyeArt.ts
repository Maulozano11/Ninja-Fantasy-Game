// The owner's Elise's eyes, her colours (tools/refs/elise-eyes-from-ref.py from
// docs/reference/elise-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** Her eyes in one lid state, and their letters on the face template's eye cells (near 5 x 3, far 3 x 3). */
export interface AzureEyes {
  near: PaintedEye;
  far: PaintedEye;
  template: { near: string[]; far: string[] };
}

/** Her colours, one character each. */
export const AZURE_EYE_COLORS: Record<string, string> = {
  a: '#683c30',
  b: '#1a101a',
  c: '#080613',
  d: '#764534',
  e: '#342325',
  f: '#c4c4ce',
  h: '#115893',
  i: '#fefef9',
  j: '#052c67',
  k: '#2bc3d8',
  l: '#0e447e',
  m: '#c67169',
  n: '#1276b0',
  p: '#79aed9',
  q: '#d68271',
  r: '#9b5754',
};

/** Where each eye's first cell is from the template's eye cells (columns, rows): both three rows above its lash row (her brow), the far eye a column left of it (her socket shadow). */
export const AZURE_EYE_AT: Record<'near' | 'far', readonly [number, number]> = { near: [0, -3], far: [-1, -3] };

/** Her eyes in each lid state, from AZURE_EYE_AT: the near eye seven cells wide, the far five, both six rows tall (brow, lash, three rows of eye). */
export const AZURE_EYES: Record<'open' | 'lowered' | 'closed', AzureEyes> = {
  /** Her eyes as he drew them: her brow, her lash a row above our lash row, her big eye under it (white, glint, pupil, blues); the far eye's glint at the face's edge. */
  open: {
    near: {
      letters: ['.BBBB..', '....BBB', 'LLLLLLL', 'LhdwdL.', 'Lwidd..', 'sswii..'],
      rows: ['.aaaa..', '....aaa', 'bcccbde', 'bfhijb.', 'ciklj..', '.minp..'],
    },
    far: {
      letters: ['.....', '.....', '.LLLL', 'sLLL.', 'LwLL.', 'DdLo.'],
      rows: ['.....', '.....', '.dccb', 'qbbb.', 'eibb.', 'rhb..'],
    },
    template: { near: ['Lhdwd', 'Lwidd', 'sswii'], far: ['LLL', 'wLL', 'dLo'] },
  },
  /** Reading: her lash comes down two rows, over all but the lower row of her eye. */
  lowered: {
    near: {
      letters: ['.BBBB..', '....BBB', '.......', 'bbbbb..', 'LLLLLLL', 'sswii..'],
      rows: ['.aaaa..', '....aaa', '.......', '.......', 'bcccbde', '.minp..'],
    },
    far: {
      letters: ['.....', '.....', '.....', '.bbo.', '.LLLL', 'DdLo.'],
      rows: ['.....', '.....', '.....', '.....', '.dccb', 'rhb..'],
    },
    template: { near: ['bbbbb', 'LLLLL', 'sswii'], far: ['bbo', 'LLL', 'dLo'] },
  },
  /** Knocked out: her lash closes down two rows across the shut eye, its outer end hanging down; skin over and under it. */
  closed: {
    near: {
      letters: ['.BBBB..', '....BBB', '.......', 'bbbbb..', 'LLLLLL.', 'Lbbbb..'],
      rows: ['.aaaa..', '....aaa', '.......', '.......', 'bcccbd.', 'c......'],
    },
    far: {
      letters: ['.....', '.....', '.....', '.bbo.', '.LLLL', '.bbo.'],
      rows: ['.....', '.....', '.....', '.....', '.bccb', '.....'],
    },
    template: { near: ['bbbbb', 'LLLLL', 'Lbbbb'], far: ['bbo', 'LLL', 'bbo'] },
  },
};

/** Her iris's main blue: the player's eye colour moves her iris as far. */
export const AZURE_IRIS = '#1276b0';

/** Her hair's main yellow, whose browns her brows are: the hair colour moves them as far. */
export const AZURE_BROW_HAIR = '#f8dc92';

/** Her skin, whose shades are round her eyes: the skin tone moves them as far. */
export const AZURE_SKIN = '#facdac';

/** The face template's skin shades (line, crease, shadow, base, light) in her face's tones: the skin tone moves them as far (her black line stays). */
export const AZURE_FACE: Record<string, string> = { o: '#080613', D: '#d68271', s: '#e59580', b: '#facdac', l: '#facdac' };

/** Her mouth for the template's lip and crease: one short muted rose line (the skin tone moves it as far). */
export const AZURE_MOUTH: Record<string, string> = { m: '#d68271', M: '#b76660' };
