// Genjutsu jutsu VFX, v3: rebuilt to the owner's own paint-over of the genjutsu sheet
// (docs/reference/genjutsu-set-owner-reference.jpg). He asked for his examples to be copied as
// exactly as possible, so every sprite's KEY frame is his picture: tools/refs/genjutsu-from-ref.py
// cut his panels out at game scale (measured on his character), removed his background, character
// and labels, quantized his pixels to one palette sampled from his image, restored his 1 px
// deep-violet outline and kept his glows and dark smoke as semi-transparent pixels. That data is in
// vfx-genjutsu-v3-refdata.ts; this generator only DERIVES the other frames from those key frames:
//
//   - fly loops    frame 0 is his picture; the core (orb, eye, crescent) holds still while the
//                  tendrils wave, the smoke streams back, the arcs ripple out, the eyes blink;
//   - stream       his 64 px tile (one braid period), scrolled along the line (still tiles); the
//                  head is his head in frame 0, then his ribbons slide on into the turning spiral
//                  with the braid following from the last tile (seamless joint in every frame);
//   - hit / blast  grow up to his picture (hit frame 2, blast frame 3), then break up and fade;
//                  the blast's column shoots up in streaks of light out of the opening pool;
//   - walls        'rise' pushes his crystals up out of the ground, then the vines and petals come
//                  (the 3/4 wall's long shadow stretches out with it); 'idle' is his picture, then
//                  a glint runs over the crystals and the bits drift;
//   - aura         two layers: aura_back (behind the character: his flames and smoke) and aura
//                  (over the character: his violet veil as a soft field over the body, measured
//                  on his sheet, plus his petals, feathers and the ring at the feet); the flames
//                  lick upward, the veil breathes and the petals drift.
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
 * One step along an entry's own hue ramp: the entry of its kind about 8 L lighter (dir 1) or
 * darker (dir -1) with the nearest hue and chroma, so a tone step never turns his violets grey.
 * Kinds whose entries are his alpha steps (outline, glow, smoke, ground) keep.
 */
const rampStep = (dir: number): Int16Array =>
  recolorRamp(`ramp${dir}`, (i) => {
    const [L, a, b] = LAB[i];
    let best = i, bd = Infinity;
    for (let j = 0; j < PAL.length; j++) {
      if (KIND[j] !== KIND[i] || j === i) continue;
      const dL = (LAB[j][0] - L) * dir;
      if (dL < 2.5) continue;
      // Toward white a ramp loses chroma: aim at the entry's chroma scaled down as it nears L 100.
      const keepC = dir > 0 ? Math.max(0.35, (100 - LAB[j][0]) / Math.max(1, 100 - L)) : 1;
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

/** The picture turned by `ang` (radians, clockwise on screen) about (cx, cy), on a ground squashed by `squash`. */
function rotateAbout(ix: Ix, cx: number, cy: number, ang: number, squash = 1, only?: (x: number, y: number) => boolean): Ix {
  const out = blank(ix.w, ix.h);
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let y = 0; y < ix.h; y++)
    for (let x = 0; x < ix.w; x++) {
      if (only && !only(x, y)) {
        out.d[y * ix.w + x] = ix.d[y * ix.w + x];
        continue;
      }
      const u = x + 0.5 - cx, v = (y + 0.5 - cy) / squash;
      const su = c * u + s * v, sv = -s * u + c * v;
      out.d[y * ix.w + x] = at(ix, Math.floor(cx + su), Math.floor(cy + sv * squash));
    }
  return out;
}

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

type Fade = Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
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
const piece = (k: Key, n: string): Ix => k.p[n] ?? none(k);

/** Bright small bits (sparkles) blink: in some frames some of them are out. */
function twinkle(ix: Ix, frame: number, share: number, seed: number): Ix {
  if (!frame) return ix;
  return keep(ix, (x, y) => hash(Math.floor(x / 6), Math.floor(y / 6), seed + frame * 31) >= share);
}

function sprite(k: Key, label: string, anims: Record<string, { frames: Canvas[]; fps: number; loop?: boolean }>): WorldSprite {
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
  // His trailing smoke is fine speckle, not blobs: a third of its pixels open up, and it is a
  // quarter lighter than his opaque rims.
  const smk = keep(sm, (x, y) => hash(x, y, 4242) > 0.33);
  const fr = range(6).map((i) => {
    const ph = (i / 6) * TAU;
    // The tendrils wave, more the further back they are; none at the orb.
    const m = i ? displace(main, (x) => {
      const w = smooth(2, 26, k.ax - 8 - x);
      return [0, (Math.sin(ph - (k.ax - x) * 0.24) - Math.sin(-(k.ax - x) * 0.24)) * 1.4 * w];
    }) : main;
    // The orb's rim breathes a step brighter and darker; the eye at its middle holds still.
    const o = tone(orb, (x, y) => (Math.hypot(x - k.ax, y - k.ay) > 6 ? [0, 1, 1, 0, -1, -1][i] : 0));
    return render(k.w, k.h, [[conveyor(smk, i, 6, k.ax - 10), 0.75, { left: 10 }], [m], [o]]);
  });
  return sprite(k, 'Genjutsu bolt: watching-eye orb with streaming tendrils', { fly: { frames: fr, fps: 12, loop: true } });
}

function sphere(): WorldSprite {
  const k = key('sphere', pad(ROOM));
  const core = piece(k, 'core'), main = piece(k, 'main');
  const fr = range(6).map((i) => {
    if (!i) return render(k.w, k.h, [[main], [core]]);
    // The spikes and sparks crackle round the still eye; the orbit ring holds; light pulses.
    const w = wobble(i / 6, 1.6, 4, 300);
    const m = displace(main, (x, y) => {
      const r = Math.hypot(x - k.ax, y - k.ay);
      const s = smooth(25, 31, r);
      const [dx, dy] = w(x, y);
      return [dx * s, dy * s];
    });
    const lit = [0, 1, 1, 0, -1, 0][i];
    return render(k.w, k.h, [[tone(m, (x, y) => (Math.hypot(x - k.ax, y - k.ay) > 26 ? lit : 0))], [core]]);
  });
  return sprite(k, 'Genjutsu sphere: eye orb with an orbit ring and magenta spikes', { fly: { frames: fr, fps: 12, loop: true } });
}

function slash(): WorldSprite {
  const k = key('slash', pad(ROOM));
  const main = piece(k, 'main'), sm = piece(k, 'smoke');
  const b = bounds(main)!;
  const fr = range(6).map((i) => {
    // A light runs down the bright edge; the wisps stream back.
    const yc = b[1] + ((b[3] - b[1]) * i) / 6;
    const m = i ? tone(main, (x, y) => (Math.abs(y - yc) < 4 && LOOK[at(main, x, y) - 1][0] > 150 ? 1 : 0)) : main;
    const s = i ? inside(displace(conveyor(sm, i, 6, b[0] + Math.round((b[2] - b[0]) * 0.6)), wobble(i / 6, 1, 5, 410)), 1) : sm;
    return render(k.w, k.h, [[s, 1, { left: 8 }], [m]]);
  });
  return sprite(k, 'Genjutsu slash: violet crescent of swept blades', { fly: { frames: fr, fps: 12, loop: true } });
}

function multi(): WorldSprite {
  const k = key('multi', pad(ROOM));
  const fr = range(6).map((i) => {
    const ph = (i / 6) * TAU;
    const layers: Layer[] = ['d0', 'd1', 'd2'].map((n, j) => {
      const d = piece(k, n);
      if (!i) return [d];
      const b = bounds(d)!;
      // Each dart bobs a pixel on its own beat; its streak trail waves behind it.
      const bob = Math.round(Math.sin(ph + j * 2.1)) - Math.round(Math.sin(j * 2.1));
      const head = b[2] - 14;
      const w = wobble(i / 6, 1.2, 4, 500 + j * 17);
      return [displace(d, (x, y) => {
        const [dx, dy] = w(x, y);
        const s = smooth(head, head - 10, x);
        return [dx * s * 0.6, bob + dy * s];
      })];
    });
    return render(k.w, k.h, layers);
  });
  return sprite(k, 'Genjutsu multi: three feather darts with magenta streaks', { fly: { frames: fr, fps: 12, loop: true } });
}

function breath(): WorldSprite {
  const k = key('breath', pad(ROOM));
  const orb = piece(k, 'orb'), main = piece(k, 'main'), sm = piece(k, 'smoke'), eyes = piece(k, 'eyes');
  const ob = bounds(orb)!;
  const ox = (ob[0] + ob[2]) / 2, oy = (ob[1] + ob[3]) / 2;
  type Part = { ix: Ix; b: [number, number, number, number] };
  // His eyes, each gathered from its bits (a ring and a pupil may not touch).
  const eyeParts: Part[] = [];
  for (const p of parts(eyes)) {
    const cx = (p.b[0] + p.b[2]) / 2, cy = (p.b[1] + p.b[3]) / 2;
    const near = eyeParts.find((e) => Math.abs((e.b[0] + e.b[2]) / 2 - cx) < 6 && Math.abs((e.b[1] + e.b[3]) / 2 - cy) < 5);
    if (near) {
      stamp(near.ix, p.ix);
      near.b = bounds(near.ix)!;
    } else eyeParts.push({ ix: p.ix, b: p.b });
  }
  // The arcs: each big part, with every small bit within 3 px of it (his rim dashes and specks),
  // so an arc moves as one layer and its rim never parts from it.
  const all = parts(main);
  const size = (p: Part) => p.ix.d.reduce((n, v) => n + (v ? 1 : 0), 0);
  const arcs = all.filter((p) => size(p) >= 40);
  const label = new Int16Array(k.w * k.h).fill(-1);
  arcs.forEach((p, j) => p.ix.d.forEach((v, n) => {
    if (v) label[n] = j;
  }));
  const groups: Part[] = arcs.map((p) => ({ ix: stamp(blank(k.w, k.h), p.ix), b: p.b }));
  for (const p of all) {
    if (size(p) >= 40) continue;
    const votes = new Map<number, number>();
    for (let y = p.b[1]; y <= p.b[3]; y++)
      for (let x = p.b[0]; x <= p.b[2]; x++) {
        if (!at(p.ix, x, y)) continue;
        for (let dy = -3; dy <= 3; dy++)
          for (let dx = -3; dx <= 3; dx++) {
            const u = x + dx, v = y + dy;
            if (u < 0 || v < 0 || u >= k.w || v >= k.h) continue;
            const l = label[v * k.w + u];
            if (l >= 0) votes.set(l, (votes.get(l) ?? 0) + 1);
          }
      }
    let best = -1, bn = 0;
    for (const [l, n] of votes) if (n > bn || (n === bn && l < best)) [best, bn] = [l, n];
    if (best >= 0) {
      stamp(groups[best].ix, p.ix);
      groups[best].b = bounds(groups[best].ix)!;
    } else groups.push({ ix: p.ix, b: p.b });
  }
  // The ripple: each arc (and each eye) moves as a whole a pixel out and back along its ray from
  // the orb, the wave travelling outward arc to arc (one frame of lag per 13 px of radius), with
  // an equal step every frame, so the loop has no hitch. Frame 0 is his picture.
  const WAVE = [0, 1, 1, 0, -1, -1];
  const push = (p: Part, i: number): [number, number] => {
    const cx = (p.b[0] + p.b[2]) / 2, cy = (p.b[1] + p.b[3]) / 2;
    const r = Math.hypot(cx - ox, cy - oy) || 1;
    const lag = Math.round(r / 13);
    const d = WAVE[(((i - lag) % 6) + 6) % 6] - WAVE[(((-lag) % 6) + 6) % 6];
    return [Math.round(((cx - ox) / r) * d), Math.round(((cy - oy) / r) * d * 0.6)];
  };
  const fr = range(6).map((i) => {
    const t = i / 6;
    const m = blank(k.w, k.h);
    for (const p of groups) {
      const [dx, dy] = i ? push(p, i) : [0, 0];
      stamp(m, p.ix, dx, dy);
    }
    const s = i ? displace(sm, wobble(t, 1, 6, 220)) : sm;
    // The watching eyes ride the ripple and blink in turn (each shut for one frame).
    const e = blank(k.w, k.h);
    eyeParts.forEach((p, j) => {
      const cy = (p.b[1] + p.b[3]) / 2;
      const shut = i && (j * 5 + 1) % 6 === i;
      const [dx, dy] = i ? push(p, i) : [0, 0];
      stamp(e, shut ? scaleAbout(p.ix, (p.b[0] + p.b[2]) / 2, cy, 1, 0.25) : p.ix, dx, dy);
    });
    const o = tone(orb, [0, 1, 2, 1, 0, -1][i]);
    return render(k.w, k.h, [[s], [m], [e], [o]]);
  });
  return sprite(k, 'Genjutsu breath: ripples of watching eyes from a glowing orb (origin at the anchor)', { fly: { frames: fr, fps: 12, loop: true } });
}

// --- stream: his braid tile, scrolled, and the spiral head --------------------------------------------

const STREAM_SHIFT = [0, 11, 21, 32, 43, 53];

function stream(): WorldSprite[] {
  const t = key('stream');
  const tm = piece(t, 'main');
  const tiles = range(6).map((i) => (i ? displace(tm, () => [STREAM_SHIFT[i], 0], true) : tm));
  const h = key('stream_head', { l: 0, t: 0, r: ROOM, b: 0 });
  if (h.ay !== t.ay || h.h !== t.h) throw new Error('vfx-genjutsu-v3: the stream head and the tile do not line up');
  const spiral = piece(h, 'spiral'), sparks = piece(h, 'sparks'), hs = piece(h, 'smoke');
  // His white wisp under the ribbons (bottom left) is kept in every frame; it drifts a pixel.
  const isWisp = (x: number, y: number) => x < 20 && y > 42;
  const hm = keep(piece(h, 'main'), (x, y) => !isWisp(x, y)), wisp = keep(piece(h, 'main'), isWisp);
  const sb = bounds(spiral)!;
  const cx = (sb[0] + sb[2] + 1) / 2, cy = (sb[1] + sb[3] + 1) / 2;
  // The vortex proper (his bright spiral and its dark rim): it turns inside its own disc.
  const R = 15.5;
  const inDisc = (x: number, y: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= R;
  const body = union(hm, spiral);
  const disc = keep(body, inDisc);
  // Frame 0 is his head as he painted it (his head starts exactly two braid periods after the
  // tile, so it runs on from the tile's end; its first 2 columns are the tile's, so the joint is
  // clean). In the other frames his ribbons left of the vortex slide on into it with the stream
  // and the braid follows them in from the last tile, so the joint is seamless in every frame.
  const HEAD_JOINT = Math.round(cx);
  const slide = (ix: Ix, s: number, withTile: boolean): Ix => {
    const out = keep(ix, (x) => x >= HEAD_JOINT);
    for (let y = 0; y < h.h; y++)
      for (let x = 0; x < HEAD_JOINT; x++) {
        const sx = x - s;
        const v = sx >= 0 ? at(ix, sx, y) : withTile ? at(tm, ((sx % t.w) + t.w) % t.w, y) : 0;
        if (v) out.d[y * h.w + x] = v;
      }
    return out;
  };
  const RIM = KIND.indexOf('outline') + 1;
  const heads = range(6).map((i) => {
    const s = STREAM_SHIFT[i];
    const w = move(wisp, [0, 1, 1, 1, 0, 0][i], [0, 0, -1, -1, -1, 0][i]);
    if (!i) {
      const f0 = union(body);
      for (let y = 0; y < h.h; y++) for (let x = 0; x < 2; x++) f0.d[y * h.w + x] = at(tm, x, y);
      return render(h.w, h.h, [[hs], [f0], [w], [sparks]]);
    }
    // The ribbons swallowed by the vortex: they end at its rim, where his dark rim covers the cut.
    const flow = keep(slide(body, s, true), (x, y) => !inDisc(x, y));
    for (let y = 0; y < h.h; y++)
      for (let x = 0; x < HEAD_JOINT; x++) {
        const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (r > R && r <= R + 1.2 && flow.d[y * h.w + x] && LAB[flow.d[y * h.w + x] - 1][0] > 45) flow.d[y * h.w + x] = RIM;
      }
    // The spiral turns a sixth of a turn a frame inside its disc (4 sub-samples a pixel).
    const sp = turnInside(disc, cx, cy, (i / 6) * TAU, 1, inDisc);
    return render(h.w, h.h, [[slide(hs, s, false)], [flow], [sp], [w], [twinkle(sparks, i, 0.34, 707)]]);
  });
  return [
    sprite(t, 'Genjutsu stream: braided magenta ribbons (tileable 64 px)', { fly: { frames: tiles.map((ix) => render(t.w, t.h, [[ix]])), fps: 12, loop: true } }),
    sprite(h, 'Genjutsu stream head: spiral vortex', { fly: { frames: heads, fps: 12, loop: true } }),
  ];
}

// --- hit: a starburst that flashes up to his picture and breaks up -----------------------------------

function hit(): WorldSprite {
  const k = key('hit');
  const m = union(piece(k, 'main'), piece(k, 'smoke'));
  const d = (x: number, y: number) => Math.hypot(x - k.ax, y - k.ay);
  // The spikes fly outward (more toward their tips); what reaches the frame's edge goes.
  const outward = (ix: Ix, push: number) =>
    inside(displace(ix, (x, y) => {
      const r = d(x, y), s = smooth(8, 30, r) * push;
      return r ? [((x - k.ax) / r) * s, ((y - k.ay) / r) * s] : [0, 0];
    }), 1);
  const fr: Canvas[] = [];
  // 0-1: a white-hot flash grows into the burst; 2: his picture; 3-5: it flies apart and dies.
  fr.push(render(k.w, k.h, [[tone(scaleAbout(m, k.ax, k.ay, 0.34), 4)]]));
  fr.push(render(k.w, k.h, [[tone(scaleAbout(m, k.ax, k.ay, 0.72), 2)]]));
  fr.push(render(k.w, k.h, [[m]]));
  fr.push(render(k.w, k.h, [[tone(outward(m, 2), (x, y) => (d(x, y) < 10 ? -1 : 0))]]));
  fr.push(render(k.w, k.h, [[dissolve(tone(outward(m, 3), -2), 0.3, 811), 0.85]]));
  fr.push(render(k.w, k.h, [[dissolve(tone(outward(m, 4), -3), 0.62, 812), 0.6]]));
  return sprite(k, 'Genjutsu hit: violet and magenta star-burst', { hit: { frames: fr, fps: 15, loop: false } });
}

// --- blast: the column of violet light out of a swirling pool ----------------------------------------

function blast(): WorldSprite {
  const k = key('blast', pad(2));
  const pool = piece(k, 'pool'), col = piece(k, 'column'), fx = piece(k, 'main'), sm = piece(k, 'smoke');
  const pb = bounds(pool)!;
  // The pool lies on the ground: its own ellipse (centre and height / width) is what turns.
  const pcx = (pb[0] + pb[2] + 1) / 2, pcy = (pb[1] + pb[3] + 1) / 2;
  const squash = clamp((pb[3] - pb[1]) / (pb[2] - pb[0]), 0.2, 0.6);
  const cb = bounds(col)!;
  const colBottom = cb[3], colH = colBottom - cb[1];
  const DEG = Math.PI / 180;
  const fr: Canvas[] = [];
  for (let i = 0; i < 8; i++) {
    // The vortex turns 8 degrees a frame inside its own outline (frame 3 is his picture).
    const poolS = [0.3, 0.6, 0.86, 1, 1, 1, 0.97, 0.92][i];
    const poolA = [1, 1, 1, 1, 1, 1, 0.85, 0.6][i];
    let p = i === 3 ? pool : turnInside(pool, pcx, pcy, (i - 3) * 8 * DEG, squash);
    if (poolS < 1) p = scaleAbout(p, k.ax, k.ay, poolS);
    // Dying: each colour steps down its own hue ramp (the vortex darkens, it never greys).
    if (i >= 6) p = tone(p, i === 6 ? -1 : -2);
    // The column shoots up out of the pool, white-hot at its front, then flickers and lifts away.
    let c = col;
    const reach = [0, 0.3, 0.72, 1, 1, 1, 1, 1][i];
    // Its front is ragged in streaks (each column of light ends at its own height): the last
    // 12 px fade out in steps, white-hot just below. It starts narrow and widens.
    const front = (x: number) => colBottom - colH * reach + snoise(x, i, 2.5, 925) * 9;
    let colFront: ((x: number, y: number) => number) | undefined;
    if (reach < 1) {
      c = scaleAbout(col, k.ax, colBottom, [1, 0.62, 0.86][i], 1);
      c = tone(keep(c, (x, y) => y >= front(x)), (x, y) => (y < front(x) + 10 ? 2 : y < front(x) + 22 ? 1 : 0));
      colFront = (x, y) => Math.ceil(clamp((y - front(x)) / 12, 0, 1) * 4) / 4;
    }
    if (i === 4 || i === 5) c = inside(displace(col, wobble((i - 3) / 6, 1.6, 5, 930, 1)), 1);
    if (i >= 6) {
      // The light goes out from the top down: each streak ends lower (ragged, in ordered alpha
      // steps), and what is left steps down its own hue ramp. It stays opaque, so it darkens
      // to violet instead of greying over the pool; no specks, no holes.
      const gone = (x: number) => cb[1] + colH * (i === 6 ? 0.32 : 0.66) + snoise(x, i, 2, 945) * 8;
      c = tone(col, i === 6 ? -1 : -3);
      colFront = (x, y) => Math.ceil(clamp((y - gone(x)) / 12, 0, 1) * 4) / 4;
    }
    const colA = 1;
    // The feathers, sparkles and splashes burst out with the column and drift away.
    let f = fx;
    if (i < 3) f = i < 2 ? none(k) : keep(scaleAbout(fx, k.ax, k.ay - 30, 0.85), (x, y) => hash(x >> 2, y >> 2, 950) > 0.3);
    if (i > 3) {
      const u = (i - 3) / 4;
      f = inside(twinkle(displace(fx, (x, y) => {
        const r = Math.hypot(x - k.ax, (y - k.ay) * 1.6) || 1;
        return [((x - k.ax) / r) * 10 * u, -9 * u];
      }), i, 0.3, 960), 1);
    }
    const fA = [0, 0, 1, 1, 1, 1, 0.8, 0.5][i];
    const smA = [0, 0.35, 0.75, 1, 1, 1, 0.8, 0.5][i];
    // The dark smoke rises with the column (below its front), then drifts up.
    const s = i > 3 ? inside(move(displace(sm, wobble((i - 3) / 6, 1.4, 5, 970, 1)), 0, -(i - 3) * 2), 1) : reach < 1 ? keep(sm, (x, y) => y >= front(x) + 4 || y > k.ay - 26) : sm;
    fr.push(render(k.w, k.h, [[p, poolA], [s, smA], [c, colA, undefined, colFront], [f, fA]], k.fade));
  }
  return sprite(k, 'Genjutsu blast: column of violet light out of a swirling vortex, with crow feathers', { blast: { frames: fr, fps: 12, loop: false } });
}

// --- walls: amethyst crystal pillars wrapped in black thorns -------------------------------------------

/**
 * The crystals push up out of the ground in a stagger (each pillar its own beat), clipped at the
 * ground line, with a white-hot glint at their tops while they climb.
 */
function emerge(cr: Ix, ground: number, p: (x: number) => number, height: number): Ix {
  const out = blank(cr.w, cr.h);
  for (let y = 0; y < cr.h; y++)
    for (let x = 0; x < cr.w; x++) {
      const lift = Math.round((1 - p(x)) * height);
      if (lift && y > ground) continue;
      out.d[y * cr.w + x] = at(cr, x, y - lift);
    }
  return out;
}

/** Clears the outer `m` px of an image (particles drifting off the frame go at its edge). */
const inside = (ix: Ix, m: number): Ix => keep(ix, (x, y) => x >= m && y >= m && x < ix.w - m && y < ix.h - m);

/** A glint: a slanted band of light running over the crystals, at phase t. */
function glint(ix: Ix, t: number, x0: number, x1: number): Ix {
  const span = x1 - x0 + 60;
  const c = x0 - 30 + span * t;
  return tone(ix, (x, y, v = at(ix, x, y)) => (KIND[v - 1] === 'body' && Math.abs(x + y * 0.6 - c - 0.6 * 60) < 3 ? 2 : 0));
}

function wall(): WorldSprite {
  const k = key('wall', pad(2));
  const cr = piece(k, 'main'), vines = piece(k, 'vines'), bits = piece(k, 'bits'), sm = piece(k, 'smoke');
  const cb = bounds(cr)!;
  const ground = k.ay + 2;
  const H = k.ay - cb[1];
  const top = new Int32Array(k.w).fill(k.h);
  for (let y = k.h - 1; y >= 0; y--) for (let x = 0; x < k.w; x++) if (at(cr, x, y)) top[x] = y;
  // Each of his pillars (between his seams) rises whole, on its own beat.
  const pillar = (x: number) => k.seams.filter((sx) => sx <= x).length;
  const beat = (x: number) => hash(pillar(x), 3, 1011);
  const rise: Canvas[] = [];
  for (let r = 0; r < 6; r++) {
    const T = (r + 1) / 5;
    const p = (x: number) => (r >= 5 ? 1 : smooth(beat(x) * 0.45, beat(x) * 0.45 + 0.55, T));
    let c = emerge(cr, ground, p, H);
    // A white-hot glint on the tops while they climb.
    if (r < 5) c = tone(c, (x, y) => (p(x) < 1 && y < top[x] + Math.round((1 - p(x)) * H) + 5 ? 2 : 0));
    // The thorns climb after the crystals; the petals and feathers come last.
    const vr = [0, 0, 0.25, 0.6, 0.9, 1][r];
    const vb = bounds(vines);
    const v = vb ? keep(vines, (_x, y) => y >= vb[3] - (vb[3] - vb[1] + 2) * vr) : vines;
    rise.push(render(k.w, k.h, [[sm, [0, 0, 0.4, 0.7, 1, 1][r]], [c], [v], [bits, [0, 0, 0, 0.4, 0.8, 1][r]]]));
  }
  const idle = range(6).map((i) => {
    if (!i) return render(k.w, k.h, [[sm], [cr], [vines], [bits]]);
    const t = i / 6;
    const c = glint(cr, t, cb[0], cb[2]);
    // The thorn tips sway a pixel; the bits drift and bob.
    const v = displace(vines, (x, y) => [(Math.sin(t * TAU + x * 0.07) - Math.sin(x * 0.07)) * smooth(k.ay - 10, k.ay - 50, y) * 1.2, 0]);
    const b = displace(bits, (x) => [0, Math.round(Math.sin(t * TAU + x * 0.13) - Math.sin(x * 0.13))]);
    return render(k.w, k.h, [[displace(sm, wobble(t, 1, 5, 1020))], [c], [v], [b]]);
  });
  return sprite(k, 'Genjutsu wall: amethyst crystal pillars in black thorns (4.5 m x 1.8 m)', {
    rise: { frames: rise, fps: 12, loop: false },
    idle: { frames: idle, fps: 8, loop: true },
  });
}

/**
 * The 3/4 and end-on walls: the crystals push up out of the ground, translated column by column
 * and clipped at each column's ground line (never scaled or sheared).
 */
function wall3d(name: 'wall_diag' | 'wall_depth', label: string, idleN: number, seed: number): WorldSprite {
  const room = name === 'wall_diag' ? { l: 2, t: 2, r: 0, b: 2 } : pad(2);
  const k = key(name, room);
  const main = piece(k, 'main'), col = piece(k, 'column'), bits = piece(k, 'bits'), sm = piece(k, 'smoke'), stain = piece(k, 'stain');
  const all = union(main, col);
  const ab = bounds(all)!;
  const stainB = bounds(stain);
  // Each column's ground: on the 3/4 wall, his slanted foot line (the near-left foot about
  // (-95, +45) from the anchor, the far end about (+95, -55), along the crystal bases, a few px
  // of base below it); end-on, each column's lowest pixel (the ground runs back into the screen).
  const footLow = new Int32Array(k.w).fill(-1);
  for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) if (at(all, x, y)) footLow[x] = y;
  const ground = name === 'wall_diag'
    ? (x: number) => Math.round(k.ay + 45 - ((x - (k.ax - 95)) * 100) / 190 + 6)
    : (x: number) => (footLow[x] >= 0 ? footLow[x] : ab[3]);
  // What stands on the ground (crystals) rises; what lies in front of the foot line (brambles,
  // shards and the splash on the ground) comes up after, with the bits.
  const up = keep(all, (x, y) => y <= ground(x));
  const front = keep(all, (x, y) => y > ground(x));
  const top = new Int32Array(k.w).fill(-1);
  for (let y = k.h - 1; y >= 0; y--) for (let x = 0; x < k.w; x++) if (at(up, x, y)) top[x] = y;
  let hMax = 0;
  for (let x = 0; x < k.w; x++) if (top[x] >= 0) hMax = Math.max(hMax, ground(x) - top[x] + 1);
  const rise: Canvas[] = [];
  for (let r = 0; r < 6; r++) {
    const T = [0.18, 0.4, 0.62, 0.82, 0.95, 1][r];
    let a: Ix;
    if (r >= 5) a = all;
    else {
      // 3/4: a wave from the near end to the far end; end-on: the column all at once.
      const t = name === 'wall_diag' ? (x: number) => smooth(0, 1, T * 1.7 - 0.7 * ((x - ab[0]) / (ab[2] - ab[0]))) : () => T;
      const lift = (x: number) => Math.round((1 - t(x)) * hMax);
      a = emergeCols(up, ground, lift);
      // White-hot at their tops while they climb (one step up each colour's own ramp, two at the tip).
      a = tone(a, (x, y) => (lift(x) > 0 && top[x] >= 0 ? (y < top[x] + lift(x) + 3 ? 2 : y < top[x] + lift(x) + 7 ? 1 : 0) : 0));
      const fa = [0, 0, 0.4, 0.7, 1][r];
      if (fa > 0) a = union(a, fa >= 1 ? front : keep(front, (x, y) => hash(x >> 1, y >> 1, seed + 3) < fa));
    }
    // The long shadow stretches out from the wall's foot as the wall grows; the smoke comes up
    // with the crystals (none above their growing tops).
    const sl = stainB ? stainB[0] + (stainB[2] - stainB[0] + 1) * [0.12, 0.3, 0.55, 0.8, 0.95, 1][r] : 0;
    const st = r >= 5 ? stain : keep(stain, (x) => x <= sl);
    const reachTop = ab[3] - (ab[3] - ab[1]) * T - 10;
    const s = r >= 5 ? sm : keep(sm, (_x, y) => y >= reachTop);
    rise.push(render(k.w, k.h, [[st, [0.4, 0.6, 0.8, 1, 1, 1][r]], [s, [0, 0.3, 0.6, 0.8, 1, 1][r]], [a], [bits, [0, 0, 0, 0.4, 0.8, 1][r]]], k.fade));
  }
  const idle = range(idleN).map((i) => {
    if (!i) return render(k.w, k.h, [[stain], [sm], [all], [bits]], k.fade);
    const t = i / idleN;
    const a = glint(all, t, ab[0], ab[2]);
    const b = displace(bits, (x) => [0, Math.round(Math.sin(t * TAU + x * 0.13) - Math.sin(x * 0.13))]);
    return render(k.w, k.h, [[stain], [displace(sm, wobble(t, 1, 5, seed + 20))], [a], [b]], k.fade);
  });
  return sprite(k, label, { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 8, loop: true } });
}

// --- aura: violet flames round the figure, in two layers -----------------------------------------------

function aura(): WorldSprite[] {
  const kb = key('aura_back', pad(2));
  const kf = key('aura', pad(2));
  if (kb.ax !== kf.ax || kb.ay !== kf.ay || kb.w !== kf.w || kb.h !== kf.h) throw new Error('vfx-genjutsu-v3: the aura layers do not line up');
  const back = union(piece(kb, 'main'), piece(kb, 'smoke'));
  const ring = union(piece(kf, 'main'), piece(kf, 'smoke')), petals = piece(kf, 'petals');
  const backFr: Canvas[] = [], frontFr: Canvas[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    // The flames lick upward (the noise rises through them), more toward their tips.
    const w = wobble(t, 2.2, 6, 1200, 1);
    const b = i ? displace(back, (x, y) => {
      const [dx, dy] = w(x, y);
      const up = clamp((kb.ay - y) / 90, 0.25, 1);
      return [dx * up, dy * up * 0.8];
    }) : back;
    const lit = [0, 1, 0, -1, 0, 1][i];
    backFr.push(render(kb.w, kb.h, [[tone(b, (x, y) => (KIND[at(b, x, y) - 1] === 'glow' ? lit : 0))]]));
    // In front: the petals drift and turn a little, the ring at the feet flickers.
    const p = i ? displace(petals, (x, y) => [Math.round(Math.sin(t * TAU + y * 0.2) - Math.sin(y * 0.2)), Math.round(Math.cos(t * TAU + x * 0.3) - Math.cos(x * 0.3))]) : petals;
    const front = veil(kf, i);
    front.draw(render(kf.w, kf.h, [[tone(ring, lit)], [p]]), 0, 0);
    frontFr.push(front);
  }
  return [
    sprite(kf, 'Genjutsu aura, front layer (draw OVER the character): the violet veil over the body, petals, feathers, the ring at the feet', { idle: { frames: frontFr, fps: 10, loop: true } }),
    sprite(kb, 'Genjutsu aura, back layer (draw BEHIND the character): dark violet flames and smoke', { idle: { frames: backFr, fps: 10, loop: true } }),
  ];
}

/**
 * The violet veil over the body, as in his picture, where the figure is seen through the genjutsu
 * (the owner chose this for the lightning aura too). Measured on his sheet by laying his plain
 * character (beside the blast) over his character in the aura panel: about a quarter of a
 * violet-magenta (116, 57, 126) over the body, light in the middle and stronger toward the rim.
 * A soft field round the body, not the shape of any one character, so it sits right on every
 * figure; it breathes with the frames.
 */
function veil(k: Key, frame: number): Canvas {
  const c = new Canvas(k.w, k.h);
  // Fitted to a 96 px figure standing on the anchor (feet): x -25..+17, y -93..+2 (characterRef).
  const cx = k.ax - 4, cy = k.ay - 46, rx = 22, ry = 49;
  const breathe = 1 + 0.12 * Math.sin((frame / 6) * TAU);
  for (let y = 0; y < k.h; y++)
    for (let x = 0; x < k.w; x++) {
      const r = Math.hypot((x - cx) / rx, (y - cy) / ry);
      let a = (0.18 + 0.16 * smooth(0.4, 0.78, r)) * (1 - smooth(0.78, 1, r)) * breathe;
      a = Math.round(a / 0.06) * 0.06;
      if (a <= 0) continue;
      const t = smooth(0.4, 1, r);
      const ch = (from: number, to: number) => Math.round((from + (to - from) * t) / 8) * 8;
      c.set(x, y, [ch(112, 152), ch(54, 60), ch(124, 178), Math.round(Math.min(1, a) * 255)]);
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

export function genjutsuV3Sprites(): WorldSprite[] {
  const [streamTile, streamHead] = stream();
  const [auraFront, auraBack] = aura();
  return [
    bolt(),
    streamTile,
    streamHead,
    breath(),
    sphere(),
    slash(),
    multi(),
    hit(),
    blast(),
    wall(),
    auraFront,
    auraBack,
    wall3d('wall_diag', 'Genjutsu wall, 3/4: crystal pillars, brambles and a long shadow (4.5 m x 1.8 m, turned 45 degrees)', 4, 1300),
    wall3d('wall_depth', 'Genjutsu wall, end-on: crystal column with shards, feathers and orbs (running into the screen)', 4, 1400),
  ];
}

/** The order of the old group's manifest (beast second), with aura_back after aura. */
const ORDER = ['bolt', 'beast', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi', 'hit', 'blast', 'wall', 'aura', 'aura_back', 'wall_diag', 'wall_depth'];

/**
 * writeGroup into a temp folder, add the beast (sheet and manifest entry copied through unchanged
 * from the old group), then move each file into the group (PNGs first, manifest last).
 */
function writeGroupWhole(sprites: WorldSprite[], root: string): void {
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
  const sp: Record<string, unknown> = { ...man.sprites, beast: oldMan.sprites.beast };
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
  const sprites = genjutsuV3Sprites();
  const bad = sprites.flatMap(borderCheck);
  if (bad.length) throw new Error('vfx-genjutsu-v3: art on the frame border:\n  ' + bad.join('\n  '));
  writeGroupWhole(sprites, worldOut);
  for (const s of sprites) {
    const f = Object.values(s.anims)[0].frames[0];
    console.log(`${s.name.padEnd(12)} ${`${f.w}x${f.h}`.padEnd(8)} anchor ${s.anchor.join(',').padEnd(8)} ` + Object.entries(s.anims).map(([n, a]) => `${n} ${a.frames.length}f@${a.fps}`).join(', '));
  }
  console.log(`wrote ${sprites.length} sprites + beast (copied) to ${join(worldOut, GROUP)}`);
}
