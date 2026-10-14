// Kirin (jutsu id `kirin_thunder`): the first S-rank lightning signature effect, built from the
// owner's reference art2/REF-kirin-owner.jpg as exactly as possible. Two sprites in the group
// vfx_lightning_sig; the game picks `kirin_enh` when the jutsu is cast enhanced.
//
//   kirin       "Normal lightning annihilation", 3 m circle: a storm vortex, the kanji 雷 beside
//               the bolt, a thick jagged white bolt with a tree of branches out of the vortex eye,
//               concentric electric rings and a scorched disc on the ground.
//   kirin_enh   "Enhanced lightning dragon annihilation", 4.5 m circle: a bigger tilted vortex
//               with smoke, the kanji with spark rays, a crystal lightning dragon diving out of
//               the eye head-first into an explosive starburst, rings, crater and flying rocks.
//
// His two panels are the peak frames (the first frame of `impact`). They were cut into layers by
// art2/vfx-kirin-src/vfx-kirin-extract.py (his character and the background removed, one uniform
// scale per panel so his outer ring spans our circle, area-downsampled and quantized to a palette
// sampled from his image). This file animates those layers, so his panels are the key frames:
//   gather  (10f once, 12 fps)  the cloud spins up out of its eye and the kanji writes itself
//                               stroke by stroke beside it;
//   strike  (8f once, 16 fps)   normal: the leader feels its way down, then the bolt flickers and
//                               re-strikes; enhanced: his dragon dives out of the eye to the ground;
//   impact  (8f once, 14 fps)   his panel, then the bolt or the dragon breaks up, the burst fades,
//                               the rings spread, rocks fly;
//   fade    (8f once, 12 fps)   the rings fade, the cloud drifts apart into wisps, the kanji burns
//                               out; the last frame is almost empty.
// The anchor is the impact point on the ground (the centre of the rings). Deterministic.
//
//   python3 -I <art2>/vfx-kirin-src/vfx-kirin-extract.py <art2>        (only when the reference changes)
//   WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-sig-kirin.ts <art2>

import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { Anim, CHARACTER_FEET, Canvas, Color, WorldSprite, characterRef, hex, noise, previewDir, writeGroup } from './kit';
import { Pt, TAU, clamp, lerp, smooth, text, textWidth } from './vfx-b-lib';
import { borderTouches } from './vfx-b-wall3d';

const OUT = previewDir();
const SRC = join(OUT, 'vfx-kirin-src');
/** Room added around his panel's footprint for the cloud drifting apart and the rings spreading. */
const PAD = { l: 40, r: 40, t: 40, b: 30 };

// --- reading the extracted layers ------------------------------------------------------------

/** PNG reader for 8-bit RGBA / RGB files (all five row filters). */
function readPng(path: string): Canvas {
  const buf = readFileSync(path);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), depth = buf[24], ctype = buf[25];
  if (depth !== 8 || (ctype !== 6 && ctype !== 2)) throw new Error(`${path}: unsupported PNG (depth ${depth}, type ${ctype})`);
  const bpp = ctype === 6 ? 4 : 3;
  const idat: Buffer[] = [];
  for (let p = 8; p < buf.length; ) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const cur = new Uint8Array(stride), prev = new Uint8Array(stride);
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = row[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      rgba[o] = cur[x * bpp];
      rgba[o + 1] = cur[x * bpp + 1];
      rgba[o + 2] = cur[x * bpp + 2];
      rgba[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255;
    }
    prev.set(cur);
  }
  return Canvas.fromRgba(w, h, rgba);
}

interface Debris {
  img: Canvas;
  x: number;
  y: number;
  ground: Pt;
}
interface Src {
  key: 'kirin' | 'kirin_enh';
  enh: boolean;
  W: number;
  H: number;
  AX: number;
  AY: number;
  layers: Record<string, Canvas>;
  kmap: Canvas;
  eye: Pt;
  palette: Color[];
  debris: Debris[];
  /** Upright scale his panel was taken at; his character's feet, for the review sheets. */
  scale: number;
  charFeet: Pt;
  mouth?: Pt;
}

/** Loads one version and pads it so the animation has room to spread without touching the border. */
function load(key: 'kirin' | 'kirin_enh'): Src {
  const info = JSON.parse(readFileSync(join(SRC, `${key}.json`), 'utf8'));
  const [w0, h0] = info.frame as [number, number];
  const W = w0 + PAD.l + PAD.r, H = h0 + PAD.t + PAD.b;
  const pad = (c: Canvas): Canvas => {
    const o = new Canvas(W, H);
    o.draw(c, PAD.l, PAD.t);
    return o;
  };
  const sh = (p: number[]): Pt => [p[0] + PAD.l, p[1] + PAD.t];
  const layers: Record<string, Canvas> = {};
  for (const n of info.layers as string[]) layers[n] = pad(readPng(join(SRC, `${key}-${n}.png`)));
  const scale = info.scale as number;
  // His character stood with his feet about (-435, +58) px of his panel from the ring centre (normal)
  // and (-470, +40) (enhanced); the preview puts ours there.
  const feet: Pt = key === 'kirin' ? [-435, 58] : [-470, 40];
  return {
    key,
    enh: key === 'kirin_enh',
    W,
    H,
    AX: info.anchor[0] + PAD.l,
    AY: info.anchor[1] + PAD.t,
    layers,
    kmap: pad(readPng(join(SRC, `${key}-kanjimap.png`))),
    eye: sh(info.eye),
    palette: (info.palette as number[][]).map((c) => [c[0], c[1], c[2], 255] as Color),
    debris: ((info.debris ?? []) as { file: string; x: number; y: number; ground: number[] }[]).map((d) => ({ img: readPng(join(SRC, d.file)), x: d.x + PAD.l, y: d.y + PAD.t, ground: sh(d.ground) })),
    scale,
    charFeet: [info.anchor[0] + PAD.l + feet[0] * scale, info.anchor[1] + PAD.t + feet[1] * scale],
    mouth: info.mouth ? sh(info.mouth) : undefined,
  };
}

// --- pixel helpers ----------------------------------------------------------------------------

let S: Src = undefined as unknown as Src;

/** Nearest palette colour to (r, g, b) scaled by k (for dimming and flicker), cached. */
const dimCache = new Map<number, Color>();
function dimmed(r: number, g: number, b: number, k: number): Color {
  const kk = Math.round(k * 20);
  const key = (((r << 16) | (g << 8) | b) * 64 + kk) * 2 + (S.enh ? 1 : 0);
  const hit = dimCache.get(key);
  if (hit) return hit;
  const tr = (r * kk) / 20, tg = (g * kk) / 20, tb = (b * kk) / 20;
  let best = S.palette[0], bd = Infinity;
  for (const c of S.palette) {
    const d = (c[0] - tr) ** 2 + (c[1] - tg) ** 2 + (c[2] - tb) ** 2;
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  dimCache.set(key, best);
  return best;
}

const lum = (px: Uint8Array, o: number): number => (px[o] + px[o + 1] + px[o + 2]) / 3;

/**
 * Draws `src` onto `dst`: each destination pixel samples the source at `at(x, y)` (nearest; null
 * skips it) and `shade` may recolour it, change its alpha or drop it (null).
 */
function paint(
  dst: Canvas,
  src: Canvas,
  at: ((x: number, y: number) => Pt | null) | null,
  shade?: (c: Color, x: number, y: number, sx: number, sy: number) => Color | null,
  box?: [number, number, number, number],
): void {
  const [x0, y0, x1, y1] = box ?? [0, 0, dst.w, dst.h];
  for (let y = Math.max(0, y0); y < Math.min(dst.h, y1); y++)
    for (let x = Math.max(0, x0); x < Math.min(dst.w, x1); x++) {
      let sx = x, sy = y;
      if (at) {
        const p = at(x, y);
        if (!p) continue;
        sx = Math.floor(p[0]);
        sy = Math.floor(p[1]);
        if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
      }
      const o = (sy * src.w + sx) * 4;
      if (!src.px[o + 3]) continue;
      let c: Color | null = [src.px[o], src.px[o + 1], src.px[o + 2], src.px[o + 3]];
      if (shade) c = shade(c, x, y, sx, sy);
      if (c && c[3] > 0) dst.plot(x, y, c);
    }
}

/** Bounding box of a layer's opaque pixels, padded. */
const bboxCache = new Map<Canvas, [number, number, number, number]>();
function bbox(c: Canvas, pad = 0): [number, number, number, number] {
  let b = bboxCache.get(c);
  if (!b) {
    const r = c.bounds();
    b = r ? [r[0], r[1], r[2] + 1, r[3] + 1] : [0, 0, 0, 0];
    bboxCache.set(c, b);
  }
  return [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad];
}

const withA = (c: Color, a: number): Color => [c[0], c[1], c[2], Math.round(c[3] * clamp(a, 0, 1))];

// --- the pieces ---------------------------------------------------------------------------------

/** Swirl frame around the eye: horizontal radius and vertical radius per unit of R. */
const SQUASH = 0.46;

/**
 * The storm cloud, his pixels turned around the vortex eye by `rot` (more near the eye than at
 * the rim, so it spins), shown out to `reveal` of its reach (it grows from the eye while it forms),
 * and drifting apart into wisps over `drift` (0..1).
 */
function cloud(dst: Canvas, o: { rot: number; reveal: number; drift: number; alpha: number; f: number }): void {
  const src = S.layers.cloud;
  const [ex, ey] = S.eye;
  const [bx0, by0, bx1, by1] = bbox(src, 60);
  // Reach of the cloud in swirl units.
  let reach = 1;
  for (const [x, y] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) reach = Math.max(reach, Math.hypot(x - ex, (y - ey) / SQUASH));
  const grow = 1 + 0.16 * o.drift;
  paint(
    dst,
    src,
    (x, y) => {
      const u = (x + 0.5 - ex) / grow, v = (y + 0.5 - ey + 26 * o.drift) / SQUASH / grow;
      const R = Math.hypot(u, v);
      const edge = o.reveal * reach * (0.88 + 0.24 * noise(x, y, 9, 301));
      if (R > edge) return null;
      const th = Math.atan2(v, u) + o.rot * (0.35 + 0.65 * clamp(1 - R / (reach * 0.85), 0, 1));
      return [ex + R * Math.cos(th), ey + R * Math.sin(th) * SQUASH];
    },
    (c, x, y) => {
      if (o.drift > 0) {
        // Torn into wisps along the swirl: streaky noise stretched around the eye.
        const u = x + 0.5 - ex, v = (y + 0.5 - ey) / SQUASH;
        const R = Math.hypot(u, v), th = Math.atan2(v, u);
        const streak = noise(((th / TAU + 1) * 160 + o.f * 7) % 160, R * 0.35, 4, 302 + o.f);
        if (streak < o.drift * 1.15 - 0.12) return null;
      }
      return withA(c, o.alpha);
    },
    [bx0 - 40, by0 - 40, bx1 + 40, by1 + 40],
  );
}

interface KanjiOpts {
  /** Writing progress 0..1 (strokes in order, each drawn along its length). */
  write: number;
  /** Burning out 0..1. */
  burn: number;
  f: number;
}

/** The kanji, his pixels revealed stroke by stroke with a white-hot writing tip; sparks flicker. */
function kanji(dst: Canvas, o: KanjiOpts): void {
  const src = S.layers.kanji, km = S.kmap;
  const span = 0.8 / 13, dur = span * 1.6;
  paint(
    dst,
    src,
    null,
    (c, x, y) => {
      const i = (y * km.w + x) * 4;
      const sid = km.px[i], prog = km.px[i + 1] / 255;
      let a = 1;
      if (sid >= 1 && sid <= 13) {
        const front = (o.write - (sid - 1) * span) / dur;
        if (prog > front) return null;
        if (front < 1.05 && prog > front - 0.08) return [255, 255, 255, 255];
      } else {
        // Sparks and rays: they come once the character is complete, and flicker.
        if (o.write < 0.92) return null;
        if (noise(x, y, 3, 400 + o.f) < 0.3) return null;
      }
      if (o.burn > 0) {
        const n = noise(x, y, 4, 77);
        const cut = o.burn * 1.2 - 0.12;
        if (n < cut) return null;
        if (n < cut + 0.06) return [200, 245, 255, 255];
        a = 1 - smooth(0.7, 1, o.burn);
      }
      return withA(c, a);
    },
    bbox(src, 2),
  );
  // Embers drifting up off the burning strokes.
  if (o.burn > 0.05 && o.burn < 0.95) {
    const [x0, y0, x1, y1] = bbox(src);
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(lerp(x0, x1, noise(k * 13, o.f * 5, 1, 410))), y = Math.floor(lerp(y0, y1, noise(k * 7, o.f * 3, 1, 411)));
      const s = (y * src.w + x) * 4;
      if (!src.px[s + 3] || lum(src.px, s) < 150) continue;
      const yy = y - Math.round(6 + 30 * o.burn * noise(k, 1, 1, 412));
      dst.plot(x, yy, [210, 248, 255, 230]);
      dst.plot(x, yy + 1, [120, 200, 255, 160]);
    }
  }
}

/** The normal bolt: revealed down to `front`, dimmed by `dim`, shifted by `dx`, broken up by `frag`. */
function bolt(dst: Canvas, o: { front: number; dim: number; dx: number; frag: number; boost: boolean; f: number }): void {
  const src = S.layers.bolt;
  const [x0, y0, x1, y1] = bbox(src);
  const top = S.eye[1], bottom = y1;
  const fy = lerp(top, bottom, o.front);
  paint(
    dst,
    src,
    (x, y) => [x - o.dx, y],
    (c, x, y) => {
      if (y > fy) return null;
      if (o.frag > 0 && noise(x, y, 5, 500 + o.f) < o.frag) return null;
      if (o.front < 1 && y > fy - 7) return [255, 255, 255, 255];
      if (o.boost && c[0] + c[1] + c[2] > 560) return [255, 255, 255, c[3]];
      if (o.dim > 0) return withA(dimmed(c[0], c[1], c[2], 1 - o.dim * 0.55), c[3] / 255);
      return c;
    },
    [x0 - 4 + o.dx, y0, x1 + 4 + o.dx, y1 + 1],
  );
}

/**
 * Ground: rings, scorch or crater and the burst, spread by `spread` about the anchor; the bright
 * burst fades by `burst`, the whole decal by `alpha`, eaten away by `erode`; bright crackle flickers.
 */
function ground(dst: Canvas, o: { spread: number; burst: number; alpha: number; erode: number; f: number }): void {
  const src = S.layers.ground;
  const [x0, y0, x1, y1] = bbox(src, Math.ceil((o.spread - 1) * 260) + 2);
  paint(
    dst,
    src,
    (x, y) => [S.AX + (x + 0.5 - S.AX) / o.spread, S.AY + (y + 0.5 - S.AY) / o.spread],
    (c, x, y) => {
      if (o.erode > 0 && noise(x, y, 4, 600 + o.f) < o.erode * 1.2 - 0.15) return null;
      const L = (c[0] + c[1] + c[2]) / 3;
      let a = o.alpha;
      if (L > 185) {
        a *= 1 - o.burst;
        if (noise(x, y, 2, 610 + o.f) < 0.22) return withA(dimmed(c[0], c[1], c[2], 0.7), a * (c[3] / 255));
      }
      return withA(c, a);
    },
    [x0, y0, x1, y1],
  );
}

/** The enhanced dragon: his dragon slid along its dive from the eye (t 0) to the ground (t 1). */
function dragon(dst: Canvas, o: { t: number; dissolve: number; dim: number; f: number }): void {
  const src = S.layers.dragon;
  const [ex, ey] = S.eye, [mx, my] = S.mouth!;
  const ox = (1 - o.t) * (ex - mx) * 0.96, oy = (1 - o.t) * (ey - my) * 0.96;
  const [x0, y0, x1, y1] = bbox(src);
  const cut = lerp(y0 - 4, y1 + 4, o.dissolve);
  paint(
    dst,
    src,
    (x, y) => [x - ox, y - oy],
    (c, x, y, sx, sy) => {
      if (y < ey + 6) return null;
      if (o.dissolve > 0 && sy < cut + 30 * (noise(x, y, 6, 700 + o.f) - 0.5)) return null;
      if (o.dim > 0) return withA(dimmed(c[0], c[1], c[2], 1 - o.dim * 0.5), c[3] / 255);
      return c;
    },
    [x0 + Math.floor(ox) - 2, y0 + Math.floor(oy) - 2, x1 + Math.ceil(ox) + 2, y1 + Math.ceil(oy) + 2],
  );
}

/** Loose sparks of the enhanced burst. */
function sparks(dst: Canvas, a: number, f: number): void {
  if (a <= 0.02 || !S.layers.sparks) return;
  paint(dst, S.layers.sparks, null, (c, x, y) => (noise(x, y, 3, 800 + f) < 0.25 ? null : withA(c, a)), bbox(S.layers.sparks, 1));
}

/** Rocks flying out of the crater: from his positions at the peak, outward and falling back. */
function rocks(dst: Canvas, tau: number, a: number): void {
  if (a <= 0.02) return;
  for (const [k, d] of S.debris.entries()) {
    const gx = d.ground[0] - S.AX, gy = d.ground[1] - S.AY;
    const len = Math.hypot(gx, gy) || 1;
    const sp = 90 + 70 * noise(k * 3, 1, 1, 900);
    const x = Math.round(d.x + (gx / len) * sp * tau), y = Math.round(d.y - 70 * tau + 300 * tau * tau);
    const m = 6;
    if (x < m || y < m || x + d.img.w > S.W - m || y + d.img.h > S.H - m) continue;
    paint(dst, d.img, (px, py) => [px - x, py - y], (c) => withA(c, a), [x, y, x + d.img.w, y + d.img.h]);
  }
}

// --- the four phases ----------------------------------------------------------------------------

const T_STRIKE = 10 / 12, T_IMPACT = T_STRIKE + 8 / 16, T_FADE = T_IMPACT + 8 / 14;

/** Rotation of the vortex relative to his panel: it spins up to full speed at the impact. */
function spin(t: number): number {
  const d = T_IMPACT - t;
  return d > 0 ? d * 1.6 - d * d * 0.5 : d * 1.6;
}

function gatherFrame(f: number): Canvas {
  const c = new Canvas(S.W, S.H);
  const p = f / 9, t = f / 12;
  cloud(c, { rot: spin(t), reveal: 0.22 + 0.78 * smooth(0, 0.8, p), drift: 0, alpha: 0.5 + 0.5 * smooth(0, 0.4, p), f });
  kanji(c, { write: smooth(0.12, 1, p), burn: 0, f });
  return c;
}

function strikeFrame(f: number): Canvas {
  const c = new Canvas(S.W, S.H);
  const t = T_STRIKE + f / 16;
  cloud(c, { rot: spin(t), reveal: 1, drift: 0, alpha: 1, f: 20 + f });
  kanji(c, { write: 1, burn: 0, f: 20 + f });
  if (S.enh) dragon(c, { t: Math.pow((f + 1) / 8, 1.3), dissolve: 0, dim: 0, f });
  else {
    const front = [0.25, 0.5, 0.78, 1, 1, 1, 1, 1][f];
    const dim = [0.45, 0.45, 0.45, 0, 0.6, 0, 0.55, 0][f];
    const dx = [0, 0, 0, 0, 1, -1, 1, 0][f];
    bolt(c, { front, dim, dx, frag: 0, boost: f === 7, f });
  }
  return c;
}

function impactFrame(i: number): Canvas {
  const c = new Canvas(S.W, S.H);
  const tau = i / 14, t = T_IMPACT + tau;
  cloud(c, { rot: spin(t), reveal: 1, drift: 0, alpha: 1, f: 40 + i });
  kanji(c, { write: 1, burn: 0, f: i === 0 ? 999 : 40 + i });
  const spread = 1 + 0.022 * i;
  if (S.enh) {
    ground(c, { spread, burst: [0, 0.15, 0.3, 0.45, 0.6, 0.7, 0.78, 0.85][i], alpha: 1 - 0.02 * i, erode: 0, f: i });
    sparks(c, 1 - i / 6, i);
    rocks(c, tau, 1);
    dragon(c, { t: 1, dissolve: [0, 0.12, 0.3, 0.5, 0.72, 0.9, 1.02, 1.1][i], dim: [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.8, 0.9][i], f: i });
  } else {
    ground(c, { spread, burst: [0, 0.05, 0.12, 0.2, 0.28, 0.35, 0.42, 0.5][i], alpha: 1 - 0.02 * i, erode: 0, f: i });
    if (i < 4) bolt(c, { front: 1, dim: [0, 0.25, 0.5, 0.7][i], dx: 0, frag: [0, 0, 0.35, 0.7][i], boost: false, f: i });
  }
  return c;
}

function fadeFrame(f: number): Canvas {
  const c = new Canvas(S.W, S.H);
  const q = f / 7, tau = 8 / 14 + f / 12, t = T_FADE + f / 12;
  cloud(c, { rot: spin(t), reveal: 1, drift: smooth(0, 1, q), alpha: 1 - smooth(0.45, 1, q), f: 60 + f });
  ground(c, { spread: 1.18 + 0.03 * f, burst: S.enh ? 0.9 : 0.55 + 0.4 * q, alpha: Math.pow(1 - q, 1.3), erode: q, f: 60 + f });
  if (S.enh) rocks(c, tau, 1 - smooth(0.2, 0.9, q));
  kanji(c, { write: 1, burn: smooth(0, 0.85, q), f: 60 + f });
  return c;
}

// --- build -------------------------------------------------------------------------------------

const once = (frames: Canvas[], fps: number): Anim => ({ frames, fps, loop: false });

function build(key: 'kirin' | 'kirin_enh'): WorldSprite {
  S = load(key);
  const anims: Record<string, Anim> = {
    gather: once(Array.from({ length: 10 }, (_, f) => gatherFrame(f)), 12),
    strike: once(Array.from({ length: 8 }, (_, f) => strikeFrame(f)), 16),
    impact: once(Array.from({ length: 8 }, (_, f) => impactFrame(f)), 14),
    fade: once(Array.from({ length: 8 }, (_, f) => fadeFrame(f)), 12),
  };
  const label = S.enh ? 'Kirin, enhanced: lightning dragon annihilation (4.5 m)' : 'Kirin: lightning annihilation (3 m)';
  return { name: key, label, meters: [+(S.W / 57).toFixed(2), +(S.H / 57).toFixed(2)], anchor: [S.AX, S.AY], tags: ['vfx'], anims };
}

// --- review sheets -----------------------------------------------------------------------------

const BG = hex('#14121a'), PANEL = hex('#0a1030'), INK = hex('#d9d4e6'), DIM = hex('#8a8499'), ACC = hex('#8fe0ff');
const PHASES: [string, number][] = [['gather', 12], ['strike', 16], ['impact', 14], ['fade', 12]];

/** A frame on his navy with our character standing where his did. */
function staged(src: Src, fr: Canvas): Canvas {
  const c = new Canvas(src.W, src.H);
  c.fillRect(0, 0, src.W, src.H, PANEL);
  c.draw(characterRef(), Math.round(src.charFeet[0] - CHARACTER_FEET[0]), Math.round(src.charFeet[1] - CHARACTER_FEET[1]));
  c.draw(fr, 0, 0);
  return c;
}

/** Key moments per version: one row each, normal left, enhanced right. */
const KEYS: [string, [string, number], [string, number]][] = [
  ['gather: the vortex spins up, the kanji writes itself', ['gather', 5], ['gather', 5]],
  ['gather end', ['gather', 9], ['gather', 9]],
  ['strike: the leader / the dragon dives', ['strike', 1], ['strike', 3]],
  ['impact frame 1: his panel', ['impact', 0], ['impact', 0]],
  ['impact: the bolt or the dragon breaks up', ['impact', 4], ['impact', 4]],
  ['fade', ['fade', 3], ['fade', 3]],
];

function sheet(built: [Src, WorldSprite][]): Canvas {
  const pad = 10, lab = 14;
  const W = pad + built.reduce((a, [s]) => a + s.W + pad, 0);
  const rowH = Math.max(...built.map(([s]) => s.H)) + lab;
  const Hh = 24 + KEYS.length * (rowH + pad);
  const out = new Canvas(W, Hh);
  out.fillRect(0, 0, W, Hh, BG);
  text(out, 'KIRIN (kirin_thunder) - normal (3 m) left, enhanced (4.5 m) right; built from the owner\'s reference; character for scale', pad, 8, ACC);
  KEYS.forEach(([what, ...picks], r) => {
    const y = 24 + r * (rowH + pad);
    let x = pad;
    built.forEach(([s, sp], v) => {
      const [anim, i] = picks[v];
      const t = `${s.key}  ${anim} ${i + 1}/${sp.anims[anim].frames.length}`;
      text(out, t, x, y, INK);
      text(out, v === 0 ? what : `${s.W}x${s.H}  anchor ${s.AX},${s.AY}`, x + textWidth(t) + 8, y, DIM);
      out.draw(staged(s, sp.anims[anim].frames[i]), x, y + rowH - s.H);
      x += s.W + pad;
    });
  });
  return out;
}

/** His panel next to our impact frame 1, at the same scale. */
function compare(built: [Src, WorldSprite][]): Canvas {
  const ref = readPng(join(SRC, 'ref-scaled.png'));
  const pad = 10, lab = 14;
  const panels: Canvas[] = [];
  for (const [s, sp] of built) {
    panels.push(staged(s, sp.anims.impact.frames[0]));
  }
  const W = pad + ref.w + pad + panels.reduce((a, p) => a + p.w + pad, 0);
  const H = 24 + lab + Math.max(ref.h, ...panels.map((p) => p.h)) + pad;
  const out = new Canvas(W, H);
  out.fillRect(0, 0, W, H, BG);
  text(out, 'KIRIN v2 - the owner\'s panels (left, scaled to our sprites) and our impact frame 1 for each (right), same scale', pad, 8, ACC);
  text(out, 'REFERENCE: normal / enhanced', pad, 24, INK);
  out.draw(ref, pad, 24 + lab);
  let x = pad + ref.w + pad;
  built.forEach(([s], k) => {
    text(out, `OURS: ${s.key} impact 1/8`, x, 24, INK);
    out.draw(panels[k], x, 24 + lab);
    x += panels[k].w + pad;
  });
  return out;
}

/** Every frame in play order, staged, as one strip, plus the frame durations (for the GIF). */
function playStrip(s: Src, sp: WorldSprite, path: string): void {
  const frames: Canvas[] = [], ms: number[] = [];
  for (const [key, fps] of PHASES)
    for (const fr of sp.anims[key].frames) {
      frames.push(staged(s, fr));
      ms.push(Math.round(1000 / fps / 10) * 10);
    }
  const strip = new Canvas(s.W * frames.length, s.H);
  frames.forEach((fr, i) => strip.draw(fr, i * s.W, 0));
  strip.save(path + '.png');
  writeFileSync(path + '.json', JSON.stringify({ w: s.W, h: s.H, ms }));
}

if (!existsSync(join(SRC, 'kirin.json'))) throw new Error(`run ${join(SRC, 'vfx-kirin-extract.py')} first`);
const built: [Src, WorldSprite][] = [];
for (const key of ['kirin', 'kirin_enh'] as const) {
  const sp = build(key);
  built.push([S, sp]);
  for (const [k, a] of Object.entries(sp.anims)) {
    const bad = borderTouches(a.frames);
    console.log(`${key.padEnd(10)} ${k.padEnd(7)} ${a.frames.length}f @${a.fps} frame ${S.W}x${S.H} anchor ${S.AX},${S.AY} row ${a.frames.length * S.W}px ${bad.length ? 'BORDER ' + bad.join(',') : 'border ok'}`);
  }
}
writeGroup('vfx_lightning_sig', built.map(([, sp]) => sp));
sheet(built).scaled(2).save(join(OUT, 'vfx-kirin.png'));
for (const [s, sp] of built) {
  S = s;
  playStrip(s, sp, join(OUT, '..', `kirin-play-${s.key}`));
}
if (existsSync(join(SRC, 'ref-scaled.png'))) compare(built).scaled(2).save(join(OUT, 'vfx-kirin-v2-compare.png'));
