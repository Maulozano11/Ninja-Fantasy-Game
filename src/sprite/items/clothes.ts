// Tops, bottoms, waist pieces and hand wear.
//
// All geometry is in 64-unit design space (rig joints, torso-local T(), limb
// parameters); primitives rasterize at the fine 128x128 resolution, so seams,
// stitching and buttons can be a single fine pixel.

import { drawBaseCloth } from '../body';
import { hexToRgb, retintHex } from '../color';
import { armDepth, armJoints, armPoint, armSpan, type Depth, DrawCtx, fillTorso, handDraw, handPose, ItemDef, legDepth, legJoints, legPoint, Side, torsoNeck, torsoPoly } from '../ctx';
import { FEMALE_BASE_CLOTH } from '../femaleBaseArt';
import { continuedTo, limbOnly, PaintedPiece, PieceJoint, segAngle, stampBent, stampPiece } from '../painted';
import { SHADE_BELTS_ITEM } from './sayaLower';
import { add, along, ellipse, F_NO_EDGE, F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, lerp, norm, PAD, PartId, partIndex, PARTS, Pen, perp, poly, RES, scale, seam, ShadeFn, sub, v, Vec } from '../raster';
import { stampTemplate, TemplatePalette } from '../rotsprite';
import { crimsonKind, GAUNTLET_F, GAUNTLET_N, GLOVE_LEATHER, GLOVE_STEEL, GLOVE_TONES, GLOVE_TRIM } from './sabatonsGauntletsArt';
import { BRACER_BRONZE, BRACER_F, BRACER_N, ROMAN_KIT_KIND } from './bracersSandalsArt';
import { sandalPieces } from './feet';
import { clearParts, clipParts, founderArmAtRest, founderArmBends, founderFarOut, founderFarReach, founderLegBends, founderLegLen, founderLegOut, moveParts } from './founderOut';
import { FOUNDER_REACH_ARM_F, FOUNDER_REACH_BRACER_F, FOUNDER_REACH_HAND_F, FOUNDER_REACH_SLEEVE_F } from './founderReachArt';
import { FOUNDER_ARM_F, FOUNDER_ARM_N, FOUNDER_ARM_SKIN, FOUNDER_HAND_F, FOUNDER_HAND_N, FOUNDER_SLEEVE_N, FOUNDER_TUNIC, FOUNDER_TUNIC_KIND } from './founderTunicArt';
import { FOUNDER_THIGH_F, FOUNDER_THIGH_N, FOUNDER_TROUSERS, FOUNDER_TROUSERS_KIND, FOUNDER_TROUSERS_STUD } from './founderTrousersArt';
import { STEEL_BRACER, STEEL_BRACER_F, STEEL_BRACER_KIND, STEEL_BRACER_N } from './steelBracersArt';
import { SAYA_SHADE_GLOVES } from './sayaUpper';
import { WAIST_DAWN_SASH } from './aureliaLower';

type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });
const SIDES: Side[] = ['F', 'N'];
const sb = (s: Side) => (s === 'F' ? -1 : 0);
const prt = (base: 'upperArm' | 'forearm' | 'hand' | 'thigh' | 'shin' | 'foot', s: Side) => `${base}${s}` as PartId;

export function clothPen(g: DrawCtx, hex: string, part: Pen['part'], bias = 0, kind: Kind = 'cloth'): Pen {
  return { mat: g.m(hex, kind), part, bias };
}

// ---------------------------------------------------------------------------
// Shared limb / shading helpers (also used by feet.ts)
// ---------------------------------------------------------------------------

const LIGHT = norm(v(-0.72, -0.69));
/** The same light in 3D (screen x, screen y, toward the viewer): from the upper left and a little in front. */
const L3 = { x: -0.62, y: -0.6, z: 0.5 };
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Smooth 1D value noise in [-0.5, 0.5]; shifts band edges in 2-4 px clusters instead of per-pixel speckle. */
function wob(s: number, seed = 0): number {
  const i = Math.floor(s);
  const f = s - i;
  const h = (k: number) => {
    let x = Math.imul(k + seed * 7919, 374761393) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) & 1023) / 1023 - 0.5;
  };
  return h(i) + (h(i + 1) - h(i)) * f * f * (3 - 2 * f);
}

/**
 * Cloth tone for a light intensity (about -1..1): a lit plane (4) only where the
 * surface faces the light, a wide base, then shadow and a broad dark far side.
 */
function tone(lt: number): number {
  const l = lt + LIFT;
  return l > 0.74 ? 4 : l > 0.4 ? 3 : l > 0.08 ? 2 : 1;
}

/**
 * Extra light for dark colors. Their ramp squeezes shades 1-3 into a narrow
 * value range, so without it a navy or black garment reads as one near-black
 * mass; with it the form sits on the base and light tones like the
 * reference coat, which keeps its fill well above the outline.
 */
let LIFT = 0;
function liftOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
  return clamp((0.3 - l) * 1.2, 0, 0.16);
}
/** Draws every item with the tones lifted for its main color (parts in other colors set their own). */
function liftMain(items: ItemDef[]): ItemDef[] {
  return items.map((d) => ({ ...d, draw: (g: DrawCtx, c: string[], p: Record<string, string>) => lifted(c[0], () => d.draw(g, c, p)) }));
}
/** Runs `fn` with the cloth tones lifted for `hex` (see liftOf). */
function lifted<T>(hex: string, fn: () => T): T {
  const prev = LIFT;
  LIFT = liftOf(hex);
  try {
    return fn();
  } finally {
    LIFT = prev;
  }
}

/** Light on a cylinder of axis direction n-perpendicular: `o` runs -1..1 across it along `n`. */
function cylLight(o: number, n: Vec): number {
  const c = clamp(o, -1, 1);
  return c * (n.x * L3.x + n.y * L3.y) + Math.sqrt(1 - c * c) * L3.z;
}

/**
 * Default cloth cylinder shading for tube/limb, comparable to the skin limbs: a
 * lit band on the side facing the light (its very edge turning away), a base
 * core, a shadow band and a broad dark far side. Band edges wobble along the
 * limb so the shading breaks into clusters that move with it.
 */
function tubeShade(a: Vec, d: Vec, n: Vec, l: number, ra: number, rb: number, light?: LimbLight, t0 = 0, t1 = 1): ShadeFn {
  return (x, y) => {
    const qx = x + 0.5 - a.x;
    const qy = y + 0.5 - a.y;
    const s = qx * d.x + qy * d.y;
    const t = clamp(s / l, 0, 1);
    const r = ra + (rb - ra) * t || 1;
    const o = clamp((qx * n.x + qy * n.y) / r, -1, 1);
    const lt = light ? light(t0 + (t1 - t0) * t, o, n) : cylLight(o, n);
    return tone(lt + wob(s * 1.6, 3) * 0.16);
  };
}

/** Light on a limb at parameter t (0 root, 1 joint, 2 end) and across-position o (-1..1 along n). */
export type LimbLight = (t: number, o: number, n: Vec) => number;

/** Tapered segment with FLAT ends (unlike capsule), shaded as a cylinder. Good for cuffs, hems and bands. */
export function tube(L: Layer, a: Vec, b: Vec, ra: number, rb: number, pen: Pen, shade?: number | ShadeFn): void {
  const ab = sub(b, a);
  const l = Math.hypot(ab.x, ab.y);
  if (l < 0.05) {
    ellipse(L, a.x, a.y, Math.max(ra, rb), Math.max(ra, rb), pen, shade ?? capShade(a, Math.max(ra, rb)));
    return;
  }
  const d = scale(ab, 1 / l);
  const n = perp(d);
  const pts = [add(a, scale(n, ra)), add(b, scale(n, rb)), add(b, scale(n, -rb)), add(a, scale(n, -ra))];
  poly(L, pts, pen, shade ?? tubeShade(a, d, n, l, ra, rb));
}

/** A rounded cap (shoulder, knee) shaded as part of a sphere, matching tubeShade's bands. */
function capShade(c: Vec, r: number): ShadeFn {
  return (x, y) => {
    const dx = clamp((x + 0.5 - c.x) / r, -1, 1);
    const dy = clamp((y + 0.5 - c.y) / r, -1, 1);
    const dz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
    return tone(dx * L3.x + dy * L3.y + dz * L3.z + wob((x - PAD.x + y - PAD.y) * 1.6, 5) * 0.16);
  };
}

/** A joint disc shaded like a cylinder running along `d` (blends the two limb segments it joins). */
function jointShade(c: Vec, d: Vec, r: number, light?: (o: number, n: Vec) => number): ShadeFn {
  const n = perp(d);
  return (x, y) => {
    const qx = x + 0.5 - c.x;
    const qy = y + 0.5 - c.y;
    const o = clamp((qx * n.x + qy * n.y) / r, -1, 1);
    return tone((light ? light(o, n) : cylLight(o, n)) + wob((qx * d.x + qy * d.y) * 1.6, 3) * 0.16);
  };
}

export type LimbKind = 'arm' | 'leg';
export const limbPt = (g: DrawCtx, k: LimbKind, s: Side, t: number): Vec => (k === 'arm' ? armPoint(g, s, t) : legPoint(g, s, t));
/** Body radius of a limb at t (0 root, 1 middle joint, 2 end). */
export function limbR(g: DrawCtx, k: LimbKind, t: number): number {
  const R = k === 'arm' ? g.bp.armR : g.bp.legR;
  const P = k === 'arm' ? ARM_PROFILE : LEG_PROFILE;
  for (let i = 1; i < P.length; i++) {
    if (t <= P[i][0]) {
      const [t0, w0] = P[i - 1];
      const [t1, w1] = P[i];
      const f = t1 > t0 ? clamp((t - t0) / (t1 - t0), 0, 1) : 1;
      return w0(R) + (w1(R) - w0(R)) * f;
    }
  }
  return P[P.length - 1][1](R);
}

/**
 * Limb taper as control points [t, radius from R0..R3], matching the skin limbs
 * (ctx.ts): full deltoid/thigh, narrower elbow/knee, a forearm/calf swell just
 * past the joint and a slim wrist/ankle, so fitted cloth follows the body.
 */
type Profile = [number, (R: number[]) => number][];
const ARM_PROFILE: Profile = [
  [0, (R) => R[0]],
  [0.45, (R) => R[0] * 0.62 + R[1] * 0.38],
  [1, (R) => R[1]],
  [1.0001, (R) => R[2] * 0.88],
  [1.3, (R) => R[2]],
  [2, (R) => R[3]],
];
const LEG_PROFILE: Profile = [
  [0, (R) => R[0]],
  [0.5, (R) => R[0] * 0.55 + R[1] * 0.45],
  [1, (R) => R[1]],
  [1.0001, (R) => R[2] * 0.94],
  [1.32, (R) => R[2] * 1.04],
  [2, (R) => R[3]],
];
const PROFILE_CUTS: Record<LimbKind, number[]> = { arm: [0.45, 1, 1.3], leg: [0.5, 1, 1.32] };
const limbPart = (k: LimbKind, s: Side, t: number): PartId =>
  `${k === 'arm' ? (t <= 1 ? 'upperArm' : 'forearm') : t <= 1 ? 'thigh' : 'shin'}${s}` as PartId;

/**
 * Covers a limb from `from` to `to` (0 root, 1 middle joint, 2 end) with flat
 * ends, bridging the middle joint with a disc. `inflate` may taper [start, end],
 * or follow the limb (a function of t).
 */
export function limb(
  g: DrawCtx,
  L: Layer,
  k: LimbKind,
  s: Side,
  from: number,
  to: number,
  inflate: number | [number, number] | ((t: number) => number),
  pen: Pen,
  opts: { shade?: number; round0?: boolean; round1?: boolean; light?: LimbLight } = {},
): void {
  const inf = (t: number) =>
    typeof inflate === 'number' ? inflate : typeof inflate === 'function' ? inflate(t) : inflate[0] + (inflate[1] - inflate[0]) * ((t - from) / (to - from || 1));
  const cuts = [from, ...PROFILE_CUTS[k].filter((c) => c > from && c < to), to];
  for (let i = 0; i < cuts.length - 1; i++) {
    const t0 = cuts[i];
    const t1 = cuts[i + 1];
    const r0 = (t0 === 1 ? limbR(g, k, 1.0001) : limbR(g, k, t0)) + inf(t0);
    const r1 = limbR(g, k, t1) + inf(t1);
    const a = limbPt(g, k, s, t0);
    const b = limbPt(g, k, s, t1);
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const d = l > 0.05 ? scale(sub(b, a), 1 / l) : v(0, 1);
    const sh = opts.shade ?? (opts.light && l > 0.05 ? tubeShade(a, d, perp(d), l, r0, r1, opts.light, t0, t1) : undefined);
    tube(L, a, b, r0, r1, { ...pen, part: limbPart(k, s, (t0 + t1) / 2) }, sh);
  }
  const disc = (t: number) => {
    const p = limbPt(g, k, s, t);
    const r = Math.max(limbR(g, k, t), t === 1 ? limbR(g, k, 1.0001) : 0) + inf(t);
    // shoulder and hip caps are round; the knee/elbow and the far end blend the segments they join
    const dir = norm(sub(limbPt(g, k, s, Math.min(2, t + 0.25)), limbPt(g, k, s, Math.max(0, t - 0.25))));
    const sh = opts.shade ?? (t === 0 ? capShade(p, r) : jointShade(p, dir, r, opts.light && ((o, n) => opts.light!(t, o, n))));
    ellipse(L, p.x, p.y, r, r, { ...pen, part: limbPart(k, s, t) }, sh);
  };
  if (from < 1 && to > 1) disc(1);
  if (opts.round0) disc(from);
  if (opts.round1) disc(to);
}

/** A seam line straight across a limb at t (hems, cuffs, straps). */
export function across(g: DrawCtx, L: Layer, k: LimbKind, s: Side, t: number, inflate: number, d = -1): void {
  const p = limbPt(g, k, s, t);
  const lo = t > 1 ? 1.0001 : 0;
  const hi = t > 1 ? 2 : 1;
  const dir = norm(sub(limbPt(g, k, s, Math.min(hi, t + 0.05)), limbPt(g, k, s, Math.max(lo, t - 0.05))));
  const n = perp(dir);
  const r = limbR(g, k, t) + inflate + 0.6;
  seam(L, add(p, scale(n, -r)), add(p, scale(n, r)), d);
}

/** Fine pixels along a 1 px line between design points (8-connected, no repeats). */
function linePx(a: Vec, b: Vec): number[] {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * RES));
  const out: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = lerp(a, b, i / steps);
    const x = Math.floor(p.x * RES);
    const y = Math.floor(p.y * RES);
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
    const id = y * GRID + x;
    if (out[out.length - 1] !== id) out.push(id);
  }
  return out;
}

/** Re-shades the pixels a layer already has along a 1 px line; returns the pixels it touched. */
function mark(L: Layer, a: Vec, b: Vec, f: (s: number) => number, skip?: Set<number>): number[] {
  const hit: number[] = [];
  for (const i of linePx(a, b)) {
    if (L.mat[i] < 0 || L.shade[i] === 0 || skip?.has(i)) continue;
    L.shade[i] = clamp(f(L.shade[i]), 1, 5);
    hit.push(i);
  }
  return hit;
}

/**
 * Dark fold line with a lit fine line on its upper-left side: reads as a
 * crease/ridge. Relative to the shading under it, so a fold in the shadow
 * stays dark; the crest never goes past the light tone (4).
 */
export function crease(L: Layer, a: Vec, b: Vec, d = -1): void {
  let n = perp(norm(sub(b, a)));
  if (n.x * LIGHT.x + n.y * LIGHT.y < 0) n = scale(n, -1);
  const trough = new Set(mark(L, a, b, (s) => s + d));
  mark(L, add(a, scale(n, 0.5)), add(b, scale(n, 0.5)), (s) => (s >= 4 ? s : s + 1), trough);
}

/**
 * A fold as a crest/trough pair: a 1 px lit crest next to a dark trough of
 * `w` px (1-2) on its shadow side. `crest` caps how bright the crest may get.
 */
function fold(L: Layer, a: Vec, b: Vec, w = 1, crest = 4, depth = 1): void {
  let n = perp(norm(sub(b, a)));
  if (n.x * LIGHT.x + n.y * LIGHT.y < 0) n = scale(n, -1);
  const lit = new Set(mark(L, a, b, (s) => (s >= crest ? s : Math.min(crest, s + 1))));
  for (let k = 1; k <= w; k++) mark(L, add(a, scale(n, -0.5 * k)), add(b, scale(n, -0.5 * k)), (s) => s - depth, lit);
}

/** A 1-fine-px line in a color, painted only over existing pixels (stitching, piping, laces). */
export function stitch(L: Layer, a: Vec, b: Vec, pen: Pen, shade = 4, dash = 0): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * RES));
  let k = 0;
  let last = -1;
  for (let i = 0; i <= steps; i++) {
    const p = lerp(a, b, i / steps);
    const fx = Math.floor(p.x * RES);
    const fy = Math.floor(p.y * RES);
    const id = fy * GRID + fx;
    if (id === last) continue;
    last = id;
    k++;
    if (dash && k % (dash + 1) === 0) continue;
    if (!L.has(fx, fy) || L.getShade(fx, fy) === 0) continue;
    L.set(fx, fy, pen.mat, shade + (pen.bias || 0), pen.part, F_NO_OUTLINE);
  }
}

/** A 2x2 fine button / rivet with a highlight in its upper-left corner. */
export function button(L: Layer, p: Vec, mat: number, part: PartId, shade = 4): void {
  const fx = Math.round(p.x * RES - 1);
  const fy = Math.round(p.y * RES - 1);
  L.set(fx, fy, mat, shade + 1, part, F_NO_OUTLINE);
  L.set(fx + 1, fy, mat, shade, part, F_NO_OUTLINE);
  L.set(fx, fy + 1, mat, shade, part, F_NO_OUTLINE);
  L.set(fx + 1, fy + 1, mat, shade - 2, part, F_NO_OUTLINE);
}

/**
 * A small muted stud: 2x1 fine pixels (lit left, shadowed right), or a single
 * pixel with `one`. `bright` lifts the left pixel for the one stud that catches light.
 */
export function stud(L: Layer, p: Vec, mat: number, part: PartId, bright = false, one = false): void {
  const fx = Math.floor(p.x * RES);
  const fy = Math.floor(p.y * RES);
  L.set(fx, fy, mat, bright ? 4 : 3, part, F_NO_OUTLINE);
  if (!one) L.set(fx + 1, fy, mat, 2, part, F_NO_OUTLINE);
}

/** One fine pixel that is never outlined. */
export function fpx(L: Layer, p: Vec, mat: number, part: PartId, shade = 4): void {
  L.set(Math.floor(p.x * RES), Math.floor(p.y * RES), mat, shade, part, F_NO_OUTLINE);
}

/** Diagonal wrap stripes across a limb span (bandages, laces). */
export function wrapStripes(L: Layer, a: Vec, b: Vec, r: number, step: number, d = -1, slant = 0.9): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const dt = slant / len;
    seam(L, along(a, b, t - dt, -r), along(a, b, t + dt, r), d);
  }
}

/** Copies every pixel of `src` into `dst`; `keep` receives the design-space centre of each fine pixel. */
export function stamp(dst: Layer, src: Layer, keep?: (x: number, y: number) => boolean): void {
  if (!src.used) return;
  for (let i = 0; i < GRID * GRID; i++) {
    if (src.mat[i] < 0) continue;
    const fx = i % GRID;
    const fy = (i / GRID) | 0;
    if (keep && !keep((fx + 0.5) / RES, (fy + 0.5) / RES)) continue;
    dst.set(fx, fy, src.mat[i], src.shade[i], PARTS[src.part[i]], src.flags[i]);
  }
}

/**
 * Sign of the `along()` offset that points to the inside of a limb's bend
 * (elbow pit, back of the knee); `straight` when the limb is nearly straight.
 */
function bendSide(g: DrawCtx, k: LimbKind, s: Side, straight: number): number {
  const a = limbPt(g, k, s, 0);
  const m = limbPt(g, k, s, 1);
  const e = limbPt(g, k, s, 2);
  const bend = add(sub(a, m), sub(e, m));
  const n = norm(perp(sub(m, a)));
  const d = bend.x * n.x + bend.y * n.y;
  return Math.abs(d) < 1.2 ? straight : Math.sign(d);
}

/**
 * Folds where a sleeve or trouser leg bends: short crest/trough diagonals that
 * fan from the inside of the elbow/knee, plus one across the outside of the
 * joint. Fewer and softer when the limb is straight.
 */
function jointFolds(g: DrawCtx, L: Layer, k: LimbKind, s: Side, inflate: number): void {
  const a = limbPt(g, k, s, 0);
  const m = limbPt(g, k, s, 1);
  const e = limbPt(g, k, s, 2);
  // a hanging arm bends forward (screen-right), a standing leg backward (screen-left)
  const side = bendSide(g, k, s, k === 'arm' ? -1 : 1);
  const r1 = limbR(g, k, 0.85) + inflate;
  const r2 = limbR(g, k, 1.15) + inflate;
  fold(L, along(a, m, 0.7, side * r1 * 0.95), along(a, m, 0.9, -side * r1 * 0.1));
  fold(L, along(m, e, 0.2, side * r2 * 0.95), along(m, e, 0.06, -side * r2 * 0.05));
  if (k === 'leg') fold(L, along(a, m, 0.93, -side * r1 * 0.9), along(m, e, 0.06, -side * r2 * 0.15));
}

/**
 * Light for a band from t0 to t1 on a limb (cuff, hem, strap): lit along the
 * edge that faces the light, darker toward the other edge.
 */
function bandLight(g: DrawCtx, k: LimbKind, s: Side, t0: number, t1: number, lift = 0): LimbLight {
  const d = sub(limbPt(g, k, s, t1), limbPt(g, k, s, t0));
  const rootLit = d.x * LIGHT.x + d.y * LIGHT.y <= 0;
  return (t, o, n) => {
    const f0 = (t - t0) / (t1 - t0 || 1);
    const f = rootLit ? f0 : 1 - f0;
    return cylLight(o, n) + lift + (f < 0.25 ? 0.34 : f > 0.62 ? -0.26 : 0);
  };
}

/**
 * A cuff band on a limb from t0 (nearer the root) to t1, drawn over the cloth
 * it closes: lit along its upper edge, darker toward the other, and the cloth
 * coming from the root side tucks in under a 1 px dark band.
 */
function cuff(g: DrawCtx, L: Layer, k: LimbKind, s: Side, t0: number, t1: number, inflate: number, pen: Pen, tuck = 0.4): void {
  if (tuck > 0) across(g, L, k, s, t0 - 0.03, tuck, -1);
  limb(g, L, k, s, t0, t1, inflate, pen, { light: bandLight(g, k, s, t0, t1) });
}

/**
 * Sleeves on both arms from 0 (shoulder) to `to` (2 = wrist), with a flat hem. Over the shoulder the
 * cloth lies on the skin and only thickens down the arm, so a shoulder without a guard keeps the
 * body's own clean round (the owner, 2026-10-20: no extra pixels on the shoulder, more defined).
 */
export function sleeves(g: DrawCtx, hex: string, to: number, inflate = 0.5, kind: Kind = 'cloth'): void {
  const hug = (t: number) => inflate * clamp(t / 0.45, 0, 1);
  for (const s of SIDES) {
    const L = g.L(armDepth(s, 'cloth'));
    limb(g, L, 'arm', s, 0, to, hug, clothPen(g, hex, prt('upperArm', s), sb(s), kind), { round0: true });
  }
}

/** Trousers on both legs from 0 (hip) to `to` (2 = ankle), plus the seat on the torso. */
export function trousers(g: DrawCtx, hex: string, to: number, inflate = 0.4, waistTop = 3): void {
  const inf: [number, number] = [inflate, inflate * 0.8];
  for (const s of SIDES) {
    const L = g.L(legDepth(s, 'cloth'));
    limb(g, L, 'leg', s, 0, to, inf, clothPen(g, hex, prt('thigh', s), sb(s)), { round0: true, light: legLight(s) });
  }
  seat(g, hex, (t) => inflate + (inf[1] - inf[0]) * (t / to), waistTop);
}

/** Light on a trouser leg: a cylinder, shaded on the inner thigh by the crotch where the other leg blocks the light. */
export function legLight(s: Side, depth = 0.42): LimbLight {
  // the far leg is drawn a shade darker (pen bias); lift it a little so it keeps its form
  const lift = s === 'F' ? 0.16 : 0.06;
  return (t, o, n) => {
    const inner = s === 'N' ? -o : o; // + toward the other leg
    return cylLight(o, n) + lift - Math.max(0, inner) * depth * clamp(1 - t * 1.6, 0, 1);
  };
}

/** Projects a design point onto one thigh (hip to knee): t along it, o across it (-1..1 over the cloth radius). */
function thighCol(g: DrawCtx, s: Side, inflate: (t: number) => number): (p: Vec) => { t: number; o: number; n: Vec } {
  const j = legJoints(g.rig, s);
  const ab = sub(j.knee, j.hip);
  const len = Math.hypot(ab.x, ab.y) || 1;
  const d = scale(ab, 1 / len);
  const n = perp(d);
  return (p) => {
    const qx = p.x - j.hip.x;
    const qy = p.y - j.hip.y;
    const t = (qx * d.x + qy * d.y) / len;
    const tc = clamp(t, 0, 1);
    return { t, o: (qx * n.x + qy * n.y) / (limbR(g, 'leg', tc) + inflate(tc)), n };
  };
}

/**
 * Seat of a pair of trousers on the pelvis (drawn in torso.bottom, over both
 * leg tops): shaded as the lower torso near the waist, turning into the two
 * leg columns toward the crotch, each shaded like its leg (the far one a shade
 * darker), with a dark inseam down the near leg's inner edge. Its lower edge
 * runs on into the legs with no outline and no cast shadow, so the trousers
 * read as two tapered columns, never one block across both legs.
 */
function seat(g: DrawCtx, hex: string, inflate: (t: number) => number, top: number, depth = 0.42): void {
  const L = g.L('torso.bottom');
  const cN = thighCol(g, 'N', inflate);
  const cF = thighCol(g, 'F', inflate);
  const lN = legLight('N', depth);
  const lF = legLight('F', depth);
  const inside = (c: { t: number; o: number }) => Math.abs(c.o) <= 1 && c.t > -0.7;
  fillT(g, L, Math.min(0.5, inflate(0) * 0.6), clothPen(g, hex, 'torso'), { top }, undefined, (x, y) => {
    const p = v(x + 0.5, y + 0.5);
    const l = toT(g, x, y);
    const a = cN(p);
    const b = cF(p);
    // the near leg is in front: where the columns overlap the point belongs to it
    let leg: number | null = null;
    if (inside(a)) {
      // inseam: the near leg's inner (right) edge, where the far leg starts
      if (l.y < -0.4 && !inside(cN(v(p.x + 0.5, p.y)))) return l.y < -1.6 ? 0 : 1;
      leg = lN(a.t, a.o, a.n);
    } else if (inside(b)) leg = lF(b.t, b.o, b.n) - 0.34;
    const k = clamp((3.4 - l.y) / 2.4, 0, 1);
    const tl = torsoLight(g, l.x, l.y) + 0.12;
    const lt = leg === null ? tl - 0.3 * k : tl * (1 - k) + leg * k;
    return tone(lt + wob2(l.x * 1.3, l.y * 0.9, 13) * 0.14);
  });
  // No outline or cast shadow where the seat runs on into its own legs.
  const legs = SIDES.map((s) => g.L(legDepth(s, 'cloth')));
  const covered = (i: number) => legs.some((Lg) => Lg.mat[i] >= 0);
  const legEdge = (i: number) => {
    const x = i % GRID;
    const y = (i / GRID) | 0;
    return legs.every((Lg) => !Lg.has(x - 1, y) || !Lg.has(x + 1, y) || !Lg.has(x, y - 1) || !Lg.has(x, y + 1));
  };
  for (let i = 2 * GRID; i < GRID * (GRID - 1); i++) {
    if (L.mat[i] >= 0 || !covered(i)) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    if (x < 1 || x >= GRID - 1) continue;
    if ((L.has(x, y - 1) || L.has(x - 1, y) || L.has(x + 1, y) || L.has(x, y + 1)) && !legEdge(i)) L.flags[i] |= F_NO_EDGE;
    // the drop-shadow pass would darken this leg pixel under the seat's edge: lift it to compensate
    if (SHADOW_FROM.some(([dx, dy]) => L.has(x + dx, y + dy)))
      for (const Lg of legs) if (Lg.mat[i] >= 0 && Lg.shade[i] >= 2 && Lg.shade[i] < 5) Lg.shade[i] += 1;
  }
}

/** Screen x of a leg's axis at screen height y (hip to ankle, clamped), and the limb parameter there. */
function legXAt(g: DrawCtx, s: Side, y: number): { x: number; t: number } {
  const j = legJoints(g.rig, s);
  if (y <= j.knee.y) {
    const f = clamp((y - j.hip.y) / Math.max(0.01, j.knee.y - j.hip.y), 0, 1);
    return { x: j.hip.x + (j.knee.x - j.hip.x) * f, t: f };
  }
  const f = clamp((y - j.knee.y) / Math.max(0.01, j.ankle.y - j.knee.y), 0, 1);
  return { x: j.knee.x + (j.ankle.x - j.knee.x) * f, t: 1 + f };
}

/**
 * Light on cloth hanging over the legs (coat tails, hakama, robe skirts): it
 * rounds over each leg, lit on the side toward the light and shadowed on the
 * other, so the legs and the split between them read through it. The far leg
 * sits darker and the cloth between the legs sinks into a dark trough.
 */
/** Light across cloth rounding over a leg, u = -1 on its left edge to 1 on its right edge. */
function hangLight(u: number): number {
  const th = Math.asin(clamp(u, -1, 1)) + 0.12; // the front of the leg turns a little toward the facing side
  return Math.sin(th) * L3.x + Math.cos(th) * L3.z * 0.92 - 0.1 * L3.y;
}

function drapeLight(g: DrawCtx, slack: number): (x: number, y: number) => number {
  const leg = hangLight;
  return (x, y) => {
    const n = legXAt(g, 'N', y);
    const f = legXAt(g, 'F', y);
    const uN = (x - n.x) / (limbR(g, 'leg', n.t) + slack);
    const uF = (x - f.x) / (limbR(g, 'leg', f.t) + slack);
    if (Math.abs(uN) <= 1 || x < n.x) return leg(Math.max(-1, uN));
    if (Math.abs(uF) <= 1 || x > f.x) return leg(Math.min(1, uF)) - 0.12;
    return -0.2; // between the legs
  };
}

/** Offsets the compositor's drop-shadow pass looks at for an occluder (compose.ts). */
const SHADOW_FROM: [number, number][] = [
  [0, -1],
  [-1, -1],
  [-1, 0],
  [0, -2],
  [-1, -2],
];

/** Collar that wraps the neck (drawn in the neck depth, over the torso). */
export function highCollar(g: DrawCtx, hex: string, height = 3, width = 0.8): void {
  const r = g.rig;
  const L = g.L('neck');
  const pen = clothPen(g, hex, 'torso');
  const top = v(r.head.x - 0.4, r.head.y + 7 - height + 1);
  const rb = g.bp.neckW + width + 0.4;
  const rt = g.bp.neckW + width;
  tube(L, r.neck, top, rb, rt, pen);
  ellipse(L, r.neck.x, r.neck.y, rb + 0.2, rb * 0.6, pen);
  // lit rim along the top edge and the opening at the front of the throat
  seam(L, add(top, v(-rt + 0.5, 0.5)), add(top, v(rt - 0.5, 0.5)), 1);
  seam(L, add(r.neck, v(rb - 0.9, 0)), add(top, v(rt - 0.7, 0.4)), -1);
}

// ---------------------------------------------------------------------------
// Torso-local helpers
// ---------------------------------------------------------------------------

/** Torso-local point that also follows the breathing offset of the upper chest. */
function TB(g: DrawCtx, x: number, y: number): Vec {
  const T = g.rig.T;
  const Lt = g.bp.torsoLen;
  const n = torsoNeck(g);
  const dy = g.rig.neck.y - T(n.x, n.y).y;
  const k = Math.max(0, Math.min(1, (y - 5) / (Lt - 5)));
  return add(T(x, y), v(0, dy * k));
}

/** Design point (shade-fn / keep-fn convention: x+0.5 is the sample) -> torso-local. */
function toT(g: DrawCtx, x: number, y: number): Vec {
  const d = sub(v(x + 0.5, y + 0.5), g.rig.pelvis);
  return v(d.x * g.rig.right.x + d.y * g.rig.right.y, d.x * g.rig.up.x + d.y * g.rig.up.y);
}

function tpoly(g: DrawCtx, L: Layer, pts: [number, number][], pen: Pen, shade?: number | ShadeFn): void {
  poly(L, pts.map(([x, y]) => TB(g, x, y)), pen, shade);
}
function tseam(g: DrawCtx, L: Layer, x0: number, y0: number, x1: number, y1: number, d = -1): void {
  seam(L, TB(g, x0, y0), TB(g, x1, y1), d);
}
function tcrease(g: DrawCtx, L: Layer, x0: number, y0: number, x1: number, y1: number, d = -1): void {
  crease(L, TB(g, x0, y0), TB(g, x1, y1), d);
}
/** A crest/trough fold in torso-local coordinates. */
function tfold(g: DrawCtx, L: Layer, x0: number, y0: number, x1: number, y1: number, w = 1, crest = 4): void {
  fold(L, TB(g, x0, y0), TB(g, x1, y1), w, crest);
}
/** Re-shades a torso-local line with `f`. */
function tmark(g: DrawCtx, L: Layer, x0: number, y0: number, x1: number, y1: number, f: (s: number) => number): void {
  mark(L, TB(g, x0, y0), TB(g, x1, y1), f);
}
function tstitch(g: DrawCtx, L: Layer, x0: number, y0: number, x1: number, y1: number, pen: Pen, shade = 4, dash = 1): void {
  stitch(L, TB(g, x0, y0), TB(g, x1, y1), pen, shade, dash);
}

/** Front edge (local x) of the bare torso at local height y. */
function frontX(g: DrawCtx, y: number): number {
  const b = g.bp;
  const Lt = b.torsoLen;
  const pts: [number, number][] = [
    [0.5, b.hipHalf * 0.62 + 0.6],
    [5, b.waistHalf * 0.64 + 0.7],
    [Lt - 6.2, b.chestHalf * 0.62 + 0.6 + b.bust],
    [Lt - 4.4, b.chestHalf * 0.62 + 0.8 + b.bust * 0.4],
    [Lt - 1.4, b.shoulderHalf * 0.58 + 0.6],
  ];
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const t = (y - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
      return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
    }
  }
  return pts[pts.length - 1][1];
}

/** Piecewise-linear lookup in [y, x] pairs sorted by y. */
function interp(pts: [number, number][], y: number): number {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) return pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (y - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]);
  }
  return pts[pts.length - 1][1];
}

/** Back edge (local x, negative) of the bare torso at local height y. */
function backX(g: DrawCtx, y: number): number {
  const b = g.bp;
  return interp(
    [
      [-0.8, -b.hipHalf * 0.9 - 0.4],
      [1.6, -b.hipHalf * 0.98 - 0.6],
      [b.waistY ?? 5.4, -b.waistHalf * 0.86],
      [b.torsoLen - 5, -b.chestHalf * 0.86],
      [b.torsoLen - 1.2, -b.shoulderHalf * 0.86],
    ],
    y,
  );
}

/** Smooth 2D value noise in [-0.5, 0.5] (cells of about one design unit). */
function wob2(x: number, y: number, seed = 0): number {
  const yi = Math.floor(y);
  const f = y - yi;
  const t = f * f * (3 - 2 * f);
  return wob(x, seed + yi * 31) * (1 - t) + wob(x, seed + yi * 31 + 31) * t;
}

/**
 * Light on the torso as a rounded volume seen in 3/4 (torso-local lx, ly): the
 * flank under the near arm faces left into the light, the centre-front line
 * faces a little right and the front edge turns fully away; the shoulders face
 * up, the upper chest a little up, the belly forward and the lower belly down.
 */
function torsoLight(g: DrawCtx, lx: number, ly: number): number {
  const b = g.bp;
  const Lt = b.torsoLen;
  const xb = backX(g, ly);
  const xf = frontX(g, ly);
  const u = clamp((lx - xb) / Math.max(1, CX - xb), 0, 1);
  const w = clamp((lx - CX) / Math.max(1, xf - CX), 0, 1.2);
  // the chest is rounder than the belly: its lit side turns toward the light sooner
  const chest = clamp((ly - (Lt - 9)) / 5, 0, 1);
  const th = ((lx < CX ? -90 + (112 - 18 * chest) * Math.pow(u, 0.9 + 0.3 * chest) : 22 - 18 * chest + (68 + 18 * chest) * w) * Math.PI) / 180;
  const tilt = interp(
    [
      [-1.5, 36],
      [1.5, 26],
      [4, 14],
      [Lt - 8.6, 6],
      [Lt - 7.4, 12 + b.bust * 14],
      [Lt - 6.4, -20 - b.bust * 6],
      [Lt - 3, -24],
      [Lt - 1.4, -44],
      [Lt + 0.6, -62],
    ],
    ly,
  );
  const ps = (tilt * Math.PI) / 180;
  const lt = Math.sin(th) * Math.cos(ps) * L3.x + Math.sin(ps) * L3.y + Math.cos(th) * Math.cos(ps) * L3.z;
  // ambient occlusion: the lower torso sits in the shadow of the chest and arms
  return lt - 0.17 * clamp((Lt - 5.5 - ly) / (Lt - 6.5), 0, 1);
}

/** Like fillTorso, with an extra keep test in torso-local coordinates. */
function fillT(
  g: DrawCtx,
  L: Layer,
  inflate: number,
  pen: Pen,
  opts: { top?: number; bottom?: number; flare?: number } = {},
  keep?: (lx: number, ly: number) => boolean,
  shade?: ShadeFn,
): void {
  const pts = torsoPoly(g, inflate, opts);
  const top = opts.top ?? 99;
  const bottom = opts.bottom ?? -99;
  poly(
    L,
    pts,
    pen,
    shade ?? torsoShade(g),
    (x, y) => {
      const l = toT(g, x, y);
      if (l.y > top + 0.01 || l.y < bottom - 0.01) return false;
      return keep ? keep(l.x, l.y) : true;
    },
  );
}

/**
 * Diamond-net shading on every pixel of `mat` inside a layer (mesh fabric),
 * kept calm: the threads catch a little light (+1) where the cloth turns into
 * shadow, only the knots show in the base tone and the lit plane stays clean,
 * so the pattern never swings more than one tone.
 */
function meshify(L: Layer, mat: number): void {
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] !== mat) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    const s = L.shade[i];
    const a = (((x + y) % 4) + 4) % 4;
    const b = (((x - y) % 4) + 4) % 4;
    const thread = a === 0 || b === 0;
    const knot = a === 0 && b === 0;
    if (s <= 2 && thread) L.shade[i] = s + 1;
    else if (s === 3 && knot) L.shade[i] = 4;
  }
}

/** Centre-front line of the torso (zips, plackets, buttons). */
const CX = 1.6;

/**
 * Value structure shared by tops, after the reference coat: a small lit plane
 * on the upper chest and shoulder by the near arm, base in the middle, and the
 * front turning away from the light (and the lower belly) in broad shadow and
 * dark areas. `lift` brightens (+) or darkens (-) the whole garment a little.
 */
function torsoShade(g: DrawCtx, lift = 0): ShadeFn {
  return (x, y) => {
    const l = toT(g, x, y);
    return tone(torsoLight(g, l.x, l.y) + lift + wob2(l.x * 1.3, l.y * 0.9, 11) * 0.14);
  };
}

/** Shirt body clipped at `bottom`, with an optional V opening at the neck that lets skin show. */
function shirtBody(
  g: DrawCtx,
  L: Layer,
  pen: Pen,
  bottom: number,
  opts: { inflate?: number; flare?: number; vDepth?: number; vHalf?: number; crew?: boolean; lift?: number } = {},
): void {
  const Lt = g.bp.torsoLen;
  const vd = opts.vDepth ?? 0;
  const vh = opts.vHalf ?? 2;
  fillT(
    g,
    L,
    opts.inflate ?? 0.5,
    pen,
    { bottom, flare: opts.flare },
    (lx, ly) => {
      if (opts.crew && ly > Lt + 0.5 - crewDip(g, lx)) return false;
      if (vd <= 0) return true;
      const t = (Lt + 0.6 - ly) / vd; // 0 at the neck, 1 at the tip
      if (t < 0 || t > 1) return true;
      return Math.abs(lx - CX) > (1 - t) * vh;
    },
    torsoShade(g, opts.lift),
  );
}

/**
 * Trim strips along both edges of a V neck opening: the near strip lit along
 * its outer edge, the far strip a shade darker, each with a dark line where it
 * lies on the garment.
 */
function vTrim(g: DrawCtx, L: Layer, vd: number, vh: number, w: number, pen: Pen): void {
  const Lt = g.bp.torsoLen;
  const top = Lt + 0.8;
  const tip = Lt + 0.6 - vd;
  tpoly(g, L, [[CX - vh - w, top], [CX - vh + 0.2, top], [CX + 0.1, tip], [CX - 0.2, tip - w * 0.9]], pen, 3);
  tpoly(g, L, [[CX + vh - 0.2, top], [CX + vh + w, top], [CX + 0.2, tip - w * 0.9], [CX - 0.1, tip]], pen, 2);
  tmark(g, L, CX - vh - w + 0.3, top - 0.2, CX - 0.1, tip - w * 0.7, (s) => Math.min(4, s + 1));
  tmark(g, L, CX - vh - w - 0.3, top - 0.4, CX - 0.4, tip - w * 1.1, (s) => s - 1);
  tmark(g, L, CX + vh + w + 0.3, top - 0.4, CX + 0.3, tip - w * 1.1, (s) => s - 1);
}

/**
 * A band around the torso in local y [lo, hi] (hem, waistband, trim): the
 * torso volume with a lit rim along its top and a darker lower edge, and the
 * cloth just above it tucked in under a 1 px dark line.
 */
function hemBand(g: DrawCtx, L: Layer, lo: number, hi: number, inflate: number, pen: Pen, opts: { flare?: number; tuck?: boolean; lift?: number } = {}): void {
  const h = Math.max(0.5, hi - lo);
  const wide = g.bp.shoulderHalf + 3;
  if (opts.tuck !== false) tmark(g, L, -wide, hi + 0.35, wide, hi + 0.35, (s) => s - 1);
  fillT(g, L, inflate, pen, { top: hi, bottom: lo, flare: opts.flare }, undefined, (x, y) => {
    const l = toT(g, x, y);
    const f = (hi - l.y) / h;
    const band = f < 0.3 ? 0.32 : f > 0.62 ? -0.24 : 0;
    return tone(torsoLight(g, l.x, l.y) + (opts.lift ?? 0) + band + wob2(l.x * 1.3, l.y * 0.9, 17) * 0.12);
  });
}

/** How far a crew neckline dips below the top of the shirt at local x (a shallow U around the front of the neck). */
function crewDip(g: DrawCtx, x: number): number {
  const u = (x - 0.9) / (g.bp.neckW + 1.1);
  return Math.abs(u) < 1 ? 1.1 * (1 - u * u) : 0;
}

/** Ribbed crew collar along the U neckline: a lit rib under the edge, then a dark line where it meets the chest. */
function crewNeck(g: DrawCtx, L: Layer): void {
  const Lt = g.bp.torsoLen;
  const w = g.bp.neckW + 1.1;
  const pts = (off: number) => Array.from({ length: 9 }, (_, i) => -w * 1.15 + 0.9 + (i / 8) * w * 2.3).map((x) => TB(g, x, Lt + 0.5 - crewDip(g, x) - off));
  const lit = pts(0.55);
  const dark = pts(1.15);
  for (let i = 0; i < 8; i++) {
    mark(L, lit[i], lit[i + 1], (s) => Math.min(4, s + 1));
    mark(L, dark[i], dark[i + 1], (s) => s - 1);
  }
}

// ---------------------------------------------------------------------------
// The owner's Solen: his far arm and his legs (docs/reference/solen-owner-reference.jpg). He drew the far arm
// thinner and nearer the body than ours and the legs wider (founderOut.ts): his pieces of them stay where he
// drew them, and our limbs are moved under them while they hang or stand as at rest.
// ---------------------------------------------------------------------------

/** His pieces where they land now, in a layer: 2 inside his line, 1 his line (`kinds` say which colours are his line). */
function piecesShape(pieces: [PaintedPiece, Vec, number, Record<string, string>][]): Layer {
  const shape = new Layer();
  for (const [p, at, deg, kinds] of pieces) {
    const pal: TemplatePalette = {};
    for (const [ch, hex] of Object.entries(p.colors)) pal[ch] = [kinds[hex] === 'line' ? 1 : 2, 3];
    stampTemplate(shape, p, at, deg - p.angle, pal, 'torso', { flags: F_NO_TEXTURE | F_NO_OUTLINE });
  }
  return shape;
}

/** His tunic's black line (the colours tools/refs/solen_ref.py sorts as line). */
const tunicLine = (hex: string) => FOUNDER_TUNIC_KIND[hex] === 'line';

/** A fist he painted (`p`) on the wrist (moved `out`), as paintedFist does it. */
function founderFist(g: DrawCtx, s: Side, p: PaintedPiece, out: Vec, depth: Depth, color: (ch: string, hex: string) => string): void {
  const j = armJoints(g.rig, s);
  const { flipX } = handPose(g, s);
  const drawn = flipX ? 180 - p.angle : p.angle;
  const turn = ((segAngle(j.wrist, j.hand) - drawn + 540) % 360) - 180;
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(p.colors)) pal[ch] = [g.m(color(ch, hex), 'flat'), 3];
  stampTemplate(g.L(depth), p, add(j.wrist, out), Math.abs(turn) <= 30 ? 0 : turn, pal, prt('hand', s), { flipX, flags: F_NO_TEXTURE | F_NO_OUTLINE, line: (ch) => tunicLine(p.colors[ch]) });
}

/**
 * His far upper arm reaching up to the shoulder. At rest the cuirass hides it above his piece (he drew none
 * of it there); as the arm reaches out from behind the body, his strip of skin between its two lines goes
 * on up to the shoulder (continuedTo).
 */
const farArmToShoulder = (): PaintedPiece => continuedTo(limbOnly(FOUNDER_ARM_F, tunicLine), FOUNDER_ARM_F.pivot[1], 2, tunicLine, (h) => FOUNDER_TUNIC_KIND[h] === 'skin');

const FAR_ARM: PartId[] = ['upperArmF', 'forearmF', 'handF'];

/**
 * His pieces of each arm: the bare upper arm (the near one under his sleeve), the steel bracer and the fist;
 * FOUNDER_ARM_MOVING, what of them goes along when the arm leaves the way he drew it (limbOnly, the far
 * upper arm continued up to the shoulder).
 */
const FOUNDER_ARM = {
  N: { arm: FOUNDER_ARM_N, sleeve: FOUNDER_SLEEVE_N as PaintedPiece | null, bracer: STEEL_BRACER_N, fist: FOUNDER_HAND_N },
  F: { arm: FOUNDER_ARM_F, sleeve: null as PaintedPiece | null, bracer: STEEL_BRACER_F, fist: FOUNDER_HAND_F },
};
const FOUNDER_ARM_MOVING = {
  N: { arm: limbOnly(FOUNDER_ARM_N, tunicLine), sleeve: limbOnly(FOUNDER_SLEEVE_N, tunicLine) as PaintedPiece | null, bracer: limbOnly(STEEL_BRACER_N, (h) => STEEL_BRACER_KIND[h] === 'line'), fist: limbOnly(FOUNDER_HAND_N, tunicLine) },
  F: { arm: farArmToShoulder(), sleeve: null as PaintedPiece | null, bracer: limbOnly(STEEL_BRACER_F, (h) => STEEL_BRACER_KIND[h] === 'line'), fist: limbOnly(FOUNDER_HAND_F, tunicLine) },
};

/**
 * His far arm reaching out (founderFarReach): his near arm mirrored (tools/refs/solen-reach-from-ref.py), as
 * thick as he drew that one, since his far arm, hanging in shadow, is too thin to read stretched out. Only the
 * limb (limbOnly), the upper arm continued up to the shoulder (continuedTo) as the far one is.
 */
const FOUNDER_ARM_REACH = {
  arm: continuedTo(limbOnly(FOUNDER_REACH_ARM_F, tunicLine), FOUNDER_REACH_ARM_F.pivot[1], 2, tunicLine, (h) => FOUNDER_TUNIC_KIND[h] === 'skin'),
  sleeve: limbOnly(FOUNDER_REACH_SLEEVE_F, tunicLine) as PaintedPiece | null,
  bracer: limbOnly(FOUNDER_REACH_BRACER_F, (h) => STEEL_BRACER_KIND[h] === 'line'),
  fist: limbOnly(FOUNDER_REACH_HAND_F, tunicLine),
};

/** His pieces of an arm in this pose: whole at rest, the far arm reaching out his near arm mirrored, else only the limb. */
const founderArmPieces = (g: DrawCtx, s: Side) => (s === 'F' && founderFarReach(g) ? FOUNDER_ARM_REACH : (founderArmAtRest(g, s) ? FOUNDER_ARM : FOUNDER_ARM_MOVING)[s]);

/** His steel bracer on an arm, whole at rest, else only the bracer (for hands_steel_bracers). */
export const founderBracer = (g: DrawCtx, s: Side): PaintedPiece => founderArmPieces(g, s).bracer;

/** How near a joint (fine pixels) his cells turn with it when it bends (stampBent): about half his arm's width. */
const FOUNDER_JOINT_R = 4;

/**
 * One of his arms, his pieces turned rigidly about our joints in every pose (the owner on Ren, built the
 * same way: "en la mayoria tiene los brazos diferentes al diseño en las poses como en lanzar jutsu, herido,
 * cargar"): his bare upper arm (under his navy sleeve on the near side) about the shoulder, his steel
 * bracer about the elbow (the hands item, hands_steel_bracers), his fist on the wrist. Our arm is taken
 * away wherever his pieces are the arm: always the upper arm, the forearm under his bracer, and the
 * hand, which is his fist (he drew no other: a grip, a hand sign, a hand flung out or held up to cast are
 * his fist too; only a pointing finger and a hand cradling a book stay our hand pictures). Where his
 * shoulder and elbow bend past the way he drew them, his own cells next to the joint fill the bend
 * (stampBent), so no other arm shows through. At rest every pixel of both arms is his, his pieces whole;
 * moving, each takes only the limb along (limbOnly: not the skirt's red or the strap beside his far fist).
 * The far arm hangs where he drew it while it hangs as at rest (founderFarOut), and on our far joints as
 * it reaches out, so his hands meet where ours do.
 */
function founderArm(g: DrawCtx, s: Side, color: (ch: string, hex: string) => string): void {
  const j = armJoints(g.rig, s);
  const P = founderArmPieces(g, s);
  const { out, w } = s === 'F' ? founderFarOut(g) : { out: v(0, 0), w: 1 };
  const kind = handPose(g, s).kind;
  const fist = kind !== 'point' && kind !== 'cradle';
  const bracer = g.has('hands', 'hands_steel_bracers');
  // Without his bracer our bare forearm stays (moved under his far arm), its wrist under his fist.
  if (fist && !bracer) bareHandOff(g, s);
  const body = armDepth(s, 'body');
  const ours: PartId[] = [prt('upperArm', s), ...(bracer ? [prt('forearm', s)] : []), ...(fist ? [prt('hand', s)] : [])];
  for (const d of [body, armDepth(s, 'cloth')]) {
    if (s === 'F') moveParts(g.L(d), FAR_ARM, out);
    clearParts(g.L(d), ours);
  }
  const shoulder = add(j.shoulder, out);
  const elbow = add(j.elbow, out);
  const upper = segAngle(j.shoulder, j.elbow);
  const fore = segAngle(j.elbow, j.wrist);
  const bend = founderArmBends(g, s);
  // What is drawn over his upper arm (his bracer, his sleeve): a bend's copies end there without a line.
  const over = piecesShape([
    ...(bracer ? [[P.bracer, elbow, fore, STEEL_BRACER_KIND] as PieceAt] : []),
    ...(P.sleeve ? [[P.sleeve, shoulder, upper, FOUNDER_TUNIC_KIND] as PieceAt] : []),
  ]);
  const covered = (x: number, y: number) => over.mat[y * GRID + x] >= 0;
  // His fist first: hanging at rest his far fist is in front of the skirt's edge and the far thigh, as he drew it.
  if (fist) founderFist(g, s, P.fist, out, s === 'F' && w === 1 ? 'farHand.front' : body, color);
  const joints: PieceJoint[] = [{ about: elbow, r: FOUNDER_JOINT_R, bend: bend.elbow, carry: true }];
  // The far shoulder is his bare arm's own top; the near one his sleeve's.
  if (!P.sleeve) joints.push({ about: shoulder, r: FOUNDER_JOINT_R, bend: bend.shoulder });
  stampBent(g, body, P.arm, shoulder, upper, prt('upperArm', s), joints, tunicLine, color, covered);
  if (P.sleeve) stampBent(g, armDepth(s, 'cloth'), P.sleeve, shoulder, upper, prt('upperArm', s), [{ about: shoulder, r: FOUNDER_JOINT_R, bend: bend.shoulder }], tunicLine, color);
}

type PieceAt = [PaintedPiece, Vec, number, Record<string, string>];

/** His trousers' black line, and the plain navy of a trouser leg (no gold stud). */
const trousersLine = (hex: string) => FOUNDER_TROUSERS_KIND[hex] === 'line';
const trousersPlain = (hex: string) => FOUNDER_TROUSERS_KIND[hex] === 'navy';

/** How many cells inside his line a row across his trouser leg has where it is whole (continuedTo). */
const THIGH_ACROSS = 7;

const THIGH_MOVING = new Map<string, PaintedPiece>();

/**
 * His trouser leg as it moves: only the leg (limbOnly), continued up to the hip where the skirt hides it at
 * rest (he drew none of it there), so a leg kicked or stepped out from under the skirt is his navy all the
 * way up.
 */
function thighMoving(g: DrawCtx, s: Side): PaintedPiece {
  const key = `${g.rig.body}${s}`;
  let p = THIGH_MOVING.get(key);
  if (!p) {
    const thigh = s === 'N' ? FOUNDER_THIGH_N : FOUNDER_THIGH_F;
    const hipRow = thigh.pivot[1] - founderLegLen(g.rig.body, s, 'thigh') * Math.sin((thigh.angle * Math.PI) / 180);
    THIGH_MOVING.set(key, (p = continuedTo(limbOnly(thigh, trousersLine), hipRow, THIGH_ACROSS, trousersLine, trousersPlain)));
  }
  return p;
}

/**
 * His legs. Standing as at rest: each of our legs moved under his trouser leg and his sandal
 * (founderLegOut), his trouser leg stamped about our knee moved as far, our leg cut to his trouser leg and
 * sandal (inside their black line), so every pixel of the legs is his. Moving (walking, running, kicking,
 * kneeling, sitting): his trouser leg turned rigidly about our knee, our trouser leg (and our shin, under
 * his sandal) taken away so no other leg shows beside his; what his knee covers below it rides the shin,
 * and his own cells fill the knee and the hip as they bend (stampBent).
 */
function founderLegs(g: DrawCtx, color: (ch: string, hex: string) => string): void {
  for (const s of SIDES) {
    const { hip, knee, ankle } = legJoints(g.rig, s);
    const { out, w } = founderLegOut(g, s);
    const leg: PartId[] = [prt('thigh', s), prt('shin', s), prt('foot', s)];
    const layers = [legDepth(s, 'body'), legDepth(s, 'cloth')];
    const thigh = s === 'N' ? FOUNDER_THIGH_N : FOUNDER_THIGH_F;
    if (w === 1) {
      for (const d of layers) moveParts(g.L(d), leg, out);
      const sandal = add(ankle, out);
      const pieces = sandalPieces(g.look.slots.feet?.parts?.paint);
      const shape = piecesShape([
        [thigh, add(knee, out), segAngle(hip, knee), FOUNDER_TROUSERS_KIND],
        [pieces[s].shin, sandal, segAngle(knee, ankle), pieces.kind],
        [pieces[s].foot, sandal, pieces[s].foot.angle, pieces.kind],
      ]);
      for (const d of layers) clipParts(g.L(d), leg, shape);
      // Over the leg's footwear (its armour layer): his trouser leg ends on his sandal's strap band below the knee, over
      // whatever a boot or sandal shows above it.
      stampPiece(g, legDepth(s, 'armor'), thigh, add(knee, out), segAngle(hip, knee), prt('thigh', s), color, trousersLine);
      continue;
    }
    const sandals = g.has('feet', 'feet_gladiator_sandals');
    for (const d of layers) clearParts(g.L(d), sandals ? [prt('thigh', s), prt('shin', s)] : [prt('thigh', s)]);
    const bend = founderLegBends(g, s);
    stampBent(g, legDepth(s, 'armor'), thighMoving(g, s), knee, segAngle(hip, knee), prt('thigh', s), [
      { about: knee, r: 5, bend: bend.knee, carry: true },
      { about: hip, r: 5, bend: bend.hip },
    ], trousersLine, color);
  }
}

export const TOP_ITEMS: ItemDef[] = liftMain([
  {
    id: 'top_tee',
    slot: 'top',
    name: 'Training Tee',
    desc: 'Short-sleeved cotton shirt with a ribbed round collar.',
    colors: [col('main', 'Shirt', '#e8e2d4')],
    draw: (g, [c]) => {
      const L = g.L('torso.top');
      const Lt = g.bp.torsoLen;
      const hh = g.bp.hipHalf;
      const pen = clothPen(g, c, 'torso');
      shirtBody(g, L, pen, 0.2, { crew: true });
      crewNeck(g, L);
      // pull folds from the near armpit, a drape down the far side, soft folds over the belly
      tfold(g, L, -3.4, Lt - 4.4, -0.8, Lt - 7.6);
      tfold(g, L, -3.2, Lt - 6.6, -1.2, Lt - 9.2);
      tfold(g, L, 3.7, Lt - 7.4, 3.1, 3.0, 2);
      tfold(g, L, -1.4, 3.2, 1.8, 2.5);
      // hem: stitched band with a lit fold on top and a dark seam above it
      tmark(g, L, -hh - 1, 1.5, hh + 1, 1.4, (s) => s - 1);
      tmark(g, L, -hh - 1, 1.0, hh + 1, 0.9, (s) => Math.min(4, s + 1));
      sleeves(g, c, 0.56, 0.8);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        cuff(g, La, 'arm', s, 0.46, 0.56, 0.85, clothPen(g, c, prt('upperArm', s), sb(s)), 0.8);
        fold(La, armPoint(g, s, 0.12), along(armPoint(g, s, 0.12), armPoint(g, s, 0.44), 1, 0.9));
      }
    },
  },
  {
    id: 'top_highcollar',
    slot: 'top',
    name: 'High-Collar Shirt',
    desc: 'Short-sleeved shirt with a tall wrapped collar and contrasting hem and cuffs.',
    colors: [col('main', 'Shirt', '#1e2a4a'), col('trim', 'Trim', '#e5e7eb')],
    draw: (g, [c, t]) => {
      const L = g.L('torso.top');
      const Lt = g.bp.torsoLen;
      const pen = clothPen(g, c, 'torso');
      const tp = clothPen(g, t, 'torso');
      shirtBody(g, L, pen, -0.6);
      // shade under the tall collar, pull folds from the armpit, a drape down the front
      tmark(g, L, -2.4, Lt - 0.2, 3.6, Lt - 0.5, (s) => s - 1);
      tfold(g, L, -3.4, Lt - 4.2, -0.9, Lt - 7.4);
      tfold(g, L, -3.1, Lt - 6.6, -1.4, Lt - 9.0);
      tfold(g, L, 3.8, Lt - 7.6, 3.0, 2.2, 2);
      tfold(g, L, -1.2, 3.4, 1.6, 2.6);
      lifted(t, () => hemBand(g, L, -0.6, 1.4, 0.55, tp));
      sleeves(g, c, 0.6, 0.8);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        lifted(t, () => cuff(g, La, 'arm', s, 0.48, 0.6, 0.85, clothPen(g, t, prt('upperArm', s), sb(s)), 0.8));
        fold(La, armPoint(g, s, 0.1), along(armPoint(g, s, 0.1), armPoint(g, s, 0.44), 1, 0.9));
      }
      highCollar(g, c, 4, 1.1);
    },
  },
  {
    id: 'top_longsleeve',
    slot: 'top',
    name: 'Long-Sleeve Tunic',
    desc: 'Hip-length tunic with long sleeves, a trimmed V neck and trimmed cuffs.',
    colors: [col('main', 'Tunic', '#5f6e45'), col('trim', 'Trim', '#3b2c21')],
    draw: (g, [c, t]) => {
      const L = g.L('torso.top');
      const Lt = g.bp.torsoLen;
      const pen = clothPen(g, c, 'torso');
      const tp = clothPen(g, t, 'torso');
      shirtBody(g, L, pen, -2.4, { vDepth: 4.2, vHalf: 2.2, inflate: 0.6 });
      vTrim(g, L, 4.2, 2.2, 0.9, tp);
      // pull folds from the armpit, the tunic blousing toward the hips, a drape down the front
      tfold(g, L, -3.4, Lt - 4.6, -0.6, Lt - 8.0);
      tfold(g, L, -3.2, Lt - 7.0, -1.0, Lt - 9.6);
      tfold(g, L, 4.0, Lt - 7.4, 3.3, 0.2, 2);
      tfold(g, L, -2.6, 3.0, -1.6, -0.4);
      tfold(g, L, 0.6, 3.2, 2.2, 0.0);
      lifted(t, () => hemBand(g, L, -2.4, -0.9, 0.6, tp));
      sleeves(g, c, 1.92, 0.6);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        jointFolds(g, La, 'arm', s, 0.6);
        // cloth gathering above the cuff
        fold(La, along(armPoint(g, s, 1.5), armPoint(g, s, 1.7), 0, 0.9), along(armPoint(g, s, 1.5), armPoint(g, s, 1.7), 0.6, -0.6));
        lifted(t, () => cuff(g, La, 'arm', s, 1.72, 1.94, 0.85, clothPen(g, t, prt('forearm', s), sb(s)), 0.6));
      }
    },
  },
  {
    id: 'top_mesh',
    slot: 'top',
    name: 'Mesh Undershirt',
    desc: 'Close-fitting dark chain-mesh shirt with solid collar, hem and cuffs.',
    colors: [col('main', 'Mesh', '#3a3d47'), col('band', 'Bands', '#1c1d24')],
    draw: (g, [c, bnd]) => {
      const L = g.L('torso.top');
      const mat = g.m(c, 'cloth');
      const pen: Pen = { mat, part: 'torso' };
      shirtBody(g, L, pen, 0.6, { inflate: 0.3 });
      meshify(L, mat);
      lifted(bnd, () => hemBand(g, L, 0.6, 1.8, 0.35, clothPen(g, bnd, 'torso')));
      sleeves(g, c, 1.4, 0.3);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        meshify(La, mat);
        lifted(bnd, () => cuff(g, La, 'arm', s, 1.24, 1.42, 0.5, clothPen(g, bnd, prt('forearm', s), sb(s)), 0));
      }
      lifted(bnd, () => highCollar(g, bnd, 2, 0.4));
    },
  },
  {
    id: 'top_jacket',
    slot: 'top',
    name: 'Track Jacket',
    desc: 'Zip-up training jacket with a contrasting yoke, shoulders, cuffs and stand collar.',
    colors: [col('main', 'Body', '#ec7a24'), col('accent', 'Shoulders', '#24252d'), col('zip', 'Zip', '#c9ced6', 'metal')],
    draw: (g, [c, a, z]) => {
      const L = g.L('torso.top');
      const Lt = g.bp.torsoLen;
      const pen = clothPen(g, c, 'torso');
      const ap = clothPen(g, a, 'torso');
      const zm = g.m(z, 'metal');
      shirtBody(g, L, pen, -0.8, { inflate: 0.75 });
      // Body folds: pull folds from the armpit, the jacket blousing over its waistband
      tfold(g, L, -3.4, Lt - 4.8, -0.8, Lt - 8.0);
      tfold(g, L, -3.0, Lt - 7.4, -1.2, Lt - 9.8);
      tfold(g, L, 3.9, Lt - 7.0, 3.2, 2.0, 2);
      tfold(g, L, -2.4, 2.6, -0.6, 1.0);
      tfold(g, L, 0.2, 2.8, 1.4, 0.9);
      tfold(g, L, 2.6, 2.4, 3.6, 1.0);
      // Welt pocket: dark slit with a lit lip above it
      tmark(g, L, 2.5, 4.4, 4.5, 3.4, (s) => s - 2);
      tmark(g, L, 2.4, 4.9, 4.4, 3.9, (s) => Math.min(4, s + 1));
      // Yoke across the shoulders (dipping toward the front), with its seam shading the panel below
      const yoke = (lx: number, ly: number) => ly > Lt - 3.4 + Math.max(0, lx - 1) * 0.35 - (lx < -3 ? (lx + 3) * 0.3 : 0);
      fillT(g, L, 0.75, pen, {}, (lx, ly) => !yoke(lx, ly) && yoke(lx, ly + 0.55), () => 1);
      lifted(a, () => {
        fillT(g, L, 0.75, ap, {}, yoke, torsoShade(g));
        hemBand(g, L, -0.8, 0.8, 0.75, ap);
      });
      // Zip: dark gap down the centre front with dashed metal teeth, pull tab at the top
      tseam(g, L, CX + 0.3, Lt + 0.4, CX + 0.3, -0.8, -2);
      tstitch(g, L, CX, Lt + 0.2, CX, -0.6, { mat: zm, part: 'torso' }, 3, 2);
      stud(L, TB(g, CX + 0.6, Lt - 1.2), zm, 'torso', true);
      fpx(L, TB(g, CX + 0.9, Lt - 2.2), zm, 'torso', 3);
      // Sleeves: accent shoulders and cuffs, folds at the elbow and above the cuff
      sleeves(g, c, 1.92, 0.75);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        jointFolds(g, La, 'arm', s, 0.75);
        fold(La, along(armPoint(g, s, 1.5), armPoint(g, s, 1.72), 0, 1.0), along(armPoint(g, s, 1.5), armPoint(g, s, 1.72), 0.6, -0.7));
        across(g, La, 'arm', s, 0.58, 0.8, -1);
        lifted(a, () => {
          limb(g, La, 'arm', s, 0, 0.55, 0.8, clothPen(g, a, prt('upperArm', s), sb(s)), { round0: true });
          cuff(g, La, 'arm', s, 1.74, 1.94, 0.9, clothPen(g, a, prt('forearm', s), sb(s)), 0.75);
        });
        across(g, La, 'arm', s, 1.86, 0.9, -1);
      }
      lifted(a, () => highCollar(g, a, 3, 0.9));
    },
  },
  {
    id: 'top_kimono',
    slot: 'top',
    name: 'Wrap Kimono',
    desc: 'Crossed-collar wrap top with wide, open sleeves that end at the elbow.',
    colors: [col('main', 'Kimono', '#ded8ca'), col('collar', 'Collar', '#2b3557')],
    draw: (g, [c, k]) => {
      const L = g.L('torso.top');
      const Lt = g.bp.torsoLen;
      const pen = clothPen(g, c, 'torso');
      const kp = clothPen(g, k, 'torso');
      // Body with the V opening of the crossed collar; the hem hangs straight (no flare)
      const tip = Lt - 7.0;
      fillT(
        g,
        L,
        0.8,
        pen,
        { bottom: -2.6 },
        (lx, ly) => {
          if (ly < tip) return true;
          const t = (Lt + 1 - ly) / (Lt + 1 - tip);
          return lx < -0.6 + 2.8 * t || lx > 3.4 - 1.2 * t;
        },
        torsoShade(g),
      );
      // Wrap folds running diagonally down from the near shoulder, parallel to the crossing panel
      tfold(g, L, -3.4, Lt - 4.6, -0.6, Lt - 9.0, 1);
      tfold(g, L, -3.2, Lt - 8.2, -0.2, 2.6, 1);
      tfold(g, L, -1.6, 3.0, 1.6, -1.4, 1);
      // The overlapping front edge, from the collar tip down to the hem, shades the panel under it
      tfold(g, L, 2.9, tip - 1.6, 3.4, -2.2, 2);
      // hem: a lit fold above the bottom edge
      tmark(g, L, -g.bp.hipHalf - 1.5, -1.6, g.bp.hipHalf + 1.5, -1.6, (s) => Math.min(4, s + 1));
      // Lapels: the near lapel crosses over (lit along its top, casting a shadow on the panel below it)
      tmark(g, L, -2.4, Lt + 0.2, 1.2, tip - 1.2, (s) => s - 1);
      tmark(g, L, 1.2, tip - 1.2, 3.0, tip - 2.6, (s) => s - 1);
      tpoly(g, L, [[-2.2, Lt + 0.9], [-0.5, Lt + 0.9], [2.7, tip - 0.2], [2.9, tip - 2.0], [1.3, tip - 0.6]], kp, 3);
      tmark(g, L, -1.7, Lt + 0.5, 1.6, tip - 0.6, (s) => s + 1);
      tpoly(g, L, [[3.3, Lt + 0.9], [4.6, Lt + 0.4], [3.0, tip], [2.2, tip + 0.6]], kp, 2);
      tseam(g, L, -0.6, Lt + 0.4, 2.2, tip, 1);
      // Wide sleeves: a bell that widens to an open cuff just past the elbow
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        const j = armJoints(g.rig, s);
        const R = g.bp.armR;
        const p = clothPen(g, c, prt('upperArm', s), sb(s));
        const dir = norm(sub(j.elbow, j.shoulder));
        const end = add(j.elbow, scale(dir, 1.1));
        let n = perp(dir);
        if (n.y < -0.2 || (Math.abs(n.y) <= 0.2 && n.x > 0)) n = scale(n, -1);
        const rEnd = R[1] + 2.3;
        const len0 = Math.hypot(end.x - j.shoulder.x, end.y - j.shoulder.y) || 1;
        const sh = tubeShade(j.shoulder, dir, perp(dir), len0, R[0] + 0.8, rEnd);
        // hanging lower corner of the sleeve
        const D = 3.4;
        const rimF = add(end, scale(n, -rEnd));
        const rimB = add(end, scale(n, rEnd));
        const mid = add(lerp(j.shoulder, end, 0.4), scale(n, R[0] + 1.2));
        tube(La, j.shoulder, end, R[0] + 0.8, rEnd, p, sh);
        // (never below shade 2 before the side bias, so the far sleeve's underside stays cloth, not a black blob)
        poly(La, [rimF, add(rimF, v(0, D * 0.55)), add(lerp(rimF, rimB, 0.75), v(0, D + 0.4)), add(rimB, v(0, D - 0.6)), mid], p, (x, y) => Math.max(2, sh(x, y) - (y + 0.5 > end.y + 1.2 ? 1 : 0)));
        ellipse(La, j.shoulder.x, j.shoulder.y, R[0] + 0.8, R[0] + 0.8, p, capShade(j.shoulder, R[0] + 0.8));
        // dark inside of the open cuff
        const inner = clothPen(g, c, prt('forearm', s), 0);
        tube(La, add(end, scale(dir, -0.7)), end, rEnd - 0.9, rEnd - 0.7, inner, 1);
        // long folds down the sleeve and into the hanging corner
        fold(La, add(lerp(j.shoulder, end, 0.35), scale(n, R[0] * 0.4)), add(lerp(j.shoulder, end, 0.92), scale(n, rEnd * 0.6)), 2);
        fold(La, add(lerp(j.shoulder, end, 0.55), scale(n, -R[0] * 0.5)), add(lerp(j.shoulder, end, 0.9), scale(n, -rEnd * 0.5)), 1);
        fold(La, add(end, scale(n, rEnd * 0.2)), add(add(lerp(rimF, rimB, 0.6), v(0, D - 0.4)), scale(n, 0)), 1);
      }
    },
  },
  {
    id: 'top_sleeveless',
    slot: 'top',
    name: 'Sleeveless Tunic',
    desc: 'Hip-length sleeveless tunic with a laced V front and trimmed edges.',
    colors: [col('main', 'Tunic', '#8a3b2e'), col('trim', 'Trim', '#e2c58b')],
    draw: (g, [c, t]) => {
      const L = g.L('torso.top');
      const Lt = g.bp.torsoLen;
      const pen = clothPen(g, c, 'torso');
      const tp = clothPen(g, t, 'torso');
      shirtBody(g, L, pen, -2.2, { vDepth: 4.6, vHalf: 1.8, inflate: 0.55 });
      // folds: pull folds from the armhole, the tunic gathering toward the hips, a drape down the front
      tfold(g, L, -3.4, Lt - 4.4, -0.8, Lt - 7.8);
      tfold(g, L, -3.2, Lt - 7.0, -1.0, Lt - 9.6);
      tfold(g, L, 3.8, Lt - 8.0, 3.1, 0.0, 2);
      tfold(g, L, -2.2, 2.8, -1.4, -0.6);
      tfold(g, L, 0.8, 3.0, 2.0, -0.4);
      vTrim(g, L, 4.6, 1.8, 0.6, tp);
      lifted(t, () => hemBand(g, L, -2.2, -1.0, 0.55, tp));
      // Cross lacing over the V: lit where each lace crosses over, dark where it dips under
      const lp: Pen = { mat: g.m(t, 'cloth'), part: 'torso' };
      for (let i = 0; i < 2; i++) {
        const y0 = Lt - 0.4 - i * 1.7;
        tstitch(g, L, CX - 1.4 + i * 0.5, y0, CX + 1.2 - i * 0.5, y0 - 1.5, lp, 4, 0);
        tstitch(g, L, CX + 1.2 - i * 0.5, y0, CX - 1.4 + i * 0.5, y0 - 1.5, lp, 2, 0);
      }
    },
  },
  {
    id: 'top_royalcoat',
    slot: 'top',
    name: 'Royal Long Coat',
    desc: 'Fitted dark long coat with short sleeves, a high collar and tails to mid-shin, studded with small gold buttons.',
    colors: [col('main', 'Coat', '#1f2a4a'), col('buttons', 'Studs', '#b8913a', 'metal'), col('trim', 'Cuffs', '#2a3a62')],
    draw: (g, [c, bt, tr]) => {
      const b = g.bp;
      const Lt = b.torsoLen;
      const L = g.L('torso.top');
      const pen = clothPen(g, c, 'torso');
      const bm = g.m(bt, 'metal');
      // Body: dark navy volume, shaded under the high collar
      shirtBody(g, L, pen, -2.6, { inflate: 0.7 });
      tmark(g, L, -2.6, Lt - 0.1, 3.8, Lt - 0.4, (s) => s - 1);
      // 1px dark seams between the panels: closure (with the lit edge of the overlap), waist, princess seams
      tseam(g, L, CX + 2.2, Lt + 0.4, CX + 2.0, -2.4, -1);
      tmark(g, L, CX + 1.8, Lt - 1.0, CX + 1.7, -2.0, (s) => Math.min(4, s + 1));
      tseam(g, L, -b.waistHalf - 1, 3.5, b.waistHalf + 1, 3.2, -1);
      tmark(g, L, -b.waistHalf - 1, 4.0, b.waistHalf + 1, 3.7, (s) => Math.min(4, s + 1));
      tseam(g, L, -2.4, Lt - 7.6, -2.3, 3.5, -1);
      tseam(g, L, -2.4, Lt - 7.6, CX + 1.8, Lt - 7.8, -1);
      // pull folds from the near armpit
      tfold(g, L, -3.6, Lt - 4.0, -2.6, Lt - 7.0);
      tfold(g, L, -1.8, Lt - 8.4, -0.4, 4.2);
      // A few small studs on the chest
      for (let k = 0; k < 3; k++) stud(L, TB(g, CX + 0.9, Lt - 3.2 - k * 2.4), bm, 'torso', k === 0);
      // Long tails to mid-shin, hanging straight from the hips (no bell): closed at the
      // front while standing, opening up in wide stances; the legs read through the drape.
      const O = g.L('torso.over');
      const r = g.rig;
      const T = r.T;
      const top = 0.9;
      const split = 1.7;
      /** Point on the torso-local vertical line x that sits at screen height y. */
      const onLine = (x: number, y: number): Vec => T(x, (y - r.pelvis.y - r.right.y * x) / r.up.y);
      const back = T(backX(g, top) - 0.6, top);
      const front = T(frontX(g, top) + 0.4, top);
      const hemN = legPoint(g, 'N', 1.5);
      const hemF = legPoint(g, 'F', 1.45);
      const lr = limbR(g, 'leg', 1.5);
      const yN = hemN.y + 0.5;
      const yF = hemF.y;
      const cN = onLine(split, yN);
      const cF = onLine(split, yF);
      // how far each panel may reach toward the centre: less as the stance widens
      const reach = Math.max(1.2, 6 - Math.max(0, hemF.x - hemN.x - 15) * 0.9);
      const nL = v(Math.min(hemN.x - lr - 1.0, back.x - 0.3), yN);
      const nR = v(Math.max(hemN.x + lr + 1.2, Math.min(cN.x + 1.0, hemN.x + lr + reach)), yN);
      const fL = v(Math.min(hemF.x - lr - 0.8, Math.max(cF.x - 1.2, hemF.x - lr - reach)), yF);
      const fR = v(Math.max(hemF.x + lr + 0.8, front.x + 0.3), yF - 0.5);
      const fTop = T(split + 0.2, top);
      const nTop = T(split, top);
      const drape = drapeLight(g, 1.4);
      /** Tails: tight over the hips under the waist seam, then draped over the legs. */
      const tails = (dy: number, lift: number): ShadeFn => (x, y) => {
        const l = toT(g, x, y);
        const k = clamp((top - l.y) / 3, 0, 1);
        const lt = torsoLight(g, l.x, l.y) * (1 - k) + drape(x + 0.5, y + 0.5) * k;
        return tone(lt + lift + wob((x - PAD.x) * 1.7, 23) * 0.12 - clamp((y + 0.5 - dy) / 16, 0, 0.1));
      };
      // Far panel (behind at the closure): a shade darker
      poly(O, [fTop, front, fR, fL], clothPen(g, c, 'torso', -1), tails(fTop.y, 0.22));
      fold(O, lerp(fTop, front, 0.5), lerp(fL, fR, 0.55), 1);
      // Near panel
      poly(O, [back, nTop, nR, nL], pen, tails(nTop.y, 0));
      // long vertical folds hanging from the waist: lit crests with dark troughs
      for (const k of [0.28, 0.55]) fold(O, lerp(back, nTop, k), lerp(nL, nR, k - 0.06), 2);
      // the trough between the legs runs down from the crotch to the hem
      const inN = legXAt(g, 'N', yN - 1);
      const inF = legXAt(g, 'F', yN - 1);
      const ix = Math.min(nR.x - 1.4, (inN.x + limbR(g, 'leg', inN.t) + inF.x - limbR(g, 'leg', inF.t)) / 2 + 0.6);
      if (ix > nL.x + 2) fold(O, T(-0.2, -1.6), v(ix, yN - 0.6), 2, 3);
      // centre opening: 1px dark seam beside the lit panel edge
      seam(O, add(nTop, v(0.25, 0)), add(nR, v(0.25, 0)), -3);
      mark(O, add(nTop, v(-0.3, 0.6)), add(nR, v(-0.3, -0.8)), (s) => Math.min(4, s + 1));
      // hem: a lit fold just above the bottom edge
      mark(O, add(nL, v(0.6, -1.1)), add(nR, v(-0.4, -1.1)), (s) => Math.min(4, s + 1));
      mark(O, add(fL, v(0.4, -1.1)), add(fR, v(-0.6, -0.6)), (s) => Math.min(3, s + 1));
      // Two rows of small studs down the lower panel, every 4 fine px
      const len = nR.y - nTop.y;
      for (let y = 2.4; y < len - 1.6; y += 2) {
        const p = lerp(nTop, nR, y / len);
        stud(O, add(p, v(-1.4, 0)), bm, 'torso', y < 2.5);
        stud(O, add(p, v(-3.4, 0)), bm, 'torso');
      }
      // Short sleeves ending above the elbow, with a turned-up cuff
      sleeves(g, c, 0.8, 0.7);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        fold(La, along(armPoint(g, s, 0.1), armPoint(g, s, 0.55), 0, 0.5), along(armPoint(g, s, 0.1), armPoint(g, s, 0.55), 1, 0.9));
        lifted(tr, () => cuff(g, La, 'arm', s, 0.64, 0.82, 0.9, clothPen(g, tr, prt('upperArm', s), sb(s)), 0.7));
      }
      highCollar(g, c, 4.5, 1.2);
    },
  },
  {
    id: 'top_bomber',
    slot: 'top',
    name: 'Open Bomber Jacket',
    desc: 'Cropped jacket with a popped collar and long sleeves, worn open over a dark tank top.',
    colors: [col('main', 'Jacket', '#1f4f8f'), col('under', 'Tank Top', '#2b2a33')],
    draw: (g, [c, u]) => {
      const L = g.L('torso.top');
      const Lt = g.bp.torsoLen;
      const pen = clothPen(g, c, 'torso');
      const up = clothPen(g, u, 'torso');
      // Tank top under the open front, tucked into the trousers
      lifted(u, () => {
        shirtBody(g, L, up, -0.8, { crew: true, inflate: 0.45 });
        crewNeck(g, L);
      });
      // The jacket: cropped at the waist, open down the front, the gap widening toward the collar
      const gap = (ly: number) => 0.7 + 1.3 * clamp(ly / Lt, 0, 1);
      const wide = g.bp.shoulderHalf + 3;
      fillT(g, L, 0.85, pen, { bottom: 0.4 }, (lx, ly) => Math.abs(lx - CX) > gap(ly), torsoShade(g));
      // Edges of the opening: the near panel catches the light, the far one turns away,
      // and the shirt is shaded where the panels lie on it
      tmark(g, L, CX - gap(Lt) - 0.45, Lt, CX - gap(0.6) - 0.45, 0.6, (s) => Math.min(4, s + 1));
      tmark(g, L, CX + gap(Lt) + 0.45, Lt, CX + gap(0.6) + 0.45, 0.6, (s) => s - 1);
      tmark(g, L, CX - gap(Lt) + 0.35, Lt, CX - gap(0.6) + 0.35, 0.6, (s) => s - 1);
      // Ribbed hem: lit top edge over a dark lower line
      tmark(g, L, -wide, 1.5, CX - gap(1.5) - 0.2, 1.5, (s) => s - 1);
      tmark(g, L, CX + gap(1.5) + 0.2, 1.5, wide, 1.5, (s) => s - 1);
      tmark(g, L, -wide, 1.0, CX - gap(1) - 0.2, 1.0, (s) => Math.min(4, s + 1));
      // Pull folds from the armpit and the jacket blousing over its hem
      tfold(g, L, -3.4, Lt - 4.8, -0.9, Lt - 8.0);
      tfold(g, L, -3.0, Lt - 7.4, -1.3, Lt - 9.8);
      tfold(g, L, 4.0, Lt - 7.0, 3.4, 2.2, 2);
      tfold(g, L, -2.6, 2.8, -1.0, 1.6);
      // Long sleeves with folds at the elbow and bunching above the cuff
      sleeves(g, c, 1.92, 0.8);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        jointFolds(g, La, 'arm', s, 0.8);
        fold(La, along(armPoint(g, s, 1.45), armPoint(g, s, 1.72), 0, 1.0), along(armPoint(g, s, 1.45), armPoint(g, s, 1.72), 0.6, -0.7));
        fold(La, along(armPoint(g, s, 0.15), armPoint(g, s, 0.6), 0, 0.6), along(armPoint(g, s, 0.15), armPoint(g, s, 0.6), 1, 1.0));
        cuff(g, La, 'arm', s, 1.78, 1.94, 0.9, clothPen(g, c, prt('forearm', s), sb(s)), 0.75);
      }
      highCollar(g, c, 4, 1.2);
    },
  },
  {
    id: 'top_founder',
    slot: 'top',
    name: "Founder's Tunic",
    desc: 'A navy tunic with short sleeves and bare arms, the skin shaded as the owner painted it for Solen.',
    colors: [col('main', 'Tunic', FOUNDER_TUNIC)],
    draw: (g, [c]) => {
      // The owner's sleeve and bare upper arms on his Solen, his pixels (2026-10-21; tools/refs/
      // solen-tunic-from-ref.py): each arm in his skin and shading rides its upper arm about the
      // shoulder, the navy sleeve over the near one; the body of the tunic is a navy shirt under the
      // armour. His skin follows the character's skin, his navy the slot; his line stays.
      const L = g.L('torso.top');
      shirtBody(g, L, clothPen(g, c, 'torso'), 0.2, { crew: true });
      crewNeck(g, L);
      const tint = (_ch: string, hex: string): string => {
        const k = FOUNDER_TUNIC_KIND[hex];
        if (k === 'line') return hex;
        return k === 'navy' ? retintHex(hex, FOUNDER_TUNIC, c) : retintHex(hex, FOUNDER_ARM_SKIN, g.look.skin);
      };
      founderArm(g, 'F', tint);
      founderArm(g, 'N', tint);
    },
  },
  // The owner's sports top from his bare female body (docs/reference/female-base-owner-reference.jpg):
  // his pixels on the chest (body.ts), in the colour picked. The body always wears it in his black.
  {
    id: 'top_sports_bra',
    slot: 'top',
    name: 'Sports Top',
    desc: 'A fitted sports top with thin straps and a band under the bust.',
    colors: [col('main', 'Cloth', FEMALE_BASE_CLOTH)],
    bodies: ['female', 'slender'],
    draw: (g, [c]) => drawBaseCloth(g, 'top', c),
  },
]);

// ---------------------------------------------------------------------------
// Bottoms
// ---------------------------------------------------------------------------

/**
 * Wide panel per leg from hip to hem (hakama): it starts as wide as the hip and
 * falls nearly straight to a horizontal hem, shaded as cloth rounding over the
 * leg (lit toward the light, dark on the far side).
 */
function widePanel(g: DrawCtx, L: Layer, s: Side, wHip: number, wHem: number, hemT: number, pen: Pen, lift = 0): Vec[] {
  const hip = legJoints(g.rig, s).hip;
  const hem = legPoint(g, s, hemT);
  const pts = [v(hip.x - wHip, hip.y - 1), v(hip.x + wHip, hip.y - 1), v(hem.x + wHem + 0.6, hem.y), v(hem.x - wHem, hem.y)];
  poly(L, pts, pen, (x, y) => {
    const f = clamp((y + 0.5 - pts[0].y) / Math.max(1, pts[3].y - pts[0].y), 0, 1);
    const xl = pts[0].x + (pts[3].x - pts[0].x) * f;
    const xr = pts[1].x + (pts[2].x - pts[1].x) * f;
    const u = (2 * (x + 0.5 - xl)) / Math.max(1, xr - xl) - 1;
    return tone(hangLight(u) + lift + wob((y - PAD.y) * 1.4, 29) * 0.12);
  });
  return pts;
}

/** Waistband on the seat of a pair of trousers: a lit band edge over a dark seam. */
function waistband(g: DrawCtx, top: number): void {
  const L = g.L('torso.bottom');
  const hh = g.bp.hipHalf + 1.5;
  tmark(g, L, -hh, top - 1.2, hh, top - 1.2, (s) => s - 1);
  tmark(g, L, -hh, top - 0.6, hh, top - 0.6, (s) => Math.min(4, s + 1));
}

/** Folds at the knee and the cloth bunching at the ankle (or above a cuff) on one trouser leg. */
function legFolds(g: DrawCtx, L: Layer, s: Side, inflate: number, ankle = 1.62): void {
  jointFolds(g, L, 'leg', s, inflate);
  const a = legPoint(g, s, ankle - 0.22);
  const b = legPoint(g, s, ankle);
  const r = limbR(g, 'leg', ankle) + inflate;
  fold(L, along(a, b, 0.2, r * 0.9), along(a, b, 0.55, -r * 0.5));
  fold(L, along(a, b, 0.75, -r * 0.9), along(a, b, 1.0, r * 0.3));
}

export const BOTTOM_ITEMS: ItemDef[] = liftMain([
  {
    id: 'bottom_shinobi',
    slot: 'bottom',
    name: 'Shinobi Pants',
    desc: 'Fitted trousers with bandage wraps at the ankles.',
    colors: [col('main', 'Pants', '#2b3346'), col('wrap', 'Wraps', '#e7e1d1')],
    draw: (g, [c, w]) => {
      trousers(g, c, 1.8, 0.55);
      waistband(g, 3);
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        legFolds(g, L, s, 0.5, 1.5);
        // a long crease down the front of the thigh
        fold(L, along(legPoint(g, s, 0.15), legPoint(g, s, 0.7), 0.2, 0.9), along(legPoint(g, s, 0.15), legPoint(g, s, 0.7), 1, 1.3));
        // ankle wraps: a cylinder band, lit at the top, wound in diagonal turns
        lifted(w, () => {
          const wp = clothPen(g, w, prt('shin', s), sb(s));
          across(g, L, 'leg', s, 1.53, 0.6, -1);
          limb(g, L, 'leg', s, 1.56, 1.97, [0.5, 0.35], wp, { light: bandLight(g, 'leg', s, 1.56, 1.97) });
          wrapStripes(L, legPoint(g, s, 1.6), legPoint(g, s, 1.95), limbR(g, 'leg', 1.6) + 1, 1.1, -1, 0.7);
        });
      }
    },
  },
  {
    id: 'bottom_shorts',
    slot: 'bottom',
    name: 'Training Shorts',
    desc: 'Loose knee-length shorts with a drawstring waist and contrasting rolled hem.',
    colors: [col('main', 'Shorts', '#3b4a6b'), col('hem', 'Hem', '#28324a')],
    draw: (g, [c, h]) => {
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        limb(g, L, 'leg', s, 0, 0.74, [0.6, 1.2], clothPen(g, c, prt('thigh', s), sb(s)), { round0: true, light: legLight(s, 0.15) });
        // loose cloth pulling from the crotch toward the outer hem
        const a = legPoint(g, s, 0.12);
        const b = legPoint(g, s, 0.62);
        fold(L, along(a, b, 0.1, -limbR(g, 'leg', 0.15) * 0.5), along(a, b, 1, limbR(g, 'leg', 0.6) * 0.5), 1);
        fold(L, along(a, b, 0.45, -limbR(g, 'leg', 0.4) - 0.6), along(a, b, 0.95, -limbR(g, 'leg', 0.6) * 0.2), 1);
        lifted(h, () => cuff(g, L, 'leg', s, 0.62, 0.76, 1.35, clothPen(g, h, prt('thigh', s), sb(s)), 1.2));
      }
      seat(g, c, (t) => 0.6 + (0.6 * t) / 0.74, 3, 0.15);
      waistband(g, 3);
    },
  },
  {
    id: 'bottom_hakama',
    slot: 'bottom',
    name: 'Wide Hakama',
    desc: 'Pleated wide-legged trousers that fall almost like a skirt, tied high at the waist.',
    colors: [col('main', 'Hakama', '#2c3043'), col('ties', 'Ties', '#cfc8b6')],
    draw: (g, [c, t]) => {
      const b = g.bp;
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        const pen = clothPen(g, c, prt('thigh', s), sb(s));
        limb(g, L, 'leg', s, 0, 1.9, 1.2, pen, { round0: true, light: legLight(s) });
        // each leg is its own wide panel, falling nearly straight from the hip, with deep knife pleats
        // (hem only a little wider than the hip, so the two legs read as separate columns)
        const pts = widePanel(g, L, s, b.legR[0] + 0.3, b.legR[0] + 0.8, 1.95, pen, s === 'F' ? 0.14 : 0.04);
        for (const k of [0.22, 0.5, 0.78]) fold(L, lerp(pts[0], pts[1], k), lerp(pts[3], pts[2], k - 0.03), 2, 4);
        // the hem: a lit turn above the bottom edge
        mark(L, add(pts[3], v(0.6, -1.0)), add(pts[2], v(-0.6, -1.0)), (s2) => Math.min(4, s2 + 1));
      }
      // seat with the split between the legs, tied high at the waist
      seat(g, c, () => 1.2, 4.8);
      const TL = g.L('torso.bottom');
      lifted(t, () => hemBand(g, TL, 3.6, 4.8, 0.9, clothPen(g, t, 'torso'), { tuck: false }));
      tmark(g, TL, -b.hipHalf - 1, 3.4, b.hipHalf + 1, 3.4, (s) => s - 1);
    },
  },
  {
    id: 'bottom_cargo',
    slot: 'bottom',
    name: 'Baggy Cargo Pants',
    desc: 'Roomy work trousers bloused at the ankle, with a strapped thigh pouch.',
    colors: [col('main', 'Pants', '#55603f'), col('pouch', 'Pouch', '#6e5a3c', 'leather')],
    draw: (g, [c, p]) => {
      trousers(g, c, 1.86, 1.05, 3.2);
      waistband(g, 3.2);
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        const R = g.bp.legR;
        const pen = clothPen(g, c, prt('shin', s), sb(s));
        // bloused cuff: the cloth balloons over a gathered band
        limb(g, L, 'leg', s, 1.58, 1.8, [1.0, 1.2], pen, { light: legLight(s) });
        legFolds(g, L, s, 1.05, 1.74);
        cuff(g, L, 'leg', s, 1.8, 1.97, 0.5, pen, 1.2);
        fold(L, along(legPoint(g, s, 0.2), legPoint(g, s, 0.8), 0.1, 1.4), along(legPoint(g, s, 0.2), legPoint(g, s, 0.8), 0.9, 1.9));
        if (s === 'F') continue;
        // Thigh pouch (own layer so it gets its own outline) with a buttoned flap and a leg strap
        lifted(p, () => {
          const P = g.L(legDepth(s, 'armor'));
          const a = legPoint(g, s, 0.36);
          const bb = legPoint(g, s, 0.78);
          const d = norm(sub(bb, a));
          const off = -(R[0] * 0.3);
          const w = 1.8;
          const pp = clothPen(g, p, prt('thigh', s), sb(s), 'leather');
          limb(g, P, 'leg', s, 0.18, 0.26, 1.15, pp, { light: bandLight(g, 'leg', s, 0.18, 0.26) });
          poly(P, [along(a, bb, 0, off - w), along(a, bb, 0, off + w), along(a, bb, 1, off + w * 0.9), along(a, bb, 1, off - w * 0.9)], pp, (x, y) => {
            const o = ((x + 0.5 - a.x) * -d.y + (y + 0.5 - a.y) * d.x - off) / w;
            return tone(cylLight(clamp(o, -1, 1), perp(d)) - 0.1);
          });
          // flap: lit top edge, dark shadow under it
          poly(P, [along(a, bb, -0.04, off - w - 0.2), along(a, bb, -0.04, off + w + 0.2), along(a, bb, 0.36, off + w + 0.1), along(a, bb, 0.36, off - w - 0.1)], pp, (x, y) => {
            const o = ((x + 0.5 - a.x) * -d.y + (y + 0.5 - a.y) * d.x - off) / w;
            return tone(cylLight(clamp(o, -1, 1), perp(d)) + 0.25);
          });
          seam(P, along(a, bb, 0.39, off - w), along(a, bb, 0.39, off + w), -2);
          fpx(P, along(a, bb, 0.26, off), g.m('#b9c0c8', 'metal'), prt('thigh', s), 4);
        });
      }
    },
  },
  {
    id: 'bottom_leggings',
    slot: 'bottom',
    name: 'Fitted Leggings',
    desc: 'Snug stretch leggings with a contrasting side seam.',
    colors: [col('main', 'Leggings', '#2a2433'), col('seam', 'Side Seam', '#7a68a0')],
    draw: (g, [c, sc]) => {
      trousers(g, c, 1.96, 0.18, 3.4);
      waistband(g, 3.4);
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        const sp = clothPen(g, sc, prt('thigh', s), sb(s));
        const hip = legPoint(g, s, 0.06);
        const knee = legPoint(g, s, 1);
        const ank = legPoint(g, s, 1.94);
        // stretch cloth only creases softly behind the knee
        const side = bendSide(g, 'leg', s, 1);
        const r = limbR(g, 'leg', 1) + 0.18;
        fold(L, along(hip, knee, 0.86, side * r * 0.9), along(knee, ank, 0.04, side * r * 0.1));
        // side seam: two fine lines along the outer side of the leg
        stitch(L, along(hip, knee, 0, -g.bp.legR[0] * 0.25), along(hip, knee, 1, -g.bp.legR[1] * 0.35), sp, 3, 0);
        stitch(L, along(knee, ank, 0, -g.bp.legR[1] * 0.35), along(knee, ank, 1, -g.bp.legR[3] * 0.3), { ...sp, part: prt('shin', s) }, 3, 0);
        across(g, L, 'leg', s, 1.9, 0.2, -1);
      }
    },
  },
  {
    id: 'bottom_founder',
    slot: 'bottom',
    name: "Founder's Trousers",
    desc: 'Navy trousers to below the knee, gold studs on the thighs: painted by the owner for Solen.',
    colors: [col('main', 'Trousers', FOUNDER_TROUSERS), col('studs', 'Studs', FOUNDER_TROUSERS_STUD, 'metal')],
    draw: (g, [c, studs]) => {
      // The owner's trousers on his Solen, his pixels (2026-10-21; tools/refs/solen-trousers-from-ref.py):
      // each leg rides its thigh about the knee, his knee on ours (his legs stand wider than ours), over
      // trousers of his navy from the hips to below the knee, so the leg stays clothed where his piece
      // does not reach in other poses. His line stays; his navy follows Trousers, his gold Studs.
      trousers(g, c, 1.3, 0.55);
      const tint = (_ch: string, hex: string): string => {
        const k = FOUNDER_TROUSERS_KIND[hex];
        if (k === 'line') return hex;
        return k === 'gold' ? retintHex(hex, FOUNDER_TROUSERS_STUD, studs) : retintHex(hex, FOUNDER_TROUSERS, c);
      };
      founderLegs(g, tint);
    },
  },
  // The owner's briefs from his bare female body: his pixels on the pelvis (body.ts), in the colour picked.
  {
    id: 'bottom_briefs',
    slot: 'bottom',
    name: 'Briefs',
    desc: 'Fitted briefs cut high at the hips.',
    colors: [col('main', 'Cloth', FEMALE_BASE_CLOTH)],
    bodies: ['female', 'slender'],
    draw: (g, [c]) => drawBaseCloth(g, 'bottom', c),
  },
]);

// ---------------------------------------------------------------------------
// Waist
// ---------------------------------------------------------------------------

/** Band around the waist in torso-local y [lo, hi]. */
function band(g: DrawCtx, L: Layer, lo: number, hi: number, inflate: number, pen: Pen, shade?: ShadeFn): void {
  fillT(g, L, inflate, pen, { top: hi, bottom: lo }, undefined, shade);
}

/** A hanging strip (sash end, ribbon tail): polyline from `a` falling `len` with drift and sway. */
function tailPts(a: Vec, len: number, drift: number, sway: number, seg = 4): Vec[] {
  const pts: Vec[] = [a];
  for (let i = 1; i <= seg; i++) {
    const t = i / seg;
    pts.push(v(a.x + drift * t * t + Math.sin(t * 2.6 + sway) * 0.9 * t, a.y + len * t));
  }
  return pts;
}

/** Flat ribbon along a polyline: quads between points, `fork` cuts a V notch at the end. */
function ribbon(L: Layer, pts: Vec[], w0: number, w1: number, pen: Pen, fork = false): void {
  const n = pts.length - 1;
  const side: Vec[] = [];
  const other: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n, i + 1)];
    const nn = perp(norm(sub(b, a)));
    const w = w0 + (w1 - w0) * (i / n);
    side.push(add(pts[i], scale(nn, w)));
    other.push(add(pts[i], scale(nn, -w)));
  }
  const outline = [...side, ...(fork ? [sub(pts[n], scale(norm(sub(pts[n], pts[n - 1])), w1 * 1.1))] : []), ...other.reverse()];
  poly(L, outline, pen);
  // lit edge along one side, fold line along the middle
  for (let i = 0; i < n; i++) seam(L, lerp(side[i], pts[i], 0.25), lerp(side[i + 1], pts[i + 1], 0.25), 1);
}

/**
 * Shading for cloth gathered at a knot: folds radiate from `K` along `axis`.
 * Crest lines sit at the given angles (radians from the axis); each crest gets
 * a 1-fine-px bright core and a lit flank, with a dark trough between crests.
 * `spread` scales how quickly the folds widen away from the knot.
 */
function fan(K: Vec, axis: Vec, crests: number[], spread: number, extra?: (x: number, y: number) => number): ShadeFn {
  const n = perp(axis);
  const troughs = crests.slice(1).map((c, i) => (c + crests[i]) / 2);
  return (x, y) => {
    const dx = x + 0.5 - K.x;
    const dy = y + 0.5 - K.y;
    const along = dx * axis.x + dy * axis.y;
    const acr = dx * n.x + dy * n.y;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(acr, Math.max(0.5, along));
    const w = Math.min(1.4, 0.7 + dist / (spread * 4)); // folds widen a little away from the knot
    let s = 3;
    for (const c of crests) {
      const d = Math.abs(Math.sin(ang - c)) * dist;
      if (d < 0.25 * w) s = Math.max(s, 5);
      else if (d < 0.6 * w) s = Math.max(s, 4);
    }
    if (s === 3) for (const t of troughs) if (Math.abs(Math.sin(ang - t)) * dist < 0.5 * w) s = 2;
    return s + (extra ? extra(x + 0.5, y + 0.5) : 0);
  };
}

export const WAIST_ITEMS: ItemDef[] = liftMain([
  {
    id: 'waist_belt',
    slot: 'waist',
    name: 'Leather Belt',
    desc: 'Stitched leather belt with a square metal buckle.',
    colors: [col('main', 'Leather', '#4a3122', 'leather'), col('buckle', 'Buckle', '#c9b27a', 'metal')],
    draw: (g, [c, bk]) => {
      const L = g.L('waist');
      const hh = g.bp.hipHalf;
      const lp = clothPen(g, c, 'torso', 0, 'leather');
      band(g, L, 0.8, 3.5, 1.0, lp);
      tstitch(g, L, -hh - 1.5, 3.0, hh + 1.5, 3.0, lp, 3, 2);
      tstitch(g, L, -hh - 1.5, 1.3, hh + 1.5, 1.3, lp, 3, 2);
      // belt holes on the strap end
      for (const x of [-1.6, -0.4]) fpx(L, TB(g, x, 2.2), lp.mat, 'torso', 1);
      // Buckle: frame, dark inner, prong, shine
      const bp = clothPen(g, bk, 'torso', 0, 'metal');
      tpoly(g, L, [[CX - 0.4, 4.0], [CX + 2.4, 4.0], [CX + 2.4, 0.3], [CX - 0.4, 0.3]], bp, 3);
      tpoly(g, L, [[CX + 0.3, 3.3], [CX + 1.7, 3.3], [CX + 1.7, 1.0], [CX + 0.3, 1.0]], lp, 2);
      tseam(g, L, CX - 0.1, 3.8, CX - 0.1, 0.6, 1);
      stitch(L, TB(g, CX + 0.4, 2.2), TB(g, CX + 1.6, 2.2), bp, 4, 0);
      fpx(L, TB(g, CX - 0.1, 3.7), bp.mat, 'torso', 5);
    },
  },
  {
    id: 'waist_sash',
    slot: 'waist',
    name: 'Cloth Sash',
    desc: 'Wide wrapped sash knotted at the hip, with a broad panel draped diagonally down the thigh to the knee.',
    colors: [col('main', 'Sash', '#2f62b5'), col('edge', 'Edge', '#1d3f80')],
    draw: (g, [c, e]) => {
      const L = g.L('waist');
      const b = g.bp;
      const pen = clothPen(g, c, 'torso');
      const ep = clothPen(g, e, 'torso');
      const sw = Math.sin(g.rig.frame * 1.4) * 0.35;
      const K = TB(g, -1.2, 2.2); // knot at the near front hip
      // Wide wrap: folds fan out from the knot toward the back and the far hip
      const right = g.rig.right;
      band(g, L, 0.3, 5.0, 1.1, pen, fan(K, right, [-0.34, 0.02, 0.3], 3.2));
      tseam(g, L, -b.hipHalf - 1.2, 4.6, b.hipHalf + 1.2, 4.6, 1);
      // Hanging panel: from the knot diagonally down the far thigh to the knee
      const kF = legPoint(g, 'F', 0.9);
      const lr = b.legR[1];
      const p0 = add(K, v(-1.3, 0.4));
      const p1 = TB(g, frontX(g, 2) + 1.5, 2.6);
      const p2 = v(Math.max(kF.x + lr + 2.0, p1.x + 0.6) + sw, kF.y + 0.4);
      const p3 = v(Math.max(kF.x - lr * 0.4, p0.x + 4.5) + sw, kF.y + 2.0);
      const m = add(lerp(p0, p3, 0.5), v(-0.6, 0.5));
      const axis = norm(sub(lerp(p2, p3, 0.5), K));
      const nx = perp(axis);
      poly(L, [p0, p1, p2, p3, m], pen, fan(K, axis, [-0.3, 0.08], 2.6, (x, y) => {
        // darker toward the hem and on the far half of the panel
        const t = ((x - K.x) * axis.x + (y - K.y) * axis.y) / Math.max(1, Math.hypot(p2.x - K.x, p2.y - K.y));
        const across = (x - K.x) * nx.x + (y - K.y) * nx.y;
        return t > 0.88 || across < -1.4 ? -1 : 0;
      }));
      tube(L, p3, p2, 0.45, 0.45, ep, 2);
      // the knot
      ellipse(L, K.x, K.y, 1.8, 1.5, pen, (x, y) => (x + 0.5 < K.x - 0.3 && y + 0.5 < K.y ? 4 : 3));
      seam(L, v(K.x - 1.2, K.y + 0.9), v(K.x + 1.1, K.y - 0.6), -1);
      fpx(L, v(K.x - 0.7, K.y - 0.7), pen.mat, 'torso', 5);
    },
  },
  {
    id: 'waist_ribbon',
    slot: 'waist',
    name: 'Ribbon Belt',
    desc: 'Slim silk belt tied in a bow at the back, its two long ribbon tails fluttering behind.',
    colors: [col('main', 'Ribbon', '#c23a4a')],
    draw: (g, [c]) => {
      const L = g.L('waist');
      const pen = clothPen(g, c, 'torso');
      const dk = clothPen(g, c, 'torso', -1);
      band(g, L, 1.2, 3.4, 0.9, pen);
      const b = g.bp;
      tstitch(g, L, -b.hipHalf - 1, 2.9, b.hipHalf + 1, 2.9, pen, 4, 0);
      const knot = TB(g, -b.hipHalf * 0.86 - 1.2, 2.4);
      const f = g.rig.frame;
      const B = g.L('backGear');
      const long = b.thigh * 1.2;
      // two tails blown back and down, fluttering per frame
      ribbon(B, tailPts(add(knot, v(-0.4, 0.4)), long, -5.5 + Math.sin(f * 1.7) * 1.1, f * 1.7, 5), 0.9, 1.25, pen, true);
      ribbon(B, tailPts(add(knot, v(0.2, 0.7)), long * 0.8, -2.4 + Math.sin(f * 1.7 + 2) * 0.9, f * 1.7 + 2, 4), 0.85, 1.15, dk, true);
      // bow loops and knot
      ellipse(L, knot.x - 1.8, knot.y - 1.3, 1.9, 1.25, pen);
      ellipse(L, knot.x - 1.4, knot.y + 1.4, 1.6, 1.1, dk);
      seam(L, v(knot.x - 3.0, knot.y - 1.2), v(knot.x - 1.0, knot.y - 1.0), -1);
      ellipse(L, knot.x, knot.y, 1.15, 1.15, pen, 4);
      fpx(L, v(knot.x - 0.5, knot.y - 0.5), pen.mat, 'torso', 5);
    },
  },
  {
    id: 'waist_rope',
    slot: 'waist',
    name: 'Braided Rope Belt',
    desc: 'Thick twisted rope belt finished with a big knot and tasseled ends at the back.',
    colors: [col('main', 'Rope', '#cdb47c'), col('tassel', 'Tassels', '#8c2f39')],
    draw: (g, [c, ts]) => {
      const L = g.L('waist');
      const pen = clothPen(g, c, 'torso');
      // twisted strands: diagonal light/dark fine stripes
      const twist: ShadeFn = (x, y) => {
        const k = (((Math.floor((x + 0.5) * RES) + Math.floor((y + 0.5) * RES)) % 4) + 4) % 4;
        return k === 0 ? 2 : k === 3 ? 4 : 3;
      };
      band(g, L, 0.7, 3.9, 1.2, pen, twist);
      const b = g.bp;
      const knot = TB(g, -b.hipHalf * 0.86 - 1.4, 2.3);
      const f = g.rig.frame;
      // bow loops
      ellipse(L, knot.x - 1.8, knot.y - 1.5, 2.1, 1.6, pen, twist);
      ellipse(L, knot.x - 2.0, knot.y + 1.6, 1.9, 1.4, clothPen(g, c, 'torso', -1), twist);
      seam(L, v(knot.x - 2.6, knot.y - 1.5), v(knot.x - 1.0, knot.y - 1.5), -1);
      seam(L, v(knot.x - 2.8, knot.y + 1.6), v(knot.x - 1.2, knot.y + 1.6), -1);
      ellipse(L, knot.x, knot.y, 1.6, 1.6, pen, twist);
      // hanging ends with tassels
      const B = g.L('backGear');
      const sw = Math.sin(f * 1.3) * 0.6;
      const tp = clothPen(g, ts, 'torso');
      const ends: [Vec[], Pen][] = [
        [tailPts(add(knot, v(-1.6, 1)), 6.5, -3.0 + sw, f, 3), pen],
        [tailPts(add(knot, v(-0.6, 1)), 5.0, -1.8 + sw, f + 1, 3), clothPen(g, c, 'torso', -1)],
      ];
      for (const [pts, p] of ends) {
        for (let i = 0; i < pts.length - 1; i++) tube(B, pts[i], pts[i + 1], 1.0, 1.0, p, twist);
        const end = pts[pts.length - 1];
        tube(B, add(end, v(0, -0.3)), add(end, v(-0.2, 0.6)), 1.3, 1.3, tp);
        const tl = add(end, v(-0.2, 0.6));
        poly(B, [add(tl, v(-1.3, 0)), add(tl, v(1.3, 0)), add(tl, v(1.6, 2.6)), add(tl, v(-1.5, 2.6))], tp);
        for (const dx of [-0.6, 0.3]) seam(B, add(tl, v(dx, 0.6)), add(tl, v(dx * 1.3, 2.4)), -1);
      }
    },
  },
  {
    id: 'waist_pouches',
    slot: 'waist',
    name: 'Pouch Belt',
    desc: 'Utility belt carrying three buttoned tool pouches around the hips.',
    colors: [col('main', 'Belt', '#3a2c22', 'leather'), col('pouch', 'Pouches', '#86704f', 'leather'), col('buckle', 'Buckle', '#b9c0c8', 'metal')],
    draw: (g, [c, p, bk]) => {
      const L = g.L('waist');
      const b = g.bp;
      const lp = clothPen(g, c, 'torso', 0, 'leather');
      band(g, L, 1.0, 3.5, 1.0, lp);
      tstitch(g, L, -b.hipHalf - 1.5, 3.0, b.hipHalf + 1.5, 3.0, lp, 3, 2);
      const bm = g.m(bk, 'metal');
      const pouch = (x0: number, x1: number, y0: number, y1: number, bias: number) => {
        const pp = clothPen(g, p, 'torso', bias, 'leather');
        tpoly(g, L, [[x0, y1], [x1, y1], [x1, y0 + 0.6], [x1 - 0.6, y0], [x0 + 0.6, y0], [x0, y0 + 0.6]], pp);
        // flap
        tpoly(g, L, [[x0 - 0.2, y1 + 0.2], [x1 + 0.2, y1 + 0.2], [x1 + 0.1, y1 - 1.7], [(x0 + x1) / 2, y1 - 2.3], [x0 - 0.1, y1 - 1.7]], pp, 4);
        tseam(g, L, x0, y1 - 1.8, (x0 + x1) / 2, y1 - 2.4, -1);
        tseam(g, L, (x0 + x1) / 2, y1 - 2.4, x1, y1 - 1.8, -1);
        fpx(L, TB(g, (x0 + x1) / 2, y1 - 1.6), bm, 'torso', 4);
        tseam(g, L, x0 + 0.3, y1 - 0.1, x0 + 0.3, y0 + 0.6, 1);
      };
      pouch(-b.hipHalf * 0.86 - 1.6, -b.hipHalf * 0.86 + 1.2, -1.2, 4.0, -1);
      pouch(-3.0, -0.2, -2.0, 4.2, 0);
      pouch(b.hipHalf * 0.62 - 1.0, b.hipHalf * 0.62 + 1.4, -0.6, 4.0, 0);
      tpoly(g, L, [[CX - 0.6, 3.9], [CX + 0.8, 3.9], [CX + 0.8, 0.6], [CX - 0.6, 0.6]], { mat: bm, part: 'torso' }, 3);
      tseam(g, L, CX - 0.3, 3.6, CX - 0.3, 0.9, 1);
    },
  },
  // Saya's belts, pouch and scabbard, from the owner's Saya picture (sayaLower.ts)
  SHADE_BELTS_ITEM,
  // Aurelia, the owner's fourth heroine (aureliaLower.ts)
  WAIST_DAWN_SASH,
]);

// ---------------------------------------------------------------------------
// Hands
// ---------------------------------------------------------------------------

/** Hand frame matching ctx.handDraw: `at(k, m)` = hand + k*R along the hand + m*R toward the thumb side. */
function handFrame(g: DrawCtx, s: Side, grow = 0) {
  const j = armJoints(g.rig, s);
  const dir = norm(sub(j.hand, j.wrist));
  let n = perp(dir);
  if (n.x < 0 || (Math.abs(n.x) < 0.2 && n.y > 0)) n = scale(n, -1);
  const R = g.bp.handR + grow;
  const at = (k: number, m: number): Vec => add(j.hand, add(scale(dir, k * R), scale(n, m * R)));
  return { j, dir, n, R, at };
}

/** Glove over the hand; with `cut` the finger ends stay bare. */
function glove(g: DrawCtx, s: Side, pen: Pen, grow: number, cut: boolean): void {
  const L = g.L(armDepth(s, 'armor'));
  const tmp = new Layer();
  handDraw(g, tmp, s, pen, grow);
  const { j, dir, R } = handFrame(g, s);
  const lim: Record<string, number> = { fist: 0.42, grip: 0.42, open: 0.5, sign: 0.15, relaxed: 0.45 };
  const k = lim[j.shape] ?? 0.45;
  stamp(L, tmp, (x, y) => {
    if (!cut) return true;
    const d = sub(v(x, y), j.hand);
    return d.x * dir.x + d.y * dir.y < k * R;
  });
}

/**
 * Takes the bare hand off, for a glove painted in its own shape that replaces it: the forearm's last
 * span is drawn again under it, so the wrist the hand was drawn over stays.
 */
function bareHandOff(g: DrawCtx, s: Side): void {
  const L = g.L(armDepth(s, 'body'));
  const hand = partIndex(prt('hand', s));
  const fore = new Layer();
  armSpan(g, fore, s, 1.3, 2, 0, { mat: g.skin, part: prt('forearm', s), bias: sb(s) }, 'skin');
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || L.part[i] !== hand) continue;
    L.mat[i] = fore.mat[i];
    L.shade[i] = fore.shade[i];
    L.part[i] = fore.part[i];
    L.flags[i] = fore.flags[i];
  }
}

/**
 * A fist the owner painted, on the wrist: exactly as he drew it while the hand points within 30 degrees
 * of the way it did in his picture (as our hand pictures hang unturned), turned with RotSprite past
 * that, and mirrored when our hand pictures are (the thumb on the facing side).
 */
function paintedFist(g: DrawCtx, s: Side, piece: PaintedPiece, color: (ch: string, hex: string) => string): void {
  const j = armJoints(g.rig, s);
  const { flipX } = handPose(g, s);
  // Mirrored, his fist points the other way across the vertical.
  const drawn = flipX ? 180 - piece.angle : piece.angle;
  const turn = ((segAngle(j.wrist, j.hand) - drawn + 540) % 360) - 180;
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(piece.colors)) pal[ch] = [g.m(color(ch, hex), 'flat'), 3];
  stampTemplate(g.L(armDepth(s, 'armor')), piece, j.wrist, Math.abs(turn) <= 30 ? 0 : turn, pal, prt('hand', s), { flipX, flags: F_NO_TEXTURE | F_NO_OUTLINE });
}

/** Our hand picture for the pose (open, pointing, relaxed, cradling), in the owner's leather tones. */
function leatherHand(g: DrawCtx, s: Side, color: (ch: string, hex: string) => string): void {
  const tmp = new Layer();
  handDraw(g, tmp, s, { mat: 0, part: prt('hand', s) });
  const tones = GLOVE_TONES.map((t) => g.m(color('', t), 'flat'));
  const L = g.L(armDepth(s, 'armor'));
  for (let i = 0; i < GRID * GRID; i++) {
    if (tmp.mat[i] >= 0) L.set(i % GRID, (i / GRID) | 0, tones[Math.min(tmp.shade[i], tones.length - 1)], 3, prt('hand', s), F_NO_TEXTURE | F_NO_OUTLINE);
  }
}

export const HAND_ITEMS: ItemDef[] = liftMain([
  {
    id: 'hands_fingerless',
    slot: 'hands',
    name: 'Fingerless Gloves',
    desc: 'Black fingerless gloves with a riveted plate on the back of the hand.',
    colors: [col('main', 'Glove', '#25252d'), col('plate', 'Plate', '#9aa4b0', 'metal')],
    draw: (g, [c, pl]) => {
      for (const s of SIDES) {
        const L = g.L(armDepth(s, 'armor'));
        const gp = clothPen(g, c, prt('forearm', s), sb(s));
        limb(g, L, 'arm', s, 1.7, 2, 0.5, gp);
        across(g, L, 'arm', s, 1.8, 0.5, 1);
        glove(g, s, clothPen(g, c, prt('hand', s), sb(s)), 0.2, true);
        const { at } = handFrame(g, s);
        const pm = clothPen(g, pl, prt('hand', s), sb(s), 'metal');
        tube(L, at(-0.55, -0.3), at(0.15, -0.3), 0.6, 0.6, pm, 4);
        fpx(L, at(-0.45, -0.45), pm.mat, prt('hand', s), 5 + sb(s));
      }
    },
  },
  {
    id: 'hands_bracers',
    slot: 'hands',
    name: 'Leather Bracers',
    desc: 'Laced leather forearm bracers with strapped edges and a leather palm wrap.',
    colors: [col('main', 'Leather', '#7a4b2c', 'leather'), col('strap', 'Straps', '#3a2618', 'leather')],
    draw: (g, [c, st]) => {
      for (const s of SIDES) {
        const L = g.L(armDepth(s, 'armor'));
        const pen = clothPen(g, c, prt('forearm', s), sb(s), 'leather');
        const sp = clothPen(g, st, prt('forearm', s), sb(s), 'leather');
        limb(g, L, 'arm', s, 1.26, 1.96, [0.95, 0.7], pen);
        limb(g, L, 'arm', s, 1.26, 1.36, 1.1, sp);
        limb(g, L, 'arm', s, 1.86, 1.96, 0.9, sp);
        // criss-cross lacing on the outer face
        const a = armPoint(g, s, 1.4);
        const bb = armPoint(g, s, 1.84);
        const r = limbR(g, 'arm', 1.6) * 0.45;
        const lace = clothPen(g, st, prt('forearm', s), sb(s), 'leather');
        for (let i = 0; i < 3; i++) {
          const t0 = i / 3;
          const t1 = (i + 1) / 3;
          stitch(L, along(a, bb, t0, -r), along(a, bb, t1, r), lace, 1, 0);
          stitch(L, along(a, bb, t0, r), along(a, bb, t1, -r), lace, 2, 0);
        }
        crease(L, along(a, bb, 0, -limbR(g, 'arm', 1.4) - 0.3), along(a, bb, 1, -limbR(g, 'arm', 1.84) - 0.1), 0);
        glove(g, s, clothPen(g, c, prt('hand', s), sb(s), 'leather'), -0.1, true);
      }
    },
  },
  {
    id: 'hands_gauntlets',
    slot: 'hands',
    name: 'Steel Gauntlets',
    desc: 'Plated steel gauntlets with flared cuffs, strap and articulated knuckles.',
    colors: [col('main', 'Steel', '#8e98a6', 'metal'), col('under', 'Strap', '#3b2a22', 'leather')],
    draw: (g, [c, u]) => {
      for (const s of SIDES) {
        const L = g.L(armDepth(s, 'armor'));
        const mp = clothPen(g, c, prt('forearm', s), sb(s), 'metal');
        // flared cuff at the elbow end, then lames down to the wrist
        // (hugs the forearm: the arm itself is already full, like the reference)
        limb(g, L, 'arm', s, 1.12, 1.4, [0.95, 0.6], mp);
        limb(g, L, 'arm', s, 1.4, 1.97, [0.5, 0.42], mp);
        across(g, L, 'arm', s, 1.4, 0.6, -1);
        across(g, L, 'arm', s, 1.68, 0.5, -1);
        const a = armPoint(g, s, 1.18);
        const bb = armPoint(g, s, 1.92);
        seam(L, along(a, bb, 0, -limbR(g, 'arm', 1.2) * 0.4), along(a, bb, 1, -limbR(g, 'arm', 1.9) * 0.4), 2);
        // leather strap
        limb(g, L, 'arm', s, 1.52, 1.6, 0.6, clothPen(g, u, prt('forearm', s), sb(s), 'leather'));
        stud(L, along(armPoint(g, s, 1.52), armPoint(g, s, 1.6), 0.5, -0.2), mp.mat, prt('forearm', s), s === 'N');
        // plated hand with knuckle ridge
        glove(g, s, clothPen(g, c, prt('hand', s), sb(s), 'metal'), 0.25, false);
        const { at } = handFrame(g, s, 0.25);
        seam(L, at(-0.45, -0.9), at(-0.45, 0.6), 1);
        seam(L, at(-0.55, -0.9), at(-0.55, 0.6), -1);
      }
    },
  },
  {
    id: 'hands_wraps',
    slot: 'hands',
    name: 'Bandage Wraps',
    desc: 'Cloth bandages wound around the forearms and knuckles.',
    colors: [col('main', 'Bandage', '#e9e3d3')],
    draw: (g, [c]) => {
      for (const s of SIDES) {
        const L = g.L(armDepth(s, 'armor'));
        const pen = clothPen(g, c, prt('forearm', s), sb(s));
        limb(g, L, 'arm', s, 1.4, 2, [0.45, 0.35], pen);
        glove(g, s, clothPen(g, c, prt('hand', s), sb(s)), 0.1, true);
        wrapStripes(L, armPoint(g, s, 1.4), armPoint(g, s, 2.0), limbR(g, 'arm', 1.4) + 1, 1.1, -1, 0.8);
        const { at } = handFrame(g, s, 0.1);
        seam(L, at(-0.8, -1), at(-0.2, 1), -1);
        seam(L, at(-0.3, -1), at(0.3, 1), -1);
        // loose end
        const e = armPoint(g, s, 1.42);
        fpx(L, add(e, v(-0.2, 0.4)), pen.mat, prt('forearm', s), 4 + sb(s));
      }
    },
  },
  {
    id: 'hands_crimson_gauntlets',
    slot: 'hands',
    name: 'Riding Gauntlets',
    desc: 'Brown leather gloves: a steel plate edged in gold over the back of the sword hand, a steel knuckle edge with a gold rivet on the other.',
    colors: [col('main', 'Leather', GLOVE_LEATHER, 'leather'), col('steel', 'Steel', GLOVE_STEEL, 'metal'), col('trim', 'Trim', GLOVE_TRIM, 'metal')],
    draw: (g, [leather, steel, trim]) => {
      // The owner's gloves, his pixels from his Aiden picture (2026-10-21, the new standard for
      // characters; tools/refs/aiden-boots-gloves-from-ref.py). Closed, each hand is his fist in place
      // of ours: the near one round the grip (which shows through it where it does in his picture; the
      // same fist closes on nothing), the far one hanging. Open, pointing or relaxed (hand signs, casts,
      // a book) it is our hand picture in his leather. His leather, steel and gold follow the colour
      // slots; his black line stays.
      const tint = (_ch: string, hex: string) => {
        const k = crimsonKind(hex);
        if (k === 'brown') return retintHex(hex, GLOVE_LEATHER, leather);
        if (k === 'steel') return retintHex(hex, GLOVE_STEEL, steel);
        return k === 'gold' ? retintHex(hex, GLOVE_TRIM, trim) : hex;
      };
      for (const s of SIDES) {
        const { kind } = handPose(g, s);
        if (kind === 'grip' || kind === 'fist') {
          bareHandOff(g, s);
          paintedFist(g, s, s === 'N' ? GAUNTLET_N : GAUNTLET_F, tint);
        } else leatherHand(g, s, tint);
      }
    },
  },
  {
    id: 'hands_bronze_bracers',
    slot: 'hands',
    name: 'Bronze Bracers',
    desc: 'Bronze bracers from below the elbow to the wrist; the hands stay bare.',
    colors: [col('main', 'Bronze', BRACER_BRONZE, 'metal')],
    draw: (g, [bronze]) => {
      // The owner's bracers, his pixels from his Roman picture (2026-10-21; tools/refs/
      // roman-bracers-sandals-from-ref.py): each rides its forearm about the elbow, exactly as he drew
      // it at rest. His bronze follows the slot; his black line stays.
      const tint = (_ch: string, hex: string) => (ROMAN_KIT_KIND[hex] === 'line' ? hex : retintHex(hex, BRACER_BRONZE, bronze));
      for (const s of SIDES) {
        const j = armJoints(g.rig, s);
        stampPiece(g, armDepth(s, 'armor'), s === 'N' ? BRACER_N : BRACER_F, j.elbow, segAngle(j.elbow, j.wrist), prt('forearm', s), tint);
      }
    },
  },
  {
    id: 'hands_steel_bracers',
    slot: 'hands',
    name: 'Steel Bracers',
    desc: 'Steel bracers from below the elbow to the wrist; the hands stay bare. Painted by the owner for Solen.',
    colors: [col('main', 'Steel', STEEL_BRACER, 'metal')],
    draw: (g, [steel]) => {
      // The owner's steel bracers, his pixels from his Solen picture (2026-10-21; tools/refs/
      // solen-bracers-from-ref.py): his Roman bracers repainted in steel, riding the forearms about the
      // elbows as those do. His steel follows the slot; his black line stays.
      // The far one hangs where he drew it while his tunic dresses the far arm (founderFarOut). Away from
      // the way he drew the arm, only the bracer goes with it (founderBracer: not the cape lifted beside it).
      const tint = (_ch: string, hex: string) => (STEEL_BRACER_KIND[hex] === 'line' ? hex : retintHex(hex, STEEL_BRACER, steel));
      const { out } = founderFarOut(g);
      for (const s of SIDES) {
        const j = armJoints(g.rig, s);
        stampPiece(g, armDepth(s, 'armor'), founderBracer(g, s), s === 'F' ? add(j.elbow, out) : j.elbow, segAngle(j.elbow, j.wrist), prt('forearm', s), tint, (hex) => STEEL_BRACER_KIND[hex] === 'line');
      }
    },
  },
  // Saya's fingerless gloves, from the owner's Saya picture (sayaUpper.ts)
  SAYA_SHADE_GLOVES,
]);
