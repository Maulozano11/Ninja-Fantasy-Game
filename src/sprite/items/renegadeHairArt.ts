// The owner's spiky hair on his Renegade, his pixels (tools/refs/renegade-hair-from-ref.py from
// docs/reference/renegade-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** His mid brown, the lit face of most of his spikes: recoloured, every other brown of his moves the way it does. */
export const RENEGADE_HAIR_BASE = '#5b3b22';

/** His black line's characters: they keep their colour when the hair is recoloured. */
export const RENEGADE_HAIR_LINE = 'ahw';

/** One character per colour of his (both parts share them). */
const RENEGADE_HAIR_COLORS: Record<string, string> = {
  a: '#000000',
  b: '#613e23',
  c: '#5c3c22',
  d: '#86643b',
  e: '#391c15',
  f: '#3d1f17',
  h: '#040302',
  i: '#7e5d38',
  j: '#82603a',
  k: '#56341f',
  l: '#47281a',
  m: '#583921',
  n: '#6e483e',
  p: '#69453c',
  q: '#875e4c',
  r: '#8c5f4e',
  s: '#8c564b',
  t: '#4c2e23',
  u: '#422118',
  v: '#92584c',
  w: '#2f050c',
};

/** Every pixel of his hair, over the head: his spikes, the shaved side, his brows and his black line. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const RENEGADE_HAIR_FRONT: PaintedPart = {
  pivot: [11, 18],
  rows: [
    '...............a...........',
    '...........aa.aba..........',
    '.......aa.acaaada...aaaa...',
    '......aefhbaebicfaaabca....',
    '....hh.acedecdbbafbidea....',
    '...aeehfbccfjcbfeijbeaaaa..',
    '...aadkfbcebbbiedbbecidcba.',
    '..hlmmdfecebebbcdbemdbefaaa',
    '...afekbffecfbebcfbimfea...',
    '..abbfeefnfffcebeebbebea...',
    'ahdicbennpnneefbeccebbcfa..',
    '.afbbfnpqqqnpnfefceeaaama..',
    '..aeefnqqqr.....ffee.a.ea..',
    '.aecennrqq...........saha..',
    '.abceprrr..................',
    'aebfepqrr..................',
    '.afffttrq..ue..............',
    '..aea..pr....ef.....bua....',
    '..aea...r.v..afef...aa.....',
    '.affa.........w............',
    'aaafea.....................',
    '..aeaea....................',
    '...acffa...................',
    '..aabfaa...................',
    '....aaa....................',
  ],
  colors: RENEGADE_HAIR_COLORS,
};

/** His hair with what his face hides filled in (behind the forehead), drawn behind the head; also his head's outline at the top. */
export const RENEGADE_HAIR_BACK: PaintedPart = {
  pivot: [11, 18],
  rows: [
    '...............a...........',
    '...........aa.aba..........',
    '.......aa.acaaada...aaaa...',
    '......aefhbaebicfaaabca....',
    '....hh.acedecdbbafbidea....',
    '...aeehfbccfjcbfeijbeaaaa..',
    '...aadkfbcebbbiedbbecidcba.',
    '..hlmmdfecebebbcdbemdbefaaa',
    '...afekbffecfbebcfbimfea...',
    '..abbfeefnfffcebeebbebea...',
    'ahdicbennpnneefbeccebbcfa..',
    '.afbbfnpqqqnpnfefceeaaama..',
    '..aeefnqqqrnpnfeffeeba.ea..',
    '.aecennrqqrnpnfeffeebsaha..',
    '.abceprrrqrnpnfeffeebsa....',
    'aebfepqrrqrnpnfeffeebsa....',
    '.afffttrqqruenfeffeebsa....',
    '..aeattprqrueefeffeebua....',
    '..aea...r.v..afef...aa.....',
    '.affa.........w............',
    'aaafea.....................',
    '..aeaea....................',
    '...acffa...................',
    '..aabfaa...................',
    '....aaa....................',
  ],
  colors: RENEGADE_HAIR_COLORS,
};
