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

/**
 * Scales a canvas by (sx, sy) about the point (ax, ay) of the canvas (nearest neighbour), into a
 * canvas of the same size; used to grow and shrink his pieces between his key frames.
 */
export function scaled(c: Canvas, sx: number, sy: number, ax: number, ay: number): Canvas {
  const out = new Canvas(c.w, c.h);
  if (sx <= 0.01 || sy <= 0.01) return out;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(Math.floor(ax + (x + 0.5 - ax) / sx), Math.floor(ay + (y + 0.5 - ay) / sy));
      if (p[3]) out.set(x, y, p);
    }
  return out;
}

const lumOf = (p: Color) => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];

/** Turns fire into smoke where amount(x, y) beats a noise threshold: each pixel takes the smoke colour of its brightness. */
export function cool(c: Canvas, amount: (x: number, y: number) => number, smoke: Color[], seed: number): Canvas {
  const out = c.clone();
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(x, y);
      if (!p[3]) continue;
      if (amount(x, y) <= 0.5) continue;
      const l = lumOf(p);
      const i = l < 45 ? 0 : Math.min(smoke.length - 1, 1 + Math.floor(((l - 45) / 210) * (smoke.length - 1)));
      out.set(x, y, smoke[i]);
    }
  return out;
}

/** Darkens a canvas toward a deep ember red (k = 1 keeps it, 0 is all ember). */
export function dim(c: Canvas, k: number, ember: Color = [70, 16, 14, 255]): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(x, y);
      if (!p[3]) continue;
      out.set(x, y, [Math.round(p[0] * k + ember[0] * (1 - k)), Math.round(p[1] * k + ember[1] * (1 - k)), Math.round(p[2] * k + ember[2] * (1 - k)), p[3]]);
    }
  return out;
}

/** A piece drawn into a frame of size w x h at its own placement, moved by (dx, dy). */
export function placed(name: string, w: number, h: number, dx = 0, dy = 0): Canvas {
  const pc = refPiece(name);
  const out = new Canvas(w, h);
  out.draw(pc.c, pc.x + dx, pc.y + dy);
  return out;
}

/** Removes the pixels `del` picks (to roughen where his panel cut the art) and outlines the new edges. */
export function roughen(c: Canvas, del: (x: number, y: number) => boolean, outline: Color): Canvas {
  const out = c.clone();
  const gone = new Uint8Array(c.w * c.h);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++)
      if (c.alpha(x, y) && del(x, y)) {
        out.set(x, y, [0, 0, 0, 0]);
        gone[y * c.w + x] = 1;
      }
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (!out.alpha(x, y)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy;
        if (u >= 0 && v >= 0 && u < c.w && v < c.h && gone[v * c.w + u]) {
          out.set(x, y, outline);
          break;
        }
      }
    }
  return out;
}

/** The lowest opaque row of each column (-1 where the column is empty). */
export function columnBottoms(c: Canvas): Int32Array {
  const out = new Int32Array(c.w).fill(-1);
  for (let x = 0; x < c.w; x++)
    for (let y = c.h - 1; y >= 0; y--)
      if (c.alpha(x, y)) {
        out[x] = y;
        break;
      }
  return out;
}

/**
 * Burns a wall of flames down column by column: each column is squashed toward its own bottom
 * by h(x) (1 = as drawn, 0 = gone), so its flame tips sink into the burning ground; varying h
 * between neighbouring columns gives tongues of different heights.
 */
export function sinkColumns(c: Canvas, h: (x: number) => number, bottoms = columnBottoms(c)): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let x = 0; x < c.w; x++) {
    const yb = bottoms[x];
    if (yb < 0) continue;
    const k = h(x);
    if (k <= 0.01) continue;
    for (let y = 0; y <= yb; y++) {
      const ys = Math.round(yb - (yb - y) / k);
      if (ys < 0) continue;
      const p = c.get(x, ys);
      if (p[3]) out.set(x, y, p);
    }
  }
  return out;
}

/** Moves each column down by drop(x) px (for things that sink with the wall), dropping what falls below cutY(x). */
export function dropColumns(c: Canvas, drop: (x: number) => number, cutY: (x: number) => number): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let x = 0; x < c.w; x++) {
    const d = Math.round(drop(x)), cy = cutY(x);
    for (let y = 0; y < c.h; y++) {
      const yd = y + d;
      if (yd >= c.h || yd > cy) continue;
      const p = c.get(x, y);
      if (p[3]) out.set(x, yd, p);
    }
  }
  return out;
}

/**
 * Burns a shape out the way fire dies, with no blocky holes: it darkens toward embers, thins
 * from its edges inward (a few px per step, the edge ragged), and its upper parts cool into
 * smoke. k: 0 = as drawn, 1 = gone. Loose crumbs are dropped; the new edge gets `outline`.
 */
export function burnOut(c: Canvas, k: number, smoke: Color[], outline: Color, seed: number, top = 0, height = c.h, thinPx = 9): Canvas {
  if (k <= 0) return c;
  if (k >= 1) return new Canvas(c.w, c.h);
  // Thin from the edges: distance (in 4-neighbour steps) to the outside, capped.
  const W = c.w, H = c.h, maxD = 16;
  const dist = new Uint8Array(W * H);
  let frontier: number[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!c.alpha(x, y)) continue;
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !c.alpha(x + 1, y) || !c.alpha(x - 1, y) || !c.alpha(x, y + 1) || !c.alpha(x, y - 1);
      if (edge) {
        dist[y * W + x] = 1;
        frontier.push(y * W + x);
      }
    }
  for (let d = 2; d <= maxD && frontier.length; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= W || v >= H) continue;
        const j = v * W + u;
        if (dist[j] || !c.alpha(u, v)) continue;
        dist[j] = d;
        next.push(j);
      }
    }
    frontier = next;
  }
  let out = new Canvas(W, H);
  const thin = k * thinPx;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = c.get(x, y);
      if (!p[3]) continue;
      const d = dist[y * W + x] || maxD + 1;
      if (d <= thin * (0.7 + 0.6 * pnoise(x, y, 7, 0, 0, seed))) continue;
      out.set(x, y, p);
    }
  out = dropCrumbs(out, 6);
  // Upper parts cool into smoke, the rest darkens toward embers.
  out = cool(out, (_x, y) => k * 1.4 - ((y - top) / Math.max(1, height)) * 0.9 + 0.1, smoke, seed + 1);
  out = dim(out, 1 - k * 0.7);
  // The new edge (where it thinned) gets the dark outline.
  const res = out.clone();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!out.alpha(x, y)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy;
        if (u >= 0 && v >= 0 && u < W && v < H && !out.alpha(u, v) && c.alpha(u, v)) {
          res.set(x, y, outline);
          break;
        }
      }
    }
  return res;
}

/** Drops connected pieces of at most `max` px. */
export function dropCrumbs(c: Canvas, max: number): Canvas {
  const W = c.w, H = c.h, out = c.clone();
  const seen = new Uint8Array(W * H);
  for (let y0 = 0; y0 < H; y0++)
    for (let x0 = 0; x0 < W; x0++) {
      if (seen[y0 * W + x0] || !c.alpha(x0, y0)) continue;
      const piece: number[] = [], todo = [y0 * W + x0];
      seen[y0 * W + x0] = 1;
      while (todo.length) {
        const i = todo.pop()!;
        piece.push(i);
        const x = i % W, y = (i / W) | 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const u = x + dx, v = y + dy;
            if (u < 0 || v < 0 || u >= W || v >= H) continue;
            const j = v * W + u;
            if (seen[j] || !c.alpha(u, v)) continue;
            seen[j] = 1;
            todo.push(j);
          }
      }
      if (piece.length <= max) for (const i of piece) out.set(i % W, (i / W) | 0, [0, 0, 0, 0]);
    }
  return out;
}

/** Fills enclosed transparent holes (not connected to the frame's border) with what `src` has there. */
export function fillEnclosed(c: Canvas, src: Canvas): Canvas {
  const W = c.w, H = c.h, out = c.clone();
  const outside = new Uint8Array(W * H);
  const todo: number[] = [];
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (!c.alpha(x, y)) { outside[y * W + x] = 1; todo.push(y * W + x); }
  for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (!c.alpha(x, y) && !outside[y * W + x]) { outside[y * W + x] = 1; todo.push(y * W + x); }
  while (todo.length) {
    const i = todo.pop()!;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const u = x + dx, v = y + dy;
      if (u < 0 || v < 0 || u >= W || v >= H) continue;
      const j = v * W + u;
      if (outside[j] || c.alpha(u, v)) continue;
      outside[j] = 1;
      todo.push(j);
    }
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (!c.alpha(x, y) && !outside[y * W + x] && src.alpha(x, y)) out.set(x, y, src.get(x, y));
  return out;
}
