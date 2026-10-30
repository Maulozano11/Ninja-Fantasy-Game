// The owner's bronze warrior's diadem on Solen's head, his pixels (tools/refs/solen-mane-from-ref.py from
// docs/reference/bronze-warrior-repaint-owner-reference.jpg). Generated: rerun the script to change it:
//   python3 -I tools/refs/solen-mane-from-ref.py src/sprite/items/solenManeArt.ts

import type { PaintedPiece } from '../painted';

/** His bronze diadem across the brow, lifted onto Solen's head: stamped on the face anchor, over any hair. */
export const SOLEN_DIADEM: PaintedPiece = {
  pivot: [3, 9],
  angle: -90.00,
  rows: [
    '........abaccad',
    '.e.....eefehibf',
    'ee.....eaeabfje',
    '...........fef.',
    '............a..',
  ],
  colors: {
    a: '#e0a73f',
    b: '#8e542f',
    c: '#f0dc74',
    d: '#a37244',
    e: '#754e32',
    f: '#ecbd48',
    h: '#b87f3e',
    i: '#f2e796',
    j: '#d79847',
  },
};

/** What each colour of SOLEN_DIADEM is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const SOLEN_DIADEM_KIND: Record<string, 'warm'> = {
  '#754e32': 'warm',
  '#8e542f': 'warm',
  '#a37244': 'warm',
  '#b87f3e': 'warm',
  '#d79847': 'warm',
  '#e0a73f': 'warm',
  '#ecbd48': 'warm',
  '#f0dc74': 'warm',
  '#f2e796': 'warm',
};

/** His middle bronze of the diadem: the colour slot's default. */
export const SOLEN_DIADEM_BRONZE = '#d79847';
