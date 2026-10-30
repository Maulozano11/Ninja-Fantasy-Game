// Wind set, third pass: the sprites rebuilt from the owner's paint-over of the wind sheet
// (REF-wind-set-owner.jpg), copied as exactly as possible.
//
//   WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-wind-v3.ts
//
// Writes the group vfx_wind_v3 (one PNG per sprite plus manifest.json) under WORLD_OUT. The key
// frame of every sprite IS his picture: tools/refs/wind-from-ref.py cuts his panels to game scale
// (his character matched to ours), removes his background, character and labels, quantizes to a
// palette sampled from his pixels, cleans the edges to a tinted 1 px outline and splits the parts
// to animate (vfx-wind-v3-refdata.ts). This generator only DERIVES the other frames from those key
// frames: the bolt's swirl turns, the stream scrolls, ribbons and funnels writhe with small
// travelling waves, rings turn on the ground, leaves drift, and blast, hit and the walls' rise grow
// or reveal into his picture and fade after it. Every loop's first frame is his picture unchanged.
//
// Contract (same as vfx_wind): the same sprite names, animation names, frame counts and fps, and
// the same anchors (projectile core, ground centre for blast and walls, feet for the aura). Frames
// are sized to the art (1 px of clear border all round) and the anchor moves with the art. The
// stream tile stays 64 px wide and wraps; the stream head joins it on its left edge. One sprite is
// added: aura_back (the aura's glow, drawn behind the character). The beast is out of scope: it is
// copied unchanged from vfx_wind when that group is present.
//
// Safe writes: refuses to run without WORLD_OUT; every file is written whole under a temp name and
// renamed into place, PNGs first and manifest.json last. Deterministic (no Math.random).

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas, Color, PX_PER_M, WorldSprite, hash, hex, writeGroup } from './kit';
import { WV3_PALS, WV3_REF, WV3Piece, WV3Sprite } from './vfx-wind-v3-refdata';

const TAU = Math.PI * 2;
const GROUP = 'vfx_wind_v3';
const PAD = 24; // room round each canvas for motion; frames are cropped to the art afterwards

// --- his key frames ---------------------------------------------------------------------------------

const palCache = new Map<string, Color[]>();
function palette(name: string): Color[] {
  let p = palCache.get(name);
  if (!p) {
    p = WV3_PALS[name].map((h) => hex(h.slice(0, 7), parseInt(h.slice(7, 9), 16)));
    palCache.set(name, p);
  }
  return p;
}

function decode(p: WV3Piece, pal: Color[]): Canvas {
  const c = new Canvas(p.w, p.h);
  const bytes = Buffer.from(p.rle, 'base64');
  let i = 0;
  for (let k = 0; k + 1 < bytes.length; k += 2) {
    const n = bytes[k], v = bytes[k + 1];
    if (v) for (let j = 0; j < n; j++) c.set((i + j) % p.w, Math.floor((i + j) / p.w), pal[v - 1]);
    i += n;
  }
  return c;
}

/** A sprite's work space: its canvas from the refdata with PAD px all round. */
interface Spr {
  ref: WV3Sprite;
  pal: Color[];
  W: number;
  H: number;
  /** Anchor in work pixels. */
  ax: number;
  ay: number;
}
function spr(name: string, pad = PAD): Spr {
  const ref = WV3_REF[name];
  if (!ref) throw new Error(`vfx-wind-v3: no reference sprite "${name}"`);
  return { ref, pal: palette(ref.pal), W: ref.w + 2 * pad, H: ref.h + 2 * pad, ax: ref.anchor[0] + pad, ay: ref.anchor[1] + pad };
}
/** One of his pieces, placed where he drew it, on a work-size canvas (empty if he has none). */
function layer(s: Spr, piece: string, pad = PAD): Canvas {
  const out = new Canvas(s.W, s.H);
  const p = s.ref.pieces[piece];
  if (p) out.draw(decode(p, s.pal), p.x + pad, p.y + pad);
  return out;
}
interface Leaf {
  c: Canvas;
  /** Top-left and centre in work pixels. */
  x: number;
  y: number;
  cx: number;
  cy: number;
}
function leaves(s: Spr, pad = PAD): Leaf[] {
  return s.ref.leaves.map((p) => ({ c: decode(p, s.pal), x: p.x + pad, y: p.y + pad, cx: p.x + pad + p.w / 2, cy: p.y + pad + p.h / 2 }));
}

// --- frame operations (nearest neighbour, so his pixels stay his) ------------------------------------

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
/** A loop-safe travelling wave: zero at t = 0 (his picture), periodic in t. */
const wave = (phase: number, t: number, amp: number): number => amp * (Math.sin(phase - TAU * t) - Math.sin(phase));

/** Every pixel moved by disp(x, y) (read from the source at (x - dx, y - dy)). */
function warp(c: Canvas, disp: (x: number, y: number) => [number, number]): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const [dx, dy] = disp(x, y);
      const p = c.get(x - Math.round(dx), y - Math.round(dy));
      if (p[3]) out.set(x, y, p);
    }
  return out;
}
function shifted(c: Canvas, dx: number, dy: number): Canvas {
  const out = new Canvas(c.w, c.h);
  out.draw(c, Math.round(dx), Math.round(dy));
  return out;
}
/** Rotated k quarter turns counter-clockwise (on screen) about (cx, cy); exact, no resampling. */
function quarterTurns(c: Canvas, k: number, cx: number, cy: number): Canvas {
  const out = new Canvas(c.w, c.h);
  k = ((k % 4) + 4) % 4;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      let rx = x + 0.5 - cx, ry = y + 0.5 - cy;
      // The source of a counter-clockwise turn: (dx, dy) <- (-dy, dx).
      for (let i = 0; i < k; i++) [rx, ry] = [-ry, rx];
      const p = c.get(Math.floor(cx + rx), Math.floor(cy + ry));
      if (p[3]) out.set(x, y, p);
    }
  return out;
}
/** Turned by `ang` (radians, counter-clockwise on screen) about (cx, cy) on a ground ellipse that is `ratio` times wider than tall. */
function turnOnGround(c: Canvas, ang: number, cx: number, cy: number, ratio: number): Canvas {
  const out = new Canvas(c.w, c.h);
  const co = Math.cos(ang), si = Math.sin(ang);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const dx = x + 0.5 - cx, dy = (y + 0.5 - cy) * ratio;
      // Inverse of a counter-clockwise screen turn.
      const sx = dx * co - dy * si, sy = (dx * si + dy * co) / ratio;
      const p = c.get(Math.floor(cx + sx), Math.floor(cy + sy));
      if (p[3]) out.set(x, y, p);
    }
  return out;
}
/** Scaled by (sx, sy) about (cx, cy). */
function scaled(c: Canvas, sx: number, sy: number, cx: number, cy: number): Canvas {
  const out = new Canvas(c.w, c.h);
  if (sx < 0.02 || sy < 0.02) return out;
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(Math.floor(cx + (x + 0.5 - cx) / sx), Math.floor(cy + (y + 0.5 - cy) / sy));
      if (p[3]) out.set(x, y, p);
    }
  return out;
}
function keep(c: Canvas, pred: (x: number, y: number) => boolean): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (pred(x, y)) out.set(x, y, c.get(x, y));
  return out;
}
/** Every pixel's alpha times k (glows breathing, see-through fades). */
function alphaMul(c: Canvas, k: number): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(x, y);
      if (!p[3]) continue;
      const a = Math.round(clamp(p[3] * k, 0, 255));
      if (a > 6) out.set(x, y, [p[0], p[1], p[2], a]);
    }
  return out;
}
/** Wind dispersing: pixels drop out in 2x2 clumps where a fixed noise is under `amount` (0..1), biased by `bias(x, y)`. */
function disperse(c: Canvas, amount: number, seed: number, bias: (x: number, y: number) => number = () => 0): Canvas {
  if (amount <= 0) return c;
  return keep(c, (x, y) => {
    const n = hash(x >> 1, y >> 1, seed) * 0.75 + hash(x, y, seed + 1) * 0.25;
    return c.alpha(x, y) > 0 && n + bias(x, y) >= amount;
  });
}
function stack(w: number, h: number, ...layers: (Canvas | null | undefined)[]): Canvas {
  const out = new Canvas(w, h);
  for (const l of layers) if (l) out.draw(l, 0, 0);
  return out;
}
/** Leaves drawn at an offset each (dx, dy from fn), optionally mirrored to tumble. */
function drawLeaves(w: number, h: number, ls: Leaf[], fn: (l: Leaf, i: number) => { dx: number; dy: number; flip?: boolean; hide?: boolean }): Canvas {
  const out = new Canvas(w, h);
  ls.forEach((l, i) => {
    const m = fn(l, i);
    if (m.hide) return;
    out.draw(l.c, l.x + Math.round(m.dx), l.y + Math.round(m.dy), !!m.flip);
  });
  return out;
}
/** A small loop for a leaf: zero offset at t = 0, a little circle after (radius r, phase ph). */
function bob(t: number, r: number, ph: number): { dx: number; dy: number } {
  return { dx: r * (Math.cos(TAU * t + ph) - Math.cos(ph)), dy: r * (Math.sin(TAU * t + ph) - Math.sin(ph)) * 0.8 };
}

// --- framing --------------------------------------------------------------------------------------------

interface Built {
  anims: Record<string, { frames: Canvas[]; fps: number; loop: boolean }>;
  ax: number;
  ay: number;
}
function bounds(fr: Canvas[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of fr) {
    const b = f.bounds(1);
    if (!b) continue;
    x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
  }
  return [x0, y0, x1, y1];
}
function cropTo(c: Canvas, x: number, y: number, w: number, h: number): Canvas {
  const out = new Canvas(w, h);
  out.draw(c, -x, -y);
  return out;
}
/** Crops every frame of a sprite to the art of all its frames plus 1 clear pixel all round; the anchor moves with it. */
function fit(b: Built, opt: { x?: [number, number]; y?: [number, number]; include?: [number, number] } = {}): Built {
  const all = Object.values(b.anims).flatMap((a) => a.frames);
  const [bx0, by0, bx1, by1] = bounds(all);
  let x0 = opt.x ? opt.x[0] : bx0 - 1, x1 = opt.x ? opt.x[1] : bx1 + 1;
  let y0 = opt.y ? opt.y[0] : by0 - 1, y1 = opt.y ? opt.y[1] : by1 + 1;
  if (opt.include) {
    // A point that must lie in the frame (the breath's origin).
    x0 = Math.min(x0, opt.include[0]); x1 = Math.max(x1, opt.include[0]);
    y0 = Math.min(y0, opt.include[1]); y1 = Math.max(y1, opt.include[1]);
  }
  const anims: Built['anims'] = {};
  for (const [k, a] of Object.entries(b.anims)) anims[k] = { ...a, frames: a.frames.map((f) => cropTo(f, x0, y0, x1 - x0 + 1, y1 - y0 + 1)) };
  return { anims, ax: b.ax - x0, ay: b.ay - y0 };
}

// --- projectiles ----------------------------------------------------------------------------------------

// --- timing (owner: slower, more frames, no flashes) -------------------------------------------------------
// Flying loops: 8 frames at 10 fps. hit: 12 at 12 (build-up 3, his picture at frame 4 held 3, a
// slow 6-frame dissipation). blast: 16 at 12 (anticipation 3, growth 2, his picture at frame 6 held
// 3, an 8-frame settle). Walls: rise 12 at 12, idle 8 at 10. Aura and aura_back: 12 at 10.
const FLY_N = 8, FLY_FPS = 10;
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** His spiral vortex ball: the swirl turns a quarter turn a frame, exactly (no resampling), twice
 *  round per loop; his five arms then advance a fifth of their spacing a frame, a steady
 *  counter-clockwise spin the way the arms trail. The trail streaks ripple, the leaves bob. */
function bolt(): Built {
  const s = spr('bolt');
  const swirl = layer(s, 'swirl'), main = layer(s, 'main'), ls = leaves(s);
  const cx = s.ax + 0.5, cy = s.ay + 0.5;
  const frames = range(FLY_N).map((k) => {
    const t = k / FLY_N;
    // The trail streaks ripple along their length (whole columns move, so their outline holds).
    const trail = k ? warp(main, (x) => (x < s.ax - 18 ? [0, wave(x * 0.5, t, 0.8)] : [0, 0])) : main;
    const lv = drawLeaves(s.W, s.H, ls, (l, i) => ({ ...bob(t, 1.4, i * 2.1), flip: ((k >> 1) & 1) === 1 }));
    return stack(s.W, s.H, trail, quarterTurns(swirl, k, cx, cy), lv);
  });
  return { anims: { fly: { frames, fps: FLY_FPS, loop: true } }, ax: s.ax, ay: s.ay };
}

/** His braided jet: a 64 px tile cut round his second crescent that scrolls forward 8 px a frame. */
const STEP = 64 / FLY_N;
function streamTile(): { tile: Canvas[]; base: Canvas } {
  const s = spr('stream', 0);
  const base = layer(s, 'tile', 0);
  const tile = range(FLY_N).map((k) => {
    const out = new Canvas(64, base.h);
    for (let y = 0; y < base.h; y++)
      for (let x = 0; x < 64; x++) {
        const p = base.get((((x - STEP * k) % 64) + 64) % 64, y);
        if (p[3]) out.set(x, y, p);
      }
    return out;
  });
  return { tile, base };
}
/** His flaring head: left of his big crescent it shows the scrolling tile (so it joins the tile in
 *  every frame); the crescent hides the seam and swells forward a pixel; his spray flutters and
 *  his leaves bob. */
function streamHead(base: Canvas): Canvas[] {
  const s = spr('stream_head', 0);
  const head = layer(s, 'head', 0), cres = layer(s, 'crescent', 0), ls = leaves(s, 0);
  const back = s.ref.back ?? [];
  const W = s.W + 4; // room for the spray to flutter forward
  return range(FLY_N).map((k) => {
    const t = k / FLY_N;
    const pulse = Math.round(0.5 - 0.5 * Math.cos(TAU * t));
    const out = new Canvas(W, s.H);
    for (let y = 0; y < s.H; y++)
      for (let x = 0; x < s.W; x++) {
        let p: Color;
        // (when the crescent swells forward, the tile shows in the pixel it leaves)
        if (x < (back[y] ? back[y] + pulse : 0)) p = base.get((((x - STEP * k) % 64) + 64) % 64, y);
        else p = head.get(x, y);
        if (p[3]) out.set(x, y, p);
      }
    // His spray right of the head crescent flutters.
    const spray = keep(out, (x) => x >= 76);
    const body = keep(out, (x) => x < 76);
    const fl = k ? warp(spray, (x, y) => [Math.max(0, wave(y * 0.7, t, 0.9)), 0]) : spray;
    const lv = drawLeaves(W, s.H, ls, (l, i) => ({ ...bob(t, 1.4, i * 2), flip: ((k >> 1) & 1) === 1 }));
    return stack(W, s.H, body, fl, shifted(cres, pulse, 0), lv);
  });
}

/** His vortex funnel: the funnel undulates along its axis (a wave rolling out from the mouth), the
 *  leaves inside and round it bob. The origin (mouth) is 48 px left of the anchor. */
function breath(): Built {
  const s = spr('breath');
  const main = layer(s, 'main'), ls = leaves(s);
  const x0 = s.ax - 48;
  const frames = range(FLY_N).map((k) => {
    const t = k / FLY_N;
    const body = k ? warp(main, (x) => [0, wave((x - x0) * 0.26, t, clamp((x - x0) / 60, 0, 1) * 1.3)]) : main;
    const lv = drawLeaves(s.W, s.H, ls, (l, i) => bob(t, 1.8, i * 1.7));
    return stack(s.W, s.H, body, lv);
  });
  return { anims: { fly: { frames, fps: FLY_FPS, loop: true } }, ax: s.ax, ay: s.ay };
}

/** His ball of wind: the bands inside the ball churn (a wave rolling down through them), the orbit
 *  rings outside the ball stay, the leaves bob along them. */
function sphere(): Built {
  const s = spr('sphere');
  const main = layer(s, 'main'), ls = leaves(s);
  const R = 21;
  const frames = range(FLY_N).map((k) => {
    const t = k / FLY_N;
    const body = k
      ? warp(main, (x, y) => {
          const r = Math.hypot(x + 0.5 - s.ax, y + 0.5 - s.ay);
          const w = clamp((R - r) / 4, 0, 1);
          return [wave((y - s.ay) * 0.45, t, 1.6 * w), 0];
        })
      : main;
    const lv = drawLeaves(s.W, s.H, ls, (l, i) => bob(t, 1.5, i * 2.4));
    return stack(s.W, s.H, body, lv);
  });
  return { anims: { fly: { frames, fps: FLY_FPS, loop: true } }, ax: s.ax, ay: s.ay };
}

/** His crescent of swept strokes: the strokes behind the blade ripple, the blade holds. */
function slash(): Built {
  const s = spr('slash');
  const main = layer(s, 'main'), ls = leaves(s);
  const blade = s.ax + 8; // his crescent is right of this
  const frames = range(FLY_N).map((k) => {
    const t = k / FLY_N;
    const body = k ? warp(main, (x) => [0, x < blade ? wave(x * 0.45, t, 0.9 * clamp((blade - x) / 12, 0, 1)) : 0]) : main;
    const lv = drawLeaves(s.W, s.H, ls, (l, i) => ({ ...bob(t, 1.4, i * 2.2), flip: ((k >> 1) & 1) === 1 }));
    return stack(s.W, s.H, body, lv);
  });
  return { anims: { fly: { frames, fps: FLY_FPS, loop: true } }, ax: s.ax, ay: s.ay };
}

/** His small tornado cones: each cone's bands ripple round it and the cone bobs a pixel, out of
 *  step with the others; the trails ripple. */
function multi(): Built {
  const s = spr('multi');
  const cones = ['cone1', 'cone2', 'cone3', 'cone4'].map((n) => layer(s, n));
  const main = layer(s, 'main'), ls = leaves(s);
  const frames = range(FLY_N).map((k) => {
    const t = k / FLY_N;
    const parts = cones.map((c, j) => {
      if (!k) return c;
      // Cone 4 lies on its side (axis left to right): its bands ripple up and down.
      const rip = j === 3 ? warp(c, (x) => [0, wave(x * 0.9, t, 0.8)]) : warp(c, (_, y) => [wave(y * 0.9, t, 0.8), 0]);
      return shifted(rip, 0, Math.round(Math.sin(TAU * t + j * 1.6) - Math.sin(j * 1.6)));
    });
    const tr = k ? warp(main, (x) => [0, wave(x * 0.5, t, 0.7)]) : main;
    const lv = drawLeaves(s.W, s.H, ls, (l, i) => ({ ...bob(t, 1.2, i * 2), flip: ((k >> 1) & 1) === 1 }));
    return stack(s.W, s.H, tr, ...parts, lv);
  });
  return { anims: { fly: { frames, fps: FLY_FPS, loop: true } }, ax: s.ax, ay: s.ay };
}

/** Colours pulled toward a deep teal by k (0 keeps them): wind cooling as it dies. */
function cool(c: Canvas, k: number, to: Color): Canvas {
  if (k <= 0) return c;
  const out = new Canvas(c.w, c.h);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const p = c.get(x, y);
      if (p[3]) out.set(x, y, [Math.round(p[0] + (to[0] - p[0]) * k), Math.round(p[1] + (to[1] - p[1]) * k), Math.round(p[2] + (to[2] - p[2]) * k), p[3]]);
    }
  return out;
}
/** A mid-dark teal from a sprite's own palette (his colours), for cooling. */
function deepTeal(s: Spr): Color {
  const wind = s.pal.filter((p) => p[3] === 255 && p[1] > p[0] + 15 && p[2] >= p[0]).sort((a, b) => lum(a) - lum(b));
  return wind[Math.floor(wind.length * 0.3)];
}

/** His X of wind blades. It builds up from the hit point over 3 frames (growing and filling in),
 *  frame 4 is his picture and it holds for 3 frames with a faint shimmer along the blades, then it
 *  dissipates over 6 frames: spreading a little, cooling to teal, scattering and fading, while the
 *  leaves fly on outward and drop. Brightness rises and falls smoothly: no single-frame flash. */
function hit(): Built {
  const s = spr('hit');
  const main = layer(s, 'main'), ls = leaves(s);
  const cx = s.ax + 0.5, cy = s.ay + 0.5;
  const teal = deepTeal(s);
  const plan = [
    { k: 0.52, fade: 0.72, leaf: 0.45, cool: 0, scatter: 0, shimmer: 0 },
    { k: 0.7, fade: 0.86, leaf: 0.68, cool: 0, scatter: 0, shimmer: 0 },
    { k: 0.86, fade: 0.95, leaf: 0.86, cool: 0, scatter: 0, shimmer: 0 },
    { k: 1, fade: 1, leaf: 1, cool: 0, scatter: 0, shimmer: 0 },
    { k: 1, fade: 1, leaf: 1.04, cool: 0, scatter: 0, shimmer: 1 / 3 },
    { k: 1.015, fade: 1, leaf: 1.08, cool: 0.05, scatter: 0, shimmer: 0 },
    { k: 1.03, fade: 0.9, leaf: 1.13, cool: 0.12, scatter: 0, shimmer: 0 },
    { k: 1.05, fade: 0.78, leaf: 1.19, cool: 0.2, scatter: 0.06, shimmer: 0 },
    { k: 1.07, fade: 0.64, leaf: 1.25, cool: 0.28, scatter: 0.12, shimmer: 0 },
    { k: 1.09, fade: 0.5, leaf: 1.31, cool: 0.36, scatter: 0.18, shimmer: 0 },
    { k: 1.11, fade: 0.36, leaf: 1.37, cool: 0.44, scatter: 0.24, shimmer: 0 },
    { k: 1.13, fade: 0.22, leaf: 1.43, cool: 0.52, scatter: 0.3, shimmer: 0 },
  ];
  const frames = plan.map((p, i) => {
    let body = p.k === 1 ? main : scaled(main, p.k, p.k, cx, cy);
    // While it holds: a faint shimmer running along the two diagonals of the X.
    if (p.shimmer) body = warp(body, (x, y) => [wave((x - y) * 0.35, p.shimmer, 0.4), 0]);
    if (p.scatter) body = disperse(body, p.scatter, 4300 + i, (x, y) => 0.25 - Math.hypot(x - cx, y - cy) / 120);
    body = cool(body, p.cool, teal);
    if (p.fade < 1) body = alphaMul(body, p.fade);
    const lv = drawLeaves(s.W, s.H, ls, (l) => ({
      dx: (l.cx - cx) * (p.leaf - 1),
      dy: (l.cy - cy) * (p.leaf - 1) + (i > 5 ? (i - 5) * (i - 5) * 0.3 : 0),
      flip: ((i >> 1) & 1) === 1,
      hide: i === 0,
    }));
    return stack(s.W, s.H, body, i >= 10 ? alphaMul(lv, i === 10 ? 0.7 : 0.4) : lv);
  });
  return { anims: { hit: { frames, fps: 12, loop: false } }, ax: s.ax, ay: s.ay };
}

// --- blast ------------------------------------------------------------------------------------------------

/** His tornado over a spiral of wind on the ground (16 frames). Anticipation (1-3): the spiral
 *  winds up on the ground and spreads, the glow grows, the funnel's tip touches down. Growth (4-5):
 *  the funnel builds from its tip up, squashed, thin and faint at first. Frame 6 is his picture, held to frame 8 while
 *  the spiral keeps turning and the funnel starts to writhe. Settle (9-16): it writhes, lifts off
 *  the ground from the tip up and fades, the spiral and the glow fade, the leaves are swept round
 *  the funnel and rise. */
function blast(): Built {
  const s = spr('blast');
  const ground = layer(s, 'main'), funnel = layer(s, 'funnel'), glow = layer(s, 'glow'), ls = leaves(s);
  const cx = s.ax + 0.5, cy = s.ay + 0.5;
  const fb = funnel.bounds()!;
  const tipY = fb[3], topY = fb[1];
  const ratio = 3.2; // his ground spiral is about 3.2 times wider than tall
  const D = Math.PI / 180;
  const PEAK = 5;
  type Step = { ring: number; turn: number; grow: number; glow: number; writhe: number; gone: number; lift: number; ringGone: number };
  const plan: Step[] = [
    { ring: 0.36, turn: -100, grow: 0, glow: 0.25, writhe: 0, gone: 0, lift: 0, ringGone: 0 },
    { ring: 0.56, turn: -80, grow: 0.14, glow: 0.45, writhe: 0, gone: 0, lift: 0, ringGone: 0 },
    { ring: 0.72, turn: -60, grow: 0.38, glow: 0.62, writhe: 0, gone: 0, lift: 0, ringGone: 0 },
    { ring: 0.86, turn: -40, grow: 0.62, glow: 0.78, writhe: 0, gone: 0, lift: 0, ringGone: 0 },
    { ring: 0.95, turn: -20, grow: 0.84, glow: 0.9, writhe: 0, gone: 0, lift: 0, ringGone: 0 },
    { ring: 1, turn: 0, grow: 1, glow: 1, writhe: 0, gone: 0, lift: 0, ringGone: 0 },
    { ring: 1, turn: 10, grow: 1, glow: 1, writhe: 0.35, gone: 0, lift: 0, ringGone: 0 },
    { ring: 1, turn: 20, grow: 1, glow: 1, writhe: 0.6, gone: 0, lift: 0, ringGone: 0 },
  ];
  for (let j = 1; j <= 8; j++) {
    const u = j / 8;
    plan.push({ ring: 1 + 0.01 * j, turn: 20 + 10 * j, grow: 1, glow: 1 - 0.85 * u, writhe: Math.min(1, 0.6 + 0.2 * j), gone: 0.86 * u ** 1.2, lift: -1.75 * j, ringGone: 0.85 * u });
  }
  const frames = plan.map((p, i) => {
    const t = Math.max(0, i - PEAK) / 8;
    let g = p.ring === 1 ? glow : scaled(glow, p.ring, p.ring, cx, cy);
    if (p.glow !== 1) g = alphaMul(g, p.glow);
    let r = p.turn ? turnOnGround(ground, p.turn * D, cx, cy, ratio) : ground;
    if (p.ring !== 1) r = scaled(r, p.ring, p.ring, cx, cy);
    if (p.ringGone) r = alphaMul(disperse(r, p.ringGone * 0.45, 5100 + i), 1 - p.ringGone * 0.8);
    let f: Canvas | null = null;
    if (p.grow > 0) {
      if (p.grow < 1) {
        // Built from the tip up: squashed toward the ground, cut at the height reached so far,
        // thinner while young, and still faint, so it fills in smoothly.
        const reach = tipY - (tipY - topY + 4) * Math.min(1, p.grow * 1.25);
        f = scaled(funnel, 0.55 + 0.45 * p.grow, 0.35 + 0.65 * p.grow, cx, tipY);
        f = keep(f, (x, y) => y >= reach - 4 * hash(x >> 1, 0, 51));
        f = alphaMul(f, 0.5 + 0.5 * p.grow);
      } else f = funnel;
      if (p.writhe) f = warp(f, (x, y) => [wave((tipY - y) * 0.16, t, 1.6 * p.writhe * clamp((tipY - y) / 40, 0.3, 1)), 0]);
      // Spent, it lifts off the ground from the tip up and fades.
      if (p.gone) {
        const cut = tipY - (tipY - topY) * p.gone * 0.6;
        f = keep(f, (x, y) => y < cut + 4 * hash(x >> 1, 1, 52));
        f = alphaMul(f, 1 - p.gone * 0.85);
      }
      if (p.lift) f = shifted(f, 0, p.lift);
    }
    const lv = drawLeaves(s.W, s.H, ls, (l, j) => {
      if (i < 2) return { dx: 0, dy: 0, hide: true };
      // Swept round the funnel: along an ellipse about the axis, rising after the peak.
      const ang = (i - PEAK) * 0.1 * (j % 2 ? 1 : 0.8);
      const rx = l.cx - cx, ry = (l.cy - cy) * 1.6;
      const nx = rx * Math.cos(ang) - ry * Math.sin(ang), ny = (rx * Math.sin(ang) + ry * Math.cos(ang)) / 1.6;
      const spread = i < PEAK ? 0.6 + (0.4 * (i - 2)) / (PEAK - 2) : 1 + 0.02 * (i - PEAK);
      return { dx: cx + nx * spread - l.cx, dy: cy + ny * spread - l.cy - Math.max(0, i - PEAK) * 1.6, flip: ((i >> 1) & 1) === 1, hide: i >= 14 && j % 2 === 0 };
    });
    return stack(s.W, s.H, g, r, f, i >= 13 ? alphaMul(lv, [0.75, 0.5, 0.3][i - 13]) : lv);
  });
  return { anims: { blast: { frames, fps: 12, loop: false } }, ax: s.ax, ay: s.ay };
}

// --- walls -------------------------------------------------------------------------------------------------

interface WallSpec {
  name: string;
  /** The ground under a pixel column (work px): where its art rises from. */
  ground: (x: number) => number;
  /** Idle motion of the ribbons: displacement at (x, y) for loop phase t; h is the height above
   *  the ground as a fraction of the wall's height (0 at the foot, 1 at the top). Kept to long,
   *  gentle waves so his strokes move as a whole instead of tearing. */
  writhe: (x: number, y: number, t: number, h: number) => [number, number];
}
const RISE_N = 12, IDLE_N = 8;
/** Rise (12, once): the wall grows up out of its own dust, his picture at the end (= idle frame 1).
 *  Idle (8, loop): his ribbons writhe with small travelling waves, the dust churns, the leaves are
 *  carried round. */
function wall(spec: WallSpec): Built {
  const s = spr(spec.name);
  const main = layer(s, 'main'), dust = layer(s, 'dust'), glow = layer(s, 'glow'), ls = leaves(s);
  const mb = main.bounds()!;
  let hMax = 0;
  for (let x = mb[0]; x <= mb[2]; x++) hMax = Math.max(hMax, spec.ground(x) - mb[1]);
  const idle = range(IDLE_N).map((k) => {
    const t = k / IDLE_N;
    const m = k ? warp(main, (x, y) => spec.writhe(x, y, t, clamp((spec.ground(x) - y) / hMax, 0, 1))) : main;
    const d = k ? warp(dust, (x, y) => [wave(y * 0.5 + x * 0.05, t, 0.7), 0]) : dust;
    const g = k ? alphaMul(glow, 1 + 0.12 * Math.sin(TAU * t)) : glow;
    const lv = drawLeaves(s.W, s.H, ls, (l, i) => ({ ...bob(t, 2, i * 1.9), flip: (((k >> 1) + i) & 1) === 1 }));
    return stack(s.W, s.H, g, d, m, lv);
  });
  const rise = range(RISE_N).map((k) => {
    if (k === RISE_N - 1) return idle[0];
    const f = (k + 1) / RISE_N;
    // Grown up from the ground: squashed toward it and cut at the height reached so far.
    const sy = 0.3 + 0.7 * f;
    const reach = hMax * Math.min(1, f * 1.12);
    const grow = (c: Canvas) => {
      const out = new Canvas(c.w, c.h);
      for (let y = 0; y < c.h; y++)
        for (let x = 0; x < c.w; x++) {
          const gy = spec.ground(x);
          const h = gy - (y + 0.5);
          if (h > reach + 2 * hash(x, 0, 61)) continue;
          const p = c.get(x, Math.floor(gy - h / sy));
          if (p[3]) out.set(x, y, p);
        }
      return out;
    };
    const d = k < 4 ? disperse(dust, [0.6, 0.45, 0.3, 0.15][k], 6100 + k) : dust;
    const g = alphaMul(glow, f);
    const lv = drawLeaves(s.W, s.H, ls, (l, i) => ({ dx: 0, dy: (spec.ground(Math.round(l.cx)) - l.cy) * (1 - f), hide: k < 4 || (k < 8 && (i + k) % 3 === 0) }));
    return stack(s.W, s.H, g, d, grow(main), lv);
  });
  return { anims: { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 10, loop: true } }, ax: s.ax, ay: s.ay };
}

function wallH(): Built {
  const s = spr('wall');
  return wall({
    name: 'wall',
    ground: () => s.ay,
    // The bank sways: the tops of his ribbons lean with a wave running along the wall.
    writhe: (x, _y, t, h) => [h * wave((x / 120) * TAU, t, 1.2), 0],
  });
}
function wallDiag(): Built {
  // His base runs from his lower-left (40, 226) to his upper-right (186, 118), in canvas pixels.
  const g0 = [40 + PAD, 226 + PAD], g1 = [186 + PAD, 118 + PAD];
  const ground = (x: number) => g0[1] + ((x - g0[0]) / (g1[0] - g0[0])) * (g1[1] - g0[1]);
  return wall({
    name: 'wall_diag',
    ground: (x) => ground(clamp(x, g0[0] - 30, g1[0] + 30)),
    writhe: (x, y, t, h) => [h * wave(((x - y) / 140) * TAU, t, 1.3), 0],
  });
}
function wallDepth(): Built {
  const s = spr('wall_depth');
  const base = layer(s, 'dust').bounds()![3];
  return wall({
    name: 'wall_depth',
    ground: () => base,
    // The column writhes: a wave climbing it, stronger higher up.
    writhe: (_x, y, t, h) => [wave((y / 64) * TAU, t, 0.4 + 0.9 * h), 0],
  });
}

// --- aura ----------------------------------------------------------------------------------------------------

const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lum = (p: Color): number => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];

/**
 * His wind colour over the body, as in his picture, where the figure is seen through the wind (the
 * owner chose a tint over a clear middle, as for the lightning aura). A soft field round the body,
 * 30% in the middle rising to 45% toward its rim, mid teal inside and mint at the rim (both from
 * his aura palette); not the shape of any one character, so it sits right on every figure. It
 * breathes with the loop phase t (frame 1 is his picture).
 */
function veil(s: Spr, t: number): Canvas {
  const c = new Canvas(s.W, s.H);
  const wind = s.pal.filter((p) => p[3] === 255 && p[1] > p[0] + 15 && p[2] >= p[0]).sort((a, b) => lum(a) - lum(b));
  const inner = wind[Math.floor(wind.length * 0.6)], rim = wind[Math.floor(wind.length * 0.92)];
  const cx = s.ax + 0.5, cy = s.ay - 49, rx = 24, ry = 56;
  const breathe = 1 + 0.08 * Math.sin(t * TAU);
  for (let y = 0; y < s.H; y++)
    for (let x = 0; x < s.W; x++) {
      const r = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      let a = (0.3 + 0.15 * smooth(0.5, 0.95, r)) * (1 - smooth(0.9, 1.04, r)) * breathe;
      a = Math.round(a / 0.05) * 0.05;
      if (a <= 0.02) continue;
      // Three bands of colour from the middle out, so it reads as pixel art, not a gradient.
      const b = Math.round(smooth(0.3, 1, r) * 2) / 2;
      const col = [0, 1, 2].map((i) => Math.round(inner[i] + (rim[i] - inner[i]) * b));
      c.set(x, y, [col[0], col[1], col[2], Math.round(Math.min(1, a) * 255)]);
    }
  return c;
}

/** His ribbons spiralling round the figure (front, over the character) with a travelling wave
 *  climbing them, leaves circling, over a veil of his wind colour that tints the figure (see
 *  veil()); his green glow is split off as aura_back (behind the character) and breathes. Both
 *  share the frame, the anchor (the feet) and the frame index: 12 frames at 10 fps. */
const AURA_N = 12, AURA_FPS = 10;
function aura(): { front: Built; back: Built } {
  const s = spr('aura');
  const main = layer(s, 'main'), glow = layer(s, 'glow'), ls = leaves(s);
  const front: Canvas[] = [], back: Canvas[] = [];
  for (let k = 0; k < AURA_N; k++) {
    const t = k / AURA_N;
    const m = k ? warp(main, (x, y) => [wave(y * 0.2, t, 0.9 * (Math.sign(x - s.ax) || 1)), 0]) : main;
    const lv = drawLeaves(s.W, s.H, ls, (l, i) => ({ ...bob(t, 2, i * 1.5), flip: (((k >> 1) + i) & 1) === 1 }));
    // The veil first (over the character), then his ribbons and leaves on top of it.
    front.push(stack(s.W, s.H, veil(s, t), m, lv));
    back.push(k ? alphaMul(glow, 1 + 0.15 * Math.sin(TAU * t)) : glow);
  }
  // One frame for both, so they stay aligned.
  const both = fit({ anims: { idle: { frames: [...front, ...back], fps: AURA_FPS, loop: true } }, ax: s.ax, ay: s.ay });
  const fr = both.anims.idle.frames;
  return {
    front: { anims: { idle: { frames: fr.slice(0, AURA_N), fps: AURA_FPS, loop: true } }, ax: both.ax, ay: both.ay },
    back: { anims: { idle: { frames: fr.slice(AURA_N), fps: AURA_FPS, loop: true } }, ax: both.ax, ay: both.ay },
  };
}

// --- the group --------------------------------------------------------------------------------------------------

function sprite(name: string, label: string, b: Built): WorldSprite {
  const f = Object.values(b.anims)[0].frames[0];
  const m = (v: number) => Math.round((v / PX_PER_M) * 100) / 100;
  return { name, label, meters: [m(f.w), m(f.h)], anchor: [b.ax, b.ay], tags: ['vfx'], anims: b.anims };
}

export function windV3Sprites(): WorldSprite[] {
  const st = streamTile();
  const tile = st.tile, head = streamHead(st.base);
  // The tile stays 64 x 64 with its centreline on y = 32 (his braid fits with rows to spare); the
  // head keeps the tile's anchor row and grows to its art (his big crescents are taller).
  const ty = WV3_REF.stream.anchor[1];
  const [, by0, , by1] = bounds(tile);
  if (by0 < ty - 32 || by1 > ty + 31) throw new Error('vfx-wind-v3: the stream tile no longer fits 64 px');
  const hb = bounds(head);
  const tileB = fit({ anims: { fly: { frames: tile, fps: FLY_FPS, loop: true } }, ax: 32, ay: ty }, { x: [0, 63], y: [ty - 32, ty + 31] });
  const headB = fit({ anims: { fly: { frames: head, fps: FLY_FPS, loop: true } }, ax: 32, ay: WV3_REF.stream_head.anchor[1] }, { x: [0, hb[2] + 1], y: [hb[1] - 1, hb[3] + 1] });
  const a = aura();
  return [
    sprite('bolt', 'Wind bolt (spiral vortex ball, his paint-over)', fit(bolt())),
    sprite('stream', 'Wind stream (braided jet with crescent rings, tileable 64 px)', tileB),
    sprite('stream_head', 'Wind stream head (big crescents and spray)', headB),
    sprite('breath', 'Wind breath (vortex funnel, origin 48 px left of the anchor)', (() => {
      const b = breath();
      return fit(b, { include: [b.ax - 48, b.ay] });
    })()),
    sprite('sphere', 'Wind sphere (ball of wind with orbiting rings)', fit(sphere())),
    sprite('slash', 'Wind slash (crescent of swept strokes)', fit(slash())),
    sprite('multi', 'Wind multi (small tornado cones)', fit(multi())),
    sprite('hit', 'Wind hit (X cross of wind blades, leaves)', fit(hit())),
    sprite('blast', 'Wind blast (tornado over a spiral of wind rings)', fit(blast())),
    sprite('wall', 'Wind wall (swirling ribbons over a dust bank)', fit(wallH())),
    sprite('wall_diag', 'Wind wall, 3/4 (sweeping strands along the diagonal, glow, dust)', fit(wallDiag())),
    sprite('wall_depth', 'Wind wall, end-on (tornado column on a dust base)', fit(wallDepth())),
    sprite('aura', 'Wind aura, front (ribbons spiralling round the figure, leaves, a wind veil over the body)', a.front),
    sprite('aura_back', 'Wind aura, back (green glow behind the figure)', a.back),
  ];
}

// --- checks -------------------------------------------------------------------------------------------------------

/** Pixels on the frame border, per frame (the stream tile wraps; the head's left edge is its joint). */
export function borderReport(sprites: WorldSprite[]): string[] {
  const lines: string[] = [];
  for (const s of sprites) {
    for (const [k, a] of Object.entries(s.anims))
      a.frames.forEach((f, i) => {
        if (s.name === 'stream') return;
        let n = 0;
        for (let x = 0; x < f.w; x++) n += (f.alpha(x, 0) ? 1 : 0) + (f.alpha(x, f.h - 1) ? 1 : 0);
        for (let y = 1; y < f.h - 1; y++) n += (s.name === 'stream_head' ? 0 : f.alpha(0, y) ? 1 : 0) + (f.alpha(f.w - 1, y) ? 1 : 0);
        if (n) lines.push(`${s.name} ${k}[${i}]: ${n} px on the border`);
      });
  }
  return lines;
}

/**
 * The flash check: each frame's mean alpha x brightness, and the biggest change between
 * neighbouring frames (and from the last frame back to the first, for loops) as a share of the
 * animation's brightest frame. A flash would show as a big jump.
 */
export function flashReport(sprites: WorldSprite[]): { lines: string[]; worst: number } {
  const lines: string[] = [];
  let worst = 0;
  for (const s of sprites) {
    if (s.name === 'beast') continue;
    for (const [k, a] of Object.entries(s.anims)) {
      const e = a.frames.map((f) => {
        let sum = 0;
        for (let y = 0; y < f.h; y++)
          for (let x = 0; x < f.w; x++) {
            const p = f.get(x, y);
            if (p[3]) sum += (p[3] / 255) * ((0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]) / 255);
          }
        return sum / (f.w * f.h);
      });
      const peak = Math.max(...e);
      let jump = 0;
      for (let i = 1; i < e.length; i++) jump = Math.max(jump, Math.abs(e[i] - e[i - 1]));
      if (a.loop !== false) jump = Math.max(jump, Math.abs(e[0] - e[e.length - 1]));
      const rel = peak ? jump / peak : 0;
      worst = Math.max(worst, rel);
      lines.push(`${s.name.padEnd(12)} ${k.padEnd(6)} ${a.frames.length}f@${a.fps}  brightness ${e.map((v) => Math.round((v / peak) * 100)).join(' ')}  biggest step ${Math.round(rel * 100)}%`);
    }
  }
  return { lines, worst };
}

// --- main ----------------------------------------------------------------------------------------------------------

function main(): void {
  const root = process.env.WORLD_OUT;
  if (!root) throw new Error('vfx-wind-v3: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
  const sprites = windV3Sprites();
  const tmpRoot = join(root, `.${GROUP}.tmp`);
  rmSync(tmpRoot, { recursive: true, force: true });
  writeGroup(GROUP, sprites, tmpRoot);
  const tmpDir = join(tmpRoot, GROUP);
  // The beast is out of scope (another artist redraws it): carried over unchanged from vfx_wind.
  const oldDir = join(root, 'vfx_wind');
  if (existsSync(join(oldDir, 'beast.png')) && existsSync(join(oldDir, 'manifest.json'))) {
    const old = JSON.parse(readFileSync(join(oldDir, 'manifest.json'), 'utf8'));
    const man = JSON.parse(readFileSync(join(tmpDir, 'manifest.json'), 'utf8'));
    if (old.sprites?.beast) {
      copyFileSync(join(oldDir, 'beast.png'), join(tmpDir, 'beast.png'));
      const ordered: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(man.sprites)) {
        ordered[k] = v;
        if (k === 'bolt') ordered.beast = old.sprites.beast;
      }
      man.sprites = ordered;
      writeFileSync(join(tmpDir, 'manifest.json'), JSON.stringify(man, null, 1) + '\n');
    }
  } else console.warn('vfx-wind-v3: no staging/vfx_wind/beast.png to carry over; the group has no beast');
  const dest = join(root, GROUP);
  mkdirSync(dest, { recursive: true });
  // Whole files only: PNGs first (each renamed into place), the manifest last.
  const files = readdirSync(tmpDir).sort((a, b) => Number(a === 'manifest.json') - Number(b === 'manifest.json') || (a < b ? -1 : 1));
  for (const f of files) {
    const part = join(dest, `${f}.part`);
    copyFileSync(join(tmpDir, f), part);
    renameSync(part, join(dest, f));
  }
  rmSync(tmpRoot, { recursive: true, force: true });
  for (const s of sprites) {
    const f0 = Object.values(s.anims)[0].frames[0];
    const anims = Object.entries(s.anims).map(([k, a]) => `${k}:${a.frames.length}@${a.fps}${a.loop === false ? ' once' : ''}`).join(' ');
    console.log(`${GROUP} ${s.name.padEnd(12)} ${f0.w}x${f0.h} anchor ${s.anchor} ${anims}`);
  }
  const border = borderReport(sprites);
  console.log(border.length ? border.join('\n') : 'border check: no pixel on any frame border (stream tiles and the head joint excepted)');
  const flash = flashReport(sprites);
  console.log('flash check (each frame\'s mean alpha x brightness, % of the brightest frame):');
  console.log(flash.lines.join('\n'));
  console.log(`flash check: biggest step between neighbouring frames ${Math.round(flash.worst * 100)}% of the brightest frame`);
  // Every sheet row must stay under 8192 px.
  for (const s of sprites)
    for (const [k, a] of Object.entries(s.anims)) {
      const w = a.frames.length * a.frames[0].w;
      if (w >= 8192) throw new Error(`vfx-wind-v3: ${s.name} ${k} row is ${w} px wide`);
    }
}

main();
