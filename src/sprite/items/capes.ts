// Capes, cloaks and long scarves. The part behind the body goes in
// `capeBack`; anything that drapes over the near shoulder or the chest goes in
// `capeFront` (in front of the head and torso, behind the near arm).
// Every shape hangs from the rig's shoulders and is pushed by a little "wind"
// that depends on the pose, so capes trail behind in attacks and sway in idle.

import type { DrawCtx, ItemDef } from '../ctx';
import { add, capsule, cylShade, ellipse, F_NO_OUTLINE, fine, GRID, len, lerp, Layer, norm, Pen, perp, poly, px, RES, scale, seam, sub, v, Vec } from '../raster';
import { GROUND } from '../rig';

const col = (key: string, label: string, def: string, kind: 'cloth' | 'leather' | 'metal' = 'cloth') => ({ key, label, default: def, kind });

export interface Wind {
  /** Horizontal push of the hem (negative = trails to the left / behind). */
  dx: number;
  /** How much the hem rises (flies up) in pixels. */
  lift: number;
  /** Small alternating flutter, -1..1. */
  wave: number;
}

/** Pose-dependent wind so capes trail in attacks and sway in idle. */
export function capeWind(g: DrawCtx): Wind {
  const f = g.rig.frame;
  switch (g.rig.pose) {
    case 'attack':
      return f % 3 === 0 ? { dx: -2, lift: 1, wave: 1 } : f % 3 === 1 ? { dx: -9, lift: 7, wave: 0 } : { dx: -7, lift: 5, wave: 1 };
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
  const R = b.armR[0] + grow;
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
  poly(L, pts, pen, (x, y) => {
    const p = sub(v(x + 0.5, y + 0.5), s0);
    const across = p.x * back.x + p.y * back.y; // + toward the back
    const down = p.x * fall.x + p.y * fall.y;
    const lit = down < -R * 0.35 && across > -R * 0.6; // the shoulder top catches the light
    if (tone === 'dark') return lit ? 3 : 2;
    if (lit) return 4;
    return across > R * 0.55 ? 4 : across < -R * 0.45 ? 2 : 3;
  });
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

export const CAPE_ITEMS: ItemDef[] = [
  {
    id: 'cape_shadow',
    slot: 'cape',
    name: 'Shadow Half-Cloak',
    desc: 'A black cloak thrown over one shoulder, pinned with gold clasps, falling in heavy folds to the calves.',
    colors: [col('main', 'Cloak', '#1c1b22'), col('clasp', 'Clasps', '#b8913a', 'metal')],
    draw: (g, [c, gold]) => {
      const b = g.bp;
      const Lt = b.torsoLen;
      const top = topPt(g);
      const pen: Pen = { mat: g.m(c, 'cloth'), part: 'back' };
      // Hangs behind the near arm on the left, to about mid-shin, with a pointed hem.
      cloakBack(g, pen, { len: 0.47, flare: 9, bulge: 4.2, slant: 2.2, topR: 0.5, hemR: -b.hipHalf * 0.55, folds: 2, shoulder: 0.5, zig: 2.2, tone: 'dark' });
      const fpen: Pen = { mat: pen.mat, part: 'torso' };
      const F = g.L('capeFront');
      // Rolled collar around the neck base (mostly hidden under a scarf).
      const nk = top(0.4, Lt + 0.2);
      capsule(F, add(nk, v(-3.6, 0.5)), add(nk, v(2.9, -0.1)), 1.9, 1.6, fpen, 2);
      fold(F, fpen.mat, add(nk, v(-3.2, 1.4)), add(nk, v(2.6, 1.0)), -1, 0);
      fold(F, fpen.mat, add(nk, v(-1.4, -1.2)), add(nk, v(-0.4, 1.6)), 1, 0);
      tuckUnderChin(g, F);
      // Small flat cap over the top of the near shoulder only.
      const cap = shoulderCap(g, c, 0.24, 1.1, 1, 'dark');
      // Gold clasps at both shoulders (over a scarf), plus one at the collar.
      const gp: Pen = { mat: g.m(gold, 'metal'), part: 'torso' };
      clasp(F, top(2.2, Lt - 1.6), gp, 0.7);
      const O = g.L('nearArm.over');
      clasp(O, cap.top, { ...gp, part: 'upperArmN' }, 0.7);
      clasp(O, top(b.shoulderHalf * 0.62 + 0.6, Lt - 1.1), gp, 0.7);
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
    desc: 'A weathered, hip-length brown cape with its hood bunched around the neck.',
    colors: [col('main', 'Cape', '#7d5b3b'), col('hood', 'Hood', '#5f4530')],
    draw: (g, [c, hood]) => {
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
