// Chakra jutsu VFX, v3: rebuilt to the owner's own paint-over of the chakra sheet
// (docs/reference/chakra-set-owner-reference.jpg). He asked for his examples to be copied as
// exactly as possible, so every sprite's KEY frame is his picture: tools/refs/chakra-from-ref.py cut
// his panels out at game scale (his characters are 95-97 px tall, like ours, so one of his pixels is
// one game pixel), removed his background, characters, labels and panel borders, quantized his
// pixels to one palette sampled from his image (a blue ramp and a gold ramp), cleaned his rims to a
// tinted 1 px outline (deep blue round the chakra, dark gold round the gold, never black) and kept
// his light (the haze, the halos, the gold glow at the aura's feet, the barrier's pane and the 3/4
// wall's shadow) as semi-transparent pixels. That data is in vfx-chakra-v3-refdata.ts; this
// generator only DERIVES the other frames from those key frames:
//
//   - fly loops    8 frames at 12 fps; frame 0 is his picture. The vortex (bolt) and the spiral orb
//                  (sphere) swirl: a wave runs in along their arms to the core and comes back round
//                  to his picture, every frame moved the same way (Scale2x x3, warped, commonest of
//                  16 samples, his rim put back), so no frame is a mix of two pictures; the rest ripples with a steady travelling wave,
//                  the light shimmers in soft regional waves, gold rings carry a travelling glint
//                  and small bits twinkle whole with their glow;
//   - stream       his 64 px period of the beam, flowing 8 px a frame toward the target (it still
//                  tiles); the head's first columns are the flowing tile itself;
//   - hit          12 frames at 12 fps: builds up over 3, his picture held for 3, goes out over 6;
//   - blast        16 frames at 12 fps: the seal circle lights at its front and draws itself round,
//                  the pillar climbs out of it (4), his picture held for 3, then a long settle (9);
//   - walls        'rise' 12 frames at 12 fps (the gold frame rises, then the pane fills up from the
//                  ground, ending on his picture), 'idle' 8 frames at 10 fps (a light sweep across
//                  the cells, ripples along the crest, the foam twinkling);
//   - aura         12 frames at 10 fps, in two layers like the fire aura: 'aura_back' (behind the
//                  character: his flames, their haze and the gold glow at the feet) and 'aura' (over
//                  it: the near half of the gold ring and his sparkles).
// The owner found the earlier jutsu too fast ("like a flashing star"), so every in-between moves a
// little, every step of a loop about as much as the next (no freeze round his frame, no lurch: see
// dither and wave), and the light (mean alpha x brightness) changes smoothly from frame to frame.
//
// wall_depth is NOT his: the owner said his end-on wall is not right and we keep ours. It is our
// seal barrier from vfx-b-chakra.ts (barrierWall('wall_depth')), whose code is copied below,
// played with the new frame counts (rise 12, idle 8). Two changes, both for the new timing: its
// glint streaks never drop below a 15% share (they blinked off on two old frames), and the first
// rise frame is our barrier lower down at half strength (see depthFrames).
//
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/vfx-chakra-v3.ts
//
// Writes <dir>/vfx_chakra_v3/ (one PNG per sprite + manifest.json). It refuses to run without
// WORLD_OUT, so it never writes into src/assets; every file is written whole (temp, then rename);
// the output is deterministic (no Math.random). The beast is out of scope (another artist): its
// beast.png and manifest entry are copied through from vfx_chakra unchanged.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, Color, PX_PER_M, WorldSprite, hash, noise, writeGroup } from './kit';
import { HGT, LEN, Orient, march, orientations, proj } from './vfx-b-wall3d';
import { L, pal, pnoise, rnd } from './vfx-b-lib';
import { CK_PAL, CK_REF, CkKind } from './vfx-chakra-v3-refdata';

const GROUP = 'vfx_chakra_v3';
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const fract = (v: number): number => v - Math.floor(v);
const smooth = (a: number, b: number, t: number): number => {
  const u = clamp((t - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

// --- the palette ------------------------------------------------------------------------------

const PAL: Color[] = CK_PAL.map((p) => {
  const h = p.rgba.slice(1);
  return [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16)) as Color;
});
const KIND: CkKind[] = CK_PAL.map((p) => p.kind);
/** Every light entry's ladder: the entries of its kind and hue, from faint to strong (alpha steps). */
const LADDER: number[][] = CK_PAL.map((p) =>
  CK_PAL.map((q, j) => [q, j] as const)
    .filter(([q]) => q.kind === p.kind && q.hue === p.hue)
    .sort((a, b) => a[0].order - b[0].order)
    .map(([, j]) => j),
);
const POS = CK_PAL.map((_, i) => LADDER[i].indexOf(i));
const LIGHT_KINDS: CkKind[] = ['glow', 'warm', 'barrier', 'shade'];
const isLight = (i: number): boolean => LIGHT_KINDS.includes(KIND[i]);
const lumOf = (c: Color): number => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
/**
 * One step brighter or dimmer for the opaque ramps (blue, gold): the nearest colour of the same
 * kind that is 6 to 50 brighter (dimmer), i.e. its neighbour along his own ramp, so a step keeps
 * its hue (white steps down to pale cyan, not to grey).
 */
function stepMap(dir: 1 | -1): number[] {
  return CK_PAL.map((p, i) => {
    if (isLight(i) || p.kind === 'outline' || p.kind === 'goldline') return i;
    const c = PAL[i], lc = lumOf(c);
    let best = i, bd = Infinity;
    CK_PAL.forEach((q, j) => {
      const dl = (lumOf(PAL[j]) - lc) * dir;
      if (q.kind !== p.kind || dl < 6 || dl > 50) return;
      const d = (PAL[j][0] - c[0]) ** 2 + (PAL[j][1] - c[1]) ** 2 + (PAL[j][2] - c[2]) ** 2;
      if (d < bd) {
        bd = d;
        best = j;
      }
    });
    return best;
  });
}
const UP = stepMap(1), DOWN = stepMap(-1);
/**
 * One step cooler for his chakra: the most saturated blue of his ramp that is 6 to 30 dimmer (his
 * ramp also holds greyish blues, which a plain step down can land on: light going out should turn
 * cyan and blue, not grey).
 */
const COOL: number[] = CK_PAL.map((p, i) => {
  if (p.kind !== 'blue') return i;
  const lc = lumOf(PAL[i]);
  let best = i, bs = -Infinity;
  CK_PAL.forEach((q, j) => {
    const dl = lc - lumOf(PAL[j]);
    if (q.kind !== 'blue' || dl < 6 || dl > 30) return;
    const sat = PAL[j][2] - PAL[j][0];
    if (sat > bs) {
      bs = sat;
      best = j;
    }
  });
  return best;
});
/** n cool steps (COOL) for every chakra pixel (n per pixel). */
const cool = (ix: Ix, n: (x: number, y: number) => number): Ix =>
  remap(ix, (v, x, y) => {
    let j = v - 1;
    for (let k = n(x, y); k > 0; k--) j = COOL[j];
    return j + 1;
  });

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
  if (i !== w * h) throw new Error(`vfx-chakra-v3: bad run-length data (${i} of ${w * h} px)`);
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

/**
 * Brighter or dimmer by `k` steps along each pixel's own ladder: opaque chakra and gold toward
 * white or dark, light toward more or less alpha (light dimmed past its faintest step goes).
 * Outlines keep.
 */
function level(ix: Ix, k: number | ((x: number, y: number) => number), only?: CkKind[], sym = false): Ix {
  return remap(ix, (v, x, y) => {
    const i = v - 1, kind = KIND[i];
    const s = typeof k === 'number' ? k : k(x, y);
    if (!s || kind === 'outline' || kind === 'goldline' || (only && !only.includes(kind))) return v;
    // A symmetric step (shimmer) only moves pixels that can go both ways, so the light of the whole
    // sprite stays level (the brightest whites cannot brighten, so they do not dim either).
    if (sym && (isLight(i) ? POS[i] === 0 || POS[i] === LADDER[i].length - 1 : UP[i] === i || DOWN[i] === i)) return v;
    if (!isLight(i)) {
      let j = i;
      for (let n = 0; n < Math.abs(s); n++) j = s > 0 ? UP[j] : DOWN[j];
      return j + 1;
    }
    const r = LADDER[i], p = POS[i] + s;
    if (p < 0) return 0;
    return r[Math.min(r.length - 1, p)] + 1;
  });
}

const OUTLINE_V = KIND.indexOf('outline') + 1, GOLDLINE_V = KIND.indexOf('goldline') + 1;
const isSolid = (v: number): boolean => v > 0 && (KIND[v - 1] === 'blue' || KIND[v - 1] === 'gold' || KIND[v - 1] === 'cream');
const isLine = (v: number): boolean => v === OUTLINE_V || v === GOLDLINE_V;

/**
 * His 1 px rim, put back after a frame was turned or displaced: an outline pixel that no longer
 * touches any chakra or gold goes (no hollow rings left where a dot moved off), and bare chakra or
 * gold meeting the clear gets its rim (deep blue next to chakra, dark gold next to gold only).
 * This is exactly his rule (his bolt, slash and multi key frames are unchanged by it). With
 * add = false it only takes the stray rims away (for art whose rim is not that regular).
 */
function reline(ix: Ix, add = true): Ix {
  const out = blank(ix.w, ix.h);
  const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      const v = ix.d[y * ix.w + x];
      if (v && !isLine(v)) {
        out.d[y * ix.w + x] = v;
        continue;
      }
      let blue = false, any = false;
      for (const [dx, dy] of N4) {
        const n = at(ix, x + dx, y + dy);
        if (isSolid(n)) {
          any = true;
          if (KIND[n - 1] === 'blue') blue = true;
        }
      }
      if (any && (add || v)) out.d[y * ix.w + x] = add ? (blue ? OUTLINE_V : GOLDLINE_V) : v;
    }
  return out;
}

/**
 * A smooth offset field in [-0.5, 0.5), added to a small displacement or brightness step before it
 * is rounded. Without it every pixel starts at exactly 0 on his key frame and nothing moves until
 * the change passes half a pixel, so the loops froze round frame 0 and then lurched. With it a
 * small change moves a matching share of the pixels (in soft patches), and no change stays none.
 */
const dither = (x: number, y: number, seed: number, perX = 0): number =>
  // (on a tile the cell divides its period, so the field repeats with it)
  fract(snoise(x, y, perX ? perX / Math.round(perX / 12) : 12, seed, perX) * 1.5) - 0.5;

/**
 * A travelling wave: every pixel is displaced by amp * w * (sin(phase - 2 pi t) - sin(phase)), with
 * the phase advancing along `along(x, y)` (one wavelength per `len` px, roughened by `rough` x pi of
 * noise on a `cell` px grid), so the ripples travel that way at a steady pace: every step of the
 * loop moves about as much as any other, and t = 0 is his picture exactly. amp is [x, y] in px.
 * (The field must vary slowly across thin strokes, or they tear: keep amp x (2 pi / len + rough x
 * pi / cell) well under 1/2.)
 */
function wave(
  ix: Ix,
  t: number,
  o: { amp: [number, number]; len: number; along: (x: number, y: number) => number; seed: number; weight?: (x: number, y: number) => number; cell?: number; rough?: number; perX?: number },
): Ix {
  if (!fract(t)) return ix;
  const perX = o.perX ?? 0, rough = o.rough ?? 0.6;
  const cell = perX ? perX / Math.round(perX / (o.cell ?? 12)) : (o.cell ?? 12);
  return displace(
    ix,
    (x, y) => {
      const w = o.weight ? o.weight(x, y) : 1;
      if (w <= 0) return [0, 0];
      const s = o.along(x, y);
      const d: [number, number] = [0, 0];
      for (let a = 0; a < 2; a++) {
        if (!o.amp[a]) continue;
        const ph = (TAU * s) / o.len + Math.PI * rough * snoise(x, y, cell, o.seed + 31 * a, perX);
        d[a] = Math.round(o.amp[a] * w * (Math.sin(ph - TAU * t) - Math.sin(ph)) + dither(x, y, o.seed + 17 + a, perX));
      }
      return d;
    },
    perX > 0,
    true,
  );
}

/**
 * Moves every pixel by disp(x, y) (read back from the source spot, nearest pixel). With `patch`, a
 * pixel the move left clear while at least 3 of its 4 neighbours are not keeps its own value, so
 * where neighbours move apart by a pixel no pinhole or crack opens in the art.
 */
function displace(ix: Ix, disp: (x: number, y: number) => [number, number], wrapX = false, patch = false): Ix {
  const out = blank(ix.w, ix.h);
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      const [dx, dy] = disp(x, y);
      if (!dx && !dy) {
        out.d[y * ix.w + x] = ix.d[y * ix.w + x];
        continue;
      }
      let sx = Math.round(x - dx);
      const sy = Math.round(y - dy);
      if (wrapX) sx = ((sx % ix.w) + ix.w) % ix.w;
      out.d[y * ix.w + x] = at(ix, sx, sy);
    }
  if (patch) {
    const fixed = new Uint8Array(out.d);
    for (let y = 0; y < ix.h; y++)
      for (let x = 0; x < ix.w; x++) {
        const i = y * ix.w + x;
        if (out.d[i] || !ix.d[i]) continue;
        const n = Number(!!at(out, x + 1, y)) + Number(!!at(out, x - 1, y)) + Number(!!at(out, x, y + 1)) + Number(!!at(out, x, y - 1));
        if (n >= 3) fixed[i] = ix.d[i];
      }
    out.d = fixed;
  }
  return out;
}

/** Scale2x (EPX): twice the size, diagonal edges rounded instead of stair-stepped. */
function scale2x(ix: Ix): Ix {
  const out = blank(ix.w * 2, ix.h * 2);
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      const P = ix.d[y * ix.w + x], A = at(ix, x, y - 1), B = at(ix, x + 1, y), Cc = at(ix, x - 1, y), D = at(ix, x, y + 1);
      const o = (2 * y) * out.w + 2 * x;
      out.d[o] = Cc === A && Cc !== D && A !== B ? A : P;
      out.d[o + 1] = A === B && A !== Cc && B !== D ? B : P;
      out.d[o + out.w] = D === Cc && D !== B && Cc !== A ? Cc : P;
      out.d[o + out.w + 1] = B === D && B !== A && D !== Cc ? D : P;
    }
  return out;
}

/**
 * The picture moved through a smooth field, like RotSprite: `from(px, py)` gives the point of the
 * source that lands on (px, py). The picture is blown up 8 times with Scale2x, sampled 4 x 4 per
 * pixel through the field, and each pixel takes the commonest value (ties: the value under its
 * centre). His 1 px rim is then put back (reline), so every moved frame keeps his crisp edge (not
 * for art that has no rim of its own, like the sphere's orb inside its ring).
 */
function warp(ix: Ix, from: (px: number, py: number) => [number, number], rim = true): Ix {
  const up = scale2x(scale2x(scale2x(ix)));
  const out = blank(ix.w, ix.h);
  const votes: number[] = new Array(16);
  const sample = (px: number, py: number): number => {
    const [sx, sy] = from(px, py);
    return at(up, Math.floor(sx * 8), Math.floor(sy * 8));
  };
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      let k = 0;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) votes[k++] = sample(x + (i + 0.5) / 4, y + (j + 0.5) / 4);
      const mid = sample(x + 0.5, y + 0.5);
      let best = mid, bestN = 0;
      for (const v of votes) if (v === mid) bestN++;
      for (const v of votes) {
        let n = 0;
        for (const u of votes) if (u === v) n++;
        if (n > bestN) {
          best = v;
          bestN = n;
        }
      }
      out.d[y * ix.w + x] = best;
    }
  return rim ? reline(out) : out;
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
const union = (...ix: Ix[]): Ix => ix.reduce((acc, i) => stamp(acc, i), blank(ix[0].w, ix[0].h));

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

/** Smooth value noise in [-1, 1], optionally periodic in x (for the stream tile). */
function snoise(x: number, y: number, cell: number, seed: number, perX = 0): number {
  if (!perX) return noise(x, y, cell, seed) * 2 - 1;
  const n = Math.round(perX / cell), fx = x / cell, fy = y / cell;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const w = (i: number) => ((i % n) + n) % n;
  const a = hash(w(x0), y0, seed), b = hash(w(x0 + 1), y0, seed), c = hash(w(x0), y0 + 1, seed), d = hash(w(x0 + 1), y0 + 1, seed);
  return (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * 2 - 1;
}

// --- motion over time --------------------------------------------------------------------------
// t is the time in cycles of a loop (or a running clock for one-shots); every effect below is
// exactly nothing at t = 0, so frame 0 / the peak stays his picture.

/**
 * Churn: pixels drift along a smooth random field that circles once per cycle (about a pixel or
 * two), so shapes ripple a little from frame to frame, never jumping. `flow` adds a drift along a
 * direction that also comes back (flames lick upward). weight(x, y) scales it per pixel.
 */
function churn(ix: Ix, t: number, amp: number, cell: number, seed: number, weight: (x: number, y: number) => number = () => 1, perX = 0, flow: [number, number] = [0, 0]): Ix {
  const s = Math.sin(TAU * t), c = (1 - Math.cos(TAU * t)) * 0.6;
  if (!s && !c) return ix;
  return displace(
    ix,
    (x, y) => {
      const w = weight(x, y) * amp;
      if (w <= 0) return [0, 0];
      const nx = snoise(x, y, cell, seed, perX) * s + snoise(x, y, cell, seed + 3, perX) * c;
      const ny = snoise(x, y, cell, seed + 7, perX) * s + snoise(x, y, cell, seed + 11, perX) * c;
      return [(nx + flow[0] * c) * w, (ny + flow[1] * c) * w];
    },
    perX > 0,
  );
}

/**
 * Shimmer: soft waves of brightness (one step up or down its ladder) drift across the art, each
 * region at its own time, so the light flickers here and there but the whole sprite never jumps.
 */
function shimmer(ix: Ix, t: number, seed: number, cell = 14, only: CkKind[] = ['blue', 'glow'], perX = 0, amp = 0.6): Ix {
  return level(
    ix,
    (x, y) => {
      // (phases spread evenly round the cycle, so the ups and downs cancel over the sprite)
      const ph = fract((snoise(x, y, cell, seed, perX) + 1) * 1.5);
      return Math.round(amp * (Math.sin(TAU * (t + ph)) - Math.sin(TAU * ph)) + dither(x, y, seed + 5, perX));
    },
    only,
    true,
  );
}

/** A glint running once round a ring about (cx, cy) per cycle, fading in and out (none at t = 0). */
function glint(ix: Ix, t: number, cx: number, cy: number, width = 0.7, start = -Math.PI / 2): Ix {
  const env = Math.sin(Math.PI * fract(t)) ** 2;
  if (env < 0.05) return ix;
  const a0 = start + TAU * t;
  return level(
    ix,
    (x, y) => {
      let d = Math.atan2(y + 0.5 - cy, x + 0.5 - cx) - a0;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const k = env * Math.max(0, 1 - Math.abs(d) / width);
      return k > 0.66 ? 2 : k > 0.25 ? 1 : 0;
    },
    ['gold', 'blue'],
  );
}

/** Each 8-connected bit of `sp` (its id: its first pixel). */
function bits(sp: Ix): { id: number; px: number[]; cx: number; cy: number }[] {
  const seen = new Uint8Array(sp.w * sp.h);
  const out: { id: number; px: number[]; cx: number; cy: number }[] = [];
  for (let start = 0; start < sp.d.length; start++) {
    if (!sp.d[start] || seen[start]) continue;
    const comp: number[] = [start];
    seen[start] = 1;
    for (let q = 0; q < comp.length; q++) {
      const x = comp[q] % sp.w, y = Math.floor(comp[q] / sp.w);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy, n = Y * sp.w + X;
          if (X >= 0 && Y >= 0 && X < sp.w && Y < sp.h && sp.d[n] && !seen[n]) {
            seen[n] = 1;
            comp.push(n);
          }
        }
    }
    let sx = 0, sy = 0;
    for (const n of comp) {
      sx += n % sp.w;
      sy += Math.floor(n / sp.w);
    }
    out.push({ id: start, px: comp, cx: sx / comp.length, cy: sy / comp.length });
  }
  return out;
}

/**
 * Small bits (flecks, sparkles, dots) moved as whole pieces by move(bit), or dropped (null). A bit
 * that would land on the frame's border is dropped too, so nothing is ever cut by the frame.
 */
function moveBits(sp: Ix, move: (b: { id: number; cx: number; cy: number }, i: number) => [number, number] | null, wrapX = false): Ix {
  const out = blank(sp.w, sp.h);
  bits(sp).forEach((b, i) => {
    const m = move(b, i);
    if (!m) return;
    const dx = Math.round(m[0]), dy = Math.round(m[1]);
    if (!wrapX && (dx || dy))
      for (const n of b.px) {
        const X = (n % sp.w) + dx, Y = Math.floor(n / sp.w) + dy;
        if (X <= 0 || Y <= 0 || X >= sp.w - 1 || Y >= sp.h - 1) return;
      }
    for (const n of b.px) {
      let X = (n % sp.w) + dx;
      const Y = Math.floor(n / sp.w) + dy;
      if (wrapX) X = ((X % sp.w) + sp.w) % sp.w;
      if (X >= 0 && Y >= 0 && X < sp.w && Y < sp.h) out.d[Y * sp.w + X] = sp.d[n];
    }
  });
  return out;
}
/**
 * When bit number i of a sprite twinkles out (its share of the cycle starts): spread evenly round
 * the cycle (a golden-ratio sequence from a per-sprite start), so only a bit or two are out at a
 * time and the light stays level; never at t = 0, so frame 0 has all of them.
 */
const twinkleAt = (i: number, share: number, seed: number): number => 0.08 + fract(hash(seed, 0, 991) + i * 0.618034) * (0.86 - share);

/**
 * Each bit twinkles out for a `share` of the cycle at its own time (twinkleAt) and may drift by
 * drift(bit, t).
 */
function twinkle(sp: Ix, t: number, share: number, seed: number, drift?: (b: { cx: number; cy: number }, u: number) => [number, number]): Ix {
  const ft = fract(t);
  return moveBits(sp, (b, i) => {
    const h = twinkleAt(i, share, seed);
    if (share > 0 && ft >= h && ft < h + share) return null;
    return drift ? drift(b, ft) : [0, 0];
  });
}

/** A clustered share `p` (0..1) of the pixels cleared: chakra breaking up as it fades. */
const dissolve = (ix: Ix, p: number, seed: number, cell = 3): Ix =>
  p <= 0 ? ix : keep(ix, (x, y) => noise(x, y, cell, seed) * 0.8 + hash(x, y, seed + 1) * 0.2 >= p);

/** The picture scaled by s (sy vertically) about (cx, cy), nearest pixel. */
const scaleAbout = (ix: Ix, cx: number, cy: number, s: number, sy = s): Ix =>
  displace(ix, (x, y) => [(x - cx) * (1 - 1 / s), (y - cy) * (1 - 1 / sy)]);

// --- rendering -----------------------------------------------------------------------------------

type Fade = Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
/** An alpha factor for a layer: one for all of it, or per pixel (feathered wipes, soft cuts). */
type Alpha = number | ((x: number, y: number) => number);
/** A layer: an indexed image, an alpha factor and the fade toward the frame sides it gets. */
type Layer = [Ix, Alpha?, Fade?];

/** 0 on a faded side of the frame, rising to 1 where the fade ends. */
function fadeT(f: Fade | undefined, x: number, y: number, w: number, h: number): number {
  if (!f) return 1;
  let t = 1;
  if (f.top) t = Math.min(t, y / f.top);
  if (f.right) t = Math.min(t, (w - 1 - x) / f.right);
  if (f.bottom) t = Math.min(t, (h - 1 - y) / f.bottom);
  if (f.left) t = Math.min(t, x / f.left);
  return clamp(t, 0, 1);
}

/**
 * Renders indexed layers into a canvas, later layers on top, each at its alpha factor. Toward a
 * faded side (where his art ran off his panel) the alpha falls off in six steps, so a pillar or a
 * haze dies away instead of ending in a straight cut.
 */
function render(w: number, h: number, layers: Layer[], fade?: Fade, base?: Canvas): Canvas {
  const c = base ?? new Canvas(w, h);
  for (const [ix, k = 1, own] of layers) {
    if (typeof k === 'number' && k <= 0) continue;
    const f = own ?? fade;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = ix.d[y * ix.w + x];
        if (!v) continue;
        const t = fadeT(f, x, y, w, h);
        const a = (typeof k === 'number' ? k : k(x, y)) * (t < 1 ? Math.floor(t * 6) / 6 : 1);
        if (a <= 0) continue;
        const p = PAL[v - 1];
        const al = Math.round(p[3] * Math.min(1, a));
        if (al <= 0) continue;
        c.plot(x, y, [p[0], p[1], p[2], al]);
      }
  }
  return c;
}

// --- the key frames ---------------------------------------------------------------------------

interface Key {
  name: string;
  w: number;
  h: number;
  ax: number;
  ay: number;
  /** Every piece as a full-frame layer: main, loose, ring, orb, core, seal, pillar, frame... */
  p: Record<string, Ix>;
  fade: Fade;
}
type Pad = { l: number; t: number; r: number; b: number };
const PAD = 3;
const pads = (n: number): Pad => ({ l: n, t: n, r: n, b: n });

/** His key frame for a sprite, with `pad` px of room added round it. */
function key(name: string, pad: Pad = pads(PAD)): Key {
  const s = CK_REF[name];
  if (!s) throw new Error(`vfx-chakra-v3: no reference data for "${name}"`);
  const w = s.w + pad.l + pad.r, h = s.h + pad.t + pad.b;
  const p: Record<string, Ix> = {};
  for (const [pn, pc] of Object.entries(s.pieces)) p[pn] = stamp(blank(w, h), decode(pc.rle, pc.w, pc.h), pc.x + pad.l, pc.y + pad.t);
  const fade: Fade = {};
  // Fades are measured from his panel's edge, so pad them by the room added.
  for (const [side, n] of Object.entries(s.fade) as ['top' | 'right' | 'bottom' | 'left', number][])
    fade[side] = n + ({ top: pad.t, right: pad.r, bottom: pad.b, left: pad.l } as const)[side];
  return { name, w, h, ax: s.anchor[0] + pad.l, ay: s.anchor[1] + pad.t, p, fade };
}
const none = (k: Key): Ix => blank(k.w, k.h);
const piece = (k: Key, n: string): Ix => k.p[n] ?? none(k);
const all = (k: Key): Ix => union(...Object.values(k.p));

/** A key re-framed square round its anchor, big enough for the art to swirl about it. */
function spinKey(name: string): Key {
  const s = CK_REF[name];
  const k0 = key(name, pads(0));
  let R = 0;
  for (const ix of Object.values(k0.p))
    for (let y = 0; y < ix.h; y++)
      for (let x = 0; x < ix.w; x++) if (ix.d[y * ix.w + x]) R = Math.max(R, Math.hypot(x + 0.5 - k0.ax, y + 0.5 - k0.ay));
  const half = Math.ceil(R) + PAD;
  return key(name, { l: half - s.anchor[0], t: half - s.anchor[1], r: half - (s.w - s.anchor[0]), b: half - (s.h - s.anchor[1]) });
}

function sprite(k: { name: string; w: number; h: number; ax: number; ay: number }, label: string, anims: Record<string, { frames: Canvas[]; fps: number; loop?: boolean }>): WorldSprite {
  return {
    name: k.name,
    label,
    meters: [Math.round((k.w / PX_PER_M) * 100) / 100, Math.round((k.h / PX_PER_M) * 100) / 100],
    anchor: [k.ax, k.ay],
    tags: ['vfx'],
    anims,
  };
}

// --- timing (the owner: "too fast, like a flashing star") ------------------------------------------

const FLY_N = 8, FLY_FPS = 12;
const HIT_N = 12, HIT_FPS = 12;
const BLAST_N = 16, BLAST_FPS = 12;
const RISE_N = 12, RISE_FPS = 12, IDLE_N = 8, IDLE_FPS = 10;
const AURA_N = 12, AURA_FPS = 10;
const cyc = (i: number, n: number): number => i / n;
const fly = (frames: Canvas[]) => ({ fly: { frames, fps: FLY_FPS, loop: true } });

// --- projectiles -------------------------------------------------------------------------------------

/**
 * Small bits orbiting (cx, cy) by `orbit` radians per loop, as whole pieces (not resampled). Each
 * one twinkles out for `share` of the loop at its own time and is set back by the same angle while
 * it is out, so the loop closes on his picture with no bit jumping in view.
 */
function orbitBits(sp: Ix, t: number, cx: number, cy: number, orbit: number, share: number, seed: number): Ix {
  const ft = fract(t);
  return moveBits(sp, (b, i) => {
    const h = twinkleAt(i, share, seed);
    if (ft >= h && ft < h + share) return null;
    const wrap = h + share / 2;
    const a = orbit * (fract(t - wrap) - fract(-wrap));
    const dx = b.cx + 0.5 - cx, dy = b.cy + 0.5 - cy;
    return [dx * Math.cos(a) - dy * Math.sin(a) - dx, dx * Math.sin(a) + dy * Math.cos(a) - dy];
  });
}

/**
 * The swirl of the vortex and of the sphere's orb: each point is moved round the centre by
 * amp * (sin(2 pi r / len + 2 pi t) - sin(2 pi r / len)) px along its circle, a wave that runs IN
 * toward the core at a steady pace (on a spiral, arms running inward is what a turn looks like),
 * none inside r0 and full past r1. t = 0 is his picture exactly and t = 1 is his picture again, so
 * the loop needs no seam: no frame is a mix of two pictures. (A rigid turn never brings his
 * irregular arms back, so it needed a two-frame cross-fade that read as a double exposure.) Keep
 * amp x 2 pi / len near 1/2, or thin strokes tear.
 */
function swirlFrom(cx: number, cy: number, t: number, amp: number, len: number, r0: number, r1: number): (px: number, py: number) => [number, number] {
  return (px, py) => {
    const dx = px - cx, dy = py - cy, r = Math.hypot(dx, dy);
    if (r < 1e-6) return [px, py];
    const ph = (TAU * r) / len;
    // Where this point came from: turned back by the angle the wave moved it.
    const a = (-amp * smooth(r0, r1, r) * (Math.sin(ph + TAU * t) - Math.sin(ph))) / r;
    const c = Math.cos(a), s = Math.sin(a);
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  };
}

/**
 * The vortex swirls (swirlFrom: 2.5 px, a 30 px wave running in to the core; the outer arms move
 * about 2 px a frame), its light shimmering; his cream flecks circle round it (30 degrees per
 * loop, 2-3 px a frame) and twinkle.
 */
function bolt(): WorldSprite {
  const k = spinKey('bolt');
  const [F, M] = withHalo(piece(k, 'loose'), piece(k, 'main'));
  const fr = range(FLY_N).map((i) => {
    const t = cyc(i, FLY_N);
    const arms = t ? warp(M, swirlFrom(k.ax, k.ay, t, 2.5, 30, 3, 12)) : M;
    const c = render(k.w, k.h, [[shimmer(arms, t, 120, 10)]]);
    return render(k.w, k.h, [[orbitBits(F, t, k.ax, k.ay, TAU / 12, 0.16, 130)]], undefined, c);
  });
  return sprite(k, 'Chakra bolt: swirling vortex orb', fly(fr));
}

/**
 * The spiral orb swirls inside its gold ring (swirlFrom: 2 px, a 26 px wave), over a still disc of
 * his dark rim colour so nothing shows through between the orb and the ring. The ring holds still
 * with a glint running round it; the arcs round it and the speed lines ripple and shimmer, the
 * motes twinkle.
 */
function sphere(): WorldSprite {
  const k = key('sphere');
  const O = piece(k, 'orb'), R = piece(k, 'ring');
  const [S, M] = withHalo(piece(k, 'loose'), piece(k, 'main'));
  // His orb's outer rim colour (#07152d, his darkest blue), under the orb wherever his key frame
  // is opaque (so his key frame is unchanged by it).
  const blues = PAL.map((p, i) => (KIND[i] === 'blue' ? lumOf(p) : Infinity));
  const rim = blues.indexOf(Math.min(...blues)) + 1;
  const under = remap(union(O, R, M), (v, x, y) => (Math.hypot(x + 0.5 - k.ax, y + 0.5 - k.ay) <= 19.5 && (isSolid(v) || isLine(v)) ? rim : 0));
  const out = (x: number, y: number) => smooth(20, 26, Math.hypot(x - k.ax, y - k.ay));
  const orbs = range(FLY_N).map((i) => {
    const t = cyc(i, FLY_N);
    return render(k.w, k.h, [[shimmer(t ? warp(O, swirlFrom(k.ax, k.ay, t, 2, 26, 2, 8), false) : O, t, 310, 8)]]);
  });
  const fr = orbs.map((orb, i) => {
    const t = cyc(i, FLY_N);
    const m = shimmer(reline(wave(M, t, { amp: [0.8, 0.8], len: 18, along: (x, y) => Math.hypot(x - k.ax, y - k.ay), seed: 300, weight: out })), t, 320, 10);
    const c = render(k.w, k.h, [[under], [m]]);
    // The turned orb over the disc, then the ring and the motes over both.
    for (let p = 0; p < c.w * c.h; p++) if (orb.px[p * 4 + 3]) c.plot(p % c.w, Math.floor(p / c.w), [orb.px[p * 4], orb.px[p * 4 + 1], orb.px[p * 4 + 2], orb.px[p * 4 + 3]]);
    return render(k.w, k.h, [[glint(R, t, k.ax, k.ay)], [twinkle(S, t, 0.3, 330)]], undefined, c);
  });
  return sprite(k, 'Chakra sphere: spiral sphere in a gold ring', fly(fr));
}

/**
 * The small separate dots of a piece (up to n px of chakra with their rim, like the beads between
 * the multi's orbs): [dots, the rest]. Dots move as whole pieces and are never pulled apart by the
 * ripples (a torn dot leaves a hollow rim behind).
 */
function splitDots(M: Ix, n: number): [Ix, Ix] {
  const op = keep(M, (_, __, v) => isSolid(v) || isLine(v));
  const dots = blank(M.w, M.h);
  for (const b of bits(op)) if (b.px.length <= n) for (const p of b.px) dots.d[p] = M.d[p];
  return [dots, keep(M, (x, y) => !dots.d[y * M.w + x])];
}

/**
 * Small bits with the light round them: the light pixels of `m` within r px of a bit of `sp` (and
 * not as near to other art of m) go with the bits, so a dot that twinkles out takes its glow with
 * it instead of leaving a faint ring behind. Returns [bits with their halos, m without them].
 */
function withHalo(sp: Ix, m: Ix, r = 2): [Ix, Ix] {
  const bitsOut = { ...sp, d: new Uint8Array(sp.d) }, rest = { ...m, d: new Uint8Array(m.d) };
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      const v = m.d[y * m.w + x];
      if (!v || !isLight(v - 1) || sp.d[y * m.w + x]) continue;
      let near = false, other = false;
      for (let dy = -r; dy <= r && !other; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (at(sp, x + dx, y + dy)) near = true;
          const o = at(m, x + dx, y + dy);
          if (isSolid(o) || isLine(o)) other = true;
        }
      if (near && !other) {
        bitsOut.d[y * m.w + x] = v;
        rest.d[y * m.w + x] = 0;
      }
    }
  return [bitsOut, rest];
}

/**
 * A projectile that keeps its shape: ripples travel back along it (a steady travelling wave, so
 * every step of the loop moves alike), his rim is kept on whatever moved, the light shimmers, and
 * the small bits and dots twinkle and drift back whole.
 */
function flyLoop(k: Key, seed: number, opts: { amp?: [number, number]; len?: number; weight?: (x: number, y: number) => number; drift?: number } = {}): Canvas[] {
  const [D, M0] = splitDots(union(...Object.entries(k.p).filter(([n]) => n !== 'loose').map(([, ix]) => ix)), 16);
  const [L, M] = withHalo(union(piece(k, 'loose'), D), M0);
  const dr = opts.drift ?? 0;
  return range(FLY_N).map((i) => {
    const t = cyc(i, FLY_N);
    const rip = wave(M, t, { amp: opts.amp ?? [0.8, 0.8], len: opts.len ?? 18, along: (x) => -x, seed, weight: opts.weight });
    const m = shimmer(reline(rip), t, seed + 50);
    const sp = twinkle(L, t, 0.16, seed + 5, (b, u) => [-dr * Math.sin(Math.PI * u) ** 2 * (0.5 + hash(Math.round(b.cx), Math.round(b.cy), seed) * 0.5), 0]);
    return render(k.w, k.h, [[m], [sp]], k.fade);
  });
}

function slash(): WorldSprite {
  const k = key('slash');
  return sprite(k, 'Chakra slash: glowing crescent', fly(flyLoop(k, 400, { amp: [0.6, 0.6], len: 20, drift: 2 })));
}

function multi(): WorldSprite {
  const k = key('multi');
  // The three seal orbs hold their shape (only their light shimmers); their trails ripple.
  const trails = (x: number) => smooth(k.ax + 2, k.ax - 10, x);
  return sprite(k, 'Chakra multi: three seal orbs', fly(flyLoop(k, 500, { amp: [0.8, 0.8], weight: trails, drift: 2 })));
}

/** Chebyshev distance of every pixel of `ix` to the nearest clear pixel (0 where clear). */
function depth(ix: Ix): Float32Array {
  const d = new Float32Array(ix.w * ix.h).fill(1e9);
  const q: number[] = [];
  for (let i = 0; i < d.length; i++)
    if (!ix.d[i]) {
      d[i] = 0;
      q.push(i);
    }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % ix.w, y = Math.floor(i / ix.w);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy, n = Y * ix.w + X;
        if (X >= 0 && Y >= 0 && X < ix.w && Y < ix.h && d[n] > d[i] + 1) {
          d[n] = d[i] + 1;
          q.push(n);
        }
      }
  }
  return d;
}

function breath(): WorldSprite {
  const k = key('breath');
  // The anchor is the cone's origin (the caster's hands). Ripples run outward along its ragged
  // edges and wisps (a steady travelling wave); its body (the open hand, the seal marks) holds
  // still, its light shimmering.
  const [BL, M] = withHalo(piece(k, 'loose'), piece(k, 'main'));
  const dep = depth(M);
  const w = (x: number, y: number) => smooth(7, 2, dep[y * k.w + x]) * smooth(10, 40, Math.hypot(x - k.ax, y - k.ay));
  const fr = range(FLY_N).map((i) => {
    const t = cyc(i, FLY_N);
    const rip = wave(M, t, { amp: [0.9, 0.8], len: 26, along: (x, y) => Math.hypot(x - k.ax, y - k.ay), seed: 200, weight: w, cell: 16, rough: 0.5 });
    const m = shimmer(reline(rip), t, 250, 16);
    const sp = twinkle(BL, t, 0.25, 205, (b, u) => [3 * Math.sin(Math.PI * u) ** 2 * smooth(10, 60, b.cx - k.ax), 0]);
    return render(k.w, k.h, [[m], [sp]]);
  });
  return sprite(k, 'Chakra breath: open-hand cone of chakra (origin at the anchor)', fly(fr));
}

// --- the stream: his 64 px period of the beam, flowing, and its head -------------------------------

const STREAM_SHIFT = 64 / FLY_N;
/** The head's first columns are the flowing tile itself, so the joint is seamless in every frame. */
const HEAD_JOINT = 10;
/** ...and up to the big ring the beam's band (rows within BEAM_BAND of the centre line) too. */
const HEAD_BEAM = 26, BEAM_BAND = 8;

function streamTile(k: Key, i: number): Ix {
  const m = all(k);
  if (!i) return m;
  const t = cyc(i, FLY_N);
  // Everything here is periodic in x over 64 px, so every frame still tiles.
  const shifted = displace(m, () => [STREAM_SHIFT * i, 0], true);
  return shimmer(shifted, t, 650, 16, ['blue', 'glow'], 64);
}

function stream(): WorldSprite[] {
  const t = key('stream', pads(0));
  const tiles = range(FLY_N).map((i) => streamTile(t, i));
  const h = key('stream_head', { l: 0, t: 0, r: PAD, b: PAD });
  if (h.ay !== t.ay) throw new Error('vfx-chakra-v3: the stream head and tile centre lines differ');
  const [HD, HM0] = splitDots(piece(h, 'main'), 16);
  const [HS, HM] = withHalo(union(piece(h, 'loose'), HD), HM0);
  const ringC: [number, number] = [h.ax + 6, h.ay];
  const burst: [number, number] = [ringC[0] + 8, ringC[1]];
  // The beam: the head's first columns, and up to the big ring the band round the centre line, are
  // the flowing tile itself. Outside the band the tile hands over to his head art across the last
  // 4 columns before HEAD_JOINT, so the tile's marks fade out there instead of popping off.
  const inBand = (x: number, y: number) => x < HEAD_BEAM && Math.abs(y - h.ay) <= BEAM_BAND;
  const beam = (x: number, y: number) => x < HEAD_JOINT || inBand(x, y);
  const solidTile = (x: number, y: number) => x < HEAD_JOINT - 4 || inBand(x, y);
  const tileA = (x: number, y: number) => (solidTile(x, y) ? 1 : (HEAD_JOINT - x) / 5);
  const heads = range(FLY_N).map((i) => {
    const tt = cyc(i, FLY_N);
    // Ripples run out along the burst's spikes (not the joint, his big ring or the hot core).
    const w = (x: number, y: number) =>
      smooth(HEAD_JOINT + 4, HEAD_JOINT + 14, x) * smooth(12, 20, Math.hypot(x - burst[0], y - burst[1])) * smooth(13, 18, Math.hypot(x - ringC[0], y - ringC[1]));
    const rip = wave(HM, tt, { amp: [0.8, 0.8], len: 16, along: (x, y) => Math.hypot(x - burst[0], y - burst[1]), seed: 700, weight: w });
    let m = shimmer(reline(rip), tt, 750);
    m = glint(m, tt, ringC[0], ringC[1], 0.8);
    m = keep(m, (x, y) => !solidTile(x, y));
    return render(h.w, h.h, [[m], [keep(tiles[i], beam), tileA], [twinkle(keep(HS, (x, y) => !beam(x, y)), tt, 0.3, 705)]]);
  });
  return [
    sprite(t, 'Chakra stream: beam threaded with seal rings (tileable 64 px)', fly(tiles.map((ix) => render(t.w, t.h, [[ix]])))),
    sprite(h, 'Chakra stream head: starburst orb', fly(heads)),
  ];
}

// --- hit: his starburst builds up, holds, and breaks up slowly ---------------------------------------

function hit(): WorldSprite {
  const k = key('hit', pads(11));
  const M = piece(k, 'main'), C = piece(k, 'core'), S = piece(k, 'loose');
  const d = (x: number, y: number) => Math.hypot(x - k.ax, y - k.ay);
  const out = (ix: Ix, push: number, from = 14) =>
    displace(ix, (x, y) => {
      const r = d(x, y), s = smooth(from, from + 18, r) * push;
      return r ? [((x - k.ax) / r) * s, ((y - k.ay) / r) * s] : [0, 0];
    });
  const fr: Canvas[] = [];
  // 0-2: the burst grows out of its core, a step hot; its size grows by about square roots so its
  //      light grows evenly to the peak.
  for (const [s, hot] of [[0.5, 0], [0.7, 1], [0.87, 1]] as const) {
    const sc = (ix: Ix) => scaleAbout(ix, k.ax, k.ay, s);
    fr.push(render(k.w, k.h, [[level(sc(M), hot, ['blue'])], [level(sc(C), hot)], [sc(S)]]));
  }
  // 3: his picture. 4-5: it holds, the spikes churning a little (a rim the churn left without its
  //    fill goes).
  fr.push(render(k.w, k.h, [[M], [C], [S]]));
  for (const i of [4, 5]) {
    const t = (i - 3) / 16;
    fr.push(render(k.w, k.h, [[shimmer(reline(churn(out(M, i - 3), t, 1.2, 7, 810, (x, y) => smooth(12, 20, d(x, y))), false), t, 820)], [glint(C, (i - 3) / 6, k.ax, k.ay)], [out(S, (i - 3) * 1.2)]]));
  }
  // 6-11: it breaks up slowly: the spikes fly on, thin and fade; the seal core shrinks and goes
  //       out like light (by alpha, a step paler, never darker: a seal stepped down its ramp reads
  //       as burnt brown); the motes drift off and go out. A rim left without its fill goes too.
  const fadeU = [0.1, 0.24, 0.4, 0.57, 0.76, 0.93];
  // ...and its rim lifts to a mid gold (blue) as it goes, so no dark ring is left round it.
  const nearest = (kind: CkKind, l: number) => {
    let best = 0, bd = Infinity;
    PAL.forEach((p, i) => {
      if (KIND[i] === kind && Math.abs(lumOf(p) - l) < bd) [best, bd] = [i + 1, Math.abs(lumOf(p) - l)];
    });
    return best;
  };
  const softRim = [nearest('gold', 110), nearest('blue', 95)];
  for (let j = 0; j < 6; j++) {
    const t = (6 + j - 3) / 16, u = fadeU[j];
    const m = reline(dissolve(churn(out(M, 2.5 + j * 1.3), t, 1.3, 7, 810), 0.1 + u * 0.55, 840 + j), false);
    const c = remap(level(scaleAbout(C, k.ax, k.ay, 1 - u * 0.2), 1, ['gold', 'blue']), (v) => (v === GOLDLINE_V ? softRim[0] : v === OUTLINE_V ? softRim[1] : v));
    fr.push(render(k.w, k.h, [[m, 1 - u * 0.8], [c, 1 - u * 0.9], [twinkle(out(S, 4 + j * 2, 6), t * 2, 0.2 + u * 0.3, 830), 1 - u * 0.8]]));
  }
  return sprite(k, 'Chakra hit: starburst round a gold seal', { hit: { frames: fr, fps: HIT_FPS, loop: false } });
}

// --- blast: a pillar of chakra over a seal circle -----------------------------------------------------

/** The least-squares axis-aligned ellipse through some points: [cx, cy, rx, ry]. */
function fitEllipse(pts: [number, number][]): [number, number, number, number] {
  // A x^2 + C y^2 + D x + E y = 1, by the normal equations.
  const N = range(4).map(() => [0, 0, 0, 0, 0]);
  for (const [x, y] of pts) {
    const r = [x * x, y * y, x, y];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) N[i][j] += r[i] * r[j];
      N[i][4] += r[i];
    }
  }
  for (let i = 0; i < 4; i++) {
    let p = i;
    for (let j = i + 1; j < 4; j++) if (Math.abs(N[j][i]) > Math.abs(N[p][i])) p = j;
    [N[i], N[p]] = [N[p], N[i]];
    for (let j = 0; j < 4; j++) {
      if (j === i) continue;
      const f = N[j][i] / N[i][i];
      for (let c = i; c < 5; c++) N[j][c] -= f * N[i][c];
    }
  }
  const [A, Cc, D, E] = N.map((row, i) => row[4] / row[i]);
  const cx = -D / (2 * A), cy = -E / (2 * Cc), F = 1 + A * cx * cx + Cc * cy * cy;
  return [cx, cy, Math.sqrt(F / A), Math.sqrt(F / Cc)];
}

/** The bright gold pixels of `ix` (pixel centres) where pred holds: what a ring is fitted to. */
function brightGold(ix: Ix, minLum: number, pred: (x: number, y: number) => boolean): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      const v = ix.d[y * ix.w + x];
      if (v && KIND[v - 1] === 'gold' && lumOf(PAL[v - 1]) > minLum && pred(x, y)) out.push([x + 0.5, y + 0.5]);
    }
  return out;
}

/** His blue light (the haze), as against the light of his gold (gold-hued and pale glow, warm). */
const blueLight = (v: number): boolean => v > 0 && KIND[v - 1] === 'glow' && CK_PAL[v - 1].hue <= 6;

/**
 * The seal circle, sorted for the frames where it is not all lit (the lead-in and the settle), so
 * it never breaks into pieces. His picture (frame 4) is unchanged by any of it.
 *   - Light goes with what it lights: the blue haze round his gold rings (which the extractor gave
 *     the circle) fades with the haze, and the top of his outer ring (gold, its dark edge and its
 *     pale halo, which his circle's outline cut off into the haze) goes with the circle.
 *   - His third, inner gold ring is rebuilt whole along its own ellipse (fitted to his visible
 *     arcs), from his ring's cross-section, under the hexagram and the pillar: drawn where the
 *     pillar of a frame does not hide it, and beside and under the hexagram lines as they fade.
 *   - The far arcs behind the pillar are his near arcs turned half a turn about the circle's own
 *     centre (fitted to his two outer lines; it lies 2.5 px above the anchor, the ground point),
 *     so they meet his visible ends; the third ring's far half comes from the rebuilt ring.
 */
function sealCircle(k: Key) {
  const MAIN = piece(k, 'main'), SEAL0 = piece(k, 'seal'), P = piece(k, 'pillar'), LN = piece(k, 'lines');
  const at0 = (ix: Ix, x: number, y: number) => ix.d[y * ix.w + x];
  // How far out on his circle (84 x 53 px about the anchor) a pixel is.
  const r0 = (x: number, y: number) => Math.hypot((x + 0.5 - k.ax) / 84, (y + 0.5 - k.ay) / 53);
  const ringTop = keep(MAIN, (x, y, v) => !blueLight(v) && r0(x, y) > 0.8 && r0(x, y) < 1.2);
  const HZ = keep(MAIN, (x, y) => !at0(ringTop, x, y)), HALO = keep(SEAL0, (_, __, v) => blueLight(v));
  const SEAL = union(keep(SEAL0, (_, __, v) => !blueLight(v)), ringTop);
  // The haze his picture hides under the circle (and under that top: filled from the haze round
  // it), drawn wherever the circle is not lit.
  const U0 = piece(k, 'under');
  const U = union(U0, keep(fillUnder(union(HZ, U0), ringTop), (x, y) => !at0(HZ, x, y)));
  const OUTER = keep(SEAL, (x, y) => r0(x, y) >= 0.58), INNER = keep(SEAL, (x, y) => r0(x, y) < 0.58);
  // The circle's centre: the mean of the centres of his two outer lines.
  const e1 = fitEllipse(brightGold(OUTER, 170, (x, y) => r0(x, y) >= 0.83));
  const e2 = fitEllipse(brightGold(OUTER, 170, (x, y) => r0(x, y) < 0.83));
  const cx = (e1[0] + e2[0]) / 2, cy = (e1[1] + e2[1]) / 2;
  const hidden = (x: number, y: number) => at0(P, x, y) !== 0;
  const mirror = (ix: Ix, into: (x: number, y: number) => boolean) => {
    const out = blank(k.w, k.h);
    for (let y = 0; y < k.h; y++)
      for (let x = 0; x < k.w; x++) if (into(x, y)) out.d[y * k.w + x] = at(ix, Math.floor(2 * cx - x - 0.5), Math.floor(2 * cy - y - 0.5));
    return out;
  };
  const SB = mirror(OUTER, (x, y) => hidden(x, y) && !at0(SEAL, x, y));
  const LB = mirror(keep(LN, (_, __, v) => !isLine(v)), (x, y) => hidden(x, y) && !at0(LN, x, y));
  // The third ring: its ellipse, and his cross-section (the commonest of his values in each half
  // pixel across it).
  const [c3x, c3y, r3x, r3y] = fitEllipse(brightGold(INNER, 150, () => true));
  const across = (x: number, y: number) => {
    const X = x + 0.5 - c3x, Y = y + 0.5 - c3y, th = Math.atan2(Y / r3y, X / r3x);
    return (Math.hypot(X / r3x, Y / r3y) - 1) * Math.hypot(r3x * Math.cos(th), r3y * Math.sin(th));
  };
  const BIN = 0.5, DMAX = 2.25;
  const binOf = (d: number) => Math.floor((d + DMAX) / BIN);
  const votes: Map<number, number>[] = range(binOf(DMAX) + 1).map(() => new Map());
  for (let y = 0; y < k.h; y++)
    for (let x = 0; x < k.w; x++) {
      const v = at0(INNER, x, y), d = across(x, y);
      if (v && Math.abs(d) <= DMAX) votes[binOf(d)].set(v, (votes[binOf(d)].get(v) ?? 0) + 1);
    }
  const profile = votes.map((m) => [...m].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0);
  // Where the rebuilt ring may show: behind the pillar, and beside and under the hexagram lines
  // (his ring runs on under them; at his picture's full strength they hide it). Elsewhere his own
  // arcs are kept as they are; inside his ring's gold line his pale glow gives way to the gold.
  const nearLines = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (at(LN, x + dx, y + dy)) return true;
    return false;
  };
  const RING = blank(k.w, k.h);
  for (let y = 0; y < k.h; y++)
    for (let x = 0; x < k.w; x++) {
      const d = across(x, y);
      if (Math.abs(d) > DMAX || at0(OUTER, x, y)) continue;
      const v = profile[binOf(d)], his = at0(INNER, x, y);
      if (!v || (his && !(KIND[his - 1] === 'glow' && KIND[v - 1] === 'gold'))) continue;
      if (hidden(x, y) || nearLines(x, y)) RING.d[y * k.w + x] = v;
    }
  const RP = keep(RING, hidden), RL = keep(RING, (x, y) => !hidden(x, y));
  return { HZ, HALO, U, SEAL, SB, LB, RP, RL, center: [cx, cy] as [number, number], ring3: [c3x, c3y, r3x, r3y] };
}

/**
 * One step cooler for his light: pale glow to his cyan, cyan to his saturated mid-blue (same
 * alpha), where it stays; gold light keeps.
 */
const GLOW_COOL: number[] = CK_PAL.map((p, i) => {
  const to: Record<number, number> = { 8: 6, 6: 4, 5: 4, 4: 3 };
  if (p.kind !== 'glow' || to[p.hue] === undefined) return i;
  const j = CK_PAL.findIndex((q) => q.kind === 'glow' && q.hue === to[p.hue] && q.order === p.order);
  return j < 0 ? i : j;
});
/** n cool steps for every pixel of chakra (COOL) and of its light (GLOW_COOL). */
const coolAll = (ix: Ix, n: (x: number, y: number) => number): Ix =>
  remap(cool(ix, n), (v, x, y) => {
    let j = v - 1;
    for (let k = n(x, y); k > 0; k--) j = GLOW_COOL[j];
    return j + 1;
  });

/**
 * The pillar's top, where it fades out (his panel cut it off), cools toward his saturated blues
 * as it goes: faint, it reads as blue haze, not as a grey cap.
 */
function coolTop(P: Ix, fadeTop: number): Ix {
  return coolAll(P, (_, y) => (y < fadeTop ? Math.ceil(3 * (1 - y / fadeTop)) : 0));
}

function blast(): WorldSprite {
  const k = key('blast', pads(4));
  const P = coolTop(piece(k, 'pillar'), k.fade.top ?? 0), LN = piece(k, 'lines'), SP = piece(k, 'loose');
  const { HZ, HALO, U, SEAL, SB, LB, RP, RL } = sealCircle(k);
  const alphaAt = (a: Alpha, x: number, y: number) => (typeof a === 'number' ? a : a(x, y));
  // What the pillar hides in his picture (the haze, rebuilt from the haze round it; the far arcs of
  // the circle and the hexagram, the far half of the third ring): drawn only where the pillar of a
  // frame is not opaque (its soft front and foot and its fading body show them through), so his
  // picture is unchanged. The pillar piece holds its own halo, so the halo goes with it.
  const behind = (cur: Ix, ix: Ix, a: Alpha = 1) => keep(ix, (x, y) => at(P, x, y) !== 0 && (at(cur, x, y) === 0 || alphaAt(a, x, y) < 1));
  // The haze under whatever of the circle, its lines, the pillar and the sparks a frame leaves out
  // or draws see-through (only what is drawn at full strength hides it, as in his picture).
  const haze = (...cover: [Ix, Alpha][]) => keep(U, (x, y) => cover.every(([c, a]) => at(c, x, y) === 0 || alphaAt(a, x, y) < 1));
  // The far arcs sit IN the haze (as his own arcs beside the pillar do): only their solid gold
  // hides it; their glow lies over it.
  const solid = (ix: Ix) => keep(ix, (_, __, v) => !isLight(v - 1));
  const BACK = union(SB, RP), BACKsolid = solid(BACK);
  const circle = (cur: Ix, a: Alpha = 1) => union(SEAL, behind(cur, BACK, a));
  const sealCover = (cur: Ix, a: Alpha = 1) => union(SEAL, behind(cur, BACKsolid, a));
  const lines = (cur: Ix, a: Alpha = 1) => union(LN, behind(cur, LB, a));
  // The third ring beside and under the hexagram shows as the lines fade (at his picture's full
  // strength they hide it, as in his picture).
  const ringA = (sealA: Alpha, linesA: Alpha): Alpha => (x, y) => alphaAt(sealA, x, y) * clamp((1 - alphaAt(linesA, x, y)) / 0.25, 0, 1);
  const foot = k.ay + 14; // the pillar's foot, in the middle of the circle
  const top = bounds(P)![1];
  const H = foot - top;
  // On the ground the circle is seen at a slant (it is 1.6 times wider than tall). ang: how far
  // round the circle a point is from its front (0) to its back (0.5), either way.
  const ang = (x: number, y: number) => {
    const a = fract(Math.atan2((y + 0.5 - k.ay) * 1.6, x + 0.5 - k.ax) / TAU - 0.25);
    return Math.min(a, 1 - a);
  };
  // The circle lights at its front and draws itself round both ways to the back: drawn up to f,
  // its two leading edges feathered over ~3 px (alpha) and a step hot just behind them. (Lit both
  // ways from a point, it has no start line to cut across it.)
  const FEATHER = 0.01, DONE = 0.5 + FEATHER;
  const wipe = (f: number, a = 1): Alpha => (f >= DONE ? a : (x, y) => a * clamp((f - ang(x, y)) / FEATHER, 0, 1));
  const hotEdge = (ix: Ix, f: number) => (f >= DONE ? ix : level(ix, (x, y) => (ang(x, y) > f - 0.035 && ang(x, y) <= f ? 1 : 0)));
  // A ragged edge across the pillar: irregular (two scales of noise), 1 to 6 px deep.
  const ragged = (x: number, seed: number) => 1 + 3.2 * noise(x, 0, 7, seed) + 1.8 * noise(x, 0, 2.5, seed + 1);
  const thin = (w: number) => (w === 1 ? P : scaleAbout(P, k.ax, 0, w, 1));
  const up = (ix: Ix, dy: number) => displace(ix, () => [0, -dy]);
  const fr: Canvas[] = [];
  const frame = (hz: number, cur: Ix, curA: Alpha, sealF: number, sealA: Alpha, linesA: Alpha, sp: Ix, spA: number, fx: (ix: Ix) => Ix = (ix) => ix) => {
    const seal = fx(hotEdge(circle(cur, curA), sealF));
    const ln = lines(cur, curA), rA = ringA(sealA, linesA);
    // The circle's halo (his blue light round the gold) is haze: as strong as the haze, where the
    // circle has been lit (before that, the haze it hides).
    const lit: Alpha = (x, y) => (alphaAt(sealA, x, y) >= 0.5 ? 1 : 0);
    const under = haze([HALO, lit], [sealCover(cur, curA), sealA], [RL, rA], [ln, linesA], [cur, curA], [sp, spA]);
    return render(k.w, k.h, [[HZ, hz], [HALO, (x, y) => alphaAt(lit, x, y) * hz], [under, hz], [seal, sealA], [RL, rA], [ln, linesA], [cur, curA], [sp, spA]], k.fade);
  };

  // 0-3: anticipation. The seal circle lights at its front and draws itself round both ways, the
  //      hexagram following it, while the haze gathers (by alpha). The pillar stays down until
  //      frame 2, then climbs out of the circle with a ragged front, soft (alpha over 4 px) and a
  //      step hot.
  const sealF = [0.2, 0.4, DONE, DONE], lineF = [0.06, 0.26, 0.45, DONE], lineK = [0.55, 0.75, 0.95, 1];
  const hazeK = [0.18, 0.42, 0.6, 0.8];
  const pillarF = [0, 0, 0.34, 0.76], pillarW = [0, 0, 0.72, 0.9];
  for (let i = 0; i < 4; i++) {
    let cur = none(k);
    let curA: Alpha = 0;
    if (pillarF[i] > 0) {
      const front = (x: number) => foot - H * pillarF[i] - ragged(x, 931 + i);
      cur = level(keep(thin(pillarW[i]), (x, y) => y >= front(x) - 1), (x, y) => (y < front(x) + 6 ? 1 : 0), ['blue']);
      curA = (x, y) => clamp((y - front(x) + 1) / 4, 0, 1);
    }
    const sp = i >= 2 ? twinkle(SP, i / 8, 0.5, 905) : none(k);
    fr.push(frame(hazeK[i], cur, curA, sealF[i], wipe(sealF[i]), wipe(lineF[i], lineK[i]), sp, i === 3 ? 0.8 : 0.4));
  }
  // 4: his picture. 5-6: it holds; the pillar's light shimmers and the sparks begin to rise.
  fr.push(render(k.w, k.h, [[HZ], [HALO], [SEAL], [LN], [P], [SP]], k.fade));
  const hold = (x: number, y: number) => smooth(4, 16, Math.abs(x - k.ax)) * smooth(0, 10, foot - y);
  for (const i of [5, 6]) {
    const t = (i - 4) / 12;
    const cur = shimmer(churn(P, t, 1.2, 9, 913, hold), t, 917, 12);
    const sp = twinkle(up(SP, (i - 4) * 2), t, 0.15, 921);
    fr.push(frame(1, cur, 1, DONE, 1, 1, sp, 1, (ix) => glint(ix, (i - 4) / 10, k.ax, k.ay, 0.9, Math.PI / 2)));
  }
  // 7-15: the long settle. The pillar thins and draws up off the circle into the sky, its foot
  //       ragged but soft (alpha over 4 px), fading by alpha and cooling to cyan and blue (not
  //       dimmed to grey), gone by frame 14; for a few frames it leaves a soft glow pool where it
  //       stood, over the haze it hid (rebuilt at the level of the haze round it, so no pit opens
  //       in the circle). The haze thins, the hexagram goes out (the third ring showing whole as
  //       it does) and the gold fades last (by alpha, never darker); the sparks float up and go out.
  for (let j = 0; j < 9; j++) {
    const u = (j + 1) / 9, t = (7 + j - 4) / 12;
    const cut = foot + 6 - (H * 0.85 + 6) * smooth(0.2, 1, u) ** 1.2;
    const cutR = (x: number) => cut - ragged(x, 941 + j);
    const cur = coolAll(shimmer(churn(thin(1 - 0.5 * smooth(0, 1, u)), t, 1.2, 9, 913, hold), t, 917, 12), () => Math.round(u * 3));
    const pa = 1 - smooth(0.12, 0.88, u);
    const pool = 0.5 * clamp(1 - (foot + 6 - cut) / 40, 0, 1);
    const curA: Alpha = (x, y) => pa * (y < cutR(x) - 4 ? 1 : y < cutR(x) ? Math.max(pool, (cutR(x) - y) / 4) : pool);
    const hz = 1 - 0.95 * u, sa = 1 - smooth(0.35, 1, u), la = 1 - smooth(0, 0.7, u);
    const sp = twinkle(up(SP, 4 + j * 3), t, 0.15 + u * 0.4, 921);
    fr.push(frame(hz, pa > 0 ? cur : none(k), curA, DONE, sa, la, sp, 1 - u * 0.9));
  }
  return sprite(k, 'Chakra blast: pillar of light over a gold seal circle', { blast: { frames: fr, fps: BLAST_FPS, loop: false } });
}

// --- walls: the hexagon barrier in its gold frame --------------------------------------------------

/**
 * His barrier ('wall' or 'wall_diag'). rise: the gold frame rises out of the ground, then the pane
 * fills up from the ground with a bright front, ending on his picture. idle: his picture, then a
 * band of light sweeps across the cells, the crest churns and the foam twinkles.
 */
function barrier(name: 'wall' | 'wall_diag', label: string, seed: number): WorldSprite {
  const k = key(name);
  const FR = piece(k, 'frame'), SP = piece(k, 'loose'), SH = piece(k, 'shadow');
  // The pane under his sparkles is filled from the light round them (they are opaque, so his
  // picture is unchanged): a sparkle that twinkles out, or is not up yet in the rise, leaves the
  // pane behind it instead of a pinhole.
  const M = fillUnder(piece(k, 'main'), SP);
  // The ground line through the anchor: level for the straight wall; for the 3/4 wall it rises
  // 120 px over 182 to the far end, as on our 3/4 walls.
  const slope = name === 'wall' ? 0 : -120 / 182;
  const groundY = (x: number) => k.ay + (x - k.ax) * slope;
  const height = (x: number, y: number) => groundY(x) - y;
  let top = 0;
  for (const ix of [FR, M])
    for (let y = 0; y < ix.h; y++) for (let x = 0; x < ix.w; x++) if (ix.d[y * ix.w + x]) top = Math.max(top, height(x, y));
  const upTo = (ix: Ix, hh: number) => keep(ix, (x, y) => height(x, y) <= hh);
  // The pane fills up like water: its crest (the top CREST px: the lit edge, the foam, the pale top
  // face of the 3/4 wall) rides on the rising front, over the cells revealed below it.
  const CREST = name === 'wall' ? 10 : 28;
  const body = keep(M, (x, y) => height(x, y) <= top - CREST), crestP = keep(M, (x, y) => height(x, y) > top - CREST);
  const pane = (ph: number): Ix => {
    if (ph <= 0) return none(k);
    const crest = keep(displace(crestP, () => [0, top - ph]), (x, y) => height(x, y) >= 0);
    // The cells reach 2 px up under the crest, so the seam between them (the crest moves by whole
    // pixels, the 3/4 wall's ground line by fractions) never opens into pinholes.
    const b = level(upTo(body, ph - CREST + 2), (x, y) => (height(x, y) > ph - CREST - 4 ? 1 : 0), ['blue', 'barrier']);
    return stamp(b, crest);
  };
  const rise: Canvas[] = [];
  const frameK = [0.16, 0.38, 0.62, 0.84, 1, 1, 1, 1, 1, 1, 1, 1];
  const paneK = [0, 0.03, 0.09, 0.17, 0.27, 0.38, 0.5, 0.62, 0.74, 0.86, 0.95, 1];
  const shadeK = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.78, 0.86, 0.93, 1, 1];
  for (let r = 0; r < RISE_N; r++) {
    if (r === RISE_N - 1) {
      rise.push(render(k.w, k.h, [[SH, 1], [M], [FR], [SP]], k.fade));
      break;
    }
    const fh = frameK[r] * top, ph = paneK[r] * top;
    const fr = level(upTo(FR, fh), (x, y) => (frameK[r] < 1 && height(x, y) > fh - 4 ? 1 : 0));
    const foam = paneK[r] >= 0.9 ? twinkle(SP, r / 12, 0.4, seed + 3) : none(k);
    rise.push(render(k.w, k.h, [[SH, shadeK[r]], [pane(ph)], [fr], [foam]], k.fade));
  }
  // idle: a band of light sweeps across the cells (off the wall at frame 0, so frame 0 is his
  // picture), ripples run along the crest, the pane breathes and the foam twinkles.
  const W = k.w;
  const crest = (x: number, y: number) => smooth(top - 22, top - 8, height(x, y));
  const idle = range(IDLE_N).map((i) => {
    const t = cyc(i, IDLE_N);
    const band = -40 + t * (W + 80);
    const sweep = (x: number, y: number) => {
      const d = Math.abs(x - band + (y - k.ay) * 0.45);
      return d < 5 ? 2 : d < 13 ? 1 : 0;
    };
    let m = wave(M, t, { amp: [0.8, 1.0], len: 26, along: (x) => x, seed: seed + 20, weight: crest });
    m = level(m, sweep, ['blue', 'barrier']);
    m = shimmer(m, t, seed + 25, 22, ['glow'], 0, 0.55);
    return render(k.w, k.h, [[SH], [m], [glint(FR, t, k.ax, k.ay - 50, 0.5)], [twinkle(SP, t, 0.3, seed + 9)]], k.fade);
  });
  return sprite(k, label, { rise: { frames: rise, fps: RISE_FPS, loop: false }, idle: { frames: idle, fps: IDLE_FPS, loop: true } });
}

// --- wall_depth: OURS (the owner kept our end-on wall) ---------------------------------------------
// Copied from vfx-b-chakra.ts (barrier3d, barrierWall and their helpers), so the look is our seal
// barrier; the frame counts change (rise 12, idle 8), sampled more finely along the same rise and
// the same shimmer cycle. Changed for the new timing only: the streak floor (streakCut) and the
// first rise frame (depthFrames).

/** 0 outline, 1 deep blue, 2 royal, 3 blue, 4 azure, 5 sky cyan, 6 light cyan, 7 ice white, 8 white. */
const C = pal('#081040', '#12288c', '#1a46c8', '#2a6cf0', '#2fa0ff', '#3cc8ff', '#8ae8ff', '#d4f8ff', '#ffffff');
/** Seal gold: 0 outline .. 5 pale. */
const GOLD = pal('#4a2a06', '#8a560a', '#c8861a', '#f0b42c', '#ffd866', '#fff3c0');

/** A sparkle chip: plus shape in light cyan with a white center. */
function spark(l: L, x: number, y: number, s: number): void {
  x = Math.round(x);
  y = Math.round(y);
  l.set(x, y, 8);
  if (s < 1) return;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) l.set(x + dx, y + dy, s > 1 ? 7 : 6);
  if (s > 1) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) l.set(x + dx, y + dy, 5);
}
function sparks(c: Canvas, pts: [number, number, number][]): void {
  const l = new L(c.w, c.h);
  for (const [x, y, s] of pts) spark(l, x, y, s);
  l.render(c, C, { outline: null });
}

/** Abstract seal glyphs (no real text): 5x5 brush marks built from bars, boxes and ticks. */
const GLYPHS = [
  ['#####', '..#..', '.###.', '..#..', '.#.#.'],
  ['.###.', '.#.#.', '#####', '..#..', '.##..'],
  ['#.#.#', '#####', '..#..', '.###.', '#...#'],
  ['..#..', '#####', '#.#.#', '#.#.#', '.#.#.'],
  ['.#.#.', '#####', '..#..', '#####', '.#.#.'],
  ['#...#', '.###.', '.#.#.', '.###.', '#...#'],
  ['.#.#.', '#####', '.#.#.', '.###.', '..#..'],
  ['#####', '#...#', '#.#.#', '#...#', '##.##'],
];

const BAR_HALF = 11;
const POST = 6;

/** Is (gx, gy) (0..4) a stroke of glyph `seed`? */
function glyphBit(seed: number, gx: number, gy: number): boolean {
  if (gx < 0 || gy < 0 || gx > 4 || gy > 4) return false;
  const g = GLYPHS[Math.floor(rnd(seed, 0) * GLYPHS.length)];
  return g[gy][rnd(seed, 1) < 0.5 ? 4 - gx : gx] === '#';
}

/** Hex cell of a face point (a along, b down from the top): distances to the nearest and second centre. */
function hexAt(a: number, b: number, cell = 9): { best: number; b2: number; bid: number; bx: number; by: number } {
  const q = a / (cell * 1.732), r = b / (cell * 1.5);
  const row = Math.round(r), col = Math.round(q - (row % 2 ? 0.5 : 0));
  let best = Infinity, b2 = Infinity, bid = 0, bx = 0, by = 0;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const rr = row + dr, cc = col + dc;
      const cx = (cc + (rr % 2 ? 0.5 : 0)) * cell * 1.732, cy = rr * cell * 1.5;
      const d = Math.max(Math.abs(a + 0.5 - cx) * 0.866 + Math.abs(b + 0.5 - cy) * 0.5, Math.abs(b + 0.5 - cy));
      if (d < best) {
        b2 = best;
        best = d;
        bid = rr * 100 + cc;
        bx = cx;
        by = cy;
      } else if (d < b2) b2 = d;
    }
  return { best, b2, bid, bx, by };
}

/**
 * The share of the top face's glint streaks at time t never drops below 15%: in our old frames it
 * fell to none at t = 0.5 and 0.625, so with twice the frames the streaks blinked off and on. The
 * threshold is lowered only there (to the strip's top-15% value), so every other frame is ours.
 */
function streakCut(t: number): number {
  const v: number[] = [];
  for (let x = 0; x < 16; x += 0.125) v.push(pnoise(x, t * 16, 3, 16, 70));
  v.sort((a, b) => b - a);
  return Math.min(0.6, v[Math.floor(0.15 * v.length)]);
}

/** One frame of the barrier slab in orientation o, raised to hk, the shimmer at sh. */
function barrier3d(o: Orient, hk: number, sh: number, f: number, t: number): Canvas {
  const c = new Canvas(o.w, o.h);
  const cut = streakCut(t);
  const limV = HGT * hk;
  const crestV = (u: number): number => limV - 2 - Math.sin((u / LEN) * TAU * 4 - t * TAU) * 1.6;
  const postTop = Math.max(limV, 10) + 4;
  const tagTop = Math.max(Math.min(HGT * hk - 6, 40), 24);
  const inside = (u: number, s: number, v: number): number => {
    if (u < 0) return 3;
    if (u > LEN) return 4;
    if (u < POST || u > LEN - POST) return v > postTop ? 0 : Math.abs(s) > BAR_HALF + 2 ? 1 : -1;
    if (v < 7) return Math.abs(s) > BAR_HALF + 1 ? 1 : -1;
    if (v > crestV(u)) return 0;
    return Math.abs(s) > BAR_HALF ? 1 : -1;
  };
  const hits = march(o, inside, { sMax: BAR_HALF + 3, vMax: HGT + 8 });
  const fill = new L(o.w, o.h), edge = new L(o.w, o.h), gold = new L(o.w, o.h), energyMask = new L(o.w, o.h), crestL = new L(o.w, o.h), glyph = new L(o.w, o.h);
  for (let i = 0; i < o.w * o.h; i++) {
    const fc = hits.face[i];
    if (fc < 0) continue;
    const x = i % o.w, y = (i / o.w) | 0;
    const u = hits.u[i], sv = hits.s[i], v = hits.v[i];
    const haze = o.key !== 'wall' && u > LEN * 0.66 ? 1 : 0;
    if (u < POST || u > LEN - POST) {
      // Gold seal posts: bevelled, with collars, and a glyph slot down the outer end.
      const lu = u < POST ? u : LEN - u;
      const as = Math.abs(sv);
      if (fc === 0) {
        gold.set(x, y, as > BAR_HALF + 1 || lu < 1 || POST - lu < 1 ? 5 : 4);
        continue;
      }
      const cv = [3, 24, 54, 84].find((k) => v >= k && v < k + 4 && k + 4 < postTop - 2);
      let st = cv !== undefined ? (v >= cv + 3 ? 5 : v < cv + 1 ? 2 : 4) : v > postTop - 2 ? 5 : 3;
      if (fc === 3 || fc === 4) {
        if (as > BAR_HALF + 1) st = sv < 0 ? Math.max(st, 4) : 2;
        else if (cv === undefined && as < 4 && v > 9 && v < postTop - 6) {
          st = as > 3 ? 2 : 1;
          const k = Math.floor((postTop - 7 - v) / 7), gy = Math.round(postTop - 7 - v - k * 7 - 1);
          if (as <= 3 && glyphBit(190 + k + (u > LEN / 2 ? 40 : 0), Math.round(sv + 2), gy)) glyph.set(x, y, fract(k / 5 - t) < 0.4 ? 8 : 6);
        }
      } else if (lu < 1 || POST - lu < 1) st = Math.min(st, 2);
      gold.set(x, y, st);
      continue;
    }
    if (v < 7) {
      // Gold base band with glyphs.
      let st = fc === 0 ? 4 : v < 1 || v > 6 ? 4 : 2;
      if (fc === 1 || fc === 2)
        for (let k = 0; k < 19; k++) {
          const gu = 12 + ((k * 13 + f * 2) % (LEN - 22));
          if (glyphBit(110 + k, Math.round(u - gu) + 2, Math.round(5 - v))) st = 5;
        }
      gold.set(x, y, st);
      continue;
    }
    energyMask.set(x, y, 1);
    const fromTop = crestV(u) - v;
    if (fc === 0 || fromTop < 1.5) {
      crestL.set(x, y, fc === 0 ? (sv > BAR_HALF - 2 ? 8 : pnoise(u * 0.8 + sv, t * 16, 3, 16, 70) > cut ? 6 : 7) : 8);
      continue;
    }
    if (fromTop < 3) {
      crestL.set(x, y, 7);
      continue;
    }
    // Honeycomb on the broad faces; across the thickness on the ends.
    const a = fc === 3 || fc === 4 ? sv + BAR_HALF : u;
    const h = hexAt(a, HGT - v);
    const sweep = Math.abs(u - (sh * (LEN + 60) - 30) + v * 0.4);
    if (h.b2 - h.best < 1.2) {
      const node = h.b2 - h.best < 0.5 && h.best > 9 * 0.7;
      edge.set(x, y, Math.max(5, (node || sweep < 8 ? 8 : 6) - haze));
    } else {
      const lit = a + 0.5 - h.bx + (HGT - v + 0.5 - h.by) < -9 * 0.55;
      let st = v < 30 ? 4 : 3;
      if (lit) st += 1;
      if (h.best < 1.6 && rnd(101, h.bid, f % 3) < 0.35) st = 7;
      if (sweep < 7) st += 2;
      if (fc === 3 || fc === 4) st -= 1;
      fill.set(x, y, Math.max(2, Math.min(8, st) - haze));
    }
  }
  // Seal tags on the broad face near the posts.
  const tags = new L(o.w, o.h);
  for (const tu of [7, LEN - 14])
    for (let lu = 0; lu < 7; lu++)
      for (let lv = 0; lv < 16; lv++) {
        const q = proj(o, tu + lu + 0.5, BAR_HALF + 0.6, tagTop - lv);
        let st = lu === 0 || lu === 6 ? 3 : 5;
        if (glyphBit(170, lu - 1, lv - 3) || glyphBit(171, lu - 1, lv - 9)) st = lv < 8 ? 1 : 2;
        tags.set(q[0], q[1], st);
      }
  energyMask.render(c, C, { alpha: 0, outlineAlpha: 150, outline: C[2] });
  fill.render(c, C, { outline: null, alpha: (st, x, y) => (st >= 7 ? 240 : Math.round(lerp(175, 95, clamp(hits.v[y * o.w + x] / HGT, 0, 1))) + (st >= 5 ? 40 : 0)) });
  edge.render(c, C, { outline: null, alpha: 235 });
  crestL.render(c, C, { outline: null, alpha: 240 });
  // Tongues of chakra licking up from the crest.
  const tongues = new L(o.w, o.h);
  for (let x = 0; x < o.w; x++)
    for (let y = 1; y < o.h; y++) {
      if (crestL.get(x, y) < 0 || crestL.get(x, y - 1) >= 0 || energyMask.get(x, y - 1) >= 0) continue;
      const n = Math.floor(pnoise(x * 0.8, (y + t * 24) % 24, 3, 24, 61) * 7) - 2;
      for (let k = 1; k <= n; k++) tongues.set(x, y - k, k === n ? 7 : 6);
    }
  tongues.render(c, C, { outline: C[3], alpha: 220, outlineAlpha: 160 });
  gold.render(c, GOLD);
  glyph.render(c, C, { outline: null });
  tags.render(c, GOLD);
  return c;
}

/** Our 6 rise heights (barrierWall in vfx-b-chakra.ts). */
const DEPTH_OLD_H = [0.15, 0.4, 0.65, 0.88, 1, 1];
/** The new first rise frame: height and alpha (see depthFrames). */
const DEPTH_FIRST_H = 0.11, DEPTH_FIRST_A = 0.5;
/** One frame of our end-on wall's rise (as barrierWall drew it). */
export function depthRiseFrame(o: Orient, hk: number, f: number, t: number, sparkF: number): Canvas {
  const c = barrier3d(o, hk, 0.5, f, t);
  sparks(c, range(14).map((k) => {
    const q = proj(o, 10 + rnd(201, k, sparkF) * (LEN - 20), BAR_HALF + 1, HGT * hk + (rnd(202, k, sparkF) - 0.5) * 10);
    return [q[0], q[1], k % 3 === 0 ? 2 : 1] as [number, number, number];
  }));
  return c;
}
/** One frame of our end-on wall's idle at shimmer phase ph (as barrierWall drew it, ph = f / 4). */
export function depthIdleFrame(o: Orient, ph: number, f: number): Canvas {
  const c = barrier3d(o, 1, ph, f, ph);
  sparks(c, range(4).map((k) => {
    const q = proj(o, 16 + ((rnd(203, k) * 225 + ph * 225) % 225), BAR_HALF + 1, 20 + rnd(204, k) * 70);
    return [q[0], q[1], 1] as [number, number, number];
  }));
  // Sparks riding up off both sides of the crest (they read from above in the depth view).
  sparks(c, range(8).map((k) => {
    const p = fract(rnd(205, k) + ph);
    const q = proj(o, 14 + rnd(206, k) * (LEN - 28), (k % 2 ? 1 : -1) * (BAR_HALF + 2 + p * 3), HGT - 4 + p * 14);
    return [q[0], q[1], p < 0.5 ? 1 : 0] as [number, number, number];
  }));
  return c;
}

/** The canvas with its alpha scaled by a. */
function faded(c: Canvas, a: number): Canvas {
  const out = c.clone();
  for (let i = 3; i < out.px.length; i += 4) out.px[i] = Math.round(out.px[i] * a);
  return out;
}

/**
 * Our end-on seal barrier, with twice the frames. Every odd rise frame (1, 3 ... 11) IS one of our
 * 6 old rise frames and every even one lies halfway between its neighbours (height and time); every
 * even idle frame (0, 2, 4, 6) IS one of our 4 old idle frames and every odd one is halfway through
 * the same shimmer cycle. (Our glyph band and node twinkles step with the old frame number, so they
 * hold for two frames.) Rise frame 0, before our first frame, is our barrier at a lower height
 * (its glass pane just showing above the gold base: lower and it is only the base's flat gold top)
 * fading in at half strength, so the wall comes up out of the light instead of popping in. The streaks keep
 * a 15% share on our two plain frames (streakCut).
 */
export function depthFrames(): { rise: Canvas[]; idle: Canvas[] } {
  const o = orientations().wall_depth;
  const rise = range(RISE_N).map((r) => {
    const f = Math.floor(r / 2);
    if (r === 0) return faded(depthRiseFrame(o, DEPTH_FIRST_H, 0, 0, 0), DEPTH_FIRST_A);
    const hk = r % 2 ? DEPTH_OLD_H[f] : (DEPTH_OLD_H[f - 1] + DEPTH_OLD_H[f]) / 2;
    return depthRiseFrame(o, hk, f, (r - 1) / 12, f);
  });
  const idle = range(IDLE_N).map((i) => depthIdleFrame(o, i / IDLE_N, Math.floor(i / 2)));
  return { rise, idle };
}

function wallDepth(): WorldSprite {
  const o = orientations().wall_depth;
  const { rise, idle } = depthFrames();
  return sprite({ name: 'wall_depth', w: o.w, h: o.h, ax: o.ax, ay: o.ay }, 'Chakra wall (depth): seal barrier (ours, kept)', {
    rise: { frames: rise, fps: RISE_FPS, loop: false },
    idle: { frames: idle, fps: IDLE_FPS, loop: true },
  });
}

// --- aura ---------------------------------------------------------------------------------------------

/**
 * `ix` with the clear pixels under `cover` filled from the light round them (each takes the
 * commonest light value of its filled neighbours, ring by ring inward), so nothing see-through is
 * left under a piece that is drawn on another layer.
 */
function fillUnder(ix: Ix, cover: Ix): Ix {
  const out = { ...ix, d: new Uint8Array(ix.d) };
  for (let pass = 0; pass < 8; pass++) {
    const next = new Uint8Array(out.d);
    let n = 0;
    for (let y = 0; y < ix.h; y++)
      for (let x = 0; x < ix.w; x++) {
        const i = y * ix.w + x;
        if (out.d[i] || !cover.d[i]) continue;
        const votes = new Map<number, number>();
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const v = at(out, x + dx, y + dy);
            if (v && isLight(v - 1)) votes.set(v, (votes.get(v) ?? 0) + 1);
          }
        let best = 0, bn = 0;
        for (const [v, c] of [...votes].sort((a, b) => a[0] - b[0])) if (c > bn) [best, bn] = [v, c];
        if (best) {
          next[i] = best;
          n++;
        }
      }
    out.d = next;
    if (!n) break;
  }
  return out;
}

/**
 * His aura in two frame-synchronized layers with the same size and anchor (the feet): `aura_back`
 * goes BEHIND the character (his two flames, their haze, the gold glow at the feet and the far half
 * of the gold ring); `aura` goes OVER it (the near half of the ring and his sparkles). The flames lick
 * upward (more at their tips), the light shimmers, the gold glow breathes, a glint runs round the
 * ring and the sparkles twinkle.
 */
function aura(): WorldSprite[] {
  const k = key('aura');
  const RF = piece(k, 'ringfront'), SP = piece(k, 'loose');
  // The back layer had holes where the near half of the ring sits (it is on the front layer); they
  // are filled with the warm glow round them, so the glow never shows a gap beside a ring dash.
  const M = fillUnder(piece(k, 'main'), RF);
  // The feet (the ring, the warm glow) hold still; above them the flames lick upward, more at
  // their tips, as a steady travelling wave.
  const tips = (_x: number, y: number) => smooth(k.ay - 6, k.ay - 18, y) * (0.35 + 0.65 * smooth(k.ay - 10, k.ay - 90, y));
  const ringC: [number, number] = [k.ax, k.ay + 3];
  const back: Canvas[] = [], front: Canvas[] = [];
  for (let i = 0; i < AURA_N; i++) {
    const t = cyc(i, AURA_N);
    let m = wave(M, t, { amp: [1.2, 1.0], len: 24, along: (_x, y) => -y, seed: 1200, weight: tips });
    m = shimmer(m, t, 1250, 10, ['blue', 'glow']);
    m = shimmer(m, t, 1260, 16, ['warm']);
    m = glint(m, t, ringC[0], ringC[1], 0.8, Math.PI);
    back.push(render(k.w, k.h, [[m]], k.fade));
    const sp = twinkle(SP, t, 0.25, 1210, (b, u) => [0, -1.5 * Math.sin(Math.PI * u) ** 2 * (0.5 + hash(Math.round(b.cx), Math.round(b.cy), 7))]);
    front.push(render(k.w, k.h, [[glint(RF, t, ringC[0], ringC[1], 0.8, Math.PI)], [sp]], k.fade));
  }
  return [
    sprite(k, 'Chakra aura, front layer (draw OVER the character): near half of the seal ring and sparkles', { idle: { frames: front, fps: AURA_FPS, loop: true } }),
    sprite({ ...k, name: 'aura_back' }, 'Chakra aura, back layer (draw BEHIND the character): chakra flames and gold glow', { idle: { frames: back, fps: AURA_FPS, loop: true } }),
  ];
}

// --- checks and output ------------------------------------------------------------------------------

/**
 * No frame may have art on its border, except the stream tile's left and right (it wraps) and the
 * head's left (the joint).
 */
function borderCheck(s: WorldSprite): string[] {
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

/** The light of a frame: mean alpha x brightness over the frame (0..1). */
export function light(f: Canvas): number {
  let sum = 0;
  for (let i = 0; i < f.w * f.h; i++) {
    const p = i * 4;
    const a = f.px[p + 3] / 255;
    if (a) sum += a * ((0.3 * f.px[p] + 0.59 * f.px[p + 1] + 0.11 * f.px[p + 2]) / 255);
  }
  return sum / (f.w * f.h);
}

/** The sprites in the order of the vfx_chakra manifest (beast copied through), then aura_back. */
const ORDER = ['bolt', 'beast', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi', 'hit', 'blast', 'wall', 'aura', 'wall_diag', 'wall_depth', 'aura_back'];

export function chakraV3Sprites(): WorldSprite[] {
  return [
    bolt(),
    ...stream(),
    breath(),
    sphere(),
    slash(),
    multi(),
    hit(),
    blast(),
    barrier('wall', 'Chakra wall: hexagon barrier in a gold frame (4.5 m x 1.8 m)', 1000),
    barrier('wall_diag', 'Chakra wall (3/4): hexagon barrier in a gold frame, with its shadow', 1050),
    wallDepth(),
    ...aura(),
  ];
}

function main(): void {
  // Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
  const worldOut = process.env.WORLD_OUT;
  if (!worldOut) throw new Error('vfx-chakra-v3: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
  const beastSrc = join(worldOut, 'vfx_chakra', 'beast.png');
  const oldManifest = join(worldOut, 'vfx_chakra', 'manifest.json');
  if (!existsSync(beastSrc) || !existsSync(oldManifest)) throw new Error(`vfx-chakra-v3: the chakra beast is copied from ${beastSrc}; it is missing`);
  const sprites = chakraV3Sprites();
  const bad = sprites.flatMap(borderCheck);
  if (bad.length) throw new Error('vfx-chakra-v3: art on the frame border:\n  ' + bad.join('\n  '));
  for (const s of sprites) {
    const fw = Math.max(...Object.values(s.anims).flatMap((a) => a.frames.map((f) => f.w)));
    const cols = Math.max(...Object.values(s.anims).map((a) => a.frames.length));
    if (fw * cols >= 8192) throw new Error(`vfx-chakra-v3: ${s.name} is ${fw * cols} px wide (rows must stay under 8192)`);
  }
  // Every file is written whole under a temp folder, then moved in: PNGs first, the manifest last.
  const tmpRoot = join(worldOut, `.${GROUP}-tmp`);
  rmSync(tmpRoot, { recursive: true, force: true });
  writeGroup(GROUP, sprites, tmpRoot);
  const tmpDir = join(tmpRoot, GROUP);
  copyFileSync(beastSrc, join(tmpDir, 'beast.png'));
  const ours = JSON.parse(readFileSync(join(tmpDir, 'manifest.json'), 'utf8'));
  const old = JSON.parse(readFileSync(oldManifest, 'utf8'));
  const allS: Record<string, unknown> = { ...ours.sprites, beast: old.sprites.beast };
  const manifest = { group: GROUP, pxPerMeter: PX_PER_M, sprites: Object.fromEntries(ORDER.filter((n) => allS[n]).map((n) => [n, allS[n]])) };
  writeFileSync(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  const dest = join(worldOut, GROUP);
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(tmpDir).sort((a, b) => Number(a === 'manifest.json') - Number(b === 'manifest.json') || (a < b ? -1 : a > b ? 1 : 0));
  for (const f of files) renameSync(join(tmpDir, f), join(dest, f));
  rmSync(tmpRoot, { recursive: true, force: true });
  for (const s of sprites) {
    const f0 = Object.values(s.anims)[0].frames[0];
    const anims = Object.entries(s.anims).map(([n, a]) => `${n}:${a.frames.length}@${a.fps}${a.loop === false ? ' once' : ''}`).join(' ');
    console.log(`${GROUP} ${s.name.padEnd(12)} ${`${f0.w}x${f0.h}`.padEnd(8)} anchor ${String(s.anchor).padEnd(8)} ${anims}`);
  }
  if (process.env.CHAKRA_LIGHT)
    for (const s of sprites)
      for (const [n, a] of Object.entries(s.anims)) console.log(`light ${s.name}.${n}: ${a.frames.map((f) => (light(f) * 1000).toFixed(1)).join(' ')}`);
  console.log(`wrote ${sprites.length + 1} sprites to ${dest}`);
}

if (process.argv[1] && /vfx-chakra-v3\.ts$/.test(process.argv[1])) main();
