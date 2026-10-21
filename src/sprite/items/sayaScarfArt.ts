// The owner's red scarf on his Saya, copied 1:1 from his picture at our game's scale
// (tools/refs/saya-scarf-from-ref.py from docs/reference/saya-game-scale-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';
import type { ScarfTail } from './sayaScarf';

/** One character per colour of his (both parts share them). */
const SAYA_SCARF_COLORS: Record<string, string> = {
  k: '#030101',
  a: '#441526',
  b: '#5c1a29',
  c: '#661b2a',
  d: '#b43134',
};

/** Round the neck under the chin and over the near shoulder: its pivot is the cell on the neck, its angle the torso's (neck to pelvis) at idle. */
export const SAYA_SCARF_WRAP: PaintedPiece = {
  pivot: [7, 2],
  angle: 90.50,
  rows: [
    'k...............',
    'bk..............',
    'ddck.......kck..',
    'ddcaaaakkkkacdk.',
    'dddcddaaaaacdbk.',
    'cdcddcddddddccck',
    'cbccbbbddddccdck',
    'kkkddddcbbccddk.',
    '...kbbdddddddak.',
    '......bbbbbbb...',
  ],
  colors: SAYA_SCARF_COLORS,
};

/** The wrap's stretch over the top of the near shoulder (drawn over the near arm): the same pivot cell and angle as the wrap. */
export const SAYA_SCARF_SHOULDER: PaintedPiece = {
  pivot: [14, 2],
  angle: 90.50,
  rows: [
    '.......k',
    '.....kkb',
    '...kkcdd',
    '..kbcccd',
    '.kccdddb',
    'kbkkkbdd',
    '.....kkc',
    '.......k',
  ],
  colors: SAYA_SCARF_COLORS,
};

/** The end hanging from behind the near shoulder down her back: its pivot is the cell on the neck; its spine (cell corners) runs from the shoulder to the point and hangs free from point `free` on. */
export const SAYA_SCARF_TAIL: ScarfTail = {
  pivot: [19, 0],
  angle: 90.50,
  spine: [[7, 0.5], [6, 4], [5, 7.5], [4, 10.5], [3, 13.5], [2, 16], [1.5, 18]],
  free: 1,
  rows: [
    '.....kkkk.',
    '....kcddck',
    '....kcddk.',
    '...kbcddk.',
    '...kbcddk.',
    '..kbcddk..',
    '..kacddk..',
    '..kbcddk..',
    '.kbccddk..',
    '.kaabcdk..',
    '.kabbcdk..',
    '.kbcddk...',
    '.kcddk....',
    'kcddk.....',
    'kcdk......',
    'kcdk......',
    '.kdk......',
    '.kk.......',
  ],
  colors: SAYA_SCARF_COLORS,
};

/** His black line: kept as he has it when the scarf is recoloured. */
export const SAYA_SCARF_LINE = 'k';

/** His lit red, the top face of both rolls: the colour slot's default; his other reds follow it. */
export const SAYA_SCARF_BASE = '#b43134';
