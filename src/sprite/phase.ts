// The Ryusei's phase (the owner's picture, docs/reference/ryusei-phase-owner-reference.jpg): a
// ninja's own sprite frame turned into a body of electric-blue light, the way a Warp Strike or a
// Spatial Swap carries it across the field. The fill is a see-through blue that brightens where
// the sprite is lit and toward the silhouette; the silhouette, the lines the sprite draws inside
// it (an arm over the body, the clothes' folds, the face) and the edges between light and shade
// turn into near-white lines; the hair burns white-blue; a soft blue glow surrounds it all.
// Pure pixels, no canvas: the battle turns each frame into a canvas once and keeps it.

import { GRID } from './raster';

/** The owner's colours, sampled from his picture by brightness: deep electric blue up to near-white cyan. */
export const PHASE_RAMP: readonly (readonly [number, number, number])[] = [
  [12, 21, 114],
  [20, 36, 156],
  [32, 54, 186],
  [46, 74, 208],
  [70, 102, 228],
  [108, 140, 245],
  [158, 190, 254],
  [212, 238, 254],
  [240, 254, 255],
];
const RIM = 8;
const LINE = 6;

/** How far the glow reaches outside the silhouette (pixels): its alpha at each step out. */
export const GLOW = [0, 150, 96, 58, 30, 12] as const;

export interface PhaseOptions {
  /** Body part per pixel (the sprite's part map): where one part meets another, a line is drawn. */
  part?: Uint8Array;
  /** One bit per pixel: the hair, lit white-blue. */
  hair?: Uint8Array;
}

/**
 * A sprite frame (w x h RGBA) as its phase body, the same size: see-through where the fill is,
 * opaque on the lines, and a stepped glow round the outside (the frame needs that much empty room
 * round the figure, which every sprite frame has). Only the figure's box is worked on.
 */
export function phaseBody(rgba: Uint8ClampedArray, w: number, h: number, opts: PhaseOptions = {}): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  // The figure's box, grown by the glow's reach: everything below works inside it.
  let bx0 = w;
  let by0 = h;
  let bx1 = -1;
  let by1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (rgba[(y * w + x) * 4 + 3] >= 24) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
  if (bx1 < 0) return out;
  const R = GLOW.length - 1;
  const X0 = Math.max(0, bx0 - R - 1);
  const Y0 = Math.max(0, by0 - R - 1);
  const RW = Math.min(w, bx1 + R + 2) - X0;
  const RH = Math.min(h, by1 + R + 2) - Y0;
  const n = RW * RH;
  // Region-local buffers; index k = ry * RW + rx; src index = (ry + Y0) * w + rx + X0.
  const inside = new Uint8Array(n);
  const lum = new Float32Array(n);
  for (let ry = 0; ry < RH; ry++)
    for (let rx = 0; rx < RW; rx++) {
      const s = ((ry + Y0) * w + rx + X0) * 4;
      if (rgba[s + 3] < 24) continue;
      const k = ry * RW + rx;
      inside[k] = 1;
      lum[k] = 0.299 * rgba[s] + 0.587 * rgba[s + 1] + 0.114 * rgba[s + 2];
    }

  // Steps from the silhouette: inside, 1 on the silhouette up to 4 deep; outside, 1 just out up
  // to R away (the glow). 255 = farther.
  const depth = new Uint8Array(n).fill(255);
  const ring = new Uint8Array(n).fill(255);
  for (let ry = 0; ry < RH; ry++)
    for (let rx = 0; rx < RW; rx++) {
      const k = ry * RW + rx;
      const me = inside[k];
      const edge = rx === 0 || ry === 0 || rx === RW - 1 || ry === RH - 1;
      if (edge) {
        if (me) depth[k] = 1;
        continue;
      }
      if (inside[k - 1] !== me || inside[k + 1] !== me || inside[k - RW] !== me || inside[k + RW] !== me) {
        if (me) depth[k] = 1;
        else ring[k] = 1;
      }
    }
  grow(depth, inside, 1, RW, RH, 4, false);
  grow(ring, inside, 0, RW, RH, R, true);

  // Light and shade, smoothed over 3x3 so the sprite's texture reads as forms rather than noise,
  // and stretched over the frame's own range so a dark outfit and a light one both get the ramp.
  const soft = new Float32Array(n);
  const hist = new Uint32Array(256);
  let count = 0;
  for (let ry = 1; ry < RH - 1; ry++)
    for (let rx = 1; rx < RW - 1; rx++) {
      const k = ry * RW + rx;
      if (!inside[k]) continue;
      let s = 0;
      let c = 0;
      for (let dy = -RW; dy <= RW; dy += RW)
        for (let dx = -1; dx <= 1; dx++)
          if (inside[k + dy + dx]) {
            s += lum[k + dy + dx];
            c++;
          }
      soft[k] = s / c;
      hist[Math.min(255, Math.round(soft[k]))]++;
      count++;
    }
  const lo = percentile(hist, count, 0.06);
  const hi = Math.max(lo + 1, percentile(hist, count, 0.96));

  const { part, hair } = opts;
  for (let ry = 1; ry < RH - 1; ry++)
    for (let rx = 1; rx < RW - 1; rx++) {
      const k = ry * RW + rx;
      if (!inside[k]) continue;
      const src = (ry + Y0) * w + rx + X0;
      const t = Math.min(1, Math.max(0, (soft[k] - lo) / (hi - lo)));
      // The fill: four steps of blue by how lit the sprite is there, see-through.
      let step = 1 + Math.min(4, Math.floor(t ** 1.2 * 5));
      let alpha = 200 + Math.round(t * 40);
      // Toward the silhouette the body brightens, as round forms do in his picture.
      const d = depth[k];
      if (d === 2) step = Math.max(step, 4);
      // Deep inside, the body is clearer: the ground shows through its core more than its edges.
      else if (d === 255) alpha -= 28;
      if (hair && hair[src >> 3] & (1 << (src & 7))) {
        step = Math.max(step + 2, 6);
        alpha += 45;
      }
      // The lines the sprite draws inside the figure (darker than what is round them), the seams
      // where one body part lies over another, and the lit side of a turn from light into shade.
      let around = 0;
      let c = 0;
      let seam = false;
      let turn = 0;
      for (let dy = -RW; dy <= RW; dy += RW)
        for (let dx = -1; dx <= 1; dx++) {
          const j = k + dy + dx;
          if (j === k || !inside[j]) continue;
          around += lum[j];
          c++;
          if (dx === 0 || dy === 0) {
            const pj = part?.[(ry + Y0 + dy / RW) * w + rx + X0 + dx];
            const pk = part?.[src];
            if (pj && pk && pj > pk) seam = true;
            if (soft[k] - soft[j] > turn) turn = soft[k] - soft[j];
          }
        }
      if (d === 1) {
        step = RIM;
        alpha = 255;
      } else if (seam || (c > 0 && lum[k] + 26 < around / c && lum[k] < 110)) {
        step = LINE;
        alpha = 240;
      } else if (turn > 34) {
        step = Math.max(step, 5);
        alpha = Math.max(alpha, 215);
      }
      put(out, src, PHASE_RAMP[step], Math.min(255, alpha));
    }

  // The glow: steps of blue light round the outside, fading out.
  for (let ry = 0; ry < RH; ry++)
    for (let rx = 0; rx < RW; rx++) {
      const g = ring[ry * RW + rx];
      if (g === 255 || g === 0 || g > R) continue;
      put(out, (ry + Y0) * w + rx + X0, PHASE_RAMP[g <= 2 ? 4 : 3], GLOW[g]);
    }
  return out;
}

/** A sprite frame's phase body (GRID x GRID): its part map draws the seams, its hair mask the hair. */
export function phaseFrame(f: { rgba: Uint8ClampedArray; part: Uint8Array; hair?: Uint8Array }): Uint8ClampedArray {
  return phaseBody(f.rgba, GRID, GRID, { part: f.part, hair: f.hair });
}

function put(out: Uint8ClampedArray, i: number, c: readonly [number, number, number], a: number): void {
  out[i * 4] = c[0];
  out[i * 4 + 1] = c[1];
  out[i * 4 + 2] = c[2];
  out[i * 4 + 3] = a;
}

/**
 * Grows step counts one ring at a time: a pixel (where `mask` equals `on`) still at 255 next to
 * one at step s - 1 takes step s, up to `max`. The glow (`round`) steps out diagonally too,
 * every other ring, so it comes out round rather than diamond-shaped.
 */
function grow(steps: Uint8Array, mask: Uint8Array, on: number, W: number, H: number, max: number, round: boolean): void {
  for (let s = 2; s <= max; s++) {
    const diag = round && s % 2 === 0;
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const k = y * W + x;
        if (steps[k] !== 255 || mask[k] !== on) continue;
        const p = s - 1;
        if (
          steps[k - 1] === p ||
          steps[k + 1] === p ||
          steps[k - W] === p ||
          steps[k + W] === p ||
          (diag && (steps[k - W - 1] === p || steps[k - W + 1] === p || steps[k + W - 1] === p || steps[k + W + 1] === p))
        )
          steps[k] = s;
      }
  }
}

function percentile(hist: Uint32Array, count: number, q: number): number {
  const want = count * q;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc > want) return v;
  }
  return 255;
}
