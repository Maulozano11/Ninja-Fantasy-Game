// Lightning jutsu VFX, v3: rebuilt to the owner's own paint-over of the lightning sheet
// (REF-lightning-set-owner.jpg). He asked for his examples to be copied as exactly as possible,
// so every sprite's KEY frame is his picture: art2/vfx-lightning-v3-extract.py cut his panels out
// at game scale (his character is 96 px tall, like ours), removed his background, character and
// labels, quantized his pixels to one palette sampled from his image, put a 1 px deep-blue outline
// round the strokes and kept his soft glow as semi-transparent pixels. That data is in
// vfx-lightning-v3-refdata.ts; this generator only DERIVES the other frames from those key frames:
//
//   - fly loops    frame 0 is his picture; frames 1-3 re-route the arcs with small smooth
//                  displacements (none at the projectile's core) and flicker the brightness;
//   - stream       his 64 px tile, scrolled 16 px a frame along the beam (still tiles);
//   - hit / blast  grow or reveal up to his picture, then crackle, dim and fade;
//   - walls        'rise' grows the posts out of the ground, then the arcs out from the posts;
//                  'idle' is his picture, then re-routed and flickering variants;
//   - aura         his picture, then re-routed and flickering variants (the middle stays clear).
//
//   WORLD_OUT=<dir> npx tsx tools/world-sprites/vfx-lightning-v3.ts
//
// Writes <dir>/vfx_lightning_v3/ (one PNG per sprite + manifest.json). It refuses to run without
// WORLD_OUT, so it never writes into src/assets; every file is written whole (temp, then rename);
// the output is deterministic (no Math.random). `beast` is not in this group (another artist).

import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, Color, PX_PER_M, WorldSprite, hash, noise, writeGroup } from './kit';
import { LV3_PAL, LV3_REF, RefKind } from './vfx-lightning-v3-refdata';

const GROUP = 'vfx_lightning_v3';
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, t: number): number => {
  const u = clamp((t - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};

// --- the palette ------------------------------------------------------------------------------

const PAL: Color[] = LV3_PAL.map((p) => {
  const h = p.rgba.slice(1);
  return [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16)) as Color;
});
const KIND: RefKind[] = LV3_PAL.map((p) => p.kind);
/** Each kind's entries from dim to bright, and every entry's place in its ramp. */
const RAMP: Record<string, number[]> = {};
LV3_PAL.forEach((p, i) => (RAMP[p.kind] ??= []).push(i));
for (const k of Object.keys(RAMP)) RAMP[k].sort((a, b) => LV3_PAL[a].order - LV3_PAL[b].order);
const POS = LV3_PAL.map((p, i) => RAMP[p.kind].indexOf(i));

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
  if (i !== w * h) throw new Error(`vfx-lightning-v3: bad run-length data (${i} of ${w * h} px)`);
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
 * Brighter or dimmer by `k` steps along each pixel's own ramp: strokes toward white or blue, glow
 * and ground toward more or less alpha (a glow dimmed past its faintest step goes). Outlines keep.
 */
function level(ix: Ix, k: number | ((x: number, y: number) => number), kinds?: RefKind[]): Ix {
  return remap(ix, (v, x, y) => {
    const i = v - 1, kind = KIND[i];
    const s = typeof k === 'number' ? k : k(x, y);
    if (!s || kind === 'outline' || (kinds && !kinds.includes(kind))) return v;
    const r = RAMP[kind], p = POS[i] + s;
    if (p < 0) return kind === 'glow' || kind === 'ground' ? 0 : r[0] + 1;
    return r[Math.min(r.length - 1, p)] + 1;
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

/** A crackle: arcs re-routed by a smooth random field of up to `amp` px, scaled by weight(x, y). */
function crackle(ix: Ix, amp: number, cell: number, seed: number, weight: (x: number, y: number) => number = () => 1, perX = 0): Ix {
  return displace(
    ix,
    (x, y) => {
      const w = weight(x, y);
      if (w <= 0) return [0, 0];
      return [snoise(x, y, cell, seed, perX) * amp * w, snoise(x, y, cell, seed + 7, perX) * amp * w];
    },
    perX > 0,
  );
}

/** Clears a clustered share `p` (0..1) of the pixels: lightning breaking up as it dies. */
const dissolve = (ix: Ix, p: number, seed: number, cell = 3): Ix =>
  p <= 0 ? ix : keep(ix, (x, y) => noise(x, y, cell, seed) * 0.8 + hash(x, y, seed + 1) * 0.2 >= p);

/**
 * Light dying away: every stroke, outline and glow pixel steps `steps` down the ladder (white,
 * blue, outline blue, glow, gone), keeping its shape. Other kinds are left to the layer's alpha.
 */
function dim(ix: Ix, steps: number | ((x: number, y: number) => number)): Ix {
  return remap(ix, (v, x, y) => {
    const lp = LPOS[v - 1];
    const k = typeof steps === 'number' ? steps : steps(x, y);
    if (lp < 0 || k <= 0) return v;
    return lp - k < 0 ? 0 : LADDER[lp - k] + 1;
  });
}

/** The picture scaled by s (sy vertically) about (cx, cy), nearest pixel: for growing effects. */
const scaleAbout = (ix: Ix, cx: number, cy: number, s: number, sy = s): Ix =>
  displace(ix, (x, y) => [(x - cx) * (1 - 1 / s), (y - cy) * (1 - 1 / sy)]);

/** Keeps the pixels within `r` px (Chebyshev) of any pixel of `of`: a halo following a shape. */
function near_(ix: Ix, of: Ix, r: number): Ix {
  const m = blank(ix.w, ix.h);
  for (let y = 0; y < of.h; y++)
    for (let x = 0; x < of.w; x++)
      if (of.d[y * of.w + x])
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++) {
            const X = x + dx, Y = y + dy;
            if (X >= 0 && Y >= 0 && X < m.w && Y < m.h) m.d[Y * m.w + X] = 1;
          }
  return keep(ix, (x, y) => m.d[y * m.w + x] === 1);
}

/** Stamps src into dst at (x, y) (non-clear pixels only). */
function stamp(dst: Ix, src: Ix, x: number, y: number): void {
  for (let yy = 0; yy < src.h; yy++)
    for (let xx = 0; xx < src.w; xx++) {
      const v = src.d[yy * src.w + xx];
      const X = x + xx, Y = y + yy;
      if (v && X >= 0 && Y >= 0 && X < dst.w && Y < dst.h) dst.d[Y * dst.w + X] = v;
    }
}

type Fade = Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
/** A layer: an indexed image, an alpha factor and the fade toward the frame sides it gets. */
type Layer = [Ix, number?, Fade?];

/** The fade ladder, faint to bright: glow, the deep-blue outline, then the strokes (blue to white). */
const LADDER = [...RAMP.glow, ...RAMP.outline.slice(0, 1), ...RAMP.stroke];
const LPOS = LV3_PAL.map((_, i) => LADDER.indexOf(i));

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
 * Renders indexed layers into a canvas, later layers on top. Toward a faded side (where his art ran
 * off his panel) strokes step down the ladder (white, blue, outline blue, glow, gone), so a bolt
 * dies away into its own glow instead of greying; other pixels lose alpha in four steps.
 */
function render(w: number, h: number, layers: Layer[], fade?: Fade): Canvas {
  const c = new Canvas(w, h);
  for (const [ix, k = 1, own] of layers) {
    if (k <= 0) continue;
    const f = own ?? fade;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let v = ix.d[y * ix.w + x];
        if (!v) continue;
        let a = k;
        const t = fadeT(f, x, y, w, h);
        if (t < 1) {
          const lp = LPOS[v - 1];
          if (lp >= 0) {
            const np = lp - Math.round((1 - t) * LADDER.length);
            if (np < 0) continue;
            v = LADDER[np] + 1;
          } else a *= Math.floor(t * 4) / 4;
        }
        const p = PAL[v - 1];
        if (a <= 0) continue;
        c.plot(x, y, a >= 1 ? p : [p[0], p[1], p[2], Math.round(p[3] * a)]);
      }
  }
  return c;
}

// --- the key frames ---------------------------------------------------------------------------

/** Room added round every frame so the crackle never pushes art onto the frame's border. */
const PAD = 3;

interface Key {
  name: string;
  w: number;
  h: number;
  ax: number;
  ay: number;
  /** Every piece as a full-frame layer: main, stain, sparks, bolt, posts... */
  p: Record<string, Ix>;
  fade: Fade;
}

function key(name: string, pad: { l: number; t: number; r: number; b: number } = { l: PAD, t: PAD, r: PAD, b: PAD }): Key {
  const s = LV3_REF[name];
  if (!s) throw new Error(`vfx-lightning-v3: no reference data for "${name}"`);
  const w = s.w + pad.l + pad.r, h = s.h + pad.t + pad.b;
  const p: Record<string, Ix> = {};
  for (const [pn, pc] of Object.entries(s.pieces)) {
    const layer = blank(w, h);
    stamp(layer, decode(pc.rle, pc.w, pc.h), pc.x + pad.l, pc.y + pad.t);
    p[pn] = layer;
  }
  const fade = { ...s.fade };
  // Fades are measured from the art's old frame edge, so pad them by the room added.
  if (fade.top) fade.top += pad.t;
  if (fade.right) fade.right += pad.r;
  return { name, w, h, ax: s.anchor[0] + pad.l, ay: s.anchor[1] + pad.t, p, fade };
}
const none = (k: Key): Ix => blank(k.w, k.h);
const piece = (k: Key, n: string): Ix => k.p[n] ?? none(k);

// --- motion over time --------------------------------------------------------------------------
// The owner found the first cut too fast ("a flashing star"), so every in-between now moves a
// little, continuously: t is the time in cycles of a loop (or a running clock for one-shots), and
// every effect below is exactly nothing at t = 0, so frame 0 / the peak stays his picture.

/** Frame i of an n-frame loop, as a time in cycles. */
const cyc = (i: number, n: number): number => i / n;
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/**
 * Churn: the arcs drift along a smooth random field that circles once per cycle, so they re-route
 * a little from frame to frame (about a pixel), never jumping. weight(x, y) scales it per pixel.
 */
function churn(ix: Ix, t: number, amp: number, cell: number, seed: number, weight: (x: number, y: number) => number = () => 1, perX = 0): Ix {
  const s = Math.sin(TAU * t), c = (1 - Math.cos(TAU * t)) * 0.6;
  if (!s && !c) return ix;
  return displace(
    ix,
    (x, y) => {
      const w = weight(x, y) * amp;
      if (w <= 0) return [0, 0];
      return [(snoise(x, y, cell, seed, perX) * s + snoise(x, y, cell, seed + 3, perX) * c) * w, (snoise(x, y, cell, seed + 7, perX) * s + snoise(x, y, cell, seed + 11, perX) * c) * w];
    },
    perX > 0,
  );
}

/**
 * Shimmer: soft waves of brightness (one ramp step up or down) drift across the art, each region
 * at its own time, so the light flickers here and there but the whole sprite never jumps at once.
 */
function shimmer(ix: Ix, t: number, seed: number, cell = 14, kinds: RefKind[] = ['stroke', 'glow'], perX = 0): Ix {
  return level(
    ix,
    (x, y) => {
      const ph = (snoise(x, y, cell, seed, perX) + 1) * 0.75;
      return Math.round(0.6 * (Math.sin(TAU * (t + ph)) - Math.sin(TAU * ph)));
    },
    kinds,
  );
}

/** The picture turned by `ang` radians about (cx, cy) (nearest pixel). */
const rotateAbout = (ix: Ix, cx: number, cy: number, ang: number): Ix =>
  displace(ix, (x, y) => {
    const dx = x - cx, dy = y - cy, c = Math.cos(ang), s = Math.sin(ang);
    return [x - (cx + dx * c + dy * s), y - (cy - dx * s + dy * c)];
  });

/**
 * Sparks twinkle: each whole spark (8-connected) goes out for a `share` of the cycle, at its own
 * time, never at t = 0 (so frame 0 keeps all of his sparks).
 */
function twinkle(sp: Ix, t: number, share: number, seed: number): Ix {
  const id = new Int32Array(sp.w * sp.h).fill(-1);
  const out = blank(sp.w, sp.h);
  const ft = t - Math.floor(t);
  for (let start = 0; start < sp.d.length; start++) {
    if (!sp.d[start] || id[start] >= 0) continue;
    const comp: number[] = [start];
    id[start] = start;
    for (let q = 0; q < comp.length; q++) {
      const x = comp[q] % sp.w, y = Math.floor(comp[q] / sp.w);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy, n = Y * sp.w + X;
          if (X >= 0 && Y >= 0 && X < sp.w && Y < sp.h && sp.d[n] && id[n] < 0) {
            id[n] = start;
            comp.push(n);
          }
        }
    }
    const h = 0.06 + hash(start % sp.w, Math.floor(start / sp.w), seed) * (0.9 - share);
    if (ft >= h && ft < h + share) continue;
    for (const n of comp) out.d[n] = sp.d[n];
  }
  return out;
}

// --- sprites --------------------------------------------------------------------------------------

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

/** Frames and fps of the fly loops (the owner asked for more, smoother frames). */
const FLY_N = 8, FLY_FPS = 12;

/**
 * A projectile's fly loop of FLY_N frames: frame 0 is his picture; the arcs then churn (not within
 * `core` px of the anchor, fully beyond core + 10), the light shimmers and the sparks twinkle.
 */
function flyLoop(k: Key, opts: { amp?: number; cell?: number; core?: number; seed: number; weight?: (x: number, y: number) => number }): Canvas[] {
  const amp = opts.amp ?? 1.6, cell = opts.cell ?? 9, core = opts.core ?? 6;
  const weight = opts.weight ?? ((x: number, y: number) => smooth(core, core + 10, Math.hypot(x - k.ax, y - k.ay)));
  return range(FLY_N).map((i) => {
    const t = cyc(i, FLY_N);
    const m = shimmer(churn(piece(k, 'main'), t, amp, cell, opts.seed, weight), t, opts.seed + 50);
    return render(k.w, k.h, [[m], [twinkle(piece(k, 'sparks'), t, 0.3, opts.seed + 5)]], k.fade);
  });
}
const fly = (frames: Canvas[]) => ({ fly: { frames, fps: FLY_FPS, loop: true } });

function bolt(): WorldSprite {
  const k = key('bolt');
  return sprite(k, 'Lightning bolt (spark ball)', fly(flyLoop(k, { seed: 100, core: 5 })));
}

function breath(): WorldSprite {
  const k = key('breath');
  // The breath's anchor is 48 px right of the caster's hands; its arcs churn more away from them.
  const ox = k.ax - 48, oy = k.ay;
  return sprite(k, 'Lightning breath (forked cone, origin left middle)', fly(flyLoop(k, { seed: 200, amp: 1.8, weight: (x, y) => smooth(6, 30, Math.hypot(x - ox, y - oy)) })));
}

function sphere(): WorldSprite {
  const k = key('sphere');
  // The orb holds still (it is the projectile's core) while its filaments shimmer; the arcs round
  // it churn, and the rings sway back and forth about it.
  const R = 21;
  const out = (x: number, y: number) => smooth(R, R + 6, Math.hypot(x - k.ax, y - k.ay));
  const fr = range(FLY_N).map((i) => {
    const t = cyc(i, FLY_N);
    const m = shimmer(churn(piece(k, 'main'), t, 1.5, 8, 300, out), t, 350, 10);
    const sp = rotateAbout(piece(k, 'sparks'), k.ax, k.ay, 0.06 * Math.sin(TAU * t));
    return render(k.w, k.h, [[m], [shimmer(sp, t, 360, 12, ['cream'])]]);
  });
  return sprite(k, 'Lightning sphere (thunder sphere)', fly(fr));
}

function slash(): WorldSprite {
  const k = key('slash');
  return sprite(k, 'Lightning slash (electric crescent)', fly(flyLoop(k, { seed: 400, amp: 1.3, core: 4 })));
}

function multi(): WorldSprite {
  const k = key('multi');
  // The three needles' heads hold their shape; their crackling trails behind them churn.
  const trails = (x: number) => smooth(k.ax + 12, k.ax - 2, x);
  return sprite(k, 'Lightning multi (thunder needles)', fly(flyLoop(k, { seed: 500, amp: 1.4, core: 0, weight: trails })));
}

// --- the stream: his 64 px tile, flowing along the beam, and its head --------------------------------

/** The tile scrolls this many px a frame (64 / FLY_N: one tile per loop). */
const STREAM_SHIFT = 64 / FLY_N;
/** The beam's core rows (within this many px of the centre line) never move. */
const STREAM_CORE = 5;
/** The head's left columns are the scrolled tile itself, so the joint is seamless in every frame. */
const HEAD_JOINT = 26;

function streamTile(k: Key, i: number): Ix {
  const m = piece(k, 'main');
  if (!i) return m;
  const t = cyc(i, FLY_N);
  const shifted = displace(m, () => [STREAM_SHIFT * i, 0], true);
  // Everything here is periodic in x over 64 px, so every frame still tiles.
  const c = churn(shifted, t, 1.2, 8, 600, (_x, y) => smooth(STREAM_CORE, STREAM_CORE + 6, Math.abs(y - k.ay)), 64);
  return shimmer(c, t, 650, 16, ['stroke', 'glow'], 64);
}

/** The tile stays exactly 64x64 with its centre line on y = 32 (the renderer tiles it as before). */
function streamPad(): { l: number; t: number; r: number; b: number } {
  return { l: 0, t: 0, r: 0, b: 0 };
}

function stream(): WorldSprite[] {
  const t = key('stream', streamPad());
  const tiles = range(FLY_N).map((i) => streamTile(t, i));
  const h = key('stream_head', { ...streamPad(), r: PAD });
  if (h.ay !== t.ay) throw new Error('vfx-lightning-v3: the stream head and tile centre lines differ');
  const heads = range(FLY_N).map((i) => {
    const tt = cyc(i, FLY_N);
    const w = (x: number, y: number) => smooth(HEAD_JOINT, HEAD_JOINT + 12, x) * smooth(3, 10, Math.hypot(x - 38, y - h.ay));
    let m = shimmer(churn(piece(h, 'main'), tt, 1.6, 8, 700, w), tt, 750);
    // The joint: the head's first columns are this frame's tile, continued.
    m = keep(m, (x) => x >= HEAD_JOINT);
    stamp(m, keep(tiles[i], (x) => x < HEAD_JOINT), 0, 0);
    return render(h.w, h.h, [[m], [twinkle(piece(h, 'sparks'), tt, 0.3, 705)]]);
  });
  return [
    sprite(t, 'Lightning stream (beam, tileable 64 px)', fly(tiles.map((ix) => render(t.w, t.h, [[ix]])))),
    sprite(h, 'Lightning stream head', fly(heads)),
  ];
}

// --- hit: a starburst that builds up to his picture, holds, and breaks up slowly ---------------------

function hit(): WorldSprite {
  // More room than the others: its spikes fly on outward as it breaks up.
  const k = key('hit', { l: 7, t: 7, r: 7, b: 7 });
  const m = piece(k, 'main');
  const sp = piece(k, 'sparks');
  const d = (x: number, y: number) => Math.hypot(x - k.ax, y - k.ay);
  // Pushes the spikes outward by `push` px (more at their tips), for the burst flying apart.
  const outward = (ix: Ix, push: number) =>
    displace(ix, (x, y) => {
      const r = d(x, y), s = smooth(14, 34, r) * push;
      return r ? [((x - k.ax) / r) * s, ((y - k.ay) / r) * s] : [0, 0];
    });
  const PEAK = 3;
  const fr: Canvas[] = [];
  // 0-2: the burst builds up: his picture growing out of its core, one step hot; its size grows
  //      by square roots (50%, 71%, 87%), so its light grows evenly toward the peak.
  for (const [s, hot] of [[0.5, 1], [0.71, 1], [0.87, 0]] as const)
    fr.push(render(k.w, k.h, [[level(scaleAbout(m, k.ax, k.ay, s), hot, ['stroke'])], [scaleAbout(sp, k.ax, k.ay, s)]]));
  // 3: his picture. 4-5: it holds, the spikes churning a little.
  fr.push(render(k.w, k.h, [[m], [sp]]));
  for (const i of [4, 5]) {
    const t = (i - PEAK) / 16;
    fr.push(render(k.w, k.h, [[shimmer(churn(outward(m, i - PEAK - 1), t, 1.4, 8, 810), t, 820)], [outward(sp, i - PEAK)]]));
  }
  // 6-11: it breaks up slowly: the core shrinks and cools, the spikes fly on and scatter, the light
  //       steps down the ladder (white, blue, glow, gone) and the sparks drift off.
  // One smooth radial field, so the core and the spikes never come apart at a seam: within ~12 px
  // the burst draws in by `shrink`, beyond ~20 px it flies out by `push`.
  const breakUp = (ix: Ix, shrink: number, push: number) =>
    displace(ix, (x, y) => {
      const r = d(x, y);
      if (!r) return [0, 0];
      const s = -shrink * r * (1 - smooth(8, 20, r)) + push * smooth(12, 34, r);
      return [((x - k.ax) / r) * s, ((y - k.ay) / r) * s];
    });
  const cool = [1, 2, 4, 6, 9, 13];
  for (let j = 0; j < 6; j++) {
    const t = (6 + j - PEAK) / 16;
    const m2 = churn(breakUp(m, 0.06 + j * 0.07, 2 + j * 1.5), t, 1.4, 8, 810, (x, y) => smooth(10, 20, d(x, y)));
    fr.push(render(k.w, k.h, [[dim(m2, cool[j])], [twinkle(outward(sp, 4 + j * 1.6), t * 2, 0.15 + j * 0.08, 830), 1 - j * 0.1]]));
  }
  return sprite(k, 'Lightning hit (spark burst)', { hit: { frames: fr, fps: 12, loop: false } });
}

// --- blast: a strike from the sky --------------------------------------------------------------------

function blast(): WorldSprite {
  const k = key('blast');
  const M = piece(k, 'main'), stain = piece(k, 'stain'), sp = piece(k, 'sparks');
  const top = bounds(M)![1];
  // 0 on the ground, rising to 1 for the bolt high above it: the bolt and the ground crackle are
  // one picture, told apart smoothly so no seam shows between them.
  const above = (y: number) => smooth(k.ay - 8, k.ay - 70, y);
  // The ground is seen at a slant: distances on it are squashed 2.2 times vertically.
  const d = (x: number, y: number) => Math.hypot(x - k.ax, (y - k.ay) * 2.2);
  // Sparks thrown up and out from the impact as the strike ends.
  const throwSparks = (ix: Ix, t: number) =>
    displace(ix, (x, y) => {
      const r = Math.hypot(x - k.ax, y - k.ay) || 1;
      return [((x - k.ax) / r) * 10 * t, ((y - k.ay) / r) * 6 * t - 8 * t + 10 * t * t];
    });
  const hold = (x: number, y: number) => smooth(4, 22, Math.hypot(x - k.ax, y - k.ay));
  const PEAK = 4;
  const fr: Canvas[] = [];
  // 0-3: anticipation. The charge gathers high in the sky, then the leader feels its way down
  //      (his bolt to a ragged front, blue, with a hot tip) while the ground below starts to glow,
  //      and on frame 3 the bolt touches down and the crackle races out from the impact.
  const front = (x: number, f: number) => top + (k.ay - top) * f + snoise(x, 0, 6, 901) * 5;
  const leader = (f: number, cool: number) =>
    dim(keep(M, (x, y) => y < front(x, f) && above(y) > 0.3), (x, y) => (y > front(x, f) - 7 ? 0 : cool));
  const groundGlow = (steps: number) => dim(keep(M, (_x, y) => above(y) <= 0.3), (x, y) => Math.round(steps + clamp((d(x, y) - 18) / 70, 0, 1) * 10));
  fr.push(render(k.w, k.h, [[stain, 0.15], [groundGlow(14)], [leader(0.2, 4)]], k.fade));
  fr.push(render(k.w, k.h, [[stain, 0.35], [groundGlow(9)], [leader(0.5, 3)]], k.fade));
  fr.push(render(k.w, k.h, [[stain, 0.6], [groundGlow(5)], [leader(0.8, 2)]], k.fade));
  const burst = dim(M, (x, y) => Math.round(clamp((d(x, y) - 18) / 70, 0, 1) * 6 * (1 - above(y))));
  fr.push(render(k.w, k.h, [[scaleAbout(stain, k.ax, k.ay, 0.9), 0.85], [burst], [twinkle(sp, 0.5, 0.5, 905)]], k.fade));
  // 4: his picture. 5-6: it holds, churning a little (the impact holds still).
  fr.push(render(k.w, k.h, [[stain], [M], [sp]], k.fade));
  for (const i of [5, 6]) {
    const t = (i - PEAK) / 24;
    fr.push(render(k.w, k.h, [[stain], [shimmer(churn(M, t, 1.6, 10, 913, hold), t, 917)], [throwSparks(sp, (i - PEAK) * 0.08)]], k.fade));
  }
  // 7-15: the long settle. The light steps down the ladder, the bolt high up first, while the
  //       ground crackle keeps churning and cools; the sparks are thrown out and fall; the dark
  //       scorch is left and the last glints die.
  const boltK = [2, 4, 6, 9, 12, 15, 18, 21, 24], groundK = [1, 1, 2, 3, 4, 6, 8, 10, 13];
  for (let j = 0; j < 9; j++) {
    const t = (7 + j - PEAK) / 24;
    const m = dim(churn(M, t, 1.7, 10, 913, hold), (_x, y) => Math.round(groundK[j] + (boltK[j] - groundK[j]) * above(y)));
    const sparks = twinkle(throwSparks(sp, 0.24 + j * 0.11), t, 0.15 + j * 0.07, 921);
    fr.push(render(k.w, k.h, [[stain, 1 - Math.max(0, j - 4) * 0.05], [m], [sparks, 1 - j * 0.08]], k.fade));
  }
  return sprite(k, 'Lightning blast (thunder strike from the sky)', { blast: { frames: fr, fps: 12, loop: false } });
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

// --- walls: an electric fence -----------------------------------------------------------------------

/** The fence's posts (x centres and feet) found in the 'posts' piece, left to right. */
function posts(ix: Ix): { x: number; foot: number; top: number }[] {
  const col = new Array(ix.w).fill(0);
  for (let y = 0; y < ix.h; y++) for (let x = 0; x < ix.w; x++) if (ix.d[y * ix.w + x]) col[x]++;
  const out: { x: number; foot: number; top: number }[] = [];
  for (let x = 0; x < ix.w; ) {
    if (!col[x]) {
      x++;
      continue;
    }
    let x1 = x, sum = 0, wsum = 0;
    while (x1 < ix.w && col[x1]) {
      sum += x1 * col[x1];
      wsum += col[x1];
      x1++;
    }
    const cx = Math.round(sum / wsum);
    let foot = 0, top = ix.h;
    for (let y = 0; y < ix.h; y++)
      for (let xx = x; xx < x1; xx++)
        if (ix.d[y * ix.w + xx]) {
          foot = Math.max(foot, y);
          top = Math.min(top, y);
        }
    out.push({ x: cx, foot, top });
    x = x1;
  }
  return out;
}

/** Walls: rise plays once, then idle loops (the owner asked for more, slower frames). */
const RISE_N = 12, RISE_FPS = 12, IDLE_N = 8, IDLE_FPS = 10;

/**
 * A fence wall ('wall' or 'wall_diag'). rise: the posts grow out of the ground with a white-hot
 * tip, then the arcs crackle out from the posts and join; it ends at his picture. idle: his
 * picture, then the arcs re-routed (they stay pinned at the posts) and flickering.
 */
function fence(name: 'wall' | 'wall_diag', label: string, seed: number): WorldSprite {
  const k = key(name);
  const P = piece(k, 'posts'), M = piece(k, 'main'), ST = piece(k, 'stain'), SP = piece(k, 'sparks');
  // The 3/4 wall's ground strip ran off his panel's right edge: it dies away over a longer stretch.
  const stFade: Fade | undefined = name === 'wall_diag' ? { ...k.fade, right: 56 } : undefined;
  const ps = posts(P);
  if (ps.length !== 5) throw new Error(`vfx-lightning-v3: ${name} has ${ps.length} posts, expected 5`);
  // The ground line runs through the posts' feet (a least-squares line).
  const n = ps.length, mx = ps.reduce((s, p) => s + p.x, 0) / n, my = ps.reduce((s, p) => s + p.foot, 0) / n;
  const slope = ps.reduce((s, p) => s + (p.x - mx) * (p.foot - my), 0) / ps.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const groundY = (x: number) => my + (x - mx) * slope;
  const height = (x: number, y: number) => groundY(x) - y;
  const postH = Math.max(...ps.map((p) => p.foot - p.top));
  const near = (x: number) => Math.min(...ps.map((p) => Math.abs(x - p.x)));
  const spacing = (ps[n - 1].x - ps[0].x) / (n - 1);
  const glowOnly = (ix: Ix) => keep(ix, (x, y) => KIND[ix.d[y * ix.w + x] - 1] === 'glow');
  // The 3/4 wall's ground strip is softened into a glow on the ground (the owner chose it over
  // his flat strip, which sat heavy on the grass); the straight wall keeps his stain as it is.
  const withStain = (st: Layer, rest: Layer[]): Canvas => {
    if (name !== 'wall_diag') return render(k.w, k.h, [st, ...rest], k.fade);
    const c = softGround(render(k.w, k.h, [st], k.fade));
    c.draw(render(k.w, k.h, rest, k.fade), 0, 0);
    return c;
  };
  // rise, RISE_N frames: the posts grow out of the ground (white-hot tips, their glow following),
  // then the arcs crawl out from the posts and join, and the strip glows up; the last frame is
  // his picture, ready for idle.
  const rise: Canvas[] = [];
  const postK = [0.08, 0.18, 0.31, 0.46, 0.62, 0.78, 0.9, 1, 1, 1, 1, 1];
  // How far (px) the arcs have crawled out from the nearest post; it keeps growing past half the
  // post spacing so the 3/4 wall's dense arcs beyond its far post crawl in too.
  const reachPx = [0, 0, 0, 0, 4, 8, 13, 19, 27, 40, 64, Infinity];
  const stainK = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.88, 0.94, 1, 1];
  for (let r = 0; r < RISE_N; r++) {
    if (r === RISE_N - 1) {
      rise.push(withStain([ST, 1, stFade], [[M], [P], [SP]]));
      break;
    }
    const ph = postK[r] * postH;
    const growing = postK[r] < 1;
    const grown = level(keep(P, (x, y) => height(x, y) <= ph + 2), (x, y) => (growing && height(x, y) > ph - 5 ? 2 : 0));
    // Each row of arcs reaches its own length, with a bright front while it crawls.
    const reach = (_x: number, y: number) => reachPx[r] * (0.75 + 0.5 * noise(0, y, 4, seed + 31));
    const crawling = reachPx[r] > 0 && reachPx[r] < Infinity;
    let arcs = keep(M, (x, y) => {
      const h = height(x, y), dn = near(x);
      if (h <= 9 && dn <= 12) return true; // the charged feet glow from the start
      return reachPx[r] > 0 && h <= ph + 3 && dn <= reach(x, y);
    });
    const t = r / 24;
    arcs = churn(arcs, t, 1.2, 8, seed + 40, (x) => smooth(2, 9, near(x)));
    if (crawling) arcs = level(arcs, (x, y) => (near(x) > reach(x, y) - 5 ? 1 : 0), ['stroke']);
    if (r === RISE_N - 2) arcs = level(arcs, -1, ['glow']); // still charging, then settles into idle
    const halo = postK[r] < 1 || crawling ? near_(glowOnly(M), grown, 3) : none(k);
    const sparks = reachPx[r] >= 13 ? keep(twinkle(SP, t, 0.3, seed + 3), (x, y) => near(x) <= reach(x, y)) : none(k);
    rise.push(withStain([ST, stainK[r], stFade], [[halo], [arcs], [grown], [sparks]]));
  }
  // idle, IDLE_N frames: his picture, then the arcs churn (pinned at the posts), the light
  // shimmers and the sparks twinkle.
  const idle = range(IDLE_N).map((i) => {
    const t = cyc(i, IDLE_N);
    const arcs = shimmer(churn(M, t, 1.4, 9, seed + 20, (x) => smooth(2, 9, near(x))), t, seed + 25);
    return withStain([shimmer(ST, t, seed + 27, 24, ['ground']), 1, stFade], [[arcs], [shimmer(P, t, seed + 29, 20, ['stroke'])], [twinkle(SP, t, 0.3, seed + 9)]]);
  });
  return sprite(k, label, { rise: { frames: rise, fps: RISE_FPS, loop: false }, idle: { frames: idle, fps: IDLE_FPS, loop: true } });
}

/** The fence end-on: tall columns of lightning. rise shoots them up from the ground; idle churns. */
function wallDepth(): WorldSprite {
  const k = key('wall_depth');
  const M = piece(k, 'main'), SP = piece(k, 'sparks');
  const b = bounds(M)!;
  const bottom = b[3];
  const base = (_x: number, y: number) => smooth(bottom, bottom - 14, y);
  const rise: Canvas[] = [];
  const riseK = [0.08, 0.16, 0.26, 0.37, 0.49, 0.61, 0.72, 0.82, 0.9, 0.96, 1, 1];
  const hotK = [2, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0];
  for (let r = 0; r < RISE_N; r++) {
    if (r === RISE_N - 1) {
      rise.push(render(k.w, k.h, [[M], [SP]]));
      break;
    }
    // His columns stretched up from their base, hot while they shoot up.
    let m = riseK[r] < 1 ? scaleAbout(M, k.ax, bottom, 1, riseK[r]) : M;
    m = level(churn(m, r / 24, 1.2, 8, 1100, base), hotK[r], ['stroke']);
    if (r === RISE_N - 2) m = level(m, -1, ['glow']);
    rise.push(render(k.w, k.h, [[m], [riseK[r] >= 0.9 ? twinkle(SP, r / 24, 0.4, 1105) : none(k)]]));
  }
  const idle = range(IDLE_N).map((i) => {
    const t = cyc(i, IDLE_N);
    return render(k.w, k.h, [[shimmer(churn(M, t, 1.4, 9, 1120, base), t, 1125)], [twinkle(SP, t, 0.3, 1130)]]);
  });
  return sprite(k, 'Lightning wall, end-on (fence, 4.5 m x 1.8 m, running into the screen)', {
    rise: { frames: rise, fps: RISE_FPS, loop: false },
    idle: { frames: idle, fps: IDLE_FPS, loop: true },
  });
}

/**
 * A ground stain made soft: blurred (colour weighted by alpha, so the edges keep their blue), at
 * half strength, in stepped alpha so it stays pixel art. The frame's outer pixel ring stays clear.
 */
function softGround(c: Canvas): Canvas {
  const { w, h } = c;
  const R = 4, SIGMA = 2.2;
  const kern = Array.from({ length: R * 2 + 1 }, (_, i) => Math.exp(-((i - R) ** 2) / (2 * SIGMA * SIGMA)));
  const ksum = kern.reduce((a, b) => a + b, 0);
  const chans = [0, 1, 2, 3].map(() => new Float64Array(w * h));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = c.get(x, y), a = p[3] / 255, i = y * w + x;
      chans[0][i] = p[0] * a;
      chans[1][i] = p[1] * a;
      chans[2][i] = p[2] * a;
      chans[3][i] = a;
    }
  const pass = (src: Float64Array, dx: number, dy: number): Float64Array => {
    const out = new Float64Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let v = 0;
        for (let t = -R; t <= R; t++) {
          const sx = clamp(x + t * dx, 0, w - 1), sy = clamp(y + t * dy, 0, h - 1);
          v += src[sy * w + sx] * kern[t + R];
        }
        out[y * w + x] = v / ksum;
      }
    return out;
  };
  const [r, g, b, a] = chans.map((ch) => pass(pass(ch, 1, 0), 0, 1));
  const out = new Canvas(w, h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const al = Math.round((a[i] * 0.5 * 255) / 20) * 20;
      if (al <= 0) continue;
      const ch = (v: number) => clamp(Math.round(v / a[i] / 12) * 12, 0, 255);
      out.set(x, y, [ch(r[i]), ch(g[i]), ch(b[i]), Math.min(255, al)]);
    }
  return out;
}

// --- aura --------------------------------------------------------------------------------------------

/** The aura's idle loop (the owner asked for more, slower frames). */
const AURA_N = 12, AURA_FPS = 10;

function aura(): WorldSprite {
  const k = key('aura');
  const M = piece(k, 'main'), SP = piece(k, 'sparks');
  // His picture, then the arcs churn (the feet's anchor holds), the light shimmers, the sparks
  // twinkle and the veil over the body breathes.
  const fr = range(AURA_N).map((i) => {
    const t = cyc(i, AURA_N);
    const m = shimmer(churn(M, t, 1.5, 8, 1200), t, 1250);
    const c = veil(k, i);
    c.draw(render(k.w, k.h, [[m], [twinkle(SP, t, 0.3, 1210)]]), 0, 0);
    return c;
  });
  return sprite(k, 'Lightning aura (charge / buff)', { idle: { frames: fr, fps: AURA_FPS, loop: true } });
}

/**
 * The blue veil over the body, as in his picture, where the figure is seen through the charge (the
 * owner chose it over a clear middle). A soft field round the body, brighter toward its rim, not
 * the shape of any one character, so it sits right on every figure. It breathes with the frames.
 */
function veil(k: Key, frame: number): Canvas {
  const c = new Canvas(k.w, k.h);
  const cx = k.ax, cy = k.ay - 50, rx = 23, ry = 55;
  const breathe = 1 + 0.1 * Math.sin(frame * 1.05);
  for (let y = 0; y < k.h; y++)
    for (let x = 0; x < k.w; x++) {
      const r = Math.hypot((x - cx) / rx, (y - cy) / ry);
      let a = (0.4 + 0.14 * smooth(0.55, 0.95, r)) * (1 - smooth(0.92, 1.04, r)) * breathe;
      a = Math.round(a / 0.07) * 0.07;
      if (a <= 0) continue;
      const t = smooth(0.35, 1, r);
      const ch = (from: number, to: number) => Math.round((from + (to - from) * t) / 12) * 12;
      c.set(x, y, [ch(40, 104), ch(84, 180), ch(190, 252), Math.round(Math.min(1, a) * 255)]);
    }
  return c;
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

export function lightningV3Sprites(): WorldSprite[] {
  return [
    bolt(),
    ...stream(),
    breath(),
    sphere(),
    slash(),
    multi(),
    hit(),
    blast(),
    fence('wall', 'Lightning wall (fence, 4.5 m x 1.8 m)', 1000),
    fence('wall_diag', 'Lightning wall, 3/4 (fence, 4.5 m x 1.8 m, turned 45 degrees)', 1050),
    wallDepth(),
    aura(),
  ];
}

/** writeGroup into a temp folder, then move each file into the group (PNGs first, manifest last). */
function writeGroupWhole(sprites: WorldSprite[], root: string): void {
  const tmpRoot = join(root, `.${GROUP}-tmp`);
  rmSync(tmpRoot, { recursive: true, force: true });
  writeGroup(GROUP, sprites, tmpRoot);
  const src = join(tmpRoot, GROUP), dest = join(root, GROUP);
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(src).sort((a, b) => Number(a === 'manifest.json') - Number(b === 'manifest.json') || a.localeCompare(b));
  for (const f of files) renameSync(join(src, f), join(dest, f));
  rmSync(tmpRoot, { recursive: true, force: true });
}

if (process.argv[1] && /vfx-lightning-v3\.ts$/.test(process.argv[1])) {
  // Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
  const worldOut = process.env.WORLD_OUT;
  if (!worldOut) throw new Error('vfx-lightning-v3: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
  const sprites = lightningV3Sprites();
  const bad = sprites.flatMap(borderCheck);
  if (bad.length) throw new Error('vfx-lightning-v3: art on the frame border:\n  ' + bad.join('\n  '));
  writeGroupWhole(sprites, worldOut);
  for (const s of sprites) {
    const f = Object.values(s.anims)[0].frames[0];
    console.log(`${s.name.padEnd(12)} ${`${f.w}x${f.h}`.padEnd(8)} anchor ${s.anchor.join(',').padEnd(8)} ` + Object.entries(s.anims).map(([n, a]) => `${n} ${a.frames.length}f`).join(', '));
  }
  console.log(`wrote ${sprites.length} sprites to ${join(worldOut, GROUP)}`);
}
