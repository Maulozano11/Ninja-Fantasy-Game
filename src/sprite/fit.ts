// Fitting the owner's painted pieces to another body without redrawing them: a piece made for one body
// (his broad man, the bulky body) is made narrower or shorter by leaving out whole columns or rows of his
// (each time the one most like the next one toward the pivot, so his seams, lines and highlights stay),
// and wider or longer by repeating whole columns or rows of his spread evenly over it. Every pixel left
// is one of his; the pivot cell stays on its joint.

import type { PaintedPiece } from './painted';
import { rotateTemplate } from './rotsprite';

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
      let score = -1;
      // Never the outermost line (index 0 of `out`).
      for (let k = 1; k < out.length; k++) {
        const next = k + 1 < out.length ? out[k + 1] : null;
        const s = next === null ? same(get(out[k]), get(out[k - 1])) : same(get(out[k]), get(next));
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

const cache = new Map<string, PaintedPiece>();

/**
 * His piece with `left`/`right` columns on each side of the pivot column and `up`/`down` rows above and
 * below the pivot row (each a factor of what he drew: 1 keeps it). A pivot outside the piece (an object
 * hanging off a joint) moves the piece by `shift` cells instead of squeezing the empty side.
 */
export function refit(p: PaintedPiece, f: { left?: number; right?: number; up?: number; down?: number; shift?: [number, number] }, key: string): PaintedPiece {
  const k = `${key}|${f.left ?? 1},${f.right ?? 1},${f.up ?? 1},${f.down ?? 1},${f.shift ?? ''}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const W = Math.max(...p.rows.map((r) => r.length));
  const g: Grid = p.rows.map((r) => r.padEnd(W, '.').split(''));
  const [px, py] = p.pivot;
  const xs = axis(W, px, f.left ?? 1, f.right ?? 1, (i) => cols(g, i));
  const ys = axis(g.length, py, f.up ?? 1, f.down ?? 1, (i) => g[i]);
  const pivotX = xs.pivot;
  const pivotY = ys.pivot;
  const rows = ys.order.map((y) => xs.order.map((x) => g[y][x]).join(''));
  const out: PaintedPiece = { ...p, rows, pivot: [pivotX + (f.shift?.[0] ?? 0), pivotY + (f.shift?.[1] ?? 0)] };
  cache.set(k, out);
  return out;
}

const upright = new Map<PaintedPiece, PaintedPiece>();

/**
 * His limb piece turned (RotSprite, as every pose turns it) so its limb points straight down: its
 * columns then run across the limb and its rows along it, so refit narrows it across and shortens or
 * lengthens it along the limb, whatever angle he drew the limb at.
 */
export function uprightPiece(p: PaintedPiece): PaintedPiece {
  const hit = upright.get(p);
  if (hit) return hit;
  const px = rotateTemplate(p, 90 - p.angle);
  const x0 = Math.min(...px.map((q) => q.dx));
  const y0 = Math.min(...px.map((q) => q.dy));
  const w = Math.max(...px.map((q) => q.dx)) - x0 + 1;
  const h = Math.max(...px.map((q) => q.dy)) - y0 + 1;
  const g = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  for (const q of px) g[q.dy - y0][q.dx - x0] = q.ch;
  const out: PaintedPiece = { ...p, rows: g.map((r) => r.join('')), pivot: [-x0, -y0], angle: 90 };
  upright.set(p, out);
  return out;
}

const middle = new Map<PaintedPiece, PaintedPiece>();

/** His piece with its pivot moved across to the middle of its columns (it hangs centred on the joint). */
export function centered(p: PaintedPiece): PaintedPiece {
  const hit = middle.get(p);
  if (hit) return hit;
  let x0 = Infinity;
  let x1 = -1;
  for (const r of p.rows)
    for (let i = 0; i < r.length; i++)
      if (r[i] !== '.') {
        x0 = Math.min(x0, i);
        x1 = Math.max(x1, i);
      }
  const out: PaintedPiece = { ...p, pivot: [Math.round((x0 + x1) / 2), p.pivot[1]] };
  middle.set(p, out);
  return out;
}
