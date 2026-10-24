// The owner's armoured outfit: the plate cuirass and the shoulder plates, his pixels at our scale (tools/refs/warden-plate-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const WARDEN_PLATE_STEEL = '#3b3c40';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const WARDEN_PLATE_KIND: Record<string, 'dark' | 'hair' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#01010d': 'line',
  '#0e101d': 'hair',
  '#181822': 'dark',
  '#212227': 'dark',
  '#2c2b31': 'dark',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#45484f': 'steel',
  '#4f5259': 'steel',
  '#575c62': 'steel',
  '#63686e': 'steel',
  '#6a7179': 'steel',
  '#737c7f': 'steel',
  '#7d8286': 'steel',
  '#898c93': 'steel',
  '#959ea0': 'steel',
  '#a4a9ac': 'steel',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const WARDEN_PLATE_REST: Record<string, [number, number]> = {
  WARDEN_PLATE_TORSO: [115, 147],
  WARDEN_PLATE_SHOULDER_N: [107, 145],
  WARDEN_PLATE_SHOULDER_F: [131, 146],
};

/** His cuirass: the gorget, the chest plates and the segmented belly, from his collar to the belt. It rides the torso about the neck. */
export const WARDEN_PLATE_TORSO: PaintedPiece = {
  pivot: [12, 0],
  angle: -89.65,
  rows: [
    '................a...',
    '....ab..........a...',
    '.....cadde....afaa..',
    '.....ahiidjklajmd...',
    '.....ajmnadfffcid...',
    '....pidqkqaadciaf...',
    '....adddqjjhaaajk...',
    '...aaddqqqjjjfikj...',
    '...aqccqqqqqjfijq...',
    '.aaaiccqqqqqqfieqq..',
    '.aaamiqqqqqqehmeqci.',
    '.aaiaiiqkkkqdaaaiqf.',
    'aaiiiaiiiiiijqmfaima',
    '.mmiddcaadhhhhmfqcia',
    '.miidccjidqqqaaacina',
    '.iniddjaidddqqifaina',
    'aidjjaaaaadqqqdfqaaa',
    '.aaaaaicaidqcdrcdaaa',
    '.anniicipiddddncdaia',
    '.aniqqqiaaaahcicaaaa',
    '.aaaaaa.........a...',
  ],
  colors: {
    a: '#000116',
    b: '#01010d',
    c: '#3b3c40',
    d: '#323338',
    e: '#6a7179',
    f: '#575c62',
    h: '#4f5259',
    i: '#2c2b31',
    j: '#63686e',
    k: '#737c7f',
    l: '#7d8286',
    m: '#212227',
    n: '#181822',
    p: '#00011f',
    q: '#45484f',
    r: '#0e101d',
  },
};

/** His near shoulder plate. It rides the near shoulder. */
export const WARDEN_PLATE_SHOULDER_N: PaintedPiece = {
  pivot: [1, 9],
  angle: 98.75,
  rows: [
    '.......a......',
    '....aa........',
    '...abcdeeb....',
    '..accdffhdijak',
    '.aicdlfhdcmch.',
    'anniedddccmmea',
    'acemmcccmmmmea',
    'aaaadiimmmmmp.',
    'annmadcqmmmea.',
    'a......a.ceaa.',
    '........aaaa..',
  ],
  colors: {
    a: '#000116',
    b: '#4f5259',
    c: '#575c62',
    d: '#6a7179',
    e: '#63686e',
    f: '#a4a9ac',
    h: '#737c7f',
    i: '#45484f',
    j: '#181822',
    k: '#01010d',
    l: '#959ea0',
    m: '#3b3c40',
    n: '#323338',
    p: '#00011f',
    q: '#2c2b31',
  },
};

/** His far shoulder plate, beside the chest. It rides the far shoulder. */
export const WARDEN_PLATE_SHOULDER_F: PaintedPiece = {
  pivot: [5, 7],
  angle: 71.57,
  rows: [
    '..a......',
    'abca.....',
    'addeaa...',
    'aafhbca..',
    '.iahdca..',
    '.jacdcca.',
    '.bjbkkkka',
    '.bjajdkka',
    '.bjaakkla',
    '.bjdaalka',
    '..jdaaaa.',
    '....a....',
  ],
  colors: {
    a: '#000116',
    b: '#45484f',
    c: '#575c62',
    d: '#2c2b31',
    e: '#737c7f',
    f: '#0e101d',
    h: '#898c93',
    i: '#212227',
    j: '#323338',
    k: '#3b3c40',
    l: '#00011f',
  },
};
