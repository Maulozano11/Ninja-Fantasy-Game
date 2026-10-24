// The owner's head on his noble swordsman, the owner's pixels at our scale (tools/refs/noble-head-from-ref.py from
// docs/reference/noble-swordsman-owner-reference.jpg, reduced and cleaned by tools/refs/noble_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from './painted';

/** The skin colour he painted him in: a player's skin moves every colour of it as far. */
export const NOBLE_SKIN = '#e8a781';

/** How far his head stands above ours on a male body (fine pixels): where his picture has it (romanNeck.ts headUp). */
export const NOBLE_HEAD_UP = 3;

/** The owner's head (the 'noble' face shape), his pixels at our scale: his face, ear, jaw and mouth, his skin shading and black line, and our skull continued in his skin under his hair; the eye options draw the eyes on it. Its pivot is the cell on the face anchor. */
export const NOBLE_HEAD: PaintedPiece = {
  pivot: [7, 12],
  angle: 0.00,
  rows: [
    '.....aaaaaaaa......',
    '...aabbbbbbbbaa....',
    '..abbbbbbbbbbbba...',
    '.abbbbbbbbbbbbbba..',
    '.abbbbbbbbbbbbbba..',
    'abbbbbbbbbbbbbbbba.',
    'abbbbbbbbbbbbbbbba.',
    'abbbbbbbbbbbbbbbba.',
    'abbbbbbbbbbbbbbbba.',
    'abbbbbbbbbbbbbbbbba',
    'aaabbbbbbbbbbbbbcaa',
    'abbabadefbbbbbbahaa',
    'aijaaakbfbbbbbbbba.',
    'ablaaamnfbbbpbbbbaa',
    'aabkaabbbbbbbbqbaaa',
    'aabadabbbbbbbbrbaaa',
    '..aaapbbbbbbbstba..',
    '...aapbbbbbbbbba...',
    '...aaaubbbblvwba...',
    '...axaaybbbbbba....',
    '....afzaAbbbaaa....',
    '.....aaaaaaa.......',
  ],
  colors: {
    a: '#000008',
    b: '#e8a781',
    c: '#9e564d',
    d: '#c6745c',
    e: '#a35143',
    f: '#96534a',
    h: '#220b0c',
    i: '#ebad8a',
    j: '#7c4036',
    k: '#a06454',
    l: '#723731',
    m: '#ba6750',
    n: '#3c1f1c',
    p: '#d07a5e',
    q: '#d99878',
    r: '#d4886c',
    s: '#a45849',
    t: '#934640',
    u: '#d27a5c',
    v: '#ae614f',
    w: '#b0624e',
    x: '#ca7a59',
    y: '#220816',
    z: '#9e574b',
    A: '#6a443d',
  },
};
