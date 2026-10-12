// Helpers for drawing hair in head-local DESIGN coordinates (64-unit space;
// the canvas rasterizes at RES fine pixels per unit).
// (0,0) is the integer head center; the face looks to +x; the skull spans
// roughly x -6..+6 and y -7..+7. Brows sit at y -2, eyes at y 0..2 (near eye
// x -1..+1, far eye x +3..+5), mouth at y 5, chin at y 7.
// Use `hd(g, dx, dy)` to place points.

import type { DrawCtx } from '../ctx';
import { F_NO_OUTLINE, fwd, GRID, Layer, Pen, poly, px, RES, sub, v, Vec } from '../raster';
import { faceAnchor } from '../body';

export const hd = (g: DrawCtx, dx: number, dy: number): Vec => v(g.rig.head.x + dx, g.rig.head.y + dy);

/** Light direction (upper-left), shared with the raster shading. */
const LX = -0.72;
const LY = -0.69;

/**
 * Calls fn for every fine pixel covering the design-space box. Honors the
 * layer transform (the head group is drawn shrunk around the head center):
 * pixels are visited in screen space and `x, y` are mapped back to the
 * layer's original design space.
 */
function eachFine(L: Layer, minX: number, minY: number, maxX: number, maxY: number, fn: (fx: number, fy: number, x: number, y: number) => void): void {
  const t = L.xf;
  const a = fwd(L, v(minX, minY));
  const b = fwd(L, v(maxX, maxY));
  const fx0 = Math.max(0, Math.floor(Math.min(a.x, b.x) * RES) - 1);
  const fy0 = Math.max(0, Math.floor(Math.min(a.y, b.y) * RES) - 1);
  const fx1 = Math.min(GRID - 1, Math.ceil(Math.max(a.x, b.x) * RES) + 1);
  const fy1 = Math.min(GRID - 1, Math.ceil(Math.max(a.y, b.y) * RES) + 1);
  for (let fy = fy0; fy <= fy1; fy++) {
    for (let fx = fx0; fx <= fx1; fx++) {
      let x = (fx + 0.5) / RES;
      let y = (fy + 0.5) / RES;
      if (t) {
        x = t.cx + (x - t.cx) / t.k;
        y = t.cy + (y - t.cy) / t.k;
      }
      fn(fx, fy, x, y);
    }
  }
}

/** Fine pixel (screen) containing a design point drawn on layer L. */
function fineAt(L: Layer, p: Vec): [number, number] {
  const q = fwd(L, p);
  return [Math.floor(q.x * RES), Math.floor(q.y * RES)];
}

/**
 * Inverse of the layer transform: the design point that lands on screen
 * point `p` once the layer is shrunk. Use it to anchor head-group pixels to
 * the body (long hair down the back).
 */
export function unxf(L: Layer, p: Vec): Vec {
  const t = L.xf;
  return t ? v(t.cx + (p.x - t.cx) / t.k, t.cy + (p.y - t.cy) / t.k) : p;
}

/**
 * A tapered lock of hair from a base edge (a, b) to a tip, shaded along its
 * axis: lit on its left edge near the root, darker toward the tip and the
 * right edge. Adjacent clumps therefore read as separate locks.
 */
export function clump(L: Layer, a: Vec, b: Vec, tip: Vec, pen: Pen, opts: { light?: number; dark?: number } = {}): void {
  const mid = v((a.x + b.x) / 2, (a.y + b.y) / 2);
  const axis = sub(tip, mid);
  const alen = Math.hypot(axis.x, axis.y) || 1;
  const ax = { x: axis.x / alen, y: axis.y / alen };
  const half = Math.hypot(b.x - a.x, b.y - a.y) / 2 || 1;
  const light = opts.light ?? 0;
  const dark = opts.dark ?? 0;
  // Locks stay full-width for the first half, then taper: chunky 16-bit clumps.
  const sa = v(a.x + axis.x * 0.5, a.y + axis.y * 0.5);
  const sb = v(b.x + axis.x * 0.5, b.y + axis.y * 0.5);
  const c = v(mid.x + axis.x * 0.5, mid.y + axis.y * 0.5);
  const pinch = 0.12;
  const sa2 = v(sa.x + (c.x - sa.x) * pinch, sa.y + (c.y - sa.y) * pinch);
  const sb2 = v(sb.x + (c.x - sb.x) * pinch, sb.y + (c.y - sb.y) * pinch);
  const nx = -ax.y;
  const ny = ax.x;
  const litSide = nx * LX + ny * LY > 0 ? -1 : 1;
  poly(L, [a, sa2, tip, sb2, b], pen, (x, y) => {
    const p = v(x + 0.5 - mid.x, y + 0.5 - mid.y);
    const t = (p.x * ax.x + p.y * ax.y) / alen; // 0 at root, 1 at tip
    const s = (p.x * nx + p.y * ny) / half; // across the lock
    const side = s * litSide;
    let shade = 3;
    if (side < -0.25 && t < 0.75) shade = 4;
    if (side > 0.45 || t > 0.78) shade = 2;
    if (t > 0.92) shade = 1;
    return shade + (shade >= 3 ? light : 0) - (shade <= 2 ? dark : 0);
  });
}

export interface LockOpts {
  /** Added to the lit shades (3+). */
  light?: number;
  /** Subtracted from the shadow shades (2-). */
  dark?: number;
  /** Fraction of the length that keeps the full width before tapering (default 0.35). */
  hold?: number;
  /** Width left at the tip, in design units (default 1.1). */
  tipW?: number;
  /** Darken the last part of the lock (default true). */
  tipDark?: boolean;
  /** Paint a dark crevice along the shadowed edge (default false). */
  crevice?: boolean;
  /**
   * Dark 1-fine-px internal outline where this lock overlaps hair drawn
   * before it, on the side away from the light (default true). This is what
   * separates clumps inside one hair mass.
   */
  edge?: boolean;
  /** Fine strand grooves running along the lock (default false; the compositor adds strand texture). */
  strands?: boolean;
  /** Highlight band [t0, t1] along the lit side; false for none. */
  sheen?: [number, number] | false;
  /** Flip which side is lit. */
  flip?: boolean;
  /** Clip (design coords of the sample point): only paint where this returns true. */
  keep?: (x: number, y: number) => boolean;
  /**
   * Center of the whole hair mass (absolute). When set, the lock is also lit
   * as part of that big volume: brighter toward its upper-left, darker toward
   * its lower-right, so many locks still read as one form.
   */
  form?: Vec;
}

/** Quadratic bezier point. */
const qb = (a: Vec, c: Vec, b: Vec, t: number): Vec =>
  v((1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y);

/**
 * A curved, tapered lock of hair along a quadratic bezier root → ctrl → tip,
 * `w` design units wide at the root. Shaded across its width (lit edge toward
 * the upper-left, shadow on the far edge), along its length (darker tip), with
 * fine strand lines and a dark internal edge where it overlaps earlier hair.
 */
export function lock(L: Layer, root: Vec, ctrl: Vec, tip: Vec, w: number, pen: Pen, opts: LockOpts = {}): void {
  const N = 64;
  const pts: Vec[] = [];
  const tan: Vec[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(qb(root, ctrl, tip, t));
    const d = v(2 * (1 - t) * (ctrl.x - root.x) + 2 * t * (tip.x - ctrl.x), 2 * (1 - t) * (ctrl.y - root.y) + 2 * t * (tip.y - ctrl.y));
    const l = Math.hypot(d.x, d.y) || 1;
    tan.push(v(d.x / l, d.y / l));
  }
  const hold = opts.hold ?? 0.35;
  const tipW = opts.tipW ?? 1.1;
  const width = (t: number) => (t <= hold ? w : w + (tipW - w) * ((t - hold) / (1 - hold)));
  const light = opts.light ?? 0;
  const dark = opts.dark ?? 0;
  const tipDark = opts.tipDark ?? true;
  const crevice = opts.crevice ?? false;
  const edge = opts.edge ?? true;
  // The compositor adds strand streaks to hair, so grooves are opt-in.
  const strands = opts.strands ?? false;
  const sheen = opts.sheen ?? false;
  const mine = new Map<number, number>();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const r = w / 2 + 0.5;
  eachFine(L, minX - r, minY - r, maxX + r, maxY + r, (fx, fy, cx, cy) => {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i <= N; i++) {
      const d = (cx - pts[i].x) ** 2 + (cy - pts[i].y) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    const t = best / N;
    const tg = tan[best];
    const dx = cx - pts[best].x;
    const dy = cy - pts[best].y;
    // Square off the root so roots don't bulge out of the cap.
    if (best === 0 && dx * tg.x + dy * tg.y < -0.2) return;
    // ...and the tip, so a lock ends where it is told to (no round cap).
    if (best === N && dx * tg.x + dy * tg.y > 0.15) return;
    const hw = width(t) / 2;
    if (Math.sqrt(bd) > hw) return;
    if (opts.keep && !opts.keep(cx, cy)) return;
    const nx = -tg.y;
    const ny = tg.x;
    const across = dx * nx + dy * ny;
    const litDir = nx * LX + ny * LY > 0 ? -1 : 1;
    // -1 = lit edge, +1 = shadow edge
    const side = (across * litDir * (opts.flip ? -1 : 1)) / Math.max(0.5, hw);
    let s = 3;
    if (side < -0.3 && t < 0.85) s = 4;
    if (side > 0.4) s = 2;
    if (crevice && side > 0.72 && hw >= 1.4) s = 1;
    if (opts.form) {
      const ox = cx - opts.form.x;
      const oy = cy - opts.form.y;
      const ol = Math.hypot(ox, oy) || 1;
      const lt = (ox * LX + oy * LY) / ol;
      if (lt > 0.45) s += 1;
      else if (lt < -0.5) s -= 1;
    }
    // Strand lines: thin darker grooves running along the lock.
    if (strands && t > 0.12 && t < 0.9 && hw >= 1.5) {
      const u = side; // -1..1 lit..shadow
      const groove = Math.abs(u - 0.15) < 0.11 || (hw >= 2.4 && Math.abs(u + 0.45) < 0.09 && t > 0.3);
      if (groove && s >= 2) s -= 1;
    }
    if (sheen && t >= sheen[0] && t <= sheen[1] && side < 0.05 && side > -0.8 && hw >= 1.4) s = 5;
    if (tipDark && t > 0.8 && s > 2) s -= 1;
    if (s >= 3) s += light;
    else s -= dark;
    s = Math.max(1, Math.min(5, s + (pen.bias || 0)));
    mine.set(fy * GRID + fx, t);
    L.set(fx, fy, pen.mat, s, pen.part, pen.flags || 0);
  });
  if (!edge) return;
  const edgePx: number[] = [];
  for (const [i, t] of mine) {
    if (t < 0.12) continue;
    const x = i % GRID;
    const y = (i - x) / GRID;
    for (const [ox, oy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nx = x + ox;
      const ny = y + oy;
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
      if (mine.has(ny * GRID + nx) || !L.has(nx, ny)) continue;
      // Only the edges facing away from the light get the dark line.
      if (ox * LX + oy * LY < 0.2) {
        edgePx.push(x, y);
        break;
      }
    }
  }
  for (let k = 0; k < edgePx.length; k += 2) L.reshade(edgePx[k], edgePx[k + 1], 1);
}

/** `lock` in head-local coordinates: [rootX, rootY, ctrlX, ctrlY, tipX, tipY]. */
export function hlock(g: DrawCtx, L: Layer, c: number[], w: number, pen: Pen, opts?: LockOpts): void {
  lock(L, hd(g, c[0], c[1]), hd(g, c[2], c[3]), hd(g, c[4], c[5]), w, pen, opts);
}

/**
 * Rounded hair cap that covers the skull. The hairline follows the head:
 * flat across the forehead at `browY`, a sideburn in front of the ear down to
 * `sideY`, up over the ear to `earY`, then down to `backY` at the nape.
 */
export function cap(
  g: DrawCtx,
  L: Layer,
  pen: Pen,
  opts: {
    grow?: number;
    browY?: number;
    backY?: number;
    frontX?: number;
    top?: number;
    cx?: number;
    sideY?: number;
    earY?: number;
  } = {},
): void {
  const b = g.bp;
  const grow = opts.grow ?? 1;
  const browY = opts.browY ?? -2;
  const backY = opts.backY ?? 4;
  const frontX = opts.frontX ?? 4.5;
  const top = opts.top ?? 0;
  const sideY = opts.sideY ?? Math.min(1.5, browY + 3);
  const earY = opts.earY ?? Math.min(backY, 0);
  const hx = g.rig.head.x;
  const hy = g.rig.head.y;
  // Matches the skull ellipse of the base head (center (-0.4, -1.3)).
  const cx = hx - 0.4 + (opts.cx ?? 0);
  const ry = b.headRy * 0.94 + grow + top / 2;
  const cy = hy - 1.3 - top / 2;
  const rx = b.headRx + 0.3 + grow;
  const ramp = (x: number, x0: number, x1: number, a: number, c: number) =>
    a + (c - a) * Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
  const hairline = (lx: number): number => {
    if (lx >= -2.2) return browY;
    if (lx >= -2.9) return ramp(lx, -2.2, -2.5, browY, sideY);
    if (lx >= -4.8) return ramp(lx, -2.9, -3.3, sideY, earY);
    return ramp(lx, -4.8, -5.8, earY, backY);
  };
  eachFine(L, cx - rx, cy - ry, cx + rx, cy + ry, (fx, fy, x, y) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    if (dx * dx + dy * dy > 1) return;
    const lx = x - hx;
    const ly = y - hy;
    const limit = hairline(lx);
    if (ly > limit) return;
    if (lx > frontX && ly > browY - 1) return;
    const lt = dx * LX + dy * LY;
    let s = lt > 0.62 ? 4 : lt > -0.25 ? 3 : lt > -0.75 ? 2 : 1;
    if (ly > limit - 1) s = Math.min(s, 2);
    L.set(fx, fy, pen.mat, Math.max(1, s + (pen.bias || 0)), pen.part, pen.flags || 0);
  });
}

/**
 * A curved band of highlight pixels (the anime "angel ring"), fine
 * resolution: a highlight row with a softer lit row under it, broken into
 * dashes so it reads as glossy strands rather than a stripe.
 */
export function shine(g: DrawCtx, L: Layer, pen: Pen, y: number, x0: number, x1: number, curve = 0.15, shade = 5): void {
  const step = 1 / RES;
  let i = 0;
  for (let x = x0; x <= x1 + 1e-6; x += step, i++) {
    if (i % 5 === 4) continue; // strand gaps
    const yy = y + curve * (x - (x0 + x1) / 2) ** 2 * 0.25;
    for (const [dy, sh] of [
      [0, shade],
      [step, shade - 1],
    ] as [number, number][]) {
      const p = hd(g, x, yy + dy);
      const [fx, fy] = fineAt(L, p);
      if (L.has(fx, fy) && L.getShade(fx, fy) > 0 && L.getShade(fx, fy) <= sh) px(L, p.x, p.y, { ...pen, bias: 0 }, sh);
    }
  }
}

/** Polygon in head-local coordinates. */
export function hpoly(g: DrawCtx, L: Layer, pts: [number, number][], pen: Pen, shade?: number): void {
  poly(L, pts.map(([x, y]) => hd(g, x, y)), pen, shade);
}

/** Clump in head-local coordinates: [ax, ay, bx, by, tipX, tipY]. */
export function hclump(g: DrawCtx, L: Layer, c: number[], pen: Pen, opts?: { light?: number; dark?: number }): void {
  clump(L, hd(g, c[0], c[1]), hd(g, c[2], c[3]), hd(g, c[4], c[5]), pen, opts);
}

/**
 * Re-shades existing pixels along a head-local polyline (1 fine px wide).
 * `delta` < 0 darkens (strand grooves), > 0 lightens (sheen strokes); with
 * `abs` the shade is set instead.
 */
export function hseam(g: DrawCtx, L: Layer, pts: [number, number][], delta = -1, abs?: number): void {
  for (let k = 0; k < pts.length - 1; k++) {
    const a = fwd(L, hd(g, pts[k][0], pts[k][1]));
    const b = fwd(L, hd(g, pts[k + 1][0], pts[k + 1][1]));
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * RES));
    for (let i = 0; i <= steps; i++) {
      const x = Math.floor((a.x + ((b.x - a.x) * i) / steps) * RES);
      const y = Math.floor((a.y + ((b.y - a.y) * i) / steps) * RES);
      if (!L.has(x, y) || L.getShade(x, y) === 0) continue;
      L.reshade(x, y, abs !== undefined ? abs : Math.max(1, Math.min(5, L.getShade(x, y) + delta)));
    }
  }
}

/** Head-local fine pixels with an explicit shade (sparse details: sheen glints, ties). */
export function hdots(g: DrawCtx, L: Layer, pts: [number, number][], pen: Pen, shade: number, onlyOver = true): void {
  for (const [x, y] of pts) {
    const p = hd(g, x, y);
    const [fx, fy] = fineAt(L, p);
    if (onlyOver && !L.has(fx, fy)) continue;
    px(L, p.x, p.y, { ...pen, bias: 0 }, shade);
  }
}


/**
 * Draws a hand-made hair template (fine pixels) anchored to the face so it
 * frames the eyes exactly. Characters: '.' empty, '0'-'5' hair ramp shades
 * (0 = outline). The template is drawn at final size (not head-scaled), skips
 * the automatic fray/texture passes and recolors with the hair ramp.
 * (ax, ay) is the template cell that lands on the near eye's first iris pixel.
 */
export function hairTemplate(g: DrawCtx, L: Layer, rows: string[], ax: number, ay: number, mat: number): void {
  const { nx, ny } = faceAnchor(g);
  const ox = nx + 2 - ax;
  const oy = ny + 1 - ay;
  L.noFray = true;
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row.charCodeAt(c) - 48;
      if (ch < 0 || ch > 5) continue;
      L.set(ox + c, oy + r, mat, ch, 'head', F_NO_OUTLINE);
    }
  });
}
