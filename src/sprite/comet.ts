// A shooting star of the phase's blue light: the comet a Ryusei's thrown weapon becomes in its
// Shooting-Star Thrust (Estocada Fugaz, id ryusei_warp; the owner, 2026-10-21: "el arma se lanza con
// la estela para parecerse a mi shooting star"). The battle (components/battle/warpFlight.ts) lays a
// path of samples along the way the weapon went; this turns them into pixels: a ribbon white at its
// heart near the weapon, fading through the phase's blues (PHASE_RAMP) as it tapers to one clear
// pixel at its end, and a soft halo of blue light round it, added as light.
// Pure pixels, no canvas: the battle draws the buffers.

import { PHASE_RAMP } from './phase';

export interface XY {
  x: number;
  y: number;
}

/** One point of the comet: where (map pixels), its half width, and how hot it is there (0..1, 1 white). */
export interface CometSample {
  x: number;
  y: number;
  r: number;
  v: number;
}

/** A comet in pixels: its box on the map, and two RGBA buffers of that size (the ribbon, laid over; its halo, added as light). */
export interface CometRaster {
  x: number;
  y: number;
  w: number;
  h: number;
  core: Uint8ClampedArray<ArrayBuffer>;
  halo: Uint8ClampedArray<ArrayBuffer>;
}

/** How hot a pixel of the ribbon must be (at least) for each step of PHASE_RAMP, and how opaque that step is laid. */
const STEPS: readonly (readonly [number, number, number])[] = [
  [0.82, 8, 1],
  [0.66, 7, 1],
  [0.52, 6, 0.95],
  [0.4, 5, 0.86],
  [0.29, 4, 0.74],
  [0.19, 3, 0.6],
  [0.1, 2, 0.44],
];
/** How far the halo reaches past the ribbon (pixels), its step of PHASE_RAMP and its strength. */
const HALO = 3;
const HALO_STEP = 4;
const HALO_K = 0.62;
/** How much darker the ribbon's edge is than its heart: white inside, blue on the rim, so it reads on bright grass too. */
const RIM = 0.72;

/**
 * The comet's pixels. Each sample lights the pixels within its half width (hottest on its line,
 * RIM darker at the edge) and its halo HALO pixels further; where samples overlap a pixel keeps the
 * hottest, so the ribbon is even however densely it is sampled. `mask` (0..1 at a pixel's centre)
 * takes light away where it must not show (the thrower's face); `alpha` is the whole comet's opacity.
 */
export function cometRaster(samples: readonly CometSample[], alpha = 1, mask?: (x: number, y: number) => number): CometRaster | null {
  if (!samples.length || alpha <= 0.01) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of samples) {
    const reach = s.r + HALO + 1;
    x0 = Math.min(x0, s.x - reach);
    y0 = Math.min(y0, s.y - reach);
    x1 = Math.max(x1, s.x + reach);
    y1 = Math.max(y1, s.y + reach);
  }
  const X0 = Math.floor(x0);
  const Y0 = Math.floor(y0);
  const w = Math.floor(x1) - X0 + 1;
  const h = Math.floor(y1) - Y0 + 1;
  const heat = new Float32Array(w * h);
  const glow = new Float32Array(w * h);
  for (const s of samples) {
    if (s.v <= 0) continue;
    const r = Math.max(0.5, s.r);
    const reach = r + HALO;
    for (let py = Math.floor(s.y - reach); py <= Math.floor(s.y + reach); py++)
      for (let px = Math.floor(s.x - reach); px <= Math.floor(s.x + reach); px++) {
        const d = Math.hypot(px + 0.5 - s.x, py + 0.5 - s.y);
        if (d > reach) continue;
        const i = (py - Y0) * w + (px - X0);
        if (d <= r) {
          const c = s.v * (1 - RIM * (d / r) ** 1.6);
          if (c > heat[i]) heat[i] = c;
        }
        const g = s.v * HALO_K * (d <= r ? 1 : 1 - (d - r) / HALO);
        if (g > glow[i]) glow[i] = g;
      }
  }
  const core = new Uint8ClampedArray(w * h * 4);
  const halo = new Uint8ClampedArray(w * h * 4);
  const hc = PHASE_RAMP[HALO_STEP];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (heat[i] <= 0 && glow[i] <= 0) continue;
      const m = mask ? mask(X0 + x + 0.5, Y0 + y + 0.5) : 1;
      if (m <= 0) continue;
      const c = heat[i] * m;
      const step = STEPS.find((st) => c >= st[0]);
      if (step) {
        const col = PHASE_RAMP[step[1]];
        core[i * 4] = col[0];
        core[i * 4 + 1] = col[1];
        core[i * 4 + 2] = col[2];
        core[i * 4 + 3] = Math.round(255 * step[2] * Math.min(1, alpha));
      }
      const g = glow[i] * m * Math.min(1, alpha);
      if (g > 0.02) {
        halo[i * 4] = hc[0];
        halo[i * 4 + 1] = hc[1];
        halo[i * 4 + 2] = hc[2];
        halo[i * 4 + 3] = Math.round(255 * Math.min(1, g));
      }
    }
  return { x: X0, y: Y0, w, h, core, halo };
}

/** The comet's width and heat `u` of the way from its head (0) to its end (1): wide and white, tapering to one dim pixel. */
export function cometProfile(u: number, width: number): { r: number; v: number } {
  const k = Math.max(0, 1 - u);
  return { r: 0.5 + (width - 0.5) * k ** 0.85, v: k ** 0.65 };
}

/** The way the tail's head went: where it was at `w` (0..1 of the flight) and when (ms). */
export interface CometPath {
  at(w: number): XY;
  msAt(w: number): number;
}

/** The tail's sampling step along its way (pixels). */
const STEP = 0.6;

/**
 * The tail, as samples from its head back along the way it went: the stretch the head travelled in
 * the last `lag` ms, but no longer than `maxLen` pixels, nor before the flight began (w 0). Each
 * point takes its width and heat from how far along the tail it is, by age, by length or by its
 * share of the tail there is, whichever is furthest (cometProfile), so the tail always tapers to
 * nothing at its end, a young one too; once the head stops, the tail runs on into it and cools.
 * `width`: its half width at the head.
 */
export function cometTail(path: CometPath, head: number, ms: number, lag: number, maxLen: number, width: number): CometSample[] {
  const pts: { x: number; y: number; s: number; u: number }[] = [];
  let w = head;
  let s = 0;
  for (let guard = 0; guard < 4000; guard++) {
    const p = path.at(w);
    const u = Math.max((ms - path.msAt(w)) / lag, s / maxLen);
    if (u >= 1) break;
    pts.push({ x: p.x, y: p.y, s, u });
    if (w <= 0) break;
    // About STEP pixels further back along the way.
    const dw = Math.min(w, 1e-3);
    const q = path.at(w - dw);
    const speed = Math.hypot(p.x - q.x, p.y - q.y) / dw;
    w = Math.max(0, w - (speed > 1e-6 ? STEP / speed : 1));
    s += STEP;
  }
  // The tail there is so far (cut short where the flight began) still tapers over its whole length.
  const len = pts.length ? pts[pts.length - 1].s + STEP : 1;
  return pts.map((q) => ({ x: q.x, y: q.y, ...cometProfile(Math.max(q.u, q.s / len), width) }));
}

/**
 * The comet's head round the weapon itself: from its back end `from` to its point `to`, as white as
 * the tail's head and a little wider than a blade at the back, narrowing to the point (the weapon is
 * drawn over it, so it shows as a white-hot rim round it).
 */
export function cometNose(from: XY, to: XY, width: number, v = 1): CometSample[] {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const n = Math.max(1, Math.ceil(len / STEP));
  const out: CometSample[] = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    out.push({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, r: 1.5 + (width - 1.5) * (1 - k) ** 0.7, v });
  }
  return out;
}
