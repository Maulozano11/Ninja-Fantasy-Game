// The owner's long black hair and braid (hair_hoplite).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-hair-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-hair-from-ref.py src/sprite/items/hopliteHairArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_HAIR_BASE = '#202737';
export const HOPLITE_HAIR_BAND = '#764830';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_HAIR_REST: Record<string, [number, number]> = {
  HOPLITE_HAIR: [110, 123],
  HOPLITE_BRAID: [103, 144],
};

/** His hair: stamped on the face anchor, over the face. */
export const HOPLITE_HAIR: PaintedPiece = {
  pivot: [13, 16],
  angle: -90.00,
  rows: [
    '.....................a..........',
    '.............aaaaaa..aa.........',
    '...........aaabbbbcaaada..aa....',
    '.........aaeeeeebbfhiijfa..a....',
    '........acbcbbfffffhhkifhkaba...',
    '........aaabcbbjejfffjlbbbjha...',
    '.......aabbbbffffeekffcibjjja...',
    '......aabcabbbccfjdkbbbbbhfbcaa.',
    '.....aaaeabbbcjkkcfilabcbbimieia',
    '.......annbbbbimeffaa..abblhfffa',
    '.......annpqqrfjdba.a...asfjffa.',
    '.......atnnqqbcabbi..aaaqqqqjhk.',
    '......aabppppbbabbba..aaqqqqbima',
    '.....aabcbbabbaaaaa.....aaaabmma',
    '.a.aaccmmbaaaaa.........a...aama',
    '.aabbcmfma...aa.............abma',
    '..aabbbba....a..............amma',
    '.aajicbba....a...............aa.',
    '.aaicfbra....aa..............aa.',
    'abbbjbbbba....................a.',
    '.abbcrbbbba.....................',
    '.abbbbbabra.....................',
    '.abbbabbara.....................',
    '.acabbaaaba.....................',
    '.aa.aa...a......................',
  ],
  colors: {
    a: '#010216',
    b: '#202737',
    c: '#172236',
    d: '#38404d',
    e: '#080e20',
    f: '#465262',
    h: '#4c5966',
    i: '#263041',
    j: '#141c2e',
    k: '#101428',
    l: '#2c3845',
    m: '#3a4657',
    n: '#603c2e',
    p: '#7c4d38',
    q: '#22151a',
    r: '#202028',
    s: '#1a1a20',
    t: '#6c4434',
  },
};

/** What each colour of HOPLITE_HAIR is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_HAIR_KIND: Record<string, 'dark' | 'hair' | 'line' | 'navy' | 'warm'> = {
  '#010216': 'line',
  '#080e20': 'dark',
  '#101428': 'dark',
  '#141c2e': 'dark',
  '#172236': 'navy',
  '#1a1a20': 'dark',
  '#202028': 'hair',
  '#202737': 'navy',
  '#22151a': 'dark',
  '#263041': 'navy',
  '#2c3845': 'navy',
  '#38404d': 'navy',
  '#3a4657': 'navy',
  '#465262': 'navy',
  '#4c5966': 'navy',
  '#603c2e': 'warm',
  '#6c4434': 'warm',
  '#7c4d38': 'warm',
};

/** His braid in its bronze bands: stamped on the face anchor, behind the head and shoulders. */
export const HOPLITE_BRAID: PaintedPiece = {
  pivot: [20, -5],
  angle: -90.00,
  rows: [
    '.........aaaaaa.',
    '........aa.abbba',
    '........a.acbdba',
    '.........aeffhha',
    '.......aabibaaaa',
    '......abebba....',
    '......ajbia.....',
    '.....addka......',
    '...aafjja.......',
    '....akjda.......',
    '...akkdda.......',
    '...abbaa........',
    '...ala..........',
    'aaama...........',
    'ahbba...........',
    'anjfa...........',
    'ahhba...........',
    'abba............',
    '.aa.............',
    '.aa.............',
    '..aa............',
  ],
  colors: {
    a: '#010216',
    b: '#202737',
    c: '#465262',
    d: '#172236',
    e: '#2c3845',
    f: '#3a4657',
    h: '#38404d',
    i: '#202028',
    j: '#141c2e',
    k: '#263041',
    l: '#764830',
    m: '#6a3e2c',
    n: '#080e20',
  },
};

/** What each colour of HOPLITE_BRAID is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_BRAID_KIND: Record<string, 'dark' | 'hair' | 'line' | 'navy' | 'warm'> = {
  '#010216': 'line',
  '#080e20': 'dark',
  '#141c2e': 'dark',
  '#172236': 'navy',
  '#202028': 'hair',
  '#202737': 'navy',
  '#263041': 'navy',
  '#2c3845': 'navy',
  '#38404d': 'navy',
  '#3a4657': 'navy',
  '#465262': 'navy',
  '#6a3e2c': 'warm',
  '#764830': 'warm',
};
