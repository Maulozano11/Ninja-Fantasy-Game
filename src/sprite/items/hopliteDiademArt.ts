// The owner's bronze diadem (acc_hoplite_diadem).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-diadem-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-diadem-from-ref.py src/sprite/items/hopliteDiademArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_DIADEM_BRONZE = '#8e5a36';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_DIADEM_REST: Record<string, [number, number]> = {
  HOPLITE_DIADEM: [117, 132],
};

/** His diadem: stamped on the face anchor, over the hair. */
export const HOPLITE_DIADEM: PaintedPiece = {
  pivot: [6, 7],
  angle: -90.00,
  rows: [
    '...aaa......aa...aaa.',
    'aaabba.......a...aaa.',
    '.aabba.....a.ccde...a',
    '...aa......aacccfbaaa',
    '...........aaaaa.aaaa',
    '................ha...',
  ],
  colors: {
    a: '#010216',
    b: '#442824',
    c: '#96603a',
    d: '#2e1a1c',
    e: '#8e5a36',
    f: '#85583a',
    h: '#a66e41',
  },
};

/** What each colour of HOPLITE_DIADEM is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_DIADEM_KIND: Record<string, 'line' | 'warm'> = {
  '#010216': 'line',
  '#2e1a1c': 'warm',
  '#442824': 'warm',
  '#85583a': 'warm',
  '#8e5a36': 'warm',
  '#96603a': 'warm',
  '#a66e41': 'warm',
};
