// Wind jutsu VFX: airy, see-through strokes instead of solid bodies. Gusts are thin crescent
// strokes and pressure rings that taper at both ends, white speed streaks, spinning leaves and
// feathers; the core of a vortex is the only near-white solid. Palette: deep green-teal outline,
// sage, mint, pale mint, white-green, white; most pixels are semi-transparent.

import { Canvas, Color, WorldSprite, withAlpha } from './kit';
import {
  Field, Pt, TAU, arc, bez, clamp, crop, flySprite, frames, fract, lerp, outlineIn, palette, pnoise, render, rr, seamStack, smooth, stack, vfxSprite,
} from './vfx-a-lib';

export const WIND = palette('#0d3b38', '#2a6b5c', '#5ea48a', '#92d8b4', '#c4f2d6', '#e9fff1', '#ffffff');
/** Leaves caught in the wind. */
const LEAF = palette('#14301a', '#2f5e2a', '#4f8a3a', '#7ab84a', '#a8d868', '#d8f0a0', '#f0ffd0');
const TH = [0, 0.18, 0.34, 0.5, 0.66, 0.84];
/** Alpha per step: the outline and the cool steps are see-through, the white core nearly solid. */
const AIR = [175, 140, 170, 200, 226, 242, 252];
const air = (f: Field, extra: { rim?: number[]; hi?: number; lo?: number; alpha?: number[] } = {}) => render(f, WIND, { th: TH, alpha: extra.alpha ?? AIR, rim: extra.rim ?? [1], hi: extra.hi, lo: extra.lo });

/** A gust stroke: a curve that tapers at both ends, hottest along its middle. */
function gust(f: Field, pts: Pt[], w: number, heat: number, bias = 0.5): void {
  w *= 1.45;
  f.path(pts, (u) => w * Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.7) + 0.35, (u) => heat * (0.55 + 0.45 * Math.sin(Math.PI * clamp(u + (bias - 0.5) * 0.6, 0, 1))));
}

/** A leaf: a pointed oval with a midrib, flipping (foreshortened) with `spin`. */
function leaf(c: Canvas, x: number, y: number, len: number, a: number, spin: number): void {
  const f = new Field(c.w, c.h);
  const ca = Math.cos(a), sa = Math.sin(a);
  const half = len / 2, wid = Math.max(0.6, (len * 0.32) * Math.abs(Math.cos(spin)));
  const top = Math.cos(spin) > 0;
  f.region(x - half - 1, y - half - 1, x + half + 1, y + half + 1, (px, py) => {
    const dx = px - x, dy = py - y;
    const l = dx * ca + dy * sa, q = -dx * sa + dy * ca;
    const lw = wid * (1 - (l / half) ** 2);
    if (Math.abs(l) > half || Math.abs(q) > lw) return 0;
    const lit = (q < 0) === top ? 0.72 : 0.42;
    return Math.abs(q) < 0.6 && Math.abs(l) < half * 0.8 ? 0.85 : lit;
  });
  // A short stem at the back.
  f.seg(x - ca * half, y - sa * half, x - ca * (half + 2), y - sa * (half + 2), 0.6, 0.5, 0.45, 0.45);
  c.draw(render(f, LEAF, { th: [0, 0.3, 0.5, 0.6, 0.8, 0.95], lo: 2, hi: 5 }), 0, 0);
}

/** White speed streaks: 1 px lines fading to the left. */
function streaks(c: Canvas, list: [number, number, number][]): void {
  for (const [x, y, len] of list)
    for (let k = 0; k < len; k++) {
      const u = k / len;
      c.plot(Math.round(x - k), Math.round(y), withAlpha(WIND[u < 0.3 ? 6 : u < 0.65 ? 5 : 4], Math.round(lerp(240, 90, u))));
    }
}

/** A feather drifting: a shaft with an asymmetric vane. */
function feather(c: Canvas, x: number, y: number, len: number, a: number): void {
  const f = new Field(c.w, c.h);
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let k = 0; k <= 8; k++) {
    const u = k / 8;
    const px = x + ca * len * (u - 0.5), py = y + sa * len * (u - 0.5);
    f.disc(px - sa * 1, py + ca * 1, 1.6 * Math.sin(Math.PI * Math.min(1, u * 1.2)) + 0.4, 0.8);
  }
  f.seg(x - ca * len * 0.6, y - sa * len * 0.6, x + ca * len * 0.5, y + sa * len * 0.5, 0.5, 0.5, 0.95, 0.95);
  c.draw(render(f, WIND, { th: TH, lo: 3, alpha: [200, 200, 200, 220, 235, 245, 255] }), 0, 0);
}

// --- bolt: a spinning vortex disc -----------------------------------------------------------

function bolt(): WorldSprite {
  const W = 64, H = 64, cx = 38, cy = 32;
  const fr = frames(4, (t) => {
    const f = new Field(W, H), ring = new Field(W, H);
    const rot = t * (TAU / 3);
    // Three spiral arms of wind around a white eye, seen a little edge-on.
    for (let k = 0; k < 3; k++) {
      const pts: Pt[] = [];
      for (let j = 0; j <= 16; j++) {
        const u = j / 16;
        const a = rot + k * (TAU / 3) + u * 2.6;
        const r = 2 + u * 11;
        pts.push([cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r]);
      }
      f.path(pts, (u) => lerp(2.6, 0.6, u), (u) => lerp(1, 0.35, u));
    }
    f.disc(cx, cy, 4.2, 1, 1.5);
    // A pressure ring around the disc.
    ring.region(cx - 18, cy - 20, cx + 18, cy + 20, (x, y) => {
      const d = Math.abs(Math.hypot((x - cx) / 12.5, (y - cy) / 16.5) - 1) * 12;
      const a = Math.atan2(y - cy, x - cx);
      return d < 1 && Math.cos(a) > -0.7 ? 0.62 : 0;
    });
    const c = stack(W, H, air(ring, { lo: 3, hi: 4 }), air(f));
    // Gust trails sweeping back from the disc.
    const tr = new Field(W, H);
    for (let k = 0; k < 3; k++) {
      const y = cy + (k - 1) * 9;
      const ph = fract(t + k * 0.3);
      gust(tr, bez([cx - 8, y], [cx - 16, y - 2 + k], [cx - 26, y + 1 - k], [cx - 34 - ph * 4, y - 1], 14), 1.6, 0.6);
    }
    const lv = new Canvas(W, H);
    leaf(lv, cx - 26 - fract(t) * 6, cy + 14, 7, 0.3 + t * TAU, t * TAU * 2);
    const out = stack(W, H, air(tr, { hi: 5 }), c, lv);
    streaks(out, [[cx - 14, cy - 13, 12], [cx - 18, cy + 12, 10], [cx - 24, cy - 2, 8]]);
    return out;
  });
  return flySprite('bolt', 'Wind bolt (vortex disc)', fr);
}

// --- beast: a crane of wind -----------------------------------------------------------------
//
// 128 x 80, 6-frame flap like the phoenix: neck stretched forward, long beak, long legs trailing,
// broad wings of feather strokes that go up, sweep, come down and fold, gust trails behind.

interface CranePose {
  arm: number;
  hand: number;
  p0: number;
  p1: number;
  fold: number;
  bob: number;
}
const CRANE: CranePose[] = [
  { arm: -100, hand: -112, p0: -110, p1: -176, fold: 1, bob: 1 },
  { arm: -142, hand: -154, p0: -150, p1: -205, fold: 1, bob: 0 },
  { arm: 168, hand: 156, p0: 154, p1: 104, fold: 1, bob: -1 },
  { arm: 126, hand: 112, p0: 108, p1: 160, fold: 0.92, bob: -2 },
  { arm: -160, hand: -172, p0: -166, p1: -200, fold: 0.72, bob: -1 },
  { arm: -120, hand: -132, p0: -128, p1: -184, fold: 0.9, bob: 0 },
];
const D = Math.PI / 180;
const dv = (a: number): Pt => [Math.cos(a * D), Math.sin(a * D)];

function craneWing(W: number, H: number, S: Pt, ps: CranePose, k: number, heat: number, t: number): Canvas[] {
  const out: Canvas[] = [];
  const fa = 14 * k * ps.fold, ha = 11 * k * ps.fold;
  const Wr: Pt = [S[0] + dv(ps.arm)[0] * fa, S[1] + dv(ps.arm)[1] * fa];
  const T: Pt = [Wr[0] + dv(ps.hand)[0] * ha, Wr[1] + dv(ps.hand)[1] * ha];
  const look = { th: TH, rim: [1], outline: false, alpha: [255, 190, 210, 230, 245, 255, 255] };
  // Primaries: long white feathers with dark tips (a crane's black wingtips, here deep teal).
  for (let j = 6; j >= 0; j--) {
    const f = new Field(W, H);
    const u = j / 6;
    const root: Pt = [lerp(Wr[0], T[0], 1 - u * 0.8), lerp(Wr[1], T[1], 1 - u * 0.8)];
    const a = lerp(ps.p0, ps.p1, u);
    const len = lerp(27, 17, u) * k * (0.75 + 0.25 * ps.fold) + Math.sin(t * TAU + j) * 1;
    const d = dv(a);
    f.path([root, [root[0] + d[0] * len * 0.5, root[1] + d[1] * len * 0.5], [root[0] + d[0] * len, root[1] + d[1] * len]], (q) => lerp(4.4, 2.6, q) * k * (q > 0.92 ? 0.7 : 1), (q) => heat * (q > 0.74 ? 0.24 : lerp(0.95, 0.72, q)));
    out.push(render(f, WIND, look));
  }
  // Secondaries and coverts: a broad white wing.
  const cv = new Field(W, H);
  for (let j = 0; j < 5; j++) {
    const u = j / 4;
    const root: Pt = [lerp(S[0], Wr[0], u), lerp(S[1], Wr[1], u)];
    const a = lerp(ps.p1 + 8, ps.p1 + 22, u);
    const d = dv(a);
    cv.path([root, [root[0] + d[0] * 15 * k, root[1] + d[1] * 15 * k]], (q) => lerp(4.6, 3, q) * k, (q) => heat * lerp(0.95, 0.75, q));
  }
  cv.path([S, Wr, T], (u) => lerp(4.4, 2.2, u) * k, heat, 1);
  out.push(render(cv, WIND, look));
  return out;
}

function beast(): WorldSprite {
  const W = 128, H = 100, sx = 70, sy = 52;
  const fr = frames(6, (t, i) => {
    const ps = CRANE[i];
    const by = ps.bob;
    const ph = t * TAU;
    const parts: (Canvas | null)[] = [];
    const look = { th: TH, rim: [1], outline: false, alpha: [255, 190, 210, 230, 245, 255, 255] };
    // Gust trails streaming off the wings and body (behind everything).
    const tr = new Field(W, H);
    for (let k = 0; k < 4; k++) {
      const y = sy - 22 + k * 14 + by;
      const sh = fract(t + k * 0.23) * 10;
      gust(tr, bez([sx - 10, y], [sx - 28, y + 3], [sx - 46, y - 3], [sx - 66 - sh, y + 1], 16), 0.9, 0.6, 0.7);
    }
    const trails = air(tr, { hi: 5, alpha: [120, 80, 100, 130, 160, 190, 220] });
    // Far wing.
    const off = (a: number, d: number) => a + (a < 0 ? d : -d);
    parts.push(...craneWing(W, H, [sx + 5, sy - 3 + by], { ...ps, arm: off(ps.arm, 12), hand: off(ps.hand, 14), p0: off(ps.p0, 14), p1: off(ps.p1, 12) }, 0.85, 0.75, t + 0.1));
    // Legs trailing straight back, and the tail.
    const lg = new Field(W, H);
    lg.path([[sx - 8, sy + 4 + by], [sx - 30, sy + 8 + by], [sx - 48, sy + 9 + by]], 1.1, 0.5);
    lg.path([[sx - 8, sy + 5 + by], [sx - 29, sy + 11 + by], [sx - 46, sy + 13 + by]], 1.1, 0.45);
    for (const [fx, fy] of [[sx - 48, sy + 9], [sx - 46, sy + 13]]) lg.path([[fx, fy + by], [fx - 4, fy - 2 + by]], 0.8, 0.5);
    parts.push(render(lg, WIND, look));
    const tl = new Field(W, H);
    for (let k = 0; k < 3; k++) tl.path([[sx - 10, sy + 1 + by], [sx - 22, sy - 1 + k * 3 + by + Math.sin(ph + k) * 1]], (q) => lerp(2.8, 1.2, q), (q) => lerp(0.8, 0.5, q));
    parts.push(render(tl, WIND, look));
    // Body: a slim white torso.
    const bd = new Field(W, H);
    bd.ell(sx, sy + by, 16, 7.5, -0.08, 1, 1.3);
    parts.push(render(bd, WIND, look));
    // Neck stretched forward and the head with a long beak and a red crown.
    const nk = new Field(W, H);
    nk.path(bez([sx + 10, sy - 2 + by], [sx + 20, sy - 6 + by], [sx + 30, sy - 9 + by], [sx + 40, sy - 10 + by], 12), (u) => lerp(4.4, 2.8, u), 0.98);
    nk.disc(sx + 42, sy - 10 + by, 3.4, 1, 1.4);
    parts.push(render(nk, WIND, look));
    const bk = new Field(W, H);
    bk.poly([[sx + 44, sy - 12 + by], [sx + 58, sy - 9 + by], [sx + 44, sy - 8 + by]], 0.55);
    parts.push(render(bk, WIND, { ...look, lo: 2, hi: 4 }));
    // Near wing in front.
    parts.push(...craneWing(W, H, [sx, sy - 3 + by], ps, 1, 1, t));
    const bird = seamStack(W, H, parts, WIND[2], WIND[0], 190);
    // Red crown and eye.
    bird.set(sx + 41, sy - 13 + by, [214, 58, 58, 255]);
    bird.set(sx + 42, sy - 13 + by, [214, 58, 58, 255]);
    bird.set(sx + 43, sy - 11 + by, WIND[0]);
    const lv = new Canvas(W, H);
    for (let k = 0; k < 3; k++) {
      const p = fract(k / 3 + t);
      feather(lv, sx - 30 - p * 50, sy - 30 + k * 22 + Math.sin(p * 6 + k) * 3, 8, 0.4 + p * 3 + k);
    }
    const out = stack(W, H, trails, bird, lv);
    streaks(out, [[sx - 20, sy - 30 + by, 22], [sx - 26, sy + 24 + by, 18], [sx - 40, sy - 4, 14]]);
    return out;
  });
  return flySprite('beast', 'Wind beast (crane)', fr);
}

// --- stream: a tileable line of wind blades + its pressure-front head -----------------------

function stream(): WorldSprite[] {
  const W = 64, H = 64, PAD = 24, cy = 32;
  const lane = (f: Field, s: number, ox: number) => {
    // Three lanes of dashed gust strokes.
    for (let k = 0; k < 6; k++)
      for (const rep of [-64, 0, 64]) {
        const x = fract((k * 23 + s * 1.0) / 64) * 64 + rep + ox;
        const y = cy + [-9, 0, 9][k % 3] + (k % 2 ? 1 : -1);
        gust(f, [[x - 22, y], [x - 11, y - 1], [x, y]], 1.5, 0.62, 0.8);
      }
  };
  const blades = (f: Field, s: number, ox: number) => {
    // Crescent blades riding the line.
    for (let k = 0; k < 2; k++)
      for (const rep of [-64, 0, 64]) {
        const x = fract((k * 32 + 8 + s) / 64) * 64 + rep + ox;
        gust(f, arc(x - 10, cy, 12, 17, -1.2, 1.2, 18), 2.6, 1, 0.5);
      }
  };
  const tile = frames(4, (t) => {
    const s = t * 64;
    const a = new Field(W + PAD * 2, H), b = new Field(W + PAD * 2, H);
    lane(a, s, PAD);
    blades(b, s, PAD);
    const c = stack(W + PAD * 2, H, air(a, { hi: 5 }), air(b));
    return crop(c, PAD, 0, W, H);
  });
  const head = frames(4, (t) => {
    const s = t * 64;
    const a = new Field(W + PAD, H), b = new Field(W + PAD, H);
    lane(a, s, PAD);
    a.cut((x) => x > PAD + 40);
    // A big pressure front: a crescent with curls at its tips.
    const fx = PAD + 42 + Math.sin(t * TAU) * 1;
    gust(b, arc(fx - 16, cy, 18, 24, -1.15, 1.15, 24), 3.6, 1, 0.5);
    gust(b, arc(fx - 24, cy, 14, 18, -1.1, 1.1, 20), 2.2, 0.75, 0.5);
    for (const sgn of [-1, 1]) {
      const tip: Pt = [fx - 16 + Math.cos(1.15) * 18, cy + sgn * Math.sin(1.15) * 24];
      gust(b, arc(tip[0] - 4, tip[1] - sgn * 1, 4, 4, sgn > 0 ? -0.5 : 0.5, sgn > 0 ? 3.6 : -2.6, 12), 1.4, 0.7);
    }
    const c = stack(W + PAD, H, air(a, { hi: 5 }), air(b));
    streaks(c, [[PAD + 26, cy - 15, 14], [PAD + 24, cy + 15, 12]]);
    return crop(c, PAD, 0, W, H);
  });
  return [flySprite('stream', 'Wind stream (blade line, tileable 64 px)', tile), flySprite('stream_head', 'Wind stream head', head)];
}

// --- breath: a gust cone of expanding pressure arcs -----------------------------------------

function breath(): WorldSprite {
  const W = 96, H = 64, oy = 32;
  const fr = frames(4, (t) => {
    const f = new Field(W, H), sl = new Field(W, H);
    // Pressure fronts rolling out: arcs centred on the mouth, wider as they travel.
    for (let k = 0; k < 5; k++) {
      const p = fract(k / 5 + t);
      const r = 10 + p * 76;
      const span = 0.42 - p * 0.1;
      gust(f, arc(0, oy, r, r, -span, span, 24), lerp(3.2, 2, p), lerp(1, 0.6, p), 0.5);
    }
    // Streamlines fanning out.
    for (let k = 0; k < 7; k++) {
      const a = -0.36 + (k / 6) * 0.72;
      const p = fract(t + k * 0.37);
      const d0 = 8 + p * 40;
      gust(sl, [[d0 * Math.cos(a), oy + d0 * Math.sin(a)], [(d0 + 26) * Math.cos(a), oy + (d0 + 26) * Math.sin(a)]], 1.2, 0.6, 0.8);
    }
    const c = stack(W, H, air(sl, { hi: 5 }), air(f));
    const lv = new Canvas(W, H);
    for (let k = 0; k < 4; k++) {
      const p = fract(k / 4 + t + 0.1);
      const a = rr(311, k, -0.3, 0.3);
      const d = 20 + p * 66;
      leaf(lv, d * Math.cos(a), oy + d * Math.sin(a) * 1.1, 6 + (k % 2) * 2, a + p * 7, p * TAU * 2 + k);
    }
    return stack(W, H, c, lv);
  });
  return flySprite('breath', 'Wind breath (gust cone, origin left middle)', fr);
}

// --- sphere: a compressed ball of air -------------------------------------------------------

function sphere(): WorldSprite {
  const W = 64, H = 64, cx = 33, cy = 32, R = 21;
  const fr = frames(4, (t) => {
    const back = new Field(W, H), front = new Field(W, H), shell = new Field(W, H), core = new Field(W, H);
    // A see-through shell of compressed air.
    shell.region(cx - R, cy - R, cx + R, cy + R, (x, y) => {
      const r = Math.hypot(x - cx, y - cy) / R;
      if (r > 1) return 0;
      return r > 0.82 ? 0.55 : 0.3 + 0.1 * Math.sin(Math.atan2(y - cy, x - cx) * 3 + r * 8 - t * TAU);
    });
    // Orbit rings at three tilts, split into the halves behind and in front of the core.
    const rings: [number, number, number][] = [[R * 0.92, R * 0.34, -0.45], [R * 0.92, R * 0.3, 0.6], [R * 0.4, R * 0.95, 0.15]];
    rings.forEach(([rx, ry, rot], k) => {
      const a0 = t * TAU + k * 2.1;
      for (let j = 0; j < 3; j++) {
        const a = a0 + j * (TAU / 3);
        const pts = arc(cx, cy, rx, ry, a, a + 1.4, 12, rot);
        const mid = a + 0.7;
        gust(Math.sin(mid) > 0 ? front : back, pts, 1.8, Math.sin(mid) > 0 ? 0.95 : 0.6);
      }
    });
    core.disc(cx, cy, 7.5, 1, 1.6);
    const c = stack(W, H, air(shell, { lo: 3, hi: 4, alpha: [140, 70, 80, 75, 150, 200, 230] }), air(back, { hi: 4 }), air(core), air(front));
    const lv = new Canvas(W, H);
    for (let k = 0; k < 3; k++) {
      const a = t * TAU + k * (TAU / 3);
      leaf(lv, cx + Math.cos(a) * (R + 5), cy + Math.sin(a) * (R * 0.4 + 2), 7, a + Math.PI / 2, a * 2);
    }
    const out = stack(W, H, c, lv);
    streaks(out, [[cx - R - 2, cy - 8, 10], [cx - R - 4, cy + 7, 8]]);
    return out;
  });
  return flySprite('sphere', 'Wind sphere (compressed air ball)', fr);
}

// --- slash: twin crescent air blades --------------------------------------------------------

/** A sharp crescent blade: white leading edge, mint body, fading out along the trailing edge. */
function blade(f: Field, cx: number, cy: number, R: number, thick: number, span: number): void {
  f.region(cx - R - 2, cy - R - 2, cx + R + 2, cy + R + 2, (x, y) => {
    const dx = x - cx, dy = y - cy;
    const a = Math.atan2(dy, dx);
    if (Math.abs(a) > span) return 0;
    const taper = Math.pow(Math.cos((a / span) * Math.PI * 0.5), 0.8);
    const r = Math.hypot(dx, dy);
    const inner = R - thick * taper;
    if (r > R || r < inner) return 0;
    const u = (r - inner) / Math.max(0.5, R - inner);
    return 0.25 + 0.8 * Math.pow(u, 1.4);
  });
}
function slash(): WorldSprite {
  const W = 64, H = 64;
  const fr = frames(4, (t) => {
    const a = new Field(W, H), b = new Field(W, H);
    const wob = Math.sin(t * TAU) * 0.6;
    blade(b, 14, 30, 30 + wob, 7, 1.0);
    blade(a, 22, 34, 34, 10, 1.05);
    const c = stack(W, H, air(b, { rim: [1] }), air(a, { rim: [1] }));
    // Speed streaks off the trailing edges.
    const list: [number, number, number][] = [];
    for (let k = 0; k < 7; k++) {
      const yy = 8 + k * 8 + (k % 2 ? 2 : 0);
      const p = fract(t + k * 0.29);
      list.push([30 - Math.abs(yy - 34) * 0.5 - p * 6, yy, 10 + (k % 3) * 4]);
    }
    streaks(c, list);
    return c;
  });
  return flySprite('slash', 'Wind slash (twin crescent blades)', fr);
}

// --- multi: spinning leaf blades in a staggered fan -----------------------------------------

function multi(): WorldSprite {
  const W = 64, H = 64;
  const leaves = [
    { a: -0.38, d: 44 },
    { a: -0.12, d: 52 },
    { a: 0.14, d: 38 },
    { a: 0.4, d: 46 },
  ].map((s) => ({ ...s, x: Math.cos(s.a) * s.d + 4, y: 32 + Math.sin(s.a) * s.d }));
  const fr = frames(4, (t) => {
    const tr = new Field(W, H);
    const lv = new Canvas(W, H);
    leaves.forEach((s, k) => {
      // A curling wind trail behind each leaf.
      const back = s.a + Math.PI;
      const pts: Pt[] = [];
      for (let j = 0; j <= 14; j++) {
        const u = j / 14;
        const d = 4 + u * 20;
        const wv = Math.sin(u * 9 - t * TAU + k) * 3 * u;
        pts.push([s.x + Math.cos(back) * d - Math.sin(back) * wv, s.y + Math.sin(back) * d + Math.cos(back) * wv]);
      }
      gust(tr, pts, 1.6, 0.7, 0.2);
      leaf(lv, s.x, s.y, 14, s.a + t * TAU + k, t * TAU * 2 + k * 1.3);
    });
    return stack(W, H, air(tr, { hi: 5 }), lv);
  });
  return flySprite('multi', 'Wind multi (leaf blades)', fr);
}

// --- hit: crossing cuts and a pressure ring -------------------------------------------------

function hit(): WorldSprite {
  const W = 64, H = 64, cx = 32, cy = 32;
  const fr = frames(6, (_, i) => {
    const f = new Field(W, H), ring = new Field(W, H);
    const cut = (a: number, len: number, w: number, heat: number) => {
      const dx = Math.cos(a), dy = Math.sin(a);
      gust(f, [[cx - dx * len, cy - dy * len], [cx + dx * len * 0.1 - dy * 3, cy + dy * len * 0.1 + dx * 3], [cx + dx * len, cy + dy * len]], w, heat);
    };
    const L = [16, 24, 28, 26, 18, 0][i], wC = [2.6, 3.4, 3, 2.2, 1.4, 0][i];
    if (L) {
      cut(-0.7, L, wC, 1);
      if (i >= 1) cut(0.75, L * 0.92, wC * 0.9, 0.95);
      if (i >= 2 && i <= 3) cut(0.05, L * 0.7, wC * 0.6, 0.8);
    }
    if (i === 0) f.disc(cx, cy, 8, 1, 1.5);
    const rk = [0, 8, 14, 20, 25, 29][i];
    if (rk) ring.region(0, 0, W - 1, H - 1, (x, y) => (Math.abs(Math.hypot(x - cx, y - cy) - rk) < 1.2 ? 0.75 - i * 0.08 : 0));
    const c = stack(W, H, air(ring, { lo: 3, hi: 5 }), air(f));
    const lv = new Canvas(W, H);
    if (i >= 2) {
      const p = (i - 1) / 4;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + 0.4;
        leaf(lv, cx + Math.cos(a) * (8 + p * 22), cy + Math.sin(a) * (8 + p * 22) + p * p * 6, 7, a + p * 6, p * 9 + k);
      }
    }
    return stack(W, H, c, lv);
  });
  return vfxSprite('hit', 'Wind hit (cutting burst)', [32, 32], { hit: { frames: fr, fps: 12, loop: false } });
}

// --- blast: a tornado 3 m across ------------------------------------------------------------

function blast(): WorldSprite {
  const W = 176, H = 128, cx = 88, gy = 72, RX = 82, RY = 54;
  const fr = frames(8, (_, i) => {
    const back = new Field(W, H), front = new Field(W, H), dust = new Field(W, H), dustF = new Field(W, H);
    const grow = [0.15, 0.4, 0.7, 0.92, 1, 1, 0.85, 0.4][i];
    const spin = i * 0.9;
    const topY = lerp(gy - 10, 12, grow);
    // The funnel: stacked rings of wind strokes, narrow at the ground, wide at the top.
    const nR = 13;
    for (let k = 0; k < nR; k++) {
      const u = k / (nR - 1);
      const y = lerp(gy - 2, topY, u);
      if (y < 2) continue;
      const rx = lerp(7, 40, Math.pow(u, 1.5)) * (0.6 + 0.4 * grow) + Math.sin(u * 5 + i) * 2;
      const ry = rx * 0.22 + 1;
      const sway = Math.sin(u * 3 + i * 0.7) * 4 * u;
      for (let j = 0; j < 2; j++) {
        const a0 = spin + u * 3 + j * Math.PI;
        const pts = arc(cx + sway, y, rx, ry, a0, a0 + 2.2, 16);
        const mid = a0 + 1.1;
        gust(Math.sin(mid) > 0 ? front : back, pts, lerp(1.8, 3.2, u), Math.sin(mid) > 0 ? lerp(0.95, 0.8, u) : 0.6);
      }
    }
    // Dust swirling over the ground ellipse.
    const dk = [0.25, 0.5, 0.75, 0.95, 1, 1, 1, 0.85][i];
    for (let j = 0; j < 5; j++) {
      const a0 = spin * 0.7 + j * (TAU / 5);
      const pts = arc(cx, gy, RX * dk * (0.75 + 0.05 * j), RY * dk * (0.75 + 0.05 * j), a0, a0 + 1.1, 16);
      gust(Math.sin(a0 + 0.55) > 0 ? dustF : dust, pts, 1.8, 0.6);
    }
    // Dust puffs kicked up along the ring.
    for (let j = 0; j < 10; j++) {
      const a = spin * 0.5 + j * (TAU / 10);
      const x = cx + Math.cos(a) * RX * dk * 0.85, y = gy + Math.sin(a) * RY * dk * 0.85;
      (Math.sin(a) > 0 ? dustF : dust).disc(x, y - 2, rr(327, j + i, 4, 7) * dk, 0.5, 2);
    }
    const dustPal: Color[] = palette('#2a2418', '#5a4a34', '#7d6a4c', '#a08a68', '#c4b08c', '#e0d0b0', '#f4ead8');
    const dustL = (f: Field) => render(f, dustPal, { th: TH, alpha: [120, 90, 110, 130, 150, 170, 190], rim: [1] });
    const c = stack(W, H, dustL(dust), air(back, { hi: 4 }), air(front), dustL(dustF));
    // Debris: leaves and pebbles orbiting up the funnel.
    const lv = new Canvas(W, H);
    if (i >= 1 && i <= 6)
      for (let k = 0; k < 8; k++) {
        const u = fract(k / 8 + i * 0.07);
        const y = lerp(gy - 6, topY + 8, u);
        const a = spin * 1.3 + k * 2.4;
        const rx = lerp(10, 40, Math.pow(u, 1.5)) * (0.6 + 0.4 * grow) + 6;
        const x = cx + Math.cos(a) * rx, yy = y + Math.sin(a) * rx * 0.22;
        if (k % 3 === 2) {
          lv.set(Math.round(x), Math.round(yy), dustPal[3]);
          lv.set(Math.round(x) + 1, Math.round(yy), dustPal[2]);
          lv.set(Math.round(x), Math.round(yy) + 1, dustPal[1]);
        } else leaf(lv, x, yy, 7, a, a * 2);
      }
    outlineIn(lv, dustPal[0], { minAlpha: 200 });
    return stack(W, H, c, lv);
  });
  return vfxSprite('blast', 'Wind blast (tornado, 3 m)', [cx, gy], { blast: { frames: fr, fps: 12, loop: false } });
}

// --- wall: a curtain of rising wind 4.5 m long ----------------------------------------------

function wallFrame(t: number, g: number, W: number, H: number, gy: number): Canvas {
  const veil = new Field(W, H), sw = new Field(W, H), sl = new Field(W, H), dust = new Field(W, H);
  const hgt = 100 * g;
  const topAt = (x: number) => gy - hgt * Math.pow(Math.sin(((x - 4) / (W - 8)) * Math.PI), 0.3) * (0.92 + 0.08 * Math.sin(x * 0.05 + t * TAU));
  // A faint veil of moving air so the wall reads as one body.
  veil.region(4, 0, W - 5, gy, (x, y) => (y > topAt(x) && hgt > 6 ? 0.2 + 0.08 * Math.sin((y + t * 40) * 0.3 + x * 0.05) : 0));
  // Rows of swirling arcs climbing the wall: the air turns as it rises.
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const q = fract(r / rows + t * 0.5);
    for (let k = 0; k < 6; k++) {
      const x = 22 + ((k + (r % 2) * 0.5 + fract(t)) / 6) * (W - 44);
      const y = gy - 6 - q * (gy - topAt(x) - 4);
      if (y < topAt(x) + 2 || hgt < 14) continue;
      const a0 = t * TAU + k + r * 1.3;
      gust(sw, arc(x, y, 18 + (k % 2) * 6, 5 + (r % 2), a0, a0 + 2.6, 16), lerp(1.8, 1.3, q), lerp(0.95, 0.7, q));
    }
  }
  // Slanting streaks racing up the wall.
  for (let k = 0; k < 18; k++) {
    const x0 = 12 + (k / 17) * (W - 24);
    const p = fract(t + rr(321, k, 0, 1));
    const yb = gy - p * hgt * 0.7;
    const len = 22 * g;
    if (len < 4 || yb - len * 0.9 < topAt(x0)) continue;
    gust(sl, [[x0, yb], [x0 + len * 0.25, yb - len * 0.5], [x0 + len * 0.4, yb - len]], 1.2, 0.85, 0.8);
  }
  // Wisps curling off the top edge.
  for (let k = 0; k < 9; k++) {
    const x = 18 + ((k + fract(t * 2) * 0.5) / 9) * (W - 36);
    const y = topAt(x);
    if (hgt < 14) continue;
    gust(sw, arc(x, y + 4, 5, 5, Math.PI * 0.9 + t * TAU, Math.PI * 2.4 + t * TAU, 12), 1.4, 0.9);
  }
  // A skirt of dust at the base.
  for (let k = 0; k < 30; k++) {
    const x = 8 + (k / 29) * (W - 16);
    if (Math.abs(x - W / 2) > (W / 2) * Math.min(1, g * 1.5)) continue;
    dust.ell(x + Math.sin(t * TAU + k) * 2, gy - 3 + rr(324, k, -2, 1), rr(325, k, 8, 13), rr(326, k, 3.5, 6), 0, 0.6, 2);
  }
  const dustPal: Color[] = palette('#2a2418', '#5a4a34', '#7d6a4c', '#a08a68', '#c4b08c', '#e0d0b0', '#f4ead8');
  const c = stack(W, H,
    render(veil, WIND, { th: TH, lo: 2, hi: 3, outline: false, alpha: [0, 0, 38, 50, 0, 0, 0] }),
    render(dust, dustPal, { th: TH, alpha: [110, 80, 100, 120, 140, 160, 180], rim: [1] }),
    air(sl, { hi: 5 }), air(sw));
  const lv = new Canvas(W, H);
  for (let k = 0; k < 8; k++) {
    const p = fract(k / 8 + t);
    const x = rr(323, k, 20, W - 20);
    if (Math.abs(x - W / 2) > (W / 2) * Math.min(1, g * 1.5) || gy - 8 - p * hgt < topAt(x)) continue;
    leaf(lv, x + Math.sin(p * 6 + k) * 6, gy - 8 - p * hgt, 8, p * 8 + k, p * TAU * 2 + k);
  }
  return stack(W, H, c, lv);
}
function wall(): WorldSprite {
  const W = 264, H = 120, gy = 112;
  const idle = frames(4, (t) => wallFrame(t, 1, W, H, gy));
  const rise = frames(6, (_, i) => wallFrame(i / 6, [0.1, 0.3, 0.55, 0.82, 1.06, 1][i], W, H, gy));
  return vfxSprite('wall', 'Wind wall (4.5 m x 1.8 m)', [W / 2, gy], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 12, loop: true } });
}

// --- aura: wind spiralling up around the body -----------------------------------------------
//
// Built like the fire aura (an open teardrop around the body) out of wind: crescent strokes
// climb and curl around the outline, leaves and white streaks ride them.

function aura(): WorldSprite {
  const W = 80, H = 120, cx = 40, gy = 112, top = 6;
  const outerW = (y: number) => 30 * Math.pow(1 - Math.pow(clamp((gy - y) / (gy - top), 0, 1), 2.6), 0.5);
  const fr = frames(6, (t) => {
    const veil = new Field(W, H), back = new Field(W, H), front = new Field(W, H), ring = new Field(W, H), ringF = new Field(W, H);
    // A faint veil of moving air so the shape reads.
    veil.fill((x, y) => {
      if (y > gy - 2) return 0;
      const dx = Math.abs(x - cx), wO = outerW(y), wI = wO - 8;
      return dx < wO && dx > wI && wO > 8 ? 0.4 : 0;
    });
    // Strokes climbing each side at uneven lengths, curling toward the head as they rise.
    for (let side = -1; side <= 1; side += 2)
      for (let k = 0; k < 7; k++) {
        const p = fract(k / 7 + t + (side > 0 ? 1 / 14 : 0));
        const y0 = gy - 4 - p * 86;
        const len = 14 + 14 * rr(331, k + (side > 0 ? 7 : 0), 0, 1);
        const pts: Pt[] = [];
        for (let j = 0; j <= 10; j++) {
          const u = j / 10;
          const y = y0 - u * len;
          const w = outerW(y) - 2 - u * 2 - rr(332, k, 0, 3);
          pts.push([cx + side * (w + Math.sin(u * Math.PI) * 3), y]);
        }
        gust(k % 2 ? front : back, pts, lerp(2.2, 1.4, p), lerp(1, 0.72, p), 0.75);
      }
    // Rings of wind rising around the body: only their ends show at the sides, wrapping round.
    for (let k = 0; k < 4; k++) {
      const q = fract(k / 4 + t);
      const y = gy - 10 - q * 82;
      const rx = outerW(y) - 1, ry = 4;
      if (rx < 8) continue;
      const fade = Math.sin(q * Math.PI);
      for (const [a0, a1] of [[0.05, 0.62], [Math.PI - 0.62, Math.PI - 0.05]]) gust(front, arc(cx, y, rx, ry, a0, a1, 10), 1.6 * fade + 0.4, 0.95);
      for (const [a0, a1] of [[-0.9, -0.1], [-Math.PI + 0.1, -Math.PI + 0.9]]) gust(back, arc(cx, y, rx, ry, a0, a1, 10), 1.2 * fade + 0.3, 0.6);
    }
    // A crest swirl over the head.
    gust(front, arc(cx, top + 10, 12, 5, Math.PI, Math.PI * 2, 14), 1.8, 0.85);
    // Gust rings at the feet.
    for (let k = 0; k < 2; k++) {
      const q = fract(k / 2 + t);
      const rx = 18 + q * 16, ry = 4 + q * 4;
      const a0 = t * TAU + k * 2;
      gust(ringF, arc(cx, gy, rx, ry, a0, a0 + 2.4, 18).filter(([, y]) => y >= gy - 0.5), 1.8, 0.8 - q * 0.3);
      gust(ring, arc(cx, gy, rx, ry, a0 + Math.PI, a0 + Math.PI + 2.4, 18).filter(([, y]) => y < gy), 1.6, 0.6 - q * 0.2);
    }
    const c = stack(W, H, render(veil, WIND, { th: TH, lo: 3, hi: 3, outline: false, alpha: [0, 0, 0, 55, 0, 0, 0] }), air(ring, { hi: 4 }), air(back, { hi: 5 }), air(front), air(ringF));
    const lv = new Canvas(W, H);
    for (let k = 0; k < 4; k++) {
      const p = fract(k / 4 + t);
      const side = k % 2 ? 1 : -1;
      const y = gy - 10 - p * 90;
      leaf(lv, cx + side * (outerW(y) + 2) + Math.sin(p * 8) * 2, y, 6, p * 9 + k, p * TAU * 2 + k);
    }
    const out = stack(W, H, c, lv);
    const list: [number, number, number][] = [];
    for (let k = 0; k < 4; k++) {
      const p = fract(k / 4 + t * 2);
      const side = k % 2 ? 1 : -1;
      const y = gy - 20 - ((k * 23) % 70);
      list.push([cx + side * (outerW(y) + 6) + (side > 0 ? 8 : 0), y - p * 4, 6]);
    }
    streaks(out, list);
    return out;
  });
  return vfxSprite('aura', 'Wind aura (charge / buff)', [cx, gy], { idle: { frames: fr, fps: 12, loop: true } });
}

export function windSprites(): WorldSprite[] {
  return [bolt(), beast(), ...stream(), breath(), sphere(), slash(), multi(), hit(), blast(), wall(), aura()];
}

void smooth;
void pnoise;
