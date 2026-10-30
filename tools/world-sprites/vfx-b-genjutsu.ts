// Genjutsu effects: illusions. A sigil comet, a murder of crows shedding feathers, twisting
// smoke ribbons, a hypnotic spiral, an orb holding a sigil eye, a crescent of mirror shards
// with afterimages, Temple of Nirvana feathers, a mirror veil and a smoke-tongue aura.
// The genjutsu sigil is original: an iris ring with four small triangles pointing outward at
// the cardinal points, around a pupil (no tomoe, nothing Sharingan-like).
// Palette: deep purple, violet, magenta, orchid, pink, pink-white; feathers white-violet.

import { Anim, Canvas, WorldSprite } from './kit';
import { HGT, LEN, Orient, march, orientations, proj } from './vfx-b-wall3d';
import { L, Pt, Puff, TAU, clamp, fract, lerp, pal, polar, puffs, rnd, rot, fadeLeft, segDist } from './vfx-b-lib';

/** 0 outline, 1 deep purple, 2 purple, 3 violet, 4 violet-magenta, 5 magenta, 6 orchid, 7 pink, 8 pink-white. */
export const G = pal('#1c0830', '#3a0f5e', '#561894', '#7424b8', '#9a28b8', '#bf34b8', '#e660d8', '#ffa2e2', '#ffecfa');
/** White-violet feathers: 0 outline .. 5 white. */
const FEATHER = pal('#28124a', '#5c3e9c', '#9a82dc', '#cbb9f6', '#ede6ff', '#ffffff');
/** Crow plumage with a violet sheen: 0 outline .. 7 glint. */
const CROW = pal('#0b0414', '#1a0c2a', '#261440', '#351e58', '#4a2a74', '#663c96', '#8c58bc', '#b88ae0');
/** Cherry petals: 0 outline .. 5 white. */
const PETAL = pal('#4c0e34', '#a42e6c', '#e468a6', '#ffa8d2', '#ffe0ef', '#fff7fb');
/** Mirror glass: 0 outline .. 7 white. */
const GLASS = pal('#22103a', '#4a2c7c', '#7656b0', '#a488d8', '#cbb4f0', '#e8dcff', '#fff0fc', '#ffffff');

const N = 6;
const loop = (frames: Canvas[], fps = 12): Anim => ({ frames, fps, loop: true });
const once = (frames: Canvas[], fps = 12): Anim => ({ frames, fps, loop: false });
const sprite = (name: string, label: string, anchor: [number, number], anims: Record<string, Anim>): WorldSprite => {
  // Trails of projectiles flying right fade out at the left edge instead of being cut flat.
  if (['bolt', 'sphere', 'slash', 'multi', 'beast'].includes(name)) for (const a of Object.values(anims)) a.frames.forEach((fr) => fadeLeft(fr));
  const f0 = Object.values(anims)[0].frames[0];
  return { name, label, meters: [+(f0.w / 57).toFixed(2), +(f0.h / 57).toFixed(2)], anchor, tags: ['vfx'], anims };
};
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

// --- building blocks ------------------------------------------------------------------------

/** A white-violet feather, tip toward `ang`, shaft bending by `curl`. */
function feather(c: Canvas, x: number, y: number, ang: number, len: number, o: { curl?: number; wid?: number; alpha?: number; dark?: boolean } = {}): void {
  const l = new L(c.w, c.h);
  const wid = o.wid ?? len * 0.36, curl = o.curl ?? 0.25;
  const R = len * 0.6 + wid;
  for (let py = Math.floor(y - R); py <= Math.ceil(y + R); py++)
    for (let px = Math.floor(x - R); px <= Math.ceil(x + R); px++) {
      const q = rot([px + 0.5 - x, py + 0.5 - y], -ang);
      const u = q[0] / len;
      if (u < -0.5 || u > 0.5) continue;
      const vc = curl * (u + 0.5) * (u + 0.5) * len * 0.35;
      const dv = q[1] - vc;
      const s = u + 0.5;
      const hw = (wid / 2) * Math.pow(Math.sin(Math.PI * clamp((s - 0.12) / 0.88, 0, 1)), 0.6);
      const shaft = Math.abs(dv) < 0.55;
      if (Math.abs(dv) > hw && !(shaft && s < 0.2)) continue;
      if (!shaft && dv > 0 && fract(s * 3.2 + 0.15) < 0.14 && dv > hw * 0.35) continue;
      let v = shaft ? 5 : dv < 0 ? 4 : 3;
      if (!shaft && fract((q[0] - Math.abs(dv) * 0.9) / 2.6) < 0.28) v -= 1;
      if (!shaft && Math.abs(dv) > hw - 1 && dv > 0) v = 2;
      if (o.dark) v = Math.max(1, v - 1);
      l.set(px, py, v);
    }
  l.render(c, FEATHER, { alpha: o.alpha, outlineAlpha: o.alpha });
}

/** A cherry petal (notched teardrop) at (x, y). */
function petal(c: Canvas, x: number, y: number, ang: number, s: number, alpha?: number): void {
  const l = new L(c.w, c.h);
  const P = (u: number, v: number): Pt => rot([x + u * s, y + v * s], ang, [x, y]);
  l.poly([P(1, 0), P(0.3, -0.62), P(-0.55, -0.45), P(-0.25, 0), P(-0.55, 0.45), P(0.3, 0.62)], (px, py) => {
    const q = rot([px + 0.5 - x, py + 0.5 - y], -ang);
    return q[1] < -0.1 * s ? 4 : q[0] > 0.3 * s ? 3 : 2;
  });
  l.render(c, PETAL, { alpha, outlineAlpha: alpha });
}

/**
 * The genjutsu sigil: a ring of radius r, four small triangles on it pointing outward at the
 * cardinal points (turned by `spin`), and a pupil. Paints the ring, triangles and pupil steps.
 */
function sigil(l: L, cx: number, cy: number, r: number, spin: number, o: { ring: number; tri: number; pupil: number; pupilR?: number; width?: number; reach?: number }): void {
  const w = o.width ?? 1.1;
  l.fill((x, y) => {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    return d <= r && d >= r - w;
  }, o.ring);
  for (let k = 0; k < 4; k++) {
    const a = spin + (k * Math.PI) / 2;
    const b1 = polar(cx, cy, r - w * 0.5, a - 0.38), b2 = polar(cx, cy, r - w * 0.5, a + 0.38), tip = polar(cx, cy, r + (o.reach ?? Math.max(1.8, r * 0.55)), a);
    l.poly([b1, tip, b2], o.tri);
  }
  l.disc(cx, cy, o.pupilR ?? Math.max(1, r * 0.34), o.pupil);
}

/** Sigil silhouette (a disc with the four triangles) as a mask, for energy banding. */
function sigilMask(l: L, cx: number, cy: number, r: number, spin: number, reach: number): void {
  l.disc(cx, cy, r, 1);
  for (let k = 0; k < 4; k++) {
    const a = spin + (k * Math.PI) / 2;
    l.poly([polar(cx, cy, r - 1, a - 0.42), polar(cx, cy, r + reach, a), polar(cx, cy, r - 1, a + 0.42)], 1);
  }
}

/** Old-ramp energy bands for the aura (kept as approved). */
const AURA_STEP = [0, 1, 3, 5, 6, 7, 8];

/** Banded energy: re-index a mask by inset distance. */
function energy(l: L, cuts: number[], steps: number[], mod?: (x: number, y: number, d: number) => number): L {
  return l.bands(cuts, steps, { mod, jitter: 0.25, seed: 7 }).clean();
}

/** Smoke lobes in the genjutsu ramp. */
function smoke(c: Canvas, list: Puff[], o: { seed?: number; alpha?: number; steps?: number[]; wrapX?: boolean } = {}): void {
  const l = new L(c.w, c.h);
  puffs(l, list, { steps: o.steps ?? [1, 2, 3, 4, 5, 6], rim: 1, seed: o.seed ?? 5, wobble: 0.4, wrapX: o.wrapX });
  l.clean(1, o.wrapX);
  l.render(c, G, { alpha: o.alpha, outlineAlpha: o.alpha, wrapX: o.wrapX });
}

/**
 * A crow in flight facing right, scale s; wing w from -1 (down) through 0 (swept back) to 1 (up).
 * Far wing, tail fan, a round body with a sheen on the back, head, thick two-tone beak, near wing
 * (lit coverts on the leading edge, scalloped secondaries, five separated primaries), tucked
 * feet and a glowing eye.
 */
function crow(c: Canvas, x: number, y: number, s: number, w: number, o: { alpha?: number } = {}): void {
  const P = (u: number, v: number): Pt => [x + u * s, y + v * s];
  const A = o.alpha;
  // Both wings spread (seen a little from above): the far wing rises behind the back, the near
  // wing sweeps down in front of the belly; w moves both through the stroke.
  const farDeg = w >= 0 ? lerp(-128, -78, w) : lerp(-128, -168, -w);
  const nearDeg = w >= 0 ? lerp(160, 236, w) : lerp(160, 112, -w);
  const len = 18 * s;
  const wing = (sx: number, sy: number, k: number, dark: number, deg: number): void => {
    const l = new L(c.w, c.h);
    const ang = (deg * Math.PI) / 180;
    const dir: Pt = [Math.cos(ang), Math.sin(ang)];
    let perp: Pt = [-dir[1], dir[0]];
    if (perp[0] > 0.05 || (Math.abs(perp[0]) <= 0.05 && perp[1] < 0)) perp = [-perp[0], -perp[1]];
    const Lw = len * k;
    const S0: Pt = [x + sx * s, y + sy * s];
    const Wp = (a2: number, b2: number): Pt => [S0[0] + dir[0] * a2 * Lw + perp[0] * b2 * Lw, S0[1] + dir[1] * a2 * Lw + perp[1] * b2 * Lw];
    const loc = (px: number, py: number): [number, number] => {
      const dx = px + 0.5 - S0[0], dy = py + 0.5 - S0[1];
      return [(dx * dir[0] + dy * dir[1]) / Lw, (dx * perp[0] + dy * perp[1]) / Lw];
    };
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) pts.push(Wp((i / 10) * 0.9, -0.07 * Math.sin(Math.PI * (i / 10))));
    for (let i = 10; i >= 0; i--) {
      const a2 = (i / 10) * 0.88;
      const bw = a2 > 0.5 ? lerp(0.36, 0.14, (a2 - 0.5) / 0.38) : 0.42 - a2 * 0.12;
      pts.push(Wp(a2, bw + (i % 2 ? 0.035 : 0)));
    }
    l.poly(pts, (px, py) => {
      const [a2, b2] = loc(px, py);
      return b2 < 0.02 ? 6 : b2 < 0.11 ? 5 : b2 < 0.16 ? 4 : b2 > 0.28 && a2 < 0.55 ? 2 : 3;
    });
    for (let a2 = 0.12; a2 < 0.56; a2 += 0.085) {
      const p0 = Wp(a2, 0.16), p1 = Wp(a2 - 0.03, 0.42 - a2 * 0.12);
      l.line(p0[0], p0[1], p1[0], p1[1], (px, py) => (l.get(px, py) >= 0 ? 1 : null));
    }
    for (let f2 = 0; f2 < 5; f2++) {
      const a0 = 0.5 + f2 * 0.1;
      const base = Wp(a0, 0.14 - f2 * 0.02);
      const bend = 0.1 + (4 - f2) * 0.26;
      const fl = Math.hypot(1, bend);
      const fd: Pt = [(dir[0] + perp[0] * bend) / fl, (dir[1] + perp[1] * bend) / fl];
      const flen = (0.42 - (4 - f2) * 0.04) * Lw;
      const tip: Pt = [base[0] + fd[0] * flen, base[1] + fd[1] * flen];
      l.tube([base, [lerp(base[0], tip[0], 0.6), lerp(base[1], tip[1], 0.6)], tip], [0.05 * Lw, 0.045 * Lw, 0.3], 2);
      l.line(base[0] - perp[0], base[1] - perp[1], lerp(base[0], tip[0], 0.8) - perp[0], lerp(base[1], tip[1], 0.8) - perp[1], (px, py) => (l.get(px, py) === 2 ? 4 : null));
    }
    if (dark) l.map((v) => Math.max(1, v - dark));
    l.render(c, CROW, { alpha: A, outlineAlpha: A });
  };
  wing(-1.5, -2.8, 0.88, 2, farDeg);
  const body = new L(c.w, c.h);
  body.poly([P(-5, -1.8), P(-14, -3.4), P(-17, -2.4), P(-16, -0.6), P(-17.5, 1), P(-15.5, 2.4), P(-16.5, 3.8), P(-13.5, 3.6), P(-5, 2.6)], (px, py) => (py < y - 2 * s ? 4 : py > y + 1.8 * s ? 1 : 2));
  body.line(P(-7, 0.2)[0], P(-7, 0.2)[1], P(-15.5, -0.6)[0], P(-15.5, -0.6)[1], 1);
  body.line(P(-7, 1.2)[0], P(-7, 1.2)[1], P(-15, 2.6)[0], P(-15, 2.6)[1], 1);
  body.ellipse(x - 0.5 * s, y + 0.2 * s, 7.4 * s, 4.3 * s, (px, py) => {
    const v = (py + 0.5 - y) / s, u = (px + 0.5 - x) / s;
    return v < -3 ? 6 : v < -1.6 ? 5 : v > 2.6 ? 1 : v > 1.2 ? 2 : u > 3 ? 4 : 3;
  });
  body.disc(x + 6.6 * s, y - 2.3 * s, 3.8 * s, (px, py) => {
    const v = (py + 0.5 - y) / s;
    return v < -5 ? 7 : v < -3.6 ? 6 : v < -2.2 ? 4 : 3;
  });
  // Throat hackles.
  body.poly([P(6.5, 0.2), P(9.6, -0.4), P(8.4, 1), P(7.6, 0.6), P(6.8, 1.6)], 2);
  body.render(c, CROW, { alpha: A, outlineAlpha: A });
  // Illusion glow: a magenta rim along the back and crown.
  const rim = new L(c.w, c.h);
  rim.fill((px, py) => body.get(px, py) >= 0 && body.get(px, py - 1) < 0 && px > x - 12 * s, 6);
  rim.render(c, G, { outline: null, alpha: A === undefined ? 230 : Math.round(A * 0.9) });
  const feet = new L(c.w, c.h);
  feet.line(P(-1, 4)[0], P(-1, 4)[1], P(-4, 5.6)[0], P(-4, 5.6)[1], 2);
  feet.line(P(1, 4)[0], P(1, 4)[1], P(-2, 5.8)[0], P(-2, 5.8)[1], 2);
  feet.render(c, CROW, { alpha: A, outlineAlpha: A });
  const beak = new L(c.w, c.h);
  beak.poly([P(9.2, -4.4), P(13.8, -2.4), P(9.6, -1.6)], (px, py) => (py < y - 3.4 * s ? 7 : 6));
  beak.poly([P(9.6, -1.8), P(13.2, -2), P(9.6, -0.4)], 4);
  beak.render(c, CROW, { alpha: A, outlineAlpha: A });
  wing(0.5, 0.6, 1, 0, nearDeg);
  const eye = new L(c.w, c.h);
  const ex = Math.round(x + 7.6 * s), ey = Math.round(y - 3.1 * s);
  eye.set(ex, ey, 7);
  eye.set(ex + 1, ey, 8);
  eye.set(ex, ey + 1, 5);
  if (s > 1.4) {
    eye.set(ex + 1, ey + 1, 6);
    eye.set(ex - 1, ey, 4);
  }
  eye.render(c, G, { outline: null, alpha: A });
}

/** Hypnotic two-arm spiral disc in the genjutsu ramp. */
function spiral(l: L, cx: number, cy: number, r: number, spin: number, sy = 1, arms = 2): void {
  l.fill((x, y) => {
    const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / (r * sy);
    return u * u + v * v <= 1;
  }, (x, y) => {
    const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / (r * sy);
    const d = Math.sqrt(u * u + v * v);
    const a = Math.atan2(v, u);
    const arm = fract((a / TAU) * arms + d * 1.6 - spin);
    if (d < 0.16) return 8;
    if (arm < 0.5) return d < 0.35 ? 8 : d < 0.55 ? 7 : d < 0.75 ? 6 : 5;
    return d < 0.4 ? 4 : d < 0.65 ? 3 : d < 0.85 ? 2 : 1;
  });
}

/** A 4-point sparkle. */
function sparkle(l: L, x: number, y: number, s: number): void {
  x = Math.round(x);
  y = Math.round(y);
  l.set(x, y, 8);
  for (let k = 1; k <= s; k++) {
    const v = k === s ? 6 : 7;
    l.set(x + k, y, v);
    l.set(x - k, y, v);
    l.set(x, y + k, v);
    l.set(x, y - k, v);
  }
}

/** A smoky ribbon tube along pts, banded. */
function ribbonTube(c: Canvas, pts: Pt[], r: (s: number) => number, steps: number[], cuts = [1, 2, 3], alpha?: number): void {
  const l = new L(c.w, c.h);
  l.tube(pts, r, 1);
  energy(l, cuts, steps);
  l.render(c, G, { alpha, outlineAlpha: alpha });
}

// --- roles ----------------------------------------------------------------------------------

/** Bolt: a spinning sigil of light (ring, four cardinal points, pupil), smoke ribbons and petals in its wake. */
function bolt(): WorldSprite {
  const cx = 40, cy = 32, R = 8;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N, ph = f * (TAU / N), spin = t * (TAU / 4);
    for (const [k, amp] of [[0, 3.5], [1, -3]] as [number, number][]) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 30; i++) {
        const s2 = i / 30;
        pts.push([cx - 7 - s2 * 27, cy + Math.sin(s2 * 5 - ph + k * 2) * amp * (0.3 + s2) + (k ? 2.5 : -2.5)]);
      }
      ribbonTube(c, pts, (s2) => 2.3 * (1 - s2) + 0.4, k ? [1, 2, 3, 4] : [3, 4, 5, 6]);
    }
    // Speed arcs trailing the spin.
    const arcs = new L(64, 64);
    for (let j = 0; j < 2; j++) {
      const rr = R + 5 + j * 3;
      for (let a = 1.9; a < 4.4; a += 0.02) {
        if (fract(a * 1.3 - t + j * 0.5) > 0.6) continue;
        const p = polar(cx - 2 - j * 2, cy, rr, a);
        arcs.set(p[0], p[1], j ? 5 : 7);
      }
    }
    arcs.render(c, G, { outline: null });
    const l = new L(64, 64);
    sigilMask(l, cx, cy, R, spin, 5);
    energy(l, [1, 1.8, 2.8, 3.8, 4.8], [2, 3, 4, 5, 6, 8]);
    l.render(c, G);
    const mk = new L(64, 64);
    sigil(mk, cx, cy, 5.2, spin, { ring: 2, tri: 3, pupil: 1, pupilR: 1.7, reach: 1.6 });
    mk.render(c, G, { outline: null });
    for (let i = 0; i < 3; i++) {
      const p0 = fract(rnd(11, i) + t);
      petal(c, cx - 14 - p0 * 28, cy - 9 + rnd(12, i) * 22 + Math.sin(p0 * TAU + i) * 3, p0 * 5 + i, 2.6);
    }
    const sp = new L(64, 64);
    sparkle(sp, cx - 16 - fract(t + 0.3) * 18, cy - 11, 2);
    sparkle(sp, cx - 24 - fract(t + 0.8) * 14, cy + 14, 1);
    sp.render(c, G, { outline: null });
    return c;
  });
  return sprite('bolt', 'Genjutsu bolt: sigil comet', [32, 32], { fly: loop(frames) });
}

/** Multi: three white-violet feathers flying in a staggered fan, pink glow streaks behind. */
function multi(): WorldSprite {
  const fan: [number, number, number][] = [
    [38, 17, -0.18],
    [48, 32, 0],
    [36, 47, 0.18],
  ];
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    for (const [k, [x, y, a]] of fan.entries()) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const s = i / 12;
        pts.push(rot([x - 8 - s * 24, y + Math.sin(s * 6 - f * (TAU / N) + k) * 1.6 * s], a, [x, y]));
      }
      ribbonTube(c, pts, (s) => 2.6 * (1 - s) + 0.3, [4, 5, 6, 7], [1, 1.8, 2.6]);
    }
    for (const [k, [x, y, a]] of fan.entries()) feather(c, x, y, a + Math.sin((f / N + k / 3) * TAU) * 0.05, 19, { curl: 0.3, wid: 7 });
    const sp = new L(64, 64);
    for (let i = 0; i < 3; i++) sparkle(sp, 20 - fract(t + i * 0.33) * 14, 12 + i * 18, 1);
    sp.render(c, G, { outline: null });
    return c;
  });
  return sprite('multi', 'Genjutsu multi: feather darts', [32, 32], { fly: loop(frames) });
}

/** Beast: a murder of crows, each trailing a violet illusion streak that dissolves into feathers. */
function beast(): WorldSprite {
  const W = 128, H = 96;
  const crows: [number, number, number, number][] = [
    [54, 31, 1.05, 0.33],
    [52, 67, 1.1, 0.66],
    [90, 50, 1.6, 0],
  ];
  const frames = range(N).map((f) => {
    const c = new Canvas(W, H), t = f / N;
    for (const [k, [x, y, s]] of crows.entries()) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 18; i++) {
        const q = i / 18;
        pts.push([x - 15 * s - q * 30 * s, y + 0.5 * s + Math.sin(q * 5 - t * TAU + k * 2) * 3 * q]);
      }
      ribbonTube(c, pts, (q) => 3.6 * s * (1 - q * 0.9) + 0.4, [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5], 215);
    }
    for (let i = 0; i < 10; i++) {
      const p0 = fract(rnd(21, i) + t);
      const [x, y, s] = crows[i % 3];
      feather(c, Math.max(8, x - 14 * s - p0 * 26), y + (rnd(22, i) - 0.5) * 16 + p0 * 6, p0 * 4 + i, 7 + rnd(23, i) * 4, { wid: 3.4, curl: 0.5, alpha: p0 > 0.75 ? 170 : 255 });
    }
    for (let i = 0; i < 3; i++) {
      const p0 = fract(rnd(24, i) + t);
      petal(c, 40 - p0 * 30, 30 + i * 18 + Math.sin(p0 * TAU + i) * 4, p0 * 6 + i, 2.6);
    }
    for (const [x, y, s, p0] of crows) {
      const wv = Math.sin((t + p0) * TAU);
      const ghost = new Canvas(W, H);
      crow(ghost, x - 7 * s, y + 1, s, Math.sin((t + p0 - 0.17) * TAU));
      ghost.map((col) => [Math.round(col[0] * 0.5 + 150 * 0.5), Math.round(col[1] * 0.5 + 40 * 0.5), Math.round(col[2] * 0.5 + 200 * 0.5), Math.round(col[3] * 0.42)]);
      c.draw(ghost, 0, 0);
      crow(c, x, y, s, wv);
    }
    const sp = new L(W, H);
    sparkle(sp, 70 - fract(t + 0.2) * 30, 14, 2);
    sparkle(sp, 80 - fract(t + 0.7) * 34, 84, 1);
    sp.render(c, G, { outline: null });
    return c;
  });
  return sprite('beast', 'Genjutsu beast: crow swarm', [64, 48], { fly: loop(frames) });
}

/** Two smoke ribbons twisting around each other (tileable when wrap). */
function ribbons(c: Canvas, f: number, x0: number, x1: number, o: { wrap?: boolean; cy?: number; period?: number } = {}): void {
  const cy = o.cy ?? 32, ph = f * (TAU / N);
  for (const k of [1, 0]) {
    const l = new L(c.w, c.h);
    for (let x = x0; x < x1; x++) {
      const a = (x / 64) * TAU - ph + k * Math.PI;
      const yc = cy + Math.sin(a) * 9;
      const w = 1.4 + 3.4 * Math.abs(Math.cos(a * 0.5 + (k ? 0.6 : 0)));
      for (let y = Math.floor(yc - w); y <= Math.ceil(yc + w); y++) if (Math.abs(y + 0.5 - yc) <= w) l.set(x, y, 1);
    }
    l.bands([1, 1.8, 2.6, 3.4], k ? [1, 2, 3, 4, 4] : [4, 5, 6, 7, 8], { wrapX: o.wrap, jitter: 0.2, seed: 9 + k, period: o.period });
    l.clean(1, o.wrap);
    l.render(c, G, { wrapX: o.wrap });
  }
}

/** Stream: twisting genjutsu ribbons (tileable), petals and sparkles riding along. */
function stream(): WorldSprite {
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    const wl = new L(64, 64);
    for (let x = 0; x < 64; x++) {
      const a = (x / 64) * TAU * 2 - t * TAU * 2;
      if (fract(x / 16 + t * 2) < 0.6) wl.set(x, 32 - 15 + Math.sin(a) * 2, 3);
      if (fract(x / 16 + t * 2 + 0.5) < 0.6) wl.set(x, 32 + 15 + Math.sin(a + 2) * 2, 3);
    }
    wl.render(c, G, { outline: null, alpha: 210 });
    ribbons(c, f, 0, 64, { wrap: true });
    for (let i = 0; i < 3; i++) {
      const x = (rnd(31, i) * 64 + t * 64) % 64;
      for (const ox of [-64, 0, 64]) petal(c, x + ox, 32 + (rnd(32, i) - 0.5) * 34, t * TAU + i * 2, 2.6);
    }
    const sp = new L(64, 64);
    for (let i = 0; i < 2; i++) {
      const x = (rnd(33, i) * 64 + t * 64) % 64;
      sparkle(sp, x, 32 + (rnd(34, i) - 0.5) * 26, 1 + (f % 2));
    }
    sp.render(c, G, { outline: null });
    return c;
  });
  return sprite('stream', 'Genjutsu stream: twisting ribbons (tileable)', [0, 32], { fly: loop(frames) });
}

/** Stream head: the ribbons wind into a spinning hypnotic spiral. */
function streamHead(): WorldSprite {
  const cx = 36, cy = 32;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    // The ribbons continue the last tile: drawn on a buffer one tile longer so the joint has no edge.
    const rb = new Canvas(128, 64);
    ribbons(rb, f, 0, 94, { period: 64 });
    c.draw(rb, -64, 0);
    const halo = new L(64, 64);
    halo.disc(cx, cy, 19.5, 1);
    halo.erase((x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 16.5);
    halo.map((v, x, y) => (fract((Math.atan2(y + 0.5 - cy, x + 0.5 - cx) / TAU) * 6 + t) < 0.55 ? 3 : -1));
    halo.render(c, G);
    const l = new L(64, 64);
    spiral(l, cx, cy, 15, t / 2);
    l.render(c, G);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + t * (TAU / 2) + 0.4;
      const p = polar(cx, cy, 22 + (i % 2) * 3, a);
      petal(c, p[0], p[1], a + 1.6, 2.6);
    }
    return c;
  });
  return sprite('stream_head', 'Genjutsu stream head: hypnotic spiral', [32, 32], { fly: loop(frames) });
}

/** Breath: hypnotic ripples spreading in a cone, mist, petals and feathers carried along. */
function breath(): WorldSprite {
  const ox = 10, oy = 52, BW = 112, BH = 104;
  const frames = range(N).map((f) => {
    const c = new Canvas(BW, BH), t = f / N;
    const list: Puff[] = [];
    for (let i = 0; i < 14; i++) {
      const s = 10 + fract(i / 14 + rnd(41, i) * 0.05 + t) * 76;
      const a = (rnd(42, i) - 0.5) * 0.7;
      list.push({ x: ox + Math.cos(a) * s, y: oy + Math.sin(a) * s, r: 2.5 + s * 0.07, steps: [1, 2, 2, 3] });
    }
    smoke(c, list, { seed: 43, alpha: 150 });
    for (let k = 0; k < 7; k++) {
      const r = 8 + (k + t) * 15;
      if (r > 90) continue;
      const l = new L(BW, BH);
      const span = 0.52;
      const th = 1.5 + r * 0.035;
      for (let a = -span; a <= span; a += 0.4 / r) {
        const rr = r + Math.sin(a * 9 + r * 0.25) * (1 + r * 0.02);
        for (let d = -th; d <= th; d += 0.5) {
          const p = polar(ox, oy, rr + d, a);
          l.set(p[0], p[1], 1);
        }
      }
      const age = r / 96;
      l.bands([1, 1.7, 2.4], age < 0.3 ? [5, 6, 7, 8] : age < 0.6 ? [4, 5, 6, 7] : [2, 3, 4, 5]);
      l.render(c, G);
    }
    for (let i = 0; i < 5; i++) {
      const s = 14 + fract(rnd(44, i) + t) * 74;
      const a = (rnd(45, i) - 0.5) * 0.6;
      const p = polar(ox, oy, s, a);
      if (i % 2) petal(c, p[0], p[1], s * 0.1 + i, 2.8);
      else feather(c, p[0], p[1], a + s * 0.05, 8, { wid: 3.4, curl: 0.4 });
    }
    const core = new L(BW, BH);
    core.disc(ox + 2, oy, 5.5, 1);
    energy(core, [1, 2, 3], [5, 6, 7, 8]);
    core.render(c, G);
    return c;
  });
  return sprite('breath', 'Genjutsu breath: hypnotic ripples', [8, 52], { fly: loop(frames) });
}

/** Sphere: an illusion orb holding a great eye with a turning sigil, a smoke ring around it. */
function sphere(): WorldSprite {
  const cx = 36, cy = 32, R = 16;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    const list: Puff[] = [];
    for (let i = 4; i >= 0; i--) {
      const s = i + t;
      list.push({ x: cx - 14 - s * 4, y: cy + Math.sin(s * 1.7) * 3, r: Math.max(0, 6.5 - s * 1.3), steps: s < 2 ? [2, 3, 4, 5, 6] : [1, 2, 3, 4] });
    }
    smoke(c, list, { seed: 51 });
    const ringA = -0.3;
    const ring = (front: boolean): void => {
      const l = new L(64, 64);
      for (let a = 0; a < TAU; a += 0.01) {
        if (Math.sin(a) > 0 !== front) continue;
        if (fract((a / TAU) * 5 - t) > 0.7) continue;
        const p = rot([cx + Math.cos(a) * 25, cy + Math.sin(a) * 9.5], ringA, [cx, cy]);
        l.set(p[0], p[1], front ? 7 : 4);
        l.set(p[0], p[1] + 1, front ? 6 : 3);
      }
      l.render(c, G);
    };
    ring(false);
    const orb = new L(64, 64);
    orb.disc(cx, cy, R, 1);
    orb.bands([1, 2, 3, 4.4, 6], [1, 2, 3, 4, 5, 5]);
    orb.render(c, G);
    const eye = new L(64, 64);
    const ew = 12.5, eh = 7.5;
    eye.fill((x, y) => {
      const u = (x + 0.5 - cx) / ew, v = (y + 0.5 - cy) / eh;
      return Math.abs(v) <= 1 - u * u && Math.abs(u) <= 1;
    }, (x, y) => (y + 0.5 - cy < -eh * 0.35 ? 7 : 8));
    eye.render(c, G);
    const iris = new L(64, 64);
    iris.fill((x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 6.2 && eye.get(x, y) >= 0, (x, y) => {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      return d > 5.2 ? 1 : d > 4.2 ? 4 : d > 3 ? 5 : 6;
    });
    iris.render(c, G, { outline: null });
    // The sigil in the iris, turning: ring, four cardinal points, pupil.
    const tm = new L(64, 64);
    sigil(tm, cx, cy, 3.4, t * (TAU / 4), { ring: 0, tri: 0, pupil: 0, pupilR: 1.5, reach: 2.1, width: 1 });
    tm.render(c, G, { outline: null });
    const lid = new L(64, 64);
    for (let x = Math.ceil(cx - ew + 1); x < cx + ew - 1; x++) {
      const u = (x + 0.5 - cx) / ew;
      lid.set(x, Math.floor(cy - (1 - u * u) * eh), 1);
    }
    lid.render(c, G, { outline: null });
    const gl = new L(64, 64);
    gl.set(cx - 9, cy - 11, 8);
    gl.set(cx - 8, cy - 11, 8);
    gl.set(cx - 10, cy - 10, 7);
    gl.set(cx - 7, cy - 12, 7);
    gl.render(c, G, { outline: null });
    ring(true);
    for (let i = 0; i < 2; i++) {
      const p0 = fract(rnd(52, i) + t);
      petal(c, cx - 20 - p0 * 12, cy - 15 + i * 28 + p0 * 3, p0 * 6 + i, 2.6);
    }
    return c;
  });
  return sprite('sphere', 'Genjutsu sphere: sigil eye orb', [32, 32], { fly: loop(frames) });
}

/** Mirror shard crescent: long glass splinters along an arc, tips toward the horns, a diamond at the front. */
function shards(c: Canvas, ox: number, oy: number, R: number, f: number, o: { alpha?: number; ghost?: boolean } = {}): void {
  const n = 5;
  for (const k of [0, 4, 1, 3, 2]) {
    const a = lerp(-1.12, 1.12, k / (n - 1));
    const C = polar(ox, oy, R, a);
    const out: Pt = [Math.cos(a), Math.sin(a)];
    const sg = a > 0.01 ? 1 : a < -0.01 ? -1 : 0;
    const tan: Pt = [-Math.sin(a) * sg, Math.cos(a) * sg];
    const V = (t: number, u: number): Pt => [C[0] + tan[0] * t + out[0] * u, C[1] + tan[1] * t + out[1] * u];
    const big = 1 - Math.abs(a) * 0.25;
    const pts: Pt[] = sg === 0 ? [V(0, 10), [C[0], C[1] - 6], V(0, -5), [C[0], C[1] + 6]] : [V(-6 * big, 4.2 * big), V(13 * big, 1.2), V(-5 * big, -3.8 * big), V(-8 * big, 0)];
    const l = new L(c.w, c.h);
    l.poly(pts, (x, y) => {
      const d = (x + 0.5 - C[0]) * out[0] + (y + 0.5 - C[1]) * out[1];
      const along = (x + 0.5 - C[0]) * tan[0] + (y + 0.5 - C[1]) * tan[1];
      const refl = fract((along * 0.8 + d * 1.3) / 9 + k * 0.31 + f / N);
      if (refl < 0.1) return 7;
      if (refl < 0.2) return 6;
      return d > 0.5 ? (k % 2 ? 5 : 6) - (refl > 0.7 ? 1 : 0) : d > -1.5 ? 4 : 3;
    });
    l.bevel({ lit: 1, shade: 1, max: 7, min: 2 });
    if (o.ghost) {
      l.map((v) => clamp(v - 2, 2, 5));
      l.render(c, G, { alpha: o.alpha, outlineAlpha: o.alpha });
    } else {
      l.render(c, GLASS, { alpha: o.alpha });
      const gl = new L(c.w, c.h);
      const g = V(sg === 0 ? 4 : 2, 1.5);
      gl.set(g[0], g[1], 8);
      gl.set(g[0] + 1, g[1], 7);
      gl.render(c, G, { outline: null });
    }
  }
}

/** Slash: a crescent of mirror shards with fading afterimages and glints. */
function slash(): WorldSprite {
  const oy = 32, R = 22, ox = 14;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    shards(c, ox - 12, oy, R, f, { ghost: true, alpha: 100 });
    shards(c, ox - 6, oy, R, f, { ghost: true, alpha: 180 });
    shards(c, ox, oy, R, f);
    const sp = new L(64, 64);
    const k = f % 3;
    const p = polar(ox, oy, R + 7, lerp(-1, 1, [0.2, 0.55, 0.85][k]));
    sparkle(sp, p[0], p[1], 2);
    const q = polar(ox, oy, R + 5, lerp(-1, 1, [0.7, 0.1, 0.4][k]));
    sparkle(sp, q[0], q[1], 1);
    sp.render(c, G, { outline: null });
    for (let i = 0; i < 2; i++) {
      const p0 = fract(rnd(61, i) + t);
      petal(c, 18 - p0 * 11, 12 + i * 40, p0 * 5 + i, 2.4, 220);
    }
    return c;
  });
  return sprite('slash', 'Genjutsu slash: mirror shard crescent', [32, 32], { fly: loop(frames) });
}

/** Hit: a hypnotic flash, then a crow bursting into feathers that scatter and drift down. */
function hit(): WorldSprite {
  const cx = 32, cy = 32;
  const frames = range(6).map((f) => {
    const c = new Canvas(64, 64);
    if (f <= 2) {
      const l = new L(64, 64);
      spiral(l, cx, cy, [9, 14, 17][f], f * 0.3);
      if (f === 2) l.map((v) => Math.max(1, v - 3));
      l.render(c, G, { alpha: f === 2 ? 200 : 255, outlineAlpha: f === 2 ? 200 : 255 });
    }
    if (f >= 2) {
      const rr = [0, 0, 19, 22, 0, 0][f];
      if (rr) {
        const ring = new L(64, 64);
        ring.disc(cx, cy, rr, 1);
        ring.erase((x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < rr - (f === 2 ? 2.5 : 1.5));
        ring.map((v, x, y) => (f === 2 ? (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > rr - 1 ? 7 : 6) : 4));
        ring.render(c, G);
      }
      const list: Puff[] = [];
      for (let k = 0; k < 6; k++) {
        const p = polar(cx, cy + f, 8 + f * 2.5, (k / 6) * TAU + 0.4);
        list.push({ x: p[0], y: p[1], r: [0, 0, 5, 5, 4, 2.6][f], steps: f < 4 ? [1, 2, 3, 4, 5, 6] : [1, 1, 2, 3, 4] });
      }
      smoke(c, list, { seed: 71 + f, alpha: f >= 4 ? 170 : 220 });
    }
    if (f >= 1)
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU + rnd(72, k) * 0.5;
        const d = [0, 7, 13, 18, 21, 22][f] * (0.8 + rnd(73, k) * 0.35);
        const p = polar(cx, cy, d, a);
        if (f === 5 && k % 3 === 0) continue;
        feather(c, p[0], p[1] + (f >= 3 ? (f - 2) * (f - 2) * 0.5 : 0), a + f * 0.5 * (k % 2 ? 1 : -1), 9 - (f >= 4 ? 1 : 0), { wid: 3.6, curl: 0.5, alpha: f >= 5 ? 180 : 255 });
      }
    if (f >= 2 && f <= 4)
      for (let k = 0; k < 3; k++) {
        const p = polar(cx, cy, 10 + f * 4, (k / 3) * TAU + 1);
        petal(c, p[0], p[1] + f, f + k, 2.4);
      }
    if (f === 1) {
      const ghost = new Canvas(64, 64);
      crow(ghost, cx - 2, cy, 1, 0.8);
      ghost.map((col) => [col[0], col[1], col[2], Math.round(col[3] * 0.65)]);
      c.draw(ghost, 0, 0);
    }
    return c;
  });
  return sprite('hit', 'Genjutsu hit: crow bursting into feathers', [32, 32], { hit: once(frames, 15) });
}

/** Blast: Temple of Nirvana: a spiral opens on the ground, a pillar of light bursts into feathers. */
function blast(): WorldSprite {
  const W = 176, H = 176, ax = 88, ay = 120, rx = 78, ry = 52;
  const NF = 30;
  const fe = range(NF).map((k) => ({
    a: rnd(801, k) * TAU,
    d: 0.15 + Math.sqrt(rnd(802, k)) * 0.85,
    hgt: 14 + rnd(803, k) * 66,
    ang: rnd(804, k) * TAU,
    len: 8 + rnd(805, k) * 5,
  }));
  const frames = range(8).map((f) => {
    const c = new Canvas(W, H);
    const sr = [0.35, 0.8, 1, 1, 1, 1, 0.95, 0.9][f];
    const g = new L(W, H);
    g.fill((x, y) => {
      const u = (x + 0.5 - ax) / (rx * sr), v = (y + 0.5 - ay) / (ry * sr);
      return u * u + v * v <= 1;
    }, (x, y) => {
      const u = (x + 0.5 - ax) / (rx * sr), v = (y + 0.5 - ay) / (ry * sr);
      const d = Math.sqrt(u * u + v * v);
      const arm = fract((Math.atan2(v, u) / TAU) * 3 + d * 2.2 - f * 0.12);
      if (d > 0.95) return 4;
      if (d > 0.91) return null;
      if (d > 0.88) return 6;
      return arm < 0.1 ? (d < 0.5 ? 8 : 7) : arm < 0.2 ? (d < 0.5 ? 6 : 5) : arm < 0.27 ? 3 : null;
    });
    const fadeG = [255, 255, 240, 220, 200, 170, 130, 90][f];
    g.render(c, G, { alpha: fadeG, outlineAlpha: fadeG });
    // Pillar of light.
    const ph = [0, 0, 70, 86, 86, 56, 0, 0][f];
    const pw = [0, 0, 13, 16, 12, 6, 0, 0][f];
    if (ph) {
      const l = new L(W, H);
      l.fill((x, y) => {
        const top = ay - ph;
        if (y > ay + 3 || y < top - pw) return false;
        const hw = pw * (y < top ? Math.sqrt(Math.max(0, 1 - ((top - y) / pw) ** 2)) : 1) + Math.sin(y * 0.5 + f) * 0.8;
        return Math.abs(x + 0.5 - ax) <= hw;
      }, 1);
      l.ellipse(ax, ay, pw + 9, (pw + 9) * 0.36, 1);
      l.bands([1, 2, 3.2, 4.6, 6.2, 8], [2, 3, 4, 5, 6, 7, 8]);
      l.render(c, G);
      // Rings rising up the pillar.
      const rl = new L(W, H);
      for (let k = 0; k < 3; k++) {
        const ry2 = ay - ((k / 3 + f * 0.12) % 1) * ph;
        for (let a = 0; a < TAU; a += 0.03) {
          const p = polar(ax, ry2, pw + 5, a, 0.3);
          if (Math.sin(a) > -0.2) rl.set(p[0], p[1], 7);
        }
      }
      rl.render(c, G);
    }
    if (f === 1) {
      const l = new L(W, H);
      l.ellipse(ax, ay, 13, 5, 1);
      l.bands([1, 2, 3], [5, 6, 7, 8]);
      l.render(c, G);
    }
    if (f >= 2) {
      const sorted = [...fe].sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
      for (const [k, p] of sorted.entries()) {
        const spread = clamp((f - 2) / 3, 0, 1);
        const gx = ax + Math.cos(p.a) * rx * p.d * spread * 0.95;
        const gy = ay + Math.sin(p.a) * ry * p.d * spread * 0.95;
        const fall = clamp((f - 3) / 4, 0, 1);
        const h = lerp(p.hgt * (0.5 + spread * 0.6), 0, fall);
        if (f === 2 && k % 2) continue;
        feather(c, gx + Math.sin(f * 1.3 + k) * 3 * fall, gy - h, p.ang + f * 0.6 * (k % 2 ? 1 : -1) + fall * 1.2, p.len, { wid: p.len * 0.42, curl: 0.5, alpha: f === 7 ? 200 : 255, dark: Math.sin(p.a) < -0.4 });
      }
      for (let k = 0; k < 8; k++) {
        const fall = clamp((f - 2) / 5, 0, 1);
        const a = rnd(806, k) * TAU;
        petal(c, ax + Math.cos(a) * rx * 0.7 * (0.3 + fall * 0.7), ay - 70 * (1 - fall) + Math.sin(a) * ry * 0.5 + rnd(807, k) * 10, f + k, 2.6, f === 7 ? 200 : 255);
      }
    }
    const sp = new L(W, H);
    if (f >= 1 && f <= 6) for (let k = 0; k < 6; k++) sparkle(sp, ax + (rnd(808, k, f) - 0.5) * 140, ay - 10 - rnd(809, k, f) * 90, 1 + (k % 2));
    sp.render(c, G, { outline: null });
    return c;
  });
  return sprite('blast', 'Genjutsu blast: Temple of Nirvana', [ax, ay], { blast: once(frames, 12) });
}

const WW = 272, WH = 128, WGY = 120, WALL_H = 103, WALL_W = 257;

/** One mirror panel of the veil, the reflection sweep at phase sh (0..1 across the wall). */
function panelLayer(c: Canvas, x: number, w: number, h: number, gy: number, k: number, sh: number, alpha: number): void {
  const l = new L(c.w, c.h);
  const lean = (rnd(901, k) - 0.5) * 6;
  const top = gy - h;
  const pts: Pt[] = [[x, gy], [x + lean * 0.3, top + 8 + rnd(902, k) * 6], [x + w * 0.45 + lean, top], [x + w + lean * 0.4, top + 5 + rnd(903, k) * 8], [x + w, gy]];
  l.poly(pts, (px, py) => {
    const band = fract((px * 0.5 - py * 0.9) / 26 + k * 0.29);
    const sweep = Math.abs(px - (sh * (WW + 80) - 40) + (gy - py) * 0.5);
    if (sweep < 3) return 7;
    if (sweep < 6) return 6;
    // A wavy distortion: the reflection ripples in horizontal bands.
    const rip = fract(py / 9 + Math.sin(px * 0.25 + k) * 0.18);
    if (rip < 0.12) return 2;
    return band < 0.08 ? 6 : band < 0.18 ? 5 : py > gy - 14 ? 2 : k % 2 ? 3 : 4 - (band > 0.6 ? 1 : 0);
  });
  for (let i = 0; i < 2; i++) {
    const sx = x + w * (0.3 + rnd(904, k, i) * 0.4), sy = top + 15 + rnd(905, k, i) * (h - 30);
    l.path([[sx, sy], [sx + 3, sy + 5], [sx + 1, sy + 10], [sx + 4, sy + 15]], (px, py) => (l.get(px, py) >= 0 ? 1 : null));
    l.path([[sx + 1, sy], [sx + 4, sy + 5], [sx + 2, sy + 10], [sx + 5, sy + 15]], (px, py) => (l.get(px, py) >= 3 ? 6 : null));
  }
  l.bevel({ lit: 2, shade: 1, max: 7, min: 1 });
  l.render(c, GLASS, { alpha: (v) => (v >= 6 ? Math.min(255, alpha + 50) : alpha), outlineAlpha: Math.min(255, alpha + 40) });
  // Violet frame glow along the panel edges.
  const e = new L(c.w, c.h);
  e.fill((px, py) => l.get(px, py) >= 0 && (l.get(px - 1, py) < 0 || l.get(px + 1, py) < 0), (px, py) => (py < top + h * 0.3 ? 6 : 4));
  e.render(c, G, { outline: null, alpha: 200 });
}

/** Mirror veil: tall glass shards side by side. */
function veil(c: Canvas, gy: number, rise: (k: number) => number, sh: number, alpha = 190): void {
  const x0 = (WW - WALL_W) / 2;
  const n = 11;
  const ws = range(n).map((k) => 0.75 + rnd(906, k) * 0.5);
  const tot = ws.reduce((a, b) => a + b, 0);
  let x = x0;
  const xs: number[] = [];
  for (let k = 0; k < n; k++) {
    xs.push(x);
    x += (ws[k] / tot) * WALL_W;
  }
  for (const k of range(n).sort((a, b) => (a % 2) - (b % 2))) {
    const w = (ws[k] / tot) * WALL_W + 4;
    const h = WALL_H * (0.78 + rnd(907, k) * 0.22) * rise(k);
    if (h < 3) continue;
    panelLayer(c, xs[k] - 2, w, h, gy, k, sh, k % 2 ? alpha - 25 : alpha);
  }
}

/** Wall: a veil of distorted mirrors rising shard by shard ('rise'), a reflection sweeping across ('idle'). */
function wall(): WorldSprite {
  const base = (c: Canvas, t: number, k: number): void => {
    const list: Puff[] = [];
    for (let i = 0; i < 16; i++) {
      const ph = fract(rnd(910, i) + t);
      list.push({ x: 14 + i * 16 + ph * 6, y: WGY - 6 - ph * 4, r: (5 + rnd(911, i) * 3.5) * k * (1 - ph * 0.4), steps: [1, 2, 3, 4, 5] });
    }
    smoke(c, list, { seed: 912, alpha: 205 });
  };
  const rise = range(6).map((f) => {
    const c = new Canvas(WW, WH);
    base(c, f / 6, [0.5, 0.8, 1, 1, 1, 1][f]);
    veil(c, WGY, (k) => clamp((f + 1) / 4 - Math.abs(k - 5) * 0.06, 0, 1) * (f === 3 ? 1.03 : 1), 0.5, 190);
    const sp = new L(WW, WH);
    for (let i = 0; i < 10; i++) sparkle(sp, 12 + rnd(913, i, f) * 248, WGY - 20 - rnd(914, i, f) * 80, 1 + ((i + f) % 2));
    sp.render(c, G, { outline: null });
    for (let i = 0; i < 6; i++) feather(c, 20 + rnd(915, i, f) * 230, WGY - 10 - rnd(916, i, f) * 90, rnd(917, i, f) * TAU, 8, { wid: 3.4, curl: 0.5 });
    return c;
  });
  const idle = range(N).map((f) => {
    const c = new Canvas(WW, WH);
    base(c, f / N, 1);
    veil(c, WGY, () => 1, f / N, 190);
    for (let i = 0; i < 5; i++) {
      const ph = fract(rnd(918, i) + f / N);
      petal(c, 20 + i * 52 + ph * 20, WGY - WALL_H + 8 + ph * 84, ph * TAU + i, 2.6);
    }
    const sp = new L(WW, WH);
    for (let i = 0; i < 3; i++) sparkle(sp, 20 + ((rnd(919, i) * 232 + (f / N) * 232) % 232), WGY - 30 - rnd(920, i) * 60, 1 + (i % 2));
    sp.render(c, G, { outline: null });
    return c;
  });
  return sprite('wall', 'Genjutsu wall: mirror veil', [WW / 2, WGY], { rise: once(rise, 12), idle: loop(idle, 8) });
}

// --- the mirror veil in 3/4 and depth --------------------------------------------------------

/** Panel layout of the veil along the wall (same panels as the horizontal veil). */
interface Panel {
  u0: number;
  u1: number;
  h: number;
  apex: number;
  lt: number;
  rt: number;
  sc: number;
  k: number;
  cracks: Pt[][];
}
const GLASS_HALF = 9;
function veilPanels(): Panel[] {
  const n = 11;
  const ws = range(n).map((k) => 0.75 + rnd(906, k) * 0.5);
  const tot = ws.reduce((a, b) => a + b, 0);
  let u = 0;
  return range(n).map((k) => {
    const w = (ws[k] / tot) * LEN;
    const lean = (rnd(901, k) - 0.5) * 6;
    const h = HGT * (0.78 + rnd(907, k) * 0.22);
    const p: Panel = { u0: u, u1: u + w, h, apex: w * 0.45 + lean, lt: 8 + rnd(902, k) * 6, rt: 5 + rnd(903, k) * 8, sc: k % 2 ? 2.5 : -2.5, k, cracks: [] };
    for (let i = 0; i < 2; i++) {
      const cu = w * (0.3 + rnd(904, k, i) * 0.4), cv = h - 15 - rnd(905, k, i) * (h - 30);
      p.cracks.push([[cu, cv], [cu + 3, cv - 5], [cu + 1, cv - 10], [cu + 4, cv - 15]]);
    }
    u += w;
    return p;
  });
}
/** Top of a panel at local u (corners low, an apex leaning a little). */
function panelTop(p: Panel, lu: number): number {
  const w = p.u1 - p.u0;
  return lu < p.apex ? lerp(p.h - p.lt, p.h, clamp(lu / Math.max(1, p.apex), 0, 1)) : lerp(p.h, p.h - p.rt, clamp((lu - p.apex) / Math.max(1, w - p.apex), 0, 1));
}

/** One frame of the veil in orientation o: panel k shows rise(k) of its height; the sweep at sh. */
function veilFrame(o: Orient, panels: Panel[], rise: (k: number) => number, sh: number, t: number, extras: (c: Canvas, P: (u: number, s: number, v: number) => Pt) => void): Canvas {
  const c = new Canvas(o.w, o.h);
  const P = (u: number, s: number, v: number): Pt => proj(o, u, s, v);
  const at = (u: number): Panel | null => {
    if (u < 0 || u > LEN) return null;
    for (const p of panels) if (u >= p.u0 && u < p.u1 + (p.k === panels.length - 1 ? 0.01 : 0)) return p;
    return panels[panels.length - 1];
  };
  // Base smoke behind the veil.
  const smokeAt = (side: number): Puff[] =>
    range(11).map((i) => {
      const ph = fract(rnd(910, i) + t);
      const q = P(10 + i * 22 + (rnd(921, i) - 0.5) * 10 + ph * 5, side * (GLASS_HALF + 4 + rnd(922, i) * 6), 3 + ph * 5);
      return { x: q[0], y: q[1], r: (3 + rnd(911, i) * 5.5) * (1 - ph * 0.45), steps: [1, 2, 3, 4, 5] };
    });
  smoke(c, smokeAt(-1).sort((a, b) => a.y - b.y), { seed: 912, alpha: 205 });
  const inside = (u: number, s: number, v: number): number => {
    if (u < 0) return 3;
    if (u > LEN) return 4;
    const p = at(u)!;
    const r = rise(p.k);
    if (r <= 0.03) return 0;
    if (v > panelTop(p, u - p.u0) * r) return 0;
    if (Math.abs(s - p.sc) > GLASS_HALF) return 1;
    return -1;
  };
  const hits = march(o, inside, { sMax: GLASS_HALF + 3, vMax: HGT + 2 });
  const front = new L(o.w, o.h), rim = new L(o.w, o.h), glow = new L(o.w, o.h), mask = new L(o.w, o.h);
  for (let i = 0; i < o.w * o.h; i++) {
    const fc = hits.face[i];
    if (fc < 0) continue;
    const x = i % o.w, y = (i / o.w) | 0;
    const u = hits.u[i], v = hits.v[i];
    const p = at(u)!;
    const r = Math.max(0.05, rise(p.k));
    const lu0 = u - p.u0, lv = v / r;
    mask.set(x, y, 1);
    const haze = o.key !== 'wall' && u > LEN * 0.66 ? 1 : 0;
    // Which face: from the local geometry (the panel's near end, its top, or its broad face).
    const topV = panelTop(p, lu0);
    const ls = hits.s[i] - p.sc + GLASS_HALF;
    const end = lu0 < 0.9 && lv < topV - 0.8;
    if (!end && (fc === 0 || lv > topV - 0.9)) {
      const gl2 = fract((u * 0.7 - ls * 0.9) / 11 + p.k * 0.37);
      rim.set(x, y, Math.max(3, (ls > 2 * GLASS_HALF - 2 || gl2 < 0.12 ? 7 : ls < 2 ? 5 : gl2 > 0.6 ? 5 : 6) - haze));
      continue;
    }
    // Glass: reflection bands, a sweep of light, ripples and cracks, lit left/top edges. The
    // near end of a panel is glass too, seen across its thickness.
    const lu = end ? ls * 0.9 : lu0;
    const band = fract((lu * 0.5 + lv * 0.9) / 26 + p.k * 0.29);
    const sweep = Math.abs((end ? p.u0 + ls : u) - (sh * (LEN + 80) - 40) + lv * 0.5);
    let st: number;
    if (sweep < 3) st = 7;
    else if (sweep < 6) st = 6;
    else if (fract(-lv / 9 + Math.sin(lu * 0.25 + p.k) * 0.18) < 0.12) st = 2;
    else st = band < 0.08 ? 6 : band < 0.18 ? 5 : lv < 14 ? 2 : p.k % 2 ? 3 : 4 - (band > 0.6 ? 1 : 0);
    if (!end)
      for (const cr of p.cracks)
      for (let k = 0; k + 1 < cr.length; k++) {
        const d = segDist(lu, lv, cr[k][0], cr[k][1], cr[k + 1][0], cr[k + 1][1])[0];
        if (d < 0.6) st = 1;
        else if (d < 1.4 && lu > cr[k][0] && st >= 3) st = 6;
      }
    const top = panelTop(p, lu0);
    if (end) {
      if (ls < 1.5 || top - lv < 1.5) st = Math.min(7, st + 2);
      else if (ls > 2 * GLASS_HALF - 1.5) st = Math.max(1, st - 1);
    } else if (lu < 1.5 || top - lv < 1.5) st = Math.min(7, st + 2);
    else if (p.u1 - u < 1.2) st = Math.max(1, st - 1);
    front.set(x, y, Math.max(1, st - haze - (end ? 1 : 0)));
    if (!end && lu < 1) glow.set(x, y, lv > top * 0.7 ? 6 : 4);
    if (end && ls < 1) glow.set(x, y, lv > top * 0.7 ? 6 : 4);
  }
  mask.render(c, GLASS, { alpha: 0, outlineAlpha: 230 });
  front.render(c, GLASS, { outline: null, alpha: (v) => (v >= 6 ? 240 : 190) });
  rim.render(c, GLASS, { outline: null, alpha: 225 });
  glow.render(c, G, { outline: null, alpha: 170 });
  smoke(c, smokeAt(1).sort((a, b) => a.y - b.y), { seed: 913, alpha: 205 });
  extras(c, P);
  return c;
}

/** Mirror veil in 3/4 or depth: 'rise' (6, the shards shooting up from the middle out) then 'idle' (4). */
function veilWall(key: 'wall_diag' | 'wall_depth'): WorldSprite {
  const o = orientations()[key];
  const panels = veilPanels();
  const rise = range(6).map((f) =>
    veilFrame(o, panels, (k) => clamp((f + 1) / 4 - Math.abs(k - 5) * 0.06, 0, 1) * (f === 3 ? 1.03 : 1), 0.5, f / 6, (c, P) => {
      const sp = new L(o.w, o.h);
      for (let i = 0; i < 10; i++) {
        const q = P(8 + rnd(913, i, f) * (LEN - 16), GLASS_HALF + 2, 20 + rnd(914, i, f) * 70);
        sparkle(sp, q[0], q[1], 1 + ((i + f) % 2));
      }
      sp.render(c, G, { outline: null });
      for (let i = 0; i < 6; i++) {
        const q = P(16 + rnd(915, i, f) * (LEN - 32), GLASS_HALF + 4, 12 + rnd(916, i, f) * 80);
        feather(c, q[0], q[1], rnd(917, i, f) * TAU, 8, { wid: 3.4, curl: 0.5 });
      }
    }),
  );
  const idle = range(4).map((f) =>
    veilFrame(o, panels, () => 1, f / 4, f / 4, (c, P) => {
      for (let i = 0; i < 5; i++) {
        const ph = fract(rnd(918, i) + f / 4);
        const q = P(16 + i * 52 + ph * 14, GLASS_HALF + 4, HGT - 10 - ph * 80);
        petal(c, q[0], q[1], ph * TAU + i, 2.6);
      }
      const sp = new L(o.w, o.h);
      for (let i = 0; i < 3; i++) {
        const q = P(16 + ((rnd(919, i) * 225 + (f / 4) * 225) % 225), GLASS_HALF + 2, 30 + rnd(920, i) * 60);
        sparkle(sp, q[0], q[1], 1 + (i % 2));
      }
      sp.render(c, G, { outline: null });
    }),
  );
  const label = key === 'wall_diag' ? 'Genjutsu wall (3/4): mirror veil' : 'Genjutsu wall (depth): mirror veil';
  return sprite(key, label, [o.ax, o.ay], { rise: once(rise, 12), idle: loop(idle, 8) });
}

/** Aura (the owner approved this look: keep it): smoke tongues at the sides, sigils orbiting, petals and feathers. */
function aura(): WorldSprite {
  const W = 80, H = 128, ax = 40, ay = 112;
  const S = AURA_STEP;
  const frames = range(6).map((f) => {
    const c = new Canvas(W, H), t = f / 6;
    const g = new L(W, H);
    g.ellipse(ax, ay, 32, 8, 1);
    g.erase((x, y) => ((x + 0.5 - ax) / 29) ** 2 + ((y + 0.5 - ay) / 6) ** 2 < 1);
    g.map((v, x, y) => (fract((Math.atan2(y + 0.5 - ay, (x + 0.5 - ax) / 4) / TAU) * 8 + t) < 0.5 ? S[4] : S[2]));
    g.render(c, G);
    for (const side of [-1, 1]) {
      const l = new L(W, H);
      for (let k = 0; k < 3; k++) {
        const pts: Pt[] = [];
        for (let i = 0; i <= 20; i++) {
          const s = i / 20;
          const sway = Math.sin(s * 5 - t * TAU + k * 2.1 + (side > 0 ? 1 : 0)) * (3 + s * 4);
          pts.push([ax + side * (26 + k * 3 - s * 4) + sway, ay - 4 - s * (70 + k * 14)]);
        }
        l.tube(pts, (s) => (4 - k * 0.7) * (1 - s) + 0.5, 1);
      }
      energy(l, [1, 2, 3.4], [S[1], S[2], S[3], S[4]]);
      l.render(c, G, { alpha: (v) => (v >= S[3] ? 240 : 200), outlineAlpha: 200 });
    }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU + t * (TAU / 3);
      const x = ax + Math.cos(a) * 30, y = 58 + Math.sin(a) * 6 - k * 14;
      if (Math.abs(Math.cos(a)) < 0.45) continue;
      const l = new L(W, H);
      sigilMask(l, x, y, 3, t * (TAU / 4) + k, 2.4);
      energy(l, [1, 2], [S[3], S[5], S[6]]);
      l.render(c, G);
      const mk = new L(W, H);
      mk.disc(x, y, 1.1, S[1]);
      mk.render(c, G, { outline: null });
    }
    for (let i = 0; i < 4; i++) {
      const ph = fract(rnd(951, i) + t);
      const side = i % 2 ? 1 : -1;
      if (i < 2) petal(c, ax + side * (22 + rnd(952, i) * 10), 10 + ph * 96, ph * 8 + i, 2.6);
      else feather(c, ax + side * (24 + rnd(953, i) * 8) + Math.sin(ph * TAU) * 3, 14 + ph * 90, 1.2 + Math.sin(ph * TAU * 2) * 0.6, 8, { wid: 3.4, curl: 0.5 });
    }
    return c;
  });
  return sprite('aura', 'Genjutsu aura: smoke tongues and sigils', [ax, ay], { idle: loop(frames, 10) });
}

export function buildGenjutsu(): WorldSprite[] {
  return [bolt(), beast(), stream(), streamHead(), breath(), sphere(), slash(), multi(), hit(), blast(), wall(), aura(), veilWall('wall_diag'), veilWall('wall_depth')];
}
