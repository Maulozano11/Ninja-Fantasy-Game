// Landmarks and stone for the battle maps: a stone lantern, a signpost, wooden and bamboo fences,
// boulders, rocks, pebbles, stepping stones and a roadside shrine.
//
//   npx tsx tools/world-sprites/landmarks.ts [previewDir]
//
// Solid parts (stone tiers, boulders, posts, boards, rails) are modelled as small low-poly meshes
// and rasterised with the battle camera's projection (1 m = 57 px across and up, 38 px per meter
// of depth), so tops of stones and lantern tiers show at the right steepness. Every pixel keeps
// the facet it came from, its normal and world position (a G-buffer). Light is Lambert from the
// upper left plus real cast shadows (rays against the meshes); the light picks a ramp step through
// the kit's clustered band(), so facets read as planes broken into 2-4 px strokes. Facet edges
// facing the light get a crest, parts that overlap get a dark inner line. Hand details (moss,
// lichen, cracks, chips, rope, paper, ink, flame) are painted on top in the same step buffer or as
// small outlined layers, and the kit adds the outer outline.

import { join } from 'node:path';
import { Anim, Canvas, Color, MATERIALS, WorldSprite, band, fbm, hash, hex, lambert, m, mix, noise, preview, previewDir, ramp, toHex, writeGroup } from './kit';

// --- camera ---------------------------------------------------------------------------------

/** Screen pixels per world pixel of depth (38 px per meter of depth vs 57 across). */
const K = 38 / 57;

type V3 = [number, number, number]; // [X right, H up, D away from the viewer], in pixels
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
/** Direction toward the light in world space (upper left, a little in front). */
const LW: V3 = unit([-0.55, 0.7, -0.45]);
/** Light (0..1) for a world normal, same Lambert as the kit (screen y down, z toward the viewer). */
const lightOf = (n: V3): number => lambert(n[0], -n[1], -n[2]);

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const rnd = (seed: number, i: number, j = 0): number => hash(i * 7 + 3, j * 13 + 5, seed);
const TAU = Math.PI * 2;

// --- palettes -------------------------------------------------------------------------------

const PAL: Color[][] = [];
function pal(r: Color[]): number {
  PAL.push(r);
  return PAL.length - 1;
}
const R = {
  stone: ramp(MATERIALS.stone),
  stoneWarm: ramp(MATERIALS.stoneWarm),
  iron: ramp(MATERIALS.iron),
  moss: ramp(MATERIALS.moss),
  leaf: ramp(MATERIALS.leaf),
  leafLight: ramp(MATERIALS.leafLight),
  wood: ramp(MATERIALS.wood),
  woodDark: ramp(MATERIALS.woodDark),
  bark: ramp(MATERIALS.bark),
  rope: ramp(MATERIALS.rope),
  paper: ramp(MATERIALS.paper),
  red: ramp(MATERIALS.red),
  fire: ramp(MATERIALS.fire),
  water: ramp(MATERIALS.water),
  charred: ramp(MATERIALS.charred),
};
/** Gray stone with cool shadows (toward iron) and warm lights (toward stoneWarm). */
const STONE_RAMP: Color[] = [
  mix(R.stone[0], R.iron[0], 0.3),
  mix(R.stone[1], R.iron[2], 0.3),
  mix(R.stone[2], R.iron[3], 0.22),
  R.stone[3],
  mix(R.stone[4], R.stoneWarm[4], 0.35),
  mix(R.stone[5], R.stoneWarm[5], 0.5),
];
const STONE = pal(STONE_RAMP);
const STONE_W = pal([R.stoneWarm[0], mix(R.stoneWarm[1], R.iron[2], 0.2), R.stoneWarm[2], R.stoneWarm[3], R.stoneWarm[4], R.stoneWarm[5]]);
const MOSS = pal(R.moss);
const LICHEN = pal([R.moss[0], R.moss[2], mix(R.moss[4], R.stoneWarm[4], 0.5), mix(R.moss[5], R.stoneWarm[5], 0.45), mix(R.moss[5], R.paper[4], 0.5), R.paper[4]]);
const WOOD = pal(R.wood);
const WOOD_DK = pal(R.woodDark);
/** Weathered, sun-greyed timber (signpost, shrine): wood pulled toward warm stone. */
const WOOD_OLD = pal(R.wood.map((c, i) => mix(c, R.stoneWarm[i], 0.38)));
const BARK = pal(R.bark);
const ROPE = pal(R.rope);
const PAPER = pal(R.paper);
const RED = pal(R.red);
const FIRE = pal(R.fire);
const WATER = pal(R.water);
const INK = pal(R.charred);

// --- meshes ---------------------------------------------------------------------------------

interface Tri {
  v: [V3, V3, V3];
  /** Vertex normals (smooth meshes) or the face normal three times. */
  vn: [V3, V3, V3];
  n: V3;
  group: number;
}
interface MeshOpts {
  pal: number;
  /** Ramp steps used from dark to light (default [1,2,3,4]). */
  steps?: number[];
  bias?: number;
  jitter?: number;
  cell?: number;
  seed?: number;
  /** Weathering: world-anchored low-frequency light variation (0..0.3). */
  tex?: number;
  texCell?: number;
  /** Light crest on facet edges that face the light (default true for faceted meshes). */
  crest?: boolean;
  /** Dark seam on the shadow side of sharp facet edges. */
  seam?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Random light offset per facet so neighbouring planes separate (default 0.05). */
  facetVar?: number;
  /** Light contrast around 0.5 (default 1). */
  contrast?: number;
  /** Blends facet normals with an ellipsoid around the mesh (0..1) so the whole mass shades as one form. */
  form?: number;
  /** Darkens the lowest `ao` px above the ground by one step (contact shade). */
  ao?: number;
  /** Custom step picker; gets the default step. */
  shade?: (p: PixelInfo, step: number) => number;
}
interface Mesh extends MeshOpts {
  id: number;
  tris: Tri[];
  box: [V3, V3];
}
interface PixelInfo {
  x: number;
  y: number;
  n: V3;
  p: V3;
  light: number;
  lit: boolean;
  mesh: Mesh;
}

let GROUP = 1;

class Scene {
  meshes: Mesh[] = [];
  add(tris: Tri[], opts: MeshOpts): Mesh {
    let lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
    for (const t of tris)
      for (const v of t.v) {
        lo = [Math.min(lo[0], v[0]), Math.min(lo[1], v[1]), Math.min(lo[2], v[2])];
        hi = [Math.max(hi[0], v[0]), Math.max(hi[1], v[1]), Math.max(hi[2], v[2])];
      }
    const mesh: Mesh = { ...opts, id: this.meshes.length, tris, box: [lo, hi] };
    this.meshes.push(mesh);
    return mesh;
  }
}

/**
 * A loft: closed rings of equal vertex count joined by quads, with optional caps (flat, or a fan
 * to an apex point). Faceted meshes give each quad its own facet; smooth ones share vertex normals.
 */
function loft(rings: V3[][], opts: { capStart?: boolean | V3; capEnd?: boolean | V3; smooth?: boolean } = {}): Tri[] {
  const tris: Tri[] = [];
  const n = rings[0].length;
  const center = (r: V3[]): V3 => mul(r.reduce((a, b) => add(a, b), [0, 0, 0] as V3), 1 / r.length);
  const centers = rings.map(center);
  const meshC = mul(centers.reduce((a, b) => add(a, b), [0, 0, 0] as V3), 1 / centers.length);
  const faceN = (a: V3, b: V3, c: V3, out: V3): V3 => {
    let nn = unit(cross(sub(b, a), sub(c, a)));
    const fc = mul(add(add(a, b), c), 1 / 3);
    if (dot(nn, sub(fc, out)) < 0) nn = mul(nn, -1);
    return nn;
  };
  // Side quads.
  const sideGroup = GROUP++;
  const acc: V3[][] = rings.map((r) => r.map(() => [0, 0, 0] as V3));
  const quads: { a: [number, number]; b: [number, number]; c: [number, number]; d: [number, number]; n1: V3; n2: V3; g: number }[] = [];
  for (let i = 0; i + 1 < rings.length; i++) {
    const axis = mul(add(centers[i], centers[i + 1]), 0.5);
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      const A = rings[i][j], B = rings[i][j2], C = rings[i + 1][j2], D = rings[i + 1][j];
      const n1 = faceN(A, B, C, axis), n2 = faceN(A, C, D, axis);
      const g = opts.smooth ? sideGroup : GROUP++;
      quads.push({ a: [i, j], b: [i, j2], c: [i + 1, j2], d: [i + 1, j], n1, n2, g });
      const qn = unit(add(n1, n2));
      for (const [ri, rj] of [[i, j], [i, j2], [i + 1, j2], [i + 1, j]]) acc[ri][rj] = add(acc[ri][rj], qn);
    }
  }
  const P = (ij: [number, number]): V3 => rings[ij[0]][ij[1]];
  const VN = (ij: [number, number], fn: V3): V3 => (opts.smooth ? unit(acc[ij[0]][ij[1]]) : fn);
  for (const q of quads) {
    if (len(cross(sub(P(q.b), P(q.a)), sub(P(q.c), P(q.a)))) > 1e-6) tris.push({ v: [P(q.a), P(q.b), P(q.c)], vn: [VN(q.a, q.n1), VN(q.b, q.n1), VN(q.c, q.n1)], n: q.n1, group: q.g });
    if (len(cross(sub(P(q.c), P(q.a)), sub(P(q.d), P(q.a)))) > 1e-6) tris.push({ v: [P(q.a), P(q.c), P(q.d)], vn: [VN(q.a, q.n2), VN(q.c, q.n2), VN(q.d, q.n2)], n: q.n2, group: q.g });
  }
  const cap = (r: V3[], c: boolean | V3 | undefined, ci: number) => {
    if (!c) return;
    const apex = c === true ? centers[ci] : c;
    const flatG = GROUP++;
    for (let j = 0; j < n; j++) {
      const a = r[j], b = r[(j + 1) % n];
      if (len(cross(sub(b, a), sub(apex, a))) < 1e-6) continue;
      const nn = faceN(a, b, apex, meshC);
      tris.push({ v: [a, b, apex], vn: [nn, nn, nn], n: nn, group: c === true ? flatG : GROUP++ });
    }
  };
  cap(rings[0], opts.capStart, 0);
  cap(rings[rings.length - 1], opts.capEnd, rings.length - 1);
  return tris;
}

/** A horizontal ring of n points around (cx, h, cd); angle 0 points right, 90 deg points away. */
function ring(cx: number, h: number, cd: number, rx: number, rd: number, n: number, o: { rot?: number; jit?: number; hJit?: number; seed?: number } = {}): V3[] {
  const pts: V3[] = [];
  for (let j = 0; j < n; j++) {
    const a = (o.rot ?? 0) + (j * TAU) / n;
    const k = 1 + ((o.jit ?? 0) ? (rnd(o.seed ?? 1, j, 1) - 0.5) * 2 * (o.jit ?? 0) : 0);
    const hj = (o.hJit ?? 0) ? (rnd(o.seed ?? 1, j, 2) - 0.5) * 2 * (o.hJit ?? 0) : 0;
    pts.push([cx + Math.cos(a) * rx * k, h + hj, cd + Math.sin(a) * rd * k]);
  }
  return pts;
}
/** Hexagon ring with a flat face toward the viewer. */
const hexRing = (cx: number, h: number, cd: number, r: number): V3[] => ring(cx, h, cd, r, r, 6, { rot: Math.PI / 3 });

/** An axis-aligned box. */
function box(x0: number, x1: number, h0: number, h1: number, d0: number, d1: number): Tri[] {
  const r0: V3[] = [[x0, h0, d0], [x1, h0, d0], [x1, h0, d1], [x0, h0, d1]];
  const r1: V3[] = r0.map((p) => [p[0], h1, p[2]] as V3);
  return loft([r0, r1], { capStart: true, capEnd: true });
}
/** A cylinder (round pole) between two points; `n` sides, smooth shaded. */
function pole(a: V3, b: V3, r: number, n = 10, o: { r2?: number; caps?: boolean; seed?: number; wob?: number; segs?: number } = {}): Tri[] {
  const ax = unit(sub(b, a));
  const ref: V3 = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(ax, ref)), w = unit(cross(ax, u));
  const segs = o.segs ?? 1;
  const rings: V3[][] = [];
  for (let s = 0; s <= segs; s++) {
    const t = s / segs;
    const c = add(a, mul(sub(b, a), t));
    const rr = r + ((o.r2 ?? r) - r) * t;
    const pts: V3[] = [];
    for (let j = 0; j < n; j++) {
      const ang = (j * TAU) / n;
      const wob = o.wob ? 1 + (rnd(o.seed ?? 3, j, s) - 0.5) * o.wob : 1;
      pts.push(add(c, add(mul(u, Math.cos(ang) * rr * wob), mul(w, Math.sin(ang) * rr * wob))));
    }
    rings.push(pts);
  }
  return loft(rings, { capStart: o.caps ?? true, capEnd: o.caps ?? true, smooth: true });
}
const transform = (tris: Tri[], f: (p: V3) => V3, fn: (n: V3) => V3): Tri[] =>
  tris.map((t) => ({ v: t.v.map(f) as [V3, V3, V3], vn: t.vn.map(fn) as [V3, V3, V3], n: fn(t.n), group: t.group }));
/** Rotates about the vertical axis through (cx, cd) by `a` radians (positive turns +X toward +D). */
function rotY(tris: Tri[], a: number, cx = 0, cd = 0): Tri[] {
  const c = Math.cos(a), s = Math.sin(a);
  const r = (p: V3): V3 => [cx + (p[0] - cx) * c - (p[2] - cd) * s, p[1], cd + (p[0] - cx) * s + (p[2] - cd) * c];
  const rn = (p: V3): V3 => [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
  return transform(tris, r, rn);
}
/** Rotates in the screen plane (about the D axis) around (cx, ch); positive tilts the top to the right. */
function rotZ(tris: Tri[], a: number, cx: number, ch: number): Tri[] {
  const c = Math.cos(a), s = Math.sin(a);
  const r = (p: V3): V3 => [cx + (p[0] - cx) * c + (p[1] - ch) * s, ch - (p[0] - cx) * s + (p[1] - ch) * c, p[2]];
  const rn = (p: V3): V3 => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c, p[2]];
  return transform(tris, r, rn);
}

// --- rendering ------------------------------------------------------------------------------

/** Step buffer + G-buffer for one frame. */
class Frame {
  readonly mesh: Int16Array;
  readonly group: Int32Array;
  readonly depth: Float32Array;
  readonly nrm: Float32Array;
  readonly pos: Float32Array;
  readonly lightv: Float32Array;
  readonly pal: Int16Array;
  readonly step: Int8Array;
  /** Warm light added on top (0..1), quantised when composed. */
  readonly warm: Float32Array;
  readonly over: (Color | null)[];
  constructor(readonly w: number, readonly h: number, readonly ox: number, readonly oy: number, readonly scene: Scene) {
    const N = w * h;
    this.mesh = new Int16Array(N).fill(-1);
    this.group = new Int32Array(N);
    this.depth = new Float32Array(N).fill(Infinity);
    this.nrm = new Float32Array(N * 3);
    this.pos = new Float32Array(N * 3);
    this.lightv = new Float32Array(N);
    this.pal = new Int16Array(N).fill(-1);
    this.step = new Int8Array(N);
    this.warm = new Float32Array(N);
    this.over = new Array(N).fill(null);
  }
  idx(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? y * this.w + x : -1;
  }
  proj(p: V3): [number, number] {
    return [this.ox + p[0], this.oy - p[1] - K * p[2]];
  }
  /** True if the pixel holds something (mesh or painted). */
  has(x: number, y: number): boolean {
    const i = this.idx(x, y);
    return i >= 0 && (this.pal[i] >= 0 || this.over[i] !== null);
  }
  set(x: number, y: number, p: number, s: number): void {
    const i = this.idx(Math.floor(x), Math.floor(y));
    if (i < 0) return;
    this.pal[i] = p;
    this.step[i] = clamp(s, 0, 5);
    this.over[i] = null;
  }
  normal(i: number): V3 {
    return [this.nrm[i * 3], this.nrm[i * 3 + 1], this.nrm[i * 3 + 2]];
  }
  world(i: number): V3 {
    return [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]];
  }
  compose(): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        const o = this.over[i];
        if (o) {
          c.set(x, y, o);
          continue;
        }
        if (this.pal[i] < 0) continue;
        let col = PAL[this.pal[i]][this.step[i]];
        const wv = this.warm[i];
        if (wv > 0.02) {
          // Two warm levels, picked per pixel with a little cluster noise so the spill reads as strokes.
          // Additive (the stone is lit, not painted orange), three levels.
          const q = wv + (noise(x, y, 2, 91) - 0.5) * 0.2;
          if (q > 0.66) col = glow(col, R.fire[4], 0.62);
          else if (q > 0.4) col = glow(col, R.fire[3], 0.42);
          else if (q > 0.16) col = glow(col, R.fire[3], 0.22);
        }
        c.set(x, y, col);
      }
    return c;
  }
}

/** Adds light of color `l` (strength k) to `c`. */
function glow(c: Color, l: Color, k: number): Color {
  return [Math.min(255, c[0] + l[0] * k), Math.min(255, c[1] + l[1] * k * 0.92), Math.min(255, c[2] + l[2] * k * 0.6), c[3]].map(Math.round) as Color;
}

function rayTri(o: V3, d: V3, t: Tri): number {
  const [a, b, c] = t.v;
  const e1 = sub(b, a), e2 = sub(c, a);
  const p = cross(d, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-9) return -1;
  const inv = 1 / det;
  const s = sub(o, a);
  const u = dot(s, p) * inv;
  if (u < 0 || u > 1) return -1;
  const q = cross(s, e1);
  const v = dot(d, q) * inv;
  if (v < 0 || u + v > 1) return -1;
  const tt = dot(e2, q) * inv;
  return tt > 0.01 ? tt : -1;
}
function rayBox(o: V3, d: V3, box: [V3, V3]): boolean {
  let t0 = 0, t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-9) {
      if (o[k] < box[0][k] - 0.5 || o[k] > box[1][k] + 0.5) return false;
      continue;
    }
    let a = (box[0][k] - 0.5 - o[k]) / d[k], b = (box[1][k] + 0.5 - o[k]) / d[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Rasterises the scene into a Frame (origin (ox, oy) = world (0, 0, 0)), shades every pixel into a
 * ramp step, adds facet crests, inner lines between parts and cleans single-pixel speckles.
 */
function render(scene: Scene, w: number, h: number, ox: number, oy: number): Frame {
  const f = new Frame(w, h, ox, oy, scene);
  for (const mesh of scene.meshes)
    for (const t of mesh.tris) {
      if (K * t.n[1] - t.n[2] <= 1e-4) continue; // faces away from the camera
      const P = t.v.map((p) => f.proj(p));
      const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), x1 = Math.min(w - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
      const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), y1 = Math.min(h - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
      const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
      if (Math.abs(area) < 1e-6) continue;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[2][0] - px) * (P[1][1] - py)) / area;
          const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[0][0] - px) * (P[2][1] - py)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
          const wp: V3 = add(add(mul(t.v[0], w0), mul(t.v[1], w1)), mul(t.v[2], w2));
          const i = y * w + x;
          if (wp[2] >= f.depth[i]) continue;
          f.depth[i] = wp[2];
          f.mesh[i] = mesh.id;
          f.group[i] = t.group;
          const nn = unit(add(add(mul(t.vn[0], w0), mul(t.vn[1], w1)), mul(t.vn[2], w2)));
          f.nrm.set(nn, i * 3);
          f.pos.set(wp, i * 3);
        }
    }
  // Light, cast shadows and ramp steps.
  const casters = scene.meshes.filter((mm) => mm.castShadow !== false);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const mi = f.mesh[i];
      if (mi < 0) continue;
      const mesh = scene.meshes[mi];
      const n0 = f.normal(i), p = f.world(i);
      let n = n0;
      if (mesh.form) {
        const [lo, hi] = mesh.box;
        const c: V3 = [(lo[0] + hi[0]) / 2, lo[1] + (hi[1] - lo[1]) * 0.3, (lo[2] + hi[2]) / 2];
        const r: V3 = [(hi[0] - lo[0]) / 2, (hi[1] - lo[1]) * 0.7, (hi[2] - lo[2]) / 2];
        const ne = unit([(p[0] - c[0]) / (r[0] * r[0]), (p[1] - c[1]) / (r[1] * r[1]), (p[2] - c[2]) / (r[2] * r[2])]);
        n = unit(add(mul(n0, 1 - mesh.form), mul(ne, mesh.form)));
      }
      let light = lightOf(n);
      light = 0.5 + (light - 0.5) * (mesh.contrast ?? 1);
      light += (hash(f.group[i], 17, (mesh.seed ?? 0) + 3) - 0.5) * 2 * (mesh.facetVar ?? 0.05);
      if (mesh.tex) light += (fbm(p[0] + 31, p[1] * 0.8 + p[2] * 0.5, mesh.texCell ?? 7, 2, (mesh.seed ?? 0) + 5) - 0.5) * 2 * mesh.tex;
      let lit = true;
      if (mesh.receiveShadow !== false && lightOf(n0) > 0.2) {
        const o = add(add(p, mul(n0, 0.7)), mul(LW, 0.4));
        outer: for (const c of casters) {
          if (c === mesh) continue;
          if (!rayBox(o, LW, c.box)) continue;
          for (const t of c.tris)
            if (rayTri(o, LW, t) > 0) {
              lit = false;
              break outer;
            }
        }
      }
      if (!lit) light = Math.min(light, 0.2 + light * 0.25);
      f.lightv[i] = light;
      let s = band(light, x, y, { steps: mesh.steps ?? [1, 2, 3, 4], bias: mesh.bias ?? -0.1, jitter: mesh.jitter ?? 0.08, seed: mesh.seed ?? 7, cell: mesh.cell ?? 3 });
      if (mesh.ao && p[1] < mesh.ao) s = Math.max(1, s - 1);
      if (mesh.shade) s = mesh.shade({ x, y, n: n0, p, light, lit, mesh }, s);
      f.pal[i] = mesh.pal;
      f.step[i] = s;
    }
  // Facet crests and seams.
  const bump: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const mi = f.mesh[i];
      if (mi < 0) continue;
      const mesh = scene.meshes[mi];
      if (mesh.crest === false && !mesh.seam) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = f.idx(x + dx, y + dy);
        if (j < 0 || f.mesh[j] !== mi || f.group[j] === f.group[i]) continue;
        const ang = Math.acos(clamp(dot(f.normal(i), f.normal(j)), -1, 1));
        if (ang < 0.35) continue;
        const li = f.lightv[i], lj = f.lightv[j];
        if (mesh.crest !== false && li > lj + 0.14 && li > 0.66) bump[i] = 1;
        if (mesh.seam && lj > li + 0.15 && li < 0.45) bump[i] = -1;
      }
    }
  bump.forEach((b, i) => {
    if (b) f.step[i] = clamp(f.step[i] + b, 1, 5);
  });
  despeckle(f);
  innerLines(f);
  return f;
}

/** Pixels whose four neighbours (same part) all share another step take that step. */
function despeckle(f: Frame): void {
  const fix: [number, number][] = [];
  for (let y = 1; y < f.h - 1; y++)
    for (let x = 1; x < f.w - 1; x++) {
      const i = y * f.w + x;
      if (f.pal[i] < 0) continue;
      const nb = [i - 1, i + 1, i - f.w, i + f.w];
      if (nb.some((j) => f.pal[j] !== f.pal[i] || f.mesh[j] !== f.mesh[i])) continue;
      const s0 = f.step[nb[0]];
      if (s0 !== f.step[i] && nb.every((j) => f.step[j] === s0)) fix.push([i, s0]);
    }
  for (const [i, s] of fix) f.step[i] = s;
}

/** Where one part lies in front of another, the pixel of the part behind becomes the front part's outline. */
function innerLines(f: Frame): void {
  const lines: [number, Color][] = [];
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x;
      const mi = f.mesh[i];
      if (mi < 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = f.idx(x + dx, y + dy);
        if (j < 0 || f.mesh[j] < 0 || f.mesh[j] === mi) continue;
        if (f.depth[j] < f.depth[i] - 0.3) {
          lines.push([i, PAL[f.scene.meshes[f.mesh[j]].pal][0]]);
          break;
        }
      }
    }
  for (const [i, c] of lines) f.over[i] = c;
}

// --- painting helpers -----------------------------------------------------------------------

/** Ramp color by palette and step. */
const C = (p: number, s: number): Color => PAL[p][clamp(s, 0, 5)];

/** A 2D layer drawn with its own outline over the frame canvas (inner lines where it overlaps). */
function layer(w: number, h: number, draw: (c: Canvas) => void, outline = true): Canvas {
  const c = new Canvas(w, h);
  draw(c);
  if (outline) c.outline();
  return c;
}

/**
 * Moss on upward-facing pixels: a world-anchored mask filled with small cushions (2-4 px ellipses)
 * drawn top to bottom, each lit from the upper left, so the moss reads as clumps with dark
 * under-edges; it hangs a little over front edges and pokes above the silhouette.
 */
function paintMoss(f: Frame, o: { meshes: number[]; amount: number; seed: number; cell?: number; minUp?: number; drip?: number; bumps?: boolean; size?: number }): void {
  const mask = new Uint8Array(f.w * f.h);
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x;
      if (!o.meshes.includes(f.mesh[i]) || f.over[i]) continue;
      const n = f.normal(i), p = f.world(i);
      if (n[1] < (o.minUp ?? 0.45)) continue;
      const v = fbm(p[0] + 50, p[2] * 1.4 + 50, o.cell ?? 9, 3, o.seed);
      if (v + (n[1] - 0.7) * 0.25 > 1 - o.amount) mask[i] = 1;
    }
  // Hang over front edges.
  const drip = o.drip ?? 2;
  for (let y = f.h - 2; y >= 0; y--)
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x;
      if (mask[i] !== 1) continue;
      const below = f.idx(x, y + 1);
      if (below < 0 || mask[below] || f.pal[below] < 0 || !o.meshes.includes(f.mesh[below]) || f.normal(below)[1] > 0.45) continue;
      const n = Math.floor(hash(x, 3, o.seed + 9) * (drip + 1));
      for (let k = 1; k <= n; k++) {
        const j = f.idx(x, y + k);
        if (j >= 0 && f.pal[j] >= 0 && o.meshes.includes(f.mesh[j]) && !f.over[j]) mask[j] = 2;
      }
    }
  // Bumps: the top edge of the moss pokes one pixel above the stone's silhouette here and there.
  if (o.bumps)
    for (let y = 1; y < f.h; y++)
      for (let x = 0; x < f.w; x++) {
        const i = y * f.w + x;
        const up = f.idx(x, y - 1);
        if (mask[i] !== 1 || up < 0 || f.pal[up] >= 0 || f.over[up]) continue;
        if (noise(x, 0, 2, o.seed + 21) > 0.5) mask[up] = 3;
      }
  const M = (x: number, y: number): number => {
    const j = f.idx(x, y);
    return j < 0 ? 0 : mask[j];
  };
  // Cushions: centers on a jittered grid; each lights its upper-left crescent and darkens a
  // pocket at its lower right, so the patch reads as round clumps lit from the upper left.
  const sz = o.size ?? 1;
  const delta = new Int8Array(f.w * f.h);
  const g = 4;
  for (let gy = 0; gy < f.h; gy += g)
    for (let gx = 0; gx < f.w; gx += g) {
      const cx = gx + Math.floor(hash(gx, gy, o.seed + 1) * g), cy = gy + Math.floor(hash(gx, gy, o.seed + 2) * g);
      if (M(cx, cy) !== 1) continue;
      const rx = (1.8 + hash(gx, gy, o.seed + 3) * 1.4) * sz, ry = rx * 0.75;
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
        for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
          const j = f.idx(x, y);
          if (j < 0 || !mask[j]) continue;
          const u = (x - cx) / rx, v = (y - cy) / ry;
          const d = u * u + v * v;
          if (d > 1.3) continue;
          if (d <= 1 && u + v < -0.55) delta[j] = Math.max(delta[j], 1);
          else if (d > 0.75 && u + v > 0.75 && delta[j] === 0) delta[j] = -1;
        }
    }
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x;
      if (!mask[i]) continue;
      const lit = f.mesh[i] < 0 || f.lightv[i] > 0.32;
      let s = mask[i] === 2 ? (hash(x, y, o.seed + 5) < 0.6 ? 1 : 2) : lit ? 3 : 2;
      if (mask[i] !== 2) s += delta[i];
      const edgeBelow = !M(x, y + 1), edgeAbove = !M(x, y - 1) || !M(x - 1, y);
      if (edgeBelow) s = Math.min(s, mask[i] === 2 ? 1 : 2);
      else if (edgeAbove && lit && mask[i] !== 2) s = Math.max(s, 3);
      f.pal[i] = MOSS;
      f.step[i] = clamp(s, 1, 4);
      f.over[i] = null;
      if (f.mesh[i] < 0) f.lightv[i] = 0.5;
    }
}

/** Lichen: small pale blots (3-6 px) on stone faces; dimmer on faces in shadow. */
function paintLichen(f: Frame, o: { meshes: number[]; seed: number; density: number; minLight?: number }): void {
  const g = 7;
  for (let gy = 0; gy < f.h; gy += g)
    for (let gx = 0; gx < f.w; gx += g) {
      if (hash(gx, gy, o.seed) > o.density) continue;
      const cx = gx + Math.floor(hash(gx, gy, o.seed + 1) * g), cy = gy + Math.floor(hash(gx, gy, o.seed + 2) * g);
      const i = f.idx(cx, cy);
      if (i < 0 || !o.meshes.includes(f.mesh[i]) || f.pal[i] !== f.scene.meshes[f.mesh[i]].pal || f.over[i]) continue;
      if (f.lightv[i] < (o.minLight ?? 0.3)) continue;
      const big = hash(gx, gy, o.seed + 3) > 0.45;
      const mi = f.mesh[i], pi = f.pal[i];
      const shape: [number, number, number][] = big
        ? [[0, 0, 3], [1, 0, 2], [-1, 0, 2], [0, 1, 2], [1, 1, 2], [-1, 1, 1], [2, 1, 1], [0, -1, 2]]
        : [[0, 0, 3], [1, 0, 2], [0, 1, 2], [1, 1, 1]];
      for (const [dx, dy, s] of shape) {
        const j = f.idx(cx + dx, cy + dy);
        if (j < 0 || f.mesh[j] !== mi || f.pal[j] !== pi || f.over[j]) continue;
        f.pal[j] = LICHEN;
        f.step[j] = f.lightv[j] > 0.6 ? s : Math.max(1, s - 1);
      }
    }
}

/**
 * A crack: a jagged polyline in screen space drawn dark (step 1 / outline), with a lit lip on the
 * upper-left side where the stone catches the light.
 */
function paintCrack(f: Frame, pts: [number, number][], meshes: number[]): void {
  const cells = new Set<number>();
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= n; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / (n || 1)), y = Math.round(y0 + ((y1 - y0) * s) / (n || 1));
      const i = f.idx(x, y);
      if (i >= 0 && meshes.includes(f.mesh[i]) && f.pal[i] >= 0) cells.add(i);
    }
  }
  for (const i of cells) {
    const x = i % f.w, y = Math.floor(i / f.w);
    f.over[i] = mix(PAL[f.pal[i]][0], PAL[f.pal[i]][1], 0.35);
    // Lit lip on the side the light comes from (above / left) if not part of the crack.
    for (const [dx, dy] of [[0, 1], [1, 0]]) {
      const j = f.idx(x + dx, y + dy);
      if (j >= 0 && !cells.has(j) && f.pal[j] >= 0 && meshes.includes(f.mesh[j]) && !f.over[j] && f.lightv[j] > 0.35) f.step[j] = Math.min(5, f.step[j] + 1);
    }
  }
}

/** Removes pixels (chips knocked out of an edge) and lights the fresh break facet below them. */
function chip(f: Frame, cx: number, cy: number, pts: [number, number][], freshPts: [number, number][] = []): void {
  for (const [dx, dy] of pts) {
    const i = f.idx(cx + dx, cy + dy);
    if (i < 0) continue;
    f.pal[i] = -1;
    f.mesh[i] = -1;
    f.over[i] = null;
  }
  for (const [dx, dy] of freshPts) {
    const i = f.idx(cx + dx, cy + dy);
    if (i >= 0 && f.pal[i] >= 0) f.step[i] = Math.min(5, Math.max(f.step[i] + 1, 4));
  }
}

// --- framing --------------------------------------------------------------------------------

/**
 * Crops every frame of a sprite to the union of their opaque bounds (1 px margin) so all frames
 * share one size and one anchor. (gx, gy) is the ground point on the work canvas; the anchor y is
 * the lowest opaque row of the first frame.
 */
function finish(name: string, label: string, meters: [number, number], tags: string[], anims: Record<string, { frames: Canvas[]; fps: number; loop?: boolean }>, gx: number, gy?: number): WorldSprite {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of Object.values(anims))
    for (const fr of a.frames) {
      const b = fr.bounds();
      if (!b) continue;
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]);
      y1 = Math.max(y1, b[3]);
    }
  x0 -= 1;
  y0 -= 1;
  x1 += 1;
  y1 += 1;
  const crop = (c: Canvas): Canvas => {
    const out = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
    out.draw(c, -x0, -y0);
    return out;
  };
  const first = Object.values(anims)[0].frames[0];
  const fb = first.bounds()!;
  const out: Record<string, Anim> = {};
  for (const [k, a] of Object.entries(anims)) out[k] = { frames: a.frames.map(crop), fps: a.fps, loop: a.loop };
  return { name, label, meters, anchor: [gx - x0, (gy ?? fb[3]) - y0], tags, anims: out };
}

// ================================================================================================
// STONE LANTERN (toro)
// ================================================================================================

/** A ring on a hexagon of circumradius r (flat face to the viewer), 24 points; corners lift and reach out. */
function kasaRing(h: number, r: number, lift: number, out = 0): V3[] {
  const pts: V3[] = [];
  const N = 24, seg = Math.PI / 3;
  for (let j = 0; j < N; j++) {
    const a = Math.PI / 3 + (j * TAU) / N;
    const rel = (((a - Math.PI / 3) % seg) + seg) % seg;
    const dc = Math.min(rel, seg - rel);
    const polyR = (r * Math.cos(Math.PI / 6)) / Math.cos(Math.PI / 6 - dc);
    const cf = Math.max(0, 1 - dc / (seg * 0.4)) ** 1.5;
    pts.push([Math.cos(a) * (polyR + out * cf), h + lift * cf, Math.sin(a) * (polyR + out * cf)]);
  }
  return pts;
}

/** Flame bitmaps, bottom row last: r tip, o orange, y yellow, w white-hot core. */
const LANTERN_FLAMES = [
  ['.r.', '.o.', '.o.', 'oyo', 'ywy', 'ywy', 'oyo'],
  ['..r', '.ro', '.o.', 'oyo', 'ywy', 'ywy', 'oyo'],
  ['.r.', '.o.', '.oy', 'oyo', 'oyy', 'ywy', 'ywy', 'oyo'],
  ['r..', 'or.', '.o.', 'oyo', 'ywy', 'ywy', 'oyo'],
  ['.r.', '.o.', 'oyo', 'ywy', 'ywy', 'oyo'],
  ['.r.', '.r.', '.o.', 'oyo', 'yyo', 'ywy', 'oyo'],
];
const FLAME_COL: Record<string, Color> = { r: hex('#ef4444'), o: R.fire[3], y: R.fire[4], w: hex('#fde68a') };

function stoneLantern(): WorldSprite {
  const W = 90, H = 130, ox = 45, oy = 112;
  const build = () => {
    GROUP = 1;
    const sc = new Scene();
    const st = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: STONE, seed, tex: 0.07, texCell: 6, ...extra });
    // Base: a wide hexagonal slab and a chamfered second tier.
    const base = sc.add(loft([hexRing(0, 0, 0, 16), hexRing(0, 4.5, 0, 16), hexRing(0, 6.5, 0, 14.5)], { capEnd: true }), st(11));
    const base2 = sc.add(loft([hexRing(0, 6.5, 0, 11.5), hexRing(0, 9, 0, 11.5), hexRing(0, 10.5, 0, 8.5)], { capEnd: true }), st(12));
    // Pillar (sao) with a raised band (fushi) a little below the middle.
    const pillarRings: V3[][] = [];
    const prof: [number, number][] = [[10.5, 5.4], [20, 5.2], [20, 6.3], [22.5, 6.3], [22.5, 5.1], [36, 4.8]];
    for (const [hh, r] of prof) pillarRings.push(ring(0, hh, 0, r, r, 14));
    const pillar = sc.add(loft(pillarRings, { smooth: true }), st(13, { steps: [1, 2, 3, 3, 4], bias: -0.04 }));
    // Middle platform (chudai): lotus flare then a hexagonal slab.
    const chudai = sc.add(loft([hexRing(0, 35.5, 0, 6.5), hexRing(0, 38.5, 0, 10.8), hexRing(0, 39.5, 0, 12), hexRing(0, 43, 0, 12)], { capEnd: true }), st(14));
    // Firebox (hibukuro).
    const fire = sc.add(loft([hexRing(0, 43, 0, 9.5), hexRing(0, 62, 0, 9.5)], { capEnd: true }), st(15, { bias: -0.06 }));
    // Roof (kasa): eave fascia, a concave sloped top with upturned corners, the finial seat.
    const roof = sc.add(
      loft([kasaRing(61.5, 17, 1, 0), kasaRing(61.5, 18.5, 3.5, 1.5), kasaRing(64, 18.5, 4.2, 1.5), kasaRing(66.5, 15, 1.4, 0.4), kasaRing(70, 10.5, 0.4), kasaRing(74, 6.2, 0), kasaRing(75.5, 4.2, 0)], { capStart: true, capEnd: true }),
      st(16, { bias: -0.08 }),
    );
    // Finial: lotus cup and the jewel (hoju).
    const cup = sc.add(loft([ring(0, 75.5, 0, 2.6, 2.6, 8), ring(0, 77.2, 0, 3.8, 3.8, 8), ring(0, 78, 0, 3, 3, 8)], { capEnd: true, smooth: true }), st(17, { steps: [1, 2, 3, 4] }));
    const jewelR: V3[][] = [];
    for (const [hh, r] of [[78, 2.2], [79, 3.3], [81, 3.7], [83, 3], [84.5, 1.6]] as [number, number][]) jewelR.push(ring(0, hh, 0, r, r, 10));
    const jewel = sc.add(loft(jewelR, { capStart: true, capEnd: [0, 86.5, 0], smooth: true }), st(18, { steps: [1, 2, 3, 4, 5], bias: -0.05 }));
    return { sc, base, base2, pillar, chudai, fire, roof, cup, jewel };
  };

  const frame = (lit: boolean, t: number): Canvas => {
    const parts = build();
    const f = render(parts.sc, W, H, ox, oy);
    const id = (mm: Mesh) => mm.id;
    // Moss in the roof's hollow and on the ledges; lichen on the faces.
    paintMoss(f, { meshes: [id(parts.roof)], amount: 0.3, seed: 301, cell: 7, drip: 2, bumps: true });
    paintMoss(f, { meshes: [id(parts.chudai), id(parts.base2)], amount: 0.26, seed: 302, cell: 6, drip: 2 });
    paintMoss(f, { meshes: [id(parts.base)], amount: 0.34, seed: 303, cell: 7, drip: 2, bumps: true });
    paintLichen(f, { meshes: [id(parts.base), id(parts.fire), id(parts.chudai), id(parts.pillar), id(parts.roof)], seed: 310, density: 0.2, minLight: 0.4 });
    // Chips knocked out of edges, a crack in the base and the pillar.
    const [ex, ey] = f.proj([9.3, 63, -16]);
    chip(f, Math.round(ex), Math.round(ey), [[0, 1], [1, 1], [1, 0]], [[0, 0], [-1, 1]]);
    const [bx, by] = f.proj([-8, 4.5, -13.9]);
    chip(f, Math.round(bx), Math.round(by), [[0, 0], [1, 0], [0, 1]], [[1, 1], [2, 0]]);
    paintCrack(f, [[ox - 12, oy - 3], [ox - 11, oy - 1], [ox - 11, oy + 1], [ox - 12, oy + 3]], [id(parts.base)]);
    paintCrack(f, [[ox + 3, oy - 31], [ox + 2, oy - 28], [ox + 3, oy - 26]], [id(parts.pillar)]);
    // Firebox windows: the front opening, a sun on the left face and a moon on the right.
    const frontD = -9.5 * Math.cos(Math.PI / 6);
    const [wx0, wy1] = f.proj([-3, 45.5, frontD]).map(Math.round);
    const [wx1, wy0] = f.proj([3, 56, frontD]).map(Math.round);
    const flick = [0, 1, 1, 0, -1, -1][t % 6];
    const warmSet = (x: number, y: number, v: number) => {
      const i = f.idx(x, y);
      if (i >= 0) f.warm[i] = Math.max(f.warm[i], v);
    };
    for (let y = wy0; y < wy1; y++)
      for (let x = wx0; x < wx1; x++) {
        const i = f.idx(x, y);
        const fromBottom = wy1 - 1 - y;
        if (fromBottom < 2) {
          // The sill: the bottom inside face, seen from above.
          f.set(x, y, STONE, fromBottom === 0 ? 2 : 3);
          if (lit) warmSet(x, y, fromBottom === 1 ? 0.9 : 0.7);
          continue;
        }
        if (!lit) {
          f.over[i] = y === wy0 || x === wx0 ? C(STONE, 0) : mix(C(STONE, 0), C(STONE, 1), 0.45);
          continue;
        }
        // Lit inside: the back wall glows, brightest low and around the flame.
        const dx = Math.abs(x + 0.5 - (wx0 + wx1) / 2), up = fromBottom - 2;
        const v = 1 - up / 9 - dx / 5;
        f.over[i] = y === wy0 ? mix(R.fire[0], R.fire[1], 0.4) : v > 0.55 ? R.fire[2] : v > 0.25 ? mix(R.fire[1], R.fire[2], 0.5) : R.fire[1];
      }
    // Side windows (left: round sun, right: crescent moon).
    const sideHole = (cxW: number, cdW: number, moon: boolean) => {
      const [sx, sy] = f.proj([cxW, 51.5, cdW]).map(Math.round);
      const pts: [number, number][] = moon ? [[1, -1], [0, 0], [0, 1], [1, 2]] : [[0, -1], [1, -1], [0, 0], [1, 0], [0, 1], [1, 1]];
      for (const [dx, dy] of pts) {
        const i = f.idx(sx + dx, sy + dy);
        if (i < 0) continue;
        f.over[i] = lit ? (dy >= 1 ? R.fire[4] : R.fire[3]) : dy === -1 ? C(STONE, 0) : mix(C(STONE, 0), C(STONE, 1), 0.5);
        if (lit) for (const [ax, ay] of [[-1, 0], [2, 0], [0, 2], [1, 2], [-1, 1]]) warmSet(sx + dx + ax, sy + dy + ay, 0.3);
      }
    };
    sideHole(-7.2, -2.6, false);
    sideHole(6.8, -2.6, true);
    if (lit) {
      // Light spill: the platform in front of the window and a rim of the stone around the opening.
      const cx = (wx0 + wx1) / 2, cy = wy1 - 1;
      const rad = 8.5 + flick * 0.8;
      for (let y = 0; y < f.h; y++)
        for (let x = 0; x < f.w; x++) {
          const i = f.idx(x, y);
          if (f.pal[i] < 0 || f.over[i]) continue;
          const n = f.normal(i);
          const mi = f.mesh[i];
          if (mi !== id(parts.fire) && mi !== id(parts.chudai)) continue;
          const isTop = n[1] > 0.5;
          const dx = (x + 0.5 - cx) / rad, dy = (y + 0.5 - cy) / (isTop ? rad * 0.45 : rad * 0.75);
          const d = Math.hypot(dx, dy);
          if (d > 1) continue;
          // Tops in front of the window catch the light; the box face only near the opening edge.
          const v = isTop ? (1 - d) * 1.1 : y >= wy0 - 1 && y < wy1 ? (1 - d) * 0.7 : (1 - d) * 0.35;
          warmSet(x, y, v * (1 + flick * 0.08));
        }
    }
    const c = f.compose();
    if (lit) {
      const bm = LANTERN_FLAMES[t % 6];
      const fx = Math.round((wx0 + wx1) / 2) - 2, fb = wy1 - 2;
      bm.forEach((row, k) => {
        for (let dx = 0; dx < row.length; dx++) {
          const ch = row[dx];
          if (ch !== '.') c.set(fx + dx, fb - (bm.length - k), FLAME_COL[ch]);
        }
      });
      // The wick sits in a little oil dish on the sill.
      c.set(fx + 1, fb, R.charred[3]);
      c.set(fx, fb, mix(R.fire[1], R.charred[3], 0.5));
      c.set(fx + 2, fb, mix(R.fire[1], R.charred[3], 0.5));
    } else {
      // An unlit candle stub on the sill.
      const fx = Math.round((wx0 + wx1) / 2) - 1, fb = wy1 - 2;
      c.set(fx, fb - 1, C(PAPER, 2));
      c.set(fx, fb - 2, C(PAPER, 3));
      c.set(fx, fb - 3, R.charred[2]);
    }
    c.outline();
    return c;
  };

  const litFrames = [0, 1, 2, 3, 4, 5].map((t) => frame(true, t));
  const unlit = frame(false, 0);
  return finish('stone_lantern', 'Stone Lantern', [0.7, 1.7], ['light-source', 'cover-half', 'interactable'], { lit: { frames: litFrames, fps: 8 }, unlit: { frames: [unlit], fps: 0 } }, ox);
}

/**
 * A faceted stone: jittered rings stacked by `profile` ([height fraction, radius fraction]),
 * leaning toward `lean` px at the top, closed by a low pyramid so the top breaks into facets.
 */
function rockMesh(o: { cx: number; cd: number; rx: number; rd: number; h: number; n?: number; seed: number; lean?: number; leanD?: number; profile?: [number, number][]; rot?: number; jit?: number; hJit?: number; h0?: number; apexUp?: number }): Tri[] {
  const prof = o.profile ?? [[0, 0.9], [0.32, 1], [0.72, 0.82], [0.94, 0.45]];
  const n = o.n ?? 8;
  const h0 = o.h0 ?? 0;
  const rings = prof.map(([hf, rf], k) =>
    ring(o.cx + (o.lean ?? 0) * hf, h0 + hf * o.h, o.cd + (o.leanD ?? 0) * hf, o.rx * rf, o.rd * rf, n, {
      rot: (o.rot ?? 0.3) + (k % 2) * (Math.PI / n) * 0.35,
      jit: o.jit ?? 0.12,
      hJit: k > 0 ? o.h * (o.hJit ?? 0.05) : 0,
      seed: o.seed + k * 7,
    }),
  );
  const apex: V3 = [o.cx + (o.lean ?? 0) * 1.05 + (rnd(o.seed, 9) - 0.5) * o.rx * 0.3, h0 + o.h * (1 + (o.apexUp ?? 0.03)), o.cd + (o.leanD ?? 0) + (rnd(o.seed, 10) - 0.5) * o.rd * 0.3];
  return loft(rings, { capEnd: apex });
}

function boulder(): WorldSprite {
  const W = 130, H = 110, ox = 62, oy = 90;
  GROUP = 1;
  const sc = new Scene();
  const st = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: STONE, seed, tex: 0.035, texCell: 10, contrast: 1.2, facetVar: 0.07, ao: 3, form: 0.35, ...extra });
  const main = sc.add(rockMesh({ cx: -3, cd: 0, rx: 39, rd: 22, h: 52, n: 8, seed: 21, lean: -7, leanD: 2, profile: [[0, 0.86], [0.22, 1], [0.6, 0.9], [0.88, 0.55]], rot: 0.25, jit: 0.12, hJit: 0.07 }), st(21));
  const lump = sc.add(rockMesh({ cx: 25, cd: -7, rx: 18, rd: 13, h: 24, n: 7, seed: 22, lean: -2, profile: [[0, 0.95], [0.4, 1], [0.8, 0.7]], rot: 0.6, jit: 0.15 }), st(22));
  const feet: Mesh[] = [];
  const foot = (cx: number, cd: number, rx: number, h: number, seed: number, warm = false) =>
    feet.push(sc.add(rockMesh({ cx, cd, rx, rd: rx * 0.75, h, n: 6, seed, profile: [[0, 0.95], [0.5, 1], [0.9, 0.6]], jit: 0.18 }), { pal: warm ? STONE_W : STONE, seed, crest: true, bias: -0.02 }));
  foot(40, -16, 5.5, 5, 31);
  foot(48, -10, 3.5, 3.5, 32, true);
  foot(-38, -16, 4.5, 4, 33, true);
  foot(-30, -21, 3, 2.5, 34);
  foot(33, -21, 2.5, 2.5, 35);
  const f = render(sc, W, H, ox, oy);
  paintMoss(f, { meshes: [main.id], amount: 0.5, seed: 401, cell: 10, drip: 3, minUp: 0.4, bumps: true });
  paintMoss(f, { meshes: [lump.id], amount: 0.3, seed: 402, cell: 7, drip: 2, minUp: 0.4 });
  paintLichen(f, { meshes: [main.id, lump.id], seed: 410, density: 0.28, minLight: 0.35 });
  paintCrack(f, [[ox - 9, oy - 30], [ox - 7, oy - 26], [ox - 8, oy - 22], [ox - 5, oy - 17], [ox - 5, oy - 13]], [main.id]);
  paintCrack(f, [[ox + 15, oy - 40], [ox + 17, oy - 36], [ox + 16, oy - 33]], [main.id]);
  paintCrack(f, [[ox - 26, oy - 13], [ox - 24, oy - 10], [ox - 25, oy - 7]], [main.id]);
  const c = f.compose();
  c.outline();
  return finish('boulder', 'Mossy Boulder', [1.6, 1.3], ['cover-3q', 'climbable'], { idle: { frames: [c], fps: 0 } }, ox);
}

function rock(): WorldSprite {
  const W = 80, H = 60, ox = 38, oy = 46;
  GROUP = 1;
  const sc = new Scene();
  const main = sc.add(rockMesh({ cx: 0, cd: 0, rx: 23, rd: 13, h: 21, n: 8, seed: 51, lean: -4, profile: [[0, 0.92], [0.35, 1], [0.75, 0.8], [0.95, 0.45]], rot: 0.5, jit: 0.12 }), { pal: STONE, seed: 51, tex: 0.035, texCell: 9, contrast: 1.2, facetVar: 0.07, ao: 2, form: 0.35 });
  const side = sc.add(rockMesh({ cx: 17, cd: -6, rx: 7, rd: 5, h: 6, n: 6, seed: 52, profile: [[0, 0.95], [0.5, 1], [0.9, 0.6]], jit: 0.15 }), { pal: STONE_W, seed: 52, bias: -0.02 });
  const f = render(sc, W, H, ox, oy);
  paintMoss(f, { meshes: [main.id], amount: 0.3, seed: 451, cell: 6, drip: 2, minUp: 0.45 });
  paintLichen(f, { meshes: [main.id], seed: 452, density: 0.3, minLight: 0.35 });
  paintCrack(f, [[ox + 4, oy - 17], [ox + 6, oy - 13], [ox + 5, oy - 9]], [main.id]);
  void side;
  const c = f.compose();
  c.outline();
  return finish('rock', 'Rock', [0.9, 0.6], ['cover-half'], { idle: { frames: [c], fps: 0 } }, ox);
}

function pebbles(): WorldSprite {
  const W = 50, H = 30, ox = 24, oy = 22;
  GROUP = 1;
  const sc = new Scene();
  const list: [number, number, number, number, number, boolean][] = [
    // cx, cd, rx, h, seed, warm
    [-6, 2, 7, 6, 61, false],
    [5, -1, 6, 5, 62, true],
    [-13, -4, 4, 3.5, 63, true],
    [12, -6, 4, 3, 64, false],
    [0, -8, 3.5, 3, 65, false],
    [-2, 9, 4.5, 4, 66, true],
    [13, 5, 3, 2.5, 67, false],
  ];
  for (const [cx, cd, rx, h, seed, warm] of list)
    sc.add(rockMesh({ cx, cd, rx, rd: rx * 0.75, h, n: 7, seed, profile: [[0, 0.9], [0.45, 1], [0.85, 0.65]], jit: 0.12, apexUp: 0.05 }), { pal: warm ? STONE_W : STONE, seed, crest: true, bias: -0.04 });
  const f = render(sc, W, H, ox, oy);
  const c = f.compose();
  c.outline();
  return finish('rocks_small', 'Pebbles', [0.6, 0.25], ['ambient'], { idle: { frames: [c], fps: 0 } }, ox);
}

/** Wet stone: a little darker and cooler than dry stone, with a cool glint at the top step. */
const STONE_WET = pal([STONE_RAMP[0], mix(STONE_RAMP[1], R.water[1], 0.25), mix(STONE_RAMP[2], R.water[2], 0.2), mix(STONE_RAMP[3], R.water[2], 0.14), mix(STONE_RAMP[4], R.water[4], 0.15), mix(R.paper[4], R.water[5], 0.3)]);
/** Stone seen through the water. */
const STONE_SUB = pal([R.water[0], R.water[1], mix(R.water[1], STONE_RAMP[2], 0.35), mix(R.water[2], STONE_RAMP[3], 0.35), mix(R.water[3], STONE_RAMP[4], 0.3), R.water[4]]);

/** Pixels of a 1 px ellipse ring (no doubled corners), as [x, y, angle] with angle 0 at the right, PI/2 at the front. */
function ellipseRing(cx: number, cy: number, rx: number, ry: number): [number, number, number][] {
  const seen = new Map<string, [number, number, number]>();
  const n = Math.ceil((rx + ry) * 8);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    const x = Math.floor(cx + Math.cos(a) * rx), y = Math.floor(cy + Math.sin(a) * ry);
    const key = `${x},${y}`;
    if (!seen.has(key)) seen.set(key, [x, y, a]);
  }
  const pts = [...seen.values()];
  // Pixel-perfect: drop the corner pixel of every L so the ring stays 1 px thin.
  const out: [number, number, number][] = [];
  for (let k = 0; k < pts.length; k++) {
    const prev = out[out.length - 1], next = pts[(k + 1) % pts.length], c = pts[k];
    if (prev && Math.abs(prev[0] - next[0]) === 1 && Math.abs(prev[1] - next[1]) === 1 && Math.abs(prev[0] - c[0]) + Math.abs(prev[1] - c[1]) === 1 && Math.abs(next[0] - c[0]) + Math.abs(next[1] - c[1]) === 1) continue;
    out.push(c);
  }
  return out;
}

function riverStones(): WorldSprite {
  const W = 110, H = 64, ox = 54, oy = 38;
  const stones = [
    { cx: -25, cd: -9, rx: 13.5, rd: 9.5, h: 5, seed: 71 },
    { cx: 2, cd: 2, rx: 12, rd: 8.5, h: 6, seed: 72 },
    { cx: 27, cd: 13, rx: 10.5, rd: 7.5, h: 4.5, seed: 73 },
  ];
  GROUP = 1;
  const sc = new Scene();
  const meshes = stones.map((s) =>
    sc.add(rockMesh({ cx: s.cx, cd: s.cd, rx: s.rx, rd: s.rd, h: s.h + 3, h0: -3, n: 8, seed: s.seed, profile: [[0, 1.03], [0.4, 1], [0.74, 0.88], [1, 0.56]], apexUp: 0.09, jit: 0.11, hJit: 0.04 }), {
      pal: STONE_WET,
      seed: s.seed,
      contrast: 1.15,
      facetVar: 0.05,
      tex: 0.03,
      texCell: 8,
      form: 0.25,
      steps: [1, 2, 3, 3, 4],
    }),
  );
  const f = render(sc, W, H, ox, oy);
  const sub = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] < 0) continue;
    const p = f.world(i);
    if (p[1] < -0.3) {
      f.pal[i] = STONE_SUB;
      f.over[i] = null;
      sub[i] = 1;
    } else if (p[1] < 1.6) {
      // The wet band just above the water.
      f.step[i] = Math.max(1, f.step[i] - 1);
    }
  }
  // Glints on the wet tops (upper-left part of each top) and a moss tuft on the big stone.
  stones.forEach((s, k) => {
    const [gx, gy] = f.proj([s.cx - s.rx * 0.35, s.h + 0.5, s.cd - s.rd * 0.1]).map(Math.round);
    const streak: [number, number, number][] = k === 1 ? [[0, 0, 5], [1, 0, 5], [2, 0, 4], [-1, 1, 4], [4, 2, 4]] : [[0, 0, 5], [1, 0, 4], [-1, 1, 4], [3, -1, 4]];
    for (const [dx, dy, st] of streak) {
      const i = f.idx(gx + dx, gy + dy);
      if (i >= 0 && f.mesh[i] === meshes[k].id && !sub[i] && f.normal(i)[1] > 0.6) f.step[i] = Math.max(f.step[i], st);
    }
    void meshes;
  });
  const base = f.compose();
  base.outline({ toward: toHex(R.water[0]), amount: 0.55 });
  // Soften the outline under water: outline pixels touching submerged stone take a water tone.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (f.pal[i] >= 0 || f.over[i] || base.alpha(x, y) === 0) continue;
      const nearSub = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const j = f.idx(x + dx, y + dy);
        return j >= 0 && sub[j] === 1;
      });
      if (nearSub) base.set(x, y, R.water[1]);
    }
  // Waterline: a light lip where each stone meets the water (front half), broken on the shadow side.
  stones.forEach((s, k) => {
    const [cx, cy] = f.proj([s.cx, 0, s.cd]);
    for (const [x, y, a] of ellipseRing(cx, cy, s.rx * 1.0 + 0.6, (s.rd * 1.0 + 0.6) * K)) {
      if (a <= 0.15 || a >= Math.PI - 0.15) continue;
      const i = f.idx(x, y);
      if (i < 0 || f.mesh[i] !== meshes[k].id) continue;
      const lit = Math.cos(a) < 0.35;
      if (!lit && hash(x, y, 77) < 0.5) continue;
      base.set(x, y, lit ? mix(R.water[5], R.paper[4], 0.35) : R.water[4]);
    }
  });

  const frames: Canvas[] = [];
  for (let t = 0; t < 6; t++) {
    const c = base.clone();
    const canDraw = (x: number, y: number) => {
      const i = f.idx(x, y);
      return i >= 0 && (c.alpha(x, y) === 0 || sub[i] === 1 || (f.pal[i] < 0 && !f.over[i]));
    };
    stones.forEach((s, k) => {
      const [cx, cy] = f.proj([s.cx, 0, s.cd]);
      for (let r = 0; r < 2; r++) {
        const age = ((t + 3 * r + k * 2) % 6) / 6; // 0 new .. 5/6 old
        const d = 1.5 + age * 7;
        const col = age < 0.3 ? R.water[5] : age < 0.6 ? R.water[4] : R.water[3];
        for (const [x, y, a] of ellipseRing(cx, cy, s.rx + d, (s.rd + d) * K)) {
          // Three arcs per ring that shorten as the ring spreads and fades.
          if (Math.cos(a * 3 + k * 1.7 + r * 2.1) < -0.75 + age * 1.3) continue;
          if (!canDraw(x, y)) continue;
          c.set(x, y, col);
        }
      }
    });
    // Little sun glints on the water that come and go.
    const glints: [number, number, number][] = [
      [-40, -2, 0],
      [-8, 6, 2],
      [14, -12, 4],
      [38, 2, 1],
      [-30, 9, 3],
    ];
    for (const [gx, gy, ph] of glints) {
      const on = (t + ph) % 6;
      if (on > 2) continue;
      const x = ox + gx, y = oy + gy;
      const len2 = on === 1 ? 3 : 2;
      for (let k = 0; k < len2; k++) if (canDraw(x + k, y)) c.set(x + k, y, on === 1 ? mix(R.water[5], R.paper[4], 0.5) : R.water[5]);
    }
    frames.push(c);
  }
  const front = stones[0];
  const [, gy] = f.proj([front.cx, 0, front.cd - front.rd]);
  return finish('river_stones', 'Stepping Stones', [1.4, 0.15], ['water', 'climbable'], { idle: { frames, fps: 5 } }, ox, Math.round(gy) + 1);
}

const ROOF = pal(ramp(MATERIALS.barkCedar));

/** Extrudes a convex polygon given in the X-H plane along depth from d0 to d1 (closed both ends). */
function extrudeXH(poly: [number, number][], d0: number, d1: number): Tri[] {
  const r0: V3[] = poly.map(([x, h]) => [x, h, d0]);
  const r1: V3[] = poly.map(([x, h]) => [x, h, d1]);
  return loft([r0, r1], { capStart: true, capEnd: true });
}
/** Extrudes a convex polygon given in the D-H plane along X from x0 to x1 (closed both ends). */
function extrudeDH(poly: [number, number][], x0: number, x1: number): Tri[] {
  const r0: V3[] = poly.map(([d, h]) => [x0, h, d]);
  const r1: V3[] = poly.map(([d, h]) => [x1, h, d]);
  return loft([r0, r1], { capStart: true, capEnd: true });
}
/** A box with a chamfered top edge. */
function slab(x0: number, x1: number, h0: number, h1: number, d0: number, d1: number, ch = 1): Tri[] {
  const rect = (h: number, i: number): V3[] => [[x0 + i, h, d0 + i], [x1 - i, h, d0 + i], [x1 - i, h, d1 - i], [x0 + i, h, d1 - i]];
  return loft([rect(h0, 0), rect(h1 - ch, 0), rect(h1, ch)], { capEnd: true });
}

/**
 * A ring around a rectangle (x0..x1, d0..d1) at height h with `per` points per side; points near the
 * corners lift by `lift` and reach out by `out` (upturned eaves).
 */
function rectRing(x0: number, x1: number, d0: number, d1: number, h: number, per: number, lift = 0, out = 0): V3[] {
  const pts: V3[] = [];
  const corners: [number, number][] = [[x0, d0], [x1, d0], [x1, d1], [x0, d1]];
  const cx = (x0 + x1) / 2, cd = (d0 + d1) / 2;
  for (let s = 0; s < 4; s++) {
    const [ax, ad] = corners[s], [bx, bd] = corners[(s + 1) % 4];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const x = ax + (bx - ax) * t, d = ad + (bd - ad) * t;
      const cf = (1 - 2 * Math.min(t, 1 - t)) ** 2; // 1 at the corners, 0 mid-side: a curved eave
      const ux = x - cx, ud = d - cd, ul = Math.hypot(ux, ud) || 1;
      pts.push([x + (ux / ul) * out * cf, h + lift * cf, d + (ud / ul) * out * cf]);
    }
  }
  return pts;
}

function hokora(): WorldSprite {
  const W = 90, H = 100, ox = 45, oy = 80;
  GROUP = 1;
  const sc = new Scene();
  const st = (seed: number): MeshOpts => ({ pal: STONE, seed, tex: 0.04, texCell: 8, contrast: 1.1, ao: 2 });
  // Stone base: a footing slab, a pedestal block and a top slab.
  const foot = sc.add(slab(-18, 18, 0, 7.5, -14, 14, 1.5), st(81));
  const ped = sc.add(slab(-11.5, 11.5, 7.5, 21.5, -9, 9, 1), st(82));
  const top = sc.add(slab(-15, 15, 21.5, 26, -12, 12, 1.2), st(83));
  // Wooden shrine body on a darker sill, with corner posts.
  const wood = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: WOOD_OLD, seed, contrast: 1.05, facetVar: 0.02, ...extra });
  const body = sc.add(slab(-10, 10, 27.5, 50, -7.5, 7.5, 0), wood(84));
  const sill = sc.add(slab(-12, 12, 26, 28, -9.5, 9.5, 0.6), wood(85, { pal: WOOD_DK }));
  const posts = [-10, 10].map((x, k) => sc.add(slab(x - 1.4, x + 1.4, 27.5, 50, -8.3, -5.5, 0), wood(90 + k, { pal: WOOD_DK })));
  // Hipped cedar-bark roof with upturned corners, a ridge beam and two katsuogi logs.
  const per = 8;
  const roof = sc.add(
    loft(
      [
        rectRing(-15, 15, -12, 9, 44, per, 3.6, 1.6),
        rectRing(-15, 15, -12, 9, 46.4, per, 3.6, 1.6),
        rectRing(-10.5, 10.5, -7.5, 5, 51.5, per, 0.8, 0),
        rectRing(-5.5, 5.5, -1.2, 0.4, 57, per, 0, 0),
      ],
      { capStart: true, capEnd: true },
    ),
    { pal: ROOF, seed: 86, contrast: 1.15, facetVar: 0.03 },
  );
  const ridge = sc.add(pole([-7.5, 57.4, -0.4], [7.5, 57.4, -0.4], 1.8, 8), { pal: WOOD_DK, seed: 88 });
  const ends = [-1, 1].map((sd) => sc.add(loft([ring(sd * 7.6, 56.2, -0.4, 1.5, 1.5, 8), ring(sd * 8.3, 58.6, -0.4, 2.2, 2.0, 8), ring(sd * 9.2, 60, -0.4, 1.4, 1.4, 8)], { capEnd: true, smooth: true }), { pal: WOOD_DK, seed: 92 + sd }));
  const katsuo: Mesh[] = [];
  // A small front gable (chidori-hafu) on the front slope: a dark triangle under light bargeboards.
  const gable = sc.add(extrudeXH([[-7.5, 45.2], [7.5, 45.2], [0, 53.2]], -12.6, -3), { pal: WOOD_DK, seed: 93, facetVar: 0, contrast: 1.1 });
  const barge = [
    sc.add(extrudeXH([[-9.4, 44.6], [-7.9, 44.2], [0.8, 53.5], [0, 55]], -13.4, -3), { pal: ROOF, seed: 94, facetVar: 0, contrast: 1.15 }),
    sc.add(extrudeXH([[9.4, 44.6], [0, 55], [-0.8, 53.5], [7.9, 44.2]], -13.4, -3), { pal: ROOF, seed: 95, facetVar: 0, contrast: 1.15 }),
  ];
  void barge;
  void ends;
  void ridge;
  void katsuo;
  void posts;
  void sill;
  const f = render(sc, W, H, ox, oy);
  // Cedar-bark courses on the roof: seams at constant height (parallel to the eaves) on every
  // plane; the thick eave edge shows layered strata.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== roof.id) continue;
    const p = f.world(i), n = f.normal(i);
    const x = i % W, y = Math.floor(i / W);
    if (n[1] > 0.3) {
      const hh = p[1] - 46.8;
      if (hh > 1 && hh % 2.6 < 0.9) f.step[i] = Math.max(1, f.step[i] - 1);
    } else {
      f.step[i] = clamp(y % 2 === 0 ? f.step[i] + 1 : f.step[i], 1, 4);
    }
    void x;
  }
  // The gable's triangle: vertical boards and a round ornament (gegyo) under the apex.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== gable.id) continue;
    const p = f.world(i), n = f.normal(i);
    if (n[2] > -0.9) continue;
    if (Math.abs(p[0]) % 3 < 0.8) f.step[i] = Math.max(1, f.step[i] - 1);
    if (Math.hypot(p[0], p[1] - 49.6) < 1.3) f.step[i] = 4;
  }
  paintMoss(f, { meshes: [roof.id], amount: 0.2, seed: 811, cell: 6, drip: 1, minUp: 0.3, bumps: true });
  paintMoss(f, { meshes: [foot.id], amount: 0.3, seed: 812, cell: 6, drip: 2 });
  paintLichen(f, { meshes: [foot.id, ped.id, top.id], seed: 813, density: 0.3, minLight: 0.35 });
  // Vertical plank seams on the front wall either side of the doors.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== body.id) continue;
    const p = f.world(i), n = f.normal(i);
    if (n[2] < -0.9 && Math.abs(Math.abs(p[0]) - 8.6) < 0.5) f.step[i] = Math.max(1, f.step[i] - 1);
  }
  const fr = (x: number, h: number, d: number) => f.proj([x, h, d]).map(Math.round) as [number, number];
  const c0 = f.compose();
  // Doors: a dark frame, two leaves with a fox lattice over the dark inside.
  const [dx0, dy1] = fr(-7, 29, -7.5);
  const [dx1, dy0] = fr(7, 43, -7.5);
  const midX = Math.floor((dx0 + dx1) / 2);
  for (let y = dy0; y < dy1; y++)
    for (let x = dx0; x < dx1; x++) {
      const u = x - dx0, v = y - dy0;
      const edge = u === 0 || x === dx1 - 1 || v === 0 || y === dy1 - 1;
      let col: Color;
      if (edge) col = C(WOOD_DK, v === 0 ? 1 : u === 0 ? 3 : 2);
      else if (x === midX - 1) col = C(WOOD_DK, 3);
      else if (x === midX) col = C(WOOD_DK, 1);
      else if ((x - dx0) % 3 === 0 || v % 3 === 0) col = C(WOOD_OLD, v < 3 ? 2 : (x - dx0) % 3 === 0 && v % 3 === 0 ? 4 : 3);
      else col = v < 4 ? C(WOOD_DK, 0) : mix(C(WOOD_DK, 0), C(WOOD_DK, 1), 0.6);
      c0.set(x, y, col);
    }
  // Little offering cups on the top slab, left and right of the doors.
  for (const cx of [-13, 12]) {
    const [x, y] = fr(cx, 26, -10);
    c0.set(x, y - 1, C(PAPER, 4));
    c0.set(x + 1, y - 1, C(PAPER, 3));
    c0.set(x, y, C(PAPER, 2));
    c0.set(x + 1, y, C(PAPER, 2));
  }
  // Red cloth draped over the top slab's front edge, with broad folds and a scalloped hem.
  const cloth = layer(W, H, (c) => {
    const [cx0, cyTop] = fr(-9, 26, -10);
    const [cx1] = fr(9, 26, -10);
    const [, cyEdge] = fr(0, 26, -12);
    // Folds of uneven width: a lit first column, two mid, a shadowed last one.
    const widths = [5, 4, 5, 4, 5];
    let fx = cx0, fi = 0;
    while (fx <= cx1) {
      const wdt = widths[fi % widths.length];
      for (let u = 0; u < wdt && fx + u <= cx1; u++) {
        const x = fx + u;
        const fold = u === 0 ? 4 : u === wdt - 1 ? 2 : 3;
        const hem = cyEdge + 9 + (u === 1 || u === 2 ? 1 : 0) - (x === cx0 || x === cx1 ? 1 : 0);
        for (let y = cyTop; y <= hem; y++) {
          const onTop = y < cyEdge;
          let st = onTop ? (x - cx0 < 4 ? 4 : 3) : fold;
          if (y === cyEdge) st = Math.min(5, st + 1); // the cloth rolls over the edge
          if (!onTop && y > cyEdge + 6) st = Math.max(1, st - 1);
          if (y === hem) st = Math.max(1, st - 1);
          c.set(x, y, C(RED, st));
        }
      }
      fx += wdt;
      fi++;
    }
  });
  c0.draw(cloth, 0, 0);
  // Shimenawa: a twisted straw rope sagging across the front over the doors, with paper shide.
  const [rx0, ry0] = fr(-11.5, 45, -9);
  const [rx1] = fr(11.5, 45, -9);
  const ropeY = (x: number) => ry0 + Math.round(2.4 * (1 - (2 * ((x - rx0) / (rx1 - rx0)) - 1) ** 2));
  const rope = layer(W, H, (c) => {
    for (let x = rx0; x <= rx1; x++) {
      const u = (x - rx0) / (rx1 - rx0);
      const yc = ropeY(x);
      const thick = u < 0.1 || u > 0.9 ? 2 : 3;
      for (let k = 0; k < thick; k++) {
        const tw = (x + k) % 3 === 0;
        c.set(x, yc + k - 1, C(ROPE, k === 0 ? (tw ? 3 : 4) : tw ? 2 : k === thick - 1 ? 2 : 3));
      }
    }
  });
  c0.draw(rope, 0, 0);
  // Shide: zigzag paper streamers (each its own outlined layer so they read as folded paper).
  for (const sx of [-5.5, 5.5]) {
    const [x] = fr(sx, 45, -9);
    const y = ropeY(x) + 2;
    const sh = layer(W, H, (c) => {
      const zig: [number, number, number][] = [[0, 0, 4], [1, 0, 5], [1, 1, 4], [2, 1, 3], [0, 2, 4], [1, 2, 4], [1, 3, 4], [2, 3, 3], [0, 4, 4], [1, 4, 3], [1, 5, 3], [2, 5, 2]];
      for (const [zx, zy, s] of zig) c.set(x - 1 + zx, y + zy, C(PAPER, s));
    });
    c0.draw(sh, 0, 0);
  }
  c0.outline();
  return finish('hokora', 'Roadside Shrine', [0.65, 1.3], ['interactable'], { idle: { frames: [c0], fps: 0 } }, ox);
}

const IRON = pal(R.iron);

/** Abstract brush marks (no real script): 4x6 cells, '#' full ink, '+' dry brush. */
const GLYPHS = [
  ['..#.', '+##.', '..#.', '.##+', '#.#.', '..#.'],
  ['.+..', '###.', '.#.#', '.#..', '##+.', '.#..'],
  ['#...', '.##+', '..#.', '+##.', '..#.', '.#..'],
  ['..#.', '.#+.', '###.', '..#.', '.#.#', '#...'],
  ['.#..', '.##+', '#.#.', '.#..', '.##.', '...#'],
];

/** Vertical grain on wood: dark streaks that follow the board, in 2-3 px clusters. */
function grain(u: number, v: number, seed: number, amount = 0.72): boolean {
  return noise(u * 1.3, v / 6, 1.2, seed) * 0.7 + noise(u, v / 2.5, 1.5, seed + 1) * 0.3 > amount;
}

function signpost(): WorldSprite {
  const W = 100, H = 130, ox = 50, oy = 116;
  const POST_A = -0.4; // the post turns its broad face to the light and shows a shaded right side
  const A_ANG = -0.18, B_ANG = 0.22;
  const build = () => {
    GROUP = 1;
    const sc = new Scene();
    const wood = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: WOOD_OLD, seed, contrast: 1.15, facetVar: 0.02, ...extra });
    const post = sc.add(rotY(box(-3.6, 3.6, 0, 92, -3.6, 3.6), POST_A), wood(101, { ao: 3 }));
    // Tiny hipped cap with a knob on top.
    const capF = sc.add(rotY(loft([rectRing(-7, 7, -7, 7, 93, 3, 0.8, 0.5), rectRing(-7, 7, -7, 7, 94.8, 3, 0.8, 0.5), rectRing(-1.2, 1.2, -1.2, 1.2, 100, 3)], { capStart: true, capEnd: true }), POST_A), { pal: ROOF, seed: 102, contrast: 1.15, facetVar: 0.02 });
    const capB = sc.add(loft([ring(0, 99.5, 0, 1.6, 1.6, 8), ring(0, 101.3, 0, 1.9, 1.9, 8), ring(0, 102.6, 0, 1, 1, 8)], { capEnd: true, smooth: true }), { pal: WOOD_DK, seed: 103 });
    const capBlock = sc.add(rotY(box(-4.4, 4.4, 90.5, 93.2, -4.4, 4.4), POST_A), wood(104, { pal: WOOD_DK }));
    // Arrow boards: the upper one in front pointing right, the lower one behind pointing left.
    const boardA = sc.add(rotY(extrudeXH([[-6.5, 76], [21, 76], [27.5, 80.5], [21, 85], [-6.5, 85]], -6.4, -4.6), A_ANG), wood(105));
    const boardB = sc.add(rotY(extrudeXH([[6.5, 61], [6.5, 69.5], [-20, 69.5], [-26.5, 65.2], [-20, 61]], 4.6, 6.4), B_ANG), wood(106));
    // Stones at the foot.
    const feet: Mesh[] = [];
    const foot = (cx: number, cd: number, rx: number, h: number, seed: number, warm: boolean) =>
      feet.push(sc.add(rockMesh({ cx, cd, rx, rd: rx * 0.75, h, n: 6, seed, profile: [[0, 0.95], [0.5, 1], [0.9, 0.6]], jit: 0.18 }), { pal: warm ? STONE_W : STONE, seed, crest: true, bias: -0.02 }));
    foot(-6.5, -5, 3.6, 3.5, 111, false);
    foot(5.5, -6.5, 4.2, 4, 112, true);
    foot(9.5, -1, 2.6, 2.5, 113, false);
    return { sc, post, capF, capB, capBlock, boardA, boardB };
  };
  // Local (unrotated) coordinates of a world point.
  const unrot = (p: V3, a: number): V3 => {
    const c = Math.cos(-a), s = Math.sin(-a);
    return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
  };
  const rotP = (p: V3, a: number): V3 => {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
  };

  const frame = (t: number): Canvas => {
    const parts = build();
    const f = render(parts.sc, W, H, ox, oy);
    // Grain on the post and boards, ink on the board faces.
    for (let i = 0; i < W * H; i++) {
      const mi = f.mesh[i];
      if (mi < 0) continue;
      const p = f.world(i), n = f.normal(i);
      if (mi === parts.post.id) {
        const q = unrot(p, POST_A), nq = unrot(n, POST_A);
        const u = Math.abs(nq[0]) > 0.7 ? q[2] : q[0];
        if (nq[1] < 0.5 && grain(u + (nq[0] < -0.7 ? 20 : 0), q[1], 120)) f.step[i] = Math.max(1, f.step[i] - 1);
        if (nq[1] > 0.5) f.step[i] = 3;
      }
      for (const [mesh, ang, seed, glyphX] of [
        [parts.boardA, A_ANG, 130, [-3, 4.5, 12]],
        [parts.boardB, B_ANG, 140, [-21, -14, -7]],
      ] as [Mesh, number, number, number[]][]) {
        if (mi !== mesh.id) continue;
        const q = unrot(p, ang), nq = unrot(n, ang);
        if (nq[2] > -0.9) continue;
        const bottom = mesh === parts.boardA ? 76 : 61;
        // A plank seam along the board and fine grain.
        if (Math.abs(q[1] - (bottom + 4.5)) < 0.5 && hash(Math.floor(q[0] / 5), 1, seed) > 0.4) f.step[i] = Math.max(1, f.step[i] - 1);
        else if (grain(q[1] * 3, q[0] * 0.5, seed, 0.78)) f.step[i] = Math.max(1, f.step[i] - 1);
        // Ink glyphs.
        glyphX.forEach((gx, k) => {
          const g = GLYPHS[(k + (mesh === parts.boardA ? 0 : 2)) % GLYPHS.length];
          const lx = Math.floor(q[0] - gx), ly = Math.floor(bottom + 7.5 - q[1]);
          if (lx < 0 || lx > 3 || ly < 0 || ly > 5) return;
          const ch = g[ly][lx];
          if (ch === '#') f.over[i] = C(INK, 2);
          else if (ch === '+') f.over[i] = mix(C(INK, 3), C(WOOD_OLD, 2), 0.4);
        });
      }
    }
    // Nails where the boards meet the post.
    for (const [lp, ang] of [
      [[-1.5, 80.5, -6.4], A_ANG],
      [[1.5, 80.5, -6.4], A_ANG],
    ] as [V3, number][]) {
      const [x, y] = f.proj(rotP(lp, ang)).map(Math.round);
      const i = f.idx(x, y);
      if (i >= 0) f.over[i] = C(IRON, 4);
      const j = f.idx(x, y + 1);
      if (j >= 0) f.over[j] = C(IRON, 1);
    }
    const c = f.compose();
    // Rope: two wraps around the post (lit left face, front face), a knot and the ofuda.
    const ropeH = [56, 53.5];
    const corners: V3[] = [[-3.6, 0, -3.6], [3.6, 0, -3.6], [3.6, 0, 3.6]].map((p) => rotP(p as V3, POST_A));
    const rope = layer(W, H, (cv) => {
      for (const hh of ropeH)
        for (let k = 0; k < 2; k++) {
          const a = corners[k], b = corners[k + 1];
          for (let s = 0; s <= 24; s++) {
            const tt = s / 24;
            const pt: V3 = [a[0] + (b[0] - a[0]) * tt + (k === 1 ? 0.6 : 0), hh, a[2] + (b[2] - a[2]) * tt - 0.6];
            const [x, y] = f.proj(pt).map(Math.round);
            cv.set(x, y, C(ROPE, k === 0 ? 4 : 3));
            cv.set(x, y + 1, C(ROPE, k === 0 ? 3 : 2));
          }
        }
    });
    c.draw(rope, 0, 0);
    // The knot sits on the front face near its right edge.
    const [kx, ky] = f.proj(rotP([1.6, 54.5, -4.2], POST_A)).map(Math.round);
    const sway = [0, 1, 2, 2, 1, 0][t % 6];
    const flutter = layer(W, H, (cv) => {
      const knot: [number, number, number][] = [[0, 0, 4], [1, 0, 3], [-1, 1, 3], [0, 1, 4], [1, 1, 2], [0, 2, 2]];
      for (const [dx, dy, s] of knot) cv.set(kx + dx, ky + dy, C(ROPE, s));
      // Two rope tails trailing in the wind.
      const tails = [
        [[1, 3], [1 + (sway > 1 ? 1 : 0), 4], [2 + (sway > 0 ? 1 : 0), 5]],
        [[-1, 3], [-1, 4], [-1 + (sway > 1 ? 1 : 0), 5], [-1 + sway, 6]],
      ];
      for (const tail of tails) tail.forEach(([dx, dy], k) => cv.set(kx + dx, ky + dy, C(ROPE, k === tail.length - 1 ? 2 : 3)));
    });
    // The paper charm hangs from a short cord and swings from its top.
    const paper = layer(W, H, (cv) => {
      const top = ky + 4, len = 15;
      const swing = [0, 1, 2, 3, 2, 1][t % 6];
      const turn = [5, 5, 4, 4, 5, 5][t % 6]; // width: the strip twists edge-on a little at full swing
      cv.set(kx + 1, ky + 3, C(ROPE, 2));
      for (let k = 0; k < len; k++) {
        const tt = k / (len - 1);
        const off = Math.round(swing * tt * tt + (k > 6 ? Math.sin((k + t * 2) * 0.9) * 0.6 : 0));
        const x0 = kx + off;
        for (let u = 0; u < turn; u++) {
          let s = u === 0 ? 4 : u === turn - 1 ? 2 : 3;
          if (k === 0) s = Math.min(5, s + 1);
          if (k === len - 1) s = Math.max(1, s - 1);
          cv.set(x0 + u, top + k, C(PAPER, s));
        }
        // Ink: a vertical line of brush marks and a red seal stamp.
        if (k >= 2 && k <= 11 && k !== 7) cv.set(x0 + Math.floor(turn / 2), top + k, k % 3 === 0 ? mix(C(INK, 3), C(PAPER, 2), 0.3) : C(INK, 2));
        if (k === 4 || k === 9) cv.set(x0 + Math.floor(turn / 2) - 1, top + k, C(INK, 3));
        if (k >= 12 && k <= 13) for (let u = 1; u < turn - 1; u++) cv.set(x0 + u, top + k, C(RED, k === 12 ? 3 : 2));
      }
    });
    c.draw(paper, 0, 0);
    c.draw(flutter, 0, 0);
    c.outline();
    return c;
  };
  const frames = [0, 1, 2, 3, 4, 5].map(frame);
  return finish('signpost', 'Signpost', [0.95, 1.9], ['interactable'], { idle: { frames, fps: 8 } }, ox);
}

/** A tube along a polyline (rings perpendicular to the path), smooth shaded; r may vary per point. */
function tube(path: V3[], r: number | number[], n = 8, o: { caps?: boolean; seed?: number; wob?: number } = {}): Tri[] {
  const rings: V3[][] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const t = unit(sub(b, a));
    const ref: V3 = Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit(cross(t, ref)), w = unit(cross(t, u));
    const rr = typeof r === 'number' ? r : r[i];
    const pts: V3[] = [];
    for (let j = 0; j < n; j++) {
      const ang = (j * TAU) / n;
      const wob = o.wob ? 1 + (rnd(o.seed ?? 5, j, i) - 0.5) * o.wob : 1;
      pts.push(add(path[i], add(mul(u, Math.cos(ang) * rr * wob), mul(w, Math.sin(ang) * rr * wob))));
    }
    rings.push(pts);
  }
  return loft(rings, { capStart: o.caps ?? true, capEnd: o.caps ?? true, smooth: true });
}
/** Points along a sagging span from a to b (sag px at the middle), with a little wander. */
function span(a: V3, b: V3, sag: number, n: number, seed: number): V3[] {
  const pts: V3[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const p = add(a, mul(sub(b, a), t));
    pts.push([p[0], p[1] - sag * 4 * t * (1 - t) + (k > 0 && k < n ? (rnd(seed, k) - 0.5) * 0.8 : 0), p[2]]);
  }
  return pts;
}

/** Bark streaks on a round post: dark vertical fissures that follow the trunk, in clusters. */
function barkShade(cx: number, cd: number, seed: number) {
  return (px: PixelInfo, s: number): number => {
    const ang = Math.atan2(px.p[2] - cd, px.p[0] - cx);
    const v = noise(ang * 5 + 10, px.p[1] / 7, 1, seed);
    if (px.n[1] > 0.8) return s;
    if (v > 0.68) return Math.max(1, s - 1);
    if (v < 0.12 && px.light > 0.5) return Math.min(4, s + 1);
    return s;
  };
}

const FENCE_SPAN = m(1); // posts every meter; the segment is 2 m, end posts sit on the tile seam
const RAIL_H = [19, 40];

/**
 * One rustic fence post, rendered alone and outlined so it can be stamped at both ends of a
 * segment (identical pixels on the seam when segments tile 2 m apart). Rope lashings wrap it at
 * both rail heights.
 */
function fencePost(lean = 0, broken = false): { c: Canvas; ox: number; oy: number } {
  const W = 40, H = 80, ox = 20, oy = 70;
  GROUP = 1;
  const sc = new Scene();
  const postT = tube(
    [[0, 0, 0], [0.3, 18, 0], [-0.2, 36, 0], [0.2, 53, 0]].map((p) => p as V3),
    [3.8, 3.6, 3.5, 3.3],
    10,
    { seed: 151, wob: 0.12, caps: true },
  );
  const post = sc.add(lean ? rotZ(postT, lean, 0, 0) : postT, { pal: BARK, seed: 151, contrast: 1.1, shade: barkShade(0, 0, 152), ao: 3 });
  const f = render(sc, W, H, ox, oy);
  // Cut top: lighter end grain with a ring and a darker heart.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== post.id) continue;
    const n = f.normal(i);
    if (n[1] < 0.85) continue;
    const p = f.world(i);
    const top: V3 = lean ? [Math.sin(lean) * 53, 53, 0] : [0.2, 53, 0];
    const d = Math.hypot(p[0] - top[0], (p[2] - top[2]) * 1.0);
    f.pal[i] = WOOD;
    f.step[i] = d < 1 ? 2 : d < 2.2 ? 4 : d < 2.9 ? 3 : 2;
  }
  const c = f.compose();
  // Rope lashings: three wraps around the post at each rail height, following the round post.
  const lash = layer(W, H, (cv) => {
    RAIL_H.forEach((rh, k) => {
      if (broken && k === 1) return;
      for (let w = 0; w < 2; w++) {
        const hh = rh + 2 - w * 3.2;
        for (let a = 0; a <= 16; a++) {
          const th = Math.PI + (a / 16) * Math.PI; // front half of the ring
          const r = 3.7;
          let p: V3 = [Math.cos(th) * r, hh + (a / 16 - 0.5) * 1.4, Math.sin(th) * r];
          if (lean) p = [p[0] * Math.cos(lean) + p[1] * Math.sin(lean), -p[0] * Math.sin(lean) + p[1] * Math.cos(lean), p[2]];
          const [x, y] = f.proj(p).map(Math.round);
          const lit = Math.cos(th) < 0.3;
          cv.set(x, y, C(ROPE, lit ? 4 : 2));
          cv.set(x, y + 1, C(ROPE, lit ? 2 : 1));
        }
      }
    });
  });
  c.draw(lash, 0, 0);
  c.outline();
  return { c, ox, oy };
}

function fence(): WorldSprite {
  const W = 170, H = 90, ox = 85, oy = 74;
  const build = (broken: boolean): Canvas => {
    GROUP = 1;
    const sc = new Scene();
    const lean = broken ? 0.18 : 0; // the middle post leans right when broken
    const tilt = (p: V3): V3 => (lean ? [p[0] * Math.cos(lean) + p[1] * Math.sin(lean), -p[0] * Math.sin(lean) + p[1] * Math.cos(lean), p[2]] : p);
    const railD = 4.6;
    const rail = (a: V3, b: V3, r0: number, seed: number, sag = 1.2, capped = true) =>
      sc.add(tube(span(a, b, sag, 6, seed), r0, 8, { seed, wob: 0.15, caps: capped }), { pal: WOOD_OLD, seed, contrast: 1.1, facetVar: 0.02, shade: (px, s) => (noise(px.p[0] / 5, px.p[1] * 1.5 + px.p[2], 1.2, seed) > 0.74 ? Math.max(1, s - 1) : s) });
    const L = -FENCE_SPAN, M = 0, Rr = FENCE_SPAN;
    const mid = (h: number): V3 => {
      const p = tilt([0, h, 0]);
      return [p[0], p[1], railD];
    };
    // Left span: both rails run from the left post to the middle post.
    rail([L - 1, RAIL_H[0], railD], mid(RAIL_H[0]), 2.5, 161);
    rail([L - 1, RAIL_H[1], railD], mid(RAIL_H[1]), 2.3, 162);
    // Right span.
    rail(mid(RAIL_H[0]), [Rr + 1, RAIL_H[0], railD], 2.5, 163);
    if (!broken) rail(mid(RAIL_H[1]), [Rr + 1, RAIL_H[1], railD], 2.3, 164);
    else {
      // The upper rail snapped: one piece hangs from the middle post, the other from the right post.
      const m1 = mid(RAIL_H[1]);
      rail(m1, [27, 28, railD - 2], 2.3, 165, 0.3, true);
      rail([Rr + 1, RAIL_H[1], railD], [33, 21, railD - 3], 2.3, 166, 0.3, true);
    }
    // The middle post is part of this scene (it can lean); end posts are stamped after.
    const midPost = sc.add(
      rotZ(tube([[0, 0, 0], [-0.3, 18, 0], [0.2, 36, 0], [-0.1, 51, 0]].map((p) => p as V3), [3.7, 3.5, 3.4, 3.2], 10, { seed: 171, wob: 0.12 }), lean, 0, 0),
      { pal: BARK, seed: 171, contrast: 1.1, shade: barkShade(0, 0, 172), ao: 3 },
    );
    const f = render(sc, W, H, ox, oy);
    for (let i = 0; i < W * H; i++) {
      if (f.mesh[i] !== midPost.id || f.normal(i)[1] < 0.85) continue;
      const p = f.world(i);
      const top = tilt([-0.1, 51, 0]);
      const d = Math.hypot(p[0] - top[0], p[2] - top[2]);
      f.pal[i] = WOOD;
      f.step[i] = d < 1 ? 2 : d < 2.2 ? 4 : d < 2.9 ? 3 : 2;
    }
    const c = f.compose();
    if (broken) {
      // Splintered ends: pale fresh wood spikes at the break.
      const spl = layer(W, H, (cv) => {
        for (const [bx, bh, bd, dir] of [
          [27, 28, railD - 2, 1],
          [33, 21, railD - 3, -1],
        ] as [number, number, number, number][]) {
          const [x, y] = f.proj([bx, bh, bd]).map(Math.round);
          const spikes: [number, number, number][] = [[0, -1, 5], [1, -2, 4], [0, 0, 4], [1, 1, 3], [2, 0, 4], [0, 1, 3]];
          for (const [dx, dy, s] of spikes) cv.set(x + dx * dir, y + dy, C(WOOD, s));
        }
      });
      c.draw(spl, 0, 0);
    }
    // Lashings on the middle post.
    const lash = layer(W, H, (cv) => {
      RAIL_H.forEach((rh, k) => {
        for (let w = 0; w < 2; w++) {
          if (broken && k === 1 && w === 1) continue;
          const hh = rh + 2 - w * 3.2;
          for (let a = 0; a <= 16; a++) {
            const th = Math.PI + (a / 16) * Math.PI;
            const p = tilt([Math.cos(th) * 3.6, hh + (a / 16 - 0.5) * 1.4, Math.sin(th) * 3.6]);
            const [x, y] = f.proj(p).map(Math.round);
            const lit = Math.cos(th) < 0.3;
            cv.set(x, y, C(ROPE, lit ? 4 : 2));
            cv.set(x, y + 1, C(ROPE, lit ? 2 : 1));
          }
        }
      });
      if (broken) {
        // A loose rope end dangling from the leaning post.
        const [x, y] = f.proj(tilt([3.5, RAIL_H[1] - 2, -3])).map(Math.round);
        for (let k = 0; k < 7; k++) cv.set(x + (k > 3 ? 1 : 0) + (k > 5 ? 1 : 0), y + k, C(ROPE, k % 2 ? 2 : 3));
      }
    });
    c.draw(lash, 0, 0);
    c.outline();
    // End posts: one pre-rendered post stamped on both tile seams.
    const ep = fencePost(0, false);
    for (const px of [L, Rr]) c.draw(ep.c, ox + px - ep.ox, oy - ep.oy);
    return c;
  };
  const idle = build(false);
  const broken = build(true);
  return finish('fence', 'Wooden Fence', [2, 1], ['cover-half', 'destructible'], { idle: { frames: [idle], fps: 0 }, broken: { frames: [broken], fps: 0 } }, ox);
}

/** Dried bamboo: the rope straw tone with a touch of young-leaf green. */
const BAMBOO = pal(R.rope.map((c, i) => mix(c, R.leafLight[i], 0.18)));
/** Older, darker culms for the posts. */
const BAMBOO_DK = pal(R.rope.map((c, i) => mix(c, R.woodDark[i], 0.35)));
const BF_H = 60; // panel height (px); the posts stand a little taller

/** One thick bamboo post with nodes and a hollow cut top, rendered alone (stamped on both seams). */
function bambooPost(): { c: Canvas; ox: number; oy: number } {
  const W = 30, H = 90, ox = 15, oy = 80;
  GROUP = 1;
  const sc = new Scene();
  const nodes = [12, 28, 44, 58];
  const post = sc.add(pole([0, 0, -3], [0, BF_H + 3, -3], 3.6, 12, { caps: true }), {
    pal: BAMBOO_DK,
    seed: 181,
    contrast: 1.1,
    ao: 3,
    shade: (px, s) => {
      const d = nodes.map((nh) => px.p[1] - nh).find((v) => v > -1.6 && v < 1.6);
      if (d === undefined) return s;
      return d < -0.5 ? Math.min(4, s + 1) : d < 0.5 ? Math.max(1, s - 2) : s;
    },
  });
  const f = render(sc, W, H, ox, oy);
  // Hollow cut top: a light rim around a dark hole.
  for (let i = 0; i < W * H; i++) {
    if (f.mesh[i] !== post.id || f.normal(i)[1] < 0.85) continue;
    const p = f.world(i);
    const d = Math.hypot(p[0], p[2] + 3);
    f.pal[i] = BAMBOO;
    if (d < 2.3) f.over[i] = d < 1.4 ? C(BAMBOO_DK, 0) : C(BAMBOO_DK, 1);
    else f.step[i] = p[0] < 0.5 ? 4 : 3;
  }
  const c = f.compose();
  // Black rope tie holding the panel's top cap and middle batten.
  const ties = layer(W, H, (cv) => {
    for (const hh of [BF_H - 2, 31]) {
      const [x, y] = f.proj([0, hh, -3]).map(Math.round);
      for (let dx = -3; dx <= 3; dx++) {
        const yy = y + Math.round(Math.sqrt(Math.max(0, 1 - (dx / 3.8) ** 2)) * 2.2);
        cv.set(x + dx, yy, C(INK, dx < 0 ? 4 : 3));
        cv.set(x + dx, yy + 1, C(INK, 2));
      }
    }
  });
  c.draw(ties, 0, 0);
  c.outline();
  return { c, ox, oy };
}

function fenceBamboo(): WorldSprite {
  const W = 170, H = 100, ox = 85, oy = 84;
  GROUP = 1;
  const sc = new Scene();
  // Top cap (tamabuchi): a bundle of thin bamboo laid along the top, slightly in front of the panel.
  const cap = sc.add(tube([[-FENCE_SPAN, BF_H - 2.5, -1.2], [FENCE_SPAN, BF_H - 2.5, -1.2]], 3, 10, { caps: true }), { pal: BAMBOO, seed: 191, contrast: 1.1 });
  const f = render(sc, W, H, ox, oy);
  // Panel: vertical split-bamboo slats (4 px + 1 px seam), staggered nodes, three battens.
  const x0 = ox - FENCE_SPAN + 3, x1 = ox + FENCE_SPAN - 3;
  const yTop = oy - (BF_H - 4), yBot = oy;
  const battens = [10, 30, 48]; // heights of the batten tops
  const battenRows = new Map<number, number>(); // screen y -> row in batten (0 top .. 3 bottom)
  for (const bh of battens) for (let k = 0; k < 4; k++) battenRows.set(oy - bh + k, k);
  const panel = new Canvas(W, H);
  for (let x = x0; x <= x1; x++) {
    const u = (x - x0) % 5, slat = Math.floor((x - x0) / 5);
    const nodeOff = slat % 2 ? 7 : 16;
    const tone = hash(slat, 3, 197) < 0.25 ? -1 : 0;
    for (let y = yTop; y <= yBot; y++) {
      const hh = oy - y;
      let s: number;
      if (u === 4) s = 1; // seam
      else s = [3, 3, 3, 2][u] + (u === 1 || u === 2 ? tone : 0);
      // A lit edge in clusters on the left of each slat.
      if (u === 0 && noise(slat, hh / 3, 1, 198) > 0.55) s = 4;
      // Staggered nodes: a dark groove with a light ridge above.
      const nd = (hh - nodeOff + 40) % 20;
      if (u < 4 && nd === 0) s = Math.max(1, s - 1);
      if (u < 2 && nd === 1) s = Math.min(4, s + 1);
      // The cap's shadow along the top and the ground contact.
      if (y < yTop + 2 && u < 4) s = Math.max(1, s - 1);
      if (hh < 2 && u < 4) s = Math.max(1, s - 1);
      panel.set(x, y, C(BAMBOO, s));
    }
  }
  // Battens: split bamboo laid across the slats, each casting a short shadow below-right.
  for (const bh of battens) {
    const yb = oy - bh;
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const nodeAt = (x - x0 + 6) % 23 === 0;
      for (let k = 0; k < 4; k++) {
        let s = [4, 3, 3, 2][k];
        if (k === 0 && noise(x / 3, bh, 1, 199) < 0.35) s = 3;
        if (nodeAt) s = k === 0 ? 3 : 1;
        panel.set(x, yb + k, C(BAMBOO, s));
      }
      for (let k = 4; k < 6; k++) {
        const c = panel.get(x + 1, yb + k);
        if (c[3]) panel.set(x + 1, yb + k, k === 4 ? C(BAMBOO, 1) : mix(c, C(BAMBOO, 1), 0.5));
      }
    }
  }
  // The left post's shadow falls on the slats to its right.
  for (let y = yTop; y <= yBot; y++)
    for (let x = x0; x < x0 + 3; x++) {
      const c = panel.get(x, y);
      if (c[3] && !battenRows.has(y)) panel.set(x, y, mix(c, C(BAMBOO, 1), 0.55));
    }
  panel.outline();
  const c = f.compose();
  const comp = new Canvas(W, H);
  comp.draw(panel, 0, 0);
  // Black rope knots on the battens (every two slats) and around the cap.
  const knots = new Canvas(W, H);
  for (const bh of battens) {
    const yb = oy - bh;
    for (let x = x0 + 7; x < x1 - 3; x += 10) {
      // A vertical wrap over the batten, a nub and two short tails.
      const kn: [number, number, number][] = [[0, -1, 1], [1, -1, 1], [0, 0, 4], [1, 0, 2], [0, 1, 3], [1, 1, 1], [0, 2, 3], [1, 2, 1], [0, 3, 2], [1, 3, 1], [0, 4, 1], [1, 4, 0], [-1, 5, 1], [2, 5, 1]];
      for (const [dx, dy, st] of kn) knots.set(x + dx, yb + dy, C(INK, st));
    }
  }
  comp.draw(knots, 0, 0);
  comp.draw(c, 0, 0);
  const capTies = layer(W, H, (cv) => {
    for (let x = x0 + 7; x < x1 - 3; x += 20) {
      const [, y] = f.proj([0, BF_H - 2.5, -1.2]).map(Math.round);
      for (let dy = -3; dy <= 3; dy++) {
        cv.set(x, y + dy, C(INK, dy < 0 ? 4 : 2));
        cv.set(x + 1, y + dy, C(INK, dy < 0 ? 3 : 1));
      }
    }
  });
  comp.draw(capTies, 0, 0);
  comp.outline();
  void cap;
  const bp = bambooPost();
  for (const px of [-FENCE_SPAN, FENCE_SPAN]) comp.draw(bp.c, ox + px - bp.ox, oy - bp.oy);
  return finish('fence_bamboo', 'Bamboo Fence', [2, 1.2], ['cover-half', 'blocks-sight', 'destructible'], { idle: { frames: [comp], fps: 0 } }, ox);
}

// ================================================================================================
// main
// ================================================================================================

const SCRATCH = previewDir();
function debugDump(s: WorldSprite): void {
  const bg = hex('#5d6b57');
  for (const [k, a] of Object.entries(s.anims)) {
    const fw = a.frames[0].w, fh = a.frames[0].h;
    const strip = new Canvas((fw + 2) * a.frames.length, fh);
    strip.fillRect(0, 0, strip.w, strip.h, bg);
    a.frames.forEach((fr, i) => strip.draw(fr, i * (fw + 2), 0));
    strip.scaled(4).save(join(SCRATCH, `landmarks-${s.name}-${k}.png`));
  }
  const first = Object.values(s.anims)[0].frames[0];
  const z = new Canvas(first.w, first.h);
  z.fillRect(0, 0, z.w, z.h, bg);
  z.draw(first, 0, 0);
  z.scaled(first.h > 80 ? 6 : 8).save(join(SCRATCH, `landmarks-${s.name}-zoom.png`));
}

const sprites: WorldSprite[] = [stoneLantern(), signpost(), fence(), fenceBamboo(), boulder(), rock(), pebbles(), riverStones(), hokora()];
writeGroup('landmarks', sprites);
preview(sprites, join(SCRATCH, 'landmarks.png'), { scale: 3 });
for (const s of sprites) {
  debugDump(s);
  const first = Object.values(s.anims)[0].frames[0];
  const bb = first.bounds();
  console.log(`${s.name.padEnd(14)} frame ${first.w}x${first.h} anchor ${s.anchor} opaque h ${bb ? bb[3] - bb[1] + 1 : 0} w ${bb ? bb[2] - bb[0] + 1 : 0} target ${m(s.meters[0])}x${m(s.meters[1])}`);
}
