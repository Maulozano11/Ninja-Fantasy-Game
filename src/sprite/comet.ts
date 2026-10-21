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
 * The deep blue line round the ribbon: its step of PHASE_RAMP and opacity, and the half width the
 * ribbon beside it must have (it fades in over OUTLINE_IN more), so the thin cool end has none.
 */
const OUTLINE_STEP = 0;
const OUTLINE_A = 0.85;
const OUTLINE_MIN = 1.2;
const OUTLINE_IN = 1.3;
/** (d / r) ** 1.6 by (d / r) ** 2 in RIM_LUT steps: a power per pixel is the slow part of making a comet. */
const RIM_LUT = 1024;
const RIM_FALL = Float32Array.from({ length: RIM_LUT + 1 }, (_, i) => (i / RIM_LUT) ** 0.8);

/** The comet's heat and halo fields while it is made (cometRaster), grown when a comet needs more room. */
const field = { heat: new Float32Array(0), glow: new Float32Array(0), rad: new Float32Array(0) };

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
  // Scratch fields, kept between comets (one is made every screen frame of a flight): cleared, not remade.
  const n = w * h;
  if (field.heat.length < n) {
    field.heat = new Float32Array(n * 2);
    field.glow = new Float32Array(n * 2);
    field.rad = new Float32Array(n * 2);
  }
  const heat = field.heat;
  const glow = field.glow;
  const rad = field.rad;
  rad.fill(0, 0, n);
  heat.fill(0, 0, n);
  glow.fill(0, 0, n);
  for (const s of samples) {
    if (s.v <= 0) continue;
    const r = Math.max(0.5, s.r);
    const reach = r + HALO;
    const reach2 = reach * reach;
    const r2 = r * r;
    const gIn = s.v * HALO_K;
    for (let py = Math.floor(s.y - reach); py <= Math.floor(s.y + reach); py++) {
      const dy = py + 0.5 - s.y;
      const dy2 = dy * dy;
      if (dy2 > reach2) continue;
      const row = (py - Y0) * w - X0;
      for (let px = Math.floor(s.x - reach); px <= Math.floor(s.x + reach); px++) {
        const dx = px + 0.5 - s.x;
        const d2 = dx * dx + dy2;
        if (d2 > reach2) continue;
        const i = row + px;
        if (d2 <= r2) {
          if (gIn > glow[i]) glow[i] = gIn;
          if (r > rad[i]) rad[i] = r;
          // Only a sample hotter than the pixel so far can change it (its heat there is at most s.v).
          if (s.v > heat[i]) {
            const c = s.v * (1 - RIM * RIM_FALL[Math.round((d2 / r2) * RIM_LUT)]);
            if (c > heat[i]) heat[i] = c;
          }
        } else if (gIn > glow[i]) {
          const g = gIn * (1 - (Math.sqrt(d2) - r) / HALO);
          if (g > glow[i]) glow[i] = g;
        }
      }
    }
  }
  const core = new Uint8ClampedArray(n * 4);
  const halo = new Uint8ClampedArray(n * 4);
  const hc = PHASE_RAMP[HALO_STEP];
  const a1 = Math.min(1, alpha);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (heat[i] <= 0 && glow[i] <= 0) continue;
      const m = mask ? mask(X0 + x + 0.5, Y0 + y + 0.5) : 1;
      if (m <= 0) continue;
      const c = heat[i] * m;
      let k = 0;
      while (k < STEPS.length && c < STEPS[k][0]) k++;
      if (k < STEPS.length) {
        const step = STEPS[k];
        const col = PHASE_RAMP[step[1]];
        core[i * 4] = col[0];
        core[i * 4 + 1] = col[1];
        core[i * 4 + 2] = col[2];
        core[i * 4 + 3] = Math.round(255 * step[2] * a1);
      }
      const g = glow[i] * m * a1;
      if (g > 0.02) {
        halo[i * 4] = hc[0];
        halo[i * 4 + 1] = hc[1];
        halo[i * 4 + 2] = hc[2];
        halo[i * 4 + 3] = Math.round(255 * Math.min(1, g));
      }
    }
  // A deep blue line round the hot part of the ribbon, like the black line round a sprite: the tail
  // keeps its shape over the ninja's own blue light body and over pale ground. Its thin cool end has
  // none (a one-pixel thread stays one pixel).
  const ol = PHASE_RAMP[OUTLINE_STEP];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (core[i * 4 + 3] > 0) continue;
      let next = 0;
      if (x > 0) next = Math.max(next, wide(rad, i - 1, core));
      if (x < w - 1) next = Math.max(next, wide(rad, i + 1, core));
      if (y > 0) next = Math.max(next, wide(rad, i - w, core));
      if (y < h - 1) next = Math.max(next, wide(rad, i + w, core));
      if (next <= 0) continue;
      const m = mask ? mask(X0 + x + 0.5, Y0 + y + 0.5) : 1;
      if (m <= 0) continue;
      core[i * 4] = ol[0];
      core[i * 4 + 1] = ol[1];
      core[i * 4 + 2] = ol[2];
      core[i * 4 + 3] = Math.round(255 * OUTLINE_A * Math.min(1, (next - OUTLINE_MIN) / OUTLINE_IN) * m * a1);
    }
  return { x: X0, y: Y0, w, h, core, halo };
}

/** How wide the ribbon is at its pixel `i`, when it is drawn there and wide enough to have the deep blue line beside it (0 otherwise). */
function wide(rad: Float32Array, i: number, core: Uint8ClampedArray): number {
  return core[i * 4 + 3] > 0 && rad[i] > OUTLINE_MIN ? rad[i] : 0;
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
