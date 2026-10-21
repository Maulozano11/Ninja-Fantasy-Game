// Chakra auras and bursts drawn around a character sprite.
//
// Hard-pixel 16-bit FX: no blur, no anti-aliasing, a 5-tone palette per
// chakra color (0 darkest .. 4 core) and a tick counter that loops every
// CHAKRA_LOOP ticks. Effects read the sprite's own alpha so they can hug the
// silhouette, and are split into a `back` buffer (behind the sprite) and a
// `front` buffer (over it).
//
// Everything is computed on the FINE canvas (GRID x GRID). Rig joints live in
// 64-unit design space, so they are multiplied by RES; every length below is
// written in design units times S (= RES) so the effects keep their size if
// the resolution changes, while 1-fine-pixel details (sparks, bolt cores,
// rims) use the extra resolution.

import { hexToRgb, hslToHex, rgbToHsl } from './color';
import { GRID, RES } from './raster';
import type { Rig } from './rig';
import type { ChakraColorId } from './types';

export type ChakraMode = 'aura' | 'charge' | 'cast' | 'victory';

export interface ChakraInfo {
  id: ChakraColorId;
  name: string;
  hex: string;
  burst: string;
  /** The element the burst shows (fire, water...). Any color can be applied to it. */
  nature: string;
  desc: string;
}

export const CHAKRA_COLORS: ChakraInfo[] = [
  { id: 'red', name: 'Crimson', hex: '#e8321e', burst: 'Pyre Crown', nature: 'Fire', desc: 'Tongues of flame lick upward from the whole body.' },
  { id: 'orange', name: 'Ember', hex: '#f27c18', burst: 'Cinder Nova', nature: 'Embers', desc: 'Embers explode outward as a shockwave rolls out from the feet.' },
  { id: 'yellow', name: 'Thunder', hex: '#f0c818', burst: 'Storm Lash', nature: 'Lightning', desc: 'Jagged bolts crackle and arc around the body.' },
  { id: 'green', name: 'Gale', hex: '#3dbc48', burst: 'Leafwind Spiral', nature: 'Wind', desc: 'A rising whirlwind of wind and leaves wraps the body.' },
  { id: 'blue', name: 'Tide', hex: '#36a0f0', burst: 'Rising Tide', nature: 'Water', desc: 'Rings of water climb the body, shedding droplets.' },
  { id: 'indigo', name: 'Dusk', hex: '#4a3eb0', burst: 'Nightveil Mist', nature: 'Shadow', desc: 'Shadow smoke streams backward in curling tendrils.' },
  { id: 'violet', name: 'Phantom', hex: '#a54ce0', burst: 'Spectral Guardian', nature: 'Spirit', desc: 'A towering ghost warrior looms behind the user.' },
  { id: 'white', name: 'Radiant', hex: '#f4f1e4', burst: 'Heaven Pillar', nature: 'Light', desc: 'A pillar of light falls while rays fan out from the heart.' },
  { id: 'black', name: 'Void', hex: '#1a0b22', burst: 'Abyss Orbit', nature: 'Void', desc: 'Black orbs orbit the body as space cracks open around it.' },
];

/** Number of ticks in one animation loop (the caller advances tick at ~12 fps). */
export const CHAKRA_LOOP = 24;

// ---------------------------------------------------------------------------
// Basics
// ---------------------------------------------------------------------------

const N = GRID;
const S = RES;
const TAU = Math.PI * 2;
type RGB = readonly [number, number, number];
type Pal = RGB[];
type P = { x: number; y: number };
type Lay = 0 | 1;

const col = (h: string): RGB => hexToRgb(h) as RGB;
const pal = (...hex: string[]): Pal => hex.map(col);

/** 5 tones: 0 darkest edge, 1 dark, 2 mid, 3 bright, 4 core. */
const PALS: Record<ChakraColorId, Pal> = {
  red: pal('#5c0b16', '#b3161c', '#ec3a1c', '#ff9a2e', '#ffeb8a'),
  orange: pal('#5a1e06', '#b4440c', '#f27c18', '#ffbe3c', '#fff4b8'),
  yellow: pal('#4a3000', '#a87400', '#f0c818', '#fff27a', '#ffffff'),
  green: pal('#0b3a1e', '#1d7a34', '#3dbc48', '#9ef06a', '#eaffd2'),
  blue: pal('#0a2560', '#1858c0', '#36a0f0', '#90e0ff', '#ffffff'),
  indigo: pal('#120c34', '#2a2174', '#4a3eb0', '#7f74e4', '#c8c0ff'),
  violet: pal('#2a0a44', '#62209a', '#a54ce0', '#d996ff', '#f8e6ff'),
  white: pal('#6e5a26', '#c4a24c', '#efe2b4', '#fffbe8', '#ffffff'),
  black: pal('#000000', '#0e0614', '#4a1470', '#a238f0', '#ff2c50'),
};

/**
 * The 5-tone palette for a tint: one of the chakra colors (hand-tuned
 * palette) or any '#rrggbb' (generated: dark edge, dark, the color itself,
 * bright, near-white core). The jutsu effects use it too (vfxTint.ts), so they match the aura.
 */
export function tintPal(tint: string): Pal {
  if (Object.prototype.hasOwnProperty.call(PALS, tint)) return PALS[tint as ChakraColorId];
  const [r, g, b] = hexToRgb(tint);
  const [h, s, l] = rgbToHsl(r, g, b);
  if (l < 0.22) {
    // black-ish: a dark core that still reads, with a cold grey glint
    return pal(hslToHex(h, s, 0.02), hslToHex(h, s, l * 0.5 + 0.03), tint, hslToHex(h, s * 0.8, l + 0.2), hslToHex(h, s * 0.5, l + 0.45));
  }
  if (l > 0.8) {
    // white-ish: warm-grey edges so the light still has a shape
    return pal(hslToHex(h, s * 0.6, l - 0.55), hslToHex(h, s * 0.7, l - 0.3), tint, hslToHex(h, s * 0.5, (l + 1) / 2), '#ffffff');
  }
  return pal(
    hslToHex(h, Math.min(1, s + 0.1), l * 0.3),
    hslToHex(h, Math.min(1, s + 0.05), l * 0.62),
    tint,
    hslToHex(h, s * 0.95, Math.min(0.86, l + 0.2)),
    hslToHex(h, s * 0.6, Math.min(0.97, l + 0.42)),
  );
}

const SEEDS: Record<ChakraColorId, number> = {
  red: 101,
  orange: 211,
  yellow: 307,
  green: 401,
  blue: 503,
  indigo: 601,
  violet: 701,
  white: 809,
  black: 907,
};

function hash(a: number, b = 0, c = 0, d = 0): number {
  let h = Math.imul((a | 0) ^ 0x5bd1e995, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 15) ^ (b | 0), 0x165667b1);
  h = Math.imul(h ^ (h >>> 13) ^ (c | 0), 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16) ^ (d | 0), 0x85ebca77);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

function rng(seed: number): () => number {
  let i = 0;
  return () => hash(seed, i++, 0x51);
}

const mod = (a: number, m: number) => ((a % m) + m) % m;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const pulse = (t: number, period = 12, ph = 0) => 0.5 + 0.5 * Math.sin(TAU * (t / period + ph));

const tables = new Map<number, Float32Array>();

/** Value noise, periodic in x (px cells) and y (py cells); lattice values are cached per seed. */
function vnoise(x: number, y: number, px: number, py: number, seed: number): number {
  const key = (seed * 4099 + px) * 4099 + py;
  let T = tables.get(key);
  if (!T) {
    T = new Float32Array(px * py);
    for (let j = 0; j < py; j++) for (let i = 0; i < px; i++) T[j * px + i] = hash(i, j, seed);
    tables.set(key, T);
  }
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const x0 = mod(xi, px);
  const x1 = (x0 + 1) % px;
  const y0 = mod(yi, py) * px;
  const y1 = ((mod(yi, py) + 1) % py) * px;
  const a = T[y0 + x0] + (T[y0 + x1] - T[y0 + x0]) * sx;
  const b = T[y1 + x0] + (T[y1 + x1] - T[y1 + x0]) * sx;
  return a + (b - a) * sy;
}

/**
 * Two-octave noise scrolling by (vx, vy) fine px per tick that loops exactly
 * every CHAKRA_LOOP ticks: LOOP*v must be a multiple of the cell size on each
 * moving axis. `o2` is the weight of the finer octave.
 */
function flow(x: number, y: number, t: number, cx: number, cy: number, vx: number, vy: number, seed: number, o2 = 0.32): number {
  const px = vx ? Math.round((CHAKRA_LOOP * Math.abs(vx)) / cx) : 64;
  const py = vy ? Math.round((CHAKRA_LOOP * Math.abs(vy)) / cy) : 64;
  const X = x - t * vx;
  const Y = y - t * vy;
  const a = vnoise(X / cx, Y / cy, px, py, seed);
  if (!o2) return a;
  const b = vnoise(X / (cx / 2), Y / (cy / 2), px * 2, py * 2, seed + 17);
  return a * (1 - o2) + b * o2;
}

class Fx {
  back = new Uint8ClampedArray(N * N * 4);
  front = new Uint8ClampedArray(N * N * 4);
  /** Writes a pixel unless a more opaque one is already there. */
  put(layer: Lay, x: number, y: number, c: RGB, a = 255): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= N || y >= N || a <= 0) return;
    const buf = layer ? this.front : this.back;
    const i = (y * N + x) * 4;
    if (buf[i + 3] > a) return;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = a;
  }
}

function bres(x0: number, y0: number, x1: number, y1: number, cb: (x: number, y: number, k: number) => void): void {
  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  x1 = Math.floor(x1);
  y1 = Math.floor(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let k = 0;
  for (;;) {
    cb(x0, y0, k++);
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

/** Rasterized ellipse outline (each pixel once); cb gets the pixel and its angle. */
function ellipsePx(cx: number, cy: number, rx: number, ry: number, cb: (x: number, y: number, a: number) => void): void {
  const seen = new Set<number>();
  const steps = Math.max(16, Math.ceil(Math.max(rx, ry) * 8));
  for (let s = 0; s < steps; s++) {
    const a = (s / steps) * TAU;
    const x = Math.floor(cx + Math.cos(a) * rx);
    const y = Math.floor(cy + Math.sin(a) * ry);
    const k = (y + 4096) * 8192 + x + 4096;
    if (seen.has(k)) continue;
    seen.add(k);
    cb(x, y, a);
  }
}

/** Paints a tiny sprite given as rows of tone digits ('.' = empty). */
function stamp(fx: Fx, layer: Lay, p: Pal, x: number, y: number, rows: string[], a = 255): void {
  const ox = Math.round(x - rows[0].length / 2);
  const oy = Math.round(y - rows.length / 2);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row.charCodeAt(i) - 48;
      if (ch >= 0 && ch <= 4) fx.put(layer, ox + i, oy + j, p[ch], a);
    }
  });
}

// ---------------------------------------------------------------------------
// Sources: the shape an effect wraps around (the whole body, or an orb at a hand)
// ---------------------------------------------------------------------------

interface Src {
  mask: Uint8Array;
  /** 8-neighbour distance from the mask: 0 inside, 1.. outside, 255 far. */
  dist: Uint8Array;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  cx: number;
  cy: number;
  rowL: Int16Array;
  rowR: Int16Array;
  /** Indices of the pixels at distance 1. */
  rim: number[];
  point: boolean;
  /** Which hand a point source sits on. */
  hand?: 'N' | 'F';
  anchor: P;
  dir: P;
  r: number;
  /** Buffer for the "behind" part of an effect (back for the body, front for a hand orb). */
  layer: Lay;
}

function analyze(mask: Uint8Array, point: boolean, anchor: P, dir: P, r: number): Src {
  const dist = new Uint8Array(N * N).fill(255);
  let q: number[] = [];
  let x0 = N;
  let x1 = -1;
  let y0 = N;
  let y1 = -1;
  const rowL = new Int16Array(N).fill(-1);
  const rowR = new Int16Array(N).fill(-1);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (!mask[i]) continue;
      dist[i] = 0;
      q.push(i);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (rowL[y] < 0) rowL[y] = x;
      rowR[y] = x;
    }
  for (let d = 1; d <= 12 && q.length; d++) {
    const nq: number[] = [];
    for (const i of q) {
      const x = i % N;
      const y = (i - x) / N;
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const j = ny * N + nx;
          if (dist[j] !== 255) continue;
          dist[j] = d;
          nq.push(j);
        }
    }
    q = nq;
  }
  const rim: number[] = [];
  for (let i = 0; i < N * N; i++) if (dist[i] === 1) rim.push(i);
  if (x1 < 0) {
    x0 = x1 = Math.floor(anchor.x);
    y0 = y1 = Math.floor(anchor.y);
  }
  return { mask, dist, x0, x1, y0, y1, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2, rowL, rowR, rim, point, anchor, dir, r, layer: point ? 1 : 0 };
}

const F = (p: P): P => ({ x: p.x * S, y: p.y * S });

function bodySrc(sprite: Uint8ClampedArray, rig: Rig): Src {
  const mask = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) mask[i] = sprite[i * 4 + 3] > 0 ? 1 : 0;
  const s = analyze(mask, false, F(rig.T(0, rig.bp.torsoLen * 0.55)), { x: 1, y: 0 }, 0);
  s.cx = (rig.pelvis.x + 0.5) * S;
  return s;
}

function pointSrc(at: P, dir: P, r: number): Src {
  const mask = new Uint8Array(N * N);
  for (let y = Math.max(0, Math.floor(at.y - r - 1)); y <= Math.min(N - 1, at.y + r + 1); y++)
    for (let x = Math.max(0, Math.floor(at.x - r - 1)); x <= Math.min(N - 1, at.x + r + 1); x++) {
      const dx = x + 0.5 - at.x;
      const dy = y + 0.5 - at.y;
      if (dx * dx + dy * dy <= r * r) mask[y * N + x] = 1;
    }
  return analyze(mask, true, at, dir, r);
}

function handSrc(rig: Rig, which: 'N' | 'F', r: number, push: number): Src {
  const hand = F(which === 'N' ? rig.handN : rig.handF);
  const wrist = F(which === 'N' ? rig.wristN : rig.wristF);
  const dx = hand.x - wrist.x;
  const dy = hand.y - wrist.y;
  const l = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / l, y: dy / l };
  const s = pointSrc({ x: hand.x + dir.x * push, y: hand.y + dir.y * push }, dir, r);
  s.hand = which;
  return s;
}

/** Half width of the source around its center at a row (nearest filled row if empty). */
function halfW(s: Src, y: number): number {
  y = clamp(Math.floor(y), s.y0, s.y1);
  for (let k = 0; k < 16; k++) {
    for (const yy of [y - k, y + k]) {
      if (yy < 0 || yy >= N || s.rowL[yy] < 0) continue;
      return Math.max(Math.abs(s.rowL[yy] - s.cx), Math.abs(s.rowR[yy] + 1 - s.cx));
    }
  }
  return (s.x1 - s.x0) / 2;
}

/**
 * Anisotropic distance field around the source, normalized so 1 = the reach.
 * Plumes extend `up` px above the shape, `down` below, `front` toward the
 * facing side (+x) and `back` behind it. Inside the mask the value is -1.
 */
function plume(s: Src, front: number, back: number, up: number, down: number): Float32Array {
  const f = new Float32Array(N * N).fill(99);
  const nl = new Int16Array(N * N);
  const nr = new Int16Array(N * N);
  for (let y = 0; y < N; y++) {
    let last = -9999;
    for (let x = 0; x < N; x++) {
      if (s.mask[y * N + x]) last = x;
      nl[y * N + x] = last;
    }
    last = 9999;
    for (let x = N - 1; x >= 0; x--) {
      if (s.mask[y * N + x]) last = x;
      nr[y * N + x] = last;
    }
  }
  const du = Math.ceil(up);
  const dd = Math.ceil(down);
  const reach = Math.ceil(Math.max(front, back));
  for (let y = Math.max(0, s.y0 - du); y <= Math.min(N - 1, s.y1 + dd); y++)
    for (let x = Math.max(0, s.x0 - reach); x <= Math.min(N - 1, s.x1 + reach); x++) {
      const i = y * N + x;
      if (s.mask[i]) {
        f[i] = -1;
        continue;
      }
      let best = 99;
      for (let oy = -dd; oy <= du; oy++) {
        const by = y + oy; // oy > 0: the body row is below this pixel
        if (by < 0 || by >= N) continue;
        const wy = oy >= 0 ? oy / up : -oy / down;
        if (wy >= best) continue;
        const l = nl[by * N + x];
        const r = nr[by * N + x];
        if (l > -9999) {
          const wx = (x - l) / front; // body on the left: this pixel is on the facing side
          const c = Math.sqrt(wx * wx + wy * wy);
          if (c < best) best = c;
        }
        if (r < 9999) {
          const wx = (r - x) / back;
          const c = Math.sqrt(wx * wx + wy * wy);
          if (c < best) best = c;
        }
      }
      f[i] = best;
    }
  return f;
}

/** First point at distance >= d from the source along a ray from (ox, oy). */
function rayToRing(s: Src, ox: number, oy: number, ang: number, d: number): P {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let last = { x: ox, y: oy };
  let inside = false;
  for (let r = 0; r < N; r += 0.5) {
    const x = Math.floor(ox + dx * r);
    const y = Math.floor(oy + dy * r);
    if (x < 0 || y < 0 || x >= N || y >= N) break;
    const dv = s.dist[y * N + x];
    if (dv === 0) inside = true;
    last = { x, y };
    if (inside && dv >= d) return last;
  }
  return last;
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

interface Ctx {
  fx: Fx;
  t: number;
  pal: Pal;
  seed: number;
  rig: Rig;
  sprite: Uint8ClampedArray;
  /** Tone of the glow rim (red sits one tone lower: its bright tones lean orange). */
  rimBase: number;
  /** Accent sparks of the void burst: red for the void palette, the core tone otherwise. */
  accent: RGB;
  accentDark: RGB;
}

/** Pulsing glow rim hugging the silhouette (1 design px that swells to 2 on the beat). */
function rimGlow(c: Ctx, s: Src, level: number): void {
  const p = pulse(c.t);
  const a = Math.round(clamp(140 + 60 * level + 60 * p, 0, 255));
  const base = c.rimBase;
  const tn = p > 0.7 ? base + 1 : base;
  for (const i of s.rim) c.fx.put(0, i % N, Math.floor(i / N), c.pal[tn], a);
  const outer = level >= 0.6 || p > 0.45;
  for (let i = 0; i < N * N; i++) {
    const d = s.dist[i];
    if (d === 2 && outer) c.fx.put(0, i % N, Math.floor(i / N), c.pal[base - 1], Math.round(120 + 60 * level));
    else if (d === 3 && level >= 0.9 && p > 0.5) c.fx.put(0, i % N, Math.floor(i / N), c.pal[1], 120);
  }
}

/** Ember-like particle that ages from core color to dark. */
function mote(c: Ctx, layer: Lay, x: number, y: number, age01: number, big: boolean): void {
  const tone = age01 < 0.25 ? 4 : age01 < 0.5 ? 3 : age01 < 0.8 ? 2 : 1;
  c.fx.put(layer, x, y, c.pal[tone]);
  if (big && age01 < 0.6) {
    c.fx.put(layer, x + 1, y, c.pal[tone - 1]);
    c.fx.put(layer, x, y + 1, c.pal[tone - 1]);
    c.fx.put(layer, x + 1, y + 1, c.pal[Math.max(1, tone - 2)]);
  }
}

/** Particle life cycle: [age 0..life-1, cycle id] for particle k (loops with CHAKRA_LOOP). */
function cycle(t: number, k: number, life: number, seed: number): [number, number] {
  const off = Math.floor(hash(k, seed, 99) * life);
  const age = (t + off) % life;
  const cyc = Math.floor((t + off) / life) % Math.max(1, Math.round(CHAKRA_LOOP / life));
  return [age, cyc];
}

/**
 * Paints a plume field cut by a per-pixel threshold (0..1), in tone bands
 * [limit, tone, alpha]. Lone pixels (fewer than 2 filled 4-neighbours) are
 * dropped so the shapes stay clean.
 */
function paintField(c: Ctx, f: Float32Array, layer: Lay, thrAt: (x: number, y: number) => number, bands: [number, number, number][]): void {
  const band = new Int8Array(N * N).fill(-1);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const v = f[y * N + x];
      if (v < 0 || v >= 1) continue;
      const thr = thrAt(x, y);
      if (v >= thr) continue;
      const q = v / thr;
      for (let k = 0; k < bands.length; k++)
        if (q < bands[k][0]) {
          band[y * N + x] = k;
          break;
        }
    }
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && (band[y * N + x] >= 0 || f[y * N + x] < 0);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const k = band[y * N + x];
      if (k < 0) continue;
      const nb = +filled(x - 1, y) + +filled(x + 1, y) + +filled(x, y - 1) + +filled(x, y + 1);
      if (nb < 2) continue;
      c.fx.put(layer, x, y, c.pal[bands[k][1]], bands[k][2]);
    }
}

function fillOrb(c: Ctx, s: Src, tones: [number, number, number], layer: Lay = 1): void {
  // lit from the upper left: highlight, body, shade
  for (let y = s.y0; y <= s.y1; y++)
    for (let x = s.x0; x <= s.x1; x++) {
      if (!s.mask[y * N + x]) continue;
      const dx = (x + 0.5 - s.anchor.x) / s.r;
      const dy = (y + 0.5 - s.anchor.y) / s.r;
      const tone = dx + dy < -0.55 ? tones[0] : dx + dy < 0.6 ? tones[1] : tones[2];
      c.fx.put(layer, x, y, c.pal[tone]);
    }
}

// ---------------------------------------------------------------------------
// RED - Pyre Crown: flame tongues licking up from the silhouette
// ---------------------------------------------------------------------------

/** Adds one flame tongue (round base, curved pointed tip) to a heat field (max blend). */
function tongue(heat: Float32Array, cx: number, cy: number, rad: number, h: number, sway: number, str: number): void {
  const x0 = Math.max(0, Math.floor(cx - rad - Math.abs(sway) - 1));
  const x1 = Math.min(N - 1, Math.ceil(cx + rad + Math.abs(sway) + 1));
  const y0 = Math.max(0, Math.floor(cy - h));
  const y1 = Math.min(N - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5;
      const dy = y + 0.5 - cy;
      let v: number;
      if (dy >= 0) v = 1 - Math.hypot(px - cx, dy) / rad;
      else {
        const u = -dy / h;
        if (u >= 1) continue;
        const hw = rad * Math.pow(1 - u, 1.25);
        v = (1 - Math.abs(px - cx - sway * u * u) / hw) * (1 - 0.4 * u);
      }
      v *= str;
      const i = y * N + x;
      if (v > heat[i]) heat[i] = v;
    }
}

/** Paints a heat field in tone bands [min heat, tone, alpha], dropping lone pixels. */
function paintHeat(c: Ctx, heat: Float32Array, layer: Lay, bands: [number, number, number][], skip?: Uint8Array): void {
  const lit = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && (heat[y * N + x] > bands[bands.length - 1][0] || (skip ? skip[y * N + x] > 0 : false));
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const h = heat[i];
      if (h <= bands[bands.length - 1][0] || (skip && skip[i])) continue;
      if (+lit(x - 1, y) + +lit(x + 1, y) + +lit(x, y - 1) + +lit(x, y + 1) < 2) continue;
      for (const [min, tone, a] of bands)
        if (h > min) {
          c.fx.put(layer, x, y, c.pal[tone], a);
          break;
        }
    }
}

function redBurst(c: Ctx, s: Src, L: number): void {
  const { t } = c;
  const pt = s.point;
  const heat = new Float32Array(N * N);
  // an inner glow hugging the shape, flickering a little
  const baseR = (pt ? 1.5 : 1 + 0.9 * L) * S;
  for (let i = 0; i < N * N; i++) {
    const d = s.dist[i];
    if (d === 0 || d > baseR + 1) continue;
    heat[i] = 1.02 - ((d - 1) / baseR) * 0.62 - 0.36 * flow(i % N, Math.floor(i / N), t, 2 * S, 3 * S, 0, -S, c.seed + 4, 0);
  }
  // tongues licking up from the silhouette (mostly from upward-facing edges)
  const tops = s.rim.filter((i) => i + 2 * N < N * N && (s.mask[i + N] || s.mask[i + 2 * N]));
  const n = pt ? 12 : Math.round(14 + 28 * L);
  const life = 8;
  for (let k = 0; k < n; k++) {
    const [age, cyc] = cycle(t, k, life, c.seed);
    const r = rng(c.seed + 7 + k * 131 + cyc * 977);
    const pool = r() < 0.6 && tops.length ? tops : s.rim;
    const i0 = pool[Math.floor(r() * pool.length)] ?? 0;
    const u = age / life;
    const r0 = (pt ? 1.6 + r() * 1.2 : 2.2 + r() * (1.2 + 1.8 * L)) * S;
    const rad = r0 * (1 - 0.5 * u);
    const h = rad * (2.4 + r() * 1.6);
    const rise = (pt ? 1.1 : 1 + 0.9 * L) * (0.8 + r() * 0.6) * S * age;
    const sway = (r() - 0.5) * 3 * S + Math.sin(TAU * (t / 12) + k) * 0.8 * S;
    tongue(heat, (i0 % N) + 0.5 + (r() - 0.5) * S, Math.floor(i0 / N) + 0.5 - rad * 0.2 - rise, rad, h, sway, 1.08 - 0.6 * u);
  }
  paintHeat(c, heat, s.layer, [
    [0.8, 4, 255],
    [0.6, 3, 255],
    [0.36, 2, 255],
    [0.13, 1, 240],
  ]);
  if (pt) fillOrb(c, s, [4, 4, 3]);
  // sparks rising off the flame tips
  const ns = Math.round((pt ? 3 : 4) + 6 * L);
  for (let k = 0; k < ns; k++) {
    const [age, cyc] = cycle(t, k, 12, c.seed + 1);
    const r = rng(c.seed + k * 31 + cyc * 7);
    const x0 = s.x0 - S + r() * (s.x1 - s.x0 + 2 * S);
    const y0 = s.y0 + r() * (s.y1 - s.y0) * 0.4 - (pt ? 2 : 4) * L * S;
    const x = x0 + Math.sin(age * 0.7 + r() * 6) * 1.2 * S;
    const y = y0 - age * (1.2 + r()) * S;
    mote(c, 1, x, y, age / 12, r() < 0.3);
  }
}

// ---------------------------------------------------------------------------
// ORANGE - Cinder Nova: exploding embers + an expanding shockwave ring
// ---------------------------------------------------------------------------

/** A glowing particle with a motion trail pointing back along (vx, vy). */
function streak(c: Ctx, layer: Lay, x: number, y: number, vx: number, vy: number, len: number, tone: number, big: boolean): void {
  const l = Math.hypot(vx, vy) || 1;
  const tx = x - (vx / l) * len;
  const ty = y - (vy / l) * len;
  const pts: P[] = [];
  bres(x, y, tx, ty, (px, py) => pts.push({ x: px, y: py }));
  pts.forEach((p, k) => {
    const u = k / Math.max(1, pts.length - 1);
    const tn = Math.max(1, tone - Math.floor(u * 3));
    c.fx.put(layer, p.x, p.y, c.pal[tn], u > 0.7 ? 200 : 255);
  });
  if (big) {
    c.fx.put(layer, x + 1, y, c.pal[tone]);
    c.fx.put(layer, x, y + 1, c.pal[Math.max(1, tone - 1)]);
    c.fx.put(layer, x + 1, y + 1, c.pal[Math.max(1, tone - 1)]);
  }
  c.fx.put(layer, x, y, c.pal[Math.min(4, tone + 1)]);
}

function orangeBurst(c: Ctx, s: Src, L: number): void {
  const { fx, pal, t } = c;
  const pt = s.point;
  // flickering heat rim
  for (const i of s.rim) {
    const x = i % N;
    const y = Math.floor(i / N);
    const n = flow(x, y, t, 2 * S, 3 * S, 0, -S, c.seed);
    fx.put(s.layer, x, y, pal[n > 0.55 ? 4 : 3], n > 0.3 ? 255 : 170);
  }
  if (L > 0.5)
    for (let i = 0; i < N * N; i++) {
      const d = s.dist[i];
      if (d < 2 || d > 3) continue;
      const n = flow(i % N, Math.floor(i / N), t, 2 * S, 4 * S, 0, -2 * S, c.seed + 3);
      if (n > (d === 2 ? 0.38 : 0.58)) fx.put(s.layer, i % N, Math.floor(i / N), pal[d === 2 ? 2 : 1], 230);
    }

  const heatB = new Float32Array(N * N);
  const heatF = new Float32Array(N * N);
  // shockwave rings (two staggered waves at full power), each with a ring of fire puffs
  const waves = L >= 0.9 ? 2 : 1;
  for (let w = 0; w < waves; w++) {
    const a = mod(t + w * 6, 12) / 12;
    const tone = a < 0.3 ? 4 : a < 0.6 ? 3 : a < 0.85 ? 2 : 1;
    if (!pt) {
      const cx = s.cx;
      const cy = s.y1 + 0.5;
      const rx = (5 + a * (14 + 14 * L)) * S;
      const ry = Math.max(1.5 * S, rx * 0.26);
      ellipsePx(cx, cy, rx, ry, (x, y, ang) => {
        const front = Math.sin(ang) > 0;
        const lay: Lay = front ? 1 : 0;
        fx.put(lay, x, y, pal[tone]);
        const inner = a < 0.35 ? 3 : a < 0.7 ? 2 : 0;
        for (let k = 1; k <= inner; k++) fx.put(lay, x, y + (front ? -k : k), pal[Math.max(1, tone - k)]);
        if (a < 0.6) fx.put(lay, x, y + (front ? 1 : -1), pal[1], 220);
      });
      // the flash on impact
      if (a < 0.17)
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
          for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
            const e = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
            if (e < 1) fx.put(y >= cy ? 1 : 0, x, y, pal[e < 0.4 ? 4 : 3], 200);
          }
      // fire puffs riding the wave
      if (a < 0.75) {
        const np = Math.round(5 + 4 * L);
        for (let k = 0; k < np; k++) {
          const ang = (k / np) * TAU + hash(k, w, c.seed) * 0.6;
          const front = Math.sin(ang) > 0;
          const rad = (2.4 - a * 2) * S * (0.8 + hash(k, w, c.seed + 1) * 0.5);
          if (rad < S * 0.6) continue;
          tongue(front ? heatF : heatB, cx + Math.cos(ang) * rx * 0.92, cy + Math.sin(ang) * ry * 0.92 - a * 4 * S, rad, rad * 2, (hash(k, 3, c.seed) - 0.5) * 2 * S, 1.1 - a * 0.9);
        }
      }
    } else {
      // a vertical blast ring pushed forward from the palm
      const d = (1.5 + a * (3 + 3 * L)) * S;
      const cx = s.anchor.x + s.dir.x * d;
      const cy = s.anchor.y + s.dir.y * d;
      ellipsePx(cx, cy, (1 + a * 2.5) * S, (2.5 + a * (5 + 4 * L)) * S, (x, y, ang) => {
        fx.put(1, x, y, pal[tone]);
        if (a < 0.6) fx.put(1, x - (Math.cos(ang) > 0 ? 1 : -1), y, pal[Math.max(1, tone - 1)]);
      });
      tongue(heatF, s.anchor.x, s.anchor.y, s.r + (1.5 + pulse(t, 6)) * S, s.r * 3, 0, 1);
    }
  }
  const bands: [number, number, number][] = [
    [0.75, 4, 255],
    [0.5, 3, 255],
    [0.28, 2, 255],
    [0.1, 1, 235],
  ];
  paintHeat(c, heatB, 0, bands);
  paintHeat(c, heatF, 1, bands);
  if (pt) fillOrb(c, s, [4, 4, 3]);

  // exploding embers with motion trails
  const n = Math.round((pt ? 10 : 12) + 22 * L);
  const life = 12;
  for (let k = 0; k < n; k++) {
    const [age, cyc] = cycle(t, k, life, c.seed + 1);
    const r = rng(c.seed + 1000 + k * 13 + cyc * 101);
    let ox: number;
    let oy: number;
    let dx: number;
    let dy: number;
    if (pt) {
      ox = s.anchor.x;
      oy = s.anchor.y;
      const ang = Math.atan2(s.dir.y, s.dir.x) + (r() - 0.5) * 2.4;
      dx = Math.cos(ang);
      dy = Math.sin(ang);
    } else {
      const i = s.rim[Math.floor(r() * s.rim.length)] ?? 0;
      ox = i % N;
      oy = Math.floor(i / N);
      dx = ox - s.cx + (r() - 0.5) * 8 * S;
      dy = oy - s.cy - 6 * S;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
    }
    const sp = (1.4 + r() * 2.2 * (0.5 + L * 0.5)) * S;
    // decelerating burst that ends floating upward
    const u = age / life;
    const travel = sp * age * (1 - u * 0.55);
    const x = ox + dx * travel;
    const y = oy + dy * travel - 0.05 * S * age * age;
    const vx = dx * sp * (1 - u * 1.1);
    const vy = dy * sp * (1 - u * 1.1) - 0.1 * S * age;
    const tone = u < 0.3 ? 4 : u < 0.55 ? 3 : u < 0.8 ? 2 : 1;
    streak(c, r() < 0.65 ? 1 : 0, x, y, vx, vy, Math.min(4 * S, Math.hypot(vx, vy) * 1.3), tone, r() < 0.5 && u < 0.6);
  }
}

// ---------------------------------------------------------------------------
// YELLOW - Storm Lash: crackling lightning arcing around the body
// ---------------------------------------------------------------------------

function boltPath(a: P, b: P, bulge: P, rough: number, depth: number, r: () => number): P[] {
  let pts: P[] = [a, { x: (a.x + b.x) / 2 + bulge.x, y: (a.y + b.y) / 2 + bulge.y }, b];
  for (let d = 0; d < depth; d++) {
    const out: P[] = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const p = pts[k - 1];
      const q = pts[k];
      const l = Math.hypot(q.x - p.x, q.y - p.y);
      const nx = -(q.y - p.y) / (l || 1);
      const ny = (q.x - p.x) / (l || 1);
      const o = (r() - 0.5) * l * rough;
      out.push({ x: (p.x + q.x) / 2 + nx * o, y: (p.y + q.y) / 2 + ny * o });
      out.push(q);
    }
    pts = out;
  }
  return pts;
}

const N4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function drawBolt(c: Ctx, layer: Lay, pts: P[], heavy: boolean): void {
  const core = new Set<number>();
  for (let k = 1; k < pts.length; k++)
    bres(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, (x, y) => {
      if (x >= 0 && y >= 0 && x < N && y < N) core.add(y * N + x);
    });
  const glow = new Set<number>();
  for (const i of core) {
    const x = i % N;
    const y = (i - x) / N;
    for (const [ox, oy] of N4) {
      if (x + ox < 0 || x + ox >= N || y + oy < 0 || y + oy >= N) continue;
      const j = (y + oy) * N + x + ox;
      if (!core.has(j)) glow.add(j);
    }
  }
  for (const i of glow) {
    const x = i % N;
    const y = (i - x) / N;
    c.fx.put(layer, x, y, c.pal[heavy ? 3 : 2], 255);
    // a dark fringe so bolts still read on light backgrounds
    if (heavy)
      for (const [ox, oy] of N4) {
        const j = (y + oy) * N + x + ox;
        if (!core.has(j) && !glow.has(j)) c.fx.put(layer, x + ox, y + oy, c.pal[1], 140);
      }
  }
  for (const i of core) c.fx.put(layer, i % N, Math.floor(i / N), c.pal[4]);
}

function yellowBurst(c: Ctx, s: Src, L: number): void {
  const { fx, pal, t } = c;
  const pt = s.point;
  const slot = mod(Math.floor(t / 2), CHAKRA_LOOP / 2);
  // crackling rim: segments of static running along the outline
  for (const i of s.rim) {
    const x = i % N;
    const y = Math.floor(i / N);
    const n = flow(x, y, t, 3 * S, 3 * S, S, -S, c.seed);
    if (n > 0.6) fx.put(s.layer, x, y, pal[4]);
    else if (n > 0.42) fx.put(s.layer, x, y, pal[2], 230);
  }
  const ox = pt ? s.anchor.x : s.cx;
  const oy = pt ? s.anchor.y : s.cy;
  const nb = Math.round(2 + 3 * L);
  for (let k = 0; k < nb; k++) {
    const r = rng(c.seed + k * 977 + slot * 7919);
    if (r() > 0.85) continue; // flicker off
    if (pt) {
      // arcs leaping off the palm, mostly forward
      const a0 = Math.atan2(s.dir.y, s.dir.x) + (r() - 0.5) * 2.6;
      const len = (5 + r() * (6 + 8 * L)) * S;
      const p0 = { x: ox + Math.cos(a0) * s.r, y: oy + Math.sin(a0) * s.r };
      const p1 = { x: ox + Math.cos(a0) * len, y: oy + Math.sin(a0) * len };
      drawBolt(c, 1, boltPath(p0, p1, { x: 0, y: 0 }, 0.6, 4, r), k === 0);
    } else {
      const a0 = r() * TAU;
      const span = 0.7 + r() * 1.1;
      const p0 = rayToRing(s, ox, oy, a0, 1);
      const p1 = rayToRing(s, ox, oy, a0 + span, 1);
      const mid = a0 + span / 2;
      const bl = (4 + r() * (3 + 6 * L)) * S;
      drawBolt(c, r() < 0.5 ? 1 : 0, boltPath(p0, p1, { x: Math.cos(mid) * bl, y: Math.sin(mid) * bl }, 0.5, 4, r), true);
    }
  }
  // big strikes at full power: a sky bolt off the head and forks to the ground
  if (!pt && L >= 0.75) {
    const r = rng(c.seed + 4242 + slot * 31);
    if (r() < 0.75) {
      const sx = s.cx + (r() - 0.5) * 8 * S;
      const p0 = rayToRing(s, sx, s.y0 + 8 * S, -Math.PI / 2, 1);
      const p1 = { x: sx + (r() - 0.5) * 16 * S, y: -2 };
      const path = boltPath(p0, p1, { x: 0, y: 0 }, 0.55, 4, r);
      drawBolt(c, 0, path, true);
      const fork = path[Math.floor(path.length / 2)];
      drawBolt(c, 0, boltPath(fork, { x: fork.x + (r() < 0.5 ? -8 : 8) * S, y: fork.y - 6 * S }, { x: 0, y: 0 }, 0.7, 3, r), false);
    }
    for (const side of [-1, 1]) {
      if (r() < 0.35) continue;
      const p0 = { x: s.cx + side * (halfW(s, s.y1 - 3 * S) + S), y: s.y1 - (3 + r() * 6) * S };
      const p1 = { x: p0.x + side * (6 + r() * 8) * S, y: s.y1 + S };
      drawBolt(c, 1, boltPath(p0, p1, { x: side * 2 * S, y: -2 * S }, 0.6, 3, r), false);
    }
  }
  // sparks popping near the rim
  const ns = Math.round(4 + 6 * L);
  for (let k = 0; k < ns; k++) {
    const r = rng(c.seed + 77 + k * 19 + t * 3);
    const ang = r() * TAU;
    const p = pt
      ? { x: ox + Math.cos(ang) * (s.r + (2 + r() * 5) * S), y: oy + Math.sin(ang) * (s.r + (2 + r() * 5) * S) }
      : rayToRing(s, ox, oy, ang, (2 + Math.floor(r() * 4)) * S);
    sparkle(c, 1, p.x, p.y, r() < 0.5 ? 2 : 1, true);
  }
  if (pt)
    // ball of static in the palm
    for (let y = s.y0; y <= s.y1; y++)
      for (let x = s.x0; x <= s.x1; x++) if (s.mask[y * N + x]) fx.put(1, x, y, pal[hash(x, y, t, c.seed) > 0.45 ? 4 : 3]);
}

// ---------------------------------------------------------------------------
// GREEN - Leafwind Spiral: a rising whirlwind of wind streaks and leaves
// ---------------------------------------------------------------------------

// tumbling leaf frames (0 = dark edge, 2 = leaf, 3 = light)
const LEAF: string[][] = [
  ['....00', '..0230', '.02330', '02330.', '0230..', '00....'],
  ['.0000.', '023330', '.0000.'],
  ['00....', '0320..', '03320.', '.03320', '..0320', '....00'],
  ['.00.', '0230', '0330', '0330', '0230', '.00.'],
];

function leaf(c: Ctx, layer: Lay, x: number, y: number, frame: number): void {
  stamp(c.fx, layer, c.pal, x, y, LEAF[mod(frame, LEAF.length)]);
}

function greenBurst(c: Ctx, s: Src, L: number): void {
  const { fx, pal, t } = c;
  const pt = s.point;
  // rim with gaps that travel upward like gusts
  for (const i of s.rim) {
    const x = i % N;
    const y = Math.floor(i / N);
    const n = flow(x, y, t, 4 * S, 4 * S, 0, -2 * S, c.seed);
    if (n > 0.4) fx.put(s.layer, x, y, pal[n > 0.62 ? 4 : 3], 230);
  }
  const yTop = pt ? s.anchor.y - (14 + 4 * L) * S : s.y0 - 2 * S;
  const yBot = pt ? s.anchor.y + 2 * S : s.y1 + 1 * S;
  const H = yBot - yTop;
  const ax = pt ? s.anchor.x : s.cx;
  // radius of the whirlwind at a height: hugs the body (smoothed over nearby rows)
  const radiusAt = (y: number) => {
    if (pt) return 2 * S + (yBot - y) * 0.45;
    let m = 0;
    for (let k = -3; k <= 3; k++) m = Math.max(m, halfW(s, y + k * S * 2));
    return m + (3 + 2 * L) * S;
  };
  const tilt = 0.3;
  // wind streaks: tapered crescents on a helix, climbing while they spin
  const streaks = Math.round(4 + 4 * L);
  for (let k = 0; k < streaks; k++) {
    const ph = k / streaks + hash(k, c.seed) * 0.15;
    const prog = mod(t / CHAKRA_LOOP + ph, 1);
    const hy = yBot - prog * (H + 4 * S);
    const th = TAU * (t / 8 + ph * 2.3);
    const R = radiusAt(hy) + hash(k, 2, c.seed) * 2 * S;
    const arc = 1.5 + 0.7 * L;
    const steps = Math.ceil(R * arc);
    let prev: P | null = null;
    for (let j = 0; j <= steps; j++) {
      const u = j / steps;
      const a = th - u * arc;
      const sn = Math.sin(a);
      const p = { x: Math.floor(ax + Math.cos(a) * R), y: Math.floor(hy + u * arc * 2.5 * S + sn * R * tilt) };
      const front = sn > 0;
      const lay: Lay = front ? 1 : 0;
      const thick = front ? Math.max(1, Math.round((1 - u) * 3.2)) : u < 0.5 ? 2 : 1;
      const draw = (x: number, y: number) => {
        for (let q = 0; q < thick; q++) {
          const tone = q === 0 ? (u < 0.15 ? 4 : u < 0.55 ? 3 : 2) : q === thick - 1 ? 1 : 2;
          fx.put(lay, x, y + q, pal[front ? tone : Math.max(1, tone - 1)], front ? 255 : 215);
        }
      };
      if (prev) bres(prev.x, prev.y, p.x, p.y, draw);
      else draw(p.x, p.y);
      prev = p;
    }
  }
  // leaves riding the gale
  const nl = Math.round((pt ? 3 : 4) + 6 * L);
  for (let k = 0; k < nl; k++) {
    const ph = hash(k, 3, c.seed);
    const prog = mod(t / CHAKRA_LOOP + ph, 1);
    const y0 = yBot - prog * (H + 8 * S);
    const a = TAU * (t / 12 + ph * 5);
    const R = radiusAt(y0) + (1 + hash(k, 4, c.seed) * 3) * S;
    const sn = Math.sin(a);
    leaf(c, sn > 0 ? 1 : 0, ax + Math.cos(a) * R, y0 + sn * R * tilt, Math.floor(t / 2) + k);
  }
  // swirl of dust at the base
  if (!pt && L > 0.5) {
    const rx = halfW(s, s.y1) + (5 + 3 * L) * S;
    ellipsePx(s.cx, s.y1 + 0.5, rx, 2 * S, (x, y, ang) => {
      const g = mod(ang / TAU - t / 12, 1);
      const front = Math.sin(ang) > 0;
      if (g < 0.4) fx.put(front ? 1 : 0, x, y, pal[g < 0.12 ? 3 : 2]);
      if (g < 0.2) fx.put(front ? 1 : 0, x, y + 1, pal[1]);
    });
  }
}

// ---------------------------------------------------------------------------
// BLUE - Rising Tide: wavy water rim, rising rings and droplets
// ---------------------------------------------------------------------------

const DROP_UP = ['.43.', '4332', '3321', '.21.'];
const DROP_DOWN = ['.3..', '.43.', '4332', '3321', '.21.'];

function blueBurst(c: Ctx, s: Src, L: number): void {
  const { fx, pal, t } = c;
  const pt = s.point;
  // wavy rim: thickness swells in waves travelling up the body
  const maxD = pt ? 3 : 2 + Math.round(3 * L);
  for (let i = 0; i < N * N; i++) {
    const d = s.dist[i];
    if (d < 1 || d > maxD + 1) continue;
    const x = i % N;
    const y = (i - x) / N;
    const w = 0.5 + 0.5 * Math.sin((y * 0.55 + x * 0.15) / S + (TAU * t) / 8);
    const th = 1 + w * maxD;
    if (d > th) continue;
    const tone = d === 1 ? (w > 0.8 ? 4 : 3) : d > th - 1 ? 1 : 2;
    fx.put(s.layer, x, y, pal[tone], d === 1 ? 255 : 220);
  }
  if (pt) {
    fillOrb(c, s, [4, 3, 2]);
    // ripples pushing forward from the orb
    for (let w = 0; w < 2; w++) {
      const a = mod(t + w * 6, 12) / 12;
      const d = (2 + a * (3 + 3 * L)) * S;
      const tone = a < 0.4 ? 4 : a < 0.75 ? 3 : 2;
      ellipsePx(s.anchor.x + s.dir.x * d, s.anchor.y + s.dir.y * d, (1 + a * 1.5) * S, (2.5 + a * (3 + 3 * L)) * S, (x, y) => fx.put(1, x, y, pal[tone]));
    }
  } else {
    // pool sloshing at the feet
    const pr = halfW(s, s.y1) + (4 + 4 * L) * S + Math.sin((TAU * t) / 12) * S;
    ellipsePx(s.cx, s.y1 + 0.5, pr, 1.8 * S, (x, y, ang) => {
      const front = Math.sin(ang) > 0;
      fx.put(front ? 1 : 0, x, y, pal[front ? 3 : 2]);
      if (front && Math.abs(Math.cos(ang)) < 0.6) fx.put(1, x, y - 1, pal[mod(x + t * 2, 6) < 2 ? 4 : 2], 200);
    });
    // rings rising up the body
    const rings = L > 0.8 ? 3 : L > 0.4 ? 2 : 1;
    for (let k = 0; k < rings; k++) {
      const prog = mod(t / CHAKRA_LOOP + k / rings, 1);
      const y = s.y1 - prog * (s.y1 - s.y0 + 4 * S);
      const R = halfW(s, y) + (2 + (1 - prog) * 2) * S;
      const tone = prog < 0.6 ? 3 : prog < 0.85 ? 2 : 1;
      ellipsePx(s.cx, y, R, 1.6 * S, (x, yy, ang) => {
        if (Math.sin(ang) > 0) {
          const hi = tone === 3 && Math.cos(ang) < -0.3;
          fx.put(1, x, yy, pal[hi ? 4 : tone]);
          fx.put(1, x, yy + 1, pal[Math.max(1, tone - 1)]);
        } else fx.put(0, x, yy, pal[Math.max(1, tone - 1)]);
      });
    }
  }
  // droplets thrown up and falling back
  const n = Math.round(3 + 7 * L);
  for (let k = 0; k < n; k++) {
    const [age, cyc] = cycle(t, k, 12, c.seed);
    const r = rng(c.seed + k * 41 + cyc * 313);
    let ox: number;
    let oy: number;
    let vx: number;
    if (pt) {
      ox = s.anchor.x;
      oy = s.anchor.y;
      vx = (s.dir.x * (0.6 + r()) + (r() - 0.5) * 0.8) * S;
    } else {
      const side = r() < 0.5 ? -1 : 1;
      oy = s.y0 + 6 * S + r() * (s.y1 - s.y0 - 6 * S);
      ox = s.cx + side * (halfW(s, oy) + S);
      vx = side * (0.3 + r() * 0.6) * S;
    }
    const vy = -(1.6 + r() * (1 + L)) * S;
    const x = ox + vx * age;
    const y = oy + vy * age + 0.16 * S * age * age;
    if (y > (pt ? N : s.y1 + S)) continue;
    stamp(fx, r() < 0.6 ? 1 : 0, pal, x, y, vy + 0.32 * S * age > 0 ? DROP_DOWN : DROP_UP);
  }
}

// ---------------------------------------------------------------------------
// INDIGO - Nightveil Mist: shadow smoke streaming back in tendrils
// ---------------------------------------------------------------------------

/** A tapered, curling ribbon built by integrating a heading; returns nothing. */
function ribbon(
  c: Ctx,
  layer: Lay,
  o: P,
  heading: number,
  len: number,
  width: number,
  bend: (u: number) => number,
  tones: [number, number, number],
  alpha = 255,
): void {
  let x = o.x;
  let y = o.y;
  let h = heading;
  const steps = Math.ceil(len);
  for (let j = 0; j <= steps; j++) {
    const u = j / steps;
    h += bend(u);
    x += Math.cos(h);
    y += Math.sin(h);
    const w = Math.max(1, Math.round(width * (1 - u * 0.65)));
    // normal pointing to the lit (upper-left) side
    let nx = -Math.sin(h);
    let ny = Math.cos(h);
    if (nx + ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    for (let q = 0; q < w; q++) {
      const tone = q === 0 && w > 1 ? tones[0] : q === w - 1 ? tones[2] : tones[1];
      c.fx.put(layer, x + nx * (q - (w - 1) / 2), y + ny * (q - (w - 1) / 2), c.pal[tone], alpha);
    }
  }
}

function indigoBurst(c: Ctx, s: Src, L: number): void {
  const { fx, pal, t } = c;
  const pt = s.point;
  const dens = new Float32Array(N * N);
  const lit = new Uint8Array(N * N);
  // thin smoke clinging to the body
  const baseR = (pt ? 1.5 : 1 + 0.8 * L) * S;
  for (let i = 0; i < N * N; i++) {
    const d = s.dist[i];
    if (d === 0 || d > baseR + 1) continue;
    dens[i] = 0.75 - ((d - 1) / baseR) * 0.45 - 0.3 * flow(i % N, Math.floor(i / N), t, 3 * S, 4 * S, 0, -S, c.seed + 4, 0);
  }
  // billowing puffs that stream up and backward, growing as they thin out
  const back = s.rim.filter((i) => i % N <= s.cx + 2 * S);
  const n = pt ? 8 : Math.round(8 + 14 * L);
  const life = 12;
  for (let k = 0; k < n; k++) {
    const [age, cyc] = cycle(t, k, life, c.seed);
    const r = rng(c.seed + 300 + k * 71 + cyc * 409);
    const pool = r() < 0.7 && back.length ? back : s.rim;
    const i0 = pool[Math.floor(r() * pool.length)] ?? 0;
    const u = age / life;
    const rad = (2 + r() * 1.5 + u * (2 + 3 * L)) * S;
    const x = (i0 % N) - u * (pt ? 3 + 3 * L : 3 + 7 * L) * (0.6 + 0.8 * r()) * S + Math.sin(TAU * (t / 12) + k) * 0.6 * S;
    const y = Math.floor(i0 / N) - u * (pt ? 4 + 4 * L : 5 + 9 * L) * (0.6 + 0.8 * r()) * S;
    const str = Math.min(1, u / 0.15) * (1 - u * 0.75);
    for (let py = Math.max(0, Math.floor(y - rad)); py <= Math.min(N - 1, y + rad); py++)
      for (let px = Math.max(0, Math.floor(x - rad)); px <= Math.min(N - 1, x + rad); px++) {
        const dx = (px + 0.5 - x) / rad;
        const dy = (py + 0.5 - y) / rad;
        const d2 = dx * dx + dy * dy;
        if (d2 >= 1) continue;
        const v = (1 - d2) * 1.1 * str;
        const i = py * N + px;
        if (v <= dens[i]) continue;
        dens[i] = v;
        lit[i] = dx + dy < -0.3 ? 1 : 0;
      }
  }
  // cut the soft density with drifting noise, light the tops of the billows
  const fv = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) fv[i] = dens[i] > 0 ? dens[i] - 0.38 * flow(i % N, Math.floor(i / N), t, 3 * S, 4 * S, 0.5 * S, -S, c.seed + 6) : 0;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const v = fv[i];
      if (v <= 0.08 || s.mask[i]) continue;
      const top = y === 0 || fv[i - N] <= 0.08;
      const top2 = y > 1 && fv[i - 2 * N] <= 0.08;
      if (top || (top2 && lit[i])) fx.put(s.layer, x, y, pal[top ? 3 : 2], 235);
      else if (v > 0.45) fx.put(s.layer, x, y, pal[2], 225);
      else if (v > 0.24) fx.put(s.layer, x, y, pal[1], 215);
      else fx.put(s.layer, x, y, pal[0], 200);
    }
  // lavender rim so the silhouette reads against its own smoke
  for (const i of s.rim) {
    const m = flow(i % N, Math.floor(i / N), t, 3 * S, 4 * S, 0, -S, c.seed + 5);
    fx.put(s.layer, i % N, Math.floor(i / N), pal[m > 0.55 ? 4 : 3], 235);
  }
  // tendrils curling up off the shoulders and back
  const nt = Math.round((pt ? 2 : 2) + 3 * L);
  for (let k = 0; k < nt; k++) {
    const r = rng(c.seed + 800 + k * 17);
    const side = pt ? -1 : r() < 0.75 ? -1 : 1;
    let o: P;
    if (pt) o = { x: s.anchor.x, y: s.anchor.y - s.r };
    else {
      const oy = s.y0 + (5 + r() * 18) * S;
      o = { x: s.cx + side * (halfW(s, oy) - S), y: oy };
    }
    const len = ((pt ? 9 : 12) + r() * (6 + 10 * L)) * S;
    const ph = r() * TAU;
    const curl = side * (0.25 + r() * 0.25);
    ribbon(
      c,
      pt || r() < 0.6 ? 1 : 0,
      o,
      -Math.PI / 2 + side * 0.25,
      len,
      (pt ? 2 : 3) * S * 0.75,
      (u) => (Math.sin(TAU * (u * 0.9 - t / 12) + ph) * 0.07 + curl * 0.12 * u * u) / S,
      [4, 3, 1],
      240,
    );
  }
}

// ---------------------------------------------------------------------------
// VIOLET - Spectral Guardian: a giant ghost warrior looming behind
// ---------------------------------------------------------------------------

/** A translucent, scaled-up copy of a sprite region (used for the spectral arm). */
function ghost(c: Ctx, region: Uint8Array, pivot: P, sc: number, offset: P): void {
  const { fx, pal, t } = c;
  const gm = new Uint8Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const sx = Math.floor(pivot.x + (x + 0.5 - offset.x - pivot.x) / sc);
      const sy = Math.floor(pivot.y + (y + 0.5 - offset.y - pivot.y) / sc);
      if (sx < 0 || sy < 0 || sx >= N || sy >= N) continue;
      if (region[sy * N + sx]) gm[y * N + x] = 1;
    }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (gm[i]) {
        const edge = x === 0 || y === 0 || x === N - 1 || y === N - 1 || !gm[i - 1] || !gm[i + 1] || !gm[i - N] || !gm[i + N];
        if (edge) fx.put(0, x, y, pal[3], 235);
        else fx.put(0, x, y, pal[mod(y + t, 4) === 0 ? 2 : 1], mod(y + t, 4) === 0 ? 140 : 100);
      } else if ((x > 0 && gm[i - 1]) || (x < N - 1 && gm[i + 1]) || (y > 0 && gm[i - N]) || (y < N - 1 && gm[i + N])) fx.put(0, x, y, pal[0], 160);
    }
}

function inPoly(x: number, y: number, pts: P[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * The guardian: a frontal armored warrior (horned helmet, face mask, great
 * shoulder plates, breastplate) drawn as a translucent ghost around head
 * center G, `g` fine px per guardian unit. It dissolves below its chest.
 */
function guardian(c: Ctx, G: P, g: number, strength: number): void {
  const { fx, pal, t } = c;
  const U = (x: number, y: number): P => ({ x: G.x + x * g, y: G.y + y * g });
  const sodeL = [U(-13.5, 8.5), U(-6, 7.5), U(-6.5, 16), U(-14.5, 15)];
  const sodeR = sodeL.map((p) => ({ x: 2 * G.x - p.x, y: p.y }));
  const chest = [U(-7.5, 7.2), U(7.5, 7.2), U(6.2, 21), U(-6.2, 21)];
  const armL = [U(-13.6, 14.5), U(-8.2, 14.5), U(-8.6, 22), U(-13.2, 22)];
  const armR = armL.map((p) => ({ x: 2 * G.x - p.x, y: p.y }));
  // crescent crest: inside circle A, outside circle B (tips point up)
  const inCrest = (x: number, y: number) => {
    const ax = (x - G.x) / g;
    const ay = (y - G.y) / g;
    return ax * ax + (ay + 9.6) ** 2 <= 6.6 * 6.6 && ax * ax + (ay + 11.8) ** 2 > 6.9 * 6.9 && ay < -4;
  };
  const brim = [U(-6.3, 0.4), U(6.3, 0.4), U(8.8, 5), U(-8.8, 5)];
  const inHelm = (x: number, y: number) => {
    const dx = (x - G.x) / (6.3 * g);
    const dy = (y - G.y) / (5.8 * g);
    return y <= G.y + 0.5 * g && dx * dx + dy * dy <= 1;
  };
  const inFace = (x: number, y: number) => Math.abs(x - G.x) <= 3.3 * g && y >= G.y && y <= G.y + 6.8 * g;
  const inNeck = (x: number, y: number) => Math.abs(x - G.x) <= 3 * g && y >= G.y + 6 * g && y <= G.y + 8 * g;
  const shapes = (x: number, y: number) => inHelm(x, y) || inPoly(x, y, brim) || inFace(x, y) || inNeck(x, y) || inPoly(x, y, sodeL) || inPoly(x, y, sodeR) || inPoly(x, y, chest) || inPoly(x, y, armL) || inPoly(x, y, armR) || inCrest(x, y);
  const x0 = Math.max(0, Math.floor(G.x - 15 * g));
  const x1 = Math.min(N - 1, Math.ceil(G.x + 15 * g));
  const y0 = Math.max(0, Math.floor(G.y - 13 * g));
  const y1 = Math.min(N - 1, Math.ceil(G.y + 21 * g));
  const W = x1 - x0 + 3;
  const gm = new Uint8Array(W * (y1 - y0 + 3));
  const at = (x: number, y: number) => (x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1 ? 0 : gm[(y - y0 + 1) * W + x - x0 + 1]);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (shapes(x + 0.5, y + 0.5)) gm[(y - y0 + 1) * W + x - x0 + 1] = 1;
  const fadeFrom = G.y + 12 * g;
  const fade = (x: number, y: number) => (y < fadeFrom ? 1 : 1 - (y - fadeFrom) / (8 * g) - 0.4 * flow(x, y, t, 3 * S, 4 * S, 0, -S, c.seed));
  for (let y = Math.max(0, y0 - 1); y <= Math.min(N - 1, y1 + 1); y++)
    for (let x = Math.max(0, x0 - 1); x <= Math.min(N - 1, x1 + 1); x++) {
      const fd = fade(x, y) * strength;
      if (fd <= 0.05) continue;
      if (at(x, y)) {
        const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
        if (edge) fx.put(0, x, y, pal[fd > 0.55 ? 3 : 2], Math.round(240 * Math.min(1, fd + 0.25)));
        else if (inFace(x + 0.5, y + 0.5) && y > G.y + 0.6 * g) fx.put(0, x, y, pal[0], Math.round(215 * fd));
        else {
          const inner = !at(x - 2, y) || !at(x + 2, y) || !at(x, y - 2) || !at(x, y + 2);
          const crest = inCrest(x + 0.5, y + 0.5);
          fx.put(0, x, y, pal[crest ? 4 : inner ? 2 : 1], Math.round((crest ? 255 : inner ? 190 : 150) * fd));
        }
      } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) fx.put(0, x, y, pal[0], Math.round(170 * fd));
    }
  const line = (a: P, b: P, tone: number) => bres(a.x, a.y, b.x, b.y, (x, y) => (fade(x, y) * strength > 0.3 ? fx.put(0, x, y, pal[tone], 230) : 0));
  // armor lames and trim
  line(U(-7.6, 3), U(7.6, 3), 3);
  for (const side of [-1, 1]) line(U(side * 14, 12), U(side * 6.3, 11.2), 3);
  line(U(-6.8, 13), U(6.8, 13), 2);
  line(U(0, 7.5), U(0, 21), 2);
  stamp(fx, 0, pal, G.x, G.y - 4.6 * g, ['.000.', '03430', '04440', '03430', '.000.']);
  // eyes: burning slits that flare on the beat
  const e = pulse(t, 8) > 0.5 ? 4 : 3;
  for (const side of [-1, 1]) {
    const p = U(side * 1.7, 2.7);
    stamp(fx, 0, pal, p.x, p.y, side < 0 ? [`${e}${e}${e}3`, `.${e}${e}.`] : [`3${e}${e}${e}`, `.${e}${e}.`]);
  }
}

function violetBurst(c: Ctx, s: Src, L: number): void {
  const { fx, pal, t, rig, sprite } = c;
  const pt = s.point;
  if (!pt) {
    const g = (1.1 + 0.25 * L) * S;
    const bob = Math.round(Math.sin((TAU * t) / 12) * S);
    // behind the back shoulder, face clear of the head and hair
    const hairL = Math.min(s.x1, ...s.rim.filter((i) => Math.floor(i / N) < (rig.head.y + 3) * S).map((i) => i % N));
    const G = { x: Math.max(14.5 * g, Math.min((rig.head.x - 11) * S, hairL - 4 * g)), y: Math.max(13 * g + 1, (rig.head.y - 1) * S) + bob };
    guardian(c, G, g, 0.55 + 0.45 * L);
    rimGlow(c, s, L);
  } else if (s.hand === 'F') {
    // a spectral arm reaching past the casting arm
    const region = new Uint8Array(N * N);
    const segs: [P, P][] = [
      [F(rig.shoulderF), F(rig.elbowF)],
      [F(rig.elbowF), F(rig.wristF)],
      [F(rig.wristF), F(rig.handF)],
    ];
    const reachR = (rig.bp.armR[0] + 1.6) * S;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (!sprite[(y * N + x) * 4 + 3]) continue;
        const p = { x: x + 0.5, y: y + 0.5 };
        for (const [a, b] of segs) {
          const ab = { x: b.x - a.x, y: b.y - a.y };
          const l2 = ab.x * ab.x + ab.y * ab.y || 1;
          const u = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2, 0, 1);
          if (Math.hypot(p.x - a.x - ab.x * u, p.y - a.y - ab.y * u) < reachR) {
            region[y * N + x] = 1;
            break;
          }
        }
      }
    const reach = 1.55 + 0.25 * L + 0.05 * Math.sin((TAU * t) / 12);
    ghost(c, region, F(rig.shoulderF), reach, { x: 0, y: -S });
  }
  // hitodama wisps orbiting
  const nw = Math.round((pt ? 2 : 3) + 3 * L);
  const ax = pt ? s.anchor.x : s.cx;
  const ay = pt ? s.anchor.y : s.cy;
  for (let k = 0; k < nw; k++) {
    const a = TAU * (t / CHAKRA_LOOP + k / nw) * (k % 2 ? 1 : -1) + k;
    const R = pt ? (5 + 2 * L) * S : halfW(s, ay) + (6 + (k % 3) * 2) * S;
    const x = ax + Math.cos(a) * R;
    const y = ay + Math.sin(a) * R * (pt ? 0.8 : 0.45) - (pt ? 0 : 4 * S) + Math.sin(TAU * (t / 12) + k) * 2 * S;
    const lay: Lay = Math.sin(a) > 0 ? 1 : 0;
    const flick = mod(t + k, 4) < 2;
    stamp(fx, lay, pal, x, y, flick ? ['..2.', '.33.', '.32.', '3442', '3443', '.33.'] : ['.2..', '.33.', '.23.', '3443', '3442', '.33.']);
  }
  if (pt) for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) if (s.mask[y * N + x]) fx.put(1, x, y, pal[hash(x, y, Math.floor(t / 2)) > 0.5 ? 4 : 3], 235);
}

// ---------------------------------------------------------------------------
// WHITE - Heaven Pillar: a column of light + radiant rays
// ---------------------------------------------------------------------------

/** A 4-point twinkle: core plus arms of `size` px. */
function sparkle(c: Ctx, layer: Lay, x: number, y: number, size: number, hot = false): void {
  const { fx, pal } = c;
  x = Math.floor(x);
  y = Math.floor(y);
  if (size <= 0) return;
  fx.put(layer, x, y, pal[4]);
  for (let k = 1; k <= size; k++) {
    const tone = k === size ? (hot ? 2 : 1) : 3;
    fx.put(layer, x + k, y, pal[tone]);
    fx.put(layer, x - k, y, pal[tone]);
    fx.put(layer, x, y + k, pal[tone]);
    fx.put(layer, x, y - k, pal[tone]);
  }
}

function whiteBurst(c: Ctx, s: Src, L: number): void {
  const { fx, pal, t } = c;
  const pt = s.point;
  const ax = s.anchor.x;
  const ay = s.anchor.y;
  // wedge rays fanning from the heart (they rotate one ray-step per loop)
  const nr = pt ? 8 : L > 0.8 ? 12 : 8;
  const lens: number[] = [];
  for (let k = 0; k < nr; k++)
    lens.push(((pt ? 7 + 6 * L : 16 + 14 * L) * (k % 2 === 0 ? 1 : 0.6) + (pt ? 1 : 3) * Math.sin(TAU * (t / 12 + k / nr))) * S);
  const maxLen = Math.max(...lens);
  const start = pt ? s.r + S : 4 * S;
  const rot = TAU * (t / CHAKRA_LOOP / nr) - Math.PI / 2;
  for (let y = Math.max(0, Math.floor(ay - maxLen)); y <= Math.min(N - 1, ay + maxLen); y++)
    for (let x = Math.max(0, Math.floor(ax - maxLen)); x <= Math.min(N - 1, ax + maxLen); x++) {
      const dx = x + 0.5 - ax;
      const dy = y + 0.5 - ay;
      const r = Math.hypot(dx, dy);
      if (r < start || r > maxLen) continue;
      const a = Math.atan2(dy, dx) - rot;
      const k = mod(Math.round((a / TAU) * nr), nr);
      const da = Math.abs(mod(a - (k / nr) * TAU + Math.PI, TAU) - Math.PI);
      const len = lens[k];
      if (r > len) continue;
      const u = (r - start) / Math.max(1, len - start);
      const hw = (0.6 + r * (pt ? 0.06 : 0.04)) * (1 - u * 0.4);
      const off = da * r;
      if (off > hw) continue;
      // gaps racing outward along the shorter rays
      if (k % 2 && mod(r - t * 3 * S, 12 * S) < 2 * S) continue;
      const core = off < hw * 0.6;
      const tone = core ? (u < 0.6 ? 4 : 3) : u < 0.5 ? 2 : 1;
      fx.put(s.layer, x, y, pal[tone], 255);
    }
  if (!pt) {
    // the pillar: beams of light streaming up between two bright edges
    const w = Math.round(halfW(s, s.cy) + (2 + 2 * L) * S + (pulse(t, 6) > 0.5 ? 1 : 0));
    const x0 = Math.round(s.cx) - w;
    const x1 = Math.round(s.cx) + w - 1;
    const bottom = s.y1 + S;
    for (let x = x0; x <= x1; x++) {
      const e = Math.min(x - x0, x1 - x);
      const fromC = Math.abs(x + 0.5 - s.cx) / w;
      const hv = hash(x - Math.round(s.cx), 5, c.seed);
      // each column scrolls up at 2 or 4 px/tick with its own dash pattern (all loop in 24 ticks)
      const speed = (hv < 0.5 ? 2 : 4) * S;
      const period = (hv < 0.25 ? 12 : hv < 0.5 ? 16 : hv < 0.75 ? 24 : 32) * S;
      const dash = period * (0.45 + hv * 0.35);
      const ofs = hash(x, 6, c.seed) * period;
      for (let y = 0; y <= bottom; y++) {
        if (e === 0) fx.put(0, x, y, pal[1], 255);
        else if (e === 1) fx.put(0, x, y, pal[mod(y - t * 2 * S, 6 * S) < 3 * S ? 4 : 3], 255);
        else if (e === 2) fx.put(0, x, y, pal[2], 200);
        else {
          const on = mod(y + t * speed + ofs, period) < dash;
          if (fromC < 0.45) fx.put(0, x, y, pal[on ? 4 : 3], 250);
          else if (fromC < 0.75) fx.put(0, x, y, pal[on ? 3 : 2], on ? 240 : 215);
          else if (on) fx.put(0, x, y, pal[2], 215);
        }
      }
    }
    // light pooling at the feet
    for (let k = 0; k < 2; k++)
      ellipsePx(s.cx, s.y1 + 0.5, w + (3 - k) * S, (1.6 - k * 0.5) * S, (x, y, ang) => {
        const front = Math.sin(ang) > 0;
        fx.put(front ? 1 : 0, x, y, pal[k ? 4 : front ? 3 : 2], 240);
        if (!k) fx.put(front ? 1 : 0, x, y + (front ? 1 : -1), pal[1], 200);
      });
    // rim
    for (const i of s.rim) fx.put(0, i % N, Math.floor(i / N), pal[4]);
    for (let i = 0; i < N * N; i++) if (s.dist[i] === 2) fx.put(0, i % N, Math.floor(i / N), pal[1], 245);
  } else {
    fillOrb(c, s, [4, 4, 3]);
    for (let i = 0; i < N * N; i++) if (s.dist[i] === 1) fx.put(1, i % N, Math.floor(i / N), pal[1], 210);
  }
  // twinkling sparkles
  const ns = Math.round((pt ? 2 : 3) + 4 * L);
  for (let k = 0; k < ns; k++) {
    const [age, cyc] = cycle(t, k, 8, c.seed);
    const r = rng(c.seed + 60 + k * 7 + cyc * 13);
    const x = pt ? ax + (r() - 0.5) * 18 * S : s.x0 - 6 * S + r() * (s.x1 - s.x0 + 12 * S);
    const y = pt ? ay + (r() - 0.5) * 16 * S : s.y0 - 4 * S + r() * (s.y1 - s.y0 + 4 * S);
    sparkle(c, 1, x, y, [1, 2, 3, 4, 3, 2, 1, 0][age]);
  }
}

// ---------------------------------------------------------------------------
// BLACK - Abyss Orbit: void orbs, a dark aura and cracks in space
// ---------------------------------------------------------------------------

const VOID_RED = col('#ff2c50');
const VOID_DARKRED = col('#8c0a2c');

/** A black void orb: purple glow halo, red/purple rim, black core, cold glint. */
function orb(c: Ctx, layer: Lay, x: number, y: number, r: number): void {
  const { fx, pal } = c;
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  const R = Math.ceil(r) + 2;
  for (let oy = -R; oy <= R; oy++)
    for (let ox = -R; ox <= R; ox++) {
      const d = Math.hypot(ox + 0.5, oy + 0.5);
      const lightSide = ox + oy < 0;
      if (d > r + 1.5) continue;
      if (d > r + 0.5) {
        if (r >= 3) fx.put(layer, cx + ox, cy + oy, pal[2], 190);
      } else if (d > r - 0.5) fx.put(layer, cx + ox, cy + oy, lightSide ? pal[3] : c.accent);
      else if (d > r - 1.5 && r >= 3) fx.put(layer, cx + ox, cy + oy, lightSide ? pal[2] : c.accentDark);
      else fx.put(layer, cx + ox, cy + oy, pal[1]);
    }
  const gl = Math.max(1, Math.round(r * 0.45));
  fx.put(layer, cx - gl, cy - gl, pal[3]);
  if (r >= 4) fx.put(layer, cx - gl + 1, cy - gl, pal[2]);
}

function crack(c: Ctx, layer: Lay, pts: P[], grow: number): void {
  const { fx, pal } = c;
  const cells: P[] = [];
  for (let k = 1; k < pts.length; k++)
    bres(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, (x, y, j) => {
      if (j > 0 || k === 1) cells.push({ x, y });
    });
  const n = Math.round(cells.length * grow);
  const core = new Set<number>();
  for (let k = 0; k < n; k++) {
    core.add(cells[k].y * N + cells[k].x);
    // the crack is wider near its origin
    if (k < n * 0.7) core.add(cells[k].y * N + cells[k].x + 1);
  }
  for (const i of core) {
    const x = i % N;
    const y = (i - x) / N;
    for (const [ox, oy] of N4) if (!core.has((y + oy) * N + x + ox)) fx.put(layer, x + ox, y + oy, oy < 0 || ox < 0 ? c.accent : pal[3], 255);
  }
  for (const i of core) fx.put(layer, i % N, Math.floor(i / N), pal[0]);
}

function blackBurst(c: Ctx, s: Src, L: number): void {
  const { fx, pal, t } = c;
  const pt = s.point;
  // dark aura hugging the body, edged in purple
  const f = pt ? plume(s, 2 * S, 2 * S, (3 + 2 * L) * S, 2 * S) : plume(s, (1.5 + 1.5 * L) * S, (2 + 2 * L) * S, (3 + 6 * L) * S, 1.5 * S);
  paintField(c, f, s.layer, (x, y) => 1 - 0.7 * flow(x, y, t, 3 * S, 4 * S, 0, -S, c.seed), [
    [0.62, 1, 240],
    [0.85, 2, 255],
    [1, 3, 255],
  ]);
  for (const i of s.rim) if (hash(i, Math.floor(t / 2), c.seed) > 0.9) fx.put(s.layer, i % N, Math.floor(i / N), c.accent);

  const ax = pt ? s.anchor.x : s.cx;
  const ay = pt ? s.anchor.y : s.cy;
  if (pt) {
    // singularity in the palm + accretion ring
    orb(c, 1, ax, ay, Math.round(s.r));
    const rx = s.r + (4 + 2 * L) * S;
    ellipsePx(ax, ay, rx, rx * 0.35, (x, y, ang) => {
      const g = mod(ang / TAU - t / 12, 1);
      if (g < 0.5) fx.put(Math.sin(ang) > 0 ? 1 : 0, x, y, g < 0.15 ? c.accent : pal[3]);
    });
  }
  // cracks in space (re-seeded every 12 ticks; they grow then hold)
  const cyc = Math.floor(t / 12);
  const grow = Math.min(1, (mod(t, 12) + 1) / 5);
  const ncr = pt ? 1 : Math.round(2 + 2 * L);
  for (let k = 0; k < ncr; k++) {
    const r = rng(c.seed + 900 + k * 11 + cyc * 57);
    let o: P;
    let ang: number;
    if (pt) {
      ang = Math.atan2(s.dir.y, s.dir.x) + (r() - 0.5) * 2;
      o = { x: ax + Math.cos(ang) * (s.r + S), y: ay + Math.sin(ang) * (s.r + S) };
    } else if (k % 2 === 0) {
      // along the ground from the feet
      const side = r() < 0.5 ? -1 : 1;
      o = { x: s.cx + side * (halfW(s, s.y1) - S), y: s.y1 };
      ang = side > 0 ? -0.15 - r() * 0.2 : Math.PI + 0.15 + r() * 0.2;
    } else {
      ang = r() * TAU;
      o = rayToRing(s, s.cx, s.cy, ang, 2 * S);
    }
    const len = ((pt ? 6 : 8) + r() * (6 + 8 * L)) * S;
    const pts: P[] = [o];
    let p = o;
    let a = ang;
    for (let j = 0; j < 5; j++) {
      a += (r() - 0.5) * 0.7;
      p = { x: p.x + Math.cos(a) * (len / 5), y: p.y + Math.sin(a) * (len / 5) };
      pts.push(p);
    }
    crack(c, 1, pts, grow);
    if (L > 0.6 && r() < 0.6) {
      const m = pts[2];
      const b = a + (r() < 0.5 ? 0.9 : -0.9);
      crack(c, 1, [m, { x: m.x + Math.cos(b) * 4 * S, y: m.y + Math.sin(b) * 4 * S }, { x: m.x + Math.cos(b) * 7 * S + S, y: m.y + Math.sin(b) * 7 * S }], clamp(grow * 1.5 - 0.5, 0, 1));
    }
  }
  // orbiting void orbs
  const no = pt ? 3 : Math.round(2 + 3 * L);
  for (let k = 0; k < no; k++) {
    const a = TAU * ((t / CHAKRA_LOOP) * (pt ? 2 : 1) + k / no);
    const R = pt ? s.r + (6 + 2 * L) * S : halfW(s, ay) + (7 + 3 * L) * S;
    const x = ax + Math.cos(a) * R;
    const y = ay + Math.sin(a) * R * (pt ? 0.7 : 0.4) - (pt ? 0 : 2 * S) + (pt ? 0 : (k % 2 ? 3 : -3) * S * Math.cos(a));
    const front = Math.sin(a) > 0;
    const big = !pt && k === 0 && L > 0.7;
    orb(c, front ? 1 : 0, x, y, (big ? 3.5 : pt ? 1.6 : front ? 2.6 : 2) * S);
  }
  // motes being sucked in
  const nm = Math.round(3 + 6 * L);
  for (let k = 0; k < nm; k++) {
    const [age, cy] = cycle(t, k, 8, c.seed + 2);
    const r = rng(c.seed + 1300 + k * 5 + cy * 3);
    const a = r() * TAU;
    const d = ((pt ? 10 : 16) + r() * 8) * S * (1 - age / 8);
    const x = ax + Math.cos(a) * d;
    const y = ay + Math.sin(a) * d * 0.8;
    stamp(fx, 0, pal, x, y, age < 5 ? ['13', '31'] : ['34', '4.']);
  }
}

// ---------------------------------------------------------------------------
// Idle aura: pulsing rim + a few color-flavored motes
// ---------------------------------------------------------------------------

function auraMotes(c: Ctx, id: ChakraColorId, s: Src): void {
  const { fx, pal, t } = c;
  for (let k = 0; k < 3; k++) {
    const [age, cyc] = cycle(t, k, 12, c.seed + 77);
    const r = rng(c.seed + 4000 + k * 37 + cyc * 3);
    const side = r() < 0.5 ? -1 : 1;
    const y0 = s.y0 + 4 * S + r() * (s.y1 - s.y0 - 6 * S);
    const x0 = s.cx + side * (halfW(s, y0) + (1 + r() * 2) * S);
    const u = age / 12;
    switch (id) {
      case 'red':
      case 'orange':
        mote(c, 1, x0 + Math.sin(age * 0.8 + k) * S, y0 - age * 1.2 * S, u, id === 'orange');
        break;
      case 'yellow':
        if (age % 4 < 2) sparkle(c, 1, x0, y0 - age * S, age % 4 === 0 ? 2 : 1, true);
        break;
      case 'green':
        leaf(c, 1, x0 + side * age * 0.5 * S, y0 - age * 0.8 * S + Math.sin(age) * 1.5 * S, Math.floor(age / 2));
        break;
      case 'blue':
        if (age < 8) stamp(fx, 1, pal, x0, y0 - (age * 1.2 - 0.1 * age * age) * S, age > 5 ? DROP_DOWN : DROP_UP);
        break;
      case 'indigo':
      case 'violet': {
        const x = x0 - age * 0.4 * S;
        const y = y0 - age * 0.9 * S;
        stamp(fx, 1, pal, x, y, u < 0.5 ? ['.3.', '343', '232', '.1.'] : ['.2.', '232', '.1.'], 225);
        break;
      }
      case 'white':
        sparkle(c, 1, x0, y0, [1, 2, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0][age]);
        break;
      case 'black':
        orb(c, 1, x0 - age * 0.3 * side * S, y0 - age * 0.5 * S, 1.5 * S);
        break;
    }
  }
}

function auraRim(c: Ctx, id: ChakraColorId, s: Src, level: number): void {
  if (id !== 'black') {
    rimGlow(c, s, level);
    return;
  }
  // the void rim is purple light around a black core so it reads on dark backgrounds
  const p = pulse(c.t);
  for (let i = 0; i < N * N; i++) {
    const d = s.dist[i];
    if (d === 1) c.fx.put(0, i % N, Math.floor(i / N), c.pal[1], 255);
    else if (d === 2) c.fx.put(0, i % N, Math.floor(i / N), c.pal[p > 0.6 ? 3 : 2], 255);
    else if (d === 3 && (p > 0.5 || level > 0.5)) c.fx.put(0, i % N, Math.floor(i / N), c.pal[2], 170);
  }
  for (const i of s.rim) if (hash(i, Math.floor(c.t / 3), c.seed) > 0.93) c.fx.put(0, i % N, Math.floor(i / N), c.accent);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

type BurstFn = (c: Ctx, s: Src, L: number) => void;

const BURSTS: Record<ChakraColorId, BurstFn> = {
  red: redBurst,
  orange: orangeBurst,
  yellow: yellowBurst,
  green: greenBurst,
  blue: blueBurst,
  indigo: indigoBurst,
  violet: violetBurst,
  white: whiteBurst,
  black: blackBurst,
};

/**
 * Returns two GRIDxGRID RGBA buffers: `back` is drawn behind the sprite, `front` on top of it.
 * `sprite` is the sprite's own GRIDxGRID RGBA (alpha>0 = body pixels) so effects can hug the
 * silhouette. Deterministic for a given tick; loops every CHAKRA_LOOP ticks.
 * `color` picks the burst (its element and shape); `tint`, when set, recolors it with another
 * chakra color's palette or any '#rrggbb' (red water, black lightning, green fire...).
 */
export function renderChakra(
  color: ChakraColorId,
  mode: ChakraMode,
  tick: number,
  sprite: Uint8ClampedArray,
  rig: Rig,
  tint?: string,
): { back: Uint8ClampedArray; front: Uint8ClampedArray } {
  const fx = new Fx();
  const id: ChakraColorId = PALS[color] ? color : 'blue';
  const t = mod(Math.floor(tick), CHAKRA_LOOP);
  const body = bodySrc(sprite, rig);
  const tone = tint && (Object.prototype.hasOwnProperty.call(PALS, tint) || /^#[0-9a-f]{6}$/i.test(tint)) ? tint : id;
  const p = tintPal(tone);
  const voidPal = tone === 'black';
  const c: Ctx = {
    fx,
    t,
    pal: p,
    seed: SEEDS[id],
    rig,
    sprite,
    rimBase: tone === 'red' ? 2 : 3,
    accent: voidPal ? VOID_RED : p[4],
    accentDark: voidPal ? VOID_DARKRED : p[1],
  };
  const burst = BURSTS[id];
  switch (mode) {
    case 'aura':
      auraRim(c, id, body, 0.3);
      auraMotes(c, id, body);
      break;
    case 'charge':
      burst(c, body, 1);
      auraRim(c, id, body, 1);
      break;
    case 'cast':
      auraRim(c, id, body, 0.5);
      burst(c, handSrc(rig, 'F', 2.6 * S, 2.2 * S), 1);
      break;
    case 'victory':
      burst(c, body, 0.7);
      auraRim(c, id, body, 0.8);
      burst(c, handSrc(rig, 'N', 2 * S, 1.2 * S), 0.5);
      break;
  }
  return { back: fx.back, front: fx.front };
}
