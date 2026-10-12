// Tops, bottoms, waist pieces and hand wear.
//
// All geometry is in 64-unit design space (rig joints, torso-local T(), limb
// parameters); primitives rasterize at the fine 128x128 resolution, so seams,
// stitching and buttons can be a single fine pixel.

import { armDepth, armJoints, armPoint, DrawCtx, fillTorso, handDraw, ItemDef, legDepth, legJoints, legPoint, Side, torsoPoly } from '../ctx';
import { add, along, ellipse, F_NO_OUTLINE, GRID, Layer, lerp, norm, PartId, PARTS, Pen, perp, poly, RES, scale, seam, ShadeFn, sub, v, Vec } from '../raster';

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
function cylShade(nx: number, ny: number): number {
  const lt = nx * LIGHT.x + ny * LIGHT.y;
  return lt > 0.5 ? 4 : lt > -0.28 ? 3 : lt > -0.68 ? 2 : 1;
}

/** Tapered segment with FLAT ends (unlike capsule), shaded as a cylinder. Good for cuffs, hems and bands. */
export function tube(L: Layer, a: Vec, b: Vec, ra: number, rb: number, pen: Pen, shade?: number | ShadeFn): void {
  const ab = sub(b, a);
  const l = Math.hypot(ab.x, ab.y);
  if (l < 0.05) {
    ellipse(L, a.x, a.y, Math.max(ra, rb), Math.max(ra, rb), pen, shade);
    return;
  }
  const d = scale(ab, 1 / l);
  const n = perp(d);
  const pts = [add(a, scale(n, ra)), add(b, scale(n, rb)), add(b, scale(n, -rb)), add(a, scale(n, -ra))];
  poly(
    L,
    pts,
    pen,
    shade ??
      ((x, y) => {
        const qx = x + 0.5 - a.x;
        const qy = y + 0.5 - a.y;
        const t = Math.max(0, Math.min(1, (qx * d.x + qy * d.y) / l));
        const r = ra + (rb - ra) * t || 1;
        const o = (qx * n.x + qy * n.y) / r;
        return cylShade(n.x * o, n.y * o);
      }),
  );
}

export type LimbKind = 'arm' | 'leg';
export const limbPt = (g: DrawCtx, k: LimbKind, s: Side, t: number): Vec => (k === 'arm' ? armPoint(g, s, t) : legPoint(g, s, t));
/** Body radius of a limb at t (0 root, 1 middle joint, 2 end). */
export function limbR(g: DrawCtx, k: LimbKind, t: number): number {
  const R = k === 'arm' ? g.bp.armR : g.bp.legR;
  return t <= 1 ? R[0] + (R[1] - R[0]) * t : R[2] + (R[3] - R[2]) * (t - 1);
}
const limbPart = (k: LimbKind, s: Side, t: number): PartId =>
  `${k === 'arm' ? (t <= 1 ? 'upperArm' : 'forearm') : t <= 1 ? 'thigh' : 'shin'}${s}` as PartId;

/**
 * Covers a limb from `from` to `to` (0 root, 1 middle joint, 2 end) with flat
 * ends, bridging the middle joint with a disc. `inflate` may taper [start, end].
 */
export function limb(
  g: DrawCtx,
  L: Layer,
  k: LimbKind,
  s: Side,
  from: number,
  to: number,
  inflate: number | [number, number],
  pen: Pen,
  opts: { shade?: number; round0?: boolean; round1?: boolean } = {},
): void {
  const inf = (t: number) => (typeof inflate === 'number' ? inflate : inflate[0] + (inflate[1] - inflate[0]) * ((t - from) / (to - from || 1)));
  const cuts = [from];
  if (from < 1 && to > 1) cuts.push(1);
  cuts.push(to);
  for (let i = 0; i < cuts.length - 1; i++) {
    const t0 = cuts[i];
    const t1 = cuts[i + 1];
    const r0 = (t0 === 1 ? limbR(g, k, 1.0001) : limbR(g, k, t0)) + inf(t0);
    const r1 = limbR(g, k, t1) + inf(t1);
    tube(L, limbPt(g, k, s, t0), limbPt(g, k, s, t1), r0, r1, { ...pen, part: limbPart(k, s, (t0 + t1) / 2) }, opts.shade);
  }
  const disc = (t: number) => {
    const p = limbPt(g, k, s, t);
    const r = Math.max(limbR(g, k, t), t === 1 ? limbR(g, k, 1.0001) : 0) + inf(t);
    ellipse(L, p.x, p.y, r, r, { ...pen, part: limbPart(k, s, t) }, opts.shade);
  };
  if (cuts.length === 3) disc(1);
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

/** Dark fold line with a lit fine line on its upper-left side: reads as a crease/ridge. */
export function crease(L: Layer, a: Vec, b: Vec, d = -1): void {
  let n = perp(norm(sub(b, a)));
  if (n.x * LIGHT.x + n.y * LIGHT.y < 0) n = scale(n, -1);
  seam(L, a, b, d);
  seam(L, add(a, scale(n, 0.5)), add(b, scale(n, 0.5)), 1);
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

/** Sleeves on both arms from 0 (shoulder) to `to` (2 = wrist), with a flat hem. */
export function sleeves(g: DrawCtx, hex: string, to: number, inflate = 0.5, kind: Kind = 'cloth'): void {
  for (const s of SIDES) {
    const L = g.L(armDepth(s, 'cloth'));
    limb(g, L, 'arm', s, 0, to, inflate, clothPen(g, hex, prt('upperArm', s), sb(s), kind), { round0: true });
  }
}

/** Trousers on both legs from 0 (hip) to `to` (2 = ankle), plus the seat on the torso. */
export function trousers(g: DrawCtx, hex: string, to: number, inflate = 0.4, waistTop = 3): void {
  fillTorso(g, g.L('torso.bottom'), 0.4, clothPen(g, hex, 'torso'), { top: waistTop });
  for (const s of SIDES) {
    const L = g.L(legDepth(s, 'cloth'));
    limb(g, L, 'leg', s, 0, to, [inflate, inflate * 0.8], clothPen(g, hex, prt('thigh', s), sb(s)), { round0: true });
  }
}

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
  const dy = g.rig.neck.y - T(0.6, Lt).y;
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
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const w = Math.max(1, maxX - minX);
  poly(
    L,
    pts,
    pen,
    shade ??
      ((x) => {
        const t = (x + 0.5 - minX) / w;
        return t < 0.2 ? 4 : t < 0.8 ? 3 : 2;
      }),
    (x, y) => {
      const l = toT(g, x, y);
      if (l.y > top + 0.01 || l.y < bottom - 0.01) return false;
      return keep ? keep(l.x, l.y) : true;
    },
  );
}

/** Diamond-net shading on every pixel of `mat` inside a layer (mesh fabric). */
function meshify(L: Layer, mat: number): void {
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] !== mat) continue;
    const x = i % GRID;
    const y = (i / GRID) | 0;
    const thread = (x + y) % 4 === 0 || (((x - y) % 4) + 4) % 4 === 0;
    L.shade[i] = thread ? Math.min(4, L.shade[i] + 1) : Math.max(1, L.shade[i] - 1);
  }
}

/** Centre-front line of the torso (zips, plackets, buttons). */
const CX = 1.6;

/** Shirt body clipped at `bottom`, with an optional V opening at the neck that lets skin show. */
function shirtBody(g: DrawCtx, L: Layer, pen: Pen, bottom: number, opts: { inflate?: number; flare?: number; vDepth?: number; vHalf?: number } = {}): void {
  const Lt = g.bp.torsoLen;
  const vd = opts.vDepth ?? 0;
  const vh = opts.vHalf ?? 2;
  fillT(g, L, opts.inflate ?? 0.5, pen, { bottom, flare: opts.flare }, (lx, ly) => {
    if (vd <= 0) return true;
    const t = (Lt + 0.6 - ly) / vd; // 0 at the neck, 1 at the tip
    if (t < 0 || t > 1) return true;
    return Math.abs(lx - CX) > (1 - t) * vh;
  });
}

/** Trim strips along both edges of a V neck opening. */
function vTrim(g: DrawCtx, L: Layer, vd: number, vh: number, w: number, pen: Pen): void {
  const Lt = g.bp.torsoLen;
  const top = Lt + 0.8;
  const tip = Lt + 0.6 - vd;
  tpoly(g, L, [[CX - vh - w, top], [CX - vh + 0.2, top], [CX + 0.1, tip], [CX - 0.2, tip - w * 0.9]], pen, 4);
  tpoly(g, L, [[CX + vh - 0.2, top], [CX + vh + w, top], [CX + 0.2, tip - w * 0.9], [CX - 0.1, tip]], pen, 3);
}

/** Ribbed crew neckline. */
function crewNeck(g: DrawCtx, L: Layer): void {
  const Lt = g.bp.torsoLen;
  tseam(g, L, -1.6, Lt + 0.5, 0.6, Lt - 0.7, -1);
  tseam(g, L, 0.6, Lt - 0.7, 3.4, Lt + 0.2, -1);
  tseam(g, L, -1.8, Lt - 0.4, 0.6, Lt - 1.6, -1);
  tseam(g, L, 0.6, Lt - 1.6, 3.8, Lt - 0.6, -1);
}

export const TOP_ITEMS: ItemDef[] = [
  {
    id: 'top_tee',
    slot: 'top',
    name: 'Training Tee',
    desc: 'Short-sleeved cotton shirt with a ribbed round collar.',
    colors: [col('main', 'Shirt', '#e8e2d4')],
    draw: (g, [c]) => {
      const L = g.L('torso.top');
      const Lt = g.bp.torsoLen;
      const pen = clothPen(g, c, 'torso');
      shirtBody(g, L, pen, 0.2);
      crewNeck(g, L);
      tcrease(g, L, -2.8, Lt - 5.6, -1.6, 2.6);
      tcrease(g, L, 3.8, Lt - 7.6, 3.0, 2.8);
      tcrease(g, L, -0.8, 2.4, 2.2, 1.6);
      tseam(g, L, -g.bp.hipHalf - 1, 1.2, g.bp.hipHalf + 1, 1.1, -1);
      sleeves(g, c, 0.56, 0.8);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        across(g, La, 'arm', s, 0.46, 0.8);
        crease(La, armPoint(g, s, 0.12), along(armPoint(g, s, 0.12), armPoint(g, s, 0.5), 1, 0.8));
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
      fillTorso(g, L, 0.5, tp, { top: 1.4, bottom: -0.6 });
      tcrease(g, L, -2.8, Lt - 5.4, -1.8, 2.2);
      tcrease(g, L, 3.8, Lt - 7.8, 3.0, 2.0);
      sleeves(g, c, 0.6, 0.8);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        limb(g, La, 'arm', s, 0.48, 0.6, 0.85, clothPen(g, t, prt('upperArm', s), sb(s)));
        crease(La, armPoint(g, s, 0.1), along(armPoint(g, s, 0.1), armPoint(g, s, 0.46), 1, 0.9));
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
      shirtBody(g, L, pen, -2.4, { flare: 0.8, vDepth: 4.2, vHalf: 2.2, inflate: 0.6 });
      vTrim(g, L, 4.2, 2.2, 0.9, tp);
      fillTorso(g, L, 0.6, tp, { top: -0.9, bottom: -2.4, flare: 0.8 });
      tstitch(g, L, -g.bp.hipHalf - 1.4, -1.3, g.bp.hipHalf + 1.4, -1.3, tp, 4, 1);
      tcrease(g, L, -3.0, Lt - 5.6, -2.2, -0.9);
      tcrease(g, L, 4.0, Lt - 7.6, 3.2, -0.9);
      tcrease(g, L, 0.4, 2.6, 2.4, -0.9);
      sleeves(g, c, 1.92, 0.6);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        limb(g, La, 'arm', s, 1.72, 1.94, 0.85, clothPen(g, t, prt('forearm', s), sb(s)));
        crease(La, armPoint(g, s, 0.82), armPoint(g, s, 1.18));
        crease(La, along(armPoint(g, s, 1.25), armPoint(g, s, 1.6), 0, -0.8), along(armPoint(g, s, 1.25), armPoint(g, s, 1.6), 1, 0.6));
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
      fillTorso(g, L, 0.35, clothPen(g, bnd, 'torso'), { top: 1.8, bottom: 0.6 });
      sleeves(g, c, 1.4, 0.3);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        meshify(La, mat);
        limb(g, La, 'arm', s, 1.24, 1.42, 0.5, clothPen(g, bnd, prt('forearm', s), sb(s)));
      }
      highCollar(g, bnd, 2, 0.4);
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
      const b = g.bp;
      const Lt = b.torsoLen;
      const pen = clothPen(g, c, 'torso');
      const ap = clothPen(g, a, 'torso');
      const zm = g.m(z, 'metal');
      shirtBody(g, L, pen, -0.8, { inflate: 0.75 });
      // Yoke across the shoulders (dipping toward the front), ribbed waistband
      fillT(g, L, 0.75, ap, {}, (lx, ly) => ly > Lt - 3.4 + Math.max(0, lx - 1) * 0.35 - (lx < -3 ? (lx + 3) * 0.3 : 0));
      fillTorso(g, L, 0.75, ap, { top: 0.8, bottom: -0.8 });
      tseam(g, L, -b.hipHalf - 1, 0, b.hipHalf + 1, 0, -1);
      // Zip: dashed metal teeth down the centre front, pull tab at the top
      tseam(g, L, CX + 0.3, Lt + 0.4, CX + 0.3, -0.8, -2);
      tstitch(g, L, CX, Lt + 0.2, CX, -0.6, { mat: zm, part: 'torso' }, 4, 1);
      button(L, TB(g, CX + 0.9, Lt - 1.2), zm, 'torso', 4);
      fpx(L, TB(g, CX + 0.9, Lt - 2.2), zm, 'torso', 3);
      // Welt pocket and drape folds
      tseam(g, L, 2.6, 4.2, 4.4, 3.2, -1);
      tcrease(g, L, -3.0, Lt - 5.4, -2.0, 1.2);
      tcrease(g, L, 0.0, 3.2, -1.4, 1.0);
      // Sleeves: accent shoulders and cuffs, piping stripe down the sleeve
      sleeves(g, c, 1.92, 0.75);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        limb(g, La, 'arm', s, 0, 0.55, 0.8, clothPen(g, a, prt('upperArm', s), sb(s)), { round0: true });
        limb(g, La, 'arm', s, 1.74, 1.94, 0.9, clothPen(g, a, prt('forearm', s), sb(s)));
        across(g, La, 'arm', s, 1.84, 0.9, -1);
        crease(La, armPoint(g, s, 0.85), armPoint(g, s, 1.18));
      }
      highCollar(g, a, 3, 0.9);
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
      // Body with the V opening of the crossed collar
      const tip = Lt - 7.0;
      fillT(g, L, 0.8, pen, { bottom: -2.6, flare: 1 }, (lx, ly) => {
        if (ly < tip) return true;
        const t = (Lt + 1 - ly) / (Lt + 1 - tip);
        return lx < -0.6 + 2.8 * t || lx > 3.4 - 1.2 * t;
      });
      // Lapels: the near lapel crosses over and continues down the front edge
      tpoly(g, L, [[-2.2, Lt + 0.9], [-0.5, Lt + 0.9], [2.7, tip - 0.2], [2.9, tip - 2.0], [1.3, tip - 0.6]], kp, 3);
      tpoly(g, L, [[3.3, Lt + 0.9], [4.6, Lt + 0.4], [3.0, tip], [2.2, tip + 0.6]], kp, 2);
      tseam(g, L, -0.6, Lt + 0.4, 2.2, tip, 1);
      tcrease(g, L, 2.9, tip - 1.8, 3.4, -2.4);
      tcrease(g, L, -3.2, Lt - 6, -2.4, -2);
      tcrease(g, L, 0.4, 3.0, 1.0, -2.2);
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
        // hanging lower corner of the sleeve
        const D = 3.4;
        const rimF = add(end, scale(n, -rEnd));
        const rimB = add(end, scale(n, rEnd));
        const mid = add(lerp(j.shoulder, end, 0.4), scale(n, R[0] + 1.2));
        tube(La, j.shoulder, end, R[0] + 0.8, rEnd, p);
        poly(La, [rimF, add(rimF, v(0, D * 0.55)), add(lerp(rimF, rimB, 0.75), v(0, D + 0.4)), add(rimB, v(0, D - 0.6)), mid], p);
        ellipse(La, j.shoulder.x, j.shoulder.y, R[0] + 0.8, R[0] + 0.8, p);
        // dark inside of the open cuff
        const inner = clothPen(g, c, prt('forearm', s), sb(s) - 1);
        tube(La, add(end, scale(dir, -0.7)), end, rEnd - 0.9, rEnd - 0.7, inner, 1);
        crease(La, add(lerp(j.shoulder, end, 0.35), scale(n, R[0] * 0.4)), add(lerp(j.shoulder, end, 0.92), scale(n, rEnd * 0.6)));
        crease(La, add(lerp(j.shoulder, end, 0.55), scale(n, -R[0] * 0.5)), add(lerp(j.shoulder, end, 0.9), scale(n, -rEnd * 0.5)));
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
      shirtBody(g, L, pen, -2.2, { flare: 0.8, vDepth: 4.6, vHalf: 1.8, inflate: 0.55 });
      vTrim(g, L, 4.6, 1.8, 0.6, tp);
      fillTorso(g, L, 0.55, tp, { top: -1.0, bottom: -2.2, flare: 0.8 });
      // Cross lacing over the V
      const lp: Pen = { mat: g.m(t, 'cloth'), part: 'torso' };
      for (let i = 0; i < 2; i++) {
        const y0 = Lt - 0.4 - i * 1.7;
        tstitch(g, L, CX - 1.4 + i * 0.5, y0, CX + 1.2 - i * 0.5, y0 - 1.5, lp, 5, 0);
        tstitch(g, L, CX + 1.2 - i * 0.5, y0, CX - 1.4 + i * 0.5, y0 - 1.5, lp, 4, 0);
      }
      tcrease(g, L, -3, Lt - 5, -2.2, -1);
      tcrease(g, L, 3.8, Lt - 8, 3.0, -1);
      tcrease(g, L, 0.2, 2.6, 1.0, -1);
    },
  },
  {
    id: 'top_royalcoat',
    slot: 'top',
    name: 'Royal Long Coat',
    desc: 'Fitted dark long coat with short sleeves, a high collar and tails to mid-shin, closed with two rows of gold buttons.',
    colors: [col('main', 'Coat', '#1f2a4a'), col('buttons', 'Buttons', '#e2b04a', 'metal'), col('trim', 'Cuffs', '#34467a')],
    draw: (g, [c, bt, tr]) => {
      const b = g.bp;
      const Lt = b.torsoLen;
      const L = g.L('torso.top');
      const pen = clothPen(g, c, 'torso');
      const bm = g.m(bt, 'metal');
      fillT(g, L, 0.7, pen, { bottom: -2.6, flare: 0.6 });
      // Overlapping front flap, fitted waist seam, side-back seams
      tcrease(g, L, CX + 2.3, Lt + 0.4, CX + 2.0, -2.4);
      tseam(g, L, -b.waistHalf - 1, 3.4, b.waistHalf + 1, 3.1, -1);
      tcrease(g, L, -2.8, Lt - 4.4, -2.4, 3.4);
      tcrease(g, L, -1.2, 2.8, -1.8, -2.4);
      // A few pairs of gold buttons on the fitted chest
      for (let y = Lt - 3.0; y > 3.2; y -= 2.6) {
        button(L, TB(g, CX - 0.9, y), bm, 'torso', 3);
        button(L, TB(g, CX + 1.3, y), bm, 'torso', 3);
      }
      // Long tails to mid-shin: closed at the front while standing, opening up in wide stances
      const O = g.L('torso.over');
      const r = g.rig;
      const T = r.T;
      const top = 0.9;
      const split = 1.7;
      /** Point on the torso-local vertical line x that sits at screen height y. */
      const onLine = (x: number, y: number): Vec => T(x, (y - r.pelvis.y - r.right.y * x) / r.up.y);
      const back = T(-b.hipHalf * 0.86 - 1.2, top);
      const front = T(b.hipHalf * 0.62 + 1.3, top);
      const hemN = legPoint(g, 'N', 1.5);
      const hemF = legPoint(g, 'F', 1.45);
      const lr = b.legR[2];
      const yN = hemN.y + 0.5;
      const yF = hemF.y;
      const cN = onLine(split, yN);
      const cF = onLine(split, yF);
      const nL = v(Math.min(hemN.x - lr - 2.6, back.x - 1.6), yN);
      // how far each panel may reach toward the centre: less as the stance widens
      const reach = Math.max(1.2, 6 - Math.max(0, hemF.x - hemN.x - 15) * 0.9);
      const nR = v(Math.max(hemN.x + lr + 1.2, Math.min(cN.x + 1.0, hemN.x + lr + reach)), yN);
      const fL = v(Math.min(hemF.x - lr - 0.8, Math.max(cF.x - 1.2, hemF.x - lr - reach)), yF);
      const fR = v(Math.max(hemF.x + lr + 2.2, front.x + 1.4), yF - 0.5);
      // Far panel first (the near panel overlaps it at the closure)
      const fTop = T(split + 0.2, top);
      poly(O, [fTop, front, fR, fL], clothPen(g, c, 'torso', -1), (x) => (x < fL.x + 1.5 ? 4 : 3));
      crease(O, lerp(fTop, front, 0.55), lerp(fL, fR, 0.62));
      const nTop = T(split, top);
      poly(O, [back, nTop, nR, nL], pen);
      crease(O, lerp(back, nTop, 0.3), lerp(nL, nR, 0.22));
      crease(O, lerp(back, nTop, 0.62), lerp(nL, nR, 0.55));
      seam(O, nTop, nR, -1);
      seam(O, add(nTop, v(0.5, 0)), add(nR, v(0.5, 0)), 1);
      // Two rows of gold buttons down the front panel
      const edgeLen = Math.hypot(nR.x - nTop.x, nR.y - nTop.y);
      const nB = Math.max(2, Math.floor((edgeLen - 1.5) / 2.4));
      for (let i = 0; i < nB; i++) {
        const p = lerp(nTop, nR, (i + 0.6) / (nB + 0.4));
        button(O, add(p, v(-1.0, 0)), bm, 'torso', 3);
        button(O, add(p, v(-2.9, 0)), bm, 'torso', 2);
      }
      seam(O, lerp(back, nTop, 0.2), add(lerp(back, nTop, 0.55), v(0, 0.4)), -1);
      // Short sleeves ending above the elbow, with a turned-up cuff
      sleeves(g, c, 0.8, 0.7);
      for (const s of SIDES) {
        const La = g.L(armDepth(s, 'cloth'));
        const tp = clothPen(g, tr, prt('upperArm', s), sb(s));
        limb(g, La, 'arm', s, 0.62, 0.82, 0.9, tp);
        across(g, La, 'arm', s, 0.63, 0.9, 1);
        stitch(La, along(armPoint(g, s, 0.72), armPoint(g, s, 0.73), 0, -limbR(g, 'arm', 0.72) - 0.5), along(armPoint(g, s, 0.72), armPoint(g, s, 0.73), 0, limbR(g, 'arm', 0.72) + 0.5), clothPen(g, bt, prt('upperArm', s), sb(s), 'metal'), 3, 1);
        crease(La, along(armPoint(g, s, 0.1), armPoint(g, s, 0.55), 0, 0.5), along(armPoint(g, s, 0.1), armPoint(g, s, 0.55), 1, 0.9));
      }
      highCollar(g, c, 4.5, 1.2);
      button(g.L('neck'), v(r.neck.x + b.neckW + 0.7, r.neck.y - 1.2), bm, 'torso', 3);
    },
  },
];

// ---------------------------------------------------------------------------
// Bottoms
// ---------------------------------------------------------------------------

/** Wide panel per leg from hip to hem (hakama): horizontal hem, straight-falling fabric. */
function widePanel(g: DrawCtx, L: Layer, s: Side, wHip: number, wHem: number, hemT: number, pen: Pen): Vec[] {
  const hip = legJoints(g.rig, s).hip;
  const hem = legPoint(g, s, hemT);
  const pts = [v(hip.x - wHip, hip.y - 1), v(hip.x + wHip, hip.y - 1), v(hem.x + wHem + 0.6, hem.y), v(hem.x - wHem, hem.y)];
  poly(L, pts, pen);
  return pts;
}

/** Drawstring / waistband stitching on the seat of a pair of trousers. */
function waistband(g: DrawCtx, top: number, pen: Pen): void {
  const L = g.L('torso.bottom');
  const hh = g.bp.hipHalf;
  tseam(g, L, -hh - 1, top - 1.1, hh + 1, top - 1.1, -1);
  tstitch(g, L, -hh - 1, top - 0.6, hh + 1, top - 0.6, pen, 4, 1);
}

export const BOTTOM_ITEMS: ItemDef[] = [
  {
    id: 'bottom_shinobi',
    slot: 'bottom',
    name: 'Shinobi Pants',
    desc: 'Fitted trousers with bandage wraps at the ankles.',
    colors: [col('main', 'Pants', '#2b3346'), col('wrap', 'Wraps', '#e7e1d1')],
    draw: (g, [c, w]) => {
      trousers(g, c, 1.8, 0.55);
      waistband(g, 3, clothPen(g, c, 'torso'));
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        crease(L, legPoint(g, s, 0.82), legPoint(g, s, 1.08));
        crease(L, along(legPoint(g, s, 0.1), legPoint(g, s, 0.7), 0.3, 1.2), along(legPoint(g, s, 0.1), legPoint(g, s, 0.7), 1, 1.6));
        crease(L, along(legPoint(g, s, 1.15), legPoint(g, s, 1.55), 0, -0.6), along(legPoint(g, s, 1.15), legPoint(g, s, 1.55), 1, 0.4));
        const wp = clothPen(g, w, prt('shin', s), sb(s));
        limb(g, L, 'leg', s, 1.56, 1.97, [0.5, 0.35], wp);
        wrapStripes(L, legPoint(g, s, 1.56), legPoint(g, s, 1.97), g.bp.legR[3] + 1, 1.0, -1, 0.7);
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
      fillTorso(g, g.L('torso.bottom'), 0.5, clothPen(g, c, 'torso'), { top: 3 });
      waistband(g, 3, clothPen(g, h, 'torso'));
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        limb(g, L, 'leg', s, 0, 0.74, [0.6, 1.2], clothPen(g, c, prt('thigh', s), sb(s)), { round0: true });
        limb(g, L, 'leg', s, 0.62, 0.76, 1.35, clothPen(g, h, prt('thigh', s), sb(s)));
        across(g, L, 'leg', s, 0.69, 1.35, 1);
        crease(L, along(legPoint(g, s, 0.1), legPoint(g, s, 0.6), 0, 1.2), along(legPoint(g, s, 0.1), legPoint(g, s, 0.6), 1, 0.4));
        crease(L, along(legPoint(g, s, 0.3), legPoint(g, s, 0.62), 0, -1.6), along(legPoint(g, s, 0.3), legPoint(g, s, 0.62), 1, -2.2));
      }
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
      const TL = g.L('torso.bottom');
      fillTorso(g, TL, 0.9, clothPen(g, c, 'torso'), { top: 4.8, flare: 1.4 });
      fillTorso(g, TL, 0.9, clothPen(g, t, 'torso'), { top: 4.8, bottom: 3.6 });
      tseam(g, TL, -b.hipHalf - 1, 4.2, b.hipHalf + 1, 4.2, 1);
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        const pen = clothPen(g, c, prt('thigh', s), sb(s));
        limb(g, L, 'leg', s, 0, 1.9, 1.2, pen, { round0: true });
        const pts = widePanel(g, L, s, b.legR[0] + 1.2, b.legR[0] + 2.6, 1.95, pen);
        // Knife pleats: shadow line with a lit fold beside it
        for (const k of [0.22, 0.48, 0.74]) crease(L, lerp(pts[0], pts[1], k), lerp(pts[3], pts[2], k - 0.04));
      }
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
      waistband(g, 3.2, clothPen(g, c, 'torso'));
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        const R = g.bp.legR;
        const pen = clothPen(g, c, prt('shin', s), sb(s));
        // bloused cuff gathered into a band
        limb(g, L, 'leg', s, 1.58, 1.8, [1.0, 1.2], pen);
        limb(g, L, 'leg', s, 1.8, 1.97, 0.5, pen, { shade: 2 });
        crease(L, legPoint(g, s, 0.84), legPoint(g, s, 1.12));
        crease(L, along(legPoint(g, s, 1.3), legPoint(g, s, 1.75), 0, -1.2), along(legPoint(g, s, 1.3), legPoint(g, s, 1.75), 1, 0.4));
        crease(L, along(legPoint(g, s, 1.45), legPoint(g, s, 1.8), 0, 1.2), along(legPoint(g, s, 1.45), legPoint(g, s, 1.8), 1, -0.6));
        if (s === 'F') continue;
        // Thigh pouch (own layer so it gets its own outline) with a buttoned flap and a leg strap
        const P = g.L(legDepth(s, 'armor'));
        const a = legPoint(g, s, 0.36);
        const bb = legPoint(g, s, 0.78);
        const off = -(R[0] * 0.3);
        const w = 1.8;
        const pp = clothPen(g, p, prt('thigh', s), sb(s), 'leather');
        limb(g, P, 'leg', s, 0.18, 0.26, 1.15, pp, { shade: 2 });
        poly(P, [along(a, bb, 0, off - w), along(a, bb, 0, off + w), along(a, bb, 1, off + w * 0.9), along(a, bb, 1, off - w * 0.9)], pp);
        poly(P, [along(a, bb, -0.04, off - w - 0.2), along(a, bb, -0.04, off + w + 0.2), along(a, bb, 0.36, off + w + 0.1), along(a, bb, 0.36, off - w - 0.1)], pp, 4);
        seam(P, along(a, bb, 0.38, off - w), along(a, bb, 0.38, off + w), -1);
        fpx(P, along(a, bb, 0.26, off), g.m('#b9c0c8', 'metal'), prt('thigh', s), 4);
        stitch(P, along(a, bb, 0.5, off - w + 0.5), along(a, bb, 0.92, off - w + 0.5), pp, 4, 1);
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
      waistband(g, 3.4, clothPen(g, c, 'torso'));
      for (const s of SIDES) {
        const L = g.L(legDepth(s, 'cloth'));
        const sp = clothPen(g, sc, prt('thigh', s), sb(s));
        const hip = legPoint(g, s, 0.06);
        const knee = legPoint(g, s, 1);
        const ank = legPoint(g, s, 1.94);
        // side seam: two fine lines along the outer side of the leg
        stitch(L, along(hip, knee, 0, -g.bp.legR[0] * 0.25), along(hip, knee, 1, -g.bp.legR[1] * 0.35), sp, 3, 0);
        stitch(L, along(knee, ank, 0, -g.bp.legR[1] * 0.35), along(knee, ank, 1, -g.bp.legR[3] * 0.3), { ...sp, part: prt('shin', s) }, 3, 0);
        crease(L, legPoint(g, s, 0.88), legPoint(g, s, 1.06));
        across(g, L, 'leg', s, 1.9, 0.2, -1);
      }
    },
  },
];

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

export const WAIST_ITEMS: ItemDef[] = [
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
      tstitch(g, L, -hh - 1.5, 3.0, hh + 1.5, 3.0, lp, 4, 1);
      tstitch(g, L, -hh - 1.5, 1.3, hh + 1.5, 1.3, lp, 4, 1);
      // belt holes on the strap end
      for (const x of [-1.6, -0.6]) button(L, TB(g, x, 2.2), lp.mat, 'torso', 1);
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
    desc: 'Wide wrapped sash tied at the hip, with a broad panel draped diagonally down the thigh to the knee.',
    colors: [col('main', 'Sash', '#2f62b5'), col('edge', 'Edge', '#1d3f80')],
    draw: (g, [c, e]) => {
      const L = g.L('waist');
      const b = g.bp;
      const hh = b.hipHalf;
      const pen = clothPen(g, c, 'torso');
      const ep = clothPen(g, e, 'torso');
      // the wrap
      band(g, L, 0.2, 5.0, 1.1, pen);
      band(g, L, 4.2, 5.0, 1.1, ep);
      tcrease(g, L, -hh - 1, 1.4, hh + 1, 2.6);
      tcrease(g, L, -hh - 1, 3.0, CX, 3.6);
      tseam(g, L, -hh * 0.6, 2.1, hh, 3.2, 2);
      // broad panel hanging from the hip diagonally down the far thigh
      const sw = Math.sin(g.rig.frame * 1.4) * 0.35;
      const kF = legPoint(g, 'F', 0.9);
      const lr = b.legR[1];
      const p0 = TB(g, CX + 0.2, 1.0);
      const p1 = TB(g, frontX(g, 1.5) + 1.5, 2.4);
      const p2 = v(Math.max(kF.x + lr + 2.0, p1.x + 0.6) + sw, kF.y + 0.4);
      const p3 = v(Math.max(kF.x - lr * 0.7, p0.x + 3.5) + sw, kF.y + 1.9);
      const m = add(lerp(p0, p3, 0.5), v(-0.9, 0.3));
      // shading in bands parallel to the diagonal left edge: two bright folds, dark far edge
      let nA = perp(norm(sub(p3, p0)));
      if (nA.x < 0) nA = scale(nA, -1);
      const W = Math.max(1, (p2.x - p0.x) * nA.x + (p2.y - p0.y) * nA.y);
      const U = (x: number, y: number) => ((x - p0.x) * nA.x + (y - p0.y) * nA.y) / W;
      poly(L, [p0, p1, p2, p3, m], pen, (x, y) => {
        const u = U(x + 0.5, y + 0.5);
        return u < 0.12 ? 3 : u < 0.3 ? 4 : u < 0.5 ? 3 : u < 0.64 ? 4 : u < 0.86 ? 3 : 2;
      });
      tube(L, p3, p2, 0.5, 0.5, ep, 2);
      const fold = (u: number, d: number) => {
        const o = scale(nA, W * u);
        seam(L, add(lerp(p0, m, 0.15), o), add(p3, add(o, v(0, 1))), d);
      };
      fold(0.21, 1);
      fold(0.57, 1);
      fold(0.36, -1);
      fold(0.74, -1);
      // the knot where the panel leaves the wrap
      const k = TB(g, CX + 0.6, 2.6);
      ellipse(L, k.x, k.y, 1.7, 1.5, pen);
      crease(L, v(k.x - 1.1, k.y - 0.7), v(k.x + 0.9, k.y + 0.7));
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
      tstitch(g, L, -b.hipHalf - 1, 2.9, b.hipHalf + 1, 2.9, pen, 5, 0);
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
      tstitch(g, L, -b.hipHalf - 1.5, 3.0, b.hipHalf + 1.5, 3.0, lp, 4, 1);
      const bm = g.m(bk, 'metal');
      const pouch = (x0: number, x1: number, y0: number, y1: number, bias: number) => {
        const pp = clothPen(g, p, 'torso', bias, 'leather');
        tpoly(g, L, [[x0, y1], [x1, y1], [x1, y0 + 0.6], [x1 - 0.6, y0], [x0 + 0.6, y0], [x0, y0 + 0.6]], pp);
        // flap
        tpoly(g, L, [[x0 - 0.2, y1 + 0.2], [x1 + 0.2, y1 + 0.2], [x1 + 0.1, y1 - 1.7], [(x0 + x1) / 2, y1 - 2.3], [x0 - 0.1, y1 - 1.7]], pp, 4);
        tseam(g, L, x0, y1 - 1.8, (x0 + x1) / 2, y1 - 2.4, -1);
        tseam(g, L, (x0 + x1) / 2, y1 - 2.4, x1, y1 - 1.8, -1);
        fpx(L, TB(g, (x0 + x1) / 2, y1 - 1.6), bm, 'torso', 4);
        tstitch(g, L, x0 + 0.4, y0 + 0.5, x1 - 0.4, y0 + 0.5, pp, 4, 1);
        tseam(g, L, x0 + 0.3, y1 - 0.1, x0 + 0.3, y0 + 0.6, 1);
      };
      pouch(-b.hipHalf * 0.86 - 1.6, -b.hipHalf * 0.86 + 1.2, -1.2, 4.0, -1);
      pouch(-3.0, -0.2, -2.0, 4.2, 0);
      pouch(b.hipHalf * 0.62 - 1.0, b.hipHalf * 0.62 + 1.4, -0.6, 4.0, 0);
      tpoly(g, L, [[CX - 0.6, 3.9], [CX + 0.8, 3.9], [CX + 0.8, 0.6], [CX - 0.6, 0.6]], { mat: bm, part: 'torso' }, 3);
      tseam(g, L, CX - 0.3, 3.6, CX - 0.3, 0.9, 1);
    },
  },
];

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

export const HAND_ITEMS: ItemDef[] = [
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
    colors: [col('main', 'Steel', '#a9b3bf', 'metal'), col('under', 'Strap', '#3b2a22', 'leather')],
    draw: (g, [c, u]) => {
      for (const s of SIDES) {
        const L = g.L(armDepth(s, 'armor'));
        const mp = clothPen(g, c, prt('forearm', s), sb(s), 'metal');
        // flared cuff at the elbow end, then lames down to the wrist
        limb(g, L, 'arm', s, 1.12, 1.4, [1.6, 1.0], mp);
        limb(g, L, 'arm', s, 1.4, 1.97, [0.9, 0.85], mp);
        across(g, L, 'arm', s, 1.4, 1.0, -1);
        across(g, L, 'arm', s, 1.68, 0.9, -1);
        const a = armPoint(g, s, 1.18);
        const bb = armPoint(g, s, 1.92);
        seam(L, along(a, bb, 0, -limbR(g, 'arm', 1.2) * 0.4), along(a, bb, 1, -limbR(g, 'arm', 1.9) * 0.4), 2);
        // leather strap
        limb(g, L, 'arm', s, 1.52, 1.6, 1.0, clothPen(g, u, prt('forearm', s), sb(s), 'leather'));
        button(L, along(armPoint(g, s, 1.52), armPoint(g, s, 1.6), 0.5, -0.2), mp.mat, prt('forearm', s), 4 + sb(s));
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
];
