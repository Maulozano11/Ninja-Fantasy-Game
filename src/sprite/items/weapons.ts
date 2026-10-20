// Hand-made weapon templates (fine pixels, pointing right, pivot on the grip).
// Rotated per pose with RotSprite so they stay crisp at every angle.
// Characters: '1'-'5' blade shades · 'a'-'d' guard/pommel shades 2-5 ·
// 'k'/'K' grip shades 1/2 · 'w' grip wrap · 'g'/'G' collar (habaki) shades 4/3.

import { hexToRgb, hslToHex, mixHex, rgbToHsl } from '../color';
import type { Depth, DrawCtx } from '../ctx';
import { Vec } from '../raster';
import { F_NO_OUTLINE, F_NO_TEXTURE } from '../raster';
import { PixelTemplate, stampTemplate, TemplatePalette } from '../rotsprite';

export const CRYSTAL_SWORD: PixelTemplate = {
  // Slim, tapered blade (lit bevel, centre ridge, shadowed lower half, sparse
  // facets) with a long grip, so the pommel shows past the fist and the
  // crossguard just below it, like the reference.
  pivot: [10, 5],
  rows: [
    '...................c.....................................',
    '.................acc.....................................',
    '.................bd......................................',
    '.................bcb33333333334333333334333333333........',
    '.c.kkkkkkkkkkkkkkbcb5555555535555555535555555535555555...',
    'cdbKwKKwKKwKKwKKwbdb4444443444444443444444443444444443444',
    'bcbwKKwKKwKKwKKwKbbb333323333333323333333323333333323333.',
    '.a.kkkkkkkkkkkkkkbbb221222222221222222221222222221222....',
    '.................bbb111111111111111111111111111..........',
    '.................bb......................................',
    '.................aba.....................................',
    '...................a.....................................',
  ],
};

/**
 * The owner's crystal sword (docs/reference/crystal-sword-owner-reference.jpg), his pixels as he drew
 * them (tools/refs/crystal-sword-from-ref.py): drawn at the angle he drew it, which is the idle
 * pose's, so at rest the sword is exactly his; other poses turn it with RotSprite. It keeps his own
 * colours, one character per colour of his ('g'/'G' the wrapped grip under the fist, 'o' his black
 * line), cleaned of the black pixels inside it but keeping his dark blue relief (the owner's notes).
 */
export const ICE_CRYSTAL_SWORD: PixelTemplate & { angle: number; colors: Record<string, string> } = {
  pivot: [8, 10],
  angle: 52,
  rows: [
    '.oo...............................',
    'oabo..............................',
    'ocdeo.............................',
    '.odfo.............................',
    '..ohio............................',
    '...ojdo...........................',
    '....ogGo..........................',
    '.....ogGo.........................',
    '......ogGo........................',
    '.......ogGo....oo.................',
    '........ogGo..oklo................',
    '.........omjoonpo.................',
    '.........oqrstuno.................',
    '.........ovwxynuzo................',
    '........ovvhABChfo................',
    '.......oDElFHIJjKo................',
    '.......oLDEqMNCjIOo...............',
    '......ofoozzPPxnQRo...............',
    '.......o..ooSPTUnRTo..............',
    '...........ovVVWxxXpo.............',
    '............oottYSRXo.............',
    '.............ovtLXSRZo............',
    '..............oSSL012co...........',
    '...............oE3004Yo...........',
    '................o53TBYto..........',
    '................oS44678co.........',
    '.................oS49!7#8o........',
    '.................o$Sv!9%#o........',
    '..................o5v!x!&wo.......',
    '...................of9!I%(o.......',
    '...................o)%*!+REo......',
    '...................o7*m%9+Xo......',
    '....................oo,%*%X-o.....',
    '.....................o%sm!%/o.....',
    '......................o40D9+Xo....',
    '.......................oZ%!%:to...',
    '........................o;m!%<o...',
    '........................ovE%K2=o..',
    '.........................oo%;&<o..',
    '..........................o-7V>?o.',
    '...........................oV7<@o.',
    '............................ot[9o.',
    '.............................oZ/]o',
    '..............................o5>o',
    '...............................oto',
    '................................o.',
  ],
  colors: {
    a: '#b9e3f4',
    b: '#8fd5ee',
    c: '#70a1b9',
    d: '#38516c',
    e: '#334c63',
    f: '#6799b4',
    h: '#3e5a73',
    i: '#5c89a8',
    j: '#3f5c7a',
    k: '#9cd7ea',
    l: '#93d4eb',
    m: '#547e98',
    n: '#9edbed',
    p: '#75a4b9',
    q: '#3b5572',
    r: '#6291a8',
    s: '#95d3e7',
    t: '#78b1c7',
    u: '#9adbed',
    v: '#4e758f',
    w: '#8ccee3',
    x: '#fcfefe',
    y: '#335074',
    z: '#6c9cb4',
    A: '#56d4f7',
    B: '#4d708f',
    C: '#85c5db',
    D: '#54829b',
    E: '#81bccf',
    F: '#8fd6ea',
    H: '#85c9e0',
    I: '#f5fcfc',
    J: '#81c2db',
    K: '#8bc6da',
    L: '#71a5bc',
    M: '#375370',
    N: '#84d0e7',
    O: '#689fb8',
    P: '#6593ad',
    Q: '#3b5a77',
    R: '#adebf7',
    S: '#79adc6',
    T: '#8ac3d6',
    U: '#ecfafe',
    V: '#84b7cc',
    W: '#7dbdd2',
    X: '#c9f4fc',
    Y: '#c1f1fa',
    Z: '#7db8cf',
    '0': '#82bdd3',
    '1': '#476b86',
    '2': '#d0f8fe',
    '3': '#446684',
    '4': '#496e8d',
    '5': '#74acc4',
    '6': '#91c8dd',
    '7': '#4f7897',
    '8': '#b5f1fd',
    '9': '#adecfd',
    '!': '#a8ebfc',
    '#': '#baf0fd',
    $: '#4d7393',
    '%': '#5783a0',
    '&': '#53819f',
    '(': '#e3fbfe',
    ')': '#a4e5f6',
    '*': '#a4eafb',
    '+': '#5b87a4',
    ',': '#95d0e2',
    '-': '#7cb5cb',
    '/': '#e8fafe',
    ':': '#cbf8fd',
    ';': '#86c0d7',
    '<': '#d7f8ff',
    '=': '#71b1ca',
    '>': '#def9fe',
    '?': '#588caa',
    '@': '#a0eafe',
    '[': '#77b0cb',
    ']': '#70aac5',
    o: '#07060b',
    g: '#3e5f7f',
    G: '#6f9fbd',
  },
};

export const KATANA: PixelTemplate = {
  pivot: [6, 5],
  rows: [
    '....................................................',
    '............db...............................222....',
    '............cb...................2222222222224442222',
    'kkkkkkkkkkkkcbg2222222222222222224444444444443334444',
    'KKwKKwKKwKKwcbg4444444444444444444443333444434445444',
    'cKKwKKwKKwKKbbg344443333444433334444444444444555....',
    'KKwKKwKKwKKwbbG444444444444444444555555555555.......',
    'kkkkkkkkkkkkaaG555555555555555555...................',
    '............aa......................................',
    '............aa......................................',
    '....................................................',
  ],
};

export const KUNAI: PixelTemplate = {
  pivot: [6, 3],
  rows: [
    '............3333......',
    '.b.........3555533....',
    'b.bwKwKwKw3544445533..',
    'b..KwKwKwK544444445555',
    'b.bwKwKwKw2222222222..',
    '.b.........2222222....',
    '............2222......',
  ],
};

export interface WeaponColors {
  blade: string;
  grip: string;
  guard: string;
  wrap?: string;
  collar?: string;
}

export function weaponPalette(g: DrawCtx, c: WeaponColors): TemplatePalette {
  const blade = g.m(c.blade, 'metal');
  const guard = g.m(c.guard, 'metal');
  const grip = g.m(c.grip, 'leather');
  const wrap = g.m(c.wrap ?? mixHex(c.grip, '#e8e2d4', 0.45), 'cloth');
  const collar = g.m(c.collar ?? '#c9a227', 'metal');
  const pal: TemplatePalette = {
    k: [grip, 1],
    K: [grip, 2],
    w: [wrap, 4],
    a: [guard, 2],
    b: [guard, 3],
    c: [guard, 4],
    d: [guard, 5],
    g: [collar, 4],
    G: [collar, 3],
  };
  for (let s = 1; s <= 5; s++) pal[String(s)] = [blade, s];
  return pal;
}

/**
 * Draws a weapon template held at `hand` pointing along `deg` (screen degrees,
 * 0 = right, + = clockwise). Blades pointing left are mirrored so the lit edge
 * stays on top.
 */
export function drawWeapon(g: DrawCtx, depth: Depth, t: PixelTemplate, hand: Vec, deg: number, c: WeaponColors): void {
  const a = ((deg % 360) + 540) % 360 - 180;
  stampTemplate(g.L(depth), t, hand, a, weaponPalette(g, c), 'held', { flipY: Math.abs(a) > 90 });
}

/** A colour of a painted weapon moved the way the player moved its base colour (none moved: his own). */
function retint(hex: string, from: string, to: string): string {
  if (from.toLowerCase() === to.toLowerCase()) return hex;
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const [h0, s0, l0] = rgbToHsl(...hexToRgb(from));
  const [h1, s1, l1] = rgbToHsl(...hexToRgb(to));
  return hslToHex(h + (h1 - h0), s0 > 0.02 ? (s * s1) / s0 : s1, l + (l1 - l0) * 0.7);
}

/**
 * Draws a painted weapon (its own colours and black line, drawn at its own angle) held at `hand`
 * pointing along `deg`. At its own angle every pixel is the painter's; pointing left it is mirrored
 * across its length so the lit edge stays on top. `blade` and `grip` recolour it from `base`.
 */
export function drawPaintedWeapon(
  g: DrawCtx,
  depth: Depth,
  t: PixelTemplate & { angle: number; colors: Record<string, string> },
  hand: Vec,
  deg: number,
  tint: { base: string; blade: string; grip: string; gripBase: string },
): void {
  const a = ((deg % 360) + 540) % 360 - 180;
  const flip = Math.abs(a) > 90;
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(t.colors)) {
    const c = ch === 'o' ? hex : ch === 'g' || ch === 'G' ? retint(hex, tint.gripBase, tint.grip) : retint(hex, tint.base, tint.blade);
    pal[ch] = [g.m(c, 'flat'), 3];
  }
  // Flipped, the template points at -angle; either way it turns by what is left to reach `a`.
  const turn = flip ? a + t.angle : a - t.angle;
  stampTemplate(g.L(depth), t, hand, turn, pal, 'held', { flipY: flip, flags: F_NO_TEXTURE | F_NO_OUTLINE });
}
