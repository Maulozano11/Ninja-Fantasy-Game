// Capes, cloaks and long scarves. The part behind the body goes in
// `capeBack`; anything that drapes over the near shoulder or the chest goes in
// `capeFront` (in front of the head and torso, behind the near arm).
// Every shape hangs from the rig's shoulders and is pushed by a little "wind"
// that depends on the pose, so capes trail behind in attacks and sway in idle.

import { hexToRgb, retintHex } from '../color';
import type { Depth, DrawCtx, ItemDef } from '../ctx';
import { add, capsule, cylShade, ellipse, F_NO_OUTLINE, F_NO_TEXTURE, fine, GRID, len, lerp, Layer, norm, PartId, Pen, perp, poly, px, RES, scale, seam, sub, v, Vec } from '../raster';
import { GROUND } from '../rig';
import { sealCloth } from '../seal';
import { OWNER_CAPE_BACK, OWNER_CAPE_FRONT, OWNER_CAPE_PLATE, OWNER_CAPE_SHOULDER, PaintedPart } from './capeArt';
import { FOUNDER_CAPE, FOUNDER_CAPE_CLOTH, FOUNDER_CAPE_KIND, FOUNDER_CAPE_REST } from './founderCapeArt';
import { CRIMSON_CAPE_BACK, CRIMSON_CAPE_BASE, CRIMSON_CAPE_EDGE, CRIMSON_CAPE_FAR, CRIMSON_CAPE_LINE, CRIMSON_CAPE_NEAR } from './crimsonCapeArt';
import { TRAVELER_BACK, TRAVELER_BROWN, TRAVELER_HOOD, TRAVELER_REST, TRAVELER_SHOULDER, TRAVELER_SLOT } from './travelerCapeArt';

const col = (key: string, label: string, def: string, kind: 'cloth' | 'leather' | 'metal' = 'cloth') => ({ key, label, default: def, kind });

export interface Wind {
  /** Horizontal push of the hem (negative = trails to the left / behind). */
  dx: number;
  /** How much the hem rises (flies up) in pixels. */
  lift: number;
  /** Small alternating flutter, -1..1. */
  wave: number;
}

const TRAIN_WIND: Wind[] = [
  { dx: -1, lift: 0, wave: 0 },
  { dx: -2, lift: 1, wave: 1 },
  { dx: -7, lift: 4, wave: 0 },
  { dx: -6, lift: 4, wave: 1 },
  { dx: -2, lift: 1, wave: 0 },
  { dx: -6, lift: 3, wave: -1 },
  { dx: -3, lift: 2, wave: 1 },
  { dx: -1, lift: 0, wave: 0 },
];

/** Throw: coiled, rising, swung back by the throw, then flung out behind by the leap of the release and its follow-through. */
const THROW_WIND: Wind[] = [
  { dx: -2, lift: 1, wave: 0 },
  { dx: -3, lift: 1, wave: 1 },
  { dx: -6, lift: 3, wave: 0 },
  { dx: -9, lift: 6, wave: 1 },
  { dx: -10, lift: 7, wave: 0 },
];

/** Pierce: still in the guard and the chamber, streaming back on the lunge and its hold, settling on the recoil. */
const PIERCE_WIND: Wind[] = [
  { dx: -1, lift: 0, wave: 0 },
  { dx: -1, lift: 0, wave: 1 },
  { dx: -9, lift: 6, wave: 0 },
  { dx: -8, lift: 5, wave: 1 },
  { dx: -4, lift: 2, wave: 0 },
];

/** Pose-dependent wind so capes trail in attacks and sway in idle. */
export function capeWind(g: DrawCtx): Wind {
  const f = g.rig.frame;
  switch (g.rig.pose) {
    case 'attack':
      return f % 3 === 0 ? { dx: -2, lift: 1, wave: 1 } : f % 3 === 1 ? { dx: -9, lift: 7, wave: 0 } : { dx: -7, lift: 5, wave: 1 };
    case 'throw':
      return THROW_WIND[f % THROW_WIND.length];
    case 'pierce':
      return PIERCE_WIND[f % PIERCE_WIND.length];
    case 'hurt':
      return { dx: -6, lift: 4, wave: f % 2 ? 1 : 0 };
    case 'charge':
      return { dx: -4, lift: 3, wave: f % 2 ? 1 : -1 };
    case 'cast':
      return { dx: -3, lift: 1, wave: f % 2 };
    case 'handsigns':
      return { dx: -1, lift: 0, wave: f % 2 };
    case 'victory':
      return { dx: -3, lift: 2, wave: f % 2 ? 1 : 0 };
    // Moving: the cloth trails behind, flapping with the steps.
    case 'walk':
      return { dx: -2, lift: 0.5, wave: [0, 1, 1, 0, 0, -1, -1, 0][f % 8] };
    case 'run':
      return { dx: -8, lift: 5, wave: [1, 0, -1, 1, 0, -1][f % 6] };
    case 'sneak':
      return { dx: -1.5, lift: 0, wave: [0, 1, 0, 0, -1, 0][f % 6] };
    case 'crouch':
      return { dx: -1, lift: 0, wave: 0 };
    // Training: the cloth flies back on the cuts, strikes and kicks, and settles in the guards.
    case 'train':
    case 'trainPole':
    case 'trainFist':
      return TRAIN_WIND[f % 8];
    default:
      return { dx: 0, lift: 0, wave: [0, 0, -1, -1][f % 4] };
  }
}

/** Breathing-aware torso point for the shoulder line. */
function topPt(g: DrawCtx) {
  const T = g.rig.T;
  const dy = g.rig.neck.y - T(0.6, g.bp.torsoLen).y;
  return (x: number, y: number) => add(T(x, y), v(0, dy));
}

const bandShade = (minX: number, maxX: number, lit = 0.18, mid = 0.62, deep = 2) => (x: number) => {
  const t = (x + 0.5 - minX) / Math.max(1, maxX - minX);
  return t < lit ? 4 : t < mid ? 3 : t < deep ? 2 : 1;
};

/** True if fine pixel (x, y) of the layer holds material `mat`. */
const ownPixel = (L: Layer, mat: number, x: number, y: number) => L.has(x, y) && L.mat[y * GRID + x] === mat;

/**
 * A fold: a 1-fine-pixel dark crease with a lit ridge on its left (only over
 * pixels of `mat`). `ridge` is the ridge width in fine pixels.
 */
function fold(L: Layer, mat: number, a: Vec, b: Vec, dark = -1, lit = 1, ridge = 2): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * RES));
  let lx = -999;
  let ly = -999;
  for (let i = 0; i <= steps; i++) {
    const p = lerp(a, b, i / steps);
    const x = fine(p.x);
    const y = fine(p.y);
    if (x === lx && y === ly) continue;
    lx = x;
    ly = y;
    if (ownPixel(L, mat, x, y) && L.getShade(x, y) > 0) L.reshade(x, y, Math.max(1, L.getShade(x, y) + dark));
    if (!lit) continue;
    for (let k = 1; k <= ridge; k++) {
      if (ownPixel(L, mat, x - k, y) && L.getShade(x - k, y) > 0) L.reshade(x - k, y, Math.min(5, L.getShade(x - k, y) + lit));
    }
  }
}

/**
 * Re-shades pixels of `mat` along a quadratic curve a→c→b by `delta`, `width`
 * fine pixels wide (extending to the left of the curve, toward the light).
 * The band thins out over the last `taper` fraction... (0 = constant width).
 */
function curveFold(L: Layer, mat: number, a: Vec, c: Vec, b: Vec, delta: number, width: number, taper = 0): void {
  const steps = Math.max(2, Math.ceil((len(sub(c, a)) + len(sub(b, c))) * RES * 1.5));
  let lx = -999;
  let ly = -999;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = lerp(lerp(a, c, t), lerp(c, b, t), t);
    const x = fine(p.x);
    const y = fine(p.y);
    if (x === lx && y === ly) continue;
    lx = x;
    ly = y;
    const wNow = Math.max(1, Math.round(width * (1 - taper * Math.abs(t - 0.5) * 2)));
    for (let k = 0; k < wNow; k++) {
      if (ownPixel(L, mat, x - k, y) && L.getShade(x - k, y) > 0) L.reshade(x - k, y, Math.max(1, Math.min(5, L.getShade(x - k, y) + delta)));
    }
  }
}

/**
 * Paints a band along the lowest pixels of material `mat` in a layer
 * (hem trims, flame patterns). `height(x)` gives the band height in design
 * units for the column at design x; `shade(x, d)` gets the depth d in design units.
 */
function hemBand(L: Layer, mat: number, pen: Pen, height: (x: number) => number, shade: (x: number, d: number) => number): void {
  for (let fx = 0; fx < GRID; fx++) {
    let low = -1;
    for (let fy = GRID - 1; fy >= 0; fy--) {
      if (ownPixel(L, mat, fx, fy)) {
        low = fy;
        break;
      }
    }
    if (low < 0) continue;
    const x = (fx + 0.5) / RES;
    const h = Math.round(height(x) * RES);
    for (let d = 0; d < h; d++) {
      const fy = low - d;
      if (!ownPixel(L, mat, fx, fy)) break;
      L.set(fx, fy, pen.mat, shade(x, d / RES) + (pen.bias || 0), pen.part, pen.flags || 0);
    }
  }
}

/** Flame tongues rising from the hem: alternating tall and short peaks (design units). */
const flameHeight = (g: DrawCtx, base: number, amp: number, period = 6) => (x: number) => {
  const u = x - g.rig.pelvis.x + 600;
  const k = (u % period) / period;
  const tri = 1 - Math.abs(k * 2 - 1);
  const big = Math.floor(u / period) % 2 === 0 ? 1 : 0.55;
  return base + amp * Math.pow(tri, 2.2) * big;
};

interface CloakOpts {
  /** Hem height on the right side: 0 = hips, 1 = ground. */
  len: number;
  /** How far the hem flares past the near shoulder (left). */
  flare: number;
  /** Extra outward bulge of the left edge halfway down. */
  bulge: number;
  /** Left side of the hem hangs this many pixels lower than the right. */
  slant: number;
  /** Torso-local x of the top-right corner (behind the far shoulder). */
  topR: number;
  /** Hem right edge, relative to the pelvis x. */
  hemR: number;
  /** Number of big folds. */
  folds: number;
  /** Widens the shoulder line. */
  shoulder?: number;
  /** Zig-zag depth of the hem. */
  zig?: number;
  /**
   * 'dark': near-black cloth that sits mostly in shades 1-2, with thin crest
   * highlights (for black cloaks). 'normal': lit side at 4, mid 3, shadow 2.
   */
  tone?: 'normal' | 'dark';
}

interface CloakShape {
  hemL: Vec;
  hemR: Vec;
  SL: Vec;
  TR: Vec;
}

/** Big back panel of a cloak, hanging from the shoulders (capeBack). */
function cloakBack(g: DrawCtx, pen: Pen, o0: CloakOpts): CloakShape {
  const r = g.rig;
  // Knocked out (drawn upright, then laid on the ground): the cloak hugs the
  // back and legs instead of flaring, so it lies flat along the body, and
  // never reaches past the front (the ground, once laid down).
  const o = r.pose === 'downed' ? { ...o0, flare: -1.5, bulge: 0.4, hemR: Math.min(o0.hemR, 1) } : o0;
  const b = g.bp;
  const Lt = b.torsoLen;
  const w = capeWind(g);
  const top = topPt(g);
  const L = g.L('capeBack');
  const sh = b.shoulderHalf + (o.shoulder ?? 0);
  const hemY = lerp(v(0, r.pelvis.y), v(0, GROUND), o.len).y;
  const TL = top(-sh * 0.7, Lt + 0.6);
  const SL = top(-sh - 0.8, Lt - 2);
  const TR = top(o.topR, Lt + 0.6);
  const hemL = v(SL.x - o.flare + w.dx + w.wave, hemY + o.slant - w.lift * 1.4);
  const hemR = v(r.pelvis.x + o.hemR + w.dx * 0.3 + w.wave * 0.5, hemY - w.lift * 0.3);
  const B1 = v(SL.x - o.bulge * 0.7 + w.dx * 0.25, lerp(SL, hemL, 0.35).y);
  const B2 = v(lerp(SL, hemL, 0.75).x - o.bulge * 0.4, lerp(SL, hemL, 0.75).y);
  const RR = v(Math.max(TR.x, hemR.x) + 0.6, lerp(TR, hemR, 0.4).y);
  const zig = o.zig ?? 1;
  const n = Math.max(2, o.folds * 2);
  const hem: Vec[] = [];
  for (let i = n; i >= 0; i--) {
    const p = lerp(hemL, hemR, i / n);
    hem.push(v(p.x, p.y + (i % 2 === 0 ? zig : -zig * 0.6)));
  }
  const pts = [TL, TR, RR, ...hem, B2, B1, SL];
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const dark = o.tone === 'dark';
  // Value by position across the visible part, like the reference cloak: a
  // lit outer rim, the body of the cloth, then darker as it curves in behind
  // the body (where the body also casts its shadow), deepest behind the far side.
  const bodyX = r.pelvis.x - b.hipHalf * 0.6;
  const outerX = (y: number) => {
    const k = Math.max(0, Math.min(1, (y - SL.y) / Math.max(1, hemL.y - SL.y)));
    return Math.min(SL.x, lerp(SL, hemL, k).x - o.bulge * Math.sin(k * Math.PI) * 0.5);
  };
  poly(L, pts, pen, (x: number, y: number) => {
    const X = x + 0.5;
    if (X > r.pelvis.x + b.hipHalf * 0.4) return dark ? 1 : 2; // behind the far side
    const u = (X - outerX(y + 0.5)) / Math.max(1, bodyX - outerX(y + 0.5));
    if (dark) return u < 0.1 ? 3 : u < 0.78 ? 2 : 1;
    return u < 0.08 ? 4 : u < 0.42 ? 3 : u < 0.8 ? 2 : 1;
  });
  // Long folds fall from the shoulders: crests end at the low points of the
  // hem, creases at the notches between them.
  const sag = v(w.dx * 0.25, 0);
  const quad = (a: Vec, c: Vec, e: Vec, t: number) => lerp(lerp(a, c, t), lerp(c, e, t), t);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const h = lerp(hemL, hemR, 1 - t);
    const a = lerp(SL, TR, 0.15 + (1 - t) * 0.6);
    const start = lerp(a, h, 0.12);
    const end = v(h.x, h.y + zig);
    const ctrl = add(lerp(start, end, 0.5), sag);
    if (i % 2 === 1) {
      curveFold(L, pen.mat, start, ctrl, end, -1, dark ? 1 : 2, 0);
    } else {
      curveFold(L, pen.mat, lerp(start, end, 0.08), ctrl, end, 1, 2, 0.6);
      // A short brighter glint on the upper part of the crest.
      const g0 = quad(start, ctrl, end, 0.15);
      const g1 = quad(start, ctrl, end, 0.7);
      curveFold(L, pen.mat, g0, lerp(g0, g1, 0.5), g1, 1, 1, 0);
    }
  }
  // Thin rim light down the outer (left) edge.
  curveFold(L, pen.mat, add(SL, v(0.6, 1)), add(B1, v(0.6, 0)), add(hemL, v(1, -1)), 1, dark ? 2 : 1, 0);
  // Two long folds in the visible outer part (the reference's lit streaks):
  // a lit crest with a brighter upper half, and a dark trough beside it.
  const across = (k: number, t: number) => {
    const y = lerp(SL, hemL, t).y;
    return v(outerX(y) + k * (bodyX - outerX(y)), y);
  };
  for (const k of [0.3, 0.62]) {
    const a = across(k, 0.12);
    const c = across(k + 0.04, 0.55);
    const e = across(k + 0.08, 0.97);
    curveFold(L, pen.mat, a, c, e, 1, 1, 0);
    curveFold(L, pen.mat, a, lerp(a, c, 0.6), c, 1, 1, 0);
    curveFold(L, pen.mat, add(a, v(0.6, 0.6)), add(c, v(0.6, 0)), add(e, v(0.6, 0)), -1, 1, 0);
  }
  return { hemL, hemR, SL, TR };
}

/**
 * Near-shoulder drape (capeFront): covers the top of the near shoulder and the
 * upper chest, its front edge running diagonally from the collar to the armpit.
 */
function shoulderDrape(g: DrawCtx, pen: Pen, o: { chest: number; drop: number; outer?: number }): Vec[] {
  const b = g.bp;
  const Lt = b.torsoLen;
  const top = topPt(g);
  const L = g.L('capeFront');
  const sh = b.shoulderHalf;
  const outer = o.outer ?? 1.6;
  const pts = [
    top(o.chest, Lt + 0.6),
    top(o.chest + 0.4, Lt - 1.4),
    top(-sh * 0.35, Lt - o.drop),
    top(-sh - outer, Lt - o.drop - 0.8),
    top(-sh - outer - 0.2, Lt - 2.6),
    top(-sh * 0.8, Lt + 0.4),
  ];
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  poly(L, pts, pen, bandShade(minX, maxX, 0.18, 0.62, 0.9));
  return pts;
}

/**
 * Low cloth cap over the near shoulder (nearArm.over): its top follows the
 * shoulder slope, its outer side falls straight down past the arm. Returns a
 * point on its front face (for clasps) and one on its back edge.
 */
function shoulderCap(g: DrawCtx, hex: string, len = 0.5, grow = 1.4, folds = 2, tone: 'normal' | 'dark' = 'normal'): { front: Vec; back: Vec; top: Vec } {
  const r = g.rig;
  const b = g.bp;
  const sh = b.shoulderHalf;
  const Lt = b.torsoLen;
  const top = topPt(g);
  const L = g.L('nearArm.over');
  const pen: Pen = { mat: g.m(hex, 'cloth'), part: 'upperArmN' };
  // Cloth falls mostly downward even when the arm swings or rises.
  const d = norm(sub(r.elbowN, r.shoulderN));
  const fall = norm(add(d, v(0, 1.4)));
  let back = perp(fall);
  if (back.x > 0) back = scale(back, -1); // toward the back (screen-left)
  // The cloth lies on the arm, only its own thickness over the sleeve: a shoulder without a guard
  // stays slim under a cape (the owner's reference).
  const R = b.armR[0] + Math.min(grow, 0.45);
  const drop = b.upperArm * len;
  const w = capeWind(g);
  const flut = w.dx < -2 ? 0.8 : 0;
  // Top edge follows the shoulder slope in torso space and never rises above it.
  const A = top(-sh * 0.25, Lt + 0.1);
  const B = top(-sh * 0.7, Lt - 0.1);
  const C = top(-sh - R * 0.45, Lt - 1.1);
  const C2 = top(-sh - R * 0.7, Lt - 2.4);
  // Outer side falls straight down, then a scalloped hem runs back toward the chest.
  const D = add(add(C2, scale(fall, drop * 0.55)), scale(back, 0.25 + flut * 0.4));
  const E = add(add(C2, scale(fall, drop)), scale(back, 0.5 + flut));
  const W = R * 2 + 0.6;
  const H = (k: number, du: number) => add(add(E, scale(back, -W * k)), scale(fall, du));
  const F = add(A, scale(fall, drop * 0.55));
  const pts = [A, B, C, C2, D, E, H(0.28, -0.7), H(0.5, 0.3), H(0.75, -0.6), H(1, 0.1), F];
  const s0 = r.shoulderN;
  const shade = (x: number, y: number) => {
    const p = sub(v(x + 0.5, y + 0.5), s0);
    const across = p.x * back.x + p.y * back.y; // + toward the back
    const down = p.x * fall.x + p.y * fall.y;
    const lit = down < -R * 0.35 && across > -R * 0.6; // the shoulder top catches the light
    if (tone === 'dark') return lit ? 3 : 2;
    if (lit) return 4;
    return across > R * 0.55 ? 4 : across < -R * 0.45 ? 2 : 3;
  };
  // The cloth wraps the round top of the arm too, so the sleeve never shows above it (the owner's
  // reference: the cape lies over the whole shoulder).
  capsule(L, add(s0, scale(fall, -R * 0.25)), s0, R, R, pen, shade);
  poly(L, pts, pen, shade);
  // Folds falling from the shoulder to the hem.
  for (let k = 0; k < folds; k++) {
    const t = folds === 1 ? 0.5 : 0.2 + (k * 0.6) / (folds - 1);
    const top0 = lerp(C2, F, t);
    const hemP = H(t, 0);
    curveFold(L, pen.mat, add(top0, scale(fall, 0.8)), lerp(top0, hemP, 0.5), hemP, -1, 1, 0);
    curveFold(L, pen.mat, add(add(top0, scale(fall, 1.2)), scale(back, 0.5)), add(lerp(top0, hemP, 0.5), scale(back, 0.5)), add(hemP, scale(back, 0.5)), 1, tone === 'dark' ? 1 : 2, 0.5);
  }
  return { front: lerp(F, H(1, 0), 0.25), back: D, top: lerp(lerp(B, C, 0.5), lerp(H(0.5, 0), F, 0.3), 0.45) };
}

/** Clears pixels of a front layer that cover the head above `belowY` (head-local), so collars sit under the chin. */
function tuckUnderChin(g: DrawCtx, L: Layer, belowY = 99): void {
  const H = g.L('head.body');
  const hx = g.rig.head.x;
  const hy = g.rig.head.y;
  const k = H.xf ? H.xf.k : 1; // the head group is drawn shrunk around its center
  for (let fy = fine(hy - 9); fy <= fine(hy + 9); fy++) {
    for (let fx = fine(hx - 9); fx <= fine(hx + 9); fx++) {
      if (!H.has(fx, fy) || !L.has(fx, fy)) continue;
      if (((fy + 0.5) / RES - hy) / k < belowY) L.clear(fx, fy);
    }
  }
}

/**
 * A long front panel of an open coat: hangs from the near shoulder down the
 * near side of the body, in front of the legs (capeFront).
 */
function frontPanel(g: DrawCtx, pen: Pen, o: { x0: number; x1: number; hemY: number; flare?: number; tone?: 'normal' | 'dark' }): Vec[] {
  const r = g.rig;
  const b = g.bp;
  const Lt = b.torsoLen;
  const w = capeWind(g);
  const top = topPt(g);
  const L = g.L('capeFront');
  const flare = o.flare ?? 1.5;
  const a = top(o.x0, Lt + 0.4);
  const c = top(o.x1, Lt + 0.4);
  const m0 = r.T(o.x0 - 0.8, 2);
  const m1 = r.T(o.x1 - 0.5, 2);
  const h0 = v(m0.x - flare + w.dx * 0.5, o.hemY - w.lift * 0.6);
  const h1 = v(m1.x + 0.5 + w.dx * 0.35, o.hemY + 0.6 - w.lift * 0.4);
  const pts = [a, c, m1, h1, h0, m0];
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  poly(L, pts, pen, o.tone === 'dark' ? (x: number) => ((x + 0.5 - minX) / Math.max(1, maxX - minX) < 0.2 ? 3 : 2) : bandShade(minX, maxX, 0.12, 0.5, 0.84));
  return pts;
}

/** A round clasp with a highlight. */
function clasp(L: Layer, p: Vec, pen: Pen, r = 1.1): void {
  ellipse(L, p.x, p.y, r, r, pen, (x, y) => {
    const dx = x + 0.5 - p.x;
    const dy = y + 0.5 - p.y;
    const lt = -dx - dy;
    return lt > r * 0.5 ? 4 : lt < -r * 0.45 ? 2 : 3;
  });
  // Sharp 1-fine-pixel glint.
  px(L, p.x - r * 0.35, p.y - r * 0.35, { ...pen, flags: F_NO_OUTLINE }, 5);
}

/**
 * Stamps a part of a painted cape (the owner's pixels, his colours and black line) with its pivot on
 * its joint (`at`: the near shoulder, or the base of the neck). With `sway` the wind pushes it: each
 * row slides by how far down the cloth it is, so the hem trails and lifts while the top stays put.
 */
function paintedPart(g: DrawCtx, L: Layer, p: PaintedPart, part: PartId, color: (ch: string, hex: string) => string, sway: boolean, at: Vec = g.rig.shoulderN): void {
  const w = capeWind(g);
  const s = at;
  const ax = Math.floor(s.x * RES) - p.pivot[0];
  const ay = Math.floor(s.y * RES) - p.pivot[1];
  const n = p.rows.length;
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  p.rows.forEach((row, j) => {
    const k = sway ? j / Math.max(1, n - 1) : 0;
    const dx = Math.round((w.dx + w.wave) * RES * k ** 1.3);
    const dy = -Math.round(w.lift * 1.4 * RES * k * k);
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch !== '.') L.set(ax + i + dx, ay + j + dy, pens[ch], 3, part, F_NO_TEXTURE | F_NO_OUTLINE);
    }
  });
}

/** The owner's cape recoloured: his black line stays, his gold follows the clasps, the cloth the cloak. */
const ownerCapeColor = (cloth: string, gold: string) => (ch: string, hex: string) => {
  if (ch === 'a') return hex;
  const [r, , b] = hexToRgb(hex);
  return r > b + 30 ? retintHex(hex, '#b8913a', gold) : retintHex(hex, '#1c1b22', cloth);
};

/** His far-shoulder plate recoloured: his black line stays, his steel takes the plate's metal. */
const ownerPlateColor = (metal: string) => (_ch: string, hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b < 16 ? hex : retintHex(hex, '#3b444f', metal);
};

/** His red cape recoloured: his line stays, every red of his moves the way his base red does. */
const crimsonCapeColor = (cloth: string) => (ch: string, hex: string) => (CRIMSON_CAPE_LINE.includes(ch) ? hex : retintHex(hex, CRIMSON_CAPE_BASE, cloth));

/** How far above the ground line his hem hangs at rest (fine pixels; the male figure, idle). */
const CRIMSON_HEM_ABOVE_GROUND = 5;

/**
 * The back of his red cape (capeBack), hung from the base of the neck: his pixels pushed by the wind
 * as paintedPart does, but the hem never hangs lower than at rest (crouched or seated the cloth gathers
 * up behind instead of passing through the ground: the lower rows ride up over the ones above, so his
 * hem stays whole). Knocked out (drawn upright, then laid down) it lies along the back: only the
 * cloth within a few pixels of the body's back is kept (the flaps would stand up in the air once the
 * figure is laid down, or sink into the ground in front), with his line along the cut.
 */
function crimsonBack(g: DrawCtx, color: (ch: string, hex: string) => string): void {
  paintedBack(g, CRIMSON_CAPE_BACK, CRIMSON_HEM_ABOVE_GROUND, CRIMSON_CAPE_EDGE, color);
}

/**
 * The back of a painted cape (capeBack) hung from the base of the neck, as crimsonBack describes: `hem` is
 * how far above the ground line its hem hangs at rest, `edge` the character of his line drawn along the
 * cut when it lies knocked out.
 */
function paintedBack(g: DrawCtx, p: PaintedPart, hem: number, edgeCh: string, color: (ch: string, hex: string) => string): void {
  const L = g.L('capeBack');
  const r = g.rig;
  const w = capeWind(g);
  const ax = Math.floor(r.neck.x * RES) - p.pivot[0];
  const ay = Math.floor(r.neck.y * RES) - p.pivot[1];
  const n = p.rows.length;
  const lift = w.lift * 1.4 * RES;
  const over = r.lay ? 0 : Math.max(0, ay + n - 1 - Math.round(lift) - (GROUND * RES - hem));
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  // Laid down: the body's back row by row (the cape is drawn before the clothes, over the bare body),
  // and the column that lands on the ground.
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
  const keep = (x: number, y: number) => !r.lay || (back.has(y) && x >= back.get(y)! - 3 && x < front);
  const placed = new Set<number>();
  p.rows.forEach((row, j) => {
    const k = j / Math.max(1, n - 1);
    const dx = Math.round((w.dx + w.wave) * RES * k ** 1.3);
    const dy = -Math.round((lift + over) * k * k);
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      const x = ax + i + dx;
      const y = ay + j + dy;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
      placed.add(y * GRID + x);
      if (keep(x, y)) L.set(x, y, pens[ch], 3, 'back', F_NO_TEXTURE | F_NO_OUTLINE);
    }
  });
  if (!r.lay) return;
  // His line along the cut: kept pixels next to cloth that was cut away.
  const edge = pens[edgeCh];
  const cut: number[] = [];
  for (const i of placed) {
    const x = i % GRID;
    const y = (i / GRID) | 0;
    if (!keep(x, y)) continue;
    if ([i - 1, i + 1, i - GRID, i + GRID].some((q) => placed.has(q) && !keep(q % GRID, (q / GRID) | 0))) cut.push(i);
  }
  for (const i of cut) L.set(i % GRID, (i / GRID) | 0, edge, 3, 'back', F_NO_TEXTURE | F_NO_OUTLINE);
}

/** How far above the ground line his traveller's cape's hem hangs at rest (fine pixels; the male figure, idle). */
const TRAVELER_HEM_ABOVE_GROUND = GROUND * RES - (TRAVELER_REST.TRAVELER_BACK[1] + TRAVELER_BACK.rows.length - 1);

/**
 * The back of a painted cape (capeBack) hung from `at`: his pixels pushed by the wind as paintedPart does,
 * but the hem never hangs lower than at rest (crouched or seated the cloth gathers up behind instead of
 * passing through the ground: the lower rows ride up over the ones above, so his hem stays whole), as
 * the crimson cape's back does.
 */
function hemmedBack(g: DrawCtx, p: PaintedPart, at: Vec, hemAbove: number, color: (ch: string, hex: string) => string): void {
  const L = g.L('capeBack');
  const w = capeWind(g);
  const ax = Math.floor(at.x * RES) - p.pivot[0];
  const ay = Math.floor(at.y * RES) - p.pivot[1];
  const n = p.rows.length;
  const lift = w.lift * 1.4 * RES;
  const over = Math.max(0, ay + n - 1 - Math.round(lift) - (GROUND * RES - hemAbove));
  const pens: Record<string, number> = {};
  for (const [ch, hex] of Object.entries(p.colors)) pens[ch] = g.m(color(ch, hex), 'flat');
  p.rows.forEach((row, j) => {
    const k = j / Math.max(1, n - 1);
    const dx = Math.round((w.dx + w.wave) * RES * k ** 1.3);
    const dy = -Math.round((lift + over) * k * k);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') L.set(ax + i + dx, ay + j + dy, pens[row[i]], 3, 'back', F_NO_TEXTURE | F_NO_OUTLINE);
  });
}

/** His Solen's cape: how far above the ground line its hem hangs at rest (the male figure, idle), and his line along a cut. */
const FOUNDER_HEM_ABOVE_GROUND = GROUND * RES - (FOUNDER_CAPE_REST.FOUNDER_CAPE[1] + FOUNDER_CAPE.rows.length - 1);
const FOUNDER_CAPE_EDGE = Object.keys(FOUNDER_CAPE.colors).find((ch) => FOUNDER_CAPE_KIND[FOUNDER_CAPE.colors[ch]] === 'line')!;

/** Every layer a cape draws its cloth into (the owner's red cape puts its mantles in the arm armour's and the torso's). */
export const CAPE_DEPTHS: Depth[] = ['capeBack', 'torso.acc', 'capeFront', 'nearArm.armor', 'nearArm.over'];

/** A cape whose cloth is sealed once drawn: no crack between its pieces, no bite in its edge (seal.ts). */
const sealed = (d: ItemDef): ItemDef => ({
  ...d,
  draw: (g, colors, parts) => {
    d.draw(g, colors, parts);
    sealCloth(g, CAPE_DEPTHS, true);
  },
});

const CAPES: ItemDef[] = [
  {
    id: 'cape_shadow',
    slot: 'cape',
    name: 'Shadow Half-Cloak',
    desc: 'A black cloak: a mantle round the neck and over both shoulders, pinned with gold studs, over a platinum plate on the far shoulder, falling behind the near arm in heavy folds to the calves.',
    colors: [col('main', 'Cloak', '#1c1b22'), col('clasp', 'Clasps', '#b8913a', 'metal'), col('plate', 'Shoulder Plate', '#e5e4e2', 'metal')],
    draw: (g, [c, gold, plate]) => {
      // The owner's cape, his pixels (the standard for capes, 2026-10-20): the mantle round the neck
      // and over both shoulders with its three gold studs (it reads as a scarf, but it is the cape),
      // the part over the near shoulder, and the cloth hanging behind the near arm to the calf.
      if (g.rig.pose !== 'downed') {
        const tint = ownerCapeColor(c, gold);
        paintedPart(g, g.L('capeBack'), OWNER_CAPE_BACK, 'back', tint, true);
        const F = g.L('capeFront');
        // The plate on the far shoulder, under the mantle's edge (his steel: platinum in the game).
        paintedPart(g, F, OWNER_CAPE_PLATE, 'upperArmF', ownerPlateColor(plate), false, g.rig.shoulderF);
        paintedPart(g, F, OWNER_CAPE_FRONT, 'torso', tint, false, g.rig.neck);
        tuckUnderChin(g, F);
        paintedPart(g, g.L('nearArm.over'), OWNER_CAPE_SHOULDER, 'upperArmN', tint, false);
        return;
      }
      // Knocked out, the cloak is drawn to lie along the body instead.
      const b = g.bp;
      const Lt = b.torsoLen;
      const top = topPt(g);
      const pen: Pen = { mat: g.m(c, 'cloth'), part: 'back' };
      cloakBack(g, pen, { len: 0.47, flare: 9, bulge: 4.2, slant: 2.2, topR: 0.5, hemR: -b.hipHalf * 0.55, folds: 2, shoulder: 0.5, zig: 2.2, tone: 'dark' });
      const fpen: Pen = { mat: pen.mat, part: 'torso' };
      const F = g.L('capeFront');
      // Rolled collar around the neck base.
      const nk = top(0.4, Lt + 0.2);
      capsule(F, add(nk, v(-3.6, 0.5)), add(nk, v(2.9, -0.1)), 1.9, 1.6, fpen, 2);
      fold(F, fpen.mat, add(nk, v(-3.2, 1.4)), add(nk, v(2.6, 1.0)), -1, 0);
      fold(F, fpen.mat, add(nk, v(-1.4, -1.2)), add(nk, v(-0.4, 1.6)), 1, 0);
      tuckUnderChin(g, F);
      // Gold clasps at both shoulders, plus one at the collar.
      const gp: Pen = { mat: g.m(gold, 'metal'), part: 'torso' };
      clasp(F, top(2.2, Lt - 1.6), gp, 0.7);
      const O = g.L('nearArm.over');
      clasp(O, shoulderCap(g, c, 0.24, 1.1, 1, 'dark').top, { ...gp, part: 'upperArmN' }, 0.7);
      clasp(O, top(b.shoulderHalf * 0.62 + 0.6, Lt - 1.1), gp, 0.7);
    },
  },
  {
    id: 'cape_crimson',
    slot: 'cape',
    name: 'Crimson Mantle',
    desc: "A knight's red cape: a mantle over both shoulders, under the shoulder guards, that goes on behind the neck, and the cloth falling behind the body on both sides to the calves in dark-red folds, its hems cut in points.",
    colors: [col('main', 'Cape', CRIMSON_CAPE_BASE)],
    draw: (g, [c]) => {
      // The owner's red cape on his Aiden, his pixels (the new standard, 2026-10-21): the cloth
      // behind the body from the shoulders to the calves on both sides, swaying in the wind; the
      // mantle over the far shoulder, in front of the far arm and the torso and behind the head; the
      // mantle over the near shoulder, in front of the arm and drawn into its armour's layer first,
      // so a pauldron (drawn after) sits over it as his does (armor.ts lets pauldrons show over this
      // cape).
      const tint = crimsonCapeColor(c);
      crimsonBack(g, tint);
      paintedPart(g, g.L('torso.acc'), CRIMSON_CAPE_FAR, 'upperArmF', tint, false, g.rig.shoulderF);
      const N = g.L('nearArm.armor');
      paintedPart(g, N, CRIMSON_CAPE_NEAR, 'upperArmN', tint, false);
      tuckUnderChin(g, N);
    },
  },
  {
    id: 'cape_founder',
    slot: 'cape',
    name: "Founder's Cape",
    desc: 'A long dark grey cape falling from the shoulders and flaring out behind the near arm to the calves in long folds, its hem cut in points: painted by the owner for Solen.',
    colors: [col('main', 'Cape', FOUNDER_CAPE_CLOTH)],
    draw: (g, [c]) => {
      // The owner's cape on his Solen, his pixels (the new standard, 2026-10-21; tools/refs/
      // solen-cape-from-ref.py): hung from the base of the neck behind the body, swaying in the wind as
      // the crimson cape does, its hem never lower than at rest. What his arm, sword and legs hid is his
      // cloth continued. His line stays; every grey of his moves the way his base grey does.
      paintedBack(g, FOUNDER_CAPE, FOUNDER_HEM_ABOVE_GROUND, FOUNDER_CAPE_EDGE, (_ch, hex) => (FOUNDER_CAPE_KIND[hex] === 'line' ? hex : retintHex(hex, FOUNDER_CAPE_CLOTH, c)));
    },
  },
  {
    id: 'cape_haori',
    slot: 'cape',
    name: 'White Battle Haori',
    desc: 'A long white coat-cape worn over the shoulders, its hem licked by a red flame pattern.',
    colors: [col('main', 'Coat', '#ecebe6'), col('flame', 'Flames', '#d8352a'), col('lining', 'Lining', '#2d2a3a')],
    draw: (g, [c, flame, lining]) => {
      const r = g.rig;
      const b = g.bp;
      const pen: Pen = { mat: g.m(c, 'cloth'), part: 'back' };
      const shape = cloakBack(g, pen, { len: 0.7, flare: 4, bulge: 1.5, slant: 1, topR: b.shoulderHalf * 0.55 + 1.6, hemR: b.hipHalf + 2.5, folds: 2, shoulder: 1 });
      const L = g.L('capeBack');
      const fp: Pen = { mat: g.m(flame, 'cloth'), part: 'back' };
      hemBand(L, pen.mat, fp, flameHeight(g, 1.5, 7), () => 3);
      hemBand(L, fp.mat, fp, flameHeight(g, 0.5, 3.6), (_x, d) => (d < 0.6 ? 3 : 4));
      // Front panel on the near side (open coat), with its own flames.
      const fpen: Pen = { mat: pen.mat, part: 'torso' };
      const lp: Pen = { mat: g.m(lining, 'cloth'), part: 'torso' };
      const F = g.L('capeFront');
      frontPanel(g, fpen, { x0: -b.shoulderHalf - 1.2, x1: -b.shoulderHalf * 0.15, hemY: shape.hemR.y + 0.5, flare: 2 });
      hemBand(F, fpen.mat, { ...fp, part: 'torso' }, flameHeight(g, 1.5, 7), () => 3);
      hemBand(F, fp.mat, { ...fp, part: 'torso' }, flameHeight(g, 0.5, 3.6), (_x, d) => (d < 0.6 ? 3 : 4));
      // Inner edge of the panel shows the dark lining; a wide collar band.
      const top = topPt(g);
      const Lt = b.torsoLen;
      poly(F, [top(-b.shoulderHalf * 0.15 - 1.4, Lt + 0.6), top(-b.shoulderHalf * 0.15 + 0.2, Lt + 0.6), r.T(-b.shoulderHalf * 0.15 - 0.3, 2), r.T(-b.shoulderHalf * 0.15 - 1.6, 2)], lp, 2);
      shoulderCap(g, c, 0.26, 1.1, 1);
    },
  },
  {
    id: 'cape_knight',
    slot: 'cape',
    name: 'Crimson Knight Cape',
    desc: 'A heavy crimson cape fastened at both shoulders, sweeping down to the ankles.',
    colors: [col('main', 'Cape', '#a51d2d'), col('clasp', 'Clasps', '#d9a93a', 'metal')],
    draw: (g, [c, gold]) => {
      const b = g.bp;
      const Lt = b.torsoLen;
      const top = topPt(g);
      const pen: Pen = { mat: g.m(c, 'cloth'), part: 'back' };
      cloakBack(g, pen, { len: 0.88, flare: 6, bulge: 2, slant: 0.5, topR: b.shoulderHalf * 0.55 + 1.4, hemR: b.hipHalf + 1.5, folds: 3, shoulder: 0.8, zig: 0.8 });
      const F = g.L('capeFront');
      const fpen: Pen = { mat: pen.mat, part: 'torso' };
      shoulderDrape(g, fpen, { chest: -1.8, drop: 3.2, outer: 1.4 });
      shoulderCap(g, c, 0.24, 1.0, 1);
      const gp: Pen = { mat: g.m(gold, 'metal'), part: 'torso' };
      clasp(F, top(-b.shoulderHalf * 0.3, Lt - 1.2), gp, 1.4);
      // Gold chain across the collar to the far clasp.
      const chain: Pen = { mat: gp.mat, part: 'torso', flags: F_NO_OUTLINE };
      const a = top(-b.shoulderHalf * 0.3 + 1.2, Lt - 1.6);
      const z = top(b.shoulderHalf * 0.55, Lt - 1.2);
      const links = 9;
      for (let i = 0; i <= links; i++) {
        const t = i / links;
        const p = lerp(a, z, t);
        const sag = Math.sin(t * Math.PI) * 1.2;
        px(F, p.x, p.y + sag, chain, i % 2 ? 2 : 5);
        px(F, p.x, p.y + sag + 0.5, chain, 1);
      }
    },
  },
  {
    id: 'cape_rogue',
    slot: 'cape',
    name: 'Rogue Storm Cloak',
    desc: 'A high-collared black cloak whose hem and front edges burn with crimson flame trim.',
    colors: [col('main', 'Cloak', '#1e1d24'), col('trim', 'Flame Trim', '#c8192e'), col('lining', 'Lining', '#6e1020')],
    draw: (g, [c, trim, lining]) => {
      const b = g.bp;
      const Lt = b.torsoLen;
      const top = topPt(g);
      const pen: Pen = { mat: g.m(c, 'cloth'), part: 'back' };
      const shape = cloakBack(g, pen, { len: 0.82, flare: 5, bulge: 2, slant: 2, topR: b.shoulderHalf * 0.55 + 2, hemR: b.hipHalf + 2, folds: 2, shoulder: 1.2, zig: 1.4, tone: 'dark' });
      const tp: Pen = { mat: g.m(trim, 'cloth'), part: 'back' };
      const L = g.L('capeBack');
      hemBand(L, pen.mat, tp, flameHeight(g, 1, 4, 5), (_x, d) => (d === 0 ? 2 : d > 2 ? 4 : 3));
      const fpen: Pen = { mat: pen.mat, part: 'torso' };
      const F = g.L('capeFront');
      frontPanel(g, fpen, { x0: -b.shoulderHalf - 1.4, x1: -b.shoulderHalf * 0.35, hemY: shape.hemR.y - 0.5, flare: 2.5, tone: 'dark' });
      hemBand(F, fpen.mat, { ...tp, part: 'torso' }, flameHeight(g, 1, 4, 5), (_x, d) => (d === 0 ? 2 : d > 2 ? 4 : 3));
      shoulderCap(g, c, 0.26, 1.1, 1, 'dark');
      // High collar: rises behind the head, and wraps up to the jaw in front.
      const nk = top(0.5, Lt + 0.4);
      poly(L, [add(nk, v(-7, 2)), add(nk, v(-7.5, -5)), add(nk, v(-4.5, -8.5)), add(nk, v(-1, -6)), add(nk, v(0.5, 1))], pen, 2);
      const lp: Pen = { mat: g.m(lining, 'cloth'), part: 'torso' };
      poly(F, [add(nk, v(-5, 2)), add(nk, v(-5.2, -2.6)), add(nk, v(-1.5, -1.8)), add(nk, v(3.6, -3.4)), add(nk, v(5, 1.8))], fpen);
      tuckUnderChin(g, F, 6.1);
      // Crimson lining shows along the top lip of the collar.
      const lip = [add(nk, v(-4.2, -1.8)), add(nk, v(-1.5, -1.0)), add(nk, v(3.4, -2.5))];
      for (let i = 0; i < lip.length - 1; i++) {
        const steps = 16;
        for (let k = 0; k <= steps; k++) {
          const p = lerp(lip[i], lip[i + 1], k / steps);
          for (const o of [0, 0.5]) if (F.has(fine(p.x), fine(p.y + o))) px(F, p.x, p.y + o, lp, o ? 2 : 4);
        }
      }
    },
  },
  {
    id: 'cape_traveler',
    slot: 'cape',
    name: "Traveler's Cape",
    desc: 'A weathered brown hood-cape: the hood bunched round the neck and across the chest, the cloth over the near shoulder and hanging behind the arm to the calf.',
    colors: [col('main', 'Cape', TRAVELER_BROWN)],
    draw: (g, [c0]) => {
      // The owner's cape from his Trunks 2 picture (2026-10-21; tools/refs/trunks-traveler-cape-from-ref.py):
      // the cloth behind the near arm hangs from the near shoulder and swings in the wind as his other
      // capes do; the hood rides the torso about the neck, in front of the chest and behind the arms; the
      // cloth over the near shoulder rides it, over the arm. At rest every pixel is his, where he drew it.
      // His browns follow the slot (the old default means his); his line stays. Knocked out, the drawn
      // cape lies along the body instead.
      const c = c0.toLowerCase() === '#7d5b3b' ? TRAVELER_BROWN : c0;
      if (g.rig.pose !== 'downed') {
        const tint = (_ch: string, hex: string) => (TRAVELER_SLOT[hex] === 'main' ? retintHex(hex, TRAVELER_BROWN, c) : hex);
        hemmedBack(g, TRAVELER_BACK, g.rig.shoulderN, TRAVELER_HEM_ABOVE_GROUND, tint);
        paintedPart(g, g.L('capeFront'), TRAVELER_HOOD, 'torso', tint, false, g.rig.neck);
        paintedPart(g, g.L('nearArm.over'), TRAVELER_SHOULDER, 'upperArmN', tint, false);
        return;
      }
      // the drawn cape's hood, a shade darker than its cloth
      const hood = retintHex('#5f4530', '#7d5b3b', c);
      const b = g.bp;
      const Lt = b.torsoLen;
      const top = topPt(g);
      const pen: Pen = { mat: g.m(c, 'cloth'), part: 'back' };
      cloakBack(g, pen, { len: 0.18, flare: 3, bulge: 1.5, slant: 1.5, topR: b.shoulderHalf * 0.55 + 1.2, hemR: b.hipHalf * 0.6, folds: 2, shoulder: 0.8, zig: 1.4 });
      const fpen: Pen = { mat: pen.mat, part: 'torso' };
      const F = g.L('capeFront');
      shoulderDrape(g, fpen, { chest: 1.6, drop: 6.5, outer: 1.8 });
      shoulderCap(g, c, 0.36, 1.2, 1);
      // Ragged hem notches on the drape.
      const hp: Pen = { mat: g.m(hood, 'cloth'), part: 'torso' };
      const nk = top(0.2, Lt + 0.6);
      // Bunched hood: a lumpy roll behind the neck plus a fold over the collar.
      const B = g.L('capeBack');
      ellipse(B, nk.x - 4.2, nk.y - 2.2, 3.6, 3, { ...hp, part: 'back' });
      seam(B, v(nk.x - 6.5, nk.y - 2), v(nk.x - 3, nk.y - 0.5), -1);
      capsule(F, add(nk, v(-4.2, 0.2)), add(nk, v(2.6, 0)), 2.1, 1.7, hp);
      seam(F, add(nk, v(-3.6, 1.6)), add(nk, v(2.2, 1.2)), -1);
      seam(F, add(nk, v(-1.2, -1.2)), add(nk, v(-1.2, 1.6)), -1);
      tuckUnderChin(g, F);
      // Patch on the drape (weathered).
      const patch = top(-b.shoulderHalf * 0.75, Lt - 4.5);
      poly(F, [add(patch, v(-1, -1)), add(patch, v(1.4, -1)), add(patch, v(1.4, 1.2)), add(patch, v(-1, 1.2))], hp, 2);
    },
  },
  {
    id: 'cape_scarf',
    slot: 'cape',
    name: 'Long Scarf',
    desc: 'A scarf wrapped around the neck, its long tail streaming behind.',
    colors: [col('main', 'Scarf', '#c42a2f')],
    draw: (g, [c]) => {
      const r = g.rig;
      const b = g.bp;
      const w = capeWind(g);
      const top = topPt(g);
      const nk = top(0.2, b.torsoLen + 0.7);
      const bp: Pen = { mat: g.m(c, 'cloth'), part: 'back' };
      const B = g.L('capeBack');
      // Tail: a ribbon streaming left and down, rippling by frame.
      const n = 8;
      const start = add(nk, v(-3.5, 0.5));
      // Knocked out, the tail lies along the back (drawn upright, then laid down).
      const limp = r.pose === 'downed';
      const reach = limp ? 2.5 : 9 + Math.abs(w.dx) * 1.3;
      const drop = limp ? 17 : 15 - w.lift * 1.6;
      let prev = start;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const ripple = Math.sin(t * 6 + r.frame * 1.9) * (0.8 + t);
        const p = add(start, v(-t * reach + ripple * 0.4, t * drop + ripple * 0.6));
        // Rounded ribbon: lit top edge, shadowed underside; every third segment
        // twists away from the light.
        const ra = 1.9 - t * 0.35;
        const rb = 1.9 - (t + 1 / n) * 0.35;
        const tw = i % 3 === 0 ? -1 : 0;
        const sh = cylShade(prev, p, ra, rb);
        capsule(B, prev, p, ra, rb, bp, (x, y) => Math.max(1, sh(x, y) + tw));
        prev = p;
      }
      // Frayed end: two little tassels.
      capsule(B, prev, add(prev, v(-1.5 + w.dx * 0.1, 2)), 0.9, 0.7, bp, 2);
      // The wrap around the neck.
      const fp: Pen = { mat: bp.mat, part: 'torso' };
      const F = g.L('capeFront');
      capsule(F, add(nk, v(-3.6, 0.4)), add(nk, v(2.8, -0.2)), 2.2, 2, fp);
      seam(F, add(nk, v(-3.4, 0.9)), add(nk, v(2.6, 0.4)), -1);
      // Short end tucked down the front.
      capsule(F, add(nk, v(-1.6, 1.4)), add(nk, v(-2.4, 5.2 + w.lift * -0.3)), 1.3, 1.1, fp, 2);
      tuckUnderChin(g, F);
    },
  },
  {
    id: 'cape_rose',
    slot: 'cape',
    name: 'Blue Rose Captain Cape',
    desc: 'A long royal blue cape over both shoulders with a high flared collar, fastened at the throat by a gold brooch.',
    colors: [col('main', 'Cape', '#2f62b8'), col('lining', 'Lining', '#1b2f66'), col('clasp', 'Brooch', '#d9a93a', 'metal')],
    draw: (g, [c, lining, gold]) => {
      const b = g.bp;
      const Lt = b.torsoLen;
      const top = topPt(g);
      const pen: Pen = { mat: g.m(c, 'cloth'), part: 'back' };
      cloakBack(g, pen, { len: 0.86, flare: 6, bulge: 2.2, slant: 0.6, topR: b.shoulderHalf * 0.55 + 1.6, hemR: b.hipHalf + 1.6, folds: 3, shoulder: 0.9, zig: 0.8 });
      const L = g.L('capeBack');
      const F = g.L('capeFront');
      const fpen: Pen = { mat: pen.mat, part: 'torso' };
      // capelet over both shoulders, down to the upper chest
      shoulderDrape(g, fpen, { chest: -0.6, drop: 4.4, outer: 1.8 });
      shoulderCap(g, c, 0.42, 1.3, 2);
      // high collar flaring up behind the head, its dark lining showing inside
      const nk = top(0.5, Lt + 0.4);
      poly(L, [add(nk, v(-6.5, 2)), add(nk, v(-7.4, -4)), add(nk, v(-5.2, -7.6)), add(nk, v(-2.2, -5.4)), add(nk, v(0.4, 1))], pen, 3);
      const lp: Pen = { mat: g.m(lining, 'cloth'), part: 'back' };
      poly(L, [add(nk, v(-5.0, 1.2)), add(nk, v(-5.6, -3.6)), add(nk, v(-4.4, -6.2)), add(nk, v(-2.6, -4.4)), add(nk, v(-1.2, 0.8))], lp, 2);
      poly(F, [add(nk, v(-4.6, 2)), add(nk, v(-4.8, -2.4)), add(nk, v(-1.5, -1.6)), add(nk, v(3.2, -2.8)), add(nk, v(4.6, 1.8))], fpen, 3);
      fold(F, fpen.mat, add(nk, v(-4.2, -1.6)), add(nk, v(3.0, -2.2)), 1, 0);
      tuckUnderChin(g, F, 6.1);
      // gold brooch at the throat
      clasp(F, top(0.4, Lt - 0.4), { mat: g.m(gold, 'metal'), part: 'torso' }, 1.3);
    },
  },
];

export const CAPE_ITEMS: ItemDef[] = CAPES.map(sealed);
