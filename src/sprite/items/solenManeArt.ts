// The owner's bronze warrior's mane, braid and diadem on Solen's head, his pixels (tools/refs/solen-mane-from-ref.py from
// docs/reference/bronze-warrior-repaint-owner-reference.jpg). Generated: rerun the script to change it:
//   python3 -I tools/refs/solen-mane-from-ref.py src/sprite/items/solenManeArt.ts

import type { PaintedPart } from './capeArt';
import type { PaintedPiece } from '../painted';

/** One character per colour of his (the front and the back share them). */
const SOLEN_MANE_COLORS: Record<string, string> = {
  a: '#00001a',
  b: '#1c2336',
  c: '#20142a',
  d: '#485766',
  e: '#536473',
  f: '#343a4a',
  h: '#332836',
  i: '#090e1f',
  j: '#423048',
  k: '#0f1a34',
  l: '#414a59',
};

/** Every pixel of his mane over the head, lifted onto Solen's skull: his blue-blacks and his black line. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const SOLEN_MANE_FRONT: PaintedPart = {
  pivot: [9, 14],
  rows: [
    '.........a................',
    '.......aaaaaaaaaaaaa......',
    '.....aaabaabcddefbca......',
    '....aaaahibjddbbccaaa.....',
    '...ababiibfcfcbjddddfaaa..',
    '...abakfccbccccccbbfcca...',
    '...aacfcfcffccfbcffclcba..',
    '..aacfclcffcffaaaaaaadfa..',
    '..aabchafdcddaaaaaaaadcha.',
    '.aabacaalceecaaaaaaaacdaba',
    '..aabaaaaafdaaaaaaaaaafaa.',
    '...abaaaabfhaaaaaaaaaacca.',
    '..abaacaaaaaaa...aaa.aaca.',
    '..abacafa.....aa.aa.aaaca.',
    '.aaabbacaa...aaaa..aaaaa..',
    '...abaaaa............aaa..',
    '...abaaaa............a.a..',
    '..aaaabaa............a....',
    '.aababaa.............a....',
    'aa...aaaa...........a.....',
    '.........a..........a.....',
  ],
  colors: SOLEN_MANE_COLORS,
};

/** His mane with what the head hides filled in above the brow, drawn behind the head; also the head's outline there (the game trims our skull to it). */
export const SOLEN_MANE_BACK: PaintedPart = {
  pivot: [9, 14],
  rows: [
    '.........a................',
    '.......aaaaaaaaaaaaa......',
    '.....aaabaabcddefbca......',
    '....aaaahibjddbbccaaa.....',
    '...ababiibfcfcbjddddfaaa..',
    '...abakfccbccccccbbfcca...',
    '...aacfcfcffccfbcffclcba..',
    '..aacfclcffcffaaaaaaadfa..',
    '..aabchafdcddaaaaaaaadcha.',
    '.aabacaalceecaaaaaaaacdaba',
    '..aabaaaaafdaaaaaaaaaafaa.',
    '...abaaaabfhaaaaaaaaaacca.',
    '..abaacaaaaaaafbcaaa.aaca.',
    '..abacafabfhcfaacaacaaaca.',
    '.aaabbacaa...aaaa..aaaaa..',
    '...abaaaa............aaa..',
    '...abaaaa............a.a..',
    '..aaaabaa............a....',
    '.aababaa.............a....',
    'aa...aaaa...........a.....',
    '.........a..........a.....',
  ],
  colors: SOLEN_MANE_COLORS,
};

/** What each colour of SOLEN_MANE is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const SOLEN_MANE_KIND: Record<string, 'dark' | 'line' | 'navy' | 'purple'> = {
  '#00001a': 'line',
  '#090e1f': 'dark',
  '#0f1a34': 'dark',
  '#1c2336': 'navy',
  '#20142a': 'dark',
  '#332836': 'purple',
  '#343a4a': 'navy',
  '#414a59': 'navy',
  '#423048': 'purple',
  '#485766': 'navy',
  '#536473': 'navy',
};

/** His black line: kept as he drew it when the mane is recoloured. */
export const SOLEN_MANE_LINE = 'a';

/** His middle blue-black: the colour slot's default; his other blue-blacks follow it. */
export const SOLEN_MANE_BASE = '#343a4a';

const SOLEN_BRAID_COLORS: Record<string, string> = {
  a: '#010216',
  b: '#202737',
  c: '#263041',
  d: '#00001a',
  e: '#2c3845',
  f: '#343a4a',
  h: '#1c2336',
  i: '#414a59',
  j: '#332836',
  k: '#a37244',
  l: '#20142a',
  m: '#141c2e',
  n: '#172236',
  p: '#754e32',
};

/** His braid and its bronze bands, behind the head and shoulders, lifted with the mane: pivot on the face anchor. */
export const SOLEN_MANE_BRAID: PaintedPart = {
  pivot: [20, -2],
  rows: [
    '..............a.',
    '.............bba',
    '............ccca',
    '..........deefhh',
    '..........dijaaa',
    '........ddkh....',
    '.......dhil.....',
    '.......dhh......',
    '.....dmca.......',
    '....dhfna.......',
    '...dlfhd........',
    '...dlhdd........',
    '...dpdd.........',
    '.ddpdd..........',
    'dhfld...........',
    'dlffd...........',
    'dhfld...........',
    'dlhd............',
    '.dd.............',
    '.dd.............',
    '..dd............',
  ],
  colors: SOLEN_BRAID_COLORS,
};

/** What each colour of SOLEN_MANE_BRAID is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const SOLEN_MANE_BRAID_KIND: Record<string, 'dark' | 'line' | 'navy' | 'purple' | 'warm'> = {
  '#00001a': 'line',
  '#010216': 'line',
  '#141c2e': 'dark',
  '#172236': 'navy',
  '#1c2336': 'navy',
  '#20142a': 'dark',
  '#202737': 'navy',
  '#263041': 'navy',
  '#2c3845': 'navy',
  '#332836': 'purple',
  '#343a4a': 'navy',
  '#414a59': 'navy',
  '#754e32': 'warm',
  '#a37244': 'warm',
};

/** His middle bronze of the braid's bands: the band colour slot's default. */
export const SOLEN_MANE_BAND = '#754e32';

/** His bronze diadem across the brow, lifted with the mane: stamped on the face anchor, over any hair. */
export const SOLEN_DIADEM: PaintedPiece = {
  pivot: [3, 6],
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

const SOLEN_MANE_DIADEM_COLORS: Record<string, string> = {
  a: '#e0a73f',
  b: '#8e542f',
  c: '#f0dc74',
  d: '#a37244',
  e: '#754e32',
  f: '#ecbd48',
  h: '#b87f3e',
  i: '#f2e796',
  j: '#d79847',
};

/** His diadem as a part of the mane (the clip that holds the hair): the same pixels as SOLEN_DIADEM, drawn over the hair at the brow; pivot on the face anchor. */
export const SOLEN_MANE_DIADEM: PaintedPart = {
  pivot: [3, 6],
  rows: [
    '........abaccad',
    '.e.....eefehibf',
    'ee.....eaeabfje',
    '...........fef.',
    '............a..',
  ],
  colors: SOLEN_MANE_DIADEM_COLORS,
};
