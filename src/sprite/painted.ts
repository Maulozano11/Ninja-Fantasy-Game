// Pieces painted by the owner (his pixels and colours, lifted out of his pictures by tools/refs/*.py)
// that ride the rig: each is drawn as he drew it when its limb points the way it did in his picture,
// and turned with RotSprite as the limb turns in other poses.

import { hexToRgb, hslToHex, rgbToHsl } from './color';
import type { Depth, DrawCtx } from './ctx';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, PartId, RES, v, Vec } from './raster';
import { PixelTemplate, rotateLined, rotateTemplate, stampTemplate, TemplatePalette } from './rotsprite';

export interface PaintedPiece extends PixelTemplate {
  /** One character per colour of his; '.' is empty. */
  colors: Record<string, string>;
  /** The angle (screen degrees, 0 = right, + = clockwise) of the limb it rides, in his picture. */
  angle: number;
  /**
   * Cells on the piece's edge where his figure went on in his picture (into another piece of his), as
   * rows like `rows` with 'x' at each: where such a cell ends up with nothing beside it in a pose, it is
   * closed with his black line (compose.ts sealOpenEdges), as the converters close a cut. Cells on his
   * own outline are not marked: they stay as he drew them.
   */
  seal?: string[];
}

/** The screen angle in degrees of the segment from `a` to `b` (0 = right, + = clockwise). */
export const segAngle = (a: Vec, b: Vec): number => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

/**
 * Stamps a painted piece with its pivot on `at`, its limb now pointing along `deg`: at his angle
 * every pixel is his. `color` recolours a character's colour (for the item's colour slots). With
 * `line` (which of his colours are his black line), turned it keeps his line whole (rotateLined).
 * `closed`: turned from his angle, a pixel of the piece left on its layer's edge becomes the line (the
 * female standard: no piece is ever left cut open where turning it lost a pixel of his line); at his
 * angle every pixel stays his.
 */
export function stampPiece(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color?: (ch: string, hex: string) => string, line?: (hex: string) => boolean, closed = false): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color ? color(ch, hex) : hex, closed ? 'painted' : 'flat'), 3];
  const turned = Math.round(deg - piece.angle) % 360 !== 0;
  stampTemplate(g.L(depth), piece, at, deg - piece.angle, pal, part, { flags: closed && turned ? F_NO_TEXTURE : F_NO_TEXTURE | F_NO_OUTLINE, line: line && ((ch) => line(piece.colors[ch])) });
}

const LIMB_ONLY = new WeakMap<PaintedPiece, PaintedPiece>();

/**
 * A piece of his limb without what was lifted with it from behind the limb (the skirt's red, a strap, the
 * cape, a speck of his line): only the largest patch inside his black line and the line round it. At rest
 * the whole piece lands on what it was cut from; a limb that moves away takes only itself along.
 */
export function limbOnly(piece: PaintedPiece, line: (hex: string) => boolean): PaintedPiece {
  const hit = LIMB_ONLY.get(piece);
  if (hit) return hit;
  const H = piece.rows.length;
  const W = Math.max(...piece.rows.map((r) => r.length));
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && y < H && x < W ? piece.rows[y][x] ?? '.' : '.');
  const inner = (x: number, y: number) => at(x, y) !== '.' && !line(piece.colors[at(x, y)]);
  // The patches inside his line (4-neighbours), the largest kept.
  const patch = new Map<number, number>();
  let best = -1;
  let bestN = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inner(x, y) || patch.has(y * W + x)) continue;
      const id = y * W + x;
      const stack = [[x, y]];
      let n = 0;
      while (stack.length) {
        const [p, q] = stack.pop()!;
        if (!inner(p, q) || patch.has(q * W + p)) continue;
        patch.set(q * W + p, id);
        n++;
        stack.push([p + 1, q], [p - 1, q], [p, q + 1], [p, q - 1]);
      }
      if (n > bestN) [best, bestN] = [id, n];
    }
  const kept = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && patch.get(y * W + x) === best;
  const rows = piece.rows.map((row, y) =>
    [...row.padEnd(W, '.')]
      .map((ch, x) => {
        if (ch === '.') return '.';
        if (!line(piece.colors[ch])) return kept(x, y) ? ch : '.';
        // his line where it bounds the patch
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (kept(x + dx, y + dy)) return ch;
        return '.';
      })
      .join(''),
  );
  const out = { ...piece, rows };
  LIMB_ONLY.set(piece, out);
  return out;
}

/**
 * His limb continued where he drew none of it, up to its joint (hidden at rest under the cuirass or the
 * skirt, shown as the limb reaches out): his first row across the limb with at least `inner` cells inside
 * his line, all of them `plain` (no stud or trim), repeated along the limb (his angle; `period` rows from
 * there, for a pattern such as laces) up to the row `to`
 * (counted from the piece's first row; negative is above it), over every row above it too, and closed at
 * the top by his line.
 */
export function continuedTo(piece: PaintedPiece, to: number, inner: number, line: (hex: string) => boolean, plain: (hex: string) => boolean, period = 1): PaintedPiece {
  const cells = (row: string) => [...row].filter((ch) => ch !== '.');
  const r = piece.rows.findIndex((row) => cells(row).filter((ch) => !line(piece.colors[ch])).length >= inner && cells(row).every((ch) => line(piece.colors[ch]) || plain(piece.colors[ch])));
  if (r < 0) return piece;
  const top = Math.min(0, Math.floor(to));
  const a = (piece.angle * Math.PI) / 180;
  const shift = (y: number) => (y < r ? Math.round(((y - r) * Math.cos(a)) / Math.sin(a)) : 0);
  const pad = Math.max(0, ...Array.from({ length: r - top }, (_, k) => -shift(top + k)));
  const counts = new Map<string, number>();
  for (const row of piece.rows) for (const ch of row) if (ch !== '.' && line(piece.colors[ch])) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const edge = [...counts].sort((p, q) => q[1] - p[1])[0]?.[0] ?? '.';
  const rows: string[] = [];
  for (let y = top; y < piece.rows.length; y++) {
    const src = y < r ? piece.rows[r + ((((y - r) % period) + period) % period)] : piece.rows[y];
    rows.push('.'.repeat(Math.max(0, pad + shift(y))) + src);
  }
  rows[0] = [...rows[0]].map((ch) => (ch === '.' ? '.' : edge)).join('');
  const out = { ...piece, rows, pivot: [piece.pivot[0] + pad, piece.pivot[1] - top] as [number, number] };
  CONTINUED.set(out, r - piece.pivot[1]);
  return out;
}

const CONTINUED = new WeakMap<PaintedPiece, number>();

/** Where his own piece begins on a piece continuedTo ran on (rows past its pivot), or 0. */
export const continuedFrom = (p: PaintedPiece): number => CONTINUED.get(p) ?? 0;

/**
 * A joint a painted piece bends at (see stampBent): its cells within `r` fine pixels of `about` turn about
 * it by up to `bend` degrees. With `carry` (the far end of the limb: an elbow, a knee) his cells past the
 * joint ride the next segment, turned by the whole bend.
 */
export interface PieceJoint {
  about: Vec;
  r: number;
  bend: number;
  carry?: boolean;
}

/** Degrees between the copies that fill a bent joint (small enough to leave no holes). */
const BEND_STEP = 5;

/**
 * Stamps a painted piece as stampPiece does, and fills each joint it bends at with its own pixels: the
 * cells next to the joint stamped again, turned about it by every angle up to the joint's bend (how far
 * the limb bends past the way he drew it), so the outside of a bent elbow or knee or a raised shoulder is
 * his limb turned there, never a hole or another limb. A copy's inside covers his black line where the
 * limb bends (no line crosses the joint); where it would lie bare (outside the piece and outside
 * `covered`, the pieces drawn over it), it takes his line. With no bend it is stampPiece given `line`. `line`
 * says which of his colours are his black line.
 */
export function stampBent(
  g: DrawCtx,
  depth: Depth,
  piece: PaintedPiece,
  at: Vec,
  deg: number,
  part: PartId,
  joints: PieceJoint[],
  line: (hex: string) => boolean,
  color?: (ch: string, hex: string) => string,
  covered?: (x: number, y: number) => boolean,
): void {
  const px = new Map<number, { ch: string; added: boolean }>();
  const isLine = (ch: string) => line(piece.colors[ch]);
  const put = (t: PixelTemplate, a: Vec, d: number, first: boolean) => {
    const ax = Math.floor(a.x * RES);
    const ay = Math.floor(a.y * RES);
    // His line kept whole as the piece turns (rotateLined): what it puts back goes only where nothing is.
    const own = rotateTemplate(t, d - piece.angle).length;
    rotateLined(t, d - piece.angle, isLine).forEach((p, k) => {
      const x = ax + p.dx;
      const y = ay + p.dy;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
      const i = y * GRID + x;
      const was = px.get(i);
      if (k >= own ? !was : first || !was || (isLine(was.ch) && !isLine(p.ch))) px.set(i, { ch: p.ch, added: !first });
    });
  };
  /** The piece turned by `d` about `about`: where its pivot lands. */
  const turned = (about: Vec, d: number): Vec => {
    const c = Math.cos((d * Math.PI) / 180);
    const s = Math.sin((d * Math.PI) / 180);
    const ox = at.x - about.x;
    const oy = at.y - about.y;
    return v(about.x + ox * c - oy * s, about.y + ox * s + oy * c);
  };
  const rad = ((deg - piece.angle) * Math.PI) / 180;
  const along = (piece.angle * Math.PI) / 180;
  const bent = joints.filter((j) => Math.abs(j.bend) >= 1);
  // Each bent joint among the piece's own cells (as he drew it): its cells next to it, and past it.
  const sides = bent.map((j) => {
    const dx = (j.about.x - at.x) * RES;
    const dy = (j.about.y - at.y) * RES;
    const jx = piece.pivot[0] + dx * Math.cos(rad) + dy * Math.sin(rad);
    const jy = piece.pivot[1] - dx * Math.sin(rad) + dy * Math.cos(rad);
    const past = (x: number, y: number) => !!j.carry && (x - jx) * Math.cos(along) + (y - jy) * Math.sin(along) > 0;
    const keep = (f: (x: number, y: number) => boolean): PixelTemplate => ({
      pivot: piece.pivot,
      rows: piece.rows.map((row, y) => [...row].map((ch, x) => (ch !== '.' && f(x, y) ? ch : '.')).join('')),
    });
    return { j, past, near: keep((x, y) => !past(x, y) && Math.hypot(x - jx, y - jy) <= j.r), beyond: keep(past) };
  });
  const carried = sides.filter((s) => s.j.carry);
  put(carried.length ? { pivot: piece.pivot, rows: piece.rows.map((row, y) => [...row].map((ch, x) => (carried.some((s) => s.past(x, y)) ? '.' : ch)).join('')) } : piece, at, deg, true);
  for (const s of carried) put(s.beyond, turned(s.j.about, s.j.bend), deg + s.j.bend, true);
  for (const { j, near } of sides) {
    const n = Math.ceil(Math.abs(j.bend) / BEND_STEP);
    for (let k = 1; k <= n; k++) {
      const d = (j.bend * k) / n;
      put(near, turned(j.about, d), deg + d, false);
    }
  }
  // His line where a copy's inside lies bare: the line colour he uses most in this piece.
  const counts = new Map<string, number>();
  for (const row of piece.rows) for (const ch of row) if (ch !== '.' && isLine(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const edge = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  const bare = (x: number, y: number) => x < 0 || y < 0 || x >= GRID || y >= GRID || (!px.has(y * GRID + x) && !covered?.(x, y));
  const fixed: number[] = [];
  for (const [i, p] of px) {
    if (!p.added || isLine(p.ch) || !edge) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    if (bare(x - 1, y) || bare(x + 1, y) || bare(x, y - 1) || bare(x, y + 1)) fixed.push(i);
  }
  for (const i of fixed) px.get(i)!.ch = edge!;
  const L = g.L(depth);
  const mats = new Map<string, number>();
  for (const [ch, hex] of Object.entries(piece.colors)) mats.set(ch, g.m(color ? color(ch, hex) : hex, 'flat'));
  for (const [i, p] of px) L.set(i % GRID, (i / GRID) | 0, mats.get(p.ch)!, 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
}

/** Past this lean (degrees from his picture) a piece is turned with RotSprite; up to it, sheared. */
const LEAN_SHEAR = 20;

/**
 * Stamps his piece leaning `deg` about its pivot. A small lean shears it, each row moved across whole
 * (so his ab plates and strips stay his pixels, only stepped), as far as a turn would move it; a large
 * one turns it with RotSprite (with `line`, his black line kept whole: rotateLined).
 */
export function stampLeaning(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color: (ch: string, hex: string) => string, line?: (hex: string) => boolean): void {
  const d = deg - piece.angle;
  if (Math.abs(d) > LEAN_SHEAR) {
    stampPiece(g, depth, piece, at, deg, part, color, line);
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

const stretched = new Map<PaintedPiece, Map<string, PaintedPiece>>();

/**
 * His piece for a longer bone (a seated thigh, rig.ts kneeLeg): the bone `extra` fine pixels longer than
 * the `bone` he painted it for, by repeating whole rows of his between the pivot and the bone's end, spread
 * evenly; each row after a repeat moves across as far as the bone runs across over a row (the piece's
 * angle), so a slanted limb keeps its slant. The rows past the bone's end move on whole. Every pixel is his.
 * With `from`, only rows that many or more past the pivot repeat (the strip continuedTo ran up to the
 * shoulder keeps its length: his limb itself lengthens).
 */
export function stretchPiece(p: PaintedPiece, extra: number, bone: number, from = 0): PaintedPiece {
  const a = (p.angle * Math.PI) / 180;
  const R = Math.round(bone * Math.sin(a));
  const E = Math.round(extra * Math.sin(a));
  if (E <= 0 || R <= 0) return p;
  let byKey = stretched.get(p);
  if (!byKey) stretched.set(p, (byKey = new Map()));
  const F = Math.max(0, Math.min(from, R - 1));
  const key = `${R},${E},${F}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const [px, py] = p.pivot;
  const cot = Math.cos(a) / Math.sin(a);
  const W = Math.max(...p.rows.map((r) => r.length));
  const src: { row: number; sh: number }[] = [];
  for (let j = 0; j < p.rows.length + E; j++) {
    const r = j - py;
    const at = r <= F ? r : r <= R + E ? F + Math.ceil(((r - F) * (R - F)) / (R + E - F)) : r - E;
    src.push({ row: at + py, sh: Math.round((r - at) * cot) });
  }
  const lo = Math.min(0, ...src.map((s) => s.sh));
  const hi = Math.max(0, ...src.map((s) => s.sh));
  // (a pivot above the piece: the rows between it and the piece are empty, and repeat as such)
  const grow = (from: string[]) => src.map(({ row, sh }) => '.'.repeat(sh - lo) + (from[row] ?? '').padEnd(W, '.') + '.'.repeat(hi - sh));
  // (its open edge, PaintedPiece.seal, lengthened with it)
  const out: PaintedPiece = { ...p, rows: grow(p.rows), pivot: [px - lo, py], ...(p.seal ? { seal: grow(p.seal) } : {}) };
  byKey.set(key, out);
  return out;
}
