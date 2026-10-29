// The owner's tactical outfit: the armoured vest, his pixels at our scale (tools/refs/vanguard-vest-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const VANGUARD_VEST_CLOTH = '#323338';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const VANGUARD_VEST_KIND: Record<string, 'dark' | 'hair' | 'line' | 'skin' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#0e101d': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#1e1e2a': 'hair',
  '#212227': 'dark',
  '#2c2b31': 'dark',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#45484f': 'steel',
  '#4a4646': 'steel',
  '#4f5259': 'steel',
  '#575c62': 'steel',
  '#6a7179': 'steel',
  '#874c4a': 'skin',
  '#90959b': 'steel',
  '#a4a9ac': 'steel',
  '#bb7961': 'skin',
  '#de9d77': 'skin',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const VANGUARD_VEST_REST: Record<string, [number, number]> = {
  VANGUARD_VEST_TORSO: [112, 146],
};

/** His armoured vest: the collar, the mesh panels and the plates. It rides the torso about the neck. */
export const VANGUARD_VEST_TORSO: PaintedPiece = {
  pivot: [15, 1],
  angle: -89.65,
  rows: [
    '..aaa..................',
    '....................ba.',
    '.....ccdaabb.......daaa',
    '....aebbbaabaffhhaeabba',
    '.....aijjbkaaffllhabmba',
    '.....kajmmdcaaaaaacncca',
    '.....kadccaaacccccaadca',
    '.....kacncbcbppepakkkma',
    '.....kacabcbcbdkpkbbcja',
    '....akaaddbcbcbcekbcbja',
    '....ajaacbcbcbcbpkcbc.a',
    '....aaaadcbcbccbpejcb..',
    '..eaaaeajdcbcbbkeeebc..',
    '.eeaaaeeeeaabaaabbeaaa.',
    '.eaaeeabjiaadabpppeaaa.',
    'aaaaaappaaqbjjeeebeaba.',
    '.aaakkkcrsaejebebebea..',
    '...akkkddtaeebebebeba..',
    '....akkddbaeeebebebea..',
    '....aaaaadcabbebebbea..',
    '....akkbddciiebeeeiua.a',
    '....aekkdbkaekkbbbiuabv',
    '..aaaapkkkkkpeiiiiiaaaa',
    '.....aaaaaaaaaaaaaaaaa.',
  ],
  colors: {
    a: '#000116',
    b: '#323338',
    c: '#45484f',
    d: '#3b3c40',
    e: '#181822',
    f: '#de9d77',
    h: '#874c4a',
    i: '#141a2a',
    j: '#212227',
    k: '#2c2b31',
    l: '#bb7961',
    m: '#575c62',
    n: '#4f5259',
    p: '#0e101d',
    q: '#90959b',
    r: '#4a4646',
    s: '#a4a9ac',
    t: '#6a7179',
    u: '#1e1e2a',
    v: '#00011f',
  },
};
