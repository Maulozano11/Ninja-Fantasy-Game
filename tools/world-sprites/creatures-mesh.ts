// 3D helpers for the creature sprites (creatures.ts). Same camera, light and step pipeline as the
// landmarks the owner approved: low-poly meshes rasterised with the battle camera's projection
// (57 px per meter across and up, 38 px per meter of depth) into a G-buffer, Lambert light from the
// upper left with cast shadows, the kit's clustered band() picking ramp steps, crests on lit facet
// edges and dark inner lines where parts overlap. Extended for organic bodies:
//
//  - every vertex carries four surface attributes, interpolated per pixel. Tubes store the arc
//    length s along the spine, the angle around the tube (as cos/sin, 0 = belly) and the radius, so
//    scale rows, belly plates and the band clusters are anchored to the skin and stay put when a
//    neck sways; rigid parts store their local coordinates for the same reason;
//  - cast shadows come from a shadow map rasterised along the light (fast enough for hundreds of
//    frames) instead of ray casts;
//  - a long tube folding over itself (a coiled tail, a neck in front of its own base) gets the same
//    dark inner line as two separate parts.

import { Canvas, Color, band, hash, lambert } from './kit';

// --- math -----------------------------------------------------------------------------------

/** World vector in pixels: [X right, H up, D away from the viewer]. */
export type V3 = [number, number, number];
export type V2 = [number, number];
/** Per-vertex surface attributes (tubes: s, cos a, sin a, r; rigid parts: local x, h, d, 0). */
export type Attr = [number, number, number, number];

/** Screen pixels per world pixel of depth (38 px per meter of depth vs 57 across). */
export const K = 38 / 57;
export const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** Direction toward the light in world space (upper left, a little in front). */
export const LW: V3 = unit([-0.55, 0.7, -0.45]);
/** Light (0..1) for a world normal, the kit's Lambert (screen y down, z toward the viewer). */
export const lightOf = (n: V3): number => lambert(n[0], -n[1], -n[2]);

/** Cubic bezier point. */
export function bez(p0: V3, p1: V3, p2: V3, p3: V3, t: number): V3 {
  const s = 1 - t;
  const a = s * s * s, b = 3 * s * s * t, c = 3 * s * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1], a * p0[2] + b * p1[2] + c * p2[2] + d * p3[2]];
}

/** Resamples a polyline at `n + 1` points evenly spaced by arc length; also returns the total length. */
export function resample(pts: V3[], n: number): { pts: V3[]; length: number } {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + len(sub(pts[i], pts[i - 1])));
  const L = acc[acc.length - 1];
  const out: V3[] = [];
  let k = 0;
  for (let i = 0; i <= n; i++) {
    const target = (i / n) * L;
    while (k < pts.length - 2 && acc[k + 1] < target) k++;
    const seg = acc[k + 1] - acc[k] || 1;
    out.push(lerp3(pts[k], pts[k + 1], clamp((target - acc[k]) / seg, 0, 1)));
  }
  return { pts: out, length: L };
}

/** A dense Catmull-Rom polyline through the given points (open curve). */
export function catmull(pts: V3[], per = 12): V3[] {
  const out: V3[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// --- palettes -------------------------------------------------------------------------------

export const PAL: Color[][] = [];
export function pal(r: Color[]): number {
  PAL.push(r);
  return PAL.length - 1;
}
/** Ramp color by palette and step. */
export const C = (p: number, s: number): Color => PAL[p][clamp(Math.round(s), 0, 5)];

// --- meshes ---------------------------------------------------------------------------------

export interface Tri {
  v: [V3, V3, V3];
  /** Vertex normals (smooth meshes) or the face normal three times. */
  vn: [V3, V3, V3];
  n: V3;
  group: number;
  at: [Attr, Attr, Attr];
}

let GROUP = 1;
/** Restart facet ids (call before building each frame so the same facet keeps its id). */
export const resetGroups = (): void => {
  GROUP = 1;
};

const ZA: Attr = [0, 0, 0, 0];

/**
 * A loft: closed rings of equal vertex count joined by quads, with optional caps (flat, or a fan to
 * an apex point). Faceted lofts give each quad its own facet; smooth ones share vertex normals.
 */
export function loft(rings: V3[][], o: { attrs?: Attr[][]; capStart?: boolean | V3; capEnd?: boolean | V3; smooth?: boolean; apexAttr?: [Attr?, Attr?] } = {}): Tri[] {
  const tris: Tri[] = [];
  const n = rings[0].length;
  const A = (i: number, j: number): Attr => o.attrs?.[i]?.[j] ?? ZA;
  const center = (r: V3[]): V3 => mul(r.reduce((a, b) => add(a, b), [0, 0, 0] as V3), 1 / r.length);
  const centers = rings.map(center);
  const meshC = mul(centers.reduce((a, b) => add(a, b), [0, 0, 0] as V3), 1 / centers.length);
  const faceN = (a: V3, b: V3, c: V3, out: V3): V3 => {
    let nn = unit(cross(sub(b, a), sub(c, a)));
    const fc = mul(add(add(a, b), c), 1 / 3);
    if (dot(nn, sub(fc, out)) < 0) nn = mul(nn, -1);
    return nn;
  };
  const sideGroup = GROUP++;
  const acc: V3[][] = rings.map((r) => r.map(() => [0, 0, 0] as V3));
  const quads: { a: [number, number]; b: [number, number]; c: [number, number]; d: [number, number]; n1: V3; n2: V3; g: number }[] = [];
  for (let i = 0; i + 1 < rings.length; i++) {
    const axis = mul(add(centers[i], centers[i + 1]), 0.5);
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n;
      const P0 = rings[i][j], P1 = rings[i][j2], P2 = rings[i + 1][j2], P3 = rings[i + 1][j];
      const n1 = faceN(P0, P1, P2, axis), n2 = faceN(P0, P2, P3, axis);
      const g = o.smooth ? sideGroup : GROUP++;
      quads.push({ a: [i, j], b: [i, j2], c: [i + 1, j2], d: [i + 1, j], n1, n2, g });
      const qn = unit(add(n1, n2));
      for (const [ri, rj] of [[i, j], [i, j2], [i + 1, j2], [i + 1, j]]) acc[ri][rj] = add(acc[ri][rj], qn);
    }
  }
  const P = (ij: [number, number]): V3 => rings[ij[0]][ij[1]];
  const VN = (ij: [number, number], fn: V3): V3 => (o.smooth ? unit(acc[ij[0]][ij[1]]) : fn);
  const AT = (ij: [number, number]): Attr => A(ij[0], ij[1]);
  for (const q of quads) {
    if (len(cross(sub(P(q.b), P(q.a)), sub(P(q.c), P(q.a)))) > 1e-6)
      tris.push({ v: [P(q.a), P(q.b), P(q.c)], vn: [VN(q.a, q.n1), VN(q.b, q.n1), VN(q.c, q.n1)], n: q.n1, group: q.g, at: [AT(q.a), AT(q.b), AT(q.c)] });
    if (len(cross(sub(P(q.c), P(q.a)), sub(P(q.d), P(q.a)))) > 1e-6)
      tris.push({ v: [P(q.a), P(q.c), P(q.d)], vn: [VN(q.a, q.n2), VN(q.c, q.n2), VN(q.d, q.n2)], n: q.n2, group: q.g, at: [AT(q.a), AT(q.c), AT(q.d)] });
  }
  const cap = (ri: number, c: boolean | V3 | undefined, apexA: Attr | undefined) => {
    if (!c) return;
    const r = rings[ri];
    const apex = c === true ? centers[ri] : c;
    const flatG = GROUP++;
    const aa: Attr = apexA ?? (A(ri, 0).map((_, k) => r.reduce((s, __, j) => s + A(ri, j)[k], 0) / n) as Attr);
    for (let j = 0; j < n; j++) {
      const a = r[j], b = r[(j + 1) % n];
      if (len(cross(sub(b, a), sub(apex, a))) < 1e-6) continue;
      const nn = faceN(a, b, apex, meshC);
      const smoothN = o.smooth && c !== true;
      const vn: [V3, V3, V3] = smoothN ? [unit(acc[ri][j]), unit(acc[ri][(j + 1) % n]), nn] : [nn, nn, nn];
      tris.push({ v: [a, b, apex], vn, n: nn, group: c === true || o.smooth ? flatG : GROUP++, at: [A(ri, j), A(ri, (j + 1) % n), aa] });
    }
  };
  cap(0, o.capStart, o.apexAttr?.[0]);
  cap(rings.length - 1, o.capEnd, o.apexAttr?.[1]);
  return tris;
}

export interface TubeOpts {
  /** Sides around the tube (default 14). */
  n?: number;
  /** Belly direction at spine point i (default: the screen-plane normal on the right of travel). */
  ventral?: (i: number, t: V3, p: V3) => V3;
  /** s attribute per spine point (default: arc length from the first point). */
  s?: number[];
  /** Rings closing each end as a hemisphere (0 = flat cap). */
  roundStart?: number;
  roundEnd?: number;
  /** Faceted instead of smooth (default smooth). */
  faceted?: boolean;
  /** Turns the rings (radians) so facets of a faceted tube don't line up with the belly. */
  rot?: number;
  /** Squashes the ring across the lateral axis (1 = round; < 1 flattens the sides). */
  flat?: number;
  /** Leave the start open (a separate disk closes it, e.g. a cut). */
  openStart?: boolean;
}

/**
 * A tube along a spine with a radius per spine point. Ring vertex j sits at angle a from the belly
 * (a = 0 on the ventral line, PI on the dorsal line) and carries [s, cos a, sin a, r].
 */
export function tube(spine: V3[], radius: number[], o: TubeOpts = {}): Tri[] {
  const n = o.n ?? 14;
  const rings: V3[][] = [];
  const attrs: Attr[][] = [];
  const S: number[] = o.s ?? (() => {
    const a = [0];
    for (let i = 1; i < spine.length; i++) a.push(a[i - 1] + len(sub(spine[i], spine[i - 1])));
    return a;
  })();
  const frames: { t: V3; e1: V3; e2: V3 }[] = [];
  for (let i = 0; i < spine.length; i++) {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)];
    const t = unit(sub(b, a));
    let v = o.ventral ? o.ventral(i, t, spine[i]) : ([t[1], -t[0], 0] as V3);
    v = sub(v, mul(t, dot(v, t)));
    if (len(v) < 1e-4) v = frames.length ? frames[frames.length - 1].e1 : ([0, -1, 0] as V3);
    const e1 = unit(v);
    const e2 = unit(cross(t, e1));
    frames.push({ t, e1, e2 });
  }
  const ringAt = (c: V3, f: { e1: V3; e2: V3 }, r: number, s: number) => {
    const pts: V3[] = [];
    const at: Attr[] = [];
    for (let j = 0; j < n; j++) {
      const a = (o.rot ?? 0) + (j * TAU) / n;
      const ca = Math.cos(a), sa = Math.sin(a);
      pts.push(add(c, add(mul(f.e1, ca * r), mul(f.e2, sa * r * (o.flat ?? 1)))));
      at.push([s, ca, sa, r]);
    }
    rings.push(pts);
    attrs.push(at);
  };
  const rs = o.roundStart ?? 0, re = o.roundEnd ?? 0;
  for (let k = rs; k >= 1; k--) {
    const phi = (k / (rs + 1)) * (Math.PI / 2);
    const r0 = radius[0];
    ringAt(sub(spine[0], mul(frames[0].t, Math.sin(phi) * r0)), frames[0], Math.cos(phi) * r0, S[0] - Math.sin(phi) * r0);
  }
  for (let i = 0; i < spine.length; i++) ringAt(spine[i], frames[i], radius[i], S[i]);
  const last = spine.length - 1;
  for (let k = 1; k <= re; k++) {
    const phi = (k / (re + 1)) * (Math.PI / 2);
    const r0 = radius[last];
    ringAt(add(spine[last], mul(frames[last].t, Math.sin(phi) * r0)), frames[last], Math.cos(phi) * r0, S[last] + Math.sin(phi) * r0);
  }
  const tipS = add(spine[0], mul(frames[0].t, -radius[0] * (rs ? 1 : 0)));
  const tipE = add(spine[last], mul(frames[last].t, radius[last] * (re ? 1 : 0)));
  return loft(rings, {
    attrs,
    smooth: !o.faceted,
    capStart: o.openStart ? false : rs ? tipS : true,
    capEnd: re ? tipE : true,
    apexAttr: [[S[0] - (rs ? radius[0] : 0), 1, 0, 0], [S[last] + (re ? radius[last] : 0), 1, 0, 0]],
  });
}

/**
 * A flat disk (the raw face of a cut) at `c` facing `normal`, as a fan. Attributes: [rho, cos a,
 * sin a, -1] with rho = distance from the center / radius, so the shade can paint skin, flesh and
 * bone rings.
 */
export function disk(c: V3, normal: V3, r: number, n = 18): Tri[] {
  const nn = unit(normal);
  const ref: V3 = Math.abs(nn[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(nn, ref)), w = unit(cross(nn, u));
  const tris: Tri[] = [];
  const g = GROUP++;
  const center: Attr = [0, 0, 0, -1];
  for (let j = 0; j < n; j++) {
    const a0 = (j * TAU) / n, a1 = ((j + 1) * TAU) / n;
    const p0 = add(c, add(mul(u, Math.cos(a0) * r), mul(w, Math.sin(a0) * r)));
    const p1 = add(c, add(mul(u, Math.cos(a1) * r), mul(w, Math.sin(a1) * r)));
    tris.push({ v: [c, p0, p1], vn: [nn, nn, nn], n: nn, group: g, at: [center, [1, Math.cos(a0), Math.sin(a0), -1], [1, Math.cos(a1), Math.sin(a1), -1]] });
  }
  return tris;
}

/** A faceted cone (spike, claw, horn tip) from a base point to a tip, `n` sides. */
export function cone(base: V3, tip: V3, r: number, n = 5, o: { rot?: number; bend?: V3; attr?: Attr } = {}): Tri[] {
  const ax = unit(sub(tip, base));
  const ref: V3 = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(ax, ref)), w = unit(cross(ax, u));
  const L = len(sub(tip, base));
  const rings: V3[][] = [];
  const prof: [number, number][] = [[0, 1], [0.38, 0.62]];
  for (const [tt, rf] of prof) {
    const c = add(add(base, mul(ax, tt * L)), o.bend ? mul(o.bend, tt * tt) : [0, 0, 0]);
    const pts: V3[] = [];
    for (let j = 0; j < n; j++) {
      const a = (o.rot ?? 0) + (j * TAU) / n;
      pts.push(add(c, add(mul(u, Math.cos(a) * r * rf), mul(w, Math.sin(a) * r * rf))));
    }
    rings.push(pts);
  }
  const at = o.attr ?? ZA;
  return loft(rings, { attrs: rings.map((rr) => rr.map(() => at)), capStart: true, capEnd: o.bend ? add(tip, o.bend) : tip, apexAttr: [at, at] });
}

/** Applies a point transform (and the matching normal transform) to a mesh. */
export function transform(tris: Tri[], f: (p: V3) => V3, fn: (n: V3) => V3): Tri[] {
  return tris.map((t) => ({ v: t.v.map(f) as [V3, V3, V3], vn: t.vn.map(fn) as [V3, V3, V3], n: fn(t.n), group: t.group, at: t.at }));
}
/** Rotation in the screen plane (about the D axis) by `a` radians, counterclockwise on screen (H up). */
export function rotXH(p: V3, a: number, c: V3 = [0, 0, 0]): V3 {
  const cs = Math.cos(a), sn = Math.sin(a);
  const x = p[0] - c[0], h = p[1] - c[1];
  return [c[0] + x * cs - h * sn, c[1] + x * sn + h * cs, p[2]];
}

// --- scene and rendering --------------------------------------------------------------------

export interface PixelInfo {
  x: number;
  y: number;
  /** World normal. */
  n: V3;
  /** World position. */
  p: V3;
  at: Attr;
  light: number;
  lit: boolean;
  mesh: Mesh;
}

export interface MeshOpts {
  pal: number;
  /** Ramp steps used from dark to light (default [1, 2, 3, 4]). */
  steps?: number[];
  bias?: number;
  jitter?: number;
  cell?: number;
  seed?: number;
  contrast?: number;
  /** Random light offset per facet so neighbouring planes separate (default 0.05). */
  facetVar?: number;
  /** Light crest on facet edges facing the light (default true; only faceted meshes have facets). */
  crest?: boolean;
  /** Dark seam on the shadow side of sharp facet edges. */
  seam?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Maps a pixel's surface attributes to the 2D coordinates fed to band(), so clusters stick to the skin. */
  anchor?: (at: Attr) => V2;
  /** Custom step picker; gets the default step and may switch palette by returning [pal, step]. */
  shade?: (px: PixelInfo, step: number) => number | [number, number];
  /** Steps added to every pixel (-1 for far limbs). */
  dark?: number;
  /** Same-mesh overlap: a front pixel whose s differs by more than this draws an inner line (0 = off). */
  fold?: number;
  /** Depth offset added to every pixel (pushes a part in front or behind at equal depth). */
  zBias?: number;
}
export interface Mesh extends MeshOpts {
  id: number;
  tris: Tri[];
  box: [V3, V3];
}

export class Scene {
  meshes: Mesh[] = [];
  add(tris: Tri[], o: MeshOpts): Mesh {
    let lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
    for (const t of tris)
      for (const v of t.v) {
        lo = [Math.min(lo[0], v[0]), Math.min(lo[1], v[1]), Math.min(lo[2], v[2])];
        hi = [Math.max(hi[0], v[0]), Math.max(hi[1], v[1]), Math.max(hi[2], v[2])];
      }
    const mesh: Mesh = { ...o, id: this.meshes.length, tris, box: [lo, hi] };
    this.meshes.push(mesh);
    return mesh;
  }
}

/** Step buffer + G-buffer for one frame. */
export class Frame {
  readonly mesh: Int16Array;
  readonly group: Int32Array;
  readonly depth: Float32Array;
  readonly nrm: Float32Array;
  readonly pos: Float32Array;
  readonly attr: Float32Array;
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
    this.attr = new Float32Array(N * 4);
    this.lightv = new Float32Array(N);
    this.pal = new Int16Array(N).fill(-1);
    this.step = new Int8Array(N);
    this.over = new Array(N).fill(null);
  }
  idx(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? y * this.w + x : -1;
  }
  proj(p: V3): V2 {
    return [this.ox + p[0], this.oy - p[1] - K * p[2]];
  }
  has(x: number, y: number): boolean {
    const i = this.idx(x, y);
    return i >= 0 && (this.pal[i] >= 0 || this.over[i] !== null);
  }
  normal(i: number): V3 {
    return [this.nrm[i * 3], this.nrm[i * 3 + 1], this.nrm[i * 3 + 2]];
  }
  world(i: number): V3 {
    return [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]];
  }
  at(i: number): Attr {
    return [this.attr[i * 4], this.attr[i * 4 + 1], this.attr[i * 4 + 2], this.attr[i * 4 + 3]];
  }
  /** Removes a pixel entirely (cuts, chips). */
  clear(i: number): void {
    this.pal[i] = -1;
    this.mesh[i] = -1;
    this.over[i] = null;
    this.depth[i] = Infinity;
  }
  compose(): Canvas {
    const c = new Canvas(this.w, this.h);
    for (let i = 0; i < this.w * this.h; i++) {
      const o = this.over[i];
      if (o) {
        c.set(i % this.w, Math.floor(i / this.w), o);
        continue;
      }
      if (this.pal[i] < 0) continue;
      c.set(i % this.w, Math.floor(i / this.w), PAL[this.pal[i]][this.step[i]]);
    }
    return c;
  }
}

/** Shadow map along the light: returns, for a world point, whether something lies between it and the light. */
function shadowMap(scene: Scene): (p: V3) => boolean {
  const e1 = unit(cross(LW, [0, 0, 1]));
  const e2 = unit(cross(LW, e1));
  const cs = 0.7;
  const casters = scene.meshes.filter((m) => m.castShadow !== false);
  let q0 = Infinity, q1 = -Infinity, r0 = Infinity, r1 = -Infinity;
  for (const m of casters)
    for (const t of m.tris)
      for (const v of t.v) {
        const a = dot(v, e1), b = dot(v, e2);
        q0 = Math.min(q0, a);
        q1 = Math.max(q1, a);
        r0 = Math.min(r0, b);
        r1 = Math.max(r1, b);
      }
  if (!isFinite(q0)) return () => false;
  // Snap the grid to absolute cells so a shadow edge on a part that does not move stays put
  // while other parts move (rooted bases must not flicker).
  q0 = Math.floor(q0 / cs) * cs - cs;
  r0 = Math.floor(r0 / cs) * cs - cs;
  const W = Math.ceil((q1 - q0) / cs) + 2, H = Math.ceil((r1 - r0) / cs) + 2;
  const map = new Float32Array(W * H).fill(-Infinity);
  for (const m of casters)
    for (const t of m.tris) {
      const P = t.v.map((v) => [(dot(v, e1) - q0) / cs, (dot(v, e2) - r0) / cs, dot(v, LW)]);
      const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
      if (Math.abs(area) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
      const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[2][0] - px) * (P[1][1] - py)) / area;
          const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[0][0] - px) * (P[2][1] - py)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
          const d = w0 * P[0][2] + w1 * P[1][2] + w2 * P[2][2];
          const i = y * W + x;
          if (d > map[i]) map[i] = d;
        }
    }
  return (p: V3) => {
    const x = Math.floor((dot(p, e1) - q0) / cs), y = Math.floor((dot(p, e2) - r0) / cs);
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    return map[y * W + x] > dot(p, LW) + 1.6;
  };
}

/**
 * Rasterises the scene into a Frame (origin (ox, oy) = world (0, 0, 0)), shades every pixel into a
 * ramp step, adds facet crests, inner lines between parts (and folds of one tube) and cleans
 * single-pixel speckles.
 */
export function render(scene: Scene, w: number, h: number, ox: number, oy: number): Frame {
  const f = new Frame(w, h, ox, oy, scene);
  for (const mesh of scene.meshes) {
    const zb = mesh.zBias ?? 0;
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
          const z = wp[2] + zb;
          if (z >= f.depth[i]) continue;
          f.depth[i] = z;
          f.mesh[i] = mesh.id;
          f.group[i] = t.group;
          const nn = unit(add(add(mul(t.vn[0], w0), mul(t.vn[1], w1)), mul(t.vn[2], w2)));
          f.nrm.set(nn, i * 3);
          f.pos.set(wp, i * 3);
          for (let k = 0; k < 4; k++) f.attr[i * 4 + k] = t.at[0][k] * w0 + t.at[1][k] * w1 + t.at[2][k] * w2;
        }
    }
  }
  // Light, cast shadows and ramp steps.
  const shadowed = shadowMap(scene);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const mi = f.mesh[i];
      if (mi < 0) continue;
      const mesh = scene.meshes[mi];
      const n = f.normal(i), p = f.world(i), at = f.at(i);
      let light = lightOf(n);
      light = 0.5 + (light - 0.5) * (mesh.contrast ?? 1);
      light += (hash(f.group[i], 17, (mesh.seed ?? 0) + 3) - 0.5) * 2 * (mesh.facetVar ?? 0.05);
      let lit = true;
      if (mesh.receiveShadow !== false && lightOf(n) > 0.22 && shadowed(add(p, mul(n, 0.9)))) {
        lit = false;
        light = Math.min(light, 0.2 + light * 0.25);
      }
      f.lightv[i] = light;
      const [bx, by] = mesh.anchor ? mesh.anchor(at) : [x, y];
      let s = band(light, bx, by, { steps: mesh.steps ?? [1, 2, 3, 4], bias: mesh.bias ?? -0.1, jitter: mesh.jitter ?? 0.08, seed: mesh.seed ?? 7, cell: mesh.cell ?? 3 });
      s += mesh.dark ?? 0;
      let pi = mesh.pal;
      if (mesh.shade) {
        const r = mesh.shade({ x, y, n, p, at, light, lit, mesh }, s);
        if (Array.isArray(r)) {
          pi = r[0];
          s = r[1];
        } else s = r;
      }
      f.pal[i] = pi;
      f.step[i] = clamp(s, 1, 5);
    }
  // Facet crests and seams.
  const bump = new Int8Array(w * h);
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
        if (mesh.crest !== false && li > lj + 0.14 && li > 0.62) bump[i] = 1;
        if (mesh.seam && lj > li + 0.15 && li < 0.45) bump[i] = -1;
      }
    }
  for (let i = 0; i < w * h; i++) if (bump[i]) f.step[i] = clamp(f.step[i] + bump[i], 1, 5);
  despeckle(f);
  innerLines(f);
  return f;
}

/** Pixels whose four neighbours (same part and palette) all share another step take that step. */
export function despeckle(f: Frame): void {
  const fix: [number, number][] = [];
  for (let y = 1; y < f.h - 1; y++)
    for (let x = 1; x < f.w - 1; x++) {
      const i = y * f.w + x;
      if (f.pal[i] < 0 || f.over[i]) continue;
      const nb = [i - 1, i + 1, i - f.w, i + f.w];
      if (nb.some((j) => f.pal[j] !== f.pal[i] || f.mesh[j] !== f.mesh[i] || f.over[j])) continue;
      const s0 = f.step[nb[0]];
      if (s0 !== f.step[i] && nb.every((j) => f.step[j] === s0)) fix.push([i, s0]);
    }
  for (const [i, s] of fix) f.step[i] = s;
}

/**
 * Where one part lies in front of another (or a tube in front of its own far part), the pixel of the
 * part behind becomes the front part's outline color: the dark inner line of the character style.
 */
export function innerLines(f: Frame, gap = 1.2): void {
  const lines: [number, Color][] = [];
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x;
      const mi = f.mesh[i];
      if (mi < 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = f.idx(x + dx, y + dy);
        if (j < 0 || f.mesh[j] < 0) continue;
        // Only real overlaps (a depth jump), not the crease where two parts grow into each other.
        if (f.depth[j] >= f.depth[i] - gap) continue;
        if (f.mesh[j] === mi) {
          const fold = f.scene.meshes[mi].fold ?? 0;
          if (!fold || Math.abs(f.attr[j * 4] - f.attr[i * 4]) < fold) continue;
        }
        lines.push([i, PAL[f.pal[j]][0]]);
        break;
      }
    }
  for (const [i, c] of lines) f.over[i] = c;
}
