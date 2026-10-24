// The sorceress's crimson sash tied at the hip, its ends hanging: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-sorceress-sash-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { SkirtPiece } from './aureliaLower';

/** His black line (never recoloured). */
export const NIGHT_SASH_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const NIGHT_SASH_BASE: Record<string, string> = {
  sash: '#3f142f',
};
/** The letters of each slot's colours. */
export const NIGHT_SASH_CHARS: Record<string, string> = {
  sash: 'abcdefhijlmnpqrstuv',
};

/** The band round the waist (it rides the torso). */
export const NIGHT_SASH_BAND: SkirtPiece = {
  rows: [
    '..kk.............',
    '..qnkj...........',
    '..tnjqik.......j.',
    'kqnqmunuqck...sjj',
    '.kunjuqqtuvquknii',
    '...kurkffnjssuraa',
  ],
  fill: [
    '..qn.............',
    '....j............',
    '.......i.........',
    'q.........c......',
    '.u...........n...',
    '...u..f..........',
  ],
  origin: [117, 164],
  cols: [[117, 164, 117, 170], [125, 164, 125, 170], [134, 164, 134, 170]],
  hang: false,
  openTop: 0,
  front: 0,
  colors: { k: '#000008', a: '#6e2e4c', c: '#682a46', f: '#642044', i: '#5a1d37', j: '#521a3a', m: '#52142e', n: '#481632', q: '#3f142f', r: '#34122d', s: '#321224', t: '#3c0a2e', u: '#370a26', v: '#2e0624' },
  roles: { a: 'sash', c: 'sash', f: 'sash', i: 'sash', j: 'sash', m: 'sash', n: 'sash', q: 'sash', r: 'sash', s: 'sash', t: 'sash', u: 'sash', v: 'sash' },
  line: '#000008',
};

/** What hangs from it, swinging a little with the thighs. */
export const NIGHT_SASH_HANG: SkirtPiece = {
  rows: [
    'kt..kkrrk......',
    '......kuu......',
    '......turq.....',
    '.....knrqk.....',
    '.....eisurk....',
    '.....duqkijj...',
    '.....cmk.kehh..',
    '.....cqk.kbbb..',
    '.....fnnk.ibk..',
    '.....jbql.pjk..',
    '.....nbqn.lbb..',
    '.....nbuk..ik..',
    '.....bmsk..nk..',
    '.....cck...rd..',
    '.....kk.....mk.',
    '............rk.',
    '............kb.',
    '.............kk',
    '.............rk',
    '.............rk',
    '.............k.',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '..........qq...',
    '...........q...',
    '...........q...',
  ],
  fill: [
    't...rr..r......',
    '......u........',
    '...............',
    '.....n...q.....',
    '..........r....',
    '........i......',
    '.......m.e.....',
    '.......q.b.....',
    '........n...b..',
    '............j..',
    '...............',
    '........u...i..',
    '........s...n..',
    '.......c.......',
    '.....cc......m.',
    '.............r.',
    '............b..',
    '.............rr',
    '..............r',
    '..............r',
    '.............r.',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
  ],
  origin: [125, 170],
  cols: [[125, 170, 125, 201], [140, 170, 140, 201]],
  hang: true,
  openTop: 0,
  front: 0,
  colors: { k: '#000008', b: '#742944', c: '#682a46', d: '#6c263d', e: '#5c2646', f: '#642044', h: '#542242', i: '#5a1d37', j: '#521a3a', l: '#422034', m: '#52142e', n: '#481632', p: '#3a1c30', q: '#3f142f', r: '#34122d', s: '#321224', t: '#3c0a2e', u: '#370a26' },
  roles: { b: 'sash', c: 'sash', d: 'sash', e: 'sash', f: 'sash', h: 'sash', i: 'sash', j: 'sash', l: 'sash', m: 'sash', n: 'sash', p: 'sash', q: 'sash', r: 'sash', s: 'sash', t: 'sash', u: 'sash' },
  line: '#000008',
};
