// Fire for the burning trees (trees.ts): licking flame tongues, smoke billows, sparks and the heat
// glow that lights the leaves and bark around the flames.
//
// Look: the approved fire VFX (vfx-fire wall, blast, aura). Flames are tongues with a 7-step heat
// ramp (dark rim, dark red, red, orange, amber, yellow, white-hot core), outlined in the darkest
// fire red (never black), with a dark rim line wherever a front tongue overlaps a back one. All
// tongues lean with one common draft; back flames burn darker, front flames bright.
//
// Animation is a seamless loop over n frames with no popping: every source keeps a few tongues on
// staggered life cycles (each one swells from a bud at the base, licks up, splits its tip into two
// prongs, then collapses while its tip breaks off and floats away), and the inner texture is noise
// that scrolls upward and crossfades back onto itself over the loop.

import { Canvas, Color, hash, hex, lambert, noise } from './kit';
import { TAU, clamp, frac, rnd, smooth } from './foliage';

/** The approved fire VFX ramp: rim, dark red, red, orange, amber, yellow, white-hot. */
export const FIRE7 = ['#3d0a12', '#8a1a1c', '#d2341f', '#f2731c', '#fbac2c', '#ffe253', '#fff9dc'];
const FC: Color[] = FIRE7.map((h) => hex(h));

/** Upward-scrolling noise that loops over t in [0, 1): two offset copies crossfaded. */
function loopNoise(x: number, y: number, t: number, cell: number, scroll: number, seed: number): number {
  return noise(x, y + t * scroll, cell, seed) * (1 - t) + noise(x, y + (t - 1) * scroll, cell, seed) * t;
}

export interface FireSource {
  /** Base of the flame (where it leaves the burning clump), height and width at full life. */
  x: number;
  y: number;
  h: number;
  w: number;
  /** Depth (the clump's z): nearer things hide farther flames. */
  z: number;
  /** Heat 0.6 (back, darker) .. 1 (front, bright). */
  k: number;
  seed: number;
  /** Tongues kept alive at this source (default 3). */
  n?: number;
}

export interface FireLayer {
  W: number;
  H: number;
  /** Ramp step per pixel (0 = rim), -1 empty. */
  step: Int8Array;
  z: Float32Array;
}

interface TongueI {
  bx: number;
  by: number;
  h: number;
  w: number;
  L: number;
  k: number;
  z: number;
  seed: number;
  life: number;
}

/** Rasterises the flames of all sources at loop time t (0..1) into a fire layer. */
export function flames(W: number, H: number, src: FireSource[], t: number, o: { lean: number; seed: number }): FireLayer {
  const step = new Int8Array(W * H).fill(-1), z = new Float32Array(W * H), id = new Int32Array(W * H).fill(-1);
  const tongues: TongueI[] = [];
  src.forEach((s) => {
    const nT = s.n ?? 3;
    for (let j = 0; j < nT; j++) {
      const L = frac(t + j / nT + rnd(s.seed, j, 1) * 0.12);
      // Life: a bud at the base, swelling to full height, then collapsing (zero at both ends).
      const life = Math.pow(Math.sin(Math.PI * Math.pow(L, 0.7)), 0.85);
      const h = s.h * life * (0.72 + 0.4 * rnd(s.seed, j, 2));
      const w = s.w * (0.5 + 0.5 * life) * (0.8 + 0.4 * rnd(s.seed, j, 3));
      const bx = s.x + (rnd(s.seed, j, 4) - 0.5) * s.w * 0.9;
      tongues.push({ bx, by: s.y, h, w, L, k: s.k * (0.9 + 0.1 * life), z: s.z, seed: s.seed * 7 + j, life });
    }
  });
  // Back to front; within a source the tallest tongue stands behind the smaller, hotter ones.
  tongues.sort((a, b) => a.z - b.z || b.h - a.h);
  tongues.forEach((T, ti) => {
    if (T.h < 2.5) return;
    const fork = smooth(0.42, 0.78, T.L);
    const ts = 0.48;
    const lean = o.lean + 0.05 * Math.sin(TAU * t);
    const x0 = Math.floor(T.bx - T.w - T.h * 0.4 - 4), x1 = Math.ceil(T.bx + T.w + T.h * (Math.abs(lean) + 0.4) + 4);
    const y0 = Math.floor(T.by - T.h * 1.05 - 2), y1 = Math.ceil(T.by + T.w * 0.35 + 1);
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
        const v = (T.by - (y + 0.5)) / T.h;
        if (v < -0.3 || v > 1.05) continue;
        const vv = Math.max(0, v);
        // Centre line: the common draft bends the tip, a wave licks up the tongue.
        const wave = Math.sin(TAU * (vv * 0.85 - T.L * 1.3) + T.seed) * T.w * 0.32 * vv;
        const cx = T.bx + lean * vv * vv * T.h + wave;
        let hw = v < 0 ? T.w * 0.5 * Math.sqrt(Math.max(0, 1 - (v / 0.3) ** 2)) : T.w * 0.5 * Math.pow(1 - vv, 0.8) * (1 + 0.18 * Math.sin(TAU * (vv * 1.6 - T.L) + T.seed * 2));
        let u: number;
        if (fork > 0 && v > ts) {
          // The tip splits into two prongs that drift apart; the second one is a little shorter.
          const sp = fork * (v - ts) * T.h * 0.5;
          hw *= 1 - 0.3 * fork;
          const u1 = Math.abs(x + 0.5 - (cx - sp * 0.6)) / Math.max(0.4, hw);
          const short = v > 1 - 0.18 * fork ? 9 : 1;
          const u2 = (Math.abs(x + 0.5 - (cx + sp)) / Math.max(0.4, hw * 0.85)) * short;
          u = Math.min(u1, u2);
        } else u = Math.abs(x + 0.5 - cx) / Math.max(0.4, hw);
        const nz = loopNoise(x, y, t, 2.4, 14, o.seed) - 0.5;
        if (u > 1 + nz * 0.38 || hw < 0.35) continue;
        // Heat: hottest low in the middle; vertical streaks scroll up through the body.
        const streak = (loopNoise(x * 2.2, y * 0.35, t, 1.6, 6, o.seed + 9) - 0.5) * 0.2;
        const heat = T.k * (1 - Math.pow(clamp(u, 0, 1), 2.2)) * (1 - 0.8 * Math.pow(vv, 0.85)) + nz * 0.22 + streak;
        let st = heat > 0.88 && v < 0.32 ? 6 : heat > 0.7 ? 5 : heat > 0.52 ? 4 : heat > 0.34 ? 3 : heat > 0.17 ? 2 : 1;
        if (u > 0.8) st = Math.min(st, T.k < 0.8 ? 1 : 2);
        const p = y * W + x;
        step[p] = st;
        z[p] = T.z;
        id[p] = ti;
      }
    // Dying: the tip breaks off and floats up, shrinking.
    if (T.L > 0.68) {
      const q = (T.L - 0.68) / 0.32;
      const r = T.w * 0.3 * (1 - q) + 0.4;
      const wx = T.bx + lean * T.h + Math.sin(TAU * q + T.seed) * 2, wy = T.by - T.h - 3 - q * T.h * 0.6 - 2;
      for (let y = Math.floor(wy - r * 1.8); y <= wy + r * 1.8; y++)
        for (let x = Math.floor(wx - r); x <= wx + r; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const e = ((x + 0.5 - wx) / r) ** 2 + ((y + 0.5 - wy) / (r * 1.8)) ** 2;
          if (e > 1) continue;
          const p = y * W + x;
          step[p] = e < 0.35 && r > 1.4 ? 4 : q > 0.5 ? 2 : 3;
          z[p] = T.z;
          id[p] = ti;
        }
    }
  });
  // Rim lines on a back tongue where a front tongue overlaps it, then the outer outline.
  const rim: number[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (step[p] < 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const q = yy * W + xx;
        if (id[q] > id[p] && step[q] >= 0 && Math.abs(id[q] - id[p]) > 0) {
          rim.push(p);
          break;
        }
      }
    }
  for (const p of rim) step[p] = 0;
  const out: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (step[p] >= 0) continue;
      let zz = -Infinity;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const q = yy * W + xx;
        if (step[q] >= 0) zz = Math.max(zz, z[q]);
      }
      if (zz > -Infinity) out.push([p, zz]);
    }
  for (const [p, zz] of out) {
    step[p] = 0;
    z[p] = zz;
  }
  return { W, H, step, z };
}

/** Draws the fire layer over a canvas, hiding flame pixels behind nearer tree pixels (`hidden`). */
export function drawFire(c: Canvas, F: FireLayer, hidden: (x: number, y: number, z: number) => boolean): void {
  for (let y = 0; y < F.H; y++)
    for (let x = 0; x < F.W; x++) {
      const p = y * F.W + x;
      const s = F.step[p];
      if (s < 0 || hidden(x, y, F.z[p])) continue;
      c.set(x, y, FC[s]);
    }
}

/**
 * The heat glow: how strongly each pixel is lit by the flames (0..1). The flame mass is blurred
 * twice with a box of radius R and sampled `up` px lower, so the light reaches up from the fire.
 */
export function glowField(F: FireLayer, R: number, up: number, gain: number): Float32Array {
  const { W, H } = F;
  let a = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) a[p] = F.step[p] >= 2 ? (F.step[p] - 1) / 5 : 0;
  const blur = (src: Float32Array, horiz: boolean): Float32Array => {
    const dst = new Float32Array(W * H);
    const n = horiz ? W : H, m = horiz ? H : W;
    for (let j = 0; j < m; j++) {
      let acc = 0;
      const at = (i: number) => (horiz ? j * W + i : i * W + j);
      for (let i = -R; i <= R; i++) if (i >= 0 && i < n) acc += src[at(i)];
      for (let i = 0; i < n; i++) {
        dst[at(i)] = acc / (2 * R + 1);
        const add = i + R + 1, rem = i - R;
        if (add < n) acc += src[at(add)];
        if (rem >= 0) acc -= src[at(rem)];
      }
    }
    return dst;
  };
  for (let k = 0; k < 2; k++) a = blur(blur(a, true), false);
  const g = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const yy = Math.min(H - 1, y + up);
      g[y * W + x] = clamp(a[yy * W + x] * gain, 0, 1);
    }
  return g;
}

/** Sparks: rising ones ride the draft up from the flames; falling ones drop from the crown and cool. */
export function sparks(c: Canvas, o: { x0: number; y0: number; spread: number; rise: number; drift: number; n: number; t: number; seed: number; fall?: boolean }): void {
  for (let k = 0; k < o.n; k++) {
    const speed = rnd(o.seed, k, 1) < 0.3 ? 2 : 1;
    const p = frac(o.t * speed + rnd(o.seed, k, 2));
    const x0 = o.x0 + (rnd(o.seed, k, 3) - 0.5) * o.spread;
    if (!o.fall) {
      if (p > 0.92) continue;
      const x = Math.round(x0 + o.drift * p * p + Math.sin(TAU * p + k) * 3);
      const y = Math.round(o.y0 - rnd(o.seed, k, 4) * 30 - p * o.rise);
      const s = p < 0.25 ? 6 : p < 0.5 ? 5 : p < 0.75 ? 4 : 2;
      c.set(x, y, FC[s]);
      if (p < 0.45 && rnd(o.seed, k, 5) < 0.55) c.set(x, y + 1, FC[Math.max(2, s - 2)]);
    } else {
      // A falling ember: drifts and swings as it drops, cooling from yellow to a dark red speck.
      const x = Math.round(x0 + Math.sin(TAU * p * 1.5 + k) * 4 + o.drift * 0.3 * p);
      const y = Math.round(o.y0 + (rnd(o.seed, k, 4) - 0.5) * 40 + p * o.rise);
      if (p > 0.94) continue;
      const s = p < 0.2 ? 5 : p < 0.45 ? 4 : p < 0.7 ? 3 : p < 0.85 ? 2 : 1;
      c.set(x, y, FC[s]);
      if (rnd(o.seed, k, 6) < 0.4) {
        // A burning leaf: a 2 px flake with a dark edge.
        c.set(x + 1, y, FC[Math.max(1, s - 1)]);
        c.set(x, y + 1, FC[0]);
      }
    }
  }
}

// --- smoke --------------------------------------------------------------------------------

/** Smoke greys (lit from the upper left) and the fire-lit brown of the underside. */
const SMOKE = ['#262224', '#3e383a', '#585153', '#746c6c', '#928a86', '#b0a8a0'].map((h) => hex(h));
const SMOKE_WARM = ['#3a1c16', '#5a2c1c', '#7a4026'].map((h) => hex(h));

export interface Plume {
  x: number;
  y: number;
  rise: number;
  drift: number;
  size: number;
  seed: number;
}

/**
 * Smoke rising in soft billows: chains of cauliflower puffs (a core and a ring of lobes) that
 * swell as they rise and drift with the draft. Each puff depends only on its height along the
 * chain, so the loop is seamless. Lobes are lit from the upper left; where a lobe lies in front of
 * another the one behind drops a tone (the soft line between billows); the underside near the fire
 * is lit warm; the smoke thins with height in stepped alpha (no smooth fade), with a softer edge.
 */
export function smoke(W: number, H: number, plumes: Plume[], t: number): Canvas {
  const lobes: { x: number; y: number; r: number; z: number; id: number; s: number }[] = [];
  plumes.forEach((pl, pi) => {
    const K = 8;
    for (const [ci, off, side, size] of [[0, 0, 1, 1], [1, 0.5, -1, 0.82]] as [number, number, number, number][])
      for (let k = -1; k < K; k++) {
        const s = (k + off + t) / K;
        if (s <= 0.02 || s >= 1) continue;
        const x = pl.x + pl.drift * Math.pow(s, 1.5) + side * (2 + 3 * s) * Math.sin(s * TAU * 1.1 + ci * 2 + pl.seed);
        const y = pl.y - s * pl.rise;
        const grow = s < 0.12 ? 0.55 + 0.45 * (s / 0.12) : 1;
        const r = pl.size * (0.35 + 0.95 * Math.sqrt(s)) * grow * size;
        if (r < 1.5) continue;
        const pid = (pi * 2 + ci) * 64 + k + 1;
        const rot = s * 6 + ci * 1.7 + pl.seed;
        lobes.push({ x, y, r: r * 0.8, z: s * 10 + ci * 0.5, id: pid * 8, s });
        for (let q = 0; q < 4; q++) {
          const a = rot + (q / 4) * TAU;
          lobes.push({ x: x + Math.cos(a) * r * 0.5, y: y + Math.sin(a) * r * 0.38, r: r * (0.5 + 0.12 * Math.sin(q * 2.3 + rot)), z: s * 10 + ci * 0.5 - Math.sin(a) * 0.4, id: pid * 8 + 1 + q, s });
        }
      }
  });
  const N = W * H;
  const depth = new Float32Array(N).fill(Infinity), id = new Int32Array(N).fill(-1), lv = new Float32Array(N), sv = new Float32Array(N), vy = new Float32Array(N);
  for (const L of lobes)
    for (let y = Math.max(0, Math.floor(L.y - L.r)); y <= Math.min(H - 1, Math.ceil(L.y + L.r)); y++)
      for (let x = Math.max(0, Math.floor(L.x - L.r)); x <= Math.min(W - 1, Math.ceil(L.x + L.r)); x++) {
        const u = (x + 0.5 - L.x) / L.r, v = (y + 0.5 - L.y) / L.r;
        const d2 = u * u + v * v;
        if (d2 > 1) continue;
        const zz = Math.sqrt(1 - d2);
        const dep = L.z - zz * 0.3;
        const i = y * W + x;
        if (dep >= depth[i]) continue;
        depth[i] = dep;
        id[i] = L.id;
        lv[i] = lambert(u, v, zz);
        sv[i] = L.s;
        vy[i] = v;
      }
  const c = new Canvas(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (id[i] < 0) continue;
      let st = lv[i] > 0.78 ? 5 : lv[i] > 0.6 ? 4 : lv[i] > 0.42 ? 3 : lv[i] > 0.26 ? 2 : 1;
      st += hash(x >> 1, y >> 1, 77) < 0.12 ? -1 : 0;
      let edge = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (id[j] < 0) edge = true;
        else if (id[j] >> 3 !== id[i] >> 3 && depth[j] < depth[i] - 0.05) st -= 1;
      }
      const s = sv[i];
      let col = SMOKE[clamp(st, 0, 5)];
      // Fire-lit underside low in the column.
      if (s < 0.28 && vy[i] > 0.1) col = SMOKE_WARM[clamp(st - 1, 0, 2)];
      const a = (s < 0.45 ? 215 : s < 0.65 ? 175 : s < 0.82 ? 130 : 85) * (edge ? 0.6 : 1) * (s < 0.06 ? 0.7 : 1);
      c.set(x, y, [col[0], col[1], col[2], Math.round(a)]);
    }
  return c;
}
