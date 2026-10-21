// The Ryusei's phase (the owner's picture, docs/reference/ryusei-phase-owner-reference.jpg): a
// ninja's own sprite frame turned into a body of electric-blue light, the way a Warp Strike or a
// Spatial Swap carries it across the field. Like his picture, it is mostly a strong electric blue
// in four steps by the sprite's light and shade, brighter toward the silhouette; thin near-white
// lines run round the silhouette and where a limb lies over the body; the sprite's own inner lines
// stay as darker blue creases; the hair burns white-blue; a soft blue glow surrounds it all.
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

/**
 * The light body is drawn twice: laid over the ground (source-over), then added to it as light
 * ('lighter') at this share. Its pixels are made so the two together give the owner's colours
 * exactly over black, while over grass or water the ground shows through the core under the blue
 * (`phaseOver` is the same sum; renderer.ts draws it so).
 */
export const PHASE_ADD = 0.4;

/** How far the glow reaches outside the silhouette (pixels): its strength at each step out (over black, that share of its colour). */
export const GLOW = [0, 150, 96, 58, 30, 12] as const;

/**
 * The fill's four... five steps of blue by rank of the sprite's light (the darkest 8% take step 0,
 * the next 20% step 1, and so on): the share his picture has of each, so a dark outfit and a light
 * one both come out mostly the main electric blue.
 */
const FILL_CDF = [0.08, 0.28, 0.52, 0.78] as const;
/** The hair's steps by rank of its own light: white-blue, wispy, with its darker strands blue. */
const HAIR_STEPS = [4, 4, 5, 5, 6, 7] as const;
/** How opaque each kind of pixel is laid over the ground (0..1): the core is clearest. */
const COVER = { rim: 1, seam: 0.92, hair: 0.86, d2: 0.8, d3: 0.72, core: 0.6 } as const;

export interface PhaseOptions {
  /** Body part per pixel (the sprite's part map): where a limb's outline lies over another part, a line of light is drawn. */
  part?: Uint8Array;
  /** One bit per pixel: the hair, lit white-blue. */
  hair?: Uint8Array;
}

/**
 * A sprite frame (w x h RGBA) as its phase body, the same size: see-through blue where the fill
 * is, opaque on the lines, and a stepped glow round the outside (the frame needs that much empty
 * room round the figure, which every sprite frame has). Only the figure's box is worked on. Drawn
 * as `phaseOver` says, it shows the owner's colours.
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
  const { part, hair } = opts;
  const isHair = (src: number): boolean => !!hair && (hair[src >> 3] & (1 << (src & 7))) !== 0;

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
  // ranked over the frame (and over its hair on its own) so every outfit gets the whole ramp.
  const soft = new Float32Array(n);
  const hist = new Uint32Array(256);
  const hairHist = new Uint32Array(256);
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
      const v = Math.min(255, Math.round(soft[k]));
      if (isHair((ry + Y0) * w + rx + X0)) hairHist[v]++;
      else hist[v]++;
    }
  const rank = cdf(hist);
  const hairRank = cdf(hairHist);

  const ADD = 1 + PHASE_ADD;
  /** Puts a pixel that shows `step` over black, laid over the ground at `cover`. */
  const light = (src: number, step: number, cover: number): void => {
    const c = PHASE_RAMP[step];
    // Bright steps need more cover to be that bright (the pixel can't be brighter than white).
    const a = Math.min(1, Math.max(cover, Math.max(c[0], c[1], c[2]) / (255 * ADD)));
    out[src * 4] = Math.round(c[0] / (a * ADD));
    out[src * 4 + 1] = Math.round(c[1] / (a * ADD));
    out[src * 4 + 2] = Math.round(c[2] / (a * ADD));
    out[src * 4 + 3] = Math.round(a * 255);
  };

  for (let ry = 1; ry < RH - 1; ry++)
    for (let rx = 1; rx < RW - 1; rx++) {
      const k = ry * RW + rx;
      if (!inside[k]) continue;
      const src = (ry + Y0) * w + rx + X0;
      const d = depth[k];
      // The silhouette: a thin near-white line, whitest along the top of each form.
      if (d === 1) {
        light(src, inside[k - RW] ? 6 : 7, COVER.rim);
        continue;
      }
      const v = Math.min(255, Math.round(soft[k]));
      // The sprite's own lines inside the figure: a pixel darker than what is round it.
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
            if (pj && pk && pj !== pk) seam = true;
            if (soft[k] - soft[j] > turn) turn = soft[k] - soft[j];
          }
        }
      const ink = c > 0 && lum[k] + 26 < around / c && lum[k] < 110;
      if (isHair(src)) {
        const t = hairRank[v];
        light(src, ink ? 4 : HAIR_STEPS[Math.min(HAIR_STEPS.length - 1, Math.floor(t * HAIR_STEPS.length))], COVER.hair);
        continue;
      }
      // Where a limb's outline lies over the body (or one leg over the other): a line of light.
      if (ink && seam) {
        light(src, 6, COVER.seam);
        continue;
      }
      const t = rank[v];
      let step = t < FILL_CDF[0] ? 0 : t < FILL_CDF[1] ? 1 : t < FILL_CDF[2] ? 2 : t < FILL_CDF[3] ? 3 : 4;
      // The sprite's other lines (clothes, straps, the face) stay, as darker blue creases.
      if (ink) step = Math.min(step, 1);
      // The lit side of a turn from light into shade catches the light.
      else if (turn > 40) step = Math.max(step, 5);
      // Toward the silhouette the body brightens, as round forms do in his picture.
      let cover: number = COVER.core;
      if (d === 2) {
        step = Math.min(5, Math.max(step + 1, 3));
        cover = COVER.d2;
      } else if (d === 3) {
        step = Math.max(step, 2);
        cover = COVER.d3;
      }
      light(src, step, cover);
    }

  // The glow: steps of blue light round the outside, fading out.
  for (let ry = 0; ry < RH; ry++)
    for (let rx = 0; rx < RW; rx++) {
      const g = ring[ry * RW + rx];
      if (g === 255 || g === 0 || g > R) continue;
      const i = ((ry + Y0) * w + rx + X0) * 4;
      const c = PHASE_RAMP[g <= 2 ? 4 : 3];
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = Math.round(GLOW[g] / ADD);
    }
  return out;
}

/** A sprite frame's phase body (GRID x GRID): its part map draws the lines, its hair mask the hair. */
export function phaseFrame(f: { rgba: Uint8ClampedArray; part: Uint8Array; hair?: Uint8Array }): Uint8ClampedArray {
  return phaseBody(f.rgba, GRID, GRID, { part: f.part, hair: f.hair });
}

/**
 * A phase body over a ground as the battle draws it (laid over at `k`, then added as light at
 * k * PHASE_ADD): `ground` is one colour or a w x h RGB(A) picture. For tests and pictures.
 */
export function phaseOver(body: Uint8ClampedArray, ground: readonly [number, number, number], k = 1): Uint8ClampedArray {
  const out = new Uint8ClampedArray(body.length);
  for (let i = 0; i < body.length; i += 4) {
    const a = (body[i + 3] / 255) * k;
    for (let c = 0; c < 3; c++) out[i + c] = ground[c] * (1 - a) + body[i + c] * a * (1 + PHASE_ADD);
    out[i + 3] = 255;
  }
  return out;
}

/** For each value 0..255, the share of the counted values below it (half of its own): its rank, 0..1. */
function cdf(hist: Uint32Array): Float32Array {
  let total = 0;
  for (let v = 0; v < 256; v++) total += hist[v];
  const out = new Float32Array(256);
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    out[v] = total ? (acc + hist[v] / 2) / total : 0.5;
    acc += hist[v];
  }
  return out;
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
