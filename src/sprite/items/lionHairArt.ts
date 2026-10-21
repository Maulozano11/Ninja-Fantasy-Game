// The owner's hair on his Akira, his pixels (tools/refs/akira-hair-from-ref.py from
// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './capeArt';

/** One character per colour of his (both parts share them). */
const LION_HAIR_COLORS: Record<string, string> = {
  a: '#020310',
  b: '#272e40',
  c: '#02010c',
  d: '#121622',
  e: '#293144',
  f: '#020414',
  h: '#141826',
  i: '#090b18',
  j: '#0f111d',
  k: '#323d53',
  l: '#3d4c6a',
  m: '#3c4966',
  n: '#23293b',
  p: '#415071',
  q: '#1d2031',
  r: '#171a2a',
  s: '#41506d',
  t: '#202536',
  u: '#1e2432',
  v: '#0e0c1a',
  w: '#060713',
  x: '#363c5a',
  y: '#373d61',
};

/** Every cell of his hair, over the head: his blue-blacks and his black line. Its pivot is the cell on our face anchor (the near eye's lash start). */
export const LION_HAIR_FRONT: PaintedPart = {
  pivot: [13, 17],
  rows: [
    '...........a....aa..........',
    '......aaaaaa...abba.........',
    '......cddeeba..fbba.........',
    '.......adddbefcbbhdc.aa.....',
    '......faadbdddbbbddaabbaf...',
    '........aihbbdbbbddabbdda...',
    '......fajdikbddddddbbdda....',
    '....aafdbbbedddddddddddf....',
    '...flmlbbdddibbdbddddbbda...',
    '.afaldbbbbbddbbbbbdbhhddha..',
    '..anddbbbpbdbblbbpndpbhhdda.',
    '..nddpqdppdbbdlhblphlbbdaddc',
    '.aarlllhpdbbdfsddpebrbebdfa.',
    '.anabbldbhbbdfbddhbbjdeedda.',
    'fnnabbbhdhbdhdadahbdaddtddf.',
    'annadbhdadbdad.ffhbdafjtudha',
    'adahbbhdfdbhaai..hbda.fatta.',
    'aaahhddaafqa..rvirhw..adfqa.',
    '..aaahda..ja..........ah.aaf',
    '..axyfha..ja..........ah....',
    '...ahaha..j...........ca....',
    '...adahdaf..................',
    '...adaaddf..................',
    '...af..aa...................',
    '...a..cda...................',
    '.......fa...................',
  ],
  colors: LION_HAIR_COLORS,
};

/** His hair with what his forehead hides between the strands of the fringe filled in, drawn behind the head; also his head's outline at the top. */
export const LION_HAIR_BACK: PaintedPart = {
  pivot: [13, 17],
  rows: [
    '...........a....aa..........',
    '......aaaaaa...abba.........',
    '......cddeeba..fbba.........',
    '.......adddbefcbbhdc.aa.....',
    '......faadbdddbbbddaabbaf...',
    '........aihbbdbbbddabbdda...',
    '......fajdikbddddddbbdda....',
    '....aafdbbbedddddddddddf....',
    '...flmlbbdddibbdbddddbbda...',
    '.afaldbbbbbddbbbbbdbhhddha..',
    '..anddbbbpbdbblbbpndpbhhdda.',
    '..nddpqdppdbbdlhblphlbbdaddc',
    '.aarlllhpdbbdfsddpebrbebdfa.',
    '.anabbldbhbbdfbddhbbjdeedda.',
    'fnnabbbhdhbdhdadahbdaddtddf.',
    'annadbhdadbdadbffhbdafjtudha',
    'adahbbhdfdbhaaiddhbdadfatta.',
    'aaahhddaafqahdrvirhwjdadfqa.',
    '..aaahda..ja..........ah.aaf',
    '..axyfha..ja..........ah....',
    '...ahaha..j...........ca....',
    '...adahdaf..................',
    '...adaaddf..................',
    '...af..aa...................',
    '...a..cda...................',
    '.......fa...................',
  ],
  colors: LION_HAIR_COLORS,
};

/** His black line: kept as he drew it when the hair is recoloured. */
export const LION_HAIR_LINE = 'acfiw';

/** His mid blue-black, the face of most locks: the colour slot's default; his other colours follow it. */
export const LION_HAIR_BASE = '#272e40';
