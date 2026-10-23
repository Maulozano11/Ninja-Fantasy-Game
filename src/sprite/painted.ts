// Pieces painted by the owner (his pixels and colours, lifted out of his pictures by tools/refs/*.py)
// that ride the rig: each is drawn as he drew it when its limb points the way it did in his picture,
// and turned with RotSprite as the limb turns in other poses.

import type { Depth, DrawCtx } from './ctx';
import { F_NO_OUTLINE, F_NO_TEXTURE, PartId, Vec } from './raster';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';

export interface PaintedPiece extends PixelTemplate {
  /** One character per colour of his; '.' is empty. */
  colors: Record<string, string>;
  /** The angle (screen degrees, 0 = right, + = clockwise) of the limb it rides, in his picture. */
  angle: number;
}

/** The screen angle in degrees of the segment from `a` to `b` (0 = right, + = clockwise). */
export const segAngle = (a: Vec, b: Vec): number => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

/**
 * Stamps a painted piece with its pivot on `at`, its limb now pointing along `deg`: at his angle
 * every pixel is his. `color` recolours a character's colour (for the item's colour slots). `closed`:
 * turned from his angle, a pixel of the piece left on its layer's edge becomes the line (the female
 * standard: no piece is ever left cut open where turning it lost a pixel of his line); at his angle
 * every pixel stays his.
 */
export function stampPiece(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color?: (ch: string, hex: string) => string, closed = false): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color ? color(ch, hex) : hex, closed ? 'painted' : 'flat'), 3];
  const turned = Math.round(deg - piece.angle) % 360 !== 0;
  stampTemplate(g.L(depth), piece, at, deg - piece.angle, pal, part, { flags: closed && turned ? F_NO_TEXTURE : F_NO_TEXTURE | F_NO_OUTLINE });
}
