// Trees for the battle maps: broadleaf oak, cedar pine, red maple, bamboo grove and a stump.
// They are the largest world sprites (real height, 1 m = 57 px), act as cover, block sight,
// burn and can be climbed.
//
//   npx tsx tools/world-sprites/trees.ts [previewDir]
//
// Every tree is drawn from geometry (leaf clumps, bark tubes, needle tiers, culms) into an
// indexed buffer (palette + ramp step per pixel) and only turned into colors at the end, so
// overlaps can darken by whole ramp steps, inner lines use the ramp's outline step and every
// frame is re-rasterized crisply instead of being shifted or resampled.
//
// Foliage: a clump is a jittered grid of leaf bunches (small lobed rosettes). Bunches are drawn
// top to bottom, so each lower bunch shows a lit cap with a leafy edge over a dark seam on the
// bunch behind it; the clump as a whole is lit like an ellipsoid from the upper left. Clumps are
// cached as small rasters and stamped per frame at whole-pixel offsets (the sway), with a dark
// inner line and a short cast shadow on whatever they cover.

import { join } from 'node:path';
import { Canvas, Color, MATERIALS, WorldSprite, hash, hex, lambert, m, mix, noise, preview, previewDir, ramp, toHex, writeGroup } from './kit';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const frac = (v: number): number => v - Math.floor(v);
type Pt = [number, number];

// --- palettes -----------------------------------------------------------------------------

const PALS: Color[][] = [];
function addPal(r: Color[]): number {
  PALS.push(r);
  return PALS.length - 1;
}
const mixHex = (a: string, b: string, t: number): string => toHex(mix(hex(a), hex(b), t));

const R = {
  leaf: ramp(MATERIALS.leaf),
  leafDeep: ramp(MATERIALS.leafDeep),
  leafLight: ramp(MATERIALS.leafLight),
  fire: ramp(MATERIALS.fire),
};

/** Flames: dark ember red, red tips, orange body, amber, pale yellow core (kit fire colors). */
const FIRE_RAMP: Color[] = [R.fire[0], mix(R.fire[1], hex('#ef4444'), 0.3), hex('#ef4444'), hex(MATERIALS.fire), R.fire[4], hex('#fde68a')];

const P = {
  /** Front foliage: the leaf ramp with young leafLight tips (same as the plants group). */
  leaf: addPal([R.leaf[0], R.leaf[1], R.leaf[2], R.leaf[3], R.leaf[4], R.leafLight[4]]),
  /** Back foliage: the deeper ramp, so the canopy reads in depth. */
  leafBack: addPal([R.leafDeep[0], R.leafDeep[1], R.leafDeep[2], R.leafDeep[3], R.leaf[3], R.leaf[4]]),
  /** Cedar needles: cool and deep. */
  needle: addPal(ramp(mixHex(MATERIALS.leafDeep, '#2f5a4a', 0.25), { shift: 10 })),
  bark: addPal(ramp(MATERIALS.bark)),
  barkGrey: addPal(ramp(mixHex(MATERIALS.bark, MATERIALS.stone, 0.32))),
  cedar: addPal(ramp(MATERIALS.barkCedar)),
  charred: addPal(ramp(MATERIALS.charred, { spread: 0.62 })),
  moss: addPal(ramp(MATERIALS.moss)),
  woodCut: addPal(ramp(mixHex(MATERIALS.wood, MATERIALS.stoneWarm, 0.3), { shift: 10 })),
  maple: addPal(ramp(mixHex(MATERIALS.red, MATERIALS.fire, 0.3), { shift: 16 })),
  mapleBack: addPal(ramp(mixHex(MATERIALS.red, MATERIALS.charred, 0.22), { shift: 14 })),
  scorch: addPal(ramp(mixHex(MATERIALS.leaf, MATERIALS.wood, 0.6))),
  fire: addPal(FIRE_RAMP),
  ash: addPal(ramp(MATERIALS.stone, { spread: 0.8 })),
  sheath: addPal(ramp(MATERIALS.canvas)),
  sheathDark: addPal(ramp(mixHex(MATERIALS.canvas, MATERIALS.woodDark, 0.55))),
  culm: addPal(ramp(mixHex(MATERIALS.leafLight, MATERIALS.leaf, 0.3), { shift: 10 })),
  culmOld: addPal(ramp(mixHex(MATERIALS.leafLight, MATERIALS.canvas, 0.3), { shift: 10 })),
};

// --- indexed drawing buffer ---------------------------------------------------------------

/** Palette id + ramp step per pixel (-1 = empty). */
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
  /** Moves a pixel `d` ramp steps (never touches outline-step pixels). */
  shade(x: number, y: number, d: number, lo = 1, hi = 5): void {
    if (!this.has(x, y)) return;
    const i = y * this.w + x;
    if (this.s[i] === 0 || this.p[i] === P.fire) return;
    this.s[i] = clamp(this.s[i] + d, lo, hi);
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
  /** Share of filled pixels per ramp step (value-budget check), fire excluded. */
  histogram(): number[] {
    const h = [0, 0, 0, 0, 0, 0];
    let n = 0;
    for (let i = 0; i < this.w * this.h; i++)
      if (this.p[i] >= 0 && this.p[i] !== P.fire) {
        h[this.s[i]]++;
        n++;
      }
    return h.map((v) => Math.round((v / Math.max(1, n)) * 100));
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
  /** Casts a one-step shadow on existing pixels, offset down-right by this much. */
  shadow?: Pt;
}
/** Paints a shape over the buffer: cast shadow and inner line first, then the shape itself. */
function stamp(L: Ix, M: Mask, paint: (x: number, y: number) => [number, number] | null, o: StampOpts = {}): void {
  if (o.shadow) {
    const [sx, sy] = o.shadow;
    const n = Math.max(Math.abs(sx), Math.abs(sy));
    const hit = new Set<number>();
    M.each((x, y) => {
      for (let k = 1; k <= n; k++) {
        const qx = x + Math.round((sx * k) / n), qy = y + Math.round((sy * k) / n);
        if (!M.has(qx, qy) && L.has(qx, qy)) hit.add(qy * L.w + qx);
      }
    });
    for (const k of hit) L.shade(k % L.w, Math.floor(k / L.w), -1);
  }
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

/** Light value to ramp step 1..5 through thresholds, edges broken into small clusters. */
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

// --- small rasters (cached clumps, tiers) -------------------------------------------------

/** A cached piece of art in local coordinates: palette + step per pixel (-1 = empty). */
class Art {
  readonly pal: Int16Array;
  readonly st: Int8Array;
  constructor(readonly x0: number, readonly y0: number, readonly w: number, readonly h: number) {
    this.pal = new Int16Array(w * h).fill(-1);
    this.st = new Int8Array(w * h);
  }
  has(x: number, y: number): boolean {
    const i = x - this.x0, j = y - this.y0;
    return i >= 0 && j >= 0 && i < this.w && j < this.h && this.pal[j * this.w + i] >= 0;
  }
  set(x: number, y: number, pal: number, st: number): void {
    const i = x - this.x0, j = y - this.y0;
    if (i >= 0 && j >= 0 && i < this.w && j < this.h) {
      this.pal[j * this.w + i] = pal;
      this.st[j * this.w + i] = st;
    }
  }
}

/** Stamps cached art at (ox, oy): cast shadow and inner line on what it covers, then the art. */
function stampArt(L: Ix, a: Art, ox: number, oy: number, linePal: number, shadow: Pt | null = [2, 3]): void {
  const M = new Mask(a.x0 + ox, a.y0 + oy, a.w, a.h);
  for (let j = 0; j < a.h; j++) for (let i = 0; i < a.w; i++) if (a.pal[j * a.w + i] >= 0) M.add(i + M.x0, j + M.y0);
  stamp(
    L,
    M,
    (x, y) => {
      const k = (y - M.y0) * a.w + (x - M.x0);
      return [a.pal[k], a.st[k]];
    },
    { line: () => true, linePal, shadow: shadow ?? undefined },
  );
}

// --- leaf clumps --------------------------------------------------------------------------

interface Clump {
  x: number;
  y: number;
  rx: number;
  ry: number;
  pal: number;
  seed: number;
  /** Leaf bunch radius. */
  bunch: number;
  /** Light offset (canopy position, layer). */
  bias: number;
  layer: number;
  /** Sway amplitude (px) and phase. */
  amp: number;
  phase: number;
  /** Lobes per bunch and how pointed they are (0 round scallops .. 1 star points). */
  lobes?: number;
  sharp?: number;
  /** Irregularity of the clump outline. */
  wobble?: number;
  /** Burning: 0 green, 1 scorched, 2 charred with glowing edges. */
  char?: number;
  /** Pad: flat lit top (maple). */
  pad?: boolean;
}

interface Bunch {
  x: number;
  y: number;
  r: number;
  k: number;
  ph: number;
}

const TH_LEAF = [0.36, 0.52, 0.7, 0.88];

/** 2D direction toward the light on screen (upper left). */
const LX = -0.62, LY = -0.79;

/** Is (dx, dy) inside a leaf of half-length `len` and half-width `wid` along angle `a`? Returns the side (-1..1) or null. */
function leafHit(dx: number, dy: number, a: number, len: number, wid: number, star: boolean): number | null {
  if (star) {
    // Palmate maple leaf: five pointed lobes.
    const d = Math.hypot(dx, dy);
    const w = frac((5 * (Math.atan2(dy, dx) - a)) / TAU + 0.5);
    const tri = 1 - Math.abs(w * 2 - 1);
    if (d > len * (0.5 + 0.5 * Math.pow(tri, 1.6))) return null;
    return clamp((dx * -LY + dy * LX) / len, -1, 1) * 0 + clamp(-(dx * LX + dy * LY) / len, -1, 1);
  }
  const ca = Math.cos(a), sa = Math.sin(a);
  const al = dx * ca + dy * sa, pe = -dx * sa + dy * ca;
  if (Math.abs(al) / len + (pe / wid) ** 2 > 1) return null;
  // Side of the midrib facing the light is +.
  const facing = -(-sa * LX + ca * LY);
  return clamp((pe / wid) * Math.sign(facing || 1), -1, 1);
}

function clumpArt(c: Clump): Art {
  const B = c.bunch;
  const sx = B * 1.25, sy = B * 1.0;
  const wob = c.wobble ?? 0.1;
  const star = !!c.sharp;
  const radial = (th: number): number => 1 + wob * (noise(Math.cos(th) * 2 + 5, Math.sin(th) * 2 + 5, 1.1, c.seed + 3) - 0.5) * 2;
  const bunches: Bunch[] = [];
  const nj = Math.ceil(c.ry / sy) + 1, ni = Math.ceil(c.rx / sx) + 1;
  for (let j = -nj; j <= nj; j++)
    for (let i = -ni; i <= ni; i++) {
      const bx = (i + (j & 1 ? 0.5 : 0)) * sx + (hash(i, j, c.seed) - 0.5) * B * 0.7;
      const by = j * sy + (hash(i, j, c.seed + 1) - 0.5) * B * 0.6;
      const rad = radial(Math.atan2(by / c.ry, bx / c.rx));
      const ex = Math.max(1, c.rx * rad - B * 0.7), ey = Math.max(1, c.ry * rad - B * 0.7);
      let e = (bx / ex) ** 2 + (by / ey) ** 2;
      if (c.pad && by > 0) e = (bx / ex) ** 2 + (by / (ey * 0.75)) ** 2;
      if (e > 1) continue;
      bunches.push({ x: bx, y: by, r: B * (0.8 + 0.45 * hash(i, j, c.seed + 2)), k: 0, ph: 0 });
    }
  bunches.sort((a, b) => a.y + a.x * 0.15 - (b.y + b.x * 0.15));
  const pad = Math.ceil(B * 1.6) + 4;
  const x0 = Math.floor(-c.rx - pad), y0 = Math.floor(-c.ry - pad);
  const W = Math.ceil(c.rx * 2 + pad * 2), H = Math.ceil(c.ry * 2 + pad * 2);
  const art = new Art(x0, y0, W, H);
  const lightAt = (lx: number, ly: number): number => {
    const u = lx / c.rx, v = ly / c.ry;
    const r2 = Math.min(0.94, u * u + v * v);
    let Lc = lambert(u, v, Math.sqrt(1 - r2));
    if (c.pad) Lc = ly < -c.ry * 0.15 ? Math.max(Lc, 0.66 - u * 0.22) : ly < c.ry * 0.3 ? Lc : Lc * 0.75;
    return Lc;
  };
  const put = (x: number, y: number, Lv: number, side: number, rim: boolean) => {
    let s = quant(Lv, x, y, c.seed, TH_LEAF, 0.035, 3);
    if (side < -0.25 && s >= 3) s -= 1;
    if (s === 5 && !rim) s = 4;
    if (c.char === 2) {
      if (rim && Lv > 0.5) return art.set(x, y, P.fire, Lv > 0.7 ? 4 : 3);
      return art.set(x, y, P.charred, clamp(s - 1, 1, 3));
    }
    art.set(x, y, c.char === 1 ? P.scorch : c.pal, clamp(s, 1, 5));
  };
  // Deep interior: whatever shows between the leaves is one step darker.
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const lx = i + x0 + 0.5, ly = j + y0 + 0.5;
      const rad = radial(Math.atan2(ly / c.ry, lx / c.rx));
      if ((lx / (c.rx * rad * 0.84)) ** 2 + (ly / (c.ry * rad * (c.pad && ly > 0 ? 0.62 : 0.84))) ** 2 > 1) continue;
      put(i + x0, j + y0, lightAt(lx, ly) + c.bias - 0.2, 0, false);
    }
  // Leaves, bunch by bunch, each leaf one ramp step (its shaded half one lower).
  const len = star ? B * 0.62 : B * 0.56, wid = B * 0.24;
  bunches.forEach((b, bi) => {
    const nL = Math.round(((b.r * b.r) / (len * wid * 1.6)) * 1.5);
    const leaves: { x: number; y: number; a: number; l: number }[] = [];
    for (let k = 0; k < nL; k++) {
      const rr = b.r * Math.sqrt(hash(bi, k, c.seed + 11)) * 0.85;
      const th = hash(bi, k, c.seed + 12) * TAU;
      const x = b.x + Math.cos(th) * rr, y = b.y + Math.sin(th) * rr;
      // Leaves fan out from the bunch center and droop a little.
      const out = Math.atan2(y - b.y + 0.01, x - b.x);
      const a = out + (hash(bi, k, c.seed + 13) - 0.5) * 1.2;
      leaves.push({ x, y, a: Math.atan2(Math.sin(a) + 0.35, Math.cos(a)), l: len * (0.8 + 0.4 * hash(bi, k, c.seed + 14)) });
    }
    leaves.sort((p, q) => p.y - q.y);
    for (const lf of leaves) {
      const du = (lf.x - b.x) / b.r, dv = (lf.y - b.y) / b.r, d2 = Math.min(0.94, du * du + dv * dv);
      const Lb = lambert(du, dv, Math.sqrt(1 - d2));
      const Lv = 0.6 * lightAt(lf.x, lf.y) + 0.4 * Lb + c.bias + (hash(Math.round(lf.x), Math.round(lf.y), c.seed + 15) - 0.5) * 0.06;
      const ex = (lf.x / c.rx) ** 2 + (lf.y / c.ry) ** 2;
      const rim = ex > 0.55 && lf.x / c.rx + lf.y / c.ry < -0.5;
      const R2 = Math.ceil(lf.l) + 1;
      for (let y = Math.floor(lf.y - R2); y <= lf.y + R2; y++)
        for (let x = Math.floor(lf.x - R2); x <= lf.x + R2; x++) {
          const side = leafHit(x + 0.5 - lf.x, y + 0.5 - lf.y, lf.a, lf.l, wid, star);
          if (side === null) continue;
          put(x, y, Lv, side, rim);
        }
    }
  });
  return art;
}

const ART_CACHE = new Map<Clump, Map<number, Art>>();
function getClumpArt(c: Clump): Art {
  let m2 = ART_CACHE.get(c);
  if (!m2) ART_CACHE.set(c, (m2 = new Map()));
  const k = c.char ?? 0;
  let a = m2.get(k);
  if (!a) m2.set(k, (a = clumpArt(c)));
  return a;
}

function drawClump(L: Ix, c: Clump, ox: number, oy: number, shadow = true): void {
  const a = getClumpArt(c);
  const linePal = c.char === 2 ? P.charred : c.char === 1 ? P.scorch : c.pal;
  stampArt(L, a, Math.round(c.x) + ox, Math.round(c.y) + oy, linePal, shadow ? [2, 3] : null);
}

// --- bark tubes (trunks, limbs, branches, roots) ------------------------------------------

type Tex = 'oak' | 'cedar' | 'smooth' | 'charred';
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
  depth?: number;
}

const TH_BARK = [0.3, 0.46, 0.64, 0.84];

function barkStep(t: Tube, Lv: number, a: number, s: number, r: number): [number, number] {
  let st = quant(Lv, Math.round(a * 1.5), Math.round(s), t.seed, TH_BARK, 0.05, 2);
  switch (t.tex) {
    case 'oak': {
      if (r < 3.2) break;
      // Ridged bark: wavering vertical furrows, ridges broken into long plates.
      const per = 5.5;
      const ap = a + (noise(0, s * 0.07, 1, t.seed + 3) - 0.5) * 5 + (noise(3, s * 0.3, 1, t.seed + 4) - 0.5) * 1.4;
      const fi = Math.floor(ap / per), fr = ap / per - fi;
      const plen = 10 + hash(fi, 1, t.seed) * 10;
      const ps = frac((s + hash(fi, 0, t.seed) * 20) / plen) * plen;
      if (fr < 0.2) st = Math.max(1, st - 2);
      else if (ps < 1.1) st = Math.max(1, st - 1);
      else if (fr < 0.4 && Lv > 0.42) st += 1;
      break;
    }
    case 'cedar': {
      if (r < 2.5) break;
      // Fibrous strips: long thin grooves twisting slowly, a few lit peeling strands.
      const per = 3.4;
      const ap = a + s * 0.07 + (noise(0, s * 0.05, 1, t.seed + 3) - 0.5) * 3;
      const fi = Math.floor(ap / per), fr = ap / per - fi;
      const strand = hash(fi, Math.floor((s + hash(fi, 3, t.seed) * 30) / 26), t.seed);
      if (fr < 0.28) st = Math.max(1, st - 1 - (strand < 0.3 ? 1 : 0));
      else if (strand > 0.72 && fr > 0.4 && fr < 0.75 && Lv > 0.4) st += 1;
      break;
    }
    case 'smooth': {
      if (r < 2.5) break;
      const n = noise(a * 0.5, s * 0.06, 1, t.seed);
      if (n > 0.74 && Lv > 0.44) st += 1;
      else if (n < 0.2) st -= 1;
      // Short horizontal lenticels.
      if (hash(Math.floor(a / 3), Math.floor(s / 2), t.seed + 5) < 0.05 && Lv > 0.3) st = Math.max(1, st - 1);
      break;
    }
    case 'charred': {
      const w = worley(a * 1.2, s * 0.55, 4, t.seed);
      if (w.f < 0.7) {
        if (t.ember && hash(Math.floor((a * 1.2) / 4 + w.dx), Math.floor((s * 0.55) / 4), t.seed + 2) < t.ember && Lv < 0.7)
          return [P.fire, hash(Math.round(a), Math.round(s), t.seed) < 0.35 ? 4 : 2];
        st = 1;
      } else if (w.dx + w.dy < -0.8 && Lv > 0.4) st += 1;
      return [P.charred, clamp(st, 1, 4)];
    }
  }
  return [t.pal, clamp(st, 1, 5)];
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

/** One flame: a few wavy tongues with a hot core, red tips and wisps that break off and rise. */
function flameInto(F: Ix, f: Flame, t: number): void {
  const put = (x: number, y: number, s: number) => {
    if (F.step(x, y) < s) F.put(x, y, P.fire, s);
  };
  const n = f.n ?? 3;
  const mid = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const ox = n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.7;
    const hk = i === mid ? 1 : 0.5 + 0.3 * hash(i, 0, f.seed);
    const q = t + f.ph + hash(i, 1, f.seed);
    const hh = f.h * hk * (0.8 + 0.12 * Math.sin(TAU * q) + 0.08 * Math.sin(TAU * 2 * q + 1.3));
    const bx = f.x + ox * f.w;
    const ww = f.w * (i === mid ? 0.72 : 0.48);
    for (let k = 0; k <= hh; k++) {
      const tt = k / hh;
      const prof = Math.pow(1 - tt, 0.85) * Math.min(1, 0.55 + tt * 3.2);
      const hw = (ww / 2) * prof;
      const cx = bx + Math.sin(TAU * q - tt * 3.6 + f.seed) * ww * 0.3 * tt + (f.lean ?? 0) * tt * tt;
      const y = Math.round(f.y - k);
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const e = Math.abs(x + 0.5 - cx) / Math.max(0.5, hw);
        if (e > 1) continue;
        const s = tt > 0.76 || e > 0.76 ? 2 : e < 0.34 && tt < 0.36 ? 5 : e < 0.58 && tt < 0.6 ? 4 : 3;
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
    const s = q < 0.3 ? 5 : q < 0.65 ? 4 : 2;
    C.set(x, y, FIRE_RAMP[s]);
    if (q < 0.5 && hash(k, 2, seed) < 0.6) C.set(x, y + 1, FIRE_RAMP[Math.max(2, s - 1)]);
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

// --- frames, cropping ---------------------------------------------------------------------

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
  const c = L.toCanvas();
  c.outline();
  if (fire) overlayFire(c, fire);
  return c;
}

const STATS: string[] = [];
function stat(name: string, L: Ix): void {
  STATS.push(`${name}: steps% ${L.histogram().join(' / ')}`);
}

/** Horizontal sway of a point at height `hf` (0 base .. 1 top) in frame f of n. */
function swayAt(hf: number, f: number, n: number, amp: number, lag = 1.1): number {
  if (hf <= 0) return 0;
  return Math.round(amp * hf * Math.sin((TAU * f) / n - lag * hf));
}

// --- oak ----------------------------------------------------------------------------------

function oak(): WorldSprite {
  const W = 520, H = 600, gx = 260, gy = 560;
  // Canopy: about 5.5 m wide (314 px), from about 2.6 m to 7.5 m.
  const CX = gx + 2, CY = gy - 292, RX = 150, RY = 132;
  const hfOf = (y: number) => clamp((gy - 150 - y) / 280, 0, 1);
  const clumps: Clump[] = [];
  let ci = 0;
  const add = (dx: number, dy: number, rx: number, ry: number, layer: number) => {
    const x = CX + dx, y = CY + dy;
    const gl = clamp(-(dx / RX) * 0.55 - (dy / RY) * 0.75, -1, 1);
    const under = dy > 60 ? -0.05 : 0;
    const bias = 0.07 * gl + [-0.1, -0.035, 0.02][layer] + under;
    const hf = hfOf(y);
    const i = ci++;
    clumps.push({
      x, y, rx, ry, pal: layer === 0 ? P.leafBack : P.leaf, bias, seed: 100 + i * 17, bunch: 6.2 + hash(i, 4, 9) * 1.2, layer,
      amp: 1 + 2 * hf, phase: -1.1 * hf + (hash(i, 9, 3) - 0.5) * 0.5, lobes: 4, wobble: 0.14,
    });
  };
  // Leaf masses: [dx, dy, size x, size y, layer]. Each mass is a few clumps; dark gaps between
  // masses let a few limbs show.
  const masses: [number, number, number, number, number][] = [
    [-48, -86, 66, 46, 0],
    [46, -92, 64, 42, 0],
    [0, -108, 46, 26, 0],
    [-104, -26, 46, 50, 0],
    [108, -18, 44, 54, 0],
    [-8, -30, 70, 50, 0],
    [-92, 52, 52, 40, 1],
    [94, 54, 54, 40, 1],
    [-46, -2, 54, 44, 1],
    [44, -24, 56, 46, 1],
    [-18, -74, 46, 34, 1],
    [72, -70, 40, 32, 1],
    [-6, 70, 48, 34, 2],
    [-62, 92, 36, 26, 2],
    [58, 100, 34, 24, 2],
    [-118, 74, 30, 24, 2],
  ];
  masses.forEach(([mx, my, sx, sy, layer], mi) => {
    const parts: [number, number, number, number][] = [[0, 0.06, 0.74, 0.74]];
    const nSat = 3 + Math.floor(hash(mi, 0, 5) * 2);
    for (let k = 0; k < nSat; k++) {
      const a = ((k + hash(mi, k, 6) * 0.6) / nSat) * TAU + mi;
      const s = 0.42 + hash(mi, k, 7) * 0.16;
      parts.push([Math.cos(a) * (1 - s) * 0.95, Math.sin(a) * (1 - s) * 0.9, s, s * (0.86 + hash(mi, k, 8) * 0.14)]);
    }
    parts.sort((a, b) => a[1] - b[1]);
    for (const [px, py, s, sy2] of parts) add(mx + px * sx, my + py * sy, sx * s, sy * sy2, layer);
  });
  clumps.sort((a, b) => a.layer - b.layer);

  const F: Pt = [gx - 1, gy - 138];
  const underCanopy = (_x: number, y: number) => (y < gy - 170 ? 0.62 : y < gy - 140 ? 0.8 : 1);
  const bark = (tex: Tex, pal: number): Partial<Tube> & { pal: number; tex: Tex } => ({ pal, tex, dim: underCanopy });

  const skeleton = (burnt: boolean): Tube[] => {
    const pal = burnt ? P.charred : P.bark, tex: Tex = burnt ? 'charred' : 'oak';
    const ts: Tube[] = [];
    ts.push({ ...bark(tex, pal), pts: spline([[gx, gy + 4], [gx - 1, gy - 50], [gx + 2, gy - 100], F]), r0: 17, r1: 13, flare: 10, flareLen: 11, seed: 11, clipY: gy, ember: burnt ? 0.08 : 0, depth: 9 });
    // Surface roots.
    ts.push({ ...bark(tex, pal), pts: spline([[gx - 14, gy - 12], [gx - 31, gy - 3], [gx - 46, gy]]), r0: 6.5, r1: 1.6, seed: 21, clipY: gy, lineFrom: 99, depth: 9 });
    ts.push({ ...bark(tex, pal), pts: spline([[gx + 13, gy - 11], [gx + 27, gy - 3], [gx + 41, gy]]), r0: 6, r1: 1.6, seed: 22, clipY: gy, lineFrom: 99, depth: 9 });
    ts.push({ ...bark(tex, pal), pts: spline([[gx - 5, gy - 4], [gx - 13, gy], [gx - 22, gy + 2]]), r0: 3.5, r1: 1.2, seed: 23, clipY: gy + 2, lineFrom: 99, depth: 9 });
    ts.push({ ...bark(tex, pal), pts: spline([[gx + 6, gy - 3], [gx + 11, gy + 1], [gx + 17, gy + 3]]), r0: 3, r1: 1.1, seed: 24, clipY: gy + 3, lineFrom: 99, depth: 9 });
    // Limbs forking into the canopy.
    const limbs: { pts: Pt[]; r0: number; r1: number; kids: [number, number][] }[] = [
      { pts: [F, [gx - 26, gy - 170], [gx - 62, gy - 200], [gx - 96, gy - 236]], r0: 10, r1: 6, kids: [[-2.5, 40], [-1.7, 44]] },
      { pts: [F, [gx + 6, gy - 186], [gx + 2, gy - 236], [gx - 12, gy - 300]], r0: 11, r1: 6.5, kids: [[-2.0, 46], [-1.2, 48]] },
      { pts: [F, [gx + 30, gy - 168], [gx + 66, gy - 194], [gx + 100, gy - 226]], r0: 9, r1: 5.5, kids: [[-1.1, 44], [-0.45, 40]] },
    ];
    limbs.forEach((l, i) => {
      const pts = burnt && i === 1 ? l.pts.slice(0, 3) : l.pts;
      ts.push({ ...bark(tex, pal), pts: spline(pts), r0: l.r0, r1: l.r1, seed: 31 + i, lineFrom: 22, ember: burnt ? 0.1 : 0, point: burnt && i === 1 ? 14 : 0, depth: 9 });
      const end = pts[pts.length - 1];
      l.kids.forEach(([ang, len], k) => {
        const out: Tube[] = [];
        grow(out, end, ang, burnt ? len * 0.85 : len, l.r1 * 0.75, burnt ? 1 : 2, 50 + i * 10 + k, bark(tex, pal));
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
    // A low branch on the left carrying its own small clump.
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
    const dx = (c: Clump) => (mode === 'idle' ? Math.round(c.amp * Math.sin((TAU * f) / n + c.phase)) : 0);
    const cl = clumps.map((c, i) => (mode === 'burning' ? Object.assign(c, { char: burnChar(c, i) }) : Object.assign(c, { char: 0 })));
    for (const c of cl) if (c.layer === 0) drawClump(L, c, dx(c), 0);
    for (const t of moved) drawTube(L, t);
    for (const c of cl) if (c.layer > 0) drawClump(L, c, dx(c), 0);
    if (mode === 'idle') {
      if (f === 0) stat('oak idle', L);
      return toFrame(L);
    }
    // Burning: flames from the charred crown, the fork and a wound on the trunk.
    const fire = new Ix(W, H);
    const t = f / n;
    const tops: [number, number, number, number][] = [
      [-96, -60, 34, 70], [-50, -118, 40, 92], [-6, -126, 36, 84], [40, -118, 42, 96], [92, -76, 34, 72], [128, -26, 26, 50],
      [-128, -12, 24, 44], [-30, -64, 30, 54], [56, -50, 30, 50],
    ];
    tops.forEach(([fx, fy, fw, fh], i) => flameInto(fire, { x: CX + fx, y: CY + fy + 14, w: fw, h: fh, ph: hash(i, 3, 5), seed: i, n: 3, lean: 6 }, t));
    flameInto(fire, { x: gx - 4, y: gy - 136, w: 16, h: 34, ph: 0.1, seed: 6, n: 2, lean: 3 }, t);
    flameInto(fire, { x: gx + 9, y: gy - 66, w: 9, h: 20, ph: 0.6, seed: 4, n: 1, lean: 2 }, t);
    if (f === 0) stat('oak burning', L);
    const c = toFrame(L, fire);
    sparksOnto(c, CX + 10, CY - 150, 240, 90, 26, t, 9);
    return c;
  };
  const burnChar = (c: Clump, i: number): number => {
    if (c.y > CY + 55 && hash(i, 2, 41) < 0.8) return 0;
    if (c.y < CY - 30 || hash(i, 1, 41) < 0.3) return 2;
    return 1;
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

const TH_NEEDLE = [0.34, 0.5, 0.68, 0.86];

function tierArt(t: Tier): Art {
  const hw = Math.max(t.hwL, t.hwR);
  const x0 = -Math.ceil(hw) - 4, y0 = -Math.ceil(t.top) - 6;
  const art = new Art(x0, y0, Math.ceil(hw) * 2 + 9, Math.ceil(t.skirt + Math.max(t.droopL, t.droopR) + t.top) + 20);
  // Hanging sprays along each wing: [t0, t1] spans, each a lobe with its own light.
  const sprays: { side: number; t0: number; t1: number; drop: number }[] = [];
  for (const side of [-1, 1]) {
    const w = side < 0 ? t.hwL : t.hwR;
    const nS = Math.max(2, Math.round(w / 13));
    let acc = 0;
    const cuts = [0];
    for (let k = 0; k < nS; k++) cuts.push((acc += 0.7 + hash(k, side, t.seed) * 0.6));
    for (let k = 0; k < nS; k++) sprays.push({ side, t0: cuts[k] / acc, t1: cuts[k + 1] / acc, drop: 3 + hash(k, side + 5, t.seed) * 6 });
  }
  for (let y = art.y0; y < art.y0 + art.h; y++)
    for (let x = art.x0; x < art.x0 + art.w; x++) {
      const side = x + 0.5 < 0 ? -1 : 1;
      const w = side < 0 ? t.hwL : t.hwR, droop = side < 0 ? t.droopL : t.droopR;
      const tn = Math.abs(x + 0.5) / w;
      if (tn > 1.04) continue;
      const sp = sprays.find((s) => s.side === side && tn >= s.t0 && tn <= s.t1) ?? sprays.filter((s) => s.side === side).slice(-1)[0];
      const lu = ((tn - sp.t0) / (sp.t1 - sp.t0)) * 2 - 1;
      // Branch line: rises from the trunk, droops toward the tip.
      const yc = droop * Math.pow(tn, 1.7) - 2 * (1 - tn);
      const topT = t.top * Math.pow(Math.max(0, 1 - tn), 0.8) + 2.5;
      const tipCut = tn > 0.86 ? Math.min(1, Math.pow((tn - 0.86) / 0.18, 1.4)) : 0;
      const skirt = t.skirt * (0.42 + 0.58 * Math.pow(Math.max(0, 1 - tn), 0.7)) + sp.drop * Math.sqrt(Math.max(0, 1 - lu * lu));
      // Needle tips: columns hang in 2 px groups of uneven length.
      const ncol = Math.floor((x + 400) / 2);
      const needle = Math.floor(hash(ncol, 0, t.seed + 7) * 4) - (Math.abs(lu) > 0.82 ? 3 : 0);
      const yTop = yc - topT * (1 - tipCut);
      const yBot = yc + (skirt + needle) * (1 - tipCut * 0.85);
      if (y + 0.5 < yTop || y + 0.5 > yBot) continue;
      const dv = clamp((y + 0.5 - yc) / Math.max(1, yBot - yc), 0, 1);
      // Light: the upper surface faces the sky, the skirt turns away; left wing lit, right in shade.
      let Lv = y + 0.5 < yc + 2 ? 0.72 - 0.1 * (1 - tn) : 0.6 - 0.42 * dv;
      Lv += side < 0 ? 0.1 * tn : -0.14 * tn;
      Lv += -lu * 0.07 * side;
      // Needle streaks running down and outward.
      const across = x + 0.5 - side * 0.4 * (y - yc);
      const col = Math.floor(across / 1.7);
      const seg = Math.floor((y + hash(col, 2, t.seed) * 9) / 5);
      const hs = hash(col, seg, t.seed + 3);
      let s = quant(Lv, x, y, t.seed, TH_NEEDLE, 0.05, 2.2);
      if (hs > 0.74 && Lv > 0.36) s += 1;
      else if (hs < 0.26) s -= 1;
      // Dark seams between sprays, and the lit crest along the top band.
      if (Math.abs(lu) > 0.86 && dv > 0.3 && tn > 0.12) s = 1;
      const above = y - 0.5 < yTop;
      if (above && Lv > 0.55 && tn < 0.95) s = Math.max(s, side < 0 ? 5 : 4);
      s = clamp(s, 1, 5);
      if (s === 5 && !above) s = 4;
      art.set(x, y, P.needle, s);
    }
  return art;
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
    const y = Math.round(lerp(gy - 150, TOP + 34, Math.pow(k, 0.92)));
    const hw = lerp(84, 13, Math.pow(k, 0.9));
    const hf = hfOf(y);
    tiers.push({
      y, x: gx + Math.round(Math.sin(k * 2.2) * 2),
      hwL: hw * (0.9 + hash(i, 1, 3) * 0.22), hwR: hw * (0.9 + hash(i, 2, 3) * 0.22),
      droopL: lerp(26, 5, k) * (0.8 + hash(i, 3, 3) * 0.4), droopR: lerp(26, 5, k) * (0.8 + hash(i, 4, 3) * 0.4),
      top: lerp(16, 8, k), skirt: lerp(30, 14, k), seed: 300 + i * 13,
      amp: 3 * Math.pow(hf, 1.2), phase: -1.1 * hf,
    });
  }
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
        ts.push({ pal, tex, pts: spline([[gx, y], [gx + side * len * 0.5, y + 2], [gx + side * len, y + 5 + hash(i, 1, 5) * 4]]), r0: 3.2, r1: 1.2, point: 6, seed: 60 + i, lineFrom: 5, ember: 0.05, depth: 1 });
      });
    }
    return ts;
  };
  const leader = (L: Ix, ox: number) => {
    // The leader: a thin needle spike above the last tier.
    for (let y = TOP; y < TOP + 22; y++) {
      const k = (y - TOP) / 22;
      const hw = 0.6 + k * 2.4;
      for (let x = Math.floor(gx + ox - hw); x <= Math.ceil(gx + ox + hw - 1); x++) {
        const u = (x + 0.5 - gx - ox) / hw;
        L.put(x, y, P.needle, clamp(u < -0.2 ? 4 : u < 0.35 ? 3 : 2, 1, 5));
      }
    }
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
    for (const t of tiers) {
      const a = tierArt(t);
      const dx = Math.round(t.amp * Math.sin((TAU * f) / n + t.phase));
      stampArt(L, a, t.x + dx, t.y, P.needle, [1, 3]);
    }
    leader(L, swayAt(1, f, n, 3.2));
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
  const pads: Clump[] = [];
  let ci = 0;
  // Layered foliage pads: [dx, dy, rx, ry, layer].
  const defs: [number, number, number, number, number][] = [
    [-8, -248, 50, 22, 0],
    [-66, -220, 50, 22, 0],
    [56, -226, 52, 22, 0],
    [-104, -176, 40, 20, 0],
    [100, -184, 44, 21, 0],
    [4, -196, 56, 23, 0],
    [-42, -246, 34, 16, 1],
    [30, -256, 34, 15, 1],
    [-74, -196, 38, 17, 1],
    [70, -202, 40, 17, 1],
    [-18, -170, 44, 18, 1],
    [-108, -140, 36, 16, 1],
    [118, -150, 38, 16, 1],
    [36, -150, 36, 16, 2],
    [-58, -130, 34, 15, 2],
    [88, -120, 32, 14, 2],
  ];
  for (const [dx, dy, rx, ry, layer] of defs) {
    const i = ci++;
    const x = gx + dx, y = gy + dy;
    const hf = hfOf(y);
    const gl = clamp(-(dx / 130) * 0.5 - ((dy + 190) / 70) * 0.6, -1, 1);
    pads.push({
      x, y, rx, ry, pal: layer === 0 ? P.mapleBack : P.maple, seed: 500 + i * 23, bunch: 4.6 + hash(i, 1, 2) * 0.8,
      bias: 0.06 * gl + [-0.06, 0, 0.03][layer], layer, amp: 1 + 2 * hf, phase: -1.1 * hf + (hash(i, 2, 2) - 0.5) * 0.5,
      lobes: 5, sharp: 0.9, wobble: 0.22, pad: true,
    });
  }
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
      { pts: [Fk, [gx - 14, gy - 118], [gx - 22, gy - 150], [gx - 58, gy - 176], [gx - 84, gy - 190]], r0: 5, r1: 2.8, kids: [[-2.6, 30], [-1.9, 34]] },
      { pts: [Fk, [gx + 16, gy - 120], [gx + 14, gy - 160], [gx + 46, gy - 186], [gx + 70, gy - 210]], r0: 5, r1: 2.8, kids: [[-1.3, 34], [-0.5, 32]] },
      { pts: [Fk, [gx + 2, gy - 130], [gx - 12, gy - 176], [gx - 2, gy - 220]], r0: 4, r1: 2.4, kids: [[-1.9, 30], [-1.25, 30]] },
      { pts: [[gx + 4, gy - 76], [gx + 30, gy - 92], [gx + 62, gy - 106], [gx + 90, gy - 116]], r0: 3.2, r1: 1.8, kids: [[-0.6, 22]] },
      { pts: [[gx - 1, gy - 84], [gx - 26, gy - 100], [gx - 50, gy - 118]], r0: 3, r1: 1.8, kids: [[-2.4, 20]] },
    ];
    limbs.forEach((l, i) => {
      ts.push({ ...base, pts: spline(l.pts), r0: l.r0, r1: l.r1, seed: 80 + i, lineFrom: 12, depth: 9, ember: burnt ? 0.08 : 0, point: burnt && i === 2 ? 10 : 0 });
      const end = l.pts[l.pts.length - 1];
      l.kids.forEach(([ang, len], k) => {
        const out: Tube[] = [];
        grow(out, end, ang, len, l.r1 * 0.7, burnt ? 0 : 1, 90 + i * 7 + k, base);
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
    const dx = (c: Clump) => Math.round(c.amp * Math.sin((TAU * f) / n + c.phase));
    for (const c of pads) if (c.layer === 0) drawClump(L, c, dx(c), 0);
    for (const t of tubes) drawTube(L, t);
    for (const c of pads) if (c.layer > 0) drawClump(L, c, dx(c), 0);
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
    // Sheaths on the lowest nodes.
    for (const v of nodes.slice(0, 2)) {
      if (v > 50) continue;
      const len = 9 + hash(Math.round(v), 2, c.seed) * 5;
      const SM = new Mask(0, 0, W, H);
      for (let k = Math.round(v - len); k <= v; k++) {
        const t = k / c.h;
        const [cx, cy] = at(c, t, f, n);
        const tt = (v - k) / len;
        const hw = c.r + 1 - tt * 1.5;
        for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw - 1); x++) if (Math.abs(x + 0.5 - cx) <= hw) SM.add(x, Math.round(cy));
      }
      stamp(L, SM, (x) => {
        const [cx] = at(c, v / c.h, f, n);
        const u = (x + 0.5 - cx) / (c.r + 1);
        return [P.sheathDark, u < -0.4 ? 4 : u < 0.3 ? 3 : 2];
      }, { line: () => true, linePal: P.sheathDark });
    }
  };
  // Leaves: narrow lances hanging in fans from twigs on the upper nodes.
  const leafInto = (L: Ix, x: number, y: number, ang: number, len: number, pal: number, bias: number) => {
    const M = new Mask(Math.floor(x - len - 3), Math.floor(y - len - 3), Math.ceil(len * 2 + 7), Math.ceil(len * 2 + 7));
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const sag = 0.18;
    const side = new Map<number, number>();
    for (let k = 0; k <= len * 2; k++) {
      const t = k / (len * 2);
      const w = 1.7 * Math.sin(Math.PI * Math.pow(t, 0.6));
      const cxp = x + ux * t * len, cyp = y + uy * t * len + sag * t * t * len;
      for (let o = -Math.ceil(w); o <= Math.ceil(w); o += 0.5) {
        if (Math.abs(o) > w) continue;
        const px = Math.round(cxp - uy * o), py = Math.round(cyp + ux * o);
        M.add(px, py);
        side.set(py * 10000 + px, o / Math.max(0.6, w));
      }
    }
    stamp(
      L,
      M,
      (px, py) => {
        const o = side.get(py * 10000 + px) ?? 0;
        const up = -ux * o; // >0 on the edge facing up
        const Lv = 0.5 + 0.28 * Math.sign(-uy * o + 0.01) * 0 + 0.3 * (o * (ux >= 0 ? -1 : 1)) + bias;
        void up;
        const s = Lv > 0.72 ? 4 : Lv > 0.5 ? 3 : Lv > 0.3 ? 2 : 1;
        return [pal, s];
      },
      { line: () => true, linePal: pal },
    );
  };
  const render = (f: number): Canvas => {
    const L = new Ix(W, H);
    const n = 8;
    const order = culms.slice().sort((a, b) => Number(b.back) - Number(a.back) || a.by - b.by);
    for (const c of order) {
      drawCulm(L, c, f, n);
      // Twigs and leaf sprays on the upper nodes.
      const nodes = nodesOf(c).filter((v) => v > c.h * 0.5);
      nodes.forEach((v, k) => {
        if (hash(k, 7, c.seed) < 0.25) return;
        const side = (k + c.seed) % 2 === 0 ? -1 : 1;
        const t = v / c.h;
        const [nx, ny] = at(c, t, f, n);
        const tl = 10 + hash(k, 8, c.seed) * 14;
        const ta = -Math.PI / 2 + side * (0.75 + hash(k, 9, c.seed) * 0.35);
        const ex = nx + Math.cos(ta) * tl, ey = ny + Math.sin(ta) * tl;
        const dl = Math.round(Math.sin((TAU * f) / n + c.phase + 1.4 + k) * 1);
        L.put(Math.round(nx), Math.round(ny), c.pal, 2);
        const TM = new Mask(0, 0, W, H);
        const steps = Math.ceil(tl);
        for (let q = 0; q <= steps; q++) TM.add(Math.round(lerp(nx, ex + dl, q / steps)), Math.round(lerp(ny, ey, q / steps)));
        stamp(L, TM, () => [c.pal, 2]);
        const nl = 3 + Math.floor(hash(k, 10, c.seed) * 3);
        for (let q = 0; q < nl; q++) {
          const la = (side > 0 ? 0.15 : Math.PI - 0.15) + side * (q / (nl - 1 || 1)) * 1.25 + (hash(q, k, c.seed) - 0.5) * 0.25;
          leafInto(L, ex + dl, ey, la, 12 + hash(q, k + 3, c.seed) * 6, c.back ? P.leafBack : P.leaf, c.back ? -0.05 : 0.02);
        }
      });
      // A tuft of leaves at the tip.
      const [tx, ty] = at(c, 1, f, n);
      for (let q = 0; q < 3; q++) leafInto(L, tx, ty + 2, -Math.PI / 2 + (q - 1) * 0.9 + 0.2, 11 + q * 2, c.back ? P.leafBack : P.leaf, c.back ? -0.05 : 0.02);
    }
    // A young shoot and a few fallen leaves at the base.
    const SM = new Mask(0, 0, W, H);
    for (let y = gy - 14; y <= gy + 2; y++) {
      const k = (gy + 2 - y) / 16;
      const hw = 4 * (1 - k) + 0.5;
      for (let x = Math.floor(gx + 44 - hw); x <= gx + 44 + hw; x++) SM.add(x, y);
    }
    stamp(L, SM, (x, y) => {
      const u = (x + 0.5 - gx - 44) / 4;
      const band = (gy - y) % 5 === 0;
      return [P.sheathDark, band ? 1 : u < -0.3 ? 4 : u < 0.3 ? 3 : 2];
    }, { line: () => true, linePal: P.sheathDark });
    for (const [lx, ly, a] of [[-46, 2, 0.2], [-14, 4, -0.3], [8, 3, 0.1], [36, 5, -0.15], [58, 2, 0.25]] as [number, number, number][])
      leafInto(L, gx + lx, gy + ly, a, 8, P.sheath, -0.05);
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
  const Rr = 21, ryT = 13, ryB = 12, hgt = m(0.5);
  const cyb = gy - ryB; // base ellipse center
  const cyt = cyb - hgt; // top ellipse center
  const L = new Ix(W, H);
  // Roots first (behind the wall's lower edge).
  const roots: Tube[] = [
    { pal: P.bark, tex: 'oak', pts: spline([[gx - 14, cyb + 4], [gx - 24, cyb + 9], [gx - 32, cyb + 11]]), r0: 4.5, r1: 1.3, seed: 3, lineFrom: 99 },
    { pal: P.bark, tex: 'oak', pts: spline([[gx + 10, cyb + 8], [gx + 17, cyb + 12], [gx + 24, cyb + 13]]), r0: 4, r1: 1.2, seed: 4, lineFrom: 99 },
  ];
  // Wall: a cylinder with oak bark, the top cut slightly uneven.
  const wallM = new Mask(0, 0, W, H);
  const wInfo = new Map<number, [number, number]>();
  for (let x = gx - Rr - 2; x <= gx + Rr + 2; x++) {
    const u = (x + 0.5 - gx) / Rr;
    if (Math.abs(u) > 1.08) continue;
    const uc = clamp(u, -1, 1);
    const flare = Math.max(0, Math.abs(u) - 0.9) * 0;
    void flare;
    const yt = cyt + ryT * Math.sqrt(1 - uc * uc);
    const yb = cyb + ryB * Math.sqrt(Math.max(0, 1 - uc * uc)) + (Math.abs(u) > 1 ? -2 : 0);
    for (let y = Math.floor(yt); y <= Math.ceil(yb); y++) {
      if (Math.abs(u) > 1 && y < cyb - 6) continue;
      wallM.add(x, y);
      wInfo.set(y * W + x, [uc, y - cyt]);
    }
  }
  stamp(L, wallM, (x, y) => {
    const [u, s] = wInfo.get(y * W + x)!;
    const nz = Math.sqrt(Math.max(0, 1 - u * u));
    const Lv = lambert(u, 0.1, nz) - (s > hgt ? 0.12 : 0);
    const t: Tube = { pal: P.bark, tex: 'oak', pts: [], r0: Rr, r1: Rr, seed: 9 };
    let [pal, st] = barkStep(t, Lv, Math.asin(u) * Rr, s * 1.0, Rr);
    // Moss on the shaded side, climbing from the base.
    const mossH = (0.55 + 0.45 * noise(x, 0, 4, 12)) * (hgt + 6);
    if (u > 0.2 && s > hgt + 6 - mossH * (u - 0.2) * 1.6 && noise(x, y, 2.5, 13) > 0.3) {
      pal = P.moss;
      st = clamp(quant(Lv + 0.08, x, y, 14, [0.3, 0.46, 0.64, 0.84]), 1, 3);
    }
    return [pal, st];
  });
  for (const r of roots) drawTube(L, r);
  // Top: the cut face with growth rings, a crack, the pith, a lit rim and a bark lip.
  const top = new Mask(0, 0, W, H);
  for (let y = Math.floor(cyt - ryT) - 1; y <= cyt + ryT + 1; y++)
    for (let x = gx - Rr - 1; x <= gx + Rr + 1; x++) {
      const u = (x + 0.5 - gx) / Rr, v = (y + 0.5 - cyt) / ryT;
      if (u * u + v * v <= 1) top.add(x, y);
    }
  stamp(L, top, (x, y) => {
    const u = (x + 0.5 - gx) / Rr, v = (y + 0.5 - cyt) / ryT;
    const d = Math.sqrt(u * u + v * v);
    // Bark lip around the cut.
    if (d > 0.86) {
      const lit = u + v < -0.5;
      return [P.bark, lit ? (d > 0.95 && u + v < -0.9 ? 5 : 4) : u + v > 0.7 ? 1 : 2];
    }
    // Sapwood ring just inside the bark catches the light at the front-left.
    if (d > 0.78) return [P.woodCut, u + v < -0.3 ? 5 : u + v < 0.5 ? 4 : 3];
    const dd = d + (noise(x, y, 3, 21) - 0.5) * 0.08;
    const ring = frac(dd * 5.2);
    let s = 3 + (u + v < -0.4 ? 1 : 0) - (u + v > 0.55 ? 1 : 0);
    if (ring < 0.2) s -= 1;
    // A radial crack toward the front right, and the dark pith.
    const ang = Math.atan2(v, u);
    if (Math.abs(ang - 0.7) < 0.12 / Math.max(0.2, d) * 0.4 && d > 0.15 && d < 0.8) s = 1;
    if (d < 0.1) s = 1;
    return [P.woodCut, clamp(s, 1, 5)];
  }, { line: () => true, linePal: P.bark });
  // A moss tuft creeping over the shaded back rim.
  const tuft = new Mask(0, 0, W, H);
  for (let y = Math.floor(cyt - ryT) - 3; y <= cyt - 2; y++)
    for (let x = gx + 6; x <= gx + Rr + 2; x++) {
      const u = (x + 0.5 - gx - 15) / 8, v = (y + 0.5 - cyt + ryT * 0.65) / 4.5;
      if (u * u + v * v <= 1 && noise(x, y, 2, 31) > 0.25) tuft.add(x, y);
    }
  stamp(L, tuft, (x, y) => {
    const u = (x + 0.5 - gx - 15) / 8, v = (y + 0.5 - cyt + ryT * 0.65) / 4.5;
    return [P.moss, u + v < -0.4 ? 4 : u + v < 0.4 ? 3 : 2];
  }, { line: () => true, linePal: P.moss });
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
