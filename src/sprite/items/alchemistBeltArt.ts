// The alchemist's belt with its buckle, potion vials and satchel: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-belt-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { SkirtPiece } from './aureliaLower';

/** His black line (never recoloured). */
export const ALCH_BELT_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_BELT_BASE: Record<string, string> = {
  leather: '#68493e',
  metal: '#6e6c6c',
  glass: '#0a1920',
  gold: '#a4713e',
};
/** The letters of each slot's colours. */
export const ALCH_BELT_CHARS: Record<string, string> = {
  leather: 'abcdefhij',
  metal: 'lmnpqrst',
  glass: 'uvw',
  gold: 'x',
};

/** The band round the waist (it rides the torso). */
export const ALCH_BELT_BAND: SkirtPiece = {
  rows: [
    '.......................ak.',
    '........kkvvhh.......jcak.',
    '......kkehehvi...eeehjcaak',
    '......kshfchxcccaacehhbabk',
    '......kdipchcecltceeecbcxk',
    '......keacfcrhetwfeehfcfck',
    '.....keencbmueivcchhecchc.',
    'hk..kccccccuwchhecefcxx...',
  ],
  fill: [
    '........................a.',
    '........ev..............a.',
    '......se.................a',
    '......s..................b',
    '......d..................x',
    '......e..................c',
    '.....e....................',
    '.h..c.....................',
  ],
  origin: [111, 163],
  cols: [[111, 163, 111, 171], [124, 163, 124, 171], [137, 163, 137, 171]],
  hang: false,
  openTop: 0,
  front: 0,
  colors: { k: '#000008', a: '#c69c76', b: '#bc8965', c: '#68493e', d: '#414348', e: '#4c3634', f: '#462a28', h: '#342222', i: '#281425', j: '#000518', l: '#fcfeff', m: '#e8fce7', n: '#e1f4e1', p: '#dfded6', r: '#b5bbb9', s: '#7a7a78', t: '#6e6c6c', u: '#3c5a64', v: '#0a1920', w: '#020c10', x: '#a4713e' },
  roles: { a: 'leather', b: 'leather', c: 'leather', d: 'leather', e: 'leather', f: 'leather', h: 'leather', i: 'leather', j: 'leather', l: 'metal', m: 'metal', n: 'metal', p: 'metal', r: 'metal', s: 'metal', t: 'metal', u: 'glass', v: 'glass', w: 'glass', x: 'gold' },
  line: '#000008',
};

/** What hangs from it, swinging a little with the thighs. */
export const ALCH_BELT_HANG: SkirtPiece = {
  rows: [
    'hk..cccccccehccccee.cxx',
    'hk..cccccffhfcc......x.',
    '...khhqcchhhfk.........',
    '...eeeeehfhccx.........',
    '...ffhccefexkx.........',
    '...iifcchfckfk.........',
    '..kvihefhfcck..........',
    '...kvihihkcxk..........',
  ],
  fill: [
    '.h.....................',
    '.h.....................',
    '...h.........f.........',
    '.......................',
    '.......................',
    '.............f.........',
    '..v.........c..........',
    '...v.....c..x..........',
  ],
  origin: [111, 171],
  cols: [[111, 171, 111, 179], [134, 171, 134, 179]],
  hang: true,
  openTop: 0,
  front: 0,
  colors: { k: '#000008', c: '#68493e', e: '#4c3634', f: '#462a28', h: '#342222', i: '#281425', q: '#c2b8b3', v: '#0a1920', x: '#a4713e' },
  roles: { c: 'leather', e: 'leather', f: 'leather', h: 'leather', i: 'leather', q: 'metal', v: 'glass', x: 'gold' },
  line: '#000008',
};
