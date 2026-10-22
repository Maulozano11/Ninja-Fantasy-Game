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
 * every pixel is his. `color` recolours a character's colour (for the item's colour slots).
 */
export function stampPiece(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color?: (ch: string, hex: string) => string): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color ? color(ch, hex) : hex, 'flat'), 3];
  stampTemplate(g.L(depth), piece, at, deg - piece.angle, pal, part, { flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

const stretched = new Map<PaintedPiece, Map<string, PaintedPiece>>();

/**
 * His piece for a longer bone (a seated thigh, rig.ts kneeLeg): the bone `extra` fine pixels longer than
 * the `bone` he painted it for, by repeating whole rows of his between the pivot and the bone's end, spread
 * evenly; each row after a repeat moves across as far as the bone runs across over a row (the piece's
 * angle), so a slanted limb keeps its slant. The rows past the bone's end move on whole. Every pixel is his.
 */
export function stretchPiece(p: PaintedPiece, extra: number, bone: number): PaintedPiece {
  const a = (p.angle * Math.PI) / 180;
  const R = Math.round(bone * Math.sin(a));
  const E = Math.round(extra * Math.sin(a));
  if (E <= 0 || R <= 0) return p;
  let byKey = stretched.get(p);
  if (!byKey) stretched.set(p, (byKey = new Map()));
  const key = `${R},${E}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const [px, py] = p.pivot;
  const cot = Math.cos(a) / Math.sin(a);
  const W = Math.max(...p.rows.map((r) => r.length));
  const src: { row: number; sh: number }[] = [];
  for (let j = 0; j < p.rows.length + E; j++) {
    const r = j - py;
    const from = r <= 0 ? r : r <= R + E ? Math.ceil((r * R) / (R + E)) : r - E;
    src.push({ row: from + py, sh: Math.round((r - from) * cot) });
  }
  const lo = Math.min(0, ...src.map((s) => s.sh));
  const hi = Math.max(0, ...src.map((s) => s.sh));
  // (a pivot above the piece: the rows between it and the piece are empty, and repeat as such)
  const rows = src.map(({ row, sh }) => '.'.repeat(sh - lo) + (p.rows[row] ?? '').padEnd(W, '.') + '.'.repeat(hi - sh));
  const out: PaintedPiece = { ...p, rows, pivot: [px - lo, py] };
  byKey.set(key, out);
  return out;
}
