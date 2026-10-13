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
