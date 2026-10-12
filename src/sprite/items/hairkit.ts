// Helpers for drawing hair in head-local pixel coordinates.
// (0,0) is the integer head center; the face looks to +x; the skull spans
// roughly x -7..+6 and y -8..+7 (male). Use `hd(g, dx, dy)` to place points.

import type { DrawCtx } from '../ctx';
import { Layer, Pen, poly, px, sub, v, Vec } from '../raster';

export const hd = (g: DrawCtx, dx: number, dy: number): Vec => v(g.rig.head.x + dx, g.rig.head.y + dy);

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
  poly(L, [a, sa2, tip, sb2, b], pen, (x, y) => {
    const p = v(x + 0.5 - mid.x, y + 0.5 - mid.y);
    const t = (p.x * ax.x + p.y * ax.y) / alen; // 0 at root, 1 at tip
    const s = (p.x * -ax.y + p.y * ax.x) / half; // across the lock
    // Which side faces the light (upper-left) depends on the lock direction.
    const litSide = -ax.y * -0.7 + ax.x * -0.7 > 0 ? -1 : 1;
    const side = s * litSide;
    let shade = 3;
    if (side < -0.25 && t < 0.75) shade = 4;
    if (side > 0.45 || t > 0.78) shade = 2;
    if (t > 0.92) shade = 1;
    return shade + (shade >= 3 ? light : 0) - (shade <= 2 ? dark : 0);
  });
}

/** Rounded hair cap that covers the skull above `browY` (head-local). */
export function cap(
  g: DrawCtx,
  L: Layer,
  pen: Pen,
  opts: { grow?: number; browY?: number; backY?: number; frontX?: number } = {},
): void {
  const b = g.bp;
  const grow = opts.grow ?? 1;
  const browY = opts.browY ?? -2;
  const backY = opts.backY ?? 4;
  const frontX = opts.frontX ?? 4.5;
  const cx = g.rig.head.x - 0.6;
  const cy = g.rig.head.y - 1.4;
  const rx = b.headRx + grow;
  const ry = b.headRy * 0.95 + grow;
  const hx = g.rig.head.x;
  const hy = g.rig.head.y;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const lx = x - hx;
      const ly = y - hy;
      // Hairline: covers down to the brows at the front, down to backY behind the ear.
      const t = Math.max(0, Math.min(1, (lx + 3) / 6)); // 0 behind ear, 1 at face
      const limit = backY + (browY - backY) * t;
      if (ly > limit) continue;
      if (lx > frontX && ly > browY - 1) continue;
      const lt = dx * -0.72 + dy * -0.69;
      let s = lt > 0.45 ? 4 : lt > -0.3 ? 3 : 2;
      if (ly > limit - 1.2) s = Math.min(s, 2);
      L.set(x, y, pen.mat, s + (pen.bias || 0), pen.part, pen.flags || 0);
    }
  }
}

/** A curved row of highlight pixels (the anime "angel ring"). */
export function shine(g: DrawCtx, L: Layer, pen: Pen, y: number, x0: number, x1: number, curve = 0.15): void {
  for (let x = x0; x <= x1; x++) {
    const yy = Math.round(y + curve * (x - (x0 + x1) / 2) ** 2 * 0.25);
    const p = hd(g, x, yy);
    if (L.has(p.x, p.y)) px(L, p.x, p.y, pen, 5);
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
