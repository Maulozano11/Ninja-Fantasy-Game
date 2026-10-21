// Shared kit for the battle-map sprites (trees, props, animals). Each group lives in its own
// generator next to this file and writes a sprite sheet per object plus a manifest:
//
//   npx tsx tools/world-sprites/<group>.ts [previewDir]
//
//   src/assets/world/<group>/<name>.png   one row per animation, frames left to right
//   src/assets/world/<group>/manifest.json
//
// WORLD_OUT=<dir> writes the group under <dir>/<group>/ instead (art waiting for approval).
//
// The art follows the character standard (docs/SPRITE_STYLE_GUIDE.md) so props and characters
// read as one world: real proportions (1 m = 57 px, a character is about 1.75 m = 100 px),
// light from the upper left, 6-step hue-shifted ramps, clustered shading and a dark outline
// tinted by the material it surrounds.

import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { LEGENDARY_PRESETS } from '../../src/data/shinobiData';
import { renderSprite } from '../../src/sprite/compose';
import { getAppearance } from '../../src/sprite/legacy';
import { BOX, GRID } from '../../src/sprite/raster';

// --- scale --------------------------------------------------------------------------------

export const PX_PER_M = 57;
/** Meters to sprite pixels. */
export const m = (meters: number): number => Math.round(meters * PX_PER_M);
/** The near-black every outline is pulled toward (same as the characters). */
export const OUTLINE = '#07060b';
/** Unit vector toward the light (screen x right, y down, z toward the viewer): upper left. */
export const LIGHT: [number, number, number] = norm3(-0.55, -0.7, 0.45);

function norm3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

// --- color --------------------------------------------------------------------------------

export type Color = [number, number, number, number];
export const CLEAR: Color = [0, 0, 0, 0];

export function hex(h: string, a = 255): Color {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.replace(/./g, (c) => c + c) : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}
export function toHex(c: Color): string {
  return '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}
export function mix(a: Color, b: Color, t: number): Color {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t].map(Math.round) as Color;
}
export function withAlpha(c: Color, a: number): Color {
  return [c[0], c[1], c[2], Math.round(a)];
}

function rgbToHsl(c: Color): [number, number, number] {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h: number, s: number, l: number): Color {
  h = ((h % 360) + 360) % 360;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255), 255];
}
/** Rotates hue `deg` toward `target` (the short way), at most |deg|. */
function hueToward(h: number, target: number, deg: number): number {
  let d = ((target - h + 540) % 360) - 180;
  return h + Math.sign(d) * Math.min(Math.abs(d), deg);
}

/**
 * A 6-step hue-shifted ramp around `base` (step 3):
 * 0 outline, 1 dark, 2 shadow, 3 base, 4 light, 5 highlight.
 * Shadows drift cool (toward blue-violet) and lose a little saturation; highlights drift warm.
 */
export function ramp(base: string, opts: { shift?: number; spread?: number; outline?: string } = {}): Color[] {
  const shift = opts.shift ?? 14;
  const spread = opts.spread ?? 1;
  const [h, s, l] = rgbToHsl(hex(base));
  const step = (dl: number, dh: number, ds: number, warm: boolean): Color =>
    hslToRgb(hueToward(h, warm ? 50 : 245, dh), Math.max(0, Math.min(1, s * ds)), Math.max(0, Math.min(1, l + dl * spread)));
  const dark = step(-0.22, shift * 1.6, 0.9, false);
  return [
    mix(dark, hex(opts.outline ?? OUTLINE), 0.62),
    dark,
    step(-0.11, shift, 0.95, false),
    hex(base),
    step(0.09, shift * 0.8, 0.98, true),
    step(0.18, shift * 1.4, 0.85, true),
  ];
}

/**
 * Shared material bases (ramp step 3) so every group draws the same wood, stone and leaves.
 * Build ramps with `ramp(MATERIALS.wood)`; tweak `shift`/`spread` rather than inventing a new base.
 */
export const MATERIALS = {
  wood: '#8a5a34', // planks, barrels, crates, signboards
  woodDark: '#5e3d26', // old or wet wood, posts
  bark: '#5b4636', // tree trunks, logs
  barkCedar: '#6e4a3a', // reddish cedar and pine bark
  charred: '#2f2a2c', // burnt wood
  leaf: '#4f7a35', // broadleaf canopy
  leafDeep: '#3b6330', // pines, shaded foliage
  leafLight: '#7a9a3c', // young growth, grass tips
  grass: '#5d8a3a',
  moss: '#6b7f3a',
  stone: '#7a7c80', // lanterns, boulders
  stoneWarm: '#8a8070', // sandstone, river pebbles
  canvas: '#cdbb94', // tents, sacks
  rope: '#b49a6a',
  iron: '#5c6170', // hoops, nails, hinges
  paper: '#e8dfc8', // ofuda charms, lantern paper
  red: '#b3322c', // lacquer, explosive paint
  fire: '#f59e0b', // flames (glow: '#fde68a' core, '#ef4444' tips)
  water: '#3f7fa8',
  fur: '#9a7a5a', // rabbit, deer
} as const;

// --- noise and shading --------------------------------------------------------------------

/** Deterministic hash of integer coordinates to [0, 1). */
export function hash(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Smooth value noise in [0, 1) with features about `cell` pixels wide. */
export function noise(x: number, y: number, cell = 4, seed = 0): number {
  const fx = x / cell, fy = y / cell;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
/** Fractal noise: `octaves` layers of `noise`, halving the cell each time. */
export function fbm(x: number, y: number, cell = 8, octaves = 3, seed = 0): number {
  let sum = 0, amp = 1, tot = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x, y, cell / 2 ** o, seed + o * 101) * amp;
    tot += amp;
    amp *= 0.5;
  }
  return sum / tot;
}
/** 4x4 Bayer threshold in [0, 1). Use sparingly: the style prefers clusters to checkerboards. */
export function bayer4(x: number, y: number): number {
  const M = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  return M[(y & 3) * 4 + (x & 3)] / 16;
}

/** Lambert light (0..1, with a little ambient) for a surface normal. */
export function lambert(nx: number, ny: number, nz: number, ambient = 0.18): number {
  const l = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
  return Math.min(1, ambient + (1 - ambient) * l);
}
/** Light on a sphere/ellipsoid at local coords (u, v) in [-1, 1] (0 outside). */
export function sphereLight(u: number, v: number): number {
  const r2 = u * u + v * v;
  if (r2 > 1) return 0;
  return lambert(u, v, Math.sqrt(1 - r2));
}
/** Light across a vertical cylinder at u in [-1, 1] (left to right). */
export function cylinderLight(u: number): number {
  const c = Math.max(-1, Math.min(1, u));
  return lambert(c, 0, Math.sqrt(1 - c * c));
}

/**
 * Picks a ramp step for a light value in [0, 1]. Band edges are broken into 2-4 px clusters
 * by low-frequency noise (`jitter` is how far an edge may wander, in light units), so the
 * shading reads like brush strokes instead of smooth bands. `steps` lists the ramp indices
 * used from dark to light (default 1..5); most of an object should land on 1-3.
 */
export function band(light: number, x: number, y: number, opts: { steps?: number[]; jitter?: number; seed?: number; cell?: number; bias?: number } = {}): number {
  const steps = opts.steps ?? [1, 2, 3, 4, 5];
  const j = opts.jitter ?? 0.12;
  const t = light + (opts.bias ?? -0.08) + (noise(x, y, opts.cell ?? 2.5, opts.seed ?? 7) - 0.5) * 2 * j;
  const i = Math.max(0, Math.min(steps.length - 1, Math.floor(t * steps.length)));
  return steps[i];
}

// --- canvas -------------------------------------------------------------------------------

export type Paint = Color | ((x: number, y: number) => Color | null);
const paintAt = (p: Paint, x: number, y: number): Color | null => (typeof p === 'function' ? p(x, y) : p);

export class Canvas {
  readonly px: Uint8Array;
  constructor(readonly w: number, readonly h: number, px?: Uint8Array) {
    this.px = px ?? new Uint8Array(w * h * 4);
  }
  static fromRgba(w: number, h: number, rgba: ArrayLike<number>): Canvas {
    return new Canvas(w, h, Uint8Array.from(rgba));
  }
  clone(): Canvas {
    return new Canvas(this.w, this.h, new Uint8Array(this.px));
  }
  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): Color {
    if (!this.inside(x, y)) return CLEAR;
    const i = (y * this.w + x) * 4;
    return [this.px[i], this.px[i + 1], this.px[i + 2], this.px[i + 3]];
  }
  alpha(x: number, y: number): number {
    return this.inside(x, y) ? this.px[(y * this.w + x) * 4 + 3] : 0;
  }
  /** Overwrites a pixel (alpha 0 clears it). */
  set(x: number, y: number, c: Color): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
    this.px[i + 3] = c[3];
  }
  /** Alpha-blends a pixel over what is there. */
  plot(x: number, y: number, c: Color): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y) || c[3] === 0) return;
    if (c[3] === 255) return this.set(x, y, c);
    const d = this.get(x, y);
    const a = c[3] / 255, da = d[3] / 255;
    const oa = a + da * (1 - a);
    const ch = (k: number) => (oa ? (c[k] * a + d[k] * da * (1 - a)) / oa : 0);
    this.set(x, y, [ch(0), ch(1), ch(2), oa * 255].map(Math.round) as Color);
  }
  fillRect(x: number, y: number, w: number, h: number, p: Paint): void {
    for (let yy = Math.floor(y); yy < y + h; yy++) for (let xx = Math.floor(x); xx < x + w; xx++) this.paint(xx, yy, p);
  }
  /** Fills a polygon (even-odd, pixel centers). */
  fillPoly(pts: [number, number][], p: Paint): void {
    let y0 = Infinity, y1 = -Infinity;
    for (const [, y] of pts) {
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, Math.ceil(y1)); y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.paint(x, y, p);
    }
  }
  /** Fills an ellipse; a function paint also gets local coords via `ellipseUV`. */
  fillEllipse(cx: number, cy: number, rx: number, ry: number, p: Paint): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
        if (u * u + v * v <= 1) this.paint(x, y, p);
      }
  }
  /** A 1 px line (Bresenham), or a round-capped thick one. */
  line(x0: number, y0: number, x1: number, y1: number, p: Paint, width = 1): void {
    if (width > 1) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        this.fillEllipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2, width / 2, p);
      }
      return;
    }
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.paint(x0, y0, p);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  /** Quadratic bezier stroke through (x0,y0) -> control (cx,cy) -> (x1,y1). */
  curve(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, p: Paint, width = 1): void {
    const n = Math.max(2, Math.ceil(Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy)));
    let px = x0, py = y0;
    for (let i = 1; i <= n; i++) {
      const t = i / n, s = 1 - t;
      const x = s * s * x0 + 2 * s * t * cx + t * t * x1, y = s * s * y0 + 2 * s * t * cy + t * t * y1;
      this.line(px, py, x, y, p, width);
      px = x;
      py = y;
    }
  }
  private paint(x: number, y: number, p: Paint): void {
    if (!this.inside(x, y)) return;
    const c = paintAt(p, x, y);
    if (c) this.plot(x, y, c);
  }
  /** Draws another canvas on top at (dx, dy), optionally mirrored. */
  draw(src: Canvas, dx: number, dy: number, flip = false): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flip ? src.w - 1 - x : x, y);
        if (c[3]) this.plot(dx + x, dy + y, c);
      }
  }
  flipX(): Canvas {
    const out = new Canvas(this.w, this.h);
    out.draw(this, 0, 0, true);
    return out;
  }
  /** Recolors every opaque pixel through `fn` (keeps alpha). */
  map(fn: (c: Color, x: number, y: number) => Color | null): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (!c[3]) continue;
        const n = fn(c, x, y);
        if (n) this.set(x, y, [n[0], n[1], n[2], n[3] ?? c[3]]);
      }
  }
  /**
   * Adds the 1 px outline around the opaque shape: each empty pixel next to the shape takes
   * the darkest neighbor's color pulled toward near-black, so outlines stay tinted by the
   * material (dark green around leaves, dark brown around wood). `minAlpha` ignores faint
   * pixels such as smoke or glow.
   */
  outline(opts: { toward?: string; amount?: number; minAlpha?: number; diagonal?: boolean } = {}): void {
    const toward = hex(opts.toward ?? OUTLINE), amt = opts.amount ?? 0.7, minA = opts.minAlpha ?? 200;
    const nb = opts.diagonal ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const add: [number, number, Color][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) >= minA) continue;
        let best: Color | null = null, bestL = Infinity;
        for (const [ox, oy] of nb) {
          const c = this.get(x + ox, y + oy);
          if (c[3] < minA) continue;
          const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
          if (l < bestL) {
            bestL = l;
            best = c;
          }
        }
        if (best) add.push([x, y, mix([best[0], best[1], best[2], 255], toward, amt)]);
      }
    for (const [x, y, c] of add) this.set(x, y, c);
  }
  /** Bounding box of opaque pixels: [x0, y0, x1, y1] inclusive, or null if empty. */
  bounds(minAlpha = 1): [number, number, number, number] | null {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.alpha(x, y) >= minAlpha) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
    return x1 < 0 ? null : [x0, y0, x1, y1];
  }
  /** Scales up by an integer factor (nearest neighbor). */
  scaled(k: number): Canvas {
    const out = new Canvas(this.w * k, this.h * k);
    for (let y = 0; y < out.h; y++)
      for (let x = 0; x < out.w; x++) {
        const i = ((Math.floor(y / k) * this.w + Math.floor(x / k)) * 4), j = (y * out.w + x) * 4;
        out.px[j] = this.px[i];
        out.px[j + 1] = this.px[i + 1];
        out.px[j + 2] = this.px[i + 2];
        out.px[j + 3] = this.px[i + 3];
      }
    return out;
  }
  save(path: string): void {
    writePng(path, this.w, this.h, this.px);
  }
}

// --- PNG ----------------------------------------------------------------------------------

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function writePng(path: string, w: number, h: number, rgba: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array())]));
}

// --- sprites, sheets and manifests --------------------------------------------------------

export interface Anim {
  frames: Canvas[];
  /** Frames per second (0 for a still). */
  fps: number;
  /** Loops forever (default true); false plays once and holds the last frame. */
  loop?: boolean;
}
export interface WorldSprite {
  /** File name, e.g. 'barrel' (written as <group>/<name>.png). */
  name: string;
  /** What the game calls it, for tooltips and the map editor. */
  label: string;
  /** Real size in meters [width, height] (checks the proportions). */
  meters: [number, number];
  /** Ground contact point inside a frame, in pixels: where it touches the floor (y) at its center (x). */
  anchor: [number, number];
  /**
   * Gameplay hints for the battle engine: 'cover-half', 'cover-3q', 'blocks-sight', 'hide-spot',
   * 'destructible', 'flammable', 'explosive', 'climbable', 'interactable', 'light-source',
   * 'water', 'ambient' (decor that ignores collisions), 'animal'.
   */
  tags: string[];
  /** First animation is the default state; others are alternate states or one-shot effects. */
  anims: Record<string, Anim>;
}

/**
 * Writes one sheet per sprite (each animation is a row; every frame has the same size) and
 * the group's manifest.json, which the game reads to slice frames and place them by anchor.
 */
export function writeGroup(group: string, sprites: WorldSprite[], root = process.env.WORLD_OUT ?? join(import.meta.dirname, '../../src/assets/world')): void {
  const manifest: Record<string, unknown> = {};
  for (const s of sprites) {
    const anims = Object.entries(s.anims);
    const fw = Math.max(...anims.flatMap(([, a]) => a.frames.map((f) => f.w)));
    const fh = Math.max(...anims.flatMap(([, a]) => a.frames.map((f) => f.h)));
    const cols = Math.max(...anims.map(([, a]) => a.frames.length));
    const sheet = new Canvas(fw * cols, fh * anims.length);
    const rows: Record<string, unknown> = {};
    anims.forEach(([key, a], r) => {
      a.frames.forEach((f, c) => sheet.draw(f, c * fw, r * fh));
      rows[key] = { row: r, frames: a.frames.length, fps: a.fps, loop: a.loop ?? true };
    });
    sheet.save(join(root, group, `${s.name}.png`));
    manifest[s.name] = { label: s.label, file: `${s.name}.png`, frameW: fw, frameH: fh, anchor: s.anchor, meters: s.meters, tags: s.tags, anims: rows };
  }
  const path = join(root, group, 'manifest.json');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ group, pxPerMeter: PX_PER_M, sprites: manifest }, null, 1) + '\n');
}

// --- previews -----------------------------------------------------------------------------

/** The Solen preset standing idle, as a 128x128 canvas (the figure's box of the frame) with the feet at y = 120. */
export function characterRef(): Canvas {
  const preset = LEGENDARY_PRESETS.find((p) => p.character.name.startsWith('Solen')) ?? LEGENDARY_PRESETS[0];
  const f = renderSprite(getAppearance(preset.character), 'idle', 0);
  return Canvas.fromRgba(BOX.w, BOX.h, boxOf(f.rgba));
}

/** The figure's 128 x 128 box cut out of a GRID x GRID frame (the tools work in the old frame). */
export function boxOf(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(BOX.w * BOX.h * 4);
  for (let y = 0; y < BOX.h; y++) out.set(rgba.subarray(((BOX.y + y) * GRID + BOX.x) * 4, ((BOX.y + y) * GRID + BOX.x + BOX.w) * 4), y * BOX.w * 4);
  return out;
}
export const CHARACTER_FEET: [number, number] = [64, 120];

/**
 * Preview for reviewing a group: every sprite's first frame standing on one ground line next
 * to a character (for scale), then each animation as a strip of frames below. Saved at an
 * integer `scale` (default 2) so the pixels can be judged.
 */
export function preview(sprites: WorldSprite[], path: string, opts: { scale?: number; bg?: string; ground?: string; maxWidth?: number } = {}): void {
  const k = opts.scale ?? 2;
  const pad = 16;
  const ref = characterRef();
  const items: { c: Canvas; ax: number; ay: number }[] = [{ c: ref, ax: CHARACTER_FEET[0], ay: CHARACTER_FEET[1] }];
  for (const s of sprites) {
    const first = Object.values(s.anims)[0].frames[0];
    items.push({ c: first, ax: s.anchor[0], ay: s.anchor[1] });
  }
  // Lay the lineup out in rows no wider than maxWidth.
  const maxW = opts.maxWidth ?? 1400;
  const rows: { c: Canvas; ax: number; ay: number }[][] = [[]];
  let rowW = 0;
  for (const it of items) {
    if (rowW + it.c.w + pad > maxW && rows[rows.length - 1].length) {
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1].push(it);
    rowW += it.c.w + pad;
  }
  const lineup = rows.map((r) => {
    const above = Math.max(...r.map((it) => it.ay));
    const below = Math.max(...r.map((it) => it.c.h - it.ay));
    return { r, above, below, w: r.reduce((s, it) => s + it.c.w + pad, pad) };
  });
  const strips = sprites.flatMap((s) =>
    Object.entries(s.anims)
      .filter(([, a]) => a.frames.length > 1 || Object.keys(s.anims).length > 1)
      .map(([key, a]) => ({ s, key, a, w: a.frames.reduce((t, f) => t + f.w + 4, pad), h: Math.max(...a.frames.map((f) => f.h)) })),
  );
  const W = Math.max(maxW, ...lineup.map((l) => l.w), ...strips.map((s) => s.w));
  const H = lineup.reduce((t, l) => t + l.above + l.below + pad * 2, 0) + strips.reduce((t, s) => t + s.h + pad, pad);
  const out = new Canvas(W, H);
  const bg = hex(opts.bg ?? '#5d6b57'), ground = hex(opts.ground ?? '#4a5a3c');
  out.fillRect(0, 0, W, H, bg);
  let y = 0;
  for (const l of lineup) {
    const gy = y + pad + l.above;
    out.fillRect(0, gy, W, l.below + pad, ground);
    let x = pad;
    for (const it of l.r) {
      out.draw(it.c, x, gy - it.ay);
      x += it.c.w + pad;
    }
    y = gy + l.below + pad;
  }
  y += pad;
  for (const st of strips) {
    let x = pad;
    out.fillRect(0, y - 2, W, 1, hex('#45513f'));
    for (const f of st.a.frames) {
      out.draw(f, x, y + st.h - f.h);
      x += f.w + 4;
    }
    y += st.h + pad;
  }
  out.scaled(k).save(path);
}

/** Where a generator writes its preview: the first CLI argument, else ./world-preview. */
export function previewDir(): string {
  return process.argv[2] ?? join(process.cwd(), 'world-preview');
}
