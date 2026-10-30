// The owner's hair on his Solen, his pixels (tools/refs/solen-hair-from-ref.py from
// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** One character per colour of his (both parts share them). */
const FOUNDER_HAIR_COLORS: Record<string, string> = {
  a: '#000215',
  b: '#00020f',
  c: '#2b3447',
  d: '#202638',
  e: '#01010b',
  f: '#171b29',
  h: '#313a4d',
  i: '#1c2232',
  j: '#4d5e74',
  k: '#323d52',
  l: '#242a3e',
  m: '#0a0c1b',
  n: '#060916',
  p: '#54657b',
  q: '#151727',
  r: '#171b2e',
  s: '#526377',
  t: '#546880',
  u: '#3b4658',
  v: '#283043',
  w: '#45556c',
  x: '#384255',
  y: '#3f4e64',
  z: '#1b1e31',
  A: '#344154',
};

/** Every pixel of his hair, over the head: his blue-greys and his black line. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const FOUNDER_HAIR_FRONT: PaintedPart = {
  pivot: [10, 15],
  rows: [
    '........a...b.............',
    '.......bcaabdbaa..........',
    '......bbcbdcbaabee........',
    '......aacfhaahhhiaba......',
    '...abbiccffijhhhkhkle.....',
    '....abhhmldniifkppdmlb....',
    '...bahhhkhhiinhqfrphla....',
    '.barhhhsphkhhihhprqhkhb...',
    '...ahpphptdhhhhhhfurrsvb..',
    '..bdhhqhwikhrhhhpcrkpaxb..',
    '.abhrnhyfhphathhpcqdpdbka.',
    '.auffkkfhpkiakzkkfqbdxibba',
    'brrrhharhpfb.rrfArbbauia..',
    '.bfhiibfhhrb.rbrhrb.bikb..',
    '.bbaibbfhhb.bb.afe.aaakb..',
    'aabci..fhrb.....b...aara..',
    '...bb..fhaa.........azaba.',
    '...aa..ara..........bra...',
    '..bbfb.br...........bfb...',
    '....aieai...........ab....',
    '....abrba.................',
  ],
  colors: FOUNDER_HAIR_COLORS,
};

/** His hair with what his face hides filled in (behind the forehead between the strands of his fringe, and behind his ear), drawn behind the head; also his head's outline at the top. */
export const FOUNDER_HAIR_BACK: PaintedPart = {
  pivot: [10, 15],
  rows: [
    '........a...b.............',
    '.......bcaabdbaa..........',
    '......bbcbdcbaabee........',
    '......aacfhaahhhiaba......',
    '...abbiccffijhhhkhkle.....',
    '....abhhmldniifkppdmlb....',
    '...bahhhkhhiinhqfrphla....',
    '.barhhhsphkhhihhprqhkhb...',
    '...ahpphptdhhhhhhfurrsvb..',
    '..bdhhqhwikhrhhhpcrkpaxb..',
    '.abhrnhyfhphathhpcqdpdbka.',
    '.auffkkfhpkiakzkkfqbdxibba',
    'brrrhharhpfbrrrfArbbauia..',
    '.bfhiibfhhrbrrbrhrbdbikb..',
    '.bbaibbfhhbibbraferaaakb..',
    'aabciikfhrb.....b...aara..',
    '...bbikfhaa.........azaba.',
    '...aaikara..........bra...',
    '..bbfbkbr...........bfb...',
    '....aieai...........ab....',
    '....abrba.................',
  ],
  colors: FOUNDER_HAIR_COLORS,
};

/** His black line: kept as he drew it when the hair is recoloured. */
export const FOUNDER_HAIR_LINE = 'abemnq';

/** His mid blue-grey, the lit face of most locks: the colour slot's default; his other colours follow it. */
export const FOUNDER_HAIR_BASE = '#313a4d';
