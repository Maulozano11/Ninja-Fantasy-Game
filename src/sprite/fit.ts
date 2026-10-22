// Fitting the owner's painted pieces to another body without redrawing them: a piece made for one body
// (his broad man, the bulky body) is made narrower or shorter by leaving out whole columns or rows of his
// (each time the one most like the next one toward the pivot, so his seams, lines and highlights stay),
// and wider or longer by repeating whole columns or rows of his spread evenly over it. Every pixel left
// is one of his; the pivot cell stays on its joint.

import type { PaintedPiece } from './painted';

type Grid = string[][];

const cols = (g: Grid, i: number) => g.map((r) => r[i]);
const same = (a: string[], b: string[]) => a.reduce((n, c, k) => n + (c === b[k] ? 1 : 0), 0);

/**
 * One side of the pivot along one axis: `idx` are the lines (columns or rows) on that side, nearest the
 * pivot last; `want` how many there should be. Returns the lines in order, some left out or repeated.
 * The outermost line (his outline) always stays.
 */
function side(idx: number[], want: number, get: (i: number) => string[]): number[] {
  let out = [...idx];
  if (want < out.length) {
    while (out.length > Math.max(1, want)) {
      let best = -1;
      let score = -Infinity;
      // Never the outermost line (index 0 of `out`). The line most like the next one goes first, but
      // not one whose loss would bare his figure's inside on the lines either side of it (a jagged
      // outline running through it): each cell it bares counts against it.
      for (let k = 1; k < out.length; k++) {
        const next = k + 1 < out.length ? out[k + 1] : null;
        const line = get(out[k]);
        let s = next === null ? same(line, get(out[k - 1])) : same(line, get(next));
        if (next !== null) {
          const a = get(out[k - 1]);
          const b = get(next);
          for (let r = 0; r < line.length; r++) if (line[r] !== '.' && (a[r] !== '.') !== (b[r] !== '.')) s -= 3;
        }
        if (s > score) {
          score = s;
          best = k;
        }
      }
      if (best < 0) break;
      out.splice(best, 1);
    }
  } else if (want > out.length && out.length > 1) {
    const add = want - out.length;
    const n = out.length;
    const rep = new Set(Array.from({ length: add }, (_, k) => 1 + Math.floor(((n - 1) * (k + 0.5)) / add)));
    const res: number[] = [];
    out.forEach((i, k) => {
      res.push(i);
      if (rep.has(k)) res.push(i);
    });
    // More to add than lines to repeat: repeat the middle ones again.
    while (res.length < want) res.splice(Math.floor(res.length / 2), 0, res[Math.floor(res.length / 2)]);
    out = res;
  }
  return out;
}

/**
 * The lines (columns or rows) of a piece `n` lines long refitted about its pivot line `p`: those before it
 * scaled by `before`, those after it by `after`. A pivot outside the piece (a sleeve hanging below its
 * shoulder joint) scales the whole piece and its distance from the pivot alike.
 */
function axis(n: number, p: number, before: number, after: number, get: (i: number) => string[]): { order: number[]; pivot: number } {
  const all = Array.from({ length: n }, (_, i) => i);
  if (p >= 0 && p < n) {
    const B = side(all.slice(0, p), Math.round(p * before), get);
    const A = side(all.slice(p + 1).reverse(), Math.round((n - 1 - p) * after), get).reverse();
    return { order: [...B, p, ...A], pivot: B.length };
  }
  if (p < 0) {
    const A = side([...all].reverse(), Math.max(1, Math.round(n * after)), get).reverse();
    return { order: A, pivot: -Math.max(1, Math.round(-p * after)) };
  }
  const B = side(all, Math.max(1, Math.round(n * before)), get);
  return { order: B, pivot: B.length - 1 + Math.max(1, Math.round((p - n + 1) * before)) };
}

const grid = (rows: string[], W: number): Grid => rows.map((r) => r.padEnd(W, '.').split(''));

const cache = new Map<string, PaintedPiece>();

/**
 * His piece with `left`/`right` columns on each side of the pivot column and `up`/`down` rows above and
 * below the pivot row (each a factor of what he drew: 1 keeps it). A pivot outside the piece (an object
 * hanging off a joint) moves the piece by `shift` cells instead of squeezing the empty side. The cells
 * to close with his line (`seal`) follow his pixels.
 */
export function refit(p: PaintedPiece, f: Fit, key: string): PaintedPiece {
  const k = `${key}|${f.left ?? 1},${f.right ?? 1},${f.up ?? 1},${f.down ?? 1},${f.shift ?? ''}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const out = refitRows(p, f).out;
  cache.set(k, out);
  return out;
}

type Fit = { left?: number; right?: number; up?: number; down?: number; shift?: [number, number] };

/** refit, and which of his rows each row of the result is. */
function refitRows(p: PaintedPiece, f: Fit): { out: PaintedPiece; from: number[] } {
  const W = Math.max(...p.rows.map((r) => r.length));
  const g = grid(p.rows, W);
  const [px, py] = p.pivot;
  const xs = axis(W, px, f.left ?? 1, f.right ?? 1, (i) => cols(g, i));
  const ys = axis(g.length, py, f.up ?? 1, f.down ?? 1, (i) => g[i]);
  const pick = (h: Grid) => ys.order.map((y) => xs.order.map((x) => h[y][x]).join(''));
  const rows = pick(g);
  const out: PaintedPiece = { ...p, rows, pivot: [xs.pivot + (f.shift?.[0] ?? 0), ys.pivot + (f.shift?.[1] ?? 0)] };
  // Where lines left out bare a cell whose neighbour in his picture was more of his figure, the cell is
  // marked open, so a pose closes it with his line like any cut of his (PaintedPiece.seal).
  const filled = (rs: string[] | Grid, y: number, x: number) => y >= 0 && y < rs.length && x >= 0 && x < rs[y].length && rs[y][x] !== '.';
  const seal = (p.seal ? pick(grid(p.seal, W)) : rows.map((r) => '.'.repeat(r.length))).map((r) => r.split(''));
  let opened = false;
  rows.forEach((r, j) =>
    [...r].forEach((c, i) => {
      if (c === '.') return;
      const sy = ys.order[j];
      const sx = xs.order[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!filled(rows, j + dy, i + dx) && filled(g, sy + dy, sx + dx)) {
          seal[j][i] = 'x';
          opened = true;
        }
      }
    }),
  );
  if (p.seal || opened) out.seal = seal.map((r) => r.join(''));
  return { out, from: ys.order };
}

/**
 * Each row of a piece moved across whole by `sh[row]` cells (his pixels only moved, none made or lost),
 * its empty columns trimmed; the pivot column follows the pivot row's move (none, for a shear about it).
 */
function shiftRows(p: PaintedPiece, sh: number[]): PaintedPiece {
  const W = Math.max(...p.rows.map((r) => r.length));
  const lo = Math.min(0, ...sh);
  const hi = Math.max(0, ...sh);
  const move = (rows: string[]) => rows.map((r, j) => '.'.repeat(sh[j] - lo) + r.padEnd(W, '.') + '.'.repeat(hi - sh[j]));
  let rows = move(p.rows);
  let seal = p.seal ? move(p.seal) : undefined;
  let x0 = 0;
  let x1 = W + hi - lo - 1;
  while (x0 < x1 && rows.every((r) => r[x0] === '.')) x0++;
  while (x1 > x0 && rows.every((r) => r[x1] === '.')) x1--;
  const cut = (rs: string[]) => rs.map((r) => r.slice(x0, x1 + 1));
  rows = cut(rows);
  if (seal) seal = cut(seal);
  const out: PaintedPiece = { ...p, rows, pivot: [p.pivot[0] - lo - x0, p.pivot[1]] };
  if (seal) out.seal = seal;
  return out;
}

/**
 * His limb piece made `across` as wide and `along` as long below its pivot, whatever angle he drew the
 * limb at: its rows are first moved across whole (a shear, every pixel his) so the limb runs straight
 * down the columns, his columns along the limb are left out or repeated and his rows across it, and each
 * row is moved back as far as it was moved (so his slanting lines join up as he drew them). It still
 * points the way he drew it, so a pose turns it once, as any piece of his.
 */
export function limbRefit(p: PaintedPiece, across: number, along: number, key: string): PaintedPiece {
  const k = `limb ${key}|${across},${along}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const rad = (p.angle * Math.PI) / 180;
  const cot = Math.cos(rad) / Math.sin(rad);
  const sh = p.rows.map((_, j) => Math.round((j - p.pivot[1]) * cot));
  const up = shiftRows(p, sh.map((v) => -v));
  const { out: fit, from } = refitRows(up, { left: across, right: across, down: along });
  const out = shiftRows(fit, from.map((j) => sh[j]));
  cache.set(k, out);
  return out;
}
