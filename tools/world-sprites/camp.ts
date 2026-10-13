// Camp props for the battle maps: the enemy camp on the hill. Everything here can be burnt, blown
// up, broken or hidden behind: campfire, smoke column, canvas tent, barrels, crates, rice sacks and
// a weapon rack.
//
//   npx tsx tools/world-sprites/camp.ts [previewDir]
//   CAMP_STRIPS=1 npx tsx tools/world-sprites/camp.ts [previewDir]   (also zoomed crops + frame strips)
//
// Solid props are simple 3D geometry (boxes, cylinders, slopes, faceted stones) projected with the
// map camera (57 px per meter across and up, 38 px per meter of depth, an optional yaw for the 3/4
// view) into an indexed buffer: palette + ramp step + part + depth per pixel. Faces choose their ramp
// steps from the upper-left light and from face-local coordinates, so plank seams, hoops and
// stitches follow the perspective as crisp 1 px lines. The buffer gets dark inner lines where parts
// overlap, then colors and the kit outline. Fire, glow, sparks and smoke are painted afterwards
// (no outline), and debris in the one-shot effects is re-rasterized per frame, never resampled.

import { join } from 'node:path';
import { Anim, Canvas, Color, MATERIALS, PX_PER_M, WorldSprite, fbm, hash, hex, lambert, mix, noise, preview, previewDir, ramp, withAlpha, writeGroup } from './kit';

const TAU = Math.PI * 2;
/** Screen pixels per meter of depth (ground ellipses are 2/3 as tall as wide). */
const DPM = 38;
type Pt = [number, number];
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (a: number, b: number, t: number): number => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const rnd = (seed: number, i: number, j = 0): number => hash(i * 7 + 3, j * 13 + 5, seed);
const LIGHT2: Pt = [-0.62, -0.78];

// --- palettes -------------------------------------------------------------------------------

const PAL: Color[][] = [];
function pal(r: Color[]): number {
  PAL.push(r);
  return PAL.length - 1;
}
const R = {
  wood: ramp(MATERIALS.wood),
  woodDark: ramp(MATERIALS.woodDark),
  bark: ramp(MATERIALS.bark),
  charred: ramp(MATERIALS.charred, { spread: 0.62 }),
  stone: ramp(MATERIALS.stone),
  stoneWarm: ramp(MATERIALS.stoneWarm),
  canvas: ramp(MATERIALS.canvas),
  rope: ramp(MATERIALS.rope),
  iron: ramp(MATERIALS.iron),
  red: ramp(MATERIALS.red),
  paper: ramp(MATERIALS.paper),
};
/** Flames: dark ember red, red tips, orange body, amber (kit fire), pale yellow core. */
const FIRE_R: Color[] = [hex('#3a120c'), hex('#a3261a'), hex('#ef4444'), mix(hex('#ef4444'), hex(MATERIALS.fire), 0.5), hex(MATERIALS.fire), hex('#fde68a')];
const WHITE_HOT = hex('#fffbea');
/** Smoke: a cool grey; shadows drift blue like every ramp. */
const SMOKE_R = ramp('#9c9aa2', { shift: 10 });
const SMOKE_DARK_R = ramp('#58545a', { shift: 8 });
/** Something lit by a nearby fire: the base ramp pulled toward the flame colors. */
const heated = (r: Color[], k: number): Color[] => r.map((c, i) => mix(c, FIRE_R[clamp(i + 1, 2, 5)], k));

const P = {
  wood: pal(R.wood),
  woodDark: pal(R.woodDark),
  bark: pal(R.bark),
  char: pal(R.charred),
  stone: pal(R.stone),
  stoneWarm: pal(R.stoneWarm),
  canvas: pal(R.canvas),
  rope: pal(R.rope),
  iron: pal(R.iron),
  red: pal(R.red),
  paper: pal(R.paper),
  fire: pal(FIRE_R),
  hotStone: pal(heated(R.stone, 0.32)),
  hotStoneWarm: pal(heated(R.stoneWarm, 0.32)),
  hotBark: pal(heated(R.bark, 0.3)),
  hotChar: pal(heated(R.charred, 0.3)),
  ash: pal(ramp('#8e8a88', { shift: 8 })),
  hotAsh: pal(heated(ramp('#8e8a88', { shift: 8 }), 0.35)),
  // Burlap: the canvas ramp pulled toward rope so the sacks read coarser than the tent.
  burlap: pal(R.canvas.map((c, i) => mix(c, R.rope[i], 0.45))),
  scorch: pal(R.canvas.map((c, i) => mix(c, R.woodDark[i], 0.55))),
};

// --- indexed buffer -------------------------------------------------------------------------

/** Palette + ramp step + part id + depth per pixel; turned into colors at the end. */
class Buf {
  readonly mat: Int16Array;
  readonly step: Int8Array;
  readonly part: Int16Array;
  readonly depth: Float32Array;
  constructor(readonly w: number, readonly h: number) {
    this.mat = new Int16Array(w * h).fill(-1);
    this.step = new Int8Array(w * h);
    this.part = new Int16Array(w * h).fill(-1);
    this.depth = new Float32Array(w * h);
  }
  in(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  has(x: number, y: number): boolean {
    return this.in(x, y) && this.mat[y * this.w + x] >= 0;
  }
  matAt(x: number, y: number): number {
    return this.in(x, y) ? this.mat[y * this.w + x] : -1;
  }
  stepAt(x: number, y: number): number {
    return this.in(x, y) ? this.step[y * this.w + x] : 0;
  }
  partAt(x: number, y: number): number {
    return this.in(x, y) ? this.part[y * this.w + x] : -1;
  }
  depthAt(x: number, y: number): number {
    return this.in(x, y) ? this.depth[y * this.w + x] : -Infinity;
  }
  put(x: number, y: number, mat: number, step: number, part = -1, depth = 0): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.in(x, y)) return;
    const i = y * this.w + x;
    this.mat[i] = mat;
    this.step[i] = clamp(Math.round(step), 0, 5);
    this.part[i] = part;
    this.depth[i] = depth;
  }
  /** Changes only palette and step (keeps part and depth). */
  recolor(x: number, y: number, mat: number, step: number): void {
    if (!this.has(x, y)) return;
    const i = y * this.w + x;
    this.mat[i] = mat;
    this.step[i] = clamp(Math.round(step), 0, 5);
  }
  setStep(x: number, y: number, s: number): void {
    if (this.has(x, y)) this.step[y * this.w + x] = clamp(Math.round(s), 0, 5);
  }
  shade(x: number, y: number, d: number, min = 1): void {
    if (!this.has(x, y)) return;
    const i = y * this.w + x;
    this.step[i] = clamp(this.step[i] + d, Math.min(min, this.step[i]), 5);
  }
  clear(x: number, y: number): void {
    if (this.in(x, y)) this.mat[y * this.w + x] = -1;
  }
  toCanvas(): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let i = 0; i < this.w * this.h; i++) if (this.mat[i] >= 0) c.set(i % this.w, (i / this.w) | 0, PAL[this.mat[i]][this.step[i]]);
    return c;
  }
}

/** Dark 1 px line on a back part wherever a part in front of it touches it. */
function innerLines(b: Buf, lineStep = 1, minGap = 0.5): void {
  const out: number[] = [];
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      if (!b.has(x, y)) continue;
      const p = b.partAt(x, y), d = b.depthAt(x, y);
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = b.partAt(x + ox, y + oy);
        if (q >= 0 && q !== p && b.depthAt(x + ox, y + oy) > d + minGap) {
          out.push(y * b.w + x);
          break;
        }
      }
    }
  for (const i of out) b.step[i] = Math.min(b.step[i], lineStep);
}

/** Removes single-pixel spurs and fills enclosed pinholes, so silhouettes stay clean. */
function tidy(b: Buf): void {
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const kill: number[] = [];
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      if (!b.has(x, y)) continue;
      let n = 0;
      for (const [ox, oy] of N4) if (b.has(x + ox, y + oy)) n++;
      if (n <= 1) kill.push(y * b.w + x);
    }
  for (const i of kill) b.mat[i] = -1;
  for (let y = 1; y < b.h - 1; y++)
    for (let x = 1; x < b.w - 1; x++) {
      if (b.has(x, y)) continue;
      let n = 0;
      for (const [ox, oy] of N4) if (b.has(x + ox, y + oy)) n++;
      if (n >= 4) {
        const i = (y - 1) * b.w + x;
        b.put(x, y, b.mat[i], Math.min(b.step[i], 2), b.part[i], b.depth[i]);
      }
    }
}

/** Standard finish: tidy, inner lines, colors, kit outline. */
function finish(b: Buf, o: { inner?: number; gap?: number; tidy?: boolean } = {}): Canvas {
  if (o.tidy !== false) tidy(b);
  if (o.inner !== -1) innerLines(b, o.inner ?? 1, o.gap ?? 0.5);
  const c = b.toCanvas();
  c.outline();
  return c;
}

// --- projection and faces --------------------------------------------------------------------

/** A placed object: ground origin on the work canvas plus a yaw (radians; > 0 shows the right side). */
interface View {
  ox: number;
  oy: number;
  cos: number;
  sin: number;
}
const view = (ox: number, oy: number, yaw = 0): View => ({ ox, oy, cos: Math.cos(yaw), sin: Math.sin(yaw) });
/** Object coords in meters (u right, w away from the viewer, h up) to screen pixels. */
function pr(v: View, u: number, w: number, h: number): Pt {
  const X = u * v.cos + w * v.sin, Z = u * v.sin - w * v.cos;
  return [v.ox + X * PX_PER_M, v.oy - h * PX_PER_M + Z * DPM];
}
function vec(v: View, du: number, dw: number, dh: number): Pt {
  const a = pr(v, 0, 0, 0), b = pr(v, du, dw, dh);
  return [b[0] - a[0], b[1] - a[1]];
}

/**
 * One pixel of a parallelogram face: (a, c) in [0, 1] along its two edges, plus ka / kc, the
 * screen pixels per unit a / c measured along the major axis of the iso-lines, so
 * |a - a0| * ka < 0.5 is exactly a crisp 1 px line.
 */
interface Face {
  a: number;
  c: number;
  ka: number;
  kc: number;
  x: number;
  y: number;
}
function para(o: Pt, eu: Pt, ev: Pt, fn: (f: Face) => void): void {
  const det = eu[0] * ev[1] - eu[1] * ev[0];
  if (Math.abs(det) < 1e-6) return;
  const xs = [o[0], o[0] + eu[0], o[0] + ev[0], o[0] + eu[0] + ev[0]];
  const ys = [o[1], o[1] + eu[1], o[1] + ev[1], o[1] + eu[1] + ev[1]];
  const ka = Math.abs(det) / Math.max(Math.abs(ev[0]), Math.abs(ev[1]));
  const kc = Math.abs(det) / Math.max(Math.abs(eu[0]), Math.abs(eu[1]));
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      const px = x + 0.5 - o[0], py = y + 0.5 - o[1];
      const a = (px * ev[1] - py * ev[0]) / det, c = (eu[0] * py - eu[1] * px) / det;
      if (a < -1e-6 || a > 1 + 1e-6 || c < -1e-6 || c > 1 + 1e-6) continue;
      fn({ a: clamp(a, 0, 1), c: clamp(c, 0, 1), ka, kc, x, y });
    }
}
/** Calls fn for every pixel whose center is inside the polygon. */
function poly(pts: Pt[], fn: (x: number, y: number) => void): void {
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of pts) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const cy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) fn(x, y);
  }
}

type Ink = [number, number] | null;
type FaceFn = (f: Face) => Ink;
interface BoxFaces {
  top?: FaceFn;
  front?: FaceFn;
  right?: FaceFn;
}
/**
 * A box from (u0, w0, h0) with sizes (su, sw, sh) in meters; w0 is its front. Faces get (a, c):
 * top a along u, c toward the back; front a along u, c up; right a toward the back, c up.
 */
function drawBox(b: Buf, v: View, u0: number, w0: number, h0: number, su: number, sw: number, sh: number, faces: BoxFaces, part: number, depth: number): void {
  const put = (fn: FaceFn | undefined) => (f: Face) => {
    const k = fn?.(f);
    if (k) b.put(f.x, f.y, k[0], k[1], part, depth);
  };
  if (faces.top) para(pr(v, u0, w0, h0 + sh), vec(v, su, 0, 0), vec(v, 0, sw, 0), put(faces.top));
  if (faces.front) para(pr(v, u0, w0, h0), vec(v, su, 0, 0), vec(v, 0, 0, sh), put(faces.front));
  if (faces.right && v.sin > 0) para(pr(v, u0 + su, w0, h0), vec(v, 0, sw, 0), vec(v, 0, 0, sh), put(faces.right));
}

// --- textures -------------------------------------------------------------------------------

/** Wood grain along a board: -1 for a dark streak cluster, +1 for a rare lit streak, else 0. */
function grain(along: number, across: number, seed: number, lit = true): number {
  const g = noise(along * 0.28, across * 1.3, 1, seed);
  if (g > 0.74) return -1;
  if (lit && g < 0.12) return 1;
  return 0;
}

// --- sprite assembly ------------------------------------------------------------------------

interface RawAnim {
  frames: Canvas[];
  fps: number;
  loop?: boolean;
}
/**
 * Crops every frame of every animation to the union of their opaque bounds (+1 px), so all frames
 * share one size and one anchor. (gx, gy) is the ground contact point on the work canvas.
 */
function assemble(name: string, label: string, meters: [number, number], tags: string[], anims: Record<string, RawAnim>, gx: number, gy: number): WorldSprite {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of Object.values(anims))
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
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out: Record<string, Anim> = {};
  for (const [k, a] of Object.entries(anims))
    out[k] = {
      fps: a.fps,
      loop: a.loop ?? true,
      frames: a.frames.map((f) => {
        const c = new Canvas(w, h);
        c.draw(f, -x0, -y0);
        return c;
      }),
    };
  return { name, label, meters, anchor: [Math.round(gx - x0), Math.round(gy - y0)], tags, anims: out };
}

/** Lowest opaque row of a canvas in the column band [x0, x1]. */
function lowestRow(c: Canvas, x0: number, x1: number): number {
  for (let y = c.h - 1; y >= 0; y--) for (let x = Math.max(0, x0); x <= Math.min(c.w - 1, x1); x++) if (c.alpha(x, y) > 0) return y;
  return c.h - 1;
}

/** Draws `src` over `dst` with an extra opacity. */
function blit(dst: Canvas, src: Canvas, dx = 0, dy = 0, alpha = 1): void {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c[3]) dst.plot(dx + x, dy + y, alpha >= 1 ? c : withAlpha(c, c[3] * alpha));
    }
}

// --- shared parts: stones, logs, fire, smoke ------------------------------------------------

/**
 * A faceted stone sitting on the ground at (cx, gy): a convex relief made of tilted planes, so
 * every facet is flat-shaded by the light and the silhouette is a crisp polygon.
 */
function stone(b: Buf, cx: number, gy: number, hw: number, ht: number, seed: number, part: number, depth: number, opts: { mat?: number; hot?: number; toFire?: [number, number, number]; heat?: number } = {}): void {
  const planes: [number, number, number][] = [];
  const K = 5;
  for (let i = 0; i < K; i++) {
    const psi = Math.PI * ((i + 0.5) / K) + (rnd(seed, i, 1) - 0.5) * 0.45 - 0.08;
    const s = 1.5 + rnd(seed, i, 2) * 0.9;
    planes.push([psi, s, s * (0.92 + rnd(seed, i, 3) * 0.16)]);
  }
  planes.push([0, 1.7, 1.7], [Math.PI, 1.7, 1.7]);
  // The front face: nearly toward the viewer.
  const front: [number, number, number] = [-Math.PI / 2, 0.35, 0.8 + rnd(seed, 9) * 0.15];
  planes.push(front);
  const mat = opts.mat ?? P.stone, hot = opts.hot ?? P.hotStone;
  for (let y = Math.floor(gy - ht * 1.6); y <= gy; y++)
    for (let x = Math.floor(cx - hw * 1.3); x <= Math.ceil(cx + hw * 1.3); x++) {
      const X = (x + 0.5 - cx) / hw, Yu = (gy + 1 - (y + 0.5)) / ht;
      if (Yu < 0) continue;
      let best = Infinity, bi = 0;
      planes.forEach(([psi, s, c], i) => {
        const hh = c - s * (X * Math.cos(psi) + (Yu - 0.42) * Math.sin(psi));
        if (hh < best) {
          best = hh;
          bi = i;
        }
      });
      if (best <= 0) continue;
      const [psi, s] = planes[bi];
      const nx = s * Math.cos(psi), ny = -s * Math.sin(psi) * 0.9, nz = 1;
      const nl = Math.hypot(nx, ny, nz);
      const L = lambert(nx / nl, ny / nl, nz / nl);
      let st = L > 0.9 ? 4 : L > 0.66 ? 3 : L > 0.4 ? 2 : 1;
      if (Yu < 0.22 && st > 1) st -= 1; // contact shadow at the base
      let m = mat;
      if (opts.toFire) {
        const [fx, fy, fz] = opts.toFire;
        const g = ((nx * fx + ny * fy + nz * fz) / nl) * (opts.heat ?? 1);
        if (g > 0.25) {
          m = hot;
          st = Math.min(5, st + (g > 0.62 ? 2 : 1));
        }
      }
      b.put(x, y, m, st, part, depth + Yu * 0.01);
    }
}

interface LogOpts {
  mat?: number;
  /** Char amount along the log (t = 0 at p0, 1 at p1), 0..1. */
  char?: (t: number) => number;
  /** Glowing cracks in the charred part: 0 none, 1..3 brightness. */
  glow?: number;
  /** Warm light from the flames on the upper side. */
  lit?: number;
  /** Draw the cut end face at p0 and/or p1. */
  caps?: [boolean, boolean];
  seed?: number;
  frame?: number;
}
/** A log lying from p0 to p1 (screen px), radius r, shaded as a cylinder with bark furrows. */
function log(b: Buf, p0: Pt, p1: Pt, r: number, part: number, depth: number, o: LogOpts = {}): void {
  const [x0, y0] = p0, [x1, y1] = p1;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  // Perpendicular pointing up-ish (screen y negative).
  let px = -uy, py = ux;
  if (py > 0) {
    px = -px;
    py = -py;
  }
  const seed = o.seed ?? 3;
  const mat = o.mat ?? P.bark;
  const capR = r * 0.62;
  for (let y = Math.floor(Math.min(y0, y1) - r - 2); y <= Math.ceil(Math.max(y0, y1) + r + 2); y++)
    for (let x = Math.floor(Math.min(x0, x1) - r - 2); x <= Math.ceil(Math.max(x0, x1) + r + 2); x++) {
      const vx = x + 0.5 - x0, vy = y + 0.5 - y0;
      const t = (vx * ux + vy * uy) / len;
      const q = vx * px + vy * py; // > 0 toward the upper side
      if (Math.abs(q) > r) continue;
      // Rounded ends follow the cut face ellipse.
      const s = q / r;
      const endBulge = capR * Math.sqrt(Math.max(0, 1 - s * s));
      if (t * len < -endBulge * 0 - 0.01 && !(o.caps?.[0])) continue;
      if (t < 0 && (t * len) < -endBulge) continue;
      if (t > 1 && (t - 1) * len > endBulge) continue;
      const along = t * len;
      const n3x = px * s, n3y = py * s, n3z = Math.sqrt(Math.max(0, 1 - s * s));
      const L = lambert(n3x, n3y, n3z);
      let st = L > 0.82 ? 4 : L > 0.55 ? 3 : L > 0.32 ? 2 : 1;
      const isCap = (t < 0 && o.caps?.[0]) || (t > 1 && o.caps?.[1]) ? true : false;
      const ch = o.char ? o.char(clamp(t, 0, 1)) : 0;
      let m = mat;
      if (isCap) {
        // Cut end: pale end grain with rings, bark rim.
        const ex = t < 0 ? -t * len : (t - 1) * len;
        const rr = Math.hypot(s, ex / Math.max(0.5, capR));
        if (rr > 0.78) {
          m = ch > 0.5 ? P.char : mat;
          st = 2;
        } else {
          m = ch > 0.6 ? P.char : P.wood;
          st = rr < 0.18 ? 2 : Math.abs(rr - 0.5) < 0.12 ? 3 : 4;
          if (ch > 0.6) st = rr < 0.4 ? 3 : 2;
        }
      } else {
        const furrow = noise(along * 0.45, (s + 1) * 2.2, 1, seed) > 0.68;
        if (furrow) st = Math.max(1, st - 1);
        if (ch > 0.5) {
          m = P.char;
          // Charcoal cracks into blocks: a grid of dark seams.
          const blk = Math.abs(((along + (s > 0 ? 1.5 : 0)) % 4) - 2) < 0.5 || Math.abs(s) < 0.12;
          if (blk) st = Math.max(1, st - 1);
          if (o.glow && blk && Math.abs(s) < 0.85) {
            const fl = hash(Math.floor(along / 4), s > 0 ? 1 : 0, seed + (o.frame ?? 0) * 7);
            m = P.fire;
            st = clamp(Math.round(o.glow + (fl > 0.6 ? 1 : 0) - (s < -0.4 ? 1 : 0)), 1, 4);
          } else if (o.glow && ch > 0.75 && st >= 3) {
            m = P.hotChar;
          }
        } else if (ch > 0.25) {
          m = P.char;
          st = Math.min(5, st + 1);
          if (st >= 4) st = 3;
        }
        if (o.lit && s > 0.2 && m !== P.fire) {
          m = m === P.char ? P.hotChar : P.hotBark;
          st = Math.min(5, st + (o.lit > 1 ? 1 : 0));
        }
      }
      b.put(x, y, m, st, part, depth + (isCap ? 0.2 : 0));
    }
}

/**
 * Layered flames at (cx, by) for frame f of n (a seamless loop): tongues with a wave traveling up
 * their centerline, banded by heat into red tips, orange body, amber, a yellow core and a few
 * white-hot pixels at the base.
 */
interface Tongue {
  x: number;
  h: number;
  w: number;
  ph: number;
  amp: number;
}
function flames(c: Canvas, cx: number, by: number, f: number, n: number, tongues: Tongue[], o: { lean?: number; seed?: number; white?: boolean; heatBias?: number } = {}): void {
  const ph = (f / n) * TAU;
  const seed = o.seed ?? 11;
  const heat = (x: number, y: number): number => {
    let best = 0;
    for (const tg of tongues) {
      const hh = tg.h * (1 + 0.13 * Math.sin(ph * 2 + tg.ph) + 0.06 * Math.sin(ph * 3 + tg.ph * 2));
      const s = (by - (y + 0.5)) / hh; // 0 at the base, 1 at the tip
      if (s < -0.25 || s > 1) continue;
      const wob = tg.amp * Math.pow(Math.max(0, s), 1.2) * Math.sin(TAU * 1.15 * s - ph * 2 + tg.ph) + (o.lean ?? 0) * s * s * hh;
      const ccx = cx + tg.x * (1 - 0.35 * Math.max(0, s)) + wob;
      let hw: number;
      if (s < 0) hw = tg.w * Math.sqrt(Math.max(0, 1 - (s / 0.25) ** 2));
      else hw = tg.w * Math.pow(1 - s, 0.85) * (1 + 0.12 * Math.sin(ph * 2 + tg.ph + s * 5));
      if (hw <= 0.2) continue;
      const d = Math.abs(x + 0.5 - ccx) / hw;
      if (d >= 1) continue;
      const v = (1 - d * d) * (1 - 0.72 * Math.max(0, s)) * (1 - 0.3 * Math.max(0, -s) / 0.25);
      if (v > best) best = v;
    }
    if (best <= 0) return 0;
    // Seamless edge breakup: two noise fields scrolled upward and crossfaded over the loop.
    const t = f / n;
    const sc = 10;
    const nz = noise(x, y + t * sc, 2.2, seed) * (1 - t) + noise(x, y + (t - 1) * sc, 2.2, seed) * t;
    return best + (nz - 0.5) * 0.22 + (o.heatBias ?? 0);
  };
  const maxH = Math.max(...tongues.map((t) => t.h)) * 1.25;
  const maxW = Math.max(...tongues.map((t) => Math.abs(t.x) + t.w)) + 8;
  for (let y = Math.floor(by - maxH); y <= by + 6; y++)
    for (let x = Math.floor(cx - maxW); x <= Math.ceil(cx + maxW); x++) {
      const hv = heat(x, y);
      if (hv < 0.05) continue;
      const s = (by - y) / maxH;
      let col: Color;
      if (hv > 0.86 && s < 0.32 && o.white !== false) col = WHITE_HOT;
      else if (hv > 0.66) col = FIRE_R[5];
      else if (hv > 0.46) col = FIRE_R[4];
      else if (hv > 0.25) col = FIRE_R[3];
      else if (hv > 0.11) col = FIRE_R[2];
      else col = FIRE_R[1];
      c.set(x, y, col);
    }
}

/** Rising embers: 1 px sparks drifting up and right, looping over n frames. */
function embers(c: Canvas, cx: number, by: number, f: number, n: number, count: number, rise: number, spread: number, seed: number): void {
  for (let j = 0; j < count; j++) {
    const speed = 1 + (rnd(seed, j, 1) < 0.35 ? 1 : 0);
    const p = (f / n * speed + rnd(seed, j, 2)) % 1;
    const x0 = cx + (rnd(seed, j, 3) - 0.5) * spread;
    const x = x0 + p * p * 7 + Math.sin(p * TAU + j) * 1.6;
    const y = by - p * rise;
    if (p > 0.92) continue;
    const col = p < 0.3 ? FIRE_R[5] : p < 0.62 ? FIRE_R[4] : FIRE_R[2];
    c.set(Math.round(x), Math.round(y), col);
    if (p < 0.2 && rnd(seed, j, 4) < 0.5) c.set(Math.round(x), Math.round(y) + 1, FIRE_R[3]);
  }
}

/** A cauliflower smoke puff (three lobes) shaded from the upper left, written into a step buffer. */
function puff(b: Buf, cx: number, cy: number, r: number, rot: number, part: number, depth: number, mat: number, o: { lobes?: number; minStep?: number } = {}): void {
  const lobes = o.lobes ?? 3;
  const L: [number, number, number][] = [[cx, cy, r * 0.8]];
  for (let k = 0; k < lobes; k++) {
    const a = rot + (k / lobes) * TAU;
    L.push([cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.36, r * (0.55 + 0.1 * Math.sin(k * 2.3 + rot))]);
  }
  // Lobes back to front: lower lobes in front.
  L.sort((p, q) => p[1] - q[1]);
  L.forEach(([lx, ly, lr], k) => {
    if (lr < 0.6) return;
    for (let y = Math.floor(ly - lr); y <= Math.ceil(ly + lr); y++)
      for (let x = Math.floor(lx - lr); x <= Math.ceil(lx + lr); x++) {
        const u = (x + 0.5 - lx) / lr, v = (y + 0.5 - ly) / lr;
        if (u * u + v * v > 1) continue;
        const z = Math.sqrt(1 - u * u - v * v);
        const li = lambert(u, v, z);
        const st = Math.max(o.minStep ?? 1, li > 0.86 ? 5 : li > 0.66 ? 4 : li > 0.4 ? 3 : 2);
        b.put(x, y, mat, st, part * 8 + k, depth + k * 0.01 + y * 0.0001);
      }
  });
}

/** Turns a smoke step buffer into translucent pixels: alpha from `alphaAt` (0 drops the pixel). */
function smokeToCanvas(b: Buf, ramps: Color[][], alphaAt: (x: number, y: number, step: number) => number): Canvas {
  const c = new Canvas(b.w, b.h);
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      if (!b.has(x, y)) continue;
      const st = b.stepAt(x, y);
      const a = alphaAt(x, y, st);
      if (a < 24) continue;
      c.set(x, y, withAlpha(ramps[b.matAt(x, y)][st], a));
    }
  return c;
}

// --- debris pieces --------------------------------------------------------------------------

interface Pose {
  x: number;
  y: number;
  a: number;
}
type PieceDraw = (b: Buf, s: Pose, part: number, depth: number) => void;

/** A plank (or stave) len x wid px around its center, optionally bowed, with broken ends. */
function plankPiece(len: number, wid: number, mat: number, base: number, seed: number, o: { bow?: number; jag?: number; endMat?: number; char?: number } = {}): PieceDraw {
  return (b, s, part, depth) => {
    const ca = Math.cos(s.a), sa = Math.sin(s.a);
    const litPlus = -sa * LIGHT2[0] + ca * LIGHT2[1] > 0; // does the +q edge face the light?
    const R = len / 2 + wid + 3;
    for (let y = Math.floor(s.y - R); y <= Math.ceil(s.y + R); y++)
      for (let x = Math.floor(s.x - R); x <= Math.ceil(s.x + R); x++) {
        const dx = x + 0.5 - s.x, dy = y + 0.5 - s.y;
        const t = dx * ca + dy * sa;
        let q = -dx * sa + dy * ca;
        const tt = t / (len / 2);
        q -= (o.bow ?? 0) * (1 - tt * tt);
        if (Math.abs(q) > wid / 2) continue;
        let lim = len / 2;
        if (o.jag) {
          const qi = Math.floor(q + wid);
          lim -= (t > 0 ? rnd(seed, qi, 1) : rnd(seed, qi, 2)) * o.jag;
        }
        if (Math.abs(t) > lim) continue;
        let st = base;
        const edge = wid / 2 - Math.abs(q);
        if (wid >= 3 && edge < 1) st += (q > 0) === litPlus ? 1 : -1;
        st += grain(t + seed * 3, q + seed, seed, false);
        let m = mat;
        if (o.char && Math.abs(t) > lim - o.char) m = P.char;
        if (o.endMat !== undefined && Math.abs(t) > lim - 1) {
          m = o.endMat;
          st = base + 1;
        }
        b.put(x, y, m, clamp(st, 1, 5), part, depth);
      }
  };
}
/** An iron hoop (or part of one): an elliptical ring rotated by the pose angle. */
function hoopPiece(rx: number, ry: number, th: number, arc0 = 0, arc1 = TAU, mat = P.iron): PieceDraw {
  return (b, s, part, depth) => {
    const ca = Math.cos(s.a), sa = Math.sin(s.a);
    const R = Math.max(rx, ry) + th + 2;
    for (let y = Math.floor(s.y - R); y <= Math.ceil(s.y + R); y++)
      for (let x = Math.floor(s.x - R); x <= Math.ceil(s.x + R); x++) {
        const dx = x + 0.5 - s.x, dy = y + 0.5 - s.y;
        const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
        const rho = Math.hypot(lx / rx, ly / ry);
        const rad = Math.min(rx, ry);
        if (Math.abs(rho - 1) * rad > th / 2) continue;
        let ang = Math.atan2(ly / ry, lx / rx);
        if (ang < 0) ang += TAU;
        if (arc1 - arc0 < TAU - 1e-3 && !(ang >= arc0 && ang <= arc1)) continue;
        // The upper-left outer rim catches the light.
        const out = rho > 1 ? 1 : -1;
        const wx = Math.cos(ang + s.a), wy = Math.sin(ang + s.a);
        const facing = (wx * LIGHT2[0] + wy * LIGHT2[1]) * out;
        const st = facing > 0.55 ? 4 : facing > -0.1 ? 3 : facing > -0.6 ? 2 : 1;
        b.put(x, y, mat, st, part, depth);
      }
  };
}

interface Fly {
  draw: PieceDraw;
  from: Pose;
  to: Pose;
  /** Launch and landing frames. */
  t0: number;
  t1: number;
  arc: number;
  spin: number;
  depth: number;
  bounce?: number;
}
function flyPose(fl: Fly, f: number): Pose {
  if (f <= fl.t0) return fl.from;
  if (f >= fl.t1) {
    if (fl.bounce && f === fl.t1 + 1) return { x: fl.to.x, y: fl.to.y - fl.bounce, a: fl.to.a + 0.12 };
    return fl.to;
  }
  const t = (f - fl.t0) / (fl.t1 - fl.t0);
  const e = 1 - (1 - t) * (1 - t) * 0.35 - 0.65 * (1 - t);
  return {
    x: lerp(fl.from.x, fl.to.x, Math.min(1, e * 1.05)),
    y: lerp(fl.from.y, fl.to.y, t) - fl.arc * 4 * t * (1 - t),
    a: lerp(fl.from.a, fl.to.a + fl.spin * TAU, t),
  };
}

/** Translucent dust puffs (no outline) for impacts and landings. */
function dust(c: Canvas, cx: number, cy: number, r: number, alpha: number, seed: number, count = 4): void {
  const b = new Buf(c.w, c.h);
  for (let k = 0; k < count; k++) {
    const a = (k / count) * TAU + rnd(seed, k) * 0.8;
    const rr = r * (0.45 + rnd(seed, k, 2) * 0.35);
    puff(b, cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.3 - rr * 0.4, rr, a, k, k, 0, { lobes: 2 });
  }
  const dustR = [R.stoneWarm];
  blit(c, smokeToCanvas(b, dustR, (_x, _y, st) => (st >= 4 ? alpha : alpha * 0.8)));
}

// ============================================================================================
// Campfire
// ============================================================================================

function campfire(): WorldSprite {
  const W = 110, H = 140, gx = 55, gy = 112;
  const RX = 23.5, RY = RX * (DPM / PX_PER_M);
  const N = 11;
  const stones = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * TAU + (rnd(41, i) - 0.5) * 0.25 + 0.2;
    return {
      a,
      x: gx + Math.cos(a) * RX * (0.96 + rnd(41, i, 2) * 0.08),
      y: gy + Math.sin(a) * RY,
      hw: 5.2 + rnd(41, i, 3) * 1.8,
      ht: 5.2 + rnd(41, i, 4) * 2.2 - (Math.sin(a) > 0.3 ? 0.8 : 0),
      seed: 100 + i,
    };
  });
  stones.sort((p, q) => p.y - q.y);
  const crossX = gx, crossY = gy - 3;

  type State = 'burning' | 'smolder' | 'out';
  const draw = (state: State, f: number, n: number): Canvas => {
    const ph = (f / n) * TAU;
    const flick = state === 'burning' ? 1 + 0.12 * Math.sin(ph * 2) + 0.05 * Math.sin(ph * 3 + 1) : state === 'smolder' ? 0.35 + 0.06 * Math.sin(ph) : 0;
    // Ash bed inside the ring.
    const back = new Buf(W, H);
    const ARX = RX - 3, ARY = ARX * (DPM / PX_PER_M);
    for (let y = Math.floor(gy - ARY); y <= gy + ARY; y++)
      for (let x = Math.floor(gx - ARX); x <= gx + ARX; x++) {
        const u = (x + 0.5 - gx) / ARX, v = (y + 0.5 - gy) / ARY;
        const r2 = u * u + v * v;
        if (r2 > 1) continue;
        const n1 = noise(x, y * 1.5, 2, 77);
        let m = P.ash, st = n1 > 0.62 ? 3 : n1 > 0.3 ? 2 : 1;
        if (v < -0.55) st = Math.min(st, 1);
        // Charcoal chunks.
        if (noise(x, y * 1.4, 1.4, 78) > 0.72) {
          m = P.char;
          st = 2;
          if (state !== 'out' && hash(x, y, 79 + (state === 'burning' ? f % 2 : 0)) < (state === 'burning' ? 0.55 : 0.3) && r2 < 0.6) {
            m = P.fire;
            st = state === 'burning' ? 3 : 1;
          }
        }
        if (state === 'burning' && m === P.ash && r2 < 0.75 * flick) {
          m = P.hotAsh;
          st = Math.min(5, st + 1);
        }
        back.put(x, y, m, st, 1, 0);
      }
    // Stones: back ones first, logs, then front ones.
    const drawStones = (front: boolean) =>
      stones.forEach((s, i) => {
        if ((s.y > gy) !== front) return;
        const dx = -Math.cos(s.a), dz = -Math.sin(s.a);
        const toFire: [number, number, number] = [dx * 0.75, -0.45, dz * 0.75];
        stone(back, s.x, s.y + Math.round(s.ht * 0.25), s.hw, s.ht, s.seed, 10 + i, 2 + (s.y - gy) * 0.05, state === 'out' ? {} : { toFire, heat: flick * (state === 'burning' ? 1.15 : 0.7) });
      });
    drawStones(false);
    // Crossed logs: two long ones in an X, a short one behind.
    const lit = state === 'burning' ? 1 : 0;
    const glow = state === 'burning' ? 2 : state === 'smolder' ? 1 + (f % 3 === 0 ? 1 : 0) : 0;
    const burntLen = state === 'out' ? 0.75 : 1;
    const charMid = (lo: number, hi: number) => (t: number) => (state === 'out' ? 1 : smooth(lo, hi, 1 - Math.abs(t - 0.5) * 2) * 1.0 + 0.0);
    log(back, [gx - 13, gy - 13], [gx + 10, gy - 9], 2.8, 30, 1, { char: charMid(0.2, 0.7), glow, lit, seed: 5, frame: f, caps: [false, false] });
    const L1: [Pt, Pt] = [[gx - 19 * burntLen, gy + 6], [gx + 15 * burntLen, gy - 10]];
    const L2: [Pt, Pt] = [[gx + 19 * burntLen, gy + 6], [gx - 15 * burntLen, gy - 10]];
    log(back, L1[0], L1[1], 3.4, 31, 2, { char: charMid(0.3, 0.75), glow, lit, seed: 6, frame: f, caps: [true, false] });
    log(back, [L2[0][0], L2[0][1] - 2], [L2[1][0], L2[1][1] - 2], 3.4, 32, 3, { char: charMid(0.3, 0.75), glow, lit, seed: 7, frame: f, caps: [true, false] });
    if (state === 'out') {
      // A broken charred stub in the middle.
      log(back, [gx - 4, gy - 4], [gx + 6, gy - 7], 2.4, 33, 4, { char: () => 1, seed: 8 });
    }
    const solid = finish(back);
    // Front stones go on their own layer so they sit in front of the flames.
    const frontB = new Buf(W, H);
    stones.forEach((s, i) => {
      if (s.y <= gy) return;
      const dx = -Math.cos(s.a), dz = -Math.sin(s.a);
      const toFire: [number, number, number] = [dx * 0.75, -0.6, dz * 0.75];
      stone(frontB, s.x, s.y + Math.round(s.ht * 0.25), s.hw, s.ht, s.seed, 10 + i, 2 + (s.y - gy) * 0.05, state === 'out' ? {} : { toFire, heat: flick * (state === 'burning' ? 1.15 : 0.7) });
    });
    const frontC = finish(frontB);
    const out = new Canvas(W, H);
    blit(out, solid);
    if (state === 'burning') {
      flames(out, crossX, crossY + 2, f, n, [
        { x: 0, h: 40, w: 8.5, ph: 0, amp: 2.2 },
        { x: -6.5, h: 27, w: 6, ph: 2.1, amp: 2 },
        { x: 6.5, h: 31, w: 6, ph: 4.2, amp: 2 },
        { x: -12, h: 14, w: 4, ph: 1.3, amp: 1.2 },
        { x: 11.5, h: 16, w: 4, ph: 3.3, amp: 1.2 },
      ], { lean: 0.03, seed: 21 });
      embers(out, crossX, crossY - 26, f, n, 9, 34, 16, 33);
    } else if (state === 'smolder') {
      // A thin wisp of smoke curling up from the coals.
      for (let k = 0; k < 40; k++) {
        const s = k / 40;
        const y = crossY - 4 - s * 46;
        const x = crossX + 1 + Math.sin(s * 9 - ph) * (1 + s * 2.5) + s * s * 6;
        const a = (1 - s) * 150 + 30;
        const col = withAlpha(SMOKE_R[s < 0.3 ? 3 : 4], a);
        out.plot(Math.round(x), Math.round(y), col);
        if (s > 0.25 && s < 0.85 && Math.sin(s * 7 - ph * 2) > 0.2) out.plot(Math.round(x) + 1, Math.round(y), withAlpha(SMOKE_R[2], a * 0.8));
      }
    }
    blit(out, frontC);
    return out;
  };
  const burning = Array.from({ length: 8 }, (_, f) => draw('burning', f, 8));
  const smolder = Array.from({ length: 6 }, (_, f) => draw('smolder', f, 6));
  const outF = [draw('out', 0, 1)];
  const low = lowestRow(outF[0], gx - 30, gx + 30);
  return assemble('campfire', 'Campfire', [1, 0.8], ['light-source', 'interactable'], { burning: { frames: burning, fps: 12 }, smoldering: { frames: smolder, fps: 6 }, out: { frames: outF, fps: 0 } }, gx, low);
}

// ============================================================================================
// Smoke column
// ============================================================================================

function smokeColumn(): WorldSprite {
  const W = 80, H = 140, gx = 28, gy = 134;
  const n = 8;
  const RISE = 112;
  const frames: Canvas[] = [];
  for (let f = 0; f < n; f++) {
    const b = new Buf(W, H);
    // Two chains of puffs; each puff's look depends only on its height s, so the loop is seamless.
    const chains = [
      { K: 6, speed: 1, off: 0, side: 1, size: 1 },
      { K: 6, speed: 1, off: 0.5, side: -1, size: 0.78 },
    ];
    const all: { s: number; c: number }[] = [];
    chains.forEach((ch, ci) => {
      for (let k = -1; k < ch.K; k++) {
        const s = (k + ch.off + (f / n) * ch.speed) / ch.K;
        if (s <= 0.0 || s >= 1) continue;
        all.push({ s, c: ci });
      }
    });
    // Higher (older) puffs behind newer ones.
    all.sort((p, q) => q.s - p.s);
    all.forEach(({ s, c: ci }, idx) => {
      const ch = chains[ci];
      const x = gx + 15 * Math.pow(s, 1.6) + ch.side * (2.2 + 1.6 * s) * Math.sin(s * TAU * 1.2 + ci * 2);
      const y = gy - 6 - s * RISE;
      const grow = s < 0.12 ? s / 0.12 : 1;
      const shrink = s > 0.82 ? 1 - (s - 0.82) / 0.18 * 0.55 : 1;
      const r = (4.5 + 8.5 * Math.sqrt(s)) * ch.size * grow * shrink;
      if (r < 1.2) return;
      puff(b, x, y, r, s * 7 + ci * 1.7, idx, -s * 10, ci === 0 ? 0 : 1, { minStep: 2 });
    });
    innerLines(b, 2, 0.05);
    const c = smokeToCanvas(b, [SMOKE_R, SMOKE_R], (_x, y, st) => {
      const s = (gy - y) / RISE;
      const fade = s > 0.72 ? 1 - (s - 0.72) / 0.28 : 1;
      const base = lerp(168, 112, clamp(s, 0, 1)) - (st <= 2 ? 14 : 0);
      return Math.max(0, base * (0.35 + 0.65 * fade) * (s < 0.03 ? 0.7 : 1));
    });
    frames.push(c);
  }
  return assemble('smoke', 'Smoke Column', [0.6, 2], ['ambient'], { idle: { frames, fps: 8 } }, gx, gy - 1);
}

// ============================================================================================
// Canvas tent
// ============================================================================================

function tent(): WorldSprite {
  const W = 260, H = 230;
  const gx = 128, gy = 150; // footprint center
  const L = 2.3, HW = 0.86, HT = 1.85, YAW = 0.42;
  const v = view(gx, gy, YAW);
  const draw = (burnt: boolean, f: number): Canvas => {
    const b = new Buf(W, H);
    const ridgeSag = (a: number) => (burnt ? 0.34 * Math.pow(Math.sin(Math.PI * a), 0.8) + 0.06 * Math.sin(TAU * a) : 0.07 * Math.sin(Math.PI * a));
    const frontDrop = burnt ? 0.12 : 0;
    const ridgeH = (a: number) => HT - ridgeSag(a) - frontDrop * a;
    // Near slope: a from back (0) to front (1), b from the ridge (0) down to the hem (1).
    const S = (a: number, bb: number): Pt => {
      const u = -L / 2 + a * L;
      const w = -HW * bb;
      const hemLift = 0.05 * Math.abs(Math.sin(Math.PI * a * 3)) * Math.pow(bb, 6);
      const h = ridgeH(a) * (1 - bb) + hemLift + 0.02 * Math.sin(Math.PI * bb) * Math.sin(Math.PI * a);
      return pr(v, u, w, h);
    };
    // Rasterize the slope from a fine grid (front-most sample wins), keeping (a, b) per pixel.
    const slopeA = new Float32Array(W * H).fill(-1), slopeB = new Float32Array(W * H);
    const NA = 360, NB = 240;
    for (let i = 0; i <= NA; i++)
      for (let j = 0; j <= NB; j++) {
        const a = i / NA, bb = j / NB;
        const [x, y] = S(a, bb);
        const xi = Math.floor(x), yi = Math.floor(y);
        if (xi < 0 || yi < 0 || xi >= W || yi >= H) continue;
        slopeA[yi * W + xi] = a;
        slopeB[yi * W + xi] = bb;
      }
    // Fill rare holes in the sample raster from the left neighbor.
    for (let y = 0; y < H; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (slopeA[i] < 0 && slopeA[i - 1] >= 0 && slopeA[i + 1] >= 0) {
          slopeA[i] = (slopeA[i - 1] + slopeA[i + 1]) / 2;
          slopeB[i] = (slopeB[i - 1] + slopeB[i + 1]) / 2;
        }
      }
    // Gable (front, entrance): triangle at u = L/2.
    const apex = pr(v, L / 2, 0, ridgeH(1)), gNear = pr(v, L / 2, -HW, 0), gFar = pr(v, L / 2, HW, 0);
    const gMid = pr(v, L / 2, 0, 0);
    const eu: Pt = [gFar[0] - gNear[0], gFar[1] - gNear[1]], ev: Pt = [apex[0] - gMid[0], apex[1] - gMid[1]];
    // Interior + far half of the gable first (behind the slope's front edge).
    para(gNear, eu, ev, (fc) => {
      const a = fc.a, c = fc.c;
      if (a < c / 2 || a > 1 - c / 2) return;
      const centerD = (a - 0.5) * fc.ka;
      if (a < 0.5 && !burnt) {
        // Open door: dark interior, faint light on the floor and the far wall's lower edge.
        let st = c < 0.12 ? 1 : 0;
        if (c < 0.05) st = 1;
        if (c > 0.55) st = 0;
        b.put(fc.x, fc.y, P.canvas, st, 3, 0.5);
        return;
      }
      // Closed far flap, in shadow.
      let st = 2;
      if (Math.abs(centerD) < 1) st = 1;
      if (c < 0.06) st = 1;
      const fold = Math.sin((a - 0.5) * 38 + c * 2) > 0.75 && c < 0.7;
      if (fold) st = 1;
      if (!fold && Math.sin((a - 0.5) * 38 + c * 2 + 0.9) > 0.85 && c < 0.6) st = 3;
      let m = P.canvas;
      if (burnt) {
        const ch = fbm(fc.x * 0.6, fc.y * 0.6, 8, 3, 91) + 0.25 * c;
        if (ch > 0.7) return;
        if (ch > 0.6) {
          m = P.char;
          st = 2;
        } else if (ch > 0.48) {
          m = P.scorch;
          st = Math.min(st, 2);
        } else st = Math.max(1, st - 1);
        if (a < 0.5 && c > 0.15 && c < 0.85) {
          // The door flap burnt away: dark interior with a charred floor.
          m = P.char;
          st = c < 0.1 ? 2 : 1;
        }
      }
      b.put(fc.x, fc.y, m, st, 3, 0.5);
    });
    // The near slope.
    const patches: [number, number, number, number][] = [
      [0.16, 0.42, 0.31, 0.62],
      [0.58, 0.6, 0.7, 0.8],
      [0.8, 0.2, 0.88, 0.32],
    ];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const a = slopeA[y * W + x];
        if (a < 0) continue;
        const bb = slopeB[y * W + x];
        // Pixel-scale derivatives for crisp 1 px lines.
        const da = 1 / (L * PX_PER_M * Math.cos(YAW)), dbb = 1 / ((HT * PX_PER_M) * 0.95);
        let st = 3, m = P.canvas;
        // Darker toward the hem; a soft band where the canvas sags below the ridge.
        if (bb > 0.8) st = 2;
        const sagZone = bb > 0.06 && bb < 0.3 && a > 0.25 && a < 0.8 && noise(x, y, 3, 17) > 0.45;
        if (sagZone) st = 2;
        // Ridge seam: lit crest.
        if (bb < dbb * 1.5) st = 4;
        else if (bb < dbb * 2.6) st = 2;
        // Panel seams running down the slope.
        for (const sa of [0.34, 0.67]) {
          const d = (a - sa) / da;
          if (Math.abs(d) < 0.5) st = 2;
          else if (d > 0.5 && d < 1.5 && hash(x, y, 5) < 0.55 && bb > 0.05) st = 4;
        }
        // Tension creases from the ridge ends toward the hem.
        const creases: [number, number, number, number][] = [
          [0.04, 0.05, 0.3, 0.55],
          [0.96, 0.05, 0.74, 0.5],
          [0.5, 0.12, 0.45, 0.42],
          [0.2, 0.75, 0.15, 0.98],
          [0.52, 0.72, 0.5, 0.98],
          [0.84, 0.72, 0.86, 0.98],
        ];
        for (const [a0, b0, a1, b1] of creases) {
          const ax = (a1 - a0) / da, by = (b1 - b0) / dbb;
          const len2 = ax * ax + by * by;
          const px = (a - a0) / da, py = (bb - b0) / dbb;
          const t = (px * ax + py * by) / len2;
          if (t < 0 || t > 1) continue;
          const d = (px * by - py * ax) / Math.sqrt(len2);
          if (Math.abs(d) < 0.55 && hash(Math.floor(t * 6), 0, a0 * 100) > 0.15) st = Math.min(st, 2);
          else if (d > 0.55 && d < 1.6 && t > 0.15 && t < 0.8) st = Math.max(st, 4);
        }
        // Hem: a darker band and stitched edge.
        if (bb > 1 - dbb * 2.5) st = 2;
        // Patches with stitches.
        for (const [pa0, pb0, pa1, pb1] of patches) {
          if (a < pa0 || a > pa1 || bb < pb0 || bb > pb1) continue;
          m = P.burlap;
          const ea = Math.min((a - pa0) / da, (pa1 - a) / da), eb = Math.min((bb - pb0) / dbb, (pb1 - bb) / dbb);
          st = 3;
          if ((a - pa0) / da < 1 || (bb - pb0) / dbb < 1) st = 4;
          else if (ea < 1 || eb < 1) st = 2;
          else if ((ea < 2 || eb < 2) && (x + y) % 3 === 0) st = 1;
        }
        if (burnt) {
          const ch = fbm(a * 9, bb * 6, 1.6, 3, 47) + 0.32 * (1 - bb) - 0.1 + 0.15 * Math.sin(Math.PI * a);
          if (ch > 0.78) {
            // A hole: see through near the top, dark interior lower down.
            if (bb < 0.45) continue;
            m = P.char;
            st = 1;
          } else if (ch > 0.68) {
            m = P.char;
            st = noise(x, y, 2, 3) > 0.5 ? 2 : 3;
          } else if (ch > 0.55) {
            m = P.scorch;
            st = Math.min(st, 2);
          } else if (ch > 0.45) {
            st = Math.max(1, st - 1);
          }
        }
        b.put(x, y, m, st, 4, 1 + a * 0.01);
      }
    // Ridge pole ends and the front pole.
    const poleW = 0.05;
    const front = pr(v, L / 2 + 0.07, 0, ridgeH(1) + 0.03), back = pr(v, -L / 2 - 0.07, 0, ridgeH(0) + 0.03);
    const apx = pr(v, L / 2, 0, ridgeH(1) + 0.03), bpx = pr(v, -L / 2, 0, ridgeH(0) + 0.03);
    log(b, apx, front, 1.6, 5, 2, { mat: P.woodDark, seed: 9 });
    log(b, back, bpx, 1.6, 6, 0.2, { mat: P.woodDark, seed: 10 });
    // Front pole in the doorway.
    const poleTop = pr(v, L / 2, 0, ridgeH(1)), poleBot = pr(v, L / 2, 0, 0);
    if (!burnt) {
      for (let y = Math.round(poleTop[1]); y <= Math.round(poleBot[1]); y++) {
        const t = (y - poleTop[1]) / (poleBot[1] - poleTop[1]);
        const x = Math.round(lerp(poleTop[0], poleBot[0], t));
        b.put(x - 1, y, P.woodDark, 3, 7, 0.8);
        b.put(x, y, P.woodDark, 2, 7, 0.8);
      }
    } else {
      // Charred pole, leaning.
      for (let y = Math.round(poleTop[1]); y <= Math.round(poleBot[1]); y++) {
        const t = (y - poleTop[1]) / (poleBot[1] - poleTop[1]);
        const x = Math.round(lerp(poleTop[0] + 3, poleBot[0], t));
        b.put(x - 1, y, P.char, 3, 7, 0.8);
        b.put(x, y, P.char, 2, 7, 0.8);
      }
    }
    // The open door flap: hinged on the near edge of the gable, swung out and swaying.
    if (!burnt) {
      const sway = [0, 1, 2, 1][f % 4];
      const A = pr(v, L / 2, 0, ridgeH(1) - 0.04), B = pr(v, L / 2, -HW + 0.02, 0.04);
      const C: Pt = [A[0] + 13 + sway, B[1] - 6 + sway * 0.5];
      const mid: Pt = [(A[0] + C[0]) / 2 + 3 + sway * 0.5, (A[1] + C[1]) / 2];
      const pts: Pt[] = [A, mid, C, B];
      // A curved free edge: sample the quad-bezier A -> mid -> C.
      const edge: Pt[] = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12, s = 1 - t;
        edge.push([s * s * A[0] + 2 * s * t * mid[0] + t * t * C[0], s * s * A[1] + 2 * s * t * mid[1] + t * t * C[1]]);
      }
      const flapPts: Pt[] = [...edge, [C[0] - 2, C[1] + 3], B];
      void pts;
      poly(flapPts, (x, y) => {
        // Inside of the flap faces forward-left: lit, with folds hanging from the top.
        const t = (y - A[1]) / (B[1] - A[1]);
        let st = 3;
        const fold = Math.sin((x - A[0]) * 0.9 - t * 4 + sway * 0.6);
        if (fold > 0.7) st = 2;
        else if (fold < -0.85 && t > 0.2) st = 4;
        if (t > 0.92) st = 2;
        b.put(x, y, P.canvas, st, 8, 3);
      });
      // A rope tie dangling from the flap.
      const tie = [C[0] - 2, C[1] + 1];
      for (let k = 0; k < 5; k++) b.put(Math.round(tie[0] - 1 + Math.sin(k * 0.9 + sway) * 0.6), Math.round(tie[1] + k), P.rope, k === 0 ? 3 : 2, 9, 3.1);
    } else {
      // Burnt tatters hanging from the apex.
      const A = pr(v, L / 2, 0, ridgeH(1) - 0.05);
      const tat: Pt[] = [[A[0] - 1, A[1]], [A[0] + 7, A[1] + 4], [A[0] + 5, A[1] + 12], [A[0] + 3, A[1] + 9], [A[0] + 1, A[1] + 17], [A[0] - 2, A[1] + 8]];
      poly(tat, (x, y) => b.put(x, y, P.char, (x + y) % 4 === 0 ? 3 : 2, 8, 3));
    }
    // Stakes.
    const stakes: Pt[] = [
      pr(v, L / 2 + 0.72, 0, 0),
      pr(v, -L / 2 - 0.72, 0, 0),
      pr(v, -L / 2 + 0.35, -HW - 0.3, 0),
      pr(v, L / 2 - 0.35, -HW - 0.3, 0),
    ];
    stakes.forEach(([sx, sy], i) => {
      for (let k = 0; k < 6; k++) {
        const x = Math.round(sx + (k < 3 ? 0 : 0) - k * 0.25), y = Math.round(sy - 5 + k);
        b.put(x, y, burnt && i === 0 ? P.char : P.wood, k === 0 ? 4 : 2, 20 + i, 5);
        b.put(x + 1, y, burnt && i === 0 ? P.char : P.wood, k === 0 ? 3 : 1, 20 + i, 5);
      }
    });
    const c = finish(b);
    // Guy ropes on top (no outline): front, back and two side lines.
    const ropeCol = R.rope[2], ropeLit = R.rope[3];
    const ropeLine = (p0: Pt, p1: Pt, sag: number, col: Color) => {
      const mid: Pt = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + sag];
      c.curve(p0[0], p0[1], mid[0], mid[1], p1[0], p1[1], col);
    };
    const fTop = pr(v, L / 2 + 0.06, 0, ridgeH(1) + 0.02), bTop = pr(v, -L / 2 - 0.06, 0, ridgeH(0) + 0.02);
    if (!burnt) ropeLine(fTop, [stakes[0][0], stakes[0][1] - 4], 2, ropeLit);
    else ropeLine(fTop, [fTop[0] + 4, fTop[1] + 26], 1, R.charred[3]);
    ropeLine(bTop, [stakes[1][0] + 1, stakes[1][1] - 4], burnt ? 6 : 2, ropeCol);
    const hem1 = pr(v, -L / 2 + 0.35, -HW, 0.14), hem2 = pr(v, L / 2 - 0.35, -HW, 0.14);
    ropeLine(hem1, [stakes[2][0] + 1, stakes[2][1] - 4], 1, ropeCol);
    ropeLine(hem2, [stakes[3][0] + 1, stakes[3][1] - 4], 1, ropeCol);
    return c;
  };
  const idle = [0, 1, 2, 3].map((f) => draw(false, f));
  const burnt = [draw(true, 0)];
  const low = lowestRow(idle[0], 0, W);
  return assemble('tent', 'Canvas Tent', [3, 2], ['cover-3q', 'blocks-sight', 'flammable', 'destructible', 'interactable'], { idle: { frames: idle, fps: 4 }, burnt: { frames: burnt, fps: 0 } }, gx, low);
}

// ============================================================================================
// Barrels
// ============================================================================================

interface BarrelLook {
  explosive: boolean;
  /** Belly bulge multiplier (anticipation), 1 normally. */
  swell?: number;
  /** Top shear in px (shake). */
  shear?: number;
  /** A crack on the front staves. */
  crack?: number;
  /** Light leaking through the seams just before the blast (0..1). */
  leak?: number;
}
const BAR_RB = 0.3, BAR_RE = 0.255, BAR_H = 0.9, BAR_N = 18;

/** Draws a barrel standing at (gx, gy) into the buffer. */
function barrel(b: Buf, gx: number, gy: number, o: BarrelLook, part = 1, depth = 1): void {
  const swell = o.swell ?? 1;
  const rOf = (h: number) => (BAR_RE + (BAR_RB - BAR_RE) * swell * (1 - Math.pow((2 * h) / BAR_H - 1, 2))) * (swell > 1 ? 1 + (swell - 1) * 0.3 : 1);
  const shearAt = (h: number) => (o.shear ?? 0) * (h / BAR_H);
  const hoops = o.explosive ? [0.07, 0.93] : [0.1, 0.28, 0.72, 0.9];
  const ropeBand: [number, number] = [0.27, 0.4];
  const staveMat = o.explosive ? P.red : P.wood;
  const topY = gy - BAR_H * PX_PER_M;
  // Body: per pixel, find the height h on the front surface by bisection.
  const maxR = BAR_RB * 1.15 * PX_PER_M;
  for (let y = Math.floor(topY - 14); y <= gy + 14; y++)
    for (let x = Math.floor(gx - maxR - 4); x <= Math.ceil(gx + maxR + 4); x++) {
      const F = (h: number): number => {
        const r = rOf(h) * PX_PER_M;
        const s = (x + 0.5 - gx - shearAt(h)) / r;
        if (Math.abs(s) > 1) return NaN;
        return gy - h * PX_PER_M + rOf(h) * DPM * Math.sqrt(1 - s * s) - (y + 0.5);
      };
      // F decreases with h; find the root in [0, BAR_H].
      let lo = 0, hi = BAR_H;
      const f0 = F(lo), f1 = F(hi);
      if (isNaN(f0) && isNaN(f1)) continue;
      if (!(f0 >= 0)) continue;
      if (f1 > 0) continue; // above the front rim: lid
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2;
        const fm = F(mid);
        if (isNaN(fm) || fm > 0) lo = mid;
        else hi = mid;
      }
      const h = (lo + hi) / 2;
      if (isNaN(F(h))) continue;
      const r = rOf(h);
      const s = clamp((x + 0.5 - gx - shearAt(h)) / (r * PX_PER_M), -1, 1);
      const phi = Math.asin(s);
      const hf = h / BAR_H;
      // Stave index and its flat normal.
      const sw = TAU / BAR_N;
      const k = Math.floor((phi + Math.PI) / sw + 0.5);
      const phiC = k * sw - Math.PI;
      const L = lambert(Math.sin(phiC), -0.12 * (1 - 2 * hf), Math.cos(phiC));
      let st = L > 0.8 ? 4 : L > 0.6 ? 3 : L > 0.36 ? 2 : 1;
      if (st === 4 && phi - phiC > -sw * 0.1) st = 3; // only a crest of each lit stave
      // Seams between staves, measured in screen px.
      const edgePx = Math.abs(Math.sin(phi) - Math.sin(phiC + sw / 2 * Math.sign(phi - phiC || 1))) * r * PX_PER_M;
      const seam = edgePx < 0.5;
      let m = staveMat;
      st += grain(h * PX_PER_M + k * 17, phi * 9, 60 + k, false);
      if (hf < 0.06 || hf > 0.94) st = Math.max(1, st - 1);
      if (seam) st = Math.min(st, 1);
      if (o.explosive && L > 0.72 && !seam && Math.abs(phi - phiC + sw * 0.25) < sw * 0.12 && hf > 0.5 && hf < 0.88) st = 5; // lacquer gloss
      // Hoops (raised iron): lit top row, dark bottom row.
      for (const hh of hoops) {
        const d = (h - hh * BAR_H) * PX_PER_M;
        if (Math.abs(d) < 1.6) {
          m = P.iron;
          const Li = lambert(Math.sin(phi), 0, Math.cos(phi));
          st = Li > 0.75 ? 3 : Li > 0.45 ? 2 : 1;
          if (d > 0.5) st = Math.min(5, st + 1);
          if (d < -0.6) st = 1;
          if (k % 3 === 0 && Math.abs(d) < 0.6 && Li > 0.5 && Math.abs(phi - phiC) < 0.08) st = 4; // rivet
        } else if (d < -1.6 && d > -2.6) st = Math.min(st, 2); // shadow under the hoop
      }
      if (o.explosive && hf > ropeBand[0] && hf < ropeBand[1]) {
        // Rope wrap: twisted coils.
        m = P.rope;
        const Li = lambert(Math.sin(phi), 0, Math.cos(phi));
        const coil = ((x - gx) * 0.9 + (h * PX_PER_M) * 1.6) % 3.2;
        st = Li > 0.72 ? 3 : Li > 0.4 ? 2 : 1;
        if (coil < 0.9) st = Math.max(1, st - 1);
        else if (coil > 2.4 && Li > 0.5) st = Math.min(4, st + 1);
        const rd = Math.min(Math.abs(hf - ropeBand[0]), Math.abs(hf - ropeBand[1])) * BAR_H * PX_PER_M;
        if (rd < 0.7) st = 1;
      }
      if (o.leak && seam && hf > 0.1 && hf < 0.9) {
        m = P.fire;
        st = 3 + Math.round(o.leak * 2);
      }
      b.put(x, y, m, clamp(st, 1, 5), part, depth);
    }
  // Lid: the chime (stave ends) ring, then the recessed head boards.
  const lidH = BAR_H;
  const cx = gx + shearAt(lidH), cy = gy - lidH * PX_PER_M;
  const rx = rOf(lidH) * PX_PER_M, ry = rOf(lidH) * DPM;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / rx, vv = (y + 0.5 - cy) / ry;
      const r2 = u * u + vv * vv;
      if (r2 > 1) continue;
      if (b.has(x, y) && b.partAt(x, y) === part && vv > 0.3) continue; // keep the body's front rim
      const inner = Math.hypot(u / 0.8, (vv - 0.12) / 0.78);
      let st: number, m = staveMat;
      if (inner > 1) {
        // Chime: end grain, lit on the back rim, a dark inner wall at the front.
        st = vv < 0 ? 4 : 3;
        if (u > 0.5) st = 3;
      } else {
        m = P.wood;
        // Head boards run left-right; recessed so the back edge sits in the chime's shadow.
        st = inner > 0.8 && vv < 0 ? 2 : 3;
        const board = ((vv - 0.12) / 0.78 + 1) * 3.2;
        if (Math.abs(board - Math.round(board)) * (ry * 0.78 / 3.2) < 0.5 && inner < 0.95) st = 2;
        if (u < -0.3 && vv > 0 && st === 3 && inner < 0.85) st = 4;
        if (o.explosive && Math.hypot(u - 0.3, vv - 0.15) < 0.17) {
          m = P.iron;
          st = Math.hypot(u - 0.26, vv + 0.0) < 0.1 ? 3 : 1; // bung plug
        }
      }
      b.put(x, y, m, st, part, depth + 0.01);
    }
  if (o.crack) {
    // A jagged split down a front stave.
    let x = gx - 3, y = gy - BAR_H * PX_PER_M * 0.82;
    for (let k = 0; k < o.crack; k++) {
      b.recolor(x, y, staveMat, 0);
      b.recolor(x + 1, y, staveMat, 4);
      y += 1;
      if (rnd(7, k) < 0.35) x += rnd(8, k) < 0.5 ? -1 : 1;
    }
  }
}

/** The painted flame mark of the explosive barrel (cream paint on lacquer), stamped after colors. */
const FLAME_MARK = [
  '.....#.....',
  '.....##....',
  '....###....',
  '....####...',
  '...#####.#.',
  '..######.#.',
  '..###.###..',
  '.###..####.',
  '.##....###.',
  '.##..#..##.',
  '.##.###.##.',
  '..#.###.#..',
  '..#######..',
  '...#####...',
];
function paintMark(c: Canvas, gx: number, gy: number, shear = 0): void {
  const ox = Math.round(gx - 6 + shear * 0.55), oy = Math.round(gy - BAR_H * PX_PER_M * 0.82);
  const paint = R.paper;
  FLAME_MARK.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch !== '#') return;
      const x = ox + i, y = oy + j;
      const under = c.get(x, y);
      if (!under[3]) return;
      // Paint follows the lacquer's light: lit left side, shadowed right side.
      const lum = under[0] * 0.3 + under[1] * 0.59 + under[2] * 0.11;
      const st = lum > 120 ? 4 : lum > 70 ? 3 : 2;
      c.set(x, y, mix(paint[st], under, 0.12));
    }),
  );
}

function fuse(c: Canvas, gx: number, gy: number, shear = 0): Pt {
  // A short cord from the bung, curling up and right.
  const bx = gx + 4.5 + shear, by = gy - BAR_H * PX_PER_M - 1;
  const pts: Pt[] = [];
  for (let k = 0; k <= 9; k++) {
    const t = k / 9;
    pts.push([bx + t * 4 + Math.sin(t * 3) * 1.2, by - t * 9]);
  }
  pts.forEach(([x, y], k) => {
    const col = k > 7 ? R.rope[3] : k % 2 ? R.charred[3] : R.charred[4];
    c.set(Math.round(x), Math.round(y), col);
    c.set(Math.round(x) + 1, Math.round(y), withAlpha(R.charred[1], 255));
  });
  const tip = pts[pts.length - 1];
  return [Math.round(tip[0]), Math.round(tip[1]) - 1];
}

/** A sparkling fuse tip: a hot core and rays that change every frame. */
function spark(c: Canvas, x: number, y: number, f: number, size = 1): void {
  const rays = 6;
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * TAU + f * 0.9 + rnd(5, k, f) * 0.5;
    const len = (2 + Math.floor(rnd(6, k, f) * 4)) * size;
    for (let s = 1; s <= len; s++) {
      const col = s <= 1 ? FIRE_R[5] : s <= 3 ? FIRE_R[4] : FIRE_R[3];
      if (s > 2 && (s + k) % 2 === 1 && s === len) continue;
      c.set(Math.round(x + Math.cos(a) * s), Math.round(y + Math.sin(a) * s), col);
    }
  }
  // Loose sparks flying out.
  for (let k = 0; k < 3; k++) {
    const a = rnd(9, k, f) * TAU;
    const d = 5 + rnd(10, k, f) * 4;
    c.set(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d - 1), k === 0 ? FIRE_R[5] : FIRE_R[4]);
  }
  c.set(x, y, WHITE_HOT);
  c.set(x + 1, y, WHITE_HOT);
  c.set(x, y - 1, FIRE_R[5]);
  c.set(x, y + 1, FIRE_R[4]);
  c.set(x - 1, y, FIRE_R[5]);
}

function barrelFrame(W: number, H: number, gx: number, gy: number, o: BarrelLook): Canvas {
  const b = new Buf(W, H);
  barrel(b, gx, gy, o);
  const c = finish(b);
  if (o.explosive) paintMark(c, gx, gy, o.shear ?? 0);
  return c;
}

/** Stave/hoop/lid pieces of a barrel at (gx, gy): their intact poses. */
function barrelPieces(gx: number, gy: number, explosive: boolean): { draw: PieceDraw; pose: Pose; kind: string; depth: number }[] {
  const out: { draw: PieceDraw; pose: Pose; kind: string; depth: number }[] = [];
  const mat = explosive ? P.red : P.wood;
  const midY = gy - (BAR_H * PX_PER_M) / 2;
  const nVis = 7;
  for (let k = 0; k < nVis; k++) {
    const phi = ((k + 0.5) / nVis - 0.5) * Math.PI * 0.92;
    const x = gx + Math.sin(phi) * BAR_RB * PX_PER_M * 0.92;
    const wid = Math.max(3, Math.round(Math.cos(phi) * 6));
    const L = lambert(Math.sin(phi), 0, Math.cos(phi));
    const base = L > 0.62 ? 3 : L > 0.38 ? 2 : 2;
    out.push({ draw: plankPiece(50, wid, mat, base, 200 + k, { bow: Math.sin(phi) * 1.2, jag: 2.5 }), pose: { x, y: midY + Math.cos(phi) * 4, a: Math.PI / 2 }, kind: 'stave', depth: 2 + Math.cos(phi) });
  }
  const hoopsH = explosive ? [0.07, 0.93] : [0.1, 0.28, 0.72, 0.9];
  hoopsH.forEach((hh, i) => {
    out.push({ draw: hoopPiece(BAR_RB * PX_PER_M * 0.95, BAR_RB * DPM * 0.95, 2.4, i % 2 ? 0 : 0.2, i % 2 ? TAU : TAU - 1.4), pose: { x: gx, y: gy - hh * BAR_H * PX_PER_M, a: 0 }, kind: 'hoop', depth: 3.5 });
  });
  out.push({ draw: lidPiece(BAR_RE * PX_PER_M * 0.9, BAR_RE * DPM * 0.9), pose: { x: gx, y: gy - BAR_H * PX_PER_M, a: 0 }, kind: 'lid', depth: 3.6 });
  return out;
}
function lidPiece(rx: number, ry: number): PieceDraw {
  return (b, s, part, depth) => {
    const ca = Math.cos(s.a), sa = Math.sin(s.a);
    for (let y = Math.floor(s.y - rx - 2); y <= Math.ceil(s.y + rx + 2); y++)
      for (let x = Math.floor(s.x - rx - 2); x <= Math.ceil(s.x + rx + 2); x++) {
        const dx = x + 0.5 - s.x, dy = y + 0.5 - s.y;
        const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
        const u = lx / rx, v = ly / ry;
        if (u * u + v * v > 1) continue;
        let st = 3;
        const board = (v + 1) * 1.6;
        if (Math.abs(board - Math.round(board)) * ry / 1.6 < 0.5) st = 2;
        if (u < -0.4 && v < 0.2 && st === 3) st = 4;
        b.put(x, y, P.wood, st, part, depth);
      }
  };
}

function barrelSprites(): WorldSprite[] {
  // Plain barrel.
  const W = 120, H = 110, gx = 60, gy = 92;
  const idle = barrelFrame(W, H, gx, gy, { explosive: false });
  const hit = [
    barrelFrame(W, H, gx, gy, { explosive: false, shear: -2, crack: 6 }),
    barrelFrame(W, H, gx, gy, { explosive: false, shear: 2, crack: 10 }),
    barrelFrame(W, H, gx, gy, { explosive: false, shear: -1, crack: 12 }),
    barrelFrame(W, H, gx, gy, { explosive: false, shear: 0, crack: 12 }),
  ];
  // Splinters at the impact on the first frames.
  [[0, 3], [1, 2]].forEach(([fi, nsp]) => {
    for (let k = 0; k < nsp; k++) {
      const x = gx - 2 + k * 3 + fi * 2, y = gy - 44 - k * 2 - fi * 3;
      hit[fi].set(x, y, R.wood[4]);
      hit[fi].set(x + 1, y - 1, R.wood[3]);
    }
  });
  const broken = breakBarrel(W, H, gx, gy, false);
  const low = lowestRow(idle, gx - 20, gx + 20);
  const plain = assemble('barrel', 'Barrel', [0.6, 0.9], ['cover-half', 'destructible'], { idle: { frames: [idle], fps: 0 }, hit: { frames: hit, fps: 12, loop: false }, broken: { frames: broken, fps: 12, loop: false } }, gx, low);

  // Explosive barrel on the big blast canvas.
  const EW = 220, EH = 240, egx = 110, egy = 200;
  const eIdle = barrelFrame(EW, EH, egx, egy, { explosive: true });
  const tipIdle = fuse(eIdle, egx, egy);
  void tipIdle;
  const lit = [0, 1, 2, 3].map((f) => {
    const c = barrelFrame(EW, EH, egx, egy, { explosive: true });
    const tip = fuse(c, egx, egy);
    spark(c, tip[0], tip[1], f);
    return c;
  });
  const explode = explodeBarrel(EW, EH, egx, egy);
  const elow = lowestRow(eIdle, egx - 20, egx + 20);
  const boom = assemble('barrel_explosive', 'Explosive Barrel', [0.6, 0.9], ['cover-half', 'destructible', 'explosive'], { idle: { frames: [eIdle], fps: 0 }, lit: { frames: lit, fps: 12 }, explode: { frames: explode, fps: 12, loop: false } }, egx, elow);
  return [plain, boom];
}

/** Barrel breaking apart: anticipation bulge, burst, staves and hoops fly, settle into a pile. */
function breakBarrel(W: number, H: number, gx: number, gy: number, explosive: boolean): Canvas[] {
  const frames: Canvas[] = [];
  frames.push(barrelFrame(W, H, gx, gy, { explosive, swell: 1.25, crack: 14 }));
  const pieces = barrelPieces(gx, gy, explosive);
  // Final pile layout, designed by hand: staves lie across each other, hoops flat on the ground.
  const restStaves: Pose[] = [
    { x: gx - 26, y: gy - 2, a: 0.12 },
    { x: gx - 12, y: gy + 4, a: -0.08 },
    { x: gx + 2, y: gy - 6, a: 0.32 },
    { x: gx + 12, y: gy + 2, a: -0.18 },
    { x: gx + 28, y: gy - 3, a: 0.06 },
    { x: gx - 4, y: gy + 9, a: 0.04 },
    { x: gx + 20, y: gy + 8, a: -0.1 },
  ];
  const restHoops: Pose[] = [
    { x: gx - 10, y: gy - 4, a: 0 },
    { x: gx + 16, y: gy - 6, a: 0.1 },
    { x: gx + 2, y: gy + 2, a: -0.08 },
    { x: gx - 22, y: gy + 5, a: 0.05 },
  ];
  let si = 0, hi = 0;
  const flies: Fly[] = pieces.map((p, i) => {
    if (p.kind === 'stave') {
      const to = restStaves[si++ % restStaves.length];
      const side = Math.sign(p.pose.x - gx) || (i % 2 ? 1 : -1);
      return { draw: p.draw, from: p.pose, to: { ...to, a: to.a + (side > 0 ? 0 : Math.PI) }, t0: 1, t1: 4 + (i % 3 === 0 ? 1 : 0), arc: 10 + rnd(3, i) * 12, spin: side > 0 ? 0 : 0, depth: to.y - gy + 10, bounce: 2 };
    }
    if (p.kind === 'hoop') {
      const to = restHoops[hi++ % restHoops.length];
      return { draw: p.draw, from: p.pose, to, t0: 1, t1: 5, arc: 4, spin: 0, depth: to.y - gy + 9.5, bounce: 1 };
    }
    return { draw: p.draw, from: p.pose, to: { x: gx + 34, y: gy + 6, a: 0.15 }, t0: 1, t1: 5, arc: 26, spin: 1, depth: 30, bounce: 2 };
  });
  for (let f = 1; f < 8; f++) {
    const b = new Buf(W, H);
    // Burst frame: pieces only slightly separated from the barrel.
    flies.forEach((fl, i) => {
      let pose = flyPose(fl, f);
      if (f === 1) {
        const dx = fl.from.x - gx;
        pose = { x: fl.from.x + dx * 0.25, y: fl.from.y - 3, a: fl.from.a + dx * 0.012 };
        if (fl.draw === pieces[pieces.length - 1].draw) pose = { ...fl.from, y: fl.from.y - 8 };
      }
      fl.draw(b, pose, 50 + i, f >= fl.t1 ? fl.depth : 20 + i);
    });
    const c = finish(b);
    if (f === 1) dust(c, gx, gy - 2, 18, 140, 3, 5);
    if (f === 4 || f === 5) dust(c, gx, gy + 2, 22, f === 4 ? 120 : 80, 4 + f, 5);
    // Splinters.
    if (f >= 1 && f <= 4)
      for (let k = 0; k < 8; k++) {
        const a = rnd(12, k) * Math.PI - Math.PI;
        const d = 10 + f * 9 * (0.6 + rnd(13, k) * 0.6);
        const x = gx + Math.cos(a) * d, y = gy - 26 + Math.sin(a) * d * 0.7 + f * f * 2.2;
        c.set(Math.round(x), Math.round(y), R.wood[4]);
        c.set(Math.round(x + Math.cos(a)), Math.round(y + Math.sin(a)), R.wood[2]);
      }
    frames.push(c);
  }
  return frames;
}

/** The explosive barrel blowing up (10 frames on the big canvas). */
function explodeBarrel(W: number, H: number, gx: number, gy: number): Canvas[] {
  const frames: Canvas[] = [];
  // 0: anticipation: the barrel swells and light leaks through the seams; the fuse is gone.
  {
    const c = barrelFrame(W, H, gx, gy, { explosive: true, swell: 1.12, leak: 1 });
    spark(c, gx + 5, gy - 52, 1, 0.8);
    frames.push(c);
  }
  const cy0 = gy - 26;
  // Debris flying out from the blast.
  const pieces = barrelPieces(gx, gy, true);
  const flyers: Fly[] = pieces.map((p, i) => {
    const a = -Math.PI / 2 + (i / pieces.length - 0.5) * 2.6 + (rnd(71, i) - 0.5) * 0.3;
    const dist = 55 + rnd(72, i) * 30;
    const to: Pose = { x: gx + Math.cos(a) * dist * 1.05, y: gy + (rnd(73, i) - 0.4) * 22, a: rnd(74, i) * 0.5 - 0.25 };
    return { draw: p.draw, from: { x: gx + Math.cos(a) * 10, y: cy0 + Math.sin(a) * 10, a: a }, to, t0: 2, t1: 6 + (i % 3), arc: 60 + rnd(75, i) * 50, spin: i % 2 ? 1 : -1, depth: to.y, bounce: 2 };
  });
  for (let f = 1; f < 10; f++) {
    const c = new Canvas(W, H);
    // Scorch mark on the ground from frame 3 on.
    if (f >= 3) scorch(c, gx, gy - 2, 34 + Math.min(f, 6) * 2, f);
    // Debris pieces (charred) behind the fireball while it is big, in front afterwards.
    const deb = new Buf(W, H);
    if (f >= 2)
      flyers.forEach((fl, i) => {
        const pose = flyPose(fl, f);
        fl.draw(deb, pose, 60 + i, f >= fl.t1 ? fl.depth : 30 + i);
      });
    // Char the debris.
    for (let i = 0; i < W * H; i++) if (deb.mat[i] === P.red && hash(i % W, (i / W) | 0, 5) < 0.45) deb.mat[i] = P.char;
    const debC = finish(deb);
    blast(c, gx, gy, f, debC);
    frames.push(c);
  }
  return frames;
}

/** A blackened ground mark with a few glowing cinders. */
function scorch(c: Canvas, cx: number, cy: number, r: number, f: number): void {
  const ry = r * (DPM / PX_PER_M);
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / ry;
      const d = Math.hypot(u, v) + (noise(x, y, 3, 55) - 0.5) * 0.35;
      if (d > 1) continue;
      let col = d > 0.82 ? R.charred[3] : d > 0.55 ? R.charred[2] : R.charred[1];
      if (d < 0.75 && noise(x, y * 1.3, 1.5, 56) > 0.74) col = R.charred[4];
      if (f < 8 && d < 0.6 && hash(x, y, 57 + (f % 2)) < 0.05) col = FIRE_R[f < 6 ? 4 : 3];
      c.set(x, y, withAlpha(col, d > 0.85 ? 200 : 255));
    }
}

/** Fireball, flash and smoke for blast frame f (1..9), with the debris layer composited at the right depth. */
function blast(c: Canvas, gx: number, gy: number, f: number, debris: Canvas): void {
  const cy = gy - 26;
  if (f === 1) {
    // White flash: a hot disc with rays.
    blit(c, debris);
    const R0 = 22;
    for (let y = Math.floor(cy - 60); y <= cy + 40; y++)
      for (let x = Math.floor(gx - 60); x <= gx + 60; x++) {
        const dx = x + 0.5 - gx, dy = y + 0.5 - cy;
        const d = Math.hypot(dx, dy * 1.1);
        const a = Math.atan2(dy, dx);
        const ray = Math.pow(Math.max(0, Math.cos(a * 4 + 0.4)), 18) * 34 + Math.pow(Math.max(0, Math.cos(a * 4 + 0.4 + Math.PI / 4)), 30) * 18;
        const r = R0 + ray;
        if (d > r) continue;
        const k = d / r;
        const col = k < 0.55 ? WHITE_HOT : k < 0.8 ? FIRE_R[5] : FIRE_R[4];
        if (dy > 18 && d > R0) continue;
        c.set(x, y, col);
      }
    return;
  }
  // Fireball lobes: (frame) -> center rise, radius, heat.
  const spec: Record<number, { rise: number; R: number; heat: number; smoke: number; alpha: number }> = {
    2: { rise: 14, R: 46, heat: 1.0, smoke: 0.0, alpha: 255 },
    3: { rise: 26, R: 70, heat: 0.86, smoke: 0.12, alpha: 255 },
    4: { rise: 40, R: 80, heat: 0.66, smoke: 0.35, alpha: 255 },
    5: { rise: 56, R: 82, heat: 0.44, smoke: 0.6, alpha: 255 },
    6: { rise: 74, R: 84, heat: 0.26, smoke: 0.8, alpha: 235 },
    7: { rise: 92, R: 82, heat: 0.12, smoke: 0.92, alpha: 190 },
    8: { rise: 108, R: 74, heat: 0.04, smoke: 1, alpha: 140 },
    9: { rise: 122, R: 62, heat: 0, smoke: 1, alpha: 92 },
  };
  const sp = spec[f];
  const ccx = gx, ccy = gy - sp.rise;
  // Lobes on a ring plus a core; deterministic per frame index so the shape evolves.
  const lobes: [number, number, number][] = [[ccx, ccy, sp.R * 0.62]];
  const NL = 9;
  for (let k = 0; k < NL; k++) {
    const a = (k / NL) * TAU + 0.3 + f * 0.05;
    const rr = sp.R * (0.42 + 0.1 * rnd(81, k));
    const dist = sp.R * (0.5 + 0.12 * rnd(82, k)) * (1 + (f - 2) * 0.03);
    lobes.push([ccx + Math.cos(a) * dist, ccy + Math.sin(a) * dist * 0.72 + (Math.sin(a) > 0.5 ? -sp.R * 0.1 : 0), rr]);
  }
  // A ground-hugging skirt of dust and smoke.
  const skirt = f >= 3 && f <= 7;
  // Heat + smoke field.
  const fireB = new Buf(c.w, c.h);
  const SM = 0, FI = 1;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      let best = 0, li = -1;
      lobes.forEach(([lx, ly, lr], k) => {
        const d = Math.hypot(x + 0.5 - lx, (y + 0.5 - ly) * 1.05) / lr;
        if (d < 1) {
          const v = 1 - d;
          if (v > best) {
            best = v;
            li = k;
          }
        }
      });
      let inSkirt = false;
      if (skirt) {
        const sr = 50 + (f - 3) * 16, sry = 9 + (f - 3) * 1.5;
        const u = (x + 0.5 - gx) / sr, v = (y + 0.5 - (gy - sry * 0.4)) / sry;
        if (u * u + v * v < 1 && noise(x, y, 4, 90 + f) > 0.3) inSkirt = true;
      }
      if (li < 0 && !inSkirt) continue;
      const nz = noise(x, y, 3, 100 + f) - 0.5;
      // Distance from the fireball center drives the heat; the outside cools into smoke.
      const dc = Math.hypot(x + 0.5 - ccx, (y + 0.5 - ccy) * 1.05) / (sp.R * 1.25);
      const heat = (1 - dc) * 1.35 * sp.heat + nz * 0.3 + (li >= 0 ? best * 0.25 : 0);
      if (li < 0) {
        fireB.put(x, y, SM, 3, 900, 0);
        continue;
      }
      // Smoke lobes: shaded spheres; fire: banded by heat.
      const [lx, ly, lr] = lobes[li];
      const u = (x + 0.5 - lx) / lr, v = (y + 0.5 - ly) / lr;
      const z = Math.sqrt(Math.max(0, 1 - u * u - v * v));
      const lit = lambert(u, v, z);
      const smokeThresh = sp.smoke;
      if (heat < smokeThresh * 0.9 + 0.08 || (sp.heat === 0)) {
        const st = lit > 0.82 ? 4 : lit > 0.56 ? 3 : lit > 0.32 ? 2 : 1;
        fireB.put(x, y, SM, st, li, li * 0.1);
      } else {
        const hv = heat - smokeThresh * 0.9;
        const st = hv > 0.75 ? 6 : hv > 0.55 ? 5 : hv > 0.36 ? 4 : hv > 0.2 ? 3 : 2;
        fireB.put(x, y, FI, st > 5 ? 5 : st, li, li * 0.1);
        if (st > 5) fireB.step[y * c.w + x] = 6 as never;
      }
    }
  // Smoke separation lines between lobes (lower right of each lobe overlap).
  const lay = new Canvas(c.w, c.h);
  const smokeRamp = f <= 6 ? SMOKE_DARK_R : SMOKE_R;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (!fireB.has(x, y)) continue;
      const m = fireB.matAt(x, y), st = fireB.stepAt(x, y);
      if (m === SM) {
        let s2 = st;
        const p = fireB.partAt(x, y);
        // Inner line where a different lobe sits up-left of this pixel.
        const q = fireB.partAt(x - 1, y - 1);
        if (q >= 0 && q !== p && fireB.matAt(x - 1, y - 1) === SM && q > p) s2 = Math.max(1, s2 - 1);
        const glowNear = sp.heat > 0.1 && fireB.matAt(x, y + 2) === FI;
        let col = glowNear ? mix(smokeRamp[s2], FIRE_R[2], 0.35) : smokeRamp[s2];
        if (f <= 5 && (hash(x, y, 300 + f) < 0.015 * (6 - f))) col = FIRE_R[4];
        lay.set(x, y, withAlpha(col, sp.alpha * (st <= 1 ? 0.92 : 1)));
      } else {
        const col = st >= 6 ? WHITE_HOT : FIRE_R[st];
        lay.set(x, y, col);
      }
    }
  // Debris is in front of the fireball once it starts to fall.
  if (f <= 4) {
    blit(c, debris);
    blit(c, lay);
  } else {
    blit(c, lay);
    blit(c, debris);
  }
  // Embers flung out.
  if (f >= 2 && f <= 7)
    for (let k = 0; k < 18; k++) {
      const a = rnd(400, k) * TAU;
      const d = sp.R * (0.9 + rnd(401, k) * 0.6) * (0.6 + f * 0.08);
      const x = gx + Math.cos(a) * d, y = cy - sp.rise * 0.6 + Math.sin(a) * d * 0.8 + (f - 2) * (f - 2) * 1.5;
      if (y > gy + 6) continue;
      c.set(Math.round(x), Math.round(y), f < 5 ? FIRE_R[5] : FIRE_R[3]);
      if (f < 4) c.set(Math.round(x - Math.cos(a)), Math.round(y - Math.sin(a)), FIRE_R[3]);
    }
}

// ============================================================================================
// Crates
// ============================================================================================

interface CrateOpts {
  brace?: 'diag' | 'x' | 'none';
  seed?: number;
  /** Squash for the anticipation frame. */
  squash?: number;
  crack?: boolean;
}
/** One crate face: a frame of battens, horizontal boards between them, an optional brace. */
function crateFace(f: Face, Wm: number, Hm: number, base: number, frameStep: number, brace: 'diag' | 'x' | 'none', seed: number, lit: boolean): Ink {
  const bw = 0.085; // batten width in meters
  const U = f.a * Wm, V = f.c * Hm;
  // Signed screen-px distances from the batten inner edges (> 0 inside the board field).
  const dl = (f.a - bw / Wm) * f.ka, dr = (1 - bw / Wm - f.a) * f.ka;
  const db = (f.c - bw / Hm) * f.kc, dt = (1 - bw / Hm - f.c) * f.kc;
  const onFrame = dl < 0 || dr < 0 || db < 0 || dt < 0;
  const m = P.wood;
  if (onFrame) {
    let st = frameStep;
    // Lit outer top edge and inner edges that face the light; corner joints.
    if ((1 - f.c) * f.kc < 1 && lit) st = frameStep + 1;
    else if (dr < 0 && dr > -1 && db > 0 && dt > 0) st = frameStep + 1;
    else if (db < 0 && db > -1 && dl > 0 && dr > 0) st = frameStep + 1;
    else if (f.c * f.kc < 1) st = frameStep - 1;
    // Butt joints: the vertical battens run full height, the horizontal ones stop at them.
    if ((dl < 0 || dr < 0) && (db < 0 || dt < 0)) {
      if (Math.abs(dl) < 0.6 && dl < 0 || Math.abs(dr) < 0.6 && dr < 0) st = frameStep;
    } else if ((db < 0 || dt < 0) && (Math.abs(dl) < 0.5 || Math.abs(dr) < 0.5)) st = frameStep - 1;
    st += grain(U * PX_PER_M + V * 3, V * PX_PER_M, seed + 1, lit);
    return [m, clamp(st, 1, 5)];
  }
  let st = base;
  // Boards: three per face, dark seams.
  const inner = Hm - 2 * bw;
  const nb = 3;
  for (let k = 1; k < nb; k++) {
    const cK = (bw + (inner * k) / nb) / Hm;
    const d = (f.c - cK) * f.kc;
    if (Math.abs(d) < 0.5) st = Math.min(base - 1, 1);
    else if (d < -0.5 && d > -1.5 && lit) st = base; // board top edges stay plain
  }
  st += grain(U * PX_PER_M, V * PX_PER_M + seed * 5, seed, lit);
  // Cast shadow of the frame on the recessed boards (light from the upper left).
  if ((dl >= 0 && dl < 1) || (dt >= 0 && dt < 1)) st = 1;
  // Brace(s), raised like the frame.
  const braceLine = (x0: number, y0: number, x1: number, y1: number): Ink => {
    // In meters on the face; distance measured in face meters then scaled to px.
    const ax = x1 - x0, ay = y1 - y0, l = Math.hypot(ax, ay);
    const d = ((U - x0) * ay - (V - y0) * ax) / l; // > 0 below-right of the line (V up)
    const half = bw * 0.5;
    const pxPerM = PX_PER_M * Math.min(f.ka / (1 / Wm) / PX_PER_M, 1);
    void pxPerM;
    if (Math.abs(d) <= half) {
      let s2 = frameStep;
      if (d < -half + 0.018) s2 = frameStep + (lit ? 1 : 0);
      else if (d > half - 0.018) s2 = frameStep - 1;
      s2 += grain((U + V) * PX_PER_M * 0.7, d * PX_PER_M, seed + 9, lit);
      return [m, clamp(s2, 1, 5)];
    }
    if (d > half && d < half + 0.022) return [m, 1];
    return null;
  };
  if (brace !== 'none') {
    const r1 = braceLine(bw, bw, Wm - bw, Hm - bw);
    if (r1) return r1;
    if (brace === 'x') {
      const r2 = braceLine(bw, Hm - bw, Wm - bw, bw);
      if (r2) return r2;
    }
  }
  return [m, clamp(st, 1, 5)];
}

/** Crate top: boards running left-right with dark seams, lit front and left edges. */
function crateTop(f: Face, Wm: number, Dm: number, seed: number): Ink {
  let st = 3;
  const nb = 4;
  for (let k = 1; k < nb; k++) if (Math.abs((f.c - k / nb) * f.kc) < 0.5) st = 1;
  if (f.c * f.kc < 1 || f.a * f.ka < 1) st = 4;
  else if ((1 - f.a) * f.ka < 1 || (1 - f.c) * f.kc < 1) st = 2;
  else st += grain(f.a * Wm * PX_PER_M, f.c * Dm * PX_PER_M * 1.4 + seed, seed + 3, true);
  return [P.wood, clamp(st, 1, 5)];
}

/** Draws one crate (size S m, yaw) with its footprint centered at (cx, cy) on the ground. */
function crate(b: Buf, cx: number, cy: number, S: number, yaw: number, o: CrateOpts, part: number, depth: number, h0 = 0): void {
  const v = view(cx, cy, yaw);
  const sq = o.squash ?? 0;
  const sh = S * (1 - sq), su = S * (1 + sq * 0.5);
  const seed = o.seed ?? 1;
  drawBox(b, v, -su / 2, -S / 2, h0, su, S, sh, {
    top: (f) => crateTop(f, su, S, seed),
    front: (f) => crateFace(f, su, sh, 3, 3, o.brace ?? 'diag', seed, true),
    right: (f) => crateFace(f, S, sh, 2, 2, 'none', seed + 4, false),
  }, part, depth);
  // Nail heads on the frame corners of the front face.
  const bw = 0.085 / 2;
  const nails: [number, number][] = [[bw, bw], [su - bw, bw], [bw, sh - bw], [su - bw, sh - bw], [su / 2, sh - bw], [su / 2, bw]];
  for (const [nu, nh] of nails) {
    const [x, y] = pr(v, -su / 2 + nu, -S / 2, h0 + nh);
    b.recolor(Math.floor(x), Math.floor(y), P.iron, 4);
    b.recolor(Math.floor(x) + 1, Math.floor(y), P.iron, 1);
  }
  if (o.crack) {
    const [x0, y0] = pr(v, -su / 2 + su * 0.55, -S / 2, h0 + sh * 0.7);
    let x = Math.floor(x0), y = Math.floor(y0);
    for (let k = 0; k < 13; k++) {
      b.recolor(x, y, P.wood, 0);
      x += k % 3 === 2 ? 1 : 0;
      y += 1;
      if (k % 4 === 1) x -= 1;
    }
  }
}

function crateSprites(): WorldSprite[] {
  const S = 0.8, YAW = 0.38;
  const W = 140, H = 130, gx = 70, gy = 100;
  const one = (o: CrateOpts): Canvas => {
    const b = new Buf(W, H);
    crate(b, gx, gy, S, YAW, o, 1, 1);
    return finish(b);
  };
  const idle = one({ brace: 'diag', seed: 3 });
  const broken = breakCrate(W, H, gx, gy, S, YAW);
  const low = lowestRow(idle, 0, W);
  const crateS = assemble('crate', 'Wooden Crate', [0.8, 0.8], ['cover-half', 'destructible', 'climbable'], { idle: { frames: [idle], fps: 0 }, broken: { frames: broken, fps: 12, loop: false } }, gx, low);

  // Stack: two crates side by side and a smaller one on top.
  const SW = 200, SH = 200, sgx = 100, sgy = 160;
  const b = new Buf(SW, SH);
  const v = view(sgx, sgy, YAW);
  const S1 = 0.82, S2 = 0.84, S3 = 0.66;
  const c1 = pr(v, -0.45, 0.06, 0), c2 = pr(v, 0.44, -0.04, 0);
  crate(b, c1[0], c1[1], S1, YAW, { brace: 'x', seed: 11 }, 1, 1);
  crate(b, c2[0], c2[1], S2, YAW, { brace: 'diag', seed: 12 }, 2, 2);
  const c3 = pr(v, -0.2, 0.02, 0);
  crate(b, c3[0], c3[1], S3, YAW - 0.18, { brace: 'diag', seed: 13 }, 3, 3, Math.max(S1, S2) - 0.01);
  const stack = finish(b);
  const slow = lowestRow(stack, 0, SW);
  const stackS = assemble('crate_stack', 'Stacked Crates', [1.75, 1.6], ['cover-3q', 'blocks-sight', 'destructible', 'climbable'], { idle: { frames: [stack], fps: 0 } }, sgx, slow);
  return [crateS, stackS];
}

/** Crate breaking: squash, burst, boards fly and settle into a pile. */
function breakCrate(W: number, H: number, gx: number, gy: number, S: number, yaw: number): Canvas[] {
  const frames: Canvas[] = [];
  {
    const b = new Buf(W, H);
    crate(b, gx, gy, S, yaw, { brace: 'diag', seed: 3, squash: 0.08, crack: true }, 1, 1);
    frames.push(finish(b));
  }
  const v = view(gx, gy, yaw);
  const SPX = S * PX_PER_M;
  // Pieces: front boards, battens, side boards and top boards, with their intact poses.
  type P0 = { draw: PieceDraw; pose: Pose; rest: Pose; arc: number; t1: number };
  const ps: P0[] = [];
  const front = (hm: number): Pt => pr(v, 0, -S / 2, hm);
  const ang = Math.atan2(vec(v, 1, 0, 0)[1], vec(v, 1, 0, 0)[0]);
  const rests: Pose[] = [
    { x: gx - 30, y: gy + 2, a: 0.1 },
    { x: gx - 6, y: gy + 8, a: -0.06 },
    { x: gx + 22, y: gy + 4, a: 0.22 },
    { x: gx + 4, y: gy - 6, a: -0.3 },
    { x: gx + 34, y: gy - 6, a: 0.05 },
    { x: gx - 24, y: gy - 8, a: -0.15 },
    { x: gx + 10, y: gy + 13, a: 0.08 },
    { x: gx - 16, y: gy + 12, a: 0.3 },
    { x: gx + 30, y: gy + 14, a: -0.1 },
    { x: gx - 38, y: gy + 9, a: 1.3 },
  ];
  let ri = 0;
  for (let k = 0; k < 3; k++) {
    const [x, y] = front(0.17 + k * 0.23);
    ps.push({ draw: plankPiece(SPX * Math.cos(yaw) - 2, 10, P.wood, 3, 300 + k, { jag: 3 }), pose: { x: x, y: y, a: ang }, rest: rests[ri++], arc: 18 + k * 6, t1: 4 + (k % 2) });
  }
  for (let k = 0; k < 2; k++) {
    const [x, y] = front(k ? S - 0.04 : 0.04);
    ps.push({ draw: plankPiece(SPX * Math.cos(yaw), 5, P.wood, 3, 310 + k, { jag: 1.5 }), pose: { x, y, a: ang }, rest: rests[ri++], arc: 24 - k * 10, t1: 4 });
  }
  {
    const [x, y] = front(S / 2);
    ps.push({ draw: plankPiece(SPX * 1.15, 5, P.wood, 3, 320, { jag: 2 }), pose: { x, y, a: ang - 0.85 }, rest: rests[ri++], arc: 30, t1: 5 });
  }
  for (let k = 0; k < 3; k++) {
    const p = pr(v, S / 2, 0, 0.17 + k * 0.23);
    const sang = Math.atan2(vec(v, 0, 1, 0)[1], vec(v, 0, 1, 0)[0]);
    ps.push({ draw: plankPiece(S * 0.42 * PX_PER_M, 8, P.wood, 2, 330 + k, { jag: 2 }), pose: { x: p[0], y: p[1], a: sang }, rest: rests[ri++ % rests.length], arc: 14, t1: 4 + k % 2 });
  }
  for (let k = 0; k < 2; k++) {
    const p = pr(v, 0, -0.2 + k * 0.4, S);
    ps.push({ draw: plankPiece(SPX * Math.cos(yaw), 8, P.wood, 3, 340 + k, { jag: 2 }), pose: { x: p[0], y: p[1], a: ang }, rest: { x: gx - 10 + k * 30, y: gy - 14 + k * 4, a: 0.05 - k * 0.12 }, arc: 34 + k * 8, t1: 5 });
  }
  const flies: Fly[] = ps.map((p, i) => ({ draw: p.draw, from: p.pose, to: p.rest, t0: 1, t1: p.t1, arc: p.arc, spin: 0, depth: p.rest.y - gy + 20, bounce: 2 }));
  for (let f = 1; f < 7; f++) {
    const b = new Buf(W, H);
    flies.forEach((fl, i) => {
      let pose = flyPose(fl, f);
      if (f === 1) {
        const dx = fl.from.x - gx, dy = fl.from.y - (gy - 30);
        pose = { x: fl.from.x + dx * 0.18, y: fl.from.y + dy * 0.12 - 3, a: fl.from.a + (i % 2 ? 0.1 : -0.1) };
      }
      fl.draw(b, pose, 40 + i, f >= fl.t1 ? fl.depth : 10 + i);
    });
    const c = finish(b);
    if (f === 1) dust(c, gx, gy - 6, 22, 150, 21, 6);
    if (f === 4 || f === 5) dust(c, gx, gy + 4, 28, f === 4 ? 120 : 80, 22 + f, 6);
    if (f >= 1 && f <= 3)
      for (let k = 0; k < 10; k++) {
        const a = rnd(31, k) * Math.PI - Math.PI;
        const d = 12 + f * 10 * (0.6 + rnd(32, k) * 0.6);
        const x = gx + Math.cos(a) * d, y = gy - 28 + Math.sin(a) * d * 0.7 + f * f * 2.5;
        c.set(Math.round(x), Math.round(y), R.wood[4]);
        c.set(Math.round(x + Math.cos(a)), Math.round(y + Math.sin(a)), R.wood[2]);
      }
    frames.push(c);
  }
  return frames;
}

// ============================================================================================
// Rice sacks
// ============================================================================================

interface Sack {
  x: number;
  y: number;
  len: number;
  th: number;
  ang: number;
  tie: 1 | -1;
  seed: number;
  stamp?: boolean;
}
/** A lying burlap sack: a soft superellipse body, a pinched neck with a rope tie and a frayed tuft. */
function sack(b: Buf, s: Sack, part: number, depth: number): void {
  const ca = Math.cos(s.ang), sa = Math.sin(s.ang);
  const R = s.len + 14;
  for (let y = Math.floor(s.y - R); y <= Math.ceil(s.y + R); y++)
    for (let x = Math.floor(s.x - R); x <= Math.ceil(s.x + R); x++) {
      const dx = x + 0.5 - s.x, dy = y + 0.5 - s.y;
      const t = (dx * ca + dy * sa) * s.tie; // along, toward the tie
      const q = -dx * sa + dy * ca; // across (down positive)
      // Body: superellipse; it slumps (flatter bottom) and narrows toward the neck.
      const taper = t > 0 ? 1 - 0.32 * Math.pow(t / s.len, 3) : 1 - 0.06 * Math.pow(-t / s.len, 4);
      const hy = s.th * taper * (q > 0 ? 1.0 : 1.05);
      const u = t / s.len, v = q / hy;
      const body = Math.pow(Math.abs(u), 2.6) + Math.pow(Math.abs(v), q > 0 ? 3.2 : 2.2);
      let inside = body <= 1;
      let zone: 'body' | 'neck' | 'tuft' = 'body';
      // Neck and tuft beyond the tied end.
      const neckT = t - s.len * 0.92;
      if (!inside && neckT > -2 && neckT < 5 && Math.abs(q) < 2.6 + Math.max(0, -neckT) * 0.8) {
        inside = true;
        zone = 'neck';
      }
      if (!inside && neckT >= 4 && neckT < 11) {
        const k = (neckT - 4) / 7;
        const half = 2.5 + k * 5.5;
        const fringe = (Math.floor(q + 20) % 2 === 0 ? 1 : 0) + rnd(s.seed, Math.floor(q + 20)) * 2;
        if (Math.abs(q) < half && neckT < 11 - fringe) {
          inside = true;
          zone = 'tuft';
        }
      }
      if (!inside) continue;
      let m = P.burlap, st: number;
      if (zone === 'body') {
        // Height field normal of a soft lump, light from the upper left.
        const gu = Math.sign(u) * 2.6 * Math.pow(Math.abs(u), 1.6);
        const gv = Math.sign(v) * (q > 0 ? 3.2 : 2.2) * Math.pow(Math.abs(v), q > 0 ? 2.2 : 1.2);
        const nAlong = gu * 0.55, nAcross = gv * 0.9;
        let nx = (nAlong * ca * s.tie - nAcross * sa), ny = (nAlong * sa * s.tie + nAcross * ca);
        const nz = 1;
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl;
        ny /= nl;
        const L = lambert(nx, ny, nz / nl);
        st = L > 0.86 ? 4 : L > 0.62 ? 3 : L > 0.36 ? 2 : 1;
        // Folds radiating from the neck.
        if (t > s.len * 0.35) {
          const fa = Math.atan2(q, s.len * 1.05 - t);
          const fold = Math.sin(fa * 9 + s.seed);
          if (fold > 0.82) st = Math.max(1, st - 1);
          else if (fold < -0.9 && st >= 2) st = Math.min(4, st + 1);
        }
        // A slump crease along the lower body.
        if (Math.abs(v - 0.55) < 0.07 && Math.abs(u) < 0.55) st = Math.max(1, st - 1);
        // Burlap weave: sparse short dark dashes.
        if (hash(Math.floor(x / 2), y, s.seed) < 0.1 && st >= 2) st -= 1;
        if (s.stamp && Math.abs(Math.hypot(t + s.len * 0.15, q * 1.2 - 1) - 5.5) < 0.9 && noise(x, y, 1.5, 9) > 0.32) {
          m = P.red;
          st = 1;
        }
        if (s.stamp && Math.abs(t + s.len * 0.15) < 0.6 && Math.abs(q * 1.2 - 1) < 3.5 && noise(x, y, 1.5, 9) > 0.32) {
          m = P.red;
          st = 1;
        }
      } else if (zone === 'neck') {
        m = P.rope;
        const wrap = ((t + q * 0.6) % 2.4 + 2.4) % 2.4;
        st = wrap < 1 ? 2 : 3;
        if (q < -1.5) st = 4;
        if (q > 1.5) st = 1;
      } else {
        const k = (neckT - 4) / 7;
        st = q < 0 ? 3 : 2;
        if (Math.floor(q + 20) % 3 === 0) st = 2;
        if (k > 0.8) st = Math.min(st, 2);
      }
      b.put(x, y, m, clamp(st, 1, 5), part, depth);
    }
}

function sacks(): WorldSprite {
  const W = 110, H = 80, gx = 55, gy = 66;
  const b = new Buf(W, H);
  const list: Sack[] = [
    { x: gx - 13, y: gy - 13, len: 20, th: 10, ang: -0.04, tie: -1, seed: 1 },
    { x: gx + 13, y: gy - 10, len: 21, th: 10.5, ang: 0.05, tie: 1, seed: 2, stamp: true },
    { x: gx - 1, y: gy - 27, len: 19, th: 9.5, ang: -0.14, tie: 1, seed: 3 },
  ];
  list.forEach((s, i) => sack(b, s, i + 1, i + 1));
  const c = finish(b);
  const low = lowestRow(c, 0, W);
  return assemble('sacks', 'Rice Sacks', [1.2, 0.6], ['cover-half'], { idle: { frames: [c], fps: 0 } }, gx, low);
}

// ============================================================================================
// Weapon rack
// ============================================================================================

/** A straight shaft (spear, staff) from p0 (butt) to p1, cylinder-shaded, 2 px wide. */
function shaft(b: Buf, p0: Pt, p1: Pt, mat: number, part: number, depth: number, wid = 2): void {
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const n = Math.ceil(len * 2);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = lerp(p0[0], p1[0], t), y = lerp(p0[1], p1[1], t);
    for (let k = 0; k < wid; k++) {
      const st = k === 0 ? 3 : k === wid - 1 ? 2 : 3;
      b.put(Math.floor(x) + k, Math.floor(y), mat, st + (k === 0 && hash(Math.floor(y / 3), 0, part) < 0.3 ? 1 : 0), part, depth);
    }
  }
}

function weaponRack(): WorldSprite {
  const W = 120, H = 130, gx = 60, gy = 112;
  const b = new Buf(W, H);
  const YAW = 0.22;
  const v = view(gx, gy, YAW);
  const post = 0.08;
  const wood = (base: number) => (f: Face): Ink => {
    let st = base;
    if (f.a * f.ka < 1) st = base + 1;
    st += grain(f.c * 80, f.a * 6, base * 7 + Math.round(f.a * 3), true);
    return [P.woodDark, clamp(st, 1, 5)];
  };
  const woodH = (base: number) => (f: Face): Ink => {
    let st = base;
    if ((1 - f.c) * f.kc < 1) st = base + 1;
    else if (f.c * f.kc < 1) st = base - 1;
    st += grain(f.a * 70, f.c * 5, 13, true);
    return [P.woodDark, clamp(st, 1, 5)];
  };
  const topF = (f: Face): Ink => [P.woodDark, f.c * f.kc < 1 ? 4 : 3];
  // Feet (runners into depth), posts, rails, top beam.
  for (const u of [-0.5, 0.5]) drawBox(b, v, u - 0.05, -0.24, 0, 0.1, 0.48, 0.07, { top: topF, front: woodH(2), right: woodH(1) }, 1, 0.5);
  for (const u of [-0.5, 0.5]) drawBox(b, v, u - post / 2, -post / 2, 0.07, post, post, 1.33, { top: topF, front: wood(2), right: wood(1) }, 2, 1);
  drawBox(b, v, -0.5, -0.07, 0.3, 1.0, 0.05, 0.06, { top: topF, front: woodH(3), right: woodH(1) }, 3, 1.5);
  drawBox(b, v, -0.5, -0.07, 0.95, 1.0, 0.05, 0.05, { top: topF, front: woodH(3), right: woodH(1) }, 3, 1.5);
  // Top beam with flared ends (kasagi-like), slightly curved up.
  drawBox(b, v, -0.66, -0.06, 1.38, 1.32, 0.12, 0.08, { top: topF, front: woodH(3), right: woodH(1) }, 4, 1.6);
  for (const s of [-1, 1]) {
    const [x, y] = pr(v, s * 0.66, -0.06, 1.46);
    b.put(Math.round(x) + (s < 0 ? 0 : -1), Math.round(y) - 1, P.woodDark, 3, 4, 1.6);
    b.put(Math.round(x) + (s < 0 ? 1 : -2), Math.round(y) - 1, P.woodDark, 3, 4, 1.6);
  }
  // Weapons in front of the rails, leaning a touch.
  const butt = (u: number) => pr(v, u, -0.14, 0.08);
  const top = (u: number, h: number) => pr(v, u + 0.02, -0.1, h);
  // Spear 1: leaf blade.
  const s1b = butt(-0.3), s1t = top(-0.3, 1.38);
  shaft(b, s1b, s1t, P.wood, 10, 3);
  spearHead(b, s1t, 'leaf', 11, 3.1);
  // Bo staff.
  const bob = butt(0.0), bot = top(0.0, 1.5);
  shaft(b, bob, bot, P.woodDark, 12, 3);
  for (const p of [bob, bot]) {
    b.put(Math.floor(p[0]), Math.floor(p[1]), P.iron, 3, 12, 3.05);
    b.put(Math.floor(p[0]) + 1, Math.floor(p[1]), P.iron, 2, 12, 3.05);
  }
  // Spear 2: cross blade.
  const s2b = butt(0.28), s2t = top(0.28, 1.32);
  shaft(b, s2b, s2t, P.wood, 13, 3);
  spearHead(b, s2t, 'cross', 14, 3.1);
  // Rope ties on the top beam.
  for (const u of [-0.3, 0.0, 0.28]) {
    const [x, y] = pr(v, u + 0.02, -0.12, 1.42);
    for (let k = -1; k <= 2; k++) {
      b.put(Math.floor(x) + k, Math.floor(y), P.rope, k < 1 ? 3 : 2, 15, 3.2);
      b.put(Math.floor(x) + k, Math.floor(y) + 2, P.rope, k < 1 ? 3 : 2, 15, 3.2);
    }
  }
  const c = finish(b);
  const low = lowestRow(c, 0, W);
  return assemble('weapon_rack', 'Weapon Rack', [1.3, 1.6], ['interactable', 'destructible'], { idle: { frames: [c], fps: 0 } }, gx, low);
}

/** Spear heads: a leaf blade or a cross (jumonji) blade, steel with a lit ridge. */
function spearHead(b: Buf, p: Pt, kind: 'leaf' | 'cross', part: number, depth: number): void {
  const x = Math.floor(p[0]), y = Math.floor(p[1]);
  // Socket with a red cord wrap.
  b.put(x, y + 1, P.red, 3, part, depth);
  b.put(x + 1, y + 1, P.red, 2, part, depth);
  b.put(x, y, P.iron, 3, part, depth);
  b.put(x + 1, y, P.iron, 2, part, depth);
  b.put(x, y - 1, P.iron, 3, part, depth);
  b.put(x + 1, y - 1, P.iron, 2, part, depth);
  const len = kind === 'leaf' ? 13 : 11;
  for (let k = 0; k < len; k++) {
    const t = k / (len - 1);
    const hw = kind === 'leaf' ? (t < 0.15 ? 1 : t > 0.8 ? 1 - (t - 0.8) * 4 : 1.6) : t > 0.8 ? 0.6 : 1;
    const yy = y - 2 - k;
    const l = Math.round(x + 0.5 - hw), r = Math.round(x + 0.5 + hw);
    for (let xx = l; xx <= Math.max(l, r - 1); xx++) {
      const left = xx <= x;
      b.put(xx, yy, P.iron, left ? (k > 2 && k < len - 2 ? 5 : 4) : 2, part, depth);
    }
  }
  if (kind === 'cross') {
    for (let k = -4; k <= 5; k++) {
      if (k >= 0 && k <= 1) continue;
      const yy = y - 4 - Math.round(Math.abs(k - 0.5) * 0.35);
      b.put(x + k, yy, P.iron, k < 0 ? 4 : 2, part, depth);
      b.put(x + k, yy + 1, P.iron, k < 0 ? 3 : 1, part, depth);
    }
  }
}

// ============================================================================================
// Build, write, preview
// ============================================================================================

function strips(sprites: WorldSprite[], dir: string): void {
  const bg = hex('#5d6b57');
  for (const s of sprites) {
    const first = Object.values(s.anims)[0].frames[0];
    const z = new Canvas(first.w + 8, first.h + 8);
    z.fillRect(0, 0, z.w, z.h, bg);
    z.draw(first, 4, 4);
    z.set(4 + s.anchor[0], 4 + s.anchor[1] + 1, hex('#ff00ff'));
    z.scaled(first.w > 150 ? 3 : 6).save(join(dir, `camp-${s.name}-zoom.png`));
    for (const [k, a] of Object.entries(s.anims)) {
      if (a.frames.length < 2 && Object.keys(s.anims).length < 2) continue;
      const fw = a.frames[0].w, fh = a.frames[0].h;
      const st = new Canvas((fw + 3) * a.frames.length + 3, fh + 6);
      st.fillRect(0, 0, st.w, st.h, bg);
      a.frames.forEach((f, i) => st.draw(f, 3 + i * (fw + 3), 3));
      st.scaled(fw > 150 ? 2 : 4).save(join(dir, `camp-${s.name}-${k}.png`));
    }
  }
}

const sprites: WorldSprite[] = [campfire(), smokeColumn(), tent(), ...barrelSprites(), ...crateSprites(), sacks(), weaponRack()];
writeGroup('camp', sprites);
preview(sprites, join(previewDir(), 'camp.png'), { scale: 3 });
for (const s of sprites) {
  const f0 = Object.values(s.anims)[0].frames[0];
  const bb = f0.bounds()!;
  const anims = Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}`).join(' ');
  console.log(`${s.name.padEnd(17)} frame ${f0.w}x${f0.h} anchor ${s.anchor} opaque ${bb[2] - bb[0] + 1}x${bb[3] - bb[1] + 1}px (target ${s.meters.map((v) => Math.round(v * PX_PER_M)).join('x')}) ${anims}`);
}
if (process.env.CAMP_STRIPS) strips(sprites, previewDir());
