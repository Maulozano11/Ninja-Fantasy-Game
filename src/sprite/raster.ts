// Low-level pixel buffers and shaded primitives for the 64x64 sprite engine.
// Shapes never write colors directly: they write (material, shade) pairs so a
// layer can be outlined and recolored after it is drawn.

import { makeRamp, Ramp, RampKind } from './color';

export const GRID = 64;
const N = GRID * GRID;

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

export class MaterialTable {
  ramps: Ramp[] = [];
  private index = new Map<string, number>();

  get(hex: string, kind: RampKind = 'cloth'): number {
    const key = `${hex}|${kind}`;
    let i = this.index.get(key);
    if (i === undefined) {
      i = this.ramps.length;
      this.ramps.push(makeRamp(hex, kind));
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

export class Layer {
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

export function px(L: Layer, x: number, y: number, pen: Pen, shade = 3): void {
  L.set(x, y, pen.mat, shade + (pen.bias || 0), pen.part, pen.flags || 0);
}

/** Tapered capsule from a (radius ra) to b (radius rb), shaded as a cylinder. */
export function capsule(L: Layer, a: Vec, b: Vec, ra: number, rb: number, pen: Pen, shade?: ShadeFn | number): void {
  const minX = Math.floor(Math.min(a.x - ra, b.x - rb)) - 1;
  const maxX = Math.ceil(Math.max(a.x + ra, b.x + rb)) + 1;
  const minY = Math.floor(Math.min(a.y - ra, b.y - rb)) - 1;
  const maxY = Math.ceil(Math.max(a.y + ra, b.y + rb)) + 1;
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y || 1;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const p = v(x + 0.5, y + 0.5);
      let t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2;
      t = Math.max(0, Math.min(1, t));
      const c = lerp(a, b, t);
      const r = ra + (rb - ra) * t;
      const d = sub(p, c);
      const dist = len(d);
      if (dist > r) continue;
      let s: number;
      if (typeof shade === 'number') s = shade;
      else if (shade) s = shade(x, y);
      else s = shadeFromNormal(d.x / (r || 1), d.y / (r || 1), 0);
      L.set(x, y, pen.mat, s + (pen.bias || 0), pen.part, pen.flags || 0);
    }
  }
}

export function ellipse(L: Layer, cx: number, cy: number, rx: number, ry: number, pen: Pen, shade?: ShadeFn | number): void {
  for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) {
    for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      let s: number;
      if (typeof shade === 'number') s = shade;
      else if (shade) s = shade(x, y);
      else s = shadeFromNormal(dx, dy, 0);
      L.set(x, y, pen.mat, s + (pen.bias || 0), pen.part, pen.flags || 0);
    }
  }
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

/** Filled polygon. Default shading: lit on the left third, shadowed on the right. */
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
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
      if (!inside(pts, x + 0.5, y + 0.5)) continue;
      if (keep && !keep(x, y)) continue;
      let s: number;
      if (typeof shade === 'number') s = shade;
      else if (shade) s = shade(x, y);
      else {
        const t = (x + 0.5 - minX) / w;
        s = t < 0.22 ? 4 : t < 0.72 ? 3 : 2;
      }
      L.set(x, y, pen.mat, s + (pen.bias || 0), pen.part, pen.flags || 0);
    }
  }
}

/** 1px Bresenham line. */
export function line(L: Layer, a: Vec, b: Vec, pen: Pen, shade = 3): void {
  let x0 = Math.floor(a.x);
  let y0 = Math.floor(a.y);
  const x1 = Math.floor(b.x);
  const y1 = Math.floor(b.y);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 200; guard++) {
    L.set(x0, y0, pen.mat, shade + (pen.bias || 0), pen.part, pen.flags || 0);
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
}

/** Darkens (or lightens) pixels already present in a layer along a line — for seams and folds. */
export function seam(L: Layer, a: Vec, b: Vec, delta = -1): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))));
  for (let i = 0; i <= steps; i++) {
    const p = lerp(a, b, i / steps);
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    if (L.has(x, y)) L.reshade(x, y, Math.max(1, L.getShade(x, y) + delta));
  }
}

/** Point at parameter t along a polyline-free segment, offset perpendicular by `off` pixels. */
export function along(a: Vec, b: Vec, t: number, off = 0): Vec {
  const p = lerp(a, b, t);
  if (!off) return p;
  const n = norm(perp(sub(b, a)));
  return add(p, scale(n, off));
}
