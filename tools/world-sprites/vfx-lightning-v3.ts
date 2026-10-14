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
function near(ix: Ix, of: Ix, r: number): Ix {
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

/** Sparks twinkle: in some frames some of them are out or dimmer. */
function twinkle(sp: Ix, frame: number, share: number, seed: number): Ix {
  return keep(sp, (x, y) => hash(Math.floor(x / 5), Math.floor(y / 5), seed + frame * 31) >= share);
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

/**
 * A projectile's fly loop: frame 0 is his picture. Frames 1-3 re-route the arcs (no move within
 * `core` px of the anchor, full move beyond core + 10) and flicker the strokes and glow.
 */
function flyLoop(k: Key, opts: { amp?: number; cell?: number; core?: number; seed: number; still?: (x: number, y: number) => boolean }): Canvas[] {
  const amp = opts.amp ?? 1.6, cell = opts.cell ?? 9, core = opts.core ?? 6;
  const weight = (x: number, y: number) => (opts.still?.(x, y) ? 0 : smooth(core, core + 10, Math.hypot(x - k.ax, y - k.ay)));
  const glowK = [0, 1, 1, -1], strokeK = [0, 0, 1, -1];
  return [0, 1, 2, 3].map((i) => {
    let m = piece(k, 'main');
    if (i) {
      m = crackle(m, amp, cell, opts.seed + i * 13, weight);
      m = level(m, glowK[i], ['glow']);
      m = level(m, strokeK[i], ['stroke']);
    }
    const sp = i ? twinkle(piece(k, 'sparks'), i, 0.35, opts.seed + 5) : piece(k, 'sparks');
    return render(k.w, k.h, [[m], [sp]], k.fade);
  });
}

function bolt(): WorldSprite {
  const k = key('bolt');
  return sprite(k, 'Lightning bolt (spark ball)', { fly: { frames: flyLoop(k, { seed: 100, core: 5 }), fps: 12, loop: true } });
}

function breath(): WorldSprite {
  const k = key('breath');
  // The breath's anchor is 48 px right of the caster's hands; its arcs jitter more away from them.
  const ox = k.ax - 48, oy = k.ay;
  const fr = [0, 1, 2, 3].map((i) => {
    let m = piece(k, 'main');
    if (i) {
      m = crackle(m, 1.8, 9, 200 + i * 13, (x, y) => smooth(6, 30, Math.hypot(x - ox, y - oy)));
      m = level(m, [0, 1, 1, -1][i], ['glow']);
      m = level(m, [0, 0, 1, -1][i], ['stroke']);
    }
    const sp = i ? twinkle(piece(k, 'sparks'), i, 0.35, 205) : piece(k, 'sparks');
    return render(k.w, k.h, [[m], [sp]]);
  });
  return sprite(k, 'Lightning breath (forked cone, origin left middle)', { fly: { frames: fr, fps: 12, loop: true } });
}

function sphere(): WorldSprite {
  const k = key('sphere');
  // The orb holds still (it is the projectile's core); its filaments flicker, the rings and the
  // arcs round it are re-routed.
  const R = 21;
  const fr = [0, 1, 2, 3].map((i) => {
    let m = piece(k, 'main');
    let sp = piece(k, 'sparks');
    if (i) {
      const out = (x: number, y: number) => smooth(R, R + 6, Math.hypot(x - k.ax, y - k.ay));
      m = crackle(m, 1.5, 8, 300 + i * 13, out);
      m = level(m, (x, y) => (Math.hypot(x - k.ax, y - k.ay) < R ? [0, 1, -1, 1][i] : [0, 1, 0, -1][i]), ['stroke']);
      m = level(m, [0, 1, 1, -1][i], ['glow']);
      sp = crackle(sp, 1, 10, 310 + i * 13, out);
      sp = level(sp, [0, 1, -1, 0][i], ['cream']);
    }
    return render(k.w, k.h, [[m], [sp]]);
  });
  return sprite(k, 'Lightning sphere (thunder sphere)', { fly: { frames: fr, fps: 12, loop: true } });
}

function slash(): WorldSprite {
  const k = key('slash');
  return sprite(k, 'Lightning slash (electric crescent)', { fly: { frames: flyLoop(k, { seed: 400, amp: 1.3, core: 4 }), fps: 12, loop: true } });
}

function multi(): WorldSprite {
  const k = key('multi');
  return sprite(k, 'Lightning multi (thunder needles)', { fly: { frames: flyLoop(k, { seed: 500, amp: 1.4, core: 3 }), fps: 12, loop: true } });
}

// --- the stream: his 64 px tile, scrolled along the beam, and its head --------------------------------

const STREAM_SHIFT = 16;
/** The beam's core rows (within this many px of the centre line) never move. */
const STREAM_CORE = 5;
/** The head's left columns are the scrolled tile itself, so the joint is seamless in every frame. */
const HEAD_JOINT = 26;

function streamTile(k: Key, i: number): Ix {
  const m = piece(k, 'main');
  if (!i) return m;
  const shifted = displace(m, () => [STREAM_SHIFT * i, 0], true);
  let t = crackle(shifted, 1.2, 8, 600 + i * 13, (_x, y) => smooth(STREAM_CORE, STREAM_CORE + 6, Math.abs(y - k.ay)), 64);
  t = level(t, [0, 1, 1, -1][i], ['glow']);
  t = level(t, [0, 0, 1, 0][i], ['stroke']);
  return t;
}

function streamPad(): { l: number; t: number; r: number; b: number } {
  return { l: 0, t: PAD, r: 0, b: PAD };
}

function stream(): WorldSprite[] {
  const t = key('stream', streamPad());
  const tiles = [0, 1, 2, 3].map((i) => streamTile(t, i));
  const h = key('stream_head', { ...streamPad(), r: PAD });
  if (h.ay !== t.ay) throw new Error('vfx-lightning-v3: the stream head and tile centre lines differ');
  const heads = [0, 1, 2, 3].map((i) => {
    let m = piece(h, 'main');
    let sp = piece(h, 'sparks');
    if (i) {
      m = crackle(m, 1.6, 8, 700 + i * 13, (x, y) => smooth(HEAD_JOINT, HEAD_JOINT + 12, x) * smooth(3, 10, Math.hypot(x - 38, y - h.ay)));
      m = level(m, [0, 1, 1, -1][i], ['glow']);
      m = level(m, [0, 0, 1, 0][i], ['stroke']);
      sp = twinkle(sp, i, 0.35, 705);
    }
    // The joint: the head's first columns are this frame's tile, continued.
    m = keep(m, (x) => x >= HEAD_JOINT);
    stamp(m, keep(tiles[i], (x) => x < HEAD_JOINT), 0, 0);
    return render(h.w, h.h, [[m], [sp]]);
  });
  return [
    sprite(t, 'Lightning stream (beam, tileable 64 px)', { fly: { frames: tiles.map((ix) => render(t.w, t.h, [[ix]])), fps: 12, loop: true } }),
    sprite(h, 'Lightning stream head', { fly: { frames: heads, fps: 12, loop: true } }),
  ];
}

// --- hit: a starburst that flashes up to his picture and breaks up ------------------------------------

function hit(): WorldSprite {
  const k = key('hit');
  const m = piece(k, 'main');
  const sp = piece(k, 'sparks');
  const d = (x: number, y: number) => Math.hypot(x - k.ax, y - k.ay);
  // Pushes the spikes outward by `push` px (more at their tips), for the burst flying apart.
  const outward = (ix: Ix, push: number) =>
    displace(ix, (x, y) => {
      const r = d(x, y), s = smooth(14, 34, r) * push;
      return r ? [((x - k.ax) / r) * s, ((y - k.ay) / r) * s] : [0, 0];
    });
  const fr: Canvas[] = [];
  // 0: the flash at the core.
  fr.push(render(k.w, k.h, [[level(keep(m, (x, y) => d(x, y) <= 8), 2)]]));
  // 1: the burst grows (his picture up to 60% of its reach), still white-hot.
  fr.push(render(k.w, k.h, [[level(keep(m, (x, y) => d(x, y) <= 22), 1)]]));
  // 2: his picture.
  fr.push(render(k.w, k.h, [[m], [sp]]));
  // 3: the spikes fly out and re-route, the core cools a step.
  fr.push(render(k.w, k.h, [[level(crackle(outward(m, 2), 1.4, 8, 813), (x, y) => (d(x, y) < 12 ? -1 : 0))], [outward(sp, 3)]]));
  // 4: breaking up.
  fr.push(render(k.w, k.h, [[level(dissolve(outward(m, 4), 0.45, 814), -2), 0.85], [outward(sp, 6)]]));
  // 5: the last forks and sparks.
  fr.push(render(k.w, k.h, [[level(dissolve(keep(outward(m, 6), (x, y) => d(x, y) > 16), 0.7, 815), -3), 0.6], [twinkle(outward(sp, 9), 5, 0.4, 816)]]));
  return sprite(k, 'Lightning hit (spark burst)', { hit: { frames: fr, fps: 12, loop: false } });
}

// --- blast: a strike from the sky --------------------------------------------------------------------

function blast(): WorldSprite {
  const k = key('blast');
  const bolt = piece(k, 'bolt'), ground = piece(k, 'main'), stain = piece(k, 'stain'), sp = piece(k, 'sparks');
  const bb = bounds(bolt);
  const top = bb ? bb[1] : 0;
  const d = (x: number, y: number) => Math.hypot(x - k.ax, (y - k.ay) * 2.2);
  const R = 150;
  // Sparks thrown up and out from the impact as the strike ends.
  const fly = (ix: Ix, t: number) =>
    displace(ix, (x, y) => {
      const r = Math.hypot(x - k.ax, y - k.ay) || 1;
      return [((x - k.ax) / r) * 10 * t, ((y - k.ay) / r) * 6 * t - 8 * t + 10 * t * t];
    });
  const fr: Canvas[] = [];
  // 0: the leader feels its way down from the sky (the top 45% of his bolt, dim and blue).
  fr.push(render(k.w, k.h, [[level(keep(bolt, (_x, y) => y < top + (k.ay - top) * 0.45), -2)]], k.fade));
  // 1: the bolt reaches the ground, white-hot; the flash and the stain start at the impact.
  fr.push(
    render(k.w, k.h, [
      [stain, 0.5],
      [level(keep(ground, (x, y) => d(x, y) < R * 0.22), 1)],
      [level(bolt, 1)],
    ], k.fade),
  );
  // 2: his picture.
  fr.push(render(k.w, k.h, [[stain], [ground], [bolt], [sp]], k.fade));
  // 3: the return stroke: the bolt re-routes and flashes, the crackle runs on along the ground.
  fr.push(
    render(k.w, k.h, [
      [stain],
      [level(crackle(ground, 1.4, 9, 913, (x, y) => smooth(6, 24, d(x, y))), 1, ['glow'])],
      [level(crackle(bolt, 1.6, 10, 914, (x, y) => smooth(4, 20, Math.hypot(x - k.ax, y - k.ay)) * 0.7 + 0.3), 1)],
      [fly(sp, 0.25)],
    ], k.fade),
  );
  // 4: the bolt flickers out; the ground crackle dims.
  fr.push(
    render(k.w, k.h, [
      [stain],
      [level(crackle(ground, 1.6, 9, 915, (x, y) => smooth(6, 24, d(x, y))), -1)],
      [level(dissolve(bolt, 0.55, 916, 4), -3), 0.6],
      [fly(sp, 0.5)],
    ], k.fade),
  );
  // 5: the bolt is gone; the crackle breaks up.
  fr.push(render(k.w, k.h, [[stain], [level(dissolve(crackle(ground, 1.8, 9, 917), 0.45, 918), -2), 0.85], [twinkle(fly(sp, 0.75), 5, 0.3, 919)]], k.fade));
  // 6: last forks on the scorch.
  fr.push(render(k.w, k.h, [[stain, 0.9], [level(dissolve(ground, 0.78, 920), -3), 0.6], [twinkle(fly(sp, 1), 6, 0.6, 921)]], k.fade));
  // 7: the scorch is left.
  fr.push(render(k.w, k.h, [[level(stain, -1), 0.75], [level(dissolve(ground, 0.93, 922), -4), 0.4]], k.fade));
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
  const rise: Canvas[] = [];
  const postK = [0.18, 0.5, 0.85, 1, 1, 1];
  const arcK = [0, 0, 0.22, 0.6, 1, 1];
  const stainK = [0.25, 0.5, 0.75, 1, 1, 1];
  for (let r = 0; r < 6; r++) {
    const ph = postK[r] * postH;
    // The posts, with a white-hot growing tip.
    const grown = level(keep(P, (x, y) => height(x, y) <= ph + 2), (x, y) => (r < 3 && height(x, y) > ph - 5 ? 2 : 0));
    // The arcs: out from the posts, and only up to the posts' height; the charged feet glow from the start.
    let arcs = keep(M, (x, y) => {
      const h = height(x, y), dn = near(x);
      if (h <= 9 && dn <= 12) return true;
      return h <= ph + 3 && (dn <= arcK[r] * spacing * 0.5 || arcK[r] >= 1);
    });
    if (r === 2 || r === 3) arcs = level(crackle(arcs, 1.2, 8, seed + r), -1);
    if (r === 4) arcs = level(arcs, -1, ['glow']);
    const sparks = r >= 3 ? twinkle(SP, r, r === 3 ? 0.5 : 0.2, seed + 3) : none(k);
    let c = render(k.w, k.h, [[ST, stainK[r], stFade], [arcs], [grown], [sparks]], k.fade);
    if (r === 5) c = render(k.w, k.h, [[ST, 1, stFade], [level(M, 1, ['stroke'])], [level(P, 1)], [SP]], k.fade);
    rise.push(c);
  }
  const idle: Canvas[] = [];
  for (let i = 0; i < 4; i++) {
    let arcs = M, pp = P, st = ST;
    if (i) {
      arcs = crackle(M, 1.4, 9, seed + 20 + i * 13, (x) => smooth(2, 9, near(x)));
      arcs = level(arcs, [0, 1, 1, -1][i], ['glow']);
      arcs = level(arcs, [0, 0, 1, -1][i], ['stroke']);
      pp = level(P, [0, 0, 1, 0][i]);
      st = level(ST, [0, 0, 1, 0][i]);
    }
    const sparks = i ? twinkle(SP, i, 0.35, seed + 9) : SP;
    idle.push(render(k.w, k.h, [[st, 1, stFade], [arcs], [pp], [sparks]], k.fade));
  }
  return sprite(k, label, { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 12, loop: true } });
}

/** The fence end-on: tall columns of lightning. rise grows them from the near end up; idle crackles. */
function wallDepth(): WorldSprite {
  const k = key('wall_depth');
  const M = piece(k, 'main'), SP = piece(k, 'sparks');
  const b = bounds(M)!;
  const top = b[1], bottom = b[3], H = bottom - top;
  const rise: Canvas[] = [];
  const riseK = [0.2, 0.45, 0.7, 0.9, 1, 1];
  for (let r = 0; r < 6; r++) {
    const front = bottom - riseK[r] * H;
    let m = keep(M, (_x, y) => y >= front - 1);
    if (r < 4) m = level(m, (_x, y) => (y < front + 6 ? 2 : 0));
    if (r === 2 || r === 3) m = crackle(m, 1.2, 8, 1100 + r);
    if (r === 4) m = level(m, -1, ['glow']);
    if (r === 5) m = level(M, 1, ['stroke']);
    rise.push(render(k.w, k.h, [[m], [r >= 4 ? SP : none(k)]]));
  }
  const idle = [0, 1, 2, 3].map((i) => {
    let m = M;
    if (i) {
      m = crackle(M, 1.4, 9, 1120 + i * 13, (_x, y) => smooth(bottom, bottom - 14, y));
      m = level(m, [0, 1, 1, -1][i], ['glow']);
      m = level(m, [0, 0, 1, -1][i], ['stroke']);
    }
    return render(k.w, k.h, [[m], [i ? twinkle(SP, i, 0.35, 1130) : SP]]);
  });
  return sprite(k, 'Lightning wall, end-on (fence, 4.5 m x 1.8 m, running into the screen)', {
    rise: { frames: rise, fps: 12, loop: false },
    idle: { frames: idle, fps: 12, loop: true },
  });
}

// --- aura --------------------------------------------------------------------------------------------

function aura(): WorldSprite {
  const k = key('aura');
  const M = piece(k, 'main'), SP = piece(k, 'sparks');
  // Six frames: his picture, then arcs re-routed (the feet's anchor holds) and pulsing.
  const glowK = [0, 1, 0, -1, 1, 0], strokeK = [0, 0, 1, 0, -1, 1];
  const fr = [0, 1, 2, 3, 4, 5].map((i) => {
    let m = M;
    if (i) {
      m = crackle(M, 1.5, 8, 1200 + i * 13);
      m = level(m, glowK[i], ['glow']);
      m = level(m, strokeK[i], ['stroke']);
    }
    return render(k.w, k.h, [[m], [i ? twinkle(SP, i, 0.4, 1210) : SP]]);
  });
  return sprite(k, 'Lightning aura (charge / buff)', { idle: { frames: fr, fps: 12, loop: true } });
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
