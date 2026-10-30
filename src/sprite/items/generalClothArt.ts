// The owner's Roman general's sleeves and scarf.
// Lifted from the owner's Roman general (docs/reference/roman-general-owner-reference.jpg) and
// brought down to our scale by tools/refs/general-sleeves-scarf-from-ref.py (tools/refs/general_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/general-sleeves-scarf-from-ref.py src/sprite/items/generalClothArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const GENERAL_SLEEVE_NAVY = '#1a2846';
export const GENERAL_SCARF_CLOTH = '#840e43';
export const GENERAL_SCARF_CLASP = '#70422f';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const GENERAL_CLOTH_REST: Record<string, [number, number]> = {
  GENERAL_SLEEVE_N: [106, 151],
  GENERAL_SLEEVE_F: [131, 152],
  GENERAL_SCARF: [113, 143],
  GENERAL_M_SLEEVE_N: [106, 151],
  GENERAL_M_SLEEVE_F: [131, 153],
  GENERAL_M_SCARF: [112, 143],
};

/** His near navy sleeve (spiral cuirass): rides the near shoulder. */
export const GENERAL_SLEEVE_N: PaintedPiece = {
  pivot: [8, 1],
  angle: 107.91,
  rows: [
    '..aaaaaaaaaa...',
    '..abbbbbbbbbaaa',
    '..abbbbbbbbbbba',
    '..abbbbbbbbbbba',
    '..abbbcccccdcba',
    '.accccddddddaaa',
    '.addaddeedda...',
    '.addddeeedda...',
    '.addeeeeedaa...',
    'aaaaaaaaaaaa...',
  ],
  colors: {
    a: '#02021c',
    b: '#0f1835',
    c: '#16223e',
    d: '#1a2846',
    e: '#2b3b55',
  },
};

/** What each colour of GENERAL_SLEEVE_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_SLEEVE_N_KIND: Record<string, 'dark' | 'line' | 'navy'> = {
  '#02021c': 'line',
  '#0f1835': 'dark',
  '#16223e': 'navy',
  '#1a2846': 'navy',
  '#2b3b55': 'navy',
};

/** His far navy sleeve (spiral cuirass): rides the far shoulder. */
export const GENERAL_SLEEVE_F: PaintedPiece = {
  pivot: [3, -1],
  angle: 77.05,
  rows: [
    '....aaaaaa.',
    '..aabbbbba.',
    '.abbbbbbba.',
    '.abcccccca.',
    '.abcdddccca',
    '.abcdeeeeea',
    'abbcdeeeeea',
    'abbceeeeeea',
    'abbcddaaaaa',
    '.abcda.....',
    '.abbaa.....',
    '..aa.......',
  ],
  colors: {
    a: '#02021c',
    b: '#0f1835',
    c: '#16223e',
    d: '#1a2846',
    e: '#20304a',
  },
};

/** What each colour of GENERAL_SLEEVE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_SLEEVE_F_KIND: Record<string, 'dark' | 'line' | 'navy'> = {
  '#02021c': 'line',
  '#0f1835': 'dark',
  '#16223e': 'navy',
  '#1a2846': 'navy',
  '#20304a': 'navy',
};

/** His magenta scarf and its clasp (spiral cuirass): rides the neck, in front of the head and chest. */
export const GENERAL_SCARF: PaintedPiece = {
  pivot: [14, 4],
  angle: -89.65,
  rows: [
    '........a.............',
    '.....aaaba......aa....',
    '..aaacdefa.....aha....',
    'aaiiijklfmaaaaadlnaa..',
    'apqpajjrrestfakunvdca.',
    '.aqaaaurrwttffmcciilla',
    '.aqqaldpxyztefffekjria',
    'aqqqqxAAxtttdrefekjjja',
    '.aqaaxxxatBlprkdnrcja.',
    '..a..axaaaaaaaaaaaaa..',
    '......aa..............',
  ],
  colors: {
    a: '#02021c',
    b: '#140624',
    c: '#2f072a',
    d: '#520c39',
    e: '#881550',
    f: '#94134c',
    h: '#000226',
    i: '#720f45',
    j: '#840e43',
    k: '#7c1348',
    l: '#460b38',
    m: '#9e144f',
    n: '#620939',
    p: '#6c0a3d',
    q: '#1e0828',
    r: '#3e0830',
    s: '#ae7235',
    t: '#996238',
    u: '#621244',
    v: '#581342',
    w: '#70422f',
    x: '#2e1427',
    y: '#5a3226',
    z: '#754223',
    A: '#241a23',
    B: '#42241e',
  },
};

/** What each colour of GENERAL_SCARF is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_SCARF_KIND: Record<string, 'dark' | 'line' | 'purple' | 'warm'> = {
  '#000226': 'dark',
  '#02021c': 'line',
  '#140624': 'dark',
  '#1e0828': 'dark',
  '#241a23': 'purple',
  '#2e1427': 'dark',
  '#2f072a': 'dark',
  '#3e0830': 'dark',
  '#42241e': 'warm',
  '#460b38': 'purple',
  '#520c39': 'purple',
  '#581342': 'purple',
  '#5a3226': 'warm',
  '#620939': 'purple',
  '#621244': 'purple',
  '#6c0a3d': 'purple',
  '#70422f': 'warm',
  '#720f45': 'purple',
  '#754223': 'warm',
  '#7c1348': 'purple',
  '#840e43': 'purple',
  '#881550': 'purple',
  '#94134c': 'purple',
  '#996238': 'warm',
  '#9e144f': 'purple',
  '#ae7235': 'warm',
};

/** His near navy sleeve (muscle cuirass): rides the near shoulder. */
export const GENERAL_M_SLEEVE_N: PaintedPiece = {
  pivot: [8, 1],
  angle: 107.91,
  rows: [
    '..aaaaaaaaaaaa',
    '..abbbbbbbbbba',
    '..abbbbbbcbbba',
    '..abbbbbccbbba',
    '..abbbccccbbba',
    '.abbbccdcccbba',
    '.abcccddddcbba',
    '.accdddeddccba',
    '.addddfffdcaaa',
    'aaaaaaaaaaa...',
  ],
  colors: {
    a: '#02021c',
    b: '#0f1835',
    c: '#16223e',
    d: '#20304a',
    e: '#2b3b55',
    f: '#000226',
  },
};

/** What each colour of GENERAL_M_SLEEVE_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_M_SLEEVE_N_KIND: Record<string, 'dark' | 'line' | 'navy'> = {
  '#000226': 'dark',
  '#02021c': 'line',
  '#0f1835': 'dark',
  '#16223e': 'navy',
  '#20304a': 'navy',
  '#2b3b55': 'navy',
};

/** His far navy sleeve (muscle cuirass): rides the far shoulder. */
export const GENERAL_M_SLEEVE_F: PaintedPiece = {
  pivot: [3, -2],
  angle: 77.05,
  rows: [
    '....aaaaaa.',
    '...abbbbba.',
    '..abbbbbba.',
    '..abbbbbbba',
    '.abbcccbbba',
    'abbcdddddda',
    'abbcdddddda',
    'abbcddaaaaa',
    '.abcca.....',
    '..aca......',
    '...a.......',
  ],
  colors: {
    a: '#02021c',
    b: '#0f1835',
    c: '#16223e',
    d: '#1a2846',
  },
};

/** What each colour of GENERAL_M_SLEEVE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_M_SLEEVE_F_KIND: Record<string, 'dark' | 'line' | 'navy'> = {
  '#02021c': 'line',
  '#0f1835': 'dark',
  '#16223e': 'navy',
  '#1a2846': 'navy',
};

/** His magenta scarf and its clasp (muscle cuirass): rides the neck, in front of the head and chest. */
export const GENERAL_M_SCARF: PaintedPiece = {
  pivot: [15, 4],
  angle: -89.65,
  rows: [
    '..................a....',
    '.................aa....',
    '...aaaaaaaa.....aba....',
    '.aacdefhiaja...acfkaa..',
    'ailmnkpcfkeeaaankbinda.',
    '.aqrilnmkhsstjepklnddda',
    '..aabrrqauvwmpejepppka.',
    '....aaaaaxywknpkjepppa.',
    '.........aaaaanddddda..',
    '..............aaaaaa...',
  ],
  colors: {
    a: '#02021c',
    b: '#2e1427',
    c: '#460b38',
    d: '#840e43',
    e: '#881550',
    f: '#3e0830',
    h: '#2f072a',
    i: '#620939',
    j: '#94134c',
    k: '#520c39',
    l: '#581342',
    m: '#621244',
    n: '#720f45',
    p: '#7c1348',
    q: '#000226',
    r: '#140624',
    s: '#56331a',
    t: '#9e144f',
    u: '#512a1c',
    v: '#4e2d26',
    w: '#623828',
    x: '#5a3226',
    y: '#42241e',
  },
};

/** What each colour of GENERAL_M_SCARF is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_M_SCARF_KIND: Record<string, 'dark' | 'line' | 'purple' | 'warm'> = {
  '#000226': 'dark',
  '#02021c': 'line',
  '#140624': 'dark',
  '#2e1427': 'dark',
  '#2f072a': 'dark',
  '#3e0830': 'dark',
  '#42241e': 'warm',
  '#460b38': 'purple',
  '#4e2d26': 'warm',
  '#512a1c': 'warm',
  '#520c39': 'purple',
  '#56331a': 'warm',
  '#581342': 'purple',
  '#5a3226': 'warm',
  '#620939': 'purple',
  '#621244': 'purple',
  '#623828': 'warm',
  '#720f45': 'purple',
  '#7c1348': 'purple',
  '#840e43': 'purple',
  '#881550': 'purple',
  '#94134c': 'purple',
  '#9e144f': 'purple',
};
