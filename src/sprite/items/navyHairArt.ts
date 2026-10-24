// The owner's hair on his navy officer, the owner's pixels at our scale (tools/refs/navy-hair-from-ref.py from
// docs/reference/navy-officer-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NAVY_HAIR_BASE = '#32201e';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const NAVY_HAIR_KIND: Record<string, 'hair' | 'line'> = {
  '#000316': 'line',
  '#14141e': 'hair',
  '#1c1119': 'hair',
  '#1e111a': 'hair',
  '#1e1412': 'hair',
  '#291a21': 'hair',
  '#32201e': 'hair',
  '#39252a': 'hair',
  '#412b2e': 'hair',
  '#4f3332': 'hair',
  '#5a3d32': 'hair',
  '#5d4035': 'hair',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NAVY_HAIR_REST: Record<string, [number, number]> = {
  NAVY_HAIR_BACK: [116, 122],
  NAVY_HAIR_FRONT: [116, 122],
};

/** His hair with what his face hides filled in, drawn behind the head. Its pivot is the cell on the face anchor. */
export const NAVY_HAIR_BACK: PaintedPiece = {
  pivot: [7, 14],
  angle: 0.00,
  rows: [
    '......aa.aaaa....aa....',
    '.....abaabcbaaaaada....',
    '.....aedfbcccdddbaa....',
    '..aaahihbchbcddfcchaaa.',
    '..abbbaabbbcbhbbjbffha.',
    '..abbhbbakdhjccccjhia..',
    '..abdjjcbabjhbbchdhhha.',
    '.abbbbcbbbabaabdjcbaaa.',
    'abbhbbbbbdbbhbbhjcbjbba',
    'aabbbalhbdbbhbbhmcbhba.',
    '.ahhhalhbdbbhbbhjcbhaa.',
    '.ahhhhhhbdbbhbbhjcbhaa.',
    '.ahhhhhhbdbbhbbhjcbh.a.',
    '..hhhhhhbdbbhbbhjcbh...',
    '..hhhhhhbdbbhbbhjcbh...',
  ],
  colors: {
    a: '#000316',
    b: '#32201e',
    c: '#5d4035',
    d: '#5a3d32',
    e: '#1c1119',
    f: '#4f3332',
    h: '#291a21',
    i: '#14141e',
    j: '#1e1412',
    k: '#1e111a',
    l: '#39252a',
    m: '#412b2e',
  },
};

/** His hair over the head, his line included. Its pivot is the cell on the face anchor. */
export const NAVY_HAIR_FRONT: PaintedPiece = {
  pivot: [7, 14],
  angle: 0.00,
  rows: [
    '......aa.aaaa....aa....',
    '.....abaabcbaaaaada....',
    '.....aedfbcccdddbaa....',
    '..aaahihbchbcddfcchaaa.',
    '..abbbaabbbcbhbbjbffha.',
    '..abbhbbakdhjccccjhia..',
    '..abdjjcbabjhbbchdhhha.',
    '.abbbbcbbbabaabdjcbaaa.',
    'abbhbbb..d.....h..bjbba',
    'aabbbalh........m..hba.',
    '.ahhha..........j..haa.',
    '.ahhhhh.............aa.',
    '.a...................a.',
  ],
  colors: {
    a: '#000316',
    b: '#32201e',
    c: '#5d4035',
    d: '#5a3d32',
    e: '#1c1119',
    f: '#4f3332',
    h: '#291a21',
    i: '#14141e',
    j: '#1e1412',
    k: '#1e111a',
    l: '#39252a',
    m: '#412b2e',
  },
};
