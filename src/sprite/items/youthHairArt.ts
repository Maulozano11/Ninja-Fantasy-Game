// The owner's hair on his Joven salvaje, his pixels (tools/refs/youth-hair-from-ref.py from
// docs/reference/joven-salvaje-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** One character per colour of his (both parts share them). */
const YOUTH_HAIR_COLORS: Record<string, string> = {
  a: '#000000',
  b: '#1d1b28',
  c: '#33333d',
  d: '#576676',
  e: '#596a79',
  f: '#030304',
  h: '#2f2d38',
  i: '#40444f',
  j: '#434753',
  k: '#373540',
  l: '#3c3c46',
  m: '#22202d',
  n: '#191824',
  p: '#2b2934',
};

/** Every pixel of his hair, over the head: his colours and his line. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const YOUTH_HAIR_FRONT: PaintedPart = {
  pivot: [16, 21],
  rows: [
    '.................aaaaaaa..........',
    '.................abbcca...........',
    '...............aacdccba...........',
    '.............aabceccba............',
    '............abbcdccba....aaaa.....',
    '...........abbcecccbf..aabbbbaa...',
    '.....a.....abcdccccbbaabbcedccba..',
    '.....a....abbcdcccbbbbbcedcccbbbf.',
    '....aa..aabbbccccbbbccddccbbbaaaa.',
    '....ahaabbcbbccbbbcccccccbbaa.....',
    '...fbcbbcbcccccbbcccccbbbaaaa.....',
    '...abbccbccccccccccccccccccbba....',
    '...abbbbhdbcccccccbbccdcceecbbf...',
    '...aabbcdcbcdccbccdcbbhdcbcidcba..',
    '..abbbcdcbbecjcbbccecbbcecbccccbf.',
    '.abbbbccbbdccdbabbccdcbbcdcbbbccba',
    'aabbbkbcbbcbdhbaabbbblcabhdbabbcca',
    '..fbbbmcbbbbdna..aaaabcaabccbaaapa',
    '...abbbcbbablna......fpa.abcba..aa',
    '...abbbbbbabca........aa..abba..aa',
    '....abbbbaabba.........a...aba....',
    '....abbba..fba.............aaa....',
    '.....abba...aa............aaaa....',
    '.....abba...aa.............a.a....',
    '......aba....a....................',
    '.......a.a........................',
    '........a.a.......................',
    '........aa........................',
  ],
  colors: YOUTH_HAIR_COLORS,
};

/** His hair with what his face hides filled in, drawn behind the head; also his head's outline at the top. */
export const YOUTH_HAIR_BACK: PaintedPart = {
  pivot: [16, 21],
  rows: [
    '.................aaaaaaa..........',
    '.................abbcca...........',
    '...............aacdccba...........',
    '.............aabceccba............',
    '............abbcdccba....aaaa.....',
    '...........abbcecccbf..aabbbbaa...',
    '.....a.....abcdccccbbaabbcedccba..',
    '.....a....abbcdcccbbbbbcedcccbbbf.',
    '....aa..aabbbccccbbbccddccbbbaaaa.',
    '....ahaabbcbbccbbbcccccccbbaa.....',
    '...fbcbbcbcccccbbcccccbbbaaaa.....',
    '...abbccbccccccccccccccccccbba....',
    '...abbbbhdbcccccccbbccdcceecbbf...',
    '...aabbcdcbcdccbccdcbbhdcbcidcba..',
    '..abbbcdcbbecjcbbccecbbcecbccccbf.',
    '.abbbbccbbdccdbabbccdcbbcdcbbbccba',
    'aabbbkbcbbcbdhbaabbbblcabhdbabbcca',
    '..fbbbmcbbbbdnabbaaaabcaabccbaaapa',
    '...abbbcbbablnabbbbbbfpababcba..aa',
    '...abbbbbbabcabbbbbbbbaabbabba..aa',
    '....abbbbaabbabbbbbbbbpabbbaba....',
    '....abbbabbfbabbbbbbbbpbbbbaaa....',
    '.....abbabbbaa............aaaa....',
    '.....abbabbbaa.............a.a....',
    '......ababbbba....................',
    '.......ababbbn....................',
    '........ababbn....................',
    '........aab.bn....................',
  ],
  colors: YOUTH_HAIR_COLORS,
};

/** His black line: kept as he drew it when the hair is recoloured. */
export const YOUTH_HAIR_LINE = 'af';

/** His colour of middle lightness: the colour slot's default; his other colours follow it. */
export const YOUTH_HAIR_BASE = '#2f2d38';
