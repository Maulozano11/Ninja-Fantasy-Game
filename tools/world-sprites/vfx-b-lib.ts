// Drawing helpers for the vfx-b jutsu effects (earth, genjutsu, chakra, poison). See vfx-b.ts.
//
// Effects are painted into index layers (`L`): every pixel holds a ramp step (0 outline .. 6
// near-white core, -1 empty). A layer is rendered with one element ramp and gets its own 1 px
// outline in that ramp's darkest color, so overlapping parts keep a dark separation line, the
// way the character sprites do. Energy shapes are banded by inset distance from their edge
// (hard bands, constant width, the hot core only where the shape is thick); solid things
// (rocks, crows, fangs) use flat facet shading from the upper-left light.

import { Canvas, Color, hash, hex, lambert, mix, noise, withAlpha } from './kit';

export type Pt = [number, number];
export const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (a: number, b: number, t: number): number => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
export const fract = (v: number): number => v - Math.floor(v);
/** Deterministic random in [0, 1) for (seed, i, j). */
export const rnd = (seed: number, i: number, j = 0): number => hash(i * 7 + 3, j * 13 + 5, seed);
export const rot = (p: Pt, a: number, o: Pt = [0, 0]): Pt => {
  const c = Math.cos(a), s = Math.sin(a), x = p[0] - o[0], y = p[1] - o[1];
  return [o[0] + x * c - y * s, o[1] + x * s + y * c];
};
export const polar = (cx: number, cy: number, r: number, a: number, sy = 1): Pt => [cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy];

/** Distance from p to segment ab and the projection parameter t in [0, 1]. */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return [Math.hypot(px - ax - dx * t, py - ay - dy * t), t];
}

/** Value noise that wraps every `period` pixels along x (for tileable strips). */
export function pnoise(x: number, y: number, cell: number, period: number, seed = 0): number {
  const n = Math.max(1, Math.round(period / cell));
  const fx = x / cell, fy = y / cell;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const w = (i: number) => ((i % n) + n) % n;
  const a = hash(w(x0), y0, seed), b = hash(w(x0 + 1), y0, seed), c = hash(w(x0), y0 + 1, seed), d = hash(w(x0 + 1), y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Cubic bezier sampled into n + 1 points. */
export function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 16): Pt[] {
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

// --- palettes -----------------------------------------------------------------------------

/** An effect ramp: 0 outline (darkest color of the effect), then dark .. near-white core. */
export const pal = (...hs: string[]): Color[] => hs.map((h) => hex(h));

// --- index layers -------------------------------------------------------------------------

export type V = number | ((x: number, y: number) => number | null);

export interface RenderOpts {
  /** Outline color (default: ramp[0]); null for none. */
  outline?: Color | null;
  /** Also outline across corners. */
  diag?: boolean;
  /** Opacity of the fill, as one value or per ramp step. */
  alpha?: number | ((step: number, x: number, y: number) => number);
  outlineAlpha?: number;
  dx?: number;
  dy?: number;
  /** Treat the layer as tileable left-right (outline wraps around). */
  wrapX?: boolean;
}

export class L {
  readonly idx: Int8Array;
  constructor(readonly w: number, readonly h: number) {
    this.idx = new Int8Array(w * h).fill(-1);
  }
  in(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): number {
    return this.in(x, y) ? this.idx[y * this.w + x] : -1;
  }
  set(x: number, y: number, v: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (this.in(x, y)) this.idx[y * this.w + x] = v;
  }
  paint(x: number, y: number, v: V): void {
    if (!this.in(x, y)) return;
    const n = typeof v === 'function' ? v(x, y) : v;
    if (n !== null) this.idx[y * this.w + x] = n;
  }
  clone(): L {
    const o = new L(this.w, this.h);
    o.idx.set(this.idx);
    return o;
  }
  /** Paints every pixel where `test` holds. */
  fill(test: (x: number, y: number) => boolean, v: V): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (test(x, y)) this.paint(x, y, v);
    return this;
  }
  /** Re-indexes every filled pixel. */
  map(fn: (i: number, x: number, y: number) => number): this {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const k = y * this.w + x;
        if (this.idx[k] >= 0) this.idx[k] = fn(this.idx[k], x, y);
      }
    return this;
  }
  /** Fills a polygon (even-odd, pixel centers). */
  poly(pts: Pt[], v: V): this {
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
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.paint(x, y, v);
    }
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, v: V): this {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, w = (y + 0.5 - cy) / ry;
        if (u * u + w * w <= 1) this.paint(x, y, v);
      }
    return this;
  }
  disc(cx: number, cy: number, r: number, v: V): this {
    return this.ellipse(cx, cy, r, r, v);
  }
  /** 1 px Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, v: V): this {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.paint(x0, y0, v);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }
  /** Polyline, 1 px. */
  path(pts: Pt[], v: V): this {
    for (let i = 0; i + 1 < pts.length; i++) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], v);
    return this;
  }
  /** Tapered tube along a polyline: radius interpolated between `radii` (one per point). */
  tube(pts: Pt[], radii: number[] | ((t: number) => number), v: V): this {
    const n = pts.length;
    const rAt = (i: number): number => (typeof radii === 'function' ? radii(i / Math.max(1, n - 1)) : radii[i]);
    for (let i = 0; i + 1 < n; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const ra = rAt(i), rb = rAt(i + 1), rm = Math.max(ra, rb);
      for (let y = Math.floor(Math.min(ay, by) - rm - 1); y <= Math.ceil(Math.max(ay, by) + rm + 1); y++)
        for (let x = Math.floor(Math.min(ax, bx) - rm - 1); x <= Math.ceil(Math.max(ax, bx) + rm + 1); x++) {
          const [d, t] = segDist(x + 0.5, y + 0.5, ax, ay, bx, by);
          if (d <= lerp(ra, rb, t)) this.paint(x, y, v);
        }
    }
    return this;
  }
  /** Capsule from (x0, y0) to (x1, y1) with width w. */
  thick(x0: number, y0: number, x1: number, y1: number, w: number, v: V): this {
    return this.tube([[x0, y0], [x1, y1]], [w / 2, w / 2], v);
  }
  /** Copies another layer's filled pixels on top. */
  draw(o: L, dx = 0, dy = 0): this {
    for (let y = 0; y < o.h; y++)
      for (let x = 0; x < o.w; x++) {
        const v = o.idx[y * o.w + x];
        if (v >= 0) this.set(x + dx, y + dy, v);
      }
    return this;
  }
  /** Clears pixels where `test` holds. */
  erase(test: (x: number, y: number) => boolean): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (test(x, y)) this.idx[y * this.w + x] = -1;
    return this;
  }
  count(): number {
    let n = 0;
    for (const v of this.idx) if (v >= 0) n++;
    return n;
  }
  /** Inset distance of every filled pixel to the nearest empty one (1 = edge pixel). */
  dist(wrapX = false): Float32Array {
    const { w, h } = this;
    const d = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) d[i] = this.idx[i] >= 0 ? 1e9 : 0;
    const g = (x: number, y: number): number => {
      if (y < 0 || y >= h) return 0;
      if (x < 0 || x >= w) {
        if (!wrapX) return 0;
        x = (x + w) % w;
      }
      return d[y * w + x];
    };
    for (let pass = 0; pass < (wrapX ? 2 : 1); pass++) {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const k = y * w + x;
          if (!d[k]) continue;
          d[k] = Math.min(d[k], g(x - 1, y) + 3, g(x, y - 1) + 3, g(x - 1, y - 1) + 4, g(x + 1, y - 1) + 4);
        }
      for (let y = h - 1; y >= 0; y--)
        for (let x = w - 1; x >= 0; x--) {
          const k = y * w + x;
          if (!d[k]) continue;
          d[k] = Math.min(d[k], g(x + 1, y) + 3, g(x, y + 1) + 3, g(x + 1, y + 1) + 4, g(x - 1, y + 1) + 4);
        }
    }
    for (let i = 0; i < w * h; i++) d[i] /= 3;
    return d;
  }
  /**
   * Re-indexes the shape by inset distance: pixels with distance <= cuts[i] take steps[i]
   * (the rest take the last step). `mod` scales the distance per pixel (e.g. a hotter front).
   */
  bands(cuts: number[], steps: number[], o: { jitter?: number; seed?: number; cell?: number; mod?: (x: number, y: number, d: number) => number; wrapX?: boolean } = {}): this {
    const d = this.dist(o.wrapX);
    const j = o.jitter ?? 0;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const k = y * this.w + x;
        if (this.idx[k] < 0) continue;
        let v = d[k];
        if (o.mod) v = o.mod(x, y, v);
        if (j) v += (o.wrapX ? pnoise(x, y, o.cell ?? 3, this.w, o.seed ?? 3) - 0.5 : noise(x, y, o.cell ?? 3, o.seed ?? 3) - 0.5) * 2 * j;
        let s = steps[steps.length - 1];
        for (let i = 0; i < cuts.length; i++)
          if (v <= cuts[i]) {
            s = steps[i];
            break;
          }
        this.idx[k] = s;
      }
    return this;
  }
  /** Removes lone pixels: a pixel with no same-step 4-neighbor takes its most common neighbor step. */
  clean(passes = 1, wrapX = false): this {
    const { w, h } = this;
    for (let p = 0; p < passes; p++) {
      const src = new Int8Array(this.idx);
      const at = (x: number, y: number) => (y < 0 || y >= h ? -1 : wrapX ? src[y * w + ((x + w) % w)] : x < 0 || x >= w ? -1 : src[y * w + x]);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const v = src[y * w + x];
          if (v < 0) continue;
          const nb = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)];
          if (nb.includes(v)) continue;
          const filled = nb.filter((n) => n >= 0);
          if (!filled.length) continue;
          const cnt = new Map<number, number>();
          for (const n of filled) cnt.set(n, (cnt.get(n) ?? 0) + 1);
          let best = filled[0], bc = 0;
          for (const [n, c] of cnt) if (c > bc || (c === bc && Math.abs(n - v) < Math.abs(best - v))) {
            best = n;
            bc = c;
          }
          this.idx[y * w + x] = best;
        }
    }
    return this;
  }
  /** Drops filled pixels that have no filled 4-neighbor (single-pixel specks). */
  despeck(): this {
    const src = new Int8Array(this.idx);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const k = y * this.w + x;
        if (src[k] < 0) continue;
        const g = (xx: number, yy: number) => (this.in(xx, yy) ? src[yy * this.w + xx] : -1);
        if (g(x + 1, y) < 0 && g(x - 1, y) < 0 && g(x, y + 1) < 0 && g(x, y - 1) < 0) this.idx[k] = -1;
      }
    return this;
  }
  /** Lit rim where the upper-left neighbor is empty, shaded rim where the lower-right one is. */
  bevel(o: { lit?: number; shade?: number; max?: number; min?: number } = {}): this {
    const src = new Int8Array(this.idx);
    const lit = o.lit ?? 1, shade = o.shade ?? 1, mx = o.max ?? 5, mn = o.min ?? 1;
    const g = (x: number, y: number) => (this.in(x, y) ? src[y * this.w + x] : -1);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const v = src[y * this.w + x];
        if (v < 0) continue;
        if (g(x - 1, y) < 0 || g(x, y - 1) < 0) this.idx[y * this.w + x] = Math.min(mx, v + lit);
        else if (g(x + 1, y) < 0 || g(x, y + 1) < 0) this.idx[y * this.w + x] = Math.max(mn, v - shade);
      }
    return this;
  }
  /** Paints the layer onto a canvas with a ramp, plus its 1 px outline. */
  render(c: Canvas, ramp: Color[], o: RenderOpts = {}): void {
    const dx = o.dx ?? 0, dy = o.dy ?? 0;
    const ol = o.outline === undefined ? ramp[0] : o.outline;
    const { w, h } = this;
    const at = (x: number, y: number): number => {
      if (y < 0 || y >= h) return -1;
      if (x < 0 || x >= w) {
        if (!o.wrapX) return -1;
        x = (x + w) % w;
      }
      return this.idx[y * w + x];
    };
    const nb = o.diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = this.idx[y * w + x];
        if (v >= 0) {
          const col = ramp[clamp(v, 0, ramp.length - 1)];
          const a = o.alpha === undefined ? 255 : typeof o.alpha === 'number' ? o.alpha : o.alpha(v, x, y);
          if (a > 0) c.plot(x + dx, y + dy, a >= 255 ? col : withAlpha(col, a));
        } else if (ol) {
          for (const [ox, oy] of nb)
            if (at(x + ox, y + oy) >= 0) {
              const a = o.outlineAlpha ?? 255;
              c.plot(x + dx, y + dy, a >= 255 ? ol : withAlpha(ol, a));
              break;
            }
        }
      }
  }
}

// --- shape kits ---------------------------------------------------------------------------

export interface Puff {
  x: number;
  y: number;
  r: number;
  /** Per-puff ramp steps from shade to highlight; defaults to the call's steps. */
  steps?: number[];
}
/**
 * Clustered cloud: each puff is a flat-shaded lobe built from nested circles pulled toward the
 * upper-left light (a shaded crescent at the lower right, then lighter bands up to a small
 * highlight cap, like hand-painted pixel clouds), banded into `steps` (shade .. highlight).
 * Later puffs cover earlier ones, and where a puff overlaps one below, its lower edge takes
 * `rim` so the lobes stay separated.
 */
export function puffs(l: L, list: Puff[], o: { steps: number[]; rim?: number; jitter?: number; seed?: number; wobble?: number; wrapX?: boolean; rimAll?: boolean }): void {
  for (let n = 0; n < list.length; n++) {
    const p = list[n];
    if (p.r <= 0.6) continue;
    const r = p.r, steps = p.steps ?? o.steps, ns = steps.length;
    const j = o.jitter ?? 0.06;
    for (let y = Math.floor(p.y - r - 2); y <= Math.ceil(p.y + r + 1); y++)
      for (let x0 = Math.floor(p.x - r - 2); x0 <= Math.ceil(p.x + r + 1); x0++) {
        const x = o.wrapX ? ((x0 % l.w) + l.w) % l.w : x0;
        const u = (x0 + 0.5 - p.x) / r, v = (y + 0.5 - p.y) / r;
        const rr = Math.sqrt(u * u + v * v);
        const wob = o.wobble ? (noise(x0 + n * 31, y + n * 17, 2.2, (o.seed ?? 1) + 11) - 0.5) * o.wobble : 0;
        if (rr > 1 + wob) continue;
        const nz = (noise(x0, y, 2.5, o.seed ?? 1) - 0.5) * 2 * j;
        let lev = 0;
        for (let i = 1; i < ns; i++) {
          const k = (i / (ns - 1)) * 0.95;
          const d = Math.hypot(u + k * 0.42, v + k * 0.5) / (1.02 - k * 0.6) + nz;
          if (d <= 1) lev = i;
          else break;
        }
        let s = steps[lev];
        const edge = rr > 1 + wob - 1.2 / r;
        if (o.rim !== undefined && edge && l.get(x, y) >= 0 && (o.rimAll || v > -0.35)) s = o.rim;
        l.set(x, y, s);
      }
  }
}

/** Churning gas noise in [0, 1): octaves sampled on small circles, so a loop over t is seamless. */
export function gasField(x: number, y: number, t: number, seed: number): number {
  let s = 0, w = 0;
  const oct: [number, number, number][] = [[17, 5, 1], [8, 3, 0.5], [4, 2, 0.22]];
  for (const [i, [cell, r, amp]] of oct.entries()) {
    const a = t * TAU + i * 2.1;
    s += noise(x + Math.cos(a) * r, y + Math.sin(a) * r, cell, seed + i * 31) * amp;
    w += amp;
  }
  return s / w;
}

/**
 * A gas or dust volume as an index layer: a density profile (0..1) times churning noise,
 * banded into `steps` with lit tops (where the volume thins toward the upper left) and shaded
 * undersides. Render it with the element ramp.
 */
export function gasLayer(w: number, h: number, density: (x: number, y: number) => number, t: number, o: { seed?: number; thr?: number; steps: number[]; base?: number; amp?: number; scale?: number }): L {
  const l = new L(w, h);
  const seed = o.seed ?? 1, thr = o.thr ?? 0.36, steps = o.steps;
  const val = (x: number, y: number): number => {
    const d = density(x, y);
    const k = o.scale ?? 1;
    return d <= 0 ? 0 : d * ((o.base ?? 0.4) + (o.amp ?? 0.8) * gasField(x / k, y / k, t, seed));
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = val(x, y);
      if (v < thr) continue;
      let i = clamp(Math.floor(((v - thr) / 0.62) * (steps.length - 1)), 0, steps.length - 2);
      const up = val(x - 2, y - 3), dn = val(x + 2, y + 3);
      if (up < v - 0.035) i = Math.min(steps.length - 1, i + 2);
      else if (dn < v - 0.04) i = Math.max(0, i - 1);
      l.set(x, y, steps[i]);
    }
  l.clean(1);
  l.despeck();
  return l;
}

/** Irregular rock outline around (cx, cy). */
export function rockPts(cx: number, cy: number, r: number, n: number, seed: number, spin = 0, sx = 1, sy = 1, rough = 0.3): Pt[] {
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + spin + (rnd(seed, k, 1) - 0.5) * (TAU / n) * 0.5;
    const rr = r * (1 - rough / 2 + rough * rnd(seed, k, 2));
    pts.push([cx + Math.cos(a) * rr * sx, cy + Math.sin(a) * rr * sy]);
  }
  return pts;
}

/**
 * Faceted stone: an outer ring of facets around a raised inner ring and a cap (when `ring` is
 * set), or a plain fan from a raised apex; each facet is flat-lit from the upper left, with a
 * little per-facet jitter so neighbors read as separate planes.
 */
export function facetRock(l: L, pts: Pt[], apex: Pt, height: number, steps = [1, 2, 3, 4, 5], bias = 0, o: { ring?: number; jitter?: number; seed?: number } = {}): void {
  type P3 = [number, number, number];
  const seed = o.seed ?? 1, jit = o.jitter ?? 0;
  let fi = 0;
  const tri = (a: P3, b: P3, c: P3): void => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nz < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const ln = Math.hypot(nx, ny, nz) || 1;
    const li = lambert(nx / ln, ny / ln, nz / ln, 0.1) + bias + (rnd(seed, fi++, 9) - 0.5) * jit;
    l.poly([[a[0], a[1]], [b[0], b[1]], [c[0], c[1]]], steps[clamp(Math.floor(li * steps.length), 0, steps.length - 1)]);
  };
  const A: P3 = [apex[0], apex[1], height];
  const P = pts.map((p) => [p[0], p[1], 0] as P3);
  // Base fill so no pixel falls between facets.
  l.poly(pts, steps[Math.floor(steps.length / 2)]);
  if (!o.ring) {
    for (let i = 0; i < P.length; i++) tri(A, P[i], P[(i + 1) % P.length]);
    return;
  }
  const k = o.ring;
  const I = pts.map((p, i) => {
    const t = k * (0.85 + rnd(seed, i, 4) * 0.3);
    return [lerp(apex[0], p[0], t), lerp(apex[1], p[1], t), height * (1 - t * t * 0.75)] as P3;
  });
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length;
    tri(I[i], P[i], P[j]);
    tri(I[i], P[j], I[j]);
  }
  for (let i = 0; i < P.length; i++) tri(A, I[i], I[(i + 1) % P.length]);
}

/** A tiny detached chunk (2-4 px) with a lit top-left pixel. */
export function chip(l: L, x: number, y: number, size: number, seed: number, steps: [number, number, number] = [2, 3, 5]): void {
  x = Math.round(x);
  y = Math.round(y);
  if (size <= 1) {
    l.set(x, y, steps[1]);
    return;
  }
  const s = Math.round(size);
  for (let yy = 0; yy < s; yy++)
    for (let xx = 0; xx < s; xx++) {
      if (s >= 3 && (xx === 0 || xx === s - 1) && (yy === 0 || yy === s - 1) && rnd(seed, xx, yy) < 0.7) continue;
      const v = xx + yy === 0 || (s >= 3 && xx + yy === 1) ? steps[2] : xx + yy >= s ? steps[0] : steps[1];
      l.set(x + xx - (s >> 1), y + yy - (s >> 1), v);
    }
}

/** A 1 px speed line that fades from `steps[0]` at the tail to `steps[1]` at the head. */
export function speedLine(l: L, x0: number, x1: number, y: number, steps: [number, number]): void {
  const a = Math.round(Math.min(x0, x1)), b = Math.round(Math.max(x0, x1));
  for (let x = a; x <= b; x++) l.set(x, y, (x - a) / Math.max(1, b - a) < 0.45 ? steps[0] : steps[1]);
}

// --- composition --------------------------------------------------------------------------

/** Frame helper: a blank canvas of the sprite's size. */
export const frame = (w: number, h: number): Canvas => new Canvas(w, h);

/** Recolors a canvas toward a tint by amount (keeps alpha). */
export function tint(c: Canvas, col: Color, k: number): void {
  c.map((p) => mix(p, [col[0], col[1], col[2], p[3]], k));
}

/** Multiplies a canvas's alpha by k. */
export function fade(c: Canvas, k: number): void {
  for (let i = 3; i < c.px.length; i += 4) c.px[i] = Math.round(c.px[i] * k);
}

// --- tiny pixel font for the review sheets -----------------------------------------------

const GLYPHS: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '#.#', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'], ' ': ['..', '..', '..', '..', '..'], '-': ['...', '...', '###', '...', '...'],
  _: ['...', '...', '...', '...', '###'], '.': ['.', '.', '.', '.', '#'], ':': ['.', '#', '.', '#', '.'], ',': ['.', '.', '.', '#', '#'],
  '(': ['.#', '#.', '#.', '#.', '.#'], ')': ['#.', '.#', '.#', '.#', '#.'], '/': ['..#', '..#', '.#.', '#..', '#..'],
  x: ['...', '...', '#.#', '.#.', '#.#'], '@': ['.##.', '#..#', '#.##', '#...', '.##.'], '+': ['...', '.#.', '###', '.#.', '...'],
};

/** Draws text with the 5 px font at integer scale k; returns the width drawn. */
export function text(c: Canvas, s: string, x: number, y: number, col: Color, k = 1): number {
  let cx = x;
  for (const ch of s) {
    const g = GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS[' '];
    for (let r = 0; r < 5; r++)
      for (let q = 0; q < g[r].length; q++) if (g[r][q] === '#') c.fillRect(cx + q * k, y + r * k, k, k, col);
    cx += (g[0].length + 1) * k;
  }
  return cx - x;
}
export function textWidth(s: string, k = 1): number {
  let w = 0;
  for (const ch of s) w += ((GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS[' '])[0].length + 1) * k;
  return w;
}
