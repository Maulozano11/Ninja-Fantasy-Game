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

import { join } from 'node:path';
import {
  Canvas, Color, MATERIALS, OUTLINE, WorldSprite, hash, hex, lambert, m, mix, noise, preview, previewDir, ramp, toHex, writeGroup,
} from './kit';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
type Pt = [number, number];

// --- palettes -----------------------------------------------------------------------------

const PALS: Color[][] = [];
function addPal(r: Color[]): number {
  PALS.push(r);
  return PALS.length - 1;
}

/** Flames: dark ember red, red tips, orange body, amber, pale yellow core (kit fire colors). */
const FIRE_RAMP: Color[] = (() => {
  const r = ramp(MATERIALS.fire);
  return [r[0], mix(r[1], hex('#ef4444'), 0.35), hex('#ef4444'), hex(MATERIALS.fire), r[4], hex('#fde68a')];
})();

const P = {
  leaf: addPal(ramp(MATERIALS.leaf)),
  leafDeep: addPal(ramp(MATERIALS.leafDeep)),
  leafLight: addPal(ramp(MATERIALS.leafLight)),
  bark: addPal(ramp(MATERIALS.bark)),
  cedar: addPal(ramp(MATERIALS.barkCedar)),
  charred: addPal(ramp(MATERIALS.charred, { spread: 0.62 })),
  moss: addPal(ramp(MATERIALS.moss)),
  wood: addPal(ramp(MATERIALS.wood)),
  maple: addPal(ramp(toHex(mix(hex(MATERIALS.red), hex(MATERIALS.fire), 0.28)), { shift: 18 })),
  scorch: addPal(ramp(toHex(mix(hex(MATERIALS.leaf), hex(MATERIALS.wood), 0.6)))),
  fire: addPal(FIRE_RAMP),
  ash: addPal(ramp(MATERIALS.stone, { spread: 0.8 })),
  sheath: addPal(ramp(MATERIALS.canvas)),
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
    if (this.s[i] === 0) return;
    this.s[i] = clamp(this.s[i] + d, lo, hi);
  }
  erase(x: number, y: number): void {
    if (this.inside(x, y)) this.p[y * this.w + x] = -1;
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
  /** Share of filled pixels per ramp step (value-budget check). */
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
  del(x: number, y: number): void {
    const i = x - this.x0, j = y - this.y0;
    if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.a[j * this.w + i] = 0;
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
    const hit = new Set<number>();
    M.each((x, y) => {
      for (let k = 1; k <= Math.max(Math.abs(sx), Math.abs(sy)); k++) {
        const qx = x + Math.round((sx * k) / Math.max(Math.abs(sx), Math.abs(sy))), qy = y + Math.round((sy * k) / Math.max(Math.abs(sx), Math.abs(sy)));
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
        if (!M.has(qx, qy) && L.has(qx, qy) && o.line!(x, y, qx, qy)) L.put(qx, qy, lp, 0);
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

// --- leaf clumps --------------------------------------------------------------------------

interface Clump {
  x: number;
  y: number;
  r: number;
  ry: number;
  pal: number;
  bias: number;
  seed: number;
  /** Size of the leaf clusters inside the clump. */
  cell: number;
  amp: number;
  phase: number;
  layer: number;
  /** How ragged the edge is (leaf tips sticking out). */
  tips?: number;
  /** Burning: 0 green, 1 scorched, 2 charred with glowing edges. */
  char?: number;
}

function clumpGeom(c: Clump, cx: number, cy: number): { M: Mask; lobes: [number, number, number][]; crx: number; cry: number } {
  const n = 10 + Math.floor(hash(1, 0, c.seed) * 4);
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const th = ((i + (hash(i, 1, c.seed) - 0.5) * 0.5) / n) * TAU;
    const down = Math.sin(th);
    let rl = c.r * (0.25 + 0.13 * hash(i, 2, c.seed));
    if (down > 0.25) rl *= 0.8;
    const ex = Math.cos(th) * (c.r - rl), ey = down * (c.ry - rl) * (down > 0 ? 0.9 : 1);
    lobes.push([cx + ex, cy + ey, rl]);
  }
  const crx = c.r * 0.76, cry = c.ry * 0.74;
  const x0 = Math.floor(cx - c.r) - 3, y0 = Math.floor(cy - c.ry) - 3;
  const M = new Mask(x0, y0, Math.ceil(c.r * 2) + 7, Math.ceil(c.ry * 2) + 7);
  for (let y = y0; y < y0 + M.h; y++)
    for (let x = x0; x < x0 + M.w; x++) {
      const px = x + 0.5 - cx, py = y + 0.5 - cy;
      let ins = (px / crx) ** 2 + (py / cry) ** 2 <= 1;
      for (let k = 0; !ins && k < lobes.length; k++) {
        const [lx, ly, rl] = lobes[k];
        ins = (x + 0.5 - lx) ** 2 + (y + 0.5 - ly) ** 2 <= rl * rl;
      }
      if (ins) M.add(x, y);
    }
  // Leaf tips: single leaves poking out of the top and sides (hashed in local coordinates so
  // they travel with the clump when it sways).
  const tips = c.tips ?? 0.16;
  const add: Pt[] = [];
  M.each((x, y) => {
    const lx = x - cx, ly = y - cy;
    if (!M.has(x, y - 1) && ly < c.ry * 0.3 && hash(lx, ly, c.seed + 5) < tips) add.push([x, y - 1]);
    else if (!M.has(x - 1, y) && hash(lx, ly, c.seed + 6) < tips * 0.7) add.push([x - 1, y]);
    else if (!M.has(x + 1, y) && hash(lx, ly, c.seed + 7) < tips * 0.7) add.push([x + 1, y]);
  });
  for (const [x, y] of add) M.add(x, y);
  return { M, lobes, crx, cry };
}

const TH_LEAF = [0.33, 0.49, 0.68, 0.86];

function drawClump(L: Ix, c: Clump, ox: number, oy: number, opts: { th?: number[]; shadow?: boolean } = {}): void {
  const cx = Math.round(c.x) + ox, cy = Math.round(c.y) + oy;
  const { M, lobes, crx, cry } = clumpGeom(c, cx, cy);
  const th = opts.th ?? TH_LEAF;
  stamp(
    L,
    M,
    (x, y) => {
      const lx = x - cx, ly = y - cy;
      const px = lx + 0.5, py = ly + 0.5;
      const u = px / c.r, v = py / c.ry;
      const r2 = Math.min(0.97, u * u + v * v);
      const Lc = lambert(u, v, Math.sqrt(1 - r2));
      let Ll = Lc;
      if ((px / crx) ** 2 + (py / cry) ** 2 > 1) {
        let bh = -1;
        for (const [qx, qy, rl] of lobes) {
          const du = (x + 0.5 - qx) / rl, dv = (y + 0.5 - qy) / rl, d2 = du * du + dv * dv;
          if (d2 < 1 && 1 - d2 > bh) {
            bh = 1 - d2;
            Ll = lambert(du, dv, Math.sqrt(1 - d2));
          }
        }
      }
      const Lv = 0.62 * Lc + 0.38 * Ll + c.bias;
      // Leaf clusters: small cells lit at their upper left with a dark seam at the lower right.
      const w = worley(px, py, c.cell, c.seed);
      const k = c.cell * 0.62;
      const mu = w.dx / k, mv = w.dy / k, mr = mu * mu + mv * mv;
      let adj = 0;
      if (w.f < 1.0 && mu + mv > 0.25) adj = -1;
      else if (mr < 1 && lambert(mu, mv, Math.sqrt(1 - mr)) > 0.9 && Lv > 0.44) adj = 1;
      let s = quant(Lv, lx, ly, c.seed, th) + adj;
      const rim = !M.has(x - 1, y) || !M.has(x, y - 1) || !M.has(x - 1, y - 1);
      const rim2 = rim || !M.has(x - 2, y - 1) || !M.has(x - 1, y - 2);
      if (rim && Lv > 0.52) s++;
      s = clamp(s, 1, 5);
      if (s === 5 && !rim2) s = 4;
      if (c.char === 2) {
        // Charred clump: dark leaves, glowing rims and a few embers.
        if (rim && Lv > 0.45) return [P.fire, Lv > 0.62 ? 4 : 3];
        if (adj === 1 && hash(lx, ly, c.seed + 9) < 0.5) return [P.fire, 2];
        return [P.charred, clamp(s, 1, 4)];
      }
      if (c.char === 1) return [P.scorch, s];
      return [c.pal, s];
    },
    { line: () => true, linePal: c.char === 2 ? P.charred : c.char === 1 ? P.scorch : c.pal, shadow: opts.shadow === false ? undefined : [2, 3] },
  );
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

function barkStep(t: Tube, Lv: number, a: number, s: number): [number, number] {
  let st = quant(Lv, Math.round(a * 1.5), Math.round(s), t.seed, TH_BARK, 0.05, 2);
  switch (t.tex) {
    case 'oak': {
      const n = noise(a * 0.42 + noise(0, s * 0.06, 1, t.seed + 3) * 3, s * 0.1, 1, t.seed);
      if (n < 0.15) st = Math.min(st, 1);
      else if (n < 0.27) st -= 1;
      else if (n > 0.72 && Lv > 0.42) st += 1;
      break;
    }
    case 'cedar': {
      const n = noise(a * 0.8 + s * 0.05, s * 0.04, 1, t.seed);
      if (n < 0.28) st -= 1;
      else if (n > 0.7 && Lv > 0.38) st += 1;
      break;
    }
    case 'smooth': {
      const n = noise(a * 0.35, s * 0.07, 1, t.seed);
      if (n > 0.78 && Lv > 0.44) st += 1;
      else if (n < 0.17) st -= 1;
      break;
    }
    case 'charred': {
      const w = worley(a * 1.2, s * 0.55, 4, t.seed);
      if (w.f < 0.7) {
        if (t.ember && hash(Math.floor(a * 1.2 / 4 + w.dx), Math.floor(s * 0.55 / 4), t.seed + 2) < t.ember && Lv < 0.7)
          return [P.fire, hash(Math.round(a), Math.round(s), t.seed) < 0.35 ? 4 : 2];
        st = 1;
      } else if (w.dx + w.dy < -0.8 && Lv > 0.4) st += 1;
      return [P.charred, clamp(st, 1, 5)];
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
  const info = new Float32Array(M.w * M.h * 5);
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
      const k = ((y - y0) * M.w + (x - x0)) * 5;
      info[k] = bs;
      info[k + 1] = clamp(off / br, -1, 1);
      info[k + 2] = nx;
      info[k + 3] = ny;
      info[k + 4] = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    }
  }
  const at = (x: number, y: number) => ((y - y0) * M.w + (x - x0)) * 5;
  stamp(
    L,
    M,
    (x, y) => {
      const k = at(x, y);
      const s = info[k], u = info[k + 1];
      const r = rAt(s);
      const Lv = lambert(info[k + 2], info[k + 3], info[k + 4]) * (t.dim ? t.dim(x, y) : 1) + (t.bias ?? 0);
      return barkStep(t, Lv, Math.asin(u) * r, s);
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
  out.push({ ...base, pts: spline([p, mid, end]), r0: r, r1: Math.max(0.7, r * 0.66), seed, lineFrom: r * 2.2, depth });
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
}

/** One flame: three wavy tongues, a hot core, red tips and a wisp that breaks off and rises. */
function flameInto(F: Ix, f: Flame, t: number): void {
  const put = (x: number, y: number, s: number) => {
    if (F.step(x, y) < s) F.put(x, y, P.fire, s);
  };
  const tongues: [number, number, number][] = [
    [0, 1, 0],
    [-0.3, 0.62, 0.37],
    [0.28, 0.74, 0.71],
  ];
  for (const [ox, hk, tp] of tongues) {
    const q = t + f.ph + tp;
    const hh = f.h * hk * (0.8 + 0.2 * Math.sin(TAU * q));
    const bx = f.x + ox * f.w;
    const ww = f.w * (ox === 0 ? 1 : 0.62);
    for (let k = 0; k <= hh; k++) {
      const tt = k / hh;
      const prof = Math.pow(1 - tt, 0.85) * Math.min(1, 0.55 + tt * 3.5);
      const hw = (ww / 2) * prof;
      const cx = bx + Math.sin(TAU * q + tt * 4.2 + f.seed) * ww * 0.2 * tt;
      const y = Math.round(f.y - k);
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const e = Math.abs(x + 0.5 - cx) / Math.max(0.5, hw);
        if (e > 1) continue;
        const s = tt > 0.8 || e > 0.74 ? 2 : e < 0.4 && tt < 0.48 ? 5 : e < 0.64 && tt < 0.7 ? 4 : 3;
        put(x, y, s);
      }
    }
    // A wisp breaks off the tip and rises while shrinking.
    const wq = (((q * 1.0) % 1) + 1) % 1;
    const wr = (1 - wq) * ww * 0.16;
    if (wr >= 0.8) {
      const wy = f.y - hh - 3 - wq * f.h * 0.45, wx = bx + Math.sin(TAU * wq + f.seed) * 2;
      for (let y = Math.floor(wy - wr * 1.4); y <= wy + wr * 1.4; y++)
        for (let x = Math.floor(wx - wr); x <= wx + wr; x++) {
          const e = ((x + 0.5 - wx) / wr) ** 2 + ((y + 0.5 - wy) / (wr * 1.4)) ** 2;
          if (e <= 1) put(x, y, e < 0.3 && wr > 1.5 ? 4 : wq > 0.6 ? 2 : 3);
        }
    }
  }
}

function sparksInto(F: Ix, x0: number, y0: number, spread: number, rise: number, n: number, t: number, seed: number): void {
  for (let k = 0; k < n; k++) {
    const q = (t + hash(k, 0, seed)) % 1;
    if (q > 0.9) continue;
    const x = Math.round(x0 + (hash(k, 1, seed) - 0.5) * spread + Math.sin(TAU * q * 1.5 + k) * 3);
    const y = Math.round(y0 - q * rise);
    const s = q < 0.35 ? 5 : q < 0.65 ? 4 : 2;
    F.put(x, y, P.fire, s);
    if (q < 0.3 && hash(k, 2, seed) < 0.5) F.put(x, y + 1, P.fire, 3);
  }
}

/** Fire overlay: drawn after the tree's outline, with its own dark red rim. */
function overlayFire(C: Canvas, F: Ix): void {
  const fc = F.toCanvas();
  fc.outline({ toward: '#2a0806', amount: 0.55 });
  C.draw(fc, 0, 0);
}

// --- frames, cropping ---------------------------------------------------------------------

interface Built {
  anims: Record<string, { frames: Canvas[]; fps: number; loop?: boolean }>;
  gx: number;
  gy: number;
}

/** Crops every frame of every animation to their common bounds (+1 px) and fixes the anchor. */
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
  // Ground contact: the lowest opaque row near the base center.
  let gy = b.gy;
  const first = Object.values(b.anims)[0].frames[0];
  for (let y = first.h - 1; y >= 0; y--) {
    let hit = false;
    for (let x = b.gx - 3; x <= b.gx + 3; x++) if (first.alpha(x, y)) hit = true;
    if (hit) {
      gy = y;
      break;
    }
  }
  return { name, label, meters, anchor: [b.gx - x0, gy - y0], tags, anims };
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

// --- oak ----------------------------------------------------------------------------------

function oak(): WorldSprite {
  const W = 620, H = 640, gx = 310, gy = 610;
  const CX = gx + 2, CY = gy - 298, RX = 152, RY = 124;
  const clumps: Clump[] = [];
  let ci = 0;
  const addClump = (dx: number, dy: number, r: number, layer: number) => {
    const x = CX + dx, y = CY + dy;
    const gl = clamp(-(dx / RX) * 0.6 - (dy / RY) * 0.8, -1, 1);
    const bias = 0.1 * gl + [-0.1, -0.03, 0.03][layer];
    const hf = clamp((gy - 175 - y) / 250, 0, 1);
    const i = ci++;
    clumps.push({
      x, y, r, ry: r * 0.84, pal: layer === 0 ? P.leafDeep : P.leaf, bias, seed: 100 + i * 17, cell: 6.5,
      amp: 1 + 2 * hf, phase: -1.2 * hf + (hash(i, 9, 3) - 0.5) * 0.5, layer,
    });
  };
  // Back layer: a ring that makes the silhouette, plus a fill.
  const ring: [number, number][] = [[152, 44], [176, 48], [200, 52], [224, 54], [248, 56], [272, 58], [296, 56], [320, 54], [344, 50], [6, 48], [28, 44]];
  for (const [deg, r] of ring) {
    const a = (deg * Math.PI) / 180;
    addClump(Math.cos(a) * (RX - r * 0.92), Math.sin(a) * (RY - r * 0.9), r, 0);
  }
  for (const [dx, dy, r] of [[-50, -35, 55], [42, -45, 55], [-5, 18, 50], [-78, 30, 42], [72, 26, 44]] as [number, number, number][]) addClump(dx, dy, r, 0);
  // Middle layer.
  for (const [deg, r] of [[165, 38], [205, 40], [242, 42], [282, 42], [320, 40], [355, 38], [22, 34]] as [number, number][]) {
    const a = (deg * Math.PI) / 180;
    addClump(Math.cos(a) * RX * 0.56, Math.sin(a) * RY * 0.56, r, 1);
  }
  for (const [dx, dy, r] of [[-22, -22, 40], [32, -2, 38]] as [number, number, number][]) addClump(dx, dy, r, 1);
  // Front layer: a few clumps low and to the left, catching light.
  for (const [dx, dy, r] of [[-82, 30, 32], [-40, 44, 30], [22, 46, 28], [76, 40, 30], [-58, -24, 30], [4, -18, 32]] as [number, number, number][]) addClump(dx, dy, r, 2);
  clumps.sort((a, b) => a.layer - b.layer || a.y - b.y);

  const F: Pt = [gx - 1, gy - 152];
  const underCanopy = (x: number, y: number) => (y < gy - 165 ? 0.7 : y < gy - 135 ? 0.85 : 1);
  const bark = (tex: Tex, pal: number): Partial<Tube> & { pal: number; tex: Tex } => ({ pal, tex, dim: underCanopy });

  const skeleton = (burnt: boolean): Tube[] => {
    const pal = burnt ? P.charred : P.bark, tex: Tex = burnt ? 'charred' : 'oak';
    const ts: Tube[] = [];
    ts.push({ ...bark(tex, pal), pts: spline([[gx, gy + 4], [gx - 1, gy - 60], [gx + 1, gy - 112], F]), r0: 17, r1: 12, flare: 9, flareLen: 12, seed: 11, clipY: gy, ember: burnt ? 0.08 : 0, depth: 9 });
    // Surface roots.
    ts.push({ ...bark(tex, pal), pts: spline([[gx - 14, gy - 12], [gx - 30, gy - 4], [gx - 47, gy - 1]]), r0: 6.5, r1: 1.6, seed: 21, clipY: gy, lineFrom: 99, depth: 9 });
    ts.push({ ...bark(tex, pal), pts: spline([[gx + 13, gy - 11], [gx + 27, gy - 4], [gx + 42, gy - 1]]), r0: 6, r1: 1.6, seed: 22, clipY: gy, lineFrom: 99, depth: 9 });
    ts.push({ ...bark(tex, pal), pts: spline([[gx - 4, gy - 4], [gx - 14, gy - 1], [gx - 24, gy + 1]]), r0: 3.5, r1: 1.2, seed: 23, clipY: gy, lineFrom: 99, depth: 9 });
    // Limbs.
    const limbs: { pts: Pt[]; r0: number; r1: number; kids: [number, number][] }[] = [
      { pts: [F, [gx - 24, gy - 186], [gx - 56, gy - 222], [gx - 86, gy - 248]], r0: 10, r1: 6, kids: [[-2.6, 62], [-1.9, 56]] },
      { pts: [F, [gx + 6, gy - 200], [gx + 3, gy - 250], [gx + 10, gy - 300]], r0: 11, r1: 6.5, kids: [[-2.0, 64], [-1.2, 66]] },
      { pts: [F, [gx + 28, gy - 178], [gx + 62, gy - 204], [gx + 94, gy - 228]], r0: 9, r1: 5.5, kids: [[-1.0, 60], [-0.35, 56]] },
    ];
    limbs.forEach((l, i) => {
      const pts = burnt && i === 1 ? l.pts.slice(0, 3) : l.pts;
      ts.push({ ...bark(tex, pal), pts: spline(pts), r0: l.r0, r1: l.r1, seed: 31 + i, lineFrom: 22, ember: burnt ? 0.1 : 0, point: burnt && i === 1 ? 14 : 0, depth: 9 });
      const end = pts[pts.length - 1];
      l.kids.forEach(([ang, len], k) => {
        const out: Tube[] = [];
        grow(out, end, ang, burnt ? len * 0.8 : len, l.r1 * 0.75, burnt ? 1 : 2, 50 + i * 10 + k, bark(tex, pal));
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
    // A low side branch on the left, visible under the canopy.
    const low: Tube[] = [];
    grow(low, [gx - 8, gy - 128], -2.55, 44, 4.5, burnt ? 1 : 1, 77, bark(tex, pal));
    ts.push(...low.map((tb) => ({ ...tb, lineFrom: 7, point: burnt ? 6 : 0 })));
    return ts;
  };

  const sway = (y: number, f: number, n: number) => {
    const hf = clamp((gy - 175 - y) / 250, 0, 1);
    const wgt = clamp((gy - 160 - y) / 50, 0, 1);
    return Math.round((1 + 2 * hf) * wgt * Math.sin((TAU * f) / n - 1.2 * hf));
  };

  const render = (f: number, mode: 'idle' | 'burning' | 'burnt'): Canvas => {
    const L = new Ix(W, H);
    const n = 8;
    const tubes = skeleton(mode === 'burnt');
    const moved = tubes.map((t) => (mode === 'idle' ? { ...t, pts: t.pts.map(([x, y]) => [x + sway(y, f, n), y] as Pt) } : t));
    if (mode === 'burnt') {
      for (const t of moved) drawTube(L, t);
      // Ash and charcoal around the base.
      ashPile(L, gx, gy, 40, 4, 5);
      stat('oak burnt', L);
      return toFrame(L);
    }
    const dx = (c: Clump) => (mode === 'idle' ? Math.round(c.amp * Math.sin((TAU * f) / n + c.phase)) : 0);
    const cl = clumps.map((c, i) => (mode === 'burning' ? { ...c, char: burnChar(c, i) } : c));
    for (const c of cl) if (c.layer === 0) drawClump(L, c, dx(c), 0);
    for (const t of moved) drawTube(L, mode === 'burning' && t.depth === 9 ? { ...t, tex: 'oak' } : t);
    for (const c of cl) if (c.layer > 0) drawClump(L, c, dx(c), 0);
    if (mode === 'idle') {
      if (f === 0) stat('oak idle', L);
      return toFrame(L);
    }
    // Burning: flames on the charred clumps and the trunk, sparks above.
    const fire = new Ix(W, H);
    const t = f / n;
    cl.forEach((c, i) => {
      if (c.char === 2) flameInto(fire, { x: c.x + c.r * 0.05, y: c.y - c.ry * 0.25, w: c.r * 1.05, h: c.r * 1.5, ph: hash(i, 3, 5), seed: i }, t);
    });
    flameInto(fire, { x: gx - 9, y: gy - 30, w: 13, h: 30, ph: 0.3, seed: 2 }, t);
    flameInto(fire, { x: gx + 6, y: gy - 118, w: 12, h: 26, ph: 0.7, seed: 4 }, t);
    flameInto(fire, { x: gx - 2, y: gy - 158, w: 18, h: 34, ph: 0.1, seed: 6 }, t);
    sparksInto(fire, CX - 20, CY - 110, 180, 90, 18, t, 9);
    if (f === 0) stat('oak burning', L);
    return toFrame(L, fire);
  };
  const burnChar = (c: Clump, i: number): number => {
    if (c.layer === 2 && c.y > CY + 20) return 0;
    if (c.y < CY - 40 || hash(i, 1, 41) < 0.35) return 2;
    return 1;
  };

  const idle = Array.from({ length: 8 }, (_, f) => render(f, 'idle'));
  const burning = Array.from({ length: 8 }, (_, f) => render(f, 'burning'));
  const burnt = [render(0, 'burnt')];
  return finish('oak', 'Broadleaf Tree', [5.5, 7.5], ['cover-half', 'blocks-sight', 'flammable', 'destructible', 'climbable'], {
    gx, gy,
    anims: { idle: { frames: idle, fps: 5 }, burning: { frames: burning, fps: 11 }, burnt: { frames: burnt, fps: 0 } },
  });
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
      if (hash(x, y, seed) < 0.12) {
        L.put(x, y, P.charred, 2);
        continue;
      }
      if (hash(x, y, seed + 1) < 0.04 && y > top + 1) {
        L.put(x, y, P.fire, 3);
        continue;
      }
      s = clamp(s - (noise(x, y, 2, seed) < 0.35 ? 1 : 0), 1, 4);
      L.put(x, y, P.ash, s);
    }
}

// --- placeholder group entry --------------------------------------------------------------

const sprites: WorldSprite[] = [oak()];
writeGroup('trees', sprites);
const dir = previewDir();
preview(sprites, join(dir, 'trees.png'), { scale: 1 });
for (const s of sprites) {
  const f0 = Object.values(s.anims)[0].frames[0];
  const bb = f0.bounds()!;
  console.log(`${s.name}: frame ${f0.w}x${f0.h}, anchor ${s.anchor}, opaque height ${bb[3] - bb[1] + 1}px (${((bb[3] - bb[1] + 1) / 57).toFixed(2)} m), width ${bb[2] - bb[0] + 1}px`);
  f0.scaled(3).save(join(dir, `trees-${s.name}-x3.png`));
  for (const [k, a] of Object.entries(s.anims)) {
    const strip = new Canvas(a.frames.reduce((t, f) => t + f.w + 2, 0), a.frames[0].h);
    a.frames.forEach((f, i) => strip.draw(f, i * (f.w + 2), 0));
    strip.save(join(dir, `trees-${s.name}-${k}.png`));
  }
}
console.log(STATS.join('\n'));
void m;
void OUTLINE;
