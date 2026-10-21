// Summoned jutsu beasts: the creatures a jutsu sends flying or running from the caster to the
// target. One sprite per element in the group vfx_beasts (the battle renderer prefers these over
// the per-element 'beast' sheets): phoenix, water dragon, wind crane, raiju, stone drake, illusion
// crow, chakra fox and venom cobra. Each has a 'fly' loop facing right (the game mirrors it), with
// the anchor at the body centre; the phoenix also has 'dive' and 'attack'.
//
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/vfx-beasts.ts [previewDir]
//   writes the sheets for approval under <dir>/vfx_beasts/ (it refuses to run without WORLD_OUT, so it
//   never writes into src/assets; copy the approved sheets into the game from there).
//   FOCUS=water,wind ... builds only those (inspection images only, no sheets).
//
// The phoenix, the raiju, the wind crane and the stone drake are copied from the owner's own
// reference sheets (see their sections and tools/refs/beasts-from-ref.py). Every other creature is
// built from parts painted back to front: tubes along a path (serpent bodies, necks, tails, legs) whose
// cross-section gives a true normal, ellipsoids (heads, chests, haunches) and lens shapes (horns,
// feathers, fins, flame tongues, petals). Each part has a material shader that turns its normal and
// surface coordinates into a ramp step, lit from the upper left and broken into clusters by noise
// anchored to the surface (so the texture rides the motion). A part in front leaves a dark inner
// line on the part behind it, and every part carries a 1 px outline tinted by its material.
// Particles (spray, sparks, pebbles, petals, drips) go on top.

import { existsSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { CHARACTER_FEET, Canvas, Color, LIGHT, MATERIALS, WorldSprite, characterRef, hash, hex, mix, noise, previewDir, ramp, toHex, withAlpha, writeGroup } from './kit';
import * as REF_EARTH from './vfx-beasts-ref-earth';
import * as REF_FIRE from './vfx-beasts-ref-fire';
import * as REF_LIGHTNING from './vfx-beasts-ref-lightning';
import * as REF_WIND from './vfx-beasts-ref-wind';

type P2 = [number, number];
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const fract = (v: number): number => v - Math.floor(v);
const D2R = Math.PI / 180;
const dirOf = (deg: number): P2 => [Math.cos(deg * D2R), Math.sin(deg * D2R)];
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
// THE OWNER'S PHOENIX (fire) AND RAIJU (lightning)
// =============================================================================================
//
// These two are copied from the owner's own reference sheets, as he asked ("copy them as exactly as
// possible, that is the quality I want"): tools/refs/beasts-from-ref.py crops his numbered panels, removes
// the background, scales them to his scale row next to our character, area-averages them, snaps them
// to a palette sampled from his pixels and cleans the outline, then writes the frames as data modules
// (vfx-beasts-ref-fire.ts, vfx-beasts-ref-lightning.ts) that are decoded here. The phoenix carries
// three animations: 'fly' (his eight-frame loop), 'dive' (a loop around his dive frame) and 'attack'
// (once, around his attack frame: the fireball grows out of the beak and flies off).

interface RefSheet {
  SIZE: [number, number];
  ANCHOR: [number, number];
  ALPHABET: string;
  PALETTE: string[];
  FRAMES: Record<string, string[][]>;
}

/** Decodes a frame set copied from a reference sheet: run-length rows of palette symbols. */
function refFrames(ref: RefSheet): Record<string, Canvas[]> {
  const pal = ref.PALETTE.map((c) => hex(c.slice(0, 7), parseInt(c.slice(7, 9), 16)));
  const out: Record<string, Canvas[]> = {};
  for (const [anim, list] of Object.entries(ref.FRAMES)) {
    out[anim] = list.map((rows) => {
      const c = new Canvas(ref.SIZE[0], ref.SIZE[1]);
      rows.forEach((row, y) => {
        let x = 0;
        for (const m of row.matchAll(/(\D)(\d*)/g)) {
          const i = ref.ALPHABET.indexOf(m[1]);
          const n = m[2] ? Number(m[2]) : 1;
          if (i > 0) for (let k = 0; k < n; k++) c.set(x + k, y, pal[i]);
          x += n;
        }
      });
      return c;
    });
  }
  return out;
}

/** A beast with several animations sharing one frame: crops all of them to their union, `pad` px clear around it. */
function beastSprite(name: string, label: string, meters: [number, number], anims: [string, Canvas[], number, boolean][], ax: number, ay: number, pad = 1): WorldSprite {
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
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
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
  const f = refFrames(REF_FIRE);
  return beastSprite('fire', 'Phoenix (fire)', [2.2, 2.0], [['fly', f.fly, 12, true], ['dive', f.dive, 12, true], ['attack', f.attack, 12, false]], ...REF_FIRE.ANCHOR);
}

function raiju(): WorldSprite {
  const f = refFrames(REF_LIGHTNING);
  return beastSprite('lightning', 'Raiju (lightning)', [3, 1.5], [['fly', f.fly, 12, true]], ...REF_LIGHTNING.ANCHOR);
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
// The owner's crane from his new wind sheet (BEAST (WIND CRANE, NEWER)): his two frames are frames 0
// and 3 of the flap; tools/refs/beasts-from-ref.py (crane mode) copies them and swings his raised
// wings back about the shoulder for 1, 2, 4 and 5, writing vfx-beasts-ref-wind.ts.

/** Arm and hand directions of a wing (the crow's flap uses it). */
interface CraneWing {
  /** Arm and hand directions (degrees on screen: -90 up, 180 back) and how spread the hand is (0..1). */
  arm: number;
  hand: number;
  spread: number;
}

function windCrane(): WorldSprite {
  const f = refFrames(REF_WIND);
  return beastSprite('wind', 'Wind crane', [2.6, 2.0], [['fly', f.fly, 12, true]], ...REF_WIND.ANCHOR);
}

// =============================================================================================
// STONE DRAKE (earth)
// =============================================================================================
//
// The owner's stone drake from his earth sheet (the BEAST panel, where he painted a new four-legged
// drake over our old serpent and asked for the serpent to go): grey-brown rock plates, moss on the
// back, horns and spikes, glowing yellow eyes and a toothy jaw. His left picture (prowling) is fly
// frame 0 and his right one (the low charging lunge, dust kicking up behind the hind legs) is frame 5.
// Both stand on his one ground line with the eye at one x, so the lunge is a leap and his dust pile sits
// on the ground; the anchor is the middle of the prowl's torso. tools/refs/beasts-from-ref.py (drake
// mode) copies them and builds the in-betweens by turning his legs and tail about their joints (each
// joint bends smoothly, so it shows his own pixels and never a gap), pitching the body and carrying it
// along the leap, and growing, drifting and settling his dust, writing vfx-beasts-ref-earth.ts.

function stoneDrake(): WorldSprite {
  const f = refFrames(REF_EARTH);
  // 3 px clear on every side (the other beasts keep 1).
  return beastSprite('earth', 'Stone drake (earth)', [4.1, 2.5], [['fly', f.fly, 12, true]], REF_EARTH.ANCHOR[0], REF_EARTH.ANCHOR[1], 3);
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

// The gallop the fox runs with.
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
  ['fire', phoenix],
  ['water', waterDragon],
  ['wind', windCrane],
  ['lightning', raiju],
  ['earth', stoneDrake],
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
  if (phoenix && !sprites.some((s) => s.name === 'fire')) items.push({ c: phoenix.frames[0], ax: phoenix.anchor[0], ay: phoenix.anchor[1] });
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

// Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
if (!process.env.WORLD_OUT) {
  console.error('vfx-beasts: set WORLD_OUT=<dir> (the sheets wait there for approval; this never writes into src/assets).');
  process.exit(1);
}
const sprites: WorldSprite[] = BUILDERS.filter(([n]) => !FOCUS || FOCUS.includes(n)).map(([, f]) => f());
const dir = previewDir();
const stage = process.env.WORLD_OUT;
if (!FOCUS) {
  writeGroup('vfx_beasts', sprites);
  beastsLineup(sprites, dir, stage);
  beastsAnims(sprites, dir);
  beastsCompare(sprites, dir, stage);
  saveWhole(characterRef(), join(dir, 'beasts-character.png'));
}
for (const s of sprites) {
  strip(join(dir, `beasts-${s.name}-x.png`), s.anims.fly.frames, 4);
  for (const [key, a] of Object.entries(s.anims)) if (key !== 'fly') strip(join(dir, `beasts-${s.name}-${key}-x.png`), a.frames, 4);
  const f = s.anims.fly.frames[0];
  console.log(`${s.name.padEnd(10)} frame ${f.w}x${f.h} anchor ${s.anchor} frames ${s.anims.fly.frames.length}@${s.anims.fly.fps}`);
}
