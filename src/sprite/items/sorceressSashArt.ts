// The sorceress's crimson sash tied at the hip, its ends hanging: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-sorceress-sash-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { SkirtPiece } from './aureliaLower';

/** His black line (never recoloured). */
export const NIGHT_SASH_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const NIGHT_SASH_BASE: Record<string, string> = {
  sash: '#521a3a',
};
/** The letters of each slot's colours. */
export const NIGHT_SASH_CHARS: Record<string, string> = {
  sash: 'abcde',
};

/** The band round the waist (it rides the torso). */
export const NIGHT_SASH_BAND: SkirtPiece = {
  rows: [
    '..kk.............',
    '..ddkc...........',
    '..ddccbk.......c.',
    'kdddcabbbak...ccc',
    '.kddcccbbccddkccc',
    '...kddkbcccceecaa',
  ],
  fill: [
    '..dd.............',
    '....c............',
    '.......b.........',
    'd.........a......',
    '.d...........c...',
    '...d..b..........',
  ],
  origin: [117, 164],
  cols: [[117, 164, 117, 170], [125, 164, 125, 170], [134, 164, 134, 170]],
  hang: false,
  openTop: 0,
  front: 0,
  colors: { k: '#000008', a: '#742944', b: '#5c2646', c: '#521a3a', d: '#3f142f', e: '#321224' },
  roles: { a: 'sash', b: 'sash', c: 'sash', d: 'sash', e: 'sash' },
  line: '#000008',
};

/** What hangs from it, swinging a little with the thighs. */
export const NIGHT_SASH_HANG: SkirtPiece = {
  rows: [
    'kd..kkddk......',
    '......ked......',
    '......dedd.....',
    '.....kceck.....',
    '.....bcdcck....',
    '.....abdkccc...',
    '.....aak.kbbb..',
    '.....aak.kaaa..',
    '.....back.bak..',
    '.....caca.cck..',
    '.....cacb.dba..',
    '.....badk..bk..',
    '.....aadk..ck..',
    '.....aak...db..',
    '.....kk.....ck.',
    '............dk.',
    '............kb.',
    '.............kk',
    '.............dk',
    '.............dk',
    '.............k.',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '..........dd...',
    '...........d...',
    '...........d...',
  ],
  fill: [
    'd...dd..d......',
    '......e........',
    '...............',
    '.....c...c.....',
    '..........c....',
    '........c......',
    '.......a.b.....',
    '.......a.a.....',
    '........c...a..',
    '............c..',
    '...............',
    '........d...b..',
    '........d...c..',
    '.......a.......',
    '.....aa......c.',
    '.............d.',
    '............b..',
    '.............dd',
    '..............d',
    '..............d',
    '.............d.',
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
  colors: { k: '#000008', a: '#742944', b: '#5c2646', c: '#521a3a', d: '#3f142f', e: '#321224' },
  roles: { a: 'sash', b: 'sash', c: 'sash', d: 'sash', e: 'sash' },
  line: '#000008',
};
