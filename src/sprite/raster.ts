// Low-level pixel buffers and shaded primitives for the sprite engine.
// Shapes never write colors directly: they write (material, shade) pairs so a
// layer can be outlined and recolored after it is drawn.
//
// Two coordinate spaces:
//  - DESIGN units: a UNITS x UNITS space that the rig, body params and every item use. The figure
//    stands in a 64-unit box at PAD inside it; the room around the box is for long blades, raised
//    swords and effects.
//  - FINE pixels: the real GRID x GRID canvas (RES fine pixels per design unit).
// Primitives take design coordinates and rasterize at fine resolution, so
// silhouettes, outlines and details are crisp 1px.
// `px` paints ONE fine pixel at a design coordinate (use .5 steps for detail);
// `dot` paints a whole design pixel (RES x RES block). Layer methods
// (set/has/clear/reshade/getShade) take FINE integer coordinates.

import { makeRamp, mixHex, Ramp, RampKind } from './color';

export const UNITS = 128;
export const RES = 2;
export const GRID = UNITS * RES;
/**
 * Where the figure's 64-unit box sits in the frame (design units). The frame used to be that box;
 * it grew so long blades and raised swords are no longer cut at its edge (the owner, 2026-10-20).
 * Whole fine pixels that are multiples of 4, so every pattern keyed to the frame's pixels lands
 * on the figure as it did.
 */
export const PAD = { x: 32, y: 48 };
/** The figure's box in fine pixels: the old 128 x 128 frame, where cards and thumbnails look. */
export const BOX = { x: PAD.x * RES, y: PAD.y * RES, w: 128, h: 128 };

/**
 * The smallest rectangle holding every visible pixel of these GRID x GRID RGBA buffers (null when
 * all are empty), so cached frames keep only that much of the big frame.
 */
export function opaqueBox(...bufs: (Uint8ClampedArray | null | undefined)[]): { x: number; y: number; w: number; h: number } | null {
  let x0 = GRID;
  let y0 = GRID;
  let x1 = -1;
  let y1 = -1;
  for (const b of bufs) {
    if (!b) continue;
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++)
        if (b[(y * GRID + x) * 4 + 3]) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
const N = GRID * GRID;
/** Converts a design coordinate to the fine pixel that contains it. */
export const fine = (d: number): number => Math.floor(d * RES);

export type Vec = { x: number; y: number };
export const v = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const norm = (a: Vec): Vec => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
export const perp = (a: Vec): Vec => ({ x: -a.y, y: a.x });

/** Body parts that pixels belong to. Pixel edits are stored relative to these. */
export const PARTS = [
  'none',
  'head',
  'torso',
  'pelvis',
  'upperArmN',
  'forearmN',
  'handN',
  'upperArmF',
  'forearmF',
  'handF',
  'thighN',
  'shinN',
  'footN',
  'thighF',
  'shinF',
  'footF',
  'back',
  'held',
] as const;
export type PartId = (typeof PARTS)[number];
export const partIndex = (p: PartId): number => PARTS.indexOf(p);

// Pixel flags
export const F_NO_OUTLINE = 1; // never turned into an outline pixel
export const F_NO_EDGE = 2; // doesn't count as "empty" for neighbours' outlines either
export const F_NO_TEXTURE = 4; // keeps its hand-placed shading (templates)

/** Every outline is pulled toward this near-black so silhouettes read like hand-drawn sprites. */
const INK = '#07060b';

export class MaterialTable {
  ramps: Ramp[] = [];
  kinds: RampKind[] = [];
  private index = new Map<string, number>();

  get(hex: string, kind: RampKind = 'cloth'): number {
    const key = `${hex}|${kind}`;
    let i = this.index.get(key);
    if (i === undefined) {
      i = this.ramps.length;
      const ramp = [...makeRamp(hex, kind)] as Ramp;
      if (kind !== 'flat' && kind !== 'glow') ramp[0] = mixHex(ramp[0], INK, 0.7);
      this.ramps.push(ramp);
      this.kinds.push(kind);
      this.index.set(key, i);
    }
    return i;
  }
}

export interface Pen {
  mat: number;
  part: PartId;
  /** Added to every computed shade (e.g. -1 for limbs on the far side). */
  bias?: number;
  flags?: number;
}

export type ShadeFn = (x: number, y: number) => number;

/** Light comes from the upper-left of the screen. */
const LIGHT = norm(v(-0.72, -0.69));

function shadeFromNormal(nx: number, ny: number, bias = 0): number {
  const lt = nx * LIGHT.x + ny * LIGHT.y;
  let s = lt > 0.5 ? 4 : lt > -0.28 ? 3 : lt > -0.68 ? 2 : 1;
  s += bias;
  return Math.max(1, Math.min(5, s));
}

/** Uniform scale about a design-space point, applied by every primitive drawn on a layer. */
export interface Xf {
  cx: number;
  cy: number;
  k: number;
}

export class Layer {
  /** Optional shrink/grow transform (used to scale the whole head group). */
  xf: Xf | null = null;
  /** Skip the automatic hair fray pass (hand-drawn templates are already jagged). */
  noFray = false;
  mat = new Int16Array(N).fill(-1);
  shade = new Uint8Array(N);
  part = new Uint8Array(N);
  flags = new Uint8Array(N);
  used = false;

  constructor(public readonly outline: boolean = true) {}

  set(x: number, y: number, mat: number, shade: number, part: PartId, flags = 0): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    const i = y * GRID + x;
    this.mat[i] = mat;
    this.shade[i] = Math.max(0, Math.min(5, shade));
    this.part[i] = partIndex(part);
    this.flags[i] = flags;
    this.used = true;
  }

  clear(x: number, y: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    this.mat[y * GRID + x] = -1;
  }

  has(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
    return this.mat[y * GRID + x] >= 0;
  }

  getShade(x: number, y: number): number {
    return this.shade[y * GRID + x];
  }

  /** Re-shade an existing pixel (no-op if empty). */
  reshade(x: number, y: number, shade: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.has(x, y)) return;
    this.shade[y * GRID + x] = Math.max(0, Math.min(5, shade));
  }

  /** Turns the silhouette edge into outline pixels (selective outlining). */
  applyOutline(): void {
    if (!this.outline || !this.used) return;
    const edge: number[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const i = y * GRID + x;
        if (this.mat[i] < 0 || this.flags[i] & F_NO_OUTLINE) continue;
        const empty = (xx: number, yy: number) => {
          if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) return true;
          const j = yy * GRID + xx;
          return this.mat[j] < 0 && !(this.flags[j] & F_NO_EDGE);
        };
        const up = empty(x, y - 1);
        const left = empty(x - 1, y);
        const right = empty(x + 1, y);
        const down = empty(x, y + 1);
        if (!(up || left || right || down)) continue;
        edge.push(i, 0);
      }
    }
    for (let k = 0; k < edge.length; k += 2) this.shade[edge[k]] = edge[k + 1];
  }
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Maps a design point through the layer transform (if any). */
export function fwd(L: Layer, p: Vec): Vec {
  const t = L.xf;
  return t ? v(t.cx + (p.x - t.cx) * t.k, t.cy + (p.y - t.cy) * t.k) : p;
}

/** One fine pixel at a design coordinate. */
export function px(L: Layer, x: number, y: number, pen: Pen, shade = 3): void {
  const p = fwd(L, v(x, y));
  L.set(fine(p.x), fine(p.y), pen.mat, shade + (pen.bias || 0), pen.part, pen.flags || 0);
}

/** A whole design pixel (RES x RES fine pixels) whose top-left is at floor(x), floor(y). */
export function dot(L: Layer, x: number, y: number, pen: Pen, shade = 3): void {
  const p = fwd(L, v(Math.floor(x), Math.floor(y)));
  const fx = fine(p.x);
  const fy = fine(p.y);
  for (let j = 0; j < RES; j++)
    for (let i = 0; i < RES; i++) L.set(fx + i, fy + j, pen.mat, shade + (pen.bias || 0), pen.part, pen.flags || 0);
}

/**
 * Iterates fine pixels covering a design-space box. Geometry is evaluated in
 * the layer's ORIGINAL design space: with a transform, pixels are sampled in
 * transformed space and mapped back before the inside/shade tests.
 */
function forFine(
  L: Layer,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  fn: (fx: number, fy: number, x: number, y: number) => void,
): void {
  const t = L.xf;
  const a = fwd(L, v(minX, minY));
  const b = fwd(L, v(maxX, maxY));
  const fx0 = Math.max(0, Math.floor(Math.min(a.x, b.x) * RES) - 1);
  const fy0 = Math.max(0, Math.floor(Math.min(a.y, b.y) * RES) - 1);
  const fx1 = Math.min(GRID - 1, Math.ceil(Math.max(a.x, b.x) * RES) + 1);
  const fy1 = Math.min(GRID - 1, Math.ceil(Math.max(a.y, b.y) * RES) + 1);
  for (let fy = fy0; fy <= fy1; fy++) {
    for (let fx = fx0; fx <= fx1; fx++) {
      let x = (fx + 0.5) / RES;
      let y = (fy + 0.5) / RES;
      if (t) {
        x = t.cx + (x - t.cx) / t.k;
        y = t.cy + (y - t.cy) / t.k;
      }
      fn(fx, fy, x, y);
    }
  }
}

/** Shade functions receive (x, y) such that x + 0.5, y + 0.5 is the sample point in design units. */
const sx = (x: number) => x - 0.5;

/** Tapered capsule from a (radius ra) to b (radius rb), shaded as a cylinder. */
export function capsule(L: Layer, a: Vec, b: Vec, ra: number, rb: number, pen: Pen, shade?: ShadeFn | number): void {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y || 1;
  forFine(L, Math.min(a.x - ra, b.x - rb), Math.min(a.y - ra, b.y - rb), Math.max(a.x + ra, b.x + rb), Math.max(a.y + ra, b.y + rb), (fx, fy, x, y) => {
    let t = ((x - a.x) * ab.x + (y - a.y) * ab.y) / l2;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + ab.x * t;
    const cy = a.y + ab.y * t;
    const r = ra + (rb - ra) * t;
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy > r * r) return;
    let s: number;
    if (typeof shade === 'number') s = shade;
    else if (shade) s = shade(sx(x), sx(y));
    else s = shadeFromNormal(dx / (r || 1), dy / (r || 1), 0);
    L.set(fx, fy, pen.mat, s + (pen.bias || 0), pen.part, pen.flags || 0);
  });
}

/** Small deterministic per-pixel jitter (-0.5..0.5) so shade bands break into clusters. */
function jitter(x: number, y: number): number {
  let h = (Math.floor(x * RES) * 374761393 + Math.floor(y * RES) * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) & 1023) / 1023 - 0.5;
}

/**
 * Skin shading for a limb segment, after the reference sprite: a darker rim on
 * the lit edge (the surface turning away), a wide base-tone core, then a
 * shadow band and a dark far edge. Band edges are jittered into clusters.
 */
export function cylShade(a: Vec, b: Vec, ra: number, rb: number): ShadeFn {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y || 1;
  return (x0, y0) => {
    const x = x0 + 0.5;
    const y = y0 + 0.5;
    const t = Math.max(0, Math.min(1, ((x - a.x) * ab.x + (y - a.y) * ab.y) / l2));
    const r = ra + (rb - ra) * t || 1;
    return skinBand(-((x - a.x - ab.x * t) * LIGHT.x + (y - a.y - ab.y * t) * LIGHT.y) / r, x, y);
  };
}

/** Same bands for a round shape (shoulder caps, knees). */
export function ballShade(cx: number, cy: number, rx: number, ry: number): ShadeFn {
  return (x0, y0) => {
    const x = x0 + 0.5;
    const y = y0 + 0.5;
    return skinBand(-(((x - cx) / rx) * LIGHT.x + ((y - cy) / ry) * LIGHT.y), x, y);
  };
}

/** u: -1 on the lit edge, +1 on the far edge. */
function skinBand(u: number, x: number, y: number): number {
  // Clean bands, no jitter: skin stays smooth like the reference.
  void jitter;
  return u < -0.84 ? 2 : u < 0.18 ? 3 : u < 0.62 ? 2 : 1;
}

export function ellipse(L: Layer, cx: number, cy: number, rx: number, ry: number, pen: Pen, shade?: ShadeFn | number): void {
  forFine(L, cx - rx, cy - ry, cx + rx, cy + ry, (fx, fy, x, y) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    if (dx * dx + dy * dy > 1) return;
    let s: number;
    if (typeof shade === 'number') s = shade;
    else if (shade) s = shade(sx(x), sx(y));
    else s = shadeFromNormal(dx, dy, 0);
    L.set(fx, fy, pen.mat, s + (pen.bias || 0), pen.part, pen.flags || 0);
  });
}

function inside(pts: Vec[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Filled polygon. Default shading: lit on the left, shadowed on the right. */
export function poly(
  L: Layer,
  pts: Vec[],
  pen: Pen,
  shade?: ShadeFn | number,
  keep?: (x: number, y: number) => boolean,
): void {
  if (pts.length < 3) return;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const w = Math.max(1, maxX - minX);
  forFine(L, minX, minY, maxX, maxY, (fx, fy, x, y) => {
    if (!inside(pts, x, y)) return;
    if (keep && !keep(sx(x), sx(y))) return;
    let s: number;
    if (typeof shade === 'number') s = shade;
    else if (shade) s = shade(sx(x), sx(y));
    else {
      const t = (x - minX) / w;
      s = t < 0.22 ? 4 : t < 0.72 ? 3 : 2;
    }
    L.set(fx, fy, pen.mat, s + (pen.bias || 0), pen.part, pen.flags || 0);
  });
}

/** 1 fine-pixel Bresenham line between design points. */
export function line(L: Layer, a0: Vec, b0: Vec, pen: Pen, shade = 3): void {
  const a = fwd(L, a0);
  const b = fwd(L, b0);
  let x0 = fine(a.x);
  let y0 = fine(a.y);
  const x1 = fine(b.x);
  const y1 = fine(b.y);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const stx = x0 < x1 ? 1 : -1;
  const sty = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 400; guard++) {
    L.set(x0, y0, pen.mat, shade + (pen.bias || 0), pen.part, pen.flags || 0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += stx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sty;
    }
  }
}

/** Darkens (or lightens) pixels already present in a layer along a line — for seams and folds. */
export function seam(L: Layer, a0: Vec, b0: Vec, delta = -1): void {
  const a = fwd(L, a0);
  const b = fwd(L, b0);
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * RES));
  let lx = -1;
  let ly = -1;
  for (let i = 0; i <= steps; i++) {
    const p = lerp(a, b, i / steps);
    const x = fine(p.x);
    const y = fine(p.y);
    if (x === lx && y === ly) continue;
    lx = x;
    ly = y;
    if (L.has(x, y)) L.reshade(x, y, Math.max(1, L.getShade(x, y) + delta));
  }
}

/** Point at parameter t along a segment, offset perpendicular by `off` design units. */
export function along(a: Vec, b: Vec, t: number, off = 0): Vec {
  const p = lerp(a, b, t);
  if (!off) return p;
  const n = norm(perp(sub(b, a)));
  return add(p, scale(n, off));
}
