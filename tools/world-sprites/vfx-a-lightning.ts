// Lightning jutsu VFX: jagged, branching, flickering. Every frame re-rolls the bolts (lightning
// never holds a shape), the strokes are thin and white-hot inside an electric-blue edge with an
// indigo outline, a soft blue glow hugs them, and small yellow sparks spit off.
// Palette: indigo outline, royal blue, electric blue, sky blue, light blue, blue-white, white;
// sparks in yellow.

import { Canvas, Color, WorldSprite, withAlpha } from './kit';
import {
  Field, Pt, TAU, arc, bez, clamp, crop, dist, flySprite, frames, fract, jag, lerp, outlineIn, palette, pnoise, render, rr, seamStack, smooth, stack, vfxSprite,
} from './vfx-a-lib';

export const BOLT = palette('#170c45', '#2a2a9a', '#3b55e8', '#3fa2ff', '#93d6ff', '#dcf3ff', '#ffffff');
const SPARK = palette('#4a2a08', '#c47a12', '#f2b21c', '#ffe84a', '#fff8b0', '#fffff0', '#ffffff');
const TH = [0, 0.16, 0.32, 0.48, 0.64, 0.8];
const ROCK = palette('#120c20', '#2e2638', '#4a4052', '#6a5e70', '#8c8090', '#aea2b0', '#d0c6d2');

/** A lightning stroke: white core, blue edge (call with r 1.6-3). */
/** The original thin stroke, kept for the hound so the beast stays exactly as handed over. */
function strokeKeep(f: Field, pts: Pt[], r: number, heat = 1): void {
  f.path(pts, r, heat, 1.1);
}
function stroke(f: Field, pts: Pt[], r: number, heat = 1): void {
  // Chunky strokes: a white core stepping out through every blue to the indigo edge.
  f.path(pts, r * 1.35 + 0.2, heat * 1.04, 1.25);
}
/** A main bolt with forks: returns its points so other parts can attach to it. */
function forked(f: Field, a: Pt, b: Pt, seed: number, r: number, forks: number, heat = 1, amp = 0.28): Pt[] {
  const pts = jag(a, b, seed, 4, amp);
  stroke(f, pts, r, heat);
  for (let k = 0; k < forks; k++) {
    const i = Math.floor(rr(seed + 1, k, 0.2, 0.8) * (pts.length - 1));
    const p = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const side = rr(seed + 2, k, 0, 1) < 0.5 ? -1 : 1;
    const ang = Math.atan2(dy, dx) + side * rr(seed + 3, k, 0.35, 0.9);
    const len = l * rr(seed + 4, k, 0.18, 0.4);
    stroke(f, jag(p, [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len], seed + 10 + k, 3, 0.3), r * 0.62, heat * 0.8);
  }
  return pts;
}
/** Renders bolts with a soft blue glow behind them. */
function boltR(f: Field, glow = true): Canvas {
  const c = render(f, BOLT, { th: TH, rim: [1] });
  if (!glow) return c;
  const g = new Canvas(f.w, f.h);
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      if (c.alpha(x, y)) continue;
      let near = 0;
      for (let oy = -3; oy <= 3 && !near; oy++) for (let ox = -3; ox <= 3 && !near; ox++) if (Math.abs(ox) + Math.abs(oy) <= 3 && c.alpha(x + ox, y + oy)) near = Math.abs(ox) + Math.abs(oy);
      if (near) g.set(x, y, withAlpha(BOLT[near <= 2 ? 2 : 1], near <= 2 ? 90 : 55));
    }
  return stack(f.w, f.h, g, c);
}
/** Yellow sparks: 1-3 px specks and little crosses. */
function sparks(w: number, h: number, list: { x: number; y: number; s: number }[]): Canvas {
  const c = new Canvas(w, h);
  for (const p of list) {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (p.s <= 1) c.set(x, y, SPARK[4]);
    else if (p.s === 2) {
      c.set(x, y, SPARK[5]);
      c.set(x + 1, y, SPARK[3]);
      c.set(x, y + 1, SPARK[3]);
    } else {
      c.set(x, y, SPARK[6]);
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.set(x + ox, y + oy, SPARK[4]);
      for (const [ox, oy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) c.set(x + ox, y + oy, SPARK[2]);
    }
  }
  outlineIn(c, SPARK[0], { alpha: 200 });
  return c;
}
const sparkList = (seed: number, n: number, cx: number, cy: number, r0: number, r1: number, w: number, h: number) => {
  const out: { x: number; y: number; s: number }[] = [];
  for (let k = 0; k < n; k++) {
    const a = rr(seed, k, 0, TAU), r = rr(seed + 1, k, r0, r1);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (x > 2 && y > 2 && x < w - 3 && y < h - 3) out.push({ x, y, s: k % 5 === 0 ? 3 : k % 2 ? 1 : 2 });
  }
  return out;
};

// --- bolt: a crackling spark ball -----------------------------------------------------------

function bolt(): WorldSprite {
  const W = 64, H = 64, cx = 38, cy = 32;
  const fr = frames(4, (t, i) => {
    const f = new Field(W, H);
    const sd = 400 + i * 37;
    // A zigzag tail trailing back.
    forked(f, [cx - 4, cy], [cx - 34, cy + rr(sd, 0, -6, 6)], sd + 1, 2, 2, 0.9, 0.3);
    // Short arcs crackling out of the ball.
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + rr(sd + 2, k, -0.3, 0.3);
      const len = rr(sd + 3, k, 7, 13);
      stroke(f, jag([cx + Math.cos(a) * 6, cy + Math.sin(a) * 6], [cx + Math.cos(a) * (8 + len), cy + Math.sin(a) * (8 + len)], sd + 5 + k, 2, 0.35), 1.05, 0.8);
    }
    f.disc(cx, cy, 10, 1.02, 1.3);
    const c = boltR(f);
    return stack(W, H, c, sparks(W, H, sparkList(sd + 9, 7, cx - 6, cy, 10, 22, W, H)));
  });
  return flySprite('bolt', 'Lightning bolt (spark ball)', fr);
}

// --- beast: a thunder hound -----------------------------------------------------------------
//
// 128 x 80, 6-frame gallop: the head and chest stay put, the legs cycle, the back stretches and
// gathers. Its body is electric blue with a white-hot core, jagged fur bristling along the back,
// crackles running through it, a bolt for a tail and sparks kicked up by its paws.

interface Gait {
  /** Leg angles (degrees from straight down, + = forward) for front near/far, hind near/far. */
  fn: number;
  ff: number;
  hn: number;
  hf: number;
  /** Back stretch (px) and body bob. */
  stretch: number;
  bob: number;
  /** How much the legs fold at the joints (0 = straight). */
  fold: number;
}
const GAIT: Gait[] = [
  { fn: 60, ff: 46, hn: -56, hf: -42, stretch: 4, bob: -1, fold: 0 },
  { fn: 24, ff: 8, hn: -22, hf: -8, stretch: 2, bob: 0, fold: 0.3 },
  { fn: -16, ff: -28, hn: 20, hf: 30, stretch: -2, bob: 1, fold: 0.75 },
  { fn: -32, ff: -42, hn: 34, hf: 44, stretch: -4, bob: 1, fold: 0.5 },
  { fn: 4, ff: -10, hn: 2, hf: -12, stretch: -1, bob: 0, fold: 0.45 },
  { fn: 40, ff: 28, hn: -38, hf: -26, stretch: 2, bob: -1, fold: 0.1 },
];

/** Turns a filled mask into heat by distance from its edge (white core, blue rim). */
function core(f: Field, depth: number, lo: number, hi: number): void {
  const W = f.w, H = f.h;
  const d = new Float32Array(W * H);
  for (let i = 0; i < d.length; i++) d[i] = f.v[i] > 0 ? 1e9 : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[y * W + x]) d[y * W + x] = Math.min(d[y * W + x], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.4, at(x + 1, y - 1) + 1.4);
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) if (d[y * W + x]) d[y * W + x] = Math.min(d[y * W + x], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.4, at(x - 1, y + 1) + 1.4);
  for (let i = 0; i < d.length; i++) if (f.v[i] > 0) f.v[i] = lerp(lo, hi, Math.min(1, d[i] / depth));
}

function leg(f: Field, hip: Pt, ang: number, len: number, w: number, hind: boolean, fold = 0): void {
  // Two segments: thigh and shin with a bent joint (hind legs bend backward), a paw at the end.
  const a = ang * (Math.PI / 180);
  len *= 1 - 0.22 * fold;
  const knee: Pt = [hip[0] + Math.sin(a) * len * 0.5, hip[1] + Math.cos(a) * len * 0.5];
  const bend = ((hind ? -1 : 1) * 0.35 + a * 0.3) * (1 + fold * 2.2);
  const foot: Pt = [knee[0] + Math.sin(a - bend) * len * 0.55, knee[1] + Math.cos(a - bend) * len * 0.55];
  f.path([hip, knee, foot], (u) => lerp(w, w * 0.42, u), 1);
  f.ell(foot[0] + 1.5, foot[1], 2.8, 1.8, 0, 1);
}

function beast(): WorldSprite {
  const W = 128, H = 80;
  const fr = frames(6, (t, i) => {
    const g = GAIT[i];
    const by = g.bob;
    const sd = 500 + i * 41;
    const parts: (Canvas | null)[] = [];
    const look = { th: TH, rim: [1], outline: false };
    // Far legs (behind, darker).
    const fl = new Field(W, H);
    leg(fl, [86, 42 + by], g.ff * 0.8, 25, 4, false, g.fold);
    leg(fl, [50 - g.stretch, 41 + by], g.hf * 0.8, 26, 4.6, true, g.fold);
    core(fl, 3, 0.2, 0.42);
    parts.push(render(fl, BOLT, look));
    // Tail: a bolt whipping back.
    const tl = new Field(W, H);
    strokeKeep(tl, jag([44 - g.stretch, 33 + by], [10, 22 + Math.sin(t * TAU) * 6], sd + 1, 4, 0.3), 2.6, 1);
    strokeKeep(tl, jag([28, 27], [6, 34 + Math.cos(t * TAU) * 5], sd + 2, 3, 0.35), 1.6, 0.8);
    parts.push(render(tl, BOLT, look));
    // Body: deep chest, slim waist, strong haunches, a jagged mane along the neck and back.
    const bd = new Field(W, H);
    bd.ell(68 - g.stretch * 0.5, 37 + by, 21 + g.stretch * 0.5, 6.5, -0.05, 1, 1);
    bd.ell(85, 39 + by, 9.5, 9.5, 0, 1, 1);
    bd.ell(50 - g.stretch, 36 + by, 8.5, 7.5, 0.1, 1, 1);
    bd.path([[86, 35 + by], [95, 31 + by], [102, 29 + by]], (u) => lerp(8, 6.5, u), 1);
    for (let k = 0; k < 11; k++) {
      const x = 101 - k * 5.2 - (k > 3 ? g.stretch * 0.4 : 0);
      const y = (k < 4 ? 24 + k * 2.6 : 31 + Math.sin(k * 1.7) * 0.8) + by;
      const hgt = rr(sd + 3, k, 6, 11) * (k < 4 ? 1.2 : 1);
      bd.poly([[x + 3, y + 4], [x - 7, y - hgt * 0.7], [x - 2.5, y + 4]], 1);
    }
    for (let k = 0; k < 4; k++) {
      const x = 90 - k * 6, y = 45 + by;
      bd.poly([[x + 3, y - 3], [x - 4, y + 4 + (k % 2) * 2], [x - 2, y - 3]], 1);
    }
    core(bd, 6, 0.22, 0.7);
    parts.push(render(bd, BOLT, look));
    // Head low and forward: skull, long muzzle with open jaws, ears flat back.
    const hd = new Field(W, H);
    const hx = 106, hy = 28 + by;
    hd.ell(hx, hy, 7.5, 6, -0.1, 1, 1);
    hd.poly([[hx + 2, hy - 4], [hx + 17, hy - 1], [hx + 18, hy + 2], [hx + 4, hy + 3]], 1);
    hd.poly([[hx + 1, hy + 4], [hx + 14, hy + 8], [hx + 13, hy + 10.5], [hx, hy + 8]], 1);
    hd.poly([[hx - 2, hy - 4], [hx - 12, hy - 12], [hx - 6, hy - 3]], 1);
    hd.poly([[hx + 2, hy - 5], [hx - 6, hy - 14], [hx + 4, hy - 5]], 1);
    core(hd, 4, 0.24, 0.72);
    parts.push(render(hd, BOLT, look));
    // Near legs in front.
    const nl = new Field(W, H);
    leg(nl, [83, 43 + by], g.fn, 26, 4.8, false, g.fold);
    leg(nl, [54 - g.stretch, 42 + by], g.hn, 27, 5.6, true, g.fold);
    core(nl, 3, 0.24, 0.62);
    parts.push(render(nl, BOLT, look));
    const all = seamStack(W, H, parts, BOLT[1], BOLT[0]);
    // White crackles running through the body, legs and head.
    const cr = new Field(W, H);
    strokeKeep(cr, jag([48 - g.stretch, 35 + by], [100, 29 + by], sd + 4, 4, 0.2), 1.1, 1.05);
    strokeKeep(cr, jag([62, 40 + by], [88, 44 + by], sd + 5, 3, 0.3), 0.9, 1);
    strokeKeep(cr, jag([102, 28 + by], [118, 27 + by], sd + 6, 2, 0.3), 0.8, 1);
    const crC = render(cr, BOLT, { th: TH, outline: false, lo: 5 });
    // Mouth, fangs and a glinting eye.
    for (let x = hx + 3; x <= hx + 15; x++) all.set(x, Math.round(hy + 3.5 + (x - hx - 3) * 0.15), BOLT[0]);
    for (const fx of [hx + 6, hx + 10, hx + 14]) all.set(fx, Math.round(hy + 4.4 + (fx - hx - 3) * 0.15), BOLT[6]);
    all.set(hx + 8, hy + 8, BOLT[6]);
    all.set(hx + 3, hy - 2, BOLT[0]);
    all.set(hx + 4, hy - 2, BOLT[0]);
    all.set(hx + 5, hy - 2, BOLT[0]);
    all.set(hx + 4, hy - 1, SPARK[4]);
    all.set(hx + 3, hy - 1, SPARK[3]);
    // Arcs jumping off the fur and sparks kicked up by the paws.
    const arcs = new Field(W, H);
    for (let k = 0; k < 3; k++) {
      const x = rr(sd + 6, k, 48, 98), y = rr(sd + 7, k, 22, 30) + by;
      strokeKeep(arcs, jag([x, y], [x - rr(sd + 8, k, 6, 12), y - rr(sd + 9, k, 4, 9)], sd + 10 + k, 2, 0.4), 1.3, 1.05);
    }
    const sp = sparks(W, H, [...sparkList(sd + 11, 6, 70, 70, 0, 26, W, H).map((p) => ({ ...p, y: 68 + (p.y - 70) * 0.25 })), ...sparkList(sd + 12, 5, 30, 30, 8, 26, W, H)]);
    return stack(W, H, all, crC, boltR(arcs, false), sp);
  });
  return flySprite('beast', 'Lightning beast (thunder hound)', fr);
}

// --- stream: a tileable lightning beam + a discharge head -----------------------------------

function stream(): WorldSprite[] {
  const W = 64, H = 64, PAD = 32, cy = 32;
  const beam = (f: Field, ox: number, sd: number) => {
    // A straight white-hot core with arcs coiling around it; the arcs repeat every 64 px.
    f.region(0, cy - 6, f.w - 1, cy + 6, (x, y) => {
      const d = Math.abs(y - cy) / 4.6;
      return d < 1 ? 1.05 * (1 - d * 0.75) : 0;
    });
    for (let k = 0; k < 3; k++) {
      const amp = 7 + k * 2;
      const y0 = cy + (k % 2 ? 1 : -1) * 2;
      const pts: Pt[] = [[0, y0]];
      const n = 3 + k;
      for (let j = 1; j < n; j++) pts.push([(j * 64) / n + rr(sd + k, j, -4, 4), cy + (rr(sd + 20 + k, j, 0, 1) < 0.5 ? -1 : 1) * rr(sd + 10 + k, j, amp * 0.5, amp)]);
      pts.push([64, y0]);
      const zig: Pt[] = [];
      for (let j = 0; j + 1 < pts.length; j++) zig.push(...jag(pts[j], pts[j + 1], sd + 30 + k * 10 + j, 2, 0.3).slice(0, -1));
      zig.push(pts[pts.length - 1]);
      for (const rep of [-64, 0, 64]) stroke(f, zig.map(([x, y]) => [x + rep + ox, y] as Pt), 1.3, 0.85);
    }
  };
  const tile = frames(4, (_, i) => {
    const f = new Field(W + PAD * 2, H);
    beam(f, PAD, 600 + i * 13);
    const c = boltR(f);
    const sp: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 4; k++) for (const rep of [-64, 0, 64]) sp.push({ x: rr(610 + i, k, 0, 64) + rep + PAD, y: cy + (k % 2 ? 1 : -1) * rr(611 + i, k, 12, 18), s: k % 2 ? 1 : 2 });
    return crop(stack(W + PAD * 2, H, c, sparks(W + PAD * 2, H, sp)), PAD, 0, W, H);
  });
  const head = frames(4, (_, i) => {
    const f = new Field(W + PAD, H);
    beam(f, PAD, 600 + i * 13);
    f.cut((x) => x > PAD + 34);
    const hx = PAD + 38;
    const sd = 620 + i * 17;
    // A crackling discharge ball with forks spraying forward and out.
    for (let k = 0; k < 6; k++) {
      const a = -1.1 + (k / 5) * 2.2 + rr(sd, k, -0.15, 0.15);
      forked(f, [hx + Math.cos(a) * 6, cy + Math.sin(a) * 6], [hx + Math.cos(a) * rr(sd + 1, k, 16, 24), cy + Math.sin(a) * rr(sd + 1, k, 16, 24)], sd + 2 + k * 7, 1.6, 1, 0.9, 0.3);
    }
    f.disc(hx, cy, 9, 1.05, 1.6);
    const c = boltR(f);
    return crop(stack(W + PAD, H, c, sparks(W + PAD, H, sparkList(sd + 5, 7, hx + 4, cy, 14, 24, W + PAD, H))), PAD, 0, W, H);
  });
  return [flySprite('stream', 'Lightning stream (beam, tileable 64 px)', tile), flySprite('stream_head', 'Lightning stream head', head)];
}

// --- breath: a cone of forked lightning -----------------------------------------------------

function breath(): WorldSprite {
  const W = 96, H = 64, oy = 32;
  const fr = frames(4, (_, i) => {
    const f = new Field(W, H);
    const sd = 700 + i * 29;
    const n = 5;
    for (let k = 0; k < n; k++) {
      const a = -0.34 + (k / (n - 1)) * 0.68 + rr(sd, k, -0.05, 0.05);
      const L = rr(sd + 1, k, 66, 84);
      forked(f, [2, oy], [L * Math.cos(a), oy + L * Math.sin(a)], sd + 3 + k * 11, k === 2 ? 2.4 : 1.9, 3, 1, 0.22);
    }
    f.disc(3, oy, 5, 1.05, 1.5);
    const c = boltR(f);
    return stack(W, H, c, sparks(W, H, sparkList(sd + 9, 12, 40, oy, 10, 46, W, H)));
  });
  return flySprite('breath', 'Lightning breath (forked cone, origin left middle)', fr);
}

// --- sphere: a thunder sphere ---------------------------------------------------------------

function sphere(): WorldSprite {
  const W = 64, H = 64, cx = 33, cy = 32, R = 18;
  const fr = frames(4, (t, i) => {
    const shell = new Field(W, H), fil = new Field(W, H), out = new Field(W, H);
    const sd = 800 + i * 31;
    // A dark plasma globe with a bright rim.
    shell.region(cx - R, cy - R, cx + R, cy + R, (x, y) => {
      const r = Math.hypot(x - cx, y - cy) / R;
      if (r > 1) return 0;
      return r > 0.86 ? 0.62 : 0.2 + 0.08 * Math.sin(Math.atan2(y - cy, x - cx) * 5 + r * 6 - t * TAU) + (1 - r) * 0.12;
    });
    // Filaments from the core to the shell.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + rr(sd, k, -0.4, 0.4);
      stroke(fil, jag([cx, cy], [cx + Math.cos(a) * R * 0.88, cy + Math.sin(a) * R * 0.88], sd + 1 + k, 3, 0.3), 1.2, 0.95);
    }
    fil.disc(cx, cy, 5, 1.05, 1.5);
    // Arcs jumping off the surface.
    for (let k = 0; k < 3; k++) {
      const a = rr(sd + 9, k, 0, TAU);
      const p: Pt = [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
      stroke(out, jag(p, [p[0] + Math.cos(a + 0.5) * 10, p[1] + Math.sin(a + 0.5) * 10], sd + 10 + k, 2, 0.4), 1.3, 0.85);
    }
    const c = stack(W, H, render(shell, BOLT, { th: TH, rim: [1], hi: 4, alpha: [255, 215, 225, 235, 255, 255, 255] }), render(fil, BOLT, { th: TH, outline: false }), boltR(out));
    return stack(W, H, c, sparks(W, H, sparkList(sd + 15, 8, cx, cy, R + 3, R + 12, W, H)));
  });
  return flySprite('sphere', 'Lightning sphere (thunder sphere)', fr);
}

// --- slash: a crescent of lightning ---------------------------------------------------------

function slash(): WorldSprite {
  const W = 64, H = 64;
  const fr = frames(4, (_, i) => {
    const f = new Field(W, H), z = new Field(W, H);
    const sd = 900 + i * 23;
    const C1: Pt = [16, 32], R1 = 31;
    // An electric crescent with a jagged edge...
    f.region(0, 0, W - 1, H - 1, (x, y) => {
      const a = Math.atan2(y - C1[1], x - C1[0]);
      if (Math.abs(a) > 1.08) return 0;
      const taper = Math.cos((a / 1.08) * Math.PI * 0.5);
      const r = Math.hypot(x - C1[0], y - C1[1]);
      const jagE = (pnoise(a * 40, i * 7, 2, 0, 0, sd) - 0.5) * 3;
      const inner = R1 - 12 * taper + jagE;
      if (r > R1 + jagE * 0.5 || r < inner) return 0;
      return 0.3 + 0.62 * Math.pow((r - inner) / Math.max(1, R1 - inner), 1.2);
    });
    // A thinner after-image arc trailing behind it.
    const C2: Pt = [8, 32], R2 = 28;
    f.region(0, 0, W - 1, H - 1, (x, y) => {
      const a = Math.atan2(y - C2[1], x - C2[0]);
      if (Math.abs(a) > 0.95) return 0;
      const taper = Math.cos((a / 0.95) * Math.PI * 0.5);
      const r = Math.hypot(x - C2[0], y - C2[1]);
      const jagE = (pnoise(a * 40, i * 7 + 3, 2, 0, 0, sd + 1) - 0.5) * 2.5;
      const inner = R2 - 5 * taper + jagE;
      if (r > R2 + jagE * 0.5 || r < inner) return 0;
      return 0.25 + 0.4 * ((r - inner) / Math.max(1, R2 - inner));
    });
    // ...and a white zigzag running along it.
    const pts: Pt[] = [];
    for (let k = 0; k <= 14; k++) {
      const a = -1.0 + (k / 14) * 2.0;
      const r = R1 - 3 * Math.cos((a / 1.08) * Math.PI * 0.5) + (k % 2 ? 1.6 : -1.6);
      pts.push([C1[0] + Math.cos(a) * r, C1[1] + Math.sin(a) * r]);
    }
    stroke(z, pts, 1.5, 1.05);
    // Sparks and short forks off the tips.
    for (const sgn of [-1, 1]) {
      const a = sgn * 1.05;
      const p: Pt = [C1[0] + Math.cos(a) * (R1 - 2), C1[1] + Math.sin(a) * (R1 - 2)];
      stroke(z, jag(p, [p[0] - 8, p[1] + sgn * 4], sd + (sgn > 0 ? 1 : 2), 2, 0.4), 1.2, 0.9);
    }
    const c = stack(W, H, boltR(f), render(z, BOLT, { th: TH, outline: false, lo: 4 }));
    return stack(W, H, c, sparks(W, H, sparkList(sd + 5, 7, 18, 32, 18, 30, W, H).filter((p) => p.x < 40)));
  });
  return flySprite('slash', 'Lightning slash (electric crescent)', fr);
}

// --- multi: three thunder birds in a staggered fan ------------------------------------------

/** A swallow drawn in lightning strokes: bright body, zigzag wings in a flapping V, forked tail. */
function thunderBird(f: Field, x: number, y: number, s: number, flap: number, seed: number): void {
  stroke(f, [[x - 6 * s, y + 0.5 * s], [x + 5 * s, y - 0.5 * s]], 2.3 * s, 1.05);
  f.disc(x + 6 * s, y - 1 * s, 2.6 * s, 1.05, 1.2);
  f.poly([[x + 8 * s, y - 2 * s], [x + 12 * s, y - 0.5 * s], [x + 8 * s, y + 0.2 * s]], 0.9);
  const up = flap * 7 * s;
  // Near wing (up) and far wing (down), each bent at the wrist and swept back.
  stroke(f, jag([x + 1 * s, y - 1 * s], [x - 2 * s, y - 7 * s - up * 0.6], seed, 1, 0.3).concat(jag([x - 2 * s, y - 7 * s - up * 0.6], [x - 11 * s, y - 9 * s - up], seed + 1, 2, 0.3).slice(1)), 1.7 * s, 1);
  stroke(f, jag([x, y + 1 * s], [x - 4 * s, y + 5 * s - up * 0.3], seed + 2, 1, 0.3).concat(jag([x - 4 * s, y + 5 * s - up * 0.3], [x - 11 * s, y + 6 * s - up * 0.4], seed + 3, 2, 0.3).slice(1)), 1.3 * s, 0.85);
  stroke(f, [[x - 6 * s, y + 0.5 * s], [x - 12 * s, y - 2.5 * s]], 1.1 * s, 0.9);
  stroke(f, [[x - 6 * s, y + 0.5 * s], [x - 12 * s, y + 3 * s]], 1.1 * s, 0.9);
}
function multi(): WorldSprite {
  const W = 64, H = 64;
  // Thunder needles: four arrowheads of charge with crackling trails, fanned and staggered.
  const ns = [
    { a: -0.42, d: 44 },
    { a: -0.13, d: 52 },
    { a: 0.15, d: 40 },
    { a: 0.43, d: 47 },
  ].map((b) => ({ ...b, x: Math.cos(b.a) * b.d + 4, y: 32 + Math.sin(b.a) * b.d }));
  const fr = frames(4, (_, i) => {
    const f = new Field(W, H), tr = new Field(W, H);
    ns.forEach((b, k) => {
      const ca = Math.cos(b.a), sa = Math.sin(b.a);
      const P = (l: number, q: number): Pt => [b.x + l * ca - q * sa, b.y + l * sa + q * ca];
      f.poly([P(10, 0), P(-1, -4.2), P(-8, 0), P(-1, 4.2)], (x, y) => 1.05 - Math.hypot(x - b.x - ca * 2, y - b.y - sa * 2) / 10);
      stroke(tr, jag(P(-5, 0), P(-26, rr(950 + i, k, -3, 3)), 960 + i * 7 + k, 3, 0.3), 1.4, 0.9);
      stroke(tr, jag(P(-10, 0), P(-18, rr(951 + i, k, -7, 7)), 965 + i * 7 + k, 2, 0.4), 0.9, 0.75);
    });
    const c = stack(W, H, boltR(tr), boltR(f));
    return stack(W, H, c, sparks(W, H, sparkList(970 + i, 7, 28, 32, 6, 26, W, H).filter((p) => p.x < 36)));
  });
  return flySprite('multi', 'Lightning multi (thunder needles)', fr);
}

// --- hit: a jagged spark burst --------------------------------------------------------------

function hit(): WorldSprite {
  const W = 64, H = 64, cx = 32, cy = 32;
  const fr = frames(6, (_, i) => {
    const f = new Field(W, H);
    const sd = 1000 + i * 19;
    const R = [12, 18, 25, 26, 22, 0][i];
    if (i <= 2) {
      // A jagged star of light.
      const n = 9;
      const pts: Pt[] = [];
      for (let k = 0; k < n * 2; k++) {
        const a = (k / (n * 2)) * TAU + 0.2;
        const r = k % 2 ? R * 0.4 : R * rr(sd, k, 0.75, 1.1);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      f.poly(pts, (x, y) => 1.02 - Math.hypot(x - cx, y - cy) / (R * 1.05));
    }
    if (i >= 1 && i <= 4) {
      const n = i <= 2 ? 6 : 4;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + rr(sd + 1, k, -0.3, 0.3);
        forked(f, [cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3], [cx + Math.cos(a) * R, cy + Math.sin(a) * R], sd + 2 + k * 5, i <= 2 ? 1.8 : 1.2, 1, i <= 3 ? 1 : 0.7, 0.3);
      }
    }
    const c = f.any() ? boltR(f) : new Canvas(W, H);
    const p = i / 5;
    return stack(W, H, c, sparks(W, H, sparkList(sd + 9, i === 0 ? 3 : 12 - i, cx, cy + p * p * 6, 10 + p * 18, 16 + p * 14, W, H)));
  });
  return vfxSprite('hit', 'Lightning hit (spark burst)', [32, 32], { hit: { frames: fr, fps: 12, loop: false } });
}

// --- blast: a thunder strike 3 m across -----------------------------------------------------

function blast(): WorldSprite {
  const W = 176, H = 128, cx = 88, gy = 72, RX = 82, RY = 54;
  const fr = frames(8, (_, i) => {
    const f = new Field(W, H), ground = new Field(W, H), groundF = new Field(W, H), flash = new Field(W, H), scorch = new Field(W, H);
    const sd = 1100 + i * 43;
    // The strike from the sky to the ground center.
    const r = [1.8, 5.5, 4.4, 3.2, 2, 0, 0, 0][i];
    if (r) forked(f, [cx + rr(sd, 0, -10, 10), 0], [cx, gy], sd + 1, r, i <= 2 ? 4 : 2, 1, 0.16);
    // A flash pool on the ground.
    const fk = [0, 0.5, 0.42, 0.3, 0.2, 0, 0, 0][i];
    if (fk) flash.ell(cx, gy, RX * fk, RY * fk, 0, 1, 1.4);
    // Arcs racing out over the ground ellipse and crawling along its rim.
    const reach = [0, 0.4, 0.7, 0.95, 1, 1, 0.9, 0][i];
    if (reach) {
      const n = 7;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + rr(sd + 2, k, -0.3, 0.3);
        const p: Pt = [cx + Math.cos(a) * RX * reach, gy + Math.sin(a) * RY * reach];
        if (i <= 4) forked(Math.sin(a) < 0 ? ground : groundF, [cx + Math.cos(a) * 8, gy + Math.sin(a) * 5], p, sd + 3 + k * 9, 1.4, 1, 0.9, 0.18);
        if (i >= 3) {
          const a2 = a + rr(sd + 4, k, 0.3, 0.6);
          const q: Pt = [cx + Math.cos(a2) * RX * reach, gy + Math.sin(a2) * RY * reach];
          stroke(Math.sin(a) < 0 ? ground : groundF, jag(p, q, sd + 5 + k, 3, 0.3), 1.1, 0.8);
        }
      }
    }
    if (i >= 2) scorch.ell(cx, gy, RX * 0.35 * Math.min(1, i / 3), RY * 0.35 * Math.min(1, i / 3), 0, 1, 4);
    // Rocks thrown up and sparks.
    const deb = new Field(W, H);
    if (i >= 1 && i <= 6) {
      const tt = i / 7;
      for (let k = 0; k < 8; k++) {
        const vx = rr(sd + 20, k, -1, 1) * 70, vy = -rr(sd + 21, k, 80, 130);
        const x = cx + rr(1200, k, -1, 1) * 0 + vx * tt, y = gy - 4 + vy * tt + 200 * tt * tt;
        if (y > gy + RY * 0.7 || y < 2) continue;
        deb.disc(x, y, k % 3 === 0 ? 3.2 : 2.3, 0.8, 1);
      }
    }
    const rocks = deb.any() ? render(deb, ROCK, { th: [0, 0.3, 0.55, 0.75], hi: 4 }) : null;
    const c = stack(W, H,
      scorch.any() ? render(scorch, ROCK, { th: [0, 0.4], lo: 1, hi: 2, outline: false, alpha: [0, 110, 140] }) : null,
      flash.any() ? render(flash, BOLT, { th: TH, lo: 3, outline: false, alpha: [0, 0, 0, 90, 120, 160, 200] }) : null,
      rocks,
      ground.any() ? boltR(ground) : null,
      f.any() ? boltR(f) : null,
      groundF.any() ? boltR(groundF) : null);
    return stack(W, H, c, sparks(W, H, sparkList(sd + 30, i === 0 ? 2 : 14 - i, cx, gy - 10, 10, 30 + i * 8, W, H)));
  });
  return vfxSprite('blast', 'Lightning blast (thunder strike, 3 m)', [cx, gy], { blast: { frames: fr, fps: 12, loop: false } });
}

// --- wall: a lightning fence 4.5 m long -----------------------------------------------------

function wallFrame(i: number, g: number, arcsOn: number, W: number, H: number, gy: number): Canvas {
  const f = new Field(W, H), base = new Field(W, H);
  const sd = 1300 + i * 53;
  const posts = [14, 72, 132, 192, 250];
  const top = gy - 100 * g;
  // Pylons: crackling vertical bolts with a ball of charge on top.
  posts.forEach((x, k) => {
    if (g < 0.05) return;
    forked(f, [x, gy], [x + rr(sd, k, -3, 3), top + 4], sd + 1 + k * 7, 2.2, 2, 1, 0.12);
    f.disc(x, top + 2, 4.5, 1.05, 1.5);
  });
  // Arcs between neighbouring pylons at three heights.
  if (arcsOn > 0)
    for (let k = 0; k + 1 < posts.length; k++)
      for (let j = 0; j < 3; j++) {
        if (rr(sd + 2, k * 3 + j, 0, 1) > arcsOn) continue;
        const y = top + 10 + j * (gy - top - 18) / 2.4 + rr(sd + 3, k * 3 + j, -6, 6);
        stroke(f, jag([posts[k] + 3, y], [posts[k + 1] - 3, y + rr(sd + 4, k * 3 + j, -6, 6)], sd + 5 + k * 3 + j, 4, 0.14), j === 0 ? 1.8 : 1.4, j === 0 ? 1 : 0.85);
      }
  // A charged line along the ground.
  base.region(4, gy - 3, W - 5, gy + 3, (x, y) => (Math.abs(y - gy) < 2.5 && g > 0.05 ? 0.55 + 0.25 * pnoise(x + i * 13, 0, 6, 0, 0, sd + 9) : 0));
  const c = stack(W, H, render(base, BOLT, { th: TH, rim: [1], hi: 5 }), boltR(f));
  const sp: { x: number; y: number; s: number }[] = [];
  for (let k = 0; k < 14; k++) sp.push({ x: posts[k % 5] + rr(sd + 10, k, -10, 10), y: lerp(gy - 4, top, rr(sd + 11, k, 0, 1)), s: k % 4 === 0 ? 3 : k % 2 ? 1 : 2 });
  return stack(W, H, c, sparks(W, H, g > 0.05 ? sp.filter((p) => p.y > 2) : []));
}
function wall(): WorldSprite {
  const W = 264, H = 120, gy = 112;
  const idle = frames(4, (_, i) => wallFrame(i, 1, 0.75, W, H, gy));
  const rise = frames(6, (_, i) => wallFrame(10 + i, [0.15, 0.45, 0.8, 1.04, 1, 1][i], [0, 0, 0, 0.35, 0.6, 0.75][i], W, H, gy));
  return vfxSprite('wall', 'Lightning wall (fence, 4.5 m x 1.8 m)', [W / 2, gy], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 12, loop: true } });
}

// --- aura: arcs crawling around the body ----------------------------------------------------
//
// Built like the fire aura (an open teardrop around the body): a faint charged sheath, bolts
// crawling up both sides and arcing over the head, chirping bursts, sparks and a static ring.

function aura(): WorldSprite {
  const W = 80, H = 120, cx = 40, gy = 112, top = 6;
  const outerW = (y: number) => 29 * Math.pow(1 - Math.pow(clamp((gy - y) / (gy - top), 0, 1), 2.6), 0.5);
  const fr = frames(6, (t, i) => {
    const sheath = new Field(W, H), f = new Field(W, H), ring = new Field(W, H);
    const sd = 1400 + i * 61;
    sheath.fill((x, y) => {
      if (y > gy - 2) return 0;
      const dx = Math.abs(x - cx), wO = outerW(y), wI = wO - 8;
      return dx < wO && dx > wI && wO > 9 ? 0.3 + 0.18 * ((dx - wI) / 8) : 0;
    });
    // Bolts crawling up each side along the sheath, and one arcing over the head.
    for (let side = -1; side <= 1; side += 2) {
      const pts: Pt[] = [];
      for (let k = 0; k <= 12; k++) {
        const y = lerp(gy - 4, top + 14, k / 12);
        pts.push([cx + side * (outerW(y) - 4 + rr(sd + (side > 0 ? 1 : 2), k, -3, 3)), y]);
      }
      const seg = Math.floor(rr(sd + 3, side + 2, 0, 5));
      const part = pts.slice(seg, seg + 8);
      const jagged: Pt[] = [];
      for (let k = 0; k + 1 < part.length; k++) jagged.push(...jag(part[k], part[k + 1], sd + 4 + k * 3 + side, 2, 0.4).slice(0, -1));
      jagged.push(part[part.length - 1]);
      stroke(f, jagged, 2, 1.02);
      stroke(f, jagged.map(([x, y], q) => [x - side * 3 + Math.sin(q) * 1.5, y] as Pt).slice(2), 1.2, 0.8);
      // Short forks reaching outward.
      for (let k = 0; k < 2; k++) {
        const p = jagged[Math.floor(rr(sd + 5, k + side * 3, 0.1, 0.9) * (jagged.length - 1))];
        stroke(f, jag(p, [p[0] + side * rr(sd + 6, k, 6, 11), p[1] - rr(sd + 7, k, 2, 8)], sd + 8 + k, 2, 0.4), 1.1, 0.85);
      }
    }
    if (i % 2 === 0) stroke(f, jag([cx - 18, top + 22], [cx + 18, top + 22], sd + 9, 4, 0.3).map(([x, y]) => [x, y - 10 * Math.sin(((x - cx + 18) / 36) * Math.PI)] as Pt), 1.4, 0.95);
    // Chirping bursts.
    for (let k = 0; k < 3; k++) {
      const y = rr(sd + 10, k, 30, 100), side = k % 2 ? 1 : -1;
      const x = cx + side * (outerW(y) - 2);
      for (let j = 0; j < 4; j++) {
        const a = (j / 4) * TAU + rr(sd + 11, j + k * 4, 0, 1);
        stroke(f, jag([x, y], [x + Math.cos(a) * 5, y + Math.sin(a) * 5], sd + 12 + j + k * 4, 1, 0.5), 1, 0.9);
      }
      f.disc(x, y, 2.5, 1.05);
    }
    // A ring of static at the feet.
    const a0 = rr(sd + 13, 0, 0, TAU);
    stroke(ring, jag([cx - 26, gy], [cx + 26, gy], sd + 14, 4, 0.12).map(([x, y]) => [x, y + 6 * Math.sin(((x - cx + 26) / 52) * Math.PI) * (Math.cos(a0) > 0 ? 1 : 0.6)] as Pt), 1.2, 0.85);
    const c = stack(W, H, render(sheath, BOLT, { th: TH, lo: 3, hi: 4, outline: false, alpha: [0, 0, 0, 38, 55, 0, 0] }), boltR(ring), boltR(f));
    const sp: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 8; k++) {
      const y = rr(sd + 15, k, 10, gy - 4), side = k % 2 ? 1 : -1;
      sp.push({ x: cx + side * (outerW(y) + rr(sd + 16, k, 0, 6)), y, s: k % 4 === 0 ? 3 : k % 2 ? 1 : 2 });
    }
    return stack(W, H, c, sparks(W, H, sp));
  });
  return vfxSprite('aura', 'Lightning aura (charge / buff)', [cx, gy], { idle: { frames: fr, fps: 12, loop: true } });
}

export function lightningSprites(): WorldSprite[] {
  return [bolt(), beast(), ...stream(), breath(), sphere(), slash(), multi(), hit(), blast(), wall(), aura()];
}

void arc;
void bez;
void dist;
void smooth;
void fract;
void (null as unknown as Color);
