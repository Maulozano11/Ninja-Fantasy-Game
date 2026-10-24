// The owner's hair on his Roman, his pixels (tools/refs/roman-hair-from-ref.py from
// docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** One character per colour of his (both parts share them). */
const ROMAN_HAIR_COLORS: Record<string, string> = {
  a: '#040614',
  b: '#00020f',
  c: '#03051a',
  d: '#2a3547',
  e: '#20263a',
  f: '#252c40',
  h: '#526272',
  i: '#5b6e7d',
  j: '#3a4558',
  k: '#1d2635',
  l: '#202c3c',
  m: '#0e1629',
  n: '#374353',
  p: '#04071e',
  q: '#0b1226',
  r: '#131c2f',
  s: '#333d4d',
  t: '#596a7c',
  u: '#546a7d',
  v: '#171e31',
  w: '#1b2033',
  x: '#3a4a5a',
  y: '#404c5c',
  z: '#131929',
  A: '#4b5869',
  B: '#2e3648',
  C: '#5e6f81',
  D: '#263241',
  E: '#445060',
  F: '#070d23',
  G: '#313e51',
  H: '#576676',
  I: '#445264',
  J: '#020214',
  K: '#2c394c',
  L: '#10182d',
  M: '#1d2431',
  N: '#1c2739',
  O: '#060214',
  P: '#262c3c',
  Q: '#000616',
};

/** Every pixel of his hair, over the head: his blue-blacks and greys and his black line. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const ROMAN_HAIR_FRONT: PaintedPart = {
  pivot: [10, 13],
  rows: [
    '........a................',
    '.......ba.bccaaccac......',
    '......cdaaefhiijklc......',
    '...acccdmenhheekepcc.....',
    '....almqrjrsrejttutjbac..',
    '....brnkvrvrrrwwkexelc...',
    '...aeyvjrxjrrnkkxjvheea..',
    '..bzxrAzjjvxjrxeetvBCnb..',
    '.acDrEFGHrItvjipeiEctvBa.',
    'bJfcvkqtvHiwjisaeIfaftpDb',
    '.ackkceepKhceyc.aEvaLjFb.',
    '..bMcNecvGdcka..Jda.awka.',
    '.aeace..vscca...ab..aaea.',
    '.afck....nc..ca.O..a.cea.',
    'aacfk....l...........ca..',
    '..cfa....aa..........aa..',
    '..bPa.....p...........b..',
    '...cceQ..................',
    '...afakJ.................',
    '....aJk..................',
    '......b..................',
  ],
  colors: ROMAN_HAIR_COLORS,
};

/** His hair with what his face hides filled in (behind the forehead between the strands of his fringe, and behind his ear), drawn behind the head; also his head's outline at the top. */
export const ROMAN_HAIR_BACK: PaintedPart = {
  pivot: [10, 13],
  rows: [
    '........a................',
    '.......ba.bccaaccac......',
    '......cdaaefhiijklc......',
    '...acccdmenhheekepcc.....',
    '....almqrjrsrejttutjbac..',
    '....brnkvrvrrrwwkexelc...',
    '...aeyvjrxjrrnkkxjvheea..',
    '..bzxrAzjjvxjrxeetvBCnb..',
    '.acDrEFGHrItvjipeiEctvBa.',
    'bJfcvkqtvHiwjisaeIfaftpDb',
    '.ackkceepKhceyceaEvaLjFb.',
    '..bMcNecvGdckaseJdaBawka.',
    '.aeaceeevsccayseabvBaaea.',
    '.afckeeevncwkcaeOdvaLcea.',
    'aacfkeeevl...........ca..',
    '..cfaeeevaa..........aa..',
    '..bPaeeev.p...........b..',
    '...cceQ..................',
    '...afakJ.................',
    '....aJk..................',
    '......b..................',
  ],
  colors: ROMAN_HAIR_COLORS,
};

/** The shadow his locks cast on his forehead, in his skin's colours (he painted it in the head's skin): drawn on the head, it follows the character's skin. */
export const ROMAN_HAIR_SHADE: PaintedPart = {
  pivot: [-1, 3],
  rows: [
    '....a',
    '...bc',
    '..d..',
    'ef...',
  ],
  colors: {
    a: '#a65e56',
    b: '#c67a64',
    c: '#a85d50',
    d: '#b3675a',
    e: '#a05d54',
    f: '#864a49',
  },
};

/** His black line: kept as he drew it when the hair is recoloured. */
export const ROMAN_HAIR_LINE = 'abcpqFJOQ';

/** His blue of middle lightness: the colour slot's default; his other colours follow it. */
export const ROMAN_HAIR_BASE = '#202c3c';
