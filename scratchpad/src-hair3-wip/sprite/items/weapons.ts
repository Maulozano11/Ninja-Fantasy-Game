// Hand-made weapon templates (fine pixels, pointing right, pivot on the grip).
// Rotated per pose with RotSprite so they stay crisp at every angle.
// Characters: '1'-'5' blade shades · 'a'-'d' guard/pommel shades 2-5 ·
// 'k'/'K' grip shades 1/2 · 'w' grip wrap · 'g'/'G' collar (habaki) shades 4/3.

import { mixHex } from '../color';
import type { Depth, DrawCtx } from '../ctx';
import { Vec } from '../raster';
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
