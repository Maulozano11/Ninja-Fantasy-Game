// Pieces painted by the owner (his pixels and colours, lifted out of his pictures by tools/refs/*.py)
// that ride the rig: each is drawn as he drew it when its limb points the way it did in his picture,
// and turned with RotSprite as the limb turns in other poses.

import { hexToRgb, hslToHex, rgbToHsl } from './color';
import type { Depth, DrawCtx } from './ctx';
import { F_NO_OUTLINE, F_NO_TEXTURE, PartId, RES, Vec } from './raster';
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
 * every pixel is his. `color` recolours a character's colour (for the item's colour slots).
 */
export function stampPiece(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color?: (ch: string, hex: string) => string): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color ? color(ch, hex) : hex, 'flat'), 3];
  stampTemplate(g.L(depth), piece, at, deg - piece.angle, pal, part, { flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

/** Past this lean (degrees from his picture) a piece is turned with RotSprite; up to it, sheared. */
const LEAN_SHEAR = 20;

/**
 * Stamps his piece leaning `deg` about its pivot. A small lean shears it, each row moved across whole
 * (so his ab plates and strips stay his pixels, only stepped), as far as a turn would move it; a large
 * one turns it with RotSprite.
 */
export function stampLeaning(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color: (ch: string, hex: string) => string): void {
  const d = deg - piece.angle;
  if (Math.abs(d) > LEAN_SHEAR) {
    stampPiece(g, depth, piece, at, deg, part, color);
    return;
  }
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  const L = g.L(depth);
  const ax = Math.floor(at.x * RES) - piece.pivot[0];
  const ay = Math.floor(at.y * RES) - piece.pivot[1];
  const s = Math.sin((d * Math.PI) / 180);
  piece.rows.forEach((row, j) => {
    const dx = -Math.round((j - piece.pivot[1]) * s);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(ax + i + dx, ay + j, pens[row[i]], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
  });
}

/**
 * A colour of his skin (painted in the skin `from`) in the character's skin `to`: the hue turned and the
 * saturation scaled from his skin, as retintHex turns his cloth, but the lightness scaled so that his
 * skin lands exactly on the character's (the rest of the body is drawn in that skin), his shadows and
 * line staying as far below it and his lights as far above. In his own skin, his colour.
 */
export function skinTone(hex: string, from: string, to: string): string {
  if (to.toLowerCase() === from.toLowerCase()) return hex;
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const [h0, s0, l0] = rgbToHsl(...hexToRgb(from));
  const [h1, s1, l1] = rgbToHsl(...hexToRgb(to));
  const lt = l <= l0 ? (l * l1) / l0 : l1 + ((l - l0) * (1 - l1)) / (1 - l0);
  return hslToHex(h + (h1 - h0), Math.min(1, (s * s1) / s0), lt);
}
