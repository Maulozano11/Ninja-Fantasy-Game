// Trees for the battle maps: broadleaf oak, cedar pine, red maple, bamboo grove and a stump.
// They are the largest world sprites (real height, 1 m = 57 px), act as cover, block sight,
// burn and can be climbed.
//
//   npx tsx tools/world-sprites/trees.ts [previewDir]
//
// Look (owner reference, REF-tree-owner / REF-bush-owner): a canopy is a few BIG lobes, each lit
// like a soft sphere from the upper left, with a mottled texture of painted dabs (2-6 px cells in
// neighbouring greens). Lobes separate by value (a dark occlusion zone where a front lobe covers
// a back one), never by lines; only the outer silhouette gets a 1 px outline, in the darkest
// green of the palette, ragged where whole dabs fall off or poke out. Few colours: 7 foliage
// tones and 3-4 trunk tones per tree, taken from the reference palettes.
//
// Everything is drawn into an indexed buffer (palette + step per pixel) and turned into colors
// at the end. Foliage items are cached as local light rasters and composited per frame at
// whole-pixel sway offsets, so the dabs travel with their lobe instead of shimmering.

import { join } from 'node:path';
import { Canvas, Color, MATERIALS, WorldSprite, hash, hex, lambert, m, mix, noise, preview, previewDir, ramp, writeGroup } from './kit';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const frac = (v: number): number => v - Math.floor(v);
type Pt = [number, number];
/** 2D direction toward the light on screen (upper left). */
const LX = -0.62, LY = -0.79;

// --- palettes -----------------------------------------------------------------------------

const PALS: Color[][] = [];
function addPal(r: Color[]): number {
  PALS.push(r);
  return PALS.length - 1;
}
const pal = (hexes: string[]): number => addPal(hexes.map((h) => hex(h)));

const R_FIRE = ramp(MATERIALS.fire);
/** Flames: dark ember red, red tips, orange body, amber, pale yellow core (kit fire colors). */
const FIRE_RAMP: Color[] = [R_FIRE[0], mix(R_FIRE[1], hex('#ef4444'), 0.3), hex('#ef4444'), hex(MATERIALS.fire), R_FIRE[4], hex('#fde68a')];

/** Foliage palettes have 7 steps: 0 is the silhouette outline and the deepest shadow, 6 the pale highlight. */
const P = {
  oak: pal(['#172e14', '#354e11', '#4e6911', '#6e802f', '#91a53a', '#a5b547', '#e0d880']),
  pine: pal(['#172621', '#21362f', '#224c3a', '#295b42', '#326747', '#417848', '#4d854b']),
  bambooLeaf: pal(['#172621', '#224c3a', '#295b42', '#326747', '#417848', '#4d854b', '#60954f']),
  maple: pal(['#2a0c15', '#4e1420', '#7a1c22', '#a8321f', '#c95424', '#e07d2e', '#f2b45a']),
  scorch: pal(['#1c1a10', '#352d14', '#51431c', '#6e5a28', '#8a7234', '#a08a44', '#c4b06a']),
  charLeaf: pal(['#09080a', '#131012', '#1d181a', '#292325', '#383032', '#483e3f', '#5a4f4e']),
  // Trunks: outline + 3-4 tones (dark streak, shadow side, lit side, pale streak).
  bark: pal(['#2a1620', '#311c26', '#5b4029', '#8f6949', '#8f6949', '#c3a66f']),
  cedar: pal(['#2c1419', '#3a1c20', '#68362a', '#9a5a3e', '#9a5a3e', '#c88c62']),
  barkGrey: pal(['#261c22', '#3a2c30', '#5f5048', '#8d7d6a', '#8d7d6a', '#b8a888']),
  charred: addPal(ramp(MATERIALS.charred, { spread: 0.62 })),
  woodCut: pal(['#311c26', '#5b4029', '#8f6949', '#b08a5e', '#c3a66f', '#dcc48e']),
  fire: addPal(FIRE_RAMP),
  ash: addPal(ramp(MATERIALS.stone, { spread: 0.8 })),
  sheath: pal(['#2a1620', '#4a3424', '#6e5634', '#8f7448', '#b09460', '#c3a66f']),
  culm: pal(['#172e14', '#354e11', '#4e6911', '#6e802f', '#91a53a', '#a5b547']),
  culmOld: pal(['#26280f', '#4d5418', '#6e802f', '#91a53a', '#a5b547', '#c9c46a']),
};
const isFoliage = (p: number): boolean => p === P.oak || p === P.pine || p === P.bambooLeaf || p === P.maple || p === P.scorch || p === P.charLeaf;

// --- indexed drawing buffer ---------------------------------------------------------------

/** Palette id + step per pixel (-1 = empty). */
class Ix {
  readonly p: Int16Array;
  readonly s: Int8Array;
  constructor(readonly w: number, readonly h: number) {
    this.p = new Int16Array(w * h).fill(-1);
    this.s = new Int8Array(w * h);
  }
  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  has(x: number, y: number): boolean {
    return this.inside(x, y) && this.p[y * this.w + x] >= 0;
  }
  put(x: number, y: number, pal: number, step: number): void {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.p[i] = pal;
    this.s[i] = step;
  }
  pal(x: number, y: number): number {
    return this.inside(x, y) ? this.p[y * this.w + x] : -1;
  }
  step(x: number, y: number): number {
    return this.has(x, y) ? this.s[y * this.w + x] : -1;
  }
  toCanvas(): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let i = 0; i < this.w * this.h; i++) {
      if (this.p[i] < 0) continue;
      const col = PALS[this.p[i]][this.s[i]];
      c.px.set([col[0], col[1], col[2], 255], i * 4);
    }
    return c;
  }
  /** Share of pixels per step for foliage and for everything else (value-budget check). */
  histogram(): string {
    const f = [0, 0, 0, 0, 0, 0, 0], o = [0, 0, 0, 0, 0, 0, 0];
    let nf = 0, no = 0;
    for (let i = 0; i < this.w * this.h; i++) {
      const p = this.p[i];
      if (p < 0 || p === P.fire) continue;
      if (isFoliage(p)) {
        f[this.s[i]]++;
        nf++;
      } else {
        o[this.s[i]]++;
        no++;
      }
    }
    const pc = (a: number[], n: number) => a.map((v) => Math.round((v / Math.max(1, n)) * 100)).join('/');
    return `foliage ${pc(f, nf)}  other ${pc(o.slice(0, 6), no)}`;
  }
}

/** A set of pixels in a bounding box. */
class Mask {
  readonly a: Uint8Array;
  constructor(readonly x0: number, readonly y0: number, readonly w: number, readonly h: number) {
    this.a = new Uint8Array(Math.max(0, w * h));
  }
  has(x: number, y: number): boolean {
    const i = x - this.x0, j = y - this.y0;
    return i >= 0 && j >= 0 && i < this.w && j < this.h && this.a[j * this.w + i] === 1;
  }
  add(x: number, y: number): void {
    const i = x - this.x0, j = y - this.y0;
    if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.a[j * this.w + i] = 1;
  }
  each(fn: (x: number, y: number) => void): void {
    for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) if (this.a[j * this.w + i]) fn(i + this.x0, j + this.y0);
  }
}

const N4: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

interface StampOpts {
  /** Draws a 1 px dark line (step 0 of `linePal`) on existing pixels bordering the shape, where this returns true. */
  line?: (x: number, y: number, qx: number, qy: number) => boolean;
  linePal?: number;
}
/** Paints a shape over the buffer: inner line first, then the shape itself. */
function stamp(L: Ix, M: Mask, paint: (x: number, y: number) => [number, number] | null, o: StampOpts = {}): void {
  if (o.line) {
    const lp = o.linePal ?? 0;
    M.each((x, y) => {
      for (const [dx, dy] of N4) {
        const qx = x + dx, qy = y + dy;
        if (!M.has(qx, qy) && L.has(qx, qy) && L.pal(qx, qy) !== P.fire && o.line!(x, y, qx, qy)) L.put(qx, qy, lp, 0);
      }
    });
  }
  M.each((x, y) => {
    const r = paint(x, y);
    if (r) L.put(x, y, r[0], r[1]);
  });
}

/** Light value to step 1..5 through thresholds, edges broken into small clusters. */
function quant(Lv: number, x: number, y: number, seed: number, th: number[], jit = 0.06, cell = 2.5): number {
  const t = Lv + (noise(x, y, cell, seed) - 0.5) * 2 * jit;
  let s = 1;
  for (const k of th) if (t >= k) s++;
  return s;
}

/** Nearest jittered-grid feature: offset from it and the gap to the second nearest (cell edges). */
function worley(x: number, y: number, S: number, seed: number): { dx: number; dy: number; f: number } {
  const ci = Math.floor(x / S), cj = Math.floor(y / S);
  let d1 = 1e9, d2 = 1e9, bx = 0, by = 0;
  for (let j = cj - 1; j <= cj + 1; j++)
    for (let i = ci - 1; i <= ci + 1; i++) {
      const fx = (i + 0.15 + 0.7 * hash(i, j, seed)) * S, fy = (j + 0.15 + 0.7 * hash(i, j, seed + 1)) * S;
      const d = (x - fx) ** 2 + (y - fy) ** 2;
      if (d < d1) {
        d2 = d1;
        d1 = d;
        bx = x - fx;
        by = y - fy;
      } else if (d < d2) d2 = d;
    }
  return { dx: bx, dy: by, f: Math.sqrt(d2) - Math.sqrt(d1) };
}

/** Value (0..1) of the dab cell around (x, y): irregular cells about sx by sy px. */
function dabCell(x: number, y: number, sx: number, sy: number, seed: number): number {
  const fx = x / sx, fy = y / sy;
  const ci = Math.floor(fx), cj = Math.floor(fy);
  let d1 = 1e9, best = 0;
  for (let j = cj - 1; j <= cj + 1; j++)
    for (let i = ci - 1; i <= ci + 1; i++) {
      const px = i + 0.1 + 0.8 * hash(i, j, seed), py = j + 0.1 + 0.8 * hash(i, j, seed + 1);
      const d = (fx - px) ** 2 + (fy - py) ** 2;
      if (d < d1) {
        d1 = d;
        best = hash(i, j, seed + 2);
      }
    }
  return best;
}

/** Catmull-Rom through the control points, sampled about every `step` px. */
function spline(ctrl: Pt[], step = 2): Pt[] {
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

// --- foliage: big lobes, mottled dabs, value separation -----------------------------------

/** Light (0..1) of a foliage point and its signed distance to the item's edge in px (+ inside). */
interface Shape {
  L: number;
  e: number;
}

interface FolItem {
  x: number;
  y: number;
  x0: number;
  y0: number;
  w: number;
  h: number;
  /** Local light per pixel (NaN outside) and the dab cell value. */
  light: Float32Array;
  cell: Float32Array;
  pal: number;
  /** 0: behind the limbs, 1: in front of them. */
  layer: number;
  bias: number;
  amp: number;
  phase: number;
}

function makeItem(o: {
  x: number; y: number; x0: number; y0: number; x1: number; y1: number; shape: (lx: number, ly: number) => Shape | null;
  dab: Pt; seed: number; pal: number; layer: number; bias: number; amp: number; phase: number;
}): FolItem {
  const w = o.x1 - o.x0 + 1, h = o.y1 - o.y0 + 1;
  const light = new Float32Array(w * h).fill(NaN), cell = new Float32Array(w * h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const lx = o.x0 + i + 0.5, ly = o.y0 + j + 0.5;
      const sh = o.shape(lx, ly);
      if (!sh) continue;
      const ch = dabCell(lx, ly, o.dab[0], o.dab[1], o.seed + 50);
      // Ragged edge made of whole dabs: some fall off just inside, a few poke out.
      const inside = sh.e > 0 ? !(sh.e < 1.7 && ch < 0.26) : sh.e > -1.7 && ch > 0.9;
      if (!inside) continue;
      light[j * w + i] = sh.L;
      cell[j * w + i] = ch;
    }
  return { x: Math.round(o.x), y: Math.round(o.y), x0: o.x0, y0: o.y0, w, h, light, cell, pal: o.pal, layer: o.layer, bias: o.bias, amp: o.amp, phase: o.phase };
}

interface LobeDef {
  x: number;
  y: number;
  rx: number;
  ry: number;
  seed: number;
  /** Silhouette bumps: amplitude (fraction of the radius) and frequency. */
  bump?: number;
  K?: number;
  /** Scale of the highlight blotches (px). */
  S?: number;
  /** Underside flattening (<1 flattens). */
  flat?: number;
}

/** A soft lit sphere with lumpy edges; the light breaks into a few blotches. */
function lobeShape(o: LobeDef): (lx: number, ly: number) => Shape | null {
  const bump = o.bump ?? 0.12, K = o.K ?? 2.4, S = o.S ?? 20;
  return (lx, ly) => {
    const u = lx / o.rx;
    let v = ly / o.ry;
    if (o.flat && v > 0) v /= o.flat;
    const th = Math.atan2(v, u);
    const rg = 1 + bump * (noise(Math.cos(th) * K + 20, Math.sin(th) * K + 20, 1, o.seed) - 0.5) * 2;
    const r = Math.hypot(u, v);
    const e = (rg - r) * Math.min(o.rx, o.ry * (o.flat && v > 0 ? o.flat : 1));
    if (e < -2) return null;
    const uu = u / rg, vv = v / rg;
    const bu = (noise(lx, ly, S, o.seed + 1) - 0.5) * 0.9, bv = (noise(lx, ly, S, o.seed + 2) - 0.5) * 0.9;
    const nu = clamp(uu * 0.85 + bu, -1, 1), nv = clamp(vv * 0.85 + bv, -1, 1);
    const d = Math.min(0.97, nu * nu + nv * nv);
    let L = clamp(-0.42 * nu - 0.55 * nv + 0.72 * Math.sqrt(1 - d), 0, 1);
    // The rim turns away, most at the lower right.
    L -= 0.3 * clamp((Math.hypot(uu, vv) - 0.72) / 0.28, 0, 1) * (0.45 + 0.55 * clamp((uu + vv) * 0.7 + 0.3, 0, 1));
    return { L, e };
  };
}

function lobeItem(d: LobeDef & { pal: number; layer: number; bias: number; amp: number; phase: number; dab?: Pt }): FolItem {
  const pad = 4;
  return makeItem({
    x: d.x, y: d.y, x0: -Math.ceil(d.rx * 1.25) - pad, y0: -Math.ceil(d.ry * 1.25) - pad, x1: Math.ceil(d.rx * 1.25) + pad, y1: Math.ceil(d.ry * 1.25) + pad,
    shape: lobeShape(d), dab: d.dab ?? [3.4, 3.4], seed: d.seed, pal: d.pal, layer: d.layer, bias: d.bias, amp: d.amp, phase: d.phase,
  });
}

interface FolOut {
  W: number;
  H: number;
  own: Int16Array;
  lv: Float32Array;
  cell: Float32Array;
}

/**
 * Composites the items (later = in front) at whole-pixel offsets, then darkens each pixel near
 * a lobe in front of it (strongest where that lobe sits toward the light): the occlusion zone
 * that separates lobes by value instead of by lines.
 */
function compositeFol(W: number, H: number, items: FolItem[], offs: Pt[], D = 9, k = 0.42): FolOut {
  const own = new Int16Array(W * H).fill(-1);
  const lv = new Float32Array(W * H), cell = new Float32Array(W * H);
  items.forEach((it, idx) => {
    const [ox, oy] = offs[idx];
    for (let j = 0; j < it.h; j++)
      for (let i = 0; i < it.w; i++) {
        const v = it.light[j * it.w + i];
        if (Number.isNaN(v)) continue;
        const X = it.x + ox + it.x0 + i, Y = it.y + oy + it.y0 + j;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const p = Y * W + X;
        own[p] = idx;
        lv[p] = v + it.bias;
        cell[p] = it.cell[j * it.w + i];
      }
  });
  // Max owner index within D (separable), to skip pixels with nothing in front nearby.
  const rowMax = new Int16Array(W * H), mx = new Int16Array(W * H);
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
  const ao = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = y * W + x, a = own[p];
      if (a < 0 || mx[p] <= a) continue;
      let best = 0;
      for (let dy = -D; dy <= D; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -D; dx <= D; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W || own[yy * W + xx] <= a) continue;
          const d = Math.hypot(dx, dy);
          if (d > D) continue;
          const f = 0.5 + 0.5 * Math.max(0, (dx * LX + dy * LY) / d);
          best = Math.max(best, (1 - d / (D + 1)) * f);
        }
      }
      ao[p] = best;
    }
  for (let p = 0; p < W * H; p++) if (own[p] >= 0) lv[p] -= k * Math.pow(ao[p], 1.3);
  return { W, H, own, lv, cell };
}

/** Light + dab to a foliage step 0..6. */
const TH_FOL = [0.12, 0.25, 0.39, 0.54, 0.69, 0.83];
function folStep(v: number, cell: number, dab = 0.26): number {
  const t = v + (cell - 0.5) * dab;
  let s = 0;
  for (const k of TH_FOL) if (t >= k) s++;
  return s;
}

/** Writes composited foliage of the chosen layers into the buffer. */
function putFol(L: Ix, F: FolOut, items: FolItem[], layers: (layer: number) => boolean, paint?: (x: number, y: number, it: FolItem, v: number, cell: number) => [number, number]): void {
  for (let y = 0; y < F.H; y++)
    for (let x = 0; x < F.W; x++) {
      const p = y * F.W + x, o = F.own[p];
      if (o < 0 || !layers(items[o].layer)) continue;
      const r = paint ? paint(x, y, items[o], F.lv[p], F.cell[p]) : [items[o].pal, folStep(F.lv[p], F.cell[p])];
      L.put(x, y, r[0], r[1]);
    }
}

// --- bark tubes (trunks, limbs, branches, roots) ------------------------------------------

type Tex = 'streak' | 'cedar' | 'smooth' | 'charred';
interface Tube {
  pts: Pt[];
  r0: number;
  r1: number;
  flare?: number;
  flareLen?: number;
  pal: number;
  tex: Tex;
  seed: number;
  bias?: number;
  /** Inner lines against the same material start after this arc length (keeps forks seamless). */
  lineFrom?: number;
  /** Nothing below this row (the ground). */
  clipY?: number;
  /** Light multiplier (shadow under the canopy). */
  dim?: (x: number, y: number) => number;
  /** A broken, splintered tip this many px long. */
  point?: number;
  /** Chance of glowing cracks (charred). */
  ember?: number;
  /** 9 trunk and limbs (between the foliage layers), lower for twigs hidden behind it. */
  depth?: number;
}

/** Bark: lit side, shadow side and vertical streaks (dark everywhere, pale on the lit side). */
function barkStep(t: Tube, Lv: number, a: number, s: number, r: number): [number, number] {
  if (t.tex === 'charred') {
    let st = quant(Lv, Math.round(a * 1.5), Math.round(s), t.seed, [0.3, 0.46, 0.64, 0.84], 0.05, 2);
    const w = worley(a * 1.2, s * 0.55, 4, t.seed);
    if (w.f < 0.7) {
      if (t.ember && hash(Math.floor((a * 1.2) / 4 + w.dx), Math.floor((s * 0.55) / 4), t.seed + 2) < t.ember && Lv < 0.7)
        return [P.fire, hash(Math.round(a), Math.round(s), t.seed) < 0.35 ? 4 : 2];
      st = 1;
    } else if (w.dx + w.dy < -0.8 && Lv > 0.4) st += 1;
    return [P.charred, clamp(st, 1, 4)];
  }
  let st = Lv > 0.6 ? 3 : Lv > 0.3 ? 2 : 1;
  if (r < 2.4) return [t.pal, st];
  const twist = t.tex === 'cedar' ? s * 0.06 : 0;
  const col = Math.floor(a + twist + 300);
  const segLen = 5 + hash(col, 0, t.seed) * (t.tex === 'cedar' ? 22 : 15);
  const seg = Math.floor((s + hash(col, 1, t.seed) * 30) / segLen);
  const hh = hash(col, seg, t.seed + 2);
  const dark = t.tex === 'cedar' ? 0.3 : t.tex === 'smooth' ? 0.1 : 0.2;
  if (hh < dark) st = Math.max(1, st - 1);
  else if (hh > 0.88 && Lv > 0.66) st = 5;
  return [t.pal, st];
}

function drawTube(L: Ix, t: Tube): void {
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
    if (t.point && s > S - t.point) r *= Math.max(0.1, (S - s) / t.point);
    return r;
  };
  const rmax = Math.max(t.r0, t.r1) + (t.flare ?? 0) + 1;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P0) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  x0 = Math.floor(x0 - rmax);
  y0 = Math.floor(y0 - rmax);
  const M = new Mask(x0, y0, Math.ceil(x1 + rmax) - x0 + 1, Math.ceil(y1 + rmax) - y0 + 1);
  const info = new Float32Array(M.w * M.h * 6);
  for (let y = y0; y < y0 + M.h; y++) {
    if (t.clipY !== undefined && y > t.clipY) continue;
    for (let x = x0; x < x0 + M.w; x++) {
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
      M.add(x, y);
      const nx = (px - bcx) / br, ny = (py - bcy) / br;
      const off = (px - bcx) * -buy + (py - bcy) * bux;
      const k = ((y - y0) * M.w + (x - x0)) * 6;
      info[k] = bs;
      info[k + 1] = clamp(off / br, -1, 1);
      info[k + 2] = nx;
      info[k + 3] = ny;
      info[k + 4] = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      info[k + 5] = br;
    }
  }
  const at = (x: number, y: number) => ((y - y0) * M.w + (x - x0)) * 6;
  stamp(
    L,
    M,
    (x, y) => {
      const k = at(x, y);
      const s = info[k], u = info[k + 1], r = info[k + 5];
      const Lv = lambert(info[k + 2], info[k + 3], info[k + 4]) * (t.dim ? t.dim(x, y) : 1) + (t.bias ?? 0);
      return barkStep(t, Lv, Math.asin(u) * r, s, r);
    },
    {
      line: (x, y, qx, qy) => L.pal(qx, qy) !== t.pal || info[at(x, y)] > (t.lineFrom ?? 0),
      linePal: t.tex === 'charred' ? P.charred : t.pal,
    },
  );
}

/** Recursive branching: each branch forks into two thinner ones that lean outward and up. */
function grow(out: Tube[], p: Pt, ang: number, len: number, r: number, depth: number, seed: number, base: Partial<Tube> & { pal: number; tex: Tex }): void {
  const bend = (hash(seed, 1, 7) - 0.5) * 0.6;
  const mid: Pt = [p[0] + Math.cos(ang + bend * 0.4) * len * 0.5, p[1] + Math.sin(ang + bend * 0.4) * len * 0.5];
  const end: Pt = [p[0] + Math.cos(ang + bend) * len, p[1] + Math.sin(ang + bend) * len];
  out.push({ ...base, pts: spline([p, mid, end]), r0: r, r1: Math.max(0.7, r * 0.62), seed, lineFrom: r * 2.2, depth });
  if (depth <= 0) return;
  for (let k = 0; k < 2; k++) {
    const side = k === 0 ? -1 : 1;
    let a2 = ang + bend + side * (0.32 + 0.35 * hash(seed, k, 11));
    a2 = lerp(a2, -Math.PI / 2, 0.15);
    grow(out, end, a2, len * (0.6 + 0.18 * hash(seed, k, 12)), r * 0.64, depth - 1, seed * 3 + k + 1, base);
  }
}

// --- fire ---------------------------------------------------------------------------------

interface Flame {
  x: number;
  y: number;
  w: number;
  h: number;
  ph: number;
  seed: number;
  /** Number of tongues (default 3). */
  n?: number;
  /** Horizontal drift of the tips (wind), px over the full height. */
  lean?: number;
}

/** One flame: a burning bed with a few wavy tongues, a hot core, red tips and rising wisps. */
function flameInto(F: Ix, f: Flame, t: number): void {
  const put = (x: number, y: number, s: number) => {
    if (F.step(x, y) < s) F.put(x, y, P.fire, s);
  };
  // The bed: a low rounded mound of fire with a ragged underside, so no flame starts on a flat cut.
  const brx = f.w * 0.55, bry = Math.max(2.5, f.w * 0.22);
  for (let y = Math.floor(f.y - bry); y <= f.y + bry + 2; y++)
    for (let x = Math.floor(f.x - brx - 1); x <= f.x + brx + 1; x++) {
      const u = (x + 0.5 - f.x) / brx, v = (y + 0.5 - f.y) / bry;
      const rag = y > f.y ? (noise(x, Math.floor(t * 8), 1.5, f.seed + 40) - 0.5) * 0.7 : 0;
      const e = Math.sqrt(u * u + v * v) + rag;
      if (e > 1) continue;
      put(x, y, e > 0.72 || v > 0.55 ? 2 : e > 0.4 ? 3 : 4);
    }
  const n = f.n ?? 3;
  const mid = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const ox = n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.75;
    const hk = i === mid ? 1 : 0.5 + 0.3 * hash(i, 0, f.seed);
    const q = t + f.ph + hash(i, 1, f.seed);
    const hh = f.h * hk * (0.8 + 0.12 * Math.sin(TAU * q) + 0.08 * Math.sin(TAU * 2 * q + 1.3));
    const bx = f.x + ox * f.w;
    const ww = f.w * (i === mid ? 0.7 : 0.46);
    for (let k = 0; k <= hh; k++) {
      const tt = k / hh;
      const prof = Math.pow(1 - tt, 0.9) * Math.min(1, 0.8 + tt * 2);
      const hw = (ww / 2) * prof;
      const cx = bx + Math.sin(TAU * q - tt * 3.6 + f.seed) * ww * 0.3 * tt + (f.lean ?? 0) * tt * tt;
      const y = Math.round(f.y - k);
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const e = Math.abs(x + 0.5 - cx) / Math.max(0.5, hw);
        if (e > 1) continue;
        const s = tt > 0.74 || e > 0.8 ? 2 : e < 0.3 && tt < 0.26 ? 5 : e < 0.55 && tt < 0.5 ? 4 : 3;
        put(x, y, s);
      }
    }
    // A wisp breaks off the tip and rises while shrinking.
    const wq = frac(q * 1.0 + 0.5);
    const wr = (1 - wq) * ww * 0.2;
    if (wr >= 0.8) {
      const wy = f.y - hh - 2 - wq * f.h * 0.5, wx = bx + Math.sin(TAU * wq + f.seed) * 2 + (f.lean ?? 0);
      for (let y = Math.floor(wy - wr * 1.6); y <= wy + wr * 1.6; y++)
        for (let x = Math.floor(wx - wr); x <= wx + wr; x++) {
          const e = ((x + 0.5 - wx) / wr) ** 2 + ((y + 0.5 - wy) / (wr * 1.6)) ** 2;
          if (e <= 1) put(x, y, e < 0.3 && wr > 1.6 ? 4 : wq > 0.55 ? 2 : 3);
        }
    }
  }
}

/** Rising embers, drawn straight onto the frame after the outline (they glow, no dark rim). */
function sparksOnto(C: Canvas, x0: number, y0: number, spread: number, rise: number, n: number, t: number, seed: number): void {
  for (let k = 0; k < n; k++) {
    const q = frac(t + hash(k, 0, seed));
    if (q > 0.92) continue;
    const x = Math.round(x0 + (hash(k, 1, seed) - 0.5) * spread + Math.sin(TAU * q + k) * 4 + q * 10);
    const y = Math.round(y0 - q * rise - hash(k, 3, seed) * 20);
    const s = q < 0.3 ? 5 : q < 0.65 ? 4 : 3;
    C.set(x, y, FIRE_RAMP[s]);
    if (q < 0.5 && hash(k, 2, seed) < 0.6) C.set(x, y + 1, FIRE_RAMP[Math.max(3, s - 1)]);
  }
}

/** Fire overlay: drawn after the tree's outline, with its own dark red rim. */
function overlayFire(C: Canvas, F: Ix): void {
  const fc = F.toCanvas();
  fc.outline({ toward: '#2a0806', amount: 0.55 });
  C.draw(fc, 0, 0);
}

/** A low mound of ash with charcoal bits and a few live embers. */
function ashPile(L: Ix, gx: number, gy: number, rx: number, ry: number, seed: number): void {
  for (let y = gy - ry * 2; y <= gy; y++)
    for (let x = gx - rx; x <= gx + rx; x++) {
      const u = (x + 0.5 - gx) / rx;
      const top = gy - ry * (1 - u * u) * (0.7 + 0.6 * noise(x, 0, 5, seed)) - 1;
      if (y < top || L.has(x, y)) continue;
      const lit = u < -0.2 ? 1 : 0;
      let s = y < top + 1.5 ? 3 + lit : 2;
      const lump = noise(x, y, 2.2, seed + 4);
      if (lump < 0.22) {
        L.put(x, y, P.charred, y < top + 1.5 ? 3 : 2);
        continue;
      }
      if (hash(Math.floor(x / 2), Math.floor(y / 2), seed + 1) < 0.05 && y > top + 1) {
        L.put(x, y, P.fire, 3);
        continue;
      }
      s = clamp(s - (noise(x, y, 2, seed) < 0.35 ? 1 : 0), 1, 4);
      L.put(x, y, P.ash, s);
    }
}

// --- frames, outline, cropping ------------------------------------------------------------

/**
 * The silhouette outline: each empty pixel next to the shape takes step 0 of a neighbouring
 * material, foliage first (very dark green around leaves, dark brown around bark).
 */
function outlineIx(L: Ix): void {
  const add: [number, number, number][] = [];
  for (let y = 0; y < L.h; y++)
    for (let x = 0; x < L.w; x++) {
      if (L.has(x, y)) continue;
      let best = -1, bl = Infinity;
      for (const [dx, dy] of N4) {
        const p = L.pal(x + dx, y + dy);
        if (p < 0) continue;
        const c = PALS[p][0];
        const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11 + (isFoliage(p) ? -1000 : 0);
        if (l < bl) {
          bl = l;
          best = p;
        }
      }
      if (best >= 0) add.push([x, y, best]);
    }
  for (const [x, y, p] of add) L.put(x, y, p, 0);
}

interface Built {
  anims: Record<string, { frames: Canvas[]; fps: number; loop?: boolean }>;
  gx: number;
}

/** Crops every frame of every animation to their common bounds (+1 px) and sets the anchor. */
function finish(name: string, label: string, meters: [number, number], tags: string[], b: Built): WorldSprite {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of Object.values(b.anims))
    for (const f of a.frames) {
      const bb = f.bounds();
      if (!bb) continue;
      x0 = Math.min(x0, bb[0]);
      y0 = Math.min(y0, bb[1]);
      x1 = Math.max(x1, bb[2]);
      y1 = Math.max(y1, bb[3]);
    }
  x0 -= 1;
  y0 -= 1;
  x1 += 1;
  y1 += 1;
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  const anims: WorldSprite['anims'] = {};
  for (const [k, a] of Object.entries(b.anims)) {
    anims[k] = {
      fps: a.fps,
      loop: a.loop,
      frames: a.frames.map((f) => {
        const c = new Canvas(W, H);
        c.draw(f, -x0, -y0);
        return c;
      }),
    };
  }
  // Ground contact: the lowest opaque row of the default frame.
  const bb = Object.values(b.anims)[0].frames[0].bounds()!;
  return { name, label, meters, anchor: [b.gx - x0, bb[3] - y0], tags, anims };
}

function toFrame(L: Ix, fire?: Ix): Canvas {
  outlineIx(L);
  const c = L.toCanvas();
  if (fire) overlayFire(c, fire);
  return c;
}

const STATS: string[] = [];
function stat(name: string, L: Ix): void {
  STATS.push(`${name}: ${L.histogram()}`);
}

/** Horizontal sway of a point at height `hf` (0 base .. 1 top) in frame f of n. */
function swayAt(hf: number, f: number, n: number, amp: number, lag = 1.1): number {
  if (hf <= 0) return 0;
  return Math.round(amp * hf * Math.sin((TAU * f) / n - lag * hf));
}

/** Sway offsets of the foliage items for frame f (whole lobes, slightly out of phase). */
const itemOffs = (items: FolItem[], f: number, n: number, still = false): Pt[] =>
  items.map((it) => [still ? 0 : Math.round(it.amp * Math.sin((TAU * f) / n + it.phase)), 0] as Pt);

/** Burning foliage: charred above a ragged burn line, a glowing front, scorched below, green lowest. */
function burnPaint(burnY: number, scorchY: number, seed: number) {
  return (x: number, y: number, it: FolItem, v: number, cell: number): [number, number] => {
    const nz = (noise(x, y, 12, seed) - 0.5) * 34 + (cell - 0.5) * 6;
    const s = folStep(v, cell);
    if (y + nz < burnY) {
      // Charred leaves, with glowing dabs on the lit side.
      if (cell < 0.1 && v > 0.42) return [P.fire, v > 0.6 ? 3 : 2];
      if (cell > 0.97) return [P.fire, 2];
      return [P.charLeaf, clamp(s, 1, 6)];
    }
    if (y + nz < burnY + 4) return [P.fire, cell < 0.5 ? 2 : 3];
    if (y + nz < scorchY) return [P.scorch, s];
    return [it.pal, s];
  };
}

// --- oak ----------------------------------------------------------------------------------

function oak(): WorldSprite {
  const W = 520, H = 600, gx = 260, gy = 560;
  // Canopy: about 5.5 m wide, from about 3 m to 7.5 m: a few big lobes.
  const CX = gx + 2, CY = gy - 292;
  const hfOf = (y: number) => clamp((gy - 150 - y) / 280, 0, 1);
  const lobes: [number, number, number, number, number][] = [
    [-60, -66, 92, 72, 0],
    [66, -60, 86, 70, 0],
    [-106, 20, 54, 60, 0],
    [108, 26, 52, 58, 0],
    [-40, 56, 76, 56, 1],
    [52, 62, 72, 52, 1],
    [-90, 114, 30, 20, 1],
  ];
  const items = lobes.map(([dx, dy, rx, ry, layer], i) => {
    const y = CY + dy;
    const hf = hfOf(y);
    const gl = clamp(-(dx / 150) * 0.5 - (dy / 135) * 0.6, -1, 1);
    return lobeItem({
      x: CX + dx, y, rx, ry, seed: 100 + i * 31, bump: 0.13, K: 2.4, S: 22,
      pal: P.oak, layer, bias: 0.06 * gl + (layer === 0 ? -0.03 : 0), amp: 1 + 2 * hf, phase: -1.1 * hf + (hash(i, 9, 3) - 0.5) * 0.6,
    });
  });

  const F: Pt = [gx - 1, gy - 138];
  const underCanopy = (_x: number, y: number) => (y < gy - 175 ? 0.55 : y < gy - 140 ? 0.8 : 1);
  const bark = (tex: Tex, pal: number): Partial<Tube> & { pal: number; tex: Tex } => ({ pal, tex, dim: underCanopy });

  const skeleton = (burnt: boolean): Tube[] => {
    const pal = burnt ? P.charred : P.bark, tex: Tex = burnt ? 'charred' : 'streak';
    const ts: Tube[] = [];
    ts.push({ ...bark(tex, pal), pts: spline([[gx, gy + 4], [gx - 1, gy - 50], [gx + 2, gy - 100], F]), r0: 17, r1: 13, flare: 10, flareLen: 11, seed: 11, clipY: gy, ember: burnt ? 0.08 : 0, depth: 9 });
    // Surface roots.
    ts.push({ ...bark(tex, pal), pts: spline([[gx - 14, gy - 12], [gx - 31, gy - 3], [gx - 46, gy]]), r0: 6.5, r1: 1.6, seed: 21, clipY: gy, lineFrom: 99, depth: 9 });
    ts.push({ ...bark(tex, pal), pts: spline([[gx + 13, gy - 11], [gx + 27, gy - 3], [gx + 41, gy]]), r0: 6, r1: 1.6, seed: 22, clipY: gy, lineFrom: 99, depth: 9 });
    ts.push({ ...bark(tex, pal), pts: spline([[gx - 5, gy - 4], [gx - 13, gy], [gx - 22, gy + 2]]), r0: 3.5, r1: 1.2, seed: 23, clipY: gy + 2, lineFrom: 99, depth: 9 });
    ts.push({ ...bark(tex, pal), pts: spline([[gx + 6, gy - 3], [gx + 11, gy + 1], [gx + 17, gy + 3]]), r0: 3, r1: 1.1, seed: 24, clipY: gy + 3, lineFrom: 99, depth: 9 });
    // Limbs forking into the canopy; their twigs stay behind the foliage.
    const limbs: { pts: Pt[]; r0: number; r1: number; kids: [number, number][] }[] = [
      { pts: [F, [gx - 26, gy - 170], [gx - 62, gy - 200], [gx - 96, gy - 236]], r0: 10, r1: 6, kids: [[-2.2, 30], [-1.6, 36]] },
      { pts: [F, [gx + 6, gy - 186], [gx + 2, gy - 236], [gx - 12, gy - 300]], r0: 11, r1: 6.5, kids: [[-2.0, 46], [-1.2, 48]] },
      { pts: [F, [gx + 30, gy - 168], [gx + 66, gy - 194], [gx + 100, gy - 226]], r0: 9, r1: 5.5, kids: [[-1.3, 34], [-0.75, 28]] },
    ];
    limbs.forEach((l, i) => {
      const pts = burnt && i === 1 ? l.pts.slice(0, 3) : l.pts;
      ts.push({ ...bark(tex, pal), pts: spline(pts), r0: l.r0, r1: l.r1, seed: 31 + i, lineFrom: 22, ember: burnt ? 0.1 : 0, point: burnt && i === 1 ? 14 : 0, depth: 9 });
      const end = pts[pts.length - 1];
      l.kids.forEach(([ang, len], k) => {
        const out: Tube[] = [];
        grow(out, end, ang, burnt ? len * 0.9 : len, l.r1 * 0.75, burnt ? 1 : 2, 50 + i * 10 + k, bark(tex, pal));
        for (const tb of out) {
          if (burnt) {
            if ((tb.depth ?? 0) < 1 && hash(i, k, tb.seed) < 0.6) continue;
            tb.point = Math.min(8, tb.r0 * 3);
            tb.ember = 0.06;
          }
          ts.push(tb);
        }
      });
    });
    // A low branch on the left carrying its own small tuft.
    ts.push({ ...bark(tex, pal), pts: spline([[gx - 10, gy - 118], [gx - 34, gy - 140], [gx - 60, gy - 152], [gx - 84, gy - 176]]), r0: 4.5, r1: 2.4, seed: 77, lineFrom: 8, point: burnt ? 8 : 0, ember: burnt ? 0.06 : 0, depth: 9 });
    return ts;
  };

  const render = (f: number, mode: 'idle' | 'burning' | 'burnt'): Canvas => {
    const L = new Ix(W, H);
    const n = 8;
    const tubes = skeleton(mode === 'burnt');
    const sway = (y: number) => (mode === 'idle' ? swayAt(hfOf(y), f, n, 3) * clamp((gy - 150 - y) / 40, 0, 1) : 0);
    const moved = tubes.map((t) => ({ ...t, pts: t.pts.map(([x, y]) => [x + sway(y), y] as Pt) }));
    if (mode === 'burnt') {
      for (const t of moved) drawTube(L, t);
      ashPile(L, gx, gy + 2, 44, 5, 5);
      stat('oak burnt', L);
      return toFrame(L);
    }
    const Fo = compositeFol(W, H, items, itemOffs(items, f, n, mode !== 'idle'), 10, 0.45);
    const paint = mode === 'burning' ? burnPaint(CY - 20, CY + 60, 77) : undefined;
    for (const t of moved) if ((t.depth ?? 0) < 9) drawTube(L, t);
    putFol(L, Fo, items, (l) => l === 0, paint);
    for (const t of moved) if ((t.depth ?? 0) === 9) drawTube(L, t);
    putFol(L, Fo, items, (l) => l > 0, paint);
    if (mode === 'idle') {
      if (f === 0) stat('oak idle', L);
      return toFrame(L);
    }
    // Burning: flames along the charred crown, at the fork and from a wound on the trunk.
    const fire = new Ix(W, H);
    const t = f / n;
    const topAt = (x: number): number => {
      for (let y = 0; y < H; y++) if (Fo.own[y * W + x] >= 0) return y;
      return -1;
    };
    for (let k = 0; k < 9; k++) {
      const x = Math.round(CX - 128 + k * 32 + (hash(k, 1, 8) - 0.5) * 10);
      const ty = topAt(x);
      if (ty < 0 || ty > CY + 10) continue;
      const big = 1 - Math.abs(k - 4) / 5;
      flameInto(fire, { x, y: ty + 12, w: 26 + big * 18, h: 40 + big * 56, ph: hash(k, 3, 5), seed: k, n: 3, lean: 6 }, t);
    }
    for (const [fx, fy, fw, fh, k] of [[-70, -40, 24, 40, 11], [34, -36, 26, 44, 12], [-118, 6, 18, 30, 13], [124, 12, 18, 28, 14]] as [number, number, number, number, number][])
      flameInto(fire, { x: CX + fx, y: CY + fy, w: fw, h: fh, ph: hash(k, 3, 5), seed: k, n: 2, lean: 4 }, t);
    flameInto(fire, { x: gx - 4, y: gy - 136, w: 16, h: 34, ph: 0.1, seed: 6, n: 2, lean: 3 }, t);
    flameInto(fire, { x: gx + 9, y: gy - 66, w: 9, h: 20, ph: 0.6, seed: 4, n: 1, lean: 2 }, t);
    if (f === 0) stat('oak burning', L);
    const c = toFrame(L, fire);
    sparksOnto(c, CX + 10, CY - 150, 240, 90, 26, t, 9);
    return c;
  };

  const idle = Array.from({ length: 8 }, (_, f) => render(f, 'idle'));
  const burning = Array.from({ length: 8 }, (_, f) => render(f, 'burning'));
  const burnt = [render(0, 'burnt')];
  return finish('oak', 'Broadleaf Tree', [5.5, 7.5], ['cover-half', 'blocks-sight', 'flammable', 'destructible', 'climbable'], {
    gx,
    anims: { idle: { frames: idle, fps: 5 }, burning: { frames: burning, fps: 11 }, burnt: { frames: burnt, fps: 0 } },
  });
}

// --- cedar pine ---------------------------------------------------------------------------

interface Tier {
  /** Attachment height on the trunk (row) and trunk x there. */
  y: number;
  x: number;
  hwL: number;
  hwR: number;
  droopL: number;
  droopR: number;
  /** Thickness of the lit top band above the branch line, and of the hanging skirt below it. */
  top: number;
  skirt: number;
  seed: number;
  amp: number;
  phase: number;
}

/** A needle tier: two drooping wings of hanging sprays with ragged needle tips. */
function tierShape(t: Tier): (lx: number, ly: number) => Shape | null {
  const sprays: { side: number; t0: number; t1: number; drop: number }[] = [];
  for (const side of [-1, 1]) {
    const w = side < 0 ? t.hwL : t.hwR;
    const nS = Math.max(2, Math.round(w / 14));
    let acc = 0;
    const cuts = [0];
    for (let k = 0; k < nS; k++) cuts.push((acc += 0.6 + hash(k, side, t.seed) * 0.8));
    for (let k = 0; k < nS; k++) sprays.push({ side, t0: cuts[k] / acc, t1: cuts[k + 1] / acc, drop: 3 + hash(k, side + 5, t.seed) * 8 });
  }
  return (lx, ly) => {
    const side = lx < 0 ? -1 : 1;
    const w = side < 0 ? t.hwL : t.hwR, droop = side < 0 ? t.droopL : t.droopR;
    const tn = Math.abs(lx) / w;
    if (tn > 1.08) return null;
    const own = sprays.filter((s) => s.side === side);
    const sp = own.find((s) => tn >= s.t0 && tn <= s.t1) ?? own[own.length - 1];
    const lu = clamp(((tn - sp.t0) / (sp.t1 - sp.t0)) * 2 - 1, -1, 1);
    // Branch line: rises from the trunk, droops toward the tip.
    const yc = droop * Math.pow(Math.min(1, tn), 1.7) - 2 * Math.max(0, 1 - tn);
    const topT = t.top * Math.pow(Math.max(0, 1 - tn), 0.8) + 2.5;
    const tipCut = tn > 0.84 ? Math.min(1, Math.pow((tn - 0.84) / 0.2, 1.3)) : 0;
    const skirt = t.skirt * (0.42 + 0.58 * Math.pow(Math.max(0, 1 - tn), 0.7)) + sp.drop * Math.sqrt(Math.max(0, 1 - lu * lu));
    // Needle tips: columns hang in 2 px groups of uneven length.
    const ncol = Math.floor((lx + 400) / 2);
    const needle = Math.floor(hash(ncol, 0, t.seed + 7) * 5) - (Math.abs(lu) > 0.8 ? 4 : 0);
    const yTop = yc - topT * (1 - tipCut);
    const yBot = yc + (skirt + needle) * (1 - tipCut * 0.85);
    const e = Math.min(ly - yTop, yBot - ly, (1.02 - tn) * w);
    if (e < -2) return null;
    const dv = clamp((ly - yc) / Math.max(1, yBot - yc), 0, 1);
    // Light: the upper surface faces the sky, the skirt turns away; left wing lit, right in shade.
    let L = ly < yc + 2 ? 0.8 - 0.12 * (1 - tn) : 0.62 - 0.5 * dv;
    L += side < 0 ? 0.08 * tn : -0.16 * tn;
    L += -lu * 0.08 * side;
    // A dark notch between sprays.
    if (Math.abs(lu) > 0.85 && dv > 0.35 && tn > 0.12) L -= 0.25;
    return { L, e };
  };
}

function pine(): WorldSprite {
  const W = 300, H = 600, gx = 150, gy = 560;
  const TOP = gy - m(9);
  const crownBot = gy - 104;
  const hfOf = (y: number) => clamp((crownBot - y) / (crownBot - TOP), 0, 1);
  const tiers: Tier[] = [];
  const NT = 11;
  for (let i = 0; i < NT; i++) {
    const k = i / (NT - 1); // 0 bottom .. 1 top
    const y = Math.round(lerp(gy - 150, TOP + 36, Math.pow(k, 0.92)));
    const hw = lerp(84, 13, Math.pow(k, 0.9));
    const hf = hfOf(y);
    tiers.push({
      y, x: gx + Math.round(Math.sin(k * 2.2) * 2),
      hwL: hw * (0.82 + hash(i, 1, 3) * 0.34), hwR: hw * (0.82 + hash(i, 2, 3) * 0.34),
      droopL: lerp(26, 5, k) * (0.6 + hash(i, 3, 3) * 0.8), droopR: lerp(26, 5, k) * (0.6 + hash(i, 4, 3) * 0.8),
      top: lerp(16, 8, k), skirt: lerp(30, 14, k), seed: 300 + i * 13,
      amp: 3 * Math.pow(hf, 1.2), phase: -1.1 * hf,
    });
  }
  const items: FolItem[] = tiers.map((t) => {
    const hw = Math.max(t.hwL, t.hwR);
    return makeItem({
      x: t.x, y: t.y, x0: -Math.ceil(hw * 1.1) - 3, y0: -Math.ceil(t.top) - 6, x1: Math.ceil(hw * 1.1) + 3, y1: Math.ceil(t.skirt + Math.max(t.droopL, t.droopR) + 16),
      shape: tierShape(t), dab: [2.3, 4.6], seed: t.seed, pal: P.pine, layer: 1, bias: 0, amp: t.amp, phase: t.phase,
    });
  });
  // The leader: a thin needle spike above the last tier.
  items.push(makeItem({
    x: gx + 1, y: TOP, x0: -5, y0: -1, x1: 5, y1: 30,
    shape: (lx, ly) => {
      const hw = 0.8 + Math.max(0, ly) * 0.11;
      const e = Math.min(hw - Math.abs(lx), ly + 0.5);
      return e < -2 ? null : { L: 0.62 - (lx / hw) * 0.2, e };
    },
    dab: [2, 4], seed: 399, pal: P.pine, layer: 1, bias: 0, amp: 3.2, phase: -1.1,
  }));
  const trunk = (burnt: boolean): Tube[] => {
    const pal = burnt ? P.charred : P.cedar, tex: Tex = burnt ? 'charred' : 'cedar';
    const dim = (_x: number, y: number) => (y < crownBot ? 0.6 : y < crownBot + 20 ? 0.8 : 1);
    const ts: Tube[] = [];
    const topY = burnt ? gy - 340 : TOP + 10;
    ts.push({ pal, tex, dim, pts: spline([[gx, gy + 4], [gx + 1, gy - 120], [gx - 1, gy - 260], [gx + 1, topY]], 3), r0: 13, r1: burnt ? 5 : 1.5, flare: 7, flareLen: 10, seed: 41, clipY: gy, depth: 9, point: burnt ? 22 : 0, ember: burnt ? 0.07 : 0 });
    ts.push({ pal, tex, dim, pts: spline([[gx - 10, gy - 10], [gx - 22, gy - 3], [gx - 34, gy]]), r0: 5, r1: 1.4, seed: 42, clipY: gy, lineFrom: 99, depth: 9 });
    ts.push({ pal, tex, dim, pts: spline([[gx + 9, gy - 9], [gx + 20, gy - 2], [gx + 30, gy + 1]]), r0: 4.5, r1: 1.3, seed: 43, clipY: gy + 1, lineFrom: 99, depth: 9 });
    ts.push({ pal, tex, dim, pts: spline([[gx + 2, gy - 3], [gx + 5, gy + 1], [gx + 9, gy + 3]]), r0: 3, r1: 1, seed: 44, clipY: gy + 3, lineFrom: 99, depth: 9 });
    if (burnt) {
      // Broken branch stubs angled down and out.
      const stubs: [number, number, number][] = [[-1, 150, 26], [1, 176, 30], [-1, 214, 24], [1, 246, 22], [-1, 270, 18], [1, 300, 16], [-1, 322, 12]];
      stubs.forEach(([side, h, len], i) => {
        const y = gy - h;
        ts.push({ pal, tex, pts: spline([[gx, y], [gx + side * len * 0.5, y + 2], [gx + side * len, y + 5 + hash(i, 1, 5) * 4]]), r0: 3.2, r1: 1.2, point: 6, seed: 60 + i, lineFrom: 5, ember: 0.05, depth: 9 });
      });
    }
    return ts;
  };
  const render = (f: number, mode: 'idle' | 'burnt'): Canvas => {
    const L = new Ix(W, H);
    const n = 8;
    const sway = (y: number) => (mode === 'idle' ? swayAt(hfOf(y), f, n, 3.2) : 0);
    for (const t of trunk(mode === 'burnt')) drawTube(L, { ...t, pts: t.pts.map(([x, y]) => [x + sway(y), y] as Pt) });
    if (mode === 'burnt') {
      ashPile(L, gx, gy + 2, 36, 4, 8);
      stat('pine burnt', L);
      return toFrame(L);
    }
    const Fo = compositeFol(W, H, items, itemOffs(items, f, n), 7, 0.5);
    putFol(L, Fo, items, () => true);
    if (f === 0) stat('pine idle', L);
    return toFrame(L);
  };
  const idle = Array.from({ length: 8 }, (_, f) => render(f, 'idle'));
  const burnt = [render(0, 'burnt')];
  return finish('pine', 'Cedar Pine', [3, 9], ['cover-half', 'blocks-sight', 'flammable', 'destructible', 'climbable'], {
    gx,
    anims: { idle: { frames: idle, fps: 5 }, burnt: { frames: burnt, fps: 0 } },
  });
}

// --- red maple ----------------------------------------------------------------------------

function maple(): WorldSprite {
  const W = 360, H = 360, gx = 180, gy = 330;
  const TOP = gy - m(5);
  const hfOf = (y: number) => clamp((gy - 110 - y) / (gy - 110 - TOP), 0, 1);
  // Layered foliage pads: [dx, dy, rx, ry, layer].
  const defs: [number, number, number, number, number][] = [
    [-50, -228, 82, 44, 0],
    [64, -234, 74, 40, 0],
    [-104, -166, 56, 28, 0],
    [110, -174, 56, 28, 0],
    [-4, -178, 78, 34, 1],
    [-76, -122, 52, 24, 1],
    [88, -120, 54, 24, 1],
  ];
  const items = defs.map(([dx, dy, rx, ry, layer], i) => {
    const y = gy + dy;
    const hf = hfOf(y);
    const gl = clamp(-(dx / 130) * 0.5 - ((dy + 190) / 70) * 0.6, -1, 1);
    return lobeItem({
      x: gx + dx, y, rx, ry, seed: 500 + i * 23, bump: 0.16, K: 2.8, S: 16, flat: 0.6, dab: [3, 3],
      pal: P.maple, layer, bias: 0.05 * gl + (layer === 0 ? -0.04 : 0), amp: 1 + 2 * hf, phase: -1.1 * hf + (hash(i, 2, 2) - 0.5) * 0.6,
    });
  });
  const dim = (_x: number, y: number) => (y < gy - 150 ? 0.7 : 1);
  const skeleton = (burnt: boolean): Tube[] => {
    const pal = burnt ? P.charred : P.barkGrey, tex: Tex = burnt ? 'charred' : 'smooth';
    const base = { pal, tex, dim };
    const ts: Tube[] = [];
    const Fk: Pt = [gx + 2, gy - 92];
    ts.push({ ...base, pts: spline([[gx, gy + 3], [gx - 7, gy - 32], [gx + 6, gy - 64], Fk]), r0: 8, r1: 6, flare: 6, flareLen: 8, seed: 71, clipY: gy, depth: 9, ember: burnt ? 0.08 : 0 });
    ts.push({ ...base, pts: spline([[gx - 6, gy - 6], [gx - 16, gy - 1], [gx - 26, gy + 1]]), r0: 3.5, r1: 1.2, seed: 72, clipY: gy + 1, lineFrom: 99, depth: 9 });
    ts.push({ ...base, pts: spline([[gx + 6, gy - 5], [gx + 14, gy - 1], [gx + 22, gy + 1]]), r0: 3, r1: 1.1, seed: 73, clipY: gy + 1, lineFrom: 99, depth: 9 });
    const limbs: { pts: Pt[]; r0: number; r1: number; kids: [number, number][] }[] = [
      { pts: [Fk, [gx - 18, gy - 116], [gx - 30, gy - 148], [gx - 62, gy - 174], [gx - 88, gy - 188]], r0: 5, r1: 2.8, kids: [[-2.4, 20], [-1.9, 22]] },
      { pts: [Fk, [gx + 20, gy - 118], [gx + 22, gy - 158], [gx + 50, gy - 186], [gx + 72, gy - 210]], r0: 5, r1: 2.8, kids: [[-1.2, 22], [-0.6, 20]] },
      { pts: [Fk, [gx + 1, gy - 132], [gx - 8, gy - 178], [gx - 2, gy - 222]], r0: 4, r1: 2.4, kids: [[-1.9, 18], [-1.3, 18]] },
      { pts: [[gx + 4, gy - 76], [gx + 30, gy - 92], [gx + 62, gy - 106], [gx + 90, gy - 116]], r0: 3.2, r1: 1.8, kids: [[-0.6, 22]] },
      { pts: [[gx - 1, gy - 84], [gx - 26, gy - 100], [gx - 50, gy - 118]], r0: 3, r1: 1.8, kids: [[-2.4, 20]] },
    ];
    limbs.forEach((l, i) => {
      ts.push({ ...base, pts: spline(l.pts), r0: l.r0, r1: l.r1, seed: 80 + i, lineFrom: 12, depth: 9, ember: burnt ? 0.08 : 0, point: burnt && i === 2 ? 10 : 0 });
      const end = l.pts[l.pts.length - 1];
      l.kids.forEach(([ang, len], k) => {
        const out: Tube[] = [];
        grow(out, end, ang, len, l.r1 * 0.7, 1, 90 + i * 7 + k, base);
        for (const tb of out) {
          if (burnt) {
            tb.point = Math.min(6, tb.r0 * 3);
            tb.ember = 0.05;
          }
          ts.push(tb);
        }
      });
    });
    return ts;
  };
  const render = (f: number, mode: 'idle' | 'burnt'): Canvas => {
    const L = new Ix(W, H);
    const n = 8;
    const sway = (y: number) => (mode === 'idle' ? swayAt(hfOf(y), f, n, 3) * clamp((gy - 100 - y) / 30, 0, 1) : 0);
    const tubes = skeleton(mode === 'burnt').map((t) => ({ ...t, pts: t.pts.map(([x, y]) => [x + sway(y), y] as Pt) }));
    if (mode === 'burnt') {
      for (const t of tubes) drawTube(L, t);
      ashPile(L, gx, gy + 2, 30, 4, 11);
      stat('maple burnt', L);
      return toFrame(L);
    }
    const Fo = compositeFol(W, H, items, itemOffs(items, f, n), 9, 0.48);
    for (const t of tubes) if ((t.depth ?? 0) < 9) drawTube(L, t);
    putFol(L, Fo, items, (l) => l === 0);
    for (const t of tubes) if ((t.depth ?? 0) === 9) drawTube(L, t);
    putFol(L, Fo, items, (l) => l > 0);
    if (f === 0) stat('maple idle', L);
    return toFrame(L);
  };
  const idle = Array.from({ length: 8 }, (_, f) => render(f, 'idle'));
  const burnt = [render(0, 'burnt')];
  return finish('maple', 'Red Maple', [4.4, 5], ['cover-half', 'blocks-sight', 'flammable', 'destructible', 'climbable'], {
    gx,
    anims: { idle: { frames: idle, fps: 5 }, burnt: { frames: burnt, fps: 0 } },
  });
}

// --- bamboo grove -------------------------------------------------------------------------

interface Culm {
  bx: number;
  by: number;
  h: number;
  r: number;
  lean: number;
  curve: number;
  pal: number;
  seed: number;
  phase: number;
  amp: number;
  bias: number;
  /** Behind the others (darker leaves). */
  back: boolean;
}

function bamboo(): WorldSprite {
  const W = 260, H = 420, gx = 130, gy = 392;
  const culms: Culm[] = [
    { bx: -20, by: -9, h: 300, r: 3.2, lean: -0.05, curve: -0.05, pal: P.culmOld, seed: 1, phase: 0.6, amp: 3, bias: -0.08, back: true },
    { bx: 14, by: -10, h: 318, r: 3.4, lean: 0.03, curve: 0.04, pal: P.culm, seed: 2, phase: 2.1, amp: 3, bias: -0.08, back: true },
    { bx: 34, by: -6, h: 268, r: 3, lean: 0.07, curve: 0.08, pal: P.culm, seed: 3, phase: 1.2, amp: 3, bias: -0.05, back: true },
    { bx: -36, by: -4, h: 262, r: 3, lean: -0.09, curve: -0.08, pal: P.culm, seed: 4, phase: 2.8, amp: 3, bias: -0.04, back: true },
    { bx: -6, by: -2, h: 342, r: 3.8, lean: -0.01, curve: -0.02, pal: P.culm, seed: 5, phase: 0, amp: 4, bias: 0, back: false },
    { bx: 22, by: 0, h: 296, r: 3.6, lean: 0.04, curve: 0.05, pal: P.culmOld, seed: 6, phase: 1.7, amp: 3, bias: 0, back: false },
    { bx: -24, by: 1, h: 230, r: 3.3, lean: -0.06, curve: -0.05, pal: P.culm, seed: 7, phase: 3.6, amp: 2, bias: 0.02, back: false },
  ];
  const at = (c: Culm, t: number, f: number, n: number): Pt => {
    const sw = c.amp * t * t * Math.sin((TAU * f) / n + c.phase - t * 0.6);
    return [gx + c.bx + c.lean * t * c.h + c.curve * t * t * c.h + sw, gy + c.by - t * c.h];
  };
  const nodesOf = (c: Culm): number[] => {
    const out: number[] = [];
    let y = 0, k = 0;
    while (y < c.h - 14) {
      const len = lerp(13, 24, Math.min(1, k / 6)) * (0.92 + hash(k, 0, c.seed) * 0.16) * (k > 9 ? 0.85 : 1);
      y += len;
      if (y < c.h - 10) out.push(y);
      k++;
    }
    return out;
  };
  const drawCulm = (L: Ix, c: Culm, f: number, n: number) => {
    const nodes = nodesOf(c);
    const M = new Mask(0, 0, W, H);
    const info = new Map<number, [number, number]>();
    const rows = Math.ceil(c.h);
    for (let k = 0; k <= rows; k++) {
      const t = k / c.h;
      const [cx, cy] = at(c, t, f, n);
      const y = Math.round(cy);
      const nd = nodes.some((v) => Math.abs(v - k) < 0.5);
      const hw = c.r * (1 - 0.45 * t) + (nd ? 0.6 : 0);
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw - 1); x++) {
        const u = (x + 0.5 - cx) / hw;
        if (Math.abs(u) > 1) continue;
        M.add(x, y);
        info.set(y * W + x, [u, k]);
      }
    }
    stamp(
      L,
      M,
      (x, y) => {
        const [u, k] = info.get(y * W + x)!;
        const Lv = lambert(u, 0, Math.sqrt(Math.max(0, 1 - u * u))) + c.bias - (c.back ? 0.06 : 0);
        let s = Lv > 0.86 ? 4 : Lv > 0.62 ? 3 : Lv > 0.4 ? 2 : 1;
        // Nodes: a dark ring with a lit ridge just above it on the lit side.
        const dn = nodes.reduce((b, v) => (Math.abs(v - k) < Math.abs(b) ? v - k : b), 99);
        if (Math.abs(dn) < 0.5) s = Math.max(1, s - 2);
        else if (dn > -1.5 && dn < -0.5 && u < 0.3) s = Math.min(5, s + 1);
        else if (dn > 0.5 && dn < 2.5 && u < -0.2 && hash(Math.round(dn), 0, c.seed) < 0.9) s = Math.min(5, s + (dn < 1.5 ? 1 : 0));
        return [c.pal, clamp(s, 1, 5)];
      },
      { line: () => true, linePal: c.pal },
    );
    // A papery sheath on the lowest node of some culms: a tapered sleeve with a pointed top.
    const v = nodes[0];
    if (c.seed % 3 !== 0 && v < 40) {
      const len = 10 + hash(1, 2, c.seed) * 4;
      const SM = new Mask(0, 0, W, H);
      const sinfo = new Map<number, number>();
      for (let k = Math.round(v - 2); k <= v + len; k++) {
        const [cx, cy] = at(c, k / c.h, f, n);
        const tt = (k - v + 2) / (len + 2);
        const lo = cx - c.r - 0.6, hi = cx + c.r + 0.6 - tt * (c.r * 2 + 1.2);
        for (let x = Math.floor(lo); x <= Math.ceil(hi - 1); x++) {
          SM.add(x, Math.round(cy));
          sinfo.set(Math.round(cy) * W + x, (x + 0.5 - cx) / (c.r + 0.6));
        }
      }
      stamp(L, SM, (x, y) => {
        const u = sinfo.get(y * W + x) ?? 0;
        return [P.sheath, u < -0.6 ? 3 : u < 0.2 ? 2 : 1];
      }, { line: () => true, linePal: P.sheath });
    }
  };
  // Leaves: narrow lances hanging from the twigs. No lines between them: the lit upper edge and
  // the dark lower edge keep overlapping leaves apart.
  const leafInto = (L: Ix, x: number, y: number, ang: number, len: number, pal: number, bias: number) => {
    const R2 = Math.ceil(len) + 4;
    const M = new Mask(Math.floor(x - R2), Math.floor(y - R2), R2 * 2 + 1, R2 * 2 + 1);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const px = -uy, py = ux;
    const toLight = Math.sign(px * LX + py * LY || 1);
    const side = new Map<number, number>();
    const n2 = Math.ceil(len * 2);
    for (let k = 0; k <= n2; k++) {
      const t = k / n2;
      const w = 1.75 * Math.sin(Math.PI * Math.pow(t, 0.55)) + 0.15;
      const cx = x + ux * t * len, cy = y + uy * t * len + 0.22 * t * t * len * Math.abs(ux);
      for (let o = -w; o <= w + 1e-6; o += 0.5) {
        const qx = Math.round(cx + px * o - 0.5), qy = Math.round(cy + py * o - 0.5);
        const key = qy * 10000 + qx;
        const sv = (o / Math.max(0.6, w)) * toLight;
        if (!M.has(qx, qy) || Math.abs(sv) < Math.abs(side.get(key) ?? 9)) side.set(key, sv);
        M.add(qx, qy);
      }
    }
    const hang = clamp(uy, 0, 1) * 0.12;
    stamp(L, M, (qx, qy) => {
      const sv = side.get(qy * 10000 + qx) ?? 0;
      const Lv = 0.52 + 0.3 * sv + bias - hang;
      return [pal, Lv > 0.76 ? 5 : Lv > 0.6 ? 4 : Lv > 0.44 ? 3 : Lv > 0.3 ? 2 : 1];
    });
  };
  const render = (f: number): Canvas => {
    const L = new Ix(W, H);
    const n = 8;
    const order = culms.slice().sort((a, b) => Number(b.back) - Number(a.back) || a.by - b.by);
    for (const c of order) {
      drawCulm(L, c, f, n);
      const lb = c.back ? -0.1 : 0.02;
      // Twigs on the upper nodes, alternating sides, each carrying hanging leaves.
      const nodes = nodesOf(c).filter((v) => v > c.h * 0.42);
      nodes.forEach((v, k) => {
        const side = (k + c.seed) % 2 === 0 ? -1 : 1;
        const t = v / c.h;
        const [nx, ny] = at(c, t, f, n);
        const tl = 12 + hash(k, 8, c.seed) * 14 * (1 - t * 0.5);
        const ta = -Math.PI / 2 + side * (0.8 + hash(k, 9, c.seed) * 0.4);
        const dl = Math.round(Math.sin((TAU * f) / n + c.phase + 1.4 + k) * 1);
        const ex = nx + Math.cos(ta) * tl + dl, ey = ny + Math.sin(ta) * tl;
        const TM = new Mask(0, 0, W, H);
        const steps = Math.ceil(tl);
        for (let q = 0; q <= steps; q++) TM.add(Math.round(lerp(nx, ex, q / steps)), Math.round(lerp(ny, ey, q / steps)));
        stamp(L, TM, () => [c.pal, 2]);
        // Leaves along the twig and a fan at its end, hanging down and outward.
        const spots = [0.45, 0.75, 1];
        spots.forEach((sp, si) => {
          const lx = lerp(nx, ex, sp), ly = lerp(ny, ey, sp);
          const nl = si === 2 ? 3 : 2;
          for (let q = 0; q < nl; q++) {
            const hs = hash(q + si * 5, k, c.seed + 20);
            const out = side * (si === 2 ? 1 : q === 0 ? 1 : -1);
            const down = si === 2 ? -0.25 + q * 0.5 + hs * 0.25 : 0.35 + hs * 0.55;
            const la = out > 0 ? down : Math.PI - down;
            leafInto(L, lx, ly, la, 13 + hash(q, k + 3 + si, c.seed) * 7, P.bambooLeaf, lb);
          }
        });
      });
      // A tuft at the tip.
      const [tx, ty] = at(c, 1, f, n);
      for (let q = 0; q < 3; q++) leafInto(L, tx, ty + 3, q === 1 ? -1.25 : q === 0 ? Math.PI - 0.5 : 0.5, 12 + q * 2, P.bambooLeaf, lb);
    }
    // A young shoot (takenoko) wrapped in scale-like sheaths, and a few fallen leaves.
    const SM = new Mask(0, 0, W, H);
    const sx0 = gx + 46;
    for (let y = gy - 17; y <= gy; y++) {
      const k = (gy - y) / 17;
      const hw = 4.2 * Math.pow(1 - k, 0.8) + 0.4;
      for (let x = Math.floor(sx0 - hw); x <= sx0 + hw - 1; x++) SM.add(x, y);
    }
    stamp(L, SM, (x, y) => {
      const k = (gy - y) / 17;
      const hw = 4.2 * Math.pow(1 - k, 0.8) + 0.4;
      const u = (x + 0.5 - sx0) / hw;
      const scale = frac((gy - y + (u + 1) * 1.5) / 5);
      return [P.sheath, scale < 0.2 ? 1 : u < -0.35 ? 4 : u < 0.3 ? 3 : 2];
    }, { line: () => true, linePal: P.sheath });
    for (const [lx, ly, a] of [[-18, 0, 0.15], [12, 1, -0.2], [32, 0, 0.1]] as [number, number, number][]) leafInto(L, gx + lx, gy + ly, a, 8, P.sheath, -0.08);
    if (f === 0) stat('bamboo idle', L);
    return toFrame(L);
  };
  const idle = Array.from({ length: 8 }, (_, f) => render(f));
  return finish('bamboo', 'Bamboo Grove', [2.2, 6], ['cover-half', 'blocks-sight', 'hide-spot', 'flammable', 'destructible'], {
    gx,
    anims: { idle: { frames: idle, fps: 5 } },
  });
}

// --- stump --------------------------------------------------------------------------------

function stump(): WorldSprite {
  const W = 90, H = 80, gx = 45, gy = 66;
  // 0.75 m wide; the cut top is an ellipse about 2/3 as deep as wide above a 0.46 m front wall.
  const Rr = 21, ryT = 13, ryB = 12, hgt = m(0.46);
  const cyb = gy - ryB; // base ellipse center
  const cyt = cyb - hgt; // top ellipse center
  const L = new Ix(W, H);
  const roots: Tube[] = [
    { pal: P.bark, tex: 'streak', pts: spline([[gx - 14, cyb + 4], [gx - 24, cyb + 9], [gx - 32, cyb + 11]]), r0: 4.5, r1: 1.3, seed: 3, lineFrom: 99 },
    { pal: P.bark, tex: 'streak', pts: spline([[gx + 10, cyb + 8], [gx + 17, cyb + 12], [gx + 24, cyb + 13]]), r0: 4, r1: 1.2, seed: 4, lineFrom: 99 },
  ];
  // Wall: a bark cylinder.
  const wallM = new Mask(0, 0, W, H);
  const wInfo = new Map<number, [number, number]>();
  for (let x = gx - Rr; x <= gx + Rr; x++) {
    const u = clamp((x + 0.5 - gx) / Rr, -1, 1);
    const yt = cyt + ryT * Math.sqrt(1 - u * u);
    const yb = cyb + ryB * Math.sqrt(Math.max(0, 1 - u * u));
    for (let y = Math.floor(yt); y <= Math.ceil(yb); y++) {
      wallM.add(x, y);
      wInfo.set(y * W + x, [u, y - cyt]);
    }
  }
  // Moss on the shaded side, climbing from the base in mottled dabs.
  const mossAt = (x: number, y: number, u: number, s: number): number | null => {
    const reach = (0.5 + 0.5 * noise(x, 0, 5, 12)) * (hgt + ryB) * clamp((u - 0.15) * 1.9, 0, 1);
    const cell = dabCell(x + 0.5, y + 0.5, 3, 3, 13);
    return s > hgt + ryB - reach + (cell - 0.5) * 6 ? cell : null;
  };
  stamp(L, wallM, (x, y) => {
    const [u, s] = wInfo.get(y * W + x)!;
    const Lv = lambert(u, 0.1, Math.sqrt(Math.max(0, 1 - u * u))) - (s > hgt ? 0.1 : 0);
    const mc = mossAt(x, y, u, s);
    if (mc !== null) return [P.oak, clamp(folStep(Lv + 0.05, mc), 1, 4)];
    return barkStep({ pal: P.bark, tex: 'streak', pts: [], r0: Rr, r1: Rr, seed: 9 }, Lv, Math.asin(u) * Rr, s, Rr);
  });
  for (const r of roots) drawTube(L, r);
  // The cut face: growth rings, a crack, the pith, a lit sapwood rim and a bark lip.
  const top = new Mask(0, 0, W, H);
  for (let y = Math.floor(cyt - ryT) - 1; y <= cyt + ryT + 1; y++)
    for (let x = gx - Rr - 1; x <= gx + Rr + 1; x++) {
      const u = (x + 0.5 - gx) / Rr, v = (y + 0.5 - cyt) / ryT;
      if (u * u + v * v <= 1) top.add(x, y);
    }
  stamp(L, top, (x, y) => {
    const u = (x + 0.5 - gx) / Rr, v = (y + 0.5 - cyt) / ryT;
    const d = Math.sqrt(u * u + v * v);
    const lit = u + v;
    if (d > 0.88) return [P.bark, lit < -0.6 ? 5 : lit < 0.4 ? 3 : 2];
    if (d > 0.79) return [P.woodCut, lit < -0.3 ? 5 : lit < 0.5 ? 4 : 3];
    const dd = d + (noise(x, y, 3, 21) - 0.5) * 0.07;
    const ring = frac(dd * 5.5);
    let s = lit < -0.45 ? 4 : lit > 0.55 ? 2 : 3;
    if (ring < 0.17) s -= 1;
    const ang = Math.atan2(v, u);
    if (Math.abs(ang - 0.7) < 0.05 / Math.max(0.15, d) && d > 0.12) s = 1;
    if (d < 0.09) s = 1;
    return [P.woodCut, clamp(s, 1, 5)];
  });
  // A moss cushion creeping over the shaded back rim.
  const tuft = new Mask(0, 0, W, H);
  for (let y = Math.floor(cyt - ryT) - 4; y <= cyt; y++)
    for (let x = gx + 4; x <= gx + Rr + 2; x++) {
      const u = (x + 0.5 - gx - 14) / 9, v = (y + 0.5 - cyt + ryT * 0.7) / 4.6;
      const cell = dabCell(x + 0.5, y + 0.5, 3, 3, 33);
      if (u * u + v * v <= 1 - (cell < 0.25 ? 0.3 : 0)) tuft.add(x, y);
    }
  stamp(L, tuft, (x, y) => {
    const u = (x + 0.5 - gx - 14) / 9, v = (y + 0.5 - cyt + ryT * 0.7) / 4.6;
    return [P.oak, folStep(0.62 - (u + v) * 0.22, dabCell(x + 0.5, y + 0.5, 3, 3, 33))];
  });
  stat('stump', L);
  const frame = toFrame(L);
  return finish('stump', 'Tree Stump', [0.75, 0.5], ['cover-half', 'climbable'], { gx, anims: { idle: { frames: [frame], fps: 0 } } });
}

// --- group --------------------------------------------------------------------------------

const sprites: WorldSprite[] = [oak(), pine(), maple(), bamboo(), stump()];
writeGroup('trees', sprites);
const dir = previewDir();
preview(sprites, join(dir, 'trees.png'), { scale: 1 });
for (const s of sprites) {
  const f0 = Object.values(s.anims)[0].frames[0];
  const bb = f0.bounds()!;
  const anims = Object.entries(s.anims).map(([k, a]) => `${k} ${a.frames.length}f@${a.fps}`).join(', ');
  console.log(`${s.name}: frame ${f0.w}x${f0.h}, anchor ${s.anchor}, opaque ${bb[2] - bb[0] + 1}x${bb[3] - bb[1] + 1}px (${((bb[3] - bb[1] + 1) / 57).toFixed(2)} m tall, target ${s.meters[1]} m), ${anims}`);
  for (const [k, a] of Object.entries(s.anims)) {
    const strip = new Canvas(a.frames.reduce((t, f) => t + f.w + 2, 0), a.frames[0].h);
    a.frames.forEach((f, i) => strip.draw(f, i * (f.w + 2), 0));
    strip.save(join(dir, `trees-${s.name}-${k}.png`));
  }
}
console.log(STATS.join('\n'));
