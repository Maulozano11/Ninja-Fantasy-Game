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
      d += c.a * Math.exp(-((dist / c.w) ** 2)) * (1 - t * 0.85);
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
    const sag = (3.4 + 2 * Math.sin(Math.PI * u)) * Math.pow(Math.sin(Math.PI * v), 1.2) * (1 + sway * 0.06);
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
    const near = sc.add(Y(sheet(grid(NU, NV, (u, v) => slopePt(u, v, -1, sway)))), canvasOpts(o.seed + 1, { ao: 3, bias: -0.24, jitter: 0.05, bump: { base: nearN, gain: 3 } }));
    const far = sc.add(Y(sheet(grid(24, 16, (u, v) => slopePt(u, v, 1)))), canvasOpts(o.seed + 2, { pal: INSIDE, steps: [0, 1, 1, 2], castShadow: false }));
    const A: V3 = [L / 2, ridgeH(1), 0], S: V3 = [L / 2, 0, 0], Fb: V3 = [L / 2, 0, B], Bn: V3 = [L / 2, 0, -B];
    const A0: V3 = [-L / 2, ridgeH(0), 0];
    // The back gable seen from inside, and the floor (a ground sheet).
    sc.add(Y(sheet(grid(6, 8, (u, v) => lerp3(lerp3(A0, [-L / 2, 0, B], v), lerp3(A0, [-L / 2, 0, -B], v), u)), { flip: true })), canvasOpts(o.seed + 3, { pal: INSIDE, steps: [0, 0, 1, 1] }));
    const floor = sc.add(Y(sheet(grid(4, 4, (u, v) => [-L / 2 + u * L, 0.3, B - v * 2 * B]))), { pal: INSIDE, seed: o.seed + 4, steps: [0, 1, 1, 2], crest: false, castShadow: false });
    // Door flaps: each half of the front gable hinged on its slope edge and thrown open; they droop
    // under their weight and billow a little. The far one is folded right back.
    const flap = (hingeEnd: V3, phiDeg: number, dir: 1 | -1, seed: number, droop: number) => {
      const phi = phiDeg * (Math.PI / 180);
      const hingeAx = unit(sub(hingeEnd, A));
      const pt = (u: number, v: number): V3 => {
        const p0 = lerp3(lerp3(A, hingeEnd, v), lerp3(A, S, v), u);
        let p = rotAxisP(p0, hingeAx, dir * phi, A);
        p = add(p, [0, -u * v * droop, 0]);
        p = add(p, mul([1, 0, 0], Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * (2.4 + sway * 0.6)));
        if (p[1] < 0.6) p = [p[0], 0.6, p[2]];
        return p;
      };
      return sc.add(Y(sheet(grid(10, 18, pt))), canvasOpts(seed, { twoSided: true, steps: [1, 2, 3, 3] }));
    };
    const flapN = flap(Bn, o.flap + sway * 6, -1, o.seed + 5, 12 + sway * 1.5);
    const flapF = flap(Fb, 150, 1, o.seed + 6, 8);
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
      // Weave: broken thread rows across the slope and fainter ones down it, only on lit cloth.
      if (s >= 3 && (V % 3) < 1 && noise(U * 0.7, V, 1.3, o.seed + 60) > 0.56) s -= 1;
      else if (s >= 2 && s <= 3 && (U % 4) < 1 && noise(U, V * 0.5, 1.3, o.seed + 61) > 0.68) s += 1;
      // Rain stains: soft streaks running down from the ridge.
      if (noise(U / 3, V / 22, 1, o.seed + 62) > 0.78 && s > 1 && V > 8) s -= 1;
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
    L: 156, B: 64, HR: 120, YAW: -0.62, seed: 3100, ext: 0.13,
    seams: [0.25, 0.5, 0.75],
    pegs: [0, 0.25, 0.5, 0.75, 1],
    patches: [{ u0: 0.6, v0: 0.62, u1: 0.68, v1: 0.78 }],
    flap: 152,
    W: 340, H: 250, ox: 170, oy: 196,
  });
}

function tentSmall(): WorldSprite {
  return aTent({
    name: 'tent_small',
    label: 'Small Canvas Tent',
    meters: [2.4, 1.6],
    L: 104, B: 44, HR: 82, YAW: -0.58, seed: 3200, ext: 0.15,
    seams: [0.5],
    pegs: [0, 0.5, 1],
    patches: [{ u0: 0.18, v0: 0.5, u1: 0.28, v1: 0.66 }],
    flap: 128,
    W: 250, H: 190, ox: 125, oy: 150,
  });
}
