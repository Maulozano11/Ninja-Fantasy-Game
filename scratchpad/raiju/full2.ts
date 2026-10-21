// Summoned jutsu beasts: the creatures a jutsu sends flying or running from the caster to the
// target. One sprite per element in the group vfx_beasts (the battle renderer prefers these over
// the per-element 'beast' sheets): water dragon, wind crane, thunder hound, stone dragon, illusion
// crow, chakra fox and venom cobra. Each has a 'fly' loop facing right (the game mirrors it), with
// the anchor at the body centre. The fire phoenix (vfx_fire/beast) is the bar for size and detail.
//
//   npx tsx tools/world-sprites/vfx-beasts.ts [previewDir]
//   WORLD_OUT=<dir> ... writes the sheets for approval instead of into src/assets/world.
//   FOCUS=water,wind ... builds only those (inspection images only, no sheets).
//
// Every creature is built from parts painted back to front: tubes along a path (serpent bodies,
// necks, tails, legs) whose cross-section gives a true normal, ellipsoids (heads, chests, haunches)
// and lens shapes (horns, feathers, fins, flame tongues, petals). Each part has a material shader
// that turns its normal and surface coordinates into a ramp step, lit from the upper left and
// broken into clusters by noise anchored to the surface (so the texture rides the motion). A part
// in front leaves a dark inner line on the part behind it, and every part carries a 1 px outline
// tinted by its material. Particles (spray, sparks, pebbles, feathers, petals, drips) go on top.

import { existsSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { CHARACTER_FEET, Canvas, Color, LIGHT, MATERIALS, WorldSprite, characterRef, hash, hex, mix, noise, previewDir, ramp, toHex, withAlpha, writeGroup } from './kit';

type P2 = [number, number];
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const fract = (v: number): number => v - Math.floor(v);
const rnd = (seed: number, i: number, j = 0): number => hash(i * 7 + 3, j * 13 + 5, seed);
const blend = (a: string, b: string, t: number): string => toHex(mix(hex(a), hex(b), t));
/** A color with alpha, clamped to 0..255 (an overflowing byte would wrap around). */
const wa = (c: Color, a: number): Color => withAlpha(c, clamp(a, 0, 255));

// --- surface hits ----------------------------------------------------------------------------

/** What a primitive reports for a pixel it covers. */
interface Hit {
  x: number;
  y: number;
  /** Surface normal (screen x right, y down, z toward the viewer). */
  nx: number;
  ny: number;
  nz: number;
  /** Height toward the viewer (for picking the front primitive of a part). */
  z: number;
  /** Surface coordinates: u along the primitive (0..1), v across it (-1..1), len its length in px. */
  u: number;
  v: number;
  len: number;
  /** Primitive index inside its part. */
  k: number;
}

interface Prim {
  box: [number, number, number, number];
  at(px: number, py: number): Hit | null;
}

/**
 * A tube along a polyline with a width profile (half-width in px at u = 0..1). The normal comes
 * from the offset to the nearest point of the centre line, so the tube rounds like a cylinder and
 * its ends are round caps.
 */
function tube(path: P2[], hw: (u: number) => number, z0 = 0, flat = 1): Prim {
  const n = path.length;
  const cum: number[] = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = cum[n - 1] || 1;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  let wmax = 0;
  for (let i = 0; i < n; i++) {
    const w = hw(cum[i] / total);
    wmax = Math.max(wmax, w);
    x0 = Math.min(x0, path[i][0] - w);
    y0 = Math.min(y0, path[i][1] - w);
    x1 = Math.max(x1, path[i][0] + w);
    y1 = Math.max(y1, path[i][1] + w);
  }
  return {
    box: [Math.floor(x0) - 1, Math.floor(y0) - 1, Math.ceil(x1) + 1, Math.ceil(y1) + 1],
    at(px, py) {
      let best = Infinity, bu = 0, bdx = 0, bdy = 0, bcx = 0, bcy = 0;
      for (let i = 0; i + 1 < n; i++) {
        const [ax, ay] = path[i], [bx, by] = path[i + 1];
        const ex = bx - ax, ey = by - ay;
        const l2 = ex * ex + ey * ey || 1e-9;
        const t = clamp(((px - ax) * ex + (py - ay) * ey) / l2, 0, 1);
        const cx = ax + ex * t, cy = ay + ey * t;
        const d = (px - cx) * (px - cx) + (py - cy) * (py - cy);
        if (d < best) {
          best = d;
          bu = (cum[i] + Math.sqrt(l2) * t) / total;
          bdx = ex;
          bdy = ey;
          bcx = cx;
          bcy = cy;
        }
      }
      const w = hw(bu);
      if (w <= 0.05) return null;
      const ox = (px - bcx) / w, oy = (py - bcy) / w;
      const r2 = ox * ox + oy * oy;
      if (r2 > 1) return null;
      const dl = Math.hypot(bdx, bdy) || 1;
      // Signed offset across the tube: + is to the right of the travel direction (screen).
      const v = (ox * -bdy + oy * bdx) / dl;
      const nz = Math.sqrt(1 - r2);
      const k = flat;
      const nl = Math.hypot(ox * k, oy * k, nz) || 1;
      return { x: px, y: py, nx: (ox * k) / nl, ny: (oy * k) / nl, nz: nz / nl, z: z0 + w * nz, u: bu, v: -v, len: total, k: 0 };
    },
  };
}

/** An ellipsoid seen from the front: centre, radii and a rotation (radians, clockwise on screen). */
function blob(cx: number, cy: number, rx: number, ry: number, rot = 0, z0 = 0): Prim {
  const c = Math.cos(rot), s = Math.sin(rot);
  const R = Math.max(rx, ry);
  return {
    box: [Math.floor(cx - R) - 1, Math.floor(cy - R) - 1, Math.ceil(cx + R) + 1, Math.ceil(cy + R) + 1],
    at(px, py) {
      const dx = px - cx, dy = py - cy;
      const lx = (dx * c + dy * s) / rx, ly = (-dx * s + dy * c) / ry;
      const r2 = lx * lx + ly * ly;
      if (r2 > 1) return null;
      const nz = Math.sqrt(1 - r2);
      // Normal of the ellipsoid, back to screen axes.
      const gx = lx / rx, gy = ly / ry;
      const sx = gx * c - gy * s, sy = gx * s + gy * c;
      const gz = nz / Math.min(rx, ry);
      const l = Math.hypot(sx, sy, gz) || 1;
      return { x: px, y: py, nx: sx / l, ny: sy / l, nz: gz / l, z: z0 + Math.min(rx, ry) * nz, u: (lx + 1) / 2, v: ly, len: rx * 2, k: 0 };
    },
  };
}

/**
 * A lens (leaf, feather, horn, fin, flame tongue) from a to b: half-width `w` at its widest
 * (`peak` along it, 0..1), bowed sideways by `bend` px; `tip` > 1 sharpens the far end. The
 * normal tilts across the width so the shape reads as a gently curved blade.
 */
function lens(a: P2, b: P2, w: number, o: { bend?: number; peak?: number; tip?: number; base?: number; z?: number; curve?: number } = {}): Prim {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  const bend = o.bend ?? 0, peak = o.peak ?? 0.4, tip = o.tip ?? 1, base = o.base ?? 0.25, curve = o.curve ?? 0.7;
  const half = (t: number): number => {
    if (t < 0 || t > 1) return 0;
    const k = t < peak ? base + (1 - base) * Math.sin((t / peak) * (Math.PI / 2)) : Math.pow(Math.cos(((t - peak) / (1 - peak)) * (Math.PI / 2)), tip);
    return w * k;
  };
  const pad = w + Math.abs(bend) + 1;
  return {
    box: [Math.floor(Math.min(a[0], b[0]) - pad), Math.floor(Math.min(a[1], b[1]) - pad), Math.ceil(Math.max(a[0], b[0]) + pad), Math.ceil(Math.max(a[1], b[1]) + pad)],
    at(px, py) {
      const vx = px - a[0], vy = py - a[1];
      const t = (vx * ux + vy * uy) / L;
      if (t < 0 || t > 1) return null;
      const off = -vx * uy + vy * ux - bend * Math.sin(Math.PI * t);
      const h = half(t);
      if (h <= 0.05 || Math.abs(off) > h) return null;
      const v = off / h;
      // Across the blade the surface turns away gently; along it the blade is flat.
      const tx = -uy * v * curve, ty = ux * v * curve;
      const nz = Math.sqrt(Math.max(0.05, 1 - (v * curve) ** 2));
      const l = Math.hypot(tx, ty, nz);
      return { x: px, y: py, nx: tx / l, ny: ty / l, nz: nz / l, z: (o.z ?? 0) + h * nz * 0.5, u: t, v, len: L, k: 0 };
    },
  };
}

/** A filled polygon with a fixed normal (plates, facets, fangs). */
function poly(pts: P2[], n: [number, number, number] = [0, 0, 1], z0 = 0): Prim {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const l = Math.hypot(...n) || 1;
  return {
    box: [Math.floor(x0) - 1, Math.floor(y0) - 1, Math.ceil(x1) + 1, Math.ceil(y1) + 1],
    at(px, py) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (!inside) return null;
      return { x: px, y: py, nx: n[0] / l, ny: n[1] / l, nz: n[2] / l, z: z0, u: (px - x0) / (x1 - x0 || 1), v: ((py - y0) / (y1 - y0 || 1)) * 2 - 1, len: x1 - x0, k: 0 };
    },
  };
}

// --- light and steps -------------------------------------------------------------------------

/** Wrapped Lambert from the upper left (the kit's light), 0..1. */
function lit(h: Hit, wrap = 0.4): number {
  return clamp((h.nx * LIGHT[0] + h.ny * LIGHT[1] + h.nz * LIGHT[2] + wrap) / (1 + wrap), 0, 1);
}

/** Light to a ramp step (1..5) with band edges broken into clusters by noise at (nx, ny). */
function stepOf(light: number, nx: number, ny: number, cuts: number[] = [0.24, 0.46, 0.74, 0.9], jitter = 0.06, seed = 3, cell = 2.6): number {
  const t = light + (noise(nx, ny, cell, seed) - 0.5) * 2 * jitter;
  let s = 1;
  for (const c of cuts) if (t >= c) s++;
  return s;
}

// --- the frame buffer ------------------------------------------------------------------------

interface PartStyle {
  /** Outline color around this part (null: none, e.g. smoke). */
  outline: Color | null;
  /** Inner line this part leaves on parts behind it where they meet (null: none). */
  line?: Color | null;
  /** Pixels below this alpha take no outline and leave no line (soft edges, mist). */
  solid?: number;
}

class Frame {
  readonly c: Canvas;
  readonly part: Int16Array;
  readonly styles: PartStyle[] = [];
  constructor(readonly w: number, readonly h: number) {
    this.c = new Canvas(w, h);
    this.part = new Int16Array(w * h).fill(-1);
  }
  /**
   * Paints one part: the union of its primitives (the front-most primitive wins per pixel),
   * coloured by `shade` (return null to leave a pixel empty). Later parts lie on top.
   */
  part_(prims: Prim[], shade: (h: Hit) => Color | null, style: PartStyle): number {
    const id = this.styles.length;
    this.styles.push(style);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of prims) {
      x0 = Math.min(x0, p.box[0]);
      y0 = Math.min(y0, p.box[1]);
      x1 = Math.max(x1, p.box[2]);
      y1 = Math.max(y1, p.box[3]);
    }
    for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) {
        let best: Hit | null = null;
        prims.forEach((p, k) => {
          if (x < p.box[0] || x > p.box[2] || y < p.box[1] || y > p.box[3]) return;
          const hh = p.at(x + 0.5, y + 0.5);
          if (hh && (!best || hh.z > best.z)) {
            hh.k = k;
            hh.x = x;
            hh.y = y;
            best = hh;
          }
        });
        if (!best) continue;
        const col = shade(best);
        if (!col || col[3] === 0) continue;
        this.c.plot(x, y, col);
        if (col[3] >= (style.solid ?? 128)) this.part[y * this.w + x] = id;
      }
    return id;
  }
  /** Inner lines (where a later part meets an earlier one) and the per-part outline. */
  finish(): Canvas {
    const { w, h, c } = this;
    const lines: [number, number, Color][] = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const p = this.part[y * w + x];
        if (p < 0) continue;
        let best = -1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const q = this.part[yy * w + xx];
          if (q > p && this.styles[q].line && q > best) best = q;
        }
        if (best >= 0) lines.push([x, y, this.styles[best].line!]);
      }
    // A line pixel needs a line neighbour, or it is a speck.
    const isLine = new Set(lines.map(([x, y]) => y * w + x));
    for (const [x, y, col] of lines) {
      let nb = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isLine.has((y + dy) * w + x + dx)) nb++;
      if (nb) c.set(x, y, [col[0], col[1], col[2], Math.max(c.alpha(x, y), col[3])]);
    }
    const outs: [number, number, Color][] = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (this.part[y * w + x] >= 0 || c.alpha(x, y) >= 200) continue;
        let best = -1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const q = this.part[yy * w + xx];
          if (q >= 0 && this.styles[q].outline && q > best) best = q;
        }
        if (best >= 0) outs.push([x, y, this.styles[best].outline!]);
      }
    for (const [x, y, col] of outs) c.set(x, y, col);
    return c;
  }
}

// --- sprite framing --------------------------------------------------------------------------

/** Crops all frames to their union (+1 px) and builds the sprite with the anchor at the body centre. */
function flySprite(name: string, label: string, meters: [number, number], frames: Canvas[], ax: number, ay: number, fps = 12): WorldSprite {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of frames) {
    const b = f.bounds();
    if (!b) continue;
    x0 = Math.min(x0, b[0]);
    y0 = Math.min(y0, b[1]);
    x1 = Math.max(x1, b[2]);
    y1 = Math.max(y1, b[3]);
  }
  x0 -= 1;
  y0 -= 1;
  x1 += 1;
  y1 += 1;
  const out = frames.map((f) => {
    const c = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
    c.draw(f, -x0, -y0);
    return c;
  });
  return { name, label, meters, anchor: [Math.round(ax - x0), Math.round(ay - y0)], tags: ['vfx'], anims: { fly: { frames: out, fps, loop: true } } };
}

// --- particles -------------------------------------------------------------------------------

/** A droplet: a bright 1-2 px bead with a darker underside and a short streak behind it. */
function drop(c: Canvas, x: number, y: number, big: boolean, hi: Color, mid: Color, dark: Color, dx = 1, dy = 0): void {
  const X = Math.round(x), Y = Math.round(y);
  c.set(X, Y, hi);
  if (big) {
    c.set(X + 1, Y, mid);
    c.set(X, Y + 1, mid);
    c.set(X + 1, Y + 1, dark);
  } else c.plot(X, Y + 1, wa(dark, 200));
  if (dx || dy) c.plot(X - Math.sign(dx), Y - Math.sign(dy), wa(mid, 140));
}

// =============================================================================================
// PHOENIX (fire)
// =============================================================================================
//
// The owner's phoenix (his reference sheet): a majestic bird of prey, chest up and head high, both
// wings raised in a V in the key pose. Every wing is built feather by feather, so each one reads on
// its own: long primaries fanned at the tips, the secondaries along the arm, a row of greater coverts
// over their roots and small marginal coverts on the leading edge. The feathers are orange and gold
// with yellow edges, crimson at the roots and on the far wing, and end in flickering flame tips. The
// body is deep red with an orange breast of scalloped feathers; the head is an eagle in profile with
// a hooked yellow-orange beak, a fierce eye under a heavy brow and a crest of flame feathers. The
// legs hang with the talons spread, and a long tail of four flame plumes with yellow cores streams
// down and back and curls up at the tips. Embers drift off the wings and the tail.
//
// Three animations share one frame: 'fly' (8 frames: the V, the down-sweep with the wingtips curling
// in, a glide with the wings level and back, rising again, a dark smoky trail starting behind the
// tail), 'dive' (a steep glide with the wings swept back, looping) and 'attack' (once: wings up, the
// head rears and spits a fireball forward).

const PHX = (() => ({
  ramp: ['#3a0610', '#640c16', '#921420', '#be2218', '#e44818', '#f6801e', '#ffb232', '#ffdc66', '#fff4be'].map((c) => hex(c)) as Color[],
  outline: hex('#4a0810'),
  line: hex('#6a0c16'),
  beak: ['#7a3008', '#b86010', '#ec9a1e', '#ffcc4a', '#fff0a0'].map((c) => hex(c)) as Color[],
  talon: [hex('#3a0a08'), hex('#6a2410')] as Color[],
  eye: [hex('#3a0608'), hex('#ffcc3a'), hex('#fff6c8')] as Color[],
  smoke: [hex('#3c302c'), hex('#5a4a42'), hex('#7a665a')] as Color[],
}))();

interface PhxPose {
  /** Body rotation (radians, negative lifts the chest) and bob (px, negative rises). */
  pitch: number;
  bob: number;
  /** Near and far wing: arm and hand directions (degrees on screen: -90 up, 180 back), spread 0..1. */
  arm: number;
  hand: number;
  spread: number;
  farArm: number;
  farHand: number;
  farSpread: number;
  /** Extra head tilt (radians, positive looks down) and how wide the beak is open (0..1). */
  head: number;
  beak: number;
  /** Tail: turn of the plumes (degrees, negative streams them higher). */
  tail: number;
  /** Smoky trail behind the tail (0..1), and a fireball ahead of the beak: [distance px, radius px]. */
  smoke: number;
  fire?: [number, number];
}
const PHX_BASE = { pitch: -0.38, bob: 0, spread: 1, farSpread: 1, head: 0, beak: 0.15, tail: 0, smoke: 0 };
// The owner's loop: the V (0), sweeping forward and down with the wingtips curling in (1-2), a glide
// with the wings level and back (3-4), rising again (5-6), the smoke trail starting (6-7).
const PHX_FLY: PhxPose[] = [
  { ...PHX_BASE, arm: -104, hand: -124, farArm: -62, farHand: -80, bob: 1 },
  { ...PHX_BASE, arm: -132, hand: 160, spread: 0.85, farArm: 18, farHand: 52, farSpread: 0.8, bob: -1, pitch: -0.32 },
  { ...PHX_BASE, arm: -158, hand: 132, spread: 0.8, farArm: 34, farHand: 68, farSpread: 0.75, bob: -2, pitch: -0.28, tail: 6 },
  { ...PHX_BASE, arm: 176, hand: 172, spread: 0.9, farArm: 22, farHand: 34, farSpread: 0.85, bob: -1, pitch: -0.18, tail: -8 },
  { ...PHX_BASE, arm: -164, hand: -172, spread: 1, farArm: -14, farHand: -6, farSpread: 0.9, bob: 0, pitch: -0.2, tail: -4 },
  { ...PHX_BASE, arm: -134, hand: -150, farArm: -42, farHand: -58, bob: 1, pitch: -0.3 },
  { ...PHX_BASE, arm: -108, hand: -128, farArm: -66, farHand: -84, bob: 2, smoke: 0.6 },
  { ...PHX_BASE, arm: -168, hand: -176, spread: 0.95, farArm: -24, farHand: -16, farSpread: 0.9, bob: 0, pitch: -0.2, tail: -6, smoke: 1 },
];
// A steep dive: nose down, wings swept back, the tail streaming above.
const PHX_DIVE: PhxPose[] = [0, 1, 2, 3, 4].map((k) => {
  const w = Math.sin((k / 5) * TAU);
  return { ...PHX_BASE, pitch: 0.55, bob: 0, arm: -164 + w * 4, hand: -174 + w * 6, spread: 0.55, farArm: -146 + w * 4, farHand: -158 + w * 5, farSpread: 0.5, head: -0.25, beak: 0.1, tail: -52 + w * 4, smoke: 0 };
});
// Attack (once): wings up, the head rears back, lunges and spits a fireball, then settles.
const PHX_ATTACK: PhxPose[] = [
  { ...PHX_BASE, arm: -112, hand: -132, farArm: -66, farHand: -84, head: -0.2, beak: 0.2 },
  { ...PHX_BASE, arm: -100, hand: -118, farArm: -58, farHand: -74, head: -0.42, beak: 0.6, bob: 1, fire: [4, 2.5] },
  { ...PHX_BASE, arm: -104, hand: -122, farArm: -60, farHand: -78, head: 0.18, beak: 1, bob: 0, fire: [9, 4.5] },
  { ...PHX_BASE, arm: -110, hand: -130, farArm: -64, farHand: -82, head: 0.12, beak: 0.8, fire: [30, 6] },
  { ...PHX_BASE, arm: -128, hand: -148, farArm: -46, farHand: -62, head: 0.05, beak: 0.4, fire: [50, 5] },
  { ...PHX_BASE, arm: -112, hand: -132, farArm: -64, farHand: -82, head: 0, beak: 0.15 },
];

/** Heat (0 crimson shadow .. 1 white-yellow) to the phoenix ramp. */
const phxHeat = (heat: number, x: number, y: number, seed: number): Color => {
  const v = heat + (noise(x, y, 2.2, seed) - 0.5) * 0.05;
  let s = 0;
  for (const c of [0.1, 0.2, 0.31, 0.43, 0.55, 0.67, 0.79, 0.91]) if (v >= c) s++;
  return PHX.ramp[s];
};

/** A flight feather: crimson at the root, orange and gold toward the edges and the flame tip, a dark shaft. */
function phxFeather(seed: number, far: boolean, hot = 0) {
  return (h: Hit): Color => {
    const L = lit(h, 0.4);
    let heat = 0.3 + h.u * 0.32 + smooth(0.45, 1, Math.abs(h.v)) * 0.2 + (L - 0.5) * 0.34 + hot - (far ? 0.18 : 0);
    if (h.u > 0.8) heat += (h.u - 0.8) * 1.2;
    if (Math.abs(h.v) < 0.13 && h.u > 0.05 && h.u < 0.8) heat -= 0.12;
    return phxHeat(heat, h.x, h.y, seed);
  };
}

/** Fire: a yellow core, orange, red at the rim; brighter toward the tip. */
function phxFlame(seed: number, far = false) {
  return (h: Hit): Color => phxHeat(0.42 + (1 - Math.abs(h.v)) * 0.5 + h.u * 0.08 - (far ? 0.14 : 0), h.x, h.y, seed);
}

/** The side of a wing bone its trailing feathers grow toward: the perpendicular nearest straight back. */
function trailSide(arm: number): number {
  const back = (a: number): number => Math.abs((((a - 180) % 360) + 540) % 360 - 180);
  return back(arm + 90) <= back(arm - 90) ? 1 : -1;
}

/**
 * One phoenix wing as parts, back to front: primaries (each with a flickering flame tip), then the
 * secondaries, greater coverts and marginal coverts. Returns the feather tips (embers start there).
 */
function phxWing(f: Frame, S: P2, arm: number, hand: number, spread: number, k: number, fi: number, far: boolean): P2[] {
  const style = { outline: PHX.outline, line: PHX.line, solid: 150 };
  const sg = trailSide(arm);
  const tr = arm + sg * 90;
  const fa = 20 * k, ha = 13 * k * (0.75 + 0.25 * spread);
  const Wr: P2 = [S[0] + dirOf(arm)[0] * fa, S[1] + dirOf(arm)[1] * fa];
  const T: P2 = [Wr[0] + dirOf(hand)[0] * ha, Wr[1] + dirOf(hand)[1] * ha];
  const tips: P2[] = [];
  const flick = (j: number): number => noise(j * 3.1, fi * 1.7, 1, 4400 + (far ? 50 : 0));
  // Primaries: long and separate, fanned apart at the tips; the outermost lies along the hand.
  for (let j = 6; j >= 0; j--) {
    const u = j / 6;
    const root: P2 = [lerp(Wr[0], T[0], 1 - u * 0.8), lerp(Wr[1], T[1], 1 - u * 0.8)];
    const a = hand + sg * (4 + lerp(0, 60, u) * spread);
    const len = lerp(33, 22, u) * k * (0.82 + 0.18 * spread);
    const d = dirOf(a);
    const tip: P2 = [root[0] + d[0] * len, root[1] + d[1] * len];
    f.part_([lens(root, tip, lerp(3.2, 3, u) * k, { bend: -sg * 1 * k, peak: 0.4, tip: 1.3, base: 0.6 })], phxFeather(5000 + j, far), style);
    // The flame tip, flickering.
    const fl = (2 + flick(j) * 5) * k;
    const fd = dirOf(a - sg * (6 + flick(j + 9) * 10));
    const f0: P2 = [tip[0] - d[0] * 3 * k, tip[1] - d[1] * 3 * k];
    const fe: P2 = [f0[0] + fd[0] * (fl + 3 * k), f0[1] + fd[1] * (fl + 3 * k)];
    f.part_([lens(f0, fe, 1.6 * k, { peak: 0.3, tip: 1.6, base: 0.8, bend: sg * 0.7 })], phxFlame(5100 + j, far), style);
    tips.push(fe);
  }
  // Secondaries along the arm, trailing back, turning toward the hand near the wrist.
  for (let j = 0; j < 6; j++) {
    const u = 0.1 + j * 0.16;
    const root: P2 = [lerp(S[0], Wr[0], u), lerp(S[1], Wr[1], u)];
    const a = tr - sg * 26 * u;
    const len = (18 + (j % 2) * 2) * k * (0.85 + 0.15 * spread);
    const d = dirOf(a);
    const tip: P2 = [root[0] + d[0] * len, root[1] + d[1] * len];
    f.part_([lens(root, tip, 3.5 * k, { bend: -sg * 0.8, peak: 0.4, tip: 1.2, base: 0.7 })], phxFeather(5200 + j, far, -0.04), style);
    if (j % 2 === 0) tips.push(tip);
  }
  // Greater coverts over the roots of the secondaries and the inner primaries.
  for (let j = 0; j < 7; j++) {
    const u = j / 6;
    const root: P2 = u < 0.7 ? [lerp(S[0], Wr[0], 0.1 + (u / 0.7) * 0.9), lerp(S[1], Wr[1], 0.1 + (u / 0.7) * 0.9)] : [lerp(Wr[0], T[0], ((u - 0.7) / 0.3) * 0.6), lerp(Wr[1], T[1], ((u - 0.7) / 0.3) * 0.6)];
    const a = u < 0.7 ? tr - sg * 20 * u : hand + sg * 42;
    const d = dirOf(a);
    const len = lerp(10.5, 8.5, u) * k;
    f.part_([lens(root, [root[0] + d[0] * len, root[1] + d[1] * len], 3 * k, { peak: 0.35, tip: 1, base: 0.8, bend: -sg * 0.5 })], phxFeather(5300 + j, far, 0.02), style);
  }
  // Marginal coverts and the leading edge: small scalloped feathers, the edge lit gold.
  const marg: Prim[] = [tube([S, Wr, T], (u) => lerp(4.2, 2.1, u) * k)];
  for (let j = 0; j < 6; j++) {
    const u = j / 5;
    const root: P2 = u < 0.7 ? [lerp(S[0], Wr[0], u / 0.7), lerp(S[1], Wr[1], u / 0.7)] : [lerp(Wr[0], T[0], (u - 0.7) / 0.3), lerp(Wr[1], T[1], (u - 0.7) / 0.3)];
    const a = u < 0.7 ? tr - sg * (8 + 14 * u) : hand + sg * 62;
    const d = dirOf(a);
    marg.push(lens(root, [root[0] + d[0] * 6 * k, root[1] + d[1] * 6 * k], 2.8 * k, { peak: 0.3, tip: 0.9, base: 0.9 }));
  }
  f.part_(marg, (h) => {
    const L = lit(h, 0.4);
    const scal = fract((h.u * h.len) / (3.6 * k));
    return phxHeat(0.42 + (L - 0.5) * 0.5 + (h.k === 0 ? 0.12 : 0) + (scal > 0.72 ? -0.08 : 0) - (far ? 0.18 : 0), h.x, h.y, 5400);
  }, style);
  return tips;
}

/** One phoenix frame on a W x H canvas, the body centre at (cx, cy). */
function phxFrame(g: PhxPose, fi: number, t: number, W: number, H: number, cx: number, cy: number): Canvas {
  const K = 0.95; // wing scale
  const f = new Frame(W, H);
  const style = { outline: PHX.outline, line: PHX.line, solid: 150 };
  const cp = Math.cos(g.pitch), sp = Math.sin(g.pitch);
  const P = (x: number, y: number): P2 => [cx + x * cp - y * sp, cy + g.bob + x * sp + y * cp];
  // --- far wing, behind everything ----------------------------------------------------------
  const farTips = phxWing(f, P(6, -8), g.farArm, g.farHand, g.farSpread, K * 0.92, fi, true);
  // --- tail: four flame plumes streaming down and back, curling up at the tips -------------
  const plumeTips: P2[] = [];
  for (let i = 3; i >= 0; i--) {
    const root = P(-13, 3 + i * 0.7);
    const len = [44, 50, 47, 38][i];
    const a0 = 132 + i * 9 + g.tail - g.pitch / D2R * 0.6;
    const pts: P2[] = [root];
    let [x, y] = root;
    const n = 12;
    for (let s = 1; s <= n; s++) {
      const u = s / n;
      const a = a0 + u * (26 + i * 6) - smooth(0.55, 1, u) * (95 + i * 12) + Math.sin(TAU * t - u * 3.2 + i * 1.3) * (4 + u * 9);
      x += Math.cos(a * D2R) * (len / n);
      y += Math.sin(a * D2R) * (len / n);
      pts.push([x, y]);
    }
    plumeTips.push([x, y]);
    const seed = 6000 + i * 13;
    f.part_([tube(pts, (u) => (u < 0.68 ? lerp(2, 4.4, smooth(0, 0.68, u)) : lerp(4.4, 0.5, smooth(0.68, 1, u))))], (h) => {
      // The end breaks up into flame: ragged, flickering edges.
      if (h.u > 0.6 && Math.abs(h.v) > 0.4 && noise(h.x * 0.9 - fi * 3, h.y * 0.9, 1.6, seed) < (h.u - 0.6) * 1.5) return null;
      const core = 1 - Math.abs(h.v);
      return phxHeat(0.3 + core * 0.46 + h.u * 0.22 + (lit(h, 0.4) - 0.5) * 0.14 - (i === 3 ? 0.08 : 0), h.x, h.y, seed);
    }, style);
  }
  // --- legs hanging, talons spread ------------------------------------------------------------
  const leg = (hip: P2, far: boolean): void => {
    const knee = P(hip[0] + 2, hip[1] + 4);
    const foot = P(hip[0] + 5, hip[1] + 10);
    f.part_([blob(...P(hip[0], hip[1]), 4.4, 4, g.pitch + 0.5)], (h) => phxHeat(0.3 + (lit(h) - 0.5) * 0.4 - (far ? 0.14 : 0), h.x, h.y, 6100), style);
    f.part_([tube([knee, foot], () => 1.3)], (h) => PHX.beak[clamp(stepOf(lit(h), h.x, h.y) - (far ? 2 : 1), 0, 3)], style);
    const toes: Prim[] = [], claws: Prim[] = [];
    for (const [a, l] of [[20, 4.2], [55, 4.4], [92, 3.8], [200, 2.8]] as P2[]) {
      const d = dirOf(a + g.pitch / D2R * 0.5);
      const e: P2 = [foot[0] + d[0] * l, foot[1] + d[1] * l];
      toes.push(tube([foot, e], () => 0.9));
      const c = dirOf(a + 60);
      claws.push(lens(e, [e[0] + c[0] * 2.6, e[1] + c[1] * 2.6], 0.85, { tip: 1.2, base: 1, bend: 0.6 }));
    }
    f.part_(toes, (h) => PHX.beak[clamp(stepOf(lit(h), h.x, h.y) - (far ? 2 : 1), 0, 3)], style);
    f.part_(claws, (h) => PHX.talon[h.v < 0 ? 1 : 0], style);
  };
  leg([-3, 6], true);
  // --- body, neck and head as one smooth volume ---------------------------------------------------
  const HD = P(17, -13);
  const ht = g.pitch * 0.45 + g.head + 0.08;
  const hc = Math.cos(ht), hs = Math.sin(ht);
  const HZ = (x: number, y: number): P2 => [HD[0] + x * hc - y * hs, HD[1] + x * hs + y * hc];
  f.part_([fused([
    blob(...P(-1, 0), 14, 9, g.pitch),
    blob(...P(7, -1), 9, 8.6, g.pitch - 0.3),
    blob(...P(-10, 2), 7, 6, g.pitch),
    tube([P(8, -5), P(13, -10), HZ(-1, 1)], (u) => lerp(5.6, 4.6, u)),
    blob(HD[0], HD[1], 6, 5.4, ht),
  ], 3)], (h) => {
    const L = lit(h, 0.4);
    // Orange breast of scalloped feathers in front and below; the back deep red.
    const lx = (h.x - cx) * cp + (h.y - cy - g.bob) * sp, ly = -(h.x - cx) * sp + (h.y - cy - g.bob) * cp;
    const breast = smooth(-1, 9, lx) * smooth(-7, 3, ly) * (1 - smooth(14, 20, lx));
    const row = Math.floor((ly + 40) / 3);
    const sc = fract((lx + 40 + (row % 2) * 2) / 4), sy = fract((ly + 40) / 3);
    const scallop = sy > 0.6 + Math.abs(sc - 0.5) * 0.6 ? -0.1 : 0;
    return phxHeat(0.3 + (L - 0.5) * 0.48 + breast * 0.24 + scallop * (0.4 + breast), h.x, h.y, 6300);
  }, style);
  // Crest: flame feathers off the back of the head.
  const ruffle = (j: number): number => noise(j * 2.3, fi * 1.9, 1, 6200);
  for (let j = 0; j < 4; j++) {
    const r = HZ(-2 - j * 1.5, -3.5 + j * 1.1);
    const a = -128 - j * 13 + (ruffle(j) - 0.5) * 14 + ht / D2R;
    const l = (9 - j * 1.4) * (0.85 + ruffle(j + 5) * 0.3);
    const d = dirOf(a);
    f.part_([lens(r, [r[0] + d[0] * l, r[1] + d[1] * l], 2, { peak: 0.3, tip: 1.6, bend: 0.7 })], phxFlame(6400 + j), style);
  }
  // Beak: the lower mandible (it drops as the beak opens), the mouth, then the hooked upper mandible.
  const lowA = 0.32 + g.beak * 0.5;
  const lowEnd: P2 = [HZ(2.6, 1.6)[0] + Math.cos(ht + lowA) * 7, HZ(2.6, 1.6)[1] + Math.sin(ht + lowA) * 7];
  if (g.beak > 0.3) f.part_([poly([HZ(3, 0.8), HZ(9.5, 2.6), lowEnd, HZ(3, 2.4)])], () => PHX.ramp[1], { outline: null, line: null });
  f.part_([lens(HZ(2.6, 1.6), lowEnd, 1.4, { peak: 0.2, tip: 0.8, base: 1 })], (h) => PHX.beak[clamp(stepOf(lit(h), h.x, h.y) - 1, 0, 3)], style);
  f.part_([lens(HZ(2.4, -1.6), HZ(10.5, 3.6), 2.7, { peak: 0.2, tip: 1, base: 1, bend: -1.5 })], (h) => PHX.beak[clamp(stepOf(lit(h), h.x, h.y) + (h.v < -0.3 ? 1 : 0), 1, 4)], style);
  // A heavy brow over the eye.
  f.part_([lens(HZ(-1.5, -3.8), HZ(5, -2.2), 1.6, { peak: 0.5, tip: 0.8, base: 0.8, bend: -0.5 })], (h) => phxHeat(0.46 + (lit(h) - 0.5) * 0.4, h.x, h.y, 6500), style);
  // --- near leg and the near wing in front ------------------------------------------------------
  leg([1, 6], false);
  const tips = phxWing(f, P(2, -7), g.arm, g.hand, g.spread, K, fi, false);
  const fc = f.finish();
  // The fierce eye: gold iris, a dark pupil, a glint, under the brow's shadow.
  const [ex, ey] = HZ(1.8, -1.2).map(Math.round);
  for (const [dx, dy, c] of [[-1, -1, PHX.outline], [0, -1, PHX.outline], [1, -1, PHX.outline], [2, -1, PHX.line], [-1, 0, PHX.eye[1]], [0, 0, PHX.eye[2]], [1, 0, PHX.eye[0]], [2, 0, PHX.eye[1]], [0, 1, PHX.eye[1]], [1, 1, PHX.eye[1]]] as [number, number, Color][]) fc.set(ex + dx, ey + dy, c);
  // A smoky trail behind the tail, under the bird.
  if (g.smoke > 0) {
    for (let k = 0; k < 9; k++) {
      const p = (k + 0.5) / 9;
      const s = plumeTips[k % plumeTips.length];
      const x0 = s[0] - 4 - p * 30 + Math.sin(k * 2.1 + fi) * 3, y0 = s[1] - 2 + Math.sin(k * 1.3 + fi * 0.7) * 4 - p * 4;
      const r = (2 + p * 4) * g.smoke;
      for (let y = Math.floor(y0 - r); y <= y0 + r; y++)
        for (let x = Math.floor(x0 - r * 1.5); x <= x0 + r * 1.5; x++) {
          const d = ((x - x0) / 1.5) ** 2 + (y - y0) ** 2;
          if (d > r * r || fc.alpha(x, y) > 0) continue;
          if (noise(x * 0.8 + fi * 2, y * 0.8, 2, 6600 + k) < 0.35) continue;
          fc.plot(x, y, wa(PHX.smoke[d < r * r * 0.3 ? 1 : d < r * r * 0.7 ? 0 : 2], (170 - p * 90) * g.smoke));
        }
    }
  }
  // Embers drifting back and up off the wing tips and the tail.
  const src = [...tips, ...farTips, ...plumeTips];
  for (let k = 0; k < 16; k++) {
    const p = fract(k / 16 + t + rnd(71, k) * 0.3);
    const s = src[(k * 5) % src.length];
    const X = Math.round(s[0] - 3 - p * 18 + (rnd(72, k) - 0.5) * 8), Y = Math.round(s[1] - p * 9 + (rnd(73, k) - 0.5) * 8);
    if (X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1 || fc.alpha(X, Y) > 200) continue;
    const col = p < 0.35 ? PHX.ramp[8] : p < 0.7 ? PHX.ramp[6] : PHX.ramp[4];
    fc.plot(X, Y, wa(col, 255 * (1 - p * 0.55)));
    if (k % 3 === 0 && p < 0.5 && !fc.alpha(X + 1, Y)) fc.plot(X + 1, Y, wa(PHX.ramp[5], 180));
  }
  // The fireball spat from the beak: a white-yellow core, orange, a red rim, a short flame trail.
  if (g.fire) {
    const [dist, r] = g.fire;
    const m = HZ(10, 3);
    const fx = m[0] + dist, fy = m[1] + dist * 0.12;
    for (let y = Math.floor(fy - r - 2); y <= fy + r + 2; y++)
      for (let x = Math.floor(fx - r - 9); x <= fx + r + 2; x++) {
        const dx = x + 0.5 - fx, dy = y + 0.5 - fy;
        // An egg: round in front, drawn out into a trail behind.
        const e = dx >= 0 ? Math.hypot(dx, dy) / r : Math.hypot(dx / (1 + Math.min(2.2, dist / 12)), dy) / (r * (1 + dx / (r * 6)));
        if (e > 1.15) continue;
        const flick = (noise(x * 1.2 - fi * 5, y * 1.2, 1.4, 6700) - 0.5) * 0.3;
        const heat = 1.02 - e * 0.62 + flick;
        if (e > 1 && heat < 0.42) continue;
        fc.set(x, y, e > 1 ? PHX.outline : phxHeat(heat, x, y, 6710));
      }
    for (let k = 0; k < 5; k++) {
      const X = Math.round(fx - r - 3 - rnd(6720 + fi, k) * 10), Y = Math.round(fy + (rnd(6730 + fi, k) - 0.5) * r * 2.4);
      if (!fc.alpha(X, Y)) fc.set(X, Y, k % 2 ? PHX.ramp[7] : PHX.ramp[5]);
    }
  }
  return fc;
}

/** A beast with several animations sharing one frame: crops all of them to their union. */
function beastSprite(name: string, label: string, meters: [number, number], anims: [string, Canvas[], number, boolean][], ax: number, ay: number): WorldSprite {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [, frames] of anims)
    for (const f of frames) {
      const b = f.bounds();
      if (!b) continue;
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]);
      y1 = Math.max(y1, b[3]);
    }
  x0 -= 1;
  y0 -= 1;
  x1 += 1;
  y1 += 1;
  const crop = (f: Canvas): Canvas => {
    const c = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
    c.draw(f, -x0, -y0);
    return c;
  };
  const out: WorldSprite['anims'] = {};
  for (const [key, frames, fps, loop] of anims) out[key] = { frames: frames.map(crop), fps, loop };
  return { name, label, meters, anchor: [Math.round(ax - x0), Math.round(ay - y0)], tags: ['vfx'], anims: out };
}

function phoenix(): WorldSprite {
  const W = 260, H = 220, cx = 120, cy = 110;
  const render = (poses: PhxPose[]): Canvas[] => poses.map((g, i) => phxFrame(g, i, i / poses.length, W, H, cx, cy));
  return beastSprite('fire', 'Phoenix (fire)', [2, 1.9], [['fly', render(PHX_FLY), 12, true], ['dive', render(PHX_DIVE), 12, true], ['attack', render(PHX_ATTACK), 12, false]], cx, cy);
}

// =============================================================================================
// WATER DRAGON (Suiryudan)
// =============================================================================================
//
// An eastern dragon made of water, racing right: a long serpent body that undulates in a wave
// running from the neck to the tail, a dorsal crest of foaming fins, pale ventral plates, a long
// head with an open jaw, fangs, swept-back antler horns, long whiskers and a mane of spray.
// The water is layered: the body is translucent where it faces the viewer and thick at the
// silhouette (like a glass of water), with currents streaming back through it and white foam
// along the lit ridge; droplets and spray trail off the crests and the tail.

const WATER = (() => {
  // The river's blue lifted to a vivid cyan, with deep blue in the core.
  return {
    ramp: [hex('#0c2c58'), hex('#1b5c9c'), hex('#2a8ccc'), hex('#55bdea'), hex('#a2e4fa'), hex('#eefcff')] as Color[],
    deep: [hex('#06163a'), hex('#0f2e66'), hex('#17468e'), hex('#2460ac'), hex('#3c82c8'), hex('#6cb0e2')] as Color[],
    foam: [hex('#3c78a8'), hex('#78b8dc'), hex('#a8daf0'), hex('#d4f0fa'), hex('#f2fcff'), hex('#ffffff')] as Color[],
    belly: ramp(blend('#8fd4ec', MATERIALS.paper, 0.25), { shift: 10 }),
    outline: hex('#0f2a52'),
    line: hex('#1d4a80'),
    eye: hex('#fff6c8'),
  };
})();

/** The dragon's spine for phase t: a wave running from the neck to the tail. */
function waterSpine(t: number, cx: number, cy: number): P2[] {
  const pts: P2[] = [];
  const N = 50;
  for (let i = 0; i <= N; i++) {
    const s = i / N; // 0 at the neck, 1 at the tail tip
    const x = cx + 24 - s * 97;
    const amp = lerp(3, 19, smooth(0, 0.4, s)) * lerp(1, 0.75, smooth(0.8, 1, s));
    const y = cy + 6 + amp * Math.sin(TAU * (s * 1.1 - t) + 0.9) - 10 * (1 - smooth(0, 0.3, s));
    pts.push([x, y]);
  }
  return pts;
}

function waterDragon(): WorldSprite {
  const W = 190, H = 130, cx = 100, cy = 64;
  const frames: Canvas[] = [];
  const NF = 8;
  for (let fi = 0; fi < NF; fi++) {
    const t = fi / NF;
    const f = new Frame(W, H);
    const spine = waterSpine(t, cx, cy);
    const neck = spine[0];
    const hw = (u: number): number => (u < 0.1 ? lerp(9, 11, u / 0.1) : u < 0.45 ? 11 : lerp(11, 1.2, ((u - 0.45) / 0.55) ** 1.1));
    const bob = Math.sin(TAU * t) * 1.2;
    // Head frame (scaled 1.4): the back of the skull sits just ahead of the neck.
    const S = 1.32;
    const hx = neck[0] + 2, hy = neck[1] - 6 + bob;
    const ang = -0.08 + Math.sin(TAU * t + 0.8) * 0.04;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const H2 = (x: number, y: number): P2 => [hx + (x * ca - y * sa) * S, hy + (x * sa + y * ca) * S];

    /** Water: layered and translucent, with currents and wave curls flowing back along the body. */
    const waterShade = (lay: { seed: number; alphaK?: number; belly?: boolean; curls?: boolean }) => (h: Hit): Color | null => {
      const L = lit(h);
      const along = h.u * h.len;
      const flow = noise(along * 0.3 + t * h.len * 0.3, h.v * 3, 2.2, lay.seed);
      let s = stepOf(L + (flow - 0.5) * 0.2, along, h.v * 6, [0.2, 0.42, 0.68, 0.86], 0.05, lay.seed);
      // Thick at the silhouette, clearer in the middle: alpha rises toward the rim.
      let a = 160 + 95 * Math.pow(1 - h.nz, 0.6);
      let r = WATER.ramp;
      if (lay.belly && h.v > 0.45) {
        // Pale ventral plates with a seam every 4 px.
        r = WATER.belly;
        s = clamp(s, 2, 4) - ((along + 0.5) % 4.4 < 1 ? 1 : 0);
        a = 240;
        return wa(r[s], a);
      }
      if (lay.curls) {
        // Wave curls: crescent strokes curling back off the ridge, travelling with the flow.
        const ph = fract((along + 6 * Math.sin((h.v + 1) * 1.4)) / 16 + t * 1.5);
        const reach = h.v < 0.25 && h.v > -0.95;
        if (reach && ph < 0.075) return wa(WATER.foam[h.v < -0.4 ? 5 : 4], 255);
        if (reach && ph < 0.16) s = Math.min(5, s + 1);
      }
      // Foam on the lit ridge.
      if (h.v < -0.66 && L > 0.55 && flow > 0.4) return wa(WATER.foam[s >= 4 ? 5 : 4], 255);
      return wa(r[clamp(s, 1, 5)], a * (lay.alphaK ?? 1));
    };
    const style = { outline: WATER.outline, line: WATER.line, solid: 140 };

    // --- far side: whisker, horn -----------------------------------------------------------
    const wh = (side: number) => {
      const pts: P2[] = [];
      for (let i = 0; i <= 18; i++) {
        const q = i / 18;
        const [x, y] = H2(25 - q * 26, 4 + q * 11 + side * 2.5);
        pts.push([x - q * q * 12, y + Math.sin(TAU * (q * 0.9 - t)) * 3.5 * q]);
      }
      return pts;
    };
    f.part_([tube(wh(-1), (u) => lerp(1.1, 0.6, u))], () => wa(WATER.foam[3], 235), { outline: WATER.outline, line: null });
    const farHorn = [lens(H2(6, -7.5), H2(-14, -19.5), 1.6 * S, { bend: -3, tip: 1.3, peak: 0.2, base: 0.8 }), lens(H2(-3, -13.5), H2(-3, -22), 1, { tip: 1.5 })];
    f.part_(farHorn, (h) => WATER.deep[clamp(stepOf(lit(h), h.x, h.y) - 1, 1, 4)], style);

    // --- dorsal crest: foaming fins along the back, swept back and waving -------------------
    const crest: Prim[] = [];
    for (let j = 0; j < 10; j++) {
      const u = 0.05 + j * 0.08;
      const i = Math.round(u * (spine.length - 1));
      const [px, py] = spine[i];
      const [qx, qy] = spine[Math.min(spine.length - 1, i + 1)];
      const dx = qx - px, dy = qy - py, dl = Math.hypot(dx, dy) || 1;
      const ux2 = -dy / dl, uy2 = dx / dl; // the upper side of a body that runs to the left
      const w = hw(u);
      const len = lerp(15, 6, u) + Math.sin(TAU * (t * 2 + j * 0.3)) * 1.6;
      const root: P2 = [px + ux2 * w * 0.45, py + uy2 * w * 0.45];
      const tip: P2 = [root[0] + ux2 * len * 0.75 + (dx / dl) * len * 0.85, root[1] + uy2 * len * 0.75 + (dy / dl) * len * 0.85];
      crest.push(lens(root, tip, lerp(4.4, 2.2, u), { bend: -2, tip: 1.7, peak: 0.28 }));
    }
    f.part_(crest, (h) => {
      const s = stepOf(lit(h) + 0.1, h.x, h.y, [0.25, 0.5, 0.72, 0.88]);
      return wa(h.u > 0.6 ? WATER.foam[clamp(s + 1, 2, 5)] : WATER.ramp[clamp(s, 2, 5)], 235);
    }, style);

    // --- body: the deep core, then the translucent skin over it --------------------------
    f.part_([tube(spine, (u) => hw(u) * 0.5, -3)], (h) => WATER.deep[clamp(stepOf(lit(h), h.u * h.len, h.v * 4, undefined, 0.06, 9) - 1, 1, 4)], { outline: null, line: null });
    f.part_([tube(spine, hw)], waterShade({ seed: 21, belly: true, curls: true }), style);

    // --- head ------------------------------------------------------------------------------
    const jaw = [lens(H2(-2, 5), H2(23, 11), 3.8, { bend: 1, peak: 0.25, tip: 0.8, base: 0.8 })];
    f.part_(jaw, waterShade({ seed: 31, alphaK: 2 }), style);
    f.part_([poly([H2(2, 2.5), H2(22.5, 3), H2(21.5, 8.5), H2(4, 7)])], () => WATER.deep[1], { outline: null, line: null });
    f.part_([poly([H2(17.5, 7.8), H2(19, 7.6), H2(18, 4.2)]), poly([H2(11.5, 7.2), H2(13, 7), H2(12, 4.4)])], () => WATER.foam[5], { outline: null, line: null });
    // Skull, brow ridge, long snout ending in a nose bulb, cheek.
    const skull = [blob(...H2(5, -1), 8.5 * S, 7 * S, ang), lens(H2(2, -1.5), H2(28, 0.5), 5.4 * S, { bend: -1.2, peak: 0.35, tip: 0.6, base: 0.9 }), blob(...H2(26, -0.8), 3.6 * S, 3.3 * S), blob(...H2(9.5, -5.6), 5 * S, 2.6 * S, ang - 0.15)];
    f.part_(skull, waterShade({ seed: 41, alphaK: 2 }), style);
    f.part_([poly([H2(20.5, 2.6), H2(22.4, 2.6), H2(21.4, 6.6)]), poly([H2(14.5, 2.8), H2(16.2, 2.8), H2(15.3, 6.2)]), poly([H2(9, 3), H2(10.4, 3), H2(9.6, 5.4)])], () => WATER.foam[5], { outline: WATER.outline, line: null });
    // Mane of spray: foaming tufts swept back off the head and down the neck.
    const mane: Prim[] = [];
    for (let j = 0; j < 7; j++) {
      const r: P2 = H2(-1 - j * 2.4, -4 + j * 2.2);
      const a = Math.PI + 0.15 + j * 0.16 + Math.sin(TAU * t + j) * 0.1;
      const l = (13 - j * 0.8) * S;
      mane.push(lens(r, [r[0] + Math.cos(a) * l, r[1] + Math.sin(a) * l], 2.3 * S, { bend: (j % 2 ? 2.4 : -1.6), tip: 1.8, peak: 0.22 }));
    }
    f.part_(mane, (h) => {
      const s = stepOf(lit(h) + 0.1, h.x, h.y, [0.24, 0.46, 0.66, 0.84], 0.07, 51);
      return wa(h.u > 0.55 ? WATER.foam[clamp(s + 1, 2, 5)] : WATER.ramp[clamp(s + 1, 2, 5)], 245);
    }, style);
    // Near horn: an antler swept back with a tine.
    const horn = [
      lens(H2(5, -6.5), H2(-17, -18), 1.7 * S, { bend: -3, tip: 1.3, peak: 0.2, base: 0.8 }),
      lens(H2(-3, -12), H2(-4, -21.5), 1.1 * S, { tip: 1.6, bend: 1 }),
      lens(H2(-10, -15.2), H2(-13.5, -23), 0.9 * S, { tip: 1.6, bend: 0.8 }),
    ];
    f.part_(horn, (h) => {
      const s = stepOf(lit(h), h.x, h.y, [0.26, 0.48, 0.74, 0.9]);
      return h.u > 0.85 ? WATER.foam[4] : WATER.belly[clamp(s, 1, 5)];
    }, style);
    f.part_([tube(wh(1), (u) => lerp(1.2, 0.6, u))], () => wa(WATER.foam[4], 250), { outline: WATER.outline, line: null });
    const fc = f.finish();
    // Eye: a glowing slit under the brow; nostril.
    // Eye: a glowing almond under the heavy brow, a dark slit pupil, a cool rim.
    const [ex, ey] = H2(10.5, -2.4).map(Math.round);
    for (const [dx, dy, col] of [
      [-1, -1, WATER.outline], [0, -1, WATER.outline], [1, -1, WATER.outline], [2, -1, WATER.outline], [3, -1, WATER.outline],
      [-1, 0, WATER.foam[3]], [0, 0, WATER.eye], [1, 0, WATER.deep[0]], [2, 0, WATER.eye], [3, 0, WATER.foam[4]],
      [0, 1, WATER.deep[1]], [1, 1, WATER.foam[2]], [2, 1, WATER.deep[1]],
    ] as [number, number, Color][]) fc.set(ex + dx, ey + dy, col);
    const [nx2, ny2] = H2(26, -2.2).map(Math.round);
    fc.set(nx2, ny2, WATER.deep[1]);
    fc.set(nx2 + 1, ny2, WATER.deep[1]);
    // The tail dissolves into spray; droplets shed by the crest drift back and fall.
    const tail = spine[spine.length - 1];
    for (let k = 0; k < 22; k++) {
      const p = fract(k / 22 + t + rnd(3, k) * 0.3);
      const fromTail = k < 9;
      const src = fromTail ? tail : spine[Math.round(lerp(0.15, 0.85, rnd(4, k)) * (spine.length - 1))];
      const x = src[0] - p * (fromTail ? 13 : 16) - rnd(5, k) * 4;
      const y = src[1] + (fromTail ? (rnd(6, k) - 0.5) * 12 * (0.4 + p) : -8 + p * p * 20 + rnd(6, k) * 6);
      if (x < 1 || y < 1 || y > H - 2) continue;
      drop(fc, x, y, p < 0.35 && k % 3 === 0, WATER.foam[5], WATER.foam[2], WATER.ramp[2], -1, fromTail ? 0 : 1);
    }
    frames.push(fc);
  }
  return flySprite('water', 'Water dragon (Suiryudan)', [2.8, 1.9], frames, cx, cy);
}

// =============================================================================================
// WIND CRANE
// =============================================================================================
//
// A great crane made of wind, flying right: the long neck stretched out, a dagger beak, the legs
// trailing behind the tail, and wide wings beating through a 6-frame flap. Every feather is its own
// blade (secondaries along the arm, primaries fanned from the hand, coverts over the roots) in pale
// mint and white, with vanes streaked along their length; the primaries' tips stream off into wind
// lines, and curling eddies spin off the wingtips and tail.

const WIND = (() => ({
  // Pale mint to white, with deep teal shadows so the form still reads against a bright sky.
  ramp: [hex('#123c3a'), hex('#2f7a70'), hex('#55ae9a'), hex('#8fd8bf'), hex('#cdf6e6'), hex('#f8fffc')] as Color[],
  tip: [hex('#0c2e30'), hex('#1d5658'), hex('#2f7f80'), hex('#4fa6a2'), hex('#86d2c6'), hex('#c8f2ea')] as Color[],
  outline: hex('#17423f'),
  line: hex('#3f8c84'),
  white: hex('#f6fffb'),
  streak: hex('#dcfff2'),
  eye: hex('#0f2a2a'),
  crown: hex('#e4f8a8'),
}))();

interface CraneWing {
  /** Arm and hand directions (degrees on screen: -90 up, 180 back) and how spread the hand is (0..1). */
  arm: number;
  hand: number;
  spread: number;
}
// up, coming down, level, down, rising (folded), rising
const CRANE_FLAP: (CraneWing & { bob: number })[] = [
  { arm: -105, hand: -118, spread: 1, bob: 1 },
  { arm: -150, hand: -160, spread: 1, bob: 0 },
  { arm: 172, hand: 160, spread: 1, bob: -1 },
  { arm: 135, hand: 120, spread: 0.92, bob: -2 },
  { arm: -165, hand: -178, spread: 0.7, bob: -1 },
  { arm: -128, hand: -140, spread: 0.85, bob: 0 },
];
const D2R = Math.PI / 180;
const dirOf = (deg: number): P2 => [Math.cos(deg * D2R), Math.sin(deg * D2R)];

/** Feather shader: mint vanes streaked along the blade, darker toward the tip of the flight feathers. */
function featherShade(t: number, o: { far?: boolean; tipDark?: boolean; seed: number }) {
  return (h: Hit): Color => {
    const L = lit(h) - (o.far ? 0.12 : 0);
    // Vane streaks: thin lines along the blade.
    const vane = noise(h.u * h.len * 0.25 - t * 8, h.v * 3.2, 1.6, o.seed);
    let s = stepOf(L + (vane - 0.5) * 0.25, h.u * h.len, h.v * 4, [0.26, 0.48, 0.72, 0.88], 0.05, o.seed);
    if (Math.abs(h.v) < 0.12 && h.u > 0.1) s = Math.max(1, s - 1); // the rachis
    if (o.tipDark && h.u > 0.7) return WIND.tip[clamp(s, 1, 4)];
    return WIND.ramp[clamp(s - (o.far ? 1 : 0), 1, 5)];
  };
}

/** One crane wing as parts, back to front; returns the primary tips (for the wind lines). */
function craneWing(f: Frame, S: P2, wg: CraneWing, k: number, t: number, far: boolean): P2[] {
  const style = { outline: WIND.outline, line: WIND.line, solid: 150 };
  const fa = 17 * k, ha = 15 * k * (0.7 + 0.3 * wg.spread);
  const Wr: P2 = [S[0] + dirOf(wg.arm)[0] * fa, S[1] + dirOf(wg.arm)[1] * fa];
  const T: P2 = [Wr[0] + dirOf(wg.hand)[0] * ha, Wr[1] + dirOf(wg.hand)[1] * ha];
  const flick = (j: number): number => Math.sin(TAU * t + j * 1.3);
  // Feathers point back from the bone and slightly away from the body.
  const back = (a: number, d: number): number => 180 + (a > 0 ? d : -d) * 0.35 + (a > 90 || a < -90 ? 0 : 0);
  // Secondaries along the forearm.
  const secs: Prim[] = [];
  for (let j = 0; j < 6; j++) {
    const u = 0.12 + j * 0.16;
    const root: P2 = [lerp(S[0], Wr[0], u), lerp(S[1], Wr[1], u)];
    const a = back(wg.arm, 30) + (wg.arm < 0 ? 18 : -18) * u;
    const len = (20 + flick(j) * 0.8) * k;
    const d = dirOf(a);
    secs.push(lens(root, [root[0] + d[0] * len, root[1] + d[1] * len], 4.2 * k, { bend: wg.arm < 0 ? 1 : -1, peak: 0.35, tip: 0.8, base: 0.7 }));
  }
  f.part_(secs, featherShade(t, { far, tipDark: true, seed: 61 }), style);
  // Primaries fanned from the hand, inner first so the outer ones lie on top.
  const tips: P2[] = [];
  for (let j = 5; j >= 0; j--) {
    const u = j / 5; // 0 outermost
    const root: P2 = [lerp(Wr[0], T[0], 1 - u * 0.75), lerp(Wr[1], T[1], 1 - u * 0.75)];
    const a = wg.hand + lerp(0, wg.hand < 0 ? -62 : 62, u) * wg.spread + (wg.hand < 0 ? -8 : 8);
    const len = lerp(28, 20, u) * k * (0.8 + 0.2 * wg.spread) + flick(j + 3);
    const d = dirOf(a);
    const tip: P2 = [root[0] + d[0] * len, root[1] + d[1] * len];
    tips.push(tip);
    f.part_([lens(root, tip, lerp(3.6, 3.2, u) * k, { bend: wg.hand < 0 ? 1.2 : -1.2, peak: 0.3, tip: 1.2, base: 0.6 })], featherShade(t, { far, tipDark: true, seed: 71 + j }), style);
  }
  // Coverts and the leading edge: a bright band of short feathers over the roots.
  const cov: Prim[] = [tube([S, Wr, T], (u) => lerp(4.2, 2.4, u) * k)];
  for (let j = 0; j < 5; j++) {
    const u = j / 4;
    const root: P2 = u < 0.6 ? [lerp(S[0], Wr[0], u / 0.6), lerp(S[1], Wr[1], u / 0.6)] : [lerp(Wr[0], T[0], (u - 0.6) / 0.4), lerp(Wr[1], T[1], (u - 0.6) / 0.4)];
    const a = back(wg.arm, 20) + (wg.arm < 0 ? 12 : -12) * u;
    const d = dirOf(a);
    const len = lerp(11, 8, u) * k;
    cov.push(lens(root, [root[0] + d[0] * len, root[1] + d[1] * len], 3.8 * k, { peak: 0.3, tip: 0.9, base: 0.8 }));
  }
  f.part_(cov, featherShade(t, { far, seed: 81 }), style);
  return tips;
}

function windCrane(): WorldSprite {
  const W = 190, H = 150, cx = 92, cy = 76;
  const frames: Canvas[] = [];
  CRANE_FLAP.forEach((wg, i) => {
    const t = i / CRANE_FLAP.length;
    const f = new Frame(W, H);
    const by = wg.bob;
    const style = { outline: WIND.outline, line: WIND.line, solid: 150 };
    const body = (h: Hit): Color => {
      const L = lit(h);
      const s = stepOf(L + (noise(h.x * 0.5 - t * 20, h.y, 2, 91) - 0.5) * 0.12, h.x, h.y, [0.26, 0.48, 0.72, 0.88], 0.05, 91);
      return WIND.ramp[clamp(s, 1, 5)];
    };
    // Far wing, behind everything, raised a little ahead of the near one.
    const farW: CraneWing = { arm: wg.arm + (wg.arm < 0 ? 10 : -10), hand: wg.hand + (wg.hand < 0 ? 12 : -12), spread: wg.spread };
    const farTips = craneWing(f, [cx + 6, cy - 6 + by], farW, 1.02, t + 0.08, true);
    // Wind ribbons streaming from the tail, waving, each ending in a curl.
    for (let r = 0; r < 3; r++) {
      const pts: P2[] = [];
      const n = 30;
      const len = 46 + r * 7;
      for (let q = 0; q <= n; q++) {
        const u = q / n;
        const x = cx - 18 - u * len;
        const y = cy + 3 + by + (r - 1) * 7 * u + Math.sin(TAU * (u * 1.2 - t) + r * 1.8) * 4 * u;
        pts.push([x, y]);
      }
      // The end hooks over into an open curl (half a turn), tapering to a point.
      const [ex0, ey0] = pts[n];
      const dirUp = r === 2 ? 1 : -1;
      for (let q = 1; q <= 7; q++) {
        const a = Math.PI - q * 0.42;
        const rr = 4 - q * 0.25;
        pts.push([ex0 + 4 + Math.cos(a) * rr * 1.2 - 0, ey0 + dirUp * (Math.sin(a) * rr)]);
      }
      f.part_([tube(pts, (u) => (u < 0.7 ? lerp(3.4, 1.6, u / 0.7) : lerp(1.6, 0.4, (u - 0.7) / 0.3)))], (h) => {
        const L = lit(h);
        const st = fract(h.u * 6 - t * 3 + r * 0.3) < 0.2 ? 1 : 0;
        const sx = stepOf(L, h.u * h.len, h.v * 3, [0.24, 0.46, 0.7, 0.86], 0.05, 101 + r) + st;
        return wa(WIND.ramp[clamp(sx, 2, 5)], lerp(245, 170, h.u));
      }, { outline: WIND.outline, line: WIND.line, solid: 160 });
    }
    // Legs trailing behind the tail, dark and thin, with the toes curled.
    const legs: Prim[] = [];
    for (const [dy, dx] of [[0, 0], [2, -3]]) {
      const hip: P2 = [cx - 10, cy + 5 + by];
      const knee: P2 = [cx - 26 + dx, cy + 8 + by + dy];
      const foot: P2 = [cx - 52 + dx, cy + 10 + by + dy + Math.sin(TAU * t) * 0.6];
      legs.push(tube([hip, knee, foot], (u) => lerp(1.6, 1.0, u)));
      legs.push(lens(foot, [foot[0] - 5, foot[1] + 1.5], 1.0, { tip: 1 }));
    }
    f.part_(legs, (h) => WIND.tip[clamp(stepOf(lit(h), h.x, h.y) - 1, 1, 3)], style);
    // Tail: a short fan of feathers.
    const tail: Prim[] = [];
    for (let j = 0; j < 5; j++) {
      const a = 180 + (j - 2) * 9 + Math.sin(TAU * t + j) * 2;
      const r: P2 = [cx - 16, cy + 2 + by];
      const d = dirOf(a);
      tail.push(lens(r, [r[0] + d[0] * 16, r[1] + d[1] * 16], 3.2, { peak: 0.4, tip: 1.2, base: 0.6 }));
    }
    f.part_(tail, featherShade(t, { seed: 95 }), style);
    // Body, neck and head as one form: a long torso with a full breast, the neck stretched
    // forward in a gentle S, the head held level.
    const neck: P2[] = [];
    for (let j = 0; j <= 14; j++) {
      const u = j / 14;
      neck.push([cx + 10 + u * 36, cy - 2 + by - Math.sin(u * Math.PI) * 4 - u * 5 + Math.sin(TAU * t + u * 2) * 0.8 * u]);
    }
    const hd = neck[neck.length - 1];
    f.part_([blob(cx - 2, cy + 1 + by, 19, 8.2, -0.08), blob(cx + 9, cy + by, 9.5, 7.8, -0.2), tube(neck, (u) => lerp(5, 2.9, u)), blob(hd[0] + 3, hd[1], 5.4, 4.3, -0.1)], body, style);
    f.part_([lens([hd[0] + 6, hd[1] - 0.5], [hd[0] + 22, hd[1] + 2.2], 2.1, { peak: 0.12, tip: 0.9, base: 1 })], (h) => WIND.tip[clamp(stepOf(lit(h), h.x, h.y) + (h.v < 0 ? 1 : 0), 2, 5)], style);
    // Near wing in front.
    const tips = craneWing(f, [cx + 2, cy - 4 + by], wg, 1.18, t, false);
    const fc = f.finish();
    // Eye and a pale crown.
    const ex = Math.round(hd[0] + 4), ey = Math.round(hd[1] - 1);
    fc.set(ex, ey, WIND.eye);
    fc.set(ex + 1, ey, WIND.eye);
    fc.set(ex, ey - 1, WIND.white);
    for (const [dx, dy] of [[-1, -4], [0, -4], [1, -4], [2, -4]]) fc.set(ex + dx, ey + dy, WIND.crown);
    // Wind lines streaming off the primary tips and the tail, curling eddies behind.
    const streak = (x0: number, y0: number, len: number, a: number, seed: number): void => {
      for (let q = 0; q < len; q++) {
        const x = x0 - q, y = y0 + Math.sin(q * 0.25 + seed) * 0.8;
        const alpha = a * (1 - q / len);
        if ((q + Math.floor(t * 12) + seed) % 9 < 7) fc.plot(x, y, wa(WIND.streak, alpha));
      }
    };
    [...tips, ...farTips].forEach(([x, y], j) => streak(x - 1, y, 11 + (j % 3) * 4, j < tips.length ? 235 : 150, j));
    // Eddies: spirals spun off behind, drifting back and opening up over the loop.
    for (let e = 0; e < 3; e++) {
      const p = fract(t + e / 3);
      const ex2 = cx - 42 - p * 32, ey2 = cy - 20 + e * 20 + Math.sin(e * 2.1) * 6;
      const r0 = 2.5 + p * 4;
      let last: P2 | null = null;
      for (let q = 0; q <= 60; q++) {
        const a = q * 0.16 + e * 2 + p * 3;
        const rr = r0 * (1 - q / 75);
        const pt: P2 = [Math.round(ex2 + Math.cos(a) * rr * 1.5), Math.round(ey2 + Math.sin(a) * rr)];
        if (last && pt[0] === last[0] && pt[1] === last[1]) continue;
        last = pt;
        if (fc.alpha(pt[0], pt[1]) > 200) continue;
        fc.set(pt[0], pt[1], wa(q < 20 ? WIND.white : WIND.streak, 235 * (1 - p * 0.6) * (1 - q / 70)));
      }
    }
    frames.push(fc);
  });
  return flySprite('wind', 'Wind crane', [2.6, 2.0], frames, cx, cy);
}

// =============================================================================================
// RAIJU (lightning)
// =============================================================================================
//
// The thunder beast of the old stories, painted to the owner's design: a natural, slim, long-legged
// golden wolf in a pouncing cycle that holds its body centre on the anchor. It coils, springs,
// stretches out with the forelegs reaching, strikes with the jaw wide, then tucks its legs back in.
// The volumes are smooth: chest, tucked waist, haunch and neck are fused into one height field, so
// they flow into each other and shade like soft fur (cream on top and on the back of the neck, warm
// gold, amber, brown-orange under the belly and on the far legs, a dark brown outline). A ruff of
// pointed fur tufts covers the neck and shoulders; the head is a wolf in profile, ears up, snarling,
// with bared teeth and a glowing white eye. Thin white-yellow lightning veins run over the body like
// glowing cracks and flicker every frame; small arcs jump above the back, sparks spit around the
// feet, the tail is a bright zigzag bolt with a forked tip, and the stretch trails pale streaks.

const RAI = (() => ({
  ramp: ['#4a1e06', '#7a3a0a', '#a85a10', '#d08418', '#eaa828', '#f8c840', '#ffe27a', '#fff4c8'].map((c) => hex(c)) as Color[],
  outline: hex('#4a2008'),
  line: hex('#7a3a0a'),
  soft: hex('#b8680e'),
  mouth: [hex('#3a1206'), hex('#6a2208'), hex('#a8401a')] as Color[],
  tooth: [hex('#fffaea'), hex('#e8cf96')] as Color[],
  arc: hex('#fffef0'),
  glow: hex('#ffe27a'),
  cool: hex('#c8f2ff'),
}))();

// The gallop the chakra fox runs with (the raiju pounces instead).
interface Gait {
  /** Leg angles in degrees from straight down (positive swings forward): upper and lower segments. */
  fN: [number, number];
  fF: [number, number];
  hN: [number, number];
  hF: [number, number];
  /** Body pitch (radians, nose up positive), bob (px) and how stretched the spine is (0..1). */
  pitch: number;
  bob: number;
  stretch: number;
}
// Rotary gallop: extended flight, front lands, front pushes, gathered flight, hind lands, hind pushes.
const GALLOP: Gait[] = [
  { fN: [58, 78], fF: [48, 66], hN: [-58, -74], hF: [-48, -62], pitch: 0.02, bob: -2, stretch: 1 },
  { fN: [24, 12], fF: [40, 52], hN: [-34, -48], hF: [-52, -70], pitch: -0.05, bob: 0, stretch: 0.8 },
  { fN: [-16, -30], fF: [6, -4], hN: [4, -26], hF: [-20, -40], pitch: -0.06, bob: 1, stretch: 0.55 },
  { fN: [-38, -112], fF: [-28, -100], hN: [44, 20], hF: [34, 8], pitch: 0.04, bob: 0, stretch: 0.2 },
  { fN: [14, 46], fF: [-6, -60], hN: [22, -10], hF: [36, 14], pitch: 0.08, bob: 1, stretch: 0.45 },
  { fN: [44, 66], fF: [26, 40], hN: [-24, -44], hF: [6, -22], pitch: 0.05, bob: -1, stretch: 0.75 },
];

/**
 * A jagged lightning line from a to b (midpoint displacement, bulging by `bulge` px to one side):
 * a white 1 px core with a cyan glow beside it.
 */
function lightningLine(c: Canvas, a: P2, b: P2, bulge: number, rough: number, seed: number, core: Color, glow: Color, skip?: (x: number, y: number) => boolean, glowA = 120): void {
  let pts: P2[] = [a, b];
  const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
  const nx = -dy / dl, ny = dx / dl;
  // Bow the line out first, then break it up.
  pts = [a, [(a[0] + b[0]) / 2 + nx * bulge, (a[1] + b[1]) / 2 + ny * bulge], b];
  for (let level = 0; level < 3; level++) {
    const next: P2[] = [pts[0]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const l = Math.hypot(x1 - x0, y1 - y0);
      const off = (rnd(seed, level * 31 + i, 1) - 0.5) * rough * l * 0.5;
      next.push([(x0 + x1) / 2 + (-(y1 - y0) / (l || 1)) * off, (y0 + y1) / 2 + ((x1 - x0) / (l || 1)) * off], pts[i + 1]);
    }
    pts = next;
  }
  const cells: P2[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let q = 0; q <= n; q++) cells.push([Math.round(x0 + ((x1 - x0) * q) / n), Math.round(y0 + ((y1 - y0) * q) / n)]);
  }
  for (const [x, y] of cells) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!(skip && skip(x + ox, y + oy)) && c.alpha(x + ox, y + oy) < glowA) c.plot(x + ox, y + oy, wa(glow, glowA));
  for (const [x, y] of cells) if (!(skip && skip(x, y))) c.set(x, y, core);
}

interface Pounce {
  /** Body pitch (radians, positive dips the nose), half the chest-to-hip distance, back arch (negative humps up). */
  pitch: number;
  span: number;
  arch: number;
  /** Head centre from the chest centre (body units, before pitch), tilt (radians, positive looks down), jaw (0..1). */
  head: P2;
  ha: number;
  jaw: number;
  /** Paw targets from the anchor (body units): front near/far, hind near/far. */
  fN: P2;
  fF: P2;
  hN: P2;
  hF: P2;
  /** 0 gathered .. 1 fully stretched (claws spread, tail streams, after-images). */
  reach: number;
}
// coil, spring, launch, stretch, strike, fold, tuck, gather
const POUNCE: Pounce[] = [
  { pitch: 0.12, span: 9, arch: -8, head: [18, -9], ha: 0.3, jaw: 0.35, fN: [15, 21], fF: [11, 21], hN: [0, 21], hF: [-4, 21], reach: 0 },
  { pitch: -0.2, span: 12, arch: -3, head: [19, -12], ha: -0.05, jaw: 0.55, fN: [31, 9], fF: [27, 12], hN: [-30, 19], hF: [-26, 21], reach: 0.3 },
  { pitch: -0.1, span: 15, arch: 0, head: [20, -11], ha: 0, jaw: 0.8, fN: [40, 7], fF: [35, 14], hN: [-44, 10], hF: [-38, 17], reach: 0.75 },
  { pitch: -0.02, span: 16, arch: 2, head: [21, -10], ha: 0.06, jaw: 1, fN: [42, 12], fF: [36, 19], hN: [-48, 5], hF: [-43, 13], reach: 1 },
  { pitch: 0.1, span: 15, arch: 1, head: [21, -8], ha: 0.18, jaw: 0.9, fN: [40, 16], fF: [34, 22], hN: [-46, -1], hF: [-42, 7], reach: 0.9 },
  { pitch: 0.1, span: 12, arch: -4, head: [19, -9], ha: 0.24, jaw: 0.6, fN: [27, 20], fF: [23, 21], hN: [-24, 11], hF: [-28, 9], reach: 0.4 },
  { pitch: 0.06, span: 10, arch: -8, head: [18, -10], ha: 0.28, jaw: 0.4, fN: [16, 19], fF: [12, 20], hN: [-6, 17], hF: [-10, 16], reach: 0.1 },
  { pitch: 0.1, span: 9, arch: -9, head: [18, -9], ha: 0.3, jaw: 0.35, fN: [14, 21], fF: [10, 21], hN: [-2, 20], hF: [-6, 20], reach: 0 },
];

/** The point `len` from s toward t, or t itself when it is closer. */
function reachTo(s: P2, t: P2, len: number): P2 {
  const dx = t[0] - s[0], dy = t[1] - s[1], d = Math.hypot(dx, dy);
  return d <= len ? t : [s[0] + (dx / d) * len, s[1] + (dy / d) * len];
}

/** The middle joint of a two-bone limb from a to b, bent to the clockwise side of a->b when `cw`. */
function knee(a: P2, b: P2, l1: number, l2: number, cw: boolean): P2 {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const dl = Math.hypot(dx, dy) || 1;
  const d = Math.min(dl, l1 + l2 - 0.01);
  const ux = dx / dl, uy = dy / dl;
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  // Screen y points down, so (-uy, ux) is a clockwise quarter turn.
  const px = cw ? -uy : uy, py = cw ? ux : -ux;
  return [a[0] + ux * along + px * h, a[1] + uy * along + py * h];
}

/**
 * A sharp-cornered band along a polyline (a lightning bolt): its edges are the spine offset by the
 * half-width with mitred corners, so every kink stays a crisp point. Surface coordinates come from
 * the nearest spine segment, so it shades like a blade with a bright ridge down the middle.
 */
function zig(spine: P2[], hw: (u: number) => number): Prim {
  const n = spine.length;
  const cum: number[] = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(spine[i][0] - spine[i - 1][0], spine[i][1] - spine[i - 1][1]));
  const total = cum[n - 1] || 1;
  const segN = (i: number): P2 => {
    const [ax, ay] = spine[i], [bx, by] = spine[i + 1];
    const l = Math.hypot(bx - ax, by - ay) || 1;
    return [-(by - ay) / l, (bx - ax) / l];
  };
  const left: P2[] = [], right: P2[] = [];
  for (let i = 0; i < n; i++) {
    const w = hw(cum[i] / total);
    let mx: number, my: number, k = 1;
    if (i === 0) [mx, my] = segN(0);
    else if (i === n - 1) [mx, my] = segN(n - 2);
    else {
      const a = segN(i - 1), b = segN(i);
      const sx = a[0] + b[0], sy = a[1] + b[1], sl = Math.hypot(sx, sy) || 1;
      mx = sx / sl;
      my = sy / sl;
      k = Math.min(2.4, 1 / Math.max(0.2, mx * a[0] + my * a[1]));
    }
    left.push([spine[i][0] + mx * w * k, spine[i][1] + my * w * k]);
    right.push([spine[i][0] - mx * w * k, spine[i][1] - my * w * k]);
  }
  const shape = poly([...left, ...right.reverse()]);
  return {
    box: shape.box,
    at(px, py) {
      if (!shape.at(px, py)) return null;
      let best = Infinity, bu = 0, bs = 0, bnx = 0, bny = 0;
      for (let i = 0; i + 1 < n; i++) {
        const [ax, ay] = spine[i], [bx, by] = spine[i + 1];
        const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-9;
        const t = clamp(((px - ax) * ex + (py - ay) * ey) / l2, 0, 1);
        const qx = ax + ex * t, qy = ay + ey * t, d = Math.hypot(px - qx, py - qy);
        if (d < best) {
          best = d;
          bu = (cum[i] + Math.sqrt(l2) * t) / total;
          const [nx, ny] = segN(i);
          bs = (px - qx) * nx + (py - qy) * ny;
          bnx = nx;
          bny = ny;
        }
      }
      const v = clamp(bs / Math.max(0.5, hw(bu)), -1, 1);
      const tx = bnx * v * 0.7, ty = bny * v * 0.7, nz = Math.sqrt(Math.max(0.05, 1 - (v * 0.7) ** 2));
      const l = Math.hypot(tx, ty, nz);
      return { x: px, y: py, nx: tx / l, ny: ty / l, nz: nz / l, z: hw(bu) * nz, u: bu, v, len: total, k: 0 };
    },
  };
}

/** A zigzag bolt from `root` along `ang` (degrees): a sharp band whose spine kinks left and right. */
function bolt(root: P2, ang: number, len: number, w: number, amp: number, kinks: number, seed: number, tipW = 0.3): Prim {
  const d = dirOf(ang), n: P2 = [-d[1], d[0]];
  const pts: P2[] = [root];
  for (let k = 1; k <= kinks; k++) {
    const u = (k - 0.2 + rnd(seed, k) * 0.4) / (kinks + 1);
    const off = (k % 2 ? 1 : -1) * amp * (0.75 + rnd(seed, k, 1) * 0.5);
    pts.push([root[0] + d[0] * len * u + n[0] * off, root[1] + d[1] * len * u + n[1] * off]);
  }
  pts.push([root[0] + d[0] * len, root[1] + d[1] * len]);
  return zig(pts, (u) => tipW + (w - tipW) * Math.pow(1 - u, 0.8));
}

/**
 * Several primitives fused into one smooth volume: the height toward the viewer is a smooth max of
 * theirs (blended over `k` px), so chest, waist, haunch and neck flow into each other without
 * creases, and the normal is the slope of that height field.
 */
function fused(prims: Prim[], k = 3, relief = 1.7): Prim {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of prims) {
    x0 = Math.min(x0, p.box[0]);
    y0 = Math.min(y0, p.box[1]);
    x1 = Math.max(x1, p.box[2]);
    y1 = Math.max(y1, p.box[3]);
  }
  const height = (px: number, py: number): [number, Hit | null] => {
    let h = 0, top: Hit | null = null;
    for (const p of prims) {
      if (px < p.box[0] || px > p.box[2] + 1 || py < p.box[1] || py > p.box[3] + 1) continue;
      const hh = p.at(px, py);
      if (!hh) continue;
      const z = Math.max(0, hh.z);
      if (!top) h = z;
      else {
        const d = Math.max(k - Math.abs(h - z), 0) / k;
        h = Math.max(h, z) + d * d * k * 0.25;
      }
      if (!top || hh.z > top.z) top = hh;
    }
    return [h, top];
  };
  return {
    box: [x0, y0, x1, y1],
    at(px, py) {
      const [h, top] = height(px, py);
      if (!top) return null;
      const e = 0.75;
      const gx = ((height(px + e, py)[0] - height(px - e, py)[0]) / (2 * e)) * relief;
      const gy = ((height(px, py + e)[0] - height(px, py - e)[0]) / (2 * e)) * relief;
      const l = Math.hypot(gx, gy, 1);
      return { ...top, x: px, y: py, nx: -gx / l, ny: -gy / l, nz: 1 / l, z: h };
    },
  };
}

function raiju(): WorldSprite {
  const W = 300, H = 200, cx = 150, cy = 100;
  const Z = 1.6; // the pose table is in body units; the beast is drawn 1.6x
  const frames: Canvas[] = [];
  POUNCE.forEach((g, fi) => {
    const t = fi / POUNCE.length;
    const f = new Frame(W, H);
    const style = { outline: RAI.outline, line: RAI.line, solid: 150 };
    const soft = { outline: RAI.outline, line: RAI.soft, solid: 150 };
    const bare = { outline: RAI.outline, line: null, solid: 150 };
    const cp = Math.cos(g.pitch), sp = Math.sin(g.pitch), pd = g.pitch / D2R;
    /** Body space (pitched about the anchor) to the canvas, and unpitched targets to the canvas. */
    const B = (x: number, y: number): P2 => [cx + (x * cp - y * sp) * Z, cy + (x * sp + y * cp) * Z];
    const A = (p: P2): P2 => [cx + p[0] * Z, cy + p[1] * Z];
    const C = B(g.span, 0), Hp = B(-g.span, 0);
    /** Soft golden fur: cream on top, warm gold, amber, brown-orange underneath; band edges notched like fur. */
    const fur = (seed: number, dk = 0, bias = 0, lo = 1) => (h: Hit): Color => {
      const L = 0.06 + 0.94 * lit(h, 0.3) - h.ny * 0.12;
      const comb = fract((h.x + h.y * 0.45) / 3.4 + noise(h.x, h.y, 5, seed) * 1.4) - 0.5;
      const v = L + bias + comb * 0.06 + (noise(h.x, h.y, 2.4, seed + 1) - 0.5) * 0.04;
      let s = 0;
      for (const c of [0.14, 0.25, 0.36, 0.48, 0.6, 0.73, 0.87]) if (v >= c) s++;
      return RAI.ramp[clamp(s - dk, lo, 7)];
    };
    /** A fur tuft: shaded like the coat it grows from, a little brighter toward the tip. */
    const tuft = (seed: number, dk = 0, bias = 0) => (h: Hit): Color => fur(seed, dk, bias + (h.u - 0.4) * 0.16)(h);
    const tufts = (defs: [P2, number, number, number][], tip = 2): Prim[] =>
      defs.map(([r, a, l, w], j) => {
        const d = dirOf(a + pd + Math.sin(TAU * t + j * 1.7) * 4);
        return lens(r, [r[0] + d[0] * l * Z, r[1] + d[1] * l * Z], w * Z, { tip, peak: 0.25, base: 0.5, bend: (j % 2 ? 0.5 : -0.5) * Z });
      });
    type Tuft = [P2, number, number, number];
    /** Bolt (the tail): a white-hot spine, pale yellow, gold edges. */
    const boltShade = (h: Hit): Color => RAI.ramp[clamp(Math.round(4 + (1 - Math.abs(h.v)) * 3.4 + (lit(h, 0.3) - 0.5) * 1.2 - 0.2), 4, 7)];
    // --- legs: slim and long, a small paw and three claws -----------------------------------
    const frontLeg = (target: P2, far: boolean) => {
      const S = B(g.span + (far ? 1 : 3), 5);
      const P = reachTo(S, A(target), 24.5 * Z);
      const E = knee(S, P, 12.5 * Z, 12.5 * Z, true);
      const ang = Math.atan2(P[1] - E[1], P[0] - E[0]);
      const pa = ang * 0.55;
      const pc: P2 = [P[0] + Math.cos(pa) * 1.1 * Z, P[1] + Math.sin(pa) * 1.1 * Z];
      return { prim: fused([lens(S, E, (far ? 3.4 : 3.8) * Z, { peak: 0.25, tip: 0.55, base: 1 }), tube([E, P], (u) => lerp(2, 1.55, u) * Z), blob(pc[0], pc[1], 2.5 * Z, 1.7 * Z, pa)], 1.5 * Z), P: pc, E, pa };
    };
    const hindLeg = (target: P2, far: boolean) => {
      const Hj = B(-g.span - 1, 4);
      const P = reachTo(Hj, A(target), 31 * Z);
      const toHip = Math.atan2(Hj[1] - P[1], Hj[0] - P[0]) - 0.55;
      const K: P2 = [P[0] + Math.cos(toHip) * 9 * Z, P[1] + Math.sin(toHip) * 9 * Z];
      const N = knee(Hj, K, 12 * Z, 12 * Z, false);
      const ang = Math.atan2(P[1] - K[1], P[0] - K[0]);
      const pa = ang * 0.8;
      const pc: P2 = [P[0] + Math.cos(pa) * 1.1 * Z, P[1] + Math.sin(pa) * 1.1 * Z];
      return { prim: fused([lens(Hj, N, (far ? 5 : 5.6) * Z, { peak: 0.3, tip: 0.5, base: 1 }), tube([N, K], (u) => lerp(2.4, 1.7, u) * Z), tube([K, P], () => 1.5 * Z), blob(pc[0], pc[1], 2.4 * Z, 1.7 * Z, pa)], 1.5 * Z), P: pc, E: N, pa };
    };
    const claws = (P: P2, pa: number): Prim[] => {
      const spread = 0.3 + g.reach * 0.25;
      return [-1, 0, 1].map((k) => {
        const r: P2 = [P[0] + Math.cos(pa) * 2 * Z, P[1] + Math.sin(pa) * 2 * Z];
        const a = pa + 0.55 + k * spread;
        const l = (1.8 + g.reach * 1) * Z;
        return lens(r, [r[0] + Math.cos(a) * l, r[1] + Math.sin(a) * l], 0.6 * Z, { tip: 1.2, peak: 0.2, base: 1, bend: 0.4 * Z });
      });
    };
    const clawShade = (h: Hit): Color => (h.u > 0.4 ? RAI.tooth[0] : RAI.tooth[1]);
    // --- tail: a lightning bolt, zig-zag-zig, forked at the end ------------------------------
    const tRoot = B(-g.span - 7, -4);
    const tAng = lerp(-148, -172, g.reach) + pd + Math.sin(TAU * t) * 5;
    const td = dirOf(tAng), tn: P2 = [-td[1], td[0]];
    const TL = (a: number, c: number): P2 => [tRoot[0] + (td[0] * a + tn[0] * c) * Z, tRoot[1] + (td[1] * a + tn[1] * c) * Z];
    const tPts = [TL(0, 0), TL(10, -3.5), TL(8.5, 3), TL(19, 0), TL(17.5, 5), TL(25, 2.5)];
    const tTip = tPts[tPts.length - 1];
    const tailPrims: Prim[] = [zig(tPts, (u) => lerp(2.6, 1.4, u) * Z)];
    for (const [da, len] of [[-30, 9], [26, 7]] as P2[]) tailPrims.push(bolt(tTip, tAng + da, len * Z, 1.3 * Z, 1.4 * Z, 1, 930 + fi * 3 + da));
    f.part_(tailPrims, boltShade, style);
    f.part_(tufts([[B(-g.span - 6, -5), 196, 6, 2], [B(-g.span - 7, -3), 172, 6.5, 2]]), tuft(29, 0, -0.04), bare);
    // --- far legs, a step darker behind --------------------------------------------------------
    const hF = hindLeg(g.hF, true), fF = frontLeg(g.fF, true);
    f.part_([hF.prim], fur(11, 2, -0.02, 0), style);
    f.part_(claws(hF.P, hF.pa), clawShade, style);
    f.part_([fF.prim], fur(13, 2, -0.02, 0), style);
    f.part_(claws(fF.P, fF.pa), clawShade, style);
    // --- body: deep chest, tucked waist, haunch and neck in one smooth volume ------------------
    const Hd = B(g.span + g.head[0], g.head[1]);
    const hA = g.ha + g.pitch, HS = 1.0 * Z;
    const ca = Math.cos(hA), sa = Math.sin(hA);
    const HZ = (x: number, y: number): P2 => [Hd[0] + (x * ca - y * sa) * HS, Hd[1] + (x * sa + y * ca) * HS];
    const bodyId = f.part_([fused([
      blob(C[0] + 0.5 * Z, C[1] + 1 * Z, 11 * Z, 12 * Z, g.pitch - 0.25),
      tube([B(g.span - 2, -2.5), B(0, g.arch * 0.5 - 3.5), B(-g.span + 2, -2)], (u) => lerp(7.5, 5.6, Math.sin(u * Math.PI)) * Z),
      blob(Hp[0], Hp[1] - 0.5 * Z, 9.5 * Z, 9 * Z, g.pitch + 0.1),
      tube([B(g.span + 4, -5), HZ(-3, 1.5)], (u) => lerp(6.5, 4.8, u) * Z),
    ], 4 * Z)], fur(23), style);
    // Fur fringes: the back, the belly, the back of the haunch (no inner lines: they are the coat).
    const backAt = (u: number, dy = 0): P2 => B(lerp(g.span - 1, -g.span - 6, u), lerp(-10.5, -9, u) + g.arch * Math.sin(u * Math.PI) * 0.6 + dy);
    f.part_(tufts([0.3, 0.45, 0.6, 0.75, 0.9].map((u, j): Tuft => [backAt(u, 1.2), -174 + j, 5.5 + (j % 2), 1.4])), tuft(31, 0, 0.02), bare);
    f.part_(tufts([0.15, 0.32, 0.5, 0.68].map((u, j): Tuft => [B(lerp(g.span + 2, -g.span + 4, u), lerp(10, 2.5, u) + g.arch * 0.25 * Math.sin(u * Math.PI)), 158 + j * 4, 5.5 + (j % 2), 1.4])), tuft(33, 0, -0.04), bare);
    f.part_(tufts([[B(-g.span - 8, 2), 176, 5.5, 1.6], [B(-g.span - 6, 6), 160, 5, 1.4]]), tuft(35, 0, -0.04), bare);
    // --- ruff: pointed fur tufts over the neck and shoulders, in two layers ---------------------
    const neckTop = (u: number): P2 => {
      const a = HZ(-6, -3.5), b = B(g.span - 4, -9.5);
      return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 1.5 * Z];
    };
    const neckSide = (u: number): P2 => {
      const a = HZ(-5, 1), b = B(g.span + 1, -3);
      return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
    };
    f.part_(tufts([0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1].map((u, j): Tuft => [neckTop(u), -146 - u * 28, 10 - u * 2.5 + (j % 2) * 1.8, 2])), tuft(41, 1, 0.04), soft);
    f.part_(tufts([0.05, 0.25, 0.45, 0.65, 0.85].map((u, j): Tuft => [neckSide(u), -168 + u * 8, 9 - u * 2 + (j % 2) * 1.5, 2])), tuft(43, 0, 0.02), soft);
    f.part_(tufts([[B(g.span + 7, 1), 150, 8.5, 2.4], [B(g.span + 6, 5), 138, 8, 2.3], [B(g.span + 4, 9), 126, 6.5, 2]]), tuft(45, 0, -0.02), soft);
    // --- head: a wolf in profile, ears up, snarling ---------------------------------------------
    f.part_([fused([lens(HZ(0.5, -4.5), HZ(-1.5, -15), 2.8 * HS, { peak: 0.3, tip: 1.5, bend: -0.8 })])], fur(47, 2), style);
    const jawEnd = HZ(14.5, 3.5 + 7 * g.jaw);
    f.part_([lens(HZ(0, 3.5), jawEnd, 2.2 * HS, { peak: 0.25, tip: 0.8, base: 1 })], fur(49, 0, -0.1), style);
    const jy = (x: number): P2 => {
      const a = HZ(0, 3.5), u = x / 14.5;
      return [lerp(a[0], jawEnd[0], u), lerp(a[1], jawEnd[1], u) - 1.6 * HS];
    };
    f.part_([poly([HZ(1.5, 1.5), HZ(16, 2), jy(14.5), jy(6), HZ(2, 4.5)])], (h) => (h.v > 0.45 ? RAI.mouth[2] : h.v > -0.2 ? RAI.mouth[0] : RAI.mouth[1]), { outline: null, line: null });
    const up = (x: number, w: number, l: number): Prim => poly([HZ(x - w / 2, 2), HZ(x + w / 2, 2), HZ(x + 0.15, 2 + l)]);
    const dn = (x: number, w: number, l: number): Prim => {
      const p = jy(x);
      return poly([[p[0] - ((ca * w) / 2) * HS, p[1] - ((sa * w) / 2) * HS], [p[0] + ((ca * w) / 2) * HS, p[1] + ((sa * w) / 2) * HS], [p[0] + sa * l * HS, p[1] - ca * l * HS]]);
    };
    f.part_([up(13, 1.6, 4.6), up(15, 0.9, 2), up(10, 1.1, 2.4), up(7.5, 1, 2), dn(11.5, 1.5, 3.4), dn(13.6, 0.9, 1.6), dn(8, 1, 1.8)], (h) => RAI.tooth[h.v > 0.3 ? 1 : 0], { outline: RAI.outline, line: null });
    f.part_([fused([
      blob(Hd[0], Hd[1], 7.2 * HS, 6.2 * HS, hA),
      tube([HZ(2, -1.2), HZ(16.3, 0.6)], (u) => lerp(4.2, 2.5, u) * HS),
      blob(...HZ(1.5, 2.8), 5.2 * HS, 3.6 * HS, hA + 0.15),
      blob(...HZ(4, -3.4), 4.6 * HS, 2.1 * HS, hA + 0.3),
    ], 2.5 * Z)], fur(51, 0, 0.02), style);
    f.part_([fused([lens(HZ(-2.5, -4.6), HZ(-5, -15.5), 3.2 * HS, { peak: 0.3, tip: 1.5, bend: -1 })])], fur(53, 0, 0.04), style);
    f.part_([lens(HZ(-2.9, -6.4), HZ(-4.8, -13.5), 1.4 * HS, { peak: 0.35, tip: 1.3, bend: -0.6 })], (h) => RAI.ramp[h.v < 0 ? 2 : 1], { outline: null, line: null });
    f.part_(tufts([[HZ(-3, 3), 172 + (hA / D2R) * 0.5, 8, 2], [HZ(-2, 5.5), 150, 7.5, 1.9], [HZ(0, 7.2), 128, 6, 1.6]]), tuft(55, 0, -0.02), soft);
    // --- near legs in front ------------------------------------------------------------------
    const hN = hindLeg(g.hN, false), fN = frontLeg(g.fN, false);
    f.part_([hN.prim], fur(37, 0, 0.03), soft);
    f.part_(claws(hN.P, hN.pa), clawShade, style);
    f.part_([fN.prim], fur(39, 0, 0.03), soft);
    f.part_(claws(fN.P, fN.pa), clawShade, style);
    const fc = f.finish();
    // Snarl wrinkles on the muzzle, the nose, and a glowing white eye in a dark rim.
    for (const x of [8.2, 10.2, 12.2]) {
      for (const [ox, oy] of [[0, -3], [0.6, -2.1]] as P2[]) {
        const [X, Y] = HZ(x + ox, oy).map(Math.round);
        if (fc.alpha(X, Y) > 200) fc.set(X, Y, RAI.line);
      }
    }
    const [nX, nY] = HZ(16.6, -0.4).map(Math.round);
    for (const [dx, dy] of [[0, 0], [-1, 0], [0, 1], [-1, 1], [1, 0], [1, 1]]) fc.set(nX + dx, nY + dy, RAI.outline);
    fc.set(nX - 1, nY, RAI.mouth[1]);
    const [ex, ey] = HZ(4.6, -1.5).map(Math.round);
    // Rows from the brow down; slanted down toward the nose. 0 skip, 1 rim, 2 pale glow, 3 white.
    const EYE = ['0111110', '1233321', '0123332', '0011111'];
    const eyeCol: Record<string, Color> = { '1': RAI.outline, '2': RAI.glow, '3': RAI.arc };
    EYE.forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch !== '0' && fc.alpha(ex - 3 + dx, ey - 2 + dy) > 200) fc.set(ex - 3 + dx, ey - 2 + dy, eyeCol[ch]);
    }));
    // Lightning veins: thin white-hot cracks over the coat, anchored to the body, re-struck every frame.
    const coat = new Set(RAI.ramp.slice(1).map((c) => toHex(c)));
    const onCoat = (x: number, y: number): boolean => fc.alpha(x, y) >= 250 && coat.has(toHex(fc.get(x, y)));
    const VEINS: P2[] = [[g.span + 4, -4], [g.span + 3, 6], [0, -2], [-g.span, -3], [-g.span + 2, 5]];
    const core: P2[] = [];
    const walk = (p: P2, ang: number, steps: number, seed: number, depth: number): void => {
      let [x, y] = p;
      for (let s = 0; s < steps; s++) {
        ang += (rnd(seed, s) - 0.5) * 1.1;
        const len = (2 + rnd(seed, s, 1) * 1.5) * Z;
        const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
        const n = Math.ceil(Math.max(Math.abs(nx - x), Math.abs(ny - y)));
        for (let q = 1; q <= n; q++) core.push([Math.round(x + ((nx - x) * q) / n), Math.round(y + ((ny - y) * q) / n)]);
        x = nx;
        y = ny;
        if (depth === 0 && s === 2 && rnd(seed, 99) < 0.7) walk([x, y], ang + (rnd(seed, 98) < 0.5 ? 0.8 : -0.8), 2, seed + 17, 1);
      }
    };
    VEINS.forEach(([vx, vy], k) => {
      const seed = 2100 + fi * 37 + k * 5;
      const p = B(vx + (rnd(seed, 1) - 0.5) * 3, vy + (rnd(seed, 2) - 0.5) * 3);
      walk(p, g.pitch + (rnd(seed, 3) - 0.5) * 1.2 + (rnd(seed, 4) < 0.5 ? 0 : Math.PI), 5 + Math.floor(rnd(seed, 5) * 2), seed, 0);
    });
    // And down the near upper legs, from the shoulder and the hip.
    for (const [k, [a, b]] of ([[B(g.span + 3, 5), fN.E], [B(-g.span - 1, 4), hN.E]] as [P2, P2][]).entries()) {
      const seed = 2300 + fi * 41 + k * 7;
      walk([lerp(a[0], b[0], 0.2), lerp(a[1], b[1], 0.2)], Math.atan2(b[1] - a[1], b[0] - a[0]), 2, seed, 1);
    }
    const coreSet = new Set(core.filter(([x, y]) => onCoat(x, y)).map(([x, y]) => y * W + x));
    for (const key of coreSet) {
      const x = key % W, y = Math.floor(key / W);
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + ox, Y = y + oy;
        if (coreSet.has(Y * W + X) || !onCoat(X, Y)) continue;
        const idx = RAI.ramp.findIndex((c) => toHex(c) === toHex(fc.get(X, Y)));
        if (idx < 6) fc.set(X, Y, RAI.ramp[6]);
      }
    }
    for (const key of coreSet) fc.set(key % W, Math.floor(key / W), RAI.arc);
    // Pale speed streaks trailing behind in the stretch.
    if (g.reach > 0.5) {
      const snap = fc.clone();
      const k = (g.reach - 0.4) / 0.6;
      for (let y = 0; y < H; y++) {
        if (noise(3, y, 2.2, 1500 + fi) < 0.45) continue;
        for (let x = 1; x < W; x++) {
          if (snap.alpha(x, y) < 220 || snap.alpha(x - 1, y) >= 120) continue;
          const len = Math.round((6 + rnd(1600 + fi, y, x) * 16) * k);
          for (let q = 1; q <= len; q++) {
            if (snap.alpha(x - q, y) >= 120) break;
            fc.plot(x - q, y, wa(RAI.ramp[7], 150 * (1 - q / (len + 1))));
          }
        }
      }
    }
    // Small arcs jumping above the back.
    const solidAt = (x: number, y: number): boolean => fc.alpha(x, y) >= 220;
    const top: P2[] = [];
    for (let x = Math.round(Hp[0] - 6 * Z); x <= Math.round(C[0] + 4 * Z); x++)
      for (let y = 1; y < H - 1; y++)
        if (solidAt(x, y)) {
          top.push([x, y]);
          break;
        }
    for (let a = 0; a < 2 && top.length > 12; a++) {
      const i0 = Math.floor(rnd(500 + fi, a) * (top.length - 12));
      const i1 = Math.min(top.length - 1, i0 + 8 + Math.floor(rnd(510 + fi, a) * 8));
      lightningLine(fc, top[i0], top[i1], -(3 + rnd(520 + fi, a) * 3), 0.9, 800 + fi * 10 + a, RAI.arc, RAI.glow, solidAt, 170);
    }
    // Sparks spitting around the feet, a few drifting off the body; one or two cool ones.
    const paws = [fN.P, hN.P, fF.P, hF.P];
    for (let k = 0; k < 14; k++) {
      const src = paws[k % 4];
      const ang = rnd(1900 + fi, k) * TAU, r = (2.5 + rnd(1910 + fi, k) * 5) * Z * 0.8;
      const X = Math.round(src[0] + Math.cos(ang) * r - 2), Y = Math.round(src[1] + Math.sin(ang) * r * 0.7);
      if (fc.alpha(X, Y)) continue;
      fc.set(X, Y, k === 5 && fi % 2 === 0 ? RAI.cool : k % 3 ? RAI.arc : RAI.glow);
      if (k % 4 === 0 && !fc.alpha(X - 1, Y)) fc.plot(X - 1, Y, wa(RAI.glow, 160));
    }
    for (let k = 0; k < 8; k++) {
      const p = fract(k / 8 + t);
      const ang = rnd(911, k) * TAU, rr = 0.6 + rnd(912, k) * 0.4;
      const X = Math.round(cx + Math.cos(ang) * 62 * rr - p * 20), Y = Math.round(cy + Math.sin(ang) * 34 * rr);
      if (fc.alpha(X, Y)) continue;
      fc.set(X, Y, p < 0.5 ? RAI.arc : RAI.glow);
    }
    frames.push(fc);
  });
  return flySprite('lightning', 'Raiju (lightning)', [3, 1.6], frames, cx, cy);
}

// =============================================================================================
// STONE DRAGON (earth)
// =============================================================================================
//
// A dragon of living rock, heavier and slower than the water dragon: the body is a chain of armour
// plates, each cut into flat facets (lit facets carry a crest, the plates part on dark seams),
// moss creeping over the tops, a row of stone spikes along the spine. The head is blocky and
// faceted, with thick swept horns, a jaw of stone teeth and eyes glowing like embers in a cave.
// Pebbles shake loose and fall as it moves.

const STONE = (() => {
  const st = ramp(blend(MATERIALS.stone, MATERIALS.stoneWarm, 0.45), { shift: 10 });
  return {
    ramp: st,
    dark: ramp(blend(MATERIALS.stone, MATERIALS.bark, 0.4), { shift: 10 }),
    moss: ramp(MATERIALS.moss, { shift: 14 }),
    mossLight: ramp(blend(MATERIALS.moss, MATERIALS.leafLight, 0.5), { shift: 14 }),
    outline: hex('#1c1712'),
    line: hex('#2e2722'),
    glow: [hex('#7a3a10'), hex('#c8641c'), hex('#f0a030'), hex('#ffd86a'), hex('#fff6c8')] as Color[],
  };
})();

/** Flat facets: the normal snapped to one of a few directions per plate, so rock reads as cut planes. */
function facet(h: Hit, plate: number, seed: number): [number, number, number] {
  const az = Math.atan2(h.ny, h.nx);
  const el = Math.acos(clamp(h.nz, -1, 1));
  const ai = Math.round(az / (Math.PI / 3)), ei = Math.round(el / 0.5);
  const jz = (rnd(seed, plate, ai * 7 + ei) - 0.5) * 0.55, ja = (rnd(seed + 1, plate, ai * 7 + ei) - 0.5) * 0.6;
  const A = ai * (Math.PI / 3) + ja, E = clamp(ei * 0.5 + jz, 0, 1.45);
  return [Math.cos(A) * Math.sin(E), Math.sin(A) * Math.sin(E), Math.cos(E)];
}

/** Light for a facet normal (same light as everywhere else). */
const litN = (n: [number, number, number], wrap = 0.35): number => clamp((n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2] + wrap) / (1 + wrap), 0, 1);

function earthSpine(t: number, cx: number, cy: number): P2[] {
  const pts: P2[] = [];
  const N = 50;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = cx + 22 - s * 100;
    const amp = lerp(2, 13, smooth(0, 0.4, s)) * lerp(1, 0.8, smooth(0.8, 1, s));
    const y = cy + 6 + amp * Math.sin(TAU * (s * 0.95 - t) + 1.1) - 7 * (1 - smooth(0, 0.3, s));
    pts.push([x, y]);
  }
  return pts;
}

function stoneDragon(): WorldSprite {
  const W = 190, H = 130, cx = 100, cy = 64;
  const frames: Canvas[] = [];
  const NF = 8;
  for (let fi = 0; fi < NF; fi++) {
    const t = fi / NF;
    const f = new Frame(W, H);
    const spine = earthSpine(t, cx, cy);
    const neck = spine[0];
    const PL = 8.5; // plate length along the body (px)
    const hwBase = (u: number): number => (u < 0.1 ? lerp(10, 12.5, u / 0.1) : u < 0.42 ? 12.5 : lerp(12.5, 2.2, ((u - 0.42) / 0.58) ** 1.05));
    // Plates overlap like armour: each is a little fuller at its front edge.
    const totalLen = (() => {
      let L = 0;
      for (let i = 1; i < spine.length; i++) L += Math.hypot(spine[i][0] - spine[i - 1][0], spine[i][1] - spine[i - 1][1]);
      return L;
    })();
    const hw = (u: number): number => hwBase(u) * (1 + 0.07 * (1 - fract((u * totalLen) / PL)));
    const style = { outline: STONE.outline, line: STONE.line, solid: 150 };
    const bob = Math.sin(TAU * t) * 1;
    const S = 1.5;
    const hx = neck[0] - 2, hy = neck[1] - 6 + bob;
    const ang = -0.04 + Math.sin(TAU * t + 0.8) * 0.03;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const H2 = (x: number, y: number): P2 => [hx + (x * ca - y * sa) * S, hy + (x * sa + y * ca) * S];

    /** Faceted stone: staggered armour plates, crests on lit facet edges, moss on top. */
    const rock = (o: { seed: number; plates?: boolean; moss?: number; far?: number }) => (h: Hit): Color => {
      const along = h.u * h.len;
      // Two rows of plates, staggered like brickwork (upper row above the body's midline).
      const row = h.v < -0.05 ? 0 : 1;
      const pAlong = along + (row ? PL * 0.5 : 0);
      const plate = o.plates ? Math.floor(pAlong / PL) * 2 + row : Math.floor(h.x / 6) + Math.floor(h.y / 6) * 31;
      const n = facet(h, plate, o.seed);
      const L = litN(n);
      let s = stepOf(L, h.x, h.y, [0.28, 0.5, 0.74, 0.9], 0.04, o.seed, 2.4) - (o.far ?? 0);
      if (o.plates) {
        const pu = fract(pAlong / PL);
        const rowSeam = Math.abs(h.v + 0.05) < 0.09;
        if (pu < 0.11 || rowSeam) {
          // Seams: dark, and a few deep ones glow like embers in the lower row.
          if (!rowSeam && row && rnd(o.seed + 13, plate) < 0.3) return STONE.glow[pu < 0.05 ? 2 : 1];
          return STONE.dark[1];
        }
        if ((pu < 0.24 || (row && h.v < 0.18)) && L > 0.5) s = Math.min(5, s + 1); // lit lip beside a seam
        if (rnd(o.seed + 7, plate) < 0.25 && Math.abs(pu - 0.55 - h.v * 0.3) < 0.05) return STONE.dark[1];
      }
      // Moss on upward-facing stone, in patches.
      if ((o.moss ?? 0) > 0 && h.ny < -0.2) {
        const m = noise(h.x * 0.7, h.y * 0.9, 3.2, o.seed + 9) * 0.7 + noise(along * 0.2, h.v, 5, o.seed + 19) * 0.3;
        if (m > 1 - (o.moss ?? 0)) {
          const ms = stepOf(L + (m - 0.5) * 0.4, h.x, h.y, [0.3, 0.5, 0.72, 0.9], 0.06, o.seed + 11);
          return (ms >= 4 ? STONE.mossLight : STONE.moss)[clamp(ms, 1, 4)];
        }
      }
      return STONE.ramp[clamp(s, 1, 5)];
    };

    // --- far horn ----------------------------------------------------------------------------
    f.part_([lens(H2(4, -8), H2(-16, -21), 3.4 * S, { bend: -4, tip: 1.3, peak: 0.2, base: 0.9 })], rock({ seed: 3, far: 1 }), style);
    // --- spikes along the spine ----------------------------------------------------------------
    const spikes: Prim[] = [];
    for (let j = 0; j < 9; j++) {
      const u = 0.07 + j * 0.088;
      const i = Math.round(u * (spine.length - 1));
      const [px, py] = spine[i];
      const [qx, qy] = spine[Math.min(spine.length - 1, i + 1)];
      const dx = qx - px, dy = qy - py, dl = Math.hypot(dx, dy) || 1;
      const ux2 = -dy / dl, uy2 = dx / dl;
      const w = hwBase(u);
      const len = lerp(12, 5, u);
      const root: P2 = [px + ux2 * w * 0.7, py + uy2 * w * 0.7];
      const tip: P2 = [root[0] + ux2 * len + (dx / dl) * len * 0.45, root[1] + uy2 * len + (dy / dl) * len * 0.45];
      spikes.push(lens(root, tip, lerp(4.4, 2.2, u), { tip: 0.9, peak: 0.15, base: 1, curve: 0.9 }));
    }
    f.part_(spikes, rock({ seed: 5 }), style);
    // --- body ----------------------------------------------------------------------------------
    f.part_([tube(spine, hw)], rock({ seed: 21, plates: true, moss: 0.36 }), style);
    // --- head ----------------------------------------------------------------------------------
    f.part_([lens(H2(-2, 5), H2(24, 10), 4.2 * S, { bend: 0.6, peak: 0.25, tip: 0.6, base: 0.9, curve: 0.8 })], rock({ seed: 31 }), style);
    f.part_([poly([H2(1, 2), H2(23, 3), H2(22, 8), H2(4, 7)])], () => STONE.glow[0], { outline: null, line: null });
    f.part_([poly([H2(19, 8), H2(21, 8), H2(20, 4)]), poly([H2(13, 7.6), H2(15, 7.4), H2(14, 4)]), poly([H2(7, 7), H2(9, 7), H2(8, 4.5)])], (h) => STONE.ramp[h.v < 0 ? 5 : 4], { outline: STONE.outline, line: null });
    const skull = [
      blob(...H2(5, -1), 9.5 * S, 7.5 * S, ang),
      lens(H2(2, -2), H2(28, 1), 5.6 * S, { peak: 0.35, tip: 0.5, base: 0.95, curve: 0.8 }),
      blob(...H2(10, -6.5), 6 * S, 2.8 * S, ang - 0.12),
      blob(...H2(25, -1.5), 3.6 * S, 3 * S),
    ];
    f.part_(skull, rock({ seed: 41, moss: 0.3 }), style);
    f.part_([poly([H2(20, 2.6), H2(22.4, 2.6), H2(21.3, 6.8)]), poly([H2(15, 2.8), H2(17, 2.8), H2(16, 6.4)]), poly([H2(9.5, 3), H2(11.4, 3), H2(10.4, 5.8)])], (h) => STONE.ramp[h.v < 0 ? 5 : 4], { outline: STONE.outline, line: null });
    // Near horns: a thick main horn swept back and curling up, a shorter one below it, a row of
    // spikes along the brow, and a cheek spur.
    f.part_([
      lens(H2(5, -7), H2(-17, -18), 3.4 * S, { bend: -4.5, tip: 1.3, peak: 0.2, base: 0.9 }),
      lens(H2(1, -4), H2(-14, -7), 2.2 * S, { bend: -2, tip: 1.4, peak: 0.2, base: 0.9 }),
      lens(H2(-2, 1), H2(-11, 6), 2 * S, { tip: 1.5, peak: 0.25 }),
      lens(H2(12, -7), H2(8, -12), 1.5 * S, { tip: 1.4, peak: 0.2 }),
      lens(H2(17, -5.5), H2(14, -10), 1.3 * S, { tip: 1.4, peak: 0.2 }),
    ], rock({ seed: 51 }), style);
    const fc = f.finish();
    // Eyes: embers glowing under the brow, with a soft glow around.
    const glowEye = (ex: number, ey: number): void => {
      for (const [dx, dy] of [[-2, 0], [4, 0], [-1, -1], [0, -2], [1, -2], [2, -2], [3, -1], [-1, 1], [0, 2], [1, 2], [2, 2], [3, 1]]) fc.plot(ex + dx, ey + dy, wa(STONE.glow[2], 110));
      for (const [dx, dy, c] of [[0, -1, STONE.glow[2]], [1, -1, STONE.glow[3]], [2, -1, STONE.glow[2]], [-1, 0, STONE.glow[2]], [0, 0, STONE.glow[4]], [1, 0, STONE.glow[4]], [2, 0, STONE.glow[3]], [3, 0, STONE.glow[1]], [0, 1, STONE.glow[1]], [1, 1, STONE.glow[2]], [2, 1, STONE.glow[1]]] as [number, number, Color][]) fc.set(ex + dx, ey + dy, c);
    };
    const [ex, ey] = H2(11, -3).map(Math.round);
    glowEye(ex, ey);
    const [nx2, ny2] = H2(25.5, -2.5).map(Math.round);
    fc.set(nx2, ny2, STONE.glow[1]);
    fc.set(nx2 + 1, ny2, STONE.outline);
    // Pebbles shaking loose and falling, tumbling as they go: little outlined stones.
    for (let k = 0; k < 11; k++) {
      const p = fract(k / 11 + t);
      const src = spine[Math.round(lerp(0.1, 0.95, rnd(71, k)) * (spine.length - 1))];
      const x = src[0] - p * 10 - rnd(72, k) * 4, y = src[1] + 9 + p * p * 40;
      if (y > H - 4) continue;
      const big = k % 3 !== 1;
      const X = Math.round(x), Y = Math.round(y);
      const rot = Math.floor(p * 5 + k) % 3;
      const shapes: [number, number, number][][] = big
        ? [
            [[0, 0, 4], [1, 0, 3], [-1, 1, 3], [0, 1, 2], [1, 1, 2], [0, 2, 1]],
            [[0, 0, 4], [1, 0, 4], [0, 1, 3], [1, 1, 2], [2, 1, 2], [1, 2, 1]],
            [[1, 0, 4], [0, 1, 4], [1, 1, 3], [2, 1, 2], [0, 2, 2], [1, 2, 1]],
          ]
        : [
            [[0, 0, 4], [1, 0, 2], [0, 1, 2]],
            [[0, 0, 3], [1, 0, 4], [1, 1, 2]],
            [[0, 0, 4], [0, 1, 2], [1, 1, 2]],
          ];
      const sh = shapes[rot];
      const cells = new Set(sh.map(([dx, dy]) => `${dx},${dy}`));
      for (const [dx, dy] of sh)
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
          if (!cells.has(`${dx + ox},${dy + oy}`) && !fc.alpha(X + dx + ox, Y + dy + oy)) fc.set(X + dx + ox, Y + dy + oy, STONE.outline);
      for (const [dx, dy, st] of sh) fc.set(X + dx, Y + dy, STONE.ramp[st]);
    }
    frames.push(fc);
  }
  return flySprite('earth', 'Stone dragon (earth)', [2.8, 1.9], frames, cx, cy);
}

// =============================================================================================
// ILLUSION CROW (genjutsu)
// =============================================================================================
//
// One great crow, heavy in the chest with a thick neck, a big head and a heavy beak, beating broad
// wings whose primaries spread like fingers. Purple-black with a violet sheen on the lit crests and
// a glowing red illusion eye. It is not quite real: the trailing edges of the wings and tail come
// apart into drifting petals and wisps of violet smoke.

const GEN = (() => ({
  ramp: [hex('#0d0816'), hex('#22163a'), hex('#33224f'), hex('#47316a'), hex('#7454a8'), hex('#b49ae0')] as Color[],
  beak: [hex('#0a0810'), hex('#1a1622'), hex('#2a2534'), hex('#3c3648'), hex('#5c5470'), hex('#8c86a0')] as Color[],
  outline: hex('#0b0614'),
  line: hex('#1a1030'),
  petal: [hex('#6a2a6a'), hex('#a8509c'), hex('#d888c8'), hex('#f4c4e6')] as Color[],
  smoke: hex('#6a4a90'),
  eye: [hex('#5a0818'), hex('#c81838'), hex('#ff5a6a'), hex('#ffd0d4')] as Color[],
}))();

// up, coming down, level, down, rising (folded), rising
const CROW_FLAP: (CraneWing & { bob: number })[] = [
  { arm: -100, hand: -112, spread: 1, bob: 1 },
  { arm: -146, hand: -156, spread: 1, bob: 0 },
  { arm: 176, hand: 164, spread: 1, bob: -1 },
  { arm: 138, hand: 124, spread: 0.95, bob: -2 },
  { arm: -168, hand: -178, spread: 0.7, bob: -1 },
  { arm: -124, hand: -136, spread: 0.85, bob: 0 },
];

/** Crow feathers: dark vanes, a violet sheen on the lit crest, the trailing tips coming apart. */
function crowFeather(t: number, o: { far?: boolean; seed: number; dissolve?: number }) {
  return (h: Hit): Color | null => {
    const L = lit(h) - (o.far ? 0.1 : 0);
    // Coming apart: past `dissolve` along the feather, holes open that grow toward the tip.
    if (o.dissolve !== undefined && h.u > o.dissolve) {
      const k = (h.u - o.dissolve) / (1 - o.dissolve);
      if (noise(h.x * 1.1 - t * 10, h.y * 1.1, 1.6, o.seed + 3) < k * 0.75) return null;
    }
    const vane = noise(h.u * h.len * 0.3, h.v * 3, 1.5, o.seed);
    let s = stepOf(L + (vane - 0.5) * 0.2, h.u * h.len, h.v * 4, [0.3, 0.52, 0.8, 0.93], 0.05, o.seed);
    if (Math.abs(h.v) < 0.12 && h.u > 0.1 && h.u < 0.85) s = Math.max(1, s - 1); // the rachis
    return GEN.ramp[clamp(s - (o.far ? 1 : 0), 1, 5)];
  };
}

/** One crow wing as parts, back to front; returns the primary tips (where petals break off). */
function crowWing(f: Frame, S: P2, wg: CraneWing, k: number, t: number, far: boolean): P2[] {
  const style = { outline: GEN.outline, line: GEN.line, solid: 150 };
  const fa = 16 * k, ha = 13 * k * (0.7 + 0.3 * wg.spread);
  const Wr: P2 = [S[0] + dirOf(wg.arm)[0] * fa, S[1] + dirOf(wg.arm)[1] * fa];
  const T: P2 = [Wr[0] + dirOf(wg.hand)[0] * ha, Wr[1] + dirOf(wg.hand)[1] * ha];
  const flick = (j: number): number => Math.sin(TAU * t + j * 1.3);
  const secs: Prim[] = [];
  for (let j = 0; j < 6; j++) {
    const u = 0.12 + j * 0.16;
    const root: P2 = [lerp(S[0], Wr[0], u), lerp(S[1], Wr[1], u)];
    const a = 180 + (wg.arm < 0 ? 1 : -1) * (-10 + 22 * u);
    const len = (20 + flick(j) * 0.8) * k;
    const d = dirOf(a);
    secs.push(lens(root, [root[0] + d[0] * len, root[1] + d[1] * len], 4.8 * k, { bend: wg.arm < 0 ? 1 : -1, peak: 0.35, tip: 0.7, base: 0.7 }));
  }
  f.part_(secs, crowFeather(t, { far, seed: 61, dissolve: 0.72 }), style);
  // Primaries: broad, spread apart at the tips like fingers.
  const tips: P2[] = [];
  for (let j = 5; j >= 0; j--) {
    const u = j / 5;
    const root: P2 = [lerp(Wr[0], T[0], 1 - u * 0.75), lerp(Wr[1], T[1], 1 - u * 0.75)];
    const a = wg.hand + lerp(0, wg.hand < 0 ? -70 : 70, u) * wg.spread + (wg.hand < 0 ? -6 : 6);
    const len = lerp(27, 19, u) * k * (0.8 + 0.2 * wg.spread) + flick(j + 3);
    const d = dirOf(a);
    const tip: P2 = [root[0] + d[0] * len, root[1] + d[1] * len];
    tips.push(tip);
    f.part_([lens(root, tip, lerp(3.8, 3.4, u) * k, { bend: wg.hand < 0 ? 1.2 : -1.2, peak: 0.35, tip: 1.1, base: 0.6 })], crowFeather(t, { far, seed: 71 + j, dissolve: 0.7 }), style);
  }
  const cov: Prim[] = [tube([S, Wr, T], (u) => lerp(4.8, 2.6, u) * k)];
  for (let j = 0; j < 5; j++) {
    const u = j / 4;
    const root: P2 = u < 0.6 ? [lerp(S[0], Wr[0], u / 0.6), lerp(S[1], Wr[1], u / 0.6)] : [lerp(Wr[0], T[0], (u - 0.6) / 0.4), lerp(Wr[1], T[1], (u - 0.6) / 0.4)];
    const a = 180 + (wg.arm < 0 ? 1 : -1) * (-6 + 14 * u);
    const d = dirOf(a);
    const len = lerp(12, 8, u) * k;
    cov.push(lens(root, [root[0] + d[0] * len, root[1] + d[1] * len], 4.2 * k, { peak: 0.3, tip: 0.9, base: 0.8 }));
  }
  f.part_(cov, crowFeather(t, { far, seed: 81 }), style);
  return tips;
}

function illusionCrow(): WorldSprite {
  const W = 190, H = 150, cx = 92, cy = 76;
  const frames: Canvas[] = [];
  CROW_FLAP.forEach((wg, i) => {
    const t = i / CROW_FLAP.length;
    const f = new Frame(W, H);
    const by = wg.bob;
    const style = { outline: GEN.outline, line: GEN.line, solid: 150 };
    const plumage = (seed: number) => (h: Hit): Color => {
      const L = lit(h);
      const s = stepOf(L + (noise(h.x * 0.6, h.y * 1.2, 1.8, seed) - 0.5) * 0.18, h.x, h.y, [0.3, 0.52, 0.8, 0.93], 0.05, seed);
      return GEN.ramp[clamp(s, 1, 5)];
    };
    const farW: CraneWing = { arm: wg.arm + (wg.arm < 0 ? 10 : -10), hand: wg.hand + (wg.hand < 0 ? 12 : -12), spread: wg.spread };
    const farTips = crowWing(f, [cx + 4, cy - 7 + by], farW, 1.0, t + 0.08, true);
    // Tail: a broad wedge of feathers, the tips coming apart.
    const tail: Prim[] = [];
    for (let j = 0; j < 7; j++) {
      const a = 176 + (j - 3) * 6 + Math.sin(TAU * t + j) * 2;
      const r: P2 = [cx - 14, cy + 4 + by];
      const d = dirOf(a);
      const l = 31 - Math.abs(j - 3) * 2;
      tail.push(lens(r, [r[0] + d[0] * l, r[1] + d[1] * l], 3.8, { peak: 0.6, tip: 0.7, base: 0.5 }));
    }
    f.part_(tail, crowFeather(t, { seed: 95, dissolve: 0.65 }), style);
    // Body: heavy chest and belly, the legs tucked under with the talons showing.
    f.part_([lens([cx - 5, cy + 8 + by], [cx - 13, cy + 13 + by], 2, { tip: 1 }), lens([cx - 2, cy + 8 + by], [cx - 9, cy + 14 + by], 2, { tip: 1 })], () => GEN.beak[2], style);
    // Head and the thick neck as one with the body; a ruff of hackles at the throat.
    const hd: P2 = [cx + 26, cy - 6 + by + Math.sin(TAU * t) * 0.8];
    const hackles: Prim[] = [];
    for (let j = 0; j < 4; j++) {
      const r: P2 = [hd[0] - 2 + j * 1.5, hd[1] + 5 + j * 0.5];
      hackles.push(lens(r, [r[0] - 6 - j, r[1] + 6], 2.4, { tip: 1.6, peak: 0.3 }));
    }
    f.part_([blob(cx - 1, cy + 2 + by, 19, 10.5, -0.12), blob(cx + 13, cy + by, 11, 10, -0.3), tube([[cx + 14, cy - 2 + by], [cx + 20, cy - 5 + by], hd], (u) => lerp(9, 8, u)), blob(hd[0], hd[1], 9, 8.4, 0), ...hackles], plumage(91), style);
    // The heavy beak: upper mandible hooked over the lower.
    f.part_([lens([hd[0] + 5, hd[1] + 1.5], [hd[0] + 21, hd[1] + 4.5], 2.6, { peak: 0.15, tip: 0.8, base: 1 })], (h) => GEN.beak[clamp(stepOf(lit(h), h.x, h.y) - 1, 1, 4)], style);
    f.part_([lens([hd[0] + 5, hd[1] - 1], [hd[0] + 23, hd[1] + 2.8], 3.6, { peak: 0.15, tip: 0.75, base: 1, bend: -1.6 })], (h) => GEN.beak[clamp(stepOf(lit(h), h.x, h.y) + (h.v < -0.4 ? 1 : 0), 1, 5)], style);
    const tips = crowWing(f, [cx, cy - 5 + by], wg, 1.16, t, false);
    const fc = f.finish();
    // The illusion eye: a red iris with a dark ring and a white glint, glowing.
    const ex = Math.round(hd[0] + 3), ey = Math.round(hd[1] - 2);
    for (const [dx, dy] of [[-1, -1], [2, -1], [-1, 1], [2, 1], [-2, 0], [3, 0], [0, -2], [1, -2], [0, 2], [1, 2]]) fc.plot(ex + dx, ey + dy, wa(GEN.eye[1], 110));
    for (const [dx, dy, c] of [[0, -1, GEN.eye[1]], [1, -1, GEN.eye[1]], [-1, 0, GEN.eye[0]], [0, 0, GEN.eye[2]], [1, 0, GEN.eye[1]], [2, 0, GEN.eye[0]], [0, 1, GEN.eye[1]], [1, 1, GEN.eye[0]]] as [number, number, Color][]) fc.set(ex + dx, ey + dy, c);
    fc.set(ex, ey - 1, GEN.eye[3]);
    // Petals breaking off the feather tips and the tail, tumbling back; violet smoke wisps.
    // Violet smoke first (behind the petals): soft puffs shed off the trailing edges.
    const sources = [...tips, ...farTips, [cx - 40, cy + 4 + by] as P2, [cx - 40, cy + 8 + by] as P2];
    for (let k = 0; k < 8; k++) {
      const p = fract(k / 8 + t);
      const src = sources[(k * 3) % sources.length];
      const x0 = src[0] - 5 - p * 28, y0 = src[1] + Math.sin(k * 1.7) * 5 - p * 6;
      const r = 2.5 + p * 4;
      for (let y = Math.floor(y0 - r); y <= y0 + r; y++)
        for (let x = Math.floor(x0 - r * 1.4); x <= x0 + r * 1.4; x++) {
          const d = ((x - x0) / 1.4) ** 2 + (y - y0) ** 2;
          if (d > r * r || fc.alpha(x, y) > 200) continue;
          if (noise(x * 0.7, y * 0.7 + k * 9, 2.2, 41 + k) < 0.38) continue;
          fc.plot(x, y, wa(d < r * r * 0.35 ? mix(GEN.smoke, GEN.petal[1], 0.3) : GEN.smoke, 190 * (1 - p * 0.8)));
        }
    }
    // Petals breaking off the feather tips and the tail, tumbling back: 3-5 px petals, a dark heel.
    const PETALS: [number, number, number][][] = [
      [[0, 0, 3], [1, 0, 2], [-1, 1, 2], [0, 1, 1]],
      [[0, 0, 2], [0, 1, 3], [1, 1, 2], [1, 2, 0]],
      [[0, 0, 3], [1, 0, 3], [2, 1, 1], [1, 1, 2]],
      [[1, 0, 3], [0, 1, 2], [1, 1, 2], [0, 2, 0], [2, 0, 2]],
    ];
    for (let k = 0; k < 26; k++) {
      const p = fract(k / 26 + t + rnd(31, k) * 0.2);
      const src = sources[k % sources.length];
      const x = src[0] - 2 - p * 36 - rnd(32, k) * 6, y = src[1] + (rnd(33, k) - 0.5) * 10 + Math.sin(p * 6 + k) * 3 + p * 8;
      if (x < 1 || y < 1 || y > H - 3) continue;
      const shape = PETALS[(Math.floor(p * 8) + k) % PETALS.length];
      const a = 255 * (1 - p * 0.45);
      for (const [dx, dy, c] of shape) fc.plot(Math.round(x) + dx, Math.round(y) + dy, wa(GEN.petal[c], a));
    }
    frames.push(fc);
  });
  return flySprite('genjutsu', 'Illusion crow (genjutsu)', [2.6, 2.0], frames, cx, cy);
}

// =============================================================================================
// CHAKRA FOX
// =============================================================================================
//
// A spirit fox of blue chakra flame, bounding: slender legs, a narrow snout, tall ears and slit
// eyes, and four long tails fanned out behind, each swelling into a flame plume. The flesh burns
// from a white-cyan core to deep blue at the rim, the fire flows back over the loop, and tongues of
// flame lick off the back, the ears and the tails, flickering frame to frame. Everything stays
// inside the frame.

const CHAKRA = (() => ({
  ramp: [hex('#070936'), hex('#141f8e'), hex('#1f46d8'), hex('#3a86ff'), hex('#92d6ff'), hex('#effbff')] as Color[],
  outline: hex('#05072e'),
  line: hex('#1a2c8c'),
  eye: hex('#ffffff'),
  ember: hex('#bff0ff'),
}))();

function chakraFox(): WorldSprite {
  const W = 200, H = 150, cx = 104, cy = 76;
  const Z = 1.0;
  const frames: Canvas[] = [];
  GALLOP.forEach((g, fi) => {
    const t = fi / GALLOP.length;
    const f = new Frame(W, H);
    const cp = Math.cos(g.pitch), sp = Math.sin(g.pitch);
    const B = (x: number, y: number): P2 => [cx + (x * cp + y * sp) * Z, cy + (g.bob - x * sp + y * cp) * Z];
    const sk = lerp(0.92, 1.06, g.stretch);
    const style = { outline: CHAKRA.outline, line: CHAKRA.line, solid: 150 };
    /** Chakra flame: a white-cyan core to a blue rim, the fire flowing back and up over the loop. */
    const flame = (seed: number, far = 0) => (h: Hit): Color => {
      const L = lit(h);
      const core = Math.pow(h.nz, 1.4);
      // Flame licks run up and back: noise stretched along that direction, scrolling with time.
      const ax = h.x * 0.866 + h.y * 0.5, ay = -h.x * 0.5 + h.y * 0.866;
      const flow = noise(ax * 0.35 + t * 30, ay * 1.3, 2, seed);
      const s = stepOf(0.55 * core + 0.28 * L + (flow - 0.5) * 0.55, h.x, h.y, [0.3, 0.52, 0.74, 0.9], 0.05, seed, 2.2);
      return CHAKRA.ramp[clamp(s - far, 1, 5)];
    };
    /** Tongue colours: the root burns like the body, the tip cools to blue. */
    const tongueShade = (seed: number) => (h: Hit): Color => {
      const s = stepOf(lit(h) * 0.5 + (1 - h.u) * 0.45 + (noise(h.x, h.y + t * 20, 2, seed) - 0.5) * 0.3, h.x, h.y, [0.22, 0.42, 0.62, 0.84], 0.05, seed);
      return CHAKRA.ramp[clamp(s, 1, 5)];
    };
    const tongues = (roots: [P2, number, number][], seed: number): Prim[] =>
      roots.map(([r, a, l], j) => {
        const fl = l * (0.75 + 0.4 * (0.5 + 0.5 * Math.sin(TAU * t * 2 + j * 2.3 + seed)));
        const d = dirOf(a + Math.sin(TAU * t + j) * 9);
        return lens(r, [r[0] + d[0] * fl, r[1] + d[1] * fl], 3.2, { tip: 2.2, peak: 0.18, bend: Math.sin(TAU * t + j * 1.7 + seed) * 2.6 });
      });
    const leg = (root: P2, ang: [number, number], l1: number, l2: number, w1: number): Prim[] => {
      const k: P2 = [root[0] + Math.sin(ang[0] * D2R) * l1 * Z, root[1] + Math.cos(ang[0] * D2R) * l1 * Z];
      const p: P2 = [k[0] + Math.sin(ang[1] * D2R) * l2 * Z, k[1] + Math.cos(ang[1] * D2R) * l2 * Z];
      const toe: P2 = [p[0] + 3 * Z, p[1] + 0.5];
      return [lens(root, k, w1 * Z, { peak: 0.3, tip: 0.5, base: 1 }), tube([k, p], (u) => lerp(w1 * 0.5, 1.6, u) * Z), blob((p[0] + toe[0]) / 2, (p[1] + toe[1]) / 2, 2.8 * Z, 1.9 * Z, Math.atan2(toe[1] - p[1], toe[0] - p[0]))];
    };
    // --- tails: four long plumes fanned behind, the far ones first ----------------------------
    const tailRoot = B(-24 * sk, -6);
    const tailDefs = [
      { a: -38, len: 46, w: 6.5 },
      { a: -14, len: 50, w: 7.5 },
      { a: 10, len: 48, w: 7 },
      { a: 32, len: 43, w: 6.5 },
    ];
    tailDefs.forEach((td, j) => {
      const pts: P2[] = [];
      const n = 22;
      for (let q = 0; q <= n; q++) {
        const u = q / n;
        const base = 180 + td.a * u * 1.1;
        const wave = Math.sin(TAU * (u * 0.9 - t) + j * 1.4) * 5 * u;
        const d = dirOf(base);
        pts.push([tailRoot[0] + d[0] * td.len * u * Z, tailRoot[1] + (d[1] * td.len * u + wave) * Z]);
      }
      // A plume: slim at the root, swelling into a flame toward the end, a pointed tip.
      const prof = (u: number): number => (u < 0.25 ? lerp(3.5, 4.2, u / 0.25) : u < 0.8 ? lerp(4.2, td.w, Math.sin(((u - 0.25) / 0.55) * (Math.PI / 2))) : td.w * Math.sqrt(Math.max(0, (1 - u) / 0.2)) + 0.4) * Z;
      const tip = pts[n];
      const up = td.a < 0 ? -1 : 1;
      const tg = tongues([
        [pts[Math.round(n * 0.4)], 180 + td.a - 30, 8],
        [pts[Math.round(n * 0.6)], 180 + td.a - 26, 11],
        [pts[Math.round(n * 0.78)], 180 + td.a - 18, 12],
        [tip, 180 + td.a - 14 * up, 13],
        [tip, 180 + td.a + 10, 11],
        [pts[Math.round(n * 0.9)], 180 + td.a + 26, 8],
      ], 50 + j * 7);
      f.part_([tube(pts, prof), ...tg], flame(60 + j, j === 0 || j === 3 ? 0 : 0), style);
    });
    // --- far legs ------------------------------------------------------------------------------
    f.part_(leg(B(-20 * sk, 2), g.hF, 14, 16, 5.5), flame(11, 1), style);
    f.part_(leg(B(16 * sk, 5), g.fF, 13, 15, 4.5), flame(13, 1), style);
    // --- body with tongues licking off the back --------------------------------------------------
    const backTongues = tongues([
      [B(20 * sk, -11), -140, 13],
      [B(12 * sk, -11), -148, 15],
      [B(3 * sk, -10), -152, 14],
      [B(-6 * sk, -9), -156, 13],
      [B(-15 * sk, -10), -150, 12],
      [B(-22 * sk, -8), -160, 10],
      [B(12 * sk, 9), 155, 9],
      [B(0, 8), 160, 8],
      [B(-12 * sk, 8), 165, 8],
    ], 20);
    f.part_([
      blob(...B(15 * sk, -1), 12, 11, g.pitch * 0.5),
      tube([B(13 * sk, -1), B(-4 * sk, -2 - (1 - g.stretch) * 3), B(-19 * sk, -2)], (u) => lerp(10, 7.5, Math.sin(u * Math.PI)) * Z),
      blob(...B(-19 * sk, -1), 10.5, 10),
      ...backTongues,
    ], flame(23), style);
    // --- head: slender neck, narrow snout, tall ears -------------------------------------------
    const nb = B(24 * sk, -7);
    const hc: P2 = [nb[0] + 13, nb[1] - 12 + Math.sin(TAU * t) * 1.2];
    const HS = 1.3; // the head drawn a little larger so the fox's face reads
    const HZ = (x: number, y: number): P2 => [hc[0] + x * HS, hc[1] + y * HS];
    const ears = [lens(HZ(-4, -4), HZ(-8, -21), 4.4 * HS, { peak: 0.12, tip: 0.9, base: 1, bend: -1 }), lens(HZ(1, -5), HZ(0, -20), 3.8 * HS, { peak: 0.12, tip: 0.9, base: 1, bend: -1.5 })];
    const earTongues = tongues([[HZ(-8, -19), -125, 7]], 33);
    // A ruff of flame around the neck and cheeks, licking back.
    const cheek = tongues([[HZ(-4, 3), 165, 11], [HZ(-2, 6), 150, 10], [HZ(-8, 0), -170, 10], [B(28 * sk, -2), 160, 10], [B(26 * sk, 4), 150, 9]], 36);
    f.part_([tube([nb, [nb[0] + 6, nb[1] - 6], HZ(-2, 1)], (u) => lerp(8.5, 7.5, u)), blob(hc[0], hc[1], 8 * HS, 6.6 * HS, 0.05), lens(HZ(2, -1.5), HZ(21, 3.5), 4.2 * HS, { peak: 0.15, tip: 0.9, base: 1 }), ...ears, ...earTongues, ...cheek], flame(31), style);
    // Inner ears: a darker hollow in each ear.
    f.part_([lens(HZ(-4.5, -6), HZ(-7.5, -18), 2.2 * HS, { peak: 0.15, tip: 0.9, base: 1, bend: -1 }), lens(HZ(0.5, -6.5), HZ(0, -17.5), 1.8 * HS, { peak: 0.15, tip: 0.9, base: 1, bend: -1.5 })], (h) => CHAKRA.ramp[h.u > 0.7 ? 2 : 1], { outline: null, line: null });
    // --- near legs -----------------------------------------------------------------------------
    f.part_(leg(B(-18 * sk, 2), g.hN, 15, 17, 6.5), flame(37), style);
    f.part_(leg(B(18 * sk, 5), g.fN, 14, 16, 5), flame(41), style);
    const fc = f.finish();
    // Slit eye glowing white, a dark brow; nose.
    // A fox's slanted eye: a dark lid line rising toward the back, a white-hot slit under it.
    const [ex, ey] = HZ(6.5, -2).map(Math.round);
    for (const [dx, dy, c] of [
      [-2, -2, CHAKRA.outline], [-1, -2, CHAKRA.outline], [-1, -1, CHAKRA.outline], [0, -1, CHAKRA.outline], [1, -1, CHAKRA.outline], [2, -1, CHAKRA.outline], [3, 0, CHAKRA.outline],
      [-1, 0, CHAKRA.ramp[4]], [0, 0, CHAKRA.eye], [1, 0, CHAKRA.eye], [2, 0, CHAKRA.ramp[4]], [0, 1, CHAKRA.ramp[1]], [1, 1, CHAKRA.ramp[1]],
    ] as [number, number, Color][]) fc.set(ex + dx, ey + dy, c);
    const [nx2, ny2] = HZ(21, 2.6).map(Math.round);
    fc.set(nx2, ny2, CHAKRA.outline);
    fc.set(nx2 - 1, ny2, CHAKRA.outline);
    // Embers of chakra rising off the back and the tails.
    for (let k = 0; k < 18; k++) {
      const p = fract(k / 18 + t);
      const x = cx + 30 - rnd(51, k) * 96 - p * 14, y = cy - 6 - rnd(52, k) * 40 - p * 14 + rnd(53, k) * 30;
      const X = Math.round(x), Y = Math.round(y);
      if (fc.alpha(X, Y)) continue;
      fc.set(X, Y, p < 0.5 ? CHAKRA.ember : CHAKRA.ramp[3]);
      if (p < 0.3 && !fc.alpha(X, Y + 1)) fc.plot(X, Y + 1, wa(CHAKRA.ramp[3], 150));
    }
    frames.push(fc);
  });
  return flySprite('chakra', 'Chakra fox', [2.6, 1.9], frames, cx, cy);
}

// =============================================================================================
// VENOM COBRA (poison)
// =============================================================================================
//
// A cobra striking through the air: the neck reared with the hood spread wide behind the head, the
// jaw open on two long fangs, the forked tongue out, and the body undulating back to the tail. The
// skin is real scales (overlapping rows, each lit on its upper-left edge) in dark green with acid
// bands, pale scutes along the belly; the hood carries banded eye-spot markings. Acid drips from
// the fangs and beads off the body.

const VENOM = (() => ({
  skin: [hex('#081208'), hex('#14301a'), hex('#21482a'), hex('#33663a'), hex('#4f8a46'), hex('#86b85c')] as Color[],
  acid: [hex('#122c04'), hex('#2f6a0c'), hex('#58a816'), hex('#8ee02a'), hex('#c8ff5a'), hex('#efffb8')] as Color[],
  belly: [hex('#2a2a10'), hex('#5c5a26'), hex('#8c8a44'), hex('#b8b46a'), hex('#dcd89a'), hex('#f6f4d0')] as Color[],
  outline: hex('#071008'),
  line: hex('#0f2412'),
  mouth: [hex('#2a0a14'), hex('#5a1a2c'), hex('#8a3048')] as Color[],
  fang: hex('#f4f2e4'),
  eye: hex('#e8ff6a'),
}))();

/** The cobra's body behind the hood: from the base of the neck back to the tail, rippling. */
function cobraSpine(t: number, cx: number, cy: number): P2[] {
  const pts: P2[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const s = i / N; // 0 at the base of the neck, 1 at the tail tip
    const x = cx + 12 - s * 104;
    const amp = lerp(2, 12, smooth(0, 0.3, s)) * lerp(1, 0.7, smooth(0.85, 1, s));
    const y = cy + 12 + amp * Math.sin(TAU * (s * 1.1 - t) + 0.2);
    pts.push([x, y]);
  }
  return pts;
}

function venomCobra(): WorldSprite {
  const W = 190, H = 140, cx = 96, cy = 70;
  const frames: Canvas[] = [];
  const NF = 8;
  for (let fi = 0; fi < NF; fi++) {
    const t = fi / NF;
    const f = new Frame(W, H);
    const spine = cobraSpine(t, cx, cy);
    const style = { outline: VENOM.outline, line: VENOM.line, solid: 150 };
    const hw = (u: number): number => (u < 0.35 ? lerp(7, 8.5, u / 0.35) : lerp(8.5, 1.2, ((u - 0.35) / 0.65) ** 1.1));
    /** Scales: rows of overlapping scales, each lit on its upper-left lip; acid bands; pale scutes. */
    const scales = (seed: number, o: { bands?: boolean; belly?: number } = {}) => (h: Hit): Color => {
      const along = h.u * h.len;
      const L = lit(h);
      if (h.v > (o.belly ?? 0.5)) {
        const st = clamp(stepOf(L, along, h.v, [0.2, 0.42, 0.7, 0.88], 0.04, seed) - ((along + 0.3) % 3.2 < 0.8 ? 1 : 0), 1, 4);
        return VENOM.belly[st];
      }
      const row = Math.floor((h.v + 1) * 3.2);
      const sa = along / 3.4 + (row % 2 ? 0.5 : 0);
      const cu = fract(sa), cell = Math.floor(sa);
      const band = o.bands && fract(along / 15) < 0.3;
      const r = band ? VENOM.acid : VENOM.skin;
      let st = stepOf(L + (rnd(seed, cell, row) - 0.5) * 0.12, along, h.v * 5, [0.24, 0.46, 0.72, 0.9], 0.04, seed);
      if (cu > 0.78) st = Math.max(1, st - 1);
      else if (cu < 0.22 && L > 0.45) st = Math.min(5, st + 1);
      if (fract((h.v + 1) * 3.2) > 0.85) st = Math.max(1, st - 1);
      return r[clamp(st, 1, 5)];
    };
    // --- body --------------------------------------------------------------------------------
    f.part_([tube(spine, hw)], scales(21, { bands: true }), style);
    // --- the reared neck, from the body up to the head ---------------------------------------
    const bob = Math.sin(TAU * t) * 1;
    const hx = cx + 30, hy = cy - 18 + bob;
    const neck: P2[] = [];
    for (let q = 0; q <= 12; q++) {
      const u = q / 12;
      neck.push([lerp(spine[0][0] + 2, hx - 4, u) + Math.sin(u * Math.PI) * 4, lerp(spine[0][1], hy + 2, u)]);
    }
    f.part_([tube(neck, (u) => lerp(8, 6, u))], scales(25, { belly: 0.35 }), style);
    // --- hood: spread wide behind the head, its face turned to us: pale with dark crossbands,
    //     two eye-spots, a scaled dark rim -----------------------------------------------------
    const hc: P2 = [hx - 10, hy + 8];
    const tilt = 0.3 + Math.sin(TAU * t) * 0.03;
    f.part_([blob(hc[0], hc[1], 13.5, 19, tilt), blob(hc[0] - 3, hc[1] + 11, 8.5, 9.5, tilt + 0.3)], (h) => {
      const L = lit(h);
      const dx = h.x + 0.5 - hc[0], dy = h.y + 0.5 - hc[1];
      const bx = dx * Math.cos(tilt) + dy * Math.sin(tilt), by = -dx * Math.sin(tilt) + dy * Math.cos(tilt);
      const rimK = Math.hypot(bx / 13.5, by / 19);
      let st = stepOf(L, h.x, h.y, [0.24, 0.46, 0.72, 0.9], 0.05, 33);
      if (rimK > 0.78) {
        // The rim: scaled dark skin.
        const sc = fract((Math.atan2(by, bx) * 17) / TAU) < 0.25;
        return VENOM.skin[clamp(st - (sc ? 1 : 0), 1, 4)];
      }
      for (const [sx2, sy2] of [[-4.5, -4], [3, -4]]) {
        const d = Math.hypot(bx - sx2, (by - sy2) * 0.85);
        if (d < 0.9) return VENOM.outline;
        if (d < 2) return VENOM.acid[4];
        if (d < 2.8) return VENOM.skin[1];
      }
      if (Math.abs(fract((by + 3) / 7) - 0.5) < 0.12 && by > 0) st = Math.max(1, st - 2);
      return VENOM.belly[clamp(st, 1, 5)];
    }, style);
    // --- head -------------------------------------------------------------------------------
    const S = 1.3;
    const ang = -0.12;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const H2 = (x: number, y: number): P2 => [hx + (x * ca - y * sa) * S, hy + (x * sa + y * ca) * S];
    f.part_([lens(H2(-1, 3), H2(14, 9), 2.4 * S, { peak: 0.25, tip: 0.8, base: 1 })], scales(31, { belly: 0.2 }), style);
    f.part_([poly([H2(0, 1), H2(15, 1.5), H2(14, 7), H2(2, 5)])], (h) => VENOM.mouth[h.v < 0 ? 1 : 0], { outline: null, line: null });
    const flick = Math.sin(TAU * t * 2) * 1.5;
    f.part_([tube([H2(6, 4), H2(16, 5), H2(21, 4 + flick)], () => 0.7), tube([H2(16, 5), H2(21, 7 + flick)], () => 0.6)], () => VENOM.mouth[2], { outline: VENOM.outline, line: null });
    f.part_([lens(H2(10.5, 1), H2(11.5, 8.5), 1.2 * S, { bend: 0.8, tip: 1, peak: 0.2, base: 1 }), lens(H2(4.5, 1.3), H2(5.5, 6.5), 0.9 * S, { bend: 0.6, tip: 1, peak: 0.2, base: 1 })], () => VENOM.fang, { outline: VENOM.outline, line: null });
    f.part_([blob(...H2(2, -1), 7.2 * S, 5.4 * S, ang), lens(H2(0, -2), H2(15.5, 0), 4.4 * S, { peak: 0.3, tip: 0.6, base: 1 })], scales(41, { belly: 0.6 }), style);
    const fc = f.finish();
    // Eye: a glowing acid slit under a dark scale brow.
    const [ex, ey] = H2(6, -2.6).map(Math.round);
    for (const [dx, dy, c] of [[-1, -1, VENOM.outline], [0, -1, VENOM.outline], [1, -1, VENOM.outline], [2, -1, VENOM.outline], [3, -1, VENOM.outline], [-1, 0, VENOM.acid[3]], [0, 0, VENOM.eye], [1, 0, VENOM.outline], [2, 0, VENOM.eye], [3, 0, VENOM.acid[3]], [0, 1, VENOM.acid[2]], [1, 1, VENOM.acid[2]], [2, 1, VENOM.acid[2]]] as [number, number, Color][]) fc.set(ex + dx, ey + dy, c);
    const [nx2, ny2] = H2(14, -1.5).map(Math.round);
    fc.set(nx2, ny2, VENOM.outline);
    // Acid drips: from the fang tips, stretching and falling; beads shed by the body.
    const fangTip = H2(11.5, 8.6);
    for (let k = 0; k < 4; k++) {
      const p = fract(k / 4 + t);
      const X = Math.round(fangTip[0] - p * 6), Y = Math.round(fangTip[1] + 2 + p * p * 24);
      const len = p < 0.3 ? 3 : 2;
      for (let q = 0; q < len; q++) fc.set(X, Y - q, q === 0 ? VENOM.acid[4] : VENOM.acid[3]);
      fc.set(X, Y + 1, VENOM.acid[2]);
      if (p > 0.5) fc.set(X + 1, Y, VENOM.acid[3]);
    }
    for (let k = 0; k < 10; k++) {
      const p = fract(k / 10 + t + rnd(81, k) * 0.2);
      const src = spine[Math.round(lerp(0.15, 0.9, rnd(82, k)) * (spine.length - 1))];
      const x = src[0] - p * 12, y = src[1] + 7 + p * p * 30;
      if (y > H - 3) continue;
      drop(fc, x, y, k % 3 === 0, VENOM.acid[4], VENOM.acid[3], VENOM.acid[1], -1, 1);
    }
    frames.push(fc);
  }
  return flySprite('poison', 'Venom cobra (poison)', [2.6, 1.8], frames, cx, cy);
}

// =============================================================================================
// BUILD
// =============================================================================================

const FOCUS = process.env.FOCUS?.split(',');
const BUILDERS: [string, () => WorldSprite][] = [
  ['water', waterDragon],
  ['wind', windCrane],
  ['lightning', raiju],
  ['earth', stoneDragon],
  ['genjutsu', illusionCrow],
  ['chakra', chakraFox],
  ['poison', venomCobra],
];

/** Saves a canvas through a temp file and a rename, so a reader never sees a half-written PNG. */
function saveWhole(c: Canvas, path: string): void {
  const tmp = `${path}.part`;
  c.save(tmp);
  renameSync(tmp, path);
}

/** Reads an 8-bit RGBA PNG (what the kit writes) into a canvas. */
function readPng(path: string): Canvas | null {
  if (!existsSync(path)) return null;
  const buf = readFileSync(path);
  let w = 0, h = 0, off = 8;
  const idat: Buffer[] = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) return null;
    } else if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(w * h * 4);
  const stride = w * 4;
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= 4 ? out[y * stride + x - 4] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
      let r = v;
      if (ft === 1) r = v + a;
      else if (ft === 2) r = v + b;
      else if (ft === 3) r = v + ((a + b) >> 1);
      else if (ft === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      out[y * stride + x] = r & 255;
    }
  }
  return Canvas.fromRgba(w, h, out);
}

interface Sheet {
  frames: Canvas[];
  anchor: [number, number];
}

/** The fly frames and anchor of a staged sheet (another group's beast, for comparison). */
function stagedBeast(dir: string, group: string, name: string): Sheet | null {
  const mp = join(dir, group, 'manifest.json');
  if (!existsSync(mp)) return null;
  const spec = JSON.parse(readFileSync(mp, 'utf8')).sprites?.[name];
  if (!spec) return null;
  const img = readPng(join(dir, group, spec.file));
  if (!img) return null;
  const a = spec.anims.fly ?? Object.values(spec.anims)[0];
  const frames: Canvas[] = [];
  for (let i = 0; i < a.frames; i++) {
    const c = new Canvas(spec.frameW, spec.frameH);
    c.draw(img, -i * spec.frameW, -a.row * spec.frameH);
    frames.push(c);
  }
  return { frames, anchor: spec.anchor };
}

/** Frames side by side at a fixed scale, cropped to their union, on a background. */
function strip(path: string, frames: Canvas[], k: number, bg = '#5d6b57'): void {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of frames) {
    const b = f.bounds();
    if (!b) continue;
    x0 = Math.min(x0, b[0]);
    y0 = Math.min(y0, b[1]);
    x1 = Math.max(x1, b[2]);
    y1 = Math.max(y1, b[3]);
  }
  x0 -= 2;
  y0 -= 2;
  x1 += 2;
  y1 += 2;
  const fw = x1 - x0 + 1, fh = y1 - y0 + 1;
  const cols = Math.min(frames.length, 4);
  const rows = Math.ceil(frames.length / cols);
  const out = new Canvas((fw + 2) * cols, (fh + 2) * rows);
  out.fillRect(0, 0, out.w, out.h, hex('#2a2e36'));
  frames.forEach((f, i) => {
    const X = (i % cols) * (fw + 2), Y = Math.floor(i / cols) * (fh + 2);
    out.fillRect(X, Y, fw, fh, hex(bg));
    out.draw(f, X - x0, Y - y0);
  });
  saveWhole(out.scaled(k), path);
}

/** Lineup: the character and the phoenix, then the seven beasts, anchors at flight height. */
function beastsLineup(sprites: WorldSprite[], dir: string, stage: string, k = 3): void {
  const ref = characterRef();
  const phoenix = stagedBeast(stage, 'vfx_fire', 'beast');
  const items: { c: Canvas; ax: number; ay: number }[] = [];
  if (phoenix) items.push({ c: phoenix.frames[0], ax: phoenix.anchor[0], ay: phoenix.anchor[1] });
  for (const s of sprites) items.push({ c: s.anims.fly.frames[0], ax: s.anchor[0], ay: s.anchor[1] });
  const rowsOf: (typeof items)[] = [items.slice(0, 4), items.slice(4)];
  const lift = 64; // the renderer flies beasts about 60 px above the ground
  const gap = 8, below = 26;
  // Each row is as tall as its tallest beast at flight height (and the character).
  const aboveOf = (r: typeof items): number => Math.max(CHARACTER_FEET[1] + 4, ...r.map((i) => lift + i.ay + 4));
  const widths = rowsOf.map((r) => r.reduce((t, i) => t + i.c.w + gap, gap + 128 + gap));
  const W = Math.max(...widths), H = rowsOf.reduce((t, r) => t + aboveOf(r) + below, 0);
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, hex('#5d6b57'));
  let top = 0;
  rowsOf.forEach((row) => {
    const gy = top + aboveOf(row);
    top = gy + below;
    out.fillRect(0, gy, W, below, hex('#4a5a3c'));
    out.draw(ref, gap + 64 - CHARACTER_FEET[0], gy - CHARACTER_FEET[1]);
    let x = gap + 128 + gap;
    for (const it of row) {
      out.draw(it.c, x, gy - lift - it.ay);
      x += it.c.w + gap;
    }
  });
  saveWhole(out.scaled(k), join(dir, 'beasts-lineup.png'));
}

/** Every frame of every beast, one row per beast, scaled `k`. */
function beastsAnims(sprites: WorldSprite[], dir: string, k = 3): void {
  const gap = 3, pad = 6;
  const rows = sprites.map((s) => s.anims.fly.frames);
  const W = Math.max(...rows.map((r) => pad * 2 + r.reduce((t, f) => t + f.w + gap, 0)));
  const H = rows.reduce((t, r) => t + r[0].h + pad, pad);
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, hex('#3a4438'));
  let y = pad;
  for (const r of rows) {
    let x = pad;
    for (const f of r) {
      out.fillRect(x, y, f.w, f.h, hex('#5d6b57'));
      out.draw(f, x, y);
      x += f.w + gap;
    }
    y += r[0].h + pad;
  }
  saveWhole(out.scaled(k), join(dir, 'beasts-anims.png'));
}

/** Old beast (left) next to the new one (right), frames 0 and 3, one row per element, scaled `k`. */
function beastsCompare(sprites: WorldSprite[], dir: string, stage: string, k = 3): void {
  const pairs: { old: Canvas[]; neu: Canvas[] }[] = [];
  for (const s of sprites) {
    const old = stagedBeast(stage, `vfx_${s.name}`, 'beast');
    const f = s.anims.fly.frames;
    pairs.push({ old: old ? [old.frames[0], old.frames[Math.min(3, old.frames.length - 1)]] : [], neu: [f[0], f[Math.min(3, f.length - 1)]] });
  }
  const colW = (cs: Canvas[]) => cs.reduce((t, c) => t + c.w + 3, 0);
  const oldW = Math.max(...pairs.map((p) => colW(p.old)), 10), newW = Math.max(...pairs.map((p) => colW(p.neu)));
  const W = 6 + oldW + 14 + newW + 6;
  const rowH = pairs.map((p) => Math.max(...p.old.map((c) => c.h), ...p.neu.map((c) => c.h)));
  const H = rowH.reduce((t, h) => t + h + 6, 6);
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, hex('#3a4438'));
  out.fillRect(6 + oldW + 6, 0, 2, H, hex('#c8c0a0'));
  let y = 6;
  pairs.forEach((p, i) => {
    let x = 6;
    for (const c of p.old) {
      out.fillRect(x, y, c.w, c.h, hex('#5d6b57'));
      out.draw(c, x, y);
      x += c.w + 3;
    }
    x = 6 + oldW + 14;
    for (const c of p.neu) {
      out.fillRect(x, y, c.w, c.h, hex('#5d6b57'));
      out.draw(c, x, y);
      x += c.w + 3;
    }
    y += rowH[i] + 6;
  });
  saveWhole(out.scaled(k), join(dir, 'beasts-compare.png'));
}

/** A 3x5 pixel font for sheet labels. */
const FONT3: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100110101010', '7': '111001010010010', '8': '111101111101111',
  '9': '010101011001110', '-': '000000111000000', '/': '001001010100100', '.': '000000000000010', ':': '000010000010000',
  ' ': '000000000000000',
};
function label(c: Canvas, x: number, y: number, text: string, col = hex('#e8e0c0')): void {
  [...text.toUpperCase()].forEach((ch, i) => {
    const g = FONT3[ch] ?? FONT3[' '];
    for (let k = 0; k < 15; k++) if (g[k] === '1') c.set(x + i * 4 + (k % 3), y + Math.floor(k / 3), col);
  });
}

/**
 * The lightning review sheet: the old thunder hound against the new raiju (frames 0 and 3), the
 * whole new fly loop with the anchor ticked on every frame, and the raiju at flight height next
 * to the approved phoenix and the character for scale. Scaled `k`.
 */
function lightningSheet(s: WorldSprite, dir: string, stage: string, k = 3): void {
  const pad = 6, gap = 4, bg = hex('#5d6b57'), sheet = hex('#3a4438'), tick = hex('#9fe0ff');
  const neu = s.anims.fly.frames;
  // The old sheet as the owner last saw it.
  let old: Canvas[] = [];
  const oldMeta = join(dir, 'beasts-lightning-prev.json');
  const oldImg = readPng(join(dir, 'beasts-lightning-prev.png'));
  if (oldImg && existsSync(oldMeta)) {
    const meta = JSON.parse(readFileSync(oldMeta, 'utf8'));
    old = [0, 3].map((i) => {
      const c = new Canvas(meta.frameW, meta.frameH);
      c.draw(oldImg, -i * meta.frameW, 0);
      return c;
    });
  }
  const cmp = [...old.map((c, i) => ({ c, t: `old frame ${i ? 3 : 0}` })), { c: neu[0], t: 'new frame 0' }, { c: neu[3], t: 'new frame 3' }];
  const rowW = (cs: { c: Canvas }[]) => cs.reduce((t, i) => t + i.c.w + gap, -gap);
  const cmpW = rowW(cmp) + (old.length ? 10 : 0);
  const cmpH = Math.max(...cmp.map((i) => i.c.h));
  const cols = 4, loopW = cols * (neu[0].w + gap) - gap, loopRows = Math.ceil(neu.length / cols);
  const ref = characterRef();
  const phoenix = stagedBeast(stage, 'vfx_fire', 'beast');
  const lift = 64, scaleH = CHARACTER_FEET[1] + 10;
  const scaleW = 128 + gap + (phoenix ? phoenix.frames[0].w + gap * 3 : 0) + neu[3].w;
  const W = pad * 2 + Math.max(cmpW, loopW, scaleW);
  let y = pad;
  const H = pad + 8 + cmpH + 10 + 8 + loopRows * (neu[0].h + gap) + 6 + 8 + scaleH + pad;
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, sheet);
  // 1. old vs new
  label(out, pad, y, 'Lightning beast - old thunder hound vs new raiju - yellow - pounce');
  y += 8;
  let x = pad;
  cmp.forEach((it, i) => {
    if (old.length && i === old.length) {
      out.fillRect(x + 2, y, 2, cmpH, hex('#c8c0a0'));
      x += 10;
    }
    out.fillRect(x, y, it.c.w, cmpH, bg);
    out.draw(it.c, x, y + Math.round((cmpH - it.c.h) / 2));
    label(out, x + 2, y + 2, it.t, hex('#f4f0dc'));
    x += it.c.w + gap;
  });
  y += cmpH + 10;
  // 2. the full loop, anchor ticked on the panel edges
  label(out, pad, y, `New fly loop - ${neu.length} frames at ${s.anims.fly.fps} fps - ticks mark the anchor`);
  y += 8;
  neu.forEach((f, i) => {
    const X = pad + (i % cols) * (f.w + gap), Y = y + Math.floor(i / cols) * (f.h + gap);
    out.fillRect(X, Y, f.w, f.h, bg);
    out.draw(f, X, Y);
    for (const [tx, ty] of [[X, Y + s.anchor[1]], [X + 1, Y + s.anchor[1]], [X + s.anchor[0], Y], [X + s.anchor[0], Y + 1]] as P2[]) out.set(tx, ty, tick);
    label(out, X + 2, Y + f.h - 7, String(i), hex('#f4f0dc'));
  });
  y += loopRows * (neu[0].h + gap) + 6;
  // 3. scale: character on the ground, the phoenix and the raiju at flight height
  label(out, pad, y, 'Scale - character - approved fire phoenix - new raiju at flight height');
  y += 8;
  const gy = y + scaleH - 6;
  out.fillRect(pad, y, W - pad * 2, scaleH, bg);
  out.fillRect(pad, gy, W - pad * 2, 6, hex('#4a5a3c'));
  out.draw(ref, pad + 64 - CHARACTER_FEET[0], gy - CHARACTER_FEET[1]);
  x = pad + 128 + gap;
  if (phoenix) {
    out.draw(phoenix.frames[0], x, gy - lift - phoenix.anchor[1]);
    x += phoenix.frames[0].w + gap * 3;
  }
  out.draw(neu[3], x, gy - lift - s.anchor[1]);
  saveWhole(out.scaled(k), join(dir, 'beasts-lightning.png'));
}

const sprites: WorldSprite[] = BUILDERS.filter(([n]) => !FOCUS || FOCUS.includes(n)).map(([, f]) => f());
const dir = previewDir();
const stage = process.env.WORLD_OUT ?? join(dir, 'staging');
if (!FOCUS) {
  writeGroup('vfx_beasts', sprites);
  beastsLineup(sprites, dir, stage);
  beastsAnims(sprites, dir);
  beastsCompare(sprites, dir, stage);
}
for (const s of sprites) {
  if (s.name === 'lightning') lightningSheet(s, dir, stage);
  strip(join(dir, `beasts-${s.name}-x.png`), s.anims.fly.frames, 4);
  const f = s.anims.fly.frames[0];
  console.log(`${s.name.padEnd(10)} frame ${f.w}x${f.h} anchor ${s.anchor} frames ${s.anims.fly.frames.length}@${s.anims.fly.fps}`);
}
