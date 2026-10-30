// The river footbridge for the battle maps: a flat, weathered Japanese wooden bridge that spans
// the river along X (7.27 m), with a 2.4 m deep plank deck, square pier posts standing in the
// water in front of the deck's face, and a railing on both long sides.
//
//   npx tsx tools/world-sprites/bridge.ts [previewDir]
//
// Two sprites share one canvas and one anchor (the front-left corner of the deck top), so the game
// draws `bridge` (deck, face, piers, back railing), then the units standing on the deck, then
// `bridge_rail_front` on top. bridge.json next to the sheets gives the deck geometry so the map can
// line it up with its river.
//
// Same method as landmarks.ts (code copied, not imported): every part is a small low-poly mesh
// rasterised with the battle camera (57 px per meter across and up, 38 px per meter of depth) into
// a G-buffer; Lambert light from the upper left with real cast shadows (the front railing, hidden
// from the main sprite, still shades the deck behind it) picks ramp steps through the kit's
// clustered band(); lit facet edges get a crest, overlapping parts a dark inner line; grain, worn
// path, nails, knots, stains, moss, algae, iron and rope are painted on top.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Anim, Canvas, Color, MATERIALS, WorldSprite, band, characterRef, CHARACTER_FEET, fbm, hash, hex, lambert, m, mix, noise, preview, previewDir, ramp, writeGroup } from './kit';

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
const TAU = Math.PI * 2;

// --- palettes -------------------------------------------------------------------------------

const PAL: Color[][] = [];
function pal(r: Color[]): number {
  PAL.push(r);
  return PAL.length - 1;
}
const R = {
  wood: ramp(MATERIALS.wood),
  woodDark: ramp(MATERIALS.woodDark),
  stoneWarm: ramp(MATERIALS.stoneWarm),
  iron: ramp(MATERIALS.iron),
  moss: ramp(MATERIALS.moss),
  rope: ramp(MATERIALS.rope),
  paper: ramp(MATERIALS.paper),
  water: ramp(MATERIALS.water),
  red: ramp(MATERIALS.red),
};
/** A wood ramp plus its variants: worn smooth by feet (a touch lighter) and water-stained (darker, cooler). */
interface Fam {
  base: number;
  worn: number;
  wet: number;
}
function fam(r: Color[]): Fam {
  return {
    base: pal(r),
    worn: pal(r.map((c, i) => (i === 0 ? c : mix(c, r[Math.min(5, i + 1)], 0.45)))),
    wet: pal(r.map((c, i) => (i === 0 ? c : mix(mix(c, R.woodDark[Math.max(1, i - 1)], 0.55), R.water[Math.max(1, i - 1)], 0.1)))),
  };
}
/** Sun-greyed deck boards (wood pulled toward warm stone), a browner batch and one newer board. */
const DECK_A = fam(R.wood.map((c, i) => mix(c, R.stoneWarm[i], 0.42)));
const DECK_B = fam(R.wood.map((c, i) => mix(c, R.stoneWarm[i], 0.27)));
const DECK_N = fam(R.wood.map((c, i) => mix(c, R.stoneWarm[i], 0.1)));
/** Older boards that stayed damp: darker and browner. */
const DECK_D = fam(R.wood.map((c, i) => mix(mix(c, R.stoneWarm[i], 0.2), R.woodDark[i], 0.3)));
/** Railing timber: weathered like the deck, a little browner. */
const RAIL = fam(R.wood.map((c, i) => mix(mix(c, R.stoneWarm[i], 0.3), R.woodDark[i], 0.12)));
/** Stringers and piers: old, damp dark wood. */
const BEAM = fam(R.woodDark.map((c, i) => mix(c, R.wood[i], 0.35)));
/** Post caps: darker, end-grain-stained railing wood. */
/** The face (stringers): mid-dark weathered timber, darker and cooler than the deck. */
const FACE = fam(R.wood.map((c, i) => mix(mix(c, R.woodDark[i], 0.4), R.stoneWarm[i], 0.14)));
const CAP = pal(R.wood.map((c, i) => mix(mix(c, R.woodDark[i], 0.55), R.stoneWarm[i], 0.15)));
const IRON = pal(R.iron);
const MOSS = pal(R.moss);
const ROPE = pal(R.rope);
/** Green-black algae at the waterline. */
const ALGAE = pal(R.moss.map((c, i) => mix(c, R.woodDark[i], 0.35)));

// --- meshes ---------------------------------------------------------------------------------

interface Tri {
  v: [V3, V3, V3];
  vn: [V3, V3, V3];
  n: V3;
  group: number;
}
interface MeshOpts {
  pal: number;
  steps?: number[];
  bias?: number;
  jitter?: number;
  cell?: number;
  seed?: number;
  tex?: number;
  texCell?: number;
  crest?: boolean;
  seam?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  facetVar?: number;
  contrast?: number;
  /** Darkens the lowest `ao` px above `aoBase` by one step (contact shade). */
  ao?: number;
  /** Light kept in cast shadow: [floor, fraction of the direct light] (default [0.2, 0.25]). */
  shadowK?: [number, number];
  aoBase?: number;
}
interface Mesh extends MeshOpts {
  id: number;
  tris: Tri[];
  box: [V3, V3];
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

/** Closed rings of equal vertex count joined by faceted quads, with optional caps (flat or to an apex). */
function loft(rings: V3[][], opts: { capStart?: boolean | V3; capEnd?: boolean | V3 } = {}): Tri[] {
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
  for (let i = 0; i + 1 < rings.length; i++) {
    const axis = mul(add(centers[i], centers[i + 1]), 0.5);
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      const A = rings[i][j], B = rings[i][j2], C = rings[i + 1][j2], D = rings[i + 1][j];
      const g = GROUP++;
      if (len(cross(sub(B, A), sub(C, A))) > 1e-6) {
        const n1 = faceN(A, B, C, axis);
        tris.push({ v: [A, B, C], vn: [n1, n1, n1], n: n1, group: g });
      }
      if (len(cross(sub(C, A), sub(D, A))) > 1e-6) {
        const n2 = faceN(A, C, D, axis);
        tris.push({ v: [A, C, D], vn: [n2, n2, n2], n: n2, group: g });
      }
    }
  }
  const cap = (r: V3[], c: boolean | V3 | undefined, ci: number) => {
    if (!c) return;
    const apex = c === true ? centers[ci] : c;
    const flatG = GROUP++;
    for (let j = 0; j < n; j++) {
      const a = r[j], b = r[(j + 1) % n];
      if (len(cross(sub(b, a), sub(apex, a))) < 1e-6) continue;
      const nn = faceN(a, b, apex, c === true ? mul(add(meshC, centers[ci]), 0.5) : meshC);
      tris.push({ v: [a, b, apex], vn: [nn, nn, nn], n: nn, group: c === true ? flatG : GROUP++ });
    }
  };
  cap(rings[0], opts.capStart, 0);
  cap(rings[rings.length - 1], opts.capEnd, rings.length - 1);
  return tris;
}

/** An axis-aligned box. */
function box(x0: number, x1: number, h0: number, h1: number, d0: number, d1: number): Tri[] {
  const r0: V3[] = [[x0, h0, d0], [x1, h0, d0], [x1, h0, d1], [x0, h0, d1]];
  const r1: V3[] = r0.map((p) => [p[0], h1, p[2]] as V3);
  return loft([r0, r1], { capStart: true, capEnd: true });
}
/** Extrudes a convex polygon given in the D-H plane along X from x0 to x1 (closed both ends). */
function extrudeDH(poly: [number, number][], x0: number, x1: number): Tri[] {
  const r0: V3[] = poly.map(([d, h]) => [x0, h, d]);
  const r1: V3[] = poly.map(([d, h]) => [x1, h, d]);
  return loft([r0, r1], { capStart: true, capEnd: true });
}
/** A square ring of half-size s around (cx, cd) at height h, its four vertical edges chamfered by c (mentori). */
function ring8(cx: number, h: number, cd: number, s: number, c: number): V3[] {
  return [
    [cx - s + c, h, cd - s],
    [cx + s - c, h, cd - s],
    [cx + s, h, cd - s + c],
    [cx + s, h, cd + s - c],
    [cx + s - c, h, cd + s],
    [cx - s + c, h, cd + s],
    [cx - s, h, cd + s - c],
    [cx - s, h, cd - s + c],
  ];
}
/** A square post with chamfered edges: a lit chamfer on the left, a dark one on the right. */
function squarePost(cx: number, cd: number, s: number, c: number, h0: number, h1: number): Tri[] {
  return loft([ring8(cx, h0, cd, s, c), ring8(cx, h1, cd, s, c)], { capStart: true, capEnd: true });
}
const transform = (tris: Tri[], f: (p: V3) => V3, fn: (n: V3) => V3): Tri[] =>
  tris.map((t) => ({ v: t.v.map(f) as [V3, V3, V3], vn: t.vn.map(fn) as [V3, V3, V3], n: fn(t.n), group: t.group }));
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
    this.over = new Array(N).fill(null);
  }
  idx(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? y * this.w + x : -1;
  }
  proj(p: V3): [number, number] {
    return [this.ox + p[0], this.oy - p[1] - K * p[2]];
  }
  normal(i: number): V3 {
    return [this.nrm[i * 3], this.nrm[i * 3 + 1], this.nrm[i * 3 + 2]];
  }
  world(i: number): V3 {
    return [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]];
  }
  compose(): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let i = 0; i < this.w * this.h; i++) {
      const o = this.over[i];
      if (o) c.set(i % this.w, Math.floor(i / this.w), o);
      else if (this.pal[i] >= 0) c.set(i % this.w, Math.floor(i / this.w), PAL[this.pal[i]][this.step[i]]);
    }
    return c;
  }
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
function rayBox(o: V3, d: V3, bx: [V3, V3]): boolean {
  let t0 = 0, t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-9) {
      if (o[k] < bx[0][k] - 0.5 || o[k] > bx[1][k] + 0.5) return false;
      continue;
    }
    let a = (bx[0][k] - 0.5 - o[k]) / d[k], b = (bx[1][k] + 0.5 - o[k]) / d[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Rasterises the visible meshes into a Frame (origin (ox, oy) = world (0, 0, 0)), shades every pixel
 * into a ramp step (every mesh of the scene casts shadows, visible or not), adds facet crests,
 * inner lines between parts and cleans single-pixel speckles.
 */
function render(scene: Scene, w: number, h: number, ox: number, oy: number, visible: (mm: Mesh) => boolean): Frame {
  const f = new Frame(w, h, ox, oy, scene);
  for (const mesh of scene.meshes) {
    if (!visible(mesh)) continue;
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
          f.nrm.set(t.n, i * 3);
          f.pos.set(wp, i * 3);
        }
    }
  }
  const casters = scene.meshes.filter((mm) => mm.castShadow !== false);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const mi = f.mesh[i];
      if (mi < 0) continue;
      const mesh = scene.meshes[mi];
      const n = f.normal(i), p = f.world(i);
      let light = lightOf(n);
      light = 0.5 + (light - 0.5) * (mesh.contrast ?? 1);
      light += (hash(f.group[i], 17, (mesh.seed ?? 0) + 3) - 0.5) * 2 * (mesh.facetVar ?? 0.05);
      if (mesh.tex) light += (fbm(p[0] + 31, p[1] * 0.8 + p[2] * 0.5, mesh.texCell ?? 7, 2, (mesh.seed ?? 0) + 5) - 0.5) * 2 * mesh.tex;
      let lit = true;
      if (mesh.receiveShadow !== false && lightOf(n) > 0.2) {
        const o = add(add(p, mul(n, 0.7)), mul(LW, 0.4));
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
      if (!lit) light = Math.min(light, (mesh.shadowK ?? [0.2, 0.25])[0] + light * (mesh.shadowK ?? [0.2, 0.25])[1]);
      f.lightv[i] = light;
      let s = band(light, x, y, { steps: mesh.steps ?? [1, 2, 3, 4], bias: mesh.bias ?? -0.1, jitter: mesh.jitter ?? 0.08, seed: mesh.seed ?? 7, cell: mesh.cell ?? 3 });
      if (mesh.ao && p[1] < (mesh.aoBase ?? 0) + mesh.ao) s = Math.max(1, s - 1);
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

/** A 2D layer drawn with its own outline (inner lines where it overlaps what is below). */
function layer(w: number, h: number, draw: (c: Canvas) => void): Canvas {
  const c = new Canvas(w, h);
  draw(c);
  c.outline();
  return c;
}

/**
 * Moss on upward-facing pixels: a world-anchored mask (plus a `bias` that favours edges and
 * corners) filled with small cushions lit from the upper left, dark under-edges, hanging a little
 * over front edges and poking above the silhouette.
 */
function paintMoss(f: Frame, o: { meshes: Set<number>; amount: number; seed: number; cell?: number; minUp?: number; drip?: number; bumps?: boolean; bias?: (p: V3) => number }): void {
  const mask = new Uint8Array(f.w * f.h);
  for (let i = 0; i < f.w * f.h; i++) {
    if (!o.meshes.has(f.mesh[i]) || f.over[i]) continue;
    const n = f.normal(i), p = f.world(i);
    if (n[1] < (o.minUp ?? 0.45)) continue;
    const v = fbm(p[0] + 50, p[2] * 1.4 + 50, o.cell ?? 9, 3, o.seed) + (o.bias ? o.bias(p) : 0);
    if (v > 1 - o.amount) mask[i] = 1;
  }
  const drip = o.drip ?? 2;
  for (let y = f.h - 2; y >= 0; y--)
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x;
      if (mask[i] !== 1) continue;
      const below = f.idx(x, y + 1);
      if (below < 0 || mask[below] || f.pal[below] < 0 || !o.meshes.has(f.mesh[below]) || f.normal(below)[1] > 0.45) continue;
      const n = Math.floor(hash(x, 3, o.seed + 9) * (drip + 1));
      for (let k = 1; k <= n; k++) {
        const j = f.idx(x, y + k);
        if (j >= 0 && f.pal[j] >= 0 && o.meshes.has(f.mesh[j]) && !f.over[j]) mask[j] = 2;
      }
    }
  if (o.bumps)
    for (let y = 1; y < f.h; y++)
      for (let x = 0; x < f.w; x++) {
        const i = y * f.w + x;
        const up = f.idx(x, y - 1);
        if (mask[i] !== 1 || up < 0 || f.pal[up] >= 0 || f.over[up]) continue;
        if (noise(x, 0, 2, o.seed + 21) > 0.55) mask[up] = 3;
      }
  const M = (x: number, y: number): number => {
    const j = f.idx(x, y);
    return j < 0 ? 0 : mask[j];
  };
  const delta = new Int8Array(f.w * f.h);
  const g = 4;
  for (let gy = 0; gy < f.h; gy += g)
    for (let gx = 0; gx < f.w; gx += g) {
      const cx = gx + Math.floor(hash(gx, gy, o.seed + 1) * g), cy = gy + Math.floor(hash(gx, gy, o.seed + 2) * g);
      if (M(cx, cy) !== 1) continue;
      const rx = 1.8 + hash(gx, gy, o.seed + 3) * 1.4, ry = rx * 0.75;
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
      const lit = f.mesh[i] < 0 || f.lightv[i] > 0.4;
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
  const out: [number, number, number][] = [];
  for (let k = 0; k < pts.length; k++) {
    const prev = out[out.length - 1], next = pts[(k + 1) % pts.length], c = pts[k];
    if (prev && Math.abs(prev[0] - next[0]) === 1 && Math.abs(prev[1] - next[1]) === 1 && Math.abs(prev[0] - c[0]) + Math.abs(prev[1] - c[1]) === 1 && Math.abs(next[0] - c[0]) + Math.abs(next[1] - c[1]) === 1) continue;
    out.push(c);
  }
  return out;
}

// ================================================================================================
// THE BRIDGE
// ================================================================================================

const L = m(7.27); // span along X: 414 px
const DECK_PX = 91; // deck depth on screen (2.4 m x 38 px)
const DEPTH = DECK_PX / K; // 2.4 m in world px
const WATER = -m(0.4); // the water surface, 23 px under the deck top
const PLANK_T = 3.5;
const N_POSTS = 7; // railing posts every ~1.2 m
const POST_S = 3.5; // railing post half size (0.12 m square)
const POST_TOP = 56;
const RAILS: [number, number][] = [
  [24, 29], // mid rail
  [47, 52], // top rail
];
const FRONT_POST_D = 4.5;
const BACK_POST_D = DEPTH - 4.5;
const PIER_S = 5.5; // pier post half size (0.2 m square)
const PIER_D = -3.5; // piers stand in front of the deck's face
/** Railing post centers along X: end posts flush with the deck ends, centers on half pixels so posts stay crisp. */
const postX = (k: number): number => Math.round(POST_S + (k * (L - 2 * POST_S)) / (N_POSTS - 1) - 0.5) + 0.5;
const pierX = (k: number): number => clamp(postX(k), PIER_S, L - PIER_S);
/** The two end piers stand on the banks; the five between them stand in the river. */
const inRiver = (k: number): boolean => k > 0 && k < N_POSTS - 1;

interface Plank {
  x0: number;
  x1: number;
  idx: number;
  fam: Fam;
  tilt: number;
}

/** 29 boards of uneven width (about 0.23 m) with 1 px gaps, filling the span exactly. */
function layoutPlanks(): Plank[] {
  const n = 29;
  const raw = Array.from({ length: n }, (_, i) => 11.5 + hash(i, 1, 501) * 3.6);
  const total = raw.reduce((a, b) => a + b, 0);
  const avail = L - (n - 1);
  const out: Plank[] = [];
  let acc = 0, x = 0;
  for (let i = 0; i < n; i++) {
    acc += raw[i];
    const end = i === n - 1 ? L : Math.round((acc / total) * avail) + i;
    const h = hash(i, 4, 501);
    out.push({ x0: x, x1: end, idx: i, fam: i === 17 ? DECK_N : h < 0.16 ? DECK_D : h < 0.5 ? DECK_B : DECK_A, tilt: (hash(i, 3, 501) - 0.5) * 0.11 });
    x = end + 1;
  }
  return out;
}

interface Built {
  sc: Scene;
  planks: Plank[];
  plankOf: Map<number, Plank>;
  under: Mesh;
  strU: Mesh;
  strL: Mesh;
  piers: Mesh[];
  straps: Mesh[];
  back: Set<number>;
  backPosts: Mesh[];
  backRails: Mesh[];
  front: Set<number>;
  frontPosts: Mesh[];
  frontRails: Mesh[];
}

function build(): Built {
  GROUP = 1;
  const sc = new Scene();
  const planks = layoutPlanks();
  const plankOf = new Map<number, Plank>();
  for (const pl of planks) {
    const t = rotZ(box(pl.x0, pl.x1, -PLANK_T, 0, 0, DEPTH), pl.tilt, (pl.x0 + pl.x1) / 2, -PLANK_T / 2);
    const mesh = sc.add(t, { pal: pl.fam.base, seed: 600 + pl.idx, facetVar: 0.03, bias: -0.13, jitter: 0.09, cell: 2.5, tex: 0.035, texCell: 11, shadowK: [0.12, 0.42] });
    plankOf.set(mesh.id, pl);
  }
  // Dark underside that shows through the plank gaps (the gaps become inner lines).
  const under = sc.add(box(0, L, -8, -PLANK_T - 0.2, 2.5, DEPTH - 1), { pal: BEAM.wet, steps: [1, 1, 1, 1], castShadow: false, crest: false });
  // The face: two stringers under the overhanging plank ends; the lower, heavier one stands proud.
  const strU = sc.add(box(-1, L + 1, -10.4, -PLANK_T + 0.1, 1.5, 11), { pal: FACE.base, seed: 701, facetVar: 0.02, bias: -0.05 });
  const strL = sc.add(box(-1, L + 1, -17, -10, 0.6, 13), { pal: FACE.base, seed: 702, facetVar: 0.02, bias: -0.05 });
  // Piers: square, chamfered posts in front of the face, from the water up to the deck, each with
  // an iron strap clamping it to the stringers.
  const piers: Mesh[] = [], straps: Mesh[] = [];
  for (let k = 0; k < N_POSTS; k++) {
    const cx = pierX(k);
    piers.push(sc.add(squarePost(cx, PIER_D, PIER_S, 2, WATER, -1), { pal: BEAM.base, seed: 720 + k, facetVar: 0.03, bias: -0.06 }));
    straps.push(sc.add(loft([ring8(cx, -9.6, PIER_D, PIER_S + 0.7, 2.3), ring8(cx, -6.6, PIER_D, PIER_S + 0.7, 2.3)], { capStart: true, capEnd: true }), { pal: IRON, seed: 740 + k, facetVar: 0.02, bias: -0.05 }));
  }
  // Railings: posts with pyramid caps; rails lashed to the outer face of the posts.
  const railing = (front: boolean) => {
    const pd = front ? FRONT_POST_D : BACK_POST_D;
    const posts: Mesh[] = [], rails: Mesh[] = [];
    const ids = new Set<number>();
    const seed0 = front ? 800 : 900;
    for (let k = 0; k < N_POSTS; k++) {
      const cx = postX(k);
      const post = sc.add(squarePost(cx, pd, POST_S, 1.2, 0, POST_TOP), { pal: RAIL.base, seed: seed0 + k, facetVar: 0.03, bias: -0.1, ao: 3 });
      // Cap: a square board overhanging the post by a pixel, under a low hipped top.
      const cap = sc.add(
        loft([ring8(cx, POST_TOP, pd, POST_S + 1.1, 0.8), ring8(cx, POST_TOP + 1.8, pd, POST_S + 1.1, 0.8), ring8(cx, POST_TOP + 3.6, pd, 1.6, 0.4)], { capStart: true, capEnd: true }),
        { pal: CAP, seed: seed0 + 20 + k, facetVar: 0.02, bias: -0.1 },
      );
      posts.push(post);
      ids.add(post.id).add(cap.id);
    }
    // Rails: one timber per span (joints hidden under the lashings), a chamfer on the top front edge.
    const d0 = front ? pd - POST_S - 4 : pd + POST_S, d1 = d0 + 4;
    RAILS.forEach(([h0, h1], r) => {
      for (let k = 0; k + 1 < N_POSTS; k++) {
        const xa = k === 0 ? -2 : postX(k), xb = k === N_POSTS - 2 ? L + 2 : postX(k + 1);
        const dh = Math.round((hash(k, r, seed0 + 50) - 0.5) * 1.2) * 0.5;
        const poly: [number, number][] = [
          [d0, h0 + dh],
          [d1, h0 + dh],
          [d1, h1 + dh],
          [d0 + 1, h1 + dh],
          [d0, h1 + dh - 1],
        ];
        const rail = sc.add(extrudeDH(poly, xa, xb), { pal: RAIL.base, seed: seed0 + 60 + r * 10 + k, facetVar: 0.03, bias: -0.08 });
        rails.push(rail);
        ids.add(rail.id);
      }
    });
    return { posts, rails, ids };
  };
  const b = railing(false);
  const fr = railing(true);
  return { sc, planks, plankOf, under, strU, strL, piers, straps, back: b.ids, backPosts: b.posts, backRails: b.rails, front: fr.ids, frontPosts: fr.posts, frontRails: fr.rails };
}

/** Grain along a board: dark streaks in 2-3 px clusters that follow the length (v), thin across (u). */
function grain(u: number, v: number, seed: number, amount: number): boolean {
  return noise(u * 1.15, v / 8, 1.3, seed) * 0.7 + noise(u, v / 2.6, 1.5, seed + 1) * 0.3 > amount;
}

/**
 * Grain on a deck board seen from above: three long lines per board that wander a pixel now and
 * then and break into 6-14 px strokes, plus rare short flecks. Fewer, fainter lines on the worn path.
 */
function boardGrain(u: number, v: number, w: number, idx: number, worn: boolean): boolean {
  for (let j = 0; j < 3; j++) {
    const uj = 2 + hash(idx, j, 630) * (w - 4) + Math.round((noise(v / 26, j * 7 + idx, 1, 631) - 0.5) * 2.4);
    if (Math.abs(u - uj) >= 0.5) continue;
    const on = noise(v / 13, j * 3 + idx * 11, 1, 632);
    if (on > (worn ? 0.62 : 0.42)) return true;
  }
  return !worn && hash(Math.floor(u), Math.floor(v / 5), 633 + idx) < 0.012;
}

/** `lines` grain lines across a timber `w` px wide (u across, v along), wandering and broken into strokes. */
function streak(u: number, v: number, w: number, lines: number, seed: number, on: number): boolean {
  for (let j = 0; j < lines; j++) {
    const uj = 1 + hash(seed, j, 634) * (w - 2) + Math.round((noise(v / 22, j * 5 + seed, 1, 635) - 0.5) * 1.6);
    if (Math.abs(u - uj) < 0.5 && noise(v / 11, j * 3 + seed, 1, 636) > on) return true;
  }
  return false;
}

/** How worn the deck is at (x, d): a path along the middle that swings toward the front at both ends. */
function wearAt(x: number, d: number): number {
  const endK = Math.max(0, 1 - Math.min(x, L - x) / 90) ** 2;
  const c = DEPTH * 0.44 + 7 * Math.sin(x / 47) + 3 * Math.sin(x / 13 + 1) - endK * 30;
  return 1 - Math.abs(d - c) / (26 + endK * 8) + (fbm(x, d * 0.8, 12, 2, 640) - 0.5) * 0.7;
}

/** Screen distance (px) from the deck's edges. */
const edgeDist = (p: V3): number => Math.min(p[2] * K, (DEPTH - p[2]) * K, p[0], L - p[0]);

const W = 448, H = 214, OX = 17, OY = 164;

/** Paints the deck boards: bevelled edges, grain, the worn path, stains, knots, checks, nails. */
function paintDeck(f: Frame, b: Built): void {
  for (let y = 1; y < f.h - 1; y++)
    for (let x = 1; x < f.w - 1; x++) {
      const i = y * f.w + x;
      const mi = f.mesh[i];
      const pl = b.plankOf.get(mi);
      if (!pl || f.over[i]) continue;
      const n = f.normal(i), p = f.world(i);
      const u = p[0] - pl.x0, v = p[2];
      let s = f.step[i];
      if (n[1] > 0.8) {
        const wear = wearAt(p[0], v);
        const worn = wear > 0.5;
        const shaded = f.lightv[i] < 0.45;
        const w = pl.x1 - pl.x0;
        if (boardGrain(u, v, w, pl.idx, worn)) s -= 1;
        // Rounded board edges: the left edge catches the light in strokes, the right edge dips.
        const sameL = f.mesh[i - 1] === mi, sameR = f.mesh[i + 1] === mi;
        if (!sameL && !shaded && noise(x, y / 4, 1, 611) > 0.45) s += 1;
        else if (!sameR && noise(x, y / 3, 1, 612) > 0.55) s -= 1;
        // Water stains creep in from the edges (more at the ends and under the railings).
        const st = fbm(p[0] * 0.9, v * 0.75, 9, 3, 650) + (1 - edgeDist(p) / 8) * 0.42;
        f.pal[i] = st > 0.76 ? pl.fam.wet : worn ? pl.fam.worn : pl.fam.base;
        f.step[i] = clamp(s, 1, 4);
      } else if (n[2] < -0.8) {
        // Plank ends (end grain) along the top of the face: lit left edge, dark heart check, wet foot.
        const w = pl.x1 - pl.x0;
        if (u < 1) s += 1;
        else if (u > w - 1) s -= 1;
        else if (Math.abs(u - w * (0.35 + hash(pl.idx, 7, 660) * 0.3)) < 0.5 && p[1] > -2.6) s -= 1;
        f.pal[i] = p[1] < -2.4 || hash(pl.idx, 8, 661) < 0.3 ? pl.fam.wet : pl.fam.base;
        f.step[i] = clamp(s, 1, 4);
      }
    }
  // Knots and end checks.
  for (const pl of b.planks) {
    const w = pl.x1 - pl.x0;
    if (hash(pl.idx, 11, 670) < 0.4) {
      const [kx, ky] = f.proj([pl.x0 + w * (0.3 + hash(pl.idx, 12, 670) * 0.4), 0, 18 + hash(pl.idx, 13, 670) * 100]).map(Math.floor);
      const knot: [number, number, number][] = [[0, 0, -2], [1, 0, -2], [-1, 0, -1], [2, 0, -1], [0, -1, -1], [1, -1, -1], [0, 1, -1], [1, 1, 1], [2, 1, 1]];
      for (const [dx, dy, d] of knot) {
        const j = f.idx(kx + dx, ky + dy);
        if (j >= 0 && f.mesh[j] >= 0 && b.plankOf.get(f.mesh[j]) === pl && !f.over[j]) f.step[j] = clamp(f.step[j] + d, 1, 4);
      }
    }
    if (hash(pl.idx, 14, 671) < 0.45) {
      // A check (split) running back from the front end.
      const cu = pl.x0 + 3 + Math.floor(hash(pl.idx, 15, 671) * (w - 6));
      const ln = 3 + Math.floor(hash(pl.idx, 16, 671) * 6);
      for (let k = 0; k < ln; k++) {
        const [cx, cy] = f.proj([cu + (k > ln / 2 ? 1 : 0), 0, 1 + k / K]).map(Math.floor);
        const j = f.idx(cx, cy);
        if (j >= 0 && b.plankOf.get(f.mesh[j]) === pl && !f.over[j]) f.step[j] = 1;
      }
    }
  }
  // Nails over the three stringer lines: a dark head with a lit left edge, a little rust under some.
  for (const pl of b.planks)
    for (const d of [5.5, DEPTH / 2, DEPTH - 6.5])
      for (const u of [2.5, pl.x1 - pl.x0 - 3.5]) {
        const [nx, ny] = f.proj([pl.x0 + u, 0, d]).map(Math.floor);
        const j = f.idx(nx, ny), jl = f.idx(nx - 1, ny);
        if (j < 0 || b.plankOf.get(f.mesh[j]) !== pl || f.over[j] || f.pal[j] === MOSS) continue;
        const shade = f.lightv[j] < 0.45;
        const worn = wearAt(pl.x0 + u, d) > 0.5;
        const wood = PAL[f.pal[j]];
        f.over[j] = mix(C(IRON, 0), wood[1], 0.35);
        if (jl >= 0 && b.plankOf.get(f.mesh[jl]) === pl) f.over[jl] = mix(C(IRON, worn && !shade ? 4 : 2), wood[3], 0.45);
        const jb = f.idx(nx, ny + 1);
        if (!worn && hash(nx, ny, 675) < 0.35 && jb >= 0 && b.plankOf.get(f.mesh[jb]) === pl && !f.over[jb]) f.over[jb] = mix(R.red[1], PAL[f.pal[jb]][f.step[jb]], 0.55);
      }
}

/** The face: grain, drips under the plank gaps, a scarf joint with bolts, algae along the foot. */
function paintFace(f: Frame, b: Built): void {
  const gapX = new Set(b.planks.slice(0, -1).map((pl) => OX + pl.x1));
  const scarfX = 176;
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x;
      const mi = f.mesh[i];
      if ((mi !== b.strU.id && mi !== b.strL.id) || f.over[i]) continue;
      const n = f.normal(i), p = f.world(i);
      let s = f.step[i];
      let pp = FACE.base;
      if (n[2] < -0.8) {
        if (grain(p[1] * 1.6 + (mi === b.strU.id ? 0 : 40), p[0], 710, 0.71)) s -= 1;
        // Drips: dark streaks running down from the plank gaps.
        const gx = gapX.has(x) ? x : gapX.has(x - 1) && hash(x, 2, 712) < 0.5 ? x - 1 : -1;
        if (gx >= 0 && hash(gx, 1, 711) < 0.6 && p[1] > -PLANK_T - 2 - hash(gx, 3, 711) * (mi === b.strU.id ? 7 : 12)) pp = FACE.wet;
        // Wide damp patches toward the foot of the lower beam.
        if (mi === b.strL.id && p[1] < -13.5 + (noise(p[0] / 5, 0, 1, 713) - 0.5) * 4) pp = FACE.wet;
        // Algae fringe along the very bottom (only over the river).
        if (mi === b.strL.id && p[0] > 40 && p[0] < L - 40 && p[1] < -15.4 + noise(p[0] / 2, 0, 1, 714) * 1.4) {
          f.pal[i] = ALGAE;
          f.step[i] = noise(p[0] / 1.5, 1, 1, 715) > 0.6 ? 3 : 2;
          continue;
        }
        // A scarf joint: a slanted seam with a lit lip on its right.
        const sx = scarfX + (p[1] + 10) * 0.7;
        if (Math.abs(p[0] - sx) < 0.5) {
          f.over[i] = C(FACE.base, 0);
          continue;
        }
        if (p[0] - sx > 0.5 && p[0] - sx < 1.5) s += 1;
      }
      f.pal[i] = pp;
      f.step[i] = clamp(s, 1, 4);
    }
  // Bolts either side of the scarf.
  for (const [bx, bh] of [
    [scarfX - 7, -6.5],
    [scarfX + 6, -6.5],
    [scarfX - 9, -13.5],
    [scarfX + 4, -13.5],
  ] as [number, number][]) {
    const d = bh > -10 ? 1.5 : 0.6;
    const [x, y] = f.proj([bx, bh, d]).map(Math.floor);
    bolt(f, x, y);
  }
}

/** A square bolt head: lit top-left pixel, dark lower right, on whatever wood is there. */
function bolt(f: Frame, x: number, y: number): void {
  const px: [number, number, number][] = [[0, 0, 4], [1, 0, 2], [0, 1, 2], [1, 1, 1]];
  for (const [dx, dy, s] of px) {
    const j = f.idx(x + dx, y + dy);
    if (j >= 0 && f.pal[j] >= 0) f.over[j] = C(IRON, s);
  }
}

/** Piers: vertical grain, a wet band above the waterline, algae at the water, bolts on the straps. */
function paintPiers(f: Frame, b: Built): void {
  const pierIdx = new Map(b.piers.map((pm, k) => [pm.id, k]));
  for (let i = 0; i < f.w * f.h; i++) {
    const k = pierIdx.get(f.mesh[i]);
    if (k === undefined || f.over[i]) continue;
    const n = f.normal(i), p = f.world(i);
    let s = f.step[i];
    if (n[1] > 0.8) continue; // tops keep their light (moss comes later)
    const cx = pierX(k);
    if (grain(p[0] - cx + k * 7, p[1] * 1.4, 730 + k, 0.7)) s -= 1;
    const wl = p[1] - WATER;
    let pp = BEAM.base;
    if (wl < 5 + noise(p[0] / 2, k, 1, 731) * 3) pp = BEAM.wet;
    if (inRiver(k) && wl < 1.6 + noise(p[0] / 1.5, k, 1, 732) * 1.8) {
      f.pal[i] = ALGAE;
      f.step[i] = clamp(s, 1, 3);
      continue;
    }
    if (!inRiver(k) && wl < 3) s -= 1; // earth stain where the end piers meet the bank
    f.pal[i] = pp;
    f.step[i] = clamp(s, 1, 4);
  }
  for (let k = 0; k < N_POSTS; k++) {
    const cx = pierX(k);
    for (const dx of [-2.5, 2.5]) {
      const [x, y] = f.proj([cx + dx - 0.5, -7.4, PIER_D - PIER_S - 0.7]).map(Math.floor);
      bolt(f, x, y);
    }
  }
}

/** Railing timber: vertical grain on posts, long streaks on rails, weathering darker toward the foot. */
function paintRailing(f: Frame, posts: Mesh[], rails: Mesh[], seed: number): void {
  const postIds = new Set(posts.map((pm) => pm.id)), railIds = new Set(rails.map((r) => r.id));
  for (let i = 0; i < f.w * f.h; i++) {
    const mi = f.mesh[i];
    if (f.over[i] || (!postIds.has(mi) && !railIds.has(mi))) continue;
    const n = f.normal(i), p = f.world(i);
    let s = f.step[i];
    let pp = RAIL.base;
    const lo = f.scene.meshes[mi].box[0];
    if (postIds.has(mi)) {
      if (n[1] < 0.8 && streak(p[0] - lo[0], p[1], 2 * POST_S, 2, seed + mi, 0.45)) s -= 1;
      if (p[1] < 6 + noise(p[0], mi, 1, seed + 1) * 4) pp = RAIL.wet;
    } else {
      if (n[2] < -0.5 && streak(p[1] - lo[1], p[0], 4, 1, seed + 2 + mi, 0.35)) s -= 1;
      if (n[1] > 0.8 && noise(p[0] / 4, mi, 1, seed + 3) > 0.7) pp = RAIL.worn;
    }
    f.pal[i] = pp;
    f.step[i] = clamp(s, 1, 4);
  }
}

/** Rope lashing over a rail at a post (front railing: the rail is in front of the post). */
function lashOverRail(cv: Canvas, px: number, yt: number, yb: number): void {
  // Three turns of rope wound around the rail, each 2 px wide, leaning right as they go down.
  for (let j = 0; j < 3; j++) {
    const bx = px - 4 + j * 3;
    for (let y = yt - 1; y <= yb + 1; y++) {
      const lean = y > (yt + yb) / 2 ? 1 : 0;
      const end = y === yt - 1 || y === yb + 1;
      cv.set(bx + lean, y, C(ROPE, end ? 3 : y < (yt + yb) / 2 ? 4 : 3));
      cv.set(bx + lean + 1, y, C(ROPE, end ? 1 : 2));
    }
  }
}

/** Rope coils around a post where a rail passes behind it (back railing). */
function lashAroundPost(cv: Canvas, x0: number, x1: number, yc: number): void {
  for (const off of [-2, 1]) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const y = yc + off + (x > (x0 + x1) / 2 ? 1 : 0);
      const lit = x < (x0 + x1) / 2;
      cv.set(x, y, C(ROPE, lit ? 4 : 3));
      cv.set(x, y + 1, C(ROPE, lit ? 2 : 1));
    }
  }
}

function makeBridge(): { main: Canvas[]; rail: Canvas; built: Built } {
  const b = build();
  const front = b.front;
  // --- main sprite: deck, face, piers, back railing (the front railing only casts shadows) ---
  const f = render(b.sc, W, H, OX, OY, (mm) => !front.has(mm.id));
  paintDeck(f, b);
  paintFace(f, b);
  paintPiers(f, b);
  paintRailing(f, b.backPosts, b.backRails, 910);
  const plankIds = new Set(b.plankOf.keys());
  paintMoss(f, {
    meshes: plankIds,
    amount: 0.24,
    seed: 760,
    cell: 7,
    drip: 2,
    bumps: true,
    // Moss keeps to the edges, the ends over the banks and the corners at the railing posts, never the path.
    bias: (p) => {
      const e = edgeDist(p);
      const nearPost = Math.min(...Array.from({ length: N_POSTS }, (_, k) => Math.abs(p[0] - postX(k)))) < 8 && (p[2] < 14 || p[2] > DEPTH - 14) ? 0.12 : 0;
      const ends = Math.max(0, 1 - Math.min(p[0], L - p[0]) / 28) * 0.18;
      return (1 - e / 7) * 0.3 - 0.16 + nearPost + ends - Math.max(0, wearAt(p[0], p[2]) - 0.3) * 0.5;
    },
  });
  // Moss in the plank seams near the edges and the ends.
  for (let i = 0; i < f.w * f.h; i++) {
    if (f.mesh[i] !== b.under.id || !f.over[i]) continue;
    const p = f.world(i);
    const x = i % f.w, y = Math.floor(i / f.w);
    const e = Math.min(p[2] * K, (DEPTH - p[2]) * K - 2, p[0], L - p[0]);
    if (fbm(p[0] * 0.5, p[2], 6, 2, 765) + (1 - e / 9) * 0.35 > 0.72) f.over[i] = C(MOSS, noise(x, y / 2, 1, 766) > 0.5 ? 2 : 1);
  }
  paintMoss(f, { meshes: new Set(b.piers.map((pm) => pm.id)), amount: 0.45, seed: 761, cell: 4, drip: 1, bumps: true });
  paintMoss(f, { meshes: new Set(b.backRails.map((r) => r.id)), amount: 0.16, seed: 762, cell: 6, drip: 1 });
  const base = f.compose();
  // Lashings on the back railing (rails behind the posts: coils around the posts).
  const lashB = layer(W, H, (cv) => {
    for (let k = 0; k < N_POSTS; k++) {
      const cx = postX(k);
      for (const [h0, h1] of RAILS) {
        const [x0, yc] = f.proj([cx - POST_S, (h0 + h1) / 2, BACK_POST_D - POST_S]);
        lashAroundPost(cv, Math.round(x0), Math.round(x0 + 2 * POST_S - 1), Math.round(yc));
      }
    }
  });
  base.draw(lashB, 0, 0);
  base.outline();
  // Where the piers enter the water the outline becomes a light lip (the water piles against the post).
  const lip = (c: Canvas) => {
    for (let k = 0; k < N_POSTS; k++) {
      if (!inRiver(k)) continue;
      const cx = pierX(k);
      const [x0, yb] = f.proj([cx - PIER_S, WATER, PIER_D - PIER_S]);
      const y = Math.round(yb);
      for (let x = Math.round(x0) - 1; x <= Math.round(x0 + 2 * PIER_S); x++) {
        const t = (x - x0) / (2 * PIER_S);
        c.set(x, y, t < 0.45 ? mix(R.water[5], R.paper[4], 0.45) : t < 0.8 ? R.water[5] : R.water[4]);
      }
    }
  };
  lip(base);
  // Ripples: two rings per pier spreading and fading, offset in time, on the water only.
  const frames: Canvas[] = [];
  for (let t = 0; t < 4; t++) {
    const c = base.clone();
    for (let k = 0; k < N_POSTS; k++) {
      if (!inRiver(k)) continue;
      const [cx, cy] = f.proj([pierX(k), WATER, PIER_D]);
      const glint = mix(R.water[5], R.paper[4], 0.5);
      for (let r = 0; r < 2; r++) {
        const age = ((t + 2 * r + k) % 4) / 4;
        const d = 1.5 + age * 7;
        const col = age < 0.2 ? glint : age < 0.6 ? R.water[5] : R.water[4];
        for (const [x, y, a] of ellipseRing(cx, cy + 0.5, PIER_S + d, (PIER_S + d) * K)) {
          if (Math.sin(a) < 0.3) continue; // only the near arc: the sides are the waterline dashes, the far side is under the deck
          if (Math.cos(a * 3 + k * 1.3 + r * 2.2) < -0.75 + age * 1.25) continue; // broken arcs that shorten as they fade
          if (c.alpha(x, y) !== 0) continue;
          // The upper-left part of a ring catches the sky: one step lighter.
          c.set(x, y, Math.cos(a) < -0.3 && age < 0.6 ? glint : col);
        }
      }
      // Dashes at the waterline either side of the post, drifting outward.
      const [lx, wy] = f.proj([pierX(k) - PIER_S, WATER, PIER_D - PIER_S]);
      const y = Math.round(wy) - 1;
      const reach = [2, 3, 5, 7][(t + k) % 4], dl = [3, 3, 2, 2][(t + k) % 4];
      const dc = [glint, R.water[5], R.water[5], R.water[4]][(t + k) % 4];
      for (let q = 0; q < dl; q++) {
        const xl = Math.round(lx) - reach - q, xr = Math.round(lx + 2 * PIER_S) + reach - 1 + q;
        if (c.alpha(xl, y) === 0) c.set(xl, y, dc);
        if (c.alpha(xr, y + 1) === 0) c.set(xr, y + 1, q === 0 ? dc : R.water[4]);
      }
    }
    frames.push(c);
  }
  // --- front railing sprite ---
  const g = render(b.sc, W, H, OX, OY, (mm) => front.has(mm.id));
  paintRailing(g, b.frontPosts, b.frontRails, 810);
  paintMoss(g, { meshes: new Set(b.frontRails.map((r) => r.id)), amount: 0.1, seed: 812, cell: 6, drip: 1 });
  const rail = g.compose();
  const lashF = layer(W, H, (cv) => {
    for (let k = 0; k < N_POSTS; k++) {
      const cx = postX(k);
      for (const [h0, h1] of RAILS) {
        const d0 = FRONT_POST_D - POST_S - 4;
        const yt = Math.round(OY - h1 - K * (d0 + 1)), yb = Math.round(OY - h0 - K * d0) - 1;
        lashOverRail(cv, Math.round(OX + cx - 0.5), yt, yb);
      }
    }
  });
  rail.draw(lashF, 0, 0);
  rail.outline();
  return { main: frames, rail, built: b };
}

// --- framing --------------------------------------------------------------------------------

/** Crops every frame of both sprites to the union of their bounds (1 px margin): one size, one anchor. */
function cropAll(frames: Canvas[]): { crop: (c: Canvas) => Canvas; x0: number; y0: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const fr of frames) {
    const bb = fr.bounds();
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
  return {
    x0,
    y0,
    crop: (c: Canvas) => {
      const out = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
      out.draw(c, -x0, -y0);
      return out;
    },
  };
}

// ================================================================================================
// main
// ================================================================================================

const SCRATCH = previewDir();
const OUT_ROOT = process.env.WORLD_OUT ?? join(import.meta.dirname, '../../src/assets/world');

const { main, rail } = makeBridge();
const { crop, x0, y0 } = cropAll([...main, rail]);
const anchor: [number, number] = [OX - x0, OY - 1 - y0];
const mainFrames = main.map(crop), railFrame = crop(rail);
const sprites: WorldSprite[] = [
  { name: 'bridge', label: 'Wooden Bridge', meters: [7.27, 1.5], anchor, tags: ['walkable', 'flammable', 'destructible'], anims: { idle: { frames: mainFrames, fps: 4 } as Anim } },
  { name: 'bridge_rail_front', label: 'Bridge Front Railing', meters: [7.27, 1.05], anchor, tags: ['cover-half'], anims: { idle: { frames: [railFrame], fps: 0 } as Anim } },
];
writeGroup('bridge', sprites, OUT_ROOT);
const info = { lengthPx: L, deckDepthPx: DECK_PX, deckTopY: anchor[1], anchor };
mkdirSync(join(OUT_ROOT, 'bridge'), { recursive: true });
writeFileSync(join(OUT_ROOT, 'bridge', 'bridge.json'), JSON.stringify(info, null, 1) + '\n');
preview(sprites, join(SCRATCH, 'bridge.png'), { scale: 2, maxWidth: 1000 });

// --- review images (scratch only) -----------------------------------------------------------

/** A plain river strip behind the bridge so the ripples and the outline can be judged. */
function riverBg(w: number, h: number, ax: number, ay: number): Canvas {
  const c = new Canvas(w, h);
  const grass = ramp(MATERIALS.grass);
  // The baked map's river tones (tools/maps/palette.py WATER 2..4).
  const water = [hex('#173f5c'), hex('#173f5c'), hex('#1d5070'), hex('#256487'), hex('#2f7b9e'), hex('#4596b4')];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const wx = x - ax;
      const bank0 = 48 + Math.sin(y / 23) * 6 + (y - ay) * 0.12, bank1 = L - 52 + Math.sin(y / 19 + 2) * 6 - (y - ay) * 0.1;
      const inW = wx > bank0 && wx < bank1;
      const edge = inW && (wx - bank0 < 5 || bank1 - wx < 5);
      const n = noise(x, y * 1.6, 3, 99);
      c.set(x, y, inW ? (edge ? mix(water[3], grass[2], 0.4) : n > 0.62 ? water[4] : n < 0.3 ? water[2] : water[3]) : n > 0.6 ? grass[3] : grass[2]);
    }
  return c;
}
function compositeScene(): Canvas {
  const fw = mainFrames[0].w, fh = mainFrames[0].h;
  const c = riverBg(fw, fh + 20, anchor[0], anchor[1]);
  c.draw(mainFrames[0], 0, 0);
  const ref = characterRef();
  // One unit in the middle of the deck, one near the front edge (half hidden by the railing).
  for (const [x, d, flip] of [
    [150, 60, false],
    [250, 14, true],
  ] as [number, number, boolean][]) {
    c.draw(ref, anchor[0] + x - CHARACTER_FEET[0], anchor[1] - Math.round(d * 38 / 57) - CHARACTER_FEET[1], flip);
  }
  c.draw(railFrame, 0, 0);
  return c;
}
const scene = compositeScene();
scene.scaled(2).save(join(SCRATCH, 'bridge-scene-2x.png'));
const cut = (c: Canvas, x: number, y: number, w: number, h: number): Canvas => {
  const o = new Canvas(w, h);
  o.draw(c, -x, -y);
  return o;
};
const fh = mainFrames[0].h;
cut(scene, 0, 0, 150, fh).scaled(4).save(join(SCRATCH, 'bridge-zoom-left.png'));
cut(scene, 140, 0, 150, fh).scaled(4).save(join(SCRATCH, 'bridge-zoom-mid.png'));
cut(scene, mainFrames[0].w - 150, 0, 150, fh).scaled(4).save(join(SCRATCH, 'bridge-zoom-right.png'));
{
  const mo = riverBg(mainFrames[0].w, fh, anchor[0], anchor[1]);
  mo.draw(mainFrames[0], 0, 0);
  cut(mo, 0, 0, 150, fh).scaled(4).save(join(SCRATCH, 'bridge-main-left.png'));
  cut(mo, 140, 0, 150, fh).scaled(4).save(join(SCRATCH, 'bridge-main-mid.png'));
  mo.scaled(2).save(join(SCRATCH, 'bridge-main-2x.png'));
}
{
  // Ripple frames around one pier.
  const [px] = [anchor[0] + pierX(2)];
  const strip = new Canvas(4 * 44, 40);
  mainFrames.forEach((fr, t) => {
    const bg = riverBg(fr.w, fr.h + 30, anchor[0], anchor[1]);
    bg.draw(fr, 0, 0);
    strip.draw(cut(bg, Math.round(px) - 22, anchor[1] + 8, 44, 40), t * 44, 0);
  });
  strip.scaled(6).save(join(SCRATCH, 'bridge-ripples.png'));
}
{
  const rbg = new Canvas(railFrame.w, railFrame.h);
  rbg.fillRect(0, 0, rbg.w, rbg.h, hex('#5d6b57'));
  rbg.draw(railFrame, 0, 0);
  cut(rbg, 0, 0, 220, railFrame.h).scaled(4).save(join(SCRATCH, 'bridge-rail-zoom.png'));
}
// For the map composites (bridge-compose.py): the character reference as a PNG.
characterRef().save(join(SCRATCH, 'bridge-work', 'bridge-charref.png'));

const bb = mainFrames[0].bounds()!, rb = railFrame.bounds()!;
console.log(`bridge             frame ${mainFrames[0].w}x${mainFrames[0].h} anchor ${anchor} opaque ${bb[2] - bb[0] + 1}x${bb[3] - bb[1] + 1}`);
console.log(`bridge_rail_front  frame ${railFrame.w}x${railFrame.h} anchor ${anchor} opaque ${rb[2] - rb[0] + 1}x${rb[3] - rb[1] + 1} (rail top ${anchor[1] - rb[1]} px above the deck edge)`);
console.log('bridge.json', JSON.stringify(info));
