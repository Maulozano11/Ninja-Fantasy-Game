// The owner's red scarf on his Saya, brought down to our scale in her colours
// (tools/refs/saya-scarf-from-ref.py from docs/reference/saya-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';
import type { ScarfTail } from './sayaScarf';

/** One character per colour of hers (both parts share them). */
const SAYA_SCARF_COLORS: Record<string, string> = {
  k: '#02010d',
  Q: '#4b0f30',
  m: '#641a36',
  q: '#6e1c38',
  B: '#7c1d36',
  f: '#842b3c',
  R: '#bb2e3e',
};

/** Round the neck, under the chin: its pivot is the cell on the neck, its angle the torso's (neck to pelvis) at idle. */
export const SAYA_SCARF_WRAP: PaintedPiece = {
  pivot: [11, 3],
  angle: 90.50,
  rows: [
    '.kk...............',
    'kmBkkkkkkkkkkkkk..',
    'kBRRqQQQQQQQQffBkk',
    'kBBRRRqQQQQBRRBBBk',
    'kQBBRRRRRRRRRBBQmk',
    'kQQBBBBBBBBBQmBBBk',
    '.kQQQBBQQQQBRRBBk.',
    '.kRRRRRRRRRRRBBk..',
    '..kBBRRRRRRRBBk...',
    '...kkkkkkkkkkk....',
  ],
  colors: SAYA_SCARF_COLORS,
};

/** From the near side of the neck, behind the near shoulder, out into the flag and its hanging end: its pivot is the cell on the neck; its spine (cell corners) runs from the neck to the point and hangs free from point `free` on. */
export const SAYA_SCARF_TAIL: ScarfTail = {
  pivot: [35, 2],
  angle: 90.50,
  spine: [[25.5, 1], [23, 3.5], [20.5, 6], [18.5, 8.5], [16, 10.8], [13, 11.8], [10, 12.5], [7, 13], [4.5, 14], [3, 15.8], [2.3, 18], [2.2, 20], [2.5, 22], [3, 23.8]],
  free: 3,
  rows: [
    '.......................kkk',
    '......................kQBk',
    '.....................kQmBk',
    '....................kQmBk.',
    '...................kQmBk..',
    '..................kQmBk...',
    '.................kQmBk....',
    '..................kBBk....',
    '.................kqqQk....',
    '..............kkkQQqk.....',
    '.......kkkkkkkRRQQQk......',
    '....kkkRRRRRRRQQQQk.......',
    '..kkRRRRRRRRQQQBQk........',
    '.kRRBRRRRQQQQBBk..........',
    '.kRBRRRQQQBBBBk...........',
    'kBBRRRkkkBBBkk............',
    'kBRRRk...kkk..............',
    'kRRRk.....................',
    'kRRRk.....................',
    'kRRk......................',
    'kRRk......................',
    '.kRk......................',
    '.kRk......................',
    '..kk......................',
  ],
  colors: SAYA_SCARF_COLORS,
};

/** Her black line: kept as she has it when the scarf is recoloured. */
export const SAYA_SCARF_LINE = 'k';

/** Her lit red, the flag's top face and both rolls: the colour slot's default; her other reds follow it. */
export const SAYA_SCARF_BASE = '#bb2e3e';
