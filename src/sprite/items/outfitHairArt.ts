// The owner's hair from his three outfits, his pixels at our scale (tools/refs/outfits-hair-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const OUTFIT_HAIR_BASE = '#1c2234';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const OUTFIT_HAIR_KIND: Record<string, 'brown' | 'dark' | 'hair' | 'line' | 'skin' | 'steel'> = {
  '#000116': 'line',
  '#01010d': 'line',
  '#04081c': 'hair',
  '#0d0d29': 'hair',
  '#0e101d': 'hair',
  '#110319': 'dark',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#1c2234': 'hair',
  '#221c1e': 'dark',
  '#2b3244': 'hair',
  '#323338': 'steel',
  '#343b4d': 'hair',
  '#38495e': 'hair',
  '#485063': 'hair',
  '#4f5259': 'steel',
  '#56372e': 'brown',
  '#d29f82': 'skin',
  '#de9d77': 'skin',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const OUTFIT_HAIR_REST: Record<string, [number, number]> = {
  OUTFIT_HAIR: [113, 125],
};

/** His hair: spiky blue-black locks lit in blue-grey, over the brow and the ears. */
export const OUTFIT_HAIR: PaintedPiece = {
  pivot: [10, 14],
  angle: 0.00,
  rows: [
    '.......aaaaaaaa..........',
    '......aabcdbaaaaa........',
    '......aabdbaadbeaaa......',
    '......afedefebbeddfa.....',
    '...aaadddeddhibbbbdaa....',
    '....adbdfdefddbhhefefa...',
    '...aabddbbbeffdddhbdfa...',
    'aaaebbbhhbbbbbbdddbbbba..',
    '...abhhbhhdbbbbbdbhdjheaa',
    '.aadbbdbjdbbdebhbdbhdkbaa',
    'aaabdfbidbhbaebhbddheeaba',
    'albddbbdbhbdadbbddadiidaa',
    'adddbbadbhd...dbd.mabida.',
    'aldada.dbb.....d...aaaba.',
    'aaadan.fbda........aaada.',
    '...aap.dba.......d..ddaaa',
    '...aap..d..........qdda..',
    '..aadr..d...........dfa..',
    '..aaea..d...........daa..',
    '...aea.a............aa...',
    '..aaaaaa...........a.....',
    'aaaaaassad.........a.....',
    '....aasta................',
    '........tt..f....u.......',
  ],
  colors: {
    a: '#000116',
    b: '#2b3244',
    c: '#01010d',
    d: '#141a2a',
    e: '#1c2234',
    f: '#0e101d',
    h: '#485063',
    i: '#343b4d',
    j: '#38495e',
    k: '#04081c',
    l: '#0d0d29',
    m: '#221c1e',
    n: '#d29f82',
    p: '#de9d77',
    q: '#110319',
    r: '#56372e',
    s: '#181822',
    t: '#323338',
    u: '#4f5259',
  },
};
