// Plants for the battle maps: bushes and grass the party hides in, reeds for the river bank,
// ferns, wildflowers, lily pads and a mossy log with mushrooms.
//
//   npx tsx tools/world-sprites/plants.ts [previewDir]
//
// Foliage is built from leaf stamps: each clump scatters small almond leaves over a sphere,
// and every leaf takes one ramp step from the clump's light, so the shading reads as leaf-shaped
// clusters instead of noise. Clumps are drawn back to front; the back clump gets a dark inner line
// and a short cast shadow where a front clump overlaps it. Everything is drawn into a step buffer
// (material + ramp step per pixel) and turned into colors at the end, then outlined by the kit.

import { join } from 'node:path';
import { Anim, Canvas, Color, MATERIALS, WorldSprite, cylinderLight, hash, lambert, m, noise, preview, previewDir, ramp, withAlpha, writeGroup } from './kit';

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
  bark: ramp(MATERIALS.bark),
  wood: ramp(MATERIALS.wood),
  woodDark: ramp(MATERIALS.woodDark),
  rope: ramp(MATERIALS.rope),
  paper: ramp(MATERIALS.paper),
  water: ramp(MATERIALS.water),
  // Accents (flowers, lotus, glowing caps): saturated only where they mean something.
  pink: ramp('#d65a8c', { shift: 10 }),
  lotus: ramp('#e07fa2', { shift: 10 }),
  white: ramp('#dcd8e6', { shift: 10 }),
  violet: ramp('#8660c8', { shift: 10 }),
  yellow: ramp('#e3b832', { shift: 8 }),
  teal: ramp('#38b3a0', { shift: 10 }),
};
/** Foliage: front clumps on the leaf ramp, young lit tips from leafLight. */
const FOL = pal([R.leaf[0], R.leaf[1], R.leaf[2], R.leaf[3], R.leaf[4], R.leafLight[4]]);
/** Clumps that peek out from behind: the deeper leaf ramp. */
const FOL_BACK = pal([R.leafDeep[0], R.leafDeep[1], R.leafDeep[2], R.leafDeep[3], R.leaf[3], R.leaf[4]]);
/** Azalea: darker, glossier leaves so the blossoms carry the color. */
const FOL_AZ = pal([R.leafDeep[0], R.leafDeep[1], R.leafDeep[2], R.leafDeep[3], R.leaf[4], R.leafLight[4]]);
const GRASS = pal([R.grass[0], R.grass[1], R.grass[2], R.grass[3], R.leafLight[4], R.leafLight[5]]);
const GRASS_BACK = pal([R.leafDeep[0], R.leafDeep[1], R.leafDeep[2], R.grass[2], R.grass[3], R.leafLight[4]]);
const REED = pal(R.moss);
const REED_BACK = pal([R.leafDeep[0], R.leafDeep[1], R.leafDeep[2], R.moss[2], R.moss[3], R.moss[4]]);
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
const LILY = pal([R.leaf[0], R.leaf[1], R.leaf[2], R.leaf[3], R.leaf[4], R.leafLight[4]]);

// --- deterministic helpers -------------------------------------------------------------------

const rnd = (seed: number, i: number, j = 0): number => hash(i * 7 + 3, j * 13 + 5, seed);
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, t: number): number => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

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
  partAt(x: number, y: number): number {
    return this.in(x, y) ? this.part[y * this.w + x] : -1;
  }
  depthAt(x: number, y: number): number {
    return this.in(x, y) ? this.depth[y * this.w + x] : -Infinity;
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
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
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
  /** Extra leaf density (spacing in px). */
  spacing?: number;
  /** Lean leaves toward the ground (0..1). */
  droop?: number;
  /** Light offset (makes everything a bit lighter or darker). */
  bias?: number;
}

interface LeafRec {
  x: number;
  y: number;
  ang: number;
  z: number;
  light: number;
  key: number;
}

/** The leaves of one clump in draw order (rim first, front-center last), relative to the clump center. */
function clumpLeaves(c: Clump, o: FoliageOpts, ci: number): LeafRec[] {
  const ry = c.ry ?? c.r;
  const sp = o.spacing ?? 4;
  const seed = o.seed * 31 + ci;
  const droop = o.droop ?? 0.3;
  const leaves: LeafRec[] = [];
  // Rim: leaves at even steps around the clump, pointing outward, so the silhouette is a clean scallop.
  const per = Math.PI * (1.5 * (c.r + ry) - Math.sqrt(c.r * ry));
  const n = Math.max(6, Math.round(per / (o.leafWid * 1.35)));
  for (let i = 0; i < n; i++) {
    const th = ((i + rnd(seed, i, 1) * 0.5) / n) * Math.PI * 2;
    const rr = 0.72 + rnd(seed, i, 2) * 0.1;
    const lx = Math.cos(th) * c.r * rr, ly = Math.sin(th) * ry * rr;
    let ang = th + (rnd(seed, i, 3) - 0.5) * 0.35;
    ang = Math.atan2(Math.sin(ang) * (1 - droop) + droop * 0.6, Math.cos(ang));
    leaves.push({ x: lx, y: ly, ang, z: -1 + rnd(seed, i, 4) * 0.1, light: 0, key: 1000 + i });
  }
  // Interior: a jittered grid of leaves hanging toward the viewer, drawn back (top) to front.
  let k = 0;
  for (let gy = -ry; gy <= ry; gy += sp * 0.75)
    for (let gx = -c.r; gx <= c.r; gx += sp) {
      k++;
      const row = Math.round((gy + ry) / (sp * 0.75));
      const lx = gx + (row & 1 ? sp / 2 : 0) + (rnd(seed, k, 1) - 0.5) * sp * 0.6;
      const ly = gy + (rnd(seed, k, 2) - 0.5) * sp * 0.5;
      const u = lx / c.r, v = ly / ry;
      const r2 = u * u + v * v;
      if (r2 > 0.62) continue;
      const z = Math.sqrt(1 - r2);
      // Mostly hanging down and outward, following the clump's curve.
      const out = Math.atan2(v, u);
      let ang = r2 < 0.08 ? Math.PI / 2 : out;
      ang = Math.atan2(Math.sin(ang) * 0.5 + 0.75, Math.cos(ang)) + (rnd(seed, k, 3) - 0.5) * 0.7;
      leaves.push({ x: lx, y: ly, ang, z: z * 0.5 + (ly / ry) * 0.25, light: 0, key: k });
    }
  leaves.sort((a, b) => a.z - b.z || a.y - b.y);
  return leaves;
}

function leafLight(c: Clump, o: FoliageOpts, lf: LeafRec, ox: number, oy: number, ci: number): number {
  const ry = c.ry ?? c.r;
  const u = clamp(lf.x / c.r, -1, 1), v = clamp(lf.y / ry, -1, 1);
  const z = Math.sqrt(Math.max(0.02, 1 - u * u - v * v));
  const local = lambert(u, v, z);
  const [fx, fy, frx, fry] = o.form;
  const U = clamp((c.x + ox + lf.x - fx) / frx, -1, 1), V = clamp((c.y + oy + lf.y - fy) / fry, -1, 1);
  const global = lambert(U * 0.85, V * 0.85, Math.sqrt(Math.max(0.05, 1 - (U * U + V * V) * 0.72)));
  const ao = smooth(o.ground - fry * 0.8, o.ground, c.y + oy + lf.y) * 0.25;
  const jitter = (rnd(o.seed * 31 + ci, lf.key, 9) - 0.5) * 0.08;
  return local * 0.6 + global * 0.45 - ao + jitter + (o.bias ?? 0) + (c.back ? -0.03 : 0) - 0.06;
}

const lightStep = (l: number): number => (l < 0.3 ? 1 : l < 0.52 ? 2 : l < 0.78 ? 3 : l < 0.95 ? 4 : 5);

/** Draws foliage clumps (each offset by `offs[i]`) into the buffer; parts are clump indices. */
function drawFoliage(b: Buf, clumps: Clump[], o: FoliageOpts, offs: [number, number][] = [], front = FOL): void {
  const order = clumps.map((c, i) => i).sort((a, b2) => clumps[a].z - clumps[b2].z);
  for (const ci of order) {
    const c = clumps[ci];
    const [ox, oy] = offs[ci] ?? [0, 0];
    const cx = Math.round(c.x + ox), cy = Math.round(c.y + oy);
    const mat = c.back ? FOL_BACK : front;
    const seed = o.seed * 31 + ci;
    for (const lf of clumpLeaves(c, o, ci)) {
      const l = leafLight(c, o, lf, ox, oy, ci);
      const st = Math.min(lightStep(l), 4);
      const rimLeaf = lf.key >= 1000;
      const len = o.leafLen * (0.9 + rnd(seed, lf.key, 6) * 0.25) * (rimLeaf ? 1.15 : 1);
      const wid = o.leafWid * (0.9 + rnd(seed, lf.key, 7) * 0.2) * (rimLeaf ? 0.85 : 1);
      const sx = cx + lf.x - Math.cos(lf.ang) * len * 0.3, sy = cy + lf.y - Math.sin(lf.ang) * len * 0.3;
      const glint = st >= 4 && rnd(seed, lf.key, 8) < 0.4;
      const rim = lf.key >= 1000;
      // Which side of the leaf axis faces down-right (away from the light)?
      const nx = -Math.sin(lf.ang), ny = Math.cos(lf.ang);
      const darkSide = nx * 0.6 + ny * 0.8 > 0 ? 1 : -1;
      leafShape(sx, sy, lf.ang, len, wid, (px, py, t, s) => {
        let ss = st;
        if (!rim && st >= 3 && s * darkSide > 0.55) ss = st - 1;
        else if (!rim && st >= 3 && s * darkSide < -0.6 && t > 0.25 && t < 0.8 && rnd(seed, lf.key, 11) < 0.5) ss = Math.min(5, st + 1);
        if (glint && t > 0.5 && t < 0.9 && Math.abs(s) < 0.45) ss = 5;
        b.put(px, py, mat, ss, ci, c.z);
      });
    }
  }
}

/**
 * Removes 1 px spurs (optional) and fills holes the outside cannot reach with a dark step, so the
 * silhouette stays clean and gaps inside a clump read as deep shadow rather than see-through dots.
 */
function tidy(b: Buf, spurs = true): void {
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
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

// --- sprite assembly -------------------------------------------------------------------------

interface RawAnim {
  frames: Canvas[];
  fps: number;
  loop?: boolean;
}

/**
 * Crops every frame of every animation to the union of their opaque bounds (+1 px margin), so all
 * frames share one size and one anchor. (gx, gy) is the ground contact point on the work canvas.
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
  return { name, label, meters, anchor: [gx - x0, gy - y0], tags, anims: out };
}

/** Standard finishing: tidy, inner lines, cast shadows, colors, outline. */
function finish(b: Buf, o: { spurs?: boolean; inner?: number; gap?: number; shadow?: number } = {}): Canvas {
  tidy(b, o.spurs ?? true);
  if (o.inner !== 0) innerLines(b, o.inner ?? 1, o.gap ?? 0.5);
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
  leafShape(6 - Math.cos(ang) * len * 0.5, 6 - Math.sin(ang) * len * 0.5, ang, len, wid, (px, py, t, s) => b.put(px, py, mat, s < -0.2 && t > 0.3 ? 4 : t > 0.75 ? 2 : 3));
  const c = b.toCanvas();
  c.outline();
  return c;
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
  /** Palette of the loose bits that fly off in the rustle (leaves, petals). */
  bits: number[];
}

function bushFrame(s: BushSpec, offs: [number, number][]): Canvas {
  const b = new Buf(s.W, s.H);
  drawFoliage(b, s.clumps, s.opts, offs, s.mat);
  s.extra?.(b, offs);
  return finish(b);
}

/** Sway weight of a clump: 0 at the ground, 1 at the top of the bush. */
function swayW(s: BushSpec, c: Clump): number {
  const top = s.opts.form[1] - s.opts.form[3];
  return clamp((s.opts.ground - c.y) / (s.opts.ground - top), 0, 1);
}

function bushSprite(s: BushSpec): WorldSprite {
  // Idle: the upper clumps drift 1 px right, back, 1 px left, back (the base never moves).
  const idle = [0, 1, 0, -1].map((p) => bushFrame(s, s.clumps.map((c) => [swayW(s, c) > 0.55 ? p : 0, 0] as [number, number])));
  // Rustle: squash (anticipation), a hard shake that alternates between clumps, then settle.
  const shake: [number, number][] = [[-1, 1], [2, -1], [-2, 0], [1, 0], [-1, 0], [0, 0]];
  const [fx, , frx] = s.opts.form;
  const top = s.opts.form[1] - s.opts.form[3];
  // Loose bits: start on the crown, pop up and out, tumble and fall, fading on the way down.
  const flyers = [
    { x: fx - frx * 0.45, y: top + 6, vx: -2.6, vy: -4.2, a: 0.4 },
    { x: fx + frx * 0.35, y: top + 4, vx: 2.4, vy: -5, a: 2.2 },
    { x: fx - frx * 0.05, y: top + 2, vx: 0.8, vy: -6, a: 1.2 },
  ];
  const rustle = shake.map(([dx, dy], f) => {
    const frame = bushFrame(
      s,
      s.clumps.map((c, i) => {
        const w = swayW(s, c);
        const alt = i % 2 ? 1 : -0.6;
        return [Math.round(dx * w * (f >= 1 && f <= 2 ? alt : 1)), w > 0.5 ? dy : 0] as [number, number];
      }),
    );
    if (f >= 1 && f <= 4) {
      const t = f - 1;
      flyers.forEach((p, k) => {
        const x = p.x + p.vx * t + Math.sin(t * 2 + k) * 1.2, y = p.y + p.vy * t + 1.9 * t * t;
        const leaf = looseLeaf(s.bits[k % s.bits.length], p.a + t * 1.4 * (k % 2 ? 1 : -1));
        blit(frame, leaf, Math.round(x - 6), Math.round(y - 6), f === 4 ? 0.55 : 1);
      });
    }
    return frame;
  });
  return assemble(s.name, s.label, s.meters, ['hide-spot', 'cover-half', 'flammable', 'destructible'], { idle: { frames: idle, fps: 4 }, rustle: { frames: rustle, fps: 12, loop: false } }, s.gx, s.opts.ground);
}

function roundBush(): BushSpec {
  const W = 140, H = 120, gx = 70, ground = 104;
  const hgt = m(1.1), wid = m(1.3);
  const top = ground - hgt;
  // A dome of clumps: lower clumps are nearer (z follows y); two deep clumps peek out behind at the sides.
  const L: [number, number, number, boolean?][] = [
    [-24, 30, 11, true],
    [26, 31, 11, true],
    [-12, 13, 14],
    [8, 11, 15],
    [-27, 27, 12],
    [-6, 29, 15],
    [17, 26, 14],
    [29, 39, 11],
    [-22, 46, 13],
    [3, 47, 15],
    [24, 49, 12],
  ];
  return {
    name: 'bush_round',
    label: 'Round Bush',
    meters: [1.3, 1.1],
    clumps: L.map(([x, y, r, back]) => ({ x: gx + x, y: top + y, r, back, z: back ? -1 : y })),
    opts: { seed: 11, leafLen: 7, leafWid: 4.5, form: [gx - 2, top + hgt * 0.5, wid / 2, hgt / 2], ground },
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
  // A low, long mound: a back ridge, a front row, and one crown that breaks the line left of center.
  const L: [number, number, number, number?, boolean?][] = [
    [-48, 26, 10, 9, true],
    [50, 27, 10, 9, true],
    [-30, 14, 13, 12],
    [-10, 9, 14, 13],
    [12, 13, 14, 12],
    [33, 17, 13, 12],
    [-46, 31, 11, 10],
    [-26, 31, 13, 11],
    [-2, 30, 14, 12],
    [22, 32, 13, 11],
    [45, 34, 11, 10],
  ];
  return {
    name: 'bush_wide',
    label: 'Wide Shrub',
    meters: [2, 0.9],
    clumps: L.map(([x, y, r, ry, back]) => ({ x: gx + x, y: top + y, r, ry, back, z: back ? -1 : y })),
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
  const L: [number, number, number, number?, boolean?][] = [
    [-28, 24, 10, 10, true],
    [30, 26, 10, 10, true],
    [-14, 12, 13, 11],
    [10, 11, 14, 11],
    [-28, 26, 11, 10],
    [-6, 26, 14, 12],
    [20, 25, 13, 11],
    [-20, 42, 13, 11],
    [4, 43, 14, 11],
    [27, 43, 11, 10],
  ];
  const clumps: Clump[] = L.map(([x, y, r, ry, back]) => ({ x: gx + x, y: top + y, r, ry, back, z: back ? -1 : y }));
  const seed = 37;
  // Blossom clusters sit on the upper, outward face of each clump.
  const clusters: { ci: number; x: number; y: number; white: boolean }[] = [];
  clumps.forEach((c, ci) => {
    const n = c.back ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (rnd(seed, ci, k) - 0.5) * 2.6;
      const rr = 0.35 + rnd(seed, ci, k + 9) * 0.4;
      clusters.push({ ci, x: Math.cos(a) * c.r * rr, y: Math.sin(a) * (c.ry ?? c.r) * rr, white: rnd(seed, ci, k + 20) < 0.3 });
    }
  });
  const form: [number, number, number, number] = [gx - 2, top + hgt * 0.5, wid / 2, hgt / 2];
  const extra = (b: Buf, offs: [number, number][]): void => {
    clusters.forEach((cl, k) => {
      const c = clumps[cl.ci];
      const [ox, oy] = offs[cl.ci] ?? [0, 0];
      const x0 = Math.round(c.x + ox + cl.x), y0 = Math.round(c.y + oy + cl.y);
      const U = clamp((x0 - form[0]) / form[2], -1, 1), V = clamp((y0 - form[1]) / form[3], -1, 1);
      const lit = lambert(U * 0.8, V * 0.8, 0.6) + (cl.y / (c.ry ?? c.r)) * -0.25;
      const mat = cl.white ? WHITE : PINK;
      // 3-4 five-petal flowers per cluster, each a plus shape with a darker throat.
      const n = 3 + (k % 2);
      for (let f = 0; f < n; f++) {
        const fx = x0 + Math.round((rnd(seed, k, f + 40) - 0.5) * 6), fy = y0 + Math.round((rnd(seed, k, f + 50) - 0.5) * 4);
        const base = lit > 0.62 ? 3 : lit > 0.42 ? 3 : 2;
        const dep = c.z + 0.2;
        const cells: [number, number, number][] = [[0, -1, 1], [-1, 0, 1], [1, 0, -1], [0, 1, -1], [0, 0, 0]];
        for (const [dx, dy, l] of cells) {
          const st = dx === 0 && dy === 0 ? base - 1 : base + (l > 0 && lit > 0.55 ? 1 : l < 0 ? -0.4 : 0);
          b.put(fx + dx, fy + dy, mat, Math.round(st), 100 + k, dep);
        }
        if (lit > 0.7 && f === 0) b.put(fx - 1, fy - 1, mat, 5, 100 + k, dep);
        // Shadow the leaves just below-right of the flower.
        for (const [dx, dy] of [[1, 1], [2, 0], [0, 2]]) if (b.partAt(fx + dx, fy + dy) < 100) b.shade(fx + dx, fy + dy, -1);
      }
    });
  };
  return {
    name: 'bush_flower',
    label: 'Azalea Bush',
    meters: [1.4, 1],
    clumps,
    opts: { seed, leafLen: 5.5, leafWid: 3.6, spacing: 3.6, form, ground, bias: 0.02 },
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
  z: number;
  back: boolean;
}

function grassBlades(seed: number, cx: number, ground: number, height: number, halfW: number): Blade[] {
  const blades: Blade[] = [];
  // Tufts across the base; each fans its blades outward, the middle tufts tallest.
  const tufts = [-0.7, -0.38, -0.05, 0.3, 0.62];
  let k = 0;
  tufts.forEach((tu, ti) => {
    const n = 7 + (ti % 2);
    for (let i = 0; i < n; i++, k++) {
      const bx = cx + tu * halfW * 0.75 + (rnd(seed, k, 1) - 0.5) * 5;
      const fan = (i / (n - 1) - 0.5) * 2;
      const tall = 1 - Math.abs(tu) * 0.45;
      const h = height * tall * (0.55 + rnd(seed, k, 2) * 0.45) * (1 - Math.abs(fan) * 0.18);
      const lean = fan * 9 + tu * 10 + (rnd(seed, k, 3) - 0.5) * 6;
      const bend = rnd(seed, k, 4) < 0.22;
      const tipX = bx + lean * (bend ? 1.9 : 1);
      const tipY = ground - h * (bend ? 0.72 : 1);
      blades.push({ bx, h, tipX, tipY, cx: bx + lean * 0.25, cy: ground - h * (bend ? 0.95 : 0.6), w: rnd(seed, k, 5) < 0.4 ? 3 : 2, z: rnd(seed, k, 6), back: rnd(seed, k, 7) < 0.4 });
    }
  });
  return blades.sort((a, b) => (a.back === b.back ? a.z - b.z : a.back ? -1 : 1));
}

/** Draws blades; `bend(bl)` adds a tip displacement in px for the frame. */
function drawBlades(b: Buf, blades: Blade[], ground: number, height: number, bend: (bl: Blade) => number, seed: number): void {
  blades.forEach((bl, i) => {
    const d = bend(bl);
    const mat = bl.back ? GRASS_BACK : GRASS;
    const tipLit = !bl.back && rnd(seed, i, 11) < 0.7;
    strokeQuad(
      b,
      bl.bx,
      ground,
      bl.cx + d * 0.45,
      bl.cy,
      bl.tipX + d,
      bl.tipY + Math.abs(d) * 0.12,
      (t) => (t < 0.45 ? bl.w : t < 0.8 ? Math.min(2, bl.w) : 1),
      (t, side) => {
        let st = t < 0.22 ? 1 : t < 0.55 ? 2 : t < 0.86 ? 3 : 4;
        if (bl.back) st = Math.min(st, 3);
        if (side > 0.6 && st > 1) st -= 1;
        if (t > 0.94 && tipLit) st = 5;
        return [mat, st];
      },
      i,
      bl.back ? 0 : 1 + bl.z,
    );
  });
  void height;
}

function tallGrass(): WorldSprite {
  const W = 110, H = 90, cx = 55, ground = 78, height = m(0.8), halfW = m(1) / 2;
  const seed = 51;
  const blades = grassBlades(seed, cx, ground, height, halfW);
  const frame = (bend: (bl: Blade) => number, bits?: (c: Canvas) => void): Canvas => {
    const b = new Buf(W, H);
    drawBlades(b, blades, ground, height, bend, seed);
    const c = finish(b, { spurs: false, inner: 1, gap: 0.35, shadow: 0 });
    bits?.(c);
    return c;
  };
  // Idle: a wind wave crossing from left to right, tips move up to ~2-3 px, the base stays put.
  const idle = Array.from({ length: 6 }, (_, f) => frame((bl) => Math.round((1 + 1.6 * (bl.h / height)) * Math.sin((f / 6) * Math.PI * 2 - (bl.bx - cx) * 0.05))));
  // Rustle: blades squeeze in, part to both sides as someone pushes through, overshoot and settle.
  const part = [-1, 6, 4, -2, 1, 0];
  const rustle = part.map((a, f) =>
    frame(
      (bl) => Math.round(a * Math.sign(bl.bx - cx + 0.5) * (0.4 + 0.6 * (bl.h / height))),
      (c) => {
        if (f < 1 || f > 4) return;
        const t = f - 1;
        [[-6, -4.5, 0.3], [5, -5.5, 2.4]].forEach(([vx, vy, a0], k) => {
          const leaf = looseLeaf(GRASS, a0 + t * 1.6, 5, 2.4);
          blit(c, leaf, Math.round(cx + (k ? 8 : -10) + vx * t - 6), Math.round(ground - height + 2 + vy * t + 2 * t * t - 6), f === 4 ? 0.55 : 1);
        });
      },
    ),
  );
  return assemble('tall_grass', 'Tall Grass', [1, 0.8], ['hide-spot', 'flammable'], { idle: { frames: idle, fps: 5 }, rustle: { frames: rustle, fps: 12, loop: false } }, cx, ground);
}

// --- reeds -----------------------------------------------------------------------------------

function cattails(): WorldSprite {
  const W = 90, H = 120, cx = 45, ground = 108, height = m(1.5), halfW = m(0.8) / 2;
  const seed = 63;
  // Strap leaves fan from the clump; some arch over and hang.
  const leaves = Array.from({ length: 10 }, (_, i) => {
    const fan = (i / 9 - 0.5) * 2;
    const h = height * (0.42 + rnd(seed, i, 1) * 0.3) * (1 - Math.abs(fan) * 0.25);
    const arch = rnd(seed, i, 2) < 0.4;
    const lean = fan * halfW * 0.9 + (rnd(seed, i, 3) - 0.5) * 6;
    return { bx: cx + fan * 5, h, tipX: cx + lean * (arch ? 1.5 : 1), tipY: ground - h * (arch ? 0.7 : 1), cx: cx + lean * 0.3, cy: ground - h * (arch ? 1.05 : 0.6), back: i % 3 === 1, z: rnd(seed, i, 4) };
  });
  // Stems with their brown heads.
  const stems = [
    { bx: cx - 4, h: height - 2, lean: -7, head: 13 },
    { bx: cx + 2, h: height * 0.9, lean: 3, head: 12 },
    { bx: cx + 6, h: height * 0.76, lean: 12, head: 11 },
    { bx: cx - 9, h: height * 0.66, lean: -14, head: 10 },
  ];
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    const sway = (h: number, x: number): number => Math.round(Math.sin((f / 6) * Math.PI * 2 - (x - cx) * 0.06) * (0.5 + 2.4 * (h / height)));
    leaves
      .slice()
      .sort((a, b2) => (a.back === b2.back ? a.z - b2.z : a.back ? -1 : 1))
      .forEach((l, i) => {
        const d = sway(l.h, l.bx);
        const mat = l.back ? REED_BACK : REED;
        strokeQuad(b, l.bx, ground, l.cx + d * 0.4, l.cy, l.tipX + d, l.tipY, (t) => (t < 0.35 ? 3 : t < 0.75 ? 2 : 1), (t, side) => {
          let st = t < 0.2 ? 1 : t < 0.5 ? 2 : 3;
          if (side > 0.6) st = Math.max(1, st - 1);
          if (side < 0.4 && t > 0.3 && t < 0.8 && !l.back) st = Math.min(4, st + 1);
          return [mat, st];
        }, i, l.back ? 0 : 1 + l.z);
      });
    stems.forEach((s, i) => {
      const d = sway(s.h, s.bx);
      const x1 = s.bx + s.lean + d, y1 = ground - s.h;
      const c1x = s.bx + s.lean * 0.3 + d * 0.3, c1y = ground - s.h * 0.55;
      const part = 50 + i, dep = 3 + i * 0.1;
      strokeQuad(b, s.bx, ground, c1x, c1y, x1, y1, (t) => (t < 0.6 ? 2 : 1), (t, side) => [REED, side > 0.6 ? 2 : t > 0.5 ? 3 : 2], part, dep);
      // Head: a rounded brown cylinder along the stem, then a thin spike.
      const len = s.h;
      const t0 = 1 - (s.head + 6) / len, t1 = 1 - 6 / len;
      for (let t = t0; t <= t1; t += 0.2 / len) {
        const [x, y] = quad(s.bx, ground, c1x, c1y, x1, y1, t);
        const e = (t - t0) / (t1 - t0);
        const r = 2.3 * Math.min(1, Math.sin(Math.PI * Math.min(1, e * 1.0)) * 1.9);
        for (let ox = -3; ox <= 3; ox++) {
          const u = (ox + 0.5) / Math.max(0.8, r);
          if (Math.abs(u) > 1) continue;
          const li = cylinderLight(u * 0.9);
          let st = li > 0.75 ? 4 : li > 0.5 ? 3 : li > 0.3 ? 2 : 1;
          if (e < 0.1 || e > 0.92) st = Math.max(1, st - 1);
          if (st === 4 && e > 0.18 && e < 0.32) st = 5;
          b.put(Math.floor(x) + ox, Math.floor(y), CATTAIL, st, part, dep + 0.05);
        }
      }
      strokeQuad(b, ...(quad(s.bx, ground, c1x, c1y, x1, y1, t1).slice(0, 2) as [number, number]), x1 + 0.2, y1 - 2, x1 + 0.4, y1 - 5, () => 1, () => [REED, 3], part, dep);
    });
    return finish(b, { spurs: false, inner: 1, gap: 0.35, shadow: 0 });
  };
  const idle = Array.from({ length: 6 }, (_, f) => frame(f));
  return assemble('reeds', 'Cattail Reeds', [0.8, 1.5], ['hide-spot', 'water', 'flammable'], { idle: { frames: idle, fps: 5 } }, cx, ground);
}

// --- fern ------------------------------------------------------------------------------------

function fern(): WorldSprite {
  const W = 90, H = 60, cx = 45, ground = 50, height = m(0.6), halfW = m(0.9) / 2;
  const seed = 71;
  // Fronds: [angle of the tip from vertical (deg, + = right), length factor, back?]
  const F: [number, number, boolean][] = [
    [-28, 0.8, true],
    [24, 0.82, true],
    [-4, 0.7, true],
    [-62, 0.95, false],
    [58, 1, false],
    [-82, 0.9, false],
    [84, 0.85, false],
    [-38, 0.88, false],
    [36, 0.9, false],
  ];
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    F.forEach(([deg, lf, back], i) => {
      const a = (deg * Math.PI) / 180;
      const sx = Math.sin(a), side = Math.sign(deg) || 1;
      const reach = halfW * lf * (0.35 + 0.65 * Math.abs(sx));
      const rise = height * lf * (1 - Math.abs(sx) * 0.42);
      const sway = Math.round(Math.sin((f / 4) * Math.PI * 2 + i * 0.7) * (back ? 0.6 : 1) * (0.4 + Math.abs(sx) * 0.7));
      const x0 = cx + side * 1, y0 = ground - 1;
      const tx = cx + side * reach + sway, ty = ground - rise * 0.55 + Math.abs(sx) * 4;
      const kx = cx + side * reach * 0.35 + sway * 0.4, ky = ground - rise * 1.25;
      const mat = back ? FOL_BACK : FOL;
      const part = i, dep = back ? 0 : 1 + i * 0.1;
      // Rachis.
      strokeQuad(b, x0, y0, kx, ky, tx, ty, () => 1, (t) => [mat, t < 0.3 ? 1 : 2], part, dep);
      // Pinnae: alternate pairs that shrink toward the tip and sweep forward.
      const len = Math.hypot(kx - x0, ky - y0) + Math.hypot(tx - kx, ty - ky);
      const n = Math.floor(len / 2.2);
      for (let k = 2; k < n; k++) {
        const t = k / n;
        const [px, py, dx, dy] = quad(x0, y0, kx, ky, tx, ty, t);
        const ang = Math.atan2(dy, dx);
        const pl = (2.2 + 4.2 * Math.pow(Math.sin(Math.PI * Math.min(1, (t - 0.05) / 0.92)), 0.7)) * lf;
        for (const sgn of [-1, 1]) {
          const pa = ang + sgn * (1.25 - t * 0.45);
          // The side facing up catches the light; the underside sits a step lower.
          const up = Math.sin(pa) < -0.1;
          let st = up ? 3 : 2;
          if (back) st -= up ? 0 : 1;
          if (t < 0.25) st -= 1;
          leafShape(px, py, pa, pl, 2.3, (qx, qy, tt, ss) => {
            let s2 = st;
            if (up && !back && tt > 0.45 && ss * sgn < 0 && k % 3 === 0) s2 = 4;
            b.put(qx, qy, mat, s2, part, dep);
          });
        }
      }
    });
    // A young fiddlehead curling up in the middle.
    const fx = cx + 1, fy = ground - height * 0.72;
    strokeQuad(b, cx, ground - 1, cx + 1, ground - height * 0.4, fx, fy + 3, () => 1, () => [FOL, 2], 40, 5);
    const curl: [number, number, number][] = [[0, 2, 3], [0, 1, 3], [0, 0, 4], [1, -1, 4], [2, -1, 4], [3, 0, 3], [3, 1, 2], [2, 2, 2], [1, 1, 3]];
    for (const [dx, dy, st] of curl) b.put(fx + dx, fy + dy, FOL, st, 40, 5);
    return finish(b, { spurs: false, inner: 1, gap: 0.5, shadow: 0 });
  };
  const idle = Array.from({ length: 4 }, (_, f) => frame(f));
  return assemble('fern', 'Fern', [0.9, 0.6], ['ambient'], { idle: { frames: idle, fps: 5 } }, cx, ground);
}

// --- wildflowers -----------------------------------------------------------------------------

function wildflowers(): WorldSprite {
  const W = 70, H = 34, cx = 35, ground = 26, height = m(0.3), halfW = m(0.8) / 2;
  const seed = 83;
  type Kind = 'daisy' | 'butter' | 'violet';
  const heads: { x: number; h: number; kind: Kind; lean: number }[] = [];
  const kinds: Kind[] = ['daisy', 'violet', 'butter', 'daisy', 'violet', 'butter', 'daisy', 'violet', 'daisy', 'butter'];
  kinds.forEach((kind, i) => {
    const x = cx - halfW + 3 + (i / (kinds.length - 1)) * (halfW * 2 - 6) + (rnd(seed, i, 1) - 0.5) * 3;
    heads.push({ x, h: height * (0.55 + rnd(seed, i, 2) * 0.45) * (1 - Math.abs(x - cx) / (halfW * 2.2)), kind, lean: (rnd(seed, i, 3) - 0.5) * 4 });
  });
  const blades = Array.from({ length: 16 }, (_, i) => {
    const x = cx - halfW + 2 + (i / 15) * (halfW * 2 - 4) + (rnd(seed, i, 5) - 0.5) * 2;
    return { x, h: 3 + rnd(seed, i, 6) * 6 * (1 - Math.abs(x - cx) / (halfW * 1.6)), lean: (x - cx) * 0.12 + (rnd(seed, i, 7) - 0.5) * 3 };
  });
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    blades.forEach((bl, i) => {
      strokeQuad(b, bl.x, ground, bl.x + bl.lean * 0.3, ground - bl.h * 0.6, bl.x + bl.lean, ground - bl.h, (t) => (t < 0.5 ? 2 : 1), (t, side) => [GRASS, t < 0.4 ? 1 : side > 0.6 ? 2 : t > 0.8 ? 4 : 3], i, 0);
    });
    heads.forEach((hd, i) => {
      const sway = Math.round(Math.sin((f / 4) * Math.PI * 2 + hd.x * 0.25) * 0.9);
      const hx = Math.round(hd.x + hd.lean + sway), hy = Math.round(ground - hd.h);
      const part = 20 + i, dep = 1 + i * 0.05;
      strokeQuad(b, hd.x, ground, hd.x + hd.lean * 0.2, ground - hd.h * 0.5, hx, hy + 1, () => 1, (t) => [GRASS, t < 0.5 ? 1 : 2], part, dep);
      if (hd.kind === 'daisy') {
        const px: [number, number, number, number][] = [[-1, -1, WHITE, 4], [0, -1, WHITE, 4], [1, -1, WHITE, 3], [-2, 0, WHITE, 4], [-1, 0, YELLOW, 4], [0, 0, YELLOW, 3], [1, 0, WHITE, 3], [2, 0, WHITE, 2], [-1, 1, WHITE, 3], [0, 1, WHITE, 2], [1, 1, WHITE, 2]];
        for (const [dx, dy, mt, st] of px) b.put(hx + dx, hy + dy, mt, st, part, dep);
      } else if (hd.kind === 'butter') {
        const px: [number, number, number][] = [[-1, -1, 4], [1, -1, 3], [-1, 0, 4], [0, 0, 3], [1, 0, 2], [0, 1, 2]];
        for (const [dx, dy, st] of px) b.put(hx + dx, hy + dy, YELLOW, st, part, dep);
        b.put(hx, hy - 1, YELLOW, 5, part, dep);
      } else {
        const px: [number, number, number][] = [[0, -3, 4], [0, -2, 4], [1, -2, 2], [-1, -1, 3], [0, -1, 3], [1, -1, 2], [0, 0, 3], [1, 0, 1], [0, 1, 2]];
        for (const [dx, dy, st] of px) b.put(hx + dx, hy + dy, VIOLET, st, part, dep);
      }
    });
    return finish(b, { spurs: false, inner: 0, shadow: 0 });
  };
  const idle = Array.from({ length: 4 }, (_, f) => frame(f));
  return assemble('flowers', 'Wildflowers', [0.8, 0.3], ['ambient'], { idle: { frames: idle, fps: 5 } }, cx, ground);
}

// --- lily pads -------------------------------------------------------------------------------

function lilyPads(): WorldSprite {
  const W = 100, H = 50, cx = 50, water = 34, wid = m(1.2);
  // Pads seen at a low angle: thin ellipses, each with its notch. [x, y, rx, ry, notch angle, bob phase]
  const pads: [number, number, number, number, number, number][] = [
    [-18, -6, 11, 3.2, 0.9, 0],
    [12, -7, 10, 3, 2.2, 2],
    [-2, -3, 15, 4.4, 0.4, 4],
    [-24, 1, 9, 3, 2.6, 1],
    [21, 0, 12, 3.6, 1.2, 3],
    [2, 4, 8, 2.6, 2.9, 5],
  ];
  const bob = (ph: number, f: number): number => (Math.sin(((f + ph) / 6) * Math.PI * 2) > 0.3 ? 1 : 0);
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    pads.forEach(([x, y, rx, ry, na, ph], i) => {
      const pcx = cx + x, pcy = water - 4 + y + bob(ph, f);
      for (let py = Math.floor(pcy - ry - 1); py <= pcy + ry + 1; py++)
        for (let px = Math.floor(pcx - rx - 1); px <= pcx + rx + 1; px++) {
          const u = (px + 0.5 - pcx) / rx, v = (py + 0.5 - pcy) / ry;
          const r2 = u * u + v * v;
          if (r2 > 1) continue;
          // The notch: a wedge from the center out to the rim.
          const th = Math.atan2(v, u);
          let dth = Math.abs(((th - na + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (dth < 0.22 && r2 > 0.02) continue;
          let st = 3;
          if (v > 0.55 || (v > 0.3 && u > 0.5)) st = 2; // the near edge curls down into shade
          if (v < -0.6 && u < 0.2) st = 4; // the far rim catches the light
          if (v < -0.75 && u < -0.3 && u > -0.7) st = 5;
          // Two veins from the center.
          const vein = [na + 2.1, na - 2.1, na + Math.PI];
          for (const va of vein) {
            const d2 = Math.abs(((th - va + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (d2 < 0.06 && r2 > 0.08 && r2 < 0.8 && rx > 10) st = Math.min(st, 2);
          }
          b.put(px, py, LILY, st, i, i * 0.1 + (y + 10) * 0.05);
        }
    });
    // A lotus on the big pad.
    const [lx, ly, , , , lph] = pads[2];
    const fx = cx + lx + 2, fy = water - 4 + ly - 1 + bob(lph, f);
    const petals: [number, number, number, number][] = [
      [-90, 8, 3.6, 4],
      [-120, 7.5, 3.6, 3],
      [-60, 7.5, 3.6, 3],
      [-150, 6.5, 3.4, 3],
      [-30, 6.5, 3.4, 2],
      [-105, 5.5, 3.6, 4],
      [-75, 5.5, 3.6, 3],
    ];
    petals.forEach(([deg, len, wd, st], k) => {
      leafShape(fx, fy, (deg * Math.PI) / 180, len, wd, (px, py, t, s) => {
        let s2 = st;
        if (t > 0.75) s2 = Math.min(5, st + 1);
        if (s > 0.5) s2 = Math.max(1, s2 - 1);
        b.put(px, py, LOTUS, s2, 20 + k, 5 + k * 0.6);
      });
    });
    b.put(fx, fy - 3, YELLOW, 4, 30, 9);
    b.put(fx - 1, fy - 3, YELLOW, 3, 30, 9);
    // A closed bud on the right pad.
    const [bx2, by2, , , , bph] = pads[4];
    const ux = cx + bx2 - 2, uy = water - 4 + by2 - 1 + bob(bph, f);
    const bud: [number, number, number, number][] = [[0, -6, LOTUS, 4], [0, -5, LOTUS, 4], [1, -5, LOTUS, 2], [-1, -4, LOTUS, 4], [0, -4, LOTUS, 3], [1, -4, LOTUS, 2], [-1, -3, LOTUS, 3], [0, -3, LOTUS, 3], [1, -3, LOTUS, 2], [-1, -2, LILY, 3], [0, -2, LILY, 2], [1, -2, LILY, 2], [0, -1, LILY, 2]];
    for (const [dx, dy, mt, st] of bud) b.put(ux + dx, uy + dy, mt, st, 31, 9);
    const c = finish(b, { spurs: false, inner: 1, gap: 0.3, shadow: 0 });
    // Ripples: two broken rings that grow and fade, half a cycle apart.
    const ring = (rx: number, ry: number, alpha: number, seedR: number): void => {
      if (alpha <= 0) return;
      const n = Math.ceil(rx * 4);
      for (let i = 0; i < n; i++) {
        const th = (i / n) * Math.PI * 2;
        if (rnd(seedR, Math.floor((i / n) * 14), 1) < 0.35) continue;
        const px = Math.round(cx + Math.cos(th) * rx), py = Math.round(water - 3 + Math.sin(th) * ry);
        if (c.alpha(px, py) > 0) continue;
        c.plot(px, py, withAlpha(R.water[5], alpha));
      }
    };
    for (const ph of [0, 3]) {
      const p = ((f + ph) % 6) / 6;
      ring(wid / 2 - 2 + p * 9, 8 + p * 2.4, 200 * (1 - p), 90 + ph);
    }
    return c;
  };
  const idle = Array.from({ length: 6 }, (_, f) => frame(f));
  return assemble('lily_pads', 'Lily Pads', [1.2, 0.15], ['water', 'ambient'], { idle: { frames: idle, fps: 4 } }, cx, water);
}

// --- mossy log -------------------------------------------------------------------------------

function mushroomLog(): WorldSprite {
  const W = 150, H = 70, ground = 58, len = m(2), rad = 12.5;
  const x0 = Math.round((W - len) / 2) + 6, x1 = x0 + len - 8;
  const cy = ground - rad - 1;
  const seed = 97;
  // Top edge wobble, knots.
  const topAt = (x: number): number => cy - rad + Math.round(noise(x, 0, 14, seed) * 2 - 1);
  const botAt = (): number => cy + rad;
  const frame = (f: number): Canvas => {
    const b = new Buf(W, H);
    // Body: a horizontal cylinder, light from the top, furrowed bark running along it.
    for (let x = x0; x <= x1 + 4; x++) {
      const yt = topAt(x), yb = botAt();
      // The right end breaks off in splinters.
      const brk = x > x1 - 4 ? [cy - 6 + ((x * 7) % 5), cy + 8 - ((x * 3) % 4)] : null;
      for (let y = yt; y <= yb; y++) {
        if (brk && x > x1 && (y < brk[0] || y > brk[1])) continue;
        const v = clamp((y + 0.5 - cy) / rad, -1, 1);
        const l = lambert(-0.15, v, Math.sqrt(1 - v * v));
        // Furrows: dark lines along the log, broken into plates.
        const fy = y + noise(x, 0, 9, seed + 1) * 3;
        const furrow = ((Math.floor(fy) % 4) + 4) % 4 === 0 && noise(x, y, 5, seed + 2) > 0.3;
        let st = l > 0.72 ? 4 : l > 0.5 ? 3 : l > 0.3 ? 2 : 1;
        if (st === 4 && noise(x, y, 3, seed + 3) < 0.55) st = 3;
        if (furrow) st = Math.max(1, st - 2);
        else if (((Math.floor(fy) % 4) + 4) % 4 === 1 && st >= 3 && noise(x, y, 4, seed + 4) > 0.55) st = Math.min(5, st + 1);
        if (x > x1 - 8) st = Math.max(1, st - 1);
        if (x > x1 && brk) st = y < cy ? 2 : 1;
        b.put(x, y, BARK, st, 1, 1);
      }
    }
    // Broken right end: pale splintered wood inside the bark.
    for (let y = cy - 5; y <= cy + 7; y++)
      for (let x = x1 + 1; x <= x1 + 4; x++) {
        if (!b.has(x, y)) continue;
        if (x === x1 + 1 || (x === x1 + 2 && (y & 1))) b.put(x, y, WOOD, y < cy ? 3 : 2, 1, 1);
      }
    // Moss along the top, with a lumpy upper edge and drips down the side.
    for (let x = x0 + 3; x <= x1 - 6; x++) {
      const yt = topAt(x);
      const cover = noise(x, 0, 7, seed + 5);
      if (cover < 0.28) continue;
      const depth = 3 + Math.round(noise(x, 3, 4, seed + 6) * 4 + (cover - 0.3) * 4);
      const bump = noise(x, 9, 3, seed + 7) > 0.62 ? 1 : 0;
      for (let y = yt - bump; y < yt + depth; y++) {
        const e = (y - yt + bump) / (depth + bump);
        let st = e < 0.25 ? 4 : e < 0.7 ? 3 : 2;
        if (st === 4 && noise(x, y, 2.5, seed + 8) > 0.6) st = 5;
        if (st === 4 && noise(x, y, 3, seed + 9) < 0.3) st = 3;
        b.put(x, y, MOSS, st, 2, 1.5);
      }
    }
    // A broken branch stub, angled up and back.
    const sx = x0 + 34;
    for (let k = 0; k < 6; k++)
      for (let w = -2; w <= 2; w++) {
        const x = sx - k + w, y = topAt(sx) - k + 1;
        b.put(x, y, BARK, w < 0 ? 4 : w < 1 ? 3 : 2, 3, 0.5);
      }
    for (const [dx, dy, st] of [[-7, -5, 4], [-6, -5, 4], [-5, -5, 3], [-4, -5, 3], [-8, -4, 3]] as [number, number, number][]) b.put(sx + dx, topAt(sx) + dy, WOOD, st, 3, 0.5);
    // Cut face (left): concentric rings, a bark rim, a radial crack.
    const fx = x0, rx = 6.5, ry = rad + 0.5;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(fx - rx); x <= fx + rx; x++) {
        const u = (x + 0.5 - fx) / rx, v = (y + 0.5 - cy) / ry;
        const r = Math.sqrt(u * u + v * v);
        if (r > 1) continue;
        if (r > 0.82) {
          b.put(x, y, BARK, u < 0 && v < 0 ? 3 : 2, 4, 2);
          continue;
        }
        const wob = r + noise(x, y, 4, seed + 10) * 0.08;
        const ring = Math.floor(wob * 6.5) !== Math.floor((wob + 0.06) * 6.5);
        let st = 4 - Math.floor(r * 1.6);
        if (u + v > 0.6) st -= 1;
        if (ring) st = Math.max(1, st - 1);
        if (r < 0.12) st = 2;
        // Crack.
        if (Math.abs(v - u * 1.4) < 0.12 && r > 0.15 && u > 0) st = 1;
        b.put(x, y, WOOD, clamp(st, 1, 4), 4, 2);
      }
    // Moss cap on the cut face's top rim.
    for (let x = fx - 4; x <= fx + 6; x++) b.put(x, Math.floor(cy - ry) + (x < fx - 2 || x > fx + 3 ? 1 : 0), MOSS, x < fx ? 4 : 3, 4, 2);
    // Mushrooms. Caps breathe: frames 2-5 raise every cap by 1 px.
    const breath = f >= 2 && f <= 5 ? 1 : 0;
    const shroom = (mx: number, baseY: number, capW: number, capH: number, stemH: number, mat: number, part: number, dep: number): void => {
      // Stem.
      for (let y = baseY - stemH; y <= baseY; y++)
        for (let x = mx - 1; x <= mx; x++) b.put(x, y, STALK, x < mx ? 3 : 2, part, dep);
      // Cap: a dome with the lit side up-left, gills peeking under the rim.
      const top = baseY - stemH - capH - breath;
      const hw = capW / 2;
      for (let y = top; y <= baseY - stemH; y++)
        for (let x = Math.floor(mx - hw - 0.5); x <= mx + hw; x++) {
          const u = (x + 0.5 - mx) / hw, v = (y - top) / Math.max(1, capH + breath);
          if (u * u + Math.pow(1 - v, 2) * 1.0 > 1.05 && v < 1) continue;
          if (Math.abs(u) > 1) continue;
          let st = v > 0.9 ? 1 : u < -0.2 && v < 0.6 ? 4 : u > 0.45 ? 2 : 3;
          if (u < -0.3 && u > -0.7 && v < 0.35) st = 5;
          b.put(x, y, mat, st, part, dep);
        }
    };
    const mbx = x1 - 26;
    shroom(mbx, topAt(mbx) + 3, 9, 4, 3, CAP, 10, 3);
    shroom(mbx + 7, topAt(mbx + 7) + 4, 7, 3, 2, CAP, 11, 3.2);
    shroom(mbx - 6, topAt(mbx - 6) + 5, 5, 3, 1, CAP, 12, 3.4);
    // Glowing teal ones at the foot of the log.
    const g1 = x1 - 12, g2 = x1 - 6;
    shroom(g1, ground - 1, 5, 2, 3, TEAL, 13, 4);
    shroom(g2, ground - 1, 4, 2, 2, TEAL, 14, 4.2);
    const c = finish(b, { spurs: false, inner: 1, gap: 0.4, shadow: 2 });
    // Faint glow around the teal caps, pulsing with the breath.
    for (const [gx, gy] of [[g1, ground - 7], [g2, ground - 5]]) {
      for (let y = gy - 6; y <= gy + 6; y++)
        for (let x = gx - 7; x <= gx + 7; x++) {
          const d = Math.hypot((x - gx) / 1.2, y - gy);
          if (d > 6 || c.alpha(x, y) > 0) continue;
          const a = (1 - d / 6) * (breath ? 70 : 50);
          if (a > 8 && bayerPick(x, y, d)) c.plot(x, y, withAlpha(R.teal[5], a));
        }
    }
    // Spores rise from the teal caps and fade; each lives for the whole 8-frame cycle.
    for (let k = 0; k < 5; k++) {
      const life = ((f + k * 3) % 8) / 8;
      const ox = k % 2 ? g2 : g1;
      const x = Math.round(ox + Math.sin(life * 5 + k) * 1.5 + (k - 2) * 0.8);
      const y = Math.round(ground - 7 - life * 20);
      const a = life < 0.15 ? life / 0.15 : 1 - (life - 0.15) / 0.85;
      c.plot(x, y, withAlpha(R.teal[5], 230 * a));
    }
    return c;
  };
  const idle = Array.from({ length: 8 }, (_, f) => frame(f));
  return assemble('mushroom_log', 'Mossy Log with Mushrooms', [2, 0.6], ['cover-half', 'climbable', 'flammable'], { idle: { frames: idle, fps: 5 } }, Math.round((x0 + x1) / 2), ground);
}

/** Sparse pick for glow pixels: denser near the center, never a checkerboard. */
function bayerPick(x: number, y: number, d: number): boolean {
  return hash(x, y, 5) > d / 7;
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

// Review crops: every sprite's frames side by side, zoomed so single pixels can be judged.
for (const s of sprites) {
  for (const [key, a] of Object.entries(s.anims)) {
    const fw = a.frames[0].w, fh = a.frames[0].h;
    const strip = new Canvas((fw + 2) * a.frames.length, fh);
    strip.fillRect(0, 0, strip.w, strip.h, [93, 107, 87, 255]);
    a.frames.forEach((fr, i) => strip.draw(fr, i * (fw + 2), 0));
    strip.scaled(fw > 100 ? 3 : 4).save(join(dir, `plants-${s.name}-${key}.png`));
  }
  const first = Object.values(s.anims)[0].frames[0];
  const z = new Canvas(first.w, first.h);
  z.fillRect(0, 0, z.w, z.h, [93, 107, 87, 255]);
  z.draw(first, 0, 0);
  z.scaled(6).save(join(dir, `plants-${s.name}-zoom.png`));
  const bb = first.bounds();
  console.log(`${s.name.padEnd(14)} frame ${first.w}x${first.h} anchor ${s.anchor} opaque h ${bb ? bb[3] - bb[1] + 1 : 0} w ${bb ? bb[2] - bb[0] + 1 : 0} anims ${Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? '(once)' : ''}`).join(' ')}`);
}
