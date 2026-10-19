// Genjutsu jutsu VFX, v3: rebuilt to the owner's own paint-over of the genjutsu sheet
// (docs/reference/genjutsu-set-owner-reference.jpg). He asked for his examples to be copied as
// exactly as possible, so every sprite's KEY frame is his picture: tools/refs/genjutsu-from-ref.py
// cut his panels out at game scale (measured on his character), removed his background, character
// and labels, quantized his pixels to one palette sampled from his image, restored his 1 px
// deep-violet outline and kept his glows and dark smoke as semi-transparent pixels. That data is in
// vfx-genjutsu-v3-refdata.ts; this generator only DERIVES the other frames from those key frames:
//
//   - fly loops    8 frames at 10 fps; frame 0 is his picture; the core (orb, eye, crescent) holds
//                  still while the tendrils wave, the smoke streams back, the arcs ripple out, the
//                  eyes blink;
//   - stream       his 64 px tile (one braid period), scrolled 8 px a frame (still tiles); the head
//                  is his head in frame 0, then his ribbons slide on into the turning spiral with
//                  the braid following from the last tile (seamless joint in every frame);
//   - hit          12 frames: it builds over 3 frames, his picture on frame 3, held 2 frames, then
//                  it dissipates over 6 (flies apart, shrinks, cools down its ramps, fades);
//   - blast        16 frames: anticipation over 4 (the pool opens, the column shoots up in streaks
//                  of light), his picture on frame 4, held 2 frames, then a long settle and fade;
//   - walls        'rise' (12 frames) pushes his crystals up out of the ground, then the vines and
//                  petals come (the 3/4 wall's long shadow stretches out with it) and ends on his
//                  picture; 'idle' (8 frames) is his picture, then a glint runs over the crystals
//                  and the bits drift;
//   - aura         12 frames, two layers: aura_back (behind the character: his flames and smoke)
//                  and aura (over the character: his violet veil as a soft field over the body,
//                  measured on his sheet, plus his petals, feathers and the ring at the feet); the
//                  flames lick upward, the veil breathes and the petals drift.
//
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/vfx-genjutsu-v3.ts
//
// Writes <dir>/vfx_genjutsu_v3/ (one PNG per sprite + manifest.json). It refuses to run without
// WORLD_OUT, so it never writes into src/assets; every file is written whole (temp, then rename);
// the output is deterministic (no Math.random). `beast` (the crow swarm) belongs to another artist:
// its sheet and manifest entry are copied through unchanged from <dir>/vfx_genjutsu/.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, Color, PX_PER_M, WorldSprite, hash, writeGroup } from './kit';
import { GJ_PAL, GJ_REF, GjKind } from './vfx-genjutsu-v3-refdata';

const GROUP = 'vfx_genjutsu_v3';
const OLD_GROUP = 'vfx_genjutsu';
const TAU = Math.PI * 2;

// Frame counts (the owner found the jutsu too fast, "like a flashing star"; these are the targets
// shared by every element): small, continuous steps between frames, his picture still the key.
/** Flying loops (bolt, sphere, slash, multi, breath, stream, stream_head): frame 0 is his picture. */
const FLY_N = 8, FLY_FPS = 10;
/** hit: builds over frames 0-2, his picture on HIT_KEY, held 2 more frames, then dissipates. */
const HIT_N = 12, HIT_KEY = 3, HIT_FPS = 12;
/** blast: anticipation 0-3, his picture on BLAST_KEY, held 2 more frames, a long settle and fade. */
const BLAST_N = 16, BLAST_KEY = 4, BLAST_FPS = 12;
/** Walls: `rise` ends on his picture (its last frame equals idle frame 0); `idle` loops on it. */
const RISE_N = 12, RISE_FPS = 12, IDLE_N = 8, IDLE_FPS = 10;
/** aura / aura_back: one loop, frame-synced, frame 0 is his picture. */
const AURA_N = 12, AURA_FPS = 10;
/** Rise progress for frame r of RISE_N: quick at first, settling into his picture on the last frame. */
const riseT = (r: number): number => 1 - (1 - (r + 1) / RISE_N) ** 1.2;
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, t: number): number => {
  const u = clamp((t - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

// --- the palette ------------------------------------------------------------------------------

const PAL: Color[] = GJ_PAL.map((p) => {
  const h = p.rgba.slice(1);
  return [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16)) as Color;
});
const KIND: GjKind[] = GJ_PAL.map((p) => p.kind);
/** His panel fill: every translucent entry composites back to his look over it. */
const FILL: [number, number, number] = [32, 32, 42];
/** What each entry looks like over his fill (for recolouring by nearest colour). */
const LOOK = PAL.map((c) => [0, 1, 2].map((k) => c[k] * (c[3] / 255) + FILL[k] * (1 - c[3] / 255)));

const recolorCache = new Map<string, Int16Array>();
/** sRGB (0-255) to CIE Lab. */
function toLab(c: number[]): [number, number, number] {
  const lin = c.map((v) => {
    const u = v / 255;
    return u > 0.04045 ? ((u + 0.055) / 1.055) ** 2.4 : u / 12.92;
  });
  const X = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047;
  const Y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722;
  const Z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const LAB = LOOK.map(toLab);
/**
 * His hot pinks and magentas (red over blue, the extractor's own split of the body palette): a
 * tone step keeps a colour in its own family, so his pink spikes never step to a lavender or grey.
 */
const HOT = PAL.map((c, i) => KIND[i] === 'body' && c[0] > c[2] + 12);
/**
 * One step along an entry's own hue ramp: the entry of its kind (and family: hot pink / magenta or
 * violet / lavender) about 8 L lighter (dir 1) or darker (dir -1) with the nearest hue and chroma,
 * so a tone step never turns his violets grey nor his pinks lavender. Kinds whose entries are his
 * alpha steps (outline, glow, smoke, ground) keep.
 */
const rampStep = (dir: number): Int16Array =>
  recolorRamp(`ramp${dir}`, (i) => {
    const [L, a, b] = LAB[i];
    let best = i, bd = Infinity;
    for (let j = 0; j < PAL.length; j++) {
      if (KIND[j] !== KIND[i] || HOT[j] !== HOT[i] || j === i) continue;
      const dL = (LAB[j][0] - L) * dir;
      if (dL < 2.5) continue;
      // Toward white (above L 60) a ramp loses chroma: aim at the chroma scaled down as it nears
      // L 100. Below that the step keeps the full chroma, so a lit violet stays a violet.
      const keepC = dir > 0 ? clamp((100 - LAB[j][0]) / Math.max(1, 100 - Math.max(L, 60)), 0.35, 1) : 1;
      // Never a step out of its family: a saturated colour keeps most of its chroma and its hue
      // within 35 degrees (else it does not step), so a violet never turns grey-blue.
      const C0 = Math.hypot(a, b), Cj = Math.hypot(LAB[j][1], LAB[j][2]);
      if (C0 > 12) {
        if (Cj < 0.6 * C0 * keepC) continue;
        const dh = Math.abs(Math.atan2(LAB[j][2], LAB[j][1]) - Math.atan2(b, a));
        if (Math.min(dh, TAU - dh) > (35 * Math.PI) / 180) continue;
      }
      const d = (LAB[j][1] - a * keepC) ** 2 + (LAB[j][2] - b * keepC) ** 2 + 0.6 * (dL - 8) ** 2;
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    return best;
  });
function recolorRamp(key: string, fn: (i: number) => number): Int16Array {
  const hit = recolorCache.get(key);
  if (hit) return hit;
  const out = new Int16Array(PAL.length);
  for (let i = 0; i < PAL.length; i++)
    out[i] = KIND[i] === 'outline' || KIND[i] === 'glow' || KIND[i] === 'smoke' || KIND[i] === 'ground' ? i : fn(i);
  recolorCache.set(key, out);
  return out;
}
/** k > 0 steps each colour k steps lighter along its own hue ramp, k < 0 darker. */
function toneMap(k: number): Int16Array {
  const key = `tone${k}`;
  const hit = recolorCache.get(key);
  if (hit) return hit;
  const step = rampStep(k > 0 ? 1 : -1);
  const out = new Int16Array(PAL.length);
  for (let i = 0; i < PAL.length; i++) {
    let v = i;
    for (let n = 0; n < Math.abs(k); n++) v = step[v];
    out[i] = v;
  }
  recolorCache.set(key, out);
  return out;
}

// --- indexed images ---------------------------------------------------------------------------

/** An indexed image: d holds palette index + 1 (0 = clear). */
interface Ix {
  w: number;
  h: number;
  d: Uint8Array;
}
const blank = (w: number, h: number): Ix => ({ w, h, d: new Uint8Array(w * h) });
const at = (ix: Ix, x: number, y: number): number => (x >= 0 && y >= 0 && x < ix.w && y < ix.h ? ix.d[y * ix.w + x] : 0);

function decode(rle: string, w: number, h: number): Ix {
  const out = blank(w, h);
  const bytes = Buffer.from(rle, 'base64');
  let i = 0;
  for (let k = 0; k + 1 < bytes.length; k += 2) {
    out.d.fill(bytes[k + 1], i, i + bytes[k]);
    i += bytes[k];
  }
  if (i !== w * h) throw new Error(`vfx-genjutsu-v3: bad run-length data (${i} of ${w * h} px)`);
  return out;
}

/** A pixel-wise rewrite (return 0 to clear). */
function remap(ix: Ix, fn: (v: number, x: number, y: number) => number): Ix {
  const out = blank(ix.w, ix.h);
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      const v = ix.d[y * ix.w + x];
      if (v) out.d[y * ix.w + x] = fn(v, x, y);
    }
  return out;
}
/** Keeps the pixels where `pred` holds. */
const keep = (ix: Ix, pred: (x: number, y: number, v: number) => boolean): Ix => remap(ix, (v, x, y) => (pred(x, y, v) ? v : 0));
/** Tones the pixels by k steps (see toneMap); k may vary per pixel (0 = unchanged). */
function tone(ix: Ix, k: number | ((x: number, y: number) => number)): Ix {
  return remap(ix, (v, x, y) => {
    const s = typeof k === 'number' ? k : k(x, y);
    return s ? toneMap(s)[v - 1] + 1 : v;
  });
}

/** Moves every pixel by disp(x, y) (read back from the source spot, nearest pixel). */
function displace(ix: Ix, disp: (x: number, y: number) => [number, number], wrapX = false): Ix {
  const out = blank(ix.w, ix.h);
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      const [dx, dy] = disp(x, y);
      let sx = Math.round(x - dx);
      const sy = Math.round(y - dy);
      if (wrapX) sx = ((sx % ix.w) + ix.w) % ix.w;
      out.d[y * ix.w + x] = at(ix, sx, sy);
    }
  return out;
}
const move = (ix: Ix, dx: number, dy: number): Ix => displace(ix, () => [dx, dy]);

/** The picture scaled by s (sy vertically) about (cx, cy), nearest pixel. */
const scaleAbout = (ix: Ix, cx: number, cy: number, s: number, sy = s): Ix =>
  s <= 0.02 || sy <= 0.02 ? blank(ix.w, ix.h) : displace(ix, (x, y) => [(x - cx) * (1 - 1 / s), (y - cy) * (1 - 1 / sy)]);

/**
 * Turns the picture INSIDE its own silhouette: a true rotation by `ang` in the ellipse's own space
 * (y scaled by 1/squash, turned about (cx, cy), scaled back), sampled only from the picture's own
 * pixels and written only where it has pixels, so the outline holds and nothing smears past it.
 * Each output pixel takes the commonest of 4 sub-samples (no new colours, fewer jaggies).
 */
function turnInside(ix: Ix, cx: number, cy: number, ang: number, squash = 1, disc?: (x: number, y: number) => boolean): Ix {
  const out = blank(ix.w, ix.h);
  const c = Math.cos(ang), s = Math.sin(ang);
  const inD = (x: number, y: number) => !!at(ix, x, y) && (!disc || disc(x, y));
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      const v0 = ix.d[y * ix.w + x];
      if (!v0) continue;
      if (disc && !disc(x, y)) {
        out.d[y * ix.w + x] = v0;
        continue;
      }
      const votes = new Map<number, number>();
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const u = x + ox - cx, v = (y + oy - cy) / squash;
        const sx = Math.floor(cx + c * u + s * v), sy = Math.floor(cy + (-s * u + c * v) * squash);
        const sv = inD(sx, sy) ? at(ix, sx, sy) : 0;
        if (sv) votes.set(sv, (votes.get(sv) ?? 0) + 1);
      }
      let best = v0, bn = 0;
      for (const [val, n] of votes) if (n > bn || (n === bn && val < best)) [best, bn] = [val, n];
      out.d[y * ix.w + x] = best;
    }
  return out;
}

/**
 * Pushes columns of the picture up out of the ground: column x shows the picture moved down by
 * lift(x) px, clipped at that column's own ground y (nothing shows below it while it is lifted).
 * No shear, no scaling: every column is his pixels, translated.
 */
function emergeCols(ix: Ix, ground: (x: number) => number, lift: (x: number) => number): Ix {
  const out = blank(ix.w, ix.h);
  for (let x = 0; x < ix.w; x++) {
    const l = Math.round(lift(x)), g = ground(x);
    for (let y = 0; y < ix.h; y++) {
      if (l > 0 && y > g) continue;
      out.d[y * ix.w + x] = at(ix, x, y - l);
    }
  }
  return out;
}

/** Stamps src into dst at (x, y) (non-clear pixels only). */
function stamp(dst: Ix, src: Ix, x = 0, y = 0): Ix {
  for (let yy = 0; yy < src.h; yy++)
    for (let xx = 0; xx < src.w; xx++) {
      const v = src.d[yy * src.w + xx];
      const X = x + xx, Y = y + yy;
      if (v && X >= 0 && Y >= 0 && X < dst.w && Y < dst.h) dst.d[Y * dst.w + X] = v;
    }
  return dst;
}
const union = (...ixs: Ix[]): Ix => {
  const out = blank(ixs[0].w, ixs[0].h);
  for (const ix of ixs) stamp(out, ix);
  return out;
};

/** Clears a clustered share `p` (0..1) of the pixels: smoke and light breaking up as they go. */
function dissolve(ix: Ix, p: number, seed: number, cell = 3): Ix {
  if (p <= 0) return ix;
  return keep(ix, (x, y) => vnoise(x, y, cell, seed) * 0.8 + hash(x, y, seed + 1) * 0.2 >= p);
}

function bounds(ix: Ix): [number, number, number, number] | null {
  let x0 = ix.w, y0 = ix.h, x1 = -1, y1 = -1;
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++)
      if (ix.d[y * ix.w + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}

/** 8-connected parts of an image, each as its own image with its bounds. */
function parts(ix: Ix): { ix: Ix; b: [number, number, number, number] }[] {
  const lab = new Int32Array(ix.w * ix.h);
  const out: { ix: Ix; b: [number, number, number, number] }[] = [];
  let n = 0;
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      if (!ix.d[y * ix.w + x] || lab[y * ix.w + x]) continue;
      n++;
      const part = blank(ix.w, ix.h);
      const st = [[x, y]];
      lab[y * ix.w + x] = n;
      while (st.length) {
        const [a, b] = st.pop()!;
        part.d[b * ix.w + a] = ix.d[b * ix.w + a];
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const u = a + dx, v = b + dy;
            if (u >= 0 && v >= 0 && u < ix.w && v < ix.h && ix.d[v * ix.w + u] && !lab[v * ix.w + u]) {
              lab[v * ix.w + u] = n;
              st.push([u, v]);
            }
          }
      }
      out.push({ ix: part, b: bounds(part)! });
    }
  return out;
}

// --- noise ------------------------------------------------------------------------------------

/** Smooth value noise in [0, 1), optionally periodic in x and/or y (periods in px). */
function vnoise(x: number, y: number, cell: number, seed: number, perX = 0, perY = 0): number {
  const fx = x / cell, fy = y / cell;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const nx = perX ? Math.max(1, Math.round(perX / cell)) : 0, ny = perY ? Math.max(1, Math.round(perY / cell)) : 0;
  const wx = (i: number) => (nx ? ((i % nx) + nx) % nx : i), wy = (i: number) => (ny ? ((i % ny) + ny) % ny : i);
  const a = hash(wx(x0), wy(y0), seed), b = hash(wx(x0 + 1), wy(y0), seed), c = hash(wx(x0), wy(y0 + 1), seed), d = hash(wx(x0 + 1), wy(y0 + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
/** The same in [-1, 1]. */
const snoise = (x: number, y: number, cell: number, seed: number, perX = 0, perY = 0): number => vnoise(x, y, cell, seed, perX, perY) * 2 - 1;

/**
 * A looping wobble: a smooth field of up to `amp` px that drifts through a noise periodic in time,
 * zero at t = 0 (so frame 0 is his picture) and the same at t = 1 as at t = 0.
 */
function wobble(t: number, amp: number, cell: number, seed: number, rise = 0): (x: number, y: number) => [number, number] {
  const P = 64;
  const f = (x: number, y: number, s: number, tt: number) => snoise(x + Math.cos(tt * TAU) * 9, y + Math.sin(tt * TAU) * 9 + rise * tt * P, cell, s, 0, rise ? P : 0);
  return (x, y) => [(f(x, y, seed, t) - f(x, y, seed, 0)) * amp, (f(x, y, seed + 7, t) - f(x, y, seed + 7, 0)) * amp];
}

// --- rendering --------------------------------------------------------------------------------

type Fade = Partial<Record<'top' | 'right' | 'bottom' | 'left' | 'soft', number>>;
/** A layer: an indexed image, an alpha factor and its own fade toward the frame's sides. */
type Layer = [Ix, number?, Fade?, ((x: number, y: number) => number)?];

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
/**
 * The alpha factor toward a faded side (where his art ran off his panel): 1 inside, 0 past the end.
 *   - top (the blast's column of light): each streak of light ends at its own height (a ragged,
 *     column-by-column cut-off over the band), with a short 3 px stepped end: hard streak ends;
 *   - right (the 3/4 wall's long shadow): each row ends at its own place, and the stain thins
 *     out in an ordered (Bayer) alpha ramp of 8 levels, so it does not band into blocks.
 */
function fadeA(f: Fade | undefined, x: number, y: number, w: number, h: number): number {
  if (!f) return 1;
  let a = 1;
  // soft: a straight top in a stepped alpha fade, clear on rows 0-1, then 1/soft more a row.
  if (f.soft) a = Math.min(a, clamp(Math.floor(y - 1) / f.soft, 0, 1));
  if (f.top) {
    const end = f.top * (0.15 + 0.85 * vnoise(x, 1, 1.6, 911));
    a = Math.min(a, Math.ceil(clamp((y - end) / 3, 0, 1) * 4) / 4);
  }
  const ordered = (d: number, len: number, along: number, side: number) => {
    const c = 0.4 * vnoise(along, side, 2.5, 911);
    const t = clamp((d / len - c) / (1 - c), 0, 1);
    return clamp(Math.floor(t * 8 + BAYER4[y & 3][x & 3] / 16) / 8, 0, 1);
  };
  if (f.right) a = Math.min(a, ordered(w - 1 - x, f.right, y, 2));
  if (f.bottom) a = Math.min(a, ordered(h - 1 - y, f.bottom, x, 3));
  if (f.left) a = Math.min(a, ordered(x, f.left, y, 4));
  return a;
}

/**
 * Renders indexed layers into a canvas, later layers on top. Toward a faded side (where his art
 * ran off his panel) the art breaks up into ragged smoke and thins out.
 */
function render(w: number, h: number, layers: Layer[], fade?: Fade): Canvas {
  const c = new Canvas(w, h);
  for (const [ix, k = 1, own, alphaAt] of layers) {
    if (k <= 0) continue;
    const f = own ?? fade;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = ix.d[y * ix.w + x];
        if (!v) continue;
        let a = k * (alphaAt ? alphaAt(x, y) : 1);
        if (a <= 0) continue;
        a *= fadeA(f, x, y, w, h);
        if (a <= 0) continue;
        const p = PAL[v - 1];
        const al = Math.round(p[3] * a);
        if (al <= 0) continue;
        c.plot(x, y, al >= 255 ? p : [p[0], p[1], p[2], al]);
      }
  }
  return c;
}

/**
 * The see-through holes of a frame: clear regions (alpha < 40) of up to 12 px that do not reach the
 * frame's border and whose ring (8-neighbours) is at least 75% solid (alpha >= 200). On a map each
 * shows as a speck of map inside the art.
 */
function holes(c: Canvas): number[][] {
  const { w, h } = c;
  const lab = new Int32Array(w * h).fill(-1);
  const out: number[][] = [];
  for (let n0 = 0; n0 < w * h; n0++) {
    if (lab[n0] >= 0 || c.px[n0 * 4 + 3] >= 40) continue;
    const region: number[] = [];
    const st = [n0];
    lab[n0] = n0;
    let open = false;
    while (st.length) {
      const n = st.pop()!;
      region.push(n);
      const x = n % w, y = (n - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) open = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= w || v >= h) continue;
        const m = v * w + u;
        if (lab[m] < 0 && c.px[m * 4 + 3] < 40) {
          lab[m] = n0;
          st.push(m);
        }
      }
    }
    if (open || region.length > 12) continue;
    let solid = 0, ring = 0;
    for (const n of region) {
      const x = n % w, y = (n - x) / w;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const u = x + dx, v = y + dy;
          if (u < 0 || v < 0 || u >= w || v >= h || lab[v * w + u] === n0) continue;
          ring++;
          if (c.px[(v * w + u) * 4 + 3] >= 200) solid++;
        }
    }
    if (ring && solid >= ring * 0.75) out.push(region);
  }
  return out;
}

/** Holes sealed by the safety net, per sprite and kind (reported by the build). */
const SEALED = new Map<string, number>();
/**
 * His panel fill as an opaque entry of his palette (the nearest one, #1a1525): a speck of his
 * panel enclosed by his art looks the same on his panel when it takes this colour.
 */
const PANEL_IX = (() => {
  let best = 0, bd = Infinity;
  PAL.forEach((c, i) => {
    if (c[3] < 255) return;
    const d = (c[0] - FILL[0]) ** 2 + (c[1] - FILL[1]) ** 2 + (c[2] - FILL[2]) ** 2;
    if (d < bd) [best, bd] = [i, d];
  });
  return best;
})();
/** The commonest solid (alpha >= 200) colour 4-adjacent to a region, or null. */
function ringColour(c: Canvas, region: number[]): Color | null {
  const votes = new Map<string, number>();
  for (const n of region) {
    const x = n % c.w, y = (n - x) / c.w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = c.get(x + dx, y + dy);
      if (q[3] >= 200) votes.set(q.join(','), (votes.get(q.join(',')) ?? 0) + 1);
    }
  }
  let best = '', bn = 0;
  for (const [col, nv] of votes) if (nv > bn || (nv === bn && col < best)) [best, bn] = [col, nv];
  return best ? (best.split(',').map(Number) as Color) : null;
}
/**
 * The safety net under every frame, so no frame shows a speck of map inside the art (see holes()):
 *   - in his picture (`key` given as null): a speck of his panel that his art encloses (where the
 *     cut-out took a pixel as dark as his panel for background) takes his panel colour as an
 *     opaque palette entry (#1a1525), so on his panel it looks as he painted it;
 *   - in a derived frame: a hole where his picture has art takes the commonest solid colour round
 *     it; one where his picture is also clear (a gap closed up by the motion) takes his panel
 *     colour, as in his picture.
 * The structural fixes (underlays, whole-piece moves) leave few; the build reports how many.
 */
function sealHoles(name: string, c: Canvas, key: Canvas | null): Canvas {
  // (Sealing one hole can close the ring of a clear speck diagonal to it: run until none is left.)
  for (let pass = 0; pass < 4; pass++) {
    const found = holes(c);
    if (!found.length) break;
    sealRegions(name, c, key, found);
  }
  return c;
}
function sealRegions(name: string, c: Canvas, key: Canvas | null, found: number[][]): void {
  for (const region of found) {
    const keyArt = key ? region.filter((n) => key.px[n * 4 + 3] >= 40).length : 0;
    const col = (keyArt * 2 >= region.length ? ringColour(c, region) : null) ?? PAL[PANEL_IX];
    for (const n of region) c.set(n % c.w, Math.floor(n / c.w), col);
    const tag = `${name}${key ? '' : ' (key)'}`;
    SEALED.set(tag, (SEALED.get(tag) ?? 0) + region.length);
  }
}

// --- the key frames ---------------------------------------------------------------------------

interface Key {
  name: string;
  w: number;
  h: number;
  ax: number;
  ay: number;
  /** Every piece as a full-frame layer. */
  p: Record<string, Ix>;
  fade: Fade;
  /** The wall's pillar edges (x), where his art has them. */
  seams: number[];
}
interface Pad {
  l: number;
  t: number;
  r: number;
  b: number;
}
const pad = (n: number): Pad => ({ l: n, t: n, r: n, b: n });

function key(name: string, room: Pad = pad(0)): Key {
  const s = GJ_REF[name];
  if (!s) throw new Error(`vfx-genjutsu-v3: no reference data for "${name}"`);
  const w = s.w + room.l + room.r, h = s.h + room.t + room.b;
  const p: Record<string, Ix> = {};
  for (const [pn, pc] of Object.entries(s.pieces)) p[pn] = stamp(blank(w, h), decode(pc.rle, pc.w, pc.h), pc.x + room.l, pc.y + room.t);
  const fade = { ...s.fade };
  if (fade.top) fade.top += room.t;
  if (fade.right) fade.right += room.r;
  return { name, w, h, ax: s.anchor[0] + room.l, ay: s.anchor[1] + room.t, p, fade, seams: (s.seams ?? []).map((x) => x + room.l) };
}
const none = (k: Key): Ix => blank(k.w, k.h);

/**
 * Seals the small see-through holes INSIDE his black shapes (crow feathers, thorns): where his
 * feather's middle was as dark as his panel, the cut-out took it for background, so on the map
 * the map showed through a black feather. A clear region not reaching the frame's edge, up to
 * 80 px, whose rim is mostly dark (L < 25), takes the rim's commonest colour and goes into the
 * piece that owns most of the rim (so it moves with the feather). On his panel it looks the same.
 */
function sealDarkHoles(k: Key, names: string[]): void {
  const any = (x: number, y: number) => names.some((n) => !!at(piece(k, n), x, y));
  const seen = new Uint8Array(k.w * k.h);
  for (let y0 = 0; y0 < k.h; y0++)
    for (let x0 = 0; x0 < k.w; x0++) {
      if (seen[y0 * k.w + x0] || any(x0, y0)) continue;
      const region: number[] = [];
      const st = [y0 * k.w + x0];
      seen[y0 * k.w + x0] = 1;
      let open = false;
      const rim = new Map<string, number>();
      while (st.length) {
        const n = st.pop()!;
        region.push(n);
        const x = n % k.w, y = (n - x) / k.w;
        if (x === 0 || y === 0 || x === k.w - 1 || y === k.h - 1) open = true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const u = x + dx, v = y + dy;
          if (u < 0 || v < 0 || u >= k.w || v >= k.h) continue;
          const m = v * k.w + u;
          if (any(u, v)) {
            for (const pn of names) {
              const val = at(piece(k, pn), u, v);
              if (val) rim.set(`${pn}:${val}`, (rim.get(`${pn}:${val}`) ?? 0) + 1);
            }
          } else if (!seen[m]) {
            seen[m] = 1;
            st.push(m);
          }
        }
      }
      if (open || region.length > 80 || !rim.size) continue;
      let dark = 0, total = 0, best = '', bn = 0;
      const owner = new Map<string, number>();
      for (const [key, n] of rim) {
        const [pn, val] = key.split(':');
        total += n;
        if (LAB[Number(val) - 1][0] < 25) dark += n;
        owner.set(pn, (owner.get(pn) ?? 0) + n);
        if (n > bn || (n === bn && key < best)) [best, bn] = [key, n];
      }
      if (dark < total * 0.7) continue;
      let own = '', on = 0;
      for (const [pn, n] of owner) if (n > on || (n === on && pn < own)) [own, on] = [pn, n];
      const fillV = Number(best.split(':')[1]);
      for (const n of region) k.p[own].d[n] = fillV;
    }
}
const piece = (k: Key, n: string): Ix => k.p[n] ?? none(k);

/** Bright small bits (sparkles) blink: in some frames some of them are out. */
function twinkle(ix: Ix, frame: number, share: number, seed: number): Ix {
  if (!frame) return ix;
  return keep(ix, (x, y) => hash(Math.floor(x / 6), Math.floor(y / 6), seed + frame * 31) >= share);
}

function sprite(k: Key, label: string, anims: Record<string, { frames: Canvas[]; fps: number; loop?: boolean }>): WorldSprite {
  // The safety net (see sealHoles): his picture first, then every derived frame against it. A
  // frame identical to his picture (a wall's last rise frame) takes the sealed picture.
  if (k.name !== 'stream' && !process.env.GJ_NOSEAL) {
    const an0 = Object.keys(anims)[0];
    const keyAt: [string, number] = anims.idle ? ['idle', 0] : k.name === 'hit' ? [an0, HIT_KEY] : k.name === 'blast' ? [an0, BLAST_KEY] : [an0, 0];
    const keyC = anims[keyAt[0]].frames[keyAt[1]];
    const same = (f: Canvas) => f !== keyC && f.w === keyC.w && f.h === keyC.h && Buffer.from(f.px).equals(Buffer.from(keyC.px));
    const twins = Object.values(anims).flatMap((a) => a.frames.map((f, i) => [a, i, same(f)] as const)).filter((t) => t[2]);
    sealHoles(k.name, keyC, null);
    for (const [a, i] of twins) a.frames[i] = keyC;
    for (const [an, a] of Object.entries(anims))
      a.frames.forEach((f, i) => {
        if (f !== keyC && !(an === keyAt[0] && i === keyAt[1])) sealHoles(k.name, f, keyC);
      });
  }
  return {
    name: k.name,
    label,
    meters: [Math.round((k.w / PX_PER_M) * 100) / 100, Math.round((k.h / PX_PER_M) * 100) / 100],
    anchor: [k.ax, k.ay],
    tags: ['vfx'],
    anims,
  };
}

/**
 * Smoke streaming back from a projectile: the smoke rides a conveyor to the left over its own
 * span (wrapping back in at the near end), `step` px a frame; frame 0 is his picture.
 */
function conveyor(all: Ix, i: number, n: number, maxX: number): Ix {
  // Only the smoke behind the core streams (wrapping within its own span); any in front holds.
  const sm = keep(all, (x) => x <= maxX);
  const b = bounds(sm);
  if (!b || !i) return all;
  const span = b[2] - b[0] + 1;
  const step = Math.round((span * i) / n);
  const moved = displace(sm, (x, y) => {
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return [0, 0];
    // Read from `step` px to the right, wrapped within [b0, b2].
    const sx = b[0] + ((((x - b[0] + step) % span) + span) % span);
    return [x - sx, 0];
  });
  return stamp(moved, keep(all, (x) => x > maxX));
}

// --- projectiles ------------------------------------------------------------------------------------

const ROOM = 0;

function bolt(): WorldSprite {
  const k = key('bolt', pad(ROOM));
  const orb = piece(k, 'orb'), main = piece(k, 'main'), sm = piece(k, 'smoke');
  // His trailing smoke is a dense dark mass with solid blobs (its blackest pixels are solid in the
  // key frame, the rest his 0.85 smoke), drawn at full strength in every frame. The mass behind
  // the tendrils (its big parts) stays where he put it and churns at its edges, over itself as it
  // lies in his picture (so it never thins or opens); his small flecks stream back past it.
  const smParts = parts(sm);
  const mass = blank(k.w, k.h), flecks = blank(k.w, k.h);
  for (const p of smParts) stamp(p.ix.d.reduce((n, v) => n + (v ? 1 : 0), 0) >= 30 ? mass : flecks, p.ix);
  const DEEP = KIND.indexOf('outline') + 1;
  const tendrilBed = remap(keep(main, (x, _y, v) => x < k.ax - 9 && PAL[v - 1][3] === 255), () => DEEP);
  const fr = range(FLY_N).map((i) => {
    const ph = (i / FLY_N) * TAU;
    // The tendrils wave, more the further back they are; none at the orb.
    const m = i ? displace(main, (x) => {
      const w = smooth(2, 26, k.ax - 8 - x);
      return [0, (Math.sin(ph - (k.ax - x) * 0.24) - Math.sin(-(k.ax - x) * 0.24)) * 1.4 * w];
    }) : main;
    // The orb's rim breathes a step brighter and darker; the eye at its middle holds still.
    const o = tone(orb, (x, y) => (Math.hypot(x - k.ax, y - k.ay) > 6 ? [0, 0, 1, 1, 0, 0, -1, -1][i] : 0));
    if (!i) return render(k.w, k.h, [[sm], [m], [o]]);
    const w = wobble(i / FLY_N, 1.6, 4, 4242);
    const ms = stamp(union(mass), displace(mass, (x, y) => {
      const g = smooth(k.ax - 18, k.ax - 44, x);
      const [dx, dy] = w(x, y);
      return [dx * g, dy * g];
    }));
    // Under the waving tendrils lies their own footprint in his deep violet (their outline colour),
    // so where a tendril moves off a pixel, dark shows there and never the map.
    return render(k.w, k.h, [[ms], [conveyor(flecks, i, FLY_N, k.ax - 10)], [tendrilBed], [m], [o]]);
  });
  return sprite(k, 'Genjutsu bolt: watching-eye orb with streaming tendrils', { fly: { frames: fr, fps: FLY_FPS, loop: true } });
}

function sphere(): WorldSprite {
  const k = key('sphere', pad(ROOM));
  const core = piece(k, 'core'), main = piece(k, 'main');
  const fr = range(FLY_N).map((i) => {
    if (!i) return render(k.w, k.h, [[main], [core]]);
    // The spikes and sparks crackle round the still eye; the orbit ring holds; light pulses.
    const w = wobble(i / FLY_N, 1.6, 4, 300);
    const m = displace(main, (x, y) => {
      const r = Math.hypot(x - k.ax, y - k.ay);
      const s = smooth(25, 31, r);
      const [dx, dy] = w(x, y);
      return [dx * s, dy * s];
    });
    const lit = [0, 0, 1, 1, 0, 0, -1, -1][i];
    // (Only his hot pinks and magentas pulse, a step at most, within their own family; his dark
    // violet spike edges keep their colour.)
    return render(k.w, k.h, [[tone(m, (x, y) => (Math.hypot(x - k.ax, y - k.ay) > 26 && HOT[at(m, x, y) - 1] ? lit : 0))], [core]]);
  });
  return sprite(k, 'Genjutsu sphere: eye orb with an orbit ring and magenta spikes', { fly: { frames: fr, fps: FLY_FPS, loop: true } });
}

function slash(): WorldSprite {
  const k = key('slash', pad(ROOM));
  const main = piece(k, 'main'), sm = piece(k, 'smoke');
  const b = bounds(main)!;
  const fr = range(FLY_N).map((i) => {
    // A light runs down the bright edge; the wisps stream back.
    const yc = b[1] + ((b[3] - b[1]) * i) / FLY_N;
    const m = i ? tone(main, (x, y) => (Math.abs(y - yc) < 4 && LOOK[at(main, x, y) - 1][0] > 150 ? 1 : 0)) : main;
    const s = i ? inside(displace(conveyor(sm, i, FLY_N, b[0] + Math.round((b[2] - b[0]) * 0.6)), wobble(i / FLY_N, 1, 5, 410)), 1) : sm;
    return render(k.w, k.h, [[s, 1, { left: 8 }], [m]]);
  });
  return sprite(k, 'Genjutsu slash: violet crescent of swept blades', { fly: { frames: fr, fps: FLY_FPS, loop: true } });
}

function multi(): WorldSprite {
  const k = key('multi', pad(ROOM));
  const fr = range(FLY_N).map((i) => {
    const ph = (i / FLY_N) * TAU;
    const layers: Layer[] = ['d0', 'd1', 'd2'].map((n, j) => {
      const d = piece(k, n);
      if (!i) return [d];
      const b = bounds(d)!;
      // Each dart bobs a pixel on its own beat; its streak trail waves behind it.
      const bob = Math.round(Math.sin(ph + j * 2.1)) - Math.round(Math.sin(j * 2.1));
      const head = b[2] - 14;
      const w = wobble(i / FLY_N, 1.2, 4, 500 + j * 17);
      return [displace(d, (x, y) => {
        const [dx, dy] = w(x, y);
        const s = smooth(head, head - 10, x);
        return [dx * s * 0.6, bob + dy * s];
      })];
    });
    return render(k.w, k.h, layers);
  });
  return sprite(k, 'Genjutsu multi: three feather darts with magenta streaks', { fly: { frames: fr, fps: FLY_FPS, loop: true } });
}

function breath(): WorldSprite {
  const k = key('breath', pad(ROOM));
  const orb = piece(k, 'orb'), main = piece(k, 'main'), sm = piece(k, 'smoke'), eyes = piece(k, 'eyes'), orbs = piece(k, 'orbs');
  const ob = bounds(orb)!;
  const ox = (ob[0] + ob[2]) / 2, oy = (ob[1] + ob[3]) / 2;
  type Part = { ix: Ix; b: [number, number, number, number] };
  // His eyes, each gathered from its bits (a ring and a pupil may not touch).
  const eyeParts: Part[] = [];
  for (const p of parts(eyes)) {
    const cx = (p.b[0] + p.b[2]) / 2, cy = (p.b[1] + p.b[3]) / 2;
    const near = eyeParts.find((e) => Math.abs((e.b[0] + e.b[2]) / 2 - cx) < 9 && Math.abs((e.b[1] + e.b[3]) / 2 - cy) < 7);
    if (near) {
      stamp(near.ix, p.ix);
      near.b = bounds(near.ix)!;
    } else eyeParts.push({ ix: p.ix, b: p.b });
  }
  const orbParts: Part[] = parts(orbs);
  // The arcs: his arcs touch through their dark rims, so each arc is found by its lit body (the
  // big parts of his lighter pixels). Every other pixel (an arc's darker half, its rim and
  // outline, the dashes) goes with the nearest arc within 6 px, so an arc moves as one layer
  // and its rim never parts from it. All of those darker pixels also stay in place as an
  // underlay, so where neighbouring arcs part by a pixel his own dark colours show, never a gap.
  const lit = (v: number) => KIND[v - 1] === 'body' && LAB[v - 1][0] > 30;
  const size = (p: Part) => p.ix.d.reduce((n, v) => n + (v ? 1 : 0), 0);
  const arcs = parts(keep(main, (_x, _y, v) => lit(v))).filter((p) => size(p) >= 40);
  const label = new Int16Array(k.w * k.h).fill(-1);
  let front: number[] = [];
  arcs.forEach((p, j) => p.ix.d.forEach((v, n) => {
    if (v) {
      label[n] = j;
      front.push(n);
    }
  }));
  // Nearest arc for every pixel within 6 px (a breadth-first spread from all arcs at once).
  for (let step = 0; step < 6 && front.length; step++) {
    const next: number[] = [];
    for (const n of front) {
      const x = n % k.w, y = (n - x) / k.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= k.w || v >= k.h || label[v * k.w + u] >= 0) continue;
        label[v * k.w + u] = label[n];
        next.push(v * k.w + u);
      }
    }
    front = next;
  }
  const groups: Part[] = arcs.map(() => ({ ix: blank(k.w, k.h), b: [0, 0, 0, 0] as [number, number, number, number] }));
  // Specks far from any arc stay in place.
  const haze = blank(k.w, k.h);
  main.d.forEach((v, n) => {
    if (!v) return;
    if (label[n] >= 0) groups[label[n]].ix.d[n] = v;
    else haze.d[n] = v;
  });
  // His dark back layer: under the moving arcs and eyes, his picture's whole footprint (arcs,
  // rims, eyes, orbs) in his deep violet, and his smoke as it lies in frame 0. Where an arc or an
  // eye moves off a pixel, his dark shows there (a dark gap between arcs, as he paints them),
  // never the map, and no stray mid-tone rim pixel is left behind (each arc's rim moves with it).
  const DEEP = KIND.indexOf('outline') + 1;
  // (Only under his opaque pixels: his translucent glows stay see-through, as in his picture.)
  const backDark = remap(keep(union(main, eyes, orbs), (_x, _y, v) => PAL[v - 1][3] === 255), () => DEEP);
  for (const g of groups) g.b = bounds(g.ix)!;
  // The ripple: each arc (and each eye) moves as a whole a pixel out and back along its ray from
  // the orb, the wave travelling outward arc to arc (one frame of lag per 13 px of radius), with
  // an equal step every frame, so the loop has no hitch. Frame 0 is his picture.
  const N = FLY_N;
  const WAVE = [0, 1, 1, 1, 0, -1, -1, -1];
  const push = (p: Part, i: number): [number, number] => {
    const cx = (p.b[0] + p.b[2]) / 2, cy = (p.b[1] + p.b[3]) / 2;
    const r = Math.hypot(cx - ox, cy - oy) || 1;
    const lag = Math.round(r / 13);
    const d = WAVE[(((i - lag) % N) + N) % N] - WAVE[(((-lag) % N) + N) % N];
    return [Math.round(((cx - ox) / r) * d), Math.round(((cy - oy) / r) * d * 0.6)];
  };
  const fr = range(N).map((i) => {
    const t = i / N;
    const m = blank(k.w, k.h);
    for (const p of groups) {
      const [dx, dy] = i ? push(p, i) : [0, 0];
      stamp(m, p.ix, dx, dy);
    }
    const s = i ? displace(sm, wobble(t, 1, 6, 220)) : sm;
    // The watching eyes ride the ripple and blink in turn: each lid drops half-way on one frame,
    // shuts on the next and opens again (never on frame 0, which is his picture).
    const e = blank(k.w, k.h);
    eyeParts.forEach((p, j) => {
      const cy = (p.b[1] + p.b[3]) / 2;
      const b0 = 1 + ((j * 5) % (N - 2));
      const lid = i === b0 ? 0.55 : i === b0 + 1 ? 0.25 : 1;
      const [dx, dy] = i ? push(p, i) : [0, 0];
      stamp(e, lid < 1 ? scaleAbout(p.ix, (p.b[0] + p.b[2]) / 2, cy, 1, lid) : p.ix, dx, dy);
    });
    // His small pink orbs among them ride the ripple too (they do not blink).
    for (const p of orbParts) {
      const [dx, dy] = i ? push(p, i) : [0, 0];
      stamp(e, p.ix, dx, dy);
    }
    const o = tone(orb, [0, 1, 1, 2, 1, 0, -1, -1][i]);
    if (!i) return render(k.w, k.h, [[sm], [haze], [m], [e], [o]]);
    return render(k.w, k.h, [[sm], [backDark], [s], [haze], [m], [e], [o]]);
  });
  return sprite(k, 'Genjutsu breath: ripples of watching eyes from a glowing orb (origin at the anchor)', { fly: { frames: fr, fps: FLY_FPS, loop: true } });
}

// --- stream: his braid tile, scrolled, and the spiral head --------------------------------------------

/** The stream scrolls one 64 px braid period per loop: 8 px a frame. */
const STREAM_SHIFT = range(FLY_N).map((i) => Math.round((64 * i) / FLY_N));

/** Point in polygon (even-odd), for pixel centres. */
function inPoly(px: number, py: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * His ribbons in the head (game px): the braid running in from the tile up to where it meets his
 * vortex, traced on his picture (his (584..620, 60..114), at the head's 64/84 scale). Only these
 * flow with the stream; his vortex (spiral, dark rings, outer arcs) keeps its frame-0 pixels.
 */
const HEAD_RIBBONS: [number, number][] = [[-3, 3.8], [10.7, 3.8], [18.3, 13], [19.8, 22.1], [23.6, 25.1], [24.4, 34.3], [22.9, 41.9], [18.3, 45], [9.1, 52], [-3, 52]];

function stream(): WorldSprite[] {
  const t = key('stream');
  const tm = piece(t, 'main');
  const tiles = range(FLY_N).map((i) => (i ? displace(tm, () => [STREAM_SHIFT[i], 0], true) : tm));
  const h = key('stream_head', { l: 0, t: 0, r: ROOM, b: 0 });
  if (h.ay !== t.ay || h.h !== t.h) throw new Error('vfx-genjutsu-v3: the stream head and the tile do not line up');
  const spiral = piece(h, 'spiral'), sparks = piece(h, 'sparks'), hs = piece(h, 'smoke');
  // His white wisp under the ribbons (bottom left) is kept in every frame; it drifts a pixel.
  const isWisp = (x: number, y: number) => x < 20 && y > 42;
  const hm = keep(piece(h, 'main'), (x, y) => !isWisp(x, y)), wisp = keep(piece(h, 'main'), isWisp);
  const sb = bounds(spiral)!;
  const cx = (sb[0] + sb[2] + 1) / 2, cy = (sb[1] + sb[3] + 1) / 2;
  const rr = (x: number, y: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  // Frame 0 is his head as he painted it (his head starts exactly two braid periods after the
  // tile, so it runs on from the tile's end; its first 2 columns are the tile's, so the joint is
  // clean).
  const f0 = union(hm, spiral);
  for (let y = 0; y < h.h; y++) for (let x = 0; x < 2; x++) f0.d[y * h.w + x] = at(tm, x, y);
  const ribPoly = (x: number, y: number) => inPoly(x + 0.5, y + 0.5, HEAD_RIBBONS);
  const vortex = keep(f0, (x, y) => !ribPoly(x, y));
  // Where the ribbons may flow: his ribbon outline, and the empty space between his vortex's outer
  // arcs left of the spiral (the braid passes behind the arcs, which are drawn over it).
  const xEnd = cx - 13;
  const dom = (x: number, y: number) => ribPoly(x, y) || (x >= 0 && x < xEnd && y >= 0 && y < h.h && !at(vortex, x, y));
  // The ribbons flow on into the vortex with the stream: each pixel reads `s` px back (his head's
  // own ribbons, then the braid from the last tile), so the joint with the tile is seamless in
  // every frame; they stop at his own boundary with the vortex, where his vortex pixels stay. The
  // last two pixels before that boundary shade a ramp step or two darker, so a ribbon is swallowed
  // into the vortex rather than cut.
  const flow = (src: Ix, s: number, tile: Ix | null): Ix => {
    const out = blank(h.w, h.h);
    for (let y = 0; y < h.h; y++)
      for (let x = 0; x < h.w; x++) {
        if (!dom(x, y)) continue;
        const sx = x - s;
        const v = sx >= 0 ? at(src, sx, y) : tile ? at(tile, ((sx % t.w) + t.w) % t.w, y) : 0;
        if (!v) continue;
        const edge = !dom(x + 1, y) ? 1 : !dom(x + 2, y) ? 2 : 0;
        const lit = LAB[v - 1][0] > 45 && KIND[v - 1] === 'body';
        out.d[y * h.w + x] = edge && lit ? toneMap(edge === 1 ? -2 : -1)[v - 1] + 1 : v;
      }
    return out;
  };
  const ribSrc = keep(f0, ribPoly);
  // The vortex turns: his bright inner spiral (r <= 10.5) an eighth of a turn a frame inside its
  // own disc (4 sub-samples a pixel); between r 10.5 and 12 (where his arms fade into the dark
  // ring) each pixel takes the darker of the turned and the still picture, so no arm is cut and no
  // stub is left; beyond, his dark rings and outer arcs hold still.
  const inner = keep(vortex, (x, y) => rr(x, y) <= 12);
  const smokeRib = keep(hs, ribPoly), smokeStill = keep(hs, (x, y) => !ribPoly(x, y));
  const sparkParts = parts(sparks);
  const heads = range(FLY_N).map((i) => {
    const s = STREAM_SHIFT[i];
    const w = move(wisp, [0, 0, 1, 1, 1, 1, 0, 0][i], [0, 0, 0, -1, -1, -1, -1, 0][i]);
    if (!i) return render(h.w, h.h, [[hs], [f0], [w], [sparks]]);
    const rot = turnInside(inner, cx, cy, (i / FLY_N) * TAU, 1, (x, y) => rr(x, y) <= 12);
    const v = remap(vortex, (val, x, y) => {
      const r = rr(x, y);
      if (r <= 10.5) return at(rot, x, y) || val;
      if (r <= 12) {
        const o = at(rot, x, y);
        return o && LAB[o - 1][0] < LAB[val - 1][0] ? o : val;
      }
      return val;
    });
    // His sparks twinkle by a ramp step each, on their own beats (never cut).
    const sp = blank(h.w, h.h);
    sparkParts.forEach((p, j) => {
      const st = clamp(Math.round(Math.sin((i / FLY_N) * TAU + j * 2.1) * 1.4) - Math.round(Math.sin(j * 2.1) * 1.4), -1, 1);
      stamp(sp, st ? tone(p.ix, st) : p.ix);
    });
    return render(h.w, h.h, [[smokeStill], [flow(smokeRib, s, null)], [flow(ribSrc, s, tm)], [v], [w], [sp]]);
  });
  return [
    sprite(t, 'Genjutsu stream: braided magenta ribbons (tileable 64 px)', { fly: { frames: tiles.map((ix) => render(t.w, t.h, [[ix]])), fps: FLY_FPS, loop: true } }),
    sprite(h, 'Genjutsu stream head: spiral vortex', { fly: { frames: heads, fps: FLY_FPS, loop: true } }),
  ];
}

// --- hit: a starburst that flashes up to his picture and breaks up -----------------------------------

function hit(): WorldSprite {
  const k = key('hit');
  const m = union(piece(k, 'main'), piece(k, 'smoke'));
  const d = (x: number, y: number) => Math.hypot(x - k.ax, y - k.ay);
  /**
   * One radial move: the burst scaled by `sc` about its centre while its spikes fly outward by
   * `push` px (more toward their tips), read back in one step (nearest pixel); what reaches the
   * frame's edge goes.
   */
  const radial = (ix: Ix, sc: number, push: number) =>
    inside(displace(ix, (x, y) => {
      const r = d(x, y);
      if (!r) return [0, 0];
      const src = Math.max(0, (r - push * smooth(8, 30, r / sc)) / sc);
      return [((x - k.ax) / r) * (r - src), ((y - k.ay) / r) * (r - src)];
    }), 1);
  // Build-up (0-2): the burst grows out of a small hot core (each colour stepped up its own hue
  // ramp, less as it grows: no white flash). HIT_KEY (3): his picture. 4-5: it holds, the spikes
  // churning a little. 6-11: it dissipates slowly: the spikes fly outward and shrink back as
  // fragments, the colours cool down their ramps, it breaks up from the tips in and fades.
  //   sc size   push spikes outward (px)   heat / cool ramp steps up / down (core: 1 more)
  //   churn phase of the looping wobble   diss share broken up (from the tips in)   a alpha
  const plan: { sc: number; push: number; heat: number; cool: number; coreOnly?: boolean; churn: number; diss: number; a: number }[] = [
    { sc: 0.4, push: 0, heat: 2, cool: 0, churn: 0, diss: 0, a: 0.9 },
    { sc: 0.64, push: 0, heat: 1, cool: 0, churn: 0, diss: 0, a: 1 },
    { sc: 0.84, push: 0, heat: 1, cool: 0, churn: 0, diss: 0, a: 1 },
    { sc: 1, push: 0, heat: 0, cool: 0, churn: 0, diss: 0, a: 1 },
    { sc: 1, push: 0, heat: 0, cool: 0, churn: 1 / 12, diss: 0, a: 1 },
    { sc: 1, push: 0.6, heat: 0, cool: 0, churn: 2 / 12, diss: 0, a: 1 },
    { sc: 0.99, push: 1.5, heat: 0, cool: 0, coreOnly: true, churn: 3 / 12, diss: 0.04, a: 1 },
    { sc: 0.97, push: 2.5, heat: 0, cool: 1, coreOnly: true, churn: 4 / 12, diss: 0.1, a: 0.94 },
    { sc: 0.95, push: 3.5, heat: 0, cool: 1, churn: 5 / 12, diss: 0.19, a: 0.88 },
    { sc: 0.92, push: 4.5, heat: 0, cool: 2, churn: 6 / 12, diss: 0.3, a: 0.8 },
    { sc: 0.89, push: 5.5, heat: 0, cool: 2, churn: 7 / 12, diss: 0.43, a: 0.66 },
    { sc: 0.85, push: 6.5, heat: 0, cool: 3, churn: 8 / 12, diss: 0.55, a: 0.52 },
  ];
  if (plan.length !== HIT_N || plan[HIT_KEY].sc !== 1 || plan[HIT_KEY].push) throw new Error('vfx-genjutsu-v3: hit plan');
  const fr = plan.map((p, i) => {
    if (i === HIT_KEY) return render(k.w, k.h, [[m]]);
    let ix = p.sc !== 1 || p.push ? radial(m, p.sc, p.push) : m;
    // The churn: the spikes beyond the core move a pixel or so (a looping field, 0 at his picture).
    if (p.churn) {
      const w = wobble(p.churn, 1.1, 5, 820);
      ix = displace(ix, (x, y) => {
        const s = smooth(6, 16, d(x, y));
        const [dx, dy] = w(x, y);
        return [dx * s, dy * s];
      });
    }
    // Hot while it grows (more at the core), cooling from the core out as it dies.
    if (p.heat) ix = tone(ix, (x, y) => (d(x, y) < 12 * p.sc ? p.heat + 1 : p.heat));
    if (p.cool || p.coreOnly) ix = tone(ix, (x, y) => -Math.min(3, (p.coreOnly ? 0 : p.cool) + (d(x, y) < 10 ? (p.coreOnly ? p.cool + 1 : 1) : 0)));
    // Breaking up from the tips inward (clustered), so the burst thins into fragments.
    if (p.diss) ix = keep(ix, (x, y) => vnoise(x, y, 3, 811) * 0.7 + hash(x, y, 812) * 0.1 + (1 - smooth(4, 34, d(x, y))) * 0.35 >= p.diss);
    return render(k.w, k.h, [[ix, p.a]]);
  });
  return sprite(k, 'Genjutsu hit: violet and magenta star-burst', { hit: { frames: fr, fps: HIT_FPS, loop: false } });
}

// --- blast: the column of violet light out of a swirling pool ----------------------------------------

function blast(): WorldSprite {
  const k = key('blast', pad(2));
  sealDarkHoles(k, ['main', 'smoke', 'feathers', 'column', 'pool']);
  // His feathers are cut out by hand-set ellipses round them, which also take in a little of the
  // column's light behind them: that light (L > 40) stays with the column, so no chip of the
  // column flies off with a feather.
  const fea0 = piece(k, 'feathers');
  const behind = (v: number) => KIND[v - 1] === 'body' && LAB[v - 1][0] > 40;
  const fea = keep(fea0, (_x, _y, v) => !behind(v));
  const pool0 = piece(k, 'pool'), col0 = union(piece(k, 'column'), keep(fea0, (_x, _y, v) => behind(v))), sm0 = piece(k, 'smoke');
  // His black crow feathers fly with his sparkles and splashes.
  const fx = union(piece(k, 'main'), fea);
  // His dark smoke in two parts: the pool's dark outer rings (smoke touching the pool more than
  // the column) turn with the pool as one picture, so they never part from it; the rest (the
  // streaks on the column, the wisps in the air) drifts up.
  const poolSm = blank(k.w, k.h);
  for (const p of parts(sm0)) {
    let nPool = 0, nCol = 0;
    p.ix.d.forEach((v, n) => {
      if (!v) return;
      const x = n % k.w, y = (n - x) / k.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (at(pool0, x + dx, y + dy)) nPool++;
        if (at(col0, x + dx, y + dy)) nCol++;
      }
    });
    if (nPool > nCol) stamp(poolSm, p.ix);
  }
  const sm = keep(sm0, (x, y) => !at(poolSm, x, y));
  const pool = union(pool0, poolSm);
  const pb = bounds(pool0)!;
  // The pool lies on the ground: its own ellipse (centre and height / width) is what turns.
  const pcx = (pb[0] + pb[2] + 1) / 2, pcy = (pb[1] + pb[3] + 1) / 2;
  const squash = clamp((pb[3] - pb[1]) / (pb[2] - pb[0]), 0.2, 0.6);
  const cb = bounds(col0)!;
  const colBottom = cb[3], colH = colBottom - cb[1];
  // His column runs off the top of his panel: each streak that reaches his panel's edge runs on
  // up to 2 px below the frame's top in its own top colour (and fades out there, see SOFT_TOP).
  const col = union(col0);
  for (let x = 0; x < k.w; x++) {
    let yt = -1;
    for (let y = 0; y < k.h && yt < 0; y++) if (at(col0, x, y)) yt = y;
    if (yt < 0 || yt > cb[1] + 2) continue;
    for (let y = 2; y < yt; y++) col.d[y * k.w + x] = at(col0, x, yt);
  }
  // On his picture and its hold the column's top ends straight, in a short stepped alpha fade
  // over 5 rows (he ran it off his panel); the ragged streak ends are kept for its going out.
  const SOFT_TOP: Fade = { soft: 6 };
  /** 1 well above the pool's back rim, 0 on it: how freely smoke and bits move there. */
  const anchorRim = (y: number) => smooth(pb[1] + 2, pb[1] - 12, y);
  // His dark smoke streaks and feathers lie across the column, so the column has gaps under them,
  // and the smoke is see-through: on the map those gaps would show the map. They are filled from
  // the nearest column pixel in the same row (both sides within 14 px) and drawn UNDER the smoke:
  // where the smoke still lies over them, the fill is his deep violet (so the smoke composites
  // back to his look, within 2-3 levels), and where it has drifted off, the column runs on.
  const colFill = blank(k.w, k.h);
  const DEEP = KIND.indexOf('outline') + 1;
  // (Only inside the column's own span in each row, so nothing grows past its sides.)
  const colL = new Int32Array(k.h).fill(k.w), colR = new Int32Array(k.h).fill(-1);
  for (let y = 0; y < k.h; y++)
    for (let x = 0; x < k.w; x++)
      if (at(col, x, y)) {
        colL[y] = Math.min(colL[y], x);
        colR[y] = Math.max(colR[y], x);
      }
  for (let y = 0; y < k.h; y++)
    for (let x = 0; x < k.w; x++) {
      if (at(col, x, y) || !(at(sm, x, y) || at(fx, x, y)) || x < colL[y] || x > colR[y]) continue;
      let l = 0, r = 0;
      for (let d = 1; d <= 24 && !l; d++) if (at(col, x - d, y)) l = d;
      for (let d = 1; d <= 24 && !r; d++) if (at(col, x + d, y)) r = d;
      if (l || r) colFill.d[y * k.w + x] = l && (l <= r || !r) ? at(col, x - l, y) : at(col, x + r, y);
    }
  // His column stands in the middle of the pool, so the pool has no pixels behind it; when the
  // column is narrow (rising) or going out, the pool runs on there: each hidden pixel inside the
  // pool's ellipse takes the pool's own pixel at the same radius, the nearest angle round the
  // ellipse (in its own space), so his spiral arms run on behind the column.
  const prx = (pb[2] - pb[0] + 1) / 2, pry = (pb[3] - pb[1] + 1) / 2;
  const poolBehind = blank(k.w, k.h);
  for (let y = pb[1]; y <= pb[3]; y++)
    for (let x = pb[0]; x <= pb[2]; x++) {
      if (at(pool, x, y) || !(at(col, x, y) || at(colFill, x, y) || at(sm, x, y) || at(fx, x, y))) continue;
      const u = (x + 0.5 - pcx) / prx, v = (y + 0.5 - pcy) / pry;
      const r = Math.hypot(u, v);
      if (r > 0.92) continue;
      const th = Math.atan2(v, u);
      const hid = (sx: number, sy: number) => !at(pool0, sx, sy) || !!(at(col, sx, sy) || at(colFill, sx, sy));
      const ox = Math.floor(2 * pcx - x - 0.5 + 0.5), oy = Math.floor(2 * pcy - y - 0.5 + 0.5);
      if (!hid(ox, oy)) {
        poolBehind.d[y * k.w + x] = at(pool0, ox, oy);
        continue;
      }
      for (let d = 1; d <= 90; d++) {
        let got = 0;
        for (const sg of [1, -1]) {
          const a = th + sg * d * (Math.PI / 180) * 2;
          const sx = Math.floor(pcx + Math.cos(a) * r * prx), sy = Math.floor(pcy + Math.sin(a) * r * pry);
          if (!got && at(pool0, sx, sy) && !(at(col, sx, sy) || at(colFill, sx, sy))) got = at(pool0, sx, sy);
        }
        if (got) {
          poolBehind.d[y * k.w + x] = got;
          break;
        }
      }
    }
  const DEG = Math.PI / 180;
  const K = BLAST_KEY;
  // The plan, one entry per frame. Anticipation (0-3): the pool opens and turns, the column
  // shoots up out of it in streaks of light (narrow at first, white-hot at its ragged front), the
  // feathers and sparkles burst out. BLAST_KEY (4): his picture, held (5-6) with small motion.
  // Settle (7-15): the pool keeps turning and darkens, the column wavers and goes out from the
  // top down, the feathers fly out and up, the smoke rises; everything fades over the last frames.
  //   poolS  pool size     reach  column height (1 = his)   narrow  column width while it rises
  //   gone   share of the column gone from the top (ragged)  dim  ramp steps down (column, pool)
  const P = {
    poolS: [0.34, 0.56, 0.76, 0.91, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    poolA: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.94, 0.84, 0.7, 0.52, 0.32],
    poolDim: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, -1, -2, -2, -2],
    reach: [0.14, 0.4, 0.68, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    narrow: [0.5, 0.64, 0.8, 0.93, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    gone: [0, 0, 0, 0, 0, 0, 0, 0.06, 0.15, 0.25, 0.36, 0.48, 0.6, 0.72, 0.84, 0.95],
    colDim: [0, 0, 0, 0, 0, 0, 0, 0, -1, -1, -1, -2, -2, -2, -3, -3],
    fA: [0, 0, 0.45, 0.8, 1, 1, 1, 1, 1, 0.92, 0.82, 0.7, 0.56, 0.42, 0.28, 0.14],
    smA: [0.12, 0.3, 0.55, 0.8, 1, 1, 1, 1, 0.95, 0.88, 0.8, 0.7, 0.58, 0.45, 0.32, 0.18],
  };
  if (P.poolS.length !== BLAST_N || P.reach[K] !== 1 || P.gone[K] || P.poolS[K] !== 1) throw new Error('vfx-genjutsu-v3: blast plan');
  // The vortex's turn (degrees) per frame: 6 a frame, but only 2.5 a frame over the hold after his
  // picture, so the hold really is his picture with a small motion.
  const TURN = [-24, -18, -12, -6, 0, 2.5, 5, 10, 16, 22, 28, 34, 40, 46, 52, 58];
  const fr: Canvas[] = [];
  for (let i = 0; i < BLAST_N; i++) {
    if (i === K) {
      fr.push(render(k.w, k.h, [[pool], [remap(colFill, () => DEEP)], [sm], [col], [fx]], SOFT_TOP));
      continue;
    }
    // The vortex (with its dark outer rings) turns inside its own outline (a true rotation in the
    // ground ellipse's own space, sampled only from the pool, every pixel of the outline kept), so
    // no pixel of it ever opens; it opens out of the ground while it grows.
    // (Off his picture and its hold, the pool behind the column runs on under it; over the hold,
    // his own pool lies under the turned one, so a pixel the turn leaves shows his pixel.)
    let p = i > K && i < K + 3 ? stamp(union(pool), turnInside(pool, pcx, pcy, TURN[i] * DEG, squash)) : turnInside(union(poolBehind, pool), pcx, pcy, TURN[i] * DEG, squash);
    if (P.poolS[i] < 1) p = scaleAbout(p, k.ax, k.ay, P.poolS[i]);
    // Dying: each colour steps down its own hue ramp (the vortex darkens, it never greys).
    if (P.poolDim[i]) p = tone(p, P.poolDim[i]);
    // The column shoots up out of the pool, white-hot at its front. (`shape` is applied to the
    // column and to its fill under his smoke alike.)
    let shape: (src: Ix) => Ix;
    let colFront: ((x: number, y: number) => number) | undefined;
    if (P.reach[i] < 1) {
      // Its front is ragged in streaks (each column of light ends at its own height): the last
      // 12 px fade out in steps, white-hot just below. It starts narrow and widens.
      const front = (x: number) => colBottom - colH * P.reach[i] + snoise(x, i, 2.5, 925) * 9;
      shape = (src) => tone(keep(scaleAbout(src, k.ax, colBottom, P.narrow[i], 1), (x, y) => y >= front(x)), (x, y) => (y < front(x) + 10 ? 2 : y < front(x) + 22 ? 1 : 0));
      colFront = (x, y) => Math.ceil(clamp((y - front(x)) / 12, 0, 1) * 4) / 4;
    } else {
      // Held and settling: the column wavers (a rising, looping field: 0 at his picture),
      // a little at first, more as it dies.
      const amp = i < K + 3 ? 0.7 + 0.35 * (i - K) : 1.6;
      const wv = wobble((i - K) / 12, amp, 5, 930, 1);
      // (Over his own column, so where a streak wavers off a pixel his streak shows, never a slit.)
      shape = (src) => stamp(union(src), inside(displace(src, wv), 1));
    }
    let c = shape(col), cFill = shape(colFill);
    if (P.gone[i]) {
      // The light goes out from the top down: each streak ends lower (ragged, in ordered alpha
      // steps), and what is left steps down its own hue ramp. It stays opaque, so it darkens
      // to violet instead of greying over the pool; no specks, no holes.
      const gone = (x: number) => cb[1] + colH * P.gone[i] + snoise(x, 0, 2, 945) * 8;
      colFront = (x, y) => Math.ceil(clamp((y - gone(x)) / 12, 0, 1) * 4) / 4;
    }
    if (P.colDim[i]) {
      c = tone(c, P.colDim[i]);
      cFill = tone(cFill, P.colDim[i]);
    }
    // The feathers, sparkles and splashes burst out with the column, then fly out and up.
    let f = fx;
    if (i < K) {
      const g = [0, 0, 0.8, 0.92][i];
      f = g ? keep(scaleAbout(fx, k.ax, k.ay - 30, g), (x, y) => hash(x >> 2, y >> 2, 950) > (i === 2 ? 0.35 : 0.12)) : none(k);
    } else {
      // Bits go out one by one and stay out (thinned where they started, before they move, so
      // nothing blinks on and off).
      // (Over the hold they stay where he put them: what lies under a bit is not in his picture.)
      const u = Math.max(0, i - K - 2) / (BLAST_N - 3 - K);
      const thin = keep(fx, (x, y) => hash(Math.floor(x / 6), Math.floor(y / 6), 960) >= 0.55 * u * u);
      // (What sits on the pool's back rim moves less, so it never parts from the pool.)
      f = inside(displace(thin, (x, y) => {
        const r = Math.hypot(x - k.ax, (y - k.ay) * 1.6) || 1;
        const g = anchorRim(y);
        return [((x - k.ax) / r) * 12 * u * g, -12 * u * g];
      }), 1);
    }
    // The dark smoke opens out with the pool and rises with the column (below its front), then
    // drifts up.
    let s = sm;
    if (i < K) {
      const front = (x: number) => colBottom - colH * P.reach[i] + snoise(x, i, 2.5, 925) * 9;
      s = keep(scaleAbout(sm, k.ax, k.ay, Math.max(P.poolS[i], 0.5)), (x, y) => y >= front(x) + 4 || y > k.ay - 26);
    } else {
      // It drifts up (and wavers), held where it meets the pool's back rim, so no slit opens
      // between the smoke and the pool; over the hold it moves a pixel at most.
      const wv = wobble((i - K) / 12, i < K + 3 ? 0.7 : 1.4, 5, 970, 1);
      const rise = i < K + 3 ? (i - K) * 0.5 : (i - K) * 1.2;
      s = inside(displace(sm, (x, y) => {
        const g = anchorRim(y);
        const [dx, dy] = wv(x, y);
        return [dx * g, (dy - rise) * g];
      }), 1);
      // (Over the hold it moves over itself as it lies in his picture, so it opens no slit.)
      if (i < K + 3) s = stamp(union(sm), s);
    }
    const colA = Math.min(1, P.poolA[i] + 0.08);
    cFill = remap(cFill, (v, x, y) => (at(s, x, y) ? DEEP : v));
    // His pool was cut along a straight line at its back (the column and the smoke hid it there):
    // off his picture and its hold, its top rows fade out in ordered alpha steps down to a ragged
    // line 5-9 px below that cut, so no straight edge shows where the column has gone.
    const sc = P.poolS[i];
    const cut = k.ay + (pb[1] - k.ay) * sc;
    const vig = i > K && i < K + 3 ? undefined : (x: number, y: number) => {
      const t = clamp((y + 0.5 - cut) / ((5 + 4 * vnoise(x, 7, 3, 1031)) * Math.max(sc, 0.5)), 0, 1);
      return clamp(Math.floor(t * 4 + BAYER4[y & 3][x & 3] / 16) / 4, 0, 1);
    };
    fr.push(render(k.w, k.h, [[p, P.poolA[i], undefined, vig], [cFill, colA, undefined, colFront], [s, P.smA[i]], [c, colA, undefined, colFront], [f, P.fA[i]]], i > K && i < K + 3 ? SOFT_TOP : k.fade));
  }
  return sprite(k, 'Genjutsu blast: column of violet light out of a swirling vortex, with crow feathers', { blast: { frames: fr, fps: BLAST_FPS, loop: false } });
}

// --- walls: amethyst crystal pillars wrapped in black thorns -------------------------------------------

/**
 * His crystal under his thorns: the thorns were cut out of the crystal, so where a thorn crosses a
 * crystal face there is nothing under it, and a thorn that sways a pixel would open a slit of map.
 * Every thorn pixel inside the crystal's own span (between its top and its foot in that column)
 * takes the colour of the nearest crystal pixel (a breadth-first fill, left and right first, as
 * his faces run across), so under a thorn lies his face. Under his thorns this changes nothing.
 */
function underThorns(cr: Ix, thorns: Ix): Ix {
  const out = union(cr);
  const { w, h } = cr;
  const top = new Int32Array(w).fill(h), bot = new Int32Array(w).fill(-1);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (at(cr, x, y)) {
        top[x] = Math.min(top[x], y);
        bot[x] = Math.max(bot[x], y);
      }
  const hole = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && !out.d[y * w + x] && !!at(thorns, x, y) && y >= top[x] && y <= bot[x];
  let front: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (out.d[y * w + x]) front.push(y * w + x);
  while (front.length) {
    const next: number[] = [];
    for (const n of front) {
      const x = n % w, y = (n - x) / w;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const u = x + dx, v = y + dy;
        if (!hole(u, v)) continue;
        out.d[v * w + u] = out.d[n];
        next.push(v * w + u);
      }
    }
    front = next;
  }
  return out;
}

/**
 * Which pillar each crystal pixel belongs to, as clusters that rise as one. His pillars stand
 * between his seams, but their pointed tops overlap the neighbour's columns, so a pixel's pillar
 * is not its column: each lit face (a 4-connected run of his lit crystal, L >= 36) goes to the
 * pillar holding most of it, and every other crystal pixel (outlines, seams, cracks, glows) to the
 * lit face nearest it (breadth-first through the crystal), so a pillar's outline is its own and no
 * neighbour's outline bar is left floating over it. Neighbouring pillars that overlap (one's lit
 * face crossing 6 px or more into the other's columns) are one cluster: they rise together, so a
 * pillar that comes up never shows the notch where its front neighbour hid it.
 */
function pillarClusters(cr: Ix, seams: number[]): Int16Array {
  const { w, h } = cr;
  const colP = (x: number) => seams.filter((sx) => sx <= x).length;
  const NP = seams.length + 1;
  const lab = new Int16Array(w * h).fill(-1);
  const lit = (n: number) => !!cr.d[n] && KIND[cr.d[n] - 1] === 'body' && LAB[cr.d[n] - 1][0] >= 36;
  const seen = new Uint8Array(w * h);
  for (let n0 = 0; n0 < w * h; n0++) {
    if (seen[n0] || !lit(n0)) continue;
    const comp: number[] = [];
    const st = [n0];
    seen[n0] = 1;
    while (st.length) {
      const n = st.pop()!;
      comp.push(n);
      const x = n % w, y = (n - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= w || v >= h) continue;
        const m = v * w + u;
        if (!seen[m] && lit(m)) {
          seen[m] = 1;
          st.push(m);
        }
      }
    }
    const cnt = new Array(NP).fill(0);
    for (const n of comp) cnt[colP(n % w)]++;
    let best = 0;
    for (let p = 1; p < NP; p++) if (cnt[p] > cnt[best]) best = p;
    // A big face running across a seam with a good share on both sides is two faces: split it.
    const split = comp.length > 30 && cnt[best] < comp.length * 0.75;
    for (const n of comp) lab[n] = split ? colP(n % w) : best;
  }
  // Every other crystal pixel: the nearest lit face's pillar.
  let front: number[] = [];
  for (let n = 0; n < w * h; n++) if (lab[n] >= 0) front.push(n);
  while (front.length) {
    const next: number[] = [];
    for (const n of front) {
      const x = n % w, y = (n - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= w || v >= h) continue;
        const m = v * w + u;
        if (lab[m] >= 0 || !cr.d[m]) continue;
        lab[m] = lab[n];
        next.push(m);
      }
    }
    front = next;
  }
  for (let n = 0; n < w * h; n++) if (cr.d[n] && lab[n] < 0) lab[n] = colP(n % w);
  // Overlapping neighbours rise as one cluster (union-find over the pillars).
  const parent = range(NP);
  const find = (p: number): number => (parent[p] === p ? p : (parent[p] = find(parent[p])));
  seams.forEach((sx, j) => {
    const left = j, right = j + 1;
    let cross = 0;
    for (let n = 0; n < w * h; n++) {
      if (!lit(n)) continue;
      const x = n % w;
      if ((lab[n] === left && x >= sx) || (lab[n] === right && x < sx)) cross++;
    }
    if (cross >= 6) parent[find(right)] = find(left);
  });
  for (let n = 0; n < w * h; n++) if (lab[n] >= 0) lab[n] = find(lab[n]);
  return lab;
}

/**
 * How far along each thorn a pixel lies from its root, for growing his thorns out of the ground
 * along their own length: a breadth-first walk (8-connected) from the roots (his thorn pixels in
 * the bottom `band` rows), as a share (0 at the root, 1 at the thorn's tip) of that thorn's
 * length; `rx` is the x of the root it grows from. A thorn not joined to the ground grows from its
 * own lowest pixel, starting when a thorn from the ground would reach that height.
 */
function thornGrowth(v: Ix, band: number): { f: Float32Array; rx: Int16Array } {
  const { w, h } = v;
  const g = new Float32Array(w * h).fill(-1), rx = new Int16Array(w * h);
  const b = bounds(v);
  const f = new Float32Array(w * h);
  if (!b) return { f, rx };
  const walk = (seeds: number[], base: number) => {
    const comp: number[] = [];
    let fr = seeds;
    for (const n of fr) {
      g[n] = base;
      rx[n] = n % w;
    }
    while (fr.length) {
      const next: number[] = [];
      for (const n of fr) {
        comp.push(n);
        const x = n % w, y = (n - x) / w;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const u = x + dx, vv = y + dy;
            if (u < 0 || vv < 0 || u >= w || vv >= h) continue;
            const m = vv * w + u;
            if (g[m] >= 0 || !v.d[m]) continue;
            g[m] = g[n] + 1;
            rx[m] = rx[n];
            next.push(m);
          }
      }
      fr = next;
    }
    return comp;
  };
  const roots: number[] = [];
  for (let y = b[3] - band + 1; y <= b[3]; y++) for (let x = 0; x < w; x++) if (v.d[y * w + x]) roots.push(y * w + x);
  const groups = [walk(roots, 0)];
  for (let n = 0; n < w * h; n++) {
    if (!v.d[n] || g[n] >= 0) continue;
    // Its own lowest pixel: walk its component first to find it.
    const comp: number[] = [];
    const st = [n];
    const mark = new Set([n]);
    while (st.length) {
      const m = st.pop()!;
      comp.push(m);
      const x = m % w, y = (m - x) / w;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const u = x + dx, vv = y + dy;
          const q = vv * w + u;
          if (u >= 0 && vv >= 0 && u < w && vv < h && v.d[q] && g[q] < 0 && !mark.has(q)) {
            mark.add(q);
            st.push(q);
          }
        }
    }
    let low = comp[0];
    for (const m of comp) if (m > low) low = m;
    groups.push(walk([low], b[3] - Math.floor(low / w)));
  }
  for (const comp of groups) {
    let mx = 1;
    for (const n of comp) mx = Math.max(mx, g[n]);
    for (const n of comp) f[n] = g[n] / mx;
  }
  return { f, rx };
}

/** Clears the outer `m` px of an image (particles drifting off the frame go at its edge). */
const inside = (ix: Ix, m: number): Ix => keep(ix, (x, y) => x >= m && y >= m && x < ix.w - m && y < ix.h - m);

/**
 * The floating bits (feathers, petals, chips) bob a pixel up and down at phase t, each as a whole
 * (its parts within 2 px of each other move together), so none is sheared or torn.
 */
function bob(ix: Ix, t: number, rest?: Ix): Ix {
  const groups: { ix: Ix; b: [number, number, number, number] }[] = [];
  for (const p of parts(ix)) {
    const g = groups.find((q) => p.b[0] <= q.b[2] + 2 && q.b[0] <= p.b[2] + 2 && p.b[1] <= q.b[3] + 2 && q.b[1] <= p.b[3] + 2);
    if (g) {
      stamp(g.ix, p.ix);
      g.b = bounds(g.ix)!;
    } else groups.push({ ix: union(p.ix), b: p.b });
  }
  const out = blank(ix.w, ix.h);
  for (const g of groups) {
    // (A bit lying on the wall itself, `rest`, holds still: moving it would bare what it covers.)
    let touches = false;
    if (rest)
      for (let n = 0; n < g.ix.d.length && !touches; n++) {
        if (!g.ix.d[n]) continue;
        const x = n % ix.w, y = (n - x) / ix.w;
        touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !!at(rest, x + dx, y + dy));
      }
    if (touches) {
      stamp(out, g.ix);
      continue;
    }
    const cx = (g.b[0] + g.b[2]) / 2;
    stamp(out, g.ix, 0, Math.round(Math.sin(t * TAU + cx * 0.13) - Math.sin(cx * 0.13)));
  }
  return out;
}

/**
 * A glint: a slanted band of light running over the crystals, at phase t. It crosses the
 * crystals' own extent once over the loop (t = 0 just before it, so frame 0 is his picture).
 */
function glint(ix: Ix, t: number): Ix {
  let lo = Infinity, hi = -Infinity;
  for (let n = 0; n < ix.w * ix.h; n++)
    if (ix.d[n] && KIND[ix.d[n] - 1] === 'body') {
      const u = (n % ix.w) + Math.floor(n / ix.w) * 0.6;
      lo = Math.min(lo, u);
      hi = Math.max(hi, u);
    }
  const c = lo - 4 + (hi - lo + 8) * t;
  return tone(ix, (x, y, v = at(ix, x, y)) => (KIND[v - 1] === 'body' && Math.abs(x + y * 0.6 - c) < 3 ? 2 : 0));
}

function wall(): WorldSprite {
  const k = key('wall', pad(2));
  sealDarkHoles(k, ['main', 'vines', 'bits', 'smoke']);
  const vines = piece(k, 'vines'), bits = piece(k, 'bits'), sm = piece(k, 'smoke');
  const W = k.w;
  // His crystal, with his faces run on under his thorns (see underThorns). Small loose pieces of
  // it (under 40 px, apart from the pillars: a chip, a bit of a feather) belong to no pillar:
  // they stay where he put them and come in with the bits.
  const crAll = underThorns(piece(k, 'main'), vines);
  // His floating feathers' dark rims (in the crystal piece, touching a feather of the bits) are the
  // feathers', not a pillar's: the dark run from a feather, as far as it stays off the crystal's
  // faces, goes with the loose pieces (so no dark bar rises with a pillar).
  const rim = new Uint8Array(W * k.h);
  const kindAt = (n: number) => (crAll.d[n] ? KIND[crAll.d[n] - 1] : '');
  const nb4 = (n: number) => [n - 1, n + 1, n - W, n + W].filter((m) => m >= 0 && m < W * k.h && Math.abs((m % W) - (n % W)) <= 1);
  let front = range(W * k.h).filter((n) => kindAt(n) === 'dark' && nb4(n).some((m) => bits.d[m]));
  while (front.length) {
    const next: number[] = [];
    for (const n of front) {
      if (rim[n] || nb4(n).some((m) => kindAt(m) === 'body')) continue;
      rim[n] = 1;
      for (const m of nb4(n)) if (!rim[m] && kindAt(m) === 'dark') next.push(m);
    }
    front = next;
  }
  const cr = blank(W, k.h), loose = blank(W, k.h);
  for (const p of parts(keep(crAll, (x, y) => !rim[y * W + x]))) stamp(p.ix.d.reduce((n, v) => n + (v ? 1 : 0), 0) < 40 ? loose : cr, p.ix);
  stamp(loose, keep(crAll, (x, y) => !!rim[y * W + x]));
  const cb = bounds(cr)!;
  const ground = k.ay + 2;
  const H = k.ay - cb[1];
  // Each cluster of his pillars (see pillarClusters) rises whole, on its own beat.
  const lab = pillarClusters(cr, k.seams);
  const clusters = [...new Set(Array.from(lab).filter((v) => v >= 0))].sort((a, b) => a - b);
  const beat = (c: number) => hash(c, 3, 1011);
  const DEEP = KIND.indexOf('outline') + 1;
  const isLit = (v: number) => !!v && KIND[v - 1] === 'body' && LAB[v - 1][0] >= 36;
  // The cluster standing on each column (its lowest crystal pixel's).
  const colCluster = new Int16Array(W).fill(-1);
  for (let x = 0; x < W; x++) for (let y = k.h - 1; y >= 0 && colCluster[x] < 0; y--) if (lab[y * W + x] >= 0) colCluster[x] = lab[y * W + x];
  // Each pillar's full shape. Where a neighbour stood in front of a pillar in his picture (its
  // pointed top crossing into the pillar's columns), the pillar has no pixels; when the two rise
  // apart, it would show a bite. Over its own columns, the pillar is completed below its own top
  // line (where the neighbour hid its top, the line runs on from its nearest open columns), each
  // hidden pixel taking the pillar's own pixel at the same depth below the top in its nearest open
  // column (so its outline, bevel and faces run on), or its nearest pixel in the same row.
  const fill = new Map<number, Ix>();
  for (const c of clusters) {
    const f = blank(W, k.h);
    const xs = range(W).filter((x) => colCluster[x] === c);
    const topC = new Map<number, number>(), open = new Set<number>();
    for (const x of xs) {
      let t = -1;
      for (let y = 0; y < k.h && t < 0; y++) if (lab[y * W + x] === c) t = y;
      if (t < 0) continue;
      topC.set(x, t);
      const above = t > 0 ? lab[(t - 1) * W + x] : -1;
      if (above < 0 || above === c) open.add(x);
    }
    const openXs = xs.filter((x) => open.has(x));
    if (!openXs.length) {
      fill.set(c, f);
      continue;
    }
    const nearOpen = (x: number) => openXs.reduce((b, o) => (Math.abs(o - x) < Math.abs(b - x) ? o : b), openXs[0]);
    for (const x of xs) {
      if (open.has(x) && topC.has(x)) {
        // Open column: only what another cluster covers below its top (a seam bar crossing in).
        for (let y = topC.get(x)! + 1; y <= ground; y++) {
          const n = y * W + x;
          if (cr.d[n] && lab[n] !== c) f.d[n] = at(cr, x, y - 1) && lab[n - W] === c ? cr.d[n - W] : f.d[n - W] || 0;
        }
        continue;
      }
      // Hidden top: the line runs on between the nearest open columns on each side (or from the
      // nearest one, with its slope, on one side only).
      const L = openXs.filter((o) => o < x), R = openXs.filter((o) => o > x);
      const xl = L.length ? L[L.length - 1] : -1, xr = R.length ? R[0] : -1;
      let est: number;
      if (xl >= 0 && xr >= 0) est = topC.get(xl)! + ((topC.get(xr)! - topC.get(xl)!) * (x - xl)) / (xr - xl);
      else {
        const o = xl >= 0 ? xl : xr, dir = xl >= 0 ? -1 : 1;
        const o2 = topC.has(o + dir * 3) && open.has(o + dir * 3) ? o + dir * 3 : o;
        const slope = o2 === o ? 0 : (topC.get(o)! - topC.get(o2)!) / 3;
        est = topC.get(o)! + slope * Math.abs(x - o);
      }
      const e = clamp(Math.round(est), cb[1], ground);
      const src = nearOpen(x);
      for (let y = e; y <= ground; y++) {
        const n = y * W + x;
        if (lab[n] === c) continue;
        if (!cr.d[n] && y >= (topC.get(x) ?? ground)) continue;
        const d = y - e, sy = topC.get(src)! + d;
        let v = sy <= ground && lab[sy * W + src] === c ? cr.d[sy * W + src] : 0;
        for (let dx = 1; dx < 16 && !v; dx++)
          for (const sx of [x - dx, x + dx]) if (!v && sx >= 0 && sx < W && lab[y * W + sx] === c) v = cr.d[y * W + sx];
        if (v) f.d[n] = v;
      }
    }
    fill.set(c, f);
  }
  // Who stands in front: a cluster whose pixels cross into a neighbour's columns stood in front
  // of it there. Drawn back to front (and every completion under every pillar's own pixels), so in
  // his picture each completion lies under the neighbour that hid it.
  const score = new Map(clusters.map((c) => [c, 0]));
  for (const a of clusters)
    for (const b of clusters) {
      if (a >= b) continue;
      let ab = 0, ba = 0;
      for (let n = 0; n < W * k.h; n++) {
        const x = n % W;
        if (lab[n] === a && colCluster[x] === b) ab++;
        if (lab[n] === b && colCluster[x] === a) ba++;
      }
      if (ab + ba < 4 || ab === ba) continue;
      score.set(a, score.get(a)! + (ab > ba ? 1 : -1));
      score.set(b, score.get(b)! + (ab > ba ? -1 : 1));
    }
  const order = [...clusters].sort((a, b) => score.get(a)! - score.get(b)! || a - b);
  // His thorns go up with the pillar they lie on (the cluster behind each thorn pixel, or the one
  // standing on its column), a beat behind it, clipped at the ground like the crystal: they come
  // up out of the ground wrapped round the pillars, never as a line along the ground.
  const thornCl = new Int16Array(W * k.h).fill(-1);
  for (let n = 0; n < W * k.h; n++) {
    if (!vines.d[n]) continue;
    const x = n % W;
    let cl = lab[n] >= 0 ? lab[n] : colCluster[x];
    for (let d = 1; d < W && cl < 0; d++) cl = colCluster[clamp(x - d, 0, W - 1)] >= 0 ? colCluster[clamp(x - d, 0, W - 1)] : colCluster[clamp(x + d, 0, W - 1)];
    thornCl[n] = cl;
  }
  const rise: Canvas[] = [];
  for (let r = 0; r < RISE_N; r++) {
    const T = riseT(r);
    if (r === RISE_N - 1) {
      rise.push(render(W, k.h, [[sm], [cr], [loose], [vines], [bits]]));
      continue;
    }
    const p = (c: number) => smooth(beat(c) * 0.4, beat(c) * 0.4 + 0.6, T);
    const lift = new Map(clusters.map((c) => [c, Math.round((1 - p(c)) * H)]));
    // Every cluster moved down by its lift, clipped at the ground (nothing shows below it).
    const c = blank(W, k.h);
    const who = new Int16Array(W * k.h).fill(-1);
    const put = (src: Ix, cl: number, only?: (n: number) => boolean) => {
      const l = lift.get(cl)!;
      for (let n = 0; n < W * k.h; n++) {
        const v = src.d[n];
        if (!v || (only && !only(n))) continue;
        const x = n % W, y = (n - x) / W + l;
        if (y >= k.h || (l > 0 && y > ground)) continue;
        c.d[y * W + x] = v;
        who[y * W + x] = cl;
      }
    };
    for (const cl of order) put(fill.get(cl)!, cl);
    for (const cl of order) put(cr, cl, (n) => lab[n] === cl);
    // White-hot at the top of a cluster while it climbs (two ramp steps, one just below).
    const lit = remap(c, (v, x, y) => {
      const l = lift.get(who[y * W + x])!;
      if (!l) return v;
      let t = y;
      while (t > 0 && who[(t - 1) * W + x] === who[y * W + x]) t--;
      return y < t + 3 ? toneMap(2)[v - 1] + 1 : y < t + 6 ? toneMap(1)[v - 1] + 1 : v;
    });
    // Where a risen cluster stands beside a lower one, its side is bare where his seam outline
    // belonged to the neighbour: his deep-violet outline runs down that side.
    for (let y = 0; y <= ground; y++)
      for (let x = 0; x < W; x++) {
        if (lit.d[y * W + x] || !cr.d[y * W + x]) continue;
        if (isLit(at(lit, x - 1, y)) || isLit(at(lit, x + 1, y))) lit.d[y * W + x] = DEEP;
      }
    // The thorns, a beat behind their pillar.
    const v = blank(W, k.h);
    for (let n = 0; n < W * k.h; n++) {
      if (!vines.d[n]) continue;
      const cl = thornCl[n];
      const q = cl >= 0 ? smooth(beat(cl) * 0.4 + 0.12, Math.min(1, beat(cl) * 0.4 + 0.72), T) : T;
      const l = Math.round((1 - q) * H);
      const x = n % W, y = (n - x) / W + l;
      if (y >= k.h || (l > 0 && y > ground)) continue;
      v.d[y * W + x] = vines.d[n];
    }
    const smA = smooth(0.25, 0.9, T), bitsA = smooth(0.6, 1, T);
    rise.push(render(W, k.h, [[sm, smA], [lit], [loose, bitsA], [v], [bits, bitsA]]));
  }
  const idle = range(IDLE_N).map((i) => {
    if (!i) return render(k.w, k.h, [[sm], [cr], [loose], [vines], [bits]]);
    const t = i / IDLE_N;
    const c = stamp(glint(cr, t), loose);
    // The thorn tips sway a pixel over his crystal (his faces lie under them); the bits bob.
    const v = displace(vines, (x, y) => [(Math.sin(t * TAU + x * 0.07) - Math.sin(x * 0.07)) * smooth(k.ay - 10, k.ay - 50, y) * 1.2, 0]);
    const b = bob(bits, t, union(cr, vines));
    return render(k.w, k.h, [[stamp(union(sm), displace(sm, wobble(t, 1, 5, 1020)))], [c], [v], [b]]);
  });
  return sprite(k, 'Genjutsu wall: amethyst crystal pillars in black thorns (4.5 m x 1.8 m)', {
    rise: { frames: rise, fps: RISE_FPS, loop: false },
    idle: { frames: idle, fps: IDLE_FPS, loop: true },
  });
}

/**
 * The 3/4 and end-on walls: the crystals push up out of the ground, translated column by column
 * and clipped at each column's ground line (never scaled or sheared).
 */
function wall3d(name: 'wall_diag' | 'wall_depth', label: string, idleN: number, seed: number): WorldSprite {
  const room = name === 'wall_diag' ? { l: 2, t: 2, r: 0, b: 2 } : pad(2);
  const k = key(name, room);
  sealDarkHoles(k, ['main', 'column', 'bits', 'smoke', 'stain']);
  const main = piece(k, 'main'), col = piece(k, 'column'), bits = piece(k, 'bits'), sm = piece(k, 'smoke'), stain = piece(k, 'stain');
  const all = union(main, col);
  const ab = bounds(all)!;
  const stainB = bounds(stain);
  // Each column's ground: on the 3/4 wall, his slanted foot line (the near-left foot about
  // (-95, +45) from the anchor, the far end about (+95, -55), along the crystal bases, a few px
  // of base below it); end-on, each column's lowest pixel (the ground runs back into the screen).
  const footLow = new Int32Array(k.w).fill(-1);
  for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) if (at(all, x, y)) footLow[x] = y;
  const line = (x: number) => Math.round(k.ay + 45 - ((x - (k.ax - 95)) * 100) / 190 + 6);
  // On the 3/4 wall a crystal's foot can dip below the straight line (his crystal bases and the
  // magenta splash at the foot): the column's ground follows its crystal down while it runs on
  // unbroken below the line, so the bases rise with their columns (and no hole of map shows
  // under a risen column).
  const solidAt = (x: number, y: number) => {
    const v = at(all, x, y);
    return !!v && PAL[v - 1][3] === 255 && KIND[v - 1] !== 'weed';
  };
  const footDip = new Int32Array(k.w);
  for (let x = 0; x < k.w; x++) {
    let g = line(x);
    if (name === 'wall_diag' && solidAt(x, g)) while (g + 1 < k.h && solidAt(x, g + 1)) g++;
    footDip[x] = g;
  }
  const ground = name === 'wall_diag' ? (x: number) => footDip[clamp(x, 0, k.w - 1)] : (x: number) => (footLow[x] >= 0 ? footLow[x] : ab[3]);
  // What stands on the ground (crystals) rises; what lies in front of the foot line (brambles,
  // shards and the splash on the ground) comes up after, with the bits.
  const up = keep(all, (x, y) => y <= ground(x));
  const front = keep(all, (x, y) => y > ground(x));
  const top = new Int32Array(k.w).fill(-1);
  for (let y = k.h - 1; y >= 0; y--) for (let x = 0; x < k.w; x++) if (at(up, x, y)) top[x] = y;
  // Each column rises by its own height (the tallest within 8 px, so a pillar moves as one).
  const colHt = new Float64Array(k.w);
  for (let x = 0; x < k.w; x++)
    for (let u = Math.max(0, x - 8); u <= Math.min(k.w - 1, x + 8); u++) if (top[u] >= 0) colHt[x] = Math.max(colHt[x], ground(u) - top[u] + 1);
  // Where a point of the long shadow starts on the foot line, following the shadow's run back
  // (0.37 px down per px across; the foot line climbs 100 px over 190), and the shadow's length.
  const footX = (x: number, y: number) => (k.ay + 51 + (k.ax - 95) * (100 / 190) - y + 0.37 * x) / (0.37 + 100 / 190);
  let shadowLen = 1;
  for (let n = 0; n < k.w * k.h; n++) if (stain.d[n]) shadowLen = Math.max(shadowLen, (n % k.w) - footX(n % k.w, Math.floor(n / k.w)) + 8);
  const rise: Canvas[] = [];
  for (let r = 0; r < RISE_N; r++) {
    // A strong ease-out (it shoots up and settles: the last steps are a pixel or two).
    const T = 1 - (1 - (r + 1) / RISE_N) ** 2;
    const last = r === RISE_N - 1;
    // 3/4: a wave from the near end to the far end; end-on: the column all at once.
    // (each column eases out: it shoots up and settles; the far end starts a third of the way in)
    const Tl = (r + 1) / RISE_N;
    const t = name === 'wall_diag' ? (x: number) => 1 - (1 - clamp(Tl * 1.5 - 0.5 * ((x - ab[0]) / (ab[2] - ab[0])), 0, 1)) ** 2 : () => T;
    const lift = (x: number) => (last ? 0 : Math.round((1 - t(x)) * colHt[x]));
    let a: Ix;
    if (last) a = all;
    else {
      a = emergeCols(up, ground, lift);
      // White-hot at their tops while they climb (one step up each colour's own ramp, two at the tip).
      a = tone(a, (x, y) => (lift(x) > 0 && top[x] >= 0 ? (y < top[x] + lift(x) + 3 ? 2 : y < top[x] + lift(x) + 7 ? 1 : 0) : 0));
    }
    // What lies in front of the foot (brambles, shards) comes up with the wave: in each column it
    // fades in (ordered alpha steps) as that column's crystal comes up, full by the time it stands
    // (the end-on wall: full by frame 9).
    const ordered = (v: number, x: number, y: number) => clamp(Math.floor(v * 4 + BAYER4[y & 3][x & 3] / 16) / 4, 0, 1);
    const frontAt = last ? undefined : (x: number, y: number) => ordered(name === 'wall_diag' ? smooth(0.2, 0.75, t(x)) : smooth(0.3, 0.86, T), x, y);
    // The long shadow stretches out from the wall's foot along its own run (down to the right,
    // about 0.37 px down per px across) as the wall grows, its moving end an ordered alpha ramp
    // 8 px long (as at its far end); until the wall stands, none of it shows behind the foot line.
    // The smoke comes up with the crystals (none above their tops).
    const run = (x: number, y: number) => x + 0.37 * y;
    let stAt: ((x: number, y: number) => number) | undefined;
    let st = stain;
    if (!last && stainB) {
      st = keep(stain, (x, y) => T >= 0.9 || y > ground(x) - 2);
      if (name === 'wall_diag') {
        // Each column's shadow stretches out from its own foot as that column comes up: a stain
        // pixel belongs to the column whose foot its run (down-right, 0.37 px per px) starts from.
        stAt = (x, y) => {
          const xs = clamp(Math.round(footX(x, y)), ab[0], ab[2]);
          const reach = shadowLen * smooth(0.05, 0.95, t(xs));
          return ordered(clamp((reach - (x - xs)) / 8, 0, 1), x, y);
        };
      } else {
        const r0 = run(stainB[0], stainB[1]), r1 = run(stainB[2], stainB[3]);
        const reach = r0 + (r1 - r0 + 8) * (0.06 + 0.94 * smooth(0, 0.92, T));
        stAt = (x, y) => ordered(clamp((reach - run(x, y)) / 8, 0, 1), x, y);
      }
    }
    // His smoke (with his dark thorns and feathers in it) comes up with the crystals, moved as they
    // are, so it never parts from them.
    const s = last ? sm : emergeCols(sm, ground, lift);
    const stA = last ? 1 : 0.4 + 0.6 * smooth(0, 0.7, T), smA = last ? 1 : smooth(0.08, 0.85, T), bitsA = last ? 1 : smooth(0.55, 1, T);
    rise.push(render(k.w, k.h, [[st, stA, undefined, stAt], [s, smA], [a], [front, last ? 0 : 1, undefined, frontAt], [bits, bitsA]], k.fade));
  }
  const idle = range(idleN).map((i) => {
    if (!i) return render(k.w, k.h, [[stain], [sm], [all], [bits]], k.fade);
    const t = i / idleN;
    const a = glint(all, t);
    const b = bob(bits, t, union(all, sm));
    // His smoke churns over itself as it lies in his picture (his dark thorns and feathers are in
    // it), so where a shape moves off a pixel, his own pixel shows, never a slit of map.
    return render(k.w, k.h, [[stain], [stamp(union(sm), displace(sm, wobble(t, 1, 5, seed + 20)))], [a], [b]], k.fade);
  });
  return sprite(k, label, { rise: { frames: rise, fps: RISE_FPS, loop: false }, idle: { frames: idle, fps: IDLE_FPS, loop: true } });
}

// --- aura: violet flames round the figure, in two layers -----------------------------------------------

function aura(): WorldSprite[] {
  const kb = key('aura_back', pad(2));
  const kf = key('aura', pad(2));
  if (kb.ax !== kf.ax || kb.ay !== kf.ay || kb.w !== kf.w || kb.h !== kf.h) throw new Error('vfx-genjutsu-v3: the aura layers do not line up');
  const back = union(piece(kb, 'main'), piece(kb, 'smoke'));
  const ring = union(piece(kf, 'main'), piece(kf, 'smoke')), petals = piece(kf, 'petals');
  const backFr: Canvas[] = [], frontFr: Canvas[] = [];
  for (let i = 0; i < AURA_N; i++) {
    const t = i / AURA_N;
    // The flames lick upward (the noise rises through them), more toward their tips.
    const w = wobble(t, 2.2, 6, 1200, 1);
    const b = i ? displace(back, (x, y) => {
      const [dx, dy] = w(x, y);
      const up = clamp((kb.ay - y) / 90, 0.25, 1);
      return [dx * up, dy * up * 0.8];
    }) : back;
    // The ring at the feet and the bits glow up and down a ramp step, slowly.
    const lit = Math.round(Math.sin(t * TAU) * 1.2);
    backFr.push(render(kb.w, kb.h, [[tone(b, (x, y) => (KIND[at(b, x, y) - 1] === 'glow' ? lit : 0))]]));
    // In front: the petals drift and turn a little, the ring at the feet flickers.
    const p = i ? displace(petals, (x, y) => [Math.round(Math.sin(t * TAU + y * 0.2) - Math.sin(y * 0.2)), Math.round(Math.cos(t * TAU + x * 0.3) - Math.cos(x * 0.3))]) : petals;
    const front = veil(kf, i);
    front.draw(render(kf.w, kf.h, [[tone(ring, lit)], [p]]), 0, 0);
    frontFr.push(front);
  }
  return [
    sprite(kf, 'Genjutsu aura, front layer (draw OVER the character): the violet veil over the body, petals, feathers, the ring at the feet', { idle: { frames: frontFr, fps: AURA_FPS, loop: true } }),
    sprite(kb, 'Genjutsu aura, back layer (draw BEHIND the character): dark violet flames and smoke', { idle: { frames: backFr, fps: AURA_FPS, loop: true } }),
  ];
}

/**
 * The violet veil over the body, as in his picture, where the figure is seen through the genjutsu
 * (the owner chose this for the lightning aura too). Measured on his sheet by laying his plain
 * character (beside the blast) over his character in the aura panel and fitting his tinted figure
 * as plain * (1 - a) + C * a (least squares over 3940 figure pixels): a = 0.37, C = (114, 55,
 * 126), a violet-magenta. Flat over the whole body (no brighter rim), fading out only over the
 * outer twelfth of its field. A soft field round the body, not the shape of any one character, so
 * it sits right on every figure; it breathes a little with the frames (33-37%).
 */
function veil(k: Key, frame: number): Canvas {
  const c = new Canvas(k.w, k.h);
  // Fitted to a 96 px figure standing on the anchor (feet): x -25..+17, y -93..+2 (characterRef).
  // (Its field reaches a little past the head and the feet, so the whole figure is tinted.)
  const cx = k.ax - 4, cy = k.ay - 47, rx = 24, ry = 56;
  const base = 0.35 + 0.02 * Math.sin((frame / AURA_N) * TAU);
  for (let y = 0; y < k.h; y++)
    for (let x = 0; x < k.w; x++) {
      const r = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      if (r >= 1) continue;
      // The edge: ordered (Bayer) steps over r 0.92-1, so the fade does not band into rings.
      const edge = clamp((1 - r) / 0.08, 0, 1);
      const e = clamp(Math.floor(edge * 4 + BAYER4[y & 3][x & 3] / 16) / 4, 0, 1);
      const a = Math.round(base * e * 64) / 64;
      if (a <= 0) continue;
      c.set(x, y, [114, 55, 126, Math.round(a * 255)]);
    }
  return c;
}

// --- checks and output ------------------------------------------------------------------------------

/** No frame may have art on its border, except the stream tile's left and right and the head's left. */
export function borderCheck(s: WorldSprite): string[] {
  const bad: string[] = [];
  for (const [an, a] of Object.entries(s.anims))
    a.frames.forEach((f, i) => {
      const sides = { top: 0, bottom: 0, left: 0, right: 0 };
      for (let x = 0; x < f.w; x++) {
        if (f.alpha(x, 0)) sides.top++;
        if (f.alpha(x, f.h - 1)) sides.bottom++;
      }
      for (let y = 0; y < f.h; y++) {
        if (f.alpha(0, y)) sides.left++;
        if (f.alpha(f.w - 1, y)) sides.right++;
      }
      if (s.name === 'stream') sides.left = sides.right = 0;
      if (s.name === 'stream_head') sides.left = 0;
      for (const [side, nPx] of Object.entries(sides)) if (nPx) bad.push(`${s.name} ${an}[${i}] ${side}: ${nPx} px`);
    });
  return bad;
}

/**
 * Every sprite of the set (beast aside). `only` (from GJ_SPRITES, for experiments in a scratch
 * folder only) builds just the named ones.
 */
export function genjutsuV3Sprites(only?: string[]): WorldSprite[] {
  const want = (...n: string[]) => !only || n.some((x) => only.includes(x));
  const out: WorldSprite[] = [];
  if (want('bolt')) out.push(bolt());
  if (want('stream', 'stream_head')) out.push(...stream());
  if (want('breath')) out.push(breath());
  if (want('sphere')) out.push(sphere());
  if (want('slash')) out.push(slash());
  if (want('multi')) out.push(multi());
  if (want('hit')) out.push(hit());
  if (want('blast')) out.push(blast());
  if (want('wall')) out.push(wall());
  if (want('aura', 'aura_back')) out.push(...aura());
  if (want('wall_diag'))
    out.push(wall3d('wall_diag', 'Genjutsu wall, 3/4: crystal pillars, brambles and a long shadow (4.5 m x 1.8 m, turned 45 degrees)', IDLE_N, 1300));
  if (want('wall_depth'))
    out.push(wall3d('wall_depth', 'Genjutsu wall, end-on: crystal column with shards, feathers and orbs (running into the screen)', IDLE_N, 1400));
  return out;
}

/** For debugging scripts in a scratch folder only (nothing in the build uses it). */
export const __gjDebug = { key, piece, pillarClusters, underThorns, thornGrowth, render, bounds, parts, holes, toneMap, PAL, KIND, LAB };

/** The order of the old group's manifest (beast second), with aura_back after aura. */
const ORDER = ['bolt', 'beast', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi', 'hit', 'blast', 'wall', 'aura', 'aura_back', 'wall_diag', 'wall_depth'];

/**
 * writeGroup into a temp folder, add the beast (sheet and manifest entry copied through unchanged
 * from the old group), then move each file into the group (PNGs first, manifest last).
 */
function writeGroupWhole(sprites: WorldSprite[], root: string, partial = false): void {
  const tmpRoot = join(root, `.${GROUP}-tmp`);
  rmSync(tmpRoot, { recursive: true, force: true });
  writeGroup(GROUP, sprites, tmpRoot);
  const src = join(tmpRoot, GROUP), dest = join(root, GROUP);
  const man = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
  const oldDir = join(root, OLD_GROUP);
  if (!existsSync(join(oldDir, 'manifest.json')) || !existsSync(join(oldDir, 'beast.png')))
    throw new Error(`vfx-genjutsu-v3: ${oldDir} has no beast to copy through`);
  const oldMan = JSON.parse(readFileSync(join(oldDir, 'manifest.json'), 'utf8'));
  copyFileSync(join(oldDir, 'beast.png'), join(src, 'beast.png'));
  // (A partial build, GJ_SPRITES, keeps the other sprites' entries of the group it writes into.)
  const kept = partial && existsSync(join(dest, 'manifest.json')) ? JSON.parse(readFileSync(join(dest, 'manifest.json'), 'utf8')).sprites : {};
  const sp: Record<string, unknown> = { ...kept, ...man.sprites, beast: oldMan.sprites.beast };
  const ordered: Record<string, unknown> = {};
  for (const n of ORDER) if (sp[n]) ordered[n] = sp[n];
  for (const n of Object.keys(sp)) if (!ordered[n]) ordered[n] = sp[n];
  writeFileSync(join(src, 'manifest.json'), JSON.stringify({ ...man, sprites: ordered }, null, 1) + '\n');
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(src).sort((a, b) => Number(a === 'manifest.json') - Number(b === 'manifest.json') || a.localeCompare(b));
  for (const f of files) renameSync(join(src, f), join(dest, f));
  rmSync(tmpRoot, { recursive: true, force: true });
}

if (process.argv[1] && /vfx-genjutsu-v3\.ts$/.test(process.argv[1])) {
  // Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
  const worldOut = process.env.WORLD_OUT;
  if (!worldOut) throw new Error('vfx-genjutsu-v3: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
  const only = process.env.GJ_SPRITES ? process.env.GJ_SPRITES.split(',') : undefined;
  const sprites = genjutsuV3Sprites(only);
  const bad = sprites.flatMap(borderCheck);
  if (bad.length) throw new Error('vfx-genjutsu-v3: art on the frame border:\n  ' + bad.join('\n  '));
  writeGroupWhole(sprites, worldOut, !!only);
  for (const s of sprites) {
    const f = Object.values(s.anims)[0].frames[0];
    console.log(`${s.name.padEnd(12)} ${`${f.w}x${f.h}`.padEnd(8)} anchor ${s.anchor.join(',').padEnd(8)} ` + Object.entries(s.anims).map(([n, a]) => `${n} ${a.frames.length}f@${a.fps}`).join(', '));
  }
  if (SEALED.size) console.log('safety net (see sealHoles), px sealed: ' + [...SEALED].map(([n, c]) => `${n} ${c}`).join(', '));
  console.log(`wrote ${sprites.length} sprites + beast (copied) to ${join(worldOut, GROUP)}`);
}
