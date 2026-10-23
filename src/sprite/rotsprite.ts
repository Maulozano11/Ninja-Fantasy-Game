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
  /** The template cell it was sampled from. */
  cx: number;
  cy: number;
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
      // Sample the source at the output pixel's centre (inverse rotation). The
      // pivot cell's centre maps to output (0, 0), so at 0° every pixel is
      // copied exactly instead of picking Scale2x corner sub-pixels.
      const rx = ox * S;
      const ry = oy * S;
      const sx = Math.floor(rx * cos + ry * sin + px0);
      const sy = Math.floor(-rx * sin + ry * cos + py0);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const ch = g[sy][sx];
      if (ch !== '.') out.push({ dx: ox, dy: oy, ch, cx: Math.floor(sx / S), cy: Math.floor(sy / S) });
    }
  }
  cache.set(key, out);
  if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
  return out;
}

/**
 * How near (template cells) to one of its line cells an empty pixel beside the template's inside must
 * come from for rotateLined to give it that line: within three quarters of a cell, the line was there
 * and the turn lost it; an open end (no line across it) stays open.
 */
const LINE_LOST = 0.75;

const linedCache = new Map<string, RotatedPixel[]>();

/**
 * rotateTemplate with the template's black line kept whole: turning a piece samples its pixels, and at
 * some angles a cell of the line round it falls between samples, so its inside lies bare against the
 * air or against another piece of the same colour. Each empty pixel beside the inside whose centre
 * comes from within LINE_LOST of a line cell (`line` says which characters are line) takes that cell's
 * character. Unturned, it is rotateTemplate exactly.
 */
export function rotateLined(t: PixelTemplate, deg: number, line: (ch: string) => boolean): RotatedPixel[] {
  const px = rotateTemplate(t, deg);
  const a = Math.round(deg);
  if (a % 360 === 0) return px;
  const cells: [number, number, string][] = [];
  t.rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && line(ch) && cells.push([x, y, ch])));
  const key = `${t.rows.join('|')}@${t.pivot.join(',')}@${a}@${[...new Set(cells.map((c) => c[2]))].sort().join('')}`;
  const hit = linedCache.get(key);
  if (hit) return hit;
  const rad = (a * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const taken = new Set(px.map((p) => `${p.dx},${p.dy}`));
  const out = [...px];
  for (const p of px) {
    if (line(p.ch)) continue;
    for (const [ex, ey] of [
      [p.dx + 1, p.dy],
      [p.dx - 1, p.dy],
      [p.dx, p.dy + 1],
      [p.dx, p.dy - 1],
    ]) {
      if (taken.has(`${ex},${ey}`)) continue;
      // Where this pixel's centre comes from in the template's cells (as rotateTemplate samples it).
      const u = ex * cos + ey * sin + t.pivot[0] + 0.5;
      const w = -ex * sin + ey * cos + t.pivot[1] + 0.5;
      let best = '';
      let near = LINE_LOST;
      let bx = 0;
      let by = 0;
      for (const [x, y, ch] of cells) {
        const d = Math.hypot(Math.max(x - u, 0, u - x - 1), Math.max(y - w, 0, w - y - 1));
        if (d < near) [near, best, bx, by] = [d, ch, x, y];
      }
      if (!best) continue;
      out.push({ dx: ex, dy: ey, ch: best, cx: bx, cy: by });
      taken.add(`${ex},${ey}`);
    }
  }
  linedCache.set(key, out);
  if (linedCache.size > 2000) linedCache.delete(linedCache.keys().next().value as string);
  return out;
}

/** Template palette: character → material index + shade (0-5). */
export type TemplatePalette = Record<string, [number, number]>;

/**
 * Stamps a (rotated) template into a layer at a design-space anchor. Pixels
 * keep their own shading (no texture pass) but still get the layer's
 * automatic outline, so rotated edges are outlined cleanly. With `line` (the
 * characters of its own black line), turned it keeps that line whole
 * (rotateLined).
 */
export function stampTemplate(
  L: Layer,
  t: PixelTemplate,
  anchor: { x: number; y: number },
  deg: number,
  palette: TemplatePalette,
  part: PartId,
  opts: { flipY?: boolean; flipX?: boolean; flags?: number; line?: (ch: string) => boolean; seal?: { rows: string[]; flag: number } } = {},
): void {
  const ax = Math.floor(anchor.x * RES);
  const ay = Math.floor(anchor.y * RES);
  let tt = t;
  // Marked cells (`seal`) flipped along with the template; a marked cell's pixels get `seal.flag`.
  let marks = opts.seal?.rows;
  if (opts.flipY) {
    tt = { rows: [...tt.rows].reverse(), pivot: [tt.pivot[0], tt.rows.length - 1 - tt.pivot[1]] };
    if (marks) marks = [...marks, ...Array<string>(Math.max(0, t.rows.length - marks.length)).fill('')].reverse();
  }
  if (opts.flipX) {
    const w = Math.max(...tt.rows.map((r) => r.length));
    tt = { rows: tt.rows.map((r) => r.padEnd(w, '.').split('').reverse().join('')), pivot: [w - 1 - tt.pivot[0], tt.pivot[1]] };
    if (marks) marks = marks.map((r) => r.padEnd(w, '.').split('').reverse().join(''));
  }
  const flags = opts.flags ?? F_NO_TEXTURE;
  const px = opts.line ? rotateLined(tt, deg, opts.line) : rotateTemplate(tt, deg);
  // Turned, a pixel can land on the piece's edge though the cell it was sampled from lay inside the piece
  // (the turn stepped past the edge's own cells) or outside it: it gets the seal flag too, so the edge is
  // closed there.
  const filled = (x: number, y: number) => y >= 0 && y < tt.rows.length && x >= 0 && x < tt.rows[y].length && tt.rows[y][x] !== '.';
  const out = marks && deg ? new Set(px.map((p) => `${p.dx},${p.dy}`)) : null;
  for (const p of px) {
    const pal = palette[p.ch];
    if (!pal) continue;
    // A lone pixel the turn left apart from the piece is no pixel of it.
    if (out && ![-1, 0, 1].some((y) => [-1, 0, 1].some((x) => (x || y) && out.has(`${p.dx + x},${p.dy + y}`)))) continue;
    let sealed = !!marks && marks[p.cy]?.[p.cx] === 'x';
    if (out && !sealed && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([x, y]) => !out.has(`${p.dx + x},${p.dy + y}`))) {
      // Or from an empty cell the upscaling filled in (a corner rounded off by Scale2x).
      sealed = !filled(p.cx, p.cy) || [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([x, y]) => filled(p.cx + x, p.cy + y));
    }
    L.set(ax + p.dx, ay + p.dy, pal[0], Math.max(0, Math.min(5, pal[1])), part, sealed ? flags | opts.seal!.flag : flags);
  }
}
