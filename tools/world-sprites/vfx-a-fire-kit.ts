// Shared fire pieces for vfx-a-fire.ts and vfx-a-fire-sig.ts: the palettes, flame tongues,
// edge erosion, embers and flow streaks.

import { Canvas, Color } from './kit';
import { Field, Pt, clamp, lerp, outlineIn, palette, pnoise, rr, spark } from './vfx-a-lib';

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


/**
 * A billow: a round puff of fire or smoke. heat 0 is pure smoke, 1 white-hot fire; `glow` lights
 * a smoke puff's underside from the fire below; `back` puffs are a step darker.
 */
export interface Billow { x: number; y: number; r: number; heat: number; glow?: number; back?: boolean; bumps?: number }
/**
 * Paints billows back to front (later ones overwrite earlier ones), each lit from the upper left
 * with a dark crease where it overlaps the one behind it and cauliflower bumps on its top, then
 * renders them: fire in the fire ramp (hotter toward each billow's lit side), smoke in the warm
 * smoke ramp, with dark outlines. Volumes of fire cooling into smoke, smoke trails, mushroom caps.
 */
export function billows(w: number, h: number, list: Billow[], seed: number, t = 0, smokePal: Color[] = SMOKE, alpha = 255): Canvas {
  const val = new Float32Array(w * h), heat = new Float32Array(w * h), glow = new Float32Array(w * h);
  const on = new Uint8Array(w * h);
  const ball = (b: Billow, px: number, py: number, pr: number) => {
    const x0 = Math.max(0, Math.floor(px - pr * 1.1)), x1 = Math.min(w - 1, Math.ceil(px + pr * 1.1));
    const y0 = Math.max(0, Math.floor(py - pr * 1.1)), y1 = Math.min(h - 1, Math.ceil(py + pr * 1.1));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - px) / pr, dy = (y + 0.5 - py) / pr;
        const d = Math.hypot(dx, dy);
        if (d > 1 + 0.08 * (pnoise(x, y - t * 40, Math.max(3, pr * 0.35), 0, 40, seed) - 0.5) * 2) continue;
        const i = y * w + x;
        let v = 0.5 - 0.34 * dy - 0.12 * dx - 0.2 * Math.pow(d, 4) + 0.07 * (pnoise(x, y, 4, 0, 0, seed + 1) - 0.5);
        if (dy < -0.4 && dx < 0.35 && d > 0.55) v += 0.1;
        if (b.back) v -= 0.12;
        if (on[i] && d > 0.86 && dy > -0.3) v = 0.06;
        val[i] = clamp(v, 0.02, 0.98);
        heat[i] = b.heat;
        glow[i] = (b.glow ?? 0) * Math.max(0, dy);
        on[i] = 1;
      }
  };
  for (const b of list) {
    ball(b, b.x, b.y, b.r);
    const nb = b.bumps ?? 3;
    for (let k = 0; k < nb; k++) {
      const a = -Math.PI / 2 + (k - (nb - 1) / 2) * 0.95 + rr(seed + 2, Math.round(b.x * 3 + b.y) + k, -0.2, 0.2);
      const br = b.r * rr(seed + 3, Math.round(b.x + b.y * 3) + k, 0.42, 0.6);
      ball(b, b.x + Math.cos(a) * b.r * 0.72, b.y + Math.sin(a) * b.r * 0.72, br);
    }
  }
  const c = new Canvas(w, h);
  const sth = [0, 0.12, 0.26, 0.42, 0.58, 0.76];
  for (let i = 0; i < w * h; i++) {
    if (!on[i]) continue;
    let col: Color;
    if (heat[i] >= 0.1) {
      const f = heat[i] * (0.45 + 0.75 * val[i]);
      let idx = 1;
      for (let k = 1; k < TH.length; k++) if (f >= TH[k]) idx = k + 1;
      col = FIRE[Math.min(6, val[i] < 0.08 ? Math.min(idx, 2) : idx)];
    } else {
      const v = val[i] + glow[i] * 0.35;
      let idx = 1;
      for (let k = 1; k < sth.length; k++) if (v >= sth[k]) idx = k + 1;
      col = smokePal[Math.min(6, idx)];
      // A smoke underside lit by the fire turns warm orange at the brightest step.
      if (glow[i] > 0.35 && idx >= 4) col = FIRE[idx >= 6 ? 3 : 2];
    }
    c.set(i % w, (i / w) | 0, alpha < 255 && heat[i] < 0.1 ? [col[0], col[1], col[2], alpha] : col);
  }
  const ol: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (on[y * w + x]) continue;
      let hot = -1;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + ox, yy = y + oy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h || !on[yy * w + xx]) continue;
        hot = Math.max(hot, heat[yy * w + xx]);
      }
      if (hot >= 0) ol.push(x, y, hot >= 0.1 ? 1 : 0);
    }
  for (let i = 0; i < ol.length; i += 3) c.set(ol[i], ol[i + 1], ol[i + 2] ? FIRE[0] : alpha < 255 ? [smokePal[0][0], smokePal[0][1], smokePal[0][2], alpha] : smokePal[0]);
  return c;
}

/** Grey smoke, for haze rising behind walls of fire. */
export const GREY = palette('#16161c', '#2c2b31', '#433f45', '#5b565a', '#746e70', '#8f898a', '#aaa4a3');
