// The Ryusei's phase (the owner's picture, docs/reference/ryusei-phase-owner-reference.jpg): a
// ninja's own sprite frame turned into a body of electric-blue light, the way a Shooting-Star Thrust or a
// Spatial Swap carries it across the field. Like his picture, it is mostly a strong electric blue,
// deep in the shade and the core of each form and brighter where the sprite is lit and toward the
// silhouette; a thin near-white line runs round the silhouette and where a limb lies over the body;
// the sprite's own inner lines stay as darker blue creases; the hair burns white-blue; a soft blue
// glow surrounds it all. It is see-through: the battle turns the ground under it blue and lets it
// show through the core (`phaseOver` says how it is drawn).
// Pure pixels, no canvas: the battle turns each frame into a canvas once and keeps it.

import { GRID, partIndex } from './raster';

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
 * How the battle draws a light body at strength k (0..1; after-images and the turning to and from
 * light are weaker), in three passes (`phaseOver` is the same sum):
 * 1. 'color': the ground under it takes its blue, keeping the ground's own light and shade, at a
 *    strength of its own (`phaseHue(k)` for the leap and its after-images, so even a faint one
 *    stays blue over green grass; just k while a ninja turns to light and back, so its own
 *    colours fade out and back in evenly).
 * 2. source-over at k: the body laid over that ground; its core is the clearest.
 * 3. 'lighter' at k * PHASE_ADD: the body added again as light.
 * Over black the first pass does nothing and the other two give the owner's colours exactly.
 */
export const PHASE_ADD = 0.4;
/** How strongly the ground under a leaping light body (or an after-image) at strength `k` takes its blue (see PHASE_ADD). */
export const phaseHue = (k: number): number => Math.min(1, 4 * k);

/** How far the glow reaches outside the silhouette (pixels): its strength at each step out (over black, that share of its colour). */
export const GLOW = [0, 150, 96, 58, 30, 12] as const;

/**
 * The fill's steps of blue (PHASE_RAMP 0..4) by rank of the sprite's light: the darkest 15% take
 * step 0, the next 22% step 1, and so on, near the shares his picture has, so a dark outfit and a
 * light one both come out mostly a strong electric blue, deep in the shade.
 */
const FILL_CDF = [0.2, 0.42, 0.64, 0.85] as const;
/** The hair's steps by rank of its own light: white-blue and wispy, its darker strands blue. */
const HAIR_STEPS = [3, 4, 4, 5, 6, 7] as const;
/** How opaque each kind of pixel is laid over the ground (0..1): the core is the clearest. */
const COVER = { rim: 1, seam: 0.9, hair: 0.85, d2: 0.75, d3: 0.62, core: 0.5 } as const;
/** How much brighter (smoothed luminance) a pixel must be than a neighbour to catch the light as a lit edge. */
const TURN = 50;
const HEAD = partIndex('head');

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
      // The silhouette: a thin near-white line, whitest along the top of each form and softer
      // along its underside.
      if (d === 1) {
        light(src, !inside[k - RW] ? 7 : !inside[k + RW] && inside[k - 1] && inside[k + 1] ? 5 : 6, COVER.rim);
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
            const pj = part?.[src + (dy / RW) * w + dx];
            const pk = part?.[src];
            if (pj && pk && pj !== pk) seam = true;
            if (soft[k] - soft[j] > turn) turn = soft[k] - soft[j];
          }
        }
      const ink = c > 0 && lum[k] + 26 < around / c && lum[k] < 110;
      if (isHair(src)) {
        const t = hairRank[v];
        light(src, ink ? 3 : HAIR_STEPS[Math.min(HAIR_STEPS.length - 1, Math.floor(t * HAIR_STEPS.length))], COVER.hair);
        continue;
      }
      // Where a limb's outline lies over the body (or one leg over the other): a line of light.
      if (ink && seam) {
        light(src, 6, COVER.seam);
        continue;
      }
      const t = rank[v];
      let step = t < FILL_CDF[0] ? 0 : t < FILL_CDF[1] ? 1 : t < FILL_CDF[2] ? 2 : t < FILL_CDF[3] ? 3 : 4;
      let cover: number = COVER.core;
      // Toward the silhouette the body brightens, as round forms do in his picture.
      if (d === 2) {
        step = Math.min(4, Math.max(step + 1, 3));
        cover = COVER.d2;
      } else if (d === 3) {
        step = Math.max(step, 2);
        cover = COVER.d3;
      }
      // The sprite's other lines (clothes, straps, the face) stay, as darker blue creases.
      if (ink) step = Math.min(step, 1);
      // The lit side of a turn from light into shade catches the light (not on the face, which
      // would read as a pale mask).
      else if (turn > TURN && part?.[src] !== HEAD) step = 5;
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
 * A phase body over a ground of one colour as the battle draws it at strength `k`, and `alpha`
 * of its usual opacity (a hidden ninja is fainter): the ground takes its blue at alpha * `tint`,
 * the body is laid over at alpha * k and added as light at alpha * k * PHASE_ADD (see
 * PHASE_ADD). For tests and pictures; RGBA out, opaque.
 */
export function phaseOver(body: Uint8ClampedArray, ground: readonly [number, number, number], k = 1, alpha = 1, tint = phaseHue(k)): Uint8ClampedArray {
  const out = new Uint8ClampedArray(body.length);
  const hue = Math.min(1, alpha * tint);
  const cover = Math.min(1, alpha * k);
  const g = ground.map((v) => v / 255);
  const gl = lumOf(g);
  for (let i = 0; i < body.length; i += 4) {
    const a = body[i + 3] / 255;
    const c = [body[i] / 255, body[i + 1] / 255, body[i + 2] / 255];
    // 1. 'color': the body's hue and saturation at the ground's luminosity.
    const blue = setLum(c, gl);
    const ah = a * hue;
    const ac = a * cover;
    for (let ch = 0; ch < 3; ch++) {
      const g1 = g[ch] * (1 - ah) + blue[ch] * ah;
      // 2. laid over; 3. added as light.
      out[i + ch] = Math.round(255 * Math.min(1, g1 * (1 - ac) + c[ch] * ac * (1 + PHASE_ADD)));
    }
    out[i + 3] = 255;
  }
  return out;
}

// The 'color' blend's luminosity (W3C Compositing and Blending), as the browser computes it.
const lumOf = (c: readonly number[]): number => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
function setLum(c: readonly number[], l: number): number[] {
  const d = l - lumOf(c);
  const o = c.map((v) => v + d);
  const L = lumOf(o);
  const lo = Math.min(...o);
  const hi = Math.max(...o);
  if (lo < 0) return o.map((v) => L + ((v - L) * L) / (L - lo));
  if (hi > 1) return o.map((v) => L + ((v - L) * (1 - L)) / (hi - L));
  return o;
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
