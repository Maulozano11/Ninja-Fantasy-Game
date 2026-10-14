// Helpers for the jutsu VFX sprites (vfx-a.ts and its element files).
//
// Every effect is painted as a heat field (0 = empty, 1 = white hot) and quantized into the
// effect's own 7-color palette with hard band edges: step 0 is the 1 px outline (the darkest
// color of the palette, never black), steps 1-6 run from the dark rim to the near-white core.
// Parts are rendered and outlined one by one and stacked, so a front part keeps an inner line
// over the part behind it, like the character sprites. Particles are drawn on their own layer
// and outlined too, so they read as small detached pieces.
//
// Loops use periodic noise and phases that wrap after the last frame, and tileable pieces use
// noise that repeats every 64 px, so nothing pops when the game loops or repeats them.

import { Canvas, Color, PX_PER_M, WorldSprite, hash, hex, withAlpha } from './kit';

export const TAU = Math.PI * 2;
export type Pt = [number, number];
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (a: number, b: number, t: number): number => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
export const fract = (v: number): number => v - Math.floor(v);
/** Deterministic random in [0, 1) for (seed, i, j). */
export const rnd = (seed: number, i: number, j = 0): number => hash(i * 7 + 3, j * 13 + 5, seed);
/** Deterministic random in [a, b). */
export const rr = (seed: number, i: number, a: number, b: number): number => a + (b - a) * rnd(seed, i);
export const dist = (a: Pt, b: Pt): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

// --- noise ----------------------------------------------------------------------------------

/**
 * Value noise in [0, 1) with features `cell` px wide that repeats every `perX` px across and
 * `perY` px down (0 = no repeat). Periods should be multiples of the cell.
 */
export function pnoise(x: number, y: number, cell: number, perX = 0, perY = 0, seed = 0): number {
  const fx = x / cell, fy = y / cell;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const cx = perX ? Math.max(1, Math.round(perX / cell)) : 0, cy = perY ? Math.max(1, Math.round(perY / cell)) : 0;
  const wx = (i: number) => (cx ? ((i % cx) + cx) % cx : i);
  const wy = (i: number) => (cy ? ((i % cy) + cy) % cy : i);
  const a = hash(wx(x0), wy(y0), seed), b = hash(wx(x0 + 1), wy(y0), seed);
  const c = hash(wx(x0), wy(y0 + 1), seed), d = hash(wx(x0 + 1), wy(y0 + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
/** Fractal periodic noise: octaves of `pnoise`, halving the cell (the periods are kept). */
export function pfbm(x: number, y: number, cell: number, octaves = 3, perX = 0, perY = 0, seed = 0): number {
  let sum = 0, amp = 1, tot = 0;
  for (let o = 0; o < octaves; o++) {
    sum += pnoise(x, y, cell / 2 ** o, perX, perY, seed + o * 101) * amp;
    tot += amp;
    amp *= 0.5;
  }
  return sum / tot;
}
/** Noise that loops in time: t in [0, 1) walks a circle through the noise plane. */
export function tnoise(x: number, y: number, t: number, cell: number, radius = 6, seed = 0): number {
  return pfbm(x + Math.cos(t * TAU) * radius * cell * 0.25, y + Math.sin(t * TAU) * radius * cell * 0.25, cell, 2, 0, 0, seed);
}

// --- paths ----------------------------------------------------------------------------------

/** Cubic bezier as `n + 1` points. */
export function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([
      s * s * s * p0[0] + 3 * s * s * t * p1[0] + 3 * s * t * t * p2[0] + t * t * t * p3[0],
      s * s * s * p0[1] + 3 * s * s * t * p1[1] + 3 * s * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}
/** Quadratic bezier as `n + 1` points. */
export function qbez(p0: Pt, c: Pt, p1: Pt, n = 20): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * p0[0] + 2 * s * t * c[0] + t * t * p1[0], s * s * p0[1] + 2 * s * t * c[1] + t * t * p1[1]]);
  }
  return out;
}
/** Elliptical arc from angle a0 to a1 (radians, screen y down), optionally rotated. */
export function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 24, rot = 0): Pt[] {
  const out: Pt[] = [];
  const c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}
/** Jagged lightning path from a to b by midpoint displacement (`depth` levels). */
export function jag(a: Pt, b: Pt, seed: number, depth = 4, amp = 0.28): Pt[] {
  let pts: Pt[] = [a, b];
  let disp = amp * dist(a, b);
  for (let d = 0; d < depth; d++) {
    const next: Pt[] = [pts[0]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const p = pts[i], q = pts[i + 1];
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      const k = (rnd(seed, d * 97 + i, 3) - 0.5) * 2 * disp;
      next.push([(p[0] + q[0]) / 2 - (dy / l) * k, (p[1] + q[1]) / 2 + (dx / l) * k], q);
    }
    pts = next;
    disp *= 0.52;
  }
  return pts;
}
/** Point and unit tangent at t in [0, 1] along a polyline (by length). */
export function along(pts: Pt[], t: number): { p: Pt; d: Pt } {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + dist(pts[i - 1], pts[i]));
  const total = L[L.length - 1] || 1, want = clamp(t, 0, 1) * total;
  let i = 1;
  while (i < pts.length - 1 && L[i] < want) i++;
  const a = pts[i - 1], b = pts[i];
  const seg = L[i] - L[i - 1] || 1, k = (want - L[i - 1]) / seg;
  const l = dist(a, b) || 1;
  return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], d: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] };
}
/** Translates and rotates points around a pivot. */
export function xform(pts: Pt[], dx: number, dy: number, rot = 0, pivot: Pt = [0, 0]): Pt[] {
  const c = Math.cos(rot), s = Math.sin(rot);
  return pts.map(([x, y]) => {
    const u = x - pivot[0], v = y - pivot[1];
    return [pivot[0] + u * c - v * s + dx, pivot[1] + u * s + v * c + dy] as Pt;
  });
}

// --- heat fields ----------------------------------------------------------------------------

type Num = number | ((t: number) => number);
const val = (n: Num, t: number): number => (typeof n === 'function' ? n(t) : n);

/** A heat (or lightness) value per pixel; shapes max-blend into it. */
export class Field {
  readonly v: Float32Array;
  constructor(readonly w: number, readonly h: number) {
    this.v = new Float32Array(w * h);
  }
  at(x: number, y: number): number {
    x = Math.floor(x);
    y = Math.floor(y);
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.v[y * this.w + x] : 0;
  }
  put(x: number, y: number, h: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (h > this.v[i]) this.v[i] = h;
  }
  /** Max-blends fn at pixel centers over a box. */
  region(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => number): void {
    const ya = Math.max(0, Math.floor(y0)), yb = Math.min(this.h - 1, Math.ceil(y1));
    const xa = Math.max(0, Math.floor(x0)), xb = Math.min(this.w - 1, Math.ceil(x1));
    for (let y = ya; y <= yb; y++)
      for (let x = xa; x <= xb; x++) {
        const h = fn(x + 0.5, y + 0.5);
        if (h > 0) this.put(x, y, h);
      }
  }
  /** Whole-field version of `region`. */
  fill(fn: (x: number, y: number) => number): void {
    this.region(0, 0, this.w - 1, this.h - 1, fn);
  }
  /** Round blob: peak at the center, 0 at radius r; pow > 1 widens the hot core. */
  disc(cx: number, cy: number, r: number, peak = 1, pow = 1): void {
    if (r <= 0) return;
    this.region(cx - r, cy - r, cx + r, cy + r, (x, y) => {
      const d = Math.hypot(x - cx, y - cy) / r;
      return d < 1 ? peak * (1 - Math.pow(d, pow)) : 0;
    });
  }
  /** Rotated elliptical blob. */
  ell(cx: number, cy: number, rx: number, ry: number, rot = 0, peak = 1, pow = 1): void {
    const c = Math.cos(rot), s = Math.sin(rot), R = Math.max(rx, ry);
    this.region(cx - R, cy - R, cx + R, cy + R, (x, y) => {
      const dx = x - cx, dy = y - cy;
      const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
      const d = Math.hypot(u, v);
      return d < 1 ? peak * (1 - Math.pow(d, pow)) : 0;
    });
  }
  /** Tapered capsule from (x0, y0) to (x1, y1): radius and peak heat interpolate along it. */
  seg(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, h0: number, h1: number, pow = 1): void {
    const R = Math.max(r0, r1);
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy;
    this.region(Math.min(x0, x1) - R, Math.min(y0, y1) - R, Math.max(x0, x1) + R, Math.max(y0, y1) + R, (x, y) => {
      const t = L2 ? clamp(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1) : 0;
      const r = r0 + (r1 - r0) * t;
      if (r <= 0) return 0;
      const d = Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) / r;
      return d < 1 ? (h0 + (h1 - h0) * t) * (1 - Math.pow(d, pow)) : 0;
    });
  }
  /** A brush stroke along a polyline: radius and heat are functions of t in [0, 1] (by length). */
  path(pts: Pt[], r: Num, h: Num = 1, pow = 1): void {
    if (pts.length < 2) {
      if (pts.length) this.disc(pts[0][0], pts[0][1], val(r, 0), val(h, 0), pow);
      return;
    }
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + dist(pts[i - 1], pts[i]));
    const total = L[L.length - 1] || 1;
    for (let i = 0; i + 1 < pts.length; i++) {
      const t0 = L[i] / total, t1 = L[i + 1] / total;
      this.seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], val(r, t0), val(r, t1), val(h, t0), val(h, t1), pow);
    }
  }
  /** Fills a polygon with a constant heat or a function of the pixel center. */
  poly(pts: Pt[], h: number | ((x: number, y: number) => number)): void {
    let y0 = Infinity, y1 = -Infinity;
    for (const [, y] of pts) {
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, Math.ceil(y1)); y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) {
          const v = typeof h === 'function' ? h(x + 0.5, y + 0.5) : h;
          if (v > 0) this.put(x, y, v);
        }
    }
  }
  /** Rewrites every pixel: fn(current heat, x, y) (pixel centers). */
  map(fn: (h: number, x: number, y: number) => number): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        this.v[i] = Math.max(0, fn(this.v[i], x + 0.5, y + 0.5));
      }
  }
  /** Clears pixels where fn is true. */
  cut(fn: (x: number, y: number, h: number) => boolean): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (this.v[i] > 0 && fn(x + 0.5, y + 0.5, this.v[i])) this.v[i] = 0;
      }
  }
  /** Max-merges another field, scaled by k. */
  merge(o: Field, dx = 0, dy = 0, k = 1): void {
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) if (o.v[y * o.w + x] > 0) this.put(x + dx, y + dy, o.v[y * o.w + x] * k);
  }
  /** True if any pixel is set. */
  any(): boolean {
    for (let i = 0; i < this.v.length; i++) if (this.v[i] > 0) return true;
    return false;
  }
}

// --- rendering ------------------------------------------------------------------------------

export interface Look {
  /** Ascending heat thresholds for palette steps 1..n (default: evenly spread from 0). */
  th?: number[];
  /** rim[d - 1] = highest step allowed d px inside the silhouette (keeps a dark rim band). */
  rim?: number[];
  /** Alpha per palette step (index 0 is the outline). */
  alpha?: number[];
  /** 1 px outline in palette step 0 (default true). */
  outline?: boolean;
  /** Outline the diagonals too (thicker corners). */
  diag?: boolean;
  /** Added to the heat before banding (moves band edges, never the silhouette). */
  jitter?: (x: number, y: number) => number;
  /** Lowest step used (default 1). */
  lo?: number;
  /** Highest step used (default the last). */
  hi?: number;
  /** Heat at or below this is empty (default 0.02). */
  min?: number;
}

/** Quantizes a field into hard palette bands and outlines it. */
export function render(f: Field, pal: Color[], look: Look = {}): Canvas {
  const n = pal.length - 1;
  const th = look.th ?? Array.from({ length: n }, (_, i) => i / n);
  const lo = look.lo ?? 1, hi = look.hi ?? n, mn = look.min ?? 0.02;
  const c = new Canvas(f.w, f.h);
  let rimD: Int16Array | null = null;
  if (look.rim && look.rim.length) rimD = edgeDistance(f, look.rim.length, mn);
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const h = f.v[y * f.w + x];
      if (h <= mn) continue;
      const hh = h + (look.jitter ? look.jitter(x + 0.5, y + 0.5) : 0);
      let idx = 1;
      for (let i = 1; i < th.length; i++) if (hh >= th[i]) idx = i + 1;
      if (rimD && look.rim) {
        const d = rimD[y * f.w + x];
        if (d > 0 && d <= look.rim.length) idx = Math.min(idx, look.rim[d - 1]);
      }
      idx = clamp(idx, lo, hi);
      const a = look.alpha ? look.alpha[idx] ?? 255 : 255;
      c.set(x, y, withAlpha(pal[idx], a));
    }
  if (look.outline ?? true) outlineIn(c, pal[0], { diag: look.diag, alpha: look.alpha ? look.alpha[0] : 255 });
  return c;
}

/** Distance (4-neighbour steps) from the outside for set pixels, up to `max` (0 = deeper). */
function edgeDistance(f: Field, max: number, mn: number): Int16Array {
  const d = new Int16Array(f.w * f.h);
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < f.w && y < f.h && f.v[y * f.w + x] > mn;
  let frontier: number[] = [];
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++)
      if (on(x, y) && (!on(x + 1, y) || !on(x - 1, y) || !on(x, y + 1) || !on(x, y - 1))) {
        d[y * f.w + x] = 1;
        frontier.push(y * f.w + x);
      }
  for (let k = 2; k <= max; k++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % f.w, y = (i - x) / f.w;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + ox, yy = y + oy;
        if (on(xx, yy) && !d[yy * f.w + xx]) {
          d[yy * f.w + xx] = k;
          next.push(yy * f.w + xx);
        }
      }
    }
    frontier = next;
  }
  return d;
}

/** Adds a 1 px outline of `col` around every pixel at or above minAlpha. */
export function outlineIn(c: Canvas, col: Color, opts: { minAlpha?: number; diag?: boolean; alpha?: number } = {}): void {
  const minA = opts.minAlpha ?? 1;
  const nb = opts.diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const add: number[] = [];
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (c.alpha(x, y) >= minA) continue;
      for (const [ox, oy] of nb)
        if (c.alpha(x + ox, y + oy) >= minA) {
          add.push(x, y);
          break;
        }
    }
  const oc = withAlpha(col, opts.alpha ?? 255);
  for (let i = 0; i < add.length; i += 2) c.set(add[i], add[i + 1], oc);
}

/** Draws layers bottom to top onto a new canvas. */
export function stack(w: number, h: number, ...layers: (Canvas | null | undefined)[]): Canvas {
  const out = new Canvas(w, h);
  for (const l of layers) if (l) out.draw(l, 0, 0);
  return out;
}

/** Multiplies a canvas's alpha by k (fading). */
export function fade(c: Canvas, k: number): Canvas {
  const out = c.clone();
  for (let i = 3; i < out.px.length; i += 4) out.px[i] = Math.round(out.px[i] * clamp(k, 0, 1));
  return out;
}

/** Copies pixels from `src` only where keep(x, y) is true. */
export function mask(src: Canvas, keep: (x: number, y: number) => boolean): Canvas {
  const out = new Canvas(src.w, src.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (keep(x, y)) out.set(x, y, src.get(x, y));
  return out;
}

/** Shifts a canvas, wrapping around horizontally (for tiles). */
export function wrapShift(c: Canvas, dx: number): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) out.set((((x + dx) % c.w) + c.w) % c.w, y, c.get(x, y));
  return out;
}

// --- particles ------------------------------------------------------------------------------

/**
 * A small hot particle (no outline: draw it on a particle layer and outline the layer).
 * size 1: one pixel; 2: a 2x2 with a hot corner; 3: a plus; 4: a small diamond; 5: a bigger diamond.
 */
export function spark(c: Canvas, x: number, y: number, size: number, pal: Color[], hi = pal.length - 1, a = 255): void {
  x = Math.round(x);
  y = Math.round(y);
  const P = (i: number) => withAlpha(pal[clamp(i, 1, pal.length - 1)], a);
  if (size <= 1) c.set(x, y, P(hi));
  else if (size === 2) {
    c.set(x, y, P(hi));
    c.set(x + 1, y, P(hi - 1));
    c.set(x, y + 1, P(hi - 1));
    c.set(x + 1, y + 1, P(hi - 2));
  } else if (size === 3) {
    c.set(x, y, P(hi));
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.set(x + ox, y + oy, P(hi - 2));
  } else {
    const r = size >= 5 ? 3 : 2;
    for (let oy = -r; oy <= r; oy++)
      for (let ox = -r; ox <= r; ox++) {
        const d = Math.abs(ox) + Math.abs(oy);
        if (d > r) continue;
        c.set(x + ox, y + oy, P(hi - d - (d === r ? 1 : 0)));
      }
  }
}
/** A 4-point star glint (cross with long arms), for flashes. */
export function glint(c: Canvas, x: number, y: number, arm: number, pal: Color[], hi = pal.length - 1): void {
  x = Math.round(x);
  y = Math.round(y);
  c.set(x, y, pal[hi]);
  for (let k = 1; k <= arm; k++) {
    const col = pal[clamp(hi - Math.ceil((k * 3) / (arm + 1)), 1, hi)];
    c.set(x + k, y, col);
    c.set(x - k, y, col);
    c.set(x, y + k, col);
    c.set(x, y - k, col);
  }
}
/** A horizontal speed line: bright at the right end, fading to the left in hard steps. */
export function streak(c: Canvas, x1: number, y: number, len: number, cols: Color[]): void {
  x1 = Math.round(x1);
  y = Math.round(y);
  for (let k = 0; k < len; k++) {
    const i = Math.min(cols.length - 1, Math.floor((k / len) * cols.length));
    c.plot(x1 - k, y, cols[i]);
  }
}
/** Draws a 1 px polyline (Bresenham between points). */
export function polyline(c: Canvas, pts: Pt[], col: Color | ((t: number) => Color | null)): void {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + dist(pts[i - 1], pts[i]));
  const total = L[L.length - 1] || 1;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let k = 0; k <= n; k++) {
      const t = (L[i] + ((L[i + 1] - L[i]) * k) / n) / total;
      const cc = typeof col === 'function' ? col(t) : col;
      if (cc) c.plot(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), cc);
    }
  }
}

// --- palettes -------------------------------------------------------------------------------

/** A palette from hex strings (step 0 = outline). */
export const palette = (...hs: string[]): Color[] => hs.map((h) => hex(h));

// --- font and sheets ------------------------------------------------------------------------

const GLYPHS: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001110', ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000',
  '/': '001001010100100', '(': '010100100100010', ')': '010001001001010', _: '000000000000111', x: '000101010101000',
  ',': '000000000010100', '+': '000010111010000', '=': '000111000111000', "'": '010010000000000', '>': '100010001010100',
};
/** Draws 3x5 pixel text; returns the width used. */
export function text(c: Canvas, x: number, y: number, s: string, col: Color): number {
  let cx = x;
  for (const ch of s) {
    const g = GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') c.set(cx + (i % 3), y + Math.floor(i / 3), col);
    cx += 4;
  }
  return cx - x;
}
export const textWidth = (s: string): number => s.length * 4;

/** Short description of a sprite's animations, e.g. 'FLY 4F 12FPS LOOP'. */
export function animInfo(s: WorldSprite, key: string): string {
  const a = s.anims[key];
  return `${key} ${a.frames.length}f ${a.fps}fps ${a.loop === false ? 'once' : 'loop'}`;
}

// --- sprites --------------------------------------------------------------------------------

/** Frames for a loop: fn gets t in [0, 1) and the frame index. */
export function frames(n: number, fn: (t: number, i: number) => Canvas): Canvas[] {
  return Array.from({ length: n }, (_, i) => fn(i / n, i));
}
/** Crops a canvas. */
export function crop(c: Canvas, x: number, y: number, w: number, h: number): Canvas {
  const out = new Canvas(w, h);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) out.set(xx, yy, c.get(x + xx, y + yy));
  return out;
}
const r2 = (v: number): number => Math.round(v * 100) / 100;
/** A projectile sprite: one 'fly' loop, anchored at the frame center. */
export function flySprite(name: string, label: string, fr: Canvas[], fps = 12): WorldSprite {
  const f = fr[0];
  return { name, label, meters: [r2(f.w / PX_PER_M), r2(f.h / PX_PER_M)], anchor: [f.w / 2, f.h / 2], tags: ['vfx'], anims: { fly: { frames: fr, fps, loop: true } } };
}
/** A sprite with explicit animations and anchor. */
export function vfxSprite(name: string, label: string, anchor: [number, number], anims: Record<string, { frames: Canvas[]; fps: number; loop?: boolean }>): WorldSprite {
  const f = Object.values(anims)[0].frames[0];
  return { name, label, meters: [r2(f.w / PX_PER_M), r2(f.h / PX_PER_M)], anchor, tags: ['vfx'], anims };
}

/**
 * Stacks parts rendered without outlines: where a part's 1 px rim falls on the parts below it,
 * it becomes a `seam` line (so overlapping feathers or scales stay readable without heavy dark
 * lines), then the whole silhouette gets the `outline`.
 */
export function seamStack(w: number, h: number, layers: (Canvas | null)[], seam: Color, outline: Color, outlineAlpha = 255): Canvas {
  const out = new Canvas(w, h);
  for (const l of layers) {
    if (!l) continue;
    const rim: number[] = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (l.alpha(x, y) || !out.alpha(x, y)) continue;
        if (l.alpha(x + 1, y) || l.alpha(x - 1, y) || l.alpha(x, y + 1) || l.alpha(x, y - 1)) rim.push(x, y);
      }
    out.draw(l, 0, 0);
    for (let i = 0; i < rim.length; i += 2) out.set(rim[i], rim[i + 1], seam);
  }
  outlineIn(out, outline, { alpha: outlineAlpha });
  return out;
}

/**
 * A shaded tube along a polyline. shade(u, s) gets the position along the path (0..1) and the
 * signed offset across it (-1..1, positive on the path's left-hand normal: down for a path
 * running right, right for a path running up).
 */
export function tubeShade(f: Field, pts: Pt[], r: (u: number) => number, shade: (u: number, s: number) => number): void {
  // Each pixel takes its shade from the nearest segment (not the brightest), so dark details
  // like plate seams survive where segments overlap.
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + dist(pts[i - 1], pts[i]));
  const total = L[L.length - 1] || 1;
  const best = new Float32Array(f.w * f.h).fill(Infinity);
  const val = new Float32Array(f.w * f.h);
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, len = Math.sqrt(L2) || 1;
    const R = Math.max(r(L[i] / total), r(L[i + 1] / total)) + 1;
    const xa = Math.max(0, Math.floor(Math.min(x0, x1) - R)), xb = Math.min(f.w - 1, Math.ceil(Math.max(x0, x1) + R));
    const ya = Math.max(0, Math.floor(Math.min(y0, y1) - R)), yb = Math.min(f.h - 1, Math.ceil(Math.max(y0, y1) + R));
    for (let py = ya; py <= yb; py++)
      for (let px = xa; px <= xb; px++) {
        const x = px + 0.5, y = py + 0.5;
        const t = L2 ? clamp(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1) : 0;
        const u = (L[i] + (L[i + 1] - L[i]) * t) / total;
        const rr_ = r(u);
        if (rr_ <= 0) continue;
        const ox = x - (x0 + dx * t), oy = y - (y0 + dy * t);
        const d = Math.hypot(ox, oy);
        if (d >= rr_) continue;
        const k = py * f.w + px;
        const dn = d / rr_;
        if (dn >= best[k]) continue;
        best[k] = dn;
        val[k] = Math.max(0.03, shade(u, clamp((ox * -dy + oy * dx) / len / rr_, -1, 1)));
      }
  }
  for (let k = 0; k < val.length; k++) if (val[k] > 0 && val[k] > f.v[k]) f.v[k] = val[k];
}

/**
 * Dissolves a canvas: pixels whose threshold `key(x, y)` (0..1) is above `vis` vanish, the ones
 * right at the edge turn into bright burning pixels, and the holes get a dark outline. Returns the
 * kept canvas and the edge pixels (for embers).
 */
export function dissolve(c: Canvas, vis: number, key: (x: number, y: number) => number, burn: Color[], outline: Color): { c: Canvas; edge: Pt[] } {
  const out = new Canvas(c.w, c.h);
  const edge: Pt[] = [];
  if (vis <= 0) return { c: out, edge };
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(x, y);
      if (!p[3]) continue;
      const k = key(x, y);
      if (k > vis) continue;
      if (vis < 1 && k > vis - 0.06) {
        out.set(x, y, k > vis - 0.03 ? burn[1] : burn[0]);
        if ((x * 7 + y * 13) % 11 === 0) edge.push([x, y]);
      } else out.set(x, y, p);
    }
  // Only the outer silhouette gets the dark line back; holes stay burning, not black-rimmed.
  if (vis < 1) {
    const ol: number[] = [];
    for (let y = 0; y < c.h; y++)
      for (let x = 0; x < c.w; x++) {
        if (out.alpha(x, y) || c.alpha(x, y)) continue;
        if (out.alpha(x + 1, y) || out.alpha(x - 1, y) || out.alpha(x, y + 1) || out.alpha(x, y - 1)) ol.push(x, y);
      }
    for (let i = 0; i < ol.length; i += 2) out.set(ol[i], ol[i + 1], outline);
  }
  return { c: out, edge };
}
