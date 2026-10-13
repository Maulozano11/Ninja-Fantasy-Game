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

import { join } from 'node:path';
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
  const base = ramp(blend(MATERIALS.water, '#4fb6e8', 0.45), { shift: 12 });
  return {
    ramp: base,
    deep: ramp(blend(MATERIALS.water, '#1d3f78', 0.5), { shift: 10 }),
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
    const x = cx + 24 - s * 104;
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
      const x = src[0] - p * (fromTail ? 22 : 18) - rnd(5, k) * 5;
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
  ramp: ramp(blend('#9fe0c8', MATERIALS.paper, 0.35), { shift: 14, spread: 0.85 }),
  tip: ramp(blend('#5fb8a8', '#2f7f86', 0.3), { shift: 12 }),
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
    let s = stepOf(L + (vane - 0.5) * 0.25, h.u * h.len, h.v * 4, [0.22, 0.44, 0.7, 0.86], 0.05, o.seed);
    if (Math.abs(h.v) < 0.12 && h.u > 0.1) s = Math.max(1, s - 1); // the rachis
    if (o.tipDark && h.u > 0.72) return WIND.tip[clamp(s, 1, 4)];
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
      const s = stepOf(L + (noise(h.x * 0.5 - t * 20, h.y, 2, 91) - 0.5) * 0.12, h.x, h.y, [0.22, 0.44, 0.7, 0.86], 0.05, 91);
      return WIND.ramp[clamp(s, 1, 5)];
    };
    // Far wing, behind everything, raised a little ahead of the near one.
    const farW: CraneWing = { arm: wg.arm + (wg.arm < 0 ? 10 : -10), hand: wg.hand + (wg.hand < 0 ? 12 : -12), spread: wg.spread };
    const farTips = craneWing(f, [cx + 6, cy - 6 + by], farW, 1.08, t + 0.08, true);
    // Wind ribbons streaming from the tail, waving, each ending in a curl.
    for (let r = 0; r < 3; r++) {
      const pts: P2[] = [];
      const n = 30;
      const len = 54 + r * 8;
      for (let q = 0; q <= n; q++) {
        const u = q / n;
        const x = cx - 18 - u * len;
        const y = cy + 3 + by + (r - 1) * 7 * u + Math.sin(TAU * (u * 1.2 - t) + r * 1.8) * 4 * u;
        pts.push([x, y]);
      }
      // The curl at the end: a spiral turning back over the ribbon.
      const [ex0, ey0] = pts[n];
      for (let q = 1; q <= 10; q++) {
        const a = Math.PI / 2 + q * 0.5 + r;
        const rr = 4.5 - q * 0.3;
        pts.push([ex0 - 2 + Math.cos(a) * rr * 1.2, ey0 + (r === 1 ? 0 : r === 0 ? -2 : 2) + Math.sin(a) * rr]);
      }
      f.part_([tube(pts, (u) => (u < 0.75 ? lerp(3.4, 1.4, u / 0.75) : lerp(1.4, 0.7, (u - 0.75) / 0.25)))], (h) => {
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
    const tips = craneWing(f, [cx + 2, cy - 4 + by], wg, 1.25, t, false);
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
    [...tips, ...farTips].forEach(([x, y], j) => streak(x - 1, y, 16 + (j % 3) * 6, j < tips.length ? 235 : 150, j));
    // Eddies: little spirals spun off behind, drifting back over the loop.
    for (let e = 0; e < 3; e++) {
      const p = fract(t + e / 3);
      const ex2 = cx - 40 - p * 46, ey2 = cy - 18 + e * 18 + Math.sin(e * 2.1) * 6;
      const r0 = 2 + p * 3.5;
      for (let q = 0; q < 26; q++) {
        const a = q * 0.42 + e * 2 + p * 4;
        const rr = r0 * (1 - q / 34);
        fc.plot(Math.round(ex2 + Math.cos(a) * rr * 1.4), Math.round(ey2 + Math.sin(a) * rr), wa(WIND.streak, 245 * (1 - p * 0.7) * (1 - q / 30)));
      }
    }
    frames.push(fc);
  });
  return flySprite('wind', 'Wind crane', [2.6, 2.0], frames, cx, cy);
}

// =============================================================================================
// BUILD
// =============================================================================================

const FOCUS = process.env.FOCUS?.split(',');
const BUILDERS: [string, () => WorldSprite][] = [
  ['water', waterDragon],
  ['wind', windCrane],
];

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
  out.scaled(k).save(path);
}

const sprites: WorldSprite[] = BUILDERS.filter(([n]) => !FOCUS || FOCUS.includes(n)).map(([, f]) => f());
const dir = previewDir();
if (!FOCUS) writeGroup('vfx_beasts', sprites);
for (const s of sprites) {
  strip(join(dir, `beasts-${s.name}-x.png`), s.anims.fly.frames, 4);
  strip(join(dir, `beasts-${s.name}-dark-x.png`), s.anims.fly.frames, 3, '#1f2029');
  const f = s.anims.fly.frames[0];
  console.log(`${s.name.padEnd(10)} frame ${f.w}x${f.h} anchor ${s.anchor} frames ${s.anims.fly.frames.length}@${s.anims.fly.fps}`);
}
void [characterRef, CHARACTER_FEET, rnd];
