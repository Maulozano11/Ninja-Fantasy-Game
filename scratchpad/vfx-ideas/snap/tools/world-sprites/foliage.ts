// Foliage and bark for the tree and plant generators (trees.ts, plants.ts).
//
// Look (owner reference, Oct 13: an old Japanese forest, painterly pixel art):
//   - Canopies and bushes are MANY small leaf clusters, each made of individual leaf shapes
//     (ovals, maple stars, pine needle fans, bamboo lances). The top-left edge of every cluster
//     catches a lighter, warmer green; the shaded interior sinks into cool blue-green.
//   - Trunks, limbs and roots are tubes lit as cylinders, with deep bark furrows that meander and
//     twist along the tube, plates broken by cross cracks, knots with raised rims and moss.
//   - 7-tone hue-shifted ramps (step 0 is the material's own 1 px outline colour), selective
//     inner lines only on the shadow side of parts that stand in front, no smooth gradients.
//
// A cluster is rasterised once in its own coordinates with a local light (a small sphere lit
// from the upper left plus a fold along each leaf's midrib), so it can sway by whole pixels
// without shimmering. Per frame the clusters are composited back to front, then shaded:
//   form   the light of the big mass the cluster sits on sets the broad value,
//   cast   a cluster in front darkens the clusters behind it toward the lower right,
//   rim    edges facing the light (empty or a cluster behind up-left) brighten,
//   line   a dark inner line runs only under clusters that stand well in front,
//   leaves a leaf lying over another darkens the one below along its lower-right edge,
// and the value is quantised into the palette.

import { Canvas, Color, LIGHT, hash, hex, lambert, noise } from './kit';

export type Pt = [number, number];
export const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const frac = (v: number): number => v - Math.floor(v);
export const smooth = (a: number, b: number, t: number): number => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
/** Deterministic random in [0, 1) from a seed and one or two indices. */
export const rnd = (seed: number, i: number, j = 0): number => hash(i * 7 + 3, j * 13 + 5, seed);
/** Screen direction toward the light (upper left), unit length. */
const L2 = Math.hypot(LIGHT[0], LIGHT[1]);
export const LX = LIGHT[0] / L2, LY = LIGHT[1] / L2;
export const N4: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// --- palettes -----------------------------------------------------------------------------

/** Palettes by id. Step 0 of every palette is that material's outline colour. */
export const PAL: Color[][] = [];
export function pal(cols: (string | Color)[]): number {
  PAL.push(cols.map((c) => (typeof c === 'string' ? hex(c) : c)));
  return PAL.length - 1;
}
const lum = (c: Color): number => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;

// --- step buffer --------------------------------------------------------------------------

/** Per pixel: palette id (-1 empty), ramp step, the part it belongs to and that part's depth. */
export class Buf {
  readonly p: Int16Array;
  readonly s: Int8Array;
  readonly part: Int32Array;
  readonly z: Float32Array;
  constructor(readonly w: number, readonly h: number) {
    this.p = new Int16Array(w * h).fill(-1);
    this.s = new Int8Array(w * h);
    this.part = new Int32Array(w * h).fill(-1);
    this.z = new Float32Array(w * h);
  }
  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  has(x: number, y: number): boolean {
    return this.inside(x, y) && this.p[y * this.w + x] >= 0;
  }
  palAt(x: number, y: number): number {
    return this.inside(x, y) ? this.p[y * this.w + x] : -1;
  }
  stepAt(x: number, y: number): number {
    return this.has(x, y) ? this.s[y * this.w + x] : -1;
  }
  partAt(x: number, y: number): number {
    return this.has(x, y) ? this.part[y * this.w + x] : -1;
  }
  zAt(x: number, y: number): number {
    return this.has(x, y) ? this.z[y * this.w + x] : -Infinity;
  }
  put(x: number, y: number, pal: number, step: number, part = -1, z = 0): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.p[i] = pal;
    this.s[i] = clamp(Math.round(step), 0, PAL[pal].length - 1);
    this.part[i] = part;
    this.z[i] = z;
  }
  /** Writes only where nothing nearer is already drawn. */
  putZ(x: number, y: number, pal: number, step: number, part: number, z: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    if (this.p[i] >= 0 && this.z[i] > z) return;
    this.put(x, y, pal, step, part, z);
  }
  clear(x: number, y: number): void {
    if (this.inside(x, y)) this.p[y * this.w + x] = -1;
  }
  setStep(x: number, y: number, s: number): void {
    if (this.has(x, y)) this.s[y * this.w + x] = clamp(Math.round(s), 0, PAL[this.p[y * this.w + x]].length - 1);
  }
  /** Moves a pixel's step by d, never below `min`. */
  shade(x: number, y: number, d: number, min = 1): void {
    if (!this.has(x, y)) return;
    const i = y * this.w + x;
    this.s[i] = clamp(this.s[i] + d, Math.min(min, this.s[i]), PAL[this.p[i]].length - 1);
  }
  toCanvas(): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let i = 0; i < this.w * this.h; i++) {
      if (this.p[i] < 0) continue;
      const r = PAL[this.p[i]];
      const col = r[Math.min(this.s[i], r.length - 1)];
      c.px.set([col[0], col[1], col[2], 255], i * 4);
    }
    return c;
  }
}

/**
 * The silhouette outline: every empty pixel touching the shape (4-neighbours) takes step 0 of
 * the neighbouring palette with the highest priority (ties: the darkest outline colour), so
 * leaves get a very dark blue-green line and bark a very dark brown one.
 */
export function outlineBuf(b: Buf, prio: (pal: number) => number = () => 0): void {
  const add: [number, number, number, number][] = [];
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      if (b.has(x, y)) continue;
      let best = -1, bp = -Infinity, bl = Infinity, part = -1, z = 0;
      for (const [dx, dy] of N4) {
        const p = b.palAt(x + dx, y + dy);
        if (p < 0) continue;
        const pr = prio(p), l = lum(PAL[p][0]);
        if (pr > bp || (pr === bp && l < bl)) {
          bp = pr;
          bl = l;
          best = p;
          part = b.partAt(x + dx, y + dy);
          z = b.zAt(x + dx, y + dy);
        }
      }
      if (best >= 0) add.push([x, y, best, part]);
      void z;
    }
  for (const [x, y, p, part] of add) b.put(x, y, p, 0, part, -1e6);
}

/** Removes isolated single pixels of a step inside one palette (a lone light pixel in a dark field). */
export function despeckle(b: Buf, pals?: number[]): void {
  const fix: [number, number][] = [];
  for (let y = 1; y < b.h - 1; y++)
    for (let x = 1; x < b.w - 1; x++) {
      const i = y * b.w + x;
      const p = b.p[i];
      if (p < 0 || (pals && !pals.includes(p))) continue;
      const nb = [i - 1, i + 1, i - b.w, i + b.w];
      if (nb.some((j) => b.p[j] !== p)) continue;
      const s0 = b.s[nb[0]];
      if (s0 !== b.s[i] && nb.every((j) => b.s[j] === s0)) fix.push([i, s0]);
    }
  for (const [i, s] of fix) b.s[i] = s;
}

// --- curves -------------------------------------------------------------------------------

/** Catmull-Rom through the control points, sampled about every `step` px. */
export function spline(ctrl: Pt[], step = 2): Pt[] {
  if (ctrl.length < 2) return ctrl.slice();
  const out: Pt[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

/** Point and tangent on a quadratic bezier. */
export function quad(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number): [number, number, number, number] {
  const s = 1 - t;
  return [s * s * x0 + 2 * s * t * cx + t * t * x1, s * s * y0 + 2 * s * t * cy + t * t * y1, 2 * s * (cx - x0) + 2 * t * (x1 - cx), 2 * s * (cy - y0) + 2 * t * (y1 - cy)];
}

// --- leaves -------------------------------------------------------------------------------

export type LeafKind = 'oval' | 'round' | 'star' | 'needles' | 'lance';
export interface Leaf {
  /** Base point (oval, lance, needles) or centre (round, star), in cluster-local px. */
  x: number;
  y: number;
  /** Direction the leaf points (rad, screen: 0 right, PI/2 down). */
  ang: number;
  len: number;
  wid: number;
  kind: LeafKind;
  /** Value offset of this leaf (-0.1..0.1): neighbouring leaves differ a little. */
  tone: number;
  /** Lance and oval: tip droop (fraction of the length). */
  bend?: number;
  /** Star: number of lobes. Needles: number of needles. */
  n?: number;
  /** Needles: fan angle (rad). */
  spread?: number;
  seed?: number;
}

/**
 * Rasterises one leaf: calls fn for every pixel with t along the leaf (0 base .. 1 tip), s across
 * it (-1 .. 1) and the local axis direction (for the fold light).
 */
export function leafPixels(l: Leaf, fn: (x: number, y: number, t: number, s: number, dir: number) => void): void {
  const ca = Math.cos(l.ang), sa = Math.sin(l.ang);
  if (l.kind === 'oval' || l.kind === 'lance') {
    const bend = l.bend ?? 0;
    const R = Math.ceil(l.len + l.wid + Math.abs(bend) * l.len + 2);
    const lance = l.kind === 'lance';
    for (let py = Math.floor(l.y - R); py <= Math.ceil(l.y + R); py++)
      for (let px = Math.floor(l.x - R); px <= Math.ceil(l.x + R); px++) {
        const vx = px + 0.5 - l.x;
        let vy = py + 0.5 - l.y;
        let t = (vx * ca + vy * sa) / l.len;
        if (bend) {
          vy -= bend * Math.max(0, t) ** 2 * l.len;
          t = (vx * ca + vy * sa) / l.len;
        }
        if (t < 0 || t > 1) continue;
        const across = -vx * sa + vy * ca;
        const hw = (l.wid / 2) * Math.pow(Math.sin(Math.PI * Math.pow(t, lance ? 0.62 : 0.8)), lance ? 0.8 : 0.65) + 0.18;
        if (Math.abs(across) <= hw) fn(px, py, t, across / Math.max(0.5, hw), l.ang + (bend ? Math.atan(2 * bend * t) : 0));
      }
    return;
  }
  if (l.kind === 'round') {
    const a = l.len / 2, b = l.wid / 2;
    const R = Math.ceil(Math.max(a, b) + 1);
    for (let py = Math.floor(l.y - R); py <= Math.ceil(l.y + R); py++)
      for (let px = Math.floor(l.x - R); px <= Math.ceil(l.x + R); px++) {
        const vx = px + 0.5 - l.x, vy = py + 0.5 - l.y;
        const al = vx * ca + vy * sa, ac = -vx * sa + vy * ca;
        if ((al / a) ** 2 + (ac / b) ** 2 > 1) continue;
        fn(px, py, al / a / 2 + 0.5, ac / b, l.ang);
      }
    return;
  }
  if (l.kind === 'star') {
    const R = l.len / 2, n = l.n ?? 5, k = n / 2, seg = TAU / n;
    const Rb = Math.ceil(R + 1);
    for (let py = Math.floor(l.y - Rb); py <= Math.ceil(l.y + Rb); py++)
      for (let px = Math.floor(l.x - Rb); px <= Math.ceil(l.x + Rb); px++) {
        const vx = px + 0.5 - l.x, vy = py + 0.5 - l.y;
        const d = Math.hypot(vx, vy);
        const th = Math.atan2(vy, vx) - l.ang;
        const c = Math.abs(Math.cos(k * th));
        const rr = R * (0.32 + 0.68 * Math.pow(c, 2.8));
        if (d > rr && d > 0.9) continue;
        const m = Math.round(th / seg);
        const phi = th - m * seg;
        fn(px, py, d / Math.max(0.5, rr), phi / (seg / 2), l.ang + m * seg);
      }
    return;
  }
  // Needles: a fan of 1 px needles from the base.
  const n = l.n ?? 9, spread = l.spread ?? 2;
  for (let i = 0; i < n; i++) {
    const s = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    const a = l.ang + s * spread * 0.5 + (rnd(l.seed ?? 0, i, 1) - 0.5) * 0.25;
    const L = l.len * (0.62 + 0.38 * rnd(l.seed ?? 0, i, 2)) * (1 - 0.25 * Math.abs(s));
    const dx = Math.cos(a), dy = Math.sin(a);
    let lx = NaN, ly = NaN;
    for (let q = 0; q <= L; q += 0.5) {
      const px = Math.floor(l.x + dx * q), py = Math.floor(l.y + dy * q + (l.bend ?? 0) * (q / L) ** 2 * L);
      if (px === lx && py === ly) continue;
      lx = px;
      ly = py;
      fn(px, py, q / L, s, a);
    }
  }
}

// --- clusters -----------------------------------------------------------------------------

export interface Cluster {
  /** Rest centre on the work canvas and radius (px). */
  x: number;
  y: number;
  r: number;
  /** Draw order key: higher is nearer. */
  z: number;
  /** Light of the canopy form at this cluster (0..1). */
  form: number;
  pal: number;
  seed: number;
  leaves: Leaf[];
  /** Mass (lobe) it belongs to: sways with it. */
  group: number;
  /** Height factor for sway (0 base .. 1 top). */
  hf: number;
  bias: number;
  /** Free tag for the caller (layer, burn state...). */
  tag: number;
}

export interface Raster {
  x0: number;
  y0: number;
  w: number;
  h: number;
  /** Local light per pixel (NaN = empty) and the leaf index there. */
  v: Float32Array;
  leaf: Int16Array;
}

/** Local light of a cluster pixel: a small sphere lit from the upper left, plus each leaf's fold. */
export function rasterCluster(c: Cluster, o: { sphere?: number; fold?: number } = {}): Raster {
  let R = Math.ceil(c.r) + 3;
  for (const l of c.leaves) R = Math.max(R, Math.ceil(Math.hypot(l.x, l.y) + l.len * (1 + Math.abs(l.bend ?? 0)) + l.wid + 2));
  const w = R * 2 + 1;
  const v = new Float32Array(w * w).fill(NaN), leaf = new Int16Array(w * w).fill(-1);
  const kS = o.sphere ?? 0.8, kF = o.fold ?? 0.1;
  c.leaves.forEach((l, i) => {
    leafPixels(l, (px, py, t, s, dir) => {
      const ix = px + R, iy = py + R;
      if (ix < 0 || iy < 0 || ix >= w || iy >= w) return;
      const u = (px + 0.5) / c.r, vv = (py + 0.5) / c.r;
      const d = Math.hypot(u, vv);
      const kk = d > 0.92 ? 0.92 / d : 1;
      const sph = lambert(u * kk, vv * kk, Math.sqrt(Math.max(0, 1 - (d * kk) ** 2)));
      // The leaf folds along its midrib: the half turned toward the light is brighter.
      const toL = -Math.sin(dir) * LX + Math.cos(dir) * LY;
      const fold = kF * s * Math.sign(toL) * Math.min(1, Math.abs(toL) * 1.6);
      const under = Math.max(0, Math.sin(dir)) * 0.04;
      const tip = l.kind === 'needles' ? (t > 0.7 ? 0.05 : t < 0.3 ? -0.05 : 0) : t < 0.18 ? -0.05 : t > 0.72 ? 0.03 : 0;
      const k = iy * w + ix;
      v[k] = sph * kS + fold + l.tone + tip - under;
      leaf[k] = i;
    });
  });
  return { x0: -R, y0: -R, w, h: w, v, leaf };
}

export interface Field {
  W: number;
  H: number;
  /** Index into the (z-sorted) cluster list, -1 empty. */
  own: Int32Array;
  leaf: Int16Array;
  v: Float32Array;
  /** 1 where a selective inner line falls. */
  line: Uint8Array;
}

/**
 * Composites the clusters (already sorted back to front) at whole-pixel offsets. The value is the
 * form light mixed with the local light (`formW` is the form's weight) plus the cluster's bias.
 */
export function composite(W: number, H: number, cl: Cluster[], ras: Raster[], offs: Pt[], formW = 0.5): Field {
  const own = new Int32Array(W * H).fill(-1), leaf = new Int16Array(W * H).fill(-1), v = new Float32Array(W * H);
  cl.forEach((c, idx) => {
    const r = ras[idx];
    const ox = Math.round(c.x) + (offs[idx]?.[0] ?? 0) + r.x0, oy = Math.round(c.y) + (offs[idx]?.[1] ?? 0) + r.y0;
    for (let j = 0; j < r.h; j++) {
      const Y = oy + j;
      if (Y < 0 || Y >= H) continue;
      for (let i = 0; i < r.w; i++) {
        const lv = r.v[j * r.w + i];
        if (Number.isNaN(lv)) continue;
        const X = ox + i;
        if (X < 0 || X >= W) continue;
        const p = Y * W + X;
        own[p] = idx;
        leaf[p] = r.leaf[j * r.w + i];
        v[p] = c.form * formW + lv * (1 - formW) + c.bias;
      }
    }
  });
  return { W, H, own, leaf, v, line: new Uint8Array(W * H) };
}

export interface ShadeOpts {
  /** Cast shadow of nearer clusters: strength and reach (px). */
  cast?: number;
  castD?: number;
  /** Brightening of edges facing the light, darkening of edges turned away. */
  rim?: number;
  away?: number;
  /** Inner line under a cluster that is at least this much nearer (z units); Infinity: none. */
  lineGap?: number;
  /** Darkening where a leaf lies over another one of the same cluster. */
  leafSep?: number;
}

export function shade(F: Field, cl: Cluster[], o: ShadeOpts = {}): void {
  const { W, H, own, v, leaf, line } = F;
  const D = o.castD ?? 4, kC = o.cast ?? 0.3, kR = o.rim ?? 0.14, kA = o.away ?? 0.08, gap = o.lineGap ?? 6, sep = o.leafSep ?? 0.08;
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= W || y >= H ? -1 : own[y * W + x]);
  // Max owner within D (separable) to skip pixels with nothing nearer around.
  const rowMax = new Int32Array(W * H), mx = new Int32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let b = -1;
      for (let q = Math.max(0, x - D); q <= Math.min(W - 1, x + D); q++) b = Math.max(b, own[y * W + q]);
      rowMax[y * W + x] = b;
    }
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      let b = -1;
      for (let q = Math.max(0, y - D); q <= Math.min(H - 1, y + D); q++) b = Math.max(b, rowMax[q * W + x]);
      mx[y * W + x] = b;
    }
  const dv = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = y * W + x, a = own[p];
      if (a < 0) continue;
      let d = 0;
      // Cast shadow from nearer clusters up-left of this pixel.
      if (kC && mx[p] > a) {
        let best = 0;
        for (let oy = -D; oy <= 1; oy++)
          for (let ox = -D; ox <= 1; ox++) {
            const q = at(x + ox, y + oy);
            if (q <= a) continue;
            const dist = Math.hypot(ox, oy);
            if (dist > D || dist === 0) continue;
            const al = (ox * LX + oy * LY) / dist;
            if (al <= 0) continue;
            best = Math.max(best, (1 - dist / (D + 1)) * (0.4 + 0.6 * al));
          }
        d -= kC * best;
      }
      // Edges facing the light.
      const l1 = at(x - 1, y) < a || at(x, y - 1) < a || at(x - 1, y - 1) < a;
      const l2 = !l1 && (at(x - 2, y - 1) < a || at(x - 1, y - 2) < a || at(x - 2, y - 2) < a);
      if (l1) d += kR;
      else if (l2) d += kR * 0.45;
      // Edges turned away.
      if (at(x + 1, y) < a || at(x, y + 1) < a || at(x + 1, y + 1) < a) d -= kA;
      // Inner line on the shadow side of a much nearer cluster.
      for (const [ox, oy] of [[-1, 0], [0, -1]] as Pt[]) {
        const q = at(x + ox, y + oy);
        if (q > a && cl[q].z - cl[a].z >= gap) line[p] = 1;
      }
      // A leaf over another of the same cluster.
      if (sep)
        for (const [ox, oy] of [[-1, 0], [0, -1]] as Pt[]) {
          const q = at(x + ox, y + oy);
          if (q === a) {
            const lj = leaf[(y + oy) * W + x + ox];
            if (lj > leaf[p]) {
              d -= sep;
              break;
            }
          }
        }
      dv[p] = d;
    }
  for (let p = 0; p < W * H; p++) if (own[p] >= 0) v[p] += dv[p];
}

/** Value to a step 1..th.length+1. */
export function stepOf(v: number, th: number[]): number {
  let s = 1;
  for (const t of th) if (v >= t) s++;
  return s;
}

/**
 * Writes the shaded field into the buffer for the clusters `filter` accepts. `paint` may
 * override the palette and step (burning, scorched...). Lines use step `lineStep`.
 */
export function putField(
  b: Buf,
  F: Field,
  cl: Cluster[],
  o: { th: number[]; filter?: (c: Cluster) => boolean; paint?: (x: number, y: number, c: Cluster, v: number, line: boolean) => [number, number] | null; lineStep?: number; part?: number; z?: (c: Cluster) => number },
): void {
  for (let y = 0; y < F.H; y++)
    for (let x = 0; x < F.W; x++) {
      const p = y * F.W + x, a = F.own[p];
      if (a < 0) continue;
      const c = cl[a];
      if (o.filter && !o.filter(c)) continue;
      const line = F.line[p] === 1;
      const r = o.paint ? o.paint(x, y, c, F.v[p], line) : null;
      const st = r ? r[1] : line ? o.lineStep ?? 1 : stepOf(F.v[p], o.th);
      b.put(x, y, r ? r[0] : c.pal, st, (o.part ?? 100000) + a, o.z ? o.z(c) : c.z);
    }
}

// --- canopies -----------------------------------------------------------------------------

export interface Mass {
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** Depth of the centre (higher = nearer) and depth radius. */
  z?: number;
  rz?: number;
  /** Underside squash (<1 flatter below), top squash (<1 flatter on top). */
  flat?: number;
  top?: number;
  /** Edge raggedness (fraction of the radius). */
  rag?: number;
  bias?: number;
  pal?: number;
  /** Sway weight 0..1 and phase. */
  hf?: number;
  tag?: number;
}

export interface CanopyOpts {
  masses: Mass[];
  /** The whole canopy's ellipse for the overall form light: cx, cy, rx, ry. */
  form: [number, number, number, number];
  /** Cluster radius and grid spacing. */
  r: number;
  spacing?: number;
  pal: number;
  seed: number;
  /** Weight of the overall form vs the mass's own sphere. */
  formMix?: number;
  /** Leaves of one cluster (local coords) given its radius and the mass normal there. */
  leaves: (seed: number, r: number, nu: number, nv: number) => Leaf[];
}

/** Scatters clusters over the front surface of each mass (a hex grid with jitter), sorted back to front. */
export function canopy(o: CanopyOpts): Cluster[] {
  const out: Cluster[] = [];
  const [fx, fy, frx, fry] = o.form;
  o.masses.forEach((M, mi) => {
    const g = o.spacing ?? o.r * 1.15;
    const rz = M.rz ?? Math.min(M.rx, M.ry);
    const rowH = g * 0.86;
    const nr = Math.ceil((M.ry * 2 + g * 2) / rowH), nc = Math.ceil((M.rx * 2 + g * 2) / g);
    for (let j = 0; j <= nr; j++)
      for (let i = 0; i <= nc; i++) {
        const sd = o.seed * 1000 + mi * 97 + j * 31 + i;
        const x = M.x - M.rx - g + (i + (j & 1 ? 0.5 : 0) + (rnd(sd, 1) - 0.5) * 0.7) * g;
        const y = M.y - M.ry - g + (j + (rnd(sd, 2) - 0.5) * 0.7) * rowH;
        const u = (x - M.x) / M.rx;
        let v = (y - M.y) / M.ry;
        if (v > 0 && M.flat) v /= M.flat;
        if (v < 0 && M.top) v /= M.top;
        const th = Math.atan2(v, u);
        const rag = 1 - (M.rag ?? 0.12) * noise(Math.cos(th) * 2.6 + 9, Math.sin(th) * 2.6 + 9, 1, o.seed + mi * 7);
        const d = Math.hypot(u, v);
        if (d > rag) continue;
        const nu = u / rag, nv = v / rag;
        const dd = Math.min(0.97, d / rag);
        const nz = Math.sqrt(1 - dd * dd);
        const mL = lambert(nu * 0.85, nv * 0.85, nz);
        const U = clamp((x - fx) / frx, -1.15, 1.15), V = clamp((y - fy) / fry, -1.15, 1.15);
        const gL = lambert(U * 0.72, V * 0.72, Math.sqrt(Math.max(0.05, 1 - (U * U + V * V) * 0.52)));
        const form = lerp(mL, gL, o.formMix ?? 0.5) + (M.bias ?? 0);
        const r = o.r * (0.82 + 0.36 * rnd(sd, 3)) * (dd > 0.82 ? 0.86 : 1);
        out.push({
          x, y, r,
          z: (M.z ?? 0) + nz * rz + rnd(sd, 4) * 1.5,
          form, pal: M.pal ?? o.pal, seed: sd, leaves: o.leaves(sd, r, nu, nv),
          group: mi, hf: M.hf ?? 0, bias: 0, tag: M.tag ?? 0,
        });
      }
  });
  return out.sort((a, b) => a.z - b.z || a.y - b.y);
}

/** Broadleaf cluster: oval leaves pointing outward from the centre, the centre ones on top. */
export function ovalLeaves(seed: number, r: number, o: { n?: number; len: number; wid: number; droop?: number; nu?: number; nv?: number; kind?: LeafKind; tone?: number }): Leaf[] {
  const n = o.n ?? Math.max(5, Math.round((r * r) / (o.len * o.wid * 0.32)));
  const out: (Leaf & { d: number })[] = [];
  for (let i = 0; i < n; i++) {
    const rr = r * 0.78 * Math.sqrt(rnd(seed, i, 11)), a = rnd(seed, i, 12) * TAU;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    // Leaves point away from the centre, with the cluster's own outward lean and a little droop.
    let ang = rr > r * 0.2 ? a : rnd(seed, i, 13) * TAU;
    ang += (rnd(seed, i, 14) - 0.5) * 0.9;
    const ox = Math.cos(ang) + (o.nu ?? 0) * 0.5, oy = Math.sin(ang) + (o.nv ?? 0) * 0.5 + (o.droop ?? 0);
    ang = Math.atan2(oy, ox);
    const len = o.len * (0.8 + 0.4 * rnd(seed, i, 15));
    out.push({
      x: x - Math.cos(ang) * len * 0.35, y: y - Math.sin(ang) * len * 0.35, ang, len, wid: o.wid * (0.85 + 0.3 * rnd(seed, i, 16)),
      kind: o.kind ?? 'oval', tone: (rnd(seed, i, 17) - 0.5) * (o.tone ?? 0.1), d: rr, seed: seed + i,
    });
  }
  return out.sort((a, b) => b.d - a.d);
}

/** Maple cluster: star leaves (5-7 lobes) fanned around the centre. */
export function starLeaves(seed: number, r: number, o: { n?: number; size: number; tone?: number }): Leaf[] {
  const n = o.n ?? Math.max(4, Math.round((r * r) / (o.size * o.size * 0.17)));
  const out: (Leaf & { d: number })[] = [];
  for (let i = 0; i < n; i++) {
    const rr = r * 0.72 * Math.sqrt(rnd(seed, i, 21)), a = rnd(seed, i, 22) * TAU;
    const size = o.size * (0.8 + 0.4 * rnd(seed, i, 23));
    out.push({
      x: Math.cos(a) * rr, y: Math.sin(a) * rr, ang: -Math.PI / 2 + (rnd(seed, i, 24) - 0.5) * 1.4 + Math.cos(a) * 0.5,
      len: size, wid: size, kind: 'star', n: rnd(seed, i, 25) < 0.6 ? 5 : 7, tone: (rnd(seed, i, 26) - 0.5) * (o.tone ?? 0.1), d: rr, seed: seed + i,
    });
  }
  return out.sort((a, b) => b.d - a.d);
}

/** Pine tuft: fans of needles springing up and out from points low in the cluster. */
export function needleTufts(seed: number, r: number, o: { n?: number; len: number; needles?: number; tone?: number }): Leaf[] {
  const n = o.n ?? Math.max(3, Math.round(r / 2.2));
  const out: (Leaf & { d: number })[] = [];
  for (let i = 0; i < n; i++) {
    const a = rnd(seed, i, 31) * TAU, rr = r * 0.6 * Math.sqrt(rnd(seed, i, 32));
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.7 + r * 0.25;
    const ang = -Math.PI / 2 + Math.cos(a) * 0.55 + (rnd(seed, i, 33) - 0.5) * 0.5;
    out.push({
      x, y, ang, len: o.len * (0.8 + 0.4 * rnd(seed, i, 34)), wid: 1, kind: 'needles', n: o.needles ?? 11, spread: 2.3 + rnd(seed, i, 35) * 0.6,
      tone: (rnd(seed, i, 36) - 0.5) * (o.tone ?? 0.08), d: -y, seed: seed * 7 + i,
    });
  }
  // Lower tufts first, so the ones above lie behind... the upper rows are further back.
  return out.sort((a, b) => a.y - b.y);
}

// --- bark tubes ---------------------------------------------------------------------------

export type BarkTex = 'furrow' | 'plates' | 'smooth' | 'charred' | 'plain';
export interface Knot {
  /** Position along the tube (px of arc length) and across it (px of surface arc, + right). */
  s: number;
  a: number;
  r: number;
}
export interface Tube {
  pts: Pt[];
  r0: number;
  r1: number;
  flare?: number;
  flareLen?: number;
  /** Bulges along the tube (fraction of the radius). */
  wob?: number;
  pal: number;
  tex: BarkTex;
  seed: number;
  /** Furrow spacing (px of surface arc) and twist (px of arc per px along). */
  spacing?: number;
  twist?: number;
  knots?: Knot[];
  /** Moss palette and amount (0..1). */
  moss?: number;
  mossAmt?: number;
  /** Inner lines against the same palette start after this arc length (seamless forks). */
  lineFrom?: number;
  /** Nothing below this row. */
  clipY?: number;
  /** Light multiplier in screen space (canopy shade, dapples). */
  dim?: (x: number, y: number) => number;
  /** A splintered broken tip this many px long. */
  point?: number;
  /** Charred: share of furrows glowing with embers, and the fire palette. */
  ember?: number;
  firePal?: number;
  /** Loop time (0..1): embers pulse smoothly with it instead of switching on and off. */
  emberT?: number;
  /** Partly charred bark: where this field (screen space) is high, the bark turns to `charPal`. */
  charAt?: (x: number, y: number) => number;
  charPal?: number;
  bias?: number;
  part?: number;
  /** Draw depth (for the step buffer's z). */
  z?: number;
}

/** Nearest jittered-grid feature: offset from it, the gap to the second nearest (cell edges) and a cell id. */
export function worley(x: number, y: number, S: number, seed: number): { dx: number; dy: number; f: number; id: number } {
  const ci = Math.floor(x / S), cj = Math.floor(y / S);
  let d1 = 1e9, d2 = 1e9, bx = 0, by = 0, id = 0;
  for (let j = cj - 1; j <= cj + 1; j++)
    for (let i = ci - 1; i <= ci + 1; i++) {
      const fx = (i + 0.15 + 0.7 * hash(i, j, seed)) * S, fy = (j + 0.15 + 0.7 * hash(i, j, seed + 1)) * S;
      const d = (x - fx) ** 2 + (y - fy) ** 2;
      if (d < d1) {
        d2 = d1;
        d1 = d;
        bx = x - fx;
        by = y - fy;
        id = hash(i, j, seed + 2);
      } else if (d < d2) d2 = d;
    }
  return { dx: bx, dy: by, f: Math.sqrt(d2) - Math.sqrt(d1), id };
}

/** Bark step for a pixel: light picks the base tone, furrows/plates/knots texture it. */
export function barkStep(t: Tube, Lv: number, a: number, s: number, r: number, ny: number, nx: number): [number, number] {
  const base = Lv > 0.8 ? 5 : Lv > 0.6 ? 4 : Lv > 0.4 ? 3 : 2;
  if (r < 2.2 || t.tex === 'plain') return [t.pal, Math.min(base, 4)];
  const sd = t.seed;
  // Knots: an upright oval hole (its lower-right inner wall catches light), a raised lip lit on
  // the upper left, and the furrows pushed aside around it.
  let push = 0;
  for (const k of t.knots ?? []) {
    const dx = a - k.a, dy = -(s - k.s) * 0.62;
    const dist = Math.hypot(dx, dy), q = dist / k.r;
    if (q < 1) {
      if (q < 0.5) return [t.pal, dx * 0.6 + dy * 0.8 > k.r * 0.12 && q > 0.25 ? 3 : 1];
      const tl = -(dx * LX + dy * LY) / Math.max(0.01, dist);
      let st = base + (tl > 0.3 ? 1 : tl < -0.3 ? -1 : 0);
      if (q < 0.62) st = Math.max(1, st - 1);
      if (tl > 0.55 && q > 0.7) st += 1;
      return [t.pal, clamp(st, 1, 6)];
    }
    push += (dx * k.r * k.r * 1.3) / (dist * dist + k.r * k.r);
  }
  if (t.tex === 'smooth') {
    // Smooth grey bark: fine broken streaks along the tube, rare lenticels, pale flecks in the light.
    let st = base;
    const c = a + push + (noise(a * 0.2 + 7, s * 0.03, 1, sd) - 0.5) * 2.6;
    const col = Math.floor(c / 2.4);
    const seg = Math.floor((s + hash(col, 1, sd) * 30) / (5 + hash(col, 2, sd) * 9));
    if (frac(c / 2.4) < 0.45 && hash(col, seg, sd) < 0.55) st -= 1;
    if (hash(Math.floor(a / 2.5 + 400), Math.floor(s / 1.4), sd + 3) < 0.02) st = Math.max(1, base - 2);
    else if (st === base && base >= 4 && hash(col, seg, sd + 5) < 0.18) st = base + 1;
    return [t.pal, clamp(st, 1, 6)];
  }
  const plates = t.tex === 'plates';
  const W = Math.min(t.spacing ?? 6, Math.max(3.4, r * 0.8));
  const c = a + push + (t.twist ?? 0) * s + (noise(a * 0.09 + 30, s * 0.035, 1, sd) - 0.5) * W * 1.6;
  const k = Math.floor(c / W), fr = c / W - k;
  // Oak: long ridges; black pine: short blocky plates (alligator bark).
  const pl = plates ? 5 + hash(k, 0, sd) * 6 : 7 + hash(k, 0, sd) * 13;
  const sp = s + hash(k, 1, sd) * 40;
  const pi = Math.floor(sp / pl), fs = sp - pi * pl;
  // Furrows widen and narrow along their length, so ridges split and merge like old oak bark.
  const fw = (plates ? 0.2 : 0.14) + (plates ? 0.16 : 0.3) * noise(k * 3.7, s * 0.07, 1, sd + 2);
  if (fr < fw) {
    if (t.ember && t.firePal !== undefined && hash(k, pi, sd + 9) < t.ember && Lv < 0.8) {
      const g = 0.5 + 0.5 * Math.sin(TAU * ((t.emberT ?? 0) + hash(k, pi, sd + 10)));
      const hot = hash(Math.round(a), Math.round(s), sd) < 0.3 ? 1 : 0;
      return [t.firePal, clamp((g > 0.7 ? 3 : g > 0.35 ? 2 : 1) + hot, 1, 4)];
    }
    return [t.pal, fr > fw * 0.7 && Lv > 0.7 ? 2 : 1];
  }
  // Cross cracks between plates (slanted a little).
  if (fs + (fr - fw) * (plates ? 0.8 : 1.5) < 1.3 && hash(k, pi, sd + 3) < (plates ? 0.9 : 0.6)) return [t.pal, Math.max(1, base - 2)];
  const rr = (fr - fw) / (1 - fw);
  let st = base;
  // Each ridge is rounded: its left lip faces the light on the lit side, its right lip sinks.
  if (rr < 0.26 && Lv > 0.46) st += 1;
  else if (rr > 0.78) st -= 1;
  // Plates also catch the light along their upper edge.
  if (plates && fs > pl - 1.6 && Lv > 0.5) st += 1;
  if (st >= 5 && fs > 2 && fs < 4 && hash(k, pi, sd + 4) < 0.5) st = 6;
  void ny;
  void nx;
  return [t.pal, clamp(st, 1, 6)];
}

/**
 * Draws a tube: every pixel within the radius of the nearest point of the polyline, lit as a
 * cylinder, textured with bark. Existing pixels of another part (or the same palette past
 * `lineFrom`) that border the new tube get a dark inner line (step 1 of their own palette).
 */
export function drawTube(b: Buf, t: Tube): void {
  const P0 = t.pts;
  const segs: { ax: number; ay: number; bx: number; by: number; len: number; s0: number }[] = [];
  let S = 0;
  for (let i = 0; i + 1 < P0.length; i++) {
    const [ax, ay] = P0[i], [bx, by] = P0[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1e-6) continue;
    segs.push({ ax, ay, bx, by, len, s0: S });
    S += len;
  }
  if (!segs.length) return;
  const rAt = (s: number): number => {
    let r = lerp(t.r0, t.r1, s / S) + (t.flare ?? 0) * Math.exp(-s / (t.flareLen ?? 10));
    if (t.wob) r *= 1 + t.wob * (noise(s * 0.06, 0, 1, t.seed + 77) - 0.5) * 2;
    if (t.point && s > S - t.point) r *= Math.max(0.12, (S - s) / t.point);
    return r;
  };
  const rmax = (Math.max(t.r0, t.r1) + (t.flare ?? 0)) * (1 + (t.wob ?? 0)) + 1;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P0) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  x0 = Math.floor(x0 - rmax);
  y0 = Math.floor(y0 - rmax);
  const MW = Math.ceil(x1 + rmax) - x0 + 1, MH = Math.ceil(y1 + rmax) - y0 + 1;
  const inM = new Uint8Array(MW * MH);
  const info = new Float32Array(MW * MH * 6);
  for (let y = y0; y < y0 + MH; y++) {
    if (t.clipY !== undefined && y > t.clipY) continue;
    for (let x = x0; x < x0 + MW; x++) {
      const px = x + 0.5, py = y + 0.5;
      let best = 1e9, bs = 0, bcx = 0, bcy = 0, bux = 0, buy = 0, br = 1;
      for (const g of segs) {
        if (px < Math.min(g.ax, g.bx) - rmax || px > Math.max(g.ax, g.bx) + rmax || py < Math.min(g.ay, g.by) - rmax || py > Math.max(g.ay, g.by) + rmax) continue;
        const ux = (g.bx - g.ax) / g.len, uy = (g.by - g.ay) / g.len;
        const tt = clamp((px - g.ax) * ux + (py - g.ay) * uy, 0, g.len);
        const cx = g.ax + ux * tt, cy = g.ay + uy * tt;
        const d = Math.hypot(px - cx, py - cy);
        const r = rAt(g.s0 + tt);
        if (d - r < best) {
          best = d - r;
          bs = g.s0 + tt;
          bcx = cx;
          bcy = cy;
          bux = ux;
          buy = uy;
          br = r;
        }
      }
      if (best > 0) continue;
      const k = (y - y0) * MW + (x - x0);
      inM[k] = 1;
      const nx = (px - bcx) / br, ny = (py - bcy) / br;
      const off = (px - bcx) * -buy + (py - bcy) * bux;
      info[k * 6] = bs;
      info[k * 6 + 1] = clamp(off / br, -1, 1);
      info[k * 6 + 2] = nx;
      info[k * 6 + 3] = ny;
      info[k * 6 + 4] = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      info[k * 6 + 5] = br;
    }
  }
  const has = (x: number, y: number): boolean => x >= x0 && y >= y0 && x < x0 + MW && y < y0 + MH && inM[(y - y0) * MW + (x - x0)] === 1;
  const part = t.part ?? t.seed;
  // Inner lines on what lies behind.
  for (let y = y0; y < y0 + MH; y++)
    for (let x = x0; x < x0 + MW; x++) {
      if (!has(x, y)) continue;
      const k = (y - y0) * MW + (x - x0);
      for (const [dx, dy] of N4) {
        const qx = x + dx, qy = y + dy;
        if (has(qx, qy) || !b.has(qx, qy)) continue;
        const qp = b.palAt(qx, qy);
        if (t.firePal !== undefined && qp === t.firePal) continue;
        if (qp === t.pal && info[k * 6] <= (t.lineFrom ?? 0)) continue;
        if (b.partAt(qx, qy) === part) continue;
        b.put(qx, qy, qp, 1, b.partAt(qx, qy), b.zAt(qx, qy));
      }
    }
  // Moss: cushions in tube-local coordinates on the upper and shaded sides.
  const mossOn = t.moss !== undefined && (t.mossAmt ?? 0) > 0;
  const charT: Tube | null = t.charAt && t.charPal !== undefined ? { ...t, pal: t.charPal, tex: 'charred', moss: undefined, ember: t.ember || 0.24 } : null;
  for (let y = y0; y < y0 + MH; y++)
    for (let x = x0; x < x0 + MW; x++) {
      if (!has(x, y)) continue;
      const k = ((y - y0) * MW + (x - x0)) * 6;
      const s = info[k], u = info[k + 1], nx = info[k + 2], ny = info[k + 3], nz = info[k + 4], r = info[k + 5];
      let Lv = lambert(nx, ny, nz) * (t.dim ? t.dim(x, y) : 1) + (t.bias ?? 0);
      const a = Math.asin(u) * r;
      if (charT && t.charAt!(x, y) + (noise(a * 0.25 + 50, s * 0.12, 1, t.seed + 3) - 0.5) * 0.6 > 0.5) {
        const [p, st] = barkStep(charT, Lv, a, s, r, ny, nx);
        b.put(x, y, p, st, part, t.z ?? 0);
        continue;
      }
      if (mossOn) {
        const up = clamp(-ny * 1.3, 0, 1), side = clamp(nx * 1.1, 0, 1);
        const cell = mossCell(a, s, t.seed);
        const m = (t.mossAmt ?? 0) * (0.75 * up + 0.45 * side) + (cell.v - 0.5) * 0.55 + (noise(a * 0.2, s * 0.1, 1, t.seed + 5) - 0.5) * 0.5;
        if (m > 0.46 && r > 2) {
          // Each cushion: lit upper-left crescent, dark pocket lower right.
          let st = Lv > 0.72 ? 4 : Lv > 0.5 ? 3 : Lv > 0.3 ? 2 : 1;
          const tl = cell.dx * LX + cell.dy * -LY;
          if (tl > 0.9) st += 1;
          else if (tl < -1) st -= 1;
          if (m < 0.54) st -= 1;
          b.put(x, y, t.moss!, clamp(st, 1, 5), part, t.z ?? 0);
          continue;
        }
      }
      const [p, st] = barkStep(t, Lv, a, s, r, ny, nx);
      b.put(x, y, p, st, part, t.z ?? 0);
    }
}

/** Moss cushion cell around (a, s): offset from its centre (cells about 4 px). */
function mossCell(a: number, s: number, seed: number): { dx: number; dy: number; v: number } {
  const S = 3;
  const ci = Math.floor(a / S), cj = Math.floor(s / S);
  let d1 = 1e9, bx = 0, by = 0, v = 0;
  for (let j = cj - 1; j <= cj + 1; j++)
    for (let i = ci - 1; i <= ci + 1; i++) {
      const fx = (i + 0.2 + 0.6 * hash(i, j, seed + 41)) * S, fy = (j + 0.2 + 0.6 * hash(i, j, seed + 42)) * S;
      const d = (a - fx) ** 2 + (s - fy) ** 2;
      if (d < d1) {
        d1 = d;
        bx = a - fx;
        by = -(s - fy);
        v = hash(i, j, seed + 43);
      }
    }
  return { dx: bx, dy: by, v };
}

/** Recursive branching: each branch forks into two thinner ones that lean outward and up. */
export function grow(out: Tube[], p: Pt, ang: number, len: number, r: number, depth: number, seed: number, base: Omit<Tube, 'pts' | 'r0' | 'r1' | 'seed'>, opts: { up?: number; spread?: number; minR?: number } = {}): void {
  const bend = (hash(seed, 1, 7) - 0.5) * 0.7;
  const mid: Pt = [p[0] + Math.cos(ang + bend * 0.5) * len * 0.5 + (hash(seed, 2, 7) - 0.5) * len * 0.15, p[1] + Math.sin(ang + bend * 0.5) * len * 0.5];
  const end: Pt = [p[0] + Math.cos(ang + bend) * len, p[1] + Math.sin(ang + bend) * len];
  out.push({ ...base, pts: spline([p, mid, end]), r0: r, r1: Math.max(opts.minR ?? 0.7, r * 0.62), seed, lineFrom: r * 2.2 });
  if (depth <= 0) return;
  for (let k = 0; k < 2; k++) {
    const side = k === 0 ? -1 : 1;
    let a2 = ang + bend + side * ((opts.spread ?? 0.35) + 0.35 * hash(seed, k, 11));
    a2 = lerp(a2, -Math.PI / 2, opts.up ?? 0.15);
    grow(out, end, a2, len * (0.6 + 0.18 * hash(seed, k, 12)), r * 0.64, depth - 1, seed * 3 + k + 1, base, opts);
  }
}

// --- small painted pieces -----------------------------------------------------------------

/**
 * Paints one leaf straight into the buffer, lit by its fold and its own position: `steps` are
 * [shadow, mid, light] (light only on the half toward the light, mid on the far half).
 */
export function paintLeaf(b: Buf, l: Leaf, palId: number, steps: [number, number, number], part = -1, z = 0, edge?: number): void {
  leafPixels(l, (px, py, tt, s, dir) => {
    const toL = -Math.sin(dir) * LX + Math.cos(dir) * LY;
    const lit = s * Math.sign(toL || 1);
    let st = lit > 0.15 ? steps[2] : lit < -0.35 ? steps[0] : steps[1];
    if (tt < 0.15) st = steps[0];
    if (edge !== undefined && Math.abs(s) > 0.8 && lit < 0) st = edge;
    b.put(px, py, palId, st, part, z);
  });
}

/** A hanging vine: a thin curved stem with small leaves on alternating sides. */
export function vine(b: Buf, x0: number, y0: number, len: number, o: { sway: number; seed: number; stemPal: number; leafPal: number; part?: number; z?: number; curl?: number }): void {
  const pts: Pt[] = [];
  const curl = o.curl ?? (rnd(o.seed, 1) - 0.5) * 8;
  for (let k = 0; k <= len; k++) {
    const t = k / len;
    pts.push([x0 + Math.sin(t * 2.4 + o.seed) * curl * t + o.sway * t * t, y0 + k]);
  }
  let last = '';
  for (const [x, y] of pts) {
    const key = `${Math.round(x)},${Math.round(y)}`;
    if (key === last) continue;
    last = key;
    b.put(Math.round(x), Math.round(y), o.stemPal, 2, o.part ?? -1, o.z ?? 0);
  }
  for (let k = 3, i = 0; k < len - 1; k += 3 + Math.floor(rnd(o.seed, i, 2) * 3), i++) {
    const [x, y] = pts[k];
    const side = i % 2 ? 1 : -1;
    const ang = Math.PI / 2 + side * (0.9 + rnd(o.seed, i, 3) * 0.5);
    const lf: Leaf = { x: x + 0.5, y: y + 0.5, ang: side > 0 ? ang - Math.PI / 2 - 0.6 : ang + Math.PI / 2 + 0.6, len: 3.4 + rnd(o.seed, i, 4) * 1.6, wid: 2.4, kind: 'oval', tone: 0 };
    lf.ang = side > 0 ? 0.5 + rnd(o.seed, i, 5) * 0.6 : Math.PI - 0.5 - rnd(o.seed, i, 5) * 0.6;
    paintLeaf(b, lf, o.leafPal, [2, 3, 5], o.part ?? -1, o.z ?? 0);
  }
}
