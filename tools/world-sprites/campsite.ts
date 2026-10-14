// Campsite props for the night camp scene (and the battle maps): big and small canvas A-frame tents,
// a torii gate, packs and bedrolls, swords stuck in the ground, a stump with an axe, a log seat, a
// cooking tripod, firewood, ferns, a big campfire and a tall smoke column. Made to the owner's
// new quality bar (scratchpad art3/STYLE.md): rich materials, real texture (canvas weave and seams,
// bark furrows, wood grain, rope twist, stone chips), 1 px material-tinted outlines.
//
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/campsite.ts [previewDir]   (art waiting for approval)
//   CAMPSITE_ONLY=tent_large,torii npx tsx tools/world-sprites/campsite.ts [dir]   (review crops only)
//
// The renderer is the camp/landmarks pipeline (copied from camp.ts, not imported, as every group
// does): low-poly meshes rasterised with the battle camera's projection (1 m = 57 px across and up,
// 38 px per meter of depth) into a G-buffer, Lambert light from the upper left with cast shadows,
// the kit's clustered band(), crests on lit facet edges, dark inner lines where parts overlap and
// the kit's outline. Hand details go into the same step buffer; thin things (blades, cords, paper
// shide, fern leaflets) are painted pixel by pixel on outlined layers. Daylight from the upper left
// like every world sprite; the camp scene grades them to moon and firelight.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { Anim, CHARACTER_FEET, Canvas, Color, MATERIALS, WorldSprite, band, characterRef, fbm, hash, hex, lambert, m, mix, noise, previewDir, ramp, withAlpha, writeGroup } from './kit';

// --- camera ---------------------------------------------------------------------------------

/** Screen pixels per world pixel of depth (38 px per meter of depth vs 57 across). */
const K = 38 / 57;

type V3 = [number, number, number]; // [X right, H up, D away from the viewer], in pixels
type UV = [number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** Direction toward the light in world space (upper left, a little in front). */
const LW: V3 = unit([-0.55, 0.7, -0.45]);
/** Light (0..1) for a world normal, same Lambert as the kit (screen y down, z toward the viewer). */
const lightOf = (n: V3): number => lambert(n[0], -n[1], -n[2]);

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (a: number, b: number, t: number): number => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const rnd = (seed: number, i: number, j = 0): number => hash(i * 7 + 3, j * 13 + 5, seed);
const TAU = Math.PI * 2;
const frac = (v: number): number => v - Math.floor(v);

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
  wood: ramp(MATERIALS.wood),
  woodDark: ramp(MATERIALS.woodDark),
  bark: ramp(MATERIALS.bark),
  charred: ramp(MATERIALS.charred),
  canvas: ramp(MATERIALS.canvas),
  rope: ramp(MATERIALS.rope),
  red: ramp(MATERIALS.red),
  paper: ramp(MATERIALS.paper),
  fire: ramp(MATERIALS.fire),
  moss: ramp(MATERIALS.moss),
};
/** Gray stone with cool shadows (toward iron) and warm lights (toward stoneWarm), as the landmarks. */
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
const WOOD = pal(R.wood);
const WOOD_DK = pal(R.woodDark);
const BARK = pal(R.bark);
/** Charcoal: the charred base lifted a little so the blocks stay readable above the outline. */
const CHAR_R: Color[] = ramp('#3b3436', { spread: 0.8, shift: 10 });
const CHAR = pal(CHAR_R);
/** Bark blackened by the fire (between bark and charcoal). */
const SINGED = pal(R.bark.map((c, i) => mix(c, CHAR_R[i], 0.55)));
const ASH_R = ramp('#8e8a88', { shift: 8 });
const ASH = pal(ASH_R);
const CANVAS = pal(R.canvas);
/** Burlap: the canvas ramp pulled toward rope so the sacks and patches read coarser than the tent. */
const BURLAP = pal(R.canvas.map((c, i) => mix(c, R.rope[i], 0.45)));
/** Sack burlap: coarser and browner than the patches on the tent. */
const SACKCLOTH = pal(R.canvas.map((c, i) => mix(mix(c, R.rope[i], 0.7), R.wood[i], 0.18)));
/** Canvas browned by heat and smoke. */
const SCORCH = pal(R.canvas.map((c, i) => mix(c, R.woodDark[i], 0.6)));
const ROPE = pal(R.rope);
const IRON = pal(R.iron);
/** Polished steel for blades: the iron ramp with paler lights. */
const STEEL = pal([R.iron[0], R.iron[1], R.iron[2], mix(R.iron[3], R.paper[3], 0.25), mix(R.iron[4], R.paper[4], 0.45), mix(R.iron[5], R.paper[5], 0.7)]);
const RED = pal(R.red);
const PAPER = pal(R.paper);

/** Flames: dark ember red, red tips, orange body, amber (kit fire), pale yellow core. */
const FIRE_R: Color[] = [hex('#3a120c'), hex('#a3261a'), hex('#ef4444'), mix(hex('#ef4444'), hex(MATERIALS.fire), 0.5), hex(MATERIALS.fire), hex('#fde68a')];
const WHITE_HOT = hex('#fffbea');
/** Smoke: a cool grey; shadows drift blue like every ramp. */
const SMOKE_R = ramp('#9c9aa2', { shift: 10 });
const SMOKE_DARK_R = ramp('#5a5559', { shift: 8 });

// New campsite materials (same 6-step ramps; shadows drift cool, lights warm).
/** Tent canvas: a little warmer and with deeper folds than the base canvas. */
const CANVAS_T = pal([mix(R.canvas[0], hex('#2a2030'), 0.3), mix(R.canvas[1], hex('#5a4a5a'), 0.18), R.canvas[2], R.canvas[3], R.canvas[4], R.canvas[5]]);
/** Vermilion lacquer (torii): saturated, its shadow a deep crimson. */
const LACQ_R: Color[] = ramp('#c8432c', { shift: 12 });
const LACQ = pal([LACQ_R[0], mix(LACQ_R[1], hex('#5a1520'), 0.25), LACQ_R[2], LACQ_R[3], LACQ_R[4], mix(LACQ_R[5], hex('#f2b38a'), 0.35)]);
/** Black lacquer: near-black with a cool sheen. */
const BLACK = pal([hex('#09080c'), hex('#141319'), hex('#1e1d24'), hex('#2b2a32'), hex('#41414b'), hex('#666a78')]);
const LEATHER = pal(ramp('#7c4c2e', { shift: 12 }));
const LEATHER_DK = pal(ramp('#4f3222', { shift: 10 }));
const INDIGO = pal(ramp('#3e4c78', { shift: 10 }));
const CREAM = pal(ramp('#d6c8a6', { shift: 12 }));
const STRAW = pal(ramp('#c3a35c', { shift: 14 }));
const GOLD = pal(ramp('#c99a3c', { shift: 16 }));
const POT = pal(ramp('#3f424b', { shift: 8, spread: 0.85 }));
const MOSS = pal(R.moss);
const LEAF = pal(ramp(MATERIALS.leaf));
const LEAF_D = pal(ramp(MATERIALS.leafDeep));
/** Pale fresh-cut wood for split faces and stump tops. */
const HEART = pal(ramp('#c99e6a', { shift: 12 }));
const BARK_C = pal(ramp(MATERIALS.barkCedar));

// --- meshes ---------------------------------------------------------------------------------

interface Tri {
  v: [V3, V3, V3];
  /** Vertex normals (smooth meshes) or the face normal three times. */
  vn: [V3, V3, V3];
  n: V3;
  group: number;
  /** The part's own surface coordinates (cloth panels, staves, boards), interpolated per pixel. */
  uv?: [UV, UV, UV];
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
  /** Renders back faces too (cloth): they take the flipped normal. */
  twoSided?: boolean;
  /** Drops pixels (holes burnt through cloth, frayed ends): gets the pixel's uv and world position. */
  cut?: (u: number, v: number, p: V3) => boolean;
  /**
   * Cloth folds: the light sees the normal's deviation from the panel's `base` normal amplified by
   * `gain`, so shallow creases on a panel that faces the light still read as lit and shaded ridges.
   */
  bump?: { base: V3; gain: number };
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
  u: number;
  v: number;
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
 * uv: u runs around the ring (0..1), v along the rings (0 first .. 1 last). `inward` points the
 * side normals at the axis (the inside wall of a barrel).
 */
function loft(rings: V3[][], opts: { capStart?: boolean | V3; capEnd?: boolean | V3; smooth?: boolean; inward?: boolean } = {}): Tri[] {
  const tris: Tri[] = [];
  const n = rings[0].length;
  const center = (r: V3[]): V3 => mul(r.reduce((a, b) => add(a, b), [0, 0, 0] as V3), 1 / r.length);
  const centers = rings.map(center);
  const meshC = mul(centers.reduce((a, b) => add(a, b), [0, 0, 0] as V3), 1 / centers.length);
  const faceN = (a: V3, b: V3, c: V3, out: V3, inward = false): V3 => {
    let nn = unit(cross(sub(b, a), sub(c, a)));
    const fc = mul(add(add(a, b), c), 1 / 3);
    if ((dot(nn, sub(fc, out)) < 0) !== inward) nn = mul(nn, -1);
    return nn;
  };
  const sideGroup = GROUP++;
  const acc: V3[][] = rings.map((r) => r.map(() => [0, 0, 0] as V3));
  const quads: { a: [number, number]; b: [number, number]; c: [number, number]; d: [number, number]; n1: V3; n2: V3; g: number }[] = [];
  for (let i = 0; i + 1 < rings.length; i++) {
    const axis = mul(add(centers[i], centers[i + 1]), 0.5);
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      const A = rings[i][j], B = rings[i][j2], C = rings[i + 1][j2], D = rings[i + 1][j];
      const n1 = faceN(A, B, C, axis, opts.inward), n2 = faceN(A, C, D, axis, opts.inward);
      const g = opts.smooth ? sideGroup : GROUP++;
      quads.push({ a: [i, j], b: [i, j2], c: [i + 1, j2], d: [i + 1, j], n1, n2, g });
      const qn = unit(add(n1, n2));
      for (const [ri, rj] of [[i, j], [i, j2], [i + 1, j2], [i + 1, j]]) acc[ri][rj] = add(acc[ri][rj], qn);
    }
  }
  const P = (ij: [number, number]): V3 => rings[ij[0]][ij[1]];
  const VN = (ij: [number, number], fn: V3): V3 => (opts.smooth ? unit(acc[ij[0]][ij[1]]) : fn);
  const nr = Math.max(1, rings.length - 1);
  const UVo = (ij: [number, number], wrap: boolean): UV => [(wrap && ij[1] === 0 ? n : ij[1]) / n, ij[0] / nr];
  for (const q of quads) {
    const wrap = q.b[1] === 0;
    const ua = UVo(q.a, false), ub = UVo(q.b, wrap), uc = UVo(q.c, wrap), ud = UVo(q.d, false);
    if (len(cross(sub(P(q.b), P(q.a)), sub(P(q.c), P(q.a)))) > 1e-6) tris.push({ v: [P(q.a), P(q.b), P(q.c)], vn: [VN(q.a, q.n1), VN(q.b, q.n1), VN(q.c, q.n1)], n: q.n1, group: q.g, uv: [ua, ub, uc] });
    if (len(cross(sub(P(q.c), P(q.a)), sub(P(q.d), P(q.a)))) > 1e-6) tris.push({ v: [P(q.a), P(q.c), P(q.d)], vn: [VN(q.a, q.n2), VN(q.c, q.n2), VN(q.d, q.n2)], n: q.n2, group: q.g, uv: [ua, uc, ud] });
  }
  const cap = (r: V3[], c: boolean | V3 | undefined, ci: number) => {
    if (!c) return;
    const apex = c === true ? centers[ci] : c;
    const flatG = GROUP++;
    for (let j = 0; j < n; j++) {
      const a = r[j], b = r[(j + 1) % n];
      if (len(cross(sub(b, a), sub(apex, a))) < 1e-6) continue;
      const nn = faceN(a, b, apex, meshC);
      const v = ci / nr;
      tris.push({ v: [a, b, apex], vn: [nn, nn, nn], n: nn, group: c === true ? flatG : GROUP++, uv: [[j / n, v], [(j + 1) / n, v], [(j + 0.5) / n, v]] });
    }
  };
  cap(rings[0], opts.capStart, 0);
  cap(rings[rings.length - 1], opts.capEnd, rings.length - 1);
  return tris;
}

/**
 * An open grid of points (rows of equal length): cloth panels. uv: u along a row (0..1), v down the
 * rows (0..1). Normals follow cross(along the row, down the rows), or the opposite with `flip`.
 */
function sheet(grid: V3[][], o: { smooth?: boolean; flip?: boolean } = {}): Tri[] {
  const nr = grid.length, nc = grid[0].length;
  const g = GROUP++;
  const acc: V3[][] = grid.map((r) => r.map(() => [0, 0, 0] as V3));
  const fnorm = (a: V3, b: V3, c: V3): V3 => {
    const nn = unit(cross(sub(b, a), sub(c, a)));
    return o.flip ? mul(nn, -1) : nn;
  };
  const quads: { i: number; j: number; n1: V3; n2: V3; g: number }[] = [];
  for (let i = 0; i + 1 < nr; i++)
    for (let j = 0; j + 1 < nc; j++) {
      const A = grid[i][j], B = grid[i][j + 1], C = grid[i + 1][j + 1], D = grid[i + 1][j];
      const n1 = fnorm(A, B, C), n2 = fnorm(A, C, D);
      quads.push({ i, j, n1, n2, g: o.smooth === false ? GROUP++ : g });
      const qn = unit(add(n1, n2));
      for (const [ri, rj] of [[i, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]]) acc[ri][rj] = add(acc[ri][rj], qn);
    }
  const tris: Tri[] = [];
  const uvOf = (i: number, j: number): UV => [j / (nc - 1), i / (nr - 1)];
  for (const q of quads) {
    const { i, j } = q;
    const A = grid[i][j], B = grid[i][j + 1], C = grid[i + 1][j + 1], D = grid[i + 1][j];
    const VN = (ri: number, rj: number, fn: V3): V3 => (o.smooth === false ? fn : len(acc[ri][rj]) > 1e-9 ? unit(acc[ri][rj]) : fn);
    if (len(cross(sub(B, A), sub(C, A))) > 1e-6) tris.push({ v: [A, B, C], vn: [VN(i, j, q.n1), VN(i, j + 1, q.n1), VN(i + 1, j + 1, q.n1)], n: q.n1, group: q.g, uv: [uvOf(i, j), uvOf(i, j + 1), uvOf(i + 1, j + 1)] });
    if (len(cross(sub(C, A), sub(D, A))) > 1e-6) tris.push({ v: [A, C, D], vn: [VN(i, j, q.n2), VN(i + 1, j + 1, q.n2), VN(i + 1, j, q.n2)], n: q.n2, group: q.g, uv: [uvOf(i, j), uvOf(i + 1, j + 1), uvOf(i + 1, j)] });
  }
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
/** A tube along a polyline (rings perpendicular to the path), smooth shaded; r may vary per point. */
function tube(path: V3[], r: number | number[], n = 8, o: { caps?: boolean; seed?: number; wob?: number; closed?: boolean } = {}): Tri[] {
  const rings: V3[][] = [];
  const N = path.length;
  for (let i = 0; i < N; i++) {
    const a = o.closed ? path[(i - 1 + N) % N] : path[Math.max(0, i - 1)], b = o.closed ? path[(i + 1) % N] : path[Math.min(N - 1, i + 1)];
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
  if (o.closed) rings.push(rings[0]);
  return loft(rings, { capStart: !o.closed && (o.caps ?? true), capEnd: !o.closed && (o.caps ?? true), smooth: true });
}
/** A flat disc facing up (fan), radius rx across and rd in depth. */
function disc(cx: number, h: number, cd: number, rx: number, rd: number, n = 20): Tri[] {
  const g = GROUP++;
  const c: V3 = [cx, h, cd];
  const pts = ring(cx, h, cd, rx, rd, n);
  const up: V3 = [0, 1, 0];
  const tris: Tri[] = [];
  for (let j = 0; j < n; j++) {
    const a = pts[j], b = pts[(j + 1) % n];
    tris.push({ v: [a, b, c], vn: [up, up, up], n: up, group: g, uv: [[0.5 + (a[0] - cx) / (2 * rx), 0.5 + (a[2] - cd) / (2 * rd)], [0.5 + (b[0] - cx) / (2 * rx), 0.5 + (b[2] - cd) / (2 * rd)], [0.5, 0.5]] });
  }
  return tris;
}
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

const transform = (tris: Tri[], f: (p: V3) => V3, fn: (n: V3) => V3): Tri[] =>
  tris.map((t) => ({ v: t.v.map(f) as [V3, V3, V3], vn: t.vn.map(fn) as [V3, V3, V3], n: fn(t.n), group: t.group, uv: t.uv }));
/** Rotates a point about the vertical axis through (cx, cd) by `a` radians (positive turns +X toward +D). */
const rotYp = (p: V3, a: number, cx = 0, cd = 0): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [cx + (p[0] - cx) * c - (p[2] - cd) * s, p[1], cd + (p[0] - cx) * s + (p[2] - cd) * c];
};
function rotY(tris: Tri[], a: number, cx = 0, cd = 0): Tri[] {
  return transform(tris, (p) => rotYp(p, a, cx, cd), (p) => rotYp(p, a));
}
/** Rotates in the screen plane (about the D axis) around (cx, ch); positive tilts the top to the right. */
const rotZp = (p: V3, a: number, cx = 0, ch = 0): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [cx + (p[0] - cx) * c + (p[1] - ch) * s, ch - (p[0] - cx) * s + (p[1] - ch) * c, p[2]];
};
function rotZ(tris: Tri[], a: number, cx: number, ch: number): Tri[] {
  return transform(tris, (p) => rotZp(p, a, cx, ch), (p) => rotZp(p, a));
}
/** Rotates a point about an axis (unit `ax`) through `c` by `a` radians (Rodrigues). */
function rotAxisP(p: V3, ax: V3, a: number, c: V3 = [0, 0, 0]): V3 {
  const v = sub(p, c);
  const cs = Math.cos(a), sn = Math.sin(a);
  const r = add(add(mul(v, cs), mul(cross(ax, v), sn)), mul(ax, dot(ax, v) * (1 - cs)));
  return add(r, c);
}
function rotAxis(tris: Tri[], ax: V3, a: number, c: V3 = [0, 0, 0]): Tri[] {
  const u = unit(ax);
  return transform(tris, (p) => rotAxisP(p, u, a, c), (n) => rotAxisP(n, u, a));
}
function move(tris: Tri[], d: V3): Tri[] {
  return transform(tris, (p) => add(p, d), (n) => n);
}
/** Lowest height of a set of triangles. */
const minH = (tris: Tri[]): number => Math.min(...tris.flatMap((t) => t.v.map((p) => p[1])));

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

// --- rendering ------------------------------------------------------------------------------

/** Step buffer + G-buffer for one frame. */
class Frame {
  readonly mesh: Int16Array;
  readonly group: Int32Array;
  readonly depth: Float32Array;
  readonly nrm: Float32Array;
  readonly pos: Float32Array;
  readonly uv: Float32Array;
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
    this.uv = new Float32Array(N * 2);
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
  /** Rounded screen pixel of a world point. */
  px(p: V3): [number, number] {
    const [x, y] = this.proj(p);
    return [Math.floor(x), Math.floor(y)];
  }
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
  /** Pixels of one mesh (or several). */
  each(meshes: number | number[], fn: (i: number, x: number, y: number) => void): void {
    const set = typeof meshes === 'number' ? [meshes] : meshes;
    for (let i = 0; i < this.w * this.h; i++) if (set.includes(this.mesh[i]) && this.pal[i] >= 0) fn(i, i % this.w, Math.floor(i / this.w));
  }
  compose(only?: (i: number) => boolean): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (only && !only(i)) continue;
        const o = this.over[i];
        if (o) {
          c.set(x, y, o);
          continue;
        }
        if (this.pal[i] < 0) continue;
        let col = PAL[this.pal[i]][this.step[i]];
        const wv = this.warm[i];
        if (wv > 0.02) {
          // Additive (the stone is lit, not painted orange), three levels broken into strokes.
          const q = wv + (noise(x, y, 2, 91) - 0.5) * 0.2;
          if (q > 0.66) col = glow(mix(col, FIRE_R[3], 0.18), FIRE_R[4], 0.34);
          else if (q > 0.4) col = glow(mix(col, FIRE_R[3], 0.12), FIRE_R[3], 0.24);
          else if (q > 0.16) col = glow(col, FIRE_R[3], 0.14);
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
    for (const t0 of mesh.tris) {
      let t = t0;
      if (K * t.n[1] - t.n[2] <= 1e-4) {
        // Faces away from the camera: cloth shows its other side, solids skip it.
        if (!mesh.twoSided || K * t.n[1] - t.n[2] > -1e-4) continue;
        t = { ...t0, n: mul(t0.n, -1), vn: t0.vn.map((v) => mul(v, -1)) as [V3, V3, V3] };
      }
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
          let u = 0, v = 0;
          if (t.uv) {
            u = t.uv[0][0] * w0 + t.uv[1][0] * w1 + t.uv[2][0] * w2;
            v = t.uv[0][1] * w0 + t.uv[1][1] * w1 + t.uv[2][1] * w2;
          }
          if (mesh.cut && mesh.cut(u, v, wp)) continue;
          f.depth[i] = wp[2];
          f.mesh[i] = mesh.id;
          f.group[i] = t.group;
          const nn = unit(add(add(mul(t.vn[0], w0), mul(t.vn[1], w1)), mul(t.vn[2], w2)));
          f.nrm.set(nn, i * 3);
          f.pos.set(wp, i * 3);
          f.uv[i * 2] = u;
          f.uv[i * 2 + 1] = v;
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
      if (mesh.bump) n = unit(add(mesh.bump.base, mul(sub(n, mesh.bump.base), mesh.bump.gain)));
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
      if (mesh.shade) s = mesh.shade({ x, y, n: n0, p, u: f.uv[i * 2], v: f.uv[i * 2 + 1], light, lit, mesh }, s);
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

/**
 * Merges tiny clusters: a region of one step smaller than `minSize` pixels (4-connected, inside one
 * mesh) takes the step most of its neighbours have, so shading stays in 2-4 px strokes, never specks.
 */
function declump(f: Frame, meshes: number[], minSize = 3): void {
  const seen = new Uint8Array(f.w * f.h);
  for (let i0 = 0; i0 < f.w * f.h; i0++) {
    if (seen[i0] || !meshes.includes(f.mesh[i0]) || f.pal[i0] < 0 || f.over[i0]) continue;
    const region: number[] = [i0];
    seen[i0] = 1;
    const st = f.step[i0], pa = f.pal[i0], me = f.mesh[i0];
    for (let k = 0; k < region.length && region.length < minSize + 1; k++) {
      const i = region[k], x = i % f.w, y = Math.floor(i / f.w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = f.idx(x + dx, y + dy);
        if (j < 0 || seen[j] || f.mesh[j] !== me || f.pal[j] !== pa || f.step[j] !== st || f.over[j]) continue;
        seen[j] = 1;
        region.push(j);
      }
    }
    if (region.length >= minSize) continue;
    const votes = new Map<number, number>();
    for (const i of region) {
      const x = i % f.w, y = Math.floor(i / f.w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = f.idx(x + dx, y + dy);
        if (j < 0 || f.mesh[j] !== me || f.pal[j] !== pa || f.step[j] === st || f.over[j]) continue;
        votes.set(f.step[j], (votes.get(f.step[j]) ?? 0) + 1);
      }
    }
    let best = st, bv = 0;
    for (const [k, v] of votes) if (v > bv) [best, bv] = [k, v];
    for (const i of region) f.step[i] = best;
  }
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

/** Ramp color by palette and step. */
const C = (p: number, s: number): Color => PAL[p][clamp(s, 0, 5)];

/** A 2D layer drawn with its own outline over the frame canvas (inner lines where it overlaps). */
function layer(w: number, h: number, draw: (c: Canvas) => void, outline = true): Canvas {
  const c = new Canvas(w, h);
  draw(c);
  if (outline) c.outline();
  return c;
}

/** Draws `src` over `dst` with an extra opacity. */
function blit(dst: Canvas, src: Canvas, dx = 0, dy = 0, alpha = 1): void {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c[3]) dst.plot(dx + x, dy + y, alpha >= 1 ? c : withAlpha(c, c[3] * alpha));
    }
}

/**
 * A crack: a jagged polyline in screen space drawn dark (step 1 / outline), with a lit lip on the
 * lower-right side where the edge catches the light.
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
    for (const [dx, dy] of [[0, 1], [1, 0]]) {
      const j = f.idx(x + dx, y + dy);
      if (j >= 0 && !cells.has(j) && f.pal[j] >= 0 && meshes.includes(f.mesh[j]) && !f.over[j] && f.lightv[j] > 0.35) f.step[j] = Math.min(5, f.step[j] + 1);
    }
  }
}

// --- framing --------------------------------------------------------------------------------

/**
 * Crops every frame of a sprite to the union of their opaque bounds (1 px margin) so all frames
 * share one size and one anchor. (gx, gy) is the ground point on the work canvas; the anchor y is
 * the lowest opaque row of the first frame unless given.
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
  for (const [k, a] of Object.entries(anims)) out[k] = { frames: a.frames.map(crop), fps: a.fps, loop: a.loop ?? true };
  return { name, label, meters, anchor: [Math.round(gx - x0), Math.round((gy ?? fb[3]) - y0)], tags, anims: out };
}

// ================================================================================================
// FIRE, EMBERS AND SMOKE (painted in hard-edged bands, no dark outline)
// ================================================================================================

interface Tongue {
  x: number;
  h: number;
  w: number;
  ph: number;
  amp: number;
  /** Heat at the tongue's base (1 for the hot center tongue, less for the side ones). */
  k?: number;
}
/**
 * Layered flames at (cx, by) for frame f of n (a seamless loop): tongues with a wave traveling up
 * their centerline, banded by heat into a dark-red rim, red tips, an orange body, amber, a yellow
 * core and a few white-hot pixels at the base. Edges break up with scrolled cluster noise that is
 * crossfaded over the loop so the last frame flows into the first.
 */
function flames(c: Canvas, cx: number, by: number, f: number, n: number, tongues: Tongue[], o: { lean?: number; seed?: number; scale?: number } = {}): void {
  const ph = (f / n) * TAU;
  const seed = o.seed ?? 11;
  const t = f / n;
  const heat = (x: number, y: number): number => {
    let best = 0;
    for (const tg of tongues) {
      const hh = tg.h * (1 + 0.14 * Math.sin(ph * 2 + tg.ph) + 0.06 * Math.sin(ph * 3 + tg.ph * 2));
      const s = (by - (y + 0.5)) / hh; // 0 at the base, 1 at the tip
      if (s < -0.25 || s > 1) continue;
      const wob = tg.amp * Math.pow(Math.max(0, s), 1.2) * Math.sin(TAU * 1.15 * s - ph * 2 + tg.ph) + (o.lean ?? 0) * s * s * hh;
      const ccx = cx + tg.x * (1 - 0.3 * Math.max(0, s)) + wob;
      let hw: number;
      if (s < 0) hw = tg.w * Math.sqrt(Math.max(0, 1 - (s / 0.25) ** 2));
      else hw = tg.w * Math.pow(1 - s, 0.9) * (1 + 0.12 * Math.sin(ph * 2 + tg.ph + s * 5));
      if (hw <= 0.2) continue;
      const d = Math.abs(x + 0.5 - ccx) / hw;
      if (d >= 1) continue;
      const v = (tg.k ?? 1) * (1 - Math.pow(d, 2.4)) * (1 - 0.86 * Math.pow(Math.max(0, s), 0.85)) * (1 - (0.3 * Math.max(0, -s)) / 0.25);
      if (v > best) best = v;
    }
    if (best <= 0) return 0;
    const sc = 12;
    const nz = noise(x, y + t * sc, 2.6, seed) * (1 - t) + noise(x, y + (t - 1) * sc, 2.6, seed) * t;
    return best + (nz - 0.5) * 0.26;
  };
  const maxH = Math.max(...tongues.map((tg) => tg.h)) * 1.25;
  const maxW = Math.max(...tongues.map((tg) => Math.abs(tg.x) + tg.w)) + 8;
  const X0 = Math.floor(cx - maxW), Y0 = Math.floor(by - maxH);
  const Wd = Math.ceil(maxW * 2) + 2, Hd = Math.ceil(maxH) + 8;
  const hv = new Float32Array(Wd * Hd);
  for (let yy = 0; yy < Hd; yy++) for (let xx = 0; xx < Wd; xx++) hv[yy * Wd + xx] = heat(X0 + xx, Y0 + yy);
  const at = (xx: number, yy: number): number => (xx < 0 || yy < 0 || xx >= Wd || yy >= Hd ? 0 : hv[yy * Wd + xx]);
  const on = 0.06;
  for (let yy = 0; yy < Hd; yy++)
    for (let xx = 0; xx < Wd; xx++) {
      const v = at(xx, yy);
      if (v < on) continue;
      const x = X0 + xx, y = Y0 + yy;
      const s = (by - y) / maxH;
      // The rim: flame pixels on the edge of the shape take the darkest red (the owner's FX look).
      const edge = at(xx - 1, yy) < on || at(xx + 1, yy) < on || at(xx, yy - 1) < on;
      let col: Color;
      if (v > 0.95 && s < 0.12) col = WHITE_HOT;
      else if (v > 0.78) col = FIRE_R[5];
      else if (v > 0.6) col = FIRE_R[4];
      else if (v > 0.38) col = FIRE_R[3];
      else if (v > 0.18) col = FIRE_R[2];
      else col = FIRE_R[1];
      if (edge && v < 0.5) col = FIRE_R[1];
      else if (edge) col = FIRE_R[2];
      c.set(x, y, col);
    }
}

/** Rising embers: 1 px sparks drifting up and right, looping over n frames. */
function embers(c: Canvas, cx: number, by: number, f: number, n: number, count: number, rise: number, spread: number, seed: number): void {
  for (let j = 0; j < count; j++) {
    const speed = 1 + (rnd(seed, j, 1) < 0.35 ? 1 : 0);
    const p = ((f / n) * speed + rnd(seed, j, 2)) % 1;
    const x0 = cx + (rnd(seed, j, 3) - 0.5) * spread;
    const x = x0 + p * p * 7 + Math.sin(p * TAU + j) * 1.6;
    const y = by - p * rise;
    if (p > 0.92) continue;
    const col = p < 0.3 ? FIRE_R[5] : p < 0.62 ? FIRE_R[4] : FIRE_R[2];
    c.set(Math.round(x), Math.round(y), col);
    if (p < 0.2 && rnd(seed, j, 4) < 0.5) c.set(Math.round(x), Math.round(y) + 1, FIRE_R[3]);
  }
}

interface Puff {
  x: number;
  y: number;
  r: number;
  /** Depth: lower is in front. */
  z: number;
  rot: number;
  lobes?: number;
}
/**
 * Cauliflower puffs (a core and a ring of lobes) lit from the upper left. Per pixel the front-most
 * lobe wins; its sphere normal gives the light, the kit's band() turns it into clustered steps, and a
 * pixel next to a lobe in front of it drops a step (the soft inner line between puffs).
 */
function puffField(w: number, h: number, puffs: Puff[], o: { steps?: number[]; seed?: number; jitter?: number; bias?: number } = {}): { step: Int8Array; id: Int32Array; v: Float32Array; inner: Uint8Array } {
  const lobes: { x: number; y: number; r: number; z: number; id: number }[] = [];
  puffs.forEach((p, pi) => {
    const nl = p.lobes ?? 4;
    lobes.push({ x: p.x, y: p.y, r: p.r * 0.78, z: p.z, id: pi * 16 });
    for (let k = 0; k < nl; k++) {
      const a = p.rot + (k / nl) * TAU;
      const rr = p.r * (0.52 + 0.1 * Math.sin(k * 2.3 + p.rot));
      const ly = p.y + Math.sin(a) * p.r * 0.36;
      // Lower lobes sit in front of the core, upper ones behind it.
      lobes.push({ x: p.x + Math.cos(a) * p.r * 0.46, y: ly, r: rr, z: p.z - Math.sin(a) * 0.4, id: pi * 16 + 1 + k });
    }
  });
  const N = w * h;
  const depth = new Float32Array(N).fill(Infinity);
  const id = new Int32Array(N).fill(-1);
  const v = new Float32Array(N);
  const step = new Int8Array(N);
  const inner = new Uint8Array(N);
  for (const L of lobes) {
    if (L.r < 0.6) continue;
    for (let y = Math.max(0, Math.floor(L.y - L.r)); y <= Math.min(h - 1, Math.ceil(L.y + L.r)); y++)
      for (let x = Math.max(0, Math.floor(L.x - L.r)); x <= Math.min(w - 1, Math.ceil(L.x + L.r)); x++) {
        const u = (x + 0.5 - L.x) / L.r, vv = (y + 0.5 - L.y) / L.r;
        const d2 = u * u + vv * vv;
        if (d2 > 1) continue;
        const zz = Math.sqrt(1 - d2);
        const dep = L.z - zz * 0.3;
        const i = y * w + x;
        if (dep >= depth[i]) continue;
        depth[i] = dep;
        id[i] = L.id;
        v[i] = lambert(u, vv, zz);
      }
  }
  const steps = o.steps ?? [1, 2, 3, 4];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (id[i] < 0) continue;
      let s = band(v[i], x, y, { steps, bias: o.bias ?? -0.06, jitter: o.jitter ?? 0.1, seed: o.seed ?? 31, cell: 2.5 });
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (id[j] >= 0 && id[j] >> 4 !== id[i] >> 4 && depth[j] < depth[i] - 0.05) {
          s = Math.max(steps[0], s - 1);
          inner[i] = 1;
          break;
        }
      }
      step[i] = s;
    }
  return { step, id, v, inner };
}

/** A thin wisp of smoke rising from (x, y): two-tone strands curling up, fading out. Seamless over n frames. */
function wisp(c: Canvas, x0: number, y0: number, f: number, n: number, height: number, seed: number, alpha = 150): void {
  const ph = (f / n) * TAU;
  for (let k = 0; k < height; k++) {
    const s = k / height;
    const y = y0 - k;
    const x = x0 + Math.sin(s * 7.5 - ph + rnd(seed, 1) * 3) * (0.6 + s * 2.4) + s * s * 7;
    const a = alpha * (1 - smooth(0.55, 1, s)) * (s < 0.06 ? s / 0.06 : 1);
    if (a < 20) continue;
    const xi = Math.round(x);
    c.plot(xi, y, withAlpha(SMOKE_R[s < 0.35 ? 3 : 4], a));
    // The strand thickens and splits where it curls.
    if (s > 0.2 && Math.sin(s * 6 - ph * 2 + seed) > 0.1) c.plot(xi + 1, y, withAlpha(SMOKE_R[2], a * 0.75));
  }
}

// ================================================================================================
// SHARED DETAIL HELPERS
// ================================================================================================

/** Dim canvas seen inside a tent. */
const INSIDE = pal(R.canvas.map((c, i) => mix(c, CHAR_R[i], 0.5)));

/**
 * A 1 px line between two world points drawn into a canvas with a depth test against the frame
 * (it hides behind nearer surfaces); `sag` px of droop at the middle. Returns the pixels it drew.
 */
function ropeLine(c: Canvas, f: Frame, a: V3, b: V3, sag: number, col: (k: number, n: number) => Color): [number, number][] {
  const n = Math.ceil(Math.hypot(...f.proj(a).map((v, i) => v - f.proj(b)[i])) * 1.5) + 2;
  const out: [number, number][] = [];
  const shade: [number, number, Color][] = [];
  let last = '';
  let k2 = 0;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const p: V3 = add(lerp3(a, b, t), [0, -sag * 4 * t * (1 - t), 0]);
    const [x, y] = f.px(p);
    const key = `${x},${y}`;
    if (key === last) continue;
    last = key;
    k2++;
    const i = f.idx(x, y);
    if (i < 0) continue;
    if (f.mesh[i] >= 0 && f.depth[i] < p[2] - 0.5) continue;
    c.set(x, y, col(k2, n));
    out.push([x, y]);
    const j = f.idx(x + 1, y + 1);
    if (j >= 0 && f.mesh[j] >= 0 && f.pal[j] >= 0 && !f.over[j] && Math.abs(f.depth[j] - p[2]) < 30) shade.push([x + 1, y + 1, PAL[f.pal[j]][Math.max(1, f.step[j] - 1)]]);
  }
  for (const [x, y, col] of shade) if (!out.some(([ax, ay]) => ax === x && ay === y)) c.set(x, y, col);
  return out;
}
/** Twisted rope colours along a line: two lit strands and a dark groove every third pixel. */
const twist = (lit: boolean) => (k: number): Color => (k % 3 === 0 ? R.rope[lit ? 2 : 1] : R.rope[lit ? (k % 3 === 1 ? 4 : 3) : 2]);

/** Wood grain along a pole or log from a to b: long dark streaks that wander, and the odd knot. */
function grain(f: Frame, mesh: Mesh, a: V3, b: V3, seed: number, o: { streak?: number; knots?: number } = {}): void {
  const ax = unit(sub(b, a));
  const ref: V3 = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const uu = unit(cross(ax, ref)), ww = cross(ax, uu);
  f.each(mesh.id, (i) => {
    if (f.over[i]) return;
    const rel = sub(f.world(i), a);
    const along = dot(rel, ax);
    const ang = Math.atan2(dot(rel, ww), dot(rel, uu));
    const g = noise(along / 7 + Math.sin(ang * 2) * 0.4, ang * 2.2, 1, seed);
    if (g > 1 - (o.streak ?? 0.2) && f.step[i] > 1) f.step[i] -= 1;
    else if (g < 0.08 && f.step[i] >= 3 && f.step[i] < 5) f.step[i] += 1;
    if (o.knots) {
      const kn = Math.floor(along / 23);
      if (hash(kn, 3, seed) < o.knots) {
        const ka = (hash(kn, 4, seed) - 0.5) * 2.4;
        const ka2 = kn * 23 + 6 + hash(kn, 5, seed) * 10;
        const d = Math.hypot((along - ka2) / 1.6, (ang - ka) * 2.2);
        if (d < 1) f.step[i] = d < 0.5 ? 1 : Math.min(f.step[i], 2);
      }
    }
  });
}

/** A wooden stake: a squared peg leaning back, its cut top lit, a notch for the rope. */
function stake(sc: Scene, xf: (t: Tri[]) => Tri[], x: number, d: number, lean: number, seed: number, hgt = 8, pal_ = WOOD): Mesh {
  const peg = rotZ(loft([ring(0, -1, 0, 1.4, 1.4, 4, { rot: 0.5 }), ring(0, hgt - 1.4, 0, 1.3, 1.3, 4, { rot: 0.5 }), ring(0, hgt, 0, 0.9, 0.9, 4, { rot: 0.5 })], { capEnd: true }), lean, 0, 0);
  return sc.add(xf(move(peg, [x, 0, d])), { pal: pal_, seed, contrast: 1.15, facetVar: 0.05 });
}

// ================================================================================================
// A-FRAME TENTS
// ================================================================================================

interface TentSpec {
  name: string;
  label: string;
  meters: [number, number];
  /** Ridge length, half width at the base, ridge height (px). */
  L: number;
  B: number;
  HR: number;
  YAW: number;
  seed: number;
  /** How far the crossed poles reach past the ridge (fraction of their length). */
  ext: number;
  /** Panel seams along the ridge (u). */
  seams: number[];
  /** Hem pegs along the near side (u). */
  pegs: number[];
  patches: { u0: number; v0: number; u1: number; v1: number }[];
  /** Near door flap: opening angle in degrees; the far one is folded back. */
  flap: number;
  W: number;
  H: number;
  ox: number;
  oy: number;
}

function aTent(o: TentSpec): WorldSprite {
  const { L, B, HR, YAW } = o;
  const SL = Math.hypot(HR, B);
  const PO = 1.8;
  const NU = Math.round(L / 2.2), NV = Math.round(SL / 3);
  /** Fold creases on the near slope in slope px (U along the ridge, V down from it): a > 0 bulges out. */
  const creases: { u0: number; v0: number; u1: number; v1: number; a: number; w: number }[] = [
    // Tension from the crossed poles' tops down toward the hem pegs nearest them.
    { u0: 3, v0: 2, u1: L * 0.3, v1: SL * 0.8, a: 1.3, w: 2.6 },
    { u0: 6, v0: 2, u1: L * 0.36, v1: SL * 0.66, a: -1.2, w: 2.8 },
    { u0: L - 3, v0: 2, u1: L * 0.7, v1: SL * 0.82, a: 1.3, w: 2.6 },
    { u0: L - 6, v0: 2, u1: L * 0.64, v1: SL * 0.68, a: -1.1, w: 2.8 },
    // The sag under the ridge and a soft drape through the middle panel.
    { u0: L * 0.18, v0: SL * 0.1, u1: L * 0.82, v1: SL * 0.1, a: -1.3, w: 3.6 },
    { u0: L * 0.5, v0: SL * 0.14, u1: L * 0.48, v1: SL * 0.6, a: -1.5, w: 4.2 },
    { u0: L * 0.54, v0: SL * 0.16, u1: L * 0.55, v1: SL * 0.5, a: 1.0, w: 2.4 },
    // V folds pulled down by every hem peg, curtain folds hanging between them.
    ...o.pegs.slice(1, -1).flatMap((pu) => [
      { u0: L * pu, v0: SL, u1: L * pu - 12, v1: SL - 30, a: 1.3, w: 2.2 },
      { u0: L * pu, v0: SL, u1: L * pu + 10, v1: SL - 26, a: 1.2, w: 2.2 },
    ]),
    ...o.pegs.slice(0, -1).map((pu, k) => {
      const mid = (pu + o.pegs[k + 1]) / 2;
      return { u0: L * mid, v0: SL, u1: L * mid + 2, v1: SL - 26, a: -1.2, w: 2.4 };
    }),
  ];
  const foldAt = (U: number, V: number): number => {
    let d = 0;
    for (const c of creases) {
      const ax = c.u1 - c.u0, ay = c.v1 - c.v0, l2 = ax * ax + ay * ay;
      const t = clamp(((U - c.u0) * ax + (V - c.v0) * ay) / l2, 0, 1);
      const dist = Math.hypot(U - (c.u0 + ax * t), V - (c.v0 + ay * t));
      d += c.a * 1.5 * Math.exp(-((dist / c.w) ** 2)) * (1 - t * 0.85);
    }
    return d;
  };
  const ridgeH = (u: number) => HR - 3 * Math.pow(Math.sin(Math.PI * u), 1.1);
  const pegLift = (u: number) => {
    // Scallops: the hem rides up between the pegs.
    let best = 1;
    for (const pu of o.pegs) best = Math.min(best, Math.abs(u - pu));
    const span = 1 / Math.max(1, o.pegs.length - 1);
    return 3.2 * Math.pow(Math.sin(Math.PI * Math.min(1, best / span)), 1.4);
  };
  const slopePt = (u: number, v: number, side: -1 | 1, sway = 0): V3 => {
    const x = -L / 2 + u * L;
    const p = lerp3([x, ridgeH(u), 0], [x, pegLift(u), side * B], v);
    const n = unit([0, B, side * HR]);
    const sag = (4.2 + 2.6 * Math.sin(Math.PI * u)) * Math.pow(Math.sin(Math.PI * v), 1.2) * (1 + sway * 0.06);
    const fold = side < 0 ? foldAt(u * L, v * SL) : 0;
    return add(p, mul(n, fold - sag));
  };
  const Y = (tris: Tri[]) => rotY(tris, YAW);
  const W2 = (p: V3) => rotYp(p, YAW);
  const grid = (nu: number, nv: number, fn: (u: number, v: number) => V3): V3[][] => Array.from({ length: nv + 1 }, (_, i) => Array.from({ length: nu + 1 }, (_, j) => fn(j / nu, i / nv)));
  const canvasOpts = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: CANVAS_T, seed, crest: false, facetVar: 0, jitter: 0.06, cell: 3, ...extra });
  const legs = (xe: number): [V3, V3, V3, V3] => {
    const top: V3 = [xe, ridgeH(xe > 0 ? 1 : 0) + 1.2, 0];
    const fn: V3 = [xe, 0, -B * 0.98], ff: V3 = [xe, 0, B * 0.98];
    return [fn, add(fn, mul(sub(top, fn), 1 + o.ext)), ff, add(ff, mul(sub(top, ff), 1 + o.ext))];
  };

  const frame = (t: number): Canvas => {
    GROUP = 1;
    const sc = new Scene();
    const sway = [0, 1, 0, -1][t % 4];
    const nearN = rotYp(unit([0, B, -HR]), YAW);
    const near = sc.add(Y(sheet(grid(NU, NV, (u, v) => slopePt(u, v, -1, sway)))), canvasOpts(o.seed + 1, { ao: 3, bias: -0.3, jitter: 0.05, bump: { base: nearN, gain: 3.4 } }));
    const far = sc.add(Y(sheet(grid(24, 16, (u, v) => slopePt(u, v, 1)))), canvasOpts(o.seed + 2, { pal: INSIDE, steps: [0, 1, 1, 2], castShadow: false }));
    const A: V3 = [L / 2, ridgeH(1), 0], S: V3 = [L / 2, 0, 0], Fb: V3 = [L / 2, 0, B], Bn: V3 = [L / 2, 0, -B];
    const A0: V3 = [-L / 2, ridgeH(0), 0];
    // The back gable seen from inside, and the floor (a ground sheet).
    sc.add(Y(sheet(grid(6, 8, (u, v) => lerp3(lerp3(A0, [-L / 2, 0, B], v), lerp3(A0, [-L / 2, 0, -B], v), u)), { flip: true })), canvasOpts(o.seed + 3, { pal: INSIDE, steps: [0, 0, 1, 1] }));
    const floor = sc.add(Y(sheet(grid(4, 4, (u, v) => [-L / 2 + u * L, 0.3, B - v * 2 * B]))), { pal: INSIDE, seed: o.seed + 4, steps: [0, 1, 1, 2], crest: false, castShadow: false });
    // Door flaps: each half of the front gable pulled aside and tied back at waist height, so it
    // hangs as a gathered curtain along the edge of the opening (narrow at the tie, flared below).
    const gable: V3 = [1, 0, 0];
    const flap = (hingeEnd: V3, side: 1 | -1, seed: number) => {
      const tieV = 0.58;
      const pt = (u: number, v: number): V3 => {
        const wv = v < tieV ? 0.18 + 0.32 * ((tieV - v) / tieV) ** 1.4 : 0.16 + 0.5 * ((v - tieV) / (1 - tieV)) ** 1.3;
        const uu = u * wv;
        let p = lerp3(lerp3(A, hingeEnd, v), lerp3(A, S, v), uu);
        // Gathered folds stand out of the gable plane; the whole curtain bellies out a little.
        const folds = Math.sin(u * Math.PI * 3.2 + side) * 1.5 * (0.4 + Math.abs(v - tieV));
        p = add(p, mul(gable, 1.6 + folds + Math.sin(Math.PI * u) * (1.5 + sway * 0.4)));
        if (p[1] < 0.6) p = [p[0], 0.6, p[2]];
        return p;
      };
      return sc.add(Y(sheet(grid(8, 20, pt), { flip: side < 0 })), canvasOpts(seed, { twoSided: true, steps: [1, 2, 3, 4], bias: -0.18 }));
    };
    const flapN = flap(Bn, -1, o.seed + 5);
    const flapF = flap(Fb, 1, o.seed + 6);
    // Crossed poles at both ends (their tops cross over the ridge and stick out) and the ridge pole
    // resting in the crotches.
    const poleOpts = (seed: number): MeshOpts => ({ pal: WOOD_DK, seed, contrast: 1.12, facetVar: 0, steps: [1, 2, 3, 4] });
    const poles: { m: Mesh; a: V3; b: V3 }[] = [];
    for (const xe of [L / 2 + PO, -L / 2 - PO]) {
      const [a1, b1, a2, b2] = legs(xe);
      // The near leg leans a hair forward of the far one so they cross cleanly.
      const n1 = add(a1, [0, 0, -0.6]), n2 = add(b1, [0, 0, -0.6]);
      poles.push({ m: sc.add(Y(pole(n1, n2, 2, 8, { r2: 1.7 })), poleOpts(o.seed + 10 + poles.length)), a: n1, b: n2 });
      poles.push({ m: sc.add(Y(pole(a2, b2, 2, 8, { r2: 1.7 })), poleOpts(o.seed + 10 + poles.length)), a: a2, b: b2 });
    }
    const rp0: V3 = [-L / 2 - PO - 8, ridgeH(0) + 2.4, 0], rp1: V3 = [L / 2 + PO + 8, ridgeH(1) + 2.4, 0];
    const ridgePole = sc.add(Y(tube([rp0, [-L / 4, ridgeH(0.25) + 2.2, 0], [0, ridgeH(0.5) + 2.2, 0], [L / 4, ridgeH(0.75) + 2.2, 0], rp1], 2.1, 8)), poleOpts(o.seed + 20));
    // Stakes: hem pegs along the near side, the far front corner, and the guy-rope stakes.
    const pegMeshes = o.pegs.map((u, k) => stake(sc, Y, -L / 2 + u * L, -B - 3, 0.28, o.seed + 30 + k, 6));
    stake(sc, Y, L / 2 + 1, B + 3, -0.28, o.seed + 39, 6);
    const guy: V3[] = [
      [L / 2 + 48, 0, 0],
      [-L / 2 - 48, 0, 0],
      ...o.seams.map((u) => [-L / 2 + u * L, 0, -B - 30] as V3),
    ];
    const guyStakes = guy.map((p, k) => stake(sc, Y, p[0], p[2], k === 0 ? -0.32 : k === 1 ? 0.32 : 0.3, o.seed + 40 + k, 9));

    const f = render(sc, o.W, o.H, o.ox, o.oy);
    declump(f, [near.id, flapN.id], 4);
    const uvAt = (i: number): UV => [f.uv[i * 2], f.uv[i * 2 + 1]];
    const nbs = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => f.idx(x + dx, y + dy));
    const onNear = (j: number) => j >= 0 && f.mesh[j] === near.id;
    // --- canvas: weave, seams with stitches, the doubled ridge band, the hem, stains, patches ---
    f.each(near.id, (i, x, y) => {
      if (f.over[i]) return;
      const [u, v] = uvAt(i);
      const U = u * L, V = v * SL;
      let s = f.step[i];
      const p = f.world(i);
      // Weave: a sparse diagonal twill in the lit cloth, a darker thread here and there in the shade.
      const tw = (Math.floor(U) + Math.floor(V)) % 4;
      if (s >= 4 && tw === 0 && noise(U * 0.5, V * 0.5, 1.4, o.seed + 60) > 0.45) s -= 1;
      else if (s === 3 && tw === 0 && noise(U * 0.5, V * 0.5, 1.4, o.seed + 61) > 0.72) s += 1;
      else if (s === 2 && tw === 2 && noise(U * 0.5, V * 0.5, 1.4, o.seed + 61) > 0.8) s -= 1;
      // Rain stains: a few soft streaks running down from the ridge.
      if (noise(U / 3.5, V / 26, 1, o.seed + 62) > 0.84 && s > 2 && V > 10) s -= 1;
      // Ridge: a lit crest and the seam of the doubled band just below it.
      if (V < 1.2) s = Math.max(s, 4);
      else if (Math.abs(V - 5) < 0.6) s = Math.min(s, 2);
      else if (V < 5 && s < 4 && hash(x, y, 63) < 0.4) s += 1;
      // Panel seams: a dark stitch line, the overlapping edge lit beside it, stitches every 3 px.
      for (const su of o.seams) {
        const d = U - su * L;
        if (Math.abs(d) < 0.55) s = Math.min(s, 2) - (V > 6 ? 1 : 0);
        else if (d > 0.55 && d < 1.6 && s >= 2) s = Math.min(5, s + 1);
        else if (d < -0.55 && d > -2.2 && (Math.round(V) % 3 === 0)) s = Math.min(4, s + 1);
      }
      // Hem: a darker turned-back band with its stitch line, muddy at the very bottom.
      if (V > SL - 5) s = Math.min(s, 2);
      if (Math.abs(V - (SL - 5)) < 0.6) s = 1;
      if (p[1] < 5 && noise(x, y, 2, o.seed + 64) > 0.5) {
        f.pal[i] = SCORCH;
        s = Math.min(s, 2);
      }
      f.step[i] = clamp(s, 1, 5);
      // Grommets on the hem at every peg: a dark ring with a lit lip.
      for (const pu of o.pegs) {
        const gd = Math.hypot(U - pu * L, (V - (SL - 3)) * 1.3);
        if (gd < 1.2) f.over[i] = C(IRON, 1);
        else if (gd < 2.2) f.step[i] = gd < 1.7 ? 4 : 2;
      }
      // Patches: coarser cloth with a dark seam around and a light stitch line inside.
      for (const pt of o.patches) {
        if (u < pt.u0 || u > pt.u1 || v < pt.v0 || v > pt.v1) continue;
        f.pal[i] = BURLAP;
        const inP = (j: number) => {
          if (!onNear(j)) return false;
          const [uj, vj] = uvAt(j);
          return uj >= pt.u0 && uj <= pt.u1 && vj >= pt.v0 && vj <= pt.v1;
        };
        if (nbs(x, y).some((j) => !inP(j))) f.over[i] = C(BURLAP, 1);
        else if ([[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => !inP(f.idx(x + dx, y + dy))) && (x + y) % 3 !== 0) f.step[i] = 4;
      }
    });
    // The dark inside: deepest at the back, the threshold catching a little light.
    f.each(floor.id, (i) => {
      const p = rotYp(f.world(i), -YAW);
      f.step[i] = p[0] > L / 2 - 6 ? 1 : 0;
    });
    f.each(far.id, (i) => {
      const p = rotYp(f.world(i), -YAW);
      if (p[0] < L / 2 - 14) f.step[i] = 0;
    });
    // The flaps' free edges are rolled hems that catch the light; their seam down the middle.
    for (const fl of [flapN, flapF])
      f.each(fl.id, (i) => {
        const [u, v] = uvAt(i);
        if (u > 0.92 && v > 0.04) f.step[i] = Math.min(4, f.step[i] + 1);
        else if (v > 0.95) f.step[i] = Math.max(1, f.step[i] - 1);
        else if (Math.abs(u - 0.5) < 0.04 && v > 0.1) f.step[i] = Math.max(1, f.step[i] - 1);
      });
    for (const pl of poles) grain(f, pl.m, pl.a, pl.b, o.seed + 70 + pl.m.id, { knots: 0.5 });
    grain(f, ridgePole, rp0, rp1, o.seed + 79, { knots: 0.4 });
    void pegMeshes;
    void guyStakes;
    const c = f.compose();
    c.outline();
    // Rope lashings where the poles cross (painted over, with their own outline).
    const lash = layer(o.W, o.H, (cv) => {
      for (const xe of [L / 2 + PO, -L / 2 - PO]) {
        const [cx, cy] = f.px(W2([xe, ridgeH(xe > 0 ? 1 : 0) + 1.2, -1]));
        const wraps: [number, number, number][] = [[-2, -1, 4], [-1, -1, 3], [0, -1, 3], [1, -1, 2], [-2, 0, 3], [-1, 0, 4], [0, 0, 3], [1, 0, 2], [-2, 1, 2], [-1, 1, 3], [0, 1, 2], [1, 1, 1], [0, 2, 3], [0, 3, 2], [1, 4, 2]];
        for (const [dx, dy, st] of wraps) cv.set(cx + dx, cy + dy, C(ROPE, st));
      }
    });
    c.draw(lash, 0, 0);
    // Guy ropes from the crossings to the end stakes, and from loops on the slope to the side stakes.
    for (const [k, xe] of [[0, L / 2 + PO], [1, -L / 2 - PO]] as [number, number][]) {
      const top = W2([xe, ridgeH(xe > 0 ? 1 : 0) + 3, 0]);
      ropeLine(c, f, top, W2(add(guy[k], [0, 6, 0])), 1.5, twist(k === 0));
    }
    o.seams.forEach((u, k) => {
      const loop = W2(add(slopePt(u, 0.5, -1), [0, 0, -1]));
      ropeLine(c, f, loop, W2(add(guy[2 + k], [0, 7, 0])), 1, twist(true));
    });
    return c;
  };
  const idle = [0, 1, 2, 3].map((t) => frame(t));
  return finish(o.name, o.label, o.meters, ['cover-3q', 'blocks-sight', 'flammable', 'destructible', 'interactable'], { idle: { frames: idle, fps: 4 } }, o.ox);
}

function tentLarge(): WorldSprite {
  return aTent({
    name: 'tent_large',
    label: 'Large Canvas Tent',
    meters: [3.4, 2.3],
    L: 156, B: 64, HR: 120, YAW: -0.82, seed: 3100, ext: 0.13,
    seams: [0.25, 0.5, 0.75],
    pegs: [0, 0.25, 0.5, 0.75, 1],
    patches: [{ u0: 0.6, v0: 0.62, u1: 0.68, v1: 0.78 }],
    flap: 0,
    W: 340, H: 250, ox: 170, oy: 196,
  });
}

function tentSmall(): WorldSprite {
  return aTent({
    name: 'tent_small',
    label: 'Small Canvas Tent',
    meters: [2.4, 1.6],
    L: 104, B: 44, HR: 82, YAW: -0.8, seed: 3200, ext: 0.15,
    seams: [0.5],
    pegs: [0, 0.5, 1],
    patches: [{ u0: 0.18, v0: 0.5, u1: 0.28, v1: 0.66 }],
    flap: 0,
    W: 250, H: 190, ox: 125, oy: 150,
  });
}

// ================================================================================================
// TORII
// ================================================================================================

/** A zigzag paper shide hanging from (x, y): four folded segments, lit left, shaded right. */
function shide(cv: Canvas, x: number, y: number, seg = 5, n = 4): void {
  for (let k = 0; k < n; k++) {
    const off = k % 2 ? -2 : 0;
    for (let r = 0; r < seg; r++) {
      const yy = y + k * seg + r;
      const fold = r === 0 && k > 0;
      for (let c = 0; c < 3; c++) {
        const st = fold ? 2 : c === 0 ? 5 : c === 1 ? 4 : 3;
        cv.set(x + off + c, yy, C(PAPER, st));
      }
    }
  }
  // A short tail below the last fold.
  cv.set(x + (n % 2 ? -2 : 0) + 1, y + n * seg, C(PAPER, 3));
}

function torii(): WorldSprite {
  const W = 220, H = 230, ox = 110, oy = 200;
  const YAW = 0.09;
  GROUP = 1;
  const sc = new Scene();
  const Y = (tris: Tri[]) => rotY(tris, YAW);
  const W2 = (p: V3) => rotYp(p, YAW);
  const PX = 46; // pillar centres
  const lacq = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({
    pal: LACQ,
    seed,
    contrast: 1.15,
    facetVar: 0,
    steps: [1, 2, 3, 4],
    jitter: 0.05,
    // Lacquer sheen: a narrow bright streak where the surface turns toward the light.
    shade: (p, st) => (p.light > 0.86 ? 5 : p.light > 0.74 && st < 4 ? 4 : st),
    ...extra,
  });
  const blk = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: BLACK, seed, contrast: 1.2, facetVar: 0.03, steps: [1, 2, 3, 4], shade: (p, st) => (p.light > 0.84 ? 5 : st), ...extra });
  // Stone footings and black sleeves (nemaki) at the pillar feet.
  const feet: Mesh[] = [];
  const sleeves: Mesh[] = [];
  const pillars: { m: Mesh; a: V3; b: V3 }[] = [];
  for (const sx of [-1, 1]) {
    feet.push(sc.add(Y(rockMesh({ cx: sx * PX, cd: 0, rx: 10, rd: 9, h: 4, n: 8, seed: 3300 + sx, profile: [[0, 1], [0.6, 0.96], [1, 0.82]], jit: 0.06, apexUp: -0.4 })), { pal: STONE, seed: 3302 + sx, contrast: 1.1, ao: 1, tex: 0.04 }));
    const a: V3 = [sx * PX, 3, 0], b: V3 = [sx * (PX - 2.5), 150, 0];
    sleeves.push(sc.add(Y(pole([sx * PX, 3, 0], [sx * (PX - 0.25), 16, 0], 6.9, 14, { r2: 6.7 })), blk(3304 + sx)));
    pillars.push({ m: sc.add(Y(pole(a, b, 6, 14, { r2: 5.3 })), lacq(3306 + sx)), a, b });
  }
  // Nuki (tie beam) through the pillars, its ends sticking out; wedges where it passes.
  const nuki = sc.add(Y(box(-PX - 13, PX + 13, 113, 121, -3.6, 3.6)), lacq(3310, { crest: true }));
  // Gakuzuka (centre strut) and the plaque hanging in front of it.
  sc.add(Y(box(-3.6, 3.6, 121, 139, -2.6, 2.6)), lacq(3311));
  const plaque = sc.add(Y(box(-8, 8, 120.5, 139.5, -6.4, -3.2)), { pal: WOOD_DK, seed: 3312, contrast: 1.1, facetVar: 0.04, crest: true });
  // Shimaki (lower top beam) and the kasagi: black, its ends sweeping up (sori) and cut on a slant.
  const shimaki = sc.add(Y(box(-PX - 16, PX + 16, 139, 146, -4, 4)), blk(3313, { crest: true }));
  const KX = PX + 32;
  const rings: V3[][] = [];
  for (let k = 0; k <= 20; k++) {
    const x = -KX + (2 * KX * k) / 20;
    const e = Math.pow(Math.abs(x) / KX, 2.4);
    const h0 = 146 + 7.5 * e, h1 = h0 + 7.5 - 1.2 * e;
    const dd = 5.2 + 0.6 * e;
    // Slanted end cuts: the top overhangs the bottom at the tips.
    const xb = k === 0 ? x + 2.5 : k === 20 ? x - 2.5 : x;
    rings.push([[xb, h0, -dd], [x, h1, -dd], [x, h1, dd], [xb, h0, dd]]);
  }
  const kasagi = sc.add(Y(loft(rings, { capStart: true, capEnd: true })), blk(3314, { crest: true, form: 0 }));
  const f = render(sc, W, H, ox, oy);
  // Lacquer wear: the red rubbed thin at the pillar feet and the beam ends, a few chips to the wood.
  for (const pl of pillars)
    f.each(pl.m.id, (i, x, y) => {
      const p = rotYp(f.world(i), -YAW);
      if (p[1] < 34 && noise(x, y * 0.5, 1.6, 3320) > 0.62 - (34 - p[1]) * 0.006) f.step[i] = Math.max(1, f.step[i] - 1);
      if (noise(x * 1.3, y * 0.4, 1.2, 3321) > 0.92) f.pal[i] = WOOD_DK;
      // Vertical grain under the lacquer, faint.
      if (f.step[i] === 3 && noise(x * 2, y * 0.15, 1, 3322) > 0.82) f.step[i] = 2;
    });
  // Plaque: a gold frame, a dark field and pale painted strokes (no real characters).
  f.each(plaque.id, (i, x, y) => {
    const p = rotYp(f.world(i), -YAW);
    const n = rotYp(f.normal(i), -YAW);
    if (n[2] > -0.9) return; // only the front face
    const ex = 8 - Math.abs(p[0]), ey = Math.min(p[1] - 120.5, 139.5 - p[1]);
    if (ex < 1.3 || ey < 1.3) {
      f.pal[i] = GOLD;
      f.step[i] = ex < 0.7 || ey < 0.7 ? 2 : f.lightv[i] > 0.5 ? 4 : 3;
      return;
    }
    f.pal[i] = BLACK;
    f.step[i] = 2;
    const sx = Math.round(p[0]), sy = Math.round(p[1]);
    const strokes: [number, number][] = [[0, 136], [-1, 135], [1, 135], [0, 134], [-2, 133], [-1, 133], [0, 133], [1, 133], [2, 133], [0, 131], [0, 130], [-1, 129], [1, 128], [0, 126], [-2, 125], [-1, 125], [0, 125], [1, 125], [-1, 124], [1, 123], [0, 123]];
    if (strokes.some(([a, b]) => a === sx && b === sy)) {
      f.pal[i] = GOLD;
      f.step[i] = 4;
    }
  });
  void nuki;
  void shimaki;
  void kasagi;
  void feet;
  void sleeves;
  const c = f.compose();
  c.outline();
  // Shimenawa: a thick twisted straw rope slung between the pillars under the tie beam, tied round
  // each pillar, with zigzag paper shide and straw tassels hanging from it.
  const rope = layer(W, H, (cv) => {
    const a = W2([-PX + 5, 106, -6.5]), b = W2([PX - 5, 106, -6.5]);
    const pa = f.proj(a), pb = f.proj(b);
    const sag = 9;
    const n = Math.ceil(Math.abs(pb[0] - pa[0]));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = Math.round(pa[0] + (pb[0] - pa[0]) * t);
      const yc = pa[1] + (pb[1] - pa[1]) * t + sag * 4 * t * (1 - t);
      const thick = 2.6 + 1.4 * Math.sin(Math.PI * t);
      for (let dy = -Math.ceil(thick); dy <= Math.ceil(thick); dy++) {
        const v = dy / thick;
        if (Math.abs(v) > 1) continue;
        // Two strands twisting: a diagonal groove every 4 px, lit on the upper side.
        const ph = ((x * 0.5 + dy * 0.9) % 4 + 4) % 4;
        let st = v < -0.45 ? 4 : v < 0.2 ? 3 : 2;
        if (ph < 1) st = Math.max(1, st - 2);
        else if (ph < 1.6 && v < 0) st = 5;
        cv.set(x, Math.round(yc + dy), C(STRAW, st));
      }
    }
    // Wraps round the pillars.
    for (const [px, py] of [pa, pb])
      for (let dy = -4; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          if (Math.abs(dx) + Math.abs(dy) * 0.6 > 3.6) continue;
          cv.set(Math.round(px) + dx, Math.round(py) + dy, C(STRAW, ((dx + dy + 8) % 3 === 0 ? 2 : dy < 0 ? 4 : 3)));
        }
    // Straw tassels (three short tufts) and four shide.
    const at = (t: number): [number, number] => [Math.round(pa[0] + (pb[0] - pa[0]) * t), Math.round(pa[1] + (pb[1] - pa[1]) * t + sag * 4 * t * (1 - t) + 2.6 + 1.4 * Math.sin(Math.PI * t))];
    for (const t of [0.3, 0.5, 0.7]) {
      const [x, y] = at(t);
      for (let k = 0; k < 6; k++) {
        cv.set(x - 1, y + k, C(STRAW, k < 2 ? 3 : 2));
        cv.set(x, y + k + (k > 3 ? 1 : 0), C(STRAW, k < 3 ? 4 : 3));
        cv.set(x + 1, y + k, C(STRAW, 2));
      }
    }
    for (const t of [0.16, 0.4, 0.6, 0.84]) {
      const [x, y] = at(t);
      shide(cv, x - 1, y, 5, 4);
    }
  });
  c.draw(rope, 0, 0);
  return finish('torii', 'Torii Gate', [2.8, 3.2], ['blocks-sight', 'interactable'], { idle: { frames: [c], fps: 0 } }, ox, oy + 1);
}

// ================================================================================================
// TRAVEL PACK, BEDROLL
// ================================================================================================

const PACK = pal(ramp('#7d6c4c', { shift: 12 }));

/** A rounded-box ring (superellipse) in the X-D plane at height h. */
function sring(cx: number, h: number, cd: number, rx: number, rd: number, n = 20, p = 3.2): V3[] {
  return Array.from({ length: n }, (_, j) => {
    const a = (j / n) * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    return [cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / p) * rx, h, cd + Math.sign(s) * Math.pow(Math.abs(s), 2 / p) * rd] as V3;
  });
}

/** Cloth weave on lit faces: sparse darker thread rows, never a checkerboard. */
const weaveShade = (seed: number) => (p: PixelInfo, s: number): number => {
  const tw = (Math.floor(p.p[0] * 0.9) + Math.floor(p.p[1])) % 3;
  if (s >= 3 && tw === 0 && noise(p.p[0], p.p[1], 1.5, seed) > 0.5) return s - 1;
  return s;
};

/** A rolled blanket along X (length len, radius r) with cream stripes, its end showing the spiral. */
function rollMesh(sc: Scene, xf: (t: Tri[]) => Tri[], len: number, r: number, h: number, seed: number): { m: Mesh; local: (p: V3) => V3 } {
  const rings: V3[][] = [];
  const N = 16;
  for (let k = 0; k <= 8; k++) {
    const x = -len / 2 + (len * k) / 8;
    const pinch = k === 0 || k === 8 ? 0.94 : 1 - 0.03 * Math.sin((k / 8) * Math.PI * 4);
    rings.push(Array.from({ length: N }, (_, j) => {
      const a = (j / N) * TAU;
      return [x, h + Math.sin(a) * r * 0.9 * pinch, Math.cos(a) * r * pinch] as V3;
    }));
  }
  const m = sc.add(xf(loft(rings, { capStart: true, capEnd: true, smooth: true })), {
    pal: INDIGO,
    seed,
    contrast: 1.2,
    crest: false,
    steps: [1, 2, 3, 4],
    shade: (p, st) => {
      const q = p.p;
      void q;
      return st;
    },
  });
  return { m, local: (p: V3) => p };
}

/** Paints a bedroll: cream stripes near both ends, the spiral of the rolled layers on the end cap. */
function paintRoll(f: Frame, m: Mesh, toLocal: (p: V3) => V3, len: number, r: number, h: number, seed: number): void {
  f.each(m.id, (i, x, y) => {
    if (f.over[i]) return;
    const q = toLocal(f.world(i));
    const n = toLocal(add(f.world(i), f.normal(i)));
    const nx = n[0] - q[0];
    const along = q[0] + len / 2;
    if (Math.abs(nx) > 0.8) {
      // End cap: an Archimedean spiral of blanket layers.
      const a = Math.atan2(q[1] - h, q[2]);
      const rr = Math.hypot(q[1] - h, q[2]) / r;
      const turn = (rr * 4.2 - a / TAU + 10) % 1;
      f.pal[i] = turn < 0.3 ? CREAM : INDIGO;
      f.step[i] = turn < 0.3 ? 2 : rr > 0.8 ? 2 : 3;
      if (rr < 0.14) f.step[i] = 1;
      return;
    }
    const band = (along > 5 && along < 7) || (along > len - 7 && along < len - 5);
    if (band) {
      f.pal[i] = CREAM;
      f.step[i] = clamp(f.step[i] - 1, 1, 4);
    }
    // Loose wool texture: short darker strokes along the roll.
    if (noise(along * 0.5, Math.atan2(q[1] - h, q[2]) * 6, 1.2, seed) > 0.8 && f.step[i] > 1) f.step[i] -= 1;
  });
}

function backpack(): WorldSprite {
  const W = 90, H = 100, ox = 45, oy = 84;
  const YAW = -0.38;
  GROUP = 1;
  const sc = new Scene();
  const Y = (tris: Tri[]) => rotY(tris, YAW);
  const W2 = (p: V3) => rotYp(p, YAW);
  const HB = 34;
  // The pack: a soft box that bulges, a little narrower at the top, leaning back.
  const lean = (h: number) => (h / HB) * 2.5;
  const body = sc.add(Y(loft([0, 2, 8, 16, 24, 30, HB].map((h, k) => sring(0, h, lean(h), 15 - (k === 0 ? 1.5 : 0) - h * 0.05 + Math.sin((h / HB) * Math.PI) * 1.4, 8.5 + Math.sin((h / HB) * Math.PI) * 1.6 - (k === 0 ? 1 : 0), 20)), { capStart: true, capEnd: true, smooth: true })), {
    pal: PACK, seed: 3401, contrast: 1.15, crest: false, ao: 2, bias: -0.12, shade: weaveShade(3402),
  });
  // The flap: leather over the top, hanging down the front with a rounded lower edge.
  const flapGrid: V3[][] = [];
  for (let i = 0; i <= 10; i++) {
    const v = i / 10;
    flapGrid.push(Array.from({ length: 13 }, (_, j) => {
      const u = j / 12;
      const x = -14.2 + u * 28.4;
      const edge = 1 - 0.35 * Math.pow(Math.abs(u - 0.5) * 2, 2.2);
      if (v < 0.35) {
        // Over the top, front to back.
        const t = v / 0.35;
        return [x, HB + 0.8 + Math.sin(t * Math.PI) * 0.8, lean(HB) - 9.6 + t * 9] as V3;
      }
      const t = (v - 0.35) / 0.65;
      const hh = HB + 0.6 - t * 17 * edge;
      return [x * (1 + 0.04 * t), hh, lean(hh) - 10.4 - Math.sin(t * Math.PI) * 0.6] as V3;
    }));
  }
  const flap = sc.add(Y(sheet(flapGrid.slice().reverse())), { pal: LEATHER, seed: 3403, contrast: 1.15, crest: false, twoSided: true, steps: [1, 2, 3, 4] });
  // A front pocket.
  const pocket = sc.add(Y(loft([2, 6, 12, 14].map((h) => sring(0, h, lean(h) - 9.6, 9 - (h > 13 ? 1 : 0), 2.4 + (h < 3 ? -0.8 : 0), 16)), { capStart: true, capEnd: true, smooth: true })), {
    pal: PACK, seed: 3404, contrast: 1.2, crest: false, shade: weaveShade(3405),
  });
  // The bedroll strapped across the top, sticking out past both sides.
  const RL = 46, RR = 7.2, RH = HB + 7.6;
  const roll = rollMesh(sc, (t) => Y(move(t, [0, 0, lean(HB) + 1])), RL, RR, RH, 3406);
  // Straps: two leather bands round the roll, two down the flap to buckles.
  const straps: Mesh[] = [];
  for (const sx of [-9, 9]) {
    const ringPts: V3[] = Array.from({ length: 14 }, (_, j) => {
      const a = (j / 14) * TAU;
      return [sx, RH + Math.sin(a) * (RR + 0.7), lean(HB) + 1 + Math.cos(a) * (RR + 0.7)] as V3;
    });
    straps.push(sc.add(Y(tube(ringPts, 0.9, 5, { closed: true })), { pal: LEATHER_DK, seed: 3410 + sx, crest: false, steps: [1, 2, 3, 4] }));
    const down: V3[] = [[sx, RH - RR, lean(HB) - 6], [sx, HB + 1.5, lean(HB) - 10.6], [sx, HB - 8, lean(HB - 8) - 11.2], [sx, HB - 15, lean(HB - 15) - 11.0], [sx, 13, lean(13) - 12.4]];
    straps.push(sc.add(Y(tube(down, [0.9, 0.9, 0.9, 0.9, 0.9], 5, { caps: true })), { pal: LEATHER_DK, seed: 3420 + sx, crest: false, steps: [1, 2, 3, 4] }));
  }
  // A tin cup hanging from the side on a cord.
  const cup = sc.add(Y(loft([ring(17.5, 8, 2, 2.6, 2.6, 10), ring(17.5, 13, 2, 3, 3, 10)], { capStart: true, capEnd: true, smooth: true })), { pal: POT, seed: 3430, contrast: 1.3, steps: [1, 2, 3, 4, 5] });
  const f = render(sc, W, H, ox, oy);
  paintRoll(f, roll.m, (p) => sub(rotYp(p, -YAW), [0, 0, lean(HB) + 1]), RL, RR, RH, 3407);
  // Flap: stitched border, a worn lighter centre.
  f.each(flap.id, (i) => {
    const [u, v] = [f.uv[i * 2], f.uv[i * 2 + 1]];
    if (v < 0.05 || u < 0.05 || u > 0.95) f.step[i] = Math.max(1, f.step[i] - 1);
    else if ((v < 0.11 || u < 0.11 || u > 0.89) && (Math.round(u * 40 + v * 30) % 3 === 0)) f.step[i] = Math.min(4, f.step[i] + 1);
  });
  f.each(pocket.id, (i) => {
    const p = rotYp(f.world(i), -YAW);
    if (Math.abs(p[1] - 11) < 0.6) f.step[i] = 1;
  });
  void body;
  void cup;
  const c = f.compose();
  c.outline();
  // Brass buckles on the flap straps and the cup's cord.
  const bits = layer(W, H, (cv) => {
    for (const sx of [-9, 9]) {
      const [bx, by] = f.px(W2([sx, HB - 11, lean(HB - 11) - 11.8]));
      const pix: [number, number, number][] = [[-1, 0, 4], [0, 0, 5], [1, 0, 3], [-1, 1, 3], [1, 1, 2], [-1, 2, 3], [0, 2, 2], [1, 2, 2]];
      for (const [dx, dy, st] of pix) cv.set(bx + dx, by + dy, C(GOLD, st));
    }
    const [cx, cy] = f.px(W2([16.5, 22, -1]));
    const [cx2, cy2] = f.px(W2([17.5, 13, -0.5]));
    cv.line(cx, cy, cx2, cy2, C(ROPE, 3));
  });
  c.draw(bits, 0, 0);
  return finish('backpack', 'Travel Pack', [0.75, 0.8], ['interactable'], { idle: { frames: [c], fps: 0 } }, ox, oy + 1);
}

function bedroll(): WorldSprite {
  const W = 90, H = 50, ox = 45, oy = 34;
  const YAW = -0.32;
  GROUP = 1;
  const sc = new Scene();
  const Y = (tris: Tri[]) => rotY(tris, YAW);
  const W2 = (p: V3) => rotYp(p, YAW);
  const RL = 54, RR = 8.6, RH = RR * 0.86;
  const roll = rollMesh(sc, Y, RL, RR, RH, 3450);
  // Two cord ties.
  const ties: Mesh[] = [];
  for (const sx of [-15, 15]) {
    const pts: V3[] = Array.from({ length: 14 }, (_, j) => {
      const a = (j / 14) * TAU;
      return [sx, RH + Math.sin(a) * (RR * 0.9 + 0.5), Math.cos(a) * (RR + 0.5)] as V3;
    });
    ties.push(sc.add(Y(tube(pts, 0.75, 5, { closed: true })), { pal: ROPE, seed: 3451 + sx, crest: false, steps: [1, 2, 3, 4] }));
  }
  const f = render(sc, W, H, ox, oy);
  paintRoll(f, roll.m, (p) => rotYp(p, -YAW), RL, RR, RH, 3452);
  for (const t of ties)
    f.each(t.id, (i, x) => {
      if (x % 2 === 0 && f.step[i] > 1) f.step[i] -= 1;
    });
  const c = f.compose();
  c.outline();
  // The cord's knot and two loose ends on top.
  const knot = layer(W, H, (cv) => {
    const [kx, ky] = f.px(W2([15, RH + RR * 0.9 + 0.6, -2]));
    const pix: [number, number, number][] = [[0, 0, 4], [1, 0, 3], [0, 1, 2], [1, 1, 2], [2, 1, 3], [3, 2, 2], [-1, 1, 3], [-2, 2, 2]];
    for (const [dx, dy, st] of pix) cv.set(kx + dx, ky + dy, C(ROPE, st));
  });
  c.draw(knot, 0, 0);
  return finish('bedroll', 'Bedroll', [1, 0.3], ['interactable'], { idle: { frames: [c], fps: 0 } }, ox, oy + 1);
}

// ================================================================================================
// SWORDS IN THE GROUND
// ================================================================================================

interface Katana {
  /** Ground point. */
  x: number;
  y: number;
  /** Lean in radians (positive tips the hilt to the right). */
  lean: number;
  /** Blade length above the ground, tsuka length (px). */
  blade: number;
  tsuka: number;
  /** Hilt wrap palette. */
  wrap: number;
  seed: number;
}

/**
 * A katana stuck point-down in the earth, painted pixel by pixel along its axis: the blade (lit flat,
 * dark spine, a pale hamon along the edge and a glint), the habaki collar, an oval iron tsuba seen at
 * a slant with a brass rim, the tsuka with its diamond wrap over pale same, and the kashira cap.
 */
function katana(cv: Canvas, k: Katana): void {
  const tl = Math.tan(k.lean);
  const S = (s: number) => C(STEEL, s);
  const total = k.blade + 2 + 2 + k.tsuka + 2;
  for (let d = 0; d <= total; d++) {
    const y = k.y - d;
    const cx = k.x + d * tl;
    const x = Math.round(cx);
    if (d < k.blade) {
      // Blade: 2 px, the lit flat on the left and the edge (with its pale hamon) on the right.
      const ham = Math.sin(d * 0.9 + k.seed) > 0.2;
      cv.set(x - 1, y, S(d % 7 === 3 ? 5 : 4));
      cv.set(x, y, ham ? S(3) : S(2));
      // Glint high on the flat.
      const g = Math.round(k.blade * 0.7);
      if (d === g || d === g + 1) cv.set(x - 1, y, hex('#ffffff'));
      if (d === g) cv.set(x, y, S(5));
    } else if (d < k.blade + 2) {
      // Habaki: a gold collar.
      for (let c = -1; c <= 1; c++) cv.set(x + c, y, C(GOLD, c < 0 ? 4 : c === 0 ? 3 : 2));
    } else if (d < k.blade + 4) {
      // Tsuba: an oval guard seen slanted, iron with a brass rim.
      const row = d - k.blade - 2;
      for (let c = -4; c <= 4; c++) cv.set(x + c, y, row === 0 ? C(IRON, Math.abs(c) === 4 ? 2 : c < 0 ? 3 : 2) : C(IRON, Math.abs(c) >= 3 ? 1 : c < 0 ? 2 : 1));
      cv.set(x - 4, y, C(GOLD, row === 0 ? 3 : 2));
      cv.set(x + 4, y, C(GOLD, 2));
    } else if (d < k.blade + 4 + k.tsuka) {
      // Tsuka: 3 px of dark wrap (lit on the left) with small pale diamonds of same down the middle.
      const r = d - k.blade - 4;
      const dia = r % 3 === 1;
      cv.set(x - 1, y, C(k.wrap, dia ? 3 : 4));
      cv.set(x, y, dia ? C(PAPER, 3) : C(k.wrap, 2));
      cv.set(x + 1, y, C(k.wrap, 1));
    } else {
      // Kashira: a dark cap with a lit edge.
      cv.set(x - 1, y, C(IRON, 3));
      cv.set(x, y, C(IRON, 2));
      cv.set(x + 1, y, C(IRON, 1));
    }
  }
}

/** Disturbed earth where a blade went in: a little mound with a dark slit. */
function soilMound(cv: Canvas, x: number, y: number, seed: number): void {
  const E = pal(ramp('#6b4d34', { shift: 12 }));
  void E;
  const D = (s: number) => PAL[DIRT_PAL][s];
  const pix: [number, number, number][] = [[-3, 0, 2], [-2, 0, 3], [-1, 0, 3], [0, 0, 1], [1, 0, 2], [2, 0, 2], [3, 0, 1], [-2, -1, 4], [-1, -1, 3], [1, -1, 3], [2, -1, 2], [-4, 1, 1], [-3, 1, 2], [-2, 1, 2], [-1, 1, 2], [0, 1, 1], [1, 1, 2], [2, 1, 1], [3, 1, 1], [4, 1, 1]];
  for (const [dx, dy, st] of pix) cv.set(x + dx, y + dy, D(st));
  if (hash(x, y, seed) > 0.5) cv.set(x - 5, y + 1, D(3));
}
const DIRT_PAL = pal(ramp('#6b4d34', { shift: 12 }));
const WRAP_BLACK = pal([hex('#08070b'), hex('#16141c'), hex('#22202b'), hex('#302d3b'), hex('#4a4658'), hex('#6c6880')]);
const WRAP_RED = pal(ramp('#8a2a2e', { shift: 10 }));

function swordStuck(): WorldSprite {
  const W = 40, H = 70, ox = 18, oy = 62;
  const c = layer(W, H, (cv) => {
    katana(cv, { x: ox, y: oy - 1, lean: 0.12, blade: 28, tsuka: 13, wrap: WRAP_BLACK, seed: 1 });
  });
  const ground = layer(W, H, (cv) => soilMound(cv, ox, oy, 3460));
  const out = new Canvas(W, H);
  out.draw(c, 0, 0);
  out.draw(ground, 0, 0);
  return finish('sword_stuck', 'Sword in the Ground', [0.2, 0.85], ['interactable'], { idle: { frames: [out], fps: 0 } }, ox, oy + 1);
}

function swordsPair(): WorldSprite {
  const W = 56, H = 70, ox = 28, oy = 62;
  const back = layer(W, H, (cv) => katana(cv, { x: ox + 7, y: oy - 2, lean: 0.1, blade: 27, tsuka: 13, wrap: WRAP_RED, seed: 2 }));
  const front = layer(W, H, (cv) => katana(cv, { x: ox - 5, y: oy, lean: -0.07, blade: 28, tsuka: 13, wrap: WRAP_BLACK, seed: 3 }));
  const ground = layer(W, H, (cv) => {
    soilMound(cv, ox + 7, oy - 1, 3461);
    soilMound(cv, ox - 5, oy + 1, 3462);
  });
  const out = new Canvas(W, H);
  out.draw(back, 0, 0);
  out.draw(front, 0, 0);
  out.draw(ground, 0, 0);
  return finish('swords_pair', 'Two Swords in the Ground', [0.45, 0.85], ['interactable'], { idle: { frames: [out], fps: 0 } }, ox, oy + 2);
}

// ================================================================================================
// STUMP WITH AXE, LOG SEAT, FIREWOOD
// ================================================================================================

/** Bark on a vertical trunk: furrows running up it every few px (dark grooves, lit ridge walls) and cross cracks. */
function barkVertical(f: Frame, mesh: Mesh, cx: number, cd: number, seed: number, toLocal: (p: V3) => V3 = (p) => p): void {
  f.each(mesh.id, (i) => {
    if (f.over[i]) return;
    const q = toLocal(f.world(i));
    const n = sub(toLocal(add(f.world(i), f.normal(i))), q);
    if (n[1] > 0.7) return;
    const ang = Math.atan2(q[2] - cd, q[0] - cx);
    const ph = (ang * 4.2) + (noise(ang * 3, q[1] / 9, 1, seed) - 0.5) * 2.2;
    const c = ((ph % 1) + 1) % 1;
    let st = f.step[i];
    if (c < 0.22) st = Math.max(1, st - 2);
    else if (c > 0.82 && st >= 2) st = Math.min(5, st + 1);
    if (((q[1] / 7 + hash(Math.floor(ph), 1, seed)) % 1) < 0.1 && c > 0.22) st = Math.max(1, st - 1);
    f.step[i] = st;
  });
}

/** Growth rings and radial checks on a cut face (centre cx, cd in local coords). */
function ringsOn(f: Frame, mesh: Mesh, center: V3, axis: V3, r: number, seed: number, toLocal: (p: V3) => V3 = (p) => p, minDot = 0.75): void {
  f.each(mesh.id, (i) => {
    const q = toLocal(f.world(i));
    const n = sub(toLocal(add(f.world(i), f.normal(i))), q);
    if (Math.abs(dot(n, axis)) < minDot) return;
    const rel = sub(q, center);
    const rad = len(sub(rel, mul(axis, dot(rel, axis))));
    const ref: V3 = Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit(cross(axis, ref)), w = cross(axis, u);
    const ang = Math.atan2(dot(rel, w), dot(rel, u));
    const rr = rad / r + (noise(ang * 3, rad, 2, seed) - 0.5) * 0.08;
    f.pal[i] = HEART;
    let st = rr > 0.9 ? 1 : rr < 0.18 ? 2 : 3;
    if (rr <= 0.9 && ((rr * r) / 2.3) % 1 < 0.28) st -= 1;
    if (rr <= 0.9 && rr > 0.18 && f.lightv[i] > 0.6 && ((rr * r) / 2.3) % 1 > 0.6) st += 1;
    // Radial checks (drying cracks).
    for (const ca of [0.4 + hash(1, 2, seed) * 2, 2.6 + hash(3, 4, seed), 4.6 + hash(5, 6, seed)])
      if (Math.abs(Math.atan2(Math.sin(ang - ca), Math.cos(ang - ca))) * rad < 0.6 && rr > 0.25 && rr < 0.85) st = 1;
    f.step[i] = clamp(st, 1, 5);
  });
}

function stumpAxe(): WorldSprite {
  const W = 90, H = 90, ox = 40, oy = 72;
  GROUP = 1;
  const sc = new Scene();
  const R0 = 15, HT = 27;
  // The stump: root flares at the foot, a slanted saw cut on top.
  const rings: V3[][] = [];
  const N = 22;
  for (const [h, rf, flare] of [[-1, 1.2, 0.8], [2, 1.12, 0.6], [6, 1.03, 0.3], [12, 0.98, 0.1], [20, 0.96, 0], [HT, 0.94, 0]] as [number, number, number][]) {
    rings.push(Array.from({ length: N }, (_, j) => {
      const a = (j / N) * TAU;
      const lobe = 1 + flare * 0.22 * Math.max(0, Math.cos(a * 4 + 0.7)) ** 2 + (rnd(3500, j, 1) - 0.5) * 0.03;
      const hh = h === HT ? HT + Math.cos(a) * 2.2 + Math.sin(a) * 1.2 : h;
      return [Math.cos(a) * R0 * rf * lobe, hh, Math.sin(a) * R0 * rf * lobe * 0.95] as V3;
    }));
  }
  const top: V3 = [0, HT + 0.3, 0];
  const stump = sc.add(loft(rings, { capEnd: top, smooth: false }), { pal: BARK, seed: 3501, contrast: 1.1, facetVar: 0.03, ao: 2, crest: false });
  // The axe: head buried in the cut, the haft rising to the right.
  const headC: V3 = [-2, HT + 1, -1];
  const hAx = unit([0.62, 0.78, -0.08]);
  const haftEnd = add(headC, mul(hAx, 40));
  const haft = sc.add(tube([add(headC, mul(hAx, 2)), add(headC, mul(hAx, 20)), add(add(headC, mul(hAx, 34)), [1.5, -0.5, 0]), add(haftEnd, [2, -1.5, 0])], [1.6, 1.45, 1.45, 1.8], 7, { caps: true }), { pal: WOOD, seed: 3502, contrast: 1.15, facetVar: 0, steps: [1, 2, 3, 4] });
  // Head: a wedge whose blade is in the wood; the poll and cheeks show above the cut.
  const perp = unit(cross(hAx, [0, 0, 1]));
  const headPts: [number, number][] = [[-4, -1.5], [6, -3.4], [7.5, 3.6], [-4, 1.5]];
  const head = sc.add(
    loft(
      [-1.4, 1.4].map((dz) => headPts.map(([a, b]) => add(add(add(headC, mul(perp, a)), mul(hAx, b)), [0, 0, dz]) as V3)),
      { capStart: true, capEnd: true },
    ),
    { pal: IRON, seed: 3503, contrast: 1.3, steps: [1, 2, 3, 4, 5], crest: true },
  );
  const f = render(sc, W, H, ox, oy);
  barkVertical(f, stump, 0, 0, 3504);
  ringsOn(f, stump, [0, HT, 0], [0, 1, 0], R0 * 0.93, 3505, (p) => p, 0.6);
  grain(f, haft, headC, haftEnd, 3506);
  // The split where the blade went in: a dark line across the cut, fresh pale wood beside it.
  f.each(stump.id, (i, x, y) => {
    const q = f.world(i);
    const n = f.normal(i);
    if (n[1] < 0.6) return;
    const rel = sub(q, headC);
    const along = dot(rel, perp);
    const across = rel[2];
    if (Math.abs(across) < 0.8 && along > -9 && along < 7) {
      f.pal[i] = HEART;
      f.step[i] = 1;
    } else if (Math.abs(across) < 2 && along > -7 && along < 5 && hash(x, y, 3507) < 0.5) {
      f.pal[i] = HEART;
      f.step[i] = 4;
    }
  });
  // Moss creeping up the shaded back of the stump.
  f.each(stump.id, (i, x, y) => {
    const q = f.world(i);
    const n = f.normal(i);
    if (n[1] > 0.5 || f.pal[i] !== BARK) return;
    const m_ = fbm(x, y, 6, 2, 3508) + (n[0] > 0.3 ? 0.2 : 0) + (q[1] < 8 ? 0.15 : 0);
    if (m_ > 0.78) {
      f.pal[i] = MOSS;
      f.step[i] = clamp(f.step[i] + (noise(x, y, 1.5, 3509) > 0.5 ? 1 : 0), 1, 4);
    }
  });
  void head;
  const c = f.compose();
  c.outline();
  return finish('stump_axe', 'Stump with Axe', [0.6, 0.95], ['cover-half', 'interactable'], { idle: { frames: [c], fps: 0 } }, ox, oy + 1);
}

function logSeat(): WorldSprite {
  const W = 120, H = 60, ox = 60, oy = 44;
  const YAW = -0.2;
  GROUP = 1;
  const sc = new Scene();
  const Y = (tris: Tri[]) => rotY(tris, YAW);
  const LL = 92, RAD = 11;
  const path: V3[] = [];
  const radii: number[] = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    path.push([-LL / 2 + t * LL, RAD * 0.92 + Math.sin(t * Math.PI) * 0.6, Math.sin(t * Math.PI * 1.3) * 2]);
    radii.push(RAD * (1.06 - 0.12 * t) * (1 + (rnd(3520, k) - 0.5) * 0.05));
  }
  const log = sc.add(Y(tube(path, radii, 16, { caps: true, wob: 0.05, seed: 3521 })), { pal: BARK, seed: 3522, contrast: 1.15, facetVar: 0, ao: 2, crest: false });
  // A broken branch stub on top.
  const stub = sc.add(Y(tube([[10, RAD * 1.5, -3], [14, RAD * 2 + 2, -2], [17, RAD * 2 + 5, -1]], [3.8, 3.2, 2.9], 9, { caps: true })), { pal: BARK, seed: 3523, contrast: 1.1, crest: false });
  const f = render(sc, W, H, ox, oy);
  const toLocal = (p: V3) => rotYp(p, -YAW);
  // Bark: furrows running along the log, cross cracks between plates.
  f.each(log.id, (i) => {
    const q = toLocal(f.world(i));
    const n = sub(toLocal(add(f.world(i), f.normal(i))), q);
    if (Math.abs(n[0]) > 0.75) return;
    const ang = Math.atan2(q[1] - RAD * 0.92, q[2]);
    const ph = ang * 5 + (noise(q[0] / 10, ang * 2, 1, 3524) - 0.5) * 2.4;
    const c = ((ph % 1) + 1) % 1;
    let st = f.step[i];
    if (c < 0.24) st = Math.max(1, st - 2);
    else if (c > 0.8) st = Math.min(5, st + 1);
    if (((q[0] / 8 + hash(Math.floor(ph), 1, 3525)) % 1) < 0.1 && c > 0.24) st = Math.max(1, st - 1);
    f.step[i] = st;
  });
  ringsOn(f, log, [LL / 2, path[8][1], path[8][2]], [1, 0, 0], radii[8], 3526, toLocal, 0.75);
  ringsOn(f, log, [-LL / 2, path[0][1], path[0][2]], [1, 0, 0], radii[0], 3527, toLocal, 0.75);
  ringsOn(f, stub, [17, RAD * 2 + 5, -1], unit([0.6, 0.75, 0.2]), 2.9, 3528, toLocal, 0.7);
  // Moss on the upper back, a worn seat on top.
  f.each(log.id, (i, x, y) => {
    if (f.pal[i] !== BARK) return;
    const q = toLocal(f.world(i));
    const n = sub(toLocal(add(f.world(i), f.normal(i))), q);
    if (n[1] > 0.55 && Math.abs(q[0]) < 20) {
      f.pal[i] = WOOD_DK;
      f.step[i] = clamp(f.step[i], 2, 4);
      return;
    }
    if (n[1] > 0.1 && fbm(x, y, 7, 2, 3529) > 0.62) {
      f.pal[i] = MOSS;
      f.step[i] = clamp(f.step[i] + (noise(x, y, 1.6, 3530) > 0.5 ? 1 : 0), 1, 4);
    }
  });
  const c = f.compose();
  c.outline();
  return finish('log_seat', 'Log Seat', [1.6, 0.45], ['cover-half', 'interactable'], { idle: { frames: [c], fps: 0 } }, ox, oy + 1);
}

/** A split quarter log along X: the round bark back and the two pale split faces. */
function splitLog(x0: number, x1: number, cd: number, ch: number, r: number, rot: number): Tri[] {
  const poly: [number, number][] = [[0, 0]];
  for (let k = 0; k <= 6; k++) {
    const a = rot + (k / 6) * (Math.PI / 2);
    poly.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const pts = poly.map(([d, h]) => [cd + d, ch + h] as [number, number]);
  return extrudeDH(pts, x0, x1);
}

function firewood(): WorldSprite {
  const W = 90, H = 60, ox = 45, oy = 46;
  const YAW = -0.55;
  GROUP = 1;
  const sc = new Scene();
  const Y = (tris: Tri[]) => rotY(tris, YAW);
  const pieces: { m: Mesh; kind: 'round' | 'split'; c: V3; r: number }[] = [];
  const LW = 42;
  const round = (cd: number, h: number, r: number, dx: number, seed: number) => {
    const m_ = sc.add(Y(pole([-LW / 2 + dx, h, cd], [LW / 2 + dx, h, cd], r, 12, { wob: 0.08, seed })), { pal: BARK, seed, contrast: 1.15, facetVar: 0, crest: false });
    pieces.push({ m: m_, kind: 'round', c: [LW / 2 + dx, h, cd], r });
  };
  const split = (cd: number, h: number, r: number, rot: number, dx: number, seed: number) => {
    const m_ = sc.add(Y(splitLog(-LW / 2 + dx, LW / 2 + dx, cd, h, r, rot)), { pal: BARK, seed, contrast: 1.15, facetVar: 0.03, crest: true });
    pieces.push({ m: m_, kind: 'split', c: [LW / 2 + dx, h, cd], r });
  };
  // Bottom row of rounds, then split quarters stacked crosswise in the hollows.
  round(-11, 5.2, 5.2, 0, 3540);
  round(0, 5.4, 5.4, 1.5, 3541);
  round(11, 5, 5, -1, 3542);
  split(-6, 10, 9.5, 0.2, 2, 3543);
  split(6, 10.5, 9, 1.1, -1.5, 3544);
  split(0, 19, 8.5, 0.6, 0.5, 3545);
  const f = render(sc, W, H, ox, oy);
  const toLocal = (p: V3) => rotYp(p, -YAW);
  for (const pc of pieces) {
    f.each(pc.m.id, (i, x, y) => {
      const q = toLocal(f.world(i));
      const n = sub(toLocal(add(f.world(i), f.normal(i))), q);
      if (Math.abs(n[0]) > 0.7) {
        // Cut ends: pale end grain with rings (rounds) or straight grain lines (splits).
        f.pal[i] = HEART;
        if (pc.kind === 'round') {
          const rr = Math.hypot(q[1] - pc.c[1], q[2] - pc.c[2]) / pc.r;
          f.step[i] = rr > 0.86 ? 1 : (rr * pc.r / 1.8) % 1 < 0.3 ? 2 : 3;
          if (rr < 0.2) f.step[i] = 2;
        } else f.step[i] = noise(x, y, 1.5, 3546) > 0.6 ? 2 : 3;
        return;
      }
      const isBark = pc.kind === 'round' || Math.hypot(q[1] - pc.c[1], q[2] - pc.c[2]) > pc.r * 0.92;
      if (!isBark) {
        // Split faces: pale wood with long grain streaks.
        f.pal[i] = HEART;
        f.step[i] = clamp(f.step[i] + (noise(q[0] / 9, (q[1] + q[2]) * 1.3, 1, 3547) > 0.72 ? -1 : 0), 1, 4);
      } else if (noise(q[0] / 6, Math.atan2(q[1] - pc.c[1], q[2] - pc.c[2]) * 3, 1, 3548) > 0.7 && f.step[i] > 1) f.step[i] -= 1;
    });
  }
  const c = f.compose();
  c.outline();
  return finish('firewood', 'Firewood Stack', [0.85, 0.5], ['flammable', 'interactable'], { idle: { frames: [c], fps: 0 } }, ox, oy + 1);
}

// ================================================================================================
// COOKING TRIPOD
// ================================================================================================

function cookingTripod(): WorldSprite {
  const W = 110, H = 130, ox = 55, oy = 100;
  const n = 6;
  const APEX: V3 = [0, 80, 2];
  const feet: V3[] = [[-30, 0, -16], [29, 0, -18], [3, 0, 32]];
  const potH = 30, potR = 11;
  const frames: Canvas[] = [];
  for (let t = 0; t < n; t++) {
    GROUP = 1;
    const sc = new Scene();
    const legs = feet.map((ft, k) => {
      const tip = add(APEX, mul(sub(APEX, ft), 0.1));
      return { m: sc.add(pole(ft, tip, 1.8, 8, { r2: 1.4 }), { pal: WOOD_DK, seed: 3560 + k, contrast: 1.12, facetVar: 0, steps: [1, 2, 3, 4] }), a: ft, b: tip };
    });
    // The pot: an iron belly with a rolled rim, open, a stew inside.
    const prof: [number, number][] = [[potH - 12, potR * 0.62], [potH - 10.5, potR * 0.9], [potH - 7, potR], [potH - 2, potR * 0.96], [potH, potR * 0.9], [potH + 0.8, potR * 0.98], [potH + 1.6, potR * 0.94]];
    const pot = sc.add(loft(prof.map(([h, r]) => ring(0, h, 0, r, r, 18)), { capStart: true, smooth: true }), { pal: POT, seed: 3570, contrast: 1.25, steps: [1, 2, 3, 4, 5], crest: false });
    const inner = sc.add(loft([ring(0, potH + 1.4, 0, potR * 0.86, potR * 0.86, 18), ring(0, potH - 3, 0, potR * 0.84, potR * 0.84, 18)], { smooth: true, inward: true }), { pal: POT, seed: 3571, steps: [0, 1, 1, 2], castShadow: false });
    const stew = sc.add(disc(0, potH - 2.4, 0, potR * 0.85, potR * 0.85, 18), { pal: LEATHER, seed: 3572, steps: [2, 3, 3, 4], castShadow: false, crest: false });
    const f = render(sc, W, H, ox, oy);
    for (const lg of legs) grain(f, lg.m, lg.a, lg.b, 3580 + lg.m.id, { knots: 0.4 });
    // Stew: bubbles and bits of vegetable, a shine that moves.
    f.each(stew.id, (i, x, y) => {
      const b = hash(x, y, 3573 + (t >> 1));
      if (b > 0.9) f.step[i] = 5;
      else if (b < 0.12) {
        f.pal[i] = HEART;
        f.step[i] = 3;
      } else if (b < 0.2) {
        f.pal[i] = LEAF;
        f.step[i] = 2;
      }
    });
    // Soot on the pot's lower belly.
    f.each(pot.id, (i, x, y) => {
      const q = f.world(i);
      if (q[1] < potH - 7 && noise(x, y, 1.6, 3574) > 0.45) f.step[i] = Math.max(1, f.step[i] - 1);
    });
    void inner;
    const c = f.compose();
    c.outline();
    // Rope lashing at the apex, the chain down to the bail, and the bail wire.
    const bits = layer(W, H, (cv) => {
      const [ax, ay] = f.px(APEX);
      const wrap: [number, number, number][] = [[-2, -1, 4], [-1, -1, 4], [0, -1, 3], [1, -1, 3], [2, -1, 2], [-2, 0, 3], [-1, 0, 4], [0, 0, 3], [1, 0, 2], [2, 0, 2], [-1, 1, 3], [0, 1, 2], [1, 1, 1], [-1, 2, 2], [-2, 3, 2], [-2, 4, 1]];
      for (const [dx, dy, st] of wrap) cv.set(ax + dx, ay + dy, C(ROPE, st));
      const [, by] = f.px([0, potH + 9, 0]);
      for (let y = ay + 2; y <= by; y++) {
        const link = (y - ay) % 3;
        cv.set(ax, y, C(IRON, link === 0 ? 4 : 2));
        if (link === 1) cv.set(ax + 1, y, C(IRON, 1));
      }
      // Hook and bail.
      cv.set(ax - 1, by, C(IRON, 3));
      cv.set(ax - 1, by + 1, C(IRON, 2));
      for (let k = 0; k <= 24; k++) {
        const a = Math.PI * (k / 24);
        const [bx, byy] = f.px([-Math.cos(a) * potR * 0.98, potH + 1 + Math.sin(a) * 8.5, 0]);
        cv.set(bx, byy, C(IRON, k < 12 ? 3 : 2));
      }
    });
    c.draw(bits, 0, 0);
    // Steam curling up from the stew.
    for (let k = 0; k < 3; k++) {
      const [sx, sy] = f.px([(k - 1) * 5, potH, -2]);
      for (let j = 0; j < 22; j++) {
        const ph = ((t / n) + k * 0.33) % 1;
        const yy = sy - 2 - j;
        const s_ = j / 22;
        const xx = sx + Math.sin(s_ * 7 - ph * TAU + k) * (0.5 + s_ * 2.2) + s_ * 3;
        const a = 120 * (1 - s_) * (j < 2 ? 0.6 : 1) * (0.6 + 0.4 * Math.sin(ph * TAU + j * 0.4));
        if (a > 25) c.plot(Math.round(xx), yy, withAlpha(SMOKE_R[4], a));
      }
    }
    frames.push(c);
  }
  // Anchor: the ground point under the pot (the fire's centre).
  return finish('cooking_tripod', 'Cooking Tripod', [1.1, 1.45], ['interactable'], { idle: { frames, fps: 6 } }, ox, oy);
}

// ================================================================================================
// FERN CLUMP
// ================================================================================================

function fernClump(): WorldSprite {
  const W = 80, H = 50, ox = 40, oy = 42;
  const frames: Canvas[] = [];
  const NF = 7;
  for (let t = 0; t < 4; t++) {
    const sway = [0, 1, 0, -1][t];
    const cv = new Canvas(W, H);
    // Fronds back to front (the middle ones stand up behind, the side ones arch out in front); each
    // frond is its own outlined layer so it reads as one shape against the ones behind it.
    const order = Array.from({ length: NF }, (_, j) => j).sort((a, b) => Math.abs(a - (NF - 1) / 2) - Math.abs(b - (NF - 1) / 2));
    for (const j of order) {
      const side = (j - (NF - 1) / 2) / ((NF - 1) / 2);
      const ang = -Math.PI / 2 + side * 1.2 + (rnd(3600, j) - 0.5) * 0.16;
      const Lf = 25 + rnd(3600, j, 2) * 7 - Math.abs(side) * 3;
      const curl = 0.42 + Math.abs(side) * 0.4;
      const back = Math.abs(side) < 0.4;
      const P = back ? LEAF_D : LEAF;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const pts: [number, number][] = [];
      const steps = Math.round(Lf / 1.35);
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        pts.push([ox + dx * Lf * u + sway * u * u * (1 + Math.abs(side)), oy - 1 + dy * Lf * u + curl * Lf * u * u]);
      }
      const fr = layer(W, H, (lc) => {
        // Leaflets: solid little blades in pairs, longest a third of the way out; the upper ones
        // catch the light (upper left), the lower ones stay in shade. The rachis runs down the middle.
        for (let i = 2; i < pts.length - 1; i += 2) {
          const u = i / steps;
          const [ax, ay] = pts[i];
          const tx = pts[i + 1][0] - pts[i - 1][0], ty = pts[i + 1][1] - pts[i - 1][1];
          const tl = Math.hypot(tx, ty) || 1;
          const ll = 1.4 + 4.2 * Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.08)) ** 0.75 * (1 - 0.4 * u);
          for (const sgn of [-1, 1]) {
            const lx = (-ty / tl) * sgn + (tx / tl) * 0.55, ly = (tx / tl) * sgn + (ty / tl) * 0.55;
            const ln = Math.hypot(lx, ly);
            const up = -(ly / ln) * 0.8 - (lx / ln) * 0.5;
            const st = (back ? 2 : 3) + (up > 0.2 ? 1 : up < -0.25 ? -1 : 0);
            for (let k = 0; k <= Math.ceil(ll); k++) {
              const q = Math.min(1, k / ll);
              const ex = ax + (lx / ln) * ll * q, ey = ay + (ly / ln) * ll * q;
              lc.set(Math.round(ex), Math.round(ey), C(P, k === Math.ceil(ll) && up > 0.2 ? Math.min(5, st + 1) : st));
            }
          }
        }
        for (let i = 0; i < pts.length - 1; i++) lc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], C(P, back ? 1 : 2));
      });
      cv.draw(fr, 0, 0);
    }
    // Young curled fiddleheads at the heart of the clump.
    const fh = layer(W, H, (lc) => {
      for (const [fx, fy] of [[ox - 3, oy - 7], [ox + 3, oy - 6]]) {
        lc.set(fx, fy, C(LEAF, 4));
        lc.set(fx + 1, fy, C(LEAF, 4));
        lc.set(fx + 1, fy + 1, C(LEAF, 3));
        lc.set(fx, fy + 1, C(LEAF, 2));
        lc.set(fx, fy + 2, C(LEAF, 3));
        lc.set(fx, fy + 3, C(LEAF, 2));
      }
    });
    cv.draw(fh, 0, 0);
    frames.push(cv);
  }
  return finish('fern_clump', 'Fern Clump', [0.95, 0.55], ['ambient', 'hide-spot'], { idle: { frames, fps: 5 } }, ox, oy);
}

// ================================================================================================
// LARGE CAMPFIRE
// ================================================================================================

/** Bright sparks: 1-2 px, some with a short trail, rising faster than embers and winking out. */
function sparks(c: Canvas, cx: number, by: number, f: number, n: number, count: number, rise: number, spread: number, seed: number): void {
  for (let j = 0; j < count; j++) {
    const speed = 1 + (rnd(seed, j, 1) < 0.4 ? 1 : 0);
    const p = ((f / n) * speed + rnd(seed, j, 2)) % 1;
    if (p > 0.85) continue;
    const x0 = cx + (rnd(seed, j, 3) - 0.5) * spread;
    const drift = (rnd(seed, j, 5) - 0.35) * 14;
    const x = x0 + drift * p * p + Math.sin(p * TAU * 1.5 + j) * 1.8;
    const y = by - p * rise;
    const col = p < 0.25 ? WHITE_HOT : p < 0.5 ? FIRE_R[5] : p < 0.7 ? FIRE_R[4] : FIRE_R[2];
    c.set(Math.round(x), Math.round(y), col);
    if (p < 0.45 && rnd(seed, j, 4) < 0.55) c.set(Math.round(x - drift * 0.04), Math.round(y) + 1, p < 0.25 ? FIRE_R[4] : FIRE_R[3]);
  }
}

function campfireLarge(): WorldSprite {
  const W = 150, H = 180, ox = 75, oy = 128;
  const RING = 34;
  const N = 15;
  const stones = Array.from({ length: N }, (_, k) => {
    const a = (k / N) * TAU + 0.1 + (rnd(3700, k) - 0.5) * 0.16;
    const rr = RING * (0.97 + rnd(3700, k, 2) * 0.07);
    const front = Math.sin(a) < -0.3;
    const rx = 6.6 + rnd(3700, k, 3) * 2.6 + (front ? 0.8 : 0);
    return { a, cx: Math.cos(a) * rr, cd: Math.sin(a) * rr, rx, h: 6.5 + rnd(3700, k, 4) * 3.5, seed: 3710 + k, warm: rnd(3700, k, 5) < 0.35 };
  });
  type State = 'burning' | 'smoldering' | 'out';
  const FIRE_C: V3 = [0, 18, 0];
  const frame = (state: State, fi: number, n: number): Canvas => {
    GROUP = 1;
    const sc = new Scene();
    const ph = (fi / n) * TAU;
    const flick = state === 'burning' ? 1 + 0.12 * Math.sin(ph * 2) + 0.06 * Math.sin(ph * 3 + 1) : state === 'smoldering' ? 0.85 + 0.15 * Math.sin(ph) : 0;
    const ash = sc.add(loft([ring(0, -0.5, 0, 31, 31, 22), ring(0, 1.4, 0, 25, 25, 22, { jit: 0.07, seed: 4 }), ring(0, 2.6, 0, 14, 14, 22, { jit: 0.1, seed: 5 })], { capEnd: [0, 3.3, 0], smooth: true }), {
      pal: ASH, seed: 3701, steps: [1, 2, 2, 3], castShadow: false, crest: false,
    });
    const rocks = stones.map((st) =>
      sc.add(rockMesh({ cx: st.cx, cd: st.cd, rx: st.rx, rd: st.rx * 0.8, h: st.h, h0: -1, n: 7, seed: st.seed, profile: [[0, 0.92], [0.42, 1], [0.84, 0.66]], jit: 0.15, apexUp: 0.06, rot: st.a }), {
        pal: st.warm ? STONE_W : STONE, seed: st.seed, contrast: 1.15, facetVar: 0.07, ao: 2, tex: 0.04, texCell: 5, form: 0.2,
      }),
    );
    // Crossed logs: two big ones in an X on the bed, two leaning in over them, one short behind.
    const k = state === 'out' ? 0.72 : state === 'smoldering' ? 0.88 : 1;
    const specs: { a: V3; b: V3; r: number; seed: number }[] = [
      { a: [-27 * k, 3.5, 12 * k], b: [26 * k, 4, -11 * k], r: 4.4, seed: 3720 },
      { a: [-24 * k, 4, -13 * k], b: [26 * k, state === 'out' ? 7 : 12, 13 * k], r: 4.2, seed: 3721 },
      { a: [-15 * k, 3, 20 * k], b: [14 * k, 5, 21 * k], r: 3.4, seed: 3722 },
      ...(state === 'out' ? [] : [
        { a: [-16, 4, -6], b: [-2, 20 * k, 1], r: 3, seed: 3723 },
        { a: [15, 4, -7], b: [2, 19 * k, 2], r: 2.9, seed: 3724 },
      ]),
    ];
    const logs = specs.map((L) => {
      const path: V3[] = [L.a, add(lerp3(L.a, L.b, 0.33), [0, 0.4, 0]), add(lerp3(L.a, L.b, 0.66), [0, 0.3, 0]), L.b];
      return sc.add(tube(path, L.r, 10, { caps: true, seed: L.seed, wob: 0.12 }), { pal: BARK, seed: L.seed, contrast: 1.1, facetVar: 0 });
    });
    const f2 = render(sc, W, H, ox, oy);
    specs.forEach((L, li) => {
      const ax = unit(sub(L.b, L.a));
      const T = len(sub(L.b, L.a));
      const uu = unit(cross(ax, [0, 1, 0]));
      const ww = cross(uu, ax);
      const tc = clamp(dot(sub([0, 0, 0], L.a), ax) / T, 0, 1);
      f2.each(logs[li].id, (i, x, y) => {
        const p = f2.world(i), nn = f2.normal(i);
        const rel = sub(p, L.a);
        const along = dot(rel, ax);
        const t = along / T;
        const radial = sub(rel, mul(ax, along));
        const ang = Math.atan2(dot(radial, ww), dot(radial, uu));
        const capN = Math.abs(dot(nn, ax));
        const reach = state === 'out' ? 0.62 : state === 'smoldering' ? 0.48 : 0.4;
        const ch = 1 - smooth(reach - 0.14, reach + 0.08, Math.abs(t - tc));
        if (capN > 0.8) {
          const rd = len(radial) / L.r;
          if (ch > 0.5 || state === 'out') {
            f2.pal[i] = CHAR;
            f2.step[i] = rd < 0.45 ? 2 : rd < 0.8 ? 3 : 2;
          } else {
            f2.pal[i] = HEART;
            f2.step[i] = rd < 0.25 ? 2 : (rd * L.r / 1.6) % 1 < 0.3 ? 2 : rd < 0.84 ? 3 : 1;
          }
          return;
        }
        let st = f2.step[i];
        // Bark furrows along the log.
        const ph2 = ang * 4 + (noise(along / 9, ang * 2, 1, L.seed) - 0.5) * 2.2;
        const cc = ((ph2 % 1) + 1) % 1;
        if (cc < 0.22) st = Math.max(1, st - 1);
        else if (cc > 0.82 && st >= 3) st = Math.min(4, st + 1);
        if (ch > 0.55) {
          // Charcoal: rings of cracks part-way round, the odd split along; some cracks glow.
          const aj = along + (noise(ang * 1.5, along / 6, 1, L.seed + 3) - 0.5) * 2.4;
          const cellA = 5.6;
          const ringK = Math.floor(aj / cellA + 0.5);
          const fa = frac(aj / cellA);
          const arc0 = hash(ringK, li, 11) * TAU, arcLen = 1.4 + hash(ringK, li, 12) * 2.2;
          const inArc = ((ang - arc0 + TAU * 2) % TAU) < arcLen;
          const ringCrack = Math.min(fa, 1 - fa) * cellA < 0.55 && inArc;
          const splitA = hash(Math.floor(aj / cellA), li, 13) * TAU;
          const split = Math.abs(Math.atan2(Math.sin(ang - splitA), Math.cos(ang - splitA))) * L.r < 0.5 && hash(Math.floor(aj / cellA), li, 14) < 0.45;
          const crack = ringCrack || split;
          f2.pal[i] = CHAR;
          st = crack ? 1 : clamp(st + 1, 2, 4);
          const cellId = ringK * 7 + (split ? 3 : 0);
          if (crack && state !== 'out' && hash(cellId, li, 9) < (state === 'burning' ? 0.7 : 0.72)) {
            const up = dot(nn, [0, 1, 0]);
            const pulse = 0.5 + 0.5 * Math.sin(ph * (state === 'burning' ? 2 : 1) + hash(cellId, li, 10) * TAU);
            const g = (state === 'burning' ? 1.5 : 1.25) * (0.5 + 0.5 * pulse) * (0.5 + 0.5 * up) * ch;
            if (g > 0.45) f2.over[i] = g > 1.2 ? FIRE_R[4] : g > 0.9 ? FIRE_R[3] : g > 0.65 ? FIRE_R[2] : FIRE_R[1];
          }
        } else if (ch > 0.2) {
          f2.pal[i] = SINGED;
          if (noise(x, y, 1.6, L.seed + 5) > 0.62) {
            f2.pal[i] = CHAR;
            st = Math.min(st, 3);
          }
        }
        f2.step[i] = st;
      });
    });
    // Stones: soot on the faces turned to the fire, a crack or two, lichen on the outer tops.
    stones.forEach((st, si) => {
      f2.each(rocks[si].id, (i, x, y) => {
        if (f2.over[i]) return;
        const p = f2.world(i), nn = f2.normal(i);
        const toC = unit([-p[0], 0, -p[2]]);
        const facing = nn[0] * toC[0] + nn[2] * toC[2];
        if (facing > 0.25 && noise(x, y, 2, st.seed + 1) > 0.35) f2.step[i] = Math.max(1, f2.step[i] - 1);
        if (facing < -0.3 && nn[1] > 0.4 && noise(x, y, 1.6, st.seed + 2) > 0.74) {
          f2.pal[i] = MOSS;
          f2.step[i] = clamp(f2.step[i], 2, 4);
        }
      });
      if (st.cd < -10 && si % 3 === 0) {
        const [sx, sy] = f2.px([st.cx, st.h * 0.5, st.cd - st.rx * 0.6]);
        paintCrack(f2, [[sx - 2, sy - 2], [sx - 1, sy], [sx, sy + 1], [sx + 2, sy + 2]], [rocks[si].id]);
      }
    });
    // Ash bed: charcoal chunks and coals that glow toward the middle.
    f2.each(ash.id, (i, x, y) => {
      if (f2.over[i]) return;
      const p = f2.world(i);
      const r = Math.hypot(p[0], p[2]);
      const nz = noise(x * 0.8, y * 1.2, 1.7, 3730);
      if (nz > 0.64) {
        f2.pal[i] = CHAR;
        f2.step[i] = nz > 0.8 ? 3 : 2;
        if (state !== 'out' && r < 24) {
          const pulse = 0.5 + 0.5 * Math.sin(ph + hash(x >> 2, y >> 1, 3731) * TAU);
          const g = (state === 'burning' ? 1.4 : 1.15) * (1.1 - r / 25) * (0.55 + 0.45 * pulse) * (nz > 0.76 ? 1.2 : 0.8);
          if (g > 0.32) f2.over[i] = g > 0.95 ? FIRE_R[4] : g > 0.62 ? FIRE_R[3] : g > 0.45 ? FIRE_R[2] : FIRE_R[1];
        }
      } else if (nz < 0.2 && state !== 'out') f2.step[i] = 3;
    });
    // Warm light from the flames on everything that faces them.
    if (state !== 'out') {
      const src: V3 = state === 'burning' ? FIRE_C : [0, 5, 0];
      const reach = state === 'burning' ? 48 : 30;
      const kk = state === 'burning' ? 1.2 * flick : 0.55 * flick;
      for (let i = 0; i < W * H; i++) {
        if (f2.mesh[i] < 0 || f2.over[i]) continue;
        const p = f2.world(i), nn = f2.normal(i);
        const d = sub(src, p);
        const dist = len(d);
        const ndl = Math.max(0, dot(nn, mul(d, 1 / dist)));
        f2.warm[i] = ndl * clamp(1.3 - dist / reach, 0, 1) * kk;
      }
    }
    const c = f2.compose();
    c.outline();
    if (state === 'burning') {
      // Layered flame: a tall white-yellow heart, orange body, red licking tips, side tongues.
      flames(c, ox, oy - 5, fi, n, [
        { x: 0, h: 60, w: 9, ph: 0, amp: 3, k: 1.05 },
        { x: -9, h: 44, w: 6.5, ph: 2.1, amp: 2.6, k: 0.86 },
        { x: 10, h: 48, w: 6.5, ph: 4.2, amp: 2.6, k: 0.88 },
        { x: -18, h: 26, w: 4.6, ph: 1.3, amp: 1.6, k: 0.68 },
        { x: 19, h: 30, w: 4.6, ph: 3.3, amp: 1.6, k: 0.7 },
        { x: -4, h: 34, w: 5, ph: 5.1, amp: 2, k: 0.8 },
        { x: 5, h: 22, w: 4, ph: 0.7, amp: 1.4, k: 0.72 },
      ], { lean: 0.03, seed: 3740 });
      embers(c, ox, oy - 40, fi, n, 12, 46, 26, 3741);
      sparks(c, ox, oy - 50, fi, n, 10, 64, 20, 3742);
    } else if (state === 'smoldering') {
      wisp(c, ox + 1, oy - 8, fi, n, 60, 3, 150);
      wisp(c, ox - 6, oy - 6, fi, n, 44, 9, 110);
    }
    // The front stones and the near log ends back over the flames' base.
    if (state === 'burning') {
      const front = (i: number) => {
        const mi = f2.mesh[i];
        if (mi < 0) return false;
        if (rocks.some((r) => r.id === mi)) return f2.world(i)[2] < -10;
        if (logs.some((l) => l.id === mi)) return f2.world(i)[2] < -11;
        return false;
      };
      const fr = f2.compose(front);
      fr.outline();
      blit(c, fr);
    }
    return c;
  };
  const burning = Array.from({ length: 10 }, (_, fi) => frame('burning', fi, 10));
  const smoldering = Array.from({ length: 6 }, (_, fi) => frame('smoldering', fi, 6));
  const out = [frame('out', 0, 1)];
  // Anchor: the ground point at the ring's centre (where the tripod and smoke stand too).
  return finish('campfire_large', 'Large Campfire', [1.4, 1.5], ['light-source', 'interactable'], { burning: { frames: burning, fps: 12 }, smoldering: { frames: smoldering, fps: 6 }, out: { frames: out, fps: 0 } }, ox, oy);
}

// ================================================================================================
// TALL SMOKE COLUMN
// ================================================================================================

function smokeTall(): WorldSprite {
  const W = 110, H = 230, gx = 40, gy = 224;
  const n = 10;
  const RISE = 196;
  const frames: Canvas[] = [];
  for (let fi = 0; fi < n; fi++) {
    // Three chains of puffs curling round each other as they rise and drift right; a puff's look
    // depends only on its height s, so the loop is seamless.
    const chains = [
      { K: 9, off: 0, side: 1, size: 1 },
      { K: 9, off: 0.33, side: -1, size: 0.85 },
      { K: 9, off: 0.66, side: 1, size: 0.7 },
    ];
    const puffs: Puff[] = [];
    chains.forEach((ch, ci) => {
      for (let k = -1; k < ch.K; k++) {
        const s = (k + ch.off + fi / n) / ch.K;
        if (s <= 0 || s >= 1) continue;
        const curl = (2 + 9 * s) * Math.sin(s * TAU * 1.4 + ci * 2.1);
        const x = gx + 34 * Math.pow(s, 1.7) + ch.side * curl * 0.8;
        const y = gy - 4 - s * RISE;
        const grow = s < 0.08 ? 0.55 + 0.45 * (s / 0.08) : 1;
        const shrink = s > 0.82 ? 1 - ((s - 0.82) / 0.18) * 0.5 : 1;
        const r = (4 + 13 * Math.sqrt(s)) * ch.size * grow * shrink;
        if (r < 1.2) continue;
        puffs.push({ x, y, r, z: s * 10 + ci * 0.4, rot: s * 7 + ci * 1.7, lobes: 4 });
      }
    });
    const pf = puffField(W, H, puffs, { steps: [1, 2, 3, 3, 4], seed: 3750, bias: -0.04 });
    const c = new Canvas(W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (pf.id[i] < 0) continue;
        const s = clamp((gy - y) / RISE, 0, 1);
        const fade = s > 0.6 ? 1 - (s - 0.6) / 0.4 : 1;
        let a = lerp(175, 110, s) * (0.3 + 0.7 * fade) * (pf.step[i] <= 2 ? 0.8 : 1);
        if (s < 0.04) a *= 0.7;
        if (a < 28) continue;
        // Thin wisps break the bottom edges of the higher puffs.
        if (s > 0.3 && pf.v[i] < 0.3 && noise(x, y, 2.2, 3751) > 0.6) continue;
        c.set(x, y, withAlpha(SMOKE_R[pf.step[i] + 1], a));
      }
    frames.push(c);
  }
  const low = Math.max(...frames.map((cv) => cv.bounds()?.[3] ?? 0));
  return finish('smoke_tall', 'Tall Smoke Column', [1.1, 3.6], ['ambient'], { idle: { frames, fps: 8 } }, gx, low);
}

// ================================================================================================
// main
// ================================================================================================

const OUT = previewDir();
const ONLY = (process.env.CAMPSITE_ONLY ?? '').split(',').filter(Boolean);

/** Zoomed crop of the first frame (anchor marked) and a strip per animation, for review. */
function debugDump(s: WorldSprite): void {
  const bg = hex('#5d6b57');
  const first = Object.values(s.anims)[0].frames[0];
  const z = new Canvas(first.w + 8, first.h + 8);
  z.fillRect(0, 0, z.w, z.h, bg);
  z.draw(first, 4, 4);
  z.set(4 + s.anchor[0], 4 + s.anchor[1] + 1, hex('#ff00ff'));
  z.scaled(first.w > 200 || first.h > 200 ? 3 : first.h > 70 ? 4 : 6).save(join(OUT, `campsite-${s.name}-zoom.png`));
  for (const [k, a] of Object.entries(s.anims)) {
    if (a.frames.length < 2 && Object.keys(s.anims).length < 2) continue;
    const fw = a.frames[0].w, fh = a.frames[0].h;
    const st = new Canvas((fw + 3) * a.frames.length + 3, fh + 6);
    st.fillRect(0, 0, st.w, st.h, bg);
    a.frames.forEach((fr, i) => st.draw(fr, 3 + i * (fw + 3), 3));
    st.scaled(fw > 150 ? 2 : 3).save(join(OUT, `campsite-${s.name}-${k}.png`));
  }
}

// --- review sheets for the owner ------------------------------------------------------------

/** Reads a PNG written by the kit (8-bit RGBA, any filter) into a Canvas. */
function readPng(path: string): Canvas {
  const b = readFileSync(path);
  let o = 8, w = 0, h = 0;
  const idat: Buffer[] = [];
  while (o < b.length) {
    const n = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8);
    if (t === 'IHDR') {
      w = b.readUInt32BE(o + 8);
      h = b.readUInt32BE(o + 12);
    }
    if (t === 'IDAT') idat.push(b.subarray(o + 8, o + 8 + n));
    o += 12 + n;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const px = new Uint8Array(w * h * 4);
  const bpr = w * 4;
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (bpr + 1)];
    for (let x = 0; x < bpr; x++) {
      const r = raw[y * (bpr + 1) + 1 + x];
      const a = x >= 4 ? px[y * bpr + x - 4] : 0, up = y ? px[(y - 1) * bpr + x] : 0, ul = x >= 4 && y ? px[(y - 1) * bpr + x - 4] : 0;
      let v = r;
      if (ft === 1) v = r + a;
      else if (ft === 2) v = r + up;
      else if (ft === 3) v = r + ((a + up) >> 1);
      else if (ft === 4) {
        const pp = a + up - ul, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - ul);
        v = r + (pa <= pb && pa <= pc ? a : pb <= pc ? up : ul);
      }
      px[y * bpr + x] = v & 255;
    }
  }
  return new Canvas(w, h, px);
}

/** First frame and anchor of an approved landmarks sprite (read from its sheet), for comparison. */
function landmark(name: string): { c: Canvas; ax: number; ay: number } | null {
  const dir = join(import.meta.dirname, '../../src/assets/world/landmarks');
  const mf = join(dir, 'manifest.json');
  if (!existsSync(mf)) return null;
  const spec = JSON.parse(readFileSync(mf, 'utf8')).sprites?.[name];
  if (!spec) return null;
  const sheet = readPng(join(dir, spec.file));
  const c = new Canvas(spec.frameW, spec.frameH);
  c.draw(sheet, 0, 0);
  return { c, ax: spec.anchor[0], ay: spec.anchor[1] };
}

/** A 3x5 pixel font for the sheet labels. */
const FONT: Record<string, string> = {
  a: '010101111101101', b: '110101110101110', c: '011100100100011', d: '110101101101110', e: '111100110100111', f: '111100110100100', g: '011100101101011', h: '101101111101101',
  i: '111010010010111', j: '001001001101010', k: '101101110101101', l: '100100100100111', m: '101111111101101', n: '110101101101101', o: '010101101101010', p: '110101110100100',
  q: '010101101011001', r: '110101110101101', s: '011100010001110', t: '111010010010010', u: '101101101101111', v: '101101101101010', w: '101101111111101', x: '101101010101101',
  y: '101101010010010', z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110',
  '6': '011100110101010', '7': '111001010010010', '8': '010101010101010', '9': '010101011001110', '_': '000000000000111', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000', ' ': '000000000000000', '@': '010101111100011',
};
function text(c: Canvas, x: number, y: number, s: string, col: Color): void {
  [...s.toLowerCase()].forEach((ch, k) => {
    const g = FONT[ch] ?? FONT[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') c.set(x + k * 4 + (i % 3), y + Math.floor(i / 3), col);
  });
}

/** The painted-forest stage: a misty green that darkens toward the ground, with soft painted blotches. */
function stage(c: Canvas, groundY: number): void {
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const t = y / Math.max(1, groundY);
      const m1 = fbm(x * 0.5, y * 0.5, 40, 3, 7);
      let col = y < groundY ? mix(hex('#6f7f68'), hex('#56664f'), clamp(t, 0, 1)) : mix(hex('#4c5c3e'), hex('#3f4f34'), clamp((y - groundY) / 40, 0, 1));
      col = mix(col, y < groundY ? hex('#7d8c74') : hex('#55663f'), clamp((m1 - 0.5) * 0.9, 0, 0.35));
      c.set(x, y, col);
    }
}

/** camp-lineup.png: every camp sprite's first frame on one ground line, with landmarks and the character at the ends. */
function lineup(sprites: WorldSprite[], path: string, k = 3): void {
  const items: { c: Canvas; ax: number; ay: number }[] = [];
  const crop = (c: Canvas, ax: number, ay: number) => {
    const b = c.bounds();
    if (!b) return { c, ax, ay };
    const out = new Canvas(b[2] - b[0] + 1, b[3] - b[1] + 1);
    out.draw(c, -b[0], -b[1]);
    return { c: out, ax: ax - b[0], ay: ay - b[1] };
  };
  const ch = characterRef();
  items.push(crop(ch, CHARACTER_FEET[0], CHARACTER_FEET[1]));
  const lan = landmark('stone_lantern');
  if (lan) items.push(crop(lan.c, lan.ax, lan.ay));
  for (const s of sprites) items.push(crop(Object.values(s.anims)[0].frames[0], s.anchor[0], s.anchor[1]));
  const bou = landmark('boulder');
  if (bou) items.push(crop(bou.c, bou.ax, bou.ay));
  items.push(crop(ch, CHARACTER_FEET[0], CHARACTER_FEET[1]));
  const pad = 14;
  const above = Math.max(...items.map((it) => it.ay)) + 16;
  const below = Math.max(...items.map((it) => it.c.h - it.ay)) + 16;
  const W = items.reduce((t, it) => t + it.c.w + pad, pad);
  const out = new Canvas(W, above + below);
  stage(out, above);
  let x = pad;
  for (const it of items) {
    out.draw(it.c, x, above - it.ay);
    x += it.c.w + pad;
  }
  out.scaled(k).save(path);
}

/** camp-anims.png: every animation as a labelled strip of frames (cropped to the animation's bounds). */
function animsSheet(sprites: WorldSprite[], path: string, k = 3): void {
  const rows: { label: string; frames: Canvas[] }[] = [];
  for (const s of sprites)
    for (const [key, a] of Object.entries(s.anims)) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const fr of a.frames) {
        const b = fr.bounds();
        if (!b) continue;
        x0 = Math.min(x0, b[0]);
        y0 = Math.min(y0, b[1]);
        x1 = Math.max(x1, b[2]);
        y1 = Math.max(y1, b[3]);
      }
      const frames = a.frames.map((fr) => {
        const c = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
        c.draw(fr, -x0, -y0);
        return c;
      });
      rows.push({ label: `${s.name} ${key} ${a.frames.length}f ${a.fps}fps${a.loop === false ? ' once' : a.fps ? ' loop' : ''}`, frames });
    }
  const pad = 6;
  const W = Math.max(...rows.map((r) => r.frames.reduce((t, f) => t + f.w + pad, pad)), 200);
  const H = rows.reduce((t, r) => t + r.frames[0].h + pad + 9, pad);
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, hex('#5d6b57'));
  let y = pad;
  for (const r of rows) {
    text(out, pad, y, r.label, hex('#e8e4d4'));
    y += 8;
    let x = pad;
    for (const f of r.frames) {
      out.fillRect(x, y, f.w, f.h, hex('#56664f'));
      out.draw(f, x, y);
      x += f.w + pad;
    }
    y += r.frames[0].h + pad + 1;
  }
  out.scaled(k).save(path);
}


const BUILDERS: [string, () => WorldSprite[]][] = [
  ['tent_large', () => [tentLarge()]],
  ['tent_small', () => [tentSmall()]],
  ['torii', () => [torii()]],
  ['backpack', () => [backpack()]],
  ['bedroll', () => [bedroll()]],
  ['sword_stuck', () => [swordStuck()]],
  ['swords_pair', () => [swordsPair()]],
  ['stump_axe', () => [stumpAxe()]],
  ['log_seat', () => [logSeat()]],
  ['cooking_tripod', () => [cookingTripod()]],
  ['firewood', () => [firewood()]],
  ['fern_clump', () => [fernClump()]],
  ['campfire_large', () => [campfireLarge()]],
  ['smoke_tall', () => [smokeTall()]],
];
const sprites: WorldSprite[] = BUILDERS.filter(([k]) => !ONLY.length || ONLY.includes(k)).flatMap(([, b]) => b());
// A partial run writes its sheets next to the review crops (never over the real group).
if (ONLY.length) writeGroup('campsite', sprites, join(OUT, 'only'));
else {
  writeGroup('campsite', sprites);
  lineup(sprites, join(OUT, 'campsite-lineup.png'), 3);
  animsSheet(sprites, join(OUT, 'campsite-anims.png'), 3);
}
for (const s of sprites) {
  debugDump(s);
  const f0 = Object.values(s.anims)[0].frames[0];
  const bb = f0.bounds()!;
  const anims = Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? '' : 'L'}`).join(' ');
  console.log(`${s.name.padEnd(16)} frame ${f0.w}x${f0.h} anchor ${s.anchor} opaque ${bb[2] - bb[0] + 1}x${bb[3] - bb[1] + 1}px (target ${s.meters.map((v) => m(v)).join('x')}) ${anims}`);
}
