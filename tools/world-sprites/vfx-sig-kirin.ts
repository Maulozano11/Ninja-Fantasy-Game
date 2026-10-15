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
const PAD = { l: 8, r: 8, t: 16, b: 16 };

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
  /** The bolt's main channel (normal), top to bottom. */
  main: Pt[];
  /** His outer ring's half-axes in sprite px. */
  ring: Pt;
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
    main: ((info.main ?? []) as number[][]).map(sh),
    ring: [info.ring[0], info.ring[1]],
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
 * The storm cloud, his pixels turned around the vortex eye by `rot` (only the vortex turns, more
 * near the eye; the billows around it stay in their footprint), shown out to `reveal` of its reach
 * with a billowy edge (it grows from the eye while it forms, and thins back while it fades), lifted
 * by `lift`, brightened at the eye by `eyeGlow`.
 */
function cloud(dst: Canvas, o: { rot: number; reveal: number; lift: number; alpha: number; dim: number; eyeGlow: number }): void {
  const src = S.layers.cloud;
  const [ex, ey] = S.eye;
  const [bx0, by0, bx1, by1] = bbox(src, 2);
  let reach = 1;
  for (const [x, y] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) reach = Math.max(reach, Math.hypot(x - ex, (y - ey) / SQUASH));
  const vortex = (S.enh ? 250 : 200) * (S.scale / 0.6);
  const dy = Math.round(o.lift);
  paint(
    dst,
    src,
    (x, y) => {
      const u = x + 0.5 - ex, v = (y + 0.5 - ey + dy) / SQUASH;
      const R = Math.hypot(u, v);
      if (o.reveal < 1 && R > o.reveal * reach * (0.86 + 0.28 * noise(x, y + dy, 11, 301))) return null;
      const th = Math.atan2(v, u) + o.rot * Math.pow(clamp(1 - R / vortex, 0, 1), 1.2);
      return [ex + R * Math.cos(th), ey + R * Math.sin(th) * SQUASH];
    },
    (c, x, y) => {
      let k = c;
      if (o.eyeGlow > 0) {
        const d = Math.hypot(x - ex, (y - ey) / SQUASH);
        if (d < 70 && c[0] + c[1] + c[2] > 420) k = dimmed(c[0], c[1], c[2], 1 + o.eyeGlow * (1 - d / 70));
      }
      if (o.dim > 0) k = dimmed(k[0], k[1], k[2], 1 - o.dim);
      return withA(k, o.alpha);
    },
    [bx0, by0 - Math.max(0, dy), bx1, by1],
  );
}

/**
 * The kanji. While written, each stroke lights up in order, glowing in softly from its start to
 * its end (no wipe edge) with a white flash as it catches; the sparks and rays come last. Then it
 * breathes (`breath`), and while fading its glow dims out (`fade`) with embers floating off.
 */
function kanji(dst: Canvas, o: { write: number; breath: number; fade: number; f: number }): void {
  const src = S.layers.kanji, km = S.kmap;
  const span = 0.78 / 13, dur = span * 2.4;
  const lv = (a: number): number => (a >= 0.9 ? 1 : a >= 0.65 ? 0.8 : a >= 0.4 ? 0.55 : a >= 0.15 ? 0.3 : 0);
  paint(
    dst,
    src,
    null,
    (c, x, y) => {
      const i = (y * km.w + x) * 4;
      const sid = km.px[i], prog = km.px[i + 1] / 255;
      const L = (c[0] + c[1] + c[2]) / 3;
      let a = 1, k = 1;
      if (sid >= 1 && sid <= 13) {
        const local = (o.write - (sid - 1) * span) / dur;
        a = lv(clamp(local * 1.7 - prog * 0.7, 0, 1));
        if (a <= 0) return null;
        if (a < 1) k = 0.45 + 0.55 * a;
        else if (local > 0.55 && local < 1.0 && L > 170) return [255, 255, 255, c[3]];
      } else {
        a = lv(clamp((o.write - 0.84) / 0.16, 0, 1));
        if (a <= 0) return null;
        // Sparks blink in clusters.
        if (noise(x, y, 10, 400 + o.f) < 0.28) return null;
      }
      if (o.breath && L < 200) k *= 1 - o.breath;
      if (o.fade > 0) {
        a *= 1 - smooth(0.15, 0.95, o.fade);
        k *= 1 - 0.55 * o.fade;
      }
      const col = k < 0.999 ? dimmed(c[0], c[1], c[2], k) : c;
      return withA(col, a * (c[3] / 255));
    },
    bbox(src, 2),
  );
  // Embers floating up off the strokes as the glow dies.
  if (o.fade > 0.05) {
    const [x0, y0, x1, y1] = bbox(src);
    for (let k = 0; k < 26; k++) {
      const x = Math.floor(lerp(x0, x1, noise(k * 13, 3, 1, 410))), y = Math.floor(lerp(y0, y1, noise(k * 7, 5, 1, 411)));
      const s = (y * src.w + x) * 4;
      if (!src.px[s + 3] || lum(src.px, s) < 170) continue;
      const rise = Math.round(4 + 46 * o.fade * (0.5 + noise(k, 1, 1, 412)));
      const a = 1 - smooth(0.55, 1, o.fade);
      dst.plot(x, y - rise, [210, 248, 255, Math.round(230 * a)]);
      dst.plot(x, y - rise + 1, [110, 190, 255, Math.round(150 * a)]);
    }
  }
}

/** Distance from a point to the bolt's main channel (normal). */
function toMain(x: number, y: number): number {
  let best = Infinity;
  for (const [mx, my] of S.main) if (Math.abs(my - y) < 8) best = Math.min(best, Math.abs(mx - x));
  return best;
}

/**
 * The normal bolt: revealed down to `front` (an uneven front, the branches reaching ahead), dimmed
 * by `dim`, shifted by `dx`; with `strike` (0..1) only part of the branches are lit (they re-strike
 * frame to frame: the pattern follows `f`), the main channel always.
 */
function bolt(dst: Canvas, o: { front: number; dim: number; dx: number; branches: number; boost: boolean; alpha: number; f: number }): void {
  const src = S.layers.bolt;
  const [x0, y0, x1, y1] = bbox(src);
  const top = S.eye[1], bottom = y1;
  const fy = lerp(top, bottom, o.front);
  paint(
    dst,
    src,
    (x, y) => [x - o.dx, y],
    (c, x, y) => {
      if (o.front < 1 && y > fy + 18 * (noise(x, 0, 14, 505) - 0.5)) return null;
      if (o.branches < 1 && toMain(x - o.dx, y) > 9 && noise(x, y, 26, 520 + o.f) > o.branches) return null;
      let k: Color = c;
      if (o.boost && c[0] + c[1] + c[2] > 520) k = [255, 255, 255, c[3]];
      else if (o.dim > 0) k = dimmed(c[0], c[1], c[2], 1 - o.dim * 0.6);
      return withA(k, o.alpha);
    },
    [x0 - 4 + o.dx, y0, x1 + 4 + o.dx, y1 + 1],
  );
}

/**
 * Ground: rings, scorch or crater and the burst, spread by `spread` about the anchor. `burst`
 * (0..1) is how much of the bright starburst and ring glow shows (dimmed, never dropped),
 * `glow` pulses the ring's brightness, `alpha` fades the whole decal.
 */
function ground(dst: Canvas, o: { spread: number; burst: number; glow: number; alpha: number }): void {
  const src = S.layers.ground;
  const [x0, y0, x1, y1] = bbox(src, Math.ceil((o.spread - 1) * 260) + 2);
  paint(
    dst,
    src,
    (x, y) => [S.AX + (x + 0.5 - S.AX) / o.spread, S.AY + (y + 0.5 - S.AY) / o.spread],
    (c) => {
      const L = (c[0] + c[1] + c[2]) / 3;
      let k = 1;
      if (L > 150) k = lerp(0.55, 1, o.burst) * o.glow;
      const col = Math.abs(k - 1) > 0.01 ? dimmed(c[0], c[1], c[2], k) : c;
      return withA(col, o.alpha);
    },
    [x0, y0, x1, y1],
  );
}

/**
 * The enhanced dragon: his dragon slid along its dive from the eye (t 0) to the ground (t 1),
 * writhing by `writhe` (turned about its mouth, a little bob), roaring (`roar` whitens the jaws),
 * dimmed by `dim`, faded by `alpha`.
 */
function dragon(dst: Canvas, o: { t: number; writhe: number; roar: number; dim: number; alpha: number }): void {
  const src = S.layers.dragon;
  const [ex, ey] = S.eye, [mx, my] = S.mouth!;
  const ox = (1 - o.t) * (ex - mx) * 0.96, oy = (1 - o.t) * (ey - my) * 0.96 + o.writhe * 2;
  const th = o.writhe * 0.025, ct = Math.cos(th), st = Math.sin(th);
  const [x0, y0, x1, y1] = bbox(src);
  paint(
    dst,
    src,
    (x, y) => {
      const px = x - ox - mx, py = y - oy - my;
      return [mx + px * ct + py * st, my - px * st + py * ct];
    },
    (c, x, y) => {
      if (y < ey + 6) return null;
      let k: Color = c;
      if (o.roar > 0) {
        const d = Math.hypot(x - mx - ox, y - my - oy);
        if (d < 34 && c[0] + c[1] + c[2] > 330) k = dimmed(c[0], c[1], c[2], 1 + o.roar * (1 - d / 34));
      }
      if (o.dim > 0) k = dimmed(k[0], k[1], k[2], 1 - o.dim);
      return withA(k, o.alpha);
    },
    [x0 + Math.floor(ox) - 6, y0 + Math.floor(oy) - 6, x1 + Math.ceil(ox) + 6, y1 + Math.ceil(oy) + 6],
  );
}

/** Loose sparks of the enhanced burst: they blink in clusters and dim with the burst. */
function sparks(dst: Canvas, burst: number, alpha: number, f: number): void {
  if (alpha <= 0.02 || !S.layers.sparks) return;
  paint(dst, S.layers.sparks, null, (c, x, y) => (noise(x, y, 12, 800 + f) < 0.25 ? null : withA(dimmed(c[0], c[1], c[2], lerp(0.55, 1, burst)), alpha)), bbox(S.layers.sparks, 1));
}

/** His rocks (enhanced): flung from where they are at the peak, they land by the end of the impact. */
function rocks(dst: Canvas, tau: number, a: number): void {
  if (a <= 0.02) return;
  const T = 7 / 14;
  const tt = Math.min(tau, T);
  for (const [k, d] of S.debris.entries()) {
    const gx = d.ground[0] - S.AX, gy = d.ground[1] - S.AY;
    const len = Math.hypot(gx, gy) || 1;
    const sp = 60 + 50 * noise(k * 3, 1, 1, 900);
    // A hop that comes back down 14 px below where it was (on the crater's slope) at T.
    const x = Math.round(d.x + (gx / len) * sp * tt), y = Math.round(d.y + lerp(0, 14, tt / T) - 140 * tt * (T - tt));
    const m = 4;
    if (x < m || y < m || x + d.img.w > S.W - m || y + d.img.h > S.H - m) continue;
    paint(dst, d.img, (px, py) => [px - x, py - y], (c) => withA(c, a), [x, y, x + d.img.w, y + d.img.h]);
  }
}

/** The four darkest and four brightest colours of his palette (for particles). */
const darks = (): Color[] => S.palette.slice(2, 8);
const lights = (): Color[] => S.palette.slice(-6);

/**
 * Sparks and small chips spat off the ring, looping with `phase` (each particle is at its own
 * point of a hop that repeats every cycle), at strength `k`.
 */
function spits(dst: Canvas, phase: number, k: number, seed: number): void {
  if (k <= 0.02) return;
  const [rx, ry] = S.ring;
  const n = S.enh ? 22 : 16;
  for (let j = 0; j < n; j++) {
    const ang = noise(j * 17, 1, 1, seed) * TAU;
    const r0 = 0.55 + 0.45 * noise(j * 5, 2, 1, seed);
    const life = ((phase + noise(j * 3, 3, 1, seed)) % 1 + 1) % 1;
    const bx = S.AX + Math.cos(ang) * rx * r0, by = S.AY + Math.sin(ang) * ry * r0;
    const out = 18 + 26 * noise(j, 4, 1, seed), up = 34 + 40 * noise(j, 5, 1, seed);
    const x = bx + Math.cos(ang) * out * life, y = by - up * life * (1 - life) * 2.4 + 8 * life;
    const chip = j % 3 === 0;
    const a = k * (1 - smooth(0.7, 1, life));
    if (x < 4 || y < 4 || x > S.W - 5 || y > S.H - 5) continue;
    if (chip) {
      const col = darks()[j % 6];
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) dst.plot(Math.round(x) + dx, Math.round(y) + dy, withA(col, a));
    } else {
      const col = lights()[(j * 7) % 6];
      dst.plot(Math.round(x), Math.round(y), withA(col, a));
      dst.plot(Math.round(x - Math.cos(ang) * 2), Math.round(y + 2), withA(lights()[0], a * 0.7));
    }
  }
}

/** A little smoke rising off the ring while it fades: soft dark puffs, shaded from above. */
function smoke(dst: Canvas, q: number): void {
  if (q <= 0.02 || q >= 0.98) return;
  const [rx, ry] = S.ring;
  const cols = S.palette.slice(3, 9);
  for (let j = 0; j < 9; j++) {
    const ang = Math.PI * (1.05 + 0.9 * (j / 8)) + 0.2 * noise(j, 1, 1, 950);
    const r = (5 + 9 * q) * (0.8 + 0.5 * noise(j, 2, 1, 951)) * (S.scale / 0.6);
    const cx = S.AX + Math.cos(ang) * rx * 0.9, cy = S.AY + Math.sin(ang) * ry * 0.9 - 10 - 40 * q * (0.6 + 0.6 * noise(j, 3, 1, 952));
    const a = 0.75 * (1 - smooth(0.5, 1, q)) * smooth(0, 0.2, q);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d > 1 || x < 2 || y < 2 || x > S.W - 3 || y > S.H - 3) continue;
        const lit = (y + 0.5 - cy) / r < -0.35 ? 3 : d > 0.8 ? 0 : 1;
        dst.plot(x, y, withA(cols[Math.min(cols.length - 1, lit + 1)], a));
      }
  }
}

// --- the five phases -------------------------------------------------------------------------------

const T_STRIKE = 10 / 12, T_IMPACT = T_STRIKE + 8 / 16;
/** Vortex rotation relative to his panel: spinning up to the impact, slowing after it. */
function spin(t: number): number {
  const d = T_IMPACT - t;
  return d > 0 ? d * 1.6 - d * d * 0.5 : d * 0.6;
}
const ROT_HOLD = spin(T_IMPACT + 8 / 14);

/** The bolt's flicker through the sustain loop (dim per frame) and which branches are lit. */
const FLICK = [0, 0.3, 0.08, 0.4, 0, 0.22, 0.5, 0.1, 0, 0.35, 0.15, 0.42];

function gatherFrame(f: number): Canvas {
  const c = new Canvas(S.W, S.H);
  const p = f / 9, t = f / 12;
  cloud(c, { rot: spin(t), reveal: 0.22 + 0.78 * smooth(0, 0.8, p), lift: 0, alpha: 0.55 + 0.45 * smooth(0, 0.4, p), dim: 0.35 * (1 - p), eyeGlow: 0 });
  kanji(c, { write: smooth(0.1, 1, p), breath: 0, fade: 0, f });
  return c;
}

function strikeFrame(f: number): Canvas {
  const c = new Canvas(S.W, S.H);
  const t = T_STRIKE + f / 16;
  cloud(c, { rot: spin(t), reveal: 1, lift: 0, alpha: 1, dim: 0, eyeGlow: 0.25 + 0.05 * f });
  kanji(c, { write: 1, breath: 0, fade: 0, f: 20 + f });
  if (S.enh) dragon(c, { t: Math.pow((f + 1) / 8, 1.3), writhe: 0, roar: 0, dim: 0, alpha: 1 });
  else {
    const front = [0.25, 0.5, 0.78, 1, 1, 1, 1, 1][f];
    const dim = [0.45, 0.45, 0.45, 0, 0.6, 0, 0.55, 0][f];
    const dx = [0, 0, 0, 0, 1, -1, 1, 0][f];
    bolt(c, { front, dim, dx, branches: f < 3 ? 1 : [1, 0.7, 1, 0.65, 1][f - 3], boost: f === 7, alpha: 1, f });
  }
  return c;
}

/**
 * The peak held alive (sustain, and the start of the fade): `phase` 0..1 runs the loop; `q` is how
 * far the fade has gone (0 in the sustain).
 */
function alive(c: Canvas, phase: number, q: number, fi: number, tau: number): void {
  const w = Math.sin(phase * TAU), w2 = Math.cos(phase * TAU);
  const t = T_IMPACT + 8 / 14 + 1 + Math.max(0, tau - 8 / 14 - 1);
  cloud(c, {
    rot: q > 0 ? ROT_HOLD - 0.25 * (t - (T_IMPACT + 8 / 14 + 1)) : ROT_HOLD + 0.04 * w,
    reveal: 1 - 0.3 * smooth(0.1, 1, q),
    lift: 12 * q,
    alpha: 1 - smooth(0.3, 1, q),
    dim: 0.4 * q,
    eyeGlow: (0.3 + 0.25 * (1 - FLICK[fi % 12])) * (1 - q),
  });
  const fl = FLICK[fi % 12];
  const groundA = Math.pow(1 - q, 1.2);
  ground(c, { spread: 1 + 0.01 * w + 0.03 * q, burst: (S.enh ? 0.55 + 0.15 * w2 : 0.8 + 0.2 * w2) * (1 - 0.7 * q), glow: 1 - 0.12 * fl, alpha: groundA });
  if (S.enh) {
    sparks(c, 0.5 + 0.2 * w2, 1 - smooth(0, 0.5, q), fi);
    rocks(c, 1, 1 - smooth(0.2, 0.9, q));
  }
  smoke(c, q);
  spits(c, phase, 1 - smooth(0, 0.4, q), S.enh ? 960 : 970);
  if (S.enh) {
    const roar = [0, 0, 0.15, 0.35, 0.45, 0.3, 0.1, 0, 0, 0, 0, 0][fi % 12] * (1 - q);
    dragon(c, { t: 1, writhe: q > 0 ? 0 : w, roar, dim: 0.3 * fl + 0.5 * q, alpha: 1 - smooth(0, 0.55, q) });
  } else bolt(c, { front: 1, dim: Math.min(1, fl + q), dx: [0, 1, 0, -1][fi % 4] * (q > 0 ? 0 : 1), branches: q > 0 ? 1 : 0.55 + 0.4 * (1 - fl), boost: fl === 0 && q === 0, alpha: 1 - smooth(0, 0.5, q), f: fi });
  kanji(c, { write: 1, breath: 0.12 * (0.5 - 0.5 * w2), fade: q, f: 80 + fi });
}

function impactFrame(i: number): Canvas {
  const c = new Canvas(S.W, S.H);
  if (i === 0) {
    // His panel: every layer as he drew it.
    cloud(c, { rot: 0, reveal: 1, lift: 0, alpha: 1, dim: 0, eyeGlow: 0 });
    ground(c, { spread: 1, burst: 1, glow: 1, alpha: 1 });
    if (S.enh) {
      sparks(c, 1, 1, 999);
      rocks(c, 0, 1);
      dragon(c, { t: 1, writhe: 0, roar: 0, dim: 0, alpha: 1 });
    } else bolt(c, { front: 1, dim: 0, dx: 0, branches: 1, boost: false, alpha: 1, f: 0 });
    kanji(c, { write: 1, breath: 0, fade: 0, f: 999 });
    return c;
  }
  // Settling from his panel into the held state the sustain loops on (its phase just before 0).
  const tau = i / 14, s = smooth(1, 7, i);
  const phase = 1 - (8 - i) / 12;
  const w = Math.sin(phase * TAU), w2 = Math.cos(phase * TAU);
  cloud(c, { rot: spin(T_IMPACT + tau), reveal: 1, lift: 0, alpha: 1, dim: 0, eyeGlow: 0.55 * s });
  const fl = [0, 0.15, 0.05, 0.3, 0.1, 0.35, 0.15, 0.42][i];
  const base = S.enh ? 0.55 + 0.15 * w2 : 0.8 + 0.2 * w2;
  ground(c, { spread: 1 + 0.025 * Math.sin((i / 7) * Math.PI) + 0.01 * w * s, burst: lerp(1, base, s), glow: 1 - 0.12 * fl, alpha: 1 });
  if (S.enh) {
    sparks(c, lerp(1, 0.5 + 0.2 * w2, s), 1, 40 + i);
    rocks(c, tau, 1);
  }
  spits(c, phase, s, S.enh ? 960 : 970);
  if (S.enh) dragon(c, { t: 1, writhe: w * s, roar: 0, dim: 0.3 * fl, alpha: 1 });
  else bolt(c, { front: 1, dim: fl, dx: [0, 1, 0, -1][i % 4], branches: lerp(1, 0.55 + 0.4 * (1 - fl), s), boost: fl === 0, alpha: 1, f: 40 + i });
  kanji(c, { write: 1, breath: 0.12 * (0.5 - 0.5 * w2) * s, fade: 0, f: 40 + i });
  return c;
}

function sustainFrame(f: number): Canvas {
  const c = new Canvas(S.W, S.H);
  alive(c, f / 12, 0, f, 8 / 14 + f / 12);
  return c;
}

function fadeFrame(f: number): Canvas {
  const c = new Canvas(S.W, S.H);
  // Frame 0 is the sustain's phase 0 with the fade just begun, so it follows the loop's last frame.
  alive(c, 0, f / 7, 12 + f, 8 / 14 + 1 + f / 12);
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
    sustain: { frames: Array.from({ length: 12 }, (_, f) => sustainFrame(f)), fps: 12, loop: true },
    fade: once(Array.from({ length: 8 }, (_, f) => fadeFrame(f)), 12),
  };
  const label = S.enh ? 'Kirin, enhanced: lightning dragon annihilation (4.5 m)' : 'Kirin: lightning annihilation (3 m)';
  return { name: key, label, meters: [+(S.W / 57).toFixed(2), +(S.H / 57).toFixed(2)], anchor: [S.AX, S.AY], tags: ['vfx'], anims };
}

// --- review sheets -----------------------------------------------------------------------------

const BG = hex('#14121a'), PANEL = hex('#0a1030'), INK = hex('#d9d4e6'), DIM = hex('#8a8499'), ACC = hex('#8fe0ff');
const PHASES: [string, number][] = [['gather', 12], ['strike', 16], ['impact', 14], ['sustain', 12], ['fade', 12]];

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
  ['impact: settling into the hold', ['impact', 5], ['impact', 5]],
  ['sustain: the strike held alive for 1 s (loop)', ['sustain', 4], ['sustain', 4]],
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
