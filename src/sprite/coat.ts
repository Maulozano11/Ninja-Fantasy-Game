// A weapon coated with poison (battle/senbon.ts), drawn on the figure itself: the held weapon's own
// pixels take a green sheen, and drops of poison gather at its lowest edge and fall. His black line
// is never tinted. With no weapon in hand (fists, a stowed blade) the drops fall from the near fist,
// where the coated kunai and senbon are thrown from. Pure pixels, no canvas.
//
// New art, waiting for the owner's approval (docs/GAMEPLAY_DESIGN.md, "Senbon, weapon poison and the
// healing senbon"): on the branch `items/senbon` only.

import type { SpriteFrame } from './compose';
import { GRID, partIndex } from './raster';

/** The poison ramp, dark to light: the venom jutsu's greens (vfx_poison), shadows cool, lights warm. */
export const COAT_RAMP = ['#173b12', '#2f6b1f', '#4f9a2a', '#7cc93a', '#b5ef6a', '#e6ffb0'];
/** The figure's line colour: the drops get it too (a 1 px line, as everything solid). */
const LINE = [7, 6, 11];
/** How much of the coat's green goes over the weapon's own colour (0..1): the steel still reads under it. */
export const COAT_MIX = 0.7;
/** The drip's loop, in frames. */
export const COAT_FRAMES = 8;

const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RAMP = COAT_RAMP.map(hexRgb);

/** The figure's line: near-black pixels are left as they are. */
const isLine = (r: number, g: number, b: number): boolean => r + g + b < 90;

/**
 * The frame with its weapon coated: a copy of `f.rgba` (GRID x GRID, facing right) with the held
 * item's pixels in the coat's green by their own lightness (light from the upper left stays where
 * it was), and frame `tick` of the drip loop under it.
 */
export function coatPixels(f: SpriteFrame, tick: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(f.rgba);
  const held = partIndex('held');
  let mask = (i: number) => f.part[i] === held && f.rgba[i * 4 + 3] > 0;
  let any = false;
  for (let i = 0; i < GRID * GRID && !any; i++) any = mask(i);
  // No weapon in hand: the drops fall from the near fist.
  if (!any) {
    const hand = partIndex('handN');
    mask = (i: number) => f.part[i] === hand && f.rgba[i * 4 + 3] > 0;
  }
  // The sheen.
  for (let i = 0; i < GRID * GRID; i++) {
    if (!any || !mask(i)) continue;
    const r = f.rgba[i * 4], g = f.rgba[i * 4 + 1], b = f.rgba[i * 4 + 2];
    if (isLine(r, g, b)) continue;
    const l = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    const c = RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.round(l * (RAMP.length - 1) * 1.1)))];
    out[i * 4] = Math.round(r + (c[0] - r) * COAT_MIX);
    out[i * 4 + 1] = Math.round(g + (c[1] - g) * COAT_MIX);
    out[i * 4 + 2] = Math.round(b + (c[2] - b) * COAT_MIX);
  }
  // The lowest pixel of the weapon (or fist) in each column.
  const low = new Int16Array(GRID).fill(-1);
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (mask(y * GRID + x)) low[x] = y;
  const cols: number[] = [];
  for (let x = 0; x < GRID; x++) if (low[x] >= 0) cols.push(x);
  if (!cols.length) return out;
  // Three drops along it, each on its own beat of the loop: it swells at the edge, lets go, falls.
  const picks = cols.length < 6 ? [cols[cols.length >> 1]] : [cols[Math.floor(cols.length * 0.2)], cols[Math.floor(cols.length * 0.55)], cols[Math.floor(cols.length * 0.85)]];
  picks.forEach((x, k) => {
    const phase = (tick + k * 3) % COAT_FRAMES;
    const y0 = low[x] + 1;
    if (phase < 3) {
      // Swelling at the edge: 1, then 2 pixels hanging.
      drop(out, x, y0, Math.min(2, phase + 1), 1);
    } else {
      // Falling, a little longer as it goes, then gone.
      const dy = (phase - 2) * 4;
      if (phase < COAT_FRAMES - 1) drop(out, x, y0 + dy, 3, 2);
    }
  });
  return out;
}

/** A drop `h` pixels tall and `w` wide with its top at (x, y): the coat's light on its upper left, its line round it. */
function drop(out: Uint8ClampedArray, x: number, y: number, h: number, w: number): void {
  const set = (px: number, py: number, c: number[], only = false) => {
    if (px < 0 || py < 0 || px >= GRID || py >= GRID) return;
    const i = (py * GRID + px) * 4;
    // The line goes only where nothing is drawn (it never cuts into the figure).
    if (only && out[i + 3] > 0) return;
    out[i] = c[0];
    out[i + 1] = c[1];
    out[i + 2] = c[2];
    out[i + 3] = 255;
  };
  for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) {
    const inside = yy >= y && yy < y + h && xx >= x && xx < x + w;
    const corner = (yy === y - 1 || yy === y + h) && (xx === x - 1 || xx === x + w);
    if (!inside && !corner) set(xx, yy, LINE, true);
  }
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, yy === y && xx === x ? RAMP[5] : yy === y + h - 1 ? RAMP[2] : RAMP[3]);
}
