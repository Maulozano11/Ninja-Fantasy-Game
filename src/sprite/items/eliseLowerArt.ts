// Elise's skirt, coat tails, belts and gloves from the owner's picture, brought down to our scale
// (tools/refs/elise-lower-from-ref.py from docs/reference/elise-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** Her colours the colour slots recolour from (at these, every pixel is hers). */
export const ELISE_COAT_BLUE = '#3662af';
export const ELISE_COAT_TRIM = '#ddac5a';
export const ELISE_COAT_LINING = '#9f9fac';
export const ELISE_SKIRT_CLOTH = '#354566';
export const ELISE_SKIRT_HEM = '#e6b75e';
export const ELISE_BELT_LEATHER = '#4e3739';
export const ELISE_BELT_STEEL = '#b6b6bd';
export const ELISE_GLOVE = '#2d5090';

/** The skin her fingers are painted in (her face's): the character's skin moves them as far. */
export const ELISE_HAND_SKIN = '#facdac';

/** Her glove blues for the hands she did not paint, by our hand pictures' shades: line, crease, shadow, base, light. */
export const ELISE_GLOVE_TONES = ['#080613', '#1b2858', '#1b2858', '#2d5090', '#345ea9'] as const;

/** The leather strap round her gloves' cuffs, where the glove meets the sleeve. */
export const ELISE_GLOVE_STRAP = '#865339';

/** Her fingers' skin for the bare fingertips of the hands she did not paint, by the same shades. */
export const ELISE_FINGER_TONES = ['#d68271', '#d68271', '#e59580', '#facdac', '#facdac'] as const;

/** The tails' hem row in our frame at rest (the female idle): crouched or seated it hangs no lower above the ground. */
export const ELISE_COAT_HEM_Y = 204;

/** What each colour of hers in these pieces is (her black line stays; the others follow their colour slot). */
export const ELISE_KIND: Record<string, 'line' | 'coat' | 'trim' | 'lining' | 'cloth' | 'hem' | 'leather' | 'steel' | 'gold' | 'glove' | 'skin'> = {
  '#080613': 'line',
  '#4068ac': 'coat',
  '#3662af': 'coat',
  '#263d7d': 'coat',
  '#1b2858': 'coat',
  '#fce89e': 'trim',
  '#dcb06e': 'trim',
  '#ddac5a': 'trim',
  '#a47043': 'trim',
  '#9e6637': 'trim',
  '#525368': 'lining',
  '#6a6b80': 'lining',
  '#8d8ea0': 'lining',
  '#9f9fac': 'lining',
  '#c4c4ce': 'lining',
  '#ced0dc': 'lining',
  '#385c9e': 'cloth',
  '#354566': 'cloth',
  '#26263e': 'cloth',
  '#181b37': 'cloth',
  '#e6b75e': 'hem',
  '#b27b44': 'hem',
  '#804936': 'leather',
  '#614a48': 'leather',
  '#4e3739': 'leather',
  '#342325': 'leather',
  '#eaeaf3': 'steel',
  '#b6b6bd': 'steel',
  '#787782': 'steel',
  '#686771': 'steel',
  '#fefef9': 'steel',
  '#a8a8b9': 'steel',
  '#683c30': 'leather',
  '#865339': 'leather',
  '#cf9b48': 'gold',
  '#2d5090': 'glove',
  '#345ea9': 'glove',
  '#facdac': 'skin',
  '#e59580': 'skin',
  '#d68271': 'skin',
  '#f3ae92': 'skin',
};

/** Her pleated skirt with its gold hem, hung from the pelvis. */
export const ELISE_SKIRT: PaintedPiece = {
  pivot: [15, 4],
  angle: -89.50,
  rows: [
    '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
    '.kXXKXXKXXKXXKXXKXXKXXKXXKXXKk.',
    '.kjeXjeXjeXjeXeeXeeXeXKeXKeXKk.',
    '.keeXjeXjeXjeXeeXeeXeXKeXKeXKk.',
    '.keeXeeXeeXjeXeeXeeXeXKeXKeXKk.',
    '.keeXeeXeeXeeXeeXeeXeXKeXKeXKk.',
    '.keeXeeXeeXeeXeeXeeXeXKeXKeXKk.',
    'keeXeeXeeXeeXeeXeeXeeXKeXKeXKKk',
    'keeXeeXeeXeeXeeXeeXeeXKeXKeXKKk',
    'kHHJHHJHHJHHJHHJHHJHHJHHJHHJHHk',
    'kJJJJJJJJJJJJJJJJJJJJJJJJJJJJJk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  ],
  colors: {
    H: '#e6b75e',
    J: '#b27b44',
    K: '#181b37',
    X: '#26263e',
    e: '#354566',
    j: '#385c9e',
    k: '#080613',
  },
};

/** Her coat's tails behind the legs: the near tail flaring back to a point, the lining, the far tail's edge. */
export const ELISE_COAT_BACK: PaintedPiece = {
  pivot: [28, -7],
  angle: -89.50,
  rows: [
    '...kO1232123332333YkaaaaaaaaaaaaaaaaakY321Yk......',
    '..kO1232123332333YkaaaaaaaaaaaaaaaaaaakY31Yk......',
    '.kO12332123332333YkaaaaaaaaaaaaaaaaaaakY321Yk.....',
    'kO12332123332333YkaaggggggggggggggggaakY321Yk.....',
    'kO12332123332333YkaagGGGGGGGGGGGGGGGgaakY31Yk.....',
    'kO1232123332333YkaagGIIImmmmmmmmmIIGgaakY321Yk....',
    'kO1232123332333YkaagGIIImmmmmmmmmIIGgaakY321Yk....',
    'kO122123332333YkaagGIIIImmmmmmmmmIIIGgaakY31Yk....',
    'kO122123332333YkaagGIIIImmmmmmmmmIIIGgaakY321Yk...',
    'kO12123332333YkaagGIIIIImmmmmmmmmIIIGgaakY32YYk...',
    'kO12123332333YkaagGIIIIImmmmmmmmmIIIIGgaakY3YYk...',
    'kO12233323Y3YkaagGIIIIIImmmmmmmmmIIIIGgaakY32YYk..',
    'kO12233323h3YkaagGIIIIIImmmmmmmmmIIIIGgaakY32hYk..',
    'kO1Y233323Y3YkaagGIIIIIImmiiimmmmIIIIIGgaakY3YYk..',
    '.kY1Y3323Y3YkaagGIIIIIIImmiiimmmmIIIIIGgaakY32YYk.',
    '..kY1Y323Y3YkkkkkkkkkkkImmiiimmmmIIIIIGgaakY32YYk.',
    '...kY1h23Y3Yk..........kkkkkkkkkkkkIIIIGgaakY3hYk.',
    '....kY1YY3Yk.......................kkkkkkkkkY32YYk',
    '.....kY1Y3Yk...............................kY32YYk',
    '......kYhYYk................................kYYYYk',
    '.......kkkk.................................kkkkkk',
  ],
  colors: {
    '1': '#1b2858',
    '2': '#263d7d',
    '3': '#3662af',
    G: '#8d8ea0',
    I: '#9f9fac',
    O: '#9e6637',
    Y: '#ddac5a',
    a: '#525368',
    g: '#6a6b80',
    h: '#dcb06e',
    i: '#ced0dc',
    k: '#080613',
    m: '#c4c4ce',
  },
};

/** Her coat's front edges over the hips, over the skirt. */
export const ELISE_COAT_FRONT: PaintedPiece = {
  pivot: [24, 4],
  angle: -89.50,
  rows: [
    '........kO133Y3Yk.............kY3Yk....',
    '........kO133Y3Yk.............kY31Yk...',
    '.......kO12h3Y3Yk.............kY31Yk...',
    '.......kO12h3Y3Yk..............kY31Yk..',
    '......kO12333Y3Yk..............kY31Yk..',
    '.....kO123333Y3Yk..............kY31Yk..',
    '....kO1233333Y3Yk...............kY31Yk.',
    '...kO123333h3Y3Yk...............kY31Yk.',
    '..kO1233333h33Yk................kY31Yk.',
    '.kO123333333Y3Yk.................kY31Yk',
    'kO1233333333Y3Yk.................kY31Yk',
  ],
  colors: {
    '1': '#1b2858',
    '2': '#263d7d',
    '3': '#3662af',
    O: '#9e6637',
    Y: '#ddac5a',
    h: '#dcb06e',
    k: '#080613',
  },
};

/** Her two belts across the hips, the steel buckle at the near side, the box pouch at the far hip. */
export const ELISE_BELT: PaintedPiece = {
  pivot: [15, 11],
  angle: -89.50,
  rows: [
    '.......................kkkkkkkk',
    '.......................kWwwWvkk',
    '.......kkkkkkkkkkkkkkkkkvvvvWkk',
    '......kLLfLLLfLLLfLLLfLknccdnkk',
    '.kkkWStkkkkkkkkkkkkkkkkkncdcnk.',
    'kfLLSNtLLfLLLfLLLfLLLfLkncccnkk',
    'kNNnSNpnNNNnNNNnNNNnNNNkncdcnkk',
    '.kkktppkkkkkkkkkkkkkkkkknnnnnk.',
    '........................kkkkk..',
  ],
  colors: {
    L: '#804936',
    N: '#342325',
    S: '#b6b6bd',
    W: '#eaeaf3',
    c: '#683c30',
    d: '#865339',
    f: '#614a48',
    k: '#080613',
    n: '#4e3739',
    p: '#686771',
    t: '#787782',
    v: '#a8a8b9',
    w: '#fefef9',
  },
};

/** The near fist round a grip: her blue glove over the back of the hand, her fingers bare. */
export const ELISE_GLOVE_N: PaintedPiece = {
  pivot: [6, 3],
  angle: 103.02,
  rows: [
    '....k55k.',
    '...k5555k',
    '..k55555k',
    '.k555551k',
    'k5555511k',
    'k5551111k',
    'k5111111k',
    'kszszszZk',
    'kszszszZk',
    '.kzkzkzk.',
    '..k.k.k..',
  ],
  colors: {
    '1': '#1b2858',
    '5': '#2d5090',
    Z: '#d68271',
    k: '#080613',
    s: '#facdac',
    z: '#e59580',
  },
};

/** The far hand hanging: her glove over the palm, her fingers bare. */
export const ELISE_GLOVE_F: PaintedPiece = {
  pivot: [1, 0],
  angle: 59.53,
  rows: [
    'k5551k..',
    'k55111k.',
    'k51111k.',
    'kssszZk.',
    'kszszZk.',
    'kzszZZ.k',
    '.kZkZk..',
    '..k.k...',
  ],
  colors: {
    '1': '#1b2858',
    '5': '#2d5090',
    Z: '#d68271',
    k: '#080613',
    s: '#facdac',
    z: '#e59580',
  },
};
