// Decodes the owner's reference pieces (vfx-a-fire-refdata.ts, made by art2/vfx-a-extract.py)
// into canvases, and the small moves the generator animates them with.

import { Canvas, Color, hex } from './kit';
import { REF_PIECES } from './vfx-a-fire-refdata';
import { pnoise } from './vfx-a-lib';

export interface Piece { c: Canvas; x: number; y: number; pal: Color[] }
const cache = new Map<string, Piece>();

/** A reference piece as a canvas, with its placement in its sprite's frame. */
export function refPiece(name: string): Piece {
  const hit = cache.get(name);
  if (hit) return hit;
  const p = REF_PIECES[name];
  if (!p) throw new Error(`vfx-a-ref: no reference piece "${name}"`);
  const pal = p.pal.map((h) => hex(h));
  const c = new Canvas(p.w, p.h);
  const bytes = Buffer.from(p.rle, 'base64');
  let i = 0;
  for (let k = 0; k + 1 < bytes.length; k += 2) {
    const n = bytes[k], v = bytes[k + 1];
    if (v) for (let j = 0; j < n; j++) c.set((i + j) % p.w, Math.floor((i + j) / p.w), pal[v - 1]);
    i += n;
  }
  const out = { c, x: p.x, y: p.y, pal };
  cache.set(name, out);
  return out;
}

/**
 * Redraws a canvas with every pixel moved by `disp(x, y)` (read from the source spot), for
 * flickering flames and wobbling bodies without changing the drawing.
 */
export function displace(c: Canvas, disp: (x: number, y: number) => [number, number]): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const [dx, dy] = disp(x, y);
      const p = c.get(Math.round(x - dx), Math.round(y - dy));
      if (p[3]) out.set(x, y, p);
    }
  return out;
}

/** A flame flicker: pixels sway sideways more the higher they are above `baseY`, varying with phase. */
export function flicker(c: Canvas, ph: number, amp: number, baseY: number, seed: number): Canvas {
  return displace(c, (x, y) => {
    const up = Math.max(0, baseY - y) / Math.max(1, baseY);
    const n = pnoise(x * 0.5, y * 0.25 + ph * 3, 6, 0, 0, seed) - 0.5;
    return [Math.round((Math.sin(y * 0.18 + ph) * 0.6 + n * 1.4) * amp * up), Math.round(-Math.abs(n) * amp * up * 0.6)];
  });
}

/** Cuts a piece off below a ragged line (y > cut(x)), so it sinks into flames without a straight edge. */
export function raggedCut(c: Canvas, cut: (x: number) => number): Canvas {
  const out = c.clone();
  for (let x = 0; x < c.w; x++) for (let y = Math.max(0, Math.floor(cut(x))); y < c.h; y++) out.set(x, y, [0, 0, 0, 0]);
  return out;
}
