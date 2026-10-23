// The characters' dark outline for the solid parts of a jutsu effect (a beast's body, a stone wall,
// a thrown rock), never for its energy (spray, droplets, mist, sparks, glow). A pass the generators
// of solid effects run on each finished frame. The owner decided it on 2026-10-22 ("1 si 2 cambia
// 3 si"): every solid jutsu gets the characters' black line (the beasts, the earth and crystal
// walls, the poison and chakra walls' solid frames, the wood dragon, the dragon heads, the thrown
// rocks) and energy gets none (fire, lightning, wind, water, chakra, poison and genjutsu bolts,
// auras, blasts, smoke, dust). SOLID_OUTLINE=0 builds a sheet without it, as it was before.
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
//    cloud, mist, lightning or wind trail that never comes off, a wall's slime or barrier pane) is
//    told apart by the generator that knows its layers, through `particleColour` (its dust, mist or
//    energy colours); those pixels are never solid either.
// A generator can also keep the line off a cut edge where the art comes out of something drawn
// elsewhere (a head out of the fire, a dragon out of the wave): `noLine`.
//
// The line goes outside the silhouette, so every pixel of the drawing stays as it was: each clear or
// faint pixel that touches a solid piece on its side (not only at a corner) becomes one line pixel,
// as opaque as the pixel it lines (a body fading in or out fades with its line).
// Where his picture already has its own dark line on the edge, no second line is laid outside it
// (lines never stack into 2 px, as with the characters: docs/SPRITE_STYLE_GUIDE.md, "Outline").
// Where his line on the edge is not dark (the raiju's brown, the crane's teal), `lineColour` names
// it, and its pixels on the silhouette take the characters' colour instead (his answer "2 cambia"),
// so the line is his, in black, and still 1 px.
// The colour is the characters' rule (src/sprite/raster.ts MaterialTable): the darkest step of the
// ramp of the colour it surrounds, pulled 70% toward near-black #07060b, so it reads black with a
// whisper of the body's hue.

import { makeRamp, mixHex } from '../../src/sprite/color';
import { Canvas, type WorldSprite } from './kit';

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
  particleColour?: (r: number, g: number, b: number, a: number) => boolean;
  /** A colour with at least this share of its pixels in small pieces, over all frames, is a particle colour (default 0.5). */
  particleShare?: number;
  /** His own line colour where it is not dark: its pixels on the silhouette are recoloured to the characters' rule. */
  lineColour?: (r: number, g: number, b: number, a: number) => boolean;
  /** Places (frame x, y) that never get a line pixel: a cut edge where the art comes out of something else. */
  noLine?: (x: number, y: number) => boolean;
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
    for (let i = 0; i < w * h; i++) if (particle?.has(rgbKey(rgba, i)) || own?.(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2], rgba[i * 4 + 3])) seen[i] = 1;
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
 * (the input is not changed), how many line pixels were added and how many of his line pixels were
 * recoloured (`lineColour`). Only pixels below `minAlpha` and those line pixels change; every other
 * opaque pixel keeps its colour.
 */
export function solidOutline(rgba: ArrayLike<number>, w: number, h: number, opts: SolidOutlineOptions = {}, particle?: Set<number>): { rgba: Uint8Array; added: number; recoloured: number } {
  const minAlpha = opts.minAlpha ?? 128, inkLuma = opts.inkLuma ?? 32;
  const solid = solidMask(rgba, w, h, opts, particle);
  const cache = new Map<number, [number, number, number]>();
  const ruleOf = (src: ArrayLike<number>, j: number): [number, number, number] => {
    const key = rgbKey(src, j);
    let c = cache.get(key);
    if (!c) cache.set(key, (c = outlineFor(src[j * 4], src[j * 4 + 1], src[j * 4 + 2])));
    return c;
  };
  // His line where it is not dark: each of its pixels on the silhouette (a pixel round it, corners
  // too, is not solid) takes the colour the characters' rule gives the darkest solid side neighbour
  // that is not his line (his own colour's when it has none).
  const lineOf = opts.lineColour;
  const base = Uint8Array.from(rgba);
  let recoloured = 0;
  if (lineOf)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!solid[i] || !lineOf(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2], rgba[i * 4 + 3])) continue;
        let edge = false;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h || !solid[yy * w + xx]) edge = true;
          }
        if (!edge) continue;
        let best = i, bestL = Infinity;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (!solid[j] || lineOf(rgba[j * 4], rgba[j * 4 + 1], rgba[j * 4 + 2], rgba[j * 4 + 3])) continue;
          const l = luma(rgba[j * 4], rgba[j * 4 + 1], rgba[j * 4 + 2]);
          if (l > inkLuma && l < bestL) {
            bestL = l;
            best = j;
          }
        }
        const c = ruleOf(rgba, best);
        base[i * 4] = c[0];
        base[i * 4 + 1] = c[1];
        base[i * 4 + 2] = c[2];
        recoloured++;
      }
  const out = Uint8Array.from(base);
  let added = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (base[i * 4 + 3] >= minAlpha || opts.noLine?.(x, y)) continue;
      // The darkest solid neighbour that is not a line already (its side, not a corner).
      let best = -1, bestL = Infinity;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!solid[j]) continue;
        const l = luma(base[j * 4], base[j * 4 + 1], base[j * 4 + 2]);
        if (l > inkLuma && l < bestL) {
          bestL = l;
          best = j;
        }
      }
      // Only his own line touches it (or nothing solid): a pixel out here would make that line 2 px thick.
      if (best < 0) continue;
      const c = ruleOf(base, best);
      out[i * 4] = c[0];
      out[i * 4 + 1] = c[1];
      out[i * 4 + 2] = c[2];
      // As opaque as what it surrounds: a body fading in or out takes its line with it.
      out[i * 4 + 3] = base[best * 4 + 3];
      added++;
    }
  return { rgba: out, added, recoloured };
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

/**
 * The line around the solid parts of a sprite. The frames of `anims` (all of them by default) are
 * one animation for the colour rule, and each frame keeps its size, so the sheet's frame and anchor
 * stay as they were (the generators leave a clear pixel round the art, where the line goes). With
 * `wrapX` the frames are tiles that repeat across (a stream): the line is laid as if the tile went
 * on at both sides.
 */
export function outlineSprite(s: WorldSprite, opts: SolidOutlineOptions = {}, { anims, wrapX = false }: { anims?: string[]; wrapX?: boolean } = {}): WorldSprite {
  const keys = Object.keys(s.anims).filter((k) => !anims || anims.includes(k));
  const frames: RgbaFrame[] = [];
  for (const k of keys)
    for (const f of s.anims[k].frames) {
      if (!wrapX) {
        frames.push(f);
        continue;
      }
      // The tile three times across; the middle one is kept.
      const px = new Uint8Array(f.w * 3 * f.h * 4);
      for (let y = 0; y < f.h; y++) for (let r = 0; r < 3; r++) px.set(f.px.subarray(y * f.w * 4, (y + 1) * f.w * 4), (y * f.w * 3 + r * f.w) * 4);
      frames.push({ px, w: f.w * 3, h: f.h });
    }
  const noLine = opts.noLine;
  const lined = solidOutlineFrames(frames, wrapX && noLine ? { ...opts, noLine: (x, y) => noLine(x % (frames[0].w / 3), y) } : opts);
  let n = 0;
  const out: WorldSprite['anims'] = { ...s.anims };
  for (const k of keys)
    out[k] = {
      ...s.anims[k],
      frames: s.anims[k].frames.map((f) => {
        const l = lined[n++];
        if (!wrapX) return new Canvas(f.w, f.h, l);
        const c = new Canvas(f.w, f.h);
        for (let y = 0; y < f.h; y++) c.px.set(l.subarray((y * f.w * 3 + f.w) * 4, (y * f.w * 3 + 2 * f.w) * 4), y * f.w * 4);
        return c;
      }),
    };
  return { ...s, anims: out };
}

/**
 * His light in a palette copied from his sheet ('#rrggbbaa' entries): every colour his converter
 * kept semi-transparent somewhere (glow, splash, streaks, wisps) is energy, at any alpha. For
 * `particleColour`.
 */
export function lightOf(palette: string[]): (r: number, g: number, b: number) => boolean {
  const light = new Set<number>();
  for (const c of palette) if (c.length >= 9 && parseInt(c.slice(7, 9), 16) < 255) light.add(parseInt(c.slice(1, 7), 16));
  return (r, g, b) => light.has((r << 16) | (g << 8) | b);
}

/** True unless the line is turned off (SOLID_OUTLINE=0): the generators of solid effects lay it by default. */
export function solidOutlineOn(): boolean {
  return process.env.SOLID_OUTLINE !== '0';
}
