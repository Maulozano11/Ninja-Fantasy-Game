// Body armor and armored / cloth skirts. Each armor maps to a legacy armor
// style for its AC bonus (`statsArmor`), so gameplay stats keep working.
//
// Everything is drawn in body-local coordinates (torso-local, arm-local,
// hip-to-knee blends) so a piece follows the rig in every pose and on every
// body type. Shapes are defined in design units and rasterized per FINE
// pixel.
//
// Value standard (matches the reference sprite): a piece mostly sits in
// shades 1-3. Highlights (4) are 1px crest lines / lit rims on the upper-left
// edges and 5 is reserved for single glints. Plates are separated by 1px
// dark seams and have a lit top rim and a darker lower half. Trims and
// rivets are 1-2 fine px with one bright pixel. Cloth folds are troughs and
// crests, never stripe patterns.

import { hexToRgb, retintHex } from '../color';
import { armDepth, armJoints, Depth, DEPTHS, DrawCtx, forearmR, ItemDef, legDepth, legJoints, Side, torsoPoly } from '../ctx';
import { PaintedPiece, segAngle, stampLeaning, stampPiece, stretchPiece } from '../painted';
import { add, capsule, ellipse, F_NO_OUTLINE, F_NO_TEXTURE, fine, GRID, Layer, len, lerp, norm, partIndex, PartId, Pen, perp, poly, RES, scale, sub, v, Vec } from '../raster';
import { drawRig, GROUND, Rig, turnPoint } from '../rig';
import {
  PLATE_CHEST,
  PLATE_ELBOW_N,
  PLATE_GREAVE_F,
  PLATE_GREAVE_N,
  PLATE_KNEE_F,
  PLATE_KNEE_N,
  PLATE_PAULDRON_F,
  PLATE_PAULDRON_N,
  PLATE_THIGH_F,
  PLATE_THIGH_N,
  PLATE_UPPER_ARM_F,
  PLATE_UPPER_ARM_N,
  PLATE_VAMBRACE_F,
  PLATE_VAMBRACE_N,
  PLATE_WAIST,
} from './crimsonPlateArt';
import { ARMOR_DAWN_VESTMENT } from './aureliaVestment';
import { SKIRT_DAWN_PANELS } from './aureliaLower';
import { CUIRASS_BRONZE, CUIRASS_CHEST, CUIRASS_GUARD_F, CUIRASS_GUARD_N, CUIRASS_KIND, CUIRASS_LEATHER } from './bronzeCuirassArt';
import { PTERUGES_DRAPE, PTERUGES_DRAPE_FIST_ROWS, PTERUGES_FRONT, PTERUGES_KIND, PTERUGES_LEATHER, PTERUGES_REST, PTERUGES_STUD, PTERUGES_TUNIC } from './pterugesArt';
import { capeWind } from './capes';
import { FOUNDER_CHEST, FOUNDER_CUIRASS_KIND, FOUNDER_SASH, FOUNDER_STEEL, FOUNDER_STRAP } from './founderCuirassArt';
import { FOUNDER_SKIRT, FOUNDER_SKIRT_KIND, FOUNDER_SKIRT_LEATHER, FOUNDER_SKIRT_STUD, FOUNDER_SKIRT_TUNIC } from './founderSkirtArt';
import { sealCloth } from '../seal';
import { stampTemplate, type TemplatePalette } from '../rotsprite';
import { isFemaleBody, type BodyType } from '../types';
import { LYRA_CORSET_ITEM } from './lyraUpper';
import { GILDED_TABARD } from './lyraLower';


type Kind = 'cloth' | 'leather' | 'metal';
const col = (key: string, label: string, def: string, kind: Kind = 'cloth') => ({ key, label, default: def, kind });

export function armorPen(g: DrawCtx, hex: string, kind: Kind = 'cloth', part: Pen['part'] = 'torso', bias = 0): Pen {
  return { mat: g.m(hex, kind), part, bias };
}

/** Rectangle on the torso in torso-local coords (x along shoulders, y up from hips). */
export function torsoRect(g: DrawCtx, L: Layer, x0: number, y0: number, x1: number, y1: number, pen: Pen, shade?: number): void {
  const T = g.rig.T;
  poly(L, [T(x0, y1), T(x1, y1), T(x1, y0), T(x0, y0)], pen, shade);
}

// ---------------------------------------------------------------------------
// Toolkit (all shape callbacks receive DESIGN-space sample points)
// ---------------------------------------------------------------------------

/** A shade, or a falsy value to skip the pixel. */
type S = number | null | undefined | false;
/** One fine pixel, in design units. */
const FP = 1 / RES;
const SIDES: Side[] = ['F', 'N'];
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const mod = (x: number, m: number) => ((x % m) + m) % m;
const dotv = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const LIGHT = norm(v(-0.72, -0.69));
const sbias = (s: Side) => (s === 'F' ? -1 : 0);
const sidePart = (s: Side, p: 'upperArm' | 'forearm' | 'thigh' | 'shin') => `${p}${s}` as Pen['part'];
/** Same pen, re-targeted to a limb part and side. */
const onLimb = (pen: Pen, s: Side, p: 'upperArm' | 'forearm' | 'thigh' | 'shin'): Pen => ({ ...pen, part: sidePart(s, p), bias: (pen.bias || 0) + sbias(s) });

/** Shade (1..4) for a surface normal in screen space, light from the upper-left. */
export function lit(nx: number, ny: number): number {
  const l = Math.hypot(nx, ny) || 1;
  const lt = (nx / l) * LIGHT.x + (ny / l) * LIGHT.y;
  return lt > 0.5 ? 4 : lt > -0.28 ? 3 : lt > -0.68 ? 2 : 1;
}

const LIGHT3 = (() => {
  const l = Math.hypot(-0.6, -0.6, 0.55);
  return [-0.6 / l, -0.6 / l, 0.55 / l];
})();

/** Shade (1..5) for a 3D normal (z toward the viewer): used for sculpted metal. */
export function lit3(nx: number, ny: number, nz: number): number {
  const l = Math.hypot(nx, ny, nz) || 1;
  const d = (nx * LIGHT3[0] + ny * LIGHT3[1] + nz * LIGHT3[2]) / l;
  return d > 0.93 ? 5 : d > 0.76 ? 4 : d > 0.42 ? 3 : d > 0.08 ? 2 : 1;
}

/** Body value of a surface: 3 on the lit half, 2 on the shadow half. */
const base = (lit: boolean) => (lit ? 3 : 2);
/** Rim / crest value: 4 on the lit half, 3 on the shadow half. */
const rim = (lit: boolean) => (lit ? 4 : 3);
/** Torso t (0 back .. 1 front) on the lit half? */
const litT = (t: number) => t < 0.58;

/**
 * A plate seen as a band: 1px lit rim at the top, upper half, darker lower
 * half, 1px dark seam at the bottom. `d` is the height above the band's
 * bottom edge, `h` the band height.
 */
function plate(d: number, h: number, lt: boolean): number {
  if (d < FP) return 1;
  if (d > h - FP) return rim(lt);
  if (d > h * 0.5) return base(lt);
  return lt ? 2 : Math.max(1, base(lt) - 1) + (h < 1.6 ? 1 : 0);
}

/**
 * Draws into a private layer, outlines it, then stamps it onto `target`, so
 * the piece keeps its own dark outline inside a layer shared with others
 * (e.g. a sash over coat tails).
 */
function stamp(target: Layer, draw: (L: Layer) => void): void {
  const tmp = new Layer(true);
  draw(tmp);
  if (!tmp.used) return;
  tmp.applyOutline();
  for (let i = 0; i < tmp.mat.length; i++) {
    if (tmp.mat[i] < 0) continue;
    target.mat[i] = tmp.mat[i];
    target.shade[i] = tmp.shade[i];
    target.part[i] = tmp.part[i];
    target.flags[i] = tmp.flags[i];
  }
  target.used = true;
}

/** Paints one fine pixel (fine integer coords). */
function put(L: Layer, fx: number, fy: number, pen: Pen, s: S): void {
  if (s === null || s === undefined || s === false) return;
  L.set(fx, fy, pen.mat, s + (pen.bias || 0), pen.part, pen.flags || 0);
}

/** Visits every fine pixel around a design-space box; (x, y) is the pixel's sample point in design units. */
function scan(x0: number, y0: number, x1: number, y1: number, fn: (fx: number, fy: number, x: number, y: number) => void): void {
  const fx0 = Math.max(0, Math.floor(x0 * RES) - 1);
  const fy0 = Math.max(0, Math.floor(y0 * RES) - 1);
  const fx1 = Math.min(GRID - 1, Math.ceil(x1 * RES) + 1);
  const fy1 = Math.min(GRID - 1, Math.ceil(y1 * RES) + 1);
  for (let fy = fy0; fy <= fy1; fy++) for (let fx = fx0; fx <= fx1; fx++) fn(fx, fy, (fx + 0.5) / RES, (fy + 0.5) / RES);
}

function pip(pts: Vec[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Polygon fill with a per-fine-pixel shade function. */
function fillShape(L: Layer, pts: Vec[], pen: Pen, fn: (x: number, y: number) => S): void {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  scan(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), (fx, fy, x, y) => {
    if (pip(pts, x, y)) put(L, fx, fy, pen, fn(x, y));
  });
}

/** Screen point -> torso-local (x along shoulders, y up from the pelvis). */
function toLocal(g: DrawCtx, p: Vec): Vec {
  const r = g.rig;
  const d = sub(p, r.pelvis);
  return v(dotv(d, r.right), dotv(d, r.up));
}

/** Local y of the top of the torso this frame (breathing moves it). */
const chestTop = (g: DrawCtx) => toLocal(g, g.rig.neck).y;

interface TOpts {
  top?: number;
  bottom?: number;
  flare?: number;
}

/**
 * Fills the (inflated) torso with a shade function of torso-local coords.
 * `t` runs 0 (back edge) .. 1 (front edge) across the shape.
 */
function tfill(g: DrawCtx, L: Layer, inflate: number, pen: Pen, fn: (lx: number, ly: number, t: number) => S, opts: TOpts = {}): void {
  const pts = torsoPoly(g, inflate, opts);
  const loc = pts.map((p) => toLocal(g, p));
  const minX = Math.min(...loc.map((p) => p.x));
  const maxX = Math.max(...loc.map((p) => p.x));
  const top = opts.top ?? 99;
  const bottom = opts.bottom ?? -99;
  fillShape(L, pts, pen, (x, y) => {
    const p = toLocal(g, v(x, y));
    if (p.y > top || p.y < bottom) return null;
    return fn(p.x, p.y, (p.x - minX) / Math.max(1, maxX - minX));
  });
}

/** Fills a polygon given in torso-local coords. */
function tpoly(g: DrawCtx, L: Layer, pts: [number, number][], pen: Pen, fn: (lx: number, ly: number) => S = () => 3): void {
  const T = g.rig.T;
  fillShape(L, pts.map(([x, y]) => T(x, y)), pen, (x, y) => {
    const p = toLocal(g, v(x, y));
    return fn(p.x, p.y);
  });
}

/** One fine pixel at a torso-local point. */
function tpx(g: DrawCtx, L: Layer, lx: number, ly: number, pen: Pen, s = 3): void {
  const p = g.rig.T(lx, ly);
  put(L, fine(p.x), fine(p.y), pen, s);
}

/** Small rivet / stud: one bright pixel with a dark pixel under it. */
function stud(L: Layer, p: Vec, pen: Pen, s = 4): void {
  const fx = fine(p.x);
  const fy = fine(p.y);
  put(L, fx, fy, pen, s);
  put(L, fx, fy + 1, pen, 1);
}
const tstud = (g: DrawCtx, L: Layer, lx: number, ly: number, pen: Pen, s = 4) => stud(L, g.rig.T(lx, ly), pen, s);

/** Fine-pixel mask anchored (top-left) at a design point. `key` maps a char to [pen, shade]. */
function mask(L: Layer, p: Vec, rows: string[], key: Record<string, [Pen, number]>): void {
  const fx = fine(p.x);
  const fy = fine(p.y);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const k = key[row[i]];
      if (k) put(L, fx + i, fy + j, k[0], k[1]);
    }
  });
}

interface LimbFrame {
  o: Vec;
  e: Vec;
  u: Vec;
  /** Points away from the body's center line (outer side of the limb). */
  w: Vec;
  len: number;
}

function armFrame(g: DrawCtx, s: Side, seg: 0 | 1): LimbFrame {
  const j = armJoints(g.rig, s);
  const o = seg === 0 ? j.shoulder : j.elbow;
  const e = seg === 0 ? j.elbow : j.wrist;
  const u = norm(sub(e, o));
  return { o, e, u, w: scale(perp(u), s === 'N' ? 1 : -1), len: Math.hypot(e.x - o.x, e.y - o.y) };
}

function legFrame(g: DrawCtx, s: Side, seg: 0 | 1): LimbFrame {
  const j = legJoints(g.rig, s);
  const o = seg === 0 ? j.hip : j.knee;
  const e = seg === 0 ? j.knee : j.ankle;
  const u = norm(sub(e, o));
  return { o, e, u, w: scale(perp(u), s === 'N' ? 1 : -1), len: Math.hypot(e.x - o.x, e.y - o.y) };
}

/** A frame that hangs from the shoulder and only follows the arm part of the way. */
function hangFrame(g: DrawCtx, s: Side, follow: number): LimbFrame {
  const f0 = armFrame(g, s, 0);
  const u = norm(add(scale(g.rig.up, -(1 - follow)), scale(f0.u, follow)));
  return { ...f0, u, w: scale(perp(u), s === 'N' ? 1 : -1) };
}

/** Fills fine pixels around a limb segment with a function of limb-local coords (a along, b across/outward). */
function lfill(L: Layer, f: LimbFrame, pen: Pen, pad: number, fn: (a: number, b: number) => S): void {
  scan(Math.min(f.o.x, f.e.x) - pad, Math.min(f.o.y, f.e.y) - pad, Math.max(f.o.x, f.e.x) + pad, Math.max(f.o.y, f.e.y) + pad, (fx, fy, x, y) => {
    const d = v(x - f.o.x, y - f.o.y);
    put(L, fx, fy, pen, fn(dotv(d, f.u), dotv(d, f.w)));
  });
}

/** Is the limb surface at across-offset b (tilted along the limb) facing the light? */
function limbLit(f: LimbFrame, b: number, half: number, tilt = 0): boolean {
  const n = add(scale(f.w, clamp(b / half, -1, 1)), scale(f.u, tilt));
  return lit(n.x, n.y) >= 3;
}

/**
 * Light (-1..1) on a rounded limb surface: across-offset b on a cylinder of
 * half-width `half` (its middle faces the viewer), tilted along the limb
 * (negative tilt faces up). Light comes from the upper left and the front.
 */
function limbDot(f: LimbFrame, b: number, half: number, tilt = 0): number {
  const c = clamp(b / half, -1, 1);
  const nx = f.w.x * c + f.u.x * tilt;
  const ny = f.w.y * c + f.u.y * tilt;
  const nz = Math.sqrt(1 - c * c);
  return (nx * LIGHT3[0] + ny * LIGHT3[1] + nz * LIGHT3[2]) / (Math.hypot(nx, ny, nz) || 1);
}

/** Shade 1..4 for a light value from limbDot (5 is kept for placed glints). */
const dotShade = (d: number) => (d > 0.66 ? 4 : d > 0.3 ? 3 : d > -0.08 ? 2 : 1);

interface PauldronOpts {
  /** Height of the domed cap above the shoulder joint. */
  top: number;
  /** Where the cap ends down the arm (design units from the shoulder). */
  capEnd: number;
  /** Height of each lame. */
  step: number;
  /** Number of lames under the cap. */
  n: number;
  /** Half width across the arm (cap). */
  half: number;
  /** Extra half width per lame (the guard flares downward). */
  flare?: number;
  /** How much each lame's lower edge droops in the middle. */
  curve?: number;
  /** Shift toward the outer side of the arm. */
  out?: number;
  /** Pen for the lower rim of every lame (`edgeAll`) or of the last one. */
  edge?: Pen | null;
  edgeAll?: boolean;
  /** Rivet pen: a rivet in the middle of each lame. */
  rivet?: Pen | null;
  /** How much the guard follows the arm's rotation (0 = hangs from the torso, 1 = rigid on the arm). */
  follow?: number;
}

/**
 * Capes whose mantle lies under the shoulder guards: the owner's red cape on his Aiden, his pauldron
 * over its mantle (the cape draws its near mantle into the arm's armour layer before the armour).
 */
const PAULDRONS_OVER_CAPE = new Set(['cape_crimson']);

/**
 * Whether a cape lies over the shoulders (any but the long scarf). The cape goes over the armour and
 * its shoulder guards, and nothing of a guard sticks out past it (the owner, 2026-10-20: "elimina los
 * pixeles extras de la hombrera y pon la capa sobrepuesta de la armadura y de la hombrera").
 */
const capeOverShoulders = (g: DrawCtx): boolean => {
  const c = g.look.slots.cape;
  return !!c && c.id !== 'cape_scarf' && !PAULDRONS_OVER_CAPE.has(c.id);
};

/** Segmented shoulder guard: a domed cap plus overlapping curved lames that follow the upper arm. */
function pauldron(g: DrawCtx, s: Side, pen: Pen, o: PauldronOpts): void {
  // Under a cape the guard is hidden: the cape covers the shoulder and its edge is the outline.
  if (capeOverShoulders(g)) return;
  const L = g.L(armDepth(s, 'armor'));
  const fh = hangFrame(g, s, o.follow ?? 0.55);
  const f: LimbFrame = { ...fh, o: add(fh.o, scale(fh.w, o.out ?? 0.5)) };
  const flare = o.flare ?? 0.25;
  const curve = o.curve ?? 0.7;
  const p = onLimb(pen, s, 'upperArm');
  const edge = o.edge ? onLimb(o.edge, s, 'upperArm') : null;
  const bottom = o.capEnd + o.n * o.step;
  const hw = (a: number) => o.half + flare * clamp((a - o.capEnd) / o.step, 0, o.n);
  /** Lame boundary k (0 = cap / first lame) at across-offset b. */
  const bound = (k: number, b: number) => o.capEnd + k * o.step + curve * (1 - clamp((b / hw(o.capEnd + k * o.step)) ** 2, 0, 1));
  const pad = o.half + flare * o.n + o.top + bottom;
  // glint on the cap, up and toward the light
  const gl = add(f.o, add(scale(f.u, -o.top * 0.45), scale(f.w, o.half * 0.35)));
  lfill(L, f, p, pad, (a, b) => {
    const h = hw(a);
    if (Math.abs(b) > h) return null;
    if (a < 0 && (a / o.top) ** 2 + (b / o.half) ** 2 > 1) return null;
    if (a > bound(o.n, b)) return null;
    if (a < bound(0, b)) {
      // cap: a dome lit on its upper outer side, with one glint; its rolled
      // lower edge turns down into shadow above the first lame
      const pt = add(f.o, add(scale(f.u, a), scale(f.w, b)));
      if (fine(pt.x) === fine(gl.x) && fine(pt.y) === fine(gl.y)) return 5;
      const dg = Math.hypot(pt.x - gl.x, pt.y - gl.y);
      const toSeam = bound(0, b) - a;
      if (toSeam < FP) return 1; // seam above the first lame
      const tilt = a < 0 ? -1.6 * Math.sqrt(clamp(-a / o.top, 0, 1)) : toSeam < FP * 2 ? 0.9 : 0;
      const d = limbDot(f, b, o.half, tilt);
      // A clean dome (the owner's reference: round, smooth shoulders): one lit arc along its upper
      // outer edge, a mid-tone body, its underside turning into shadow.
      const rim = a < 0 && (a / o.top) ** 2 + (b / o.half) ** 2 > 0.62;
      if (rim && d > 0.15) return 4;
      if (dg < FP * 1.6) return 4;
      return d > 0.35 ? 3 : d > -0.15 ? 2 : 1;
    }
    let k = 0;
    while (k < o.n - 1 && a >= bound(k + 1, b)) k++;
    const d0 = a - bound(k, b);
    const d1 = bound(k + 1, b) - a;
    if (edge && (o.edgeAll || k === o.n - 1) && d1 < FP * 1.1) return null; // rim drawn with the edge pen
    if (d1 < FP && k < o.n - 1) return 1; // seam
    // each lame is a shallow band: its top faces up, its lower half turns down
    const fr = clamp(d0 / o.step, 0, 1);
    const d = limbDot(f, b, h, -0.8 + 2.0 * fr);
    // Only the first lame catches a bright rim; the ones under it keep a soft one, so the guard reads
    // as one rounded piece, not stripes.
    if (d0 < FP) return k === 0 ? (d > 0.45 ? 4 : d > 0.1 ? 3 : 2) : d > 0.3 ? 3 : 2;
    return Math.min(3, dotShade(d));
  });
  if (edge)
    lfill(L, f, edge, pad, (a, b) => {
      const h = hw(a);
      if (Math.abs(b) > h || a < bound(0, b)) return null;
      for (let k = o.edgeAll ? 0 : o.n - 1; k < o.n; k++) {
        const d1 = bound(k + 1, b) - a;
        if (d1 >= 0 && d1 < FP * 1.1) return limbLit(f, b, h, -0.2) ? 3 : 2;
      }
      return null;
    });
  if (o.rivet) {
    const rp = onLimb(o.rivet, s, 'upperArm');
    for (let k = 0; k < o.n; k++) stud(L, add(f.o, add(scale(f.u, o.capEnd + (k + 0.4) * o.step + curve), scale(f.w, 0.4))), rp, 4);
  }
}

interface BracerOpts {
  /** Range along the forearm, 0 = elbow, 1 = wrist. */
  from?: number;
  to?: number;
  grow?: number;
  /** Pen for the rims at both ends. */
  rim?: Pen | null;
  /** Extra seam lines (fractions along the forearm). */
  lines?: number[];
  rivet?: Pen | null;
  /** Elbow cop (a small dome over the elbow). */
  cop?: boolean;
}

/** Bracer over both forearms. */
function bracer(g: DrawCtx, pen: Pen, o: BracerOpts = {}): void {
  const from = o.from ?? 0.15;
  const to = o.to ?? 0.92;
  const grow = o.grow ?? 0.55;
  const R = g.bp.armR;
  for (const s of SIDES) {
    const L = g.L(armDepth(s, 'armor'));
    const f = armFrame(g, s, 1);
    const p = onLimb(pen, s, 'forearm');
    const rad = (t: number) => forearmR(g, s, t) + grow;
    const at = (a: number) => a / Math.max(0.01, f.len);
    /** Which side of the forearm (+1 outer, -1 inner) faces the light. */
    const ls = limbDot(f, 1, 2) > limbDot(f, -1, 2) ? 1 : -1;
    lfill(L, f, p, R[2] + grow + 1, (a, b) => {
      const t = at(a);
      if (t < from || t > to) return null;
      const rr = rad(t);
      if (Math.abs(b) > rr) return null;
      // a rounded guard: lit crest on the side toward the light, shadow on
      // the far side with a little reflected light just inside its edge
      const d = limbDot(f, b, rr, -0.15);
      if (o.lines?.some((l) => Math.abs(t - l) * f.len < FP * 0.5)) return 1;
      if (o.lines?.some((l) => (t - l) * f.len > FP * 0.5 && (t - l) * f.len < FP * 1.5)) return d > 0.3 ? 4 : d > -0.05 ? 3 : 2;
      if (d > 0.3 && Math.abs(b - ls * rr * 0.45) < FP * 0.5) return 4;
      const edge = rr - Math.abs(b);
      if (d < -0.08 && edge >= FP && edge < FP * 2) return 2;
      return Math.min(3, dotShade(d));
    });
    if (o.rim) {
      const rp = onLimb(o.rim, s, 'forearm');
      lfill(L, f, rp, R[2] + grow + 1, (a, b) => {
        const t = at(a);
        if (t < from || t > to) return null;
        const rr = rad(t) + 0.15;
        if (Math.abs(b) > rr) return null;
        if ((t - from) * f.len < FP * 1.5 || (to - t) * f.len < FP * 1.5) return limbLit(f, b, rr) ? 3 : 2;
        return null;
      });
    }
    if (o.cop) {
      const c = add(f.o, scale(f.w, 0.3));
      const rr = R[1] + grow + 0.4;
      ellipse(L, c.x, c.y, rr, rr, p, (x, y) => {
        const dx = x + 0.5 - c.x;
        const dy = y + 0.5 - c.y;
        if (Math.hypot(dx + rr * 0.35, dy + rr * 0.35) < FP * 0.8) return 5;
        return clamp(lit(dx, dy), 1, 3);
      });
    }
    if (o.rivet) {
      const rp = onLimb(o.rivet, s, 'forearm');
      stud(L, add(f.o, add(scale(f.u, f.len * (from + to) * 0.5), scale(f.w, 0.5))), rp, 4);
    }
  }
}

/** Ring around the base of the neck (neck depth). Optional rim along its top edge. */
function collar(g: DrawCtx, pen: Pen, height: number, width: number, rimPen?: Pen | null): void {
  const r = g.rig;
  const L = g.L('neck');
  const top = v(r.head.x - 0.3, Math.max(r.neck.y - height, r.head.y + 4.5));
  const R0 = g.bp.neckW + width + 0.3;
  const R1 = g.bp.neckW + width;
  const ab = sub(top, r.neck);
  const l2 = dotv(ab, ab) || 1;
  const inside = (x: number, y: number) => {
    const t = clamp(((x - r.neck.x) * ab.x + (y - r.neck.y) * ab.y) / l2, 0, 1);
    const c = add(r.neck, scale(ab, t));
    const rr = R0 + (R1 - R0) * t;
    return (x - c.x) ** 2 + (y - c.y) ** 2 <= rr * rr;
  };
  scan(Math.min(r.neck.x, top.x) - R0, top.y - R0, Math.max(r.neck.x, top.x) + R0, r.neck.y + R0, (fx, fy, x, y) => {
    if (!inside(x, y)) return;
    const nx = (x - top.x) / R0;
    const lt = nx < 0.1;
    if (!inside(x, y - FP * 2)) {
      // lit top edge of the roll
      if (rimPen) return put(L, fx, fy, rimPen, rim(lt));
      return put(L, fx, fy, pen, nx < -0.3 ? 4 : nx < 0.4 ? 3 : 2);
    }
    // the roll turns down into shadow toward its lower edge and the front
    const low = !inside(x, y + FP * 2);
    put(L, fx, fy, pen, nx > 0.55 ? 1 : nx > 0.15 ? (low ? 1 : 2) : low ? 2 : 3);
  });
}

/**
 * A fold across the neck layer: re-shades the trough along the line
 * y = y0 + slope * (x - neck.x) to `s`, with a lit crest just above it on the
 * side toward the light.
 */
function neckFold(g: DrawCtx, y0: number, slope: number, s: number): void {
  const r = g.rig;
  const N = g.L('neck');
  const crest: [number, number][] = [];
  scan(r.neck.x - 6, r.neck.y - 5, r.neck.x + 6, r.neck.y + 1, (fx, fy, x, y) => {
    if (!N.has(fx, fy) || N.getShade(fx, fy) === 0) return;
    const d = y - (y0 + (x - r.neck.x) * slope);
    if (Math.abs(d) < FP * 0.5) N.reshade(fx, fy, s);
    else if (d < -FP * 0.5 && d > -FP * 1.5 && x < r.neck.x + 0.6 && N.has(fx, fy - 1)) crest.push([fx, fy]);
  });
  for (const [fx, fy] of crest) N.reshade(fx, fy, Math.min(4, N.getShade(fx, fy) + 1));
}

// --- skirts -----------------------------------------------------------------

interface Hang {
  top: Vec;
  bot: Vec;
  /** 0 = follows the near thigh, 1 = the far thigh. */
  w: number;
}

/** Lowest a hanging hem goes (design y): the near sole's row, so a gown never sinks into the ground. */
const HEM_FLOOR = GROUND + 1.5;

/** How much a hanging panel follows its thigh (0 = straight down). Kept low so skirts never bell out. */
const HANG_FOLLOW = 0.22;

/**
 * Where a hanging panel attached at waist-local x `lx` ends up, `k`
 * thigh-lengths below the hips. Panels hang nearly straight down (they only
 * lean a little with their thigh), so the hem stays about as wide as the
 * hips and the legs come out from under it.
 */
function hang(g: DrawCtx, lx: number, ytop: number, k: number, droop = 0.8, flare = 0): Hang {
  const r = g.rig;
  const b = g.bp;
  const xN = -b.hipHalf * 0.55;
  const xF = b.hipHalf * 0.45;
  const w = clamp((lx - xN) / (xF - xN), 0, 1);
  const N = legJoints(r, 'N');
  const F = legJoints(r, 'F');
  const thigh = lerp(sub(N.knee, N.hip), sub(F.knee, F.hip), w);
  const dir = lerp(v(0, Math.hypot(thigh.x, thigh.y)), thigh, HANG_FOLLOW);
  const c = -0.6;
  const dr = droop * (1 - clamp(((lx - c) / b.hipHalf) ** 2, 0, 1));
  const bot = add(add(r.T(lx * (1 + flare), 0.5), scale(dir, k)), v(0, dr));
  // A long hem never hangs below the soles: in a deep crouch it rests on the ground.
  if (bot.y > HEM_FLOOR) bot.y = HEM_FLOOR;
  return { top: r.T(lx, ytop), bot, w };
}

/** Waist-local x range of the hips (back edge .. front edge): the thighs' outer edges, as in torsoPoly. */
function hipRange(g: DrawCtx, grow = 0): [number, number] {
  const b = g.bp;
  return [-(b.hipHalf * 0.5 + b.legR[0] * 0.96) - 0.3 - grow * 0.5, b.hipHalf * 0.42 + b.legR[0] * 0.9 + 0.3 + grow * 0.5];
}

/** Waist-local x of the split between the legs (the crotch). */
const SPLIT_X = -0.15;

/** A slim band around the hips (torso-local y from `yb` to `yt`): lit top edge, darker lower edge, turning away toward the front. */
function waistband(g: DrawCtx, L: Layer, pen: Pen, x0: number, x1: number, yt: number, yb: number): void {
  tpoly(g, L, [[x0, yt], [x1, yt], [x1, yb], [x0, yb]], pen, (lx, ly) => {
    const u = (lx - x0) / (x1 - x0);
    if (yt - ly < FP * 1.5) return u < 0.5 ? 4 : u < 0.8 ? 3 : 2;
    if (ly - yb < FP) return u < 0.6 ? 2 : 1;
    return u < 0.55 ? 3 : u < 0.85 ? 2 : 1;
  });
}

/** Position inside one skirt column. */
interface Cell {
  i: number;
  /** 0 at the waist .. 1 at the hem. */
  down: number;
  /** 0 at the column's back edge .. 1 at its front edge. */
  across: number;
  /** 0 .. 1 across the whole band (back .. front). */
  u: number;
  /** Near (0) .. far (1) thigh blend. */
  w: number;
  /** Column width and length here, in design units. */
  cw: number;
  ch: number;
}

/** A skirt band split into hanging columns attached along the waist at local xs. */
function skirtCols(
  g: DrawCtx,
  L: Layer,
  pen: Pen | ((w: number) => Pen),
  xs: number[],
  ytop: number,
  k: number | ((lx: number) => number),
  fn: (c: Cell) => S,
  droop = 0.8,
  flare = 0,
): void {
  const kk = (lx: number) => (typeof k === 'number' ? k : k(lx));
  const n = xs.length - 1;
  for (let i = 0; i < n; i++) {
    const A = hang(g, xs[i], ytop, kk(xs[i]), droop, flare);
    const B = hang(g, xs[i + 1], ytop, kk(xs[i + 1]), droop, flare);
    const w = (A.w + B.w) / 2;
    const pp = typeof pen === 'function' ? pen(w) : pen;
    const topMid = lerp(A.top, B.top, 0.5);
    const botMid = lerp(A.bot, B.bot, 0.5);
    const dd = sub(botMid, topMid);
    const l2 = dotv(dd, dd) || 1;
    const ch = Math.sqrt(l2);
    fillShape(L, [A.top, B.top, B.bot, A.bot], pp, (x, y) => {
      const P = v(x, y);
      const down = clamp(dotv(sub(P, topMid), dd) / l2, 0, 1);
      const left = lerp(A.top, A.bot, down);
      const right = lerp(B.top, B.bot, down);
      const span = sub(right, left);
      const s2 = dotv(span, span) || 1;
      const across = clamp(dotv(sub(P, left), span) / s2, 0, 1);
      return fn({ i, down, across, u: (i + across) / n, w, cw: Math.sqrt(s2), ch });
    });
  }
}

const thighPart = (w: number): Pen['part'] => (w < 0.5 ? 'thighN' : 'thighF');

function spread(a: number, b: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
  return out;
}

/**
 * Skirt layer. Skirts sit over the trousers and under the armor; a long coat
 * already drew its tails into `torso.over`, so the skirt goes on top of them
 * there (the strips hang from the armor, over the coat).
 */
function skirt(g: DrawCtx, draw: (L: Layer, top: (y: number) => number) => void, also: Depth[] = []): void {
  const over = g.L('torso.over');
  // Over a coat the skirt is also above the armor layer, so it starts at the armor's lower edge.
  const coat = over.used;
  if (coat) stamp(over, (L) => draw(L, (y) => Math.min(y, 0.75)));
  else draw(g.L('skirt'), (y) => y);
  // no crack between its panels or between them and the panels it hangs elsewhere (`also`)
  sealCloth(g, [...also, coat ? 'torso.over' : 'skirt']);
}

/**
 * Cloth folds for hanging fabric: dark troughs (1px, widening toward the hem)
 * with a lit crest beside each on the lit half. `u` 0..1 across, `down` 0..1,
 * `width` the band width in design units.
 */
function folds(u: number, down: number, width: number, at: number[], b: number, litU = 0.55): number {
  for (const f0 of at) {
    const fu = f0 + (f0 - 0.5) * down * 0.08;
    const d = (u - fu) * width;
    const tw = FP * (0.5 + down * 0.6);
    if (Math.abs(d) < tw && down > 0.12) return Math.max(1, b - 1);
    if (d < -tw && d > -tw - FP && down > 0.22 && u < litU) return Math.min(4, b + 1);
  }
  return b;
}

/** A straight band (sash/strap) across the torso between two local points; fn gets (along, across) in units. */
function tband(g: DrawCtx, L: Layer, p0: [number, number], p1: [number, number], half: number, pen: Pen, fn: (al: number, ac: number, len: number) => S): void {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const dl = Math.hypot(dx, dy) || 1;
  const nx = (-dy / dl) * half;
  const ny = (dx / dl) * half;
  tpoly(
    g,
    L,
    [
      [p0[0] - nx, p0[1] - ny],
      [p0[0] + nx, p0[1] + ny],
      [p1[0] + nx, p1[1] + ny],
      [p1[0] - nx, p1[1] - ny],
    ],
    pen,
    (lx, ly) => {
      const al = ((lx - p0[0]) * dx + (ly - p0[1]) * dy) / dl;
      const ac = ((lx - p0[0]) * -dy + (ly - p0[1]) * dx) / dl; // + toward the upper side
      return fn(al, ac, dl);
    },
  );
}

/** Lamellar row height (design units). */
const LAM_ROW = 2.5;

/**
 * Lamellar row structure, `d` measured upward from the bottom of the laced
 * area: a lit rim, the plate face, then a band of lacing at the bottom.
 */
function lamRow(d: number, rh: number): 'rim' | 'plate' | 'lace' {
  const m = mod(d, rh);
  if (m > rh - FP) return 'rim';
  if (m < FP) return 'lace'; // a single dark lace row keeps the bands calm
  return 'plate';
}
/** Lace stitches every 3 fine pixels across. */
const laceCol = (x: number) => mod(Math.floor(x * RES), 3) === 0;

// --- fitted plate for the female bodies --------------------------------------

interface FittedOpts {
  /** Local y of the plate's top and lower edges. */
  top: number;
  bot: number;
  inflate: number;
  /** Trim along the top edge, the lower edge, down the middle and under the bust (else plain metal). */
  rimTop?: Pen;
  rimBot?: Pen;
  center?: Pen;
  under?: Pen;
}

/**
 * A breastplate shaped to the bust: two rounded forms with crisp undercurves
 * and a valley between them, a soft ridge down to the waist, polished metal
 * lit from the upper left. Optional trims on its edges.
 */
function fittedPlate(g: DrawCtx, L: Layer, pen: Pen, o: FittedOpts): void {
  const b = g.bp;
  const ct = chestTop(g);
  const cx = 1.2;
  const by = ct - 4.4 - b.bust * 0.3;
  const forms: [number, number, number, number, number][] = [
    [cx - 2.3, by, 2.5, 2.1, 1.1 + b.bust * 0.4],
    [cx + 2.1, by, 1.9, 2.0, 0.95 + b.bust * 0.4],
  ];
  const h = (x: number, y: number) => {
    let sum = 0;
    for (const [fx, fy, rx, ry, a] of forms) sum += a * Math.exp(-(((x - fx) / rx) ** 2 + ((y - fy) / ry) ** 2) * 1.6);
    return sum;
  };
  const q = (d: number) => (d > 0.9 ? 5 : d > 0.64 ? 4 : d > 0.36 ? 3 : d > -0.14 ? 2 : 1);
  /** The crease under each form (local y up: lowest under its middle). */
  const under = (lx: number, ly: number) =>
    forms.some(([fx, fy, rx, ry]) => {
      const u = (lx - fx) / rx;
      return Math.abs(u) < 0.95 && Math.abs(ly - (fy - ry * 0.95 + 1.0 * u * u)) < FP * 0.55;
    });
  const isTrim = (lx: number, ly: number) =>
    (o.rimTop && o.top - ly < FP * 1.5) ||
    (o.rimBot && ly - o.bot < FP * 1.5) ||
    (o.center && Math.abs(lx - (cx - 0.1)) < FP * 0.6 && ly < by - 1.2) ||
    (o.under && under(lx, ly));
  tfill(
    g,
    L,
    o.inflate,
    pen,
    (lx, ly, t) => {
      if (ly > o.top || ly < o.bot) return null;
      if (isTrim(lx, ly)) return null;
      if (!o.rimBot && ly - o.bot < FP) return 1;
      if (!o.rimTop && o.top - ly < FP) return litT(t) ? 4 : 3;
      if (!o.under && under(lx, ly)) return 1;
      // the valley between the forms, then a soft ridge down to the waist
      if (Math.abs(lx - (cx - 0.1)) < FP * 0.5) return ly > by - 1.2 ? 1 : litT(t) ? 4 : 3;
      const th = (t - 0.36) * 2.0;
      const e = 0.2;
      const nx = Math.sin(th) - ((h(lx + e, ly) - h(lx - e, ly)) / (2 * e)) * 2.4;
      const ny = ((h(lx, ly + e) - h(lx, ly - e)) / (2 * e)) * 2.4 - (ly < 4 ? (4 - ly) * 0.2 : 0);
      const nz = Math.cos(th) + 0.1;
      return q((nx * LIGHT3[0] + ny * LIGHT3[1] + nz * LIGHT3[2]) / (Math.hypot(nx, ny, nz) || 1));
    },
    { top: o.top, bottom: o.bot },
  );
  for (const tp of [o.rimTop, o.rimBot, o.center, o.under]) {
    if (!tp) continue;
    tfill(
      g,
      L,
      o.inflate,
      tp,
      (lx, ly, t) => {
        if (ly > o.top || ly < o.bot) return null;
        const hit =
          (tp === o.rimTop && o.top - ly < FP * 1.5) ||
          (tp === o.rimBot && ly - o.bot < FP * 1.5) ||
          (tp === o.center && Math.abs(lx - (cx - 0.1)) < FP * 0.6 && ly < by - 1.2) ||
          (tp === o.under && under(lx, ly));
        if (!hit) return null;
        return litT(t) ? (tp === o.rimTop && o.top - ly < FP * 0.8 ? 4 : 3) : 2;
      },
      { top: o.top, bottom: o.bot },
    );
  }
}

/** Overlapping lames around the waist (plackart, faulds), each with a rim at its lower edge if `rimPen`. */
function waistLames(g: DrawCtx, L: Layer, pen: Pen, top: number, bot: number, n: number, rimPen?: Pen, inflate = 1.0): void {
  const h = (top - bot) / n;
  tfill(
    g,
    L,
    inflate,
    pen,
    (_lx, ly, t) => {
      if (ly > top || ly < bot) return null;
      const d = mod(ly - bot, h);
      if (rimPen && d < FP * 1.2) return null;
      return plate(d, h, litT(t));
    },
    { top, bottom: bot },
  );
  if (rimPen)
    tfill(g, L, inflate, rimPen, (_lx, ly, t) => (ly >= bot && ly <= top && mod(ly - bot, h) < FP * 1.2 ? (litT(t) ? 3 : 2) : null), { top, bottom: bot });
}

/** Sleeves under the armor (arm cloth depth), the whole arm down to the wrist. */
function sleeves(g: DrawCtx, pen: Pen, grow = 0.45): void {
  const R = g.bp.armR;
  for (const s of SIDES) {
    const A = g.L(armDepth(s, 'cloth'));
    for (const seg of [0, 1] as const) {
      const f = armFrame(g, s, seg);
      const p = onLimb(pen, s, seg ? 'forearm' : 'upperArm');
      const rad = (a: number) => {
        const t = clamp(a / Math.max(0.01, f.len), 0, 1);
        return (seg ? forearmR(g, s, t) : R[0] + (R[1] - R[0]) * t) + grow;
      };
      lfill(A, f, p, R[0] + 1.5, (a, bb) => {
        if (a < (seg ? -0.6 : -1.2) || a > f.len + (seg ? -0.3 : 0.6)) return null;
        const rr = rad(a);
        if (Math.abs(bb) > rr) return null;
        return Math.min(3, dotShade(limbDot(f, bb, rr, -0.2)));
      });
    }
  }
}

interface GreaveOpts {
  /** Range down the shin, 0 = knee, 1 = ankle. */
  from: number;
  to: number;
  grow: number;
  rim?: Pen;
}

/** Shin plates with a crest down the front and a domed knee cop, rims on both ends. */
function greaves(g: DrawCtx, pen: Pen, o: GreaveOpts): void {
  const b = g.bp;
  for (const s of SIDES) {
    const A = g.L(legDepth(s, 'armor'));
    const f = legFrame(g, s, 1);
    const p = onLimb(pen, s, 'shin');
    const rp = o.rim ? onLimb(o.rim, s, 'shin') : null;
    const rad = (t: number) => (b.legR[2] + (b.legR[3] - b.legR[2]) * t) * 0.92 + o.grow;
    const crest = limbDot(f, 1, 2) > limbDot(f, -1, 2) ? 1 : -1;
    lfill(A, f, p, b.legR[2] + o.grow + 2, (a, bb) => {
      const t = a / Math.max(0.01, f.len);
      if (t < o.from || t > o.to) return null;
      const rr = rad(t);
      if (Math.abs(bb) > rr) return null;
      if (rp && ((t - o.from) * f.len < FP * 1.5 || (o.to - t) * f.len < FP * 1.5)) return null;
      const d = limbDot(f, bb, rr, -0.1);
      if (Math.abs(bb - crest * rr * 0.3) < FP * 0.5) return d > 0.2 ? 4 : 3; // crest
      const edge = rr - Math.abs(bb);
      if (d < -0.08 && edge >= FP && edge < FP * 2) return 2; // reflected light
      return Math.min(3, dotShade(d));
    });
    if (rp)
      lfill(A, f, rp, b.legR[2] + o.grow + 2, (a, bb) => {
        const t = a / Math.max(0.01, f.len);
        if (t < o.from || t > o.to) return null;
        const rr = rad(t) + 0.1;
        if (Math.abs(bb) > rr) return null;
        if ((t - o.from) * f.len < FP * 1.5 || (o.to - t) * f.len < FP * 1.5) return limbLit(f, bb, rr) ? 4 : 2;
        return null;
      });
    // knee cop: a small dome with a lit crown and a dark lower rim
    const c = add(f.o, scale(f.w, 0.25));
    const rr = b.legR[1] + o.grow * 0.5 + 0.1;
    ellipse(A, c.x, c.y, rr, rr * 0.92, p, (x, y) => {
      const dx = (x + 0.5 - c.x) / rr;
      const dy = (y + 0.5 - c.y) / (rr * 0.92);
      const r2 = dx * dx + dy * dy;
      if (r2 > 0.72 && dy > 0.2) return 1;
      return lit3(dx, dy, Math.sqrt(Math.max(0, 1 - r2)));
    });
  }
}

/**
 * Rows of plates hanging from the waist over a skirt (faulds and tassets):
 * each row a band of plates split into columns, lit top rim, darker lower
 * half, its lower edge in `rimPen`. Rows are given longest first.
 */
function plateRows(g: DrawCtx, SL: Layer, plateHex: string, rimHex: string, x0: number, x1: number, ytop: number, rows: number[], cols: number): void {
  const xs = spread(x0, x1, cols);
  const pp = (w: number) => armorPen(g, plateHex, 'metal', thighPart(w));
  // only the lowest row gets the trim; the upper rows end in a plain dark edge
  const rp = (w: number, k: number) => armorPen(g, k === rows[0] ? rimHex : plateHex, 'metal', thighPart(w));
  for (const k of rows) {
    skirtCols(
      g,
      SL,
      pp,
      xs,
      ytop,
      k,
      (c) => {
        const fromBot = (1 - c.down) * c.ch;
        const fromR = (1 - c.across) * c.cw;
        const fromL = c.across * c.cw;
        if (fromBot < FP * 1.4) return null; // rim
        const lt = c.u < 0.5;
        if (fromR < FP) return 1; // seam to the next plate
        if (fromL < FP) return lt ? 4 : 3; // its lit edge
        const band = c.down * c.ch;
        if (band < FP * 1.2) return lt ? 4 : 3; // top rim
        return c.down > 0.55 ? (lt ? 2 : 1) : base(lt);
      },
      0.6,
      0.06,
    );
    const trim = k === rows[0];
    skirtCols(g, SL, (w) => rp(w, k), xs, ytop, k, (c) => ((1 - c.down) * c.ch < FP * 1.4 ? (trim ? (c.u < 0.5 ? 4 : 3) : 1) : null), 0.6, 0.06);
  }
}

// ---------------------------------------------------------------------------
// The owner's plate (Crimson Knight Plate): his pixels, one painted piece per segment of the rig
// (items/crimsonPlateArt.ts, lifted out of docs/reference/aiden-owner-reference.jpg by
// tools/refs/crimson-plate-from-ref.py). In our idle pose every pixel is his; in other poses each
// piece turns with its segment.
// ---------------------------------------------------------------------------

/** His steel and his gold: the colours the Steel and Trim slots replace (and their defaults). */
const PLATE_STEEL = '#9199af';
const PLATE_GOLD = '#c39038';

/**
 * His plate recoloured: his black line, his white glints, the brown of the belt and straps and the
 * navy of the under-suit stay; his steel follows Steel and his gold follows Trim, each shade as far
 * from the slot's colour as his was from his.
 */
const plateColor = (steel: string, trim: string) => (_ch: string, hex: string): string => {
  const [r, g, b] = hexToRgb(hex);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  if (l < 28 || Math.min(r, g, b) > 235) return hex;
  if (r > b + 55 && g > b + 22 && r - g < 80) return retintHex(hex, PLATE_GOLD, trim);
  if (b >= r - 8 && l >= 55) return retintHex(hex, PLATE_STEEL, steel);
  return hex;
};

/** The angle halfway between two segment angles (a cop sits over the joint between them). */
const midAngle = (a: number, b: number): number => a + (((b - a + 540) % 360) - 180) / 2;

/**
 * A pauldron's angle: it rides the torso and follows the arm part of the way (raised overhead, the
 * arm lifts it about halfway), so it caps the shoulder in every pose and is exactly his at rest.
 */
function pauldronAngle(piece: PaintedPiece, torso: number, arm: number): number {
  const rest = piece.angle - PLATE_CHEST.angle;
  return torso + rest + 0.45 * (((arm - torso - rest + 540) % 360) - 180);
}

/**
 * A piece with one of its columns repeated `n` more times: his plate for a broader figure. The
 * chest's second column is the navy of the under-suit at the near shoulder, so on the bulky body,
 * whose arms hang about 3 px further out, the shoulder reaches the arm and his breastplate stays as
 * he drew it.
 */
function widened(p: PaintedPiece, col: number, n: number): PaintedPiece {
  return {
    ...p,
    rows: p.rows.map((r) => r.slice(0, col) + r[col].repeat(n + 1) + r.slice(col + 1)),
    pivot: [p.pivot[0] + (col < p.pivot[0] ? n : 0), p.pivot[1]],
  };
}
const PLATE_CHEST_BULKY = widened(PLATE_CHEST, 1, 3);

/** Body parts full plate covers (the head, hands and feet stay). */
const UNDER_PLATE = new Set(['torso', 'pelvis', 'upperArmN', 'forearmN', 'upperArmF', 'forearmF', 'thighN', 'shinN', 'thighF', 'shinF'].map((p) => partIndex(p as PartId)));
const UNDER_PLATE_DEPTHS: Depth[] = [
  'farArm.body',
  'farArm.cloth',
  'farLeg.body',
  'farLeg.cloth',
  'farLeg.feet',
  'nearLeg.body',
  'nearLeg.cloth',
  'nearLeg.feet',
  'torso.body',
  'torso.under',
  'torso.bottom',
  'torso.top',
  'nearArm.body',
  'nearArm.cloth',
];

/**
 * The plate is the figure from the neck to the wrists and ankles: the skin, the clothes and the
 * boots' shafts under it are taken away, so they never show past his plates (our limbs are a little
 * elsewhere than his: the near shin, for one, stands out to the right of his greave). The neck above
 * its base, the hands and the feet stay.
 */
function clearUnderPlate(g: DrawCtx): void {
  const r = g.rig;
  const torso = partIndex('torso');
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  for (const d of UNDER_PLATE_DEPTHS) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < L.mat.length; i++) {
      if (L.mat[i] < 0 || !UNDER_PLATE.has(L.part[i])) continue;
      if (L.part[i] === torso) {
        const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
        const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
        if (x * r.up.x + y * r.up.y > neck) continue;
      }
      L.mat[i] = -1;
    }
  }
}

/**
 * Draws the owner's plate. Within a depth the pieces go back to front: the far arm's vambrace,
 * upper arm and pauldron; each leg's thigh, greave and knee cop; the chest under the waist; the near
 * arm's upper arm, vambrace, elbow cop and pauldron. Each piece reaches on under the ones drawn over
 * it, so bending joints open no gaps.
 */
function drawCrimsonPlate(g: DrawCtx, steel: string, trim: string): void {
  clearUnderPlate(g);
  const r = g.rig;
  const tint = plateColor(steel, trim);
  const torso = segAngle(r.pelvis, r.neck);
  const upperN = segAngle(r.shoulderN, r.elbowN);
  const foreN = segAngle(r.elbowN, r.wristN);
  const upperF = segAngle(r.shoulderF, r.elbowF);
  const foreF = segAngle(r.elbowF, r.wristF);
  const thighN = segAngle(r.hipN, r.kneeN);
  const shinN = segAngle(r.kneeN, r.ankleN);
  const thighF = segAngle(r.hipF, r.kneeF);
  const shinF = segAngle(r.kneeF, r.ankleF);
  const put = (d: Depth, p: PaintedPiece, at: Vec, deg: number, part: PartId) => stampPiece(g, d, p, at, deg, part, tint);
  put('farArm.armor', PLATE_VAMBRACE_F, r.elbowF, foreF, 'forearmF');
  put('farArm.armor', PLATE_UPPER_ARM_F, r.shoulderF, upperF, 'upperArmF');
  put('farArm.armor', PLATE_PAULDRON_F, r.shoulderF, pauldronAngle(PLATE_PAULDRON_F, torso, upperF), 'upperArmF');
  put('farLeg.armor', PLATE_THIGH_F, r.hipF, thighF, 'thighF');
  put('farLeg.armor', PLATE_GREAVE_F, r.kneeF, shinF, 'shinF');
  put('farLeg.armor', PLATE_KNEE_F, r.kneeF, midAngle(thighF, shinF), 'shinF');
  put('nearLeg.armor', PLATE_THIGH_N, r.hipN, thighN, 'thighN');
  put('nearLeg.armor', PLATE_GREAVE_N, r.kneeN, shinN, 'shinN');
  put('nearLeg.armor', PLATE_KNEE_N, r.kneeN, midAngle(thighN, shinN), 'shinN');
  put('torso.armor', r.body === 'bulky' ? PLATE_CHEST_BULKY : PLATE_CHEST, r.neck, torso, 'torso');
  put('torso.armor', PLATE_WAIST, r.pelvis, torso, 'pelvis');
  put('nearArm.armor', PLATE_UPPER_ARM_N, r.shoulderN, upperN, 'upperArmN');
  put('nearArm.armor', PLATE_VAMBRACE_N, r.elbowN, foreN, 'forearmN');
  put('nearArm.armor', PLATE_ELBOW_N, r.elbowN, midAngle(upperN, foreN), 'forearmN');
  put('nearArm.armor', PLATE_PAULDRON_N, r.shoulderN, pauldronAngle(PLATE_PAULDRON_N, torso, upperN), 'upperArmN');
}

// ---------------------------------------------------------------------------
// The owner's Roman armour (Bronze Cuirass, Imperial War Skirt): his pixels from his paint-over of
// our male in them (docs/reference/roman-owner-reference.jpg, lifted out by
// tools/refs/roman-cuirass-from-ref.py and roman-skirt-from-ref.py). In our idle pose every pixel is
// his; in other poses each piece follows its segment.
// ---------------------------------------------------------------------------

/** His pixels recoloured by one slot: his black line, studs and skin stay; the rest follows `to`. */
const romanColor = (kinds: Record<string, string>, from: string, to: string) => (_ch: string, hex: string): string => {
  const k = kinds[hex];
  return k === 'line' || k === 'stud' || k === 'skin' || k === 'hair' ? hex : retintHex(hex, from, to);
};

/**
 * The colours these two items had before his art, which the creator saved with every character that
 * wore them: those colours now mean his, so characters that kept the old defaults wear his colours.
 */
const ROMAN_OLD_DEFAULTS: Record<string, string> = {
  '#b8833a': CUIRASS_BRONZE,
  '#5a3a24': CUIRASS_LEATHER,
  '#b3202a': PTERUGES_TUNIC,
  '#7a4a2a': PTERUGES_LEATHER,
  '#d4a531': PTERUGES_STUD,
};
const romanSlot = (hex: string): string => ROMAN_OLD_DEFAULTS[hex.toLowerCase()] ?? hex;

/** A shoulder guard's angle: it rides the torso and follows the upper arm part of the way, like the plate's pauldrons. */
function guardAngle(piece: PaintedPiece, torso: number, arm: number): number {
  const rest = piece.angle - CUIRASS_CHEST.angle;
  return torso + rest + 0.45 * (((arm - torso - rest + 540) % 360) - 180);
}

const IDLE_RIGS = new Map<BodyType, Rig>();

/**
 * Where a shoulder guard hangs: halfway between the shoulder joint and where the shoulder sits on the
 * chest at rest (carried with the torso). Twisting to strike, the shoulder swings away from the chest;
 * his guard is laced to the cuirass, so it stays on the chest's corner over the top of the arm. At rest
 * both are the same point, so the guard is where he drew it.
 */
function guardAt(r: Rig, side: Side, torso: number): Vec {
  let idle = IDLE_RIGS.get(r.body);
  if (!idle) IDLE_RIGS.set(r.body, (idle = drawRig(r.body, 'idle', 0)));
  const sh = side === 'N' ? r.shoulderN : r.shoulderF;
  const sh0 = side === 'N' ? idle.shoulderN : idle.shoulderF;
  const onChest = turnPoint(add(r.neck, sub(sh0, idle.neck)), r.neck, torso - segAngle(idle.pelvis, idle.neck));
  return lerp(sh, onChest, 0.5);
}

/**
 * A piece stretched by repeating single columns and rows spread evenly over it (never side by side, so
 * no flat band appears): `left` columns between its second column and the pivot, `right` between the
 * pivot and its second last, `down` rows between its third row and its third last (or between the rows
 * `from` and `to`).
 */
function stretched(p: PaintedPiece, left: number, right: number, down: number, from = 2, to = p.rows.length - 3): PaintedPiece {
  const w = Math.max(...p.rows.map((r) => r.length));
  const spread = (a: number, b: number, n: number) => new Set(Array.from({ length: n }, (_, k) => Math.round(a + ((b - a) * (k + 0.5)) / n)));
  const cols = new Set([...spread(2, p.pivot[0] - 1, left), ...spread(p.pivot[0] + 1, w - 3, right)]);
  const rows = spread(from, to, down);
  const out: string[] = [];
  p.rows.forEach((r, j) => {
    const row = r.padEnd(w, '.').split('').map((ch, i) => (cols.has(i) ? ch + ch : ch)).join('');
    out.push(row);
    if (rows.has(j)) out.push(row);
  });
  let px = p.pivot[0];
  for (const c of cols) if (c < p.pivot[0]) px++;
  let py = p.pivot[1];
  for (const j of rows) if (j < p.pivot[1]) py++;
  return { ...p, rows: out, pivot: [px, py] };
}

/**
 * His chest for the bulky body, whose torso is 8 px broader (3 on the near side, 5 in front) and a
 * pixel longer: his chest stretched by single columns and a row spread over it (one column more on the
 * near side, so it meets the near arm), covering that torso with his relief only a little broader.
 */
const CUIRASS_CHEST_BULKY = stretched(CUIRASS_CHEST, 4, 5, 1);

/** His abdomen's rows on the chest (below the pectorals' undercurve, above the lower lip), per body's chest. */
const CUIRASS_ABS = { male: [12, 19], bulky: [13, 20] } as const;
const CUIRASS_LONGER = new Map<string, PaintedPiece>();

/**
 * His chest on a torso `extra` fine pixels longer than at rest. The cuirass rides the neck, and the torso
 * under it is taken away, but the skirt's strips hang from the pelvis: where a pose lifts the chest off
 * the hips (victory's second frame, chestDy -1) a rigid chest would leave the strips and open a gap at
 * the waist, the body cut in two. So the chest lengthens as our torso does, by repeating rows of his
 * abdomen spread evenly (stretched), and its lower lip stays on the strips. Every pixel is his; at rest
 * and in every pose whose torso is not longer than at rest (all but that frame) it is his chest unchanged.
 */
function cuirassChest(r: Rig): PaintedPiece {
  const base = r.body === 'bulky' ? CUIRASS_CHEST_BULKY : CUIRASS_CHEST;
  const torso = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  const extra = Math.round((torso - r.bp.torsoLen) * RES);
  if (extra <= 0) return base;
  const key = `${r.body}|${extra}`;
  let p = CUIRASS_LONGER.get(key);
  const [from, to] = CUIRASS_ABS[r.body === 'bulky' ? 'bulky' : 'male'];
  if (!p) CUIRASS_LONGER.set(key, (p = stretched(base, 0, 0, extra, from, to)));
  return p;
}

/**
 * The torso under the cuirass is taken away below the neck, so our skin never shows past his chest
 * (where the chest turns in a pose).
 */
function clearUnderCuirass(g: DrawCtx): void {
  const r = g.rig;
  const torsoPart = partIndex('torso');
  const neck = (r.neck.x - r.pelvis.x) * r.up.x + (r.neck.y - r.pelvis.y) * r.up.y;
  for (const d of ['torso.body', 'torso.under', 'torso.bottom', 'torso.top'] as Depth[]) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < L.mat.length; i++) {
      if (L.mat[i] < 0 || L.part[i] !== torsoPart) continue;
      const x = ((i % GRID) + 0.5) / RES - r.pelvis.x;
      const y = (Math.floor(i / GRID) + 0.5) / RES - r.pelvis.y;
      if (x * r.up.x + y * r.up.y <= neck) L.mat[i] = -1;
    }
  }
}

/**
 * The cuirass drawn to the female bodies (their bust and narrow waist): his art is a male chest, so
 * until he paints one for them they keep the fitted bronze cuirass they had.
 */
function drawBronzeCuirassFitted(g: DrawCtx, bc: string, sc: string): void {
  const b = g.bp;
  const L = g.L('torso.armor');
  const br = armorPen(g, bc, 'metal');
  const strap = armorPen(g, sc, 'leather');
  const top = chestTop(g);
  const cx = 1.3;
  const pecY = top - 5.6 - b.bust * 0.3;
  const lipY = 2.0;
  // sculpted relief: pectorals and two columns of abdominal plates
  const bumps: [number, number, number, number, number][] = [
    [cx - 2.3, pecY + 1.5, 2.4, 1.8, 1.2 + b.bust * 0.3],
    [cx + 2.0, pecY + 1.5, 1.8, 1.7, 1.0 + b.bust * 0.3],
  ];
  const rowH = (pecY - 0.4 - (lipY + 0.6)) / 3;
  for (let rr = 0; rr < 3; rr++) for (const c of [cx - 1.2, cx + 1.0]) bumps.push([c, lipY + 0.6 + (rr + 0.5) * rowH, 1.0, rowH * 0.48, 0.38]);
  /** Polished bronze: a soft falloff into shadow, glints only on the strongest light. */
  const q = (d: number) => (d > 0.9 ? 5 : d > 0.64 ? 4 : d > 0.36 ? 3 : d > -0.14 ? 2 : 1);
  const front = b.chestHalf * 0.62 + 1.9 + b.bust * 0.4;
  const h = (x: number, y: number) => {
    let s = 0;
    for (const [bx, by, rx, ry, a] of bumps) s += a * Math.exp(-(((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2) * 1.6);
    return s;
  };
  const seamX = -b.chestHalf * 0.55;
  tfill(
    g,
    L,
    1.1,
    br,
    (lx, ly, t) => {
      // flared lower lip
      if (ly < lipY) {
        if (lipY - ly < FP) return 1;
        if (lipY - ly < FP * 2) return litT(t) ? 4 : 3;
        return 2;
      }
      if (Math.abs(lx - seamX) < FP * 0.5) return 1; // side seam (front/back halves)
      const th = (t - 0.36) * 2.0;
      let nx = Math.sin(th);
      let ny = 0;
      const nz = Math.cos(th) + 0.1;
      if (ly > top - 2.6) ny -= (ly - (top - 2.6)) * 0.35; // shoulders turn up
      if (lx > seamX) {
        const e = 0.2;
        nx -= ((h(lx + e, ly) - h(lx - e, ly)) / (2 * e)) * 2.4;
        ny += ((h(lx, ly + e) - h(lx, ly - e)) / (2 * e)) * 2.4;
      }
      let s = q((nx * LIGHT3[0] + ny * LIGHT3[1] + nz * LIGHT3[2]) / (Math.hypot(nx, ny, nz) || 1));
      if (ly - lipY < FP) s = Math.max(1, s - 1);
      // reflected light just inside the shadowed front edge
      if (s === 1 && lx > front - FP * 2.5 && lx < front - FP * 1.5) s = 2;
      // crisp sculpt lines: pectoral undercurves and the center line
      for (const [px0, rr] of [
        [cx - 2.3, 2.5],
        [cx + 2.0, 1.9],
      ] as const) {
        const u = (lx - px0) / rr;
        if (Math.abs(u) < 1 && Math.abs(ly - (pecY + 0.3 - 0.7 * u * u)) < FP * 0.55) return 1;
      }
      if (Math.abs(lx - (cx - 0.1)) < FP * 0.5 && ly < pecY + 1.2 && ly > lipY + 0.4) return Math.min(s, 2);
      return s;
    },
    { top: top - 0.2, bottom: 0.6, flare: 0.7 },
  );
  tpx(g, L, cx - 0.1, lipY + 0.9, br, 1); // navel
  // leather shoulder straps (epaulettes) with bronze studs
  for (const s of SIDES) {
    const A = g.L(armDepth(s, 'armor'));
    const f = armFrame(g, s, 0);
    const p = onLimb(strap, s, 'upperArm');
    const R = b.armR[0] + 0.9;
    lfill(A, f, p, 5, (a, bb) => {
      if (a < -1.9 || a > 2.0 || Math.abs(bb) > R) return null;
      // a leather flap over the shoulder: worn lit top edge, rounded
      // across the arm, its lower edge turning under
      const d = limbDot(f, bb, R, -0.9 + 0.5 * (a + 1.9));
      if (a > 2.0 - FP) return 1;
      if (a < -1.9 + FP) return d > 0.2 ? 4 : 3;
      if (a > 2.0 - FP * 2) return d > 0.5 ? 2 : 1;
      return Math.min(3, dotShade(d));
    });
    stud(A, add(f.o, add(scale(f.u, 0.1), scale(f.w, 0.6))), onLimb(br, s, 'upperArm'), 4);
  }
  collar(g, br, 1.1, 0.9);
}

/**
 * Draws his cuirass: the far guard behind the far arm's upper arm, the chest over the torso (its lower
 * lip over the skirt's strips), the near guard over the near shoulder. His bronze follows Bronze and
 * his leather guards follow Straps; his black line and grey studs stay. The female bodies keep the
 * fitted cuirass (his is a male chest).
 */
function drawBronzeCuirass(g: DrawCtx, bc: string, sc: string): void {
  const bronze = romanSlot(bc);
  const strap = romanSlot(sc);
  const r = g.rig;
  if (isFemaleBody(r.body)) {
    drawBronzeCuirassFitted(g, bronze, strap);
    return;
  }
  clearUnderCuirass(g);
  const torso = segAngle(r.pelvis, r.neck);
  const metal = romanColor(CUIRASS_KIND, CUIRASS_BRONZE, bronze);
  const leather = romanColor(CUIRASS_KIND, CUIRASS_LEATHER, strap);
  stampPiece(g, 'farArm.armor', CUIRASS_GUARD_F, guardAt(r, 'F', torso), guardAngle(CUIRASS_GUARD_F, torso, segAngle(r.shoulderF, r.elbowF)), 'upperArmF', leather);
  stampLeaning(g, 'torso.armor', cuirassChest(r), r.neck, torso, 'torso', metal);
  stampPiece(g, 'nearArm.armor', CUIRASS_GUARD_N, guardAt(r, 'N', torso), guardAngle(CUIRASS_GUARD_N, torso, segAngle(r.shoulderN, r.elbowN)), 'upperArmN', leather);
}

/**
 * His drape in panels, cut down his leg lines (columns of PTERUGES_DRAPE, the legs as they cover it at
 * rest): the flap behind the near leg with the cloth under that leg (to column 29, his near leg's front
 * edge), the cloth between the legs (to column 33, where his far leg begins), and the cloth under the far
 * leg with the flap past it. Each lies on its thigh, or between both, down to its knee and hangs from
 * there (see drapeStamps).
 */
const DRAPE_PANELS: { x0: number; x1: number; on: Side | 'both' }[] = [
  { x0: 34, x1: 49, on: 'F' },
  { x0: 30, x1: 33, on: 'both' },
  { x0: 0, x1: 29, on: 'N' },
];
/** How much a panel follows its thigh swung forward (all of it: it lies on the thigh), and swung back. */
const DRAPE_FORWARD = 1;
const DRAPE_BACK = 0.3;
/** How much of the thigh's turn the cloth below the knee keeps (it hangs, nearly straight down). */
const DRAPE_HANG = 0.25;
/** The rows round the knee swept through the bend, so the cloth folds there without a gap. */
const DRAPE_FOLD = 2;
/** How many columns each panel reaches under its neighbours, so their seams never open. */
const DRAPE_SEAM = 1;

/** A piece of his drape where the skirt stamps it. */
export interface DrapeStamp {
  piece: PaintedPiece;
  at: Vec;
  deg: number;
  on: Side | 'both';
  name: 'upper' | 'lower' | 'fold' | 'sweep';
}

const DRAPE_CUTS = new Map<string, PaintedPiece>();
/** His drape's cells in columns x0..x1 and rows y0..y1, turned about the cell `pivot`. */
function drapeCut(x0: number, x1: number, y0: number, y1: number, pivot: [number, number]): PaintedPiece {
  const key = [x0, x1, y0, y1, ...pivot].join(',');
  let p = DRAPE_CUTS.get(key);
  if (!p) {
    const rows = PTERUGES_DRAPE.rows.map((row, y) => [...row].map((ch, x) => (x >= x0 && x <= x1 && y >= y0 && y <= y1 ? ch : '.')).join(''));
    DRAPE_CUTS.set(key, (p = { ...PTERUGES_DRAPE, rows, pivot }));
  }
  return p;
}

/**
 * The cloth on a thigh `extra` rows longer than the body's (the seated thighs, rig.ts kneeLeg): his rows
 * between the hip and the knee repeated, spread evenly (stretchPiece), so it still reaches the knee.
 */
function drapeUpper(x0: number, x1: number, y0: number, knee: number, pivot: [number, number], extra: number): PaintedPiece {
  const cut = drapeCut(x0, x1, y0, knee - 1, pivot);
  if (extra <= 0) return cut;
  const key = [x0, x1, y0, knee, ...pivot, extra].join(',');
  let p = DRAPE_CUTS.get(key);
  if (!p) DRAPE_CUTS.set(key, (p = { ...stretchPiece({ ...cut, angle: 90 }, extra, knee - pivot[1]), angle: cut.angle }));
  return p;
}

/** A point `d` fine pixels from the fine pixel `at`, turned `deg`: as design units at that pixel's middle. */
function turnedCell(at: [number, number], d: [number, number], deg: number): Vec {
  const t = (deg * Math.PI) / 180;
  const x = at[0] + Math.round(d[0] * Math.cos(t) - d[1] * Math.sin(t));
  const y = at[1] + Math.round(d[0] * Math.sin(t) + d[1] * Math.cos(t));
  return v((x + 0.5) / RES, (y + 0.5) / RES);
}

/**
 * His drape as the skirt's cloth, back to front (as Ren's skirt is): each panel hangs from the waist and
 * turns with its thigh about the hip (the cloth between the legs about the pelvis, halfway between both,
 * and swept from one thigh's turn to the other's so no gap opens down the seams) down to its knee, lying
 * on the thigh as it swings forward and only a little as it swings back, and below the knee hangs nearly
 * straight down from the knee, his rows round the knee swept through the fold between. Nothing trails
 * behind like a cape. Every piece is his pixels, turned whole; at rest every pixel is where he drew it.
 */
export function drapeStamps(r: Rig): DrapeStamp[] {
  const rest = drawRig('male', 'idle', 0);
  const home = drawRig(r.body, 'idle', 0);
  const P = PTERUGES_DRAPE;
  // the drape's first cell at rest (male idle)
  const ox = Math.floor(rest.pelvis.x * RES) - P.pivot[0];
  const oy = Math.floor(rest.pelvis.y * RES) - P.pivot[1];
  const cell = (p: Vec): [number, number] => [Math.floor(p.x * RES) - ox, Math.floor(p.y * RES) - oy];
  const knees = { N: cell(legJoints(rest, 'N').knee), F: cell(legJoints(rest, 'F').knee) };
  const thighTurn = (s: Side) => {
    const now = legJoints(r, s);
    const was = legJoints(home, s);
    const t = segAngle(now.hip, now.knee) - segAngle(was.hip, was.knee);
    const w = ((((t + 180) % 360) + 360) % 360) - 180;
    return w < 0 ? w * DRAPE_FORWARD : w * DRAPE_BACK;
  };
  /** How many fine pixels longer than the body's a thigh is (a seated thigh, rig.ts kneeLeg; else none). */
  const longer = (s: Side) => {
    const j = legJoints(r, s);
    return (len(sub(j.knee, j.hip)) - r.bp.thigh) * RES;
  };
  const out: DrapeStamp[] = [];
  const last = P.rows.length - 1;
  // knocked out, the cloth his fist hides stays under the body (it would stand up off the hip)
  const top = r.lay ? PTERUGES_DRAPE_FIST_ROWS : 0;
  const panel = (x0: number, x1: number, on: Side | 'both', turn: number, sweep = false): void => {
    // the panel turns about its hip (between the legs, about the pelvis), at our hip in this pose: his
    // hip's cell from our pelvis's, moved as far as our hip has moved about the pelvis since rest (so on
    // every body the panels keep his spacing, and at rest every cell is where it was drawn)
    const pivot: [number, number] = on === 'both' ? [P.pivot[0], P.pivot[1]] : cell(legJoints(rest, on).hip);
    const moved = on === 'both' ? v(0, 0) : sub(sub(legJoints(r, on).hip, r.pelvis), sub(legJoints(home, on).hip, home.pelvis));
    const at: [number, number] = [
      Math.floor(r.pelvis.x * RES) + pivot[0] - P.pivot[0] + Math.round(moved.x * RES),
      Math.floor(r.pelvis.y * RES) + pivot[1] - P.pivot[1] + Math.round(moved.y * RES),
    ];
    // where the thigh's cloth ends: on its knee (between the legs, halfway between both knees), as many rows
    // further as the thigh is longer than the body's (seated: rig.ts kneeLeg)
    const hinge: [number, number] = on === 'both' ? [Math.round((x0 + x1) / 2), Math.round((knees.N[1] + knees.F[1]) / 2)] : knees[on];
    const extra = Math.round(on === 'both' ? (longer('N') + longer('F')) / 2 : longer(on));
    const hingeAt = turnedCell(at, [hinge[0] - pivot[0], hinge[1] - pivot[1] + Math.max(0, extra)], turn);
    const hang = turn * DRAPE_HANG;
    const fold = hang - turn;
    // the rows round the knee swept through the fold (at least once, so no row opens between the thigh's
    // cloth and the cloth hanging from the knee); each panel reaches a column under its neighbours
    const n = Math.abs(fold) < 0.5 ? 0 : Math.max(2, Math.ceil(Math.abs(fold) / 5));
    const knee = hinge[1];
    const [c0, c1] = [x0 - DRAPE_SEAM, x1 + DRAPE_SEAM];
    for (let k = 1; k < n; k++) out.push({ piece: drapeCut(c0, c1, knee - DRAPE_FOLD, knee + DRAPE_FOLD - 1, hinge), at: hingeAt, deg: P.angle + turn + (fold * k) / n, on, name: sweep ? 'sweep' : 'fold' });
    out.push({ piece: drapeCut(c0, c1, knee - 1, last, hinge), at: hingeAt, deg: P.angle + hang, on, name: sweep ? 'sweep' : 'lower' });
    out.push({ piece: drapeUpper(c0, c1, top, knee, pivot, extra), at: v((at[0] + 0.5) / RES, (at[1] + 0.5) / RES), deg: P.angle + turn, on, name: sweep ? 'sweep' : 'upper' });
  };
  // The legs apart, the cloth between them is swept from one thigh's turn to the other's behind the
  // others, so it spans the gap between them as a skirt does (no gap opens down the seams).
  const [tN, tF] = [thighTurn('N'), thighTurn('F')];
  const mid = DRAPE_PANELS.find((p) => p.on === 'both')!;
  const m = Math.ceil(Math.abs(tN - tF) / 5);
  for (let k = 0; k <= m; k++) if (m > 0) panel(mid.x0, mid.x1, 'both', tF + ((tN - tF) * k) / m, true);
  for (const { x0, x1, on } of DRAPE_PANELS) panel(x0, x1, on, on === 'both' ? (tN + tF) / 2 : on === 'N' ? tN : tF);
  return out;
}

/** An empty cell of `L` walled in by its cloth (both sides and above and below, or three corners too): a hole. */
export function clothHole(L: Layer, x: number, y: number): boolean {
  const on = (a: number, b: number) => a >= 0 && b >= 0 && a < GRID && b < GRID && L.mat[b * GRID + a] >= 0;
  if (on(x, y)) return false;
  const across = on(x - 1, y) && (on(x + 1, y) || on(x + 2, y));
  const down = on(x, y - 1) && (on(x, y + 1) || on(x, y + 2));
  if (across && down) return true;
  return (across || down) && [on(x - 1, y - 1), on(x + 1, y - 1), on(x - 1, y + 1), on(x + 1, y + 1)].filter(Boolean).length >= 3;
}

/**
 * His drape's panels stamped into a layer of their own (drapeStamps). Where turning his pixels leaves a
 * cell open between them, the cloth above it (or beside it) continues into it, so nothing opens.
 */
export function drapeLayer(r: Rig, pal: TemplatePalette): Layer {
  const L = new Layer();
  for (const t of drapeStamps(r)) stampTemplate(L, t.piece, t.at, t.deg - PTERUGES_DRAPE.angle, pal, 'pelvis', { flags: F_NO_TEXTURE | F_NO_OUTLINE });
  for (let pass = 0; pass < 12; pass++) {
    const fill: [number, number][] = [];
    for (let i = 0; i < GRID * GRID; i++) if (clothHole(L, i % GRID, (i / GRID) | 0)) fill.push([i, L.mat[i - GRID] >= 0 ? i - GRID : L.mat[i - 1] >= 0 ? i - 1 : L.mat[i + 1] >= 0 ? i + 1 : i + GRID]);
    if (!fill.length) break;
    for (const [i, from] of fill) L.set(i % GRID, (i / GRID) | 0, L.mat[from], 3, 'pelvis', F_NO_TEXTURE | F_NO_OUTLINE);
  }
  return L;
}

/** A hole of at most this many cells near the skirt (SKIRT_NEAR) is a pinhole, closed wherever it is. */
const PINHOLE = 4;
const SKIRT_NEAR = 2;
/** How many columns either way the drape's top reaches over a hole beside it. */
const DRAPE_REACH = 2;
/** The widest slit between an arm and the strips, just above the drape, that is cloth behind the arm. */
const SLIT = 6;
/** How many rows above the drape's top (in its column or those beside, DRAPE_REACH) such a slit closes. */
const SLIT_ABOVE = 2;

/**
 * Where the background would show through the skirt: the cells nothing covers (`covered`) that cannot be
 * reached from outside the figure and lie within the drape's outline (its cloth on both sides in their row,
 * or its top above them in their column or the columns beside), or are left in a pinhole near the skirt
 * (`skirt`), and the nicks in its edge (a cell open to the outside with the skirt on three sides). Given the arms (`limbs`), a walled-in patch beside the skirt that no arm bounds (between the
 * strips, the legs and the drape) is closed whole, and one beside a hand below the hand's top, where his
 * fist hides the drape; a gap between an arm and the body above that stays open, as in his picture.
 */
export function skirtHoles(
  covered: (i: number) => boolean,
  drape: Layer,
  skirt: (i: number) => boolean,
  limbs?: { arm: (i: number) => boolean; hand: (i: number) => boolean },
  slits?: Set<number>,
): number[] {
  const N = GRID * GRID;
  const outside = new Uint8Array(N);
  const stack: number[] = [];
  const reach = (i: number) => {
    if (outside[i] || covered(i)) return;
    outside[i] = 1;
    stack.push(i);
  };
  const flood = (go: (i: number) => void) => {
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % GRID;
      if (x > 0) go(i - 1);
      if (x < GRID - 1) go(i + 1);
      if (i >= GRID) go(i - GRID);
      if (i < N - GRID) go(i + GRID);
    }
  };
  const around = (j: number, r: number, f: (i: number) => boolean) => {
    const x = j % GRID;
    const y = (j / GRID) | 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (x + dx >= 0 && x + dx < GRID && y + dy >= 0 && y + dy < GRID && f(j + dy * GRID + dx)) return true;
    return false;
  };
  for (let k = 0; k < GRID; k++) [k, N - GRID + k, k * GRID, k * GRID + GRID - 1].forEach(reach);
  flood(reach);
  const holes: number[] = [];
  for (let i = 0; i < N; i++) {
    if (!outside[i]) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    const sides = [x > 0 ? i - 1 : -1, x < GRID - 1 ? i + 1 : -1, y > 0 ? i - GRID : -1, y < GRID - 1 ? i + GRID : -1].filter((j) => j >= 0 && covered(j));
    if (sides.length >= 3 && sides.every(skirt)) holes.push(i);
  }
  // the drape's extent: each row's first and last cell, each column's first
  const left = new Int16Array(GRID).fill(GRID);
  const right = new Int16Array(GRID).fill(-1);
  const top = new Int16Array(GRID).fill(GRID);
  for (let i = 0; i < N; i++) {
    if (drape.mat[i] < 0) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    left[y] = Math.min(left[y], x);
    right[y] = Math.max(right[y], x);
    top[x] = Math.min(top[x], y);
  }
  const under = (x: number, y: number) => {
    for (let k = Math.max(0, x - DRAPE_REACH); k <= Math.min(GRID - 1, x + DRAPE_REACH); k++) if (y >= top[k]) return true;
    return false;
  };
  const done = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (done[i] || outside[i] || covered(i)) continue;
    // one walled-in patch at a time
    const patch: number[] = [];
    const take = (j: number) => {
      if (done[j] || outside[j] || covered(j)) return;
      done[j] = 1;
      patch.push(j);
      stack.push(j);
    };
    take(i);
    flood(take);
    const near = patch.some((j) => around(j, SKIRT_NEAR, skirt));
    const beside = patch.some((j) => around(j, 1, skirt));
    const whole = !!limbs && beside && !patch.some((j) => around(j, 1, limbs.arm));
    // the top of the hand beside the patch
    let hand = GRID;
    if (limbs && beside) {
      for (const j of patch) {
        const x = j % GRID;
        const y = (j / GRID) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx < GRID && y + dy >= 0 && y + dy < GRID && limbs.hand(j + dy * GRID + dx)) hand = Math.min(hand, y + dy);
      }
    }
    const rest: number[] = [];
    for (const j of patch) {
      const x = j % GRID;
      const y = (j / GRID) | 0;
      (whole || y > hand || (x > left[y] && x < right[y]) || under(x, y) ? holes : rest).push(j);
      // beside the hand, below its top: the cloth behind the fist (it takes his cloth below, as a slit does)
      if (y > hand && !whole) slits?.add(j);
    }
    if (near && rest.length <= PINHOLE) holes.push(...rest);
  }
  // The drape behind his fist ends on his slant up to the strips, as the owner asked; with an arm hanging
  // beside the strips (at rest our fist is a few pixels left of his) the slit left open between the arm and
  // the strips just above that slant is cloth behind the arm, as his bracer meets the strips in his picture.
  if (limbs) {
    const shut = new Set(holes);
    for (let y = 0; y < GRID; y++) {
      for (let x = 1; x < GRID - 1; x++) {
        const i = y * GRID + x;
        if (covered(i) || outside[i] || !covered(i - 1) || !limbs.arm(i - 1)) continue;
        // a run of open cells from the arm to the body beside it, its foot near the drape's top
        let b = x;
        while (b < GRID - 1 && b - x < SLIT && !covered(i + b + 1 - x)) b++;
        if (b - x + 1 > SLIT || b === GRID - 1 || limbs.arm(i + b + 1 - x)) continue;
        let low = false;
        for (let k = x; k <= b; k++) low ||= under(k, y + SLIT_ABOVE);
        if (!low) continue;
        for (let k = x; k <= b; k++) {
          if (shut.has(i + k - x)) continue;
          holes.push(i + k - x);
          slits?.add(i + k - x);
        }
      }
    }
  }
  return holes;
}

/**
 * Closes the skirt's holes (skirtHoles) once the whole figure is drawn: each takes the nearest cloth of the
 * drape straight below, above or beside it (his line where there is none), so his cloth goes on behind
 * whatever hides it, as his drape goes on behind his fist.
 */
function closeSkirtHoles(L: Layer, drape: Layer, lines: Set<number>, line: number, layers: ReadonlyMap<Depth, Layer>): void {
  // what the figure shows at each cell: covered, and by the skirt (his drape and strips are the pelvis's)
  const cover = new Uint8Array(GRID * GRID);
  const top = new Int16Array(GRID * GRID).fill(-1);
  for (const d of DEPTHS) {
    const l = layers.get(d);
    if (!l?.used) continue;
    for (let i = 0; i < GRID * GRID; i++) {
      if (l.mat[i] < 0) continue;
      cover[i] = 1;
      top[i] = l.part[i];
    }
  }
  const pelvis = partIndex('pelvis');
  const skirt = (i: number) => top[i] === pelvis;
  const arms = [...layers].filter(([d, l]) => l.used && /^(nearArm|farArm|farHand)\./.test(d)).map(([, l]) => l);
  const hands = new Set([partIndex('handN'), partIndex('handF')]);
  const limbs = { arm: (i: number) => arms.some((l) => l.mat[i] >= 0), hand: (i: number) => arms.some((l) => l.mat[i] >= 0 && hands.has(l.part[i])) };
  const cloth = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return -1;
    const m = drape.mat[y * GRID + x];
    return m >= 0 && !lines.has(m) ? m : -1;
  };
  // closing a hole can wall in a notch beside it: again until none is left
  for (let pass = 0; pass < 4; pass++) {
    const slits = new Set<number>();
    const holes = skirtHoles((i) => cover[i] === 1, drape, skirt, limbs, slits);
    if (!holes.length) break;
    for (const i of holes) {
      const x = i % GRID;
      const y = (i / GRID) | 0;
      // a nick in his line closes with his line; elsewhere the nearest of his cloth goes on into the hole
      // (the slit beside an arm takes his cloth below it, as the script continues his drape behind his fist)
      const nick = !slits.has(i) && [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => x + dx >= 0 && x + dx < GRID && y + dy >= 0 && y + dy < GRID && lines.has(L.mat[i + dy * GRID + dx]));
      let mat = line;
      for (let d = 1; slits.has(i) && d <= 16 && mat === line; d++) if (cloth(x, y + d) >= 0) mat = cloth(x, y + d);
      for (let d = 1; !nick && d <= 16 && mat === line; d++) {
        for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
          const m = cloth(x + dx * d, y + dy * d);
          if (m >= 0) {
            mat = m;
            break;
          }
        }
      }
      L.set(x, y, mat, 3, 'pelvis', F_NO_TEXTURE | F_NO_OUTLINE);
      cover[i] = 1;
      top[i] = pelvis;
    }
  }
}

/**
 * His red drape (capeBack), the skirt's cloth behind the legs, in panels on the thighs (drapeStamps).
 * It never goes into the ground: crouched or kneeling, the cloth that would reach below the soles lies on
 * the ground, so it ends on the ground line on his black line. Knocked out (drawn upright, then laid
 * down) only the cloth within a few pixels of the body's back is kept, with his line along the cut, as
 * the crimson cape does.
 */
function drawDrape(g: DrawCtx, color: (ch: string, hex: string) => string): void {
  const p = PTERUGES_DRAPE;
  const L = g.L('capeBack');
  const r = g.rig;
  const pal: TemplatePalette = {};
  for (const [ch, hex] of Object.entries(p.colors)) pal[ch] = [g.m(color(ch, hex), 'flat'), 3];
  const tmp = drapeLayer(r, pal);
  const hemY = GROUND * RES - 1;
  const back = new Map<number, number>();
  if (r.lay) {
    for (const d of ['torso.body', 'torso.under', 'nearLeg.body', 'farLeg.body'] as const) {
      const B = g.L(d);
      for (let i = 0; i < GRID * GRID; i++) {
        if (B.mat[i] < 0) continue;
        const y = (i / GRID) | 0;
        back.set(y, Math.min(back.get(y) ?? GRID, i % GRID));
      }
    }
  }
  const front = r.lay ? Math.floor(r.lay.groundX * RES) : GRID;
  const keep = (x: number, y: number) => (r.lay ? back.has(y) && x >= back.get(y)! - 3 && x < front : y <= hemY);
  // his darkest black, for the cuts (whatever order the script packs his colours in)
  const lum = (hex: string) => hexToRgb(hex).reduce((t, c, k) => t + c * [0.299, 0.587, 0.114][k], 0);
  const blacks = Object.keys(p.colors).filter((ch) => PTERUGES_KIND[p.colors[ch]] === 'line');
  const line = pal[blacks.reduce((a, b) => (lum(p.colors[b]) < lum(p.colors[a]) ? b : a))][0];
  for (let i = 0; i < GRID * GRID; i++) {
    if (tmp.mat[i] < 0) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    if (!keep(x, y)) continue;
    const cut = [i - 1, i + 1, i - GRID, i + GRID].some((q) => q >= 0 && q < GRID * GRID && tmp.mat[q] >= 0 && !keep(q % GRID, (q / GRID) | 0));
    L.set(x, y, cut ? line : tmp.mat[i], 3, 'pelvis', F_NO_TEXTURE | F_NO_OUTLINE);
  }
  const lines = new Set(blacks.map((ch) => pal[ch][0]));
  g.after((layers) => closeSkirtHoles(L, tmp, lines, line, layers));
}

/**
 * Draws his skirt: the red drapes behind the legs (when picked), and over the thighs the studded
 * leather strips with the red tunic between and under them, leaning with the torso. Red follows Tunic,
 * the strips' leather follows Strips and the grey studs follow Studs; his black line stays.
 */
function drawPteruges(g: DrawCtx, tc: string, lc: string, sc: string, drapes: boolean): void {
  const [tunic, strips, studs] = [tc, lc, sc].map(romanSlot);
  const r = g.rig;
  const torso = segAngle(r.pelvis, r.neck);
  const color = (_ch: string, hex: string): string => {
    const k = PTERUGES_KIND[hex];
    if (k === 'red') return retintHex(hex, PTERUGES_TUNIC, tunic);
    if (k === 'stud') return retintHex(hex, PTERUGES_STUD, studs);
    return k === 'line' || k === 'skin' || k === 'hair' ? hex : retintHex(hex, PTERUGES_LEATHER, strips);
  };
  if (drapes) drawDrape(g, color);
  stampLeaning(g, g.L('torso.over').used ? 'torso.over' : 'skirt', PTERUGES_FRONT, r.pelvis, torso, 'pelvis', color);
}

// ---------------------------------------------------------------------------
// The owner's Solen (docs/reference/solen-owner-reference.jpg, 2026-10-21: "es el nuevo estandar"): his
// steel cuirass and his studded skirt, his pixels lifted by tools/refs/solen-cuirass-from-ref.py and
// solen-skirt-from-ref.py. In our idle pose every pixel is his; in other poses each piece follows its segment.
// ---------------------------------------------------------------------------

/** His steel cuirass recoloured: his black line and gold buckle stay; his steel follows Steel, his red sash Sash, his brown strap Strap. */
const founderCuirassColor = (steel: string, sash: string, strap: string) => (_ch: string, hex: string): string => {
  const k = FOUNDER_CUIRASS_KIND[hex];
  if (k === 'line' || k === 'gold') return hex;
  if (k === 'red') return retintHex(hex, FOUNDER_SASH, sash);
  if (k === 'leather') return retintHex(hex, FOUNDER_STRAP, strap);
  return retintHex(hex, FOUNDER_STEEL, steel);
};

/** His chest for the bulky body: stretched as the bronze cuirass's is (see CUIRASS_CHEST_BULKY). */
const FOUNDER_CHEST_BULKY = stretched(FOUNDER_CHEST, 4, 5, 1);

/**
 * Draws his steel cuirass over the torso, leaning with it about the neck (his sash and strap are part of
 * it). The female bodies wear the Legion plate it was painted over (his art is a male chest), in its colours.
 */
function drawFounderCuirass(g: DrawCtx, steel: string, sash: string, strap: string): void {
  const r = g.rig;
  if (isFemaleBody(r.body)) {
    ARMOR_ITEMS.find((d) => d.id === 'armor_legion')!.draw(g, [steel, sash, '#c49a3a'], {});
    return;
  }
  clearUnderCuirass(g);
  stampLeaning(g, 'torso.armor', r.body === 'bulky' ? FOUNDER_CHEST_BULKY : FOUNDER_CHEST, r.neck, segAngle(r.pelvis, r.neck), 'torso', founderCuirassColor(steel, sash, strap), (hex) => FOUNDER_CUIRASS_KIND[hex] === 'line');
}

/** Draws his skirt over the thighs, leaning with the torso about the pelvis: red follows Tunic, the leather Strips, his gold studs Studs; his black line and grey studs stay. */
function drawFounderSkirt(g: DrawCtx, tunic: string, strips: string, studs: string): void {
  const r = g.rig;
  const color = (_ch: string, hex: string): string => {
    const k = FOUNDER_SKIRT_KIND[hex];
    if (k === 'red') return retintHex(hex, FOUNDER_SKIRT_TUNIC, tunic);
    if (k === 'gold') return retintHex(hex, FOUNDER_SKIRT_STUD, studs);
    return k === 'leather' ? retintHex(hex, FOUNDER_SKIRT_LEATHER, strips) : hex;
  };
  const depth = g.L('torso.over').used ? 'torso.over' : 'skirt';
  stampLeaning(g, depth, FOUNDER_SKIRT, r.pelvis, segAngle(r.pelvis, r.neck), 'pelvis', color, (hex) => FOUNDER_SKIRT_KIND[hex] === 'line');
  // turned with a leaning body, his strips can leave a pixel open between them at the hem (seal.ts)
  sealCloth(g, [depth], true);
}

// ---------------------------------------------------------------------------
// Armor
// ---------------------------------------------------------------------------

export const ARMOR_ITEMS: ItemDef[] = [
  {
    id: 'armor_none',
    slot: 'armor',
    name: 'No Armor',
    desc: 'Unarmored for maximum mobility.',
    colors: [],
    statsArmor: 'Ronin Wanderer Cloak',
    draw: () => {},
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_flak',
    slot: 'armor',
    name: 'Field Flak Vest',
    desc: 'Padded field vest with chest scroll pouches and a rolled collar (+2 AC).',
    colors: [col('main', 'Vest', '#5d7a3a'), col('pouch', 'Pouches', '#536e34')],
    statsArmor: 'Leaf Chunin Flak',
    draw: (g, [c, pc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const pen = armorPen(g, c);
      const pouch = armorPen(g, pc);
      const top = chestTop(g);
      const cx = 1.2;
      const side = cx - 2.2;
      const front = b.chestHalf * 0.62 + 2.1 + b.bust * 0.4;
      tfill(
        g,
        L,
        1.3,
        pen,
        (lx, ly, t) => {
          // quilted ribs on the side panel, which faces the light: a trough,
          // a shadowed underside, the puff, and a lit crest at its top
          if (lx < side && ly < top - 2.4 && ly > 2.6) {
            const q = mod(ly - 2.6, 2.2);
            if (q < FP) return 1;
            if (q > 2.2 - FP) return t < 0.45 ? 4 : 3;
            return q < FP * 2 ? 2 : 3;
          }
          if (Math.abs(lx - side) < FP * 0.5) return 1; // side seam
          if (Math.abs(lx - cx) < FP * 0.5) return 1; // front closure
          if (lx < cx - FP * 0.5 && lx > cx - FP * 1.5 && ly > 3) return 4; // closure crest
          const u = (lx - cx) / (front - cx);
          // hem: a padded roll (lit top, shadowed underside) under a seam
          if (ly < 1.0 + FP * 2) return u > 0.6 ? 1 : 2;
          if (ly < 1.0 + FP * 3) return lx < side ? 4 : u < 0 ? 3 : u < 0.6 ? 2 : 1;
          if (ly < 1.0 + FP * 4) return 1;
          if (ly > top - 0.2 - FP) return rim(lx < cx);
          if (lx > cx) {
            // front panel turning away from the light: a lit swell beside the
            // closure, shadow, then deep shadow at the edge
            if (u > 0.74) return 1;
            return u < 0.3 ? 3 : 2;
          }
          return lx > cx - 1.0 && ly < top - 3.4 ? 2 : 3;
        },
        { top: top - 0.2, bottom: 1.0 },
      );
      // padded shoulder yoke: a lit top, a puffed body and a seam that shadows the panel below
      tpoly(g, L, [[-b.shoulderHalf * 0.92, top - 0.3], [-1.2, top + 0.3], [-1.0, top - 2.0], [-b.shoulderHalf * 0.92, top - 2.6]], pen, (lx, ly) => {
        const bot = top - 2.0 - (lx + 1.0) * -0.06;
        if (ly - bot < FP && ly < top - 1.8) return 1;
        if (ly > top - FP * 1.2) return lx < -2.0 ? 4 : 3;
        if (ly - bot < FP * 2) return 2;
        return lx < -3.2 ? 3 : 2;
      });
      // scroll pouches on each side of the closure
      const fr = b.chestHalf * 0.62 + 0.5 + b.bust * 0.3;
      const ph = clamp(top * 0.28, 3, 4.2);
      const py = top - 5.4;
      const pouches: [number, number][] = [
        [cx + 0.8, fr],
        [cx - 3.4, cx - 0.7],
      ];
      pouches.forEach(([x0, x1], n) => {
        tpoly(g, L, [[x0, py], [x1, py], [x1, py - ph], [x0, py - ph]], pouch, (lx, ly) => {
          const fromTop = py - ly;
          const fromBot = ly - (py - ph);
          // the near pouch faces the light; the one on the front turns away
          const lit = n === 1;
          if (fromTop < FP) return lx < x0 + (x1 - x0) * 0.6 ? (lit ? 4 : 3) : lit ? 3 : 2; // flap rim
          if (fromTop < 1.1) return lx > x1 - FP ? 1 : lit || lx < (x0 + x1) / 2 ? 3 : 2; // flap
          if (fromTop < 1.1 + FP) return 1; // flap edge
          if (fromTop < 1.1 + FP * 2) return lit ? 2 : 1; // shadow under the flap
          if (lx > x1 - FP || fromBot < FP) return 1;
          if (lx < x0 + FP) return 3;
          return lit ? 3 : 2;
        });
        tpx(g, L, (x0 + x1) / 2, py - 0.6, pouch, 5); // snap
      });
      // rolled collar with the roll seam
      collar(g, pen, 2.2, 2.0);
      neckFold(g, g.rig.neck.y - 1.1, 0.12, 1);
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_shadowops',
    slot: 'armor',
    name: 'Shadow Ops Chestguard',
    desc: 'Segmented grey steel plates over a dark under-suit, one shoulder guard and forearm guards (+3 AC).',
    colors: [col('plate', 'Plates', '#8c94a1', 'metal'), col('suit', 'Under-suit', '#262833')],
    statsArmor: 'ANBU Spec-Ops',
    draw: (g, [pc, sc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const pl = armorPen(g, pc, 'metal');
      const suit = armorPen(g, sc);
      const top = chestTop(g);
      const cx = 1.2;
      const backX = -b.chestHalf * 0.55;
      const pTop = top - 0.6;
      const pBot = top - 6.8;
      const front = b.chestHalf * 0.62 + 1.9 + b.bust * 0.4;
      // under-suit: lit at the back, darker toward the front and under the chest plate
      tfill(g, L, 0.6, suit, (_lx, ly, t) => (Math.abs(ly - pBot + 0.3) < FP ? 1 : t < 0.3 ? 3 : t < 0.75 ? 2 : 1), { top: top + 0.2, bottom: 0.8 });
      // chest plate (front two-thirds): a lit back plane and a shadowed front
      // plane meeting at a sternum ridge
      tfill(
        g,
        L,
        1.1,
        pl,
        (lx, ly) => {
          const back = backX + (pTop - ly) * 0.15;
          if (lx < back) return null;
          if (ly > pTop - 1.2 && lx < -1.2) return null; // neck opening
          const vv = clamp((pTop - ly) / (pTop - pBot), 0, 1);
          if (ly - pBot < FP) return 1; // lower seam
          if (lx <= cx) {
            // lit plane: rolled rims, a diagonal sheen, a darker underside
            const u = clamp((lx - back) / (cx - back), 0, 1);
            if (pTop - ly < FP) return Math.abs(lx - (cx - 1.9)) < FP * 0.5 ? 5 : 4;
            if (lx - back < FP) return vv < 0.6 ? 4 : 3;
            if (cx - lx < FP) return vv < 0.72 ? 4 : 3; // ridge crest
            if (vv > 0.86) return 1;
            if (vv > 0.7) return 2;
            if (Math.abs(u * 0.7 + vv - 0.62) < 0.09) return 4;
            return u > 0.62 && vv > 0.5 ? 2 : 3;
          }
          // front plane turning away: shadow, deep shadow below, reflected light at the edge
          const u = clamp((lx - cx) / (front - cx), 0, 1);
          if (pTop - ly < FP) return u < 0.45 ? 3 : 2;
          if (vv > 0.66) return u > 0.84 && vv < 0.86 ? 2 : 1;
          if (u > 0.84) return 2;
          return u < 0.5 ? 2 : 1;
        },
        { top: pTop, bottom: pBot },
      );
      // segmented abdomen bands, bowed with the body; each has a lit top rim,
      // a darker lower half and a seam, and the chest plate shadows the first
      const aTop = pBot - 0.5;
      const aBot = 1.0;
      const na = Math.max(2, Math.round((aTop - aBot) / 2.2));
      const ah = (aTop - aBot) / na;
      const aBack = -b.waistHalf * 0.55;
      const aFront = b.waistHalf * 0.64 + 1.6;
      tfill(
        g,
        L,
        0.9,
        pl,
        (lx, ly) => {
          if (lx < aBack) return null;
          const u = clamp((lx - aBack) / (aFront - aBack), 0, 1);
          const yy = ly + 0.4 * (1 - (u * 2 - 1) ** 2) - aBot;
          const k = Math.floor(yy / ah);
          const d = yy - k * ah;
          if (d < FP) return 1;
          if (aTop - ly < FP * 1.5) return u < 0.5 ? 2 : 1; // shadow under the chest plate
          if (d > ah - FP) return Math.abs(lx - (aBack + 1.2)) < FP * 0.5 ? 5 : u < 0.32 ? 4 : u < 0.7 ? 3 : 2;
          if (lx - aBack < FP) return 3;
          const lower = d < ah * 0.5;
          if (u > 0.5) return lower ? 1 : 2;
          return lower ? 2 : 3;
        },
        { top: aTop, bottom: aBot },
      );
      // one shoulder guard (near side) and forearm guards
      pauldron(g, 'N', pl, { top: 2.4, capEnd: 1.0, step: 1.7, n: 2, half: b.armR[0] + 1.1, flare: 0.2, curve: 0.6 });
      bracer(g, pl, { from: 0.18, to: 0.88, grow: 0.5, lines: [0.52] });
      // dark high neck of the suit
      collar(g, suit, 2.6, 0.8);
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_legion',
    slot: 'armor',
    name: 'Legion Shinobi Plate',
    desc: 'Banded steel plate in the old legion style, layered shoulder segments and a cloth sash across the chest (+4 AC).',
    colors: [col('steel', 'Steel', '#8e98a6', 'metal'), col('sash', 'Sash', '#b3202a'), col('trim', 'Trim', '#c49a3a', 'metal')],
    statsArmor: 'Roman Legionary Segmentata',
    draw: (g, [stc, sac, trc]) => {
      const b = g.bp;
      const r = g.rig;
      const L = g.L('torso.armor');
      const steel = armorPen(g, stc, 'metal');
      const trim = armorPen(g, trc, 'metal');
      const sash = armorPen(g, sac);
      const top = chestTop(g);
      const cx = 1.2;
      const bandTop = top - 5.0;
      const bandBot = 0.8;
      // Few, broad hoops keep the plate calm instead of striped.
      const nb = Math.max(2, Math.round((bandTop - bandBot) / 2.7));
      const bh = (bandTop - bandBot) / nb;
      const hw = b.chestHalf;
      const glintX = -hw * 0.38;
      tfill(
        g,
        L,
        1.1,
        steel,
        (lx, ly, t) => {
          const lt = litT(t);
          if (ly < bandTop) {
            // girth hoops, curving with the body; a glint on the lit end of each rim
            const u = clamp((lx + 0.8) / hw, -1, 1);
            const yy = ly + 0.45 * (1 - u * u) - bandBot;
            const d = mod(yy, bh);
            if (d > bh - FP && Math.abs(lx - glintX) < FP * 0.75) return 5;
            return plate(d, bh, lt);
          }
          const dy = ly - bandTop;
          const cTop = top - 1.9;
          // breastplate: rim, body, darker lower half; collar plates above a seam
          if (dy < FP) return rim(lt);
          if (Math.abs(ly - cTop) < FP * 0.5) return 1;
          if (ly > cTop && ly < cTop + FP * 1.5) return rim(lt);
          if (ly > top - 0.2 - FP) return rim(lt);
          if (Math.abs(lx - cx) < FP * 0.5) return 1; // central hinge line
          if (lx < cx - FP * 0.5 && lx > cx - FP * 1.5 && ly < cTop) return dy > 2.2 && dy < 2.2 + FP * 1.2 ? 5 : 4; // crest + glint
          if (ly > cTop) return base(lt);
          return dy < (cTop - bandTop) * 0.45 ? (lt ? 2 : 1) : base(lt);
        },
        { top: top - 0.2, bottom: bandBot },
      );
      // gold closures at the front of every hoop, a steel rivet at the back
      for (let i = 0; i < nb; i++) {
        const y = bandBot + (i + 0.62) * bh;
        tstud(g, L, cx + 0.45, y, trim, 4);
        tstud(g, L, -hw * 0.62, y, steel, 4);
      }
      tstud(g, L, cx - 1.7, bandTop + 1.1, trim, 4);
      tstud(g, L, cx + 1.7, bandTop + 1.1, trim, 3);
      // sash across the chest: near shoulder down to the front hip, knotted
      stamp(g.L('torso.over'), (S) => {
        const p0: [number, number] = [-b.shoulderHalf * 0.75, top + 0.3];
        const p1: [number, number] = [b.waistHalf * 0.64 + 0.6, 2.4];
        const sw = 1.25;
        tband(g, S, p0, p1, sw, sash, (al, ac, dl) => {
          if (ac > sw - FP) return al < dl * 0.55 ? 4 : 3; // lit upper edge
          if (ac < -sw + FP * 2) return 1; // shadowed lower edge
          // one long trough with its crest, and a couple of diagonal pulls toward the knot
          if (Math.abs(ac + 0.2) < FP * 0.5) return 2;
          if (ac > -0.2 + FP * 0.5 && ac < -0.2 + FP * 1.5 && al < dl * 0.7) return 4;
          const pull = mod(al * 0.9 + ac * 1.6, 3.4);
          if (al > dl * 0.55 && pull < FP) return 2;
          return ac < -0.2 ? 2 : 3;
        });
        // knot and two short tails at the front hip
        const kp = r.T(p1[0] - 0.3, p1[1] + 0.3);
        ellipse(S, kp.x, kp.y, 1.6, 1.4, sash, (x, y) => {
          const dx = x + 0.5 - kp.x;
          const dy = y + 0.5 - kp.y;
          if (Math.abs(dx - dy * 0.4) < FP * 0.6) return 1;
          if (Math.hypot(dx + 0.7, dy + 0.6) < FP * 0.8) return 4;
          return clamp(lit(dx, dy), 1, 3);
        });
        const t0 = r.T(p1[0] + 0.2, p1[1] - 0.8);
        const t1 = r.T(p1[0] + 0.8, -1.4);
        capsule(S, t0, t1, 0.9, 1.2, sash, (x) => (x + 0.5 < (t0.x + t1.x) / 2 - 0.4 ? 3 : 2));
        capsule(S, r.T(p1[0] - 0.5, p1[1] - 0.7), r.T(p1[0] - 1.5, -0.6), 0.8, 1.0, sash, 2);
      });
      // shoulder lames with a gold rim on the last one
      for (const s of SIDES) pauldron(g, s, steel, { top: 2.6, capEnd: 0.6, step: 1.45, n: 3, half: b.armR[0] + 1.2, flare: 0.3, curve: 0.8, edge: trim });
      // red neck scarf
      collar(g, sash, 1.8, 1.0);
      neckFold(g, r.neck.y - 1.0, 0.25, 1);
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_lamellar',
    slot: 'armor',
    name: 'Ronin Lamellar Armor',
    desc: 'Rows of lacquered plates laced together, with broad square shoulder plates (+4 AC).',
    colors: [col('plate', 'Lacquer', '#b0242c'), col('lace', 'Laces', '#1d1c26'), col('trim', 'Trim', '#d0a63c', 'metal')],
    statsArmor: 'Samurai O-Yoroi',
    draw: (g, [pc, lc, tc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const pl = armorPen(g, pc);
      const lace = armorPen(g, lc);
      const trim = armorPen(g, tc, 'metal');
      const top = chestTop(g);
      const rows0 = 0.8;
      const rowsTop = top - 4.2;
      const rh = LAM_ROW;
      /**
       * One laced row as a shallow convex band: `m` the height above the
       * row's lace line, `tone` 1 facing the light .. 0 turned away.
       */
      const rowShade = (m: number, tone: number, glint = false) => {
        if (m > rh - FP) return glint ? 5 : tone > 0.3 ? 4 : tone > 0.12 ? 3 : 2; // lit top rim
        const lower = m < rh * 0.42;
        if (tone > 0.22) return lower ? 2 : 3;
        return lower ? 1 : 2;
      };
      const front = b.chestHalf * 0.62 + 2.0 + b.bust * 0.4;
      const glintX = -0.4;
      // laced plate rows; the board above shadows the first row
      tfill(
        g,
        L,
        1.2,
        pl,
        (lx, ly, t) => {
          const m = mod(ly - rows0, rh);
          if (m < FP) return laceCol(lx) ? null : 1;
          if (rowsTop - ly < FP) return t < 0.5 ? 2 : 1;
          const row = Math.floor((ly - rows0) / rh);
          const tone = lx > front - 1.0 ? 0 : 1 - t * 1.15;
          return rowShade(m, tone, row % 2 === 1 && Math.abs(lx - glintX) < FP * 0.5);
        },
        { top: rowsTop, bottom: rows0 },
      );
      tfill(g, L, 1.2, lace, (lx, ly, t) => (lamRow(ly - rows0, rh) === 'lace' && laceCol(lx) ? (t < 0.5 ? 3 : 2) : null), { top: rowsTop, bottom: rows0 });
      // breast plate (muna-ita): dark board with a gold rim and corner fittings
      tfill(
        g,
        L,
        1.2,
        lace,
        (lx, ly, t) => {
          if (ly > top - 0.2 - FP) return t < 0.5 ? 4 : 3;
          if (ly - rowsTop < FP * 3) return t < 0.4 ? 2 : 1;
          return lx > front - 1.0 ? 1 : t < 0.55 ? 3 : 2;
        },
        { top: top - 0.2, bottom: rowsTop + FP * 2 },
      );
      tfill(g, L, 1.2, trim, (lx, ly, t) => (ly - rowsTop < FP ? (t < 0.5 ? 2 : 1) : Math.abs(lx - glintX) < FP * 0.5 ? 5 : t < 0.45 ? 4 : t < 0.75 ? 3 : 2), { top: rowsTop + FP * 2, bottom: rowsTop });
      tstud(g, L, -b.chestHalf * 0.5, rowsTop + 1.4, trim, 4);
      tstud(g, L, b.chestHalf * 0.4, rowsTop + 1.4, trim, 3);
      // big rectangular shoulder plates (sode), hanging from the shoulder
      for (const s of SIDES) {
        const f = hangFrame(g, s, 0.55);
        const A = g.L(armDepth(s, 'armor'));
        const R = b.armR[0];
        const p = onLimb(pl, s, 'upperArm');
        const lp = onLimb(lace, s, 'upperArm');
        const tp = onLimb(trim, s, 'upperArm');
        const a0 = -2.0;
        const board = 1.3;
        const a1 = b.upperArm * 0.9;
        const bIn = -R - 0.5;
        const bOut = R + 1.9;
        const rect = (a: number, bb: number) => {
          const aa = a + bb * 0.12 - a0;
          return aa >= 0 && aa <= a1 - a0 && bb >= bIn && bb <= bOut ? aa : -1;
        };
        const bMid = (bIn + bOut) / 2;
        const bHalf = (bOut - bIn) / 2;
        lfill(A, f, p, R + 6, (a, bb) => {
          const aa = rect(a, bb);
          if (aa < board) return null;
          const m = mod(a1 - a0 - aa, rh);
          if (m < FP) return laceCol(bb) ? null : 1;
          if (aa < board + FP) return 1; // shadow under the top board
          const d = limbDot(f, bb - bMid, bHalf * 1.25, -0.3);
          return rowShade(m, d > 0.55 ? 1 : d > 0.25 ? 0.4 : 0);
        });
        lfill(A, f, lp, R + 6, (a, bb) => {
          const aa = rect(a, bb);
          if (aa < 0) return null;
          if (aa < FP) return limbLit(f, bb, bOut, -0.8) ? 4 : 3; // top board rim
          if (aa < board - FP) return limbLit(f, bb, bOut, -0.8) ? 3 : 2; // top board (kanmuri-ita)
          if (aa < board) return null;
          return lamRow(a1 - a0 - aa, rh) === 'lace' && laceCol(bb) ? (limbLit(f, bb, bOut) ? 3 : 2) : null;
        });
        lfill(A, f, tp, R + 6, (a, bb) => {
          const aa = rect(a, bb);
          return aa >= board - FP && aa < board ? (limbLit(f, bb, bOut, -0.5) ? 3 : 2) : null;
        });
      }
      collar(g, lace, 1.6, 1.0, trim);
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_leather',
    slot: 'armor',
    name: 'Ember Leather Armor',
    desc: 'Studded dark leather cuirass with layered shoulder guards, a wide belt, bracers and a flame engraving (+4 AC).',
    colors: [col('leather', 'Leather', '#4d3528', 'leather'), col('studs', 'Studs', '#a2a7ae', 'metal'), col('engrave', 'Engraving', '#c0502c')],
    statsArmor: 'Samurai O-Yoroi',
    draw: (g, [lc, sc, ec]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const lea = armorPen(g, lc, 'leather');
      const studP = armorPen(g, sc, 'metal');
      const eng = armorPen(g, ec);
      const top = chestTop(g);
      const cx = 1.2;
      const beltTop = 4.0;
      const plateBot = beltTop + 0.5;
      const pecY = top - 6.4;
      const front = b.chestHalf * 0.62 + 2.0 + b.bust * 0.4;
      /** Light on a molded pectoral dome (local x toward the front, y up); null outside it. */
      const pec = (lx: number, ly: number, px: number, rx: number): number | null => {
        const nx = (lx - px) / rx;
        const ny = (ly - (pecY + 1.5)) / (1.7 + b.bust * 0.3);
        if (nx * nx + ny * ny > 1) return null;
        return -0.75 * nx + 0.65 * ny;
      };
      tfill(
        g,
        L,
        1.2,
        lea,
        (lx, ly, t) => {
          const u = clamp((lx - cx) / (front - cx), 0, 1);
          if (ly < beltTop) {
            // wide belt: a worn lit top edge, a stitched line, a darker lower half
            if (beltTop - ly < FP) return t < 0.6 ? 4 : 3;
            if (ly < 1.0 + FP) return 1;
            if (Math.abs(ly - (beltTop - 0.7)) < FP * 0.5) return mod(Math.floor(lx * RES), 3) !== 0 ? (t < 0.6 ? 4 : 3) : 1;
            if (u > 0.8) return 1;
            return ly < 2.2 ? (t < 0.6 ? 2 : 1) : t < 0.6 ? 3 : 2;
          }
          if (ly < plateBot) return 1; // gap under the cuirass
          if (ly - plateBot < FP) return t < 0.55 ? 4 : 3; // worn lower edge
          if (Math.abs(lx - cx) < FP * 0.5) return 1; // front lacing seam
          if (lx < cx - FP * 0.5 && lx > cx - FP * 1.5 && ly > pecY - 1) return 4; // worn crest beside it
          if (ly > top - 0.2 - FP) return t < 0.55 ? 4 : 3; // worn top edge
          // molded chest: two pectoral domes with dark undercurves
          const near = pec(lx, ly, cx - 2.2, 2.5);
          if (near !== null) return near > 0.55 ? 4 : near > -0.25 ? 3 : near > -0.6 ? 2 : 1;
          const far = pec(lx, ly, cx + 2.1, 2.0);
          if (far !== null) return far > 0.6 ? 3 : far > -0.2 ? 2 : 1;
          if (ly < pecY + 1.5 && (pec(lx, ly + FP * 1.5, cx - 2.2, 2.5) !== null || pec(lx, ly + FP * 1.5, cx + 2.1, 2.0) !== null)) return 1;
          if (u > 0.8) return 1; // front edge turning away
          if (ly < pecY) return lx < cx ? (ly < pecY - 1.6 ? 3 : 2) : u < 0.4 ? 2 : 1; // abdomen
          return lx < cx ? 3 : 2;
        },
        { top: top - 0.2, bottom: 0.8 },
      );
      // buckle
      tpoly(g, L, [[cx - 0.4, beltTop - 0.5], [cx + 1.3, beltTop - 0.5], [cx + 1.3, 1.4], [cx - 0.4, 1.4]], studP, (lx, ly) => {
        if (lx > cx + 0.2 && lx < cx + 0.7 && ly > 2.0 && ly < beltTop - 1.1) return 1;
        return lx < cx ? 3 : 2;
      });
      tpx(g, L, cx - 0.1, beltTop - 0.8, studP, 5);
      // studs along the collar and the back edge
      for (let x = -b.chestHalf * 0.72; x < b.chestHalf * 0.5; x += 2.0) tstud(g, L, x, top - 2.3, studP, 4);
      for (let y = plateBot + 1.4; y < top - 3.5; y += 2.0) tstud(g, L, -b.waistHalf * 0.62, y, studP, 4);
      // flame engravings on the chest (original motif)
      const flame = [
        '....a...',
        '....aa..',
        '...ab...',
        '..aab.a.',
        '..abba..',
        '.aabbaa.',
        '.abbcba.',
        'aabccba.',
        '.abbbba.',
        '..abba..',
        '...aa...',
      ];
      const fk: Record<string, [Pen, number]> = { a: [eng, 1], b: [eng, 2], c: [eng, 3] };
      mask(L, g.rig.T(cx + 0.4, top - 2.9), flame, fk);
      tpx(g, L, cx + 1.9, top - 6.5, eng, 4);
      const small = ['..a..', '..ab.', '.abb.', 'abcb.', '.abb.', '..a..'];
      mask(L, g.rig.T(cx - 3.3, top - 3.7), small, fk);
      // layered shoulder plates with studs
      for (const s of SIDES) pauldron(g, s, lea, { top: 2.4, capEnd: 0.5, step: 1.5, n: 3, half: b.armR[0] + 1.1, flare: 0.3, curve: 0.8, rivet: studP });
      // forearm bracers with straps
      bracer(g, lea, { from: 0.15, to: 0.92, grow: 0.55, lines: [0.4, 0.68], rivet: studP });
      collar(g, lea, 1.9, 1.1);
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_desert',
    slot: 'armor',
    name: 'Desert Wrap Vest',
    desc: 'Sand-colored wrapped cloth vest with a diagonal leather strap (+2 AC).',
    colors: [col('wrap', 'Wraps', '#bfa57c'), col('strap', 'Strap', '#6b4a2b', 'leather')],
    statsArmor: 'Sand Wind Guard',
    draw: (g, [wc, sc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const wrap = armorPen(g, wc);
      const strap = armorPen(g, sc, 'leather');
      const buckle = armorPen(g, sc, 'metal');
      const top = chestTop(g);
      tfill(
        g,
        L,
        1.0,
        wrap,
        (lx, ly, t) => {
          // overlapping wraps, each a soft roll: a lit crest on its upper edge,
          // the body, a shadowed lower part and a dark trough where it tucks
          // under the next wrap; the torso turns from the light toward the front
          const W = 2.9;
          const d = mod(ly + lx * 0.42, W);
          const side = t < 0.42 ? 2 : t < 0.78 ? 1 : 0;
          if (d < FP) return 1;
          if (d > W - FP) return side === 2 ? 4 : side === 1 ? (t < 0.62 ? 4 : 3) : 3;
          if (ly < 1.2 + FP * 2) return side === 0 ? 1 : 2; // hem
          if (side === 0) return t > 0.9 || d < W * 0.4 ? 1 : 2;
          if (d < FP * 2) return 2;
          if (side === 2) return d > W - FP * 2 ? 4 : 3;
          return d < W * 0.45 ? 2 : 3;
        },
        { top: top - 0.3, bottom: 1.2 },
      );
      // strap from the far shoulder down to the near hip, with a pouch
      stamp(g.L('torso.over'), (S) => {
      const p0: [number, number] = [b.shoulderHalf * 0.5, top + 0.2];
      const p1: [number, number] = [-b.hipHalf * 0.8, 1.4];
      const sw = 1.0;
      // the strap runs down to the left, so its upper-left edge (negative ac) faces the light
      tband(g, S, p0, p1, sw, strap, (al, ac, dl) => (-ac > sw - FP ? (al < dl * 0.75 ? 4 : 3) : -ac < -sw + FP * 1.5 ? 1 : -ac > 0 ? 3 : 2));
      const m = lerp(v(p0[0], p0[1]), v(p1[0], p1[1]), 0.55);
      tpoly(g, S, [[m.x - 1.5, m.y + 1.2], [m.x + 1.5, m.y + 1.2], [m.x + 1.5, m.y - 1.8], [m.x - 1.5, m.y - 1.8]], strap, (lx, ly) => {
        if (m.y + 1.2 - ly < FP) return lx < m.x + 0.6 ? 4 : 3; // worn flap edge
        if (Math.abs(ly - (m.y + 0.1)) < FP * 0.5) return 1; // flap edge
        if (lx > m.x + 1.5 - FP || ly < m.y - 1.8 + FP) return 1;
        if (ly > m.y) return lx < m.x + 0.6 ? 3 : 2; // flap
        if (ly > m.y - FP * 1.5) return 1; // shadow under the flap
        return lx < m.x - 1.5 + FP ? 3 : 2;
      });
      tstud(g, S, m.x, m.y + 0.5, buckle, 5);
      });
      // loose cowl with folds
      collar(g, wrap, 2.1, 1.9);
      neckFold(g, g.rig.neck.y - 0.8, 0.35, 1);
      neckFold(g, g.rig.neck.y - 2.2, 0.35, 2);
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_storm',
    slot: 'armor',
    name: 'Storm Flak',
    desc: 'Heavy slate-grey flak vest with vertical quilting and a tall throat guard (+3 AC).',
    colors: [col('main', 'Vest', '#4a5563'), col('trim', 'Straps', '#9aa5b3', 'metal')],
    statsArmor: 'Mist Storm Vest',
    draw: (g, [c, tc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const pen = armorPen(g, c);
      const trim = armorPen(g, tc, 'metal');
      const top = chestTop(g);
      const cx = 1.2;
      const yoke = top - 2.6;
      tfill(
        g,
        L,
        1.6,
        pen,
        (lx, ly, t) => {
          if (Math.abs(ly - yoke) < FP * 0.5) return 1; // yoke seam
          if (ly > yoke) {
            // smooth yoke: lit top rim, a padded lower edge that catches the light
            if (ly > top - 0.2 - FP) return t < 0.6 ? 4 : 3;
            if (ly < yoke + FP * 1.5) return t < 0.45 ? 4 : t < 0.75 ? 3 : 2;
            return t < 0.5 ? 3 : t < 0.85 ? 2 : 1;
          }
          if (yoke - ly < FP * 1.5) return t < 0.5 ? 2 : 1; // shadow under the yoke
          if (ly < 2.7 && ly > 2.7 - FP) return t < 0.6 ? 2 : 1; // shadow under the waist strap
          // vertical quilted tubes: a trough, a lit crest on the tube's left
          // side, its body, and its right side turning into shadow
          const q = mod(lx + 0.4, 2.3);
          if (q < FP) return 1;
          if (q < FP * 2) return t < 0.45 ? 4 : t < 0.78 ? 3 : 2;
          if (q > 2.3 - FP * 2) return t < 0.86 ? 2 : 1;
          if (ly < 1.8) return 2;
          return t < 0.7 ? 3 : 2;
        },
        { top: top - 0.2, bottom: 0.8 },
      );
      // belly pouches: a lit flap, its edge shadowing the pouch, a darker body
      const fr = b.waistHalf * 0.64 + 1.6;
      for (const [x0, x1] of [
        [cx + 0.5, fr],
        [cx - 3.0, cx - 0.5],
      ] as const) {
        const lit = x1 < cx;
        tpoly(g, L, [[x0, 7.2], [x1, 7.2], [x1, 4.2], [x0, 4.2]], pen, (lx, ly) => {
          if (7.2 - ly < FP) return lit || lx < (x0 + x1) / 2 ? 4 : 3;
          if (Math.abs(ly - 6.1) < FP * 0.5 || lx > x1 - FP || ly < 4.2 + FP) return 1;
          if (ly > 6.1) return lit ? 3 : 2;
          if (ly > 6.1 - FP * 1.5) return lit ? 2 : 1;
          return lx < x0 + FP ? 3 : 2;
        });
        tpx(g, L, (x0 + x1) / 2, 6.6, trim, lit ? 5 : 4);
      }
      // waist strap with buckle: a lit top edge, a darker lower half
      const strapEnd = b.waistHalf * 0.64 + 1.4;
      tfill(
        g,
        L,
        1.7,
        trim,
        (lx, ly, t) => {
          if (3.6 - ly < FP) return Math.abs(lx - (cx - 3.2)) < FP * 0.5 ? 5 : t < 0.55 ? 4 : 3;
          if (ly < 2.7 + FP) return 1;
          return lx > strapEnd ? 1 : ly > 3.15 ? (t < 0.7 ? 3 : 2) : 2;
        },
        { top: 3.6, bottom: 2.7 },
      );
      tpoly(g, L, [[cx - 0.5, 3.9], [cx + 1.0, 3.9], [cx + 1.0, 2.4], [cx - 0.5, 2.4]], trim, (lx, ly) => (lx < cx && ly > 3.4 ? 5 : lx > cx + 0.6 || ly < 2.4 + FP ? 1 : lx < cx + 0.2 ? 3 : 2));
      // tall throat guard with ribs
      const r = g.rig;
      const N = g.L('neck');
      const topP = v(r.head.x - 0.6, r.head.y + 4.4);
      capsule(N, r.neck, topP, b.neckW + 2.0, b.neckW + 1.6, pen, (x) => (x + 0.5 < r.neck.x - 0.4 ? 3 : x + 0.5 < r.neck.x + 1.6 ? 2 : 1));
      // rolled ribs: a trough under each roll, a crest on its top, lit toward the left
      scan(r.neck.x - 6, topP.y - 4, r.neck.x + 6, r.neck.y + 2, (fx, fy, x, y) => {
        if (!N.has(fx, fy) || N.getShade(fx, fy) === 0) return;
        const d = mod(r.neck.y - y + (x - r.neck.x) * 0.1, 1.5);
        if (d < FP) N.reshade(fx, fy, x < r.neck.x - 0.4 ? 2 : 1);
        else if (d < FP * 2) N.reshade(fx, fy, x < r.neck.x ? 4 : x < r.neck.x + 1.6 ? 3 : 2);
      });
      // quilted shoulder pads
      for (const s of SIDES) pauldron(g, s, pen, { top: 2.4, capEnd: 1.2, step: 1.6, n: 1, half: b.armR[0] + 1.1, flare: 0.2, curve: 0.6 });
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_bronze',
    slot: 'armor',
    name: 'Bronze Cuirass',
    desc: 'Sculpted bronze muscle cuirass with leather shoulder guards (+4 AC).',
    colors: [col('bronze', 'Bronze', CUIRASS_BRONZE, 'metal'), col('strap', 'Straps', CUIRASS_LEATHER, 'leather')],
    statsArmor: 'Greek Hoplite Cuirass',
    draw: (g, [bc, sc]) => drawBronzeCuirass(g, bc, sc),
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_founder',
    slot: 'armor',
    name: "Founder's Segmentata",
    desc: 'Steel segmented cuirass with a red sash across the chest and a thin leather strap with a gold buckle, painted by the owner for Solen (+4 AC).',
    colors: [col('steel', 'Steel', FOUNDER_STEEL, 'metal'), col('sash', 'Sash', FOUNDER_SASH), col('strap', 'Strap', FOUNDER_STRAP, 'leather')],
    statsArmor: 'Roman Legionary Segmentata',
    draw: (g, [steel, sash, strap]) => drawFounderCuirass(g, steel, sash, strap),
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_wanderer',
    slot: 'armor',
    name: 'Wanderer Mantle',
    desc: 'Light half-mantle thrown over one shoulder and draped down the chest (+1 AC).',
    colors: [col('mantle', 'Mantle', '#c9b994'), col('trim', 'Trim & cord', '#8a2f2a')],
    statsArmor: 'Ronin Wanderer Cloak',
    draw: (g, [mc, cc]) => {
      const b = g.bp;
      const r = g.rig;
      const mantle = armorPen(g, mc);
      const trim = armorPen(g, cc);
      const top = chestTop(g);
      const fr = b.chestHalf * 0.62 + 1.4 + b.bust * 0.4;
      // front drape: from the near shoulder diagonally across the chest to a point at the front
      const L = g.L('torso.armor');
      const P: [number, number][] = [
        [-b.shoulderHalf * 0.95 - 0.8, top - 0.2],
        [-1.2, top + 1.0],
        [2.6, top + 0.6],
        [fr, top - 2.6],
        [fr + 0.3, top - 6.4],
        [fr - 0.9, top - 11.0],
        [-0.6, top - 7.4],
        [-b.chestHalf * 0.85, top - 4.0],
      ];
      const hem: [number, number][] = [P[4], P[5], P[6], P[7]];
      const segD = (x: number, y: number, a: [number, number], c: [number, number]) => {
        const dx = c[0] - a[0];
        const dy = c[1] - a[1];
        const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
      };
      const hemD = (x: number, y: number) => Math.min(segD(x, y, hem[0], hem[1]), segD(x, y, hem[1], hem[2]), segD(x, y, hem[2], hem[3]));
      tpoly(g, L, P, mantle, (lx, ly) => {
        // lit over the shoulder, turning away from the light toward the front point
        const tone = lx < -0.4 ? 2 : lx < 2.6 ? 1 : 0;
        if (ly > top - FP * 1.5 && lx < 2) return 4; // lit fold over the shoulder
        if (ly > top - FP * 2.5 && lx < 2) return 3;
        // folds falling from the near shoulder toward the front point: a dark
        // trough that widens toward the hem, with a lit crest above it
        if (ly < top - 1.0) {
          const W = 3.0;
          const f0 = mod(lx * 0.95 + ly, W);
          const s = f0 < W / 2 ? f0 : f0 - W;
          const tw = FP * (0.5 + 0.6 * clamp((top - 2 - ly) / 7, 0, 1));
          if (Math.abs(s) < tw) return 1;
          if (s >= tw && s < tw + FP) return tone === 0 ? 3 : 4;
          if (s <= -tw && s > -tw - FP) return tone === 2 ? 3 : 2; // the trough's softer lower side
        }
        if (hemD(lx, ly) < FP * 3.5) return tone === 2 ? 2 : 1; // shadow above the trim
        return tone === 2 ? 3 : tone === 1 ? (lx < 1.2 ? 3 : 2) : 2;
      });
      tpoly(g, L, P, trim, (lx, ly) => (hemD(lx, ly) < FP * 2.2 ? (hemD(lx, ly) > FP * 1.2 ? (lx < 0 ? 3 : 2) : 1) : null));
      // back hang (behind the body)
      const B = g.L('capeBack');
      const sh = -b.shoulderHalf * 0.9;
      tpoly(
        g,
        B,
        [
          [sh, top],
          [sh - 2.6, top - 4],
          [sh - 2.0, top - 10.0],
          [-b.shoulderHalf * 0.2, top - 8.0],
          [0, top - 1],
        ],
        { ...mantle, part: 'back', bias: -1 },
        (lx, ly) => (mod(lx * 0.9 + ly * 0.25, 2.4) < FP ? 1 : lx < sh - 1 ? 3 : 2),
      );
      // shoulder cape over the near arm (follows the arm part of the way)
      const f = hangFrame(g, 'N', 0.4);
      const A = g.L('nearArm.armor');
      const p = { ...mantle, part: 'upperArmN' as const };
      const tp = { ...trim, part: 'upperArmN' as const };
      const half = b.armR[0] + 1.2;
      const capH = 2.4;
      const hemA = (bb: number) => b.upperArm * 0.62 + 0.55 * Math.abs(Math.sin(bb * 1.3 + 0.4)) + bb * 0.12;
      const inCape = (a: number, bb: number) => {
        const hw = half + clamp(a, 0, 6) * 0.22;
        if (Math.abs(bb) > hw) return false;
        if (a < 0 && (a / capH) ** 2 + (bb / half) ** 2 > 1) return false;
        return a <= hemA(bb);
      };
      lfill(A, f, p, half + 4, (a, bb) => {
        if (!inCape(a, bb)) return null;
        if (hemA(bb) - a < FP * 2.2) return null;
        const hw = half + clamp(a, 0, 6) * 0.22;
        // rounded over the shoulder, hanging below it: lit on the outer side,
        // shadowed toward the body; folds deepen toward the hem
        const down = clamp(a / (b.upperArm * 0.62), 0, 1);
        const d = limbDot(f, bb, hw, a < 0 ? -0.3 - 1.1 * clamp(-a / capH, 0, 1) : 0.15 + 0.5 * down);
        const tw = FP * (0.55 + 0.5 * down);
        for (const f0b of [-1.3, 0.5, 2.1]) {
          const fb = f0b + a * 0.12 * Math.sign(f0b + 0.1);
          if (a > 0.4 && Math.abs(bb - fb) < tw) return d > 0.55 ? 2 : 1;
          if (a > 0.6 && bb - fb >= tw && bb - fb < tw + FP) return d > 0.2 ? 4 : 3; // crest beside the trough, toward the light
          if (a > 0.6 && fb - bb >= tw && fb - bb < tw + FP) return d > 0.3 ? 2 : 1; // the fold's shadowed side
        }
        if (a < -capH + FP * 1.5) return 4;
        return Math.min(a < 0.3 && d > 0.72 ? 4 : 3, dotShade(d));
      });
      lfill(A, f, tp, half + 4, (a, bb) => (inCape(a, bb) && hemA(bb) - a < FP * 2.2 ? (limbLit(f, bb, half) ? 3 : 2) : null));
      // knotted cord clasp with a short tassel
      const S = g.L('torso.over');
      const k = r.T(2.0, top - 1.6);
      capsule(S, add(k, v(0.1, 0.6)), add(k, v(0.5, 3.0)), 0.5, 0.7, trim, 2);
      ellipse(S, k.x, k.y, 1.15, 1.1, trim, (x, y) => clamp(lit(x + 0.5 - k.x, y + 0.5 - k.y), 1, 3));
      put(S, fine(k.x - 0.4), fine(k.y - 0.4), trim, 4);
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_dread',
    slot: 'armor',
    name: 'Dread Plate',
    desc: 'Blackened full plate with tiered pauldrons, gold rivets, a tall gorget and thigh guards (+5 AC).',
    colors: [col('plate', 'Plate', '#565a6b', 'metal'), col('trim', 'Gold', '#d0a12e', 'metal')],
    statsArmor: 'Dark Knight Plate',
    draw: (g, [pc, tc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const pl = armorPen(g, pc, 'metal');
      const gold = armorPen(g, tc, 'metal');
      const top = chestTop(g);
      const cx = 1.2;
      const breastBot = top - 7.2;
      const front = b.chestHalf * 0.62 + 2.1 + b.bust * 0.4;
      const back0 = -b.chestHalf * 0.86 - 1.3;
      tfill(
        g,
        L,
        1.3,
        pl,
        (lx, ly, t) => {
          if (ly < breastBot) {
            // plackart lames: lit rim (a glint at its lit end), darker lower
            // half, seam; the breastplate's rim shadows the first lame
            const h = 2.2;
            const d = mod(ly - 0.6, h);
            if (breastBot - ly < FP * 1.5) return t < 0.5 ? 2 : 1;
            if (d < FP) return 1;
            if (d > h - FP) return Math.abs(lx - (cx - 2.6)) < FP * 0.5 ? 5 : t < 0.5 ? 4 : t < 0.78 ? 3 : 2;
            const lower = d < h * 0.5;
            if (t > 0.8) return lower ? 1 : 2;
            if (t > 0.56) return 2;
            return lower ? 2 : 3;
          }
          const dy = ly - breastBot;
          if (dy < FP) return null; // gold rim drawn below
          if (ly > top - 0.2 - FP) return t < 0.55 ? 4 : 3; // top rim
          // breastplate: a lit plane and a shadowed front plane meeting at a ridge
          if (Math.abs(lx - cx) < FP * 0.5) return dy > 2.5 && dy < 2.5 + FP ? 5 : 4;
          const vv = clamp((top - ly) / (top - breastBot), 0, 1);
          if (lx > cx) {
            const u = (lx - cx) / (front - cx);
            if (u < 0.16) return 1; // the ridge's shadowed side
            return vv > 0.68 && u < 0.84 ? 1 : 2;
          }
          const u = clamp((lx - back0) / (cx - back0), 0, 1);
          if (vv > 0.8) return 2; // underside
          if (Math.abs(u * 0.6 + vv - 0.72) < 0.08) return 4; // sheen
          return u > 0.8 && vv > 0.45 ? 2 : 3;
        },
        { top: top - 0.2, bottom: 0.6 },
      );
      tfill(g, L, 1.3, gold, (_lx, _ly, t) => (litT(t) ? 3 : 2), { top: breastBot + FP, bottom: breastBot });
      // gold rivets
      tstud(g, L, cx - 3.0, breastBot + 1.2, gold, 4);
      tstud(g, L, cx + 2.4, breastBot + 1.2, gold, 3);
      tstud(g, L, cx - 3.0, 1.6, gold, 4);
      tstud(g, L, cx + 2.4, 1.6, gold, 3);
      tstud(g, L, -b.chestHalf * 0.62, top - 2.2, gold, 4);
      // tiered pauldrons with gold rims
      for (const s of SIDES) {
        pauldron(g, s, pl, { top: 3.4, capEnd: 0.8, step: 1.5, n: 3, half: b.armR[0] + 1.9, flare: 0.45, curve: 1.0, out: 0.9, edge: gold });
        const f = hangFrame(g, s, 0.55);
        stud(g.L(armDepth(s, 'armor')), add(f.o, add(scale(f.u, -1.0), scale(f.w, 0.9))), onLimb(gold, s, 'upperArm'), 4);
      }
      // vambraces with elbow cops
      bracer(g, pl, { from: 0.08, to: 0.92, grow: 0.7, rim: gold, lines: [0.5], cop: true });
      // thigh guards (tassets)
      for (const s of SIDES) {
        const A = g.L(legDepth(s, 'armor'));
        const f = legFrame(g, s, 0);
        const p = onLimb(pl, s, 'thigh');
        const gp = onLimb(gold, s, 'thigh');
        const R = b.legR[0] + 0.9;
        const end = f.len * 0.55;
        lfill(A, f, p, R + 2, (a, bb) => {
          if (a < -0.5 || a > end || Math.abs(bb) > R) return null;
          // overlapping bands down the thigh: lit top rim, rounded across the
          // leg, the lower part of each band turning under
          const d = mod(a + 0.5, 2.2);
          const ld = limbDot(f, bb, R, -0.7 + 1.5 * (d / 2.2));
          if (d > 2.2 - FP) return 1;
          if (d < FP) return ld > 0.3 ? 4 : ld > 0 ? 3 : 2;
          return Math.min(3, dotShade(ld));
        });
        lfill(A, f, gp, R + 2, (a, bb) => (a > end - FP && a <= end && Math.abs(bb) <= R ? (limbLit(f, bb, R) ? 3 : 2) : null));
        stud(A, add(f.o, add(scale(f.u, end * 0.45), scale(f.w, R * 0.35))), gp, 4);
      }
      collar(g, pl, 2.6, 1.6, gold);
    },
  },

  // -------------------------------------------------------------------------
  // Fitted armors for women (female body only)
  {
    id: 'armor_oath',
    slot: 'armor',
    name: 'Crimson Oath Raiment',
    desc: 'A fitted white battle dress with red trim, a silver breastplate shaped to the figure and a pleated skirt (+3 AC). Women only.',
    colors: [col('cloth', 'Dress', '#eeebe6'), col('trim', 'Trim', '#c8202c'), col('plate', 'Plate', '#c3c8d4', 'metal')],
    statsArmor: 'ANBU Spec-Ops',
    bodies: ['female'],
    draw: (g, [cc, tc, pc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const cloth = armorPen(g, cc, 'cloth');
      const trim = armorPen(g, tc, 'cloth');
      const plate = armorPen(g, pc, 'metal');
      const top = chestTop(g);
      const cx = 1.2;
      const plateTop = top - 1.5;
      const plateBot = top - 6.4 - b.bust * 0.45;
      const beltTop = 2.9;
      const beltBot = 1.8;
      // fitted bodice to the hips: lit toward the back, the front turning into
      // shadow, a soft fold under the breastplate, a red stripe down the front
      tfill(
        g,
        L,
        0.7,
        cloth,
        (lx, ly, t) => {
          if (ly < beltBot) return null;
          if (ly < beltTop) return null; // the belt is drawn in red below
          if (Math.abs(lx - (cx + 0.3)) < 0.55) return null; // front stripe
          if (plateBot - ly < FP * 1.2 && plateBot - ly > 0) return t < 0.6 ? 2 : 1; // shadow under the plate
          if (t > 0.86) return 2;
          return litT(t) ? 3 : 2;
        },
        { top: top - 0.2, bottom: beltBot },
      );
      tfill(g, L, 0.7, trim, (lx, ly, t) => (ly < beltTop && ly >= beltBot ? (beltTop - ly < FP ? (litT(t) ? 4 : 3) : litT(t) ? 3 : 2) : Math.abs(lx - (cx + 0.3)) < 0.55 && ly < plateBot ? (litT(t) ? 3 : 2) : null), {
        top: plateBot,
        bottom: beltBot,
      });
      // silver breastplate shaped to the bust: two rounded forms, a soft
      // center valley, a lit top rim and a dark lower edge
      const bumps: [number, number, number, number, number][] = [
        [cx - 2.4, plateBot + 2.0, 2.6, 2.2, 1.0 + b.bust * 0.35],
        [cx + 2.2, plateBot + 2.0, 2.0, 2.1, 0.9 + b.bust * 0.35],
      ];
      const h = (x: number, y: number) => {
        let sum = 0;
        for (const [bx, by, rx, ry, a] of bumps) sum += a * Math.exp(-(((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2) * 1.5);
        return sum;
      };
      const q = (d: number) => (d > 0.9 ? 5 : d > 0.62 ? 4 : d > 0.32 ? 3 : d > -0.12 ? 2 : 1);
      tfill(
        g,
        L,
        0.9,
        plate,
        (lx, ly, t) => {
          if (ly > plateTop || ly < plateBot) return null;
          if (ly - plateBot < FP * 1.5) return null; // red trim
          if (ly - plateBot < FP * 2.5) return 1;
          if (plateTop - ly < FP) return t < 0.55 ? 4 : 3;
          const th = (t - 0.36) * 2.0;
          const e = 0.2;
          const nx = Math.sin(th) - ((h(lx + e, ly) - h(lx - e, ly)) / (2 * e)) * 2.2;
          const ny = ((h(lx, ly + e) - h(lx, ly - e)) / (2 * e)) * 2.2;
          const nz = Math.cos(th) + 0.1;
          return q((nx * LIGHT3[0] + ny * LIGHT3[1] + nz * LIGHT3[2]) / (Math.hypot(nx, ny, nz) || 1));
        },
        { top: plateTop, bottom: plateBot },
      );
      // red trim along the plate's lower edge
      tfill(g, L, 0.9, trim, (_lx, ly, t) => (ly >= plateBot && ly - plateBot < FP * 1.5 ? (litT(t) ? 3 : 2) : null), { top: plateBot + FP * 1.5, bottom: plateBot });
      collar(g, cloth, 1.7, 0.9, trim);
      // long white sleeves with red cuffs
      for (const s of SIDES) {
        const A = g.L(armDepth(s, 'armor'));
        for (const seg of [0, 1] as const) {
          const f = armFrame(g, s, seg);
          const R = g.bp.armR;
          const p = onLimb(cloth, s, seg ? 'forearm' : 'upperArm');
          const tp = onLimb(trim, s, seg ? 'forearm' : 'upperArm');
          const rad = (a: number) => {
            const t = clamp(a / Math.max(0.01, f.len), 0, 1);
            return (seg ? forearmR(g, s, t) : R[0] + (R[1] - R[0]) * t) + 0.45;
          };
          lfill(A, f, p, R[0] + 1.5, (a, bb) => {
            if (a < (seg ? -0.6 : -1.2) || a > f.len + (seg ? -0.2 : 0.6)) return null;
            const rr = rad(a);
            if (Math.abs(bb) > rr) return null;
            if (seg && a > f.len - 1.4) return null; // cuff
            const d = limbDot(f, bb, rr, -0.2);
            return Math.min(3, dotShade(d));
          });
          if (seg)
            lfill(A, f, tp, R[2] + 1.5, (a, bb) => {
              if (a < f.len - 1.4 || a > f.len - 0.2) return null;
              const rr = rad(a) + 0.15;
              if (Math.abs(bb) > rr) return null;
              if (a - (f.len - 1.4) < FP) return limbLit(f, bb, rr) ? 4 : 3;
              return limbLit(f, bb, rr) ? 3 : 2;
            });
        }
      }
      // pleated white skirt to mid-thigh with a red hem
      skirt(g, (SL, stop) => {
        const [x0, x1] = hipRange(g, 0.7);
        const n = Math.max(6, Math.round((x1 - x0) / 1.9));
        const xs = spread(x0, x1, n);
        const cl = (w: number) => armorPen(g, cc, 'cloth', thighPart(w));
        const tr = (w: number) => armorPen(g, tc, 'cloth', thighPart(w));
        const k = 0.62;
        skirtCols(
          g,
          SL,
          cl,
          xs,
          stop(3.0),
          k,
          (c) => {
            const fromR = (1 - c.across) * c.cw;
            const fromL = c.across * c.cw;
            const fromBot = (1 - c.down) * c.ch;
            if (fromBot < FP * 3.2) return null; // red hem
            const tone = c.u < 0.4 ? 2 : c.u < 0.75 ? 1 : 0;
            if (fromR < FP) return 1;
            if (c.down < 0.08) return tone === 0 ? 1 : 2;
            if (fromL < FP) return tone === 0 ? 3 : 4;
            if (fromR < FP * 2.2) return tone === 0 ? 1 : 2;
            return tone === 0 ? 2 : 3;
          },
          1.0,
          0.12,
        );
        skirtCols(
          g,
          SL,
          tr,
          xs,
          stop(3.0),
          k,
          (c) => {
            const fromBot = (1 - c.down) * c.ch;
            if (fromBot >= FP * 3.2) return null;
            if (fromBot < FP) return 1;
            if (fromBot > FP * 2.2) return c.u < 0.55 ? 4 : 3; // lit upper edge of the band
            return c.u < 0.55 ? 3 : 2;
          },
          1.0,
          0.12,
        );
      });
    },
  },

  {
    id: 'armor_rose',
    slot: 'armor',
    name: 'Blue Rose Captain Dress',
    desc: 'A black corset dress with a frill of white lace at the neckline, gold lacing down the front and a pleated skirt (+3 AC). Women only.',
    colors: [col('cloth', 'Dress', '#1f1c26'), col('trim', 'Lace', '#ecebf2'), col('plate', 'Corset', '#26222f')],
    statsArmor: 'ANBU Spec-Ops',
    bodies: ['female'],
    draw: (g, [cc, tc, pc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const cloth = armorPen(g, cc, 'cloth');
      const trim = armorPen(g, tc, 'cloth');
      const plate = armorPen(g, pc, 'cloth');
      const top = chestTop(g);
      const cx = 1.2;
      const plateTop = top - 1.5;
      const plateBot = top - 6.4 - b.bust * 0.45;
      const beltTop = 2.9;
      const beltBot = 1.8;
      // fitted bodice to the hips: lit toward the back, the front turning into
      // shadow, a soft fold under the breastplate, a red stripe down the front
      tfill(
        g,
        L,
        0.7,
        cloth,
        (lx, ly, t) => {
          if (ly < beltBot) return null;
          if (ly < beltTop) return null; // the belt is drawn in red below
          if (plateBot - ly < FP * 1.2 && plateBot - ly > 0) return t < 0.6 ? 2 : 1; // shadow under the plate
          if (t > 0.86) return 2;
          return litT(t) ? 3 : 2;
        },
        { top: top - 0.2, bottom: beltBot },
      );
      tfill(g, L, 0.7, trim, (lx, ly, t) => (ly < beltTop && ly >= beltBot ? (beltTop - ly < FP ? (litT(t) ? 4 : 3) : litT(t) ? 3 : 2) : null), {
        top: plateBot,
        bottom: beltBot,
      });
      // corset shaped to the bust: two rounded forms, a soft
      // center valley, a lit top rim and a dark lower edge
      const bumps: [number, number, number, number, number][] = [
        [cx - 2.4, plateBot + 2.0, 2.6, 2.2, 1.0 + b.bust * 0.35],
        [cx + 2.2, plateBot + 2.0, 2.0, 2.1, 0.9 + b.bust * 0.35],
      ];
      const h = (x: number, y: number) => {
        let sum = 0;
        for (const [bx, by, rx, ry, a] of bumps) sum += a * Math.exp(-(((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2) * 1.5);
        return sum;
      };
      const q = (d: number) => (d > 0.9 ? 5 : d > 0.62 ? 4 : d > 0.32 ? 3 : d > -0.12 ? 2 : 1);
      tfill(
        g,
        L,
        0.9,
        plate,
        (lx, ly, t) => {
          if (ly > plateTop || ly < plateBot) return null;
          if (ly - plateBot < FP * 1.5) return null; // red trim
          if (ly - plateBot < FP * 2.5) return 1;
          if (plateTop - ly < FP * 2) return null; // lace frill
          const th = (t - 0.36) * 2.0;
          const e = 0.2;
          const nx = Math.sin(th) - ((h(lx + e, ly) - h(lx - e, ly)) / (2 * e)) * 2.2;
          const ny = ((h(lx, ly + e) - h(lx, ly - e)) / (2 * e)) * 2.2;
          const nz = Math.cos(th) + 0.1;
          return q((nx * LIGHT3[0] + ny * LIGHT3[1] + nz * LIGHT3[2]) / (Math.hypot(nx, ny, nz) || 1));
        },
        { top: plateTop, bottom: plateBot },
      );
      // white lace along the corset's lower edge
      tfill(g, L, 0.9, trim, (_lx, ly, t) => (ly >= plateBot && ly - plateBot < FP * 1.5 ? (litT(t) ? 3 : 2) : null), { top: plateBot + FP * 1.5, bottom: plateBot });
      // white lace frill along the neckline, scalloped
      tfill(g, L, 1.0, trim, (lx, ly, t) => {
        if (ly > plateTop + FP * 0.6 || ly < plateTop - FP * 2.4) return null;
        const sc = Math.floor((lx + 20) / (FP * 3)) % 2;
        if (plateTop - ly > FP * 1.4 && sc) return null;
        return plateTop - ly < FP ? (litT(t) ? 5 : 4) : litT(t) ? 4 : 3;
      }, { top: plateTop + FP, bottom: plateTop - FP * 2.5 });
      collar(g, cloth, 1.7, 0.9, trim);
      // long black sleeves with white lace cuffs
      for (const s of SIDES) {
        const A = g.L(armDepth(s, 'armor'));
        for (const seg of [0, 1] as const) {
          const f = armFrame(g, s, seg);
          const R = g.bp.armR;
          const p = onLimb(cloth, s, seg ? 'forearm' : 'upperArm');
          const tp = onLimb(trim, s, seg ? 'forearm' : 'upperArm');
          const rad = (a: number) => {
            const t = clamp(a / Math.max(0.01, f.len), 0, 1);
            return (seg ? forearmR(g, s, t) : R[0] + (R[1] - R[0]) * t) + 0.45;
          };
          lfill(A, f, p, R[0] + 1.5, (a, bb) => {
            if (a < (seg ? -0.6 : -1.2) || a > f.len + (seg ? -0.2 : 0.6)) return null;
            const rr = rad(a);
            if (Math.abs(bb) > rr) return null;
            if (seg && a > f.len - 1.4) return null; // cuff
            const d = limbDot(f, bb, rr, -0.2);
            return Math.min(3, dotShade(d));
          });
          if (seg)
            lfill(A, f, tp, R[2] + 1.5, (a, bb) => {
              if (a < f.len - 1.4 || a > f.len - 0.2) return null;
              const rr = rad(a) + 0.15;
              if (Math.abs(bb) > rr) return null;
              if (a - (f.len - 1.4) < FP) return limbLit(f, bb, rr) ? 4 : 3;
              return limbLit(f, bb, rr) ? 3 : 2;
            });
        }
      }
      // pleated black skirt to mid-thigh with a white lace hem
      skirt(g, (SL, stop) => {
        const [x0, x1] = hipRange(g, 0.7);
        const n = Math.max(6, Math.round((x1 - x0) / 1.9));
        const xs = spread(x0, x1, n);
        const cl = (w: number) => armorPen(g, cc, 'cloth', thighPart(w));
        const tr = (w: number) => armorPen(g, tc, 'cloth', thighPart(w));
        const k = 0.62;
        skirtCols(
          g,
          SL,
          cl,
          xs,
          stop(3.0),
          k,
          (c) => {
            const fromR = (1 - c.across) * c.cw;
            const fromL = c.across * c.cw;
            const fromBot = (1 - c.down) * c.ch;
            if (fromBot < FP * 3.2) return null; // red hem
            const tone = c.u < 0.4 ? 2 : c.u < 0.75 ? 1 : 0;
            if (fromR < FP) return 1;
            if (c.down < 0.08) return tone === 0 ? 1 : 2;
            if (fromL < FP) return tone === 0 ? 3 : 4;
            if (fromR < FP * 2.2) return tone === 0 ? 1 : 2;
            return tone === 0 ? 2 : 3;
          },
          1.0,
          0.12,
        );
        skirtCols(
          g,
          SL,
          tr,
          xs,
          stop(3.0),
          k,
          (c) => {
            const fromBot = (1 - c.down) * c.ch;
            if (fromBot >= FP * 3.2) return null;
            if (fromBot < FP) return 1;
            if (fromBot > FP * 2.2) return c.u < 0.55 ? 4 : 3; // lit upper edge of the band
            return c.u < 0.55 ? 3 : 2;
          },
          1.0,
          0.12,
        );
      });
    },
  },

  {
    id: 'armor_lionheart',
    slot: 'armor',
    name: 'Lionheart Battle Dress',
    desc: 'A royal blue battle dress under silver plate with gold trim: shaped breastplate, plated faulds, gauntlets and greaves (+4 AC). Women only.',
    colors: [col('dress', 'Dress', '#2a4aa6'), col('plate', 'Plate', '#c9cdd8', 'metal'), col('trim', 'Gold', '#d4a531', 'metal')],
    statsArmor: 'Greek Hoplite Cuirass',
    bodies: ['female'],
    draw: (g, [dc, pc, gc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const dress = armorPen(g, dc, 'cloth');
      const plate = armorPen(g, pc, 'metal');
      const gold = armorPen(g, gc, 'metal');
      const top = chestTop(g);
      const cx = 1.2;
      const plateTop = top - 2.4;
      const plateBot = 2.4;
      // blue bodice (shows at the shoulders and around the plate)
      tfill(g, L, 0.7, dress, (_lx, ly, t) => (ly < plateBot ? null : t > 0.86 ? 2 : litT(t) ? 3 : 2), { top: top - 0.2, bottom: plateBot });
      // silver cuirass shaped to the bust and waist, with gold edges and a
      // gold line down the middle
      const bumps: [number, number, number, number, number][] = [
        [cx - 2.4, top - 5.0 - b.bust * 0.3, 2.6, 2.2, 1.0 + b.bust * 0.35],
        [cx + 2.2, top - 5.0 - b.bust * 0.3, 2.0, 2.1, 0.9 + b.bust * 0.35],
      ];
      const h = (x: number, y: number) => {
        let sum = 0;
        for (const [bx, by, rx, ry, a] of bumps) sum += a * Math.exp(-(((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2) * 1.5);
        return sum;
      };
      const q = (d: number) => (d > 0.9 ? 5 : d > 0.62 ? 4 : d > 0.32 ? 3 : d > -0.12 ? 2 : 1);
      const goldAt = (lx: number, ly: number) =>
        plateTop - ly < FP * 1.5 || ly - plateBot < FP * 1.5 || (Math.abs(lx - cx) < FP * 0.6 && ly < plateTop - 1.2);
      tfill(
        g,
        L,
        0.95,
        plate,
        (lx, ly, t) => {
          if (ly > plateTop || ly < plateBot) return null;
          if (goldAt(lx, ly)) return null;
          const th = (t - 0.36) * 2.0;
          const e = 0.2;
          const nx = Math.sin(th) - ((h(lx + e, ly) - h(lx - e, ly)) / (2 * e)) * 2.2;
          const ny = ((h(lx, ly + e) - h(lx, ly - e)) / (2 * e)) * 2.2 - (ly < 5 ? (5 - ly) * 0.25 : 0);
          const nz = Math.cos(th) + 0.1;
          return q((nx * LIGHT3[0] + ny * LIGHT3[1] + nz * LIGHT3[2]) / (Math.hypot(nx, ny, nz) || 1));
        },
        { top: plateTop, bottom: plateBot },
      );
      tfill(g, L, 0.95, gold, (lx, ly, t) => (ly <= plateTop && ly >= plateBot && goldAt(lx, ly) ? (plateTop - ly < FP * 0.8 ? (litT(t) ? 4 : 3) : litT(t) ? 3 : 2) : null), {
        top: plateTop,
        bottom: plateBot,
      });
      collar(g, dress, 2.0, 1.1, gold);
      // small rounded shoulder caps, blue puffed sleeves, gauntlets
      for (const s of SIDES) pauldron(g, s, plate, { top: 2.0, capEnd: 0.6, step: 1.1, n: 1, half: b.armR[0] + 1.0, flare: 0.2, curve: 0.6, out: 0.5, edge: gold });
      for (const s of SIDES) {
        const A = g.L(armDepth(s, 'cloth'));
        const f = armFrame(g, s, 0);
        const p = onLimb(dress, s, 'upperArm');
        const R = b.armR[0] + 0.7;
        lfill(A, f, p, R + 1, (a, bb) => {
          if (a < 0 || a > f.len + 0.4 || Math.abs(bb) > R) return null;
          return Math.min(3, dotShade(limbDot(f, bb, R, -0.3)));
        });
      }
      bracer(g, plate, { from: 0.06, to: 0.97, grow: 0.65, rim: gold, lines: [0.42] });
      // greaves below the dress
      for (const s of SIDES) {
        const A = g.L(legDepth(s, 'armor'));
        const f = legFrame(g, s, 1);
        const p = onLimb(plate, s, 'shin');
        const gp = onLimb(gold, s, 'shin');
        const R = b.legR[2] + 0.6;
        lfill(A, f, p, R + 2, (a, bb) => {
          if (a < -0.3 || a > f.len * 0.92 || Math.abs(bb) > R) return null;
          if (a < 0.6) return null; // gold knee rim
          const d = limbDot(f, bb, R, -0.1);
          if (d > 0.3 && Math.abs(bb + R * 0.35) < FP * 0.5) return 4;
          return Math.min(3, dotShade(d));
        });
        lfill(A, f, gp, R + 2, (a, bb) => (a >= -0.3 && a < 0.6 && Math.abs(bb) <= R + 0.2 ? (limbLit(f, bb, R) ? 4 : 2) : null));
      }
      // long dress to mid-shin, then plated faulds over the hips
      skirt(g, (SL, stop) => {
        const [x0, x1] = hipRange(g, 0.5);
        const xs = spread(x0, x1, 10);
        const width = x1 - x0;
        const dr = (w: number) => armorPen(g, dc, 'cloth', thighPart(w));
        skirtCols(
          g,
          SL,
          dr,
          xs,
          stop(3.0),
          1.55,
          (c) => {
            const fromBot = (1 - c.down) * c.ch;
            if (fromBot < FP) return 1;
            if (fromBot < FP * 2) return c.u < 0.5 ? 2 : 1;
            return folds(c.u, c.down, width, [0.2, 0.42, 0.63, 0.82], c.u < 0.5 ? 3 : 2);
          },
          0.9,
          0.1,
        );
        const fp = (w: number) => armorPen(g, pc, 'metal', thighPart(w));
        const gpn = (w: number) => armorPen(g, gc, 'metal', thighPart(w));
        const fx = spread(x0 + 0.2, x1 - 0.2, 4);
        for (const [k, edge] of [
          [0.34, true],
          [0.2, true],
        ] as const) {
          skirtCols(
            g,
            SL,
            fp,
            fx,
            stop(3.0),
            k,
            (c) => {
              const fromBot = (1 - c.down) * c.ch;
              const fromR = (1 - c.across) * c.cw;
              if (edge && fromBot < FP * 1.5) return null;
              if (fromR < FP) return 1;
              const lt = c.u < 0.5;
              if (c.across * c.cw < FP) return lt ? 4 : 3;
              return c.down < 0.25 ? (lt ? 3 : 2) : lt ? 3 : 2;
            },
            0.6,
            0.1,
          );
          skirtCols(g, SL, gpn, fx, stop(3.0), k, (c) => ((1 - c.down) * c.ch < FP * 1.5 ? (c.u < 0.5 ? 4 : 3) : null), 0.6, 0.1);
        }
      });
    },
  },
  // -------------------------------------------------------------------------
  // Plate armors for women, at the standard of the men's plate (female body
  // only)
  {
    id: 'armor_seraph',
    slot: 'armor',
    name: 'Seraph Paladin Plate',
    desc: 'Light paladin plate in white steel and red enamel: a breastplate shaped to the figure, slender pauldrons and vambraces, short faulds over a pleated skirt, and greaves (+4 AC). Women only.',
    colors: [col('plate', 'Plate', '#cdd3de', 'metal'), col('trim', 'Enamel', '#c8202c'), col('cloth', 'Cloth', '#f3efe6')],
    statsArmor: 'Greek Hoplite Cuirass',
    bodies: ['female'],
    draw: (g, [pc, tc, cc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const pl = armorPen(g, pc, 'metal');
      const red = armorPen(g, tc, 'cloth');
      const cloth = armorPen(g, cc, 'cloth');
      const top = chestTop(g);
      const breastBot = top - 6.6 - b.bust * 0.4;
      // white padded doublet showing at the shoulders and the arms
      tfill(g, L, 0.6, cloth, (_lx, ly, t) => (ly < 1.6 ? null : t > 0.86 ? 2 : litT(t) ? 3 : 2), { top: top - 0.2, bottom: 1.6 });
      sleeves(g, cloth);
      // the breastplate, red enamel along its neckline and its lower edge
      fittedPlate(g, L, pl, { top: top - 1.0, bot: breastBot, inflate: 0.7, rimTop: red, rimBot: red });
      // the waist shows between plate and faulds: the white doublet cinched by a slim red sash
      tfill(g, L, 0.35, red, (_lx, ly, t) => (ly > 3.9 || ly < 2.4 ? null : 3.9 - ly < FP ? (litT(t) ? 4 : 3) : ly - 2.4 < FP ? 1 : litT(t) ? 3 : 2), { top: 3.9, bottom: 2.4 });
      tstud(g, L, 1.3, 3.15, pl, 4);
      collar(g, pl, 1.3, 0.75, red);
      for (const s of SIDES) {
        pauldron(g, s, pl, { top: 1.8, capEnd: 0.5, step: 1.0, n: 2, half: b.armR[0] + 0.7, flare: 0.15, curve: 0.6, out: 0.35, edge: red });
        const f = hangFrame(g, s, 0.55);
        stud(g.L(armDepth(s, 'armor')), add(f.o, add(scale(f.u, -0.8), scale(f.w, 0.6))), onLimb(pl, s, 'upperArm'), 4);
      }
      bracer(g, pl, { from: 0.16, to: 0.95, grow: 0.35, rim: red, lines: [0.58], cop: true });
      greaves(g, pl, { from: 0.18, to: 0.94, grow: 0.35, rim: red });
      // pleated white skirt with a red hem, two rows of short faulds over it
      skirt(g, (SL, stop) => {
        const [x0, x1] = hipRange(g, 0.35);
        const n = Math.max(6, Math.round((x1 - x0) / 1.9));
        const xs = spread(x0, x1, n);
        const cl = (w: number) => armorPen(g, cc, 'cloth', thighPart(w));
        const rd = (w: number) => armorPen(g, tc, 'cloth', thighPart(w));
        const k = 0.6;
        skirtCols(
          g,
          SL,
          cl,
          xs,
          stop(3.0),
          k,
          (c) => {
            const fromR = (1 - c.across) * c.cw;
            const fromBot = (1 - c.down) * c.ch;
            if (fromBot < FP * 2.4) return null;
            const tone = c.u < 0.4 ? 2 : c.u < 0.75 ? 1 : 0;
            if (fromR < FP) return 1;
            if (c.across * c.cw < FP) return tone === 0 ? 3 : 4;
            if (fromR < FP * 2.2) return tone === 0 ? 1 : 2;
            return tone === 0 ? 2 : 3;
          },
          1.0,
          0.06,
        );
        skirtCols(g, SL, rd, xs, stop(3.0), k, (c) => ((1 - c.down) * c.ch < FP * 2.4 ? ((1 - c.down) * c.ch < FP ? 1 : c.u < 0.55 ? 3 : 2) : null), 1.0, 0.06);
        plateRows(g, SL, pc, pc, x0 + 0.3, x1 - 0.2, stop(3.0), [0.27], 4);
      });
    },
  },

  {
    id: 'armor_lioness',
    slot: 'armor',
    name: 'Lioness Knight Plate',
    desc: 'Knightly full plate over a royal blue gown: a sculpted gilded cuirass, tiered pauldrons, vambraces with couters, plated tassets and greaves (+5 AC). Women only.',
    colors: [col('plate', 'Plate', '#c9cdd8', 'metal'), col('gold', 'Gold', '#d4a531', 'metal'), col('gown', 'Gown', '#2a4aa6')],
    statsArmor: 'Dark Knight Plate',
    bodies: ['female'],
    draw: (g, [pc, gc, dc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const pl = armorPen(g, pc, 'metal');
      const gold = armorPen(g, gc, 'metal');
      const gown = armorPen(g, dc, 'cloth');
      const top = chestTop(g);
      // the gown's bodice and sleeves under the plate
      tfill(g, L, 0.6, gown, (_lx, ly, t) => (ly < 1.6 ? null : t > 0.86 ? 2 : litT(t) ? 3 : 2), { top: top - 0.2, bottom: 1.6 });
      sleeves(g, gown, 0.55);
      // a full cuirass to the waist, gilded at its edges, down the middle and under the bust
      fittedPlate(g, L, pl, { top: top - 1.6, bot: 3.0, inflate: 0.75, rimTop: gold, center: gold, under: gold });
      tstud(g, L, -b.chestHalf * 0.55, top - 2.8, gold, 4);
      tstud(g, L, 1.1 + 2.6, 4.4, gold, 3);
      // faulds: two lames over the hips, each with a gold edge
      waistLames(g, L, pl, 3.0, 1.2, 2, undefined, 0.55);
      collar(g, pl, 2.2, 1.25, gold);
      for (const s of SIDES) {
        pauldron(g, s, pl, { top: 2.3, capEnd: 0.6, step: 1.15, n: 2, half: b.armR[0] + 1.0, flare: 0.22, curve: 0.75, out: 0.45, edge: gold, rivet: gold });
      }
      bracer(g, pl, { from: 0.08, to: 0.97, grow: 0.5, rim: gold, lines: [0.48], cop: true });
      greaves(g, pl, { from: 0.14, to: 0.96, grow: 0.45, rim: gold });
      // the blue gown to mid-shin, three rows of tassets over it
      skirt(g, (SL, stop) => {
        const [x0, x1] = hipRange(g, 0.35);
        const xs = spread(x0, x1, 10);
        const width = x1 - x0;
        const gw = (w: number) => armorPen(g, dc, 'cloth', thighPart(w));
        skirtCols(
          g,
          SL,
          gw,
          xs,
          stop(3.0),
          1.5,
          (c) => {
            const fromBot = (1 - c.down) * c.ch;
            if (fromBot < FP) return 1;
            if (fromBot < FP * 2) return c.u < 0.5 ? 2 : 1;
            return folds(c.u, c.down, width, [0.2, 0.42, 0.63, 0.82], c.u < 0.5 ? 3 : 2);
          },
          0.9,
          0.06,
        );
        plateRows(g, SL, pc, gc, x0 + 0.6, x1 - 0.4, stop(3.0), [0.46, 0.28], 4);
      });
    },
  },

  // -------------------------------------------------------------------------
  // The owner's plate, his pixels (2026-10-21: his Aiden is the standard for characters)
  {
    id: 'armor_crimson_plate',
    slot: 'armor',
    name: 'Crimson Knight Plate',
    desc: 'Full plate in steel trimmed with gold over a navy under-suit: a gorget with a gold chain, a ridged breastplate, a brown belt, a gold-edged tasset, pauldrons, elbow cops, vambraces, knee cops and greaves (+5 AC).',
    colors: [col('steel', 'Steel', PLATE_STEEL, 'metal'), col('trim', 'Trim', PLATE_GOLD, 'metal')],
    statsArmor: 'Dark Knight Plate',
    draw: (g, [steel, trim]) => drawCrimsonPlate(g, steel, trim),
  },
  // The owner's Aurelia's dress bodice and sleeves (2026-10-21), her picture at our scale
  ARMOR_DAWN_VESTMENT,
  // Lyra's corset, pauldron and bracers, the owner's pixels (items/lyraUpper.ts)
  LYRA_CORSET_ITEM,
];

// ---------------------------------------------------------------------------
// Skirts
// ---------------------------------------------------------------------------

export const SKIRT_ITEMS: ItemDef[] = [
  {
    id: 'skirt_imperial',
    slot: 'skirt',
    name: 'Imperial War Skirt',
    desc: 'Studded leather strips (pteruges) over a red tunic, with long red drapes falling behind the legs.',
    colors: [col('tunic', 'Tunic', PTERUGES_TUNIC), col('strips', 'Strips', PTERUGES_LEATHER, 'leather'), col('studs', 'Studs', PTERUGES_STUD, 'metal')],
    parts: [
      {
        key: 'drapes',
        label: 'Drapes',
        options: [
          { id: 'on', label: 'Drapes', desc: 'Long red drapes behind the legs.' },
          { id: 'off', label: 'No drapes', desc: 'Only the strips and the tunic.' },
        ],
      },
    ],
    draw: (g, [tc, lc, sc], parts) => drawPteruges(g, tc, lc, sc, parts.drapes !== 'off'),
  },
  {
    id: 'skirt_founder',
    slot: 'skirt',
    name: "Founder's War Skirt",
    desc: 'A leather belt and studded brown leather strips, each ending in a gold stud, over a red tunic: painted by the owner for Solen.',
    colors: [col('tunic', 'Tunic', FOUNDER_SKIRT_TUNIC), col('strips', 'Strips', FOUNDER_SKIRT_LEATHER, 'leather'), col('studs', 'Studs', FOUNDER_SKIRT_STUD, 'metal')],
    draw: (g, [tc, lc, sc]) => drawFounderSkirt(g, tc, lc, sc),
  },

  {
    id: 'skirt_apron',
    slot: 'skirt',
    name: 'Battle Apron',
    desc: 'Navy cloth wrap with long panels hanging front and back to the knees.',
    colors: [col('cloth', 'Cloth', '#2f4a86'), col('band', 'Wrap & trim', '#6278aa')],
    draw: (g, [cc, bc]) => {
      skirt(g, (L, top) => {
        const b = g.bp;
        const cloth = (w: number) => armorPen(g, cc, 'cloth', thighPart(w));
        const trimP = (w: number) => armorPen(g, bc, 'cloth', thighPart(w));
        const [x0, x1] = hipRange(g, 0.3);
        const k = 1.0;
        /** Border band along the sides and hem of a panel. */
        const border = (c: Cell, last: number) => {
          const fromBot = (1 - c.down) * c.ch;
          return fromBot < FP * 2.5 || (c.i === 0 && c.across * c.cw < FP * 2) || (c.i === last && (1 - c.across) * c.cw < FP * 2);
        };
        // front panel (over the front of the far leg), hanging straight from
        // the split between the legs: lit toward the back, turning into
        // shadow toward the front, soft folds, shadowed under the wrap band
        const fx = spread(SPLIT_X - 0.45, x1, 3);
        const fw = x1 - SPLIT_X + 0.45;
        skirtCols(
          g,
          L,
          cloth,
          fx,
          top(3),
          k,
          (c) => {
            if (c.down < 0.07) return c.u < 0.5 ? 2 : 1;
            const tone = c.u < 0.4 ? 3 : c.u < 0.8 ? 2 : 1;
            return folds(c.u, c.down, fw, [0.3, 0.58, 0.82], tone, 0.62);
          },
          1.2,
        );
        skirtCols(
          g,
          L,
          trimP,
          fx,
          top(3),
          k,
          (c) => {
            if (!border(c, 2)) return null;
            const fromBot = (1 - c.down) * c.ch;
            if (fromBot < FP) return 1;
            if (fromBot < FP * 2.5 && fromBot >= FP * 1.5) return c.u < 0.4 ? 4 : c.u < 0.8 ? 3 : 2; // lit top of the hem border
            return c.u < 0.4 ? 3 : 2;
          },
          1.2,
        );
        // back panel (behind the near leg)
        const B = g.L('farLeg.armor');
        const bx = spread(x0 - 0.2, SPLIT_X - 0.6, 3);
        const bw = SPLIT_X - 0.4 - x0;
        skirtCols(g, B, (w) => armorPen(g, cc, 'cloth', thighPart(w), -1), bx, 3, k, (c) => (c.down < 0.07 ? 2 : folds(c.u, c.down, bw, [0.45], c.u < 0.5 ? 3 : 2, 0.6)), 0.4);
        skirtCols(g, B, (w) => armorPen(g, bc, 'cloth', thighPart(w), -1), bx, 3, k, (c) => (border(c, 2) ? ((1 - c.down) * c.ch < FP ? 1 : 3) : null), 0.4);
        // slim wrap band with a knot at the front hip
        const band = armorPen(g, bc);
        const wy = top(3.4);
        waistband(g, L, band, x0, x1, wy, wy - 1.3);
        const kp = g.rig.T(x1 - 1.0, wy - 1.4);
        capsule(L, kp, add(kp, v(0.8, 3.6)), 0.8, 1.05, band, (x, y) => (y + 0.5 > kp.y + 3.0 ? 1 : x + 0.5 < kp.x + 0.4 ? 3 : 2));
        capsule(L, kp, add(kp, v(-0.6, 3.0)), 0.7, 0.9, band, (x) => (x + 0.5 < kp.x - 0.5 ? 2 : 1));
        ellipse(L, kp.x, kp.y, 1.25, 1.15, band, (x, y) => clamp(lit(x + 0.5 - kp.x, y + 0.5 - kp.y), 1, 3));
        put(L, fine(kp.x - 0.4), fine(kp.y - 0.4), band, 4);
      }, ['farLeg.armor']);
    },
  },

  {
    id: 'skirt_tassets',
    slot: 'skirt',
    name: 'Lamellar Tassets',
    desc: 'Laced lacquered plate panels hanging over the thighs.',
    colors: [col('plate', 'Lacquer', '#b0242c'), col('lace', 'Laces', '#1d1c26')],
    draw: (g, [pc, lc]) => {
      skirt(g, (L, top) => {
        const [x0, x1] = hipRange(g, 0.5);
        const pl = (w: number) => armorPen(g, pc, 'cloth', thighPart(w));
        const lace = (w: number) => armorPen(g, lc, 'cloth', thighPart(w));
        const k = 0.78;
        const rh = LAM_ROW;
        // one panel over each thigh, split between the legs
        const groups = [spread(x0, SPLIT_X - 0.35, 1), spread(SPLIT_X + 0.35, x1, 1)];
        /** Height above the panel's bottom edge, or null outside the plates. */
        const rowOf = (c: Cell) => (1 - c.down) * c.ch - FP;
        groups.forEach((xs, gi) => {
          // the near leg's panels face the light, the far leg's turn away
          const tone = (c: Cell) => (gi === 0 ? (c.across < 0.75 ? 1 : 0.4) : c.across < 0.45 ? 0.4 : 0);
          skirtCols(
            g,
            L,
            pl,
            xs,
            top(3.0),
            k,
            (c) => {
              const d = rowOf(c);
              if (d < 0) return 1; // bottom edge
              const m = mod(d, rh);
              const t = tone(c);
              if (m < FP) return laceCol(c.across * c.cw) ? null : 1; // lace row
              if (c.down < 0.08) return t > 0.5 ? 2 : 1; // shadow under the cord band
              if (m > rh - FP) return t > 0.2 ? 4 : 2; // lit rim of each row
              const lower = m < rh * 0.42;
              if (t > 0.2) return lower ? 2 : 3;
              return lower ? 1 : 2;
            },
            1.0,
          );
          skirtCols(g, L, lace, xs, top(3.0), k, (c) => (rowOf(c) >= 0 && mod(rowOf(c), rh) < FP && laceCol(c.across * c.cw) ? (tone(c) > 0.5 ? 3 : 2) : null), 1.0);
        });
        // slim cord band tying the panels to the waist
        const wy = top(3.4);
        waistband(g, L, armorPen(g, lc, 'cloth'), x0, x1, wy, wy - 1.2);
      });
    },
  },

  {
    id: 'skirt_kilt',
    slot: 'skirt',
    name: 'Pleated Kilt',
    desc: 'Simple pleated cloth skirt with a waistband.',
    colors: [col('cloth', 'Cloth', '#3c5a8a'), col('band', 'Band', '#2a2f3d', 'leather')],
    draw: (g, [cc, bc]) => {
      skirt(g, (L, top) => {
        const [x0, x1] = hipRange(g, 0.4);
        // a few broad knife pleats (not thin stripes), hanging straight
        const n = Math.max(5, Math.round((x1 - x0) / 2.2));
        const xs = spread(x0, x1, n);
        let splitI = 1;
        for (let i = 1; i < n; i++) if (Math.abs(xs[i] - SPLIT_X) < Math.abs(xs[splitI] - SPLIT_X)) splitI = i;
        const cloth = (w: number) => armorPen(g, cc, 'cloth', thighPart(w));
        skirtCols(
          g,
          L,
          cloth,
          xs,
          top(3.0),
          0.72,
          (c) => {
            // each pleat: a lit fold edge, the pleat face, a shadowed underfold
            // and a crease; the crease between the legs opens toward the hem
            const tone = c.u < 0.4 ? 2 : c.u < 0.75 ? 1 : 0;
            const fromL = c.across * c.cw;
            const fromR = (1 - c.across) * c.cw;
            const fromBot = (1 - c.down) * c.ch;
            if (fromBot < FP) return 1;
            if (fromR < FP * (c.i + 1 === splitI && c.down > 0.4 ? 1 + (c.down - 0.4) * 2.5 : 1)) return 1;
            if (c.down < 0.08) return tone === 0 ? 1 : 2; // shadow under the band
            if (fromL < FP) return tone === 0 ? 3 : 4;
            if (fromR < FP * 2.5) return tone === 0 ? 1 : 2;
            if (fromBot < FP * 2) return tone === 2 ? 2 : 1; // hem turning under
            return tone === 0 ? 2 : 3;
          },
          1.0,
        );
        const wy = top(3.3);
        waistband(g, L, armorPen(g, bc, 'leather'), x0, x1, wy, wy - 1.2);
      });
    },
  },
  // Aurelia, the owner's fourth heroine (aureliaLower.ts)
  SKIRT_DAWN_PANELS,
  GILDED_TABARD,
];
