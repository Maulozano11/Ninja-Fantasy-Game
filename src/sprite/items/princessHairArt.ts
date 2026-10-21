// The princess's hair and tiara, the owner's picture at our game scale, his pixels (tools/refs/
// princess-hair-from-ref.py from docs/reference/princess-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** A piece riding the face anchor: `pivot` is the cell on it (body.ts faceAnchor (ex, ny)). */
export interface PrincessFacePart {
  pivot: [number, number];
  rows: string[];
  colors: Record<string, string>;
}

/** One character per colour of his (all the hair pieces share them). */
export const PRINCESS_HAIR_COLORS: Record<string, string> = {
  k: '#060317',
  a: '#07051b',
  b: '#673a4d',
  c: '#723c55',
  d: '#7b4059',
  e: '#82455d',
  f: '#854864',
  g: '#8b4962',
  h: '#8c4c66',
  i: '#944e67',
  j: '#94526a',
  l: '#a05c77',
  m: '#ae647d',
  n: '#ba6577',
  o: '#b46a80',
  p: '#be7287',
  q: '#c8758a',
  r: '#d07988',
  s: '#ca7b90',
  t: '#d17d8c',
  u: '#d28296',
  v: '#db8b9d',
  w: '#e092a2',
  x: '#e495a3',
  y: '#e39aaa',
  z: '#f19faa',
  A: '#f5a2a9',
  B: '#f5a6ad',
  C: '#fab1bc',
  D: '#fab6c1',
  E: '#f6c8aa',
  F: '#fcc2ca',
  G: '#fdc7d0',
  H: '#fdced8',
  I: '#fed6dd',
};

/** Over the head (hairFront): the crown (filled under the tiara), the bangs, the near lock to the jaw, the hair by the ear, her ear and the far lock to the shoulder. */
export const PRINCESS_HAIR_HEAD: PrincessFacePart = {
  pivot: [18, 14],
  rows: [
    '...................kkkkkk........',
    '...............kkkkHDDDDuk.......',
    '.............akCCDIHDDDDuok......',
    '............kDFDCwIHDDDDuoCk.....',
    '...........awCDyCwIHffgfhheek....',
    '..........ayDDDyCeffDDDDuoCDyk...',
    '..........kCDDyyewIHvCDDCoDIIvk..',
    '.........ksDwDycCIHvDDDDueoCHIyk.',
    '.........kssyxyyIIxHIDIDe.eqDIIk.',
    '........ajfssyeDDDoDDIIue..evIHk.',
    '........kDfeefDCDDpvCDve....eCDwa',
    '........kuCuuuuCDhDDeee....eesDwk',
    '........aeuDDCDDqeeee.......euwvk',
    '........kmeuusseeb..........afvwk',
    '.......ksqmeefese...........afvk.',
    '.......kDqxmkEovd...........kfa..',
    '......ksCpwwaEmCd...........kek..',
    '.....kvCCpxwhkCDe...........ajk..',
    '...kkuDDDuGvhcCCe...........kwa..',
    '.kaDDCCDuuGvfwHCek..........mwDk.',
    'kHHDusCuuHGqfzHCwa.........fovCk.',
    '............fzHHxk..........vvvDk',
    '............fzBHxk..........CvvCk',
    '............................wGvk.',
    '............................pFFk.',
    '............................kuGCk',
    '.............................kxFk',
    '..............................kDk',
    '..............................kaa',
  ],
  colors: PRINCESS_HAIR_COLORS,
};

/** Without the tiara, over HEAD: the row under the tiara's band without its shadow. */
export const PRINCESS_HAIR_BARE: PrincessFacePart = {
  pivot: [3, 10],
  rows: [
    '.....DDDDuoCD',
    '..wIH........',
    '.C...........',
    'y............',
  ],
  colors: PRINCESS_HAIR_COLORS,
};

/** Behind the head (hairBack): his face filled with his strands, and the dark hair behind the neck. */
export const PRINCESS_HAIR_BACK: PrincessFacePart = {
  pivot: [1, 6],
  rows: [
    '........e..',
    '........ee.',
    '.......eeee',
    '......eeee.',
    '....eeeeeee',
    '.eeeeeeeeee',
    'beeeeeeeeee',
    'beeeeeeeeee',
    'beeeeeeeeee',
    'beeeeeeeeee',
    'beeeeeeeeee',
    '.lfflfflffl',
    '.lfflfflff.',
    '.lfflfflfhl',
    '.lfflfflffl',
    'flfflfflffl',
    'flfflfflffl',
  ],
  colors: PRINCESS_HAIR_COLORS,
};

/** Behind the body (hairBack): the long wavy mass, its hidden part carried on. Pivot on our neck; it turns with the torso. */
export const PRINCESS_HAIR_LONG: PaintedPiece = {
  pivot: [28, 9],
  angle: 90.5,
  rows: [
    '..............kmeuu.............',
    '.............ksqmee.............',
    '.............kDqxmk.............',
    '............ksCpwwa.............',
    '...........kvCCpxwh.............',
    '.........kkuDDDuGvh.............',
    '.......kaDDCCDuuGvf.............',
    '......kHHDusCuuHGqf.............',
    '.....aFzklBHGsFHsqfGsFHsqfGsFHsk',
    '....kFwauGHHvGFsmsfvGFsmsfvGFsmk',
    '....kDkHCHGvHHufpfhfHufpfhfHufpk',
    '....kvkCHHsBGshpffBGshpffBGshpfk',
    '....kvhzHCuCqfqpfuCqfqpfuCqfqpfk',
    '.....axqCCsCffphCsCffphCsCffphCk',
    '......kqCCuCffqCCuCffqCCuCffqCCk',
    '.....auCCCfCufCCCfCufCCCfCufCCCk',
    '...kkzBHGqfCufHGqfCufHGqfCufHGqk',
    '..aBBzFGsftuuFGsftuuFGsftuuFGsfk',
    '.kvGGCCsffssCCsffssCCsffssCCsffk',
    'asFGqDseesuqDseesuqDseesuqDseesk',
    'ksGFqsffsrfqsffsrfqsffsrfqsffsrk',
    'kqBGqqgssffqqgssffqqgssffqqgssfk',
    'asBBAqfsshgfqfsshgfqfsshgfqfsshk',
    '.aqABqqfssfffqfssfffqfssfffqfssk',
    '..ksBBqfsssfBqfsssfBqfsssfBqfssk',
    '...aqAqqfssqAqqfssqAqqfssqAqqfsk',
    '....kBBqfqsqBBqfqsqBBqfqsqBBqfqk',
    'k..anABsfqsnABsfqsnABsfqsnABsfqk',
    'akksBAqsfqsBAqsfqsBAqsfqsBAqsfkk',
    'kqBAssqsqBAssqsqBAssqsqBkkkkkk..',
    '.ksqqiqsqsqqiqsqsqkkkkkk........',
    '..akkhqsqsqqkkkkkk..............',
    '.....kkkkkkk....................',
  ],
  colors: PRINCESS_HAIR_COLORS,
};

/** The near lock over the shoulder and down the chest (hairFront, behind the near arm). Pivot on our neck; it turns with the torso. */
export const PRINCESS_HAIR_STRAND: PaintedPiece = {
  pivot: [9, -1],
  angle: 90.5,
  rows: [
    'fBGGl..',
    '..xHHk.',
    '..kwFFf',
    '...kzGf',
    '...kBFf',
    '...kFFe',
    '..kBFsk',
    '..kCva.',
    '..azzk.',
    '...kzzc',
    '....azb',
    '....azk',
    '....kk.',
  ],
  colors: PRINCESS_HAIR_COLORS,
};

/** His line: kept as he drew it when the hair is recoloured. */
export const PRINCESS_HAIR_LINE = 'ka';
/** Her ear (in HEAD), in our skin ramp's shades. */
export const PRINCESS_HAIR_EAR: Record<string, number> = { E: 3 };
/** The hair colour slot's default: his commonest pink. */
export const PRINCESS_HAIR_BASE = '#ca7b90';
/** His eyes are this far apart (lash start to lash start); where ours are not, the far side of the face pieces follows our far eye. */
export const PRINCESS_EYES_APART = 9;
/** A face piece's pixels this many rows from its pivot on down, this many columns right of it on, are its far side. */
export const PRINCESS_FAR_FROM = -6;
export const PRINCESS_FAR_COL = 7;

/** One character per colour of the tiara. */
export const PRINCESS_TIARA_COLORS: Record<string, string> = {
  k: '#060317',
  a: '#07051b',
  b: '#9e1a35',
  c: '#905a41',
  d: '#96603a',
  e: '#9a663b',
  f: '#a36a4e',
  g: '#eb4b61',
  h: '#c18e39',
  i: '#cc9743',
  j: '#ce9749',
  l: '#d4a146',
  m: '#fab1bc',
  n: '#fdda84',
  o: '#fde18e',
  p: '#fdeec2',
  q: '#fdfdfd',
};

/** The tiara (head.gear), on the face anchor as HEAD. */
export const PRINCESS_TIARA: PrincessFacePart = {
  pivot: [4, 17],
  rows: [
    '..........k....',
    '.........kok...',
    '........aplk...',
    '.....akkoebokk.',
    '....kopknbmekpk',
    '....aodnngblcnk',
    '..kknhoinqllofk',
    '.alnin........k',
    '.kl............',
    'kj.............',
    'a..............',
  ],
  colors: PRINCESS_TIARA_COLORS,
};

/** The gem's reds and its pink light (they follow the gem colour); his line and white stay; the rest is gold. */
export const PRINCESS_TIARA_GEM = 'bgm';
export const PRINCESS_TIARA_FIXED = 'kaq';
/** The colour slots' defaults: his commonest gold and his gem's red. */
export const PRINCESS_TIARA_GOLD = '#fdda84';
export const PRINCESS_TIARA_RED = '#9e1a35';
