// Plants for the battle maps: bushes and grass the party hides in, reeds for the river bank,
// ferns, wildflowers, lily pads and a mossy log with mushrooms.
//
//   npx tsx tools/world-sprites/plants.ts [previewDir]
//
// Everything is drawn into a step buffer (palette + ramp step per pixel, plus which part it belongs
// to and how far in front that part is) and turned into colors at the end, then outlined by the kit.
// Foliage is built from leaf clumps: each clump is a sphere with a scalloped rim of leaf tips, shaded
// in clustered bands from the upper left, with leaf-shaped crests in the light and leaf-shaped gaps in
// the shade. Clumps are drawn back to front; a back clump gets a dark inner line and a short cast
// shadow wherever a clump in front of it overlaps.

import { join } from 'node:path';
import { Anim, Canvas, Color, MATERIALS, WorldSprite, hash, lambert, m, noise, preview, previewDir, ramp, withAlpha, writeGroup } from './kit';

// --- palettes --------------------------------------------------------------------------------

const PAL: Color[][] = [];
function pal(r: Color[]): number {
  PAL.push(r);
  return PAL.length - 1;
}
const R = {
  leaf: ramp(MATERIALS.leaf),
  leafDeep: ramp(MATERIALS.leafDeep),
  leafLight: ramp(MATERIALS.leafLight),
  grass: ramp(MATERIALS.grass),
  moss: ramp(MATERIALS.moss),
  // The log is a big dark mass: a slightly narrower spread keeps its shaded half readable.
  bark: ramp(MATERIALS.bark, { spread: 0.8 }),
  wood: ramp(MATERIALS.wood),
  woodDark: ramp(MATERIALS.woodDark, { spread: 0.85 }),
  rope: ramp(MATERIALS.rope),
  paper: ramp(MATERIALS.paper),
  water: ramp(MATERIALS.water),
  // Accents (flowers, lotus, glowing caps): saturated only where they mean something.
  pink: ramp('#d65a8c', { shift: 10 }),
  lotus: ramp('#e48aac', { shift: 10 }),
  white: ramp('#dcd8e6', { shift: 10 }),
  violet: ramp('#8660c8', { shift: 10 }),
  yellow: ramp('#e3b832', { shift: 8 }),
  teal: ramp('#38b3a0', { shift: 10 }),
};
/** Foliage: front clumps on the leaf ramp, young lit tips from leafLight. */
const FOL = pal([R.leaf[0], R.leaf[1], R.leaf[2], R.leaf[3], R.leaf[4], R.leafLight[4]]);
/** Clumps that peek out from behind: the deeper leaf ramp. */
const FOL_BACK = pal([R.leafDeep[0], R.leaf[1], R.leafDeep[2], R.leafDeep[3], R.leaf[3], R.leaf[4]]);
/** Azalea: darker, glossier leaves so the blossoms carry the color. */
const FOL_AZ = pal([R.leafDeep[0], R.leaf[1], R.leafDeep[2], R.leafDeep[3], R.leaf[4], R.leafLight[4]]);
const GRASS = pal([R.grass[0], R.grass[1], R.grass[2], R.grass[3], R.leafLight[4], R.leafLight[5]]);
const GRASS_BACK = pal([R.leafDeep[0], R.leaf[1], R.leafDeep[2], R.grass[2], R.grass[3], R.leafLight[4]]);
const REED = pal([R.moss[0], R.leaf[1], R.moss[2], R.moss[3], R.moss[4], R.moss[5]]);
const REED_BACK = pal([R.leafDeep[0], R.leaf[1], R.leafDeep[2], R.moss[2], R.moss[3], R.moss[4]]);
const CATTAIL = pal(R.woodDark);
const MOSS = pal(R.moss);
const BARK = pal(R.bark);
const WOOD = pal(R.wood);
const CAP = pal(R.rope);
const STALK = pal(R.paper);
const TEAL = pal(R.teal);
const PINK = pal(R.pink);
const WHITE = pal(R.white);
const LOTUS = pal(R.lotus);
const YELLOW = pal(R.yellow);
const VIOLET = pal(R.violet);
const LILY = pal([R.leafDeep[0], R.leaf[1], R.leaf[2], R.leaf[3], R.leaf[4], R.leafLight[4]]);

// --- deterministic helpers -------------------------------------------------------------------

const rnd = (seed: number, i: number, j = 0): number => hash(i * 7 + 3, j * 13 + 5, seed);
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, t: number): number => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// --- step buffer -----------------------------------------------------------------------------

/** Per pixel: palette index, ramp step, the part it belongs to and that part's depth (higher = in front). */
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
  partAt(x: number, y: number): number {
    return this.in(x, y) ? this.part[y * this.w + x] : -1;
  }
  depthAt(x: number, y: number): number {
    return this.in(x, y) && this.mat[y * this.w + x] >= 0 ? this.depth[y * this.w + x] : -Infinity;
  }
  stepAt(x: number, y: number): number {
    return this.in(x, y) ? this.step[y * this.w + x] : 0;
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
  setStep(x: number, y: number, s: number): void {
    if (this.has(x, y)) this.step[y * this.w + x] = clamp(Math.round(s), 0, 5);
  }
  shade(x: number, y: number, d: number, min = 1): void {
    if (!this.has(x, y)) return;
    const i = y * this.w + x;
    this.step[i] = clamp(this.step[i] + d, Math.min(min, this.step[i]), 5);
  }
  toCanvas(): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (this.mat[i] >= 0) c.set(x, y, PAL[this.mat[i]][this.step[i]]);
      }
    return c;
  }
}

/** Dark 1 px line on a back part wherever a part in front of it touches it. */
function innerLines(b: Buf, lineStep = 1, minGap = 0.5): void {
  const out: [number, number][] = [];
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      if (!b.has(x, y)) continue;
      const p = b.partAt(x, y), d = b.depthAt(x, y);
      for (const [ox, oy] of N4) {
        const q = b.partAt(x + ox, y + oy);
        if (q >= 0 && q !== p && b.depthAt(x + ox, y + oy) > d + minGap) {
          out.push([x, y]);
          break;
        }
      }
    }
  for (const [x, y] of out) b.setStep(x, y, Math.min(b.stepAt(x, y), lineStep));
}

/** Darkens a back part by one step just below-right of a part in front (light from the upper left). */
function castShadow(b: Buf, reach = 2, minGap = 0.5): void {
  const out: [number, number][] = [];
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      if (!b.has(x, y)) continue;
      const p = b.partAt(x, y), d = b.depthAt(x, y);
      let hit = false;
      for (let k = 1; k <= reach && !hit; k++)
        for (const [ox, oy] of [[-k, -k], [-k + 1, -k], [-k, -k + 1]]) {
          const q = b.partAt(x + ox, y + oy);
          if (q >= 0 && q !== p && b.depthAt(x + ox, y + oy) > d + minGap) hit = true;
        }
      if (hit) out.push([x, y]);
    }
  for (const [x, y] of out) b.shade(x, y, -1);
}

/**
 * Removes 1 px spurs (optional) and fills holes the outside cannot reach with a dark step, so the
 * silhouette stays clean and gaps inside a clump read as deep shadow rather than see-through dots.
 */
function tidy(b: Buf, spurs = true): void {
  if (spurs)
    for (let pass = 0; pass < 2; pass++) {
      const kill: number[] = [];
      for (let y = 0; y < b.h; y++)
        for (let x = 0; x < b.w; x++) {
          if (!b.has(x, y)) continue;
          let n = 0;
          for (const [ox, oy] of N4) if (b.has(x + ox, y + oy)) n++;
          if (n <= 1) kill.push(y * b.w + x);
        }
      for (const i of kill) b.mat[i] = -1;
    }
  const ext = new Uint8Array(b.w * b.h);
  const q: number[] = [];
  for (let x = 0; x < b.w; x++) q.push(x, (b.h - 1) * b.w + x);
  for (let y = 0; y < b.h; y++) q.push(y * b.w, y * b.w + b.w - 1);
  while (q.length) {
    const i = q.pop()!;
    if (ext[i] || b.mat[i] >= 0) continue;
    ext[i] = 1;
    const x = i % b.w, y = (i / b.w) | 0;
    for (const [ox, oy] of N4) if (b.in(x + ox, y + oy)) q.push((y + oy) * b.w + x + ox);
  }
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const i = y * b.w + x;
      if (b.mat[i] >= 0 || ext[i]) continue;
      for (const [ox, oy] of N4)
        if (b.has(x + ox, y + oy)) {
          const j = (y + oy) * b.w + x + ox;
          b.put(x, y, b.mat[j], 1, b.part[j], b.depth[j]);
          break;
        }
    }
}

// --- shapes ----------------------------------------------------------------------------------

/**
 * An almond leaf from (x, y) toward angle `ang`: `len` long, `wid` wide. Calls `fn` for every pixel
 * with the position along the leaf (0 base .. 1 tip) and across it (-1 left .. 1 right of the axis).
 */
function leafShape(x: number, y: number, ang: number, len: number, wid: number, fn: (px: number, py: number, t: number, s: number) => void): void {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const r = len + wid;
  for (let py = Math.floor(y - r); py <= Math.ceil(y + r); py++)
    for (let px = Math.floor(x - r); px <= Math.ceil(x + r); px++) {
      const vx = px + 0.5 - x, vy = py + 0.5 - y;
      const along = vx * dx + vy * dy, across = -vx * dy + vy * dx;
      const t = along / len;
      if (t < 0 || t > 1) continue;
      const hw = (wid / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.75) + 0.15;
      if (Math.abs(across) <= hw) fn(px, py, t, across / Math.max(0.5, hw));
    }
}

/** Point and tangent on a quadratic bezier. */
function quad(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number): [number, number, number, number] {
  const s = 1 - t;
  return [s * s * x0 + 2 * s * t * cx + t * t * x1, s * s * y0 + 2 * s * t * cy + t * t * y1, 2 * s * (cx - x0) + 2 * t * (x1 - cx), 2 * s * (cy - y0) + 2 * t * (y1 - cy)];
}

/**
 * Strokes a quadratic bezier `width(t)` px wide. A mostly vertical stroke spreads its width across
 * x, a flat one across y. `paint(t, side)` gives [palette, step] (side 0 = left/top, 1 = right/bottom).
 */
function strokeQuad(b: Buf, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, width: (t: number) => number, paint: (t: number, side: number) => [number, number] | null, part: number, depth: number): void {
  const len = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
  const n = Math.max(4, Math.ceil(len * 3));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y, tx, ty] = quad(x0, y0, cx, cy, x1, y1, t);
    const k = Math.max(1, Math.round(width(t)));
    const vert = Math.abs(ty) >= Math.abs(tx);
    const off = Math.floor((k - 1) / 2);
    for (let j = 0; j < k; j++) {
      const px = vert ? Math.floor(x) + j - off : Math.floor(x);
      const py = vert ? Math.floor(y) : Math.floor(y) + j - off;
      const r = paint(t, k === 1 ? 0.5 : j / (k - 1));
      if (r) b.put(px, py, r[0], r[1], part, depth);
    }
  }
}

// --- sprite assembly -------------------------------------------------------------------------

interface RawAnim {
  frames: Canvas[];
  fps: number;
  loop?: boolean;
}

/**
 * Crops every frame of every animation to the union of their opaque bounds (+1 px margin), so all
 * frames share one size and one anchor. (gx, gy) is the ground contact point on the work canvas; the
 * anchor row snaps to the lowest opaque row of the first frame near gx (the outline under the base).
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
  for (const [k, a] of Object.entries(anims)) {
    out[k] = {
      fps: a.fps,
      loop: a.loop ?? true,
      frames: a.frames.map((f) => {
        const c = new Canvas(w, h);
        c.draw(f, -x0, -y0);
        return c;
      }),
    };
  }
  const first = Object.values(anims)[0].frames[0];
  let ay = gy;
  for (let y = first.h - 1; y >= 0; y--) {
    let hit = false;
    for (let x = gx - 4; x <= gx + 4; x++) if (first.alpha(x, y) >= 200) hit = true;
    if (hit) {
      ay = y;
      break;
    }
  }
  return { name, label, meters, anchor: [gx - x0, ay - y0], tags, anims: out };
}

/** Standard finishing: tidy, inner lines, cast shadows, colors, outline. */
function finish(b: Buf, o: { spurs?: boolean; inner?: number; gap?: number; shadow?: number } = {}): Canvas {
  tidy(b, o.spurs ?? true);
  if (o.inner !== -1) innerLines(b, o.inner ?? 1, o.gap ?? 0.5);
  if (o.shadow !== 0) castShadow(b, o.shadow ?? 2, o.gap ?? 0.5);
  const c = b.toCanvas();
  c.outline();
  return c;
}

/** Draws `src` over `dst` with an extra opacity. */
function blit(dst: Canvas, src: Canvas, dx: number, dy: number, alpha = 1): void {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c[3]) dst.plot(dx + x, dy + y, withAlpha(c, c[3] * alpha));
    }
}

/** A small loose leaf (or petal) with its own outline, for rustle effects. `ang` turns it as it tumbles. */
function looseLeaf(mat: number, ang: number, len = 5, wid = 3): Canvas {
  const b = new Buf(12, 12);
  leafShape(6 - Math.cos(ang) * len * 0.5, 6 - Math.sin(ang) * len * 0.5, ang, len, wid, (px, py, t, s) => b.put(px, py, mat, s < -0.2 && t > 0.3 && t < 0.8 ? 4 : s > 0.3 || t > 0.8 ? 2 : 3));
  const c = b.toCanvas();
  c.outline();
  return c;
}

// --- foliage clumps --------------------------------------------------------------------------

interface Clump {
  x: number;
  y: number;
  r: number;
  ry?: number;
  /** Back clumps use the deeper leaf ramp. */
  back?: boolean;
  /** Draw order (higher = in front). */
  z: number;
}
interface FoliageOpts {
  seed: number;
  leafLen: number;
  leafWid: number;
  /** Whole-bush ellipse for the shared form light: center x, center y, rx, ry. */
  form: [number, number, number, number];
  ground: number;
  /** Lean rim leaves toward the ground (0..1). */
  droop?: number;
  /** Light offset (makes everything a bit lighter or darker). */
  bias?: number;
}

/** Light at (x, y) relative to a clump's center: its own sphere, the whole bush's form and the ground's occlusion. */
function clumpLight(c: Clump, o: FoliageOpts, x: number, y: number): number {
  const ry = c.ry ?? c.r;
  let u = x / c.r, v = y / ry;
  const d = Math.hypot(u, v);
  if (d > 0.92) {
    u *= 0.92 / d;
    v *= 0.92 / d;
  }
  const local = lambert(u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v)));
  const [fx, fy, frx, fry] = o.form;
  const U = clamp((c.x + x - fx) / frx, -1, 1), V = clamp((c.y + y - fy) / fry, -1, 1);
  const global = lambert(U * 0.8, V * 0.8, Math.sqrt(Math.max(0.05, 1 - (U * U + V * V) * 0.64)));
  const ao = smooth(o.ground - fry * 0.75, o.ground, c.y + y) * 0.22;
  return local * 0.58 + global * 0.47 - ao + (o.bias ?? 0) + (c.back ? -0.07 : 0) - 0.05;
}
const TH = [0.36, 0.53, 0.76];
const lightStep = (l: number): number => (l < TH[0] ? 1 : l < TH[1] ? 2 : l < TH[2] ? 3 : 4);

/**
 * Draws foliage clumps (each offset by `offs[i]`, whole pixels) into the buffer; parts are clump
 * indices. Shading and texture use clump-local coordinates, so an offset moves a clump rigidly.
 */
function drawFoliage(b: Buf, clumps: Clump[], o: FoliageOpts, offs: [number, number][] = [], front = FOL): void {
  const order = clumps.map((_, i) => i).sort((a, b2) => clumps[a].z - clumps[b2].z);
  const droop = o.droop ?? 0.3;
  for (const ci of order) {
    const c = clumps[ci];
    const ry = c.ry ?? c.r;
    const [ox, oy] = offs[ci] ?? [0, 0];
    const bx = Math.round(c.x), by = Math.round(c.y);
    const cc: Clump = { ...c, x: bx, y: by };
    const mat = c.back ? FOL_BACK : front;
    const seed = o.seed * 31 + ci;
    const R0 = Math.ceil(Math.max(c.r, ry) + o.leafLen);
    const S = 2 * R0 + 1;
    const st = new Int8Array(S * S).fill(-1);
    const id = (lx: number, ly: number): number => (Math.abs(lx) <= R0 && Math.abs(ly) <= R0 ? (ly + R0) * S + lx + R0 : -1);
    const bandAt = (lx: number, ly: number): number => lightStep(clumpLight(cc, o, lx + 0.5, ly + 0.5) + (noise(lx, ly, 2.8, seed) - 0.5) * 0.16);
    // Rim leaves: even steps around the clump, pointing outward, so the silhouette is a scallop of tips.
    const per = Math.PI * (1.5 * (c.r + ry) - Math.sqrt(c.r * ry));
    const n = Math.max(7, Math.round(per / (o.leafWid * 1.3)));
    for (let i = 0; i < n; i++) {
      const th = ((i + rnd(seed, i, 1) * 0.45) / n) * Math.PI * 2;
      const ex = Math.cos(th) * c.r, ey = Math.sin(th) * ry;
      let ang = th + (rnd(seed, i, 3) - 0.5) * 0.4;
      ang = Math.atan2(Math.sin(ang) * (1 - droop) + droop * 0.7, Math.cos(ang));
      const reach = Math.hypot(ex, ey);
      const len = Math.max(o.leafLen, reach * 0.42) * (0.9 + rnd(seed, i, 6) * 0.2);
      const sx = ex * 0.62, sy = ey * 0.62;
      const wid = o.leafWid * (0.85 + rnd(seed, i, 7) * 0.2);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const darkSide = nx * 0.6 + ny * 0.8 > 0 ? 1 : -1;
      leafShape(sx, sy, ang, len, wid, (px, py, t, s) => {
        const k = id(px, py);
        if (k < 0) return;
        let v = bandAt(px, py);
        if (s * darkSide > 0.5) v = Math.max(1, v - 1);
        else if (v >= 3 && s * darkSide < -0.45 && t > 0.3 && t < 0.85) v = Math.min(4, v + 1);
        st[k] = v;
      });
    }
    // Core.
    for (let ly = -R0; ly <= R0; ly++)
      for (let lx = -R0; lx <= R0; lx++) {
        const u = (lx + 0.5) / (c.r * 0.8), v = (ly + 0.5) / (ry * 0.8);
        if (u * u + v * v <= 1) st[id(lx, ly)] = bandAt(lx, ly);
      }
    // Interior leaves hanging toward the viewer: crests in the light, dark gaps in the shade.
    const sp = o.leafLen * 0.8;
    const leaves: { x: number; y: number; ang: number; k: number }[] = [];
    let k = 0;
    for (let gy = -ry; gy <= ry; gy += sp * 0.62)
      for (let gx = -c.r; gx <= c.r; gx += sp) {
        k++;
        const row = Math.round((gy + ry) / (sp * 0.62));
        const lx = gx + (row & 1 ? sp / 2 : 0) + (rnd(seed, k, 11) - 0.5) * sp * 0.5;
        const ly = gy + (rnd(seed, k, 12) - 0.5) * sp * 0.4;
        const u = lx / c.r, v = ly / ry;
        if (u * u + v * v > 0.6) continue;
        const out = Math.atan2(v, u);
        let ang = u * u + v * v < 0.06 ? Math.PI / 2 : out;
        ang = Math.atan2(Math.sin(ang) * 0.5 + 0.8, Math.cos(ang)) + (rnd(seed, k, 13) - 0.5) * 0.8;
        leaves.push({ x: lx, y: ly, ang, k });
      }
    leaves.sort((a, b2) => a.y - b2.y);
    for (const lf of leaves) {
      const sc = lightStep(clumpLight(cc, o, lf.x, lf.y));
      const r = rnd(seed, lf.k, 14);
      if (sc === 1 && r > 0.4) continue;
      const len = o.leafLen * (0.85 + rnd(seed, lf.k, 15) * 0.25), wid = o.leafWid * (0.9 + rnd(seed, lf.k, 16) * 0.2);
      const nx = -Math.sin(lf.ang), ny = Math.cos(lf.ang);
      const darkSide = nx * 0.6 + ny * 0.8 > 0 ? 1 : -1;
      const glint = sc === 4 && r < 0.3;
      const sx = lf.x - Math.cos(lf.ang) * len * 0.35, sy = lf.y - Math.sin(lf.ang) * len * 0.35;
      leafShape(sx, sy, lf.ang, len, wid, (px, py, t, s) => {
        const i = id(px, py);
        if (i < 0 || st[i] < 0) return;
        const edge = s * darkSide > 0.5;
        let v: number;
        if (sc >= 3) v = edge ? sc - 1 : sc;
        else if (sc === 2) v = edge && r < 0.75 ? 1 : 2;
        else v = edge ? 1 : 2;
        if (glint && t > 0.45 && t < 0.8 && Math.abs(s) < 0.4) v = 5;
        st[i] = v;
      });
    }
    // Into the buffer (the ground clips the bottom).
    for (let ly = -R0; ly <= R0; ly++)
      for (let lx = -R0; lx <= R0; lx++) {
        const v = st[id(lx, ly)];
        if (v < 0) continue;
        const x = bx + ox + lx, y = by + oy + ly;
        if (y > o.ground) continue;
        b.put(x, y, mat, v, ci, c.z);
      }
  }
}

// --- bushes ----------------------------------------------------------------------------------

interface BushSpec {
  name: string;
  label: string;
  meters: [number, number];
  clumps: Clump[];
  opts: FoliageOpts;
  mat?: number;
  W: number;
  H: number;
  gx: number;
  /** Extra layer drawn over the foliage (blossoms). */
  extra?: (b: Buf, offs: [number, number][]) => void;
  /** Palettes of the loose bits that fly off in the rustle (leaves, petals). */
  bits: number[];
}

function bushFrame(s: BushSpec, offs: [number, number][]): Canvas {
  const b = new Buf(s.W, s.H);
  drawFoliage(b, s.clumps, s.opts, offs, s.mat);
  s.extra?.(b, offs);
  return finish(b, { inner: 0, gap: 0.5, shadow: 2 });
}

/** Sway weight of a clump: 0 at the ground, 1 at the top of the bush. */
function swayW(s: BushSpec, c: Clump): number {
  const top = s.opts.form[1] - s.opts.form[3];
  return clamp((s.opts.ground - c.y) / (s.opts.ground - top), 0, 1);
}

function bushSprite(s: BushSpec): WorldSprite {
  // Idle: the upper clumps drift 1 px right, back, 1 px left, back (the base never moves).
  const idle = [0, 1, 0, -1].map((p) => bushFrame(s, s.clumps.map((c) => [swayW(s, c) > 0.55 ? p : 0, 0] as [number, number])));
  // Rustle: squash back (anticipation), a hard shake that alternates between clumps, smaller swings, rest.
  const shake: [number, number][] = [[-1, 1], [2, -1], [-2, 0], [1, 0], [-1, 0], [0, 0]];
  const [fx] = s.opts.form;
  const top = s.opts.form[1] - s.opts.form[3];
  const half = s.opts.form[2];
  // Loose bits: burst off the crown, arc up and out, tumble and drift down beside the bush, fading.
  const paths: [number, number][][] = [
    [[-0.45, 2], [-0.62, -7], [-0.8, -6], [-0.95, 1]],
    [[0.4, 1], [0.6, -9], [0.82, -8], [1.0, -1]],
    [[0.02, -1], [0.1, -12], [0.22, -13], [0.36, -9]],
  ];
  const rustle = shake.map(([dx, dy], f) => {
    const frame = bushFrame(
      s,
      s.clumps.map((c, i) => {
        const w = swayW(s, c);
        const alt = f >= 1 && f <= 2 && i % 2 ? 0.5 : 1;
        return [Math.round(dx * w * alt), w > 0.5 ? dy : 0] as [number, number];
      }),
    );
    if (f >= 1 && f <= 4) {
      const t = f - 1;
      paths.forEach((p, k) => {
        const [px, py] = p[t];
        const leaf = looseLeaf(s.bits[k % s.bits.length], 0.6 + k * 1.7 + t * 1.3 * (k % 2 ? 1 : -1));
        blit(frame, leaf, Math.round(fx + px * half - 6), Math.round(top + py - 6), f === 4 ? 0.6 : 1);
      });
    }
    return frame;
  });
  return assemble(s.name, s.label, s.meters, ['hide-spot', 'cover-half', 'flammable', 'destructible'], { idle: { frames: idle, fps: 4 }, rustle: { frames: rustle, fps: 12, loop: false } }, s.gx, s.opts.ground);
}

/** Clumps from [x, height of the center above the ground, r, ry, back?]: lower clumps are nearer. */
function clumpsFrom(L: [number, number, number, number, boolean?][], gx: number, ground: number): Clump[] {
  return L.map(([x, h, r, ry, back]) => ({ x: gx + x, y: ground - h, r, ry, back, z: back ? -1 : 100 - h }));
}

function roundBush(): BushSpec {
  const W = 140, H = 120, gx = 70, ground = 104;
  const hgt = m(1.1), wid = m(1.3);
  const top = ground - hgt;
  const clumps = clumpsFrom(
    [
      [-25, 33, 11, 11, true],
      [26, 31, 11, 11, true],
      [-9, 50, 13, 12],
      [11, 49, 13, 12],
      [-24, 33, 12, 12],
      [-3, 35, 15, 13],
      [19, 32, 13, 12],
      [-22, 14, 13, 13],
      [-1, 15, 15, 14],
      [21, 14, 13, 13],
    ],
    gx,
    ground,
  );
  return {
    name: 'bush_round',
    label: 'Round Bush',
    meters: [1.3, 1.1],
    clumps,
    opts: { seed: 11, leafLen: 7, leafWid: 4.4, form: [gx - 2, top + hgt * 0.5, wid / 2, hgt / 2], ground },
    W,
    H,
    gx,
    bits: [FOL, FOL, FOL],
  };
}

function wideBush(): BushSpec {
  const W = 170, H = 100, gx = 85, ground = 86;
  const hgt = m(0.9), wid = m(2);
  const top = ground - hgt;
  const clumps = clumpsFrom(
    [
      [-45, 24, 10, 9, true],
      [47, 23, 10, 9, true],
      [-25, 38, 13, 11],
      [-3, 40, 14, 11],
      [20, 37, 13, 11],
      [-42, 22, 12, 11],
      [-20, 24, 14, 12],
      [4, 25, 14, 12],
      [27, 23, 13, 11],
      [45, 19, 10, 10],
      [-34, 11, 12, 11],
      [-11, 12, 14, 12],
      [13, 11, 13, 11],
      [35, 10, 12, 10],
    ],
    gx,
    ground,
  );
  return {
    name: 'bush_wide',
    label: 'Wide Shrub',
    meters: [2, 0.9],
    clumps,
    opts: { seed: 23, leafLen: 6.5, leafWid: 4, form: [gx - 4, top + hgt * 0.5, wid / 2, hgt / 2], ground },
    W,
    H,
    gx,
    bits: [FOL, FOL, FOL],
  };
}

function azaleaBush(): BushSpec {
  const W = 140, H = 110, gx = 70, ground = 96;
  const hgt = m(1), wid = m(1.4);
  const top = ground - hgt;
  const clumps = clumpsFrom(
    [
      [-27, 31, 10, 10, true],
      [29, 30, 10, 10, true],
      [-10, 44, 13, 11],
      [12, 43, 13, 11],
      [-26, 29, 12, 11],
      [-4, 30, 14, 12],
      [19, 29, 13, 11],
      [-22, 12, 13, 12],
      [1, 13, 14, 12],
      [24, 12, 12, 11],
    ],
    gx,
    ground,
  );
  const seed = 37;
  const form: [number, number, number, number] = [gx - 2, top + hgt * 0.5, wid / 2, hgt / 2];
  const opts: FoliageOpts = { seed, leafLen: 5.5, leafWid: 3.6, form, ground, bias: 0.02 };
  // Blossom trusses sit on the upper, outward face of each clump: 3-4 small trumpet flowers each.
  const layouts: [number, number][][] = [
    [[0, -2], [-2, 0], [2, 0], [0, 2]],
    [[-1, -1], [2, -1], [0, 1]],
    [[1, -2], [-1, 0], [2, 1], [-1, 2]],
  ];
  const trusses: { ci: number; x: number; y: number; white: boolean; flowers: [number, number][] }[] = [];
  clumps.forEach((c, ci) => {
    const n = c.back ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (k === 0 ? -0.7 : 0.8) + (rnd(seed, ci, k) - 0.5) * 0.9;
      const rr = 0.42 + rnd(seed, ci, k + 9) * 0.3;
      const lay = layouts[(ci + k * 2) % layouts.length].slice().sort((p, q) => p[1] - q[1] || p[0] - q[0]);
      trusses.push({ ci, x: Math.round(Math.cos(a) * c.r * rr), y: Math.round(Math.sin(a) * (c.ry ?? c.r) * rr), white: rnd(seed, ci, k + 20) < 0.28, flowers: lay });
    }
  });
  const extra = (b: Buf, offs: [number, number][]): void => {
    const marks: [number, number][] = [];
    trusses.forEach((tr, k) => {
      const c = clumps[tr.ci];
      const [ox, oy] = offs[tr.ci] ?? [0, 0];
      const cc: Clump = { ...c, x: Math.round(c.x), y: Math.round(c.y) };
      const tx = cc.x + ox + tr.x, ty = cc.y + oy + tr.y;
      const lit = clumpLight(cc, opts, tr.x, tr.y);
      const mat = tr.white ? WHITE : PINK;
      const dep = c.z + 0.3;
      tr.flowers.forEach(([fx, fy], fi) => {
        for (const [dx, dy] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]] as [number, number][]) {
          const x = tx + fx + dx, y = ty + fy + dy;
          if (b.depthAt(x, y) > dep + 0.5) continue;
          const u = (fx + dx) / 3.4, v = (fy + dy) / 3;
          const lt = lambert(u * 0.9, v * 0.9, Math.sqrt(Math.max(0.1, 1 - (u * u + v * v) * 0.81)));
          const comb = lt * 0.5 + lit * 0.55;
          let s = comb > 0.72 ? 4 : comb > 0.48 ? 3 : 2;
          if (dx === 0 && dy === 0) s = 2; // the throat
          else if (dx + dy > 0) s = Math.max(2, s - 1); // the lower-right petals turn away from the light
          if (fi === 0 && dx === -1 && comb > 0.6) s = 5;
          b.put(x, y, mat, s, 100 + k, dep);
          marks.push([x, y]);
        }
      });
    });
    // Leaves just below-right of a blossom sit in its shadow.
    for (const [x, y] of marks)
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]] as [number, number][])
        if (b.partAt(x + dx, y + dy) >= 0 && b.partAt(x + dx, y + dy) < 100) b.setStep(x + dx, y + dy, 1);
  };
  return {
    name: 'bush_flower',
    label: 'Azalea Bush',
    meters: [1.4, 1],
    clumps,
    opts,
    mat: FOL_AZ,
    W,
    H,
    gx,
    extra,
    bits: [FOL_AZ, PINK, FOL_AZ],
  };
}

// --- tall grass ------------------------------------------------------------------------------

interface Blade {
  bx: number;
  h: number;
  tipX: number;
  tipY: number;
  cx: number;
  cy: number;
  w: number;
  /** 0 back (tall, deep green), 1 middle, 2 front (short, leaning out). */
  layer: number;
  z: number;
}

function grassBlades(seed: number, cx: number, ground: number, height: number): Blade[] {
  const blades: Blade[] = [];
  const layers = [
    { n: 12, spread: 11, hMin: 0.74, hMax: 1.02, lean: 0.75, w: 2 },
    { n: 11, spread: 14, hMin: 0.5, hMax: 0.84, lean: 1.35, w: 3 },
    { n: 8, spread: 10, hMin: 0.3, hMax: 0.52, lean: 1.9, w: 3 },
  ];
  let k = 0;
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n; i++, k++) {
      const fan = ((i + 0.5) / L.n) * 2 - 1;
      const bx = cx + fan * L.spread + (rnd(seed, k, 1) - 0.5) * 3;
      const h = height * (L.hMin + (L.hMax - L.hMin) * rnd(seed, k, 2)) * (1 - Math.abs(fan) * 0.28);
      const lean = fan * 10 * L.lean + (rnd(seed, k, 3) - 0.5) * 6;
      const arch = li > 0 && Math.abs(fan) > 0.55 && rnd(seed, k, 4) < 0.7;
      blades.push({
        bx,
        h,
        tipX: bx + lean * (arch ? 1.6 : 1),
        tipY: ground - h * (arch ? 0.62 : 1),
        cx: bx + lean * (arch ? 0.55 : 0.2),
        cy: ground - h * (arch ? 1.05 : 0.6),
        w: L.w,
        layer: li,
        z: rnd(seed, k, 5),
      });
    }
  });
  return blades.sort((a, b) => a.layer - b.layer || a.z - b.z);
}

/** Draws blades; `bend(bl)` adds a tip displacement in px for the frame. */
function drawBlades(b: Buf, blades: Blade[], ground: number, bend: (bl: Blade) => number, seed: number): void {
  blades.forEach((bl, i) => {
    const d = bend(bl);
    const back = bl.layer === 0;
    const mat = back ? GRASS_BACK : GRASS;
    const tipLit = !back && rnd(seed, i, 11) < 0.7;
    strokeQuad(
      b,
      bl.bx,
      ground,
      bl.cx + d * 0.4,
      bl.cy,
      bl.tipX + d,
      bl.tipY + Math.abs(d) * 0.15,
      (t) => (t < 0.4 ? bl.w : t < 0.74 ? Math.min(2, bl.w) : 1),
      (t, side) => {
        let st = t < 0.16 ? 1 : t < 0.42 ? 2 : t < 0.8 ? 3 : 4;
        if (back && t < 0.6) st = Math.max(1, st - 1);
        if (side > 0.6 && st > 1) st -= 1;
        if (t > 0.9 && tipLit) st = 5;
        return [mat, st];
      },
      i,
      bl.layer * 10 + bl.z,
    );
  });
}

function tallGrass(): WorldSprite {
  const W = 110, H = 90, cx = 55, ground = 78, height = m(0.8);
  const seed = 51;
  const blades = grassBlades(seed, cx, ground, height);
  const frame = (bend: (bl: Blade) => number, bits?: (c: Canvas) => void): Canvas => {
    const b = new Buf(W, H);
    drawBlades(b, blades, ground, bend, seed);
    const c = finish(b, { spurs: false, inner: 1, gap: 0.6, shadow: 0 });
    bits?.(c);
    return c;
  };
  // Idle: a wind wave crossing from left to right; tips move up to 2 px, the base stays put.
  const idle = Array.from({ length: 6 }, (_, f) => frame((bl) => Math.round((0.3 + 1.9 * (bl.h / height)) * Math.sin(((f + 0.5) / 6) * Math.PI * 2 - (bl.bx - cx) * 0.06))));
  // Rustle: blades squeeze in, part to both sides as someone pushes through, overshoot and settle.
  const part = [-1, 6, 4, -2, 1, 0];
  const paths: [number, number][][] = [
    [[-6, -2], [-11, -9], [-15, -8], [-19, -2]],
    [[5, -3], [10, -11], [14, -10], [18, -4]],
  ];
  const rustle = part.map((a, f) =>
    frame(
      (bl) => Math.round(a * Math.sign(bl.bx - cx + 0.5) * (0.4 + 0.6 * (bl.h / height))),
      (c) => {
        if (f < 1 || f > 4) return;
        const t = f - 1;
        paths.forEach((p, k) => {
          const leaf = looseLeaf(GRASS, 0.3 + k * 2.1 + t * 1.5 * (k ? 1 : -1), 5, 2.2);
          blit(c, leaf, Math.round(cx + p[t][0] - 6), Math.round(ground - height + p[t][1] - 6), f === 4 ? 0.6 : 1);
        });
      },
    ),
  );
  return assemble('tall_grass', 'Tall Grass', [1, 0.8], ['hide-spot', 'flammable'], { idle: { frames: idle, fps: 5 }, rustle: { frames: rustle, fps: 12, loop: false } }, cx, ground);
}

// --- reeds -----------------------------------------------------------------------------------

function cattails(): WorldSprite {
  const W = 90, H = 130, cx = 45, ground = 116, height = m(1.5), halfW = m(0.8) / 2;
  const seed = 63;
  // Strap leaves fan from a tight clump; a few fold over and hang.
  const leaves = Array.from({ length: 12 }, (_, i) => {
    const fan = (i / 11 - 0.5) * 2;
    const h = height * (0.42 + rnd(seed, i, 1) * 0.36) * (1 - Math.abs(fan) * 0.3);
    const fold = rnd(seed, i, 2) < 0.34 ? 0.6 + rnd(seed, i, 5) * 0.15 : 0;
    const lean = fan * halfW * 0.8 + (rnd(seed, i, 3) - 0.5) * 6;
    return { bx: cx + fan * 4, h, lean, fold, back: i % 3 === 1, z: rnd(seed, i, 4) };
  });
  // Stems with their brown heads: [x offset, height, lean, head length].
  const stems: [number, number, number, number][] = [
    [-2, height, -5, 13],
    [2, height * 0.91, 5, 12],
    [5, height * 0.79, 12, 11],
    [-5, height * 0.69, -12, 10],
  ];
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    const sway = (h: number, x: number): number => Math.round(Math.sin(((f + 0.5) / 6) * Math.PI * 2 - (x - cx) * 0.06) * (0.3 + 2.2 * (h / height)));
    leaves
      .slice()
      .sort((a, b2) => (a.back === b2.back ? a.z - b2.z : a.back ? -1 : 1))
      .forEach((l, i) => {
        const d = sway(l.h, l.bx);
        const mat = l.back ? REED_BACK : REED;
        const dep = l.back ? l.z : 1 + l.z;
        const paint = (t0: number, t1: number) => (t: number, side: number): [number, number] => {
          const tt = t0 + (t1 - t0) * t;
          let st = tt < 0.18 ? 1 : tt < 0.45 ? 2 : 3;
          if (side > 0.6) st = Math.max(1, st - 1);
          if (side < 0.4 && tt > 0.3 && tt < 0.85 && !l.back && st === 3) st = 4;
          return [mat, st];
        };
        if (!l.fold) {
          strokeQuad(b, l.bx, ground, l.bx + l.lean * 0.2 + d * 0.3, ground - l.h * 0.6, l.bx + l.lean + d, ground - l.h, (t) => (t < 0.35 ? 3 : t < 0.75 ? 2 : 1), paint(0, 1), i, dep);
        } else {
          // Up to the fold, then the rest hangs outward and down.
          const fx = l.bx + l.lean * 0.55 + d, fy = ground - l.h * l.fold;
          strokeQuad(b, l.bx, ground, l.bx + l.lean * 0.15 + d * 0.3, ground - l.h * l.fold * 0.6, fx, fy, (t) => (t < 0.5 ? 3 : 2), paint(0, l.fold), i, dep);
          const rest = l.h * (1 - l.fold) * 1.1, dir = Math.sign(l.lean) || 1;
          strokeQuad(b, fx, fy, fx + dir * rest * 0.45, fy - 2, fx + dir * rest * 0.8, fy + rest * 0.55, (t) => (t < 0.5 ? 2 : 1), (t, side) => paint(l.fold, 1)(t, side), i, dep);
        }
      });
    stems.forEach(([ox, h, lean, head], i) => {
      const bx = cx + ox;
      const d = sway(h, bx);
      const x1 = bx + lean + d, y1 = ground - h;
      const c1x = bx + lean * 0.3 + d * 0.3, c1y = ground - h * 0.55;
      const part = 50 + i, dep = 3 + i * 0.1;
      strokeQuad(b, bx, ground, c1x, c1y, x1, y1, (t) => (t < 0.55 ? 2 : 1), (t, side) => [REED, side > 0.6 ? 2 : t > 0.5 ? 3 : 2], part, dep);
      // Head: a rounded brown cylinder along the stem (lit on the left), then a thin spike.
      const t0 = 1 - (head + 6) / h, t1 = 1 - 6 / h;
      for (let t = t0; t <= t1; t += 0.25 / h) {
        const [x, y] = quad(bx, ground, c1x, c1y, x1, y1, t);
        const e = (t - t0) / (t1 - t0);
        const r = 2.4 * Math.min(1, Math.sin(Math.PI * e) * 2.2);
        for (let ox2 = -3; ox2 <= 3; ox2++) {
          const u = (ox2 + 0.5) / Math.max(0.9, r);
          if (Math.abs(u) > 1) continue;
          let st = u < -0.45 ? 4 : u < 0.25 ? 3 : 2;
          if (e < 0.1 || e > 0.92) st = Math.max(2, st - 1);
          if (st === 4 && e > 0.15 && e < 0.4) st = 5;
          if (st === 3 && e > 0.55 && e < 0.62) st = 2; // a faint seam where the head ripens
          b.put(Math.floor(x) + ox2, Math.floor(y), CATTAIL, st, part, dep + 0.05);
        }
      }
      const [sx, sy] = quad(bx, ground, c1x, c1y, x1, y1, t1);
      strokeQuad(b, sx, sy, x1 + 0.2, y1 - 2, x1 + 0.4, y1 - 5, () => 1, (t) => [REED, t > 0.6 ? 4 : 3], part, dep);
    });
    return finish(b, { spurs: false, inner: 1, gap: 0.35, shadow: 0 });
  };
  const idle = Array.from({ length: 6 }, (_, f) => frame(f));
  return assemble('reeds', 'Cattail Reeds', [0.8, 1.5], ['hide-spot', 'water', 'flammable'], { idle: { frames: idle, fps: 5 } }, cx, ground);
}

// --- fern ------------------------------------------------------------------------------------

/** Points along an arching frond every 0.5 px: [x, y, direction (rad from vertical, + = right)]. */
function frondPath(x0: number, y0: number, a0: number, a1: number, len: number, bend = 1.4): [number, number, number][] {
  const pts: [number, number, number][] = [];
  let x = x0, y = y0;
  const n = Math.ceil(len * 2);
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * Math.pow(i / n, bend);
    pts.push([x, y, a]);
    x += Math.sin(a) * 0.5;
    y -= Math.cos(a) * 0.5;
  }
  return pts;
}

function fern(): WorldSprite {
  const W = 100, H = 60, cx = 50, ground = 50;
  const seed = 71;
  // Fronds: [start angle, end angle (deg from vertical, + = right), length, layer 0 back / 1 side / 2 front].
  const F: [number, number, number, number][] = [
    [-6, -62, 37, 0],
    [9, 66, 36, 0],
    [-28, -108, 33, 1],
    [30, 112, 34, 1],
    [-52, -140, 27, 1],
    [54, 142, 27, 1],
    [-18, -150, 19, 2],
    [22, 152, 18, 2],
  ];
  const deg = Math.PI / 180;
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    F.forEach(([a0, a1, L, layer], i) => {
      const side = Math.sign(a1);
      const pts = frondPath(cx + side * 0.5, ground - 1, a0 * deg, a1 * deg, L);
      // Sway: the outer part shifts by whole pixels (rigid, so nothing shimmers); the base stays put.
      const sw = [0, 1, 0, -1][(f + i) % 4] * (layer === 2 ? 0 : 1);
      const off = (k: number): number => (k / (pts.length - 1) > 0.55 ? sw : 0);
      const mat = layer === 0 ? FOL_BACK : FOL;
      const part = i, dep = layer * 2 + i * 0.1;
      pts.forEach(([x, y], k) => b.put(x + off(k), y, mat, k / pts.length < 0.25 ? 1 : 2, part, dep));
      // Pinnae: pairs pointing forward along the rachis, longest a third of the way out, tiny at the tip.
      const pmax = layer === 2 ? 4.6 : 6.4;
      for (let s = 2.5, j = 0; s < L - 0.5; s += 3.3, j++) {
        const k = Math.min(pts.length - 1, Math.round(s * 2));
        const [px, py, a] = pts[k];
        const u = s / L;
        const pl = Math.max(1, pmax * Math.pow(Math.sin(Math.PI * clamp(u * 0.9 + 0.1, 0, 1)), 0.6) * (1 - 0.55 * u));
        for (const sgn of [-1, 1]) {
          const pa = a + sgn * 0.95;
          const ang = Math.atan2(-Math.cos(pa), Math.sin(pa));
          const up = -Math.cos(pa) < -0.1;
          let st = up ? 3 : 2;
          if (u < 0.22) st -= 1;
          if (layer === 2) st = up ? 3 : 2;
          const crest = up && layer !== 0 && j % 2 === 0 && u > 0.2 && u < 0.85;
          leafShape(px + off(k), py, ang, pl, 1.7, (qx, qy, t) => {
            b.put(qx, qy, mat, crest && t > 0.4 && t < 0.9 ? 4 : st, part, dep);
          });
        }
      }
    });
    // A young fiddlehead curling up in the middle.
    const fx = cx, fy = ground - 19;
    strokeQuad(b, cx, ground - 1, cx + 1, ground - 10, fx, fy + 3, () => 1, () => [FOL, 2], 40, 1.5);
    const curl: [number, number, number][] = [[0, 2, 3], [0, 1, 3], [0, 0, 4], [1, -1, 4], [2, -1, 3], [3, 0, 3], [3, 1, 2], [2, 2, 2], [1, 1, 2]];
    for (const [dx, dy, st] of curl) b.put(fx + dx, fy + dy, FOL, st, 40, 1.5);
    return finish(b, { spurs: false, inner: 1, gap: 0.5, shadow: 0 });
  };
  const idle = Array.from({ length: 4 }, (_, f) => frame(f));
  return assemble('fern', 'Fern', [0.9, 0.6], ['ambient'], { idle: { frames: idle, fps: 5 } }, cx, ground);
}

// --- wildflowers -----------------------------------------------------------------------------

function wildflowers(): WorldSprite {
  const W = 70, H = 36, cx = 35, ground = 28, height = m(0.3), halfW = m(0.8) / 2;
  const seed = 83;
  type Kind = 'daisy' | 'butter' | 'violet';
  const kinds: Kind[] = ['daisy', 'violet', 'butter', 'daisy', 'violet', 'butter', 'daisy', 'violet', 'daisy', 'butter'];
  const heads = kinds.map((kind, i) => {
    const x = cx - halfW + 4 + (i / (kinds.length - 1)) * (halfW * 2 - 8) + (rnd(seed, i, 1) - 0.5) * 3;
    const h = height * (0.6 + rnd(seed, i, 2) * 0.4) * (1 - Math.abs(x - cx) / (halfW * 2.4)) - (kind === 'violet' ? 2 : 0);
    return { x, h, kind, lean: (rnd(seed, i, 3) - 0.5) * 4 };
  });
  // The leafy base: short blades in two layers, separated so the outline reads between them.
  const blades = Array.from({ length: 18 }, (_, i) => {
    const fan = ((i + 0.5) / 18) * 2 - 1;
    const x = cx + fan * (halfW - 3) + (rnd(seed, i, 5) - 0.5) * 2;
    const h = 4 + rnd(seed, i, 6) * 5 * (1 - Math.abs(fan) * 0.45);
    return { x, h, lean: fan * 3 + (rnd(seed, i, 7) - 0.5) * 4, back: i % 2 === 0 };
  });
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    blades.forEach((bl, i) => {
      const mat = bl.back ? GRASS_BACK : GRASS;
      strokeQuad(b, bl.x, ground, bl.x + bl.lean * 0.3, ground - bl.h * 0.6, bl.x + bl.lean, ground - bl.h, (t) => (t < 0.45 ? 2 : 1), (t, side) => [mat, t < 0.35 ? 1 : side > 0.6 ? 2 : t > 0.75 && !bl.back ? 4 : 3], i, bl.back ? 0 : 1);
    });
    heads.forEach((hd, i) => {
      const sway = [0, 1, 0, -1][(f + i) % 4];
      const hx = Math.round(hd.x + hd.lean + sway), hy = Math.round(ground - hd.h);
      const part = 20 + i, dep = 2 + i * 0.05;
      strokeQuad(b, hd.x, ground, hd.x + hd.lean * 0.2, ground - hd.h * 0.5, hx, hy + 1, () => 1, (t) => [GRASS, t < 0.4 ? 1 : 2], part, dep);
      let px: [number, number, number, number][];
      if (hd.kind === 'daisy') {
        px = [[-1, -1, WHITE, 4], [0, -1, WHITE, 4], [1, -1, WHITE, 3], [-2, 0, WHITE, 4], [-1, 0, WHITE, 3], [0, 0, YELLOW, 4], [1, 0, WHITE, 3], [2, 0, WHITE, 2], [-1, 1, WHITE, 3], [0, 1, WHITE, 2], [1, 1, WHITE, 2]];
      } else if (hd.kind === 'butter') {
        px = [[-1, -1, YELLOW, 5], [1, -1, YELLOW, 3], [-1, 0, YELLOW, 4], [0, 0, YELLOW, 3], [1, 0, YELLOW, 2], [0, 1, YELLOW, 2]];
      } else {
        px = [[0, -3, VIOLET, 4], [-1, -2, VIOLET, 4], [0, -2, VIOLET, 3], [1, -2, VIOLET, 2], [-1, -1, VIOLET, 3], [0, -1, VIOLET, 3], [1, -1, VIOLET, 2], [-1, 0, VIOLET, 3], [0, 0, VIOLET, 2], [1, 0, VIOLET, 1], [0, 1, VIOLET, 2]];
      }
      for (const [dx, dy, mt, st] of px) b.put(hx + dx, hy + dy, mt, st, part, dep);
    });
    return finish(b, { spurs: false, inner: 1, gap: 0.5, shadow: 0 });
  };
  const idle = Array.from({ length: 4 }, (_, f) => frame(f));
  return assemble('flowers', 'Wildflowers', [0.8, 0.3], ['ambient'], { idle: { frames: idle, fps: 5 } }, cx, ground);
}

// --- lily pads -------------------------------------------------------------------------------

function lilyPads(): WorldSprite {
  const W = 120, H = 80, cx = 60, wy = 46;
  // The steep battle camera shows ground (and water) planes at 38/57 of their width.
  const FLAT = 38 / 57;
  // Pads: [x, y, rx, notch angle, bob phase], back to front.
  const pads: [number, number, number, number, number][] = [
    [11, -10, 11, 2.3, 2],
    [-19, -7, 12, 0.9, 0],
    [-2, -1, 15, 0.35, 4],
    [22, 3, 12, 1.2, 3],
    [-27, 6, 9, 2.7, 1],
    [6, 10, 9, 2.9, 5],
  ];
  const bob = (ph: number, f: number): number => ([0, 0, 1, 1, 1, 0][(f + ph) % 6]);
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    pads.forEach(([x, y, rx, na, ph], i) => {
      const ry = rx * FLAT;
      const pcx = cx + x, pcy = wy + y + bob(ph, f);
      const dep = i;
      const inNotch = (u: number, v: number): boolean => {
        const th = Math.atan2(v, u);
        return Math.abs(((th - na + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.24 && u * u + v * v > 0.03;
      };
      // The pad's thickness: a dark rim one pixel below the top surface, so it floats instead of lying flat as paper.
      for (let py = Math.floor(pcy - ry); py <= pcy + ry + 2; py++)
        for (let px = Math.floor(pcx - rx - 1); px <= pcx + rx + 1; px++) {
          const u = (px + 0.5 - pcx) / rx, v = (py + 0.5 - pcy - 1.5) / ry;
          if (u * u + v * v > 1 || inNotch(u, (py + 0.5 - pcy) / ry)) continue;
          b.put(px, py, LILY, 1, i, dep);
        }
      for (let py = Math.floor(pcy - ry - 1); py <= pcy + ry + 1; py++)
        for (let px = Math.floor(pcx - rx - 1); px <= pcx + rx + 1; px++) {
          const u = (px + 0.5 - pcx) / rx, v = (py + 0.5 - pcy) / ry;
          const r2 = u * u + v * v;
          if (r2 > 1 || inNotch(u, v)) continue;
          let st = 3;
          // Upturned rim: the far upper-left edge catches the light, the near right side sits in its own shade.
          if (r2 > 0.6 && -0.6 * u - 0.8 * v > 0.35) st = 4;
          if (r2 > 0.72 && u < -0.25 && u > -0.75 && v < -0.45 && rnd(90, px - Math.round(pcx), 1) < 0.6) st = 5;
          if (0.55 * u + 0.8 * v > 0.45 && noise(px - pcx, py - pcy, 3, 40 + i) > 0.35) st = 2;
          // Veins from the center.
          const th = Math.atan2(v, u);
          for (const va of [na + 2.1, na - 2.1, na + Math.PI])
            if (rx > 10 && r2 > 0.06 && r2 < 0.75 && Math.abs(((th - va + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.07) st = Math.min(st, 2);
          b.put(px, py, LILY, st, i, dep);
        }
    });
    // A lotus on the big pad: back petals rise inside the cup, side and front petals open over them.
    const [lx, ly, , , lph] = pads[2];
    const fx = cx + lx + 2, fy = wy + ly - 1 + bob(lph, f);
    const petals: [number, number, number][] = [
      [-90, 8.5, 3.6],
      [-118, 8, 3.6],
      [-62, 8, 3.6],
      [-150, 6.5, 3.4],
      [-30, 6.5, 3.4],
      [-106, 6, 3.8],
      [-74, 6, 3.8],
    ];
    petals.forEach(([dg, len, wd], k) => {
      const a = (dg * Math.PI) / 180;
      const left = dg < -90;
      const inner = k < 3;
      leafShape(fx, fy, a, len, wd, (px, py, t, s) => {
        let st = left ? 4 : dg === -90 ? 3 : 2;
        if (inner) st -= 1;
        if (t < 0.3) st = Math.max(1, st - 1);
        if (s > 0.45) st = Math.max(1, st - 1);
        if (left && !inner && t > 0.55 && t < 0.85 && s < -0.2) st = 5;
        b.put(px, py, LOTUS, st, 20 + k, 10 + k);
      });
    });
    b.put(fx, fy - 4, YELLOW, 4, 30, 9);
    b.put(fx - 1, fy - 4, YELLOW, 5, 30, 9);
    b.put(fx + 1, fy - 4, YELLOW, 3, 30, 9);
    // A closed bud on the right pad.
    const [bx2, by2, , , bph] = pads[3];
    const ux = cx + bx2 - 3, uy = wy + by2 - 1 + bob(bph, f);
    const bud: [number, number, number, number][] = [
      [0, -7, LOTUS, 4], [0, -6, LOTUS, 4], [1, -6, LOTUS, 3], [-1, -5, LOTUS, 4], [0, -5, LOTUS, 3], [1, -5, LOTUS, 2],
      [-1, -4, LOTUS, 3], [0, -4, LOTUS, 3], [1, -4, LOTUS, 2], [-1, -3, LILY, 3], [0, -3, LILY, 3], [1, -3, LILY, 2], [0, -2, LILY, 2], [0, -1, LILY, 2],
    ];
    for (const [dx, dy, mt, st] of bud) b.put(ux + dx, uy + dy, mt, st, 31, 9);
    const c = finish(b, { spurs: false, inner: 1, gap: 0.5, shadow: 0 });
    // Ripples: two broken rings that grow and fade, half a cycle apart.
    const ring = (rx: number, alpha: number, seedR: number): void => {
      if (alpha <= 8) return;
      const ry = rx * FLAT;
      const n = Math.ceil(rx * 5);
      for (let i = 0; i < n; i++) {
        const th = (i / n) * Math.PI * 2;
        if (rnd(seedR, Math.floor((i / n) * 16), 1) < 0.4) continue;
        const px = Math.round(cx - 1 + Math.cos(th) * rx), py = Math.round(wy + 1 + Math.sin(th) * ry);
        if (c.alpha(px, py) > 0) continue;
        c.set(px, py, withAlpha(R.water[5], alpha));
      }
    };
    for (const ph of [0, 3]) {
      const p = ((f + ph) % 6) / 6;
      ring(36 + p * 9, 150 * (1 - p), 90 + ph);
    }
    return c;
  };
  const idle = Array.from({ length: 6 }, (_, f) => frame(f));
  return assemble('lily_pads', 'Lily Pads', [1.2, 0.15], ['water', 'ambient'], { idle: { frames: idle, fps: 4 } }, cx, wy + 16);
}

// --- mossy log -------------------------------------------------------------------------------

function mushroomLog(): WorldSprite {
  const W = 150, H = 80, ground = 66, len = m(2), rad = 14;
  const x0 = Math.round((W - len) / 2), x1 = x0 + len - 1;
  const xa = x0 + 7, xb = x1 - 1;
  const cy = ground - rad;
  const seed = 97;
  const topAt = (x: number): number => cy - rad + (noise(x, 0, 13, seed) > 0.62 ? 0 : 1);
  // Moss mounds along the top: [start, end, height above the bark].
  const mounds: [number, number, number][] = [];
  for (let x = xa + 2, k = 0; x < xb - 10; k++) {
    const w = 6 + Math.floor(rnd(seed, k, 1) * 7);
    if (rnd(seed, k, 2) < 0.18) {
      x += 3 + Math.floor(rnd(seed, k, 3) * 4);
      continue;
    }
    mounds.push([x, Math.min(x + w, xb - 10), 1 + Math.floor(rnd(seed, k, 4) * 2.6)]);
    x += w - 1;
  }
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    // Body: a horizontal cylinder lit from the upper left, bark plates running along it.
    for (let x = xa; x <= xb; x++) {
      const yt = topAt(x);
      const end = xb - x; // splinters at the broken right end
      const jt = end < 4 ? [3, 6, 2, 8][end] : 0, jb = end < 4 ? [2, 5, 1, 7][end] : 0;
      for (let y = yt + jt; y <= ground - jb; y++) {
        const v = clamp((y + 0.5 - cy) / rad, -0.999, 0.999);
        const L = lambert(-0.2, v, Math.sqrt(1 - v * v));
        let st = L > 0.82 ? 4 : L > 0.5 ? 3 : L > 0.25 ? 2 : 1;
        // Furrows evenly spaced around the cylinder, so they crowd together toward the top and bottom.
        const arc = Math.asin(v) * rad + noise(x, 0, 10, seed + 1) * 2.5;
        const pr = Math.floor(arc / 4.4), pos = arc - pr * 4.4;
        const cut = (x + pr * 5) % 12 === 0 && rnd(seed, pr + 20, Math.floor((x + pr * 5) / 12)) < 0.65;
        if (pos < 1 || cut) st = Math.max(1, st - 1);
        else if (pos < 2 && st >= 3 && rnd(seed, pr + 40, Math.floor((x + pr * 5) / 12)) < 0.55) st = Math.min(4, st + 1);
        if (y >= ground - 1) st = 1;
        if (end < 7) st = Math.max(1, st - 1);
        b.put(x, y, BARK, st, 1, 1);
      }
      // Pale splintered wood inside the break.
      if (end < 4 && end > 0)
        for (let y = cy - 7 + jt; y <= cy + 6 - jb; y++) if (b.has(x, y)) b.put(x, y, WOOD, end === 1 ? (y < cy ? 3 : 2) : y < cy - 2 ? 2 : 1, 1, 1);
    }
    // A broken branch stub, angled up and back, with a pale cut tip.
    const sx = xa + 30, sy = topAt(sx);
    for (let k = 0; k < 6; k++)
      for (let w = -2; w <= 1; w++) b.put(sx + k + w, sy - k + 1, BARK, w < -1 ? 4 : w < 1 ? 3 : 2, 3, 0.5);
    for (const [dx, dy, st] of [[4, -5, 4], [5, -6, 4], [6, -6, 3], [6, -5, 3], [7, -6, 2]] as [number, number, number][]) b.put(sx + dx, sy + dy, WOOD, st, 3, 0.6);
    // Moss mounds along the top, lit from the upper left, with a few drips down the side.
    mounds.forEach(([ms, me, mh], k) => {
      for (let x = ms; x <= me; x++) {
        const u = (x - ms) / Math.max(1, me - ms);
        const yt = topAt(x);
        const top = yt - Math.round(mh * Math.pow(Math.sin(Math.PI * u), 0.7));
        const drip = rnd(seed, x, 60) < 0.16 ? 2 + Math.floor(rnd(seed, x, 61) * 3) : 0;
        const bottom = yt + 2 + Math.round(Math.sin(Math.PI * u) * 2) + drip;
        for (let y = top; y <= bottom; y++) {
          const e = y - top;
          let st = e === 0 ? (u < 0.62 ? 4 : 3) : e === 1 ? (u < 0.35 ? 4 : 3) : y > bottom - 2 ? 2 : 3;
          if (u > 0.8 && e <= 2) st = Math.max(2, st - 1);
          if (e === 0 && u > 0.22 && u < 0.42 && rnd(seed, k, 62) < 0.6) st = 5;
          b.put(x, y, MOSS, st, 2, 1.5);
        }
      }
    });
    // Cut face (left): concentric rings, a bark rim and a radial crack.
    const rx = 7, ry = rad + 0.5;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(xa - rx); x <= xa + rx; x++) {
        const u = (x + 0.5 - xa) / rx, v = (y + 0.5 - cy) / ry;
        const r = Math.sqrt(u * u + v * v);
        if (r > 1) continue;
        if (r > 0.84) {
          b.put(x, y, BARK, v > 0.55 ? 1 : u < 0.1 && v < 0 ? 3 : 2, 4, 2);
          continue;
        }
        const wob = r + (noise(x, y, 4, seed + 10) - 0.5) * 0.08;
        const ring = Math.floor(wob * 5.5) !== Math.floor((wob + 0.07) * 5.5);
        let st = 3;
        if (-0.6 * u - 0.8 * v > 0.25 && r > 0.35) st = 4;
        if (u * 0.6 + v * 0.8 > 0.45) st = 2;
        if (ring) st -= 1;
        if (r < 0.13) st = 2;
        if (Math.abs(v - u * 1.3) < 0.1 && r > 0.18 && u > 0) st = 1;
        b.put(x, y, WOOD, clamp(st, 1, 4), 4, 2);
      }
    for (let x = xa - 4; x <= xa + 5; x++) b.put(x, Math.floor(cy - ry) + (x < xa - 2 || x > xa + 3 ? 1 : 0), MOSS, x < xa ? 4 : 3, 4, 2.1);
    // Mushrooms. Caps breathe: frames 2-5 raise every cap by 1 px.
    const breath = f >= 2 && f <= 5 ? 1 : 0;
    const shroom = (mx: number, baseY: number, capW: number, capH: number, stemH: number, mat: number, part: number, dep: number): void => {
      const top = baseY - stemH - capH - breath;
      for (let y = top + capH; y <= baseY; y++)
        for (let x = mx - 1; x <= mx; x++) b.put(x, y, STALK, y === top + capH ? 1 : x < mx ? 2 : 1, part, dep);
      const hwMax = capW / 2;
      for (let j = 0; j < capH; j++) {
        const frac = (j + 1) / capH;
        const hw = hwMax * Math.sqrt(1 - (1 - frac) * (1 - frac) * 0.85);
        for (let x = Math.round(mx - 0.5 - hw); x <= Math.round(mx - 0.5 + hw); x++) {
          const u = (x + 0.5 - (mx - 0.5)) / hwMax;
          let st = u < -0.2 && j < capH - 1 ? 4 : u > 0.4 ? 2 : 3;
          if (j === capH - 1) st = Math.max(2, st - 1);
          if (u > -0.65 && u < -0.15 && j === 0 && capW > 4) st = 5;
          b.put(x, top + j, mat, st, part, dep);
        }
      }
      // Gills: the dark underside just below the rim.
      for (let x = Math.round(mx - hwMax + 0.5); x <= Math.round(mx + hwMax - 1.5); x++) if (x < mx - 1 || x > mx) b.put(x, top + capH, mat, 1, part, dep);
    };
    const mbx = xb - 30;
    shroom(mbx - 7, topAt(mbx - 7) + 3, 6, 3, 2, CAP, 12, 3.4);
    shroom(mbx, topAt(mbx) + 2, 10, 4, 4, CAP, 10, 3);
    shroom(mbx + 8, topAt(mbx + 8) + 3, 7, 3, 3, CAP, 11, 3.2);
    // Faintly glowing teal caps at the foot of the log.
    const teal: [number, number, number, number, number][] = [
      [xb - 15, 5, 2, 3, 13],
      [xb - 9, 4, 2, 2, 14],
      [xb - 20, 3, 2, 1, 15],
    ];
    for (const [tx, w, h, sh, part] of teal) shroom(tx, ground, w, h, sh, TEAL, part, 4);
    // The glow lights the bark around the teal caps.
    for (const [tx, , h, sh] of teal)
      for (let y = ground - h - sh - 6; y <= ground; y++)
        for (let x = tx - 6; x <= tx + 6; x++) if (b.matAt(x, y) === BARK && Math.hypot(x + 0.5 - tx, (y - (ground - sh - h)) * 1.2) < 4.5) b.shade(x, y, 1);
    const c = finish(b, { spurs: false, inner: 1, gap: 0.4, shadow: 1 });
    // A soft, stepped halo around the teal caps, a little brighter while they breathe in.
    for (const [tx, , h, sh] of teal) {
      const gy = ground - sh - h - breath;
      for (let y = gy - 7; y <= ground; y++)
        for (let x = tx - 8; x <= tx + 8; x++) {
          if (c.alpha(x, y) > 0) continue;
          const d = Math.hypot(x + 0.5 - tx, (y + 0.5 - gy) * 1.15);
          const a = d < 3.2 ? 72 : d < 5.6 ? 34 : 0;
          if (a) c.plot(x, y, withAlpha(R.teal[5], a * (breath ? 1.3 : 1)));
        }
    }
    // Spores drift up and fade; each lives for the whole 8-frame cycle.
    for (let k = 0; k < 5; k++) {
      const life = ((f + k * 3) % 8) / 8;
      const tanSpore = k >= 3;
      const ox = tanSpore ? mbx + (k === 3 ? -3 : 4) : teal[k][0];
      const oy = tanSpore ? topAt(mbx) - 7 : ground - teal[k][2] - teal[k][3] - 1;
      const x = Math.round(ox + Math.sin(life * 5 + k) * 1.5 + (k - 2) * 0.6);
      const y = Math.round(oy - 1 - life * 18);
      const a = life < 0.15 ? life / 0.15 : 1 - (life - 0.15) / 0.85;
      if (a > 0.1) c.plot(x, y, withAlpha(tanSpore ? R.rope[5] : R.teal[5], 235 * a));
    }
    return c;
  };
  const idle = Array.from({ length: 8 }, (_, f) => frame(f));
  return assemble('mushroom_log', 'Mossy Log with Mushrooms', [2, 0.6], ['cover-half', 'climbable', 'flammable'], { idle: { frames: idle, fps: 5 } }, Math.round((x0 + x1) / 2), ground);
}

// --- main ------------------------------------------------------------------------------------

const sprites: WorldSprite[] = [
  bushSprite(roundBush()),
  bushSprite(wideBush()),
  bushSprite(azaleaBush()),
  tallGrass(),
  cattails(),
  fern(),
  wildflowers(),
  lilyPads(),
  mushroomLog(),
];

writeGroup('plants', sprites);
const dir = previewDir();
preview(sprites, join(dir, 'plants.png'), { scale: 3 });

// Review crops: every animation as a strip of frames, and the first frame zoomed so single pixels can be judged.
const BG: Color = [93, 107, 87, 255];
for (const s of sprites) {
  for (const [key, a] of Object.entries(s.anims)) {
    const fw = a.frames[0].w, fh = a.frames[0].h;
    const strip = new Canvas((fw + 2) * a.frames.length, fh);
    strip.fillRect(0, 0, strip.w, strip.h, BG);
    a.frames.forEach((fr, i) => strip.draw(fr, i * (fw + 2), 0));
    strip.scaled(fw > 100 ? 3 : 4).save(join(dir, `plants-${s.name}-${key}.png`));
  }
  const first = Object.values(s.anims)[0].frames[0];
  const z = new Canvas(first.w, first.h);
  z.fillRect(0, 0, z.w, z.h, BG);
  z.draw(first, 0, 0);
  z.set(s.anchor[0], s.anchor[1], [255, 0, 255, 255]);
  z.scaled(6).save(join(dir, `plants-${s.name}-zoom.png`));
  const bb = first.bounds(200);
  const h = bb ? bb[3] - bb[1] + 1 : 0, w = bb ? bb[2] - bb[0] + 1 : 0;
  console.log(
    `${s.name.padEnd(13)} frame ${first.w}x${first.h} anchor ${s.anchor} opaque ${w}x${h} (target ${m(s.meters[0])}x${m(s.meters[1])}) anims ${Object.entries(s.anims)
      .map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? '(once)' : ''}`)
      .join(' ')}`,
  );
}
