// The characters' dark outline for the solid parts of a jutsu effect (a beast's body, a stone wall,
// a thrown rock), never for its energy (spray, droplets, mist, sparks, glow). An optional pass a
// generator runs on each finished frame; off by default, so a sheet stays byte-identical until the
// owner approves the line for it.
//
// What counts as solid, decided over the whole animation (solidOutlineFrames):
// 1. Size: the opaque pixels (alpha >= minAlpha) split into 8-connected pieces. A piece is solid when
//    it has at least minArea pixels and at least minShare of the biggest piece in its frame; anything
//    smaller is a particle (a droplet, a spark, a pebble, a fleck of dust, a wisp or puff that has
//    come off). Faint pixels (mist, glow, alpha below minAlpha) are never solid.
// 2. Colour: a droplet that touches the body joins its piece, so size alone would line it. The
//    sheets copied from his pictures keep the spray in colours of its own (the converters snap body
//    and spray to separate palettes), so a colour that lies mostly (particleShare) in small pieces
//    over all frames is a particle colour, and its pixels are never solid, even touching the body.
// 3. The generator's own layers: energy painted onto the body in the same frame (a beast's dust
//    cloud, mist, lightning or wind trail that never comes off) is told apart by the generator that
//    knows its layers, through `particleColour` (its dust or mist colours); those pixels are never
//    solid either.
//
// The line goes outside the silhouette, so every pixel of the drawing stays as it was: each clear or
// faint pixel that touches a solid piece on its side (not only at a corner) becomes one line pixel.
// Where his picture already has its own dark line on the edge, no second line is laid outside it
// (lines never stack into 2 px, as with the characters: docs/SPRITE_STYLE_GUIDE.md, "Outline").
// The colour is the characters' rule (src/sprite/raster.ts MaterialTable): the darkest step of the
// ramp of the colour it surrounds, pulled 70% toward near-black #07060b, so it reads black with a
// whisper of the body's hue.

import { makeRamp, mixHex } from '../../src/sprite/color';

/** The near-black every character outline is pulled toward (src/sprite/raster.ts INK). */
export const INK = '#07060b';

export interface SolidOutlineOptions {
  /** Pixels at or above this alpha are opaque and make up silhouettes (default 128). */
  minAlpha?: number;
  /** 8-connected opaque pieces smaller than this many pixels are particles and get no line (default 80). */
  minArea?: number;
  /** ...and so are pieces smaller than this share of the biggest piece in the frame (default 0.15). */
  minShare?: number;
  /** An edge pixel at most this dark (luma 0..255) is already a line: nothing goes outside it (default 32). */
  inkLuma?: number;
  /** The generator's own energy colours (rule 3): pixels of these colours are never solid. */
  particleColour?: (r: number, g: number, b: number) => boolean;
  /** A colour with at least this share of its pixels in small pieces, over all frames, is a particle colour (default 0.5). */
  particleShare?: number;
}

/** A frame as the generators hold it (kit Canvas has these fields). */
export interface RgbaFrame {
  px: ArrayLike<number>;
  w: number;
  h: number;
}

const rgbKey = (px: ArrayLike<number>, i: number): number => (px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2];

const luma = (r: number, g: number, b: number): number => r * 0.3 + g * 0.59 + b * 0.11;
const hex2 = (v: number): string => v.toString(16).padStart(2, '0');

/** The outline colour the characters would give a surface of this colour. */
export function outlineFor(r: number, g: number, b: number): [number, number, number] {
  const c = mixHex(makeRamp(`#${hex2(r)}${hex2(g)}${hex2(b)}`, 'cloth')[0], INK, 0.7);
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

/**
 * Marks the solid pixels of an RGBA frame (rule 1): opaque pixels in 8-connected pieces big enough
 * by `minArea` and `minShare`, leaving out the pixels of the `particle` colours. Everything else
 * (clear, faint, a particle colour, or part of a small piece) is 0.
 */
export function solidMask(rgba: ArrayLike<number>, w: number, h: number, opts: SolidOutlineOptions = {}, particle?: Set<number>): Uint8Array {
  const minAlpha = opts.minAlpha ?? 128;
  const solid = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h);
  const pieces: number[][] = [];
  const own = opts.particleColour;
  if (particle?.size || own)
    for (let i = 0; i < w * h; i++) if (particle?.has(rgbKey(rgba, i)) || own?.(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])) seen[i] = 1;
  const stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || rgba[s * 4 + 3] < minAlpha) continue;
    seen[s] = 1;
    stack.push(s);
    const piece: number[] = [];
    while (stack.length) {
      const i = stack.pop()!;
      piece.push(i);
      const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (seen[j] || rgba[j * 4 + 3] < minAlpha) continue;
          seen[j] = 1;
          stack.push(j);
        }
    }
    pieces.push(piece);
  }
  const biggest = Math.max(0, ...pieces.map((p) => p.length));
  const min = Math.max(opts.minArea ?? 80, (opts.minShare ?? 0.15) * biggest);
  for (const p of pieces) if (p.length >= min) for (const i of p) solid[i] = 1;
  return solid;
}

/**
 * Lays the 1 px outline outside the solid pieces of an RGBA frame and returns the new pixels
 * (the input is not changed) and how many line pixels were added. Only pixels below `minAlpha`
 * change; every opaque pixel keeps its colour.
 */
export function solidOutline(rgba: ArrayLike<number>, w: number, h: number, opts: SolidOutlineOptions = {}, particle?: Set<number>): { rgba: Uint8Array; added: number } {
  const minAlpha = opts.minAlpha ?? 128, inkLuma = opts.inkLuma ?? 32;
  const solid = solidMask(rgba, w, h, opts, particle);
  const out = Uint8Array.from(rgba);
  const cache = new Map<number, [number, number, number]>();
  let added = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (rgba[i * 4 + 3] >= minAlpha) continue;
      // The darkest solid neighbour that is not a line already (its side, not a corner).
      let best = -1, bestL = Infinity;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!solid[j]) continue;
        const l = luma(rgba[j * 4], rgba[j * 4 + 1], rgba[j * 4 + 2]);
        if (l > inkLuma && l < bestL) {
          bestL = l;
          best = j;
        }
      }
      // Only his own line touches it (or nothing solid): a pixel out here would make that line 2 px thick.
      if (best < 0) continue;
      const key = rgbKey(rgba, best);
      let c = cache.get(key);
      if (!c) cache.set(key, (c = outlineFor(rgba[best * 4], rgba[best * 4 + 1], rgba[best * 4 + 2])));
      out[i * 4] = c[0];
      out[i * 4 + 1] = c[1];
      out[i * 4 + 2] = c[2];
      out[i * 4 + 3] = 255;
      added++;
    }
  return { rgba: out, added };
}

/** The colours that live mostly in small pieces over all the frames of an animation (rule 2). */
export function particleColours(frames: RgbaFrame[], opts: SolidOutlineOptions = {}): Set<number> {
  const minAlpha = opts.minAlpha ?? 128, share = opts.particleShare ?? 0.5;
  const tally = new Map<number, [number, number]>();
  for (const f of frames) {
    const solid = solidMask(f.px, f.w, f.h, opts);
    for (let i = 0; i < f.w * f.h; i++) {
      if (f.px[i * 4 + 3] < minAlpha) continue;
      const k = rgbKey(f.px, i);
      const t = tally.get(k) ?? [0, 0];
      t[solid[i] ? 0 : 1]++;
      tally.set(k, t);
    }
  }
  const out = new Set<number>();
  for (const [k, [inSolid, inSmall]] of tally) if (inSmall >= share * (inSolid + inSmall)) out.add(k);
  return out;
}

/** The line around the solid parts of every frame of an animation (both rules); the inputs are not changed. */
export function solidOutlineFrames(frames: RgbaFrame[], opts: SolidOutlineOptions = {}): Uint8Array[] {
  const particle = particleColours(frames, opts);
  return frames.map((f) => solidOutline(f.px, f.w, f.h, opts, particle).rgba);
}

/** True when the generator was asked for the line (SOLID_OUTLINE=1); off by default until the owner approves it. */
export function solidOutlineRequested(): boolean {
  const v = process.env.SOLID_OUTLINE;
  return !!v && v !== '0';
}
