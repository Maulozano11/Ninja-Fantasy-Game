// Pixel-art templates for rigid objects (weapons, shields…) and RotSprite
// rotation, so a template drawn once pointing right stays crisp at any angle.
//
// RotSprite: upscale 8x with Scale2x three times (keeps diagonals clean),
// rotate with nearest-neighbour sampling, then sample back down at 1/8.

import { F_NO_TEXTURE, Layer, PartId, RES } from './raster';

export interface PixelTemplate {
  rows: string[];
  /** Template cell that sits on the attachment point (e.g. the middle of the grip). */
  pivot: [number, number];
}

type Grid = string[][];

function toGrid(rows: string[]): Grid {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, '.').split(''));
}

function scale2x(src: Grid): Grid {
  const h = src.length;
  const w = src[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : src[y][x]);
  const out: Grid = Array.from({ length: h * 2 }, () => new Array(w * 2).fill('.'));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = at(x, y);
      const A = at(x, y - 1);
      const B = at(x + 1, y);
      const C = at(x - 1, y);
      const D = at(x, y + 1);
      let e0 = P;
      let e1 = P;
      let e2 = P;
      let e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      out[y * 2][x * 2] = e0;
      out[y * 2][x * 2 + 1] = e1;
      out[y * 2 + 1][x * 2] = e2;
      out[y * 2 + 1][x * 2 + 1] = e3;
    }
  }
  return out;
}

export interface RotatedPixel {
  dx: number;
  dy: number;
  ch: string;
}

const cache = new Map<string, RotatedPixel[]>();

/**
 * Rotates a template by `deg` (screen degrees, + = clockwise) around its
 * pivot. Returns pixels relative to the pivot. Results are cached per angle
 * (rounded to whole degrees).
 */
export function rotateTemplate(t: PixelTemplate, deg: number): RotatedPixel[] {
  const a = Math.round(deg);
  const key = `${t.rows.join('|')}@${t.pivot.join(',')}@${a}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 8;
  let g = toGrid(t.rows);
  g = scale2x(scale2x(scale2x(g)));
  const h = g.length;
  const w = g[0].length;
  const px0 = (t.pivot[0] + 0.5) * S;
  const py0 = (t.pivot[1] + 0.5) * S;
  const rad = (a * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Output bounds: rotate the template corners.
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ].map(([x, y]) => {
    const dx = x - px0;
    const dy = y - py0;
    return [dx * cos - dy * sin, dx * sin + dy * cos];
  });
  const minX = Math.floor(Math.min(...corners.map((c) => c[0])) / S) - 1;
  const maxX = Math.ceil(Math.max(...corners.map((c) => c[0])) / S) + 1;
  const minY = Math.floor(Math.min(...corners.map((c) => c[1])) / S) - 1;
  const maxY = Math.ceil(Math.max(...corners.map((c) => c[1])) / S) + 1;
  const out: RotatedPixel[] = [];
  for (let oy = minY; oy <= maxY; oy++) {
    for (let ox = minX; ox <= maxX; ox++) {
      // Sample the centre of the output pixel in the upscaled source (inverse rotation).
      const rx = (ox + 0.5) * S;
      const ry = (oy + 0.5) * S;
      const sx = Math.floor(rx * cos + ry * sin + px0);
      const sy = Math.floor(-rx * sin + ry * cos + py0);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const ch = g[sy][sx];
      if (ch !== '.') out.push({ dx: ox, dy: oy, ch });
    }
  }
  cache.set(key, out);
  if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
  return out;
}

/** Template palette: character → material index + shade (0-5). */
export type TemplatePalette = Record<string, [number, number]>;

/**
 * Stamps a (rotated) template into a layer at a design-space anchor. Pixels
 * keep their own shading (no texture pass) but still get the layer's
 * automatic outline, so rotated edges are outlined cleanly.
 */
export function stampTemplate(
  L: Layer,
  t: PixelTemplate,
  anchor: { x: number; y: number },
  deg: number,
  palette: TemplatePalette,
  part: PartId,
  opts: { flipY?: boolean } = {},
): void {
  const ax = Math.floor(anchor.x * RES);
  const ay = Math.floor(anchor.y * RES);
  const tt = opts.flipY ? { rows: [...t.rows].reverse(), pivot: [t.pivot[0], t.rows.length - 1 - t.pivot[1]] as [number, number] } : t;
  for (const p of rotateTemplate(tt, deg)) {
    const pal = palette[p.ch];
    if (!pal) continue;
    L.set(ax + p.dx, ay + p.dy, pal[0], pal[1], part, F_NO_TEXTURE);
  }
}
