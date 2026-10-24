// RotSprite on colour keys for the effect generators: a picture of his turned to any angle with
// every pixel one of his (at his own angle, his pixels exactly), and a sprite of rows turned to a
// fan of flight angles. Shared by vfx-dc.ts (the rank D and C volleys) and vfx-round1.ts (the
// water dragon's head).

import { Canvas, WorldSprite } from './kit';

export const key = (c: number[]): number => (c[3] ? ((c[0] << 24) | (c[1] << 16) | (c[2] << 8) | c[3]) >>> 0 : 0);
const unkey = (k: number): [number, number, number, number] => [(k >>> 24) & 255, (k >>> 16) & 255, (k >>> 8) & 255, k & 255];

/** Scale2x on colour keys (the same rules as src/sprite/rotsprite.ts). */
function scale2x(src: Uint32Array, w: number, h: number): Uint32Array {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
  const out = new Uint32Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      out[y * 2 * (w * 2) + x * 2] = e0;
      out[y * 2 * (w * 2) + x * 2 + 1] = e1;
      out[(y * 2 + 1) * (w * 2) + x * 2] = e2;
      out[(y * 2 + 1) * (w * 2) + x * 2 + 1] = e3;
    }
  return out;
}

/**
 * Turns a picture by `deg` (screen degrees, + = clockwise) around the pixel `pivot`, RotSprite
 * style (src/sprite/rotsprite.ts): up 8x with Scale2x three times, nearest-neighbour turn, and each
 * output pixel sampled at its centre, so at 0 degrees every pixel is copied exactly. Returns the
 * pixels relative to the pivot.
 */
export function rotSprite(c: Canvas, pivot: [number, number], deg: number): { dx: number; dy: number; c: [number, number, number, number] }[] {
  const S = 8;
  let g: Uint32Array = new Uint32Array(c.w * c.h);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) g[y * c.w + x] = key(c.get(x, y));
  let w = c.w, h = c.h;
  for (let k = 0; k < 3; k++) {
    g = scale2x(g, w, h);
    w *= 2;
    h *= 2;
  }
  const px0 = (pivot[0] + 0.5) * S, py0 = (pivot[1] + 0.5) * S;
  const rad = (deg * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
  const corners = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => [(x - px0) * cos - (y - py0) * sin, (x - px0) * sin + (y - py0) * cos]);
  const minX = Math.floor(Math.min(...corners.map((p) => p[0])) / S) - 1, maxX = Math.ceil(Math.max(...corners.map((p) => p[0])) / S) + 1;
  const minY = Math.floor(Math.min(...corners.map((p) => p[1])) / S) - 1, maxY = Math.ceil(Math.max(...corners.map((p) => p[1])) / S) + 1;
  const out: { dx: number; dy: number; c: [number, number, number, number] }[] = [];
  for (let oy = minY; oy <= maxY; oy++)
    for (let ox = minX; ox <= maxX; ox++) {
      const rx = ox * S, ry = oy * S;
      const sx = Math.floor(rx * cos + ry * sin + px0), sy = Math.floor(-rx * sin + ry * cos + py0);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const k = g[sy * w + sx];
      if (k) out.push({ dx: ox, dy: oy, c: unkey(k) });
    }
  return out;
}

/**
 * A turned sprite: for every flight angle in `angles` a row of the frames turned from `own` (the
 * angle the art points in his sheet) to it, all on one frame size with the pivot as the anchor.
 */
export function turned(name: string, label: string, src: Canvas[], pivot: [number, number], own: number, angles: number[], fps: number): WorldSprite {
  const rows = angles.map((a) => src.map((f) => rotSprite(f, pivot, a - own)));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const row of rows)
    for (const f of row)
      for (const p of f) {
        x0 = Math.min(x0, p.dx);
        y0 = Math.min(y0, p.dy);
        x1 = Math.max(x1, p.dx);
        y1 = Math.max(y1, p.dy);
      }
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  const anims: WorldSprite['anims'] = {};
  angles.forEach((a, r) => {
    anims[`a${a}`] = {
      fps,
      frames: rows[r].map((f) => {
        const c = new Canvas(W, H);
        for (const p of f) c.set(p.dx - x0, p.dy - y0, p.c);
        return c;
      }),
    };
  });
  return { name, label, meters: [+(W / 57).toFixed(2), +(H / 57).toFixed(2)], anchor: [-x0, -y0], tags: ['vfx'], anims };
}

/** Flight angles from -90 to 90 degrees, `step` apart. */
export const fan = (step: number): number[] => Array.from({ length: 180 / step + 1 }, (_, i) => -90 + i * step);

