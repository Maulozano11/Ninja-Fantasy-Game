// Shared fire pieces for vfx-a-fire.ts and vfx-a-fire-sig.ts: the palettes, flame tongues,
// edge erosion, embers and flow streaks.

import { Canvas, Color } from './kit';
import { Field, Pt, lerp, outlineIn, palette, pnoise, spark } from './vfx-a-lib';

export const FIRE = palette('#3d0a12', '#8a1a1c', '#d2341f', '#f2731c', '#fbac2c', '#ffe253', '#fff9dc');
/** Smoke lit from below by the fire. */
export const SMOKE = palette('#1a1015', '#33232a', '#4a3436', '#634844', '#7e5e52', '#9c7a66', '#b89880');
/** Rock and dirt debris. */
export const ROCK = palette('#1a1015', '#3a2622', '#5c3e30', '#80583e', '#a5784e', '#c89a64', '#e0bc84');

export const TH = [0, 0.13, 0.27, 0.43, 0.6, 0.79];

/** A flame tongue from `base` toward angle `a` (radians): a teardrop that sways and tapers to a curled point. */
export function tongue(f: Field, base: Pt, a: number, len: number, w: number, heat: number, sway = 0.25, phase = 0, curl = 0): void {
  const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
  const pts: Pt[] = [];
  for (let k = 0; k <= 14; k++) {
    const u = k / 14;
    const s = Math.sin(u * Math.PI * 1.3 + phase) * sway * len * u + curl * u * u * len;
    pts.push([base[0] + dx * len * u + px * s, base[1] + dy * len * u + py * s]);
  }
  f.path(pts, (u) => (u < 0.2 ? w * lerp(0.8, 1, u / 0.2) : w * Math.pow((1 - u) / 0.8, 0.85)) + 0.5, (u) => heat * (1 - 0.7 * u));
}

/** Eats ragged holes into the cool edges of a field with noise (hot cores survive). */
export function erode(f: Field, amount: number, noiseAt: (x: number, y: number) => number, only?: (x: number, y: number) => number): void {
  f.map((h, x, y) => {
    if (h <= 0) return 0;
    const k = only ? only(x, y) : 1;
    return h - (1 - h) * (noiseAt(x, y) - 0.38) * amount * k;
  });
}

/** Embers: a particle layer with hot 1-2 px specks outlined in dark red, kept off `avoid`. */
export function embers(w: number, h: number, list: { x: number; y: number; s: number }[], avoid?: Canvas | null, pal: Color[] = FIRE): Canvas {
  const c = new Canvas(w, h);
  for (const e of list) {
    if (avoid) {
      let hit = false;
      for (let oy = -2; oy <= 3 && !hit; oy++) for (let ox = -2; ox <= 3 && !hit; ox++) if (avoid.alpha(Math.round(e.x) + ox, Math.round(e.y) + oy) > 0) hit = true;
      if (hit) continue;
    }
    spark(c, e.x, e.y, e.s, pal);
  }
  outlineIn(c, pal[0]);
  return c;
}
/** Flow streaks inside flames: band edges stretched along x (periodic over `per` px). */
export const flow = (s: number, amp = 0.12, per = 64, seed = 5) => (x: number, y: number) => (pnoise((x - s) * 0.25, y, 2, per / 4, 0, seed) - 0.5) * 2 * amp;

