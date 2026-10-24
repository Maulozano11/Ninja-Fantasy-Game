// The owner's hair on his Ren, his pixels (tools/refs/ren-hair-from-ref.py from
// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** One character per colour of his (both parts share them). */
const NIGHT_HAIR_COLORS: Record<string, string> = {
  a: '#010312',
  b: '#293044',
  c: '#02020c',
  d: '#20283b',
  e: '#010416',
  f: '#1c2337',
  h: '#131826',
  i: '#2d374b',
  j: '#1b2033',
  k: '#171d30',
  l: '#161c29',
  m: '#4c5d75',
  n: '#101422',
  p: '#050b1b',
  q: '#2f3b4e',
  r: '#4c5d71',
  s: '#0a1121',
  t: '#303c52',
  u: '#090d1e',
  v: '#506276',
  w: '#2c3447',
  x: '#373f52',
  y: '#47586a',
  z: '#43546a',
  A: '#3f4f63',
  B: '#435062',
  C: '#3a4658',
  D: '#314053',
  E: '#0a0c1a',
  F: '#cfd4da',
  G: '#231127',
  H: '#080410',
  I: '#c5cdd5',
  J: '#0c0510',
  K: '#110713',
  L: '#25101b',
};

/** Every pixel of his hair, over the head: his blue-greys and his black line. Its pivot is the cell on our face anchor (the near eye's lash row). */
export const NIGHT_HAIR_FRONT: PaintedPart = {
  pivot: [9, 15],
  rows: [
    '........a...a.............',
    '.......abaacdeac..........',
    '......aabafbaaaaaa........',
    '......aabhiaaiiijacc......',
    '...aaakfjfljmiiiiiife.....',
    '....anihplfpfflqrrfsda....',
    '...eaikltiijuhihhlmqfc....',
    '.acjiiivviiiikiivkkiiie...',
    '...aimrwvvjiiiiiikxylzdc..',
    '..afqqniAjtihiiimblBvpCe..',
    '.ccifpiClqvqarwDvihdrfaqa.',
    '.athhqqkimxketlqDllcdxfaca',
    'eklliiakirha.fkhtjahaxjc..',
    '.chijlcliqhc.jalqla.akqa..',
    '.ebEhacliqa.aa.aja.aaate..',
    'aaajc..likaacaa.e.caaaja..',
    '...aa..licaF...c.eG.Hkecc.',
    '...aa..ajc.........IJle...',
    '..aada.af...........Jhc...',
    '....akaaj...........Ka....',
    '...alalac..........Lae....',
    '..acaaaaa..........cc.....',
  ],
  colors: NIGHT_HAIR_COLORS,
};

/** His hair with what his face hides filled in (behind the forehead between his strands, and behind his ear), drawn behind the head; also his head's outline at the top. */
export const NIGHT_HAIR_BACK: PaintedPart = {
  pivot: [9, 15],
  rows: [
    '........a...a.............',
    '.......abaacdeac..........',
    '......aabafbaaaaaa........',
    '......aabhiaaiiijacc......',
    '...aaakfjfljmiiiiiife.....',
    '....anihplfpfflqrrfsda....',
    '...eaikltiijuhihhlmqfc....',
    '.acjiiivviiiikiivkkiiie...',
    '...aimrwvvjiiiiiikxylzdc..',
    '..afqqniAjtihiiimblBvpCe..',
    '.ccifpiClqvqarwDvihdrfaqa.',
    '.athhqqkimxketlqDllcdxfaca',
    'eklliiakirhahfkhtjahaxjc..',
    '.chijlcliqhchjalqlahakqa..',
    '.ebEhacliqakaakajalaaate..',
    'aaajclqlikaacaalelcaaaja..',
    '...aalqlicaF...c.eG.Hkecc.',
    '...aalqajc.........IJle...',
    '..aadaqaf...........Jhc...',
    '....akaaj...........Ka....',
    '...alalac..........Lae....',
    '..acaaaaa..........cc.....',
  ],
  colors: NIGHT_HAIR_COLORS,
};

/** His black line: kept as he drew it when the hair is recoloured. */
export const NIGHT_HAIR_LINE = 'aceH';

/** His middle blue-grey: the colour slot's default; his other colours move as far as it does. */
export const NIGHT_HAIR_BASE = '#293044';
