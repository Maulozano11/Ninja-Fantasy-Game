// Pieces painted by the owner (his pixels and colours, lifted out of his pictures by tools/refs/*.py)
// that ride the rig: each is drawn as he drew it when its limb points the way it did in his picture,
// and turned with RotSprite as the limb turns in other poses (or, for a coat's skirts, bent).

import { armJoints, type Depth, type DrawCtx, type Side } from './ctx';
import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, partIndex, PartId, RES, v, Vec } from './raster';
import { PixelTemplate, rotateLined, rotateTemplate, stampTemplate, TemplatePalette } from './rotsprite';

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
 * every pixel is his. `color` recolours a character's colour (for the item's colour slots). With
 * `line` (which of his colours are his black line), turned it keeps his line whole (rotateLined).
 */
export function stampPiece(g: DrawCtx, depth: Depth, piece: PaintedPiece, at: Vec, deg: number, part: PartId, color?: (ch: string, hex: string) => string, line?: (hex: string) => boolean): void {
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color ? color(ch, hex) : hex, 'flat'), 3];
  stampTemplate(g.L(depth), piece, at, deg - piece.angle, pal, part, { flags: F_NO_TEXTURE | F_NO_OUTLINE, line: line && ((ch) => line(piece.colors[ch])) });
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
  return { ...piece, rows, pivot: [piece.pivot[0] + pad, piece.pivot[1] - top] };
}

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
