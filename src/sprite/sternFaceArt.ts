// The owner's broad man's face and eyes, his pixels (tools/refs/stern-face-from-ref.py from
// docs/reference/bulky-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';
import type { PaintedPiece } from './painted';

/** His lit skin, which the character's skin colour stands for: every colour of his moves as far, his black line stays. */
export const STERN_SKIN = '#f2bd97';

/** His iris: the player's eye colour moves it as far. */
export const STERN_IRIS = '#5a4b32';

/** His hair's lit yellow, which his brow's brown is painted with: the hair colour moves it as far. */
export const STERN_BROW_HAIR = '#f0cc74';

/** His colours, one character each. */
export const STERN_EYE_COLORS: Record<string, string> = {
  a: '#010201',
  b: '#000000',
  c: '#010100',
  d: '#59341c',
  e: '#381b18',
  f: '#f3f3ec',
  g: '#5a4b32',
  h: '#211716',
  i: '#211214',
  j: '#020202',
  k: '#231415',
  m: '#1b1213',
  n: '#3c1e21',
};

/** His eyes in each lid state: open as he drew them, lowered (reading) and closed (knocked out), made of his pixels. */
export const STERN_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  open: {
    near: { letters: ['LLLLB', 'LwidL'], rows: ['abacd', 'efghi'] },
    far: { letters: ['bLL', 'dLL'], rows: ['.bj', 'kmn'] },
  },
  lowered: {
    near: { letters: ['LLLLB', 'LLLdL'], rows: ['abacd', 'ebahi'] },
    far: { letters: ['bLL', 'dLL'], rows: ['.bj', 'kmn'] },
  },
  closed: {
    near: { letters: ['LLLLB', 'bbbbb'], rows: ['abacd', '.....'] },
    far: { letters: ['bLL', 'bbb'], rows: ['.bj', '...'] },
  },
};

/** The owner's face (the 'stern' face shape), his pixels: ear, cheeks, nose, mouth, jaw and chin, his skin shading and black line, from the row above the lash line down; his skin goes on under his eyes and the hair crossing it. Its pivot is the cell on the face anchor. */
export const STERN_HEAD: PaintedPiece = {
  pivot: [7, 5],
  angle: 0.00,
  rows: [
    '.............abc..',
    '............defaa.',
    '.........hijeeefa.',
    '........kfijeeela.',
    '.menddepeeijlqehm.',
    '.mpnddefeejjalrhm.',
    '.mesddefeejjalthm.',
    '.mqeddefeejjjethu.',
    'vmmmadeweeeefexyzA',
    '..mBmdeeeeelfCDEm.',
    '..mkmpeleFefelaqm.',
    '..mmGmpjeFxHIGdm..',
    '.....GmqlfeejeJK..',
    '.......mKpeeLpm...',
    '.........mmmmmmm..',
  ],
  colors: {
    a: '#c5785c',
    b: '#9a5748',
    c: '#9e5c4b',
    d: '#c97e66',
    e: '#f2bd97',
    f: '#f2b992',
    h: '#b66e56',
    i: '#da9572',
    j: '#f1b996',
    k: '#8d4c3f',
    l: '#f3be9b',
    m: '#010000',
    n: '#5e3134',
    p: '#c57860',
    q: '#c2725a',
    r: '#b46550',
    s: '#874847',
    t: '#6d353c',
    u: '#3d2022',
    v: '#180e15',
    w: '#fbdcc0',
    x: '#ac6052',
    y: '#de9c7c',
    z: '#432222',
    A: '#3d201c',
    B: '#844542',
    C: '#b06355',
    D: '#5b2d34',
    E: '#de9879',
    F: '#f1ba9b',
    G: '#a55c52',
    H: '#663437',
    I: '#b56754',
    J: '#b66958',
    K: '#030402',
    L: '#d68a70',
  },
};
