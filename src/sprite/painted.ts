// Pieces painted by the owner (his pixels and colours, lifted out of his pictures by tools/refs/*.py)
// that ride the rig: each is drawn as he drew it when its limb points the way it did in his picture,
// and turned with RotSprite as the limb turns in other poses (or, for a coat's skirts, bent).

import { armJoints, type Depth, type DrawCtx, type Side } from './ctx';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, partIndex, PartId, RES, v, Vec } from './raster';
import { PixelTemplate, rotateTemplate, stampTemplate, TemplatePalette } from './rotsprite';

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

/**
 * A painted picture laid out in our frame as it sits on our male at idle frame 0 (its first row and
 * column at `origin`, fine pixels), for pieces that bend with the pose rather than turn (a coat's
 * skirts hung from the waist).
 */
export interface PaintedSheet {
  origin: [number, number];
  /** One character per colour of his; '.' is empty. */
  rows: string[];
  colors: Record<string, string>;
}

/**
 * Stamps a painted sheet bent to the pose: `back` takes the middle of a fine pixel of the frame now
 * (design units) to where that point lay on our male at rest (or null where the bend does not reach),
 * and the pixel takes the sheet's colour there. Only the fine pixels in `box` (x0, y0, x1, y1; the
 * last two excluded) are tried. Where `back` is the identity every pixel is his.
 */
export function stampSheet(
  g: DrawCtx,
  depth: Depth,
  sheet: PaintedSheet,
  box: [number, number, number, number],
  back: (at: Vec) => Vec | null,
  part: (at: Vec) => PartId,
  color?: (ch: string, hex: string) => string,
): void {
  const L = g.L(depth);
  const mats: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(sheet.colors)) mats[ch] = g.m(color ? color(ch, hex) : hex, 'flat');
  const [ox, oy] = sheet.origin;
  for (let fy = box[1]; fy < box[3]; fy++) {
    for (let fx = box[0]; fx < box[2]; fx++) {
      const at = v((fx + 0.5) / RES, (fy + 0.5) / RES);
      const q = back(at);
      if (!q) continue;
      const ch = sheet.rows[Math.floor(q.y * RES) - oy]?.[Math.floor(q.x * RES) - ox];
      if (!ch || ch === '.') continue;
      L.set(fx, fy, mats[ch], 3, part(at), F_NO_TEXTURE | F_NO_OUTLINE);
    }
  }
}

/**
 * A piece for a broader figure: the column `dx` fine pixels from its pivot repeated `n` more times, for
 * each [dx, n] (his cloth carried on across, his trims and line where they were). Columns left of
 * the pivot push the piece's left part out, the others its right part.
 */
export function widenPiece(p: PaintedPiece, cols: [number, number][]): PaintedPiece {
  let rows = p.rows;
  let pivot = p.pivot;
  // from right to left, so each column is found where it was
  for (const [dx, n] of [...cols].sort((a, b) => b[0] - a[0])) {
    const c = p.pivot[0] + dx;
    rows = rows.map((r) => r.slice(0, c) + (r[c] ?? '.').repeat(n + 1) + r.slice(c + 1));
    if (dx < 0) pivot = [pivot[0] + n, pivot[1]];
  }
  return { ...p, rows, pivot };
}

/** The fine pixels a painted piece covers when stamped as stampPiece stamps it (1 where it does). */
export function pieceCover(piece: PaintedPiece, at: Vec, deg: number): Uint8Array {
  const out = new Uint8Array(GRID * GRID);
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  for (const p of rotateTemplate(piece, deg - piece.angle)) {
    const x = ax + p.dx;
    const y = ay + p.dy;
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) out[y * GRID + x] = 1;
  }
  return out;
}

/**
 * Takes away what of our body, or of clothes under them, shows past painted clothes that stand for it
 * (where our limbs and the turned pieces part by a pixel or two in a pose): in each depth, a pixel of
 * one of `parts` that `keep` (given its index in the frame and its part's index) does not keep.
 */
export function clearPast(g: DrawCtx, depths: Depth[], parts: PartId[], keep: (i: number, part: number) => boolean): void {
  const ids = new Uint8Array(256);
  for (const p of parts) ids[partIndex(p)] = 1;
  for (const d of depths) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids[L.part[i]] && !keep(i, L.part[i])) L.mat[i] = -1;
  }
}

/**
 * Our torso where painted clothes stand for it: from `from` up (torso-local height above the pelvis)
 * to the base of the neck, a torso pixel in `depths` is kept only where `cover` covers it.
 */
export function clearTorsoPast(g: DrawCtx, depths: Depth[], cover: (i: number) => boolean, from: number): void {
  const r = g.rig;
  const height = (i: number) => (((i % GRID) + 0.5) / RES - r.pelvis.x) * r.up.x + ((Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y) * r.up.y;
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  clearPast(g, depths, ['torso'], (i) => {
    const h = height(i);
    return h < from || h > neck || cover(i);
  });
}

/**
 * Our arm on side `s` where painted sleeves stand for it: in `depths`, an upper arm or forearm pixel is
 * kept only where `sleeves` covers it, or past the cuff (the last tenth of the forearm, the wrist the
 * hand goes on from).
 */
export function clearArmPast(g: DrawCtx, s: Side, sleeves: Layer, depths: Depth[]): void {
  const { elbow, wrist } = armJoints(g.rig, s);
  const fx = wrist.x - elbow.x;
  const fy = wrist.y - elbow.y;
  const l2 = fx * fx + fy * fy || 1;
  const fore = partIndex(`forearm${s}`);
  clearPast(g, depths, [`upperArm${s}`, `forearm${s}`], (i, part) => {
    if (sleeves.mat[i] >= 0) return true;
    if (part !== fore) return false;
    const t = ((((i % GRID) + 0.5) / RES - elbow.x) * fx + ((Math.floor(i / GRID) + 0.5) / RES - elbow.y) * fy) / l2;
    return t >= 0.9;
  });
}
