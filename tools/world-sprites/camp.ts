// Camp props for the battle maps: the enemy camp on the hill. Everything here can be burnt, blown
// up, broken or hidden behind: campfire, smoke column, canvas tent, barrels, crates, rice sacks and
// a weapon rack.
//
//   npx tsx tools/world-sprites/camp.ts [previewDir]
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/camp.ts [previewDir]   (art waiting for approval)
//   CAMP_ONLY=tent,barrel npx tsx tools/world-sprites/camp.ts [dir]    (just these, review crops only)
//
// Same pipeline as the landmarks (copied from landmarks.ts, not imported): every solid part is a
// small low-poly mesh rasterised with the battle camera's projection (1 m = 57 px across and up,
// 38 px per meter of depth) into a G-buffer (mesh, facet, depth, normal, world position and the
// part's own uv). Light is Lambert from the upper left with real cast shadows; it picks a ramp step
// through the kit's clustered band(), facet edges facing the light get a crest, parts that overlap
// get a dark inner line, and the kit adds the outer outline. Cloth (the tent, the door flap, the
// sacks) is a displaced grid with sag and fold creases, two-sided where both faces can show, and
// burns through with real holes (the renderer drops the pixels and shows what lies behind). Hand
// details (plank seams, nails, stitches, patches, char, glowing cracks, paint) go into the same step
// buffer. Fire, embers, sparks, smoke and the fireball are painted afterwards in hard-edged bands
// without the dark outline; debris in the one-shot effects is re-rendered as meshes every frame.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { Anim, CHARACTER_FEET, Canvas, Color, MATERIALS, WorldSprite, band, characterRef, fbm, hash, hex, lambert, m, mix, noise, preview, previewDir, ramp, withAlpha, writeGroup } from './kit';

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
// CAMPFIRE
// ================================================================================================

function campfire(): WorldSprite {
  const W = 100, H = 124, ox = 50, oy = 90;
  const RING = 21.5;
  const N = 10;
  const stones = Array.from({ length: N }, (_, k) => {
    const a = (k / N) * TAU + 0.12 + (rnd(41, k) - 0.5) * 0.22;
    const rr = RING * (0.97 + rnd(41, k, 2) * 0.06);
    const rx = 5.4 + rnd(41, k, 3) * 1.8;
    return { a, cx: Math.cos(a) * rr, cd: Math.sin(a) * rr, rx, h: 5 + rnd(41, k, 4) * 2.4, seed: 500 + k, warm: rnd(41, k, 5) < 0.3 };
  });
  type State = 'burning' | 'smoldering' | 'out';
  interface LogSpec {
    a: V3;
    b: V3;
    r: number;
    seed: number;
  }
  const FIRE_C: V3 = [0, 12, 0];
  const frame = (state: State, f: number, n: number): Canvas => {
    GROUP = 1;
    const sc = new Scene();
    const ph = (f / n) * TAU;
    const flick = state === 'burning' ? 1 + 0.13 * Math.sin(ph * 2) + 0.06 * Math.sin(ph * 3 + 1) : state === 'smoldering' ? 0.85 + 0.15 * Math.sin(ph) : 0;
    // Ash bed: a low mound inside the ring.
    const ash = sc.add(loft([ring(0, -0.5, 0, 19.5, 19.5, 18), ring(0, 1.1, 0, 16, 16, 18, { jit: 0.07, seed: 4 }), ring(0, 2.1, 0, 9, 9, 18, { jit: 0.1, seed: 5 })], { capEnd: [0, 2.7, 0], smooth: true }), {
      pal: ASH,
      seed: 6,
      steps: [1, 2, 2, 3],
      castShadow: false,
      crest: false,
    });
    const rocks = stones.map((s) =>
      sc.add(rockMesh({ cx: s.cx, cd: s.cd, rx: s.rx, rd: s.rx * 0.82, h: s.h, h0: -1, n: 7, seed: s.seed, profile: [[0, 0.92], [0.42, 1], [0.84, 0.66]], jit: 0.14, apexUp: 0.05, rot: s.a }), {
        pal: s.warm ? STONE_W : STONE,
        seed: s.seed,
        contrast: 1.15,
        facetVar: 0.06,
        ao: 2,
        tex: 0.03,
        texCell: 6,
        form: 0.2,
      }),
    );
    // Crossed logs: one on the ash, one across it resting on the far stones, a short one behind.
    const k = state === 'out' ? 0.74 : state === 'smoldering' ? 0.9 : 1;
    const specs: LogSpec[] = [
      { a: [-18 * k, 3, 8 * k], b: [17 * k, 3, -7 * k], r: 3.1, seed: 31 },
      { a: [-15 * k, 3.2, -9 * k], b: [16 * k, state === 'out' ? 6 : 9.5, 9.5 * k], r: 3, seed: 32 },
      { a: [-8 * k, 3, 13 * k], b: [9 * k, 4.5, 15 * k], r: 2.4, seed: 33 },
    ];
    const logs = specs.map((L) => {
      const path: V3[] = [L.a, add(lerp3(L.a, L.b, 0.33), [0, 0.3, 0]), add(lerp3(L.a, L.b, 0.66), [0, 0.2, 0]), L.b];
      return sc.add(tube(path, L.r, 9, { caps: true, seed: L.seed, wob: 0.12 }), { pal: BARK, seed: L.seed, contrast: 1.1, facetVar: 0 });
    });
    const f2 = render(sc, W, H, ox, oy);
    // Logs: bark furrows, cut ends, char and glowing cracks toward the middle of the fire.
    specs.forEach((L, li) => {
      const ax = unit(sub(L.b, L.a));
      const T = len(sub(L.b, L.a));
      const uu = unit(cross(ax, [0, 1, 0]));
      const ww = cross(uu, ax);
      // Where the log passes closest to the fire's center.
      const tc = clamp(dot(sub([0, 0, 0], L.a), ax) / T, 0, 1);
      f2.each(logs[li].id, (i, x, y) => {
        const p = f2.world(i), nn = f2.normal(i);
        const rel = sub(p, L.a);
        const along = dot(rel, ax);
        const t = along / T;
        const radial = sub(rel, mul(ax, along));
        const ang = Math.atan2(dot(radial, ww), dot(radial, uu));
        const capN = Math.abs(dot(nn, ax));
        const reach = state === 'out' ? 0.62 : state === 'smoldering' ? 0.46 : 0.38;
        const ch = 1 - smooth(reach - 0.14, reach + 0.08, Math.abs(t - tc));
        if (capN > 0.8) {
          // Cut end: pale end grain with a ring and a dark heart, or charcoal if burnt.
          const rd = len(radial) / L.r;
          if (ch > 0.5 || state === 'out') {
            f2.pal[i] = CHAR;
            f2.step[i] = rd < 0.45 ? 2 : rd < 0.8 ? 3 : 2;
          } else {
            f2.pal[i] = WOOD;
            f2.step[i] = rd < 0.3 ? 2 : rd < 0.62 ? 4 : rd < 0.82 ? 3 : 1;
          }
          return;
        }
        let s = f2.step[i];
        // Bark furrows along the log.
        const fur = noise(along / 4.5 + li * 9, (ang + Math.PI) * 1.6, 1, L.seed);
        if (fur > 0.66) s = Math.max(1, s - 1);
        else if (fur < 0.12 && s >= 3) s = Math.min(4, s + 1);
        if (ch > 0.55) {
          // Charcoal: rings of cracks around the log every few px, each only part of the way round
          // and wandering, plus the odd split along it (never a regular grid, so no bricks).
          const aj = along + (noise(ang * 1.5, along / 6, 1, L.seed + 3) - 0.5) * 2.4;
          const cellA = 5.2;
          const ringK = Math.floor(aj / cellA + 0.5);
          const fa = frac(aj / cellA);
          const arc0 = hash(ringK, li, 11) * TAU, arcLen = 1.4 + hash(ringK, li, 12) * 2.2;
          const inArc = ((ang - arc0 + TAU * 2) % TAU) < arcLen;
          const ringCrack = Math.min(fa, 1 - fa) * cellA < 0.55 && inArc;
          const splitA = hash(Math.floor(aj / cellA), li, 13) * TAU;
          const split = Math.abs(Math.atan2(Math.sin(ang - splitA), Math.cos(ang - splitA))) * L.r < 0.5 && hash(Math.floor(aj / cellA), li, 14) < 0.45;
          const crack = ringCrack || split;
          f2.pal[i] = CHAR;
          // Charcoal keeps its fill well above the outline: silvery lit tops, dark cracks.
          s = crack ? 1 : clamp(s + 1, 2, 4);
          // Only some cracks glow, brightest on the upper side and near the middle.
          const cellId = ringK * 7 + (split ? 3 : 0);
          if (crack && state !== 'out' && hash(cellId, li, 9) < (state === 'burning' ? 0.65 : 0.7)) {
            const up = dot(nn, [0, 1, 0]);
            const pulse = 0.5 + 0.5 * Math.sin(ph * (state === 'burning' ? 2 : 1) + hash(cellId, li, 10) * TAU);
            const g = (state === 'burning' ? 1.5 : 1.25) * (0.5 + 0.5 * pulse) * (0.5 + 0.5 * up) * ch;
            if (g > 0.45) f2.over[i] = g > 1.2 ? FIRE_R[4] : g > 0.9 ? FIRE_R[3] : g > 0.65 ? FIRE_R[2] : FIRE_R[1];
          }
        } else if (ch > 0.2) {
          f2.pal[i] = SINGED;
          if (noise(x, y, 1.6, L.seed + 5) > 0.62) {
            f2.pal[i] = CHAR;
            s = Math.min(s, 3);
          }
        }
        f2.step[i] = s;
      });
    });
    // Ash bed: charcoal chunks and coals that glow toward the middle.
    f2.each(ash.id, (i, x, y) => {
      if (f2.over[i]) return;
      const p = f2.world(i);
      const r = Math.hypot(p[0], p[2]);
      const nz = noise(x * 0.8, y * 1.2, 1.6, 78);
      if (nz > 0.66 - (state === 'out' ? 0.02 : 0)) {
        f2.pal[i] = CHAR;
        f2.step[i] = nz > 0.8 ? 3 : 2;
        if (state !== 'out' && r < 15) {
          // Coals glow in clumps: the core of a chunk brighter than its rim, pulsing slowly.
          const pulse = 0.5 + 0.5 * Math.sin(ph + hash(x >> 2, y >> 1, 80) * TAU);
          const g = (state === 'burning' ? 1.4 : 1.15) * (1.1 - r / 16) * (0.55 + 0.45 * pulse) * (nz > 0.76 ? 1.2 : 0.8);
          if (g > 0.32) f2.over[i] = g > 0.95 ? FIRE_R[4] : g > 0.62 ? FIRE_R[3] : g > 0.45 ? FIRE_R[2] : FIRE_R[1];
        }
      }
    });
    // Warm light from the flames (or the coals) on everything that faces them.
    if (state !== 'out') {
      const src: V3 = state === 'burning' ? FIRE_C : [0, 4, 0];
      const reach = state === 'burning' ? 32 : 20;
      const kk = state === 'burning' ? 1.15 * flick : 0.55 * flick;
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
    // Flames, then the front stones (and the near ends of the logs) back over their base.
    if (state === 'burning') {
      flames(c, ox, oy - 4, f, n, [
        { x: 0, h: 38, w: 6.2, ph: 0, amp: 2.2, k: 1 },
        { x: -7, h: 25, w: 4.4, ph: 2.1, amp: 2, k: 0.8 },
        { x: 7.5, h: 29, w: 4.4, ph: 4.2, amp: 2, k: 0.82 },
        { x: -12.5, h: 13, w: 3.2, ph: 1.3, amp: 1.2, k: 0.64 },
        { x: 12, h: 15, w: 3.2, ph: 3.3, amp: 1.2, k: 0.64 },
      ], { lean: 0.03, seed: 21 });
      embers(c, ox, oy - 30, f, n, 9, 34, 16, 33);
    } else if (state === 'smoldering') {
      wisp(c, ox + 1, oy - 6, f, n, 46, 3, 150);
    }
    const front = (i: number) => {
      const mi = f2.mesh[i];
      if (mi < 0) return false;
      if (rocks.some((r) => r.id === mi)) return f2.world(i)[2] < -6;
      if (logs.some((l) => l.id === mi)) return f2.world(i)[2] < -7;
      return false;
    };
    if (state === 'burning') {
      const fr = f2.compose(front);
      fr.outline();
      blit(c, fr);
    }
    return c;
  };
  const burning = Array.from({ length: 8 }, (_, f) => frame('burning', f, 8));
  const smoldering = Array.from({ length: 6 }, (_, f) => frame('smoldering', f, 6));
  const out = [frame('out', 0, 1)];
  return finish('campfire', 'Campfire', [1, 0.8], ['light-source', 'interactable'], { burning: { frames: burning, fps: 12 }, smoldering: { frames: smoldering, fps: 6 }, out: { frames: out, fps: 0 } }, ox, out[0].bounds()![3]);
}

// ================================================================================================
// SMOKE COLUMN
// ================================================================================================

function smokeColumn(): WorldSprite {
  const W = 80, H = 150, gx = 30, gy = 144;
  const n = 8;
  const RISE = 106;
  const frames: Canvas[] = [];
  for (let f = 0; f < n; f++) {
    // Two chains of puffs; each puff's look depends only on its height s, so the loop is seamless.
    const chains = [
      { K: 7, off: 0, side: 1, size: 1 },
      { K: 7, off: 0.5, side: -1, size: 0.8 },
    ];
    const puffs: Puff[] = [];
    chains.forEach((ch, ci) => {
      for (let k = -1; k < ch.K; k++) {
        const s = (k + ch.off + f / n) / ch.K;
        if (s <= 0 || s >= 1) continue;
        const x = gx + 19 * Math.pow(s, 1.6) + ch.side * (1.6 + 1.8 * s) * Math.sin(s * TAU * 1.2 + ci * 2);
        const y = gy - 4 - s * RISE;
        const grow = s < 0.1 ? 0.6 + 0.4 * (s / 0.1) : 1;
        const shrink = s > 0.84 ? 1 - ((s - 0.84) / 0.16) * 0.45 : 1;
        const r = (4.2 + 9.4 * Math.sqrt(s)) * ch.size * grow * shrink;
        if (r < 1.2) continue;
        puffs.push({ x, y, r, z: s * 10 + ci * 0.5, rot: s * 7 + ci * 1.7, lobes: 3 });
      }
    });
    const pf = puffField(W, H, puffs, { steps: [2, 3, 3, 4], seed: 41, bias: -0.02 });
    const c = new Canvas(W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (pf.id[i] < 0) continue;
        const s = clamp((gy - y) / RISE, 0, 1);
        const fade = s > 0.7 ? 1 - (s - 0.7) / 0.3 : 1;
        // Shadowed puff sides are thinner smoke: a little more see-through.
        let a = lerp(170, 100, s) * (0.35 + 0.65 * fade) * (pf.step[i] <= 2 ? 0.82 : 1);
        if (s < 0.05) a *= 0.8;
        if (a < 30) continue;
        c.set(x, y, withAlpha(SMOKE_R[pf.step[i] + 1], a));
      }
    frames.push(c);
  }
  // Anchor: the bottom center of the column's foot (mean x of the lowest rows over the loop).
  const low = Math.max(...frames.map((c) => c.bounds()?.[3] ?? 0));
  let sx = 0, sn = 0;
  for (const c of frames)
    for (let y = low - 5; y <= low; y++)
      for (let x = 0; x < c.w; x++)
        if (c.alpha(x, y) > 0) {
          sx += x + 0.5;
          sn++;
        }
  return finish('smoke', 'Smoke Column', [0.6, 2], ['ambient'], { idle: { frames, fps: 8 } }, Math.floor(sn ? sx / sn : gx), low);
}

// ================================================================================================
// CANVAS TENT
// ================================================================================================

/** Dim canvas seen inside the tent. */
const INSIDE = pal(R.canvas.map((c, i) => mix(c, CHAR_R[i], 0.42)));

/**
 * A 1 px line between two world points drawn into a canvas with a depth test against the frame
 * (it hides behind nearer surfaces); `sag` px of droop at the middle. Returns the pixels it drew.
 */
function ropeLine(c: Canvas, f: Frame, a: V3, b: V3, sag: number, col: (k: number, n: number) => Color): [number, number][] {
  const n = Math.ceil(Math.hypot(...f.proj(a).map((v, i) => v - f.proj(b)[i])) * 1.5) + 2;
  const out: [number, number][] = [];
  const shade: [number, number, Color][] = [];
  let last = '';
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const p: V3 = add(lerp3(a, b, t), [0, -sag * 4 * t * (1 - t), 0]);
    const [x, y] = f.px(p);
    const key = `${x},${y}`;
    if (key === last) continue;
    last = key;
    const i = f.idx(x, y);
    if (i < 0) continue;
    if (f.mesh[i] >= 0 && f.depth[i] < p[2] - 0.5) continue;
    c.set(x, y, col(k, n));
    out.push([x, y]);
    // Where the rope crosses a surface close behind it, it casts a 1 px shadow down and to the right.
    const j = f.idx(x + 1, y + 1);
    if (j >= 0 && f.mesh[j] >= 0 && f.pal[j] >= 0 && !f.over[j] && Math.abs(f.depth[j] - p[2]) < 30) shade.push([x + 1, y + 1, PAL[f.pal[j]][Math.max(1, f.step[j] - 1)]]);
  }
  // Applied after the whole line, so the rope never shades itself.
  for (const [x, y, col] of shade) if (!out.some(([ax, ay]) => ax === x && ay === y)) c.set(x, y, col);
  return out;
}

function tent(): WorldSprite {
  const W = 280, H = 250, ox = 140, oy = 166;
  const L = 136, B = 48, HR = 100, YAW = -0.4;
  const NU = 64, NV = 40;
  const SL = Math.hypot(HR, B);
  /** Fold creases on the near slope, in slope px (U along the ridge, V down from the ridge): a > 0 bulges out. */
  const creases: { u0: number; v0: number; u1: number; v1: number; a: number; w: number }[] = [
    // Tension from the pole tops down toward the middle pegs.
    { u0: 4, v0: 3, u1: 46, v1: 78, a: 1.5, w: 2.6 },
    { u0: 7, v0: 3, u1: 52, v1: 70, a: -1.3, w: 2.8 },
    { u0: L - 4, v0: 3, u1: L - 44, v1: 80, a: 1.4, w: 2.6 },
    { u0: L - 7, v0: 3, u1: L - 50, v1: 72, a: -1.2, w: 2.8 },
    // The sag line under the ridge and a soft drape in the middle panel.
    { u0: 30, v0: 12, u1: 110, v1: 12, a: -1.2, w: 3.4 },
    { u0: 70, v0: 16, u1: 66, v1: 64, a: -1.4, w: 4 },
    { u0: 76, v0: 18, u1: 74, v1: 58, a: 1.0, w: 2.4 },
    // Curtain folds hanging between the pegs.
    { u0: L / 6, v0: SL, u1: L / 6 + 2, v1: SL - 30, a: -1.2, w: 2.4 },
    { u0: L / 2, v0: SL, u1: L / 2 - 2, v1: SL - 34, a: -1.3, w: 2.4 },
    { u0: (5 * L) / 6, v0: SL, u1: (5 * L) / 6 + 1, v1: SL - 28, a: -1.1, w: 2.4 },
    // V folds pulled down by the hem pegs (at a third and two thirds).
    { u0: L / 3, v0: SL, u1: L / 3 - 14, v1: SL - 34, a: 1.3, w: 2.2 },
    { u0: L / 3, v0: SL, u1: L / 3 + 12, v1: SL - 30, a: 1.2, w: 2.2 },
    { u0: (2 * L) / 3, v0: SL, u1: (2 * L) / 3 - 12, v1: SL - 32, a: 1.2, w: 2.2 },
    { u0: (2 * L) / 3, v0: SL, u1: (2 * L) / 3 + 14, v1: SL - 28, a: 1.3, w: 2.2 },
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
  const patches = [
    { u0: 0.2, v0: 0.4, u1: 0.31, v1: 0.6, pal: BURLAP },
    { u0: 0.6, v0: 0.66, u1: 0.68, v1: 0.8, pal: BURLAP },
  ];
  const seamsU = [1 / 3, 2 / 3];
  const hole = (u: number, v: number, seed: number): number => fbm(u * 7.5, v * 5.5, 1.6, 3, seed) + 0.22 * Math.sin(Math.PI * u) * (1 - v) - 0.1 * v;
  const HOLE = 0.62;

  const frame = (burnt: boolean, t: number): Canvas => {
    GROUP = 1;
    const sc = new Scene();
    const sagR = burnt ? 15 : 2.5, frontDrop = burnt ? 8 : 0, sagK = burnt ? 2.3 : 1.35;
    const ridgeH = (u: number) => HR - sagR * Math.pow(Math.sin(Math.PI * u), 0.9) - frontDrop * u * u;
    const hemLift = (u: number) => 2.2 * Math.pow(Math.abs(Math.sin(Math.PI * u * 3)), 1.5);
    const slopePt = (u: number, v: number, side: -1 | 1): V3 => {
      const x = -L / 2 + u * L;
      const p = lerp3([x, ridgeH(u), 0], [x, hemLift(u), side * B], v);
      const n = unit([0, B, side * HR]);
      const sag = sagK * (3.2 + 1.6 * Math.sin(Math.PI * u)) * Math.pow(Math.sin(Math.PI * v), 1.2);
      const fold = side < 0 ? foldAt(u * L, v * SL) * (burnt ? 1.3 : 1) : 0;
      return add(p, mul(n, fold - sag));
    };
    const Y = (tris: Tri[]) => rotY(tris, YAW);
    const grid = (nu: number, nv: number, fn: (u: number, v: number) => V3): V3[][] => Array.from({ length: nv + 1 }, (_, i) => Array.from({ length: nu + 1 }, (_, j) => fn(j / nu, i / nv)));
    const canvasOpts = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: CANVAS, seed, crest: false, facetVar: 0, jitter: 0.07, cell: 3, ...extra });
    const nearN = rotYp(unit([0, B, -HR]), YAW);
    const near = sc.add(Y(sheet(grid(NU, NV, (u, v) => slopePt(u, v, -1)))), canvasOpts(601, { ao: 3, bias: -0.27, jitter: 0.05, bump: { base: nearN, gain: 3.1 }, cut: burnt ? (u, v) => hole(u, v, 71) > HOLE : undefined }));
    const far = sc.add(Y(sheet(grid(24, 16, (u, v) => slopePt(u, v, 1)))), canvasOpts(602, { pal: INSIDE, steps: [0, 1, 1, 2], cut: burnt ? (u, v) => hole(u, v, 72) > HOLE + 0.04 : undefined }));
    // Gables: the closed far door panel at the front, the back gable seen from inside.
    const A: V3 = [L / 2, ridgeH(1), 0], S: V3 = [L / 2, 0, 0], Fb: V3 = [L / 2, 0, B], Bn: V3 = [L / 2, 0, -B];
    // Both door halves are open: the far one is folded back against the far slope (out of sight),
    // leaving only the doubled canvas edge of the opening.
    const doorFar = sc.add(
      Y(sheet(grid(2, 16, (u, v) => lerp3(lerp3(A, Fb, v), lerp3(A, lerp3(Fb, S, 0.09), v), u)), { flip: true })),
      canvasOpts(603, { steps: [1, 2, 2, 3], cut: burnt ? (u, v) => v > 0.5 && hole(0.95, v, 73) > HOLE - 0.08 : undefined }),
    );
    const A0: V3 = [-L / 2, ridgeH(0), 0];
    sc.add(Y(sheet(grid(6, 8, (u, v) => lerp3(lerp3(A0, [-L / 2, 0, B], v), lerp3(A0, [-L / 2, 0, -B], v), u)), { flip: true })), canvasOpts(604, { pal: INSIDE, steps: [0, 0, 1, 1] }));
    const floor = sc.add(Y(sheet(grid(4, 4, (u, v) => [-L / 2 + u * L, 0.2, B - v * 2 * B]))), { pal: burnt ? CHAR : INSIDE, seed: 605, steps: [0, 1, 1, 2], crest: false, castShadow: false });
    // Poles: the ridge pole (its ends stick out), the front pole in the doorway and the back pole.
    const poleOpts = (seed: number): MeshOpts => ({ pal: burnt ? CHAR : WOOD_DK, seed, contrast: 1.1, facetVar: 0 });
    if (burnt)
      for (const [a, b, sd] of [
        [[-L / 2 - 6, ridgeH(0) - 3.2, 0], [-2, ridgeH(0.5) - 4, 0], 606],
        [[2, ridgeH(0.5) - 3, 0], [L / 2 + 6, ridgeH(1) - 3.2, 0], 607],
      ] as [V3, V3, number][])
        sc.add(Y(pole(a, b, 2.1, 8)), poleOpts(sd));
    else sc.add(Y(tube([[-L / 2 - 6, ridgeH(0) - 3.4, 0], ...[0.25, 0.5, 0.75].map((u) => [-L / 2 + u * L, ridgeH(u) - 3.4, 0] as V3), [L / 2 + 6, ridgeH(1) - 3.4, 0]], 2.1, 8)), poleOpts(606));
    sc.add(Y(burnt ? rotZ(pole([L / 2 + 1, 0, 0], [L / 2 + 1, ridgeH(1) + 3, 0], 1.9, 8), -0.06, L / 2 + 1, 0) : pole([L / 2 + 1, 0, 0], [L / 2 + 1, ridgeH(1) + 3.5, 0], 1.9, 8)), poleOpts(608));
    sc.add(Y(pole([-L / 2 - 1, 0, 0], [-L / 2 - 1, ridgeH(0) + 3.5, 0], 1.9, 8)), poleOpts(609));
    // The door flap: the near half of the front gable, hinged on the gable's near edge and thrown
    // open; it droops under its own weight, billows a little and sways with the wind.
    const sway = [0, 1, 0, -1][t % 4];
    const phi = (burnt ? 200 : 205 + sway * 7) * (Math.PI / 180);
    const hingeAx = unit(sub(Bn, A));
    const flapPt = (u: number, v: number): V3 => {
      const p0 = lerp3(lerp3(A, Bn, v), lerp3(A, S, v), u);
      let p = rotAxisP(p0, hingeAx, -phi, A);
      const dist = u * v; // how far the point is from the hinge, roughly
      p = add(p, [0, -dist * (burnt ? 10 : 14 + sway * 1.5), 0]);
      p = add(p, mul([1, 0, 0], Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * (2.2 + sway * 0.6)));
      if (p[1] < 0.6) p = [p[0], 0.6, p[2]];
      return p;
    };
    const flap = sc.add(Y(sheet(grid(10, 18, flapPt))), canvasOpts(610, { pal: burnt ? SCORCH : CANVAS, twoSided: true, steps: [1, 2, 3, 3], cut: burnt ? (u, v) => v > 0.3 + 0.22 * noise(u * 9, 1, 1.3, 74) : undefined }));
    // Stakes: hem pegs along the near side, the far front corner, and the guy-rope stakes.
    const stakeAt = (x: number, d: number, lean: number, seed: number, hgt = 7): Mesh => {
      const peg = rotZ(box(-1.1, 1.1, -1, hgt, -1.1, 1.1), lean, 0, 0);
      return sc.add(Y(move(peg, [x, 0, d])), { pal: burnt && seed % 3 === 0 ? CHAR : WOOD, seed, contrast: 1.15, facetVar: 0.04 });
    };
    [0, 1 / 3, 2 / 3, 1].forEach((u, k) => stakeAt(-L / 2 + u * L, -B - 2.5, 0.25, 620 + k, 6));
    stakeAt(L / 2, B + 2.5, -0.25, 624, 6);
    const guyStakes: V3[] = [
      [L / 2 + 40, 0, 0],
      [-L / 2 - 40, 0, 0],
      [-L / 2 + L * 0.28, 0, -B - 26],
      [-L / 2 + L * 0.74, 0, -B - 26],
    ];
    guyStakes.forEach((p, k) => stakeAt(p[0], p[2], k === 0 ? -0.35 : k === 1 ? 0.35 : 0.3, 630 + k, 8));

    const f = render(sc, W, H, ox, oy);
    declump(f, [near.id, flap.id], 4);
    // --- canvas details on the near slope (in its own uv) ---
    const uvAt = (i: number): UV => [f.uv[i * 2], f.uv[i * 2 + 1]];
    const nbs = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => f.idx(x + dx, y + dy));
    const onNear = (j: number) => j >= 0 && f.mesh[j] === near.id;
    f.each(near.id, (i, x, y) => {
      if (f.over[i]) return;
      const [u, v] = uvAt(i);
      let s = f.step[i];
      const p = f.world(i);
      // Ridge: a lit crest along the top and the seam of the doubled band just below it.
      if (v < 0.012) s = Math.max(s, 4);
      else if (v < 0.04 && nbs(x, y).some((j) => onNear(j) && f.uv[j * 2 + 1] >= 0.04)) s = Math.min(s, 2);
      // Panel seams: a dark stitch line with the overlapping edge lit beside it.
      for (const su of seamsU) {
        const here = u < su;
        for (const j of nbs(x, y)) {
          if (!onNear(j)) continue;
          const uj = f.uv[j * 2];
          if (here && uj >= su) s = Math.min(s, 2) - (v > 0.05 ? 1 : 0);
          if (!here && uj < su && hash(x, y >> 1, 5) < 0.7) s = Math.min(4, s + 1);
        }
      }
      // Hem: a darker turned-back band, muddy at the very bottom.
      if (v > 0.955) s = Math.min(s, 2);
      if (p[1] < 4 && noise(x, y, 2, 611) > 0.55) {
        f.pal[i] = SCORCH;
        s = Math.min(s, 2);
      }
      f.step[i] = clamp(s, 1, 5);
      // Patches: coarser cloth with a dark seam around and a light stitch line inside.
      for (const pt of patches) {
        if (u < pt.u0 || u > pt.u1 || v < pt.v0 || v > pt.v1) continue;
        f.pal[i] = pt.pal;
        const inP = (j: number) => {
          if (!onNear(j)) return false;
          const [uj, vj] = uvAt(j);
          return uj >= pt.u0 && uj <= pt.u1 && vj >= pt.v0 && vj <= pt.v1;
        };
        const edge = nbs(x, y).some((j) => !inP(j));
        if (edge) f.over[i] = C(pt.pal, 1);
        else {
          const nb2 = [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => !inP(f.idx(x + dx, y + dy)));
          if (nb2 && (x + y) % 3 !== 0) f.step[i] = 4;
        }
      }
    });
    // Burns: charred rims around the holes, scorched cloth around them, soot rising above.
    if (burnt)
      for (const [mesh, seed, thr] of [
        [near, 71, HOLE],
        [far, 72, HOLE + 0.04],
        [doorFar, 73, HOLE - 0.02],
      ] as [Mesh, number, number][])
        f.each(mesh.id, (i, x, y) => {
          const [u, v] = uvAt(i);
          const hv = mesh === doorFar ? hole(u * 0.3 + 0.7, v, seed) : hole(u, v, seed);
          const rim = nbs(x, y).some((j) => j >= 0 && f.mesh[j] !== mesh.id);
          if (hv > thr - 0.05 || (rim && hv > thr - 0.12)) {
            f.pal[i] = CHAR;
            f.step[i] = hv > thr - 0.025 ? 1 : 2;
          } else if (hv > thr - 0.16) {
            f.pal[i] = SCORCH;
            f.step[i] = Math.min(f.step[i], 3);
          }
        });
    // Soot rising from the burns: the cloth above a charred rim darkens in vertical streaks.
    if (burnt) {
      const soot: number[] = [];
      f.each([near.id, far.id], (i, x, y) => {
        if (f.pal[i] === CHAR || f.pal[i] === SCORCH) return;
        const below = [2, 4, 7, 10, 13].some((k) => {
          const j = f.idx(x, y + k);
          return j >= 0 && f.mesh[j] === f.mesh[i] && f.pal[j] === CHAR;
        });
        if (below && noise(x * 2, y * 0.25, 1.4, 79) > 0.38) soot.push(i);
      });
      for (const i of soot) {
        f.pal[i] = SCORCH;
        f.step[i] = Math.min(f.step[i], 3);
      }
    }
    // The dark inside: only the threshold catches a little light.
    f.each(floor.id, (i) => {
      const p = rotYp(f.world(i), -YAW);
      f.step[i] = !burnt && p[0] > L / 2 - 5 ? 1 : 0;
    });
    // The flap's free edge is a rolled hem that catches the light.
    f.each(flap.id, (i) => {
      const [u, v] = uvAt(i);
      if (u > 0.93 && v > 0.04) f.step[i] = Math.min(4, f.step[i] + 1);
      else if (v > 0.95) f.step[i] = Math.max(1, f.step[i] - 1);
    });
    const c = f.compose();
    c.outline();
    // Guy ropes (thin cords, no outline), with a depth test so they pass behind the tent.
    const ropeCol = (lit: boolean) => (k: number) => (burnt ? CHAR_R[k % 5 === 0 ? 4 : 3] : lit ? R.rope[k % 6 === 0 ? 2 : 3] : R.rope[k % 6 === 0 ? 1 : 2]);
    const W2 = (p: V3) => rotYp(p, YAW);
    const topF = W2([L / 2 + 1, ridgeH(1) + 2.5, 0]), topB = W2([-L / 2 - 1, ridgeH(0) + 2.5, 0]);
    if (!burnt) ropeLine(c, f, topF, W2(add(guyStakes[0], [0, 5, 0])), 2, ropeCol(true));
    else ropeLine(c, f, topF, add(topF, [4, -24, -3]), 1, ropeCol(false));
    ropeLine(c, f, topB, W2(add(guyStakes[1], [0, 5, 0])), burnt ? 7 : 2, ropeCol(false));
    for (const k of [2, 3]) {
      const u = (guyStakes[k][0] + L / 2) / L;
      const loop = W2(add(slopePt(u, 0.48, -1), [0, 0, -1]));
      ropeLine(c, f, loop, W2(add(guyStakes[k], [0, 6, 0])), 1.5, ropeCol(true));
    }
    return c;
  };
  const idle = [0, 1, 2, 3].map((t) => frame(false, t));
  const burntF = [frame(true, 0)];
  return finish('tent', 'Canvas Tent', [3, 2], ['cover-3q', 'blocks-sight', 'flammable', 'destructible', 'interactable'], { idle: { frames: idle, fps: 4 }, burnt: { frames: burntF, fps: 0 } }, ox);
}

// ================================================================================================
// BARRELS
// ================================================================================================

const BAR_H = 51, BAR_RB = 17, BAR_RE = 14.6, BAR_N = 16;
/** Bulge profile: radius at height h (swell > 1 for the anticipation frames). */
const barR = (h: number, swell = 1): number => BAR_RE + (BAR_RB - BAR_RE) * swell * (1 - ((2 * h) / BAR_H - 1) ** 2);
const BAR_RINGS = [0, 1.5, 5, 10, 16, 22, 25.5, 29, 35, 41, 46, 49.5, 51];
/** Stave centers at (j + 1) * PI / 8: stave 11 faces the viewer. */
const BAR_ROT = Math.PI / BAR_N;
const hOfV = (v: number): number => {
  const t = clamp(v, 0, 1) * (BAR_RINGS.length - 1);
  const k = Math.min(BAR_RINGS.length - 2, Math.floor(t));
  return lerp(BAR_RINGS[k], BAR_RINGS[k + 1], t - k);
};

/** A flat ring facing up between radii r0 < r1. */
function annulus(cx: number, h: number, cd: number, r0: number, r1: number, n: number, rot = 0): Tri[] {
  const g = GROUP++;
  const up: V3 = [0, 1, 0];
  const a = ring(cx, h, cd, r0, r0, n, { rot }), b = ring(cx, h, cd, r1, r1, n, { rot });
  const tris: Tri[] = [];
  for (let j = 0; j < n; j++) {
    const j2 = (j + 1) % n;
    tris.push({ v: [a[j], b[j], b[j2]], vn: [up, up, up], n: up, group: g, uv: [[j / n, 0], [j / n, 1], [(j + 1) / n, 1]] });
    tris.push({ v: [a[j], b[j2], a[j2]], vn: [up, up, up], n: up, group: g, uv: [[j / n, 0], [(j + 1) / n, 1], [(j + 1) / n, 0]] });
  }
  return tris;
}

/** The painted flame mark of the explosive barrel (no text): '#' paint, '.' lacquer. Row 0 is the top. */
const FLAME_MARK = [
  '....#....',
  '....##...',
  '...###...',
  '...####..',
  '..#####..',
  '..##.###.',
  '.###.###.',
  '.##...##.',
  '.##.#.##.',
  '.##.#.##.',
  '.###.###.',
  '..#####..',
  '...###...',
];

interface BarrelLook {
  explosive: boolean;
  swell?: number;
  /** Fire light leaking through the stave seams (0..1), just before the blast. */
  leak?: number;
  fuse?: boolean;
}
interface BarrelParts {
  staves: Mesh;
  hoops: Mesh[];
  rim: Mesh;
  inner: Mesh;
  head: Mesh;
  coils: Mesh[];
  fuse: Mesh | null;
  fuseTip: V3;
}
const BAR_HOOPS = (explosive: boolean) => (explosive ? [3.5, 47.5] : [3.5, 13, 38, 47.5]);
const BAR_FUSE: V3[] = [
  [4.2, BAR_H - 2, -3.2],
  [4.4, BAR_H + 3.5, -3.4],
  [5.6, BAR_H + 8, -3.6],
  [8.2, BAR_H + 10.6, -3.6],
  [10.8, BAR_H + 10.4, -3.4],
];

/** The barrel's meshes: staves (one facet each), iron hoops, the chime, its inside wall, the head. */
function barrelMeshes(sc: Scene, o: BarrelLook, xf: (t: Tri[]) => Tri[] = (t) => t): BarrelParts {
  const sw = o.swell ?? 1;
  const rings = BAR_RINGS.map((h) => ring(0, h, 0, barR(h, sw), barR(h, sw), BAR_N, { rot: BAR_ROT }));
  const lacquer = o.explosive ? RED : WOOD;
  const staves = sc.add(xf(loft(rings)), { pal: lacquer, seed: 701, contrast: 1.12, facetVar: 0.05, ao: 2, jitter: 0.06, steps: [1, 2, 2, 3, 4], bias: -0.06 });
  const rTop = barR(BAR_H, sw);
  const rim = sc.add(xf(annulus(0, BAR_H, 0, rTop - 1.7, rTop, BAR_N, BAR_ROT)), { pal: lacquer, seed: 702, crest: false, steps: [2, 3, 3, 4] });
  const inner = sc.add(xf(loft([ring(0, BAR_H, 0, rTop - 1.7, rTop - 1.7, BAR_N, { rot: BAR_ROT }), ring(0, BAR_H - 2.6, 0, rTop - 1.7, rTop - 1.7, BAR_N, { rot: BAR_ROT })], { inward: true })), {
    pal: WOOD_DK,
    seed: 703,
    steps: [1, 1, 2, 3],
    crest: false,
  });
  const head = sc.add(xf(disc(0, BAR_H - 2.6, 0, rTop - 1.7, rTop - 1.7, BAR_N * 2)), { pal: WOOD, seed: 704, crest: false, steps: [1, 2, 3, 3] });
  const hoops = BAR_HOOPS(o.explosive).map((h, k) =>
    sc.add(xf(loft([ring(0, h - 1.3, 0, barR(h - 1.3, sw) + 0.9, barR(h - 1.3, sw) + 0.9, 32), ring(0, h + 1.3, 0, barR(h + 1.3, sw) + 0.9, barR(h + 1.3, sw) + 0.9, 32)], { smooth: true })), {
      pal: IRON,
      seed: 710 + k,
      crest: false,
      contrast: 1.2,
    }),
  );
  const coils: Mesh[] = [];
  if (o.explosive)
    for (const [k, h] of [17.6, 20.1, 22.6].entries()) {
      const r = barR(h, sw) + 1.1;
      const path: V3[] = Array.from({ length: 28 }, (_, j) => {
        const a = (j / 28) * TAU;
        return [Math.cos(a) * r, h + Math.sin(a * 1 + k) * 0.25, Math.sin(a) * r] as V3;
      });
      coils.push(sc.add(xf(tube(path, 1.3, 6, { closed: true })), { pal: ROPE, seed: 720 + k, crest: false, shade: (p, s) => (frac(p.v * 30 + p.u * 1.5) < 0.34 ? Math.max(1, s - 1) : s) }));
    }
  const fuse = o.explosive && o.fuse !== false ? sc.add(xf(tube(BAR_FUSE, [1.25, 1.2, 1.15, 1.1, 1.0], 6, { caps: true })), { pal: ROPE, seed: 730, crest: false, steps: [1, 2, 3, 4], shade: (p, st) => (p.v > 0.8 ? 1 : st) }) : null;
  const tip = xf([{ v: [BAR_FUSE[4], BAR_FUSE[4], BAR_FUSE[4]], vn: [[0, 1, 0], [0, 1, 0], [0, 1, 0]], n: [0, 1, 0], group: 0 }])[0].v[0];
  return { staves, hoops, rim, inner, head, coils, fuse, fuseTip: tip };
}

/** Seams, grain, head boards, bung, paint and glowing seams on a rendered barrel. */
function paintBarrel(f: Frame, b: BarrelParts, o: BarrelLook): void {
  const stIdx = (i: number) => Math.min(BAR_N - 1, Math.floor(f.uv[i * 2] * BAR_N));
  const seams: number[] = [];
  f.each(b.staves.id, (i, x, y) => {
    if (f.over[i]) return;
    const u = f.uv[i * 2], v = f.uv[i * 2 + 1];
    const k = stIdx(i);
    const j = f.idx(x + 1, y);
    if (j >= 0 && f.mesh[j] === b.staves.id && stIdx(j) !== k) seams.push(i);
    // Grain along the stave in short dark streaks; the stave ends are a touch darker.
    const g = noise(u * BAR_N * 3.2 + k * 5, v * 7, 1, 740 + k);
    if (g > 0.7 && f.step[i] >= 2) f.step[i] -= 1;
    else if (g < 0.1 && f.step[i] === 3 && f.lightv[i] > 0.6) f.step[i] = 4;
  });
  for (const i of seams) {
    f.step[i] = 1;
    if (o.leak) f.over[i] = o.leak > 0.66 ? FIRE_R[5] : o.leak > 0.33 ? FIRE_R[4] : FIRE_R[3];
  }
  // Head: three boards with dark seams, a bung.
  f.each(b.head.id, (i) => {
    const u = f.uv[i * 2], v = f.uv[i * 2 + 1];
    const rd = (BAR_RE - 1.7) * 2;
    for (const c of [0.34, 0.66]) if (Math.abs(v - c) * rd < 0.55) f.step[i] = 1;
    if (Math.hypot((u - 0.66) * rd, (v - 0.4) * rd) < 1.9) f.step[i] = Math.hypot((u - 0.66) * rd, (v - 0.4) * rd) < 1 ? 3 : 1;
  });
  // Iron hoops: a lit top edge, a dark lower edge and a few rivets.
  for (const h of b.hoops)
    f.each(h.id, (i, x, y) => {
      const up = f.idx(x, y - 1), dn = f.idx(x, y + 1);
      if (up < 0 || f.mesh[up] !== h.id) f.step[i] = Math.min(5, f.step[i] + 1);
      else if (dn < 0 || f.mesh[dn] !== h.id) f.step[i] = Math.max(1, f.step[i] - 1);
      if (f.lightv[i] > 0.55 && hash(x >> 2, h.id, 760) < 0.18 && (x & 3) === 1) f.step[i] = 5;
    });
  if (o.explosive) {
    // The painted flame mark follows the curve of the staves (cream paint, shaded like the lacquer).
    const front = Math.PI * 1.5;
    f.each(b.staves.id, (i) => {
      if (f.over[i]) return;
      const u = f.uv[i * 2], v = f.uv[i * 2 + 1];
      const ang = BAR_ROT + u * TAU;
      const h = hOfV(v);
      const s = (ang - front) * barR(h, o.swell ?? 1);
      const mx = Math.floor(s + 2.5 + 4.5), my = Math.floor(40.5 - h);
      if (my < 0 || my >= FLAME_MARK.length || mx < 0 || mx >= 9) return;
      if (FLAME_MARK[my][mx] !== '#') return;
      f.pal[i] = PAPER;
      f.step[i] = clamp(f.step[i] - (f.step[i] >= 4 ? 1 : 0), 1, 4);
    });
  }
}

/** Splinters: little outlined wood chips flying from (x, y) along angles, `t` frames after the hit. */
function splinters(c: Canvas, x: number, y: number, t: number, n: number, seed: number, spread = Math.PI, dir = -Math.PI / 2, pal = WOOD): void {
  // Pale fresh-wood slivers along their flight, the leading pixel lit, the tail in shadow.
  for (let k = 0; k < n; k++) {
    const a = dir + (rnd(seed, k) - 0.5) * spread;
    const sp = 5 + rnd(seed, k, 2) * 6;
    const px = x + Math.cos(a) * sp * t, py = y + Math.sin(a) * sp * t * 0.8 + 1.4 * t * t;
    const len2 = rnd(seed, k, 3) < 0.5 ? 2 : 3;
    const ca = Math.cos(a + t * 0.6 * (k % 2 ? 1 : -1)), sa = Math.sin(a + t * 0.6 * (k % 2 ? 1 : -1));
    for (let q = 0; q < len2; q++) c.set(Math.round(px - ca * q), Math.round(py - sa * q), C(pal, q === 0 ? 5 : q === 1 ? 3 : 1));
  }
}

/** Translucent dust puffs (no outline) for impacts and landings. */
function dust(c: Canvas, cx: number, cy: number, r: number, alpha: number, seed: number, count = 4): void {
  const puffs: Puff[] = [];
  for (let k = 0; k < count; k++) {
    const a = (k / count) * TAU + rnd(seed, k) * 0.8;
    const rr = r * (0.42 + rnd(seed, k, 2) * 0.3);
    puffs.push({ x: cx + Math.cos(a) * r * 0.85, y: cy + Math.sin(a) * r * 0.3 - rr * 0.35, r: rr, z: Math.sin(a), rot: a, lobes: 3 });
  }
  const pf = puffField(c.w, c.h, puffs, { steps: [2, 3, 3, 4], seed: seed + 3 });
  for (let i = 0; i < c.w * c.h; i++) if (pf.id[i] >= 0) c.plot(i % c.w, Math.floor(i / c.w), withAlpha(R.stoneWarm[pf.step[i]], alpha * (pf.step[i] <= 2 ? 0.8 : 1)));
}

/** One stave of the barrel as its own plank mesh (for the break and the blast). */
function staveMesh(j: number, sw = 1): Tri[] {
  const a0 = BAR_ROT + (j * TAU) / BAR_N, a1 = BAR_ROT + ((j + 1) * TAU) / BAR_N;
  const rings = BAR_RINGS.filter((_, k) => k % 2 === 0 || k === BAR_RINGS.length - 1).map((h) => {
    const r = barR(h, sw);
    const P = (a: number, rr: number): V3 => [Math.cos(a) * rr, h, Math.sin(a) * rr];
    return [P(a0 + 0.02, r), P(a1 - 0.02, r), P(a1 - 0.02, r - 1.6), P(a0 + 0.02, r - 1.6)];
  });
  return loft(rings, { capStart: true, capEnd: true });
}
/** A hoop as a loose ring (for the break and the blast). */
const hoopMesh = (h: number): Tri[] => {
  const r = barR(h) + 0.9;
  return tube(Array.from({ length: 24 }, (_, j) => [Math.cos((j / 24) * TAU) * r, h, Math.sin((j / 24) * TAU) * r] as V3), 1.2, 5, { closed: true });
};
/** The head with its chime ring, as one loose piece. */
const lidMesh = (): Tri[] => [...pole([0, BAR_H - 2.6, 0], [0, BAR_H, 0], BAR_RE - 0.5, 16, { caps: true })];

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/**
 * The barrel falling apart into a heap: staves tip over outward and twist as they fall, landing
 * crossed over each other near the base; hoops drop and scatter; the lid flips over. `blast` throws
 * everything far and high instead (the explosive barrel), charring the lacquer.
 */
function barrelPieces(explosive: boolean, seed: number, blast = false): Piece[] {
  const pieces: Piece[] = [];
  for (let j = 0; j < BAR_N; j++) {
    const am = BAR_ROT + ((j + 0.5) * TAU) / BAR_N;
    const radial: V3 = [Math.cos(am), 0, Math.sin(am)];
    const tang: V3 = [-Math.sin(am), 0, Math.cos(am)];
    const c0: V3 = mul(radial, barR(BAR_H / 2) - 0.8);
    c0[1] = BAR_H / 2;
    const dist = blast ? 46 + rnd(seed, j, 1) * 40 : 9 + rnd(seed, j, 1) * 15;
    const swing = (rnd(seed, j, 2) - 0.5) * (blast ? 1.2 : 0.9);
    const restDir = rotYp(radial, swing * 0.6);
    const rest: V3 = [restDir[0] * dist, (rnd(seed, j, 3) < 0.35 ? 2.2 : 0) + (blast ? 0 : 0), restDir[2] * dist * 0.85];
    const t0 = blast ? 0 : rnd(seed, j, 4) * 0.5;
    // Thrown staves land turned mostly across the view, so they read as planks lying on the ground.
    let yawB = 0;
    if (blast) {
      const base = Math.cos(am) >= 0 ? 0 : Math.PI;
      let rel = Math.atan2(Math.sin(am - base), Math.cos(am - base));
      rel = rel * 0.3 + (rnd(seed, j, 11) - 0.5) * 0.5;
      yawB = Math.atan2(Math.sin(base + rel - am), Math.cos(base + rel - am));
    }
    pieces.push({
      tris: staveMesh(j),
      opts: { pal: explosive ? RED : WOOD, seed: seed + 10 + j, contrast: 1.1, facetVar: 0.06, steps: [1, 2, 3, 4] },
      pose: flight({ c0, rest, tipAx: tang, tip: -(Math.PI / 2) * (0.92 + rnd(seed, j, 5) * 0.16), yaw: blast ? yawB : swing * 1.6 + (rnd(seed, j, 6) - 0.5) * 1.2, t0, t1: t0 + (blast ? 4.5 + rnd(seed, j, 7) * 2 : 3.2), arc: blast ? 40 + rnd(seed, j, 8) * 45 : 4 + rnd(seed, j, 8) * 5, spin: blast ? tang : undefined, spinAng: blast ? (rnd(seed, j, 9) < 0.5 ? -1 : 1) * (rnd(seed, j, 10) < 0.5 ? 1 : 2) * TAU : 0, bounce: 2 }),
    });
  }
  BAR_HOOPS(explosive).forEach((h, k) => {
    const a = rnd(seed, k, 20) * TAU;
    const dist = blast ? 40 + rnd(seed, k, 21) * 30 : 10 + k * 5 + rnd(seed, k, 21) * 8;
    const rest: V3 = [Math.cos(a) * dist, k === 1 ? 3 : 0, Math.sin(a) * dist * 0.75];
    const tilt = (k === 1 ? 0.4 : 0.06) + rnd(seed, k, 22) * 0.08;
    pieces.push({
      tris: hoopMesh(h),
      opts: { pal: IRON, seed: seed + 40 + k, crest: false, contrast: 1.2 },
      pose: flight({ c0: [0, h, 0], rest, tipAx: [Math.cos(a + 1.2), 0, Math.sin(a + 1.2)], tip: tilt, yaw: 0, t0: blast ? 0 : 0.15 * k, t1: (blast ? 5 : 2.6) + k * 0.5, arc: blast ? 50 + k * 12 : 1 + k * k * 1.6, bounce: 1 }),
    });
  });
  pieces.push({
    tris: lidMesh(),
    opts: { pal: explosive && blast ? CHAR : WOOD, seed: seed + 50, crest: false },
    pose: flight({ c0: [0, BAR_H - 1.3, 0], rest: blast ? [-62, 0, 18] : [21, 1.5, -10], tipAx: [0, 0, 1], tip: Math.PI * (blast ? 3 : 1), yaw: 0.4, t0: 0, t1: blast ? 6 : 4.5, arc: blast ? 70 : 24, bounce: 2 }),
  });
  return pieces;
}

interface Piece {
  tris: Tri[];
  opts: MeshOpts;
  /** Places the piece at time t (frames since the burst). */
  pose: (t: number) => (tris: Tri[]) => Tri[];
}
/**
 * A loose piece flying from its place in the object to a resting place on the ground: it turns
 * about `tipAx` by `tip` and about the vertical by `yaw` around its own center `c0`, travels to
 * `rest` along an arc `arc` px high, between frames t0 and t1 (eased), with a small bounce after.
 */
function flight(o: { c0: V3; rest: V3; tipAx: V3; tip: number; yaw: number; t0: number; t1: number; arc: number; spin?: V3; spinAng?: number; bounce?: number }) {
  return (t: number) => (tris: Tri[]): Tri[] => {
    const k = clamp((t - o.t0) / (o.t1 - o.t0), 0, 1);
    const e = easeOut(k);
    let tr = move(tris, mul(o.c0, -1));
    if (o.spin && o.spinAng) tr = rotAxis(tr, o.spin, o.spinAng * k);
    tr = rotAxis(tr, o.tipAx, o.tip * e);
    tr = rotY(tr, o.yaw * e);
    const pos = lerp3(o.c0, o.rest, k);
    const hop = o.arc * 4 * k * (1 - k) + (o.bounce && t > o.t1 && t < o.t1 + 1.2 ? o.bounce : 0);
    return move(tr, add(pos, [0, hop, 0]));
  };
}
/** Renders loose pieces at time t (each piece gets lifted so it never sinks into the ground). */
function renderPieces(pieces: Piece[], t: number, W: number, H: number, ox: number, oy: number, extra?: (sc: Scene) => void): Frame {
  GROUP = 1;
  const sc = new Scene();
  extra?.(sc);
  for (const p of pieces) {
    let tris = p.pose(t)(p.tris);
    const low = minH(tris);
    if (low < 0) tris = move(tris, [0, -low, 0]);
    sc.add(tris, p.opts);
  }
  return render(sc, W, H, ox, oy);
}

function barrels(): WorldSprite[] {
  // --- plain barrel ---
  const W = 130, H = 110, ox = 65, oy = 82;
  const still = (o: BarrelLook, tilt = 0, pivot = 0, crack = 0): Canvas => {
    GROUP = 1;
    const sc = new Scene();
    const xf = (tr: Tri[]) => (tilt ? rotZ(tr, tilt, pivot, 0) : tr);
    const parts = barrelMeshes(sc, o, xf);
    const f = render(sc, W, H, ox, oy);
    paintBarrel(f, parts, o);
    if (crack) {
      const [cx, cy] = f.px(xf([{ v: [[-4, 33, -16], [-4, 33, -16], [-4, 33, -16]], vn: [[0, 1, 0], [0, 1, 0], [0, 1, 0]], n: [0, 1, 0], group: 0 }])[0].v[0]);
      const pts: [number, number][] = [[cx, cy]];
      for (let k = 0; k < crack; k++) pts.push([cx + Math.round(Math.sin(k * 1.7) * 1.2) + (k > 2 ? 1 : 0), cy + 3 * (k + 1)]);
      paintCrack(f, pts, [parts.staves.id]);
    }
    const c = f.compose();
    c.outline();
    return c;
  };
  const idle = still({ explosive: false });
  // Hit: knocked from the left it rocks onto its right edge, back, and settles with a split stave.
  const hit = [
    (() => {
      const c = still({ explosive: false }, 0.07, BAR_RB, 3);
      splinters(c, ox - 14, oy - 30, 1, 6, 801, 1.6, Math.PI + 0.3);
      return c;
    })(),
    (() => {
      const c = still({ explosive: false }, -0.035, -BAR_RB, 4);
      splinters(c, ox - 14, oy - 30, 2, 6, 801, 1.6, Math.PI + 0.3);
      dust(c, ox - 6, oy - 2, 9, 110, 803, 3);
      return c;
    })(),
    still({ explosive: false }, 0.015, BAR_RB, 4),
    still({ explosive: false }, 0, 0, 4),
  ];
  // Broken: it bulges, bursts, the staves fall outward like petals, hoops drop, the lid flips over.
  const BT = [0, 1, 2, 3, 4, 5, 6, 7];
  const pieces = barrelPieces(false, 810);
  const broken: Canvas[] = [];
  for (const fr of BT) {
    if (fr === 0) {
      const c = still({ explosive: false, swell: 1.25 }, 0, 0, 7);
      broken.push(c);
      continue;
    }
    const t = fr - 0.6;
    const f = renderPieces(pieces, t, W, H, ox, oy);
    const c = f.compose();
    c.outline();
    if (fr === 1) {
      dust(c, ox, oy - 6, 16, 140, 850, 5);
      splinters(c, ox, oy - 28, 1, 10, 851, TAU);
    }
    if (fr === 2) splinters(c, ox, oy - 28, 2, 10, 851, TAU);
    if (fr === 4 || fr === 5) dust(c, ox, oy - 1, 24, fr === 4 ? 120 : 70, 852 + fr, 6);
    broken.push(c);
  }
  const plain = finish('barrel', 'Barrel', [0.6, 0.9], ['cover-half', 'destructible'], { idle: { frames: [idle], fps: 0 }, hit: { frames: hit, fps: 12, loop: false }, broken: { frames: broken, fps: 12, loop: false } }, ox, idle.bounds()![3]);
  return [plain, explosiveBarrel()];
}

/** A lit fuse tip: a hot core and short rays that change every frame, plus a few loose sparks. */
function spark(c: Canvas, x: number, y: number, f: number, size = 1): void {
  const rays = 6;
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * TAU + f * 0.9 + rnd(5, k, f) * 0.5;
    const ln = Math.round((2 + Math.floor(rnd(6, k, f) * 3)) * size);
    for (let s = 1; s <= ln; s++) c.set(Math.round(x + Math.cos(a) * s), Math.round(y + Math.sin(a) * s), s <= 1 ? FIRE_R[5] : s <= 2 ? FIRE_R[4] : FIRE_R[3]);
  }
  for (let k = 0; k < 3; k++) {
    const a = rnd(9, k, f) * TAU;
    const d = (5 + rnd(10, k, f) * 4) * size;
    c.set(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d - 1), k === 0 ? FIRE_R[5] : FIRE_R[4]);
  }
  c.set(x, y, WHITE_HOT);
  c.set(x + 1, y, WHITE_HOT);
  c.set(x - 1, y, FIRE_R[5]);
  c.set(x, y - 1, FIRE_R[5]);
  c.set(x, y + 1, FIRE_R[4]);
}

/** Lacquer half burnt off: for the staves thrown by the blast. */
const CHAR_RED = pal(R.red.map((c, i) => mix(c, CHAR_R[i], 0.6)));

/** A blackened ground mark with a few glowing cinders (frame f of the blast). */
function scorchMark(c: Canvas, cx: number, cy: number, r: number, f: number): void {
  const ry = r * K;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot((x + 0.5 - cx) / r, (y + 0.5 - cy) / ry) + (noise(x, y, 3, 55) - 0.5) * 0.35;
      if (d > 1) continue;
      let col = d > 0.8 ? CHAR_R[3] : d > 0.5 ? CHAR_R[2] : CHAR_R[1];
      if (d < 0.75 && noise(x, y * 1.3, 1.8, 56) > 0.72) col = CHAR_R[4];
      if (f < 8 && d < 0.6 && noise(x, y, 1.3, 57 + (f % 2)) > 0.8) col = FIRE_R[f < 6 ? 4 : 2];
      c.plot(x, y, withAlpha(col, d > 0.88 ? 170 : 255));
    }
}

/** The fireball and smoke of the blast at frame f (2..9) around (gx, gy) on the ground. */
function fireball(W: number, H: number, gx: number, gy: number, f: number): Canvas {
  const spec: Record<number, { rise: number; R: number; heat: number; smoke: number; alpha: number }> = {
    2: { rise: 22, R: 42, heat: 1.05, smoke: 0, alpha: 255 },
    3: { rise: 30, R: 54, heat: 0.95, smoke: 0.08, alpha: 255 },
    4: { rise: 42, R: 66, heat: 0.78, smoke: 0.28, alpha: 255 },
    5: { rise: 56, R: 72, heat: 0.56, smoke: 0.52, alpha: 250 },
    6: { rise: 70, R: 74, heat: 0.36, smoke: 0.76, alpha: 230 },
    7: { rise: 84, R: 72, heat: 0.18, smoke: 0.92, alpha: 190 },
    8: { rise: 98, R: 66, heat: 0.06, smoke: 1, alpha: 140 },
    9: { rise: 110, R: 58, heat: 0, smoke: 1, alpha: 90 },
  };
  const sp = spec[f];
  const cx = gx + (f - 2) * 1.5, cy = gy - sp.rise;
  const puffs: Puff[] = [{ x: cx, y: cy, r: sp.R * 0.62, z: 0, rot: f * 0.4, lobes: 5 }];
  const NL = 8;
  for (let k = 0; k < NL; k++) {
    const a = (k / NL) * TAU + 0.35 + f * 0.06;
    const rr = sp.R * (0.4 + 0.1 * rnd(81, k));
    const d = sp.R * (0.5 + 0.1 * rnd(82, k));
    puffs.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.72 - (Math.sin(a) > 0.4 ? sp.R * 0.08 : 0), r: rr, z: -Math.sin(a) * 0.6 - 0.3, rot: a + f, lobes: 3 });
  }
  // The stem of the mushroom and a skirt of dust rolling along the ground.
  if (f >= 4)
    for (let k = 0; k < 3; k++) {
      const t = (k + 1) / 4;
      puffs.push({ x: lerp(gx, cx, t) + (k - 1) * 2, y: lerp(gy - 8, cy + sp.R * 0.4, t), r: sp.R * (0.2 + 0.05 * k), z: 0.5, rot: k + f, lobes: 3 });
    }
  if (f >= 3 && f <= 7)
    for (let k = 0; k < 6; k++) {
      const a = Math.PI + (k / 5) * Math.PI;
      const sr = 30 + (f - 3) * 13;
      puffs.push({ x: gx + Math.cos(a) * sr, y: gy - 6 + Math.sin(a) * sr * 0.18 + (k % 2) * 3, r: 7 + (f - 3) * 1.6, z: 2 - Math.sin(a), rot: k * 1.3 + f, lobes: 3 });
    }
  const pf = puffField(W, H, puffs, { steps: [1, 2, 3, 4], seed: 90 + f, jitter: 0.12 });
  const c = new Canvas(W, H);
  const fire = new Int8Array(W * H).fill(-1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (pf.id[i] < 0) continue;
      const dc = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.1) / (sp.R * 1.2);
      // Hot in the middle and low; the top and the outside cool into smoke first.
      const nz = noise(x, y, 5, 100 + f) * 0.7 + noise(x, y, 2.2, 140 + f) * 0.3 - 0.5;
      const heat = sp.heat * (1.32 - dc * 1.15 + ((y - cy) / sp.R) * 0.25) + nz * 0.32 - sp.smoke * 0.35;
      if (heat > 0.16 && pf.id[i] < 9 * 16 + 16) {
        const b = heat > 1.0 && f === 2 ? 6 : heat > 0.8 ? 5 : heat > 0.6 ? 4 : heat > 0.42 ? 3 : heat > 0.27 ? 2 : 1;
        fire[i] = pf.inner[i] && b > 1 ? b - 1 : b;
      } else {
        // Smoke lit from the upper left; low puffs near the fire glow warm.
        const st = pf.step[i];
        let col = (f <= 6 ? SMOKE_DARK_R : SMOKE_R)[st];
        if (sp.heat > 0.1 && heat > 0.02) col = mix(col, FIRE_R[2], 0.35);
        const a = sp.alpha * (st <= 1 ? 0.9 : 1) * (pf.id[i] >= 9 * 16 + 16 ? 0.8 : 1);
        c.set(x, y, withAlpha(col, a));
      }
    }
  // Fire in hard bands with a dark red rim where it meets smoke or air.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const b = fire[i];
      if (b < 0) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const xx = x + dx, yy = y + dy;
        return xx < 0 || yy < 0 || xx >= W || yy >= H || fire[yy * W + xx] < 0;
      });
      c.set(x, y, edge ? FIRE_R[1] : b >= 6 ? WHITE_HOT : FIRE_R[b]);
    }
  return c;
}

function explosiveBarrel(): WorldSprite {
  const W = 280, H = 270, ox = 140, oy = 214;
  const still = (o: BarrelLook): { c: Canvas; tip: [number, number] } => {
    GROUP = 1;
    const sc = new Scene();
    const parts = barrelMeshes(sc, o);
    const f = render(sc, W, H, ox, oy);
    paintBarrel(f, parts, o);
    const c = f.compose();
    c.outline();
    return { c, tip: f.px(parts.fuseTip) };
  };
  const idle = still({ explosive: true });
  const lit = [0, 1, 2, 3].map((t) => {
    const s0 = still({ explosive: true });
    spark(s0.c, s0.tip[0], s0.tip[1] - 1, t, 1.25);
    return s0.c;
  });
  const explode: Canvas[] = [];
  // 0: the fuse burns into the bung, the barrel swells and fire leaks through every seam.
  {
    const s0 = still({ explosive: true, swell: 1.14, leak: 1, fuse: false });
    const [bx, by] = idle.tip;
    spark(s0.c, bx - 7, by + 7, 2, 1.3);
    explode.push(s0.c);
  }
  // 1: white flash.
  {
    const c = new Canvas(W, H);
    const cy = oy - 26;
    for (let y = cy - 60; y <= cy + 40; y++)
      for (let x = ox - 64; x <= ox + 64; x++) {
        const dx = x + 0.5 - ox, dy = y + 0.5 - cy;
        const d = Math.hypot(dx, dy * 1.1), a = Math.atan2(dy, dx);
        const ray = Math.pow(Math.max(0, Math.cos(a * 4 + 0.4)), 18) * 36 + Math.pow(Math.max(0, Math.cos(a * 4 + 0.4 + Math.PI / 4)), 30) * 20;
        const r = 22 + ray;
        if (d > r || (dy > 20 && d > 22)) continue;
        const k = d / r;
        c.set(x, y, k < 0.55 ? WHITE_HOT : k < 0.8 ? FIRE_R[5] : k < 0.92 ? FIRE_R[4] : FIRE_R[3]);
      }
    explode.push(c);
  }
  // 2..9: fireball, smoke and debris; the scorch mark stays.
  const pieces = barrelPieces(true, 900, true).map((p, k) => ({ ...p, opts: { ...p.opts, pal: p.opts.pal === RED ? (k % 3 === 0 ? CHAR : CHAR_RED) : p.opts.pal } }));
  for (let fr = 2; fr < 10; fr++) {
    const c = new Canvas(W, H);
    if (fr >= 3) scorchMark(c, ox, oy - 2, 30 + Math.min(fr, 6) * 2, fr);
    const df = renderPieces(pieces, fr - 2.2, W, H, ox, oy);
    const deb = df.compose();
    deb.outline();
    const fb = fireball(W, H, ox, oy, fr);
    if (fr <= 4) {
      blit(c, deb);
      blit(c, fb);
    } else {
      blit(c, fb);
      blit(c, deb);
    }
    // Embers flung out.
    if (fr <= 7)
      for (let k = 0; k < 18; k++) {
        const a = rnd(400, k) * TAU;
        const d = (40 + rnd(401, k) * 40) * (0.5 + (fr - 2) * 0.17);
        const x = ox + Math.cos(a) * d, y = oy - 40 + Math.sin(a) * d * 0.8 + (fr - 2) * (fr - 2) * 1.6;
        if (y > oy + 8) continue;
        c.set(Math.round(x), Math.round(y), fr < 5 ? FIRE_R[5] : FIRE_R[3]);
        if (fr < 4) c.set(Math.round(x - Math.cos(a)), Math.round(y - Math.sin(a)), FIRE_R[3]);
      }
    explode.push(c);
  }
  return finish('barrel_explosive', 'Explosive Barrel', [0.6, 0.9], ['cover-half', 'destructible', 'explosive'], { idle: { frames: [idle.c], fps: 0 }, lit: { frames: lit, fps: 12 }, explode: { frames: explode, fps: 12, loop: false } }, ox, idle.c.bounds()![3]);
}

// ================================================================================================
// CRATES
// ================================================================================================

type Brace = 'diag' | 'x' | 'none';
interface CrateSpec {
  /** Edge length (px). */
  S: number;
  yaw: number;
  /** Where its base center stands. */
  pos: V3;
  front: Brace;
  side: Brace;
  seed: number;
  /** Anticipation squash (0..0.1). */
  squash?: number;
}
interface CratePart {
  tris: Tri[];
  kind: 'core' | 'batten' | 'brace' | 'top' | 'board';
  /** Local center, long axis and face normal (for flying apart). */
  c: V3;
  long: V3;
  nrm: V3;
}
const BAT = 5.2; // batten width
const RAISE = 1.4; // battens stand proud of the boards

/** A brace across one face as an extruded strip in the face plane (x along the face, h up). */
function bracePoly(x0: number, x1: number, h0: number, h1: number, w: number, flip: boolean): [number, number][] {
  const p: [number, number][] = flip
    ? [[x0, h1], [x0, h1 - w], [x1 - w, h0], [x1, h0], [x1, h0 + w], [x0 + w, h1]]
    : [[x0, h0], [x0 + w, h0], [x1, h1 - w], [x1, h1], [x1 - w, h1], [x0, h0 + w]];
  return p;
}

/** The crate's parts in its local frame (base center at the origin, front face toward -D, right face +X). */
function crateParts(o: CrateSpec, boards: boolean): CratePart[] {
  const h = o.S * (1 - (o.squash ?? 0)), s = (o.S / 2) * (1 + (o.squash ?? 0) * 0.5);
  const parts: CratePart[] = [];
  const add2 = (tris: Tri[], kind: CratePart['kind'], c: V3, long: V3, nrm: V3) => parts.push({ tris, kind, c, long, nrm });
  const I = s - RAISE; // boards' plane
  if (!boards) {
    add2(box(-I, I, 0, h - RAISE, -I, I), 'core', [0, h / 2, 0], [1, 0, 0], [0, 1, 0]);
  } else {
    // Three boards per face (front, right, back, left), each its own plank.
    const bh = (h - RAISE) / 3;
    for (let k = 0; k < 3; k++) {
      const h0 = k * bh + 0.15, h1 = (k + 1) * bh - 0.15;
      add2(box(-I, I, h0, h1, -I, -I + 1.6), 'board', [0, (h0 + h1) / 2, -I + 0.8], [1, 0, 0], [0, 0, -1]);
      add2(box(I - 1.6, I, h0, h1, -I, I), 'board', [I - 0.8, (h0 + h1) / 2, 0], [0, 0, 1], [1, 0, 0]);
      add2(box(-I, I, h0, h1, I - 1.6, I), 'board', [0, (h0 + h1) / 2, I - 0.8], [1, 0, 0], [0, 0, 1]);
      add2(box(-I, -I + 1.6, h0, h1, -I, I), 'board', [-I + 0.8, (h0 + h1) / 2, 0], [0, 0, 1], [-1, 0, 0]);
    }
  }
  // Top boards (three, running left to right), flush with the battens.
  const tb = (2 * s) / 3;
  for (let k = 0; k < 3; k++) {
    // The lid boards overhang the frame a little, so their edge reads as a lip over it.
    const d0 = -s + k * tb + (k ? 0.2 : -0.6), d1 = -s + (k + 1) * tb - (k < 2 ? 0.2 : -0.6);
    add2(box(-s - 0.6, s + 0.6, h - RAISE, h, d0, d1), 'top', [0, h - RAISE / 2, (d0 + d1) / 2], [1, 0, 0], [0, 1, 0]);
  }
  // Battens: a frame on the front and the right face (the back and left ones only show when it breaks).
  const frameOn = (face: 'front' | 'right' | 'back' | 'left') => {
    const out = face === 'front' || face === 'left' ? -1 : 1;
    const alongX = face === 'front' || face === 'back';
    const mk = (a0: number, a1: number, h0: number, h1: number, kind: CratePart['kind'] = 'batten', poly?: [number, number][], sink = 0) => {
      const n: V3 = alongX ? [0, 0, out] : [out, 0, 0];
      const o0 = out * (s - RAISE), o1 = out * s;
      const lo = Math.min(o0, o1), hi = Math.max(o0, o1);
      const inset = 0.4 + sink;
      let tris: Tri[];
      if (poly) tris = alongX ? extrudeXH(poly, lo + (out < 0 ? inset : 0), hi - (out > 0 ? inset : 0)) : extrudeDH(poly, lo + (out < 0 ? inset : 0), hi - (out > 0 ? inset : 0));
      else tris = alongX ? box(a0, a1, h0, h1, lo, hi) : box(lo, hi, h0, h1, a0, a1);
      const ca = (a0 + a1) / 2, ch = (h0 + h1) / 2;
      const c: V3 = alongX ? [ca, ch, (lo + hi) / 2] : [(lo + hi) / 2, ch, ca];
      const long: V3 = h1 - h0 > a1 - a0 ? [0, 1, 0] : alongX ? [1, 0, 0] : [0, 0, 1];
      add2(tris, kind, c, long, n);
    };
    const top = h - RAISE;
    mk(-s, -s + BAT, 0, top);
    mk(s - BAT, s, 0, top);
    mk(-s + BAT, s - BAT, 0, BAT);
    mk(-s + BAT, s - BAT, top - BAT, top);
    const br = face === 'front' ? o.front : face === 'right' ? o.side : 'none';
    if (br !== 'none') {
      mk(-s + BAT, s - BAT, BAT, top - BAT, 'brace', bracePoly(-s + BAT, s - BAT, BAT, top - BAT, 5.6, face === 'right'));
      // The second strip of an X sits under the first, so they cross with a clean joint.
      if (br === 'x') mk(-s + BAT, s - BAT, BAT, top - BAT, 'brace', bracePoly(-s + BAT, s - BAT, BAT, top - BAT, 5.6, face !== 'right'), 0.45);
    }
  };
  frameOn('front');
  frameOn('right');
  if (boards) {
    frameOn('back');
    frameOn('left');
  }
  return parts;
}

/** Places local crate geometry in the world. */
const crateXf = (o: CrateSpec) => (tris: Tri[]): Tri[] => move(rotY(tris, o.yaw), o.pos);
const crateP = (o: CrateSpec, p: V3): V3 => add(rotYp(p, o.yaw), o.pos);
const crateLocal = (o: CrateSpec, p: V3): V3 => rotYp(sub(p, o.pos), -o.yaw);

const WOOD_CRATE = (seed: number, kind: CratePart['kind']): MeshOpts => ({
  pal: WOOD,
  seed,
  steps: kind === 'core' || kind === 'board' ? [1, 2, 3, 3] : [2, 2, 3, 4],
  bias: kind === 'top' ? -0.17 : -0.1,
  contrast: 1.1,
  facetVar: kind === 'core' || kind === 'top' ? 0.02 : 0.05,
  jitter: 0.06,
});

/** Board seams, grain, nail heads on one rendered crate. */
function paintCrate(f: Frame, o: CrateSpec, meshes: { m: Mesh; kind: CratePart['kind'] }[]): void {
  declump(f, meshes.filter((mm) => mm.kind === 'top' || mm.kind === 'core').map((mm) => mm.m.id), 4);
  const h = o.S * (1 - (o.squash ?? 0)), s = (o.S / 2) * (1 + (o.squash ?? 0) * 0.5);
  const bh = (h - RAISE) / 3, tb = (2 * s) / 3;
  for (const { m, kind } of meshes)
    f.each(m.id, (i) => {
      if (f.over[i]) return;
      const q = crateLocal(o, f.world(i));
      const n = rotYp(f.normal(i), -o.yaw);
      let st = f.step[i];
      const along = Math.abs(n[0]) > 0.7 ? q[2] : q[0];
      if (kind === 'core') {
        // Board seams across the faces.
        if (n[1] < 0.5 && [1, 2].some((k) => Math.abs(q[1] - k * bh) < 0.6)) st = 1;
        else if (n[1] < 0.5 && [1, 2].some((k) => q[1] - k * bh < -0.6 && q[1] - k * bh > -1.7)) st = Math.max(st, 3) - (n[0] > 0.7 ? 1 : 0);
      }
      if (kind === 'top' && [1, 2].some((k) => Math.abs(q[2] - (-s + k * tb)) < 0.5)) st = 1;
      // Grain: short dark streaks along each board or batten (not on the top boards' thin edges,
      // whose lit lip catches the light instead).
      if (kind === 'top' && n[1] < 0.5) {
        if (n[2] < -0.5) f.step[i] = 4;
        return;
      }
      const across = kind === 'top' ? q[2] : q[1];
      const g = kind === 'top' || kind === 'core' || kind === 'board' ? noise(along / 9 + m.id * 7, across * 2.1, 1, o.seed + m.id) : noise(q[1] / 9 + m.id * 3, along * 2.1, 1, o.seed + m.id);
      if (st > 1 && g > 0.78) st -= 1;
      f.step[i] = st;
    });
  // Nails at the batten corners and the brace ends (front and right faces).
  const nails: V3[] = [];
  for (const sx of [-1, 1])
    for (const hh of [BAT / 2, h - RAISE - BAT / 2]) {
      nails.push([sx * (s - BAT / 2), hh, -s - 0.2]);
      nails.push([s + 0.2, hh, sx * (s - BAT / 2)]);
    }
  for (const p of nails) {
    const [x, y] = f.px(crateP(o, p));
    const i = f.idx(x, y);
    if (i < 0 || f.mesh[i] < 0 || f.over[i]) continue;
    const lit = f.lightv[i] > 0.4;
    f.over[i] = C(IRON, lit ? 4 : 3);
    const j = f.idx(x + 1, y + 1);
    if (j >= 0 && f.mesh[j] >= 0 && !f.over[j]) f.over[j] = C(IRON, 1);
  }
}

function crateScene(sc: Scene, o: CrateSpec): { m: Mesh; kind: CratePart['kind'] }[] {
  return crateParts(o, false).map((p, k) => ({ m: sc.add(crateXf(o)(p.tris), { ...WOOD_CRATE(o.seed * 10 + k, p.kind), ao: p.kind === 'core' ? 0 : 2 }), kind: p.kind }));
}

function crates(): WorldSprite[] {
  const W = 150, H = 130, ox = 75, oy = 96;
  const spec: CrateSpec = { S: 46, yaw: -0.38, pos: [0, 0, 0], front: 'diag', side: 'none', seed: 3 };
  const one = (o: CrateSpec, crack = false): Canvas => {
    GROUP = 1;
    const sc = new Scene();
    const ms = crateScene(sc, o);
    const f = render(sc, W, H, ox, oy);
    paintCrate(f, o, ms);
    if (crack) {
      const core = ms.find((mm) => mm.kind === 'core')!.m;
      const [cx, cy] = f.px(crateP(o, [6, o.S * 0.62, -o.S / 2]));
      paintCrack(f, [[cx, cy], [cx - 1, cy + 3], [cx + 1, cy + 6], [cx, cy + 9], [cx + 2, cy + 12]], [core.id, ...ms.filter((mm) => mm.kind === 'brace').map((mm) => mm.m.id)]);
    }
    const c = f.compose();
    c.outline();
    return c;
  };
  const idle = one(spec);
  // Broken: a squash, the boards burst off and fall into a pile of planks.
  const pieces: Piece[] = crateParts(spec, true).map((p, k) => {
    const c0 = crateP(spec, p.c);
    const nW = rotYp(p.nrm, spec.yaw), longW = rotYp(p.long, spec.yaw);
    const a = Math.atan2(c0[2], c0[0]) + (rnd(960, k) - 0.5) * 1.2;
    const dist = 8 + rnd(961, k) * 26;
    const rest: V3 = [Math.cos(a) * dist * 1.15, (rnd(962, k) < 0.3 ? 2 : 0) + (p.kind === 'top' ? 1 : 0), Math.sin(a) * dist * 0.75];
    // Vertical pieces fall over about the face they belonged to; boards drop flat.
    const vertical = Math.abs(longW[1]) > 0.7;
    const tipAx = vertical ? unit(cross(nW, [0, 1, 0])) : unit(longW);
    const tip = vertical ? (Math.PI / 2) * (rnd(963, k) < 0.5 ? 1 : -1) : p.kind === 'top' ? (rnd(964, k) - 0.5) * 0.3 : (Math.PI / 2) * (nW[1] > 0.5 ? 0 : 1) * (rnd(965, k) < 0.5 ? 1 : -1);
    const t0 = rnd(966, k) * 0.4;
    return {
      tris: crateXf(spec)(p.tris),
      opts: WOOD_CRATE(970 + k, p.kind === 'board' ? 'board' : p.kind),
      pose: flight({ c0, rest, tipAx, tip, yaw: (rnd(967, k) - 0.5) * 1.6, t0, t1: t0 + 2.6 + rnd(968, k) * 0.8, arc: p.kind === 'top' ? 9 + rnd(969, k) * 6 : 4 + rnd(969, k) * 8, bounce: 2 }),
    };
  });
  const broken: Canvas[] = [one({ ...spec, squash: 0.08 }, true)];
  for (let fr = 1; fr < 7; fr++) {
    const t = fr - 0.72;
    const f = renderPieces(pieces, t, W, H, ox, oy);
    const c = f.compose();
    c.outline();
    if (fr === 1) {
      dust(c, ox, oy - 8, 20, 150, 980, 6);
      splinters(c, ox, oy - 30, 1, 12, 981, TAU);
    }
    if (fr === 2) splinters(c, ox, oy - 30, 2, 12, 981, TAU);
    if (fr === 3 || fr === 4) dust(c, ox, oy, 28, fr === 3 ? 120 : 75, 982 + fr, 6);
    broken.push(c);
  }
  const crate = finish('crate', 'Wooden Crate', [0.8, 0.8], ['cover-half', 'destructible', 'climbable'], { idle: { frames: [idle], fps: 0 }, broken: { frames: broken, fps: 12, loop: false } }, ox, idle.bounds()![3]);

  // Stack: two crates side by side and a smaller one on top, turned a little differently.
  const SW = 200, SH = 200, sx = 100, sy = 158;
  GROUP = 1;
  const sc = new Scene();
  const yaw = -0.38;
  const A: CrateSpec = { S: 47, yaw, pos: rotYp([-25, 0, 2], yaw), front: 'x', side: 'none', seed: 11 };
  const Bc: CrateSpec = { S: 48, yaw: yaw + 0.04, pos: rotYp([25, 0, -1], yaw), front: 'diag', side: 'diag', seed: 12 };
  const Tc: CrateSpec = { S: 38, yaw: yaw - 0.16, pos: add(rotYp([-6, 0, 1], yaw), [0, 47, 0]), front: 'diag', side: 'none', seed: 13 };
  const ms = [A, Bc, Tc].map((o) => ({ o, ms: crateScene(sc, o) }));
  const f = render(sc, SW, SH, sx, sy);
  for (const { o, ms: m2 } of ms) paintCrate(f, o, m2);
  const stack = f.compose();
  stack.outline();
  const stackS = finish('crate_stack', 'Stacked Crates', [1.75, 1.6], ['cover-3q', 'blocks-sight', 'destructible', 'climbable'], { idle: { frames: [stack], fps: 0 } }, sx, stack.bounds()![3]);
  return [crate, stackS];
}

// ================================================================================================
// RICE SACKS
// ================================================================================================

interface SackSpec {
  pos: V3;
  yaw: number;
  /** Lowers the middle (a sack draped over two others). */
  drape?: number;
  seed: number;
  stamp?: boolean;
  L?: number;
}
const SACK = { L: 27, Wd: 10.5, Hh: 9.5 };

/** A lying burlap sack along +X (closed end at -X), its neck gathered into a tie and a frayed tuft. */
function sackMeshes(sc: Scene, o: SackSpec): { body: Mesh; tie: Mesh; tieX: number; xf: (p: V3) => V3 } {
  const L = o.L ?? SACK.L, Wd = SACK.Wd, Hh = SACK.Hh;
  const hc = Hh * 0.78;
  const n = 18;
  // Stations along the sack: [x, envelope]; the body, the neck, the tuft.
  const st: [number, number][] = [];
  for (let k = 0; k <= 14; k++) {
    const t = k / 14;
    const x = -L / 2 + t * L;
    let e: number;
    if (t < 0.2) e = Math.sqrt(Math.max(0.02, 1 - (1 - t / 0.2) ** 2));
    else if (t > 0.66) e = lerp(1, 0.3, smooth(0.66, 1, t));
    else e = 1 + 0.03 * Math.sin(Math.PI * t);
    st.push([x, e]);
  }
  const tieX = L / 2 + 2.6;
  st.push([L / 2 + 1.3, 0.25], [tieX, 0.22], [L / 2 + 4.2, 0.27], [L / 2 + 6.2, 0.38], [L / 2 + 7.6, 0.45]);
  const rings = st.map(([x, e], k) => {
    const t = clamp((x + L / 2) / L, 0, 1);
    const gather = smooth(0.55, 1, t) * (k >= 15 ? 0.6 : 1);
    const pts: V3[] = [];
    for (let j = 0; j < n; j++) {
      const a = (j / n) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      // Boxy cross-section (fuller than an ellipse), flat underneath, slumped a little on top.
      let r = 1 - 0.14 * gather * Math.max(0, Math.cos(a * 5 + o.seed));
      const dd = Math.sign(ca) * Math.pow(Math.abs(ca), 0.72) * Wd * e * r;
      let hh = Math.sign(sa) * Math.pow(Math.abs(sa), 0.72) * Hh * e * r * (sa > 0 ? 1 - 0.07 * Math.sin(Math.PI * t) : 0.82);
      hh = Math.max(-hc + 0.2, hh);
      // The sewn end pokes out in two corner ears at the sides.
      const ear = t < 0.22 && k < 15 ? (1 - t / 0.22) * Math.max(0, Math.abs(ca) - 0.55) / 0.45 * 4.2 : 0;
      pts.push([x - ear, hc + hh - (o.drape ?? 0) * Math.sin(Math.PI * t) * (k < 15 ? 1 : 0.3), dd * (1 + ear * 0.04)]);
    }
    return pts;
  });
  const xf = (p: V3): V3 => add(rotYp(p, o.yaw), o.pos);
  const XF = (tris: Tri[]) => move(rotY(tris, o.yaw), o.pos);
  const tuftV = 15 / (rings.length - 1);
  // The seam runs along the upper face that turns toward the viewer.
  const seamU = Math.cos(o.yaw) < 0 ? 0.15 : 0.35;
  const body = sc.add(XF(loft(rings, { capStart: true, capEnd: true, smooth: true })), {
    pal: SACKCLOTH,
    seed: o.seed,
    contrast: 1.3,
    bias: -0.14,
    crest: false,
    jitter: 0.06,
    ao: 2,
    shade: (p, s) => {
      // Coarse weave: short darker thread rows around the sack (only where it is lit).
      const along = p.v * (rings.length - 1);
      // A stitched seam along the top of the sack.
      if (p.v < tuftV * 0.9 && p.v > 0.1 && Math.abs(p.u - seamU) * n < 0.3) return frac(along * 0.8) < 0.3 ? Math.min(4, s + 1) : Math.max(1, s - 1);
      if (p.v < tuftV && s >= 3 && frac(along * 1.6) < 0.22 && noise(p.u * 40, along * 2, 1.2, o.seed + 1) > 0.45) return s - 1;
      return s;
    },
  });
  const tieR = (k: number): V3[] => Array.from({ length: 16 }, (_, j) => {
    const a = (j / 16) * TAU;
    return [tieX + (k - 0.5) * 1.6, hc + Math.sin(a) * (Hh * 0.22 + 1), Math.cos(a) * (Wd * 0.22 + 1)] as V3;
  });
  const tie = sc.add(XF([...tube(tieR(0), 1.05, 6, { closed: true }), ...tube(tieR(1), 1.05, 6, { closed: true })]), { pal: ROPE, seed: o.seed + 5, crest: false, steps: [1, 2, 3, 4] });
  return { body, tie, tieX, xf };
}

function sacks(): WorldSprite {
  const W = 130, H = 90, ox = 65, oy = 70;
  GROUP = 1;
  const sc = new Scene();
  const specs: SackSpec[] = [
    { pos: [-13, 0, 3], yaw: Math.PI + 0.32, seed: 1 },
    { pos: [14, 0, -2], yaw: -0.42, seed: 2, stamp: true },
    { pos: [1, 13.5, 7], yaw: -0.12, seed: 3, drape: 2.5, L: 29 },
  ];
  const ss = specs.map((o) => ({ o, ...sackMeshes(sc, o) }));
  const f = render(sc, W, H, ox, oy);
  for (const s of ss) {
    // The tuft: ragged frayed edge (dark notches), the inside of its mouth dark.
    f.each(s.body.id, (i, x, y) => {
      const v = f.uv[i * 2 + 1];
      const nn = rotYp(f.normal(i), -s.o.yaw);
      if (v > 0.97 && nn[0] > 0.6) f.step[i] = 1;
      else if (v > 0.9 && hash(x, y >> 1, s.o.seed) < 0.3) f.step[i] = Math.max(1, f.step[i] - 1);
    });
    if (s.o.stamp) {
      // A merchant's seal: a red ring around a dot (no real characters).
      const [cx, cy] = f.px(s.xf([-3, SACK.Hh * 0.78 + 1, -SACK.Wd * 0.98]));
      for (let y = cy - 5; y <= cy + 5; y++)
        for (let x = cx - 6; x <= cx + 6; x++) {
          const i = f.idx(x, y);
          if (i < 0 || f.mesh[i] !== s.body.id) continue;
          const d = Math.hypot((x - cx) / 4.6, (y - cy) / 3.8);
          const ring = d > 0.72 && d < 1.02;
          const stroke = d < 0.3;
          if (!ring && !stroke) continue;
          if (noise(x, y, 1.4, 9) < 0.25) continue; // stamped ink is patchy
          f.pal[i] = RED;
          f.step[i] = f.lightv[i] > 0.55 ? 2 : 1;
        }
    }
  }
  const c = f.compose();
  // Loose rope ends hanging from each tie.
  for (const s of ss) {
    const [x, y] = f.px(s.xf([s.tieX, SACK.Hh * 0.78 - SACK.Hh * 0.22 - 1, -SACK.Wd * 0.22 - 1]));
    const i = f.idx(x, y);
    if (i >= 0 && f.mesh[i] >= 0 && f.depth[i] < f.world(i)[2] - 3) continue;
    c.set(x, y + 1, R.rope[3]);
    c.set(x + 1, y + 2, R.rope[2]);
    c.set(x - 1, y + 2, R.rope[3]);
    c.set(x - 1, y + 3, R.rope[2]);
  }
  c.outline();
  return finish('sacks', 'Rice Sacks', [1.2, 0.6], ['cover-half'], { idle: { frames: [c], fps: 0 } }, ox, c.bounds()![3]);
}

// ================================================================================================
// WEAPON RACK
// ================================================================================================

/** Hand-painted steel heads (outlined layers), drawn pixel by pixel: lit left bevel, dark right. */
function spearHead(cv: Canvas, x: number, y: number, kind: 'leaf' | 'cross'): void {
  const S = (s: number) => C(STEEL, s);
  // Socket (iron collar) and a red cord wrap under it.
  for (let k = 0; k < 3; k++) {
    cv.set(x, y + k, C(RED, k === 1 ? 2 : 3));
    cv.set(x + 1, y + k, C(RED, 1));
  }
  cv.set(x, y - 1, C(IRON, 3));
  cv.set(x + 1, y - 1, C(IRON, 1));
  cv.set(x, y - 2, C(IRON, 4));
  cv.set(x + 1, y - 2, C(IRON, 2));
  if (kind === 'leaf') {
    // A long leaf blade: widest a third of the way up, a lit ridge on the left.
    const rows = [1, 2, 2, 3, 3, 3, 3, 2, 2, 2, 1, 1, 1];
    rows.forEach((w, k) => {
      const yy = y - 3 - k;
      for (let u = 0; u < w; u++) {
        const xx = x + (w === 3 ? u - 1 : w === 2 ? u : 0) + (w === 1 ? 0 : 0);
        const s = w === 1 ? (k === rows.length - 1 ? 5 : 4) : u === 0 ? 4 : u === w - 1 ? 2 : 5;
        cv.set(xx, yy, S(s));
      }
    });
  } else {
    // Jumonji: a straight center blade and a cross bar whose tips curl up.
    for (let k = 0; k < 11; k++) {
      const yy = y - 3 - k;
      cv.set(x, yy, S(k > 8 ? 5 : 4));
      if (k < 9) cv.set(x + 1, yy, S(2));
    }
    for (let dx = -5; dx <= 6; dx++) {
      const yy = y - 6 - (Math.abs(dx - 0.5) > 4 ? 1 : 0) - (Math.abs(dx - 0.5) > 5 ? 1 : 0);
      cv.set(x + dx, yy, S(dx <= 0 ? 4 : 3));
      cv.set(x + dx, yy + 1, S(dx <= 0 ? 2 : 1));
    }
  }
}

function weaponRack(): WorldSprite {
  const W = 130, H = 130, ox = 65, oy = 110;
  const YAW = -0.24;
  GROUP = 1;
  const sc = new Scene();
  const Y = (tris: Tri[]) => rotY(tris, YAW);
  const wood = (seed: number, extra: Partial<MeshOpts> = {}): MeshOpts => ({ pal: WOOD_DK, seed, contrast: 1.15, facetVar: 0.04, jitter: 0.06, ...extra });
  const PX = 29;
  const parts: Mesh[] = [];
  for (const sx of [-1, 1]) {
    parts.push(sc.add(Y(slabBox(sx * PX - 2.8, sx * PX + 2.8, 0, 4.5, -13, 13, 1)), wood(1001 + sx, { ao: 2 })));
    parts.push(sc.add(Y(box(sx * PX - 2.4, sx * PX + 2.4, 4.5, 66, -2.4, 2.4)), wood(1003 + sx)));
  }
  // Base board where the butts stand, the rail the shafts lean on, a tie beam and the top beam.
  sc.add(Y(box(-PX + 2.4, PX - 2.4, 0, 3, -10, 2)), wood(1006, { pal: WOOD, ao: 1 }));
  sc.add(Y(box(-PX - 1, PX + 1, 43, 47, -2, 2)), wood(1007));
  sc.add(Y(extrudeXH([[-PX - 9, 68.5], [-PX - 6, 66], [PX + 6, 66], [PX + 9, 68.5], [PX + 10.5, 72.5], [PX + 6, 70.5], [-PX - 6, 70.5], [-PX - 10.5, 72.5]], -3, 3)), wood(1009, { crest: true }));
  // Weapons stand on the base board in front of the rail, leaning back a touch.
  const shaft = (x: number, top: number, r: number, palI: number, seed: number) => sc.add(Y(pole([x, 3, -6], [x + 1.2, top, -3.4], r, 8)), { pal: palI, seed, contrast: 1.1, facetVar: 0, steps: [1, 2, 3, 4] });
  shaft(-15, 71, 1.2, WOOD, 1010);
  const bo = shaft(0, 80, 1.45, WOOD_DK, 1011);
  shaft(15, 69, 1.2, WOOD, 1012);
  const f = render(sc, W, H, ox, oy);
  // Grain along every beam and post.
  for (let i = 0; i < W * H; i++) {
    const mi = f.mesh[i];
    if (mi < 0 || f.pal[i] < 0 || f.over[i]) continue;
    const q = rotYp(f.world(i), -YAW);
    const n = rotYp(f.normal(i), -YAW);
    const vertical = mi === parts[1].id || mi === parts[3].id;
    const g = vertical ? noise(q[1] / 8, (Math.abs(n[0]) > 0.7 ? q[2] : q[0]) * 2, 1, 1020 + mi) : noise(q[0] / 8, q[1] * 2 + q[2], 1, 1020 + mi);
    if (g > 0.8 && f.step[i] > 1) f.step[i] -= 1;
  }
  // Iron caps on the bo staff.
  f.each(bo.id, (i) => {
    const q = rotYp(f.world(i), -YAW);
    if (q[1] > 77 || q[1] < 6) f.pal[i] = IRON;
  });
  const c = f.compose();
  c.outline();
  // Steel heads and cord ties, painted on their own outlined layer.
  const heads = layer(W, H, (cv) => {
    const tip1 = f.px(rotYp([-13.8, 71, -3.4], YAW));
    spearHead(cv, tip1[0], tip1[1], 'leaf');
    const tip2 = f.px(rotYp([16.2, 69, -3.4], YAW));
    spearHead(cv, tip2[0], tip2[1], 'cross');
  });
  c.draw(heads, 0, 0);
  const ties = layer(W, H, (cv) => {
    for (const x of [-15, 0, 15]) {
      const [tx, ty] = f.px(rotYp([x + 0.6, 46, -4.4], YAW));
      for (let k = -1; k <= 2; k++) {
        cv.set(tx + k, ty, C(ROPE, k < 1 ? 4 : 3));
        cv.set(tx + k, ty + 1, C(ROPE, k < 1 ? 3 : 2));
      }
    }
  });
  c.draw(ties, 0, 0);
  return finish('weapon_rack', 'Weapon Rack', [1.3, 1.6], ['interactable', 'destructible'], { idle: { frames: [c], fps: 0 } }, ox, c.bounds()![3]);
}

/** A box with a chamfered top edge. */
function slabBox(x0: number, x1: number, h0: number, h1: number, d0: number, d1: number, ch = 1): Tri[] {
  const rect = (h: number, i: number): V3[] => [[x0 + i, h, d0 + i], [x1 - i, h, d0 + i], [x1 - i, h, d1 - i], [x0 + i, h, d1 - i]];
  return loft([rect(h0, 0), rect(h1 - ch, 0), rect(h1, ch)], { capEnd: true });
}

// ================================================================================================
// main
// ================================================================================================

const OUT = previewDir();
const ONLY = (process.env.CAMP_ONLY ?? '').split(',').filter(Boolean);

/** Zoomed crop of the first frame (anchor marked) and a strip per animation, for review. */
function debugDump(s: WorldSprite): void {
  const bg = hex('#5d6b57');
  const first = Object.values(s.anims)[0].frames[0];
  const z = new Canvas(first.w + 8, first.h + 8);
  z.fillRect(0, 0, z.w, z.h, bg);
  z.draw(first, 4, 4);
  z.set(4 + s.anchor[0], 4 + s.anchor[1] + 1, hex('#ff00ff'));
  z.scaled(first.w > 150 || first.h > 150 ? 3 : first.h > 70 ? 5 : 6).save(join(OUT, `camp-${s.name}-zoom.png`));
  for (const [k, a] of Object.entries(s.anims)) {
    const fw = a.frames[0].w, fh = a.frames[0].h;
    const st = new Canvas((fw + 3) * a.frames.length + 3, fh + 6);
    st.fillRect(0, 0, st.w, st.h, bg);
    a.frames.forEach((fr, i) => st.draw(fr, 3 + i * (fw + 3), 3));
    st.scaled(fw > 150 ? 2 : 4).save(join(OUT, `camp-${s.name}-${k}.png`));
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
  ['campfire', () => [campfire()]],
  ['smoke', () => [smokeColumn()]],
  ['tent', () => [tent()]],
  ['barrel', () => barrels()],
  ['crate', () => crates()],
  ['sacks', () => [sacks()]],
  ['weapon_rack', () => [weaponRack()]],
];
const sprites: WorldSprite[] = BUILDERS.filter(([k]) => !ONLY.length || ONLY.includes(k)).flatMap(([, b]) => b());
if (!ONLY.length) {
  writeGroup('camp', sprites);
  preview(sprites, join(OUT, 'camp.png'), { scale: 3 });
  lineup(sprites, join(OUT, 'camp-lineup.png'), 3);
  animsSheet(sprites, join(OUT, 'camp-anims.png'), 3);
}
for (const s of sprites) {
  debugDump(s);
  const f0 = Object.values(s.anims)[0].frames[0];
  const bb = f0.bounds()!;
  const anims = Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? '' : 'L'}`).join(' ');
  console.log(`${s.name.padEnd(17)} frame ${f0.w}x${f0.h} anchor ${s.anchor} opaque ${bb[2] - bb[0] + 1}x${bb[3] - bb[1] + 1}px (target ${s.meters.map((v) => m(v)).join('x')}) ${anims}`);
}
