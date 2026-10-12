// Body armor and armored / cloth skirts. Each armor maps to a legacy armor
// style for its AC bonus (`statsArmor`), so gameplay stats keep working.
//
// Everything is drawn in body-local coordinates (torso-local, arm-local,
// hip-to-knee blends) so a piece follows the rig in every pose and on every
// body type. Shapes are defined in design units and rasterized per FINE
// pixel, so plate seams, lacing, stitching and rivets can be 1 fine px.

import { armDepth, armJoints, DrawCtx, ItemDef, legDepth, legJoints, Side, torsoPoly } from '../ctx';
import { add, capsule, ellipse, fine, GRID, Layer, lerp, norm, Pen, perp, poly, RES, scale, sub, v, Vec } from '../raster';

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
  return d > 0.86 ? 5 : d > 0.62 ? 4 : d > 0.3 ? 3 : d > 0.0 ? 2 : 1;
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

/** Default horizontal torso shading (lit back, shaded front). */
const tside = (t: number) => (t < 0.2 ? 4 : t < 0.8 ? 3 : 2);
/** -1/0/+1 light offset across the torso. */
const tlight = (t: number) => (t < 0.22 ? 1 : t > 0.8 ? -1 : 0);

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

/** 2x2 fine-pixel rivet / stud with a highlight, at a design point. */
function stud(L: Layer, p: Vec, pen: Pen, s = 4): void {
  const fx = fine(p.x);
  const fy = fine(p.y);
  put(L, fx, fy, pen, Math.min(5, s + 1));
  put(L, fx + 1, fy, pen, s - 1);
  put(L, fx, fy + 1, pen, s - 1);
  put(L, fx + 1, fy + 1, pen, Math.max(1, s - 3));
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

/** Fills fine pixels around a limb segment with a function of limb-local coords (a along, b across/outward). */
function lfill(L: Layer, f: LimbFrame, pen: Pen, pad: number, fn: (a: number, b: number) => S): void {
  scan(Math.min(f.o.x, f.e.x) - pad, Math.min(f.o.y, f.e.y) - pad, Math.max(f.o.x, f.e.x) + pad, Math.max(f.o.y, f.e.y) + pad, (fx, fy, x, y) => {
    const d = v(x - f.o.x, y - f.o.y);
    put(L, fx, fy, pen, fn(dotv(d, f.u), dotv(d, f.w)));
  });
}

/** Screen-space shade of a limb surface at across-offset b (cylinder), tilted along the limb by `tilt` (-1 faces up the limb). */
function limbShade(f: LimbFrame, b: number, half: number, tilt = 0): number {
  const n = add(scale(f.w, clamp(b / half, -1, 1)), scale(f.u, tilt));
  return lit(n.x, n.y);
}

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
  /** Rivet on the cap too. */
  capRivet?: boolean;
  /** How much the guard follows the arm's rotation (0 = hangs from the torso, 1 = rigid on the arm). */
  follow?: number;
}

/** Segmented shoulder guard: a domed cap plus overlapping curved lames that follow the upper arm. */
function pauldron(g: DrawCtx, s: Side, pen: Pen, o: PauldronOpts): void {
  const L = g.L(armDepth(s, 'armor'));
  // Guards hang from the shoulder strap, so they only follow the arm part of the way.
  const f0 = armFrame(g, s, 0);
  const down = scale(g.rig.up, -1);
  const u = norm(add(scale(down, 1 - (o.follow ?? 0.55)), scale(f0.u, o.follow ?? 0.55)));
  const w = scale(perp(u), s === 'N' ? 1 : -1);
  const out = o.out ?? 0.5;
  const f: LimbFrame = { ...f0, u, w, o: add(f0.o, scale(w, out)) };
  const flare = o.flare ?? 0.25;
  const curve = o.curve ?? 0.7;
  const p = onLimb(pen, s, 'upperArm');
  const edge = o.edge ? onLimb(o.edge, s, 'upperArm') : null;
  const bottom = o.capEnd + o.n * o.step;
  const hw = (a: number) => o.half + flare * clamp((a - o.capEnd) / o.step, 0, o.n);
  /** Lame boundary k (0 = cap/first lame) at across-offset b. */
  const bound = (k: number, b: number) => o.capEnd + k * o.step + curve * (1 - clamp((b / hw(o.capEnd + k * o.step)) ** 2, 0, 1));
  const pad = o.half + flare * o.n + o.top + bottom;
  lfill(L, f, p, pad, (a, b) => {
    const h = hw(a);
    if (Math.abs(b) > h) return null;
    if (a < 0) {
      // dome above the shoulder
      if ((a / o.top) ** 2 + (b / o.half) ** 2 > 1) return null;
    }
    if (a > bound(o.n, b)) return null;
    if (a < bound(0, b)) {
      // cap
      const n = add(scale(f.w, b / o.half), scale(f.u, clamp(a / o.top, -1, 0.3) - 0.35));
      let sh = lit(n.x, n.y);
      const spec = add(scale(f.w, b / o.half + 0.35), scale(f.u, a / o.top + 0.45));
      if (sh >= 4 && Math.hypot(spec.x, spec.y) < 0.35) sh = 5;
      if (bound(0, b) - a < FP) sh = Math.max(1, sh - 1);
      return sh;
    }
    let k = 0;
    while (k < o.n - 1 && a >= bound(k + 1, b)) k++;
    const d0 = a - bound(k, b);
    const d1 = bound(k + 1, b) - a;
    if (d0 < FP) return 1; // shadow under the plate above
    if (edge && (o.edgeAll || k === o.n - 1) && d1 < FP * 1.1) return null; // rim drawn with the edge pen
    let sh = limbShade(f, b, h, -0.9 + (d0 / o.step) * 1.2);
    if (d0 < FP * 2) sh = Math.min(5, sh + 1); // lit upper rim
    return sh;
  });
  if (edge)
    lfill(L, f, edge, pad, (a, b) => {
      const h = hw(a);
      if (Math.abs(b) > h || a < bound(0, b)) return null;
      for (let k = o.edgeAll ? 0 : o.n - 1; k < o.n; k++) {
        const d1 = bound(k + 1, b) - a;
        if (d1 >= 0 && d1 < FP * 1.1) return limbShade(f, b, h, -0.2);
      }
      return null;
    });
  if (o.rivet) {
    const rp = onLimb(o.rivet, s, 'upperArm');
    for (let k = 0; k < o.n; k++) stud(L, add(f.o, add(scale(f.u, o.capEnd + (k + 0.45) * o.step + curve), scale(f.w, -0.2))), rp, 4);
    if (o.capRivet) stud(L, add(f.o, add(scale(f.u, -o.top * 0.35), scale(f.w, -0.2))), rp, 4);
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
    const rad = (t: number) => R[2] + (R[3] - R[2]) * t + grow;
    const at = (a: number) => a / Math.max(0.01, f.len);
    lfill(L, f, p, R[2] + grow + 1, (a, b) => {
      const t = at(a);
      if (t < from || t > to) return null;
      const rr = rad(t);
      if (Math.abs(b) > rr) return null;
      let sh = limbShade(f, b, rr, -0.15);
      if (o.lines?.some((l) => Math.abs(t - l) * f.len < FP * 0.75)) sh = 1;
      return sh;
    });
    if (o.rim) {
      const rp = onLimb(o.rim, s, 'forearm');
      lfill(L, f, rp, R[2] + grow + 1, (a, b) => {
        const t = at(a);
        if (t < from || t > to) return null;
        const rr = rad(t) + 0.15;
        if (Math.abs(b) > rr) return null;
        if ((t - from) * f.len < FP * 2.2 || (to - t) * f.len < FP * 2.2) return limbShade(f, b, rr, -0.3);
        return null;
      });
    }
    if (o.cop) {
      const c = add(f.o, scale(f.w, 0.3));
      ellipse(L, c.x, c.y, R[1] + grow + 0.4, R[1] + grow + 0.4, p);
      const q = add(c, v(-0.5, -0.6));
      put(L, fine(q.x), fine(q.y), p, 5);
    }
    if (o.rivet) {
      const rp = onLimb(o.rivet, s, 'forearm');
      stud(L, add(f.o, add(scale(f.u, f.len * (from + to) * 0.5), scale(f.w, 0.5))), rp, 4);
    }
  }
}

/** Ring around the base of the neck (neck depth). Optional rim along its top edge. */
function collar(g: DrawCtx, pen: Pen, height: number, width: number, rim?: Pen | null): void {
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
    let sh = nx < -0.45 ? 4 : nx > 0.5 ? 2 : 3;
    if (!inside(x, y - FP * 2)) {
      if (rim) return put(L, fx, fy, rim, nx < -0.3 ? 5 : nx > 0.5 ? 3 : 4);
      sh = Math.min(5, sh + 1);
    }
    put(L, fx, fy, pen, sh);
  });
}

// --- skirts -----------------------------------------------------------------

interface Hang {
  top: Vec;
  bot: Vec;
  /** 0 = follows the near thigh, 1 = the far thigh. */
  w: number;
}

/**
 * Where a hanging panel attached at waist-local x `lx` ends up: it follows a
 * blend of the two thigh directions, `k` thigh-lengths below the hips, so
 * the hem spreads when the legs do.
 */
function hang(g: DrawCtx, lx: number, ytop: number, k: number, droop = 0.8, flare = 0.12): Hang {
  const r = g.rig;
  const b = g.bp;
  const xN = -b.hipHalf * 0.55;
  const xF = b.hipHalf * 0.45;
  const w = clamp((lx - xN) / (xF - xN), 0, 1);
  const N = legJoints(r, 'N');
  const F = legJoints(r, 'F');
  const dir = lerp(sub(N.knee, N.hip), sub(F.knee, F.hip), w);
  const c = -0.6;
  const dr = droop * (1 - clamp(((lx - c) / b.hipHalf) ** 2, 0, 1));
  const bot = add(add(r.T(lx * (1 + flare), 0.5), scale(dir, k)), v(0, dr));
  return { top: r.T(lx, ytop), bot, w };
}

/** Waist-local x range of the hips (back edge .. front edge). */
function hipRange(g: DrawCtx, grow = 0): [number, number] {
  const b = g.bp;
  return [-b.hipHalf * 0.86 - 0.6 - grow, b.hipHalf * 0.62 + 0.6 + grow];
}

/** Position inside one skirt column. */
interface Cell {
  i: number;
  /** 0 at the waist .. 1 at the hem. */
  down: number;
  /** 0 at the column's back edge .. 1 at its front edge. */
  across: number;
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
  flare = 0.12,
): void {
  const kk = (lx: number) => (typeof k === 'number' ? k : k(lx));
  for (let i = 0; i < xs.length - 1; i++) {
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
      return fn({ i, down, across, w, cw: Math.sqrt(s2), ch });
    });
  }
}

const thighPart = (w: number): Pen['part'] => (w < 0.5 ? 'thighN' : 'thighF');

function spread(a: number, b: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
  return out;
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
  if (m < FP * 2) return 'lace';
  return 'plate';
}
/** Lace stitches every 3 fine pixels across. */
const laceCol = (x: number) => mod(Math.floor(x * RES), 3) === 0;

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
    colors: [col('main', 'Vest', '#5d7a3a'), col('pouch', 'Pouches', '#516c33')],
    statsArmor: 'Leaf Chunin Flak',
    draw: (g, [c, pc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const pen = armorPen(g, c);
      const pouch = armorPen(g, pc);
      const top = chestTop(g);
      const cx = 1.2;
      tfill(
        g,
        L,
        1.3,
        pen,
        (lx, ly, t) => {
          let s = tside(t);
          // quilted ribs on the back panel
          if (lx < cx - 2.2 && ly < top - 2.4 && ly > 1.6) {
            const q = mod(ly - 1.6, 2.2);
            if (q < FP) return Math.max(1, s - 2);
            if (q < FP * 2) s -= 1;
            else if (q > 2.2 - FP) s += 1;
          }
          // side seam between back and front panels
          if (Math.abs(lx - (cx - 2.2)) < FP * 0.5) return Math.max(1, s - 1);
          // zipper: dark track with lighter teeth
          if (Math.abs(lx - cx) < FP * 0.5) return 1;
          if (lx > cx - FP * 1.5 && lx < cx - FP * 0.5) return mod(ly, 1) < FP ? 4 : s;
          if (ly < 1.0 + FP * 2) return Math.max(1, s - 1); // hem
          if (ly > top - 0.2 - FP * 2) s += 1;
          return clamp(s, 1, 5);
        },
        { top: top - 0.2, bottom: 1.0 },
      );
      // padded shoulder yoke
      tpoly(g, L, [[-b.shoulderHalf * 0.92, top - 0.3], [-1.2, top + 0.3], [-1.0, top - 2.0], [-b.shoulderHalf * 0.92, top - 2.6]], pen, (lx, ly) => {
        if (ly < top - 2.0 - FP * 0.2 + (lx + 1) * 0.1 && ly < top - 1.9) return 1;
        return lx < -3.2 ? 4 : 3;
      });
      // scroll pouches: two on the front half, one tucked at the back
      const fr = b.chestHalf * 0.62 + 0.5 + b.bust * 0.3;
      const ph = clamp(top * 0.3, 3, 4.2);
      const py = top - 5.2;
      const pouches: [number, number][] = [
        [cx + 0.8, fr],
        [cx - 3.4, cx - 0.7],
      ];
      for (const [x0, x1] of pouches) {
        tpoly(g, L, [[x0, py], [x1, py], [x1, py - ph], [x0, py - ph]], pouch, (lx, ly) => {
          const fromTop = py - ly;
          if (fromTop < FP) return 4; // flap top edge
          if (fromTop < 1.1) return lx > x1 - FP * 2 ? 2 : 3; // flap
          if (fromTop < 1.1 + FP) return 1; // flap shadow
          if (lx > x1 - FP * 2) return 2;
          if (lx < x0 + FP) return 4;
          if (py - ph - ly > -FP) return 1;
          return 3;
        });
        // snap button on the flap
        tpx(g, L, (x0 + x1) / 2, py - 0.6, pouch, 5);
        // scroll caps peeking above the flap
        tpx(g, L, x0 + 0.6, py + 0.3, pouch, 4);
        tpx(g, L, x0 + 1.4, py + 0.3, pouch, 4);
      }
      // rolled collar with the roll seam
      collar(g, pen, 2.2, 2.0);
      const r = g.rig;
      const N = g.L('neck');
      scan(r.neck.x - 5, r.neck.y - 3, r.neck.x + 5, r.neck.y, (fx, fy, x, y) => {
        if (!N.has(fx, fy) || N.getShade(fx, fy) === 0) return;
        if (Math.abs(y - (r.neck.y - 1.1 + (x - r.neck.x) * 0.12)) < FP * 0.5) N.reshade(fx, fy, 1);
      });
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_shadowops',
    slot: 'armor',
    name: 'Shadow Ops Chestguard',
    desc: 'Segmented pale ceramic plates over a dark under-suit, one shoulder guard and forearm guards (+3 AC).',
    colors: [col('plate', 'Plates', '#d9dde4'), col('suit', 'Under-suit', '#262833')],
    statsArmor: 'ANBU Spec-Ops',
    draw: (g, [pc, sc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const plate = armorPen(g, pc);
      const suit = armorPen(g, sc);
      const top = chestTop(g);
      const cx = 1.2;
      // under-suit with a fine rib texture
      tfill(g, L, 0.6, suit, (_lx, ly, t) => (mod(ly, 1) < FP && t > 0.1 ? Math.max(1, tside(t) - 1) : tside(t)), { top: top + 0.2, bottom: 0.8 });
      // chest plate (front two-thirds), with a sternum groove
      const backX = -b.chestHalf * 0.55;
      const pTop = top - 0.6;
      const pBot = top - 6.8;
      tfill(
        g,
        L,
        1.1,
        plate,
        (lx, ly, t) => {
          const back = backX + (pTop - ly) * 0.15;
          if (lx < back) return null;
          if (ly > pTop - 1.2 && lx < -1.2) return null; // neck opening
          if (lx - back < FP || pTop - ly < FP) return 5; // lit rims
          if (ly - pBot < FP) return 2; // lower rim
          if (Math.abs(lx - cx) < FP * 0.5) return 2;
          if (lx < cx && lx > cx - FP * 2) return 5;
          let s = tside(t) + 1;
          if (lx > cx + 2.2 && ly < pBot + 1.5) s -= 1;
          return clamp(s, 2, 5);
        },
        { top: pTop, bottom: pBot },
      );
      // segmented abdomen plates
      for (let i = 0; i < 3; i++) {
        const y1 = pBot - 0.6 - i * 1.9;
        const y0 = y1 - 1.4;
        if (y0 < 0.9) break;
        tfill(
          g,
          L,
          0.9 - i * 0.15,
          plate,
          (lx, ly, t) => {
            if (lx < -b.waistHalf * 0.55) return null;
            if (y1 - ly < FP) return 5;
            if (ly - y0 < FP) return 2;
            return clamp(tside(t), 2, 4);
          },
          { top: y1, bottom: y0 },
        );
      }
      // one shoulder guard (near side) and forearm guards
      pauldron(g, 'N', plate, { top: 2.4, capEnd: 1.0, step: 1.7, n: 2, half: b.armR[0] + 1.1, flare: 0.2, curve: 0.6 });
      bracer(g, plate, { from: 0.18, to: 0.88, grow: 0.5, lines: [0.52], rim: null });
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
    colors: [col('steel', 'Steel', '#aeb7c2', 'metal'), col('sash', 'Sash', '#b3202a'), col('trim', 'Trim', '#d4a531', 'metal')],
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
      const bandTop = top - 5.2;
      const bandBot = 0.8;
      const nb = Math.max(3, Math.round((bandTop - bandBot) / 1.9));
      const bh = (bandTop - bandBot) / nb;
      const hw = b.chestHalf;
      tfill(
        g,
        L,
        1.1,
        steel,
        (lx, ly, t) => {
          const side = tlight(t);
          if (ly < bandTop) {
            // girth hoops: each a convex strip (lit top rim, shadow under it), curving with the body
            const u = clamp((lx + 0.8) / hw, -1, 1);
            const yy = ly + 0.45 * (1 - u * u) - bandBot;
            const d = mod(yy, bh);
            if (d < FP) return 1;
            if (d < FP * 2) return clamp(2 + side, 1, 3);
            if (d > bh - FP) return clamp(4 + side, 3, 5);
            return clamp(3 + side, 2, 4);
          }
          const dy = ly - bandTop;
          if (dy < FP) return 1; // breastplate lower edge
          if (dy < FP * 2) return clamp(4 + side, 3, 5);
          // collar plates
          const cTop = top - 2.0;
          if (Math.abs(ly - cTop) < FP * 0.5) return 1;
          if (ly > cTop && ly < cTop + FP * 1.5) return clamp(4 + side, 3, 5);
          // central hinge line and a specular streak beside it
          if (Math.abs(lx - cx) < FP * 0.5) return 1;
          if (lx < cx - FP && lx > cx - FP * 3 && ly < cTop) return 5;
          if (lx < cx - FP * 3 && lx > cx - 2.6 && ly < cTop) return clamp(4 + side, 3, 5);
          return clamp(3 + side + (ly > top - 0.2 - FP * 2 ? 1 : 0), 2, 5);
        },
        { top: top - 0.2, bottom: bandBot },
      );
      // gold closures at the front of every hoop, small steel rivets at the back
      for (let i = 0; i < nb; i++) {
        const y = bandBot + (i + 0.5) * bh;
        tstud(g, L, cx + 0.2, y - 0.1, trim, 4);
        tpx(g, L, -hw * 0.62, y, steel, 5);
      }
      // breastplate hinges / buckles
      tstud(g, L, cx - 1.5, bandTop + 1.3, trim, 4);
      tstud(g, L, cx + 1.6, bandTop + 1.3, trim, 3);
      tstud(g, L, -hw * 0.5, top - 1.0, trim, 4);
      // sash across the chest: near shoulder down to the front hip, knotted
      const S = g.L('torso.over');
      const p0: [number, number] = [-b.shoulderHalf * 0.75, top + 0.3];
      const p1: [number, number] = [b.waistHalf * 0.64 + 0.6, 2.4];
      tband(g, S, p0, p1, 1.45, sash, (al, ac) => {
        if (ac > 1.45 - FP * 1.5) return 4; // lit upper edge
        if (ac < -1.45 + FP * 1.5) return 2;
        if (Math.abs(ac - 0.1 + mod(al, 3.4) * 0.05) < FP * 0.5) return 2; // long fold
        return 3;
      });
      // knot and two tails at the front hip
      const kp = r.T(p1[0] - 0.3, p1[1] + 0.3);
      ellipse(S, kp.x, kp.y, 1.7, 1.5, sash, (x, y) => {
        const dx = x + 0.5 - kp.x;
        const dy = y + 0.5 - kp.y;
        if (Math.abs(dx - dy * 0.3) < FP * 0.6 && dy > -1) return 1;
        return lit(dx, dy);
      });
      const t0 = r.T(p1[0] + 0.2, p1[1] - 0.8);
      const t1 = r.T(p1[0] + 0.8, -1.4);
      capsule(S, t0, t1, 0.9, 1.25, sash, (x, y) => {
        const along = (x + 0.5 - t0.x) * 0.2;
        return x + 0.5 < lerp(t0, t1, clamp((y + 0.5 - t0.y) / Math.max(1, t1.y - t0.y), 0, 1)).x - 0.3 ? 4 : along > 0.3 ? 2 : 3;
      });
      const u0 = r.T(p1[0] - 0.5, p1[1] - 0.7);
      capsule(S, u0, r.T(p1[0] - 1.5, -0.6), 0.8, 1.0, sash, 2);
      // shoulder lames with a gold rim on the last one
      for (const s of SIDES)
        pauldron(g, s, steel, { top: 2.6, capEnd: 0.6, step: 1.45, n: 3, half: b.armR[0] + 1.2, flare: 0.3, curve: 0.8, edge: trim });
      // gold rivet on each shoulder cap
      for (const s of SIDES) {
        const f = armFrame(g, s, 0);
        stud(g.L(armDepth(s, 'armor')), add(sub(f.o, scale(f.u, 1.3)), scale(f.w, 0.9)), onLimb(trim, s, 'upperArm'), 4);
      }
      // red neck scarf
      collar(g, sash, 1.8, 1.0);
      const N = g.L('neck');
      scan(r.neck.x - 5, r.neck.y - 4, r.neck.x + 5, r.neck.y + 1, (fx, fy, x, y) => {
        if (!N.has(fx, fy) || N.getShade(fx, fy) === 0) return;
        if (Math.abs(y - (r.neck.y - 1.0 + (x - r.neck.x) * 0.25)) < FP * 0.5) N.reshade(fx, fy, 2);
      });
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
      const plate = armorPen(g, pc);
      const lace = armorPen(g, lc);
      const trim = armorPen(g, tc, 'metal');
      const top = chestTop(g);
      const rows0 = 0.8;
      const rowsTop = top - 4.2;
      const rh = LAM_ROW;
      // laced plate rows
      tfill(
        g,
        L,
        1.2,
        plate,
        (lx, ly, t) => {
          if (ly >= rowsTop) return null;
          const k = lamRow(ly - rows0, rh);
          if (k === 'lace') return laceCol(lx) ? null : clamp(tside(t) - 2, 1, 2);
          return clamp(tside(t) + (k === 'rim' ? 1 : 0), 1, 5);
        },
        { top: rowsTop, bottom: rows0 },
      );
      tfill(
        g,
        L,
        1.2,
        lace,
        (lx, ly, t) => (ly < rowsTop && lamRow(ly - rows0, rh) === 'lace' && laceCol(lx) ? clamp(tside(t), 2, 4) : null),
        { top: rowsTop, bottom: rows0 },
      );
      // breast plate (muna-ita): dark board with a gold rim and corner fittings
      tfill(
        g,
        L,
        1.2,
        lace,
        (_lx, ly, t) => {
          if (ly - rowsTop < FP * 2) return null;
          return clamp(tside(t) + (ly > top - 0.2 - FP * 2 ? 2 : 1), 2, 5);
        },
        { top: top - 0.2, bottom: rowsTop },
      );
      tfill(g, L, 1.2, trim, (_lx, ly, t) => (ly - rowsTop < FP * 2 ? clamp(tside(t) + (ly - rowsTop < FP ? 0 : 1), 2, 5) : null), { top: rowsTop + FP * 2, bottom: rowsTop });
      tstud(g, L, -b.chestHalf * 0.5, rowsTop + 1.4, trim, 4);
      tstud(g, L, b.chestHalf * 0.4, rowsTop + 1.4, trim, 3);
      // big rectangular shoulder plates (sode), hanging from the shoulder
      for (const s of SIDES) {
        const f0 = armFrame(g, s, 0);
        const u = norm(add(scale(g.rig.up, -0.45), scale(f0.u, 0.55)));
        const f: LimbFrame = { ...f0, u, w: scale(perp(u), s === 'N' ? 1 : -1) };
        const A = g.L(armDepth(s, 'armor'));
        const R = b.armR[0];
        const p = onLimb(plate, s, 'upperArm');
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
        lfill(A, f, p, R + 6, (a, bb) => {
          const aa = rect(a, bb);
          if (aa < board) return null;
          const k = lamRow(a1 - a0 - aa, rh);
          const base = limbShade(f, bb, bOut, -0.4);
          if (k === 'lace') return laceCol(bb) ? null : clamp(base - 2, 1, 2);
          return clamp(base + (k === 'rim' ? 1 : 0), 1, 5);
        });
        lfill(A, f, lp, R + 6, (a, bb) => {
          const aa = rect(a, bb);
          if (aa < 0) return null;
          if (aa < board - FP) return limbShade(f, bb, bOut, -0.8) + 1; // top board (kanmuri-ita)
          if (aa < board) return null;
          return lamRow(a1 - a0 - aa, rh) === 'lace' && laceCol(bb) ? limbShade(f, bb, bOut, 0) : null;
        });
        lfill(A, f, tp, R + 6, (a, bb) => {
          const aa = rect(a, bb);
          return aa >= board - FP && aa < board ? limbShade(f, bb, bOut, -0.5) + 1 : null;
        });
      }
      // gold-rimmed collar
      collar(g, lace, 1.6, 1.0, trim);
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_leather',
    slot: 'armor',
    name: 'Ember Leather Armor',
    desc: 'Studded dark leather cuirass with layered shoulder guards, a wide belt, bracers and a flame engraving (+3 AC).',
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
      tfill(
        g,
        L,
        1.2,
        lea,
        (lx, ly, t) => {
          const side = tlight(t);
          if (ly < beltTop) {
            // wide belt: lit top rim, stitched lines
            if (beltTop - ly < FP) return 4 + (side > 0 ? 1 : 0);
            if (ly < 1.0 + FP) return 1;
            if ((Math.abs(ly - (beltTop - 0.6)) < FP * 0.5 || Math.abs(ly - 1.5) < FP * 0.5) && Math.round(lx * RES) % 2 === 0) return 4;
            return clamp(2 + side, 1, 3);
          }
          if (ly < plateBot) return 1;
          // cuirass: molded chest, stitched border under the collar and along the front opening
          if (Math.abs(lx - cx) < FP * 0.5) return 1;
          if (Math.abs(lx - (cx - FP * 2)) < FP * 0.5 && Math.round(ly * RES) % 2 === 0) return 4;
          if (Math.abs(ly - (top - 1.5)) < FP * 0.5 && Math.round(lx * RES) % 2 === 0) return 4;
          if (ly > top - 1.2) return clamp(3 + side + 1, 2, 5);
          // chest swell (lit upper area on the near pec)
          if (ly > top - 6.5 && lx > cx - 3.8 && lx < cx - 1 && ly < top - 2.2) return clamp(4 + side, 3, 5);
          if (ly < top - 6.6 && ly > top - 6.6 - FP && lx > -b.chestHalf * 0.6) return 1; // under-pec line
          return clamp(3 + side, 2, 4);
        },
        { top: top - 0.2, bottom: 0.8 },
      );
      // buckle
      tpoly(g, L, [[cx - 0.6, beltTop - 0.4], [cx + 1.6, beltTop - 0.4], [cx + 1.6, 1.3], [cx - 0.6, 1.3]], studP, (lx, ly) => {
        if (lx > cx + 0.1 && lx < cx + 0.9 && ly > 2.0 && ly < beltTop - 1.1) return 1;
        return lx < cx ? 4 : ly > beltTop - 0.9 ? 4 : 2;
      });
      // studs along the collar and the back edge
      for (let x = -b.chestHalf * 0.72; x < b.chestHalf * 0.5; x += 1.8) tstud(g, L, x, top - 2.4, studP, 4);
      for (let y = plateBot + 1.4; y < top - 3.5; y += 1.8) tstud(g, L, -b.waistHalf * 0.62, y, studP, 4);
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
        '.abccba.',
        '..abba..',
        '...aa...',
      ];
      const fk: Record<string, [Pen, number]> = { a: [eng, 2], b: [eng, 3], c: [eng, 4] };
      mask(L, g.rig.T(cx + 0.4, top - 2.9), flame, fk);
      const small = ['..a..', '..ab.', '.abb.', 'abcb.', '.abb.', '..a..'];
      mask(L, g.rig.T(cx - 3.3, top - 3.7), small, fk);
      // layered shoulder plates with studs
      for (const s of SIDES)
        pauldron(g, s, lea, { top: 2.4, capEnd: 0.5, step: 1.5, n: 3, half: b.armR[0] + 1.1, flare: 0.3, curve: 0.8, rivet: studP });
      // forearm bracers with straps
      bracer(g, lea, { from: 0.15, to: 0.92, grow: 0.55, lines: [0.4, 0.68], rim: armorPen(g, lc, 'leather', 'torso', 1), rivet: studP });
      collar(g, lea, 1.9, 1.1, armorPen(g, lc, 'leather', 'torso', 1));
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_desert',
    slot: 'armor',
    name: 'Desert Wrap Vest',
    desc: 'Sand-colored wrapped cloth vest with a diagonal leather strap (+2 AC).',
    colors: [col('wrap', 'Wraps', '#cfb07a'), col('strap', 'Strap', '#6b4a2b', 'leather')],
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
          // overlapping wraps: a thin shadow under each wrap edge, a lit rim above it
          const d = mod(ly + lx * 0.42, 2.9);
          let s = tside(t);
          if (d < FP) s -= 1;
          else if (d > 2.9 - FP && t < 0.75) s += 1;
          if (ly < 1.2 + FP) s -= 1;
          return clamp(s, 1, 5);
        },
        { top: top - 0.3, bottom: 1.2 },
      );
      // strap from the far shoulder down to the near hip, with a pouch
      const S = g.L('torso.over');
      const p0: [number, number] = [b.shoulderHalf * 0.5, top + 0.2];
      const p1: [number, number] = [-b.hipHalf * 0.8, 1.4];
      tband(g, S, p0, p1, 0.95, strap, (al, ac) => {
        if (Math.abs(ac) < FP * 0.5 && mod(al, 1) < 0.5) return 4; // stitching
        if (ac > 0.95 - FP) return 4;
        return ac < -0.95 + FP ? 2 : 3;
      });
      const m = lerp(v(p0[0], p0[1]), v(p1[0], p1[1]), 0.55);
      tpoly(g, S, [[m.x - 1.4, m.y + 1.2], [m.x + 1.5, m.y + 1.2], [m.x + 1.5, m.y - 1.7], [m.x - 1.4, m.y - 1.7]], strap, (lx, ly) => {
        if (m.y + 1.2 - ly < FP) return 4;
        if (Math.abs(ly - (m.y + 0.2)) < FP * 0.5) return 1; // flap edge
        return lx > m.x + 1.5 - FP * 2 ? 2 : 3;
      });
      tstud(g, S, m.x, m.y + 0.6, buckle, 4);
      // loose cowl with folds
      collar(g, wrap, 2.1, 1.9);
      const r = g.rig;
      const N = g.L('neck');
      scan(r.neck.x - 6, r.neck.y - 4, r.neck.x + 6, r.neck.y + 1, (fx, fy, x, y) => {
        if (!N.has(fx, fy) || N.getShade(fx, fy) === 0) return;
        const d = mod(y - r.neck.y + (x - r.neck.x) * 0.35, 1.4);
        if (d < FP) N.reshade(fx, fy, Math.max(1, N.getShade(fx, fy) - 1));
      });
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_storm',
    slot: 'armor',
    name: 'Storm Flak',
    desc: 'Heavy slate-grey flak vest with vertical quilting and a tall throat guard (+3 AC).',
    colors: [col('main', 'Vest', '#47525f'), col('trim', 'Straps', '#9aa5b3', 'metal')],
    statsArmor: 'Mist Storm Vest',
    draw: (g, [c, tc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const pen = armorPen(g, c);
      const trim = armorPen(g, tc, 'metal');
      const top = chestTop(g);
      const cx = 1.2;
      tfill(
        g,
        L,
        1.6,
        pen,
        (lx, ly, t) => {
          let s = tside(t);
          const q = mod(lx + 0.4, 2.3);
          if (q < FP) return Math.max(1, s - 2);
          if (q < FP * 2) s += 1;
          else if (q > 2.3 - FP) s -= 1;
          if (Math.abs(ly - (top - 2.6)) < FP * 0.5) return 1; // yoke seam
          if (ly > top - 2.6 && ly < top - 2.6 + FP * 1.5) s += 1;
          if (ly < 1.8) s = Math.min(s, 2);
          if (ly > top - 0.2 - FP * 2) s += 1;
          return clamp(s, 1, 5);
        },
        { top: top - 0.2, bottom: 0.8 },
      );
      // belly pouches
      const fr = b.waistHalf * 0.64 + 1.6;
      for (const [x0, x1] of [
        [cx + 0.5, fr],
        [cx - 3.0, cx - 0.5],
      ] as const) {
        tpoly(g, L, [[x0, 7.2], [x1, 7.2], [x1, 4.2], [x0, 4.2]], pen, (lx, ly) => {
          if (7.2 - ly < FP) return 4;
          if (Math.abs(ly - 6.1) < FP * 0.5) return 1;
          if (lx > x1 - FP * 2) return 2;
          return 3;
        });
        tpx(g, L, (x0 + x1) / 2, 6.5, trim, 5);
      }
      // waist strap with buckle
      tfill(g, L, 1.7, trim, (_lx, ly, t) => (3.6 - ly < FP ? 4 : clamp(tside(t) - (ly < 2.7 + FP ? 1 : 0), 1, 4)), { top: 3.6, bottom: 2.7 });
      tpoly(g, L, [[cx - 0.5, 3.9], [cx + 1.1, 3.9], [cx + 1.1, 2.4], [cx - 0.5, 2.4]], trim, (lx) => (lx < cx + 0.2 ? 5 : 3));
      // tall throat guard with ribs
      const r = g.rig;
      const N = g.L('neck');
      const topP = v(r.head.x - 0.6, r.head.y + 4.4);
      capsule(N, r.neck, topP, b.neckW + 2.0, b.neckW + 1.6, pen, (x) => (x + 0.5 < r.neck.x - 1.6 ? 4 : x + 0.5 > r.neck.x + 1.8 ? 2 : 3));
      scan(r.neck.x - 6, topP.y - 4, r.neck.x + 6, r.neck.y + 2, (fx, fy, x, y) => {
        if (!N.has(fx, fy) || N.getShade(fx, fy) === 0) return;
        const d = mod(r.neck.y - y + (x - r.neck.x) * 0.1, 1.5);
        if (d < FP) N.reshade(fx, fy, 1);
        else if (d < FP * 2) N.reshade(fx, fy, Math.min(5, N.getShade(fx, fy) + 1));
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
    desc: 'Sculpted bronze muscle cuirass with leather shoulder straps (+3 AC).',
    colors: [col('bronze', 'Bronze', '#c08a3e', 'metal'), col('strap', 'Straps', '#5a3a24', 'leather')],
    statsArmor: 'Greek Hoplite Cuirass',
    draw: (g, [bc, sc]) => {
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
      for (let r = 0; r < 3; r++)
        for (const c of [cx - 1.2, cx + 1.0]) bumps.push([c, lipY + 0.6 + (r + 0.5) * rowH, 1.0, rowH * 0.48, 0.55]);
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
            if (lipY - ly < FP * 2) return t < 0.4 ? 5 : 4;
            return t < 0.25 ? 3 : 2;
          }
          if (Math.abs(lx - seamX) < FP * 0.5) return 1; // side seam (front/back halves)
          const th = (t - 0.36) * 2.5;
          let nx = Math.sin(th);
          let ny = 0;
          const nz = Math.cos(th) + 0.1;
          if (ly > top - 2.6) ny -= (ly - (top - 2.6)) * 0.35; // shoulders turn up
          if (lx > seamX) {
            const e = 0.2;
            nx -= ((h(lx + e, ly) - h(lx - e, ly)) / (2 * e)) * 2.4;
            ny += ((h(lx, ly + e) - h(lx, ly - e)) / (2 * e)) * 2.4;
          }
          let s = lit3(nx, ny, nz);
          if (ly - lipY < FP) s = Math.max(1, s - 1);
          // crisp sculpt lines: pectoral undercurves and the center line
          for (const [px0, rr] of [
            [cx - 2.3, 2.5],
            [cx + 2.0, 1.9],
          ] as const) {
            const u = (lx - px0) / rr;
            if (Math.abs(u) < 1 && Math.abs(ly - (pecY + 0.3 - 0.7 * u * u)) < FP * 0.55) return Math.min(s, 1 + (u < -0.3 ? 1 : 0));
          }
          if (Math.abs(lx - (cx - 0.1)) < FP * 0.5 && ly < pecY + 1.2 && ly > lipY + 0.4) return Math.min(s, 2);
          return s;
        },
        { top: top - 0.2, bottom: 0.6, flare: 0.7 },
      );
      // navel
      tpx(g, L, cx - 0.1, lipY + 0.9, br, 1);
      // leather shoulder straps (epaulettes) with bronze studs
      for (const s of SIDES) {
        const A = g.L(armDepth(s, 'armor'));
        const f = armFrame(g, s, 0);
        const p = onLimb(strap, s, 'upperArm');
        const R = b.armR[0] + 0.9;
        lfill(A, f, p, 5, (a, bb) => {
          if (a < -1.9 || a > 2.0 || Math.abs(bb) > R) return null;
          if (a > 2.0 - FP) return 1;
          if (Math.abs(a - 1.4) < FP * 0.5 && Math.round(bb * RES) % 2 === 0) return limbShade(f, bb, R, -0.6) + 1; // stitching
          if (a < -1.9 + FP * 2) return limbShade(f, bb, R, -0.6) + 1;
          return limbShade(f, bb, R, -0.6);
        });
        stud(A, add(f.o, add(scale(f.u, 0.1), scale(f.w, 0.6))), onLimb(br, s, 'upperArm'), 4);
      }
      collar(g, br, 1.1, 0.9);
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_wanderer',
    slot: 'armor',
    name: 'Wanderer Mantle',
    desc: 'Light half-mantle thrown over one shoulder and draped down the chest (+1 AC).',
    colors: [col('mantle', 'Mantle', '#d2c4a2'), col('trim', 'Trim & cord', '#8a2f2a')],
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
        let s = lx < -2.6 ? 4 : lx > fr - 1.2 ? 2 : 3;
        // folds falling from the near shoulder toward the front point
        const fold = mod(lx * 0.95 + ly, 2.5);
        if (ly < top - 1.0) {
          if (fold < FP) s -= 1;
          else if (fold > 2.5 - FP * 2) s += 1;
        }
        if (ly > top - 0.2 - FP * 2 && lx < 2) s = 5;
        return clamp(s, 1, 5);
      });
      tpoly(g, L, P, trim, (lx, ly) => (hemD(lx, ly) < FP * 2.2 ? (lx < 0 ? 3 : 2) : null));
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
        (lx, ly) => (mod(lx * 0.9 + ly * 0.25, 2) < FP ? 2 : lx < sh - 1 ? 4 : 3),
      );
      // shoulder cape over the near arm (follows the arm part of the way)
      const f0 = armFrame(g, 'N', 0);
      const u = norm(add(scale(r.up, -0.6), scale(f0.u, 0.4)));
      const f: LimbFrame = { ...f0, u, w: perp(u) };
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
        const hw = half + clamp(a, 0, 6) * 0.22;
        let s = limbShade(f, bb, hw, a < 0 ? -0.8 : -0.3);
        for (const f0b of [-1.3, 0.5, 2.1]) {
          const fb = f0b + a * 0.12 * Math.sign(f0b + 0.1);
          if (a > 0.4 && Math.abs(bb - fb) < FP * 0.6) s -= 1;
          else if (a > 0.4 && bb - fb > 0 && bb - fb < FP * 2) s += 1;
        }
        if (hemA(bb) - a < FP * 2.2) return null;
        return clamp(s, 1, 5);
      });
      lfill(A, f, tp, half + 4, (a, bb) => (inCape(a, bb) && hemA(bb) - a < FP * 2.2 ? limbShade(f, bb, half, 0) : null));
      // knotted cord clasp with a short tassel
      const S = g.L('torso.over');
      const k = r.T(2.0, top - 1.6);
      capsule(S, add(k, v(0.1, 0.6)), add(k, v(0.5, 3.0)), 0.5, 0.7, trim, 2);
      ellipse(S, k.x, k.y, 1.15, 1.1, trim);
      put(S, fine(k.x - 0.4), fine(k.y - 0.4), trim, 5);
    },
  },

  // -------------------------------------------------------------------------
  {
    id: 'armor_dread',
    slot: 'armor',
    name: 'Dread Plate',
    desc: 'Blackened full plate with tiered pauldrons, gold rivets, a tall gorget and thigh guards (+5 AC).',
    colors: [col('plate', 'Plate', '#3b3d4b', 'metal'), col('trim', 'Gold', '#d9a92e', 'metal')],
    statsArmor: 'Dark Knight Plate',
    draw: (g, [pc, tc]) => {
      const b = g.bp;
      const L = g.L('torso.armor');
      const plate = armorPen(g, pc, 'metal');
      const gold = armorPen(g, tc, 'metal');
      const top = chestTop(g);
      const cx = 1.2;
      const breastBot = top - 7.2;
      tfill(
        g,
        L,
        1.3,
        plate,
        (lx, ly, t) => {
          const side = tlight(t);
          if (ly < breastBot) {
            // plackart lames
            const d = mod(ly - 0.6, 2.2);
            if (d < FP) return 1;
            if (d > 2.2 - FP * 2) return clamp(4 + side, 3, 5);
            return clamp(3 + side, 1, 4);
          }
          const dy = ly - breastBot;
          if (dy < FP * 2) return null; // gold rim drawn below
          // breastplate with a central ridge
          if (Math.abs(lx - cx) < FP * 0.5) return 5;
          if (lx > cx && lx < cx + FP * 2) return 1;
          if (lx > cx && lx < cx + 1.4) return 2;
          if (lx < cx - FP && lx > cx - 2.4 && dy > 1.4 && ly < top - 1.6) return clamp(4 + side, 3, 5);
          if (ly > top - 0.2 - FP * 2) return clamp(4 + side, 3, 5);
          return clamp(3 + side, 1, 5);
        },
        { top: top - 0.2, bottom: 0.6 },
      );
      // gold rim along the breastplate's lower edge
      tfill(g, L, 1.3, gold, (_lx, _ly, t) => clamp(tside(t) + 1, 2, 5), { top: breastBot + FP * 2, bottom: breastBot });
      // gold rivets
      tstud(g, L, cx - 3.0, breastBot + 1.4, gold, 4);
      tstud(g, L, cx + 2.4, breastBot + 1.4, gold, 3);
      tstud(g, L, cx - 3.0, 1.6, gold, 4);
      tstud(g, L, cx + 2.4, 1.6, gold, 3);
      tstud(g, L, -b.chestHalf * 0.62, top - 2.2, gold, 4);
      // tiered pauldrons with gold rims and rivets
      for (const s of SIDES)
        pauldron(g, s, plate, { top: 3.4, capEnd: 0.8, step: 1.5, n: 3, half: b.armR[0] + 1.9, flare: 0.45, curve: 1.0, out: 0.9, edge: gold, edgeAll: true, capRivet: false });
      for (const s of SIDES) {
        const f = armFrame(g, s, 0);
        stud(g.L(armDepth(s, 'armor')), add(f.o, add(scale(f.u, -1.4), scale(f.w, 0.9))), onLimb(gold, s, 'upperArm'), 4);
      }
      // vambraces with elbow cops
      bracer(g, plate, { from: 0.08, to: 0.92, grow: 0.7, rim: gold, lines: [0.5], cop: true });
      // thigh guards (tassets)
      for (const s of SIDES) {
        const A = g.L(legDepth(s, 'armor'));
        const f = legFrame(g, s, 0);
        const p = onLimb(plate, s, 'thigh');
        const gp = onLimb(gold, s, 'thigh');
        const R = b.legR[0] + 0.9;
        const end = f.len * 0.55;
        lfill(A, f, p, R + 2, (a, bb) => {
          if (a < -0.5 || a > end || Math.abs(bb) > R) return null;
          const d = mod(a + 0.5, 2.2);
          if (d > 2.2 - FP) return 1;
          let sh = limbShade(f, bb, R, -0.3);
          if (d < FP * 2) sh = Math.min(5, sh + 1);
          return sh;
        });
        lfill(A, f, gp, R + 2, (a, bb) => (a > end - FP * 2 && a <= end && Math.abs(bb) <= R ? limbShade(f, bb, R, -0.3) : null));
        stud(A, add(f.o, add(scale(f.u, end * 0.45), scale(f.w, R * 0.35))), gp, 4);
      }
      // gorget
      collar(g, plate, 2.6, 1.6, gold);
    },
  },
];

// ---------------------------------------------------------------------------
// Skirts
// ---------------------------------------------------------------------------

export const SKIRT_ITEMS: ItemDef[] = [
  {
    id: 'skirt_imperial',
    slot: 'skirt',
    name: 'Imperial War Skirt',
    desc: 'Red war tunic to mid-thigh under two tiers of hanging leather strips with gold studs.',
    colors: [col('tunic', 'Tunic', '#b3202a'), col('strips', 'Strips', '#7a4a2a', 'leather'), col('studs', 'Studs', '#d4a531', 'metal')],
    draw: (g, [tc, lc, sc]) => {
      const L = g.L('skirt');
      const [x0, x1] = hipRange(g, 0.4);
      const ytop = 3.2;
      const tunic = (w: number) => armorPen(g, tc, 'cloth', thighPart(w));
      const strip = (w: number) => armorPen(g, lc, 'leather', thighPart(w));
      const stud = (w: number) => armorPen(g, sc, 'metal', thighPart(w));
      // tunic with soft folds and a stitched hem
      const xs = spread(x0, x1, 8);
      skirtCols(g, L, tunic, xs, ytop, 0.78, (c) => {
        let s = c.i < 2 ? 4 : c.i > 6 ? 2 : 3;
        if (c.i % 2 === 1 && c.across > 0.65) s -= 1;
        if ((1 - c.down) * c.ch < FP * 2) s -= 1;
        return clamp(s, 1, 5);
      });
      // two tiers of pteruges, the upper tier offset by half a strip
      const n = Math.max(4, Math.round((x1 - x0) / 2.1));
      const lower = spread(x0 + 0.1, x1 - 0.1, n);
      const upperX = spread(x0 - 0.4, x1 + 0.2, n + 1).map((x, i) => (i === 0 || i === n + 1 ? x : x - (x1 - x0) / n / 2));
      const stripShade = (c: Cell, last: number): S => {
        const fromL = c.across * c.cw;
        const fromR = (1 - c.across) * c.cw;
        const fromBot = (1 - c.down) * c.ch;
        if (fromR < FP) return null; // gap between strips shows the tunic
        if (fromBot < 0.5 && (fromL < FP * 1.2 || fromR < FP * 2.2)) return null; // rounded ends
        const base = c.i === 0 ? 4 : c.i >= last ? 2 : 3;
        if (fromR < FP * 2) return 1;
        if (fromL < FP) return Math.min(5, base + 1);
        if (fromBot < FP) return Math.max(1, base - 1);
        return base;
      };
      skirtCols(g, L, strip, lower, ytop, 0.66, (c) => stripShade(c, n - 1), 0.8, 0.14);
      skirtCols(g, L, strip, upperX, ytop, 0.36, (c) => stripShade(c, n), 0.6, 0.1);
      // gold studs at the ends of the lower strips and on the upper tier
      const studsAt = (xsArr: number[], k: number, at: number, droop: number, flare: number) => {
        for (let i = 0; i < xsArr.length - 1; i++) {
          const lx = (xsArr[i] + xsArr[i + 1]) / 2 - 0.15;
          const h = hang(g, lx, ytop, k, droop, flare);
          const p = lerp(h.top, h.bot, at);
          const pen = stud(h.w);
          put(L, fine(p.x), fine(p.y), pen, i === 0 ? 5 : 4);
          put(L, fine(p.x) + 1, fine(p.y), pen, 3);
          put(L, fine(p.x), fine(p.y) + 1, pen, 2);
        }
      };
      studsAt(lower, 0.66, 0.86, 0.8, 0.14);
    },
  },

  {
    id: 'skirt_apron',
    slot: 'skirt',
    name: 'Battle Apron',
    desc: 'Navy cloth wrap with long panels hanging front and back to the knees.',
    colors: [col('cloth', 'Cloth', '#2f4a86'), col('band', 'Wrap & trim', '#6278aa')],
    draw: (g, [cc, bc]) => {
      const L = g.L('skirt');
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
      const folds = (c: Cell, base: number) => {
        // soft vertical folds: a lit ridge and a shadow per column
        if (c.down < 0.12) return base;
        if (c.across < 0.22) return base + 1;
        if (c.across > 0.72) return base - 1;
        return base;
      };
      // front panel (over the front of the legs)
      const fx = spread(-0.6, x1, 3);
      skirtCols(g, L, cloth, fx, 3, k, (c) => folds(c, c.i === 2 ? 2 : 3), 1.2, 0.05);
      skirtCols(g, L, trimP, fx, 3, k, (c) => (border(c, 2) ? (c.i === 0 ? 4 : c.i === 2 ? 2 : 3) : null), 1.2, 0.05);
      // back panel (behind the near leg)
      const B = g.L('farLeg.armor');
      const bx = spread(x0 - 0.4, -b.hipHalf * 0.2, 3);
      skirtCols(g, B, (w) => armorPen(g, cc, 'cloth', thighPart(w), -1), bx, 3, k, (c) => folds(c, c.i === 0 ? 4 : 3), 0.4, 0.05);
      skirtCols(g, B, (w) => armorPen(g, bc, 'cloth', thighPart(w), -1), bx, 3, k, (c) => (border(c, 2) ? 3 : null), 0.4, 0.05);
      // wrap band with a knot at the front hip
      const band = armorPen(g, bc);
      skirtCols(g, L, band, spread(x0, x1, 6), 3.4, 0.13, (c) => (c.down < 0.2 ? 4 : c.down > 0.8 ? 2 : c.i < 1 ? 4 : c.i > 4 ? 2 : 3), 0, 0.05);
      const kp = g.rig.T(x1 - 1.0, 2.0);
      capsule(L, kp, add(kp, v(0.8, 3.6)), 0.8, 1.05, band, (x) => (x + 0.5 < kp.x + 0.4 ? 4 : 2));
      capsule(L, kp, add(kp, v(-0.6, 3.0)), 0.7, 0.9, band, 2);
      ellipse(L, kp.x, kp.y, 1.25, 1.15, band);
      put(L, fine(kp.x - 0.4), fine(kp.y - 0.4), band, 5);
    },
  },

  {
    id: 'skirt_tassets',
    slot: 'skirt',
    name: 'Lamellar Tassets',
    desc: 'Laced lacquered plate panels hanging over the thighs.',
    colors: [col('plate', 'Lacquer', '#b0242c'), col('lace', 'Laces', '#1d1c26')],
    draw: (g, [pc, lc]) => {
      const L = g.L('skirt');
      const [x0, x1] = hipRange(g, 0.6);
      const n = 4;
      const xs = spread(x0, x1, n);
      const plate = (w: number) => armorPen(g, pc, 'cloth', thighPart(w));
      const lace = (w: number) => armorPen(g, lc, 'cloth', thighPart(w));
      const k = 0.78;
      /** Row type for a skirt cell, or null in the gap between panels. */
      const kind = (c: Cell) => {
        const fromR = (1 - c.across) * c.cw;
        if (fromR < FP * 1.5 && c.down > 0.06) return null;
        const fromBot = (1 - c.down) * c.ch;
        if (fromBot < FP) return 'bottom';
        return lamRow(fromBot - FP, LAM_ROW);
      };
      const base = (c: Cell) => (c.i === 0 ? 4 : c.i === n - 1 ? 2 : 3) - (c.across > 0.75 ? 1 : 0);
      skirtCols(
        g,
        L,
        plate,
        xs,
        3.0,
        k,
        (c) => {
          const r = kind(c);
          if (!r) return null;
          if (r === 'lace') return laceCol(c.across * c.cw) ? null : 1;
          if (r === 'bottom') return 1;
          return clamp(base(c) + (r === 'rim' ? 1 : 0), 1, 5);
        },
        1.0,
        0.2,
      );
      skirtCols(
        g,
        L,
        lace,
        xs,
        3.0,
        k,
        (c) => (kind(c) === 'lace' && laceCol(c.across * c.cw) ? clamp(base(c), 2, 4) : null),
        1.0,
        0.2,
      );
      // cord band tying the panels to the waist
      skirtCols(g, L, lace, spread(x0, x1, 6), 3.4, 0.1, (c) => (c.down < 0.3 ? 4 : c.i < 1 ? 3 : 2), 0, 0.05);
    },
  },

  {
    id: 'skirt_kilt',
    slot: 'skirt',
    name: 'Pleated Kilt',
    desc: 'Simple pleated cloth skirt with a waistband.',
    colors: [col('cloth', 'Cloth', '#3c5a8a'), col('band', 'Band', '#2a2f3d', 'leather')],
    draw: (g, [cc, bc]) => {
      const L = g.L('skirt');
      const [x0, x1] = hipRange(g, 0.4);
      const n = 8;
      const xs = spread(x0, x1, n);
      const cloth = (w: number) => armorPen(g, cc, 'cloth', thighPart(w));
      skirtCols(
        g,
        L,
        cloth,
        xs,
        3.0,
        0.72,
        (c) => {
          const base = c.i < 2 ? 4 : c.i >= n - 2 ? 2 : 3;
          const fromL = c.across * c.cw;
          const fromR = (1 - c.across) * c.cw;
          if (fromR < FP) return Math.max(1, base - 2); // pleat crease
          if (fromL < FP * 1.5) return Math.min(5, base + 1);
          if (c.across > 0.55) return base - 1;
          if ((1 - c.down) * c.ch < FP * 2) return base - 1;
          return base;
        },
        1.0,
        0.22,
      );
      const band = armorPen(g, bc, 'leather');
      skirtCols(g, L, band, spread(x0, x1, 5), 3.3, 0.1, (c) => (c.down < 0.25 ? 4 : c.i < 1 ? 4 : c.i > 3 ? 2 : 3), 0, 0.05);
    },
  },
];
