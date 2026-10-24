// The owner's head on his navy officer, the owner's pixels at our scale (tools/refs/navy-head-from-ref.py from
// docs/reference/navy-officer-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from './painted';

/** The skin colour he painted him in: a player's skin moves every colour of it as far. */
export const NAVY_SKIN = '#da9a74';

/** How far his head stands above ours on a male body (fine pixels): where his picture has it (romanNeck.ts headUp). */
export const NAVY_HEAD_UP = 3;

/** The owner's head (the 'navy' face shape), his pixels at our scale: his face, ear, jaw, brows and mouth, his skin shading and black line, and our skull continued in his skin under his hair; the eye options draw the eyes on it. Its pivot is the cell on the face anchor. */
export const NAVY_HEAD: PaintedPiece = {
  pivot: [7, 12],
  angle: 0.00,
  rows: [
    '.....aaaaaaaa.......',
    '...aabbbbbbbbaa.....',
    '..abbbbbbbbbbbba....',
    '..bbbbbbbbbbbbbba...',
    '..bbbbbbbbbbbbbba...',
    '.bbbbbbbbbbbbbbbba..',
    'abbbbbbccbadaaabca..',
    'abbbbbbbaaddebdabfa.',
    '.bbbbbaaahebbbbibaa.',
    '.bbbbbbajkbbbbbdabda',
    '.blmaanajaaabbbbbeda',
    '..aabanajpqaacbbbaaa',
    '..aakrlaepqbbcdblbba',
    '..aaesdabdqbbtbbubb.',
    '...aavddbbbbbbbbsba.',
    '...aaaadbbbbbbbbbba.',
    '...aaaaddbbbbbbdwba.',
    '......aakbbbbbjjuaa.',
    '.......aadbbbbbbbaa.',
    '.......aaaebbbkbia..',
    '........ajaxbbbaa...',
    '.........aaaaaa.....',
  ],
  colors: {
    a: '#000316',
    b: '#da9a74',
    c: '#5d4035',
    d: '#aa684d',
    e: '#d8956c',
    f: '#9d6048',
    h: '#b4694d',
    i: '#bb7454',
    j: '#985644',
    k: '#b17154',
    l: '#291a21',
    m: '#1c1119',
    n: '#32201e',
    p: '#7e5044',
    q: '#8a584c',
    r: '#7d3f36',
    s: '#874d40',
    t: '#905242',
    u: '#b77861',
    v: '#dda37c',
    w: '#723737',
    x: '#4e222a',
  },
};
