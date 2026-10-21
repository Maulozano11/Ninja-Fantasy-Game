// The owner's hair on his Aiden, his pixels (tools/refs/valiant-hair-from-ref.py from
// docs/reference/aiden-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** One character per colour of his (both parts share them). */
const VALIANT_HAIR_COLORS: Record<string, string> = {
  a: '#1c070c',
  b: '#20080d',
  c: '#4b1a15',
  d: '#7b3a1c',
  e: '#76391b',
  f: '#af6e35',
  h: '#81401c',
  i: '#471712',
  j: '#3d1511',
  k: '#864722',
  l: '#914e22',
  m: '#602817',
  n: '#431611',
  p: '#572315',
  q: '#925127',
  r: '#965426',
  s: '#5b2514',
  t: '#6f3319',
  u: '#b47235',
  v: '#73351b',
  w: '#7f441d',
  x: '#642a16',
  y: '#551f12',
  z: '#b87337',
  A: '#b06f39',
  B: '#672f17',
  C: '#260a0d',
  D: '#3b1011',
  E: '#220c0e',
  F: '#3f1113',
  G: '#6b3018',
  H: '#180708',
  I: '#2b0b0d',
  J: '#360e0f',
  K: '#130709',
  L: '#070507',
};

/** Every pixel of his hair, over the head: his browns and his black line. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const VALIANT_HAIR_FRONT: PaintedPart = {
  pivot: [9, 14],
  rows: [
    '........a........a.......',
    '.......ba.aaaaaaca.......',
    '......adbaecdfhcab.......',
    '...aaaaeidjklmniciab.....',
    '....aicneidkpmdffqrdbaa..',
    '...aieddnnispiinidcieea..',
    '...btfmpeejjiinidedpjb...',
    '..aclpeudeedevddjduwxya..',
    '..amxnfvdueeeudeunezimcb.',
    '.axmjdeefzeunzAeuBchBacca',
    'aabipeejuyutnikddeCeecaaa',
    '..anddbBhieD..jcdnaidca..',
    '..atiiCxxci....necbiita..',
    '..bcibCBBDE....Fmj.aiGa..',
    '.accH.CIxJ.....jn.JData..',
    '.aHaa..Cm......i....Dia..',
    '...aa..Cn...........Ja...',
    '...axH..i...........H....',
    '...aiKHa.................',
    '....LEma.................',
  ],
  colors: VALIANT_HAIR_COLORS,
};

/** His hair with what his face hides filled in (behind the forehead between the strands of his fringe, and behind his ear), drawn behind the head; also his head's outline at the top. */
export const VALIANT_HAIR_BACK: PaintedPart = {
  pivot: [9, 14],
  rows: [
    '........a........a.......',
    '.......ba.aaaaaaca.......',
    '......adbaecdfhcab.......',
    '...aaaaeidjklmniciab.....',
    '....aicneidkpmdffqrdbaa..',
    '...aieddnnispiinidcieea..',
    '...btfmpeejjiinidedpjb...',
    '..aclpeudeedevddjduwxya..',
    '..amxnfvdueeeudeunezimcb.',
    '.axmjdeefzeunzAeuBchBacca',
    'aabipeejuyutnikddeCeecaaa',
    '..anddbBhieDnijcdnaidca..',
    '..atiiCxxciDnijnecbiita..',
    '..bcibCBBDEDnijFmjcaiGa..',
    '.accHiCIxJiDnijjnjJData..',
    '.aHaaieCm......i....Dia..',
    '...aaieCn...........Ja...',
    '...axHeBi...........H....',
    '...aiKHa.................',
    '....LEma.................',
  ],
  colors: VALIANT_HAIR_COLORS,
};

/** His black line: kept as he drew it when the hair is recoloured. */
export const VALIANT_HAIR_LINE = 'abCEHIKL';

/** His mid brown, the lit face of most locks: the colour slot's default; his other browns follow it. */
export const VALIANT_HAIR_BASE = '#76391b';
