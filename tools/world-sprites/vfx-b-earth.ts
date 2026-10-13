// Earth jutsu effects: tumbling rocks, a stone serpent, spike rows erupting from cracked ground,
// gravel blasts, a mossy boulder, a stone crescent, rock bullets, rubble bursts, a stacked-rock
// wall and a dust whirlwind with levitating stones.
// Palette: dark brown, umber, ochre, tan, sand, pale sand, with moss-green accents.

import { Anim, Canvas, WorldSprite, lambert } from './kit';
import { L, Pt, Puff, TAU, chip, clamp, facetRock, fract, gasLayer, lerp, pal, pnoise, polar, puffs, rnd, rockPts, rot, smooth } from './vfx-b-lib';

/** 0 outline, 1 dark brown, 2 umber, 3 brown ochre, 4 ochre, 5 tan ochre, 6 tan, 7 sand, 8 pale sand. */
export const E = pal('#26140a', '#4a2812', '#6e3e1a', '#95561e', '#b8701f', '#d48c34', '#e8ad55', '#f6d184', '#fff3cf');
/** Moss accent: 0 outline .. 6 light. */
export const MOSS = pal('#132009', '#24400f', '#3a6018', '#588420', '#7ca82c', '#a6cc4c', '#d4ec90');

/** Frames in every projectile loop. */
const N = 6;
const loop = (frames: Canvas[], fps = 12): Anim => ({ frames, fps, loop: true });
const once = (frames: Canvas[], fps = 12): Anim => ({ frames, fps, loop: false });
const sprite = (name: string, label: string, anchor: [number, number], anims: Record<string, Anim>): WorldSprite => {
  const f0 = Object.values(anims)[0].frames[0];
  return { name, label, meters: [+(f0.w / 57).toFixed(2), +(f0.h / 57).toFixed(2)], anchor, tags: ['vfx'], anims };
};
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

// --- building blocks ------------------------------------------------------------------------

const FACETS = [1, 2, 3, 4, 5, 6, 7];

interface StoneOpts {
  n?: number;
  sx?: number;
  sy?: number;
  rough?: number;
  /** Moss cap size (0 none, 1 about the top quarter). */
  moss?: number;
  cracks?: number;
  bias?: number;
}

/** Moss ramp step over an earth ramp step. */
const mossOver = (i: number): number => (i >= 7 ? 5 : i >= 5 ? 4 : i >= 3 ? 3 : i === 2 ? 2 : 1);
const noise2 = (x: number, y: number, seed: number): number => pnoise(x, y, 2, 64, seed + 77);

/** A faceted stone with its own outline, a lit rim, pits, cracks and a ragged moss cap. */
function stone(c: Canvas, cx: number, cy: number, r: number, seed: number, spin = 0, o: StoneOpts = {}): L {
  const l = new L(c.w, c.h);
  const pts = rockPts(cx, cy, r, o.n ?? 8, seed, spin, o.sx ?? 1, o.sy ?? 1, o.rough ?? 0.34);
  const apex = rot([cx + r * 0.08, cy - r * 0.16], spin, [cx, cy]);
  facetRock(l, pts, apex, r * 0.95, FACETS, o.bias ?? 0, { ring: r >= 4.5 ? 0.55 : 0, jitter: 0.22, seed });
  l.bevel({ lit: 1, shade: 0, max: 7 });
  for (let k = 0; k < (o.cracks ?? (r >= 7 ? 1 : 0)); k++) {
    const a0 = rnd(seed, k, 20) * TAU;
    const path: Pt[] = [];
    let p: Pt = [Math.cos(a0) * r * 0.95, Math.sin(a0) * r * 0.95];
    for (let s = 0; s < 4; s++) {
      path.push(rot([cx + p[0], cy + p[1]], spin, [cx, cy]));
      const toC = Math.atan2(-p[1], -p[0]) + (rnd(seed, k, 21 + s) - 0.5) * 1.4;
      p = [p[0] + Math.cos(toC) * r * 0.22, p[1] + Math.sin(toC) * r * 0.22];
    }
    l.path(path, (x, y) => (l.get(x, y) >= 0 && l.get(x - 1, y) >= 0 ? 1 : null));
    l.path(path.map(([x, y]) => [x, y + 1] as Pt), (x, y) => (l.get(x, y) >= 3 && l.get(x, y - 1) === 1 ? Math.min(7, l.get(x, y) + 2) : null));
  }
  if (r >= 9)
    for (let k = 0; k < Math.round(r / 3); k++) {
      const p = rot([cx + (rnd(seed, k, 30) - 0.5) * r * 1.1, cy + (rnd(seed, k, 31) - 0.5) * r * 1.1], spin, [cx, cy]);
      if (l.get(Math.floor(p[0]), Math.floor(p[1])) >= 3) {
        l.set(p[0], p[1], 2);
        l.set(p[0] + 1, p[1] + 1, Math.min(7, l.get(Math.floor(p[0]) + 1, Math.floor(p[1]) + 1) + 1));
      }
    }
  l.render(c, E);
  if (o.moss) {
    const ml = new L(c.w, c.h);
    const k = o.moss;
    ml.fill((x, y) => {
      if (l.get(x, y) < 1) return false;
      const q = rot([x + 0.5, y + 0.5], -spin, [cx, cy]);
      const lx = (q[0] - cx) / r, ly = (q[1] - cy) / r;
      return ly < -1 + 0.5 * k + (noise2(x, y, seed) - 0.5) * 0.36 - lx * lx * 0.25;
    }, (x, y) => mossOver(l.get(x, y)));
    ml.clean();
    ml.render(c, MOSS, { outline: null });
  }
  return l;
}

/** Dust lobes (pale sand caps, tan bodies, ochre shade) with a dark brown outline. */
function dust(c: Canvas, list: Puff[], o: { seed?: number; alpha?: number; steps?: number[]; wrapX?: boolean; rim?: number } = {}): void {
  const l = new L(c.w, c.h);
  puffs(l, list, { steps: o.steps ?? [3, 4, 5, 6, 7, 8], rim: o.rim ?? 2, seed: o.seed ?? 3, wobble: 0.4, wrapX: o.wrapX });
  l.clean(1, o.wrapX);
  l.render(c, E, { outline: E[1], alpha: o.alpha, outlineAlpha: o.alpha, wrapX: o.wrapX });
}
/** A churning dust volume (see gasLayer) in sand and umber. */
function dustGas(c: Canvas, density: (x: number, y: number) => number, t: number, o: { seed?: number; alpha?: number; steps?: number[]; thr?: number; scale?: number } = {}): void {
  const l = gasLayer(c.w, c.h, density, t, { seed: o.seed, thr: o.thr ?? 0.5, base: 0.05, amp: 1.45, scale: o.scale ?? 0.5, steps: o.steps ?? [2, 3, 4, 5, 6, 7, 8] });
  l.render(c, E, { outline: E[1], alpha: o.alpha, outlineAlpha: o.alpha });
}
/** Max over elliptical lobes [dx, dy, rx, ry] around (cx, cy) of a soft-edged density. */
const lobes = (cx: number, cy: number, list: [number, number, number, number][], x: number, y: number): number => {
  let d = 0;
  for (const [dx, dy, rx, ry] of list) d = Math.max(d, 1 - smooth(0.55, 1.05, Math.hypot((x + 0.5 - cx - dx) / rx, (y + 0.5 - cy - dy) / ry)));
  return d;
};
/** Dust steps by age (0 fresh, 1 old). */
const dustAge = (k: number): number[] => (k < 0.3 ? [3, 4, 5, 6, 7, 8] : k < 0.65 ? [2, 3, 4, 5, 6, 7] : [2, 3, 4, 5]);

/** A stone spike rising from the ground line gy: lit left face, shaded right face, crest and cracks. */
function spike(c: Canvas, x: number, gy: number, h: number, bw: number, lean: number, seed: number, o: { broken?: boolean; wrap?: boolean } = {}): void {
  if (h < 2) return;
  const l = new L(c.w, c.h);
  for (const ox of o.wrap ? [-c.w, 0, c.w] : [0]) {
    const X = x + ox;
    const tip: Pt = [X + lean, gy - h];
    const bl: Pt = [X - bw / 2, gy + 1], br: Pt = [X + bw / 2, gy + 1], bm: Pt = [X + bw * 0.12 + lean * 0.2, gy + 1];
    const ml: Pt = [X - bw * 0.34 + lean * 0.45, gy - h * 0.42];
    const mr: Pt = [X + bw * 0.3 + lean * 0.55, gy - h * 0.48];
    let topL: Pt[] = [tip], topR: Pt[] = [tip];
    if (o.broken) {
      const k = 0.7;
      const a: Pt = [lerp(ml[0], tip[0], 0.6), gy - h * (k - 0.08)], m: Pt = [lerp(bm[0], tip[0], k) + 1, gy - h * (k + 0.02)], b: Pt = [lerp(mr[0], tip[0], 0.5), gy - h * (k - 0.14)];
      topL = [a, m];
      topR = [m, b];
    }
    const crest = topL[topL.length - 1];
    l.poly([bl, ml, ...topL, bm], (xx, yy) => ((gy - yy) / h > 0.62 ? 7 : (gy - yy) / h > 0.25 ? 6 : 5));
    l.poly([bm, ...topR, mr, br], (xx, yy) => ((gy - yy) / h > 0.66 ? 4 : (gy - yy) / h > 0.3 ? 3 : 2));
    l.line(crest[0], crest[1], bm[0], bm[1], (xx, yy) => ((gy - yy) / h > 0.5 ? 8 : (gy - yy) / h > 0.2 ? 7 : 4));
    if (o.broken) l.path(topR, 1);
    for (let k = 0; k < 2; k++) {
      const yy = gy - h * (0.22 + 0.3 * k + rnd(seed, k) * 0.08);
      const t = (gy - yy) / h;
      const xa = lerp(bm[0], tip[0], t) + 1, xb = xa + 2 + rnd(seed, k, 3) * 3;
      l.line(xa, yy, xb, yy + 1, (xx, y2) => (l.get(xx, y2) >= 0 ? 1 : null));
      const xc = lerp(bl[0], tip[0], t) + 2;
      l.line(xc, yy - 1, xc + 2, yy, (xx, y2) => (l.get(xx, y2) >= 5 ? 4 : null));
    }
  }
  l.erase((xx, yy) => yy > gy + 1);
  l.render(c, E, { wrapX: o.wrap });
}

/** Ground rubble band along gy (tileable when wrap): low faceted rocks. */
function rubble(c: Canvas, x0: number, x1: number, gy: number, seed: number, o: { wrap?: boolean; count?: number } = {}): void {
  const n = o.count ?? Math.round((x1 - x0) / 7);
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.5 + (rnd(seed, i) - 0.5) * 0.6) / n) * (x1 - x0);
    const r = 2.8 + rnd(seed, i, 1) * 2.4;
    for (const ox of o.wrap ? [-c.w, 0, c.w] : [0]) stone(c, x + ox, gy + 1 + rnd(seed, i, 2) * 2, r, seed * 13 + i, rnd(seed, i, 4) * TAU, { n: 6, sy: 0.72, rough: 0.4 });
  }
}

/** Grit chips (own outline). */
function grit(c: Canvas, pts: [number, number, number][]): void {
  const l = new L(c.w, c.h);
  pts.forEach(([x, y, s], i) => chip(l, x, y, s, i, [3, 5, 7]));
  l.render(c, E);
}

/** Speed streaks: [x tail, x head, y]. */
function streaks(c: Canvas, list: [number, number, number][]): void {
  const l = new L(c.w, c.h);
  for (const [a, b, y] of list) l.line(a, y, b, y, (x) => (x > (a + b) / 2 ? 8 : x > a + (b - a) * 0.2 ? 7 : 5));
  l.render(c, E, { outline: null });
}

// --- roles ----------------------------------------------------------------------------------

/** Bolt: a tumbling rock with a moss cap, dust lobes and pebbles streaming behind. */
function bolt(): WorldSprite {
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N, cx = 40, cy = 32;
    const list: Puff[] = [];
    for (let i = 5; i >= 0; i--) {
      const s = i + t;
      list.push({ x: cx - 10 - s * 6.4, y: cy + 1 + Math.sin(s * 1.6 + 0.5) * 2.2 - s * 0.3, r: Math.max(0, 5.8 - s * 0.85), steps: dustAge(s / 6) });
    }
    dust(c, list, { seed: 5 });
    streaks(c, [[0, cy - 12, 13], [1, cy + 11, 11], [2, cy - 8, 7], [3, cy + 15, 6]].map(([k, yy, len]) => {
      const x = cx - 13 - fract(t + k * 0.37) * 18;
      return [x - len, x, yy] as [number, number, number];
    }));
    grit(c, range(7).map((i) => {
      const ph = fract(rnd(11, i) + t);
      return [cx - 10 - ph * 34, cy - 9 + rnd(12, i) * 18 + ph * 3, rnd(13, i) < 0.45 ? 3 : 2];
    }));
    stone(c, cx, cy, 11.5, 21, (f * TAU) / N, { n: 7, rough: 0.42, moss: 1, cracks: 1 });
    return c;
  });
  return sprite('bolt', 'Earth bolt: tumbling rock', [32, 32], { fly: loop(frames) });
}

/** Rock bullets: three pointed stone darts in a staggered fan, each with a dust tail. */
function multi(): WorldSprite {
  const darts: [number, number, number, number][] = [
    [35, 16, -0.2, 0.82],
    [47, 32, 0, 1],
    [33, 48, 0.2, 0.82],
  ];
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    for (const [k, [x, y, a, s]] of darts.entries()) {
      const list: Puff[] = [];
      for (let i = 3; i >= 0; i--) {
        const q = i + fract(t + k * 0.3);
        const p = rot([x - 9 * s - q * 4.8, y], a, [x, y]);
        list.push({ x: p[0], y: p[1], r: Math.max(0, (4 - q * 0.9) * s), steps: dustAge(q / 4) });
      }
      dust(c, list, { seed: 9 + k });
      const sl: [number, number, number][] = [];
      for (const [j, dy] of [[0, -5], [1, 4]] as [number, number][]) {
        const ph = fract(t * 2 + k * 0.4 + j * 0.5);
        const p0 = rot([x - 12 - ph * 12, y + dy * s], a, [x, y]);
        sl.push([p0[0] - 9, p0[0], Math.round(p0[1])]);
      }
      streaks(c, sl);
    }
    for (const [k, [x, y, a, s]] of darts.entries()) {
      const l = new L(64, 64);
      const len = 21 * s, wid = 8.5 * s;
      const P = (px: number, py: number): Pt => rot([x + px, y + py], a, [x, y]);
      const pts: Pt[] = [P(len * 0.66, 0), P(len * 0.24, -wid * 0.42), P(-len * 0.14, -wid / 2), P(-len * 0.4, -wid * 0.22), P(-len * 0.36, wid * 0.3), P(-len * 0.08, wid / 2), P(len * 0.28, wid * 0.34)];
      const roll = Math.sin(((f + k) * TAU) / N) * wid * 0.07;
      facetRock(l, pts, P(len * 0.1, -wid * 0.06 + roll), wid * 0.75, FACETS, 0, { ring: 0.5, jitter: 0.2, seed: 30 + k });
      l.bevel({ lit: 1, shade: 0, max: 7 });
      const e0 = P(len * 0.62, 0), e1 = P(len * 0.22, -wid * 0.36);
      l.line(e0[0], e0[1], e1[0], e1[1], (xx, yy) => (l.get(xx, yy) >= 0 ? 8 : null));
      l.render(c, E);
    }
    return c;
  });
  return sprite('multi', 'Earth multi: rock bullets', [32, 32], { fly: loop(frames) });
}

/** Sphere: a big mossy boulder rolling forward, dust lobes and grit behind. */
function sphere(): WorldSprite {
  const R = 16.5, cx = 37, cy = 31;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N, spin = (f * TAU) / N;
    const list: Puff[] = [];
    for (let i = 5; i >= 0; i--) {
      const s = i + t;
      list.push({ x: cx - 16 - s * 5.4, y: cy + 5 + Math.sin(s * 1.5) * 2 - s * 0.7, r: Math.max(0, 8 - s * 1.2), steps: dustAge(s / 6) });
    }
    dust(c, list, { seed: 17 });
    streaks(c, [[0, cy - 15, 12], [1, cy + 16, 10], [2, cy - 10, 8]].map(([k, yy, len]) => {
      const x = cx - 19 - fract(t + k * 0.41) * 14;
      return [x - len, x, yy] as [number, number, number];
    }));
    stone(c, cx, cy, R, 207, spin, { n: 12, rough: 0.22, moss: 1.05, cracks: 3 });
    grit(c, range(7).map((i) => {
      const ph = fract(rnd(31, i) + t);
      return [cx - 12 - ph * 30, cy + 9 + rnd(32, i) * 8 + ph * ph * 10, rnd(33, i) < 0.4 ? 3 : 2];
    }));
    return c;
  });
  return sprite('sphere', 'Earth sphere: rolling boulder', [32, 32], { fly: loop(frames) });
}

/** Slash: a crescent blade of stone, a bright cutting edge, broken teeth and sand arcs behind. */
function slash(): WorldSprite {
  const ox = 18, oy = 32, R = 26, ix = 8, Ri = 25;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    const arcs = new L(64, 64);
    for (let j = 0; j < 3; j++) {
      const rr = R - 5 - j * 3.5, ax = ox - 4 - j * 4.5;
      const span = 1.3 - j * 0.22;
      for (let a = -span; a <= span; a += 0.01) {
        if (fract(a * 2.6 + t + j * 0.37) > 0.72) continue;
        const p = polar(ax, oy, rr, a);
        arcs.set(p[0], p[1], Math.abs(a) < span * 0.5 ? 8 : 7);
      }
    }
    arcs.render(c, E, { outline: null });
    for (const sgn of [-1, 1]) {
      const list: Puff[] = [];
      for (let i = 2; i >= 0; i--) {
        const q = i + t;
        const p = polar(ox - 4 - q * 5, oy, R - 1.5, sgn * (1.72 - q * 0.04));
        list.push({ x: p[0], y: p[1], r: Math.max(0, 2.8 - q * 0.8), steps: dustAge(0.4 + q / 4) });
      }
      dust(c, list, { seed: 40 + sgn });
    }
    const l = new L(64, 64);
    const SEG = 0.3;
    l.fill((x, y) => {
      const dO = R - Math.hypot(x + 0.5 - ox, y + 0.5 - oy);
      const dI = Math.hypot(x + 0.5 - ix, y + 0.5 - oy) - Ri;
      return dO > 0 && dI > 0;
    }, (x, y) => {
      const px = x + 0.5, py = y + 0.5;
      const a = Math.atan2(py - oy, px - ox);
      const dO = R - Math.hypot(px - ox, py - oy);
      const dI = Math.hypot(px - ix, py - oy) - Ri;
      const rho = dI / (dI + dO);
      const seg = Math.floor((a + 2) / SEG);
      const tilt = (rnd(44, seg) - 0.5) * 0.7;
      const ca = Math.cos(a), sa = Math.sin(a);
      const n: [number, number, number] = rho > 0.55 ? [ca * 0.7, sa * 0.7 + tilt, 0.7] : [-ca * 0.5, -sa * 0.5 + tilt, 0.85];
      const ln = Math.hypot(...n);
      const li = lambert(n[0] / ln, n[1] / ln, n[2] / ln, 0.12);
      if (dO < 1.2) return Math.abs(a) < 0.45 ? 8 : 7;
      if (fract((a + 2) / SEG) < 0.08 && rho < 0.8) return 1;
      return FACETS[clamp(Math.floor(li * 7), 0, 6)];
    });
    for (let k = 0; k < 7; k++) {
      const a = lerp(-1.25, 1.2, (k + 0.5) / 7) + (rnd(45, k) - 0.5) * 0.1;
      const p = polar(ix, oy, Ri + 0.5, a), q = polar(ix, oy, Ri - 3.5 - rnd(46, k) * 2, a + 0.1), s2 = polar(ix, oy, Ri + 0.5, a + 0.16);
      l.poly([p, q, s2], (x) => (x < q[0] + 1 ? 6 : 3));
    }
    l.render(c, E);
    const ml = new L(64, 64);
    for (const a of [-0.75, 0.3]) {
      const mp = polar(ox, oy, R - 4, a);
      ml.ellipse(mp[0], mp[1], 2.6, 2, (x, y) => (l.get(x, y) >= 1 ? mossOver(l.get(x, y)) : null));
    }
    ml.render(c, MOSS, { outline: null });
    grit(c, range(4).map((i) => {
      const ph = fract(rnd(47, i) + t);
      const p = polar(ix - ph * 14, oy, Ri - 2, lerp(-1, 1, rnd(48, i)));
      return [p[0], p[1] + ph * 3, 2];
    }));
    return c;
  });
  return sprite('slash', 'Earth slash: stone crescent', [32, 32], { fly: loop(frames) });
}

/** Beast: a great stone serpent of armor plates, jaws agape, moss on its back, rubble falling away. */
function beast(): WorldSprite {
  const W = 128, H = 96;
  const frames = range(N).map((f) => {
    const c = new Canvas(W, H), t = f / N, ph = f * (TAU / N);
    const spine = (s: number): Pt => {
      const amp = 10 * smooth(8, 36, s);
      return [89 - s, 49 + amp * Math.sin(s * 0.1 - ph) - smooth(40, 86, s) * 3];
    };
    const rad = (s: number): number => (s < 6 ? 12 : lerp(12.5, 2.4, clamp((s - 6) / 80, 0, 1) ** 0.85));
    const tail = spine(85);
    const list: Puff[] = [];
    for (let i = 3; i >= 0; i--) {
      const q = i + t;
      list.push({ x: tail[0] - 3 - q * 5, y: tail[1] + 2 + q * 0.6, r: Math.max(0, 5.5 - q * 1.3), steps: dustAge(q / 4) });
    }
    dust(c, list, { seed: 61 });
    // Body: a tube shaded as overlapping armor plates with a scaled belly.
    const S: { p: Pt; s: number; t: Pt }[] = [];
    for (let s = 0; s <= 86; s += 0.5) {
      const p = spine(s), q = spine(s - 0.5);
      const ln = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      S.push({ p, s, t: [(q[0] - p[0]) / ln, (q[1] - p[1]) / ln] });
    }
    const body = new L(W, H);
    const PL = 8;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < 96; x++) {
        let best = Infinity, bi = -1;
        for (let i = 0; i < S.length; i++) {
          const dx = x + 0.5 - S[i].p[0];
          if (Math.abs(dx) > 14) continue;
          const d = Math.hypot(dx, y + 0.5 - S[i].p[1]) - rad(S[i].s);
          if (d < best) {
            best = d;
            bi = i;
          }
        }
        if (best > 0 || bi < 0) continue;
        const { p, s, t: tg } = S[bi];
        const r = rad(s);
        const dx = x + 0.5 - p[0], dy = y + 0.5 - p[1];
        const nrm = clamp((dx * -tg[1] + dy * tg[0]) / r, -1, 1);
        const q = (s - 2) / PL;
        const ds = fract(q) - 0.5;
        const plate = Math.floor(q);
        let v: number;
        if (nrm > 0.5 && s > 2) {
          const sc = fract(s / 2.6);
          v = sc < 0.22 ? 2 : nrm > 0.85 ? 4 : sc > 0.7 ? 7 : 6;
        } else {
          const nx = -tg[1] * nrm * 0.85 + tg[0] * -ds * 0.9, ny = tg[0] * nrm * 0.85 + tg[1] * -ds * 0.9;
          const nz = Math.sqrt(Math.max(0.05, 1 - nrm * nrm));
          const ln = Math.hypot(nx, ny, nz);
          const li = lambert(nx / ln, ny / ln, nz / ln, 0.1) + (rnd(65, plate) - 0.5) * 0.14 + (pnoise(x, y, 2.5, 128, 66) - 0.5) * 0.12;
          v = FACETS[clamp(Math.floor(li * 7), 0, 6)];
          if (ds > 0.38 && s > 3) v = nrm < -0.3 ? 7 : 1;
          else if (ds > 0.3 && s > 3) v = Math.max(1, v - 2);
        }
        body.set(x, y, v);
      }
    for (let j = 0; j < 11; j++) {
      const s = 4 + j * PL + 2;
      const p = spine(s), r = rad(s);
      for (let k = 0; k < 2; k++) {
        const px = Math.round(p[0] + (rnd(67, j, k) - 0.5) * 4), py = Math.round(p[1] - r * (0.15 + rnd(68, j, k) * 0.4));
        if (body.get(px, py) >= 3) {
          body.set(px, py, 1);
          body.set(px + 1, py, 2);
          body.set(px, py + 1, Math.min(7, body.get(px, py + 1) + 1));
        }
      }
    }
    body.render(c, E);
    const fins = new L(W, H), ml = new L(W, H);
    for (let j = 0; j < 10; j++) {
      const s = 5 + j * PL;
      const p = spine(s), r = rad(s), q = spine(s + 1);
      const ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
      const b1 = rot([p[0] - r * 0.55, p[1] - r * 0.7], ang, p), b2 = rot([p[0] + r * 0.3, p[1] - r * 0.78], ang, p);
      const tip = rot([p[0] - r * 0.35, p[1] - r - 4.5 + j * 0.25], ang, p);
      fins.poly([b1, tip, b2], (x) => (x <= tip[0] ? 7 : x <= tip[0] + 2 ? 5 : 3));
      if (j % 2 === 0 && j < 8) {
        const mp = rot([p[0] + 1, p[1] - r * 0.7], ang, p);
        ml.ellipse(mp[0], mp[1], r * 0.5, 2, (x, y) => (body.get(x, y) >= 1 ? mossOver(body.get(x, y)) : null));
        for (let d = 0; d < 3 + (j % 3); d++) if (body.get(Math.round(mp[0] + 2), Math.round(mp[1] + 2 + d)) >= 1) ml.set(mp[0] + 2, mp[1] + 2 + d, d > 2 ? 2 : 3);
      }
    }
    fins.erase((x, y) => body.get(x, y) >= 0);
    fins.render(c, E);
    ml.render(c, MOSS, { outline: null });
    grit(c, range(10).map((i) => {
      const p0 = fract(rnd(62, i) + t);
      const s = 10 + rnd(63, i) * 66;
      const b = spine(s);
      return [b[0] - p0 * 9, b[1] + rad(s) + 2 + p0 * 22, rnd(64, i) < 0.4 ? 3 : 2];
    }));
    for (let i = 0; i < 2; i++) {
      const p0 = fract(rnd(69, i) + t);
      const b = spine(20 + i * 30);
      stone(c, b[0] - 6 - p0 * 14, b[1] + rad(20 + i * 30) + 4 + p0 * p0 * 18, 2.6, 70 + i, p0 * 4, { n: 5 });
    }
    // Head: the maw, fangs, the lower jaw, then the heavy horned skull on top.
    const mouth = new L(W, H);
    mouth.poly([[89, 46], [124, 42], [127, 51], [122, 64], [100, 59], [89, 54]], (x, y) => (x > 118 ? 3 : y > 54 ? 2 : 1));
    mouth.render(c, E);
    const glow = new L(W, H);
    glow.ellipse(97, 51, 5, 3, 3);
    glow.ellipse(96.5, 51, 2.5, 1.6, 5);
    glow.render(c, E, { outline: null, alpha: 200 });
    const teeth = new L(W, H);
    for (const [x, len] of [[101, 6], [107, 8], [113, 7], [119, 6]] as [number, number][]) teeth.poly([[x - 2, 45], [x + 2, 45], [x + 0.3, 45 + len]], (xx, yy) => (yy > 45 + len * 0.6 ? 6 : xx < x ? 8 : 7));
    for (const [x, len] of [[100, 5], [107, 6], [114, 6], [120, 5]] as [number, number][]) teeth.poly([[x - 2, 61], [x + 2, 61.5], [x - 0.3, 61 - len]], (xx) => (xx < x ? 7 : 5));
    teeth.render(c, E);
    const jaw = new L(W, H);
    facetRock(jaw, [[86, 54], [100, 58], [114, 61], [125, 65], [119, 71], [104, 70], [92, 65], [84, 59]], [100, 63], 8, [1, 2, 3, 4, 5, 6], 0, { ring: 0.5, jitter: 0.2, seed: 81 });
    jaw.bevel({ lit: 1, shade: 0, max: 7 });
    for (let x = 90; x < 120; x += 6) jaw.line(x, 66 + (x - 90) * 0.08, x + 3, 66 + (x - 90) * 0.08, (xx, yy) => (jaw.get(xx, yy) >= 0 ? 2 : null));
    jaw.render(c, E);
    const up = new L(W, H);
    facetRock(up, [[82, 44], [85, 35], [93, 28], [104, 27], [115, 31], [126, 38], [127, 44], [118, 45], [106, 46], [96, 48], [86, 49]], [102, 34], 13, FACETS, 0, { ring: 0.55, jitter: 0.2, seed: 82 });
    up.bevel({ lit: 1, shade: 0, max: 7 });
    const horn = (b1: Pt, tip: Pt, b2: Pt): void => {
      const mx = (b1[0] + b2[0]) / 2, my = (b1[1] + b2[1]) / 2;
      up.poly([b1, [lerp(b1[0], tip[0], 0.55) - 1, lerp(b1[1], tip[1], 0.55) - 1], tip, [lerp(b2[0], tip[0], 0.5), lerp(b2[1], tip[1], 0.5)], b2], (x, y) => {
        const side = (tip[0] - mx) * (y + 0.5 - my) - (tip[1] - my) * (x + 0.5 - mx);
        const along = Math.hypot(x - mx, y - my) / Math.hypot(tip[0] - mx, tip[1] - my);
        return side < -1.5 ? (along > 0.6 ? 7 : 6) : side < 1 ? 5 : along > 0.5 ? 3 : 2;
      });
    };
    horn([86, 37], [68, 17], [93, 31]);
    horn([95, 31], [83, 9], [102, 28]);
    up.line(97, 32, 110, 31, 8);
    up.line(98, 33, 110, 32, 6);
    up.path([[88, 40], [94, 43], [100, 44]], 2);
    up.set(122, 38, 1);
    up.set(123, 38, 1);
    up.set(122, 37, 6);
    up.render(c, E);
    const cheek = new L(W, H);
    facetRock(cheek, [[84, 45], [93, 44], [96, 51], [91, 57], [84, 55]], [89, 49], 4, [2, 3, 4, 5, 6], 0, { seed: 83 });
    cheek.bevel({ lit: 1, shade: 0, max: 7 });
    cheek.render(c, E);
    const mc = new L(W, H);
    mc.fill((x, y) => up.get(x, y) >= 1 && y >= 26 && y <= 30 + pnoise(x, 0, 2, 128, 3) * 3 && x > 100 && x < 116, (x, y) => mossOver(up.get(x, y)));
    mc.render(c, MOSS, { outline: null });
    const eye = new L(W, H);
    eye.poly([[100, 36.5], [104, 34], [110, 34.5], [108.5, 38], [102, 38.5]], (x, y) => (x === 105 ? 1 : x < 104 && y < 37 ? 6 : x < 107 ? 5 : 4));
    eye.render(c, MOSS, { outline: E[0] });
    return c;
  });
  return sprite('beast', 'Earth beast: stone serpent', [64, 48], { fly: loop(frames) });
}

/** Breath: a cone of grit, stones and dust blasting from the left middle. */
function breath(): WorldSprite {
  const ox = 3, oy = 32;
  const frames = range(N).map((f) => {
    const c = new Canvas(96, 64), t = f / N;
    const list: (Puff & { s: number })[] = [];
    const NP = 32;
    for (let i = 0; i < NP; i++) {
      const s = 6 + fract((i + rnd(81, i) * 0.7) / NP + t) * 88;
      const edge = i % 3 !== 0;
      const a = edge ? (i % 2 ? 1 : -1) * (0.24 + rnd(82, i) * 0.16) : (rnd(82, i) - 0.5) * 0.36;
      const r = (2.2 + s * 0.085) * (1 - smooth(74, 95, s) * 0.6);
      const k = s / 94;
      list.push({ x: ox + Math.cos(a) * s, y: oy + Math.sin(a) * s, r, s, steps: k < 0.25 ? [5, 6, 7, 8, 8] : dustAge(k * 0.9) });
    }
    list.sort((p, q) => q.s - p.s);
    dust(c, list, { seed: 83 });
    const sl: [number, number, number][] = [];
    for (let i = 0; i < 9; i++) {
      const a = (rnd(84, i) - 0.5) * 0.5;
      const s0 = 8 + fract(rnd(85, i) + t) * 62;
      const p0 = polar(ox, oy, s0, a);
      sl.push([p0[0], p0[0] + 13, Math.round(p0[1])]);
    }
    streaks(c, sl);
    for (let i = 0; i < 10; i++) {
      const s = 12 + fract(rnd(86, i) + t) * 78;
      const a = (rnd(87, i) - 0.5) * 0.62;
      const p = polar(ox, oy, s, a);
      const r = 1.6 + rnd(88, i) * 2.2 + s * 0.025;
      if (r < 2.6) grit(c, [[p[0], p[1], 3]]);
      else stone(c, p[0], p[1], r, 90 + i, f * 1.1 + i, { n: 6 });
    }
    const core = new L(96, 64);
    core.ellipse(ox + 2, oy, 7, 6, 5);
    core.ellipse(ox + 2.5, oy, 5, 4, 7);
    core.ellipse(ox + 2, oy, 2.6, 2, 8);
    core.render(c, E, { outline: E[1] });
    return c;
  });
  return sprite('breath', 'Earth breath: gravel blast', [0, 32], { fly: loop(frames) });
}

const GY = 42;
/** Spike height and state over its erupt cycle (0..1). */
function cycle(ph: number): { h: number; broken: boolean } {
  const keys: [number, number][] = [[0, 6], [0.17, 30], [0.5, 26], [0.67, 18], [0.84, 9], [1, 6]];
  let h = 6;
  for (let i = 0; i + 1 < keys.length; i++)
    if (ph >= keys[i][0] && ph <= keys[i + 1][0]) h = lerp(keys[i][1], keys[i + 1][1], (ph - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
  return { h, broken: ph > 0.56 };
}

/** Stream: a tileable row of stone spikes erupting from cracked ground, the wave moving forward. */
function stream(): WorldSprite {
  const xs = [9, 25, 41, 57];
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64);
    for (let i = 0; i < 4; i++) spike(c, xs[i] + 8, GY - 2, 6 + rnd(101, i) * 4, 6, 1, 110 + i, { wrap: true });
    for (let i = 0; i < 4; i++) {
      const ph = fract(f / N - i / 4);
      const { h, broken } = cycle(ph);
      spike(c, xs[i], GY, h + rnd(103, i) * 3, 11 + rnd(102, i) * 3, 2 + rnd(104, i) * 2, 120 + i, { wrap: true, broken });
      if (ph < 0.2 || (ph > 0.6 && ph < 0.95)) {
        const fresh = ph < 0.2;
        dust(c, [
          { x: xs[i] - 6, y: GY - 2, r: fresh ? 4.5 : 3.2, steps: fresh ? [3, 4, 5, 6, 7, 8] : [2, 3, 4, 5] },
          { x: xs[i] + 6, y: GY - 3, r: fresh ? 4 : 2.8, steps: fresh ? [3, 4, 5, 6, 7, 8] : [2, 3, 4, 5] },
        ], { seed: 130 + i, wrapX: true });
      }
      if (ph > 0.08 && ph < 0.4) grit(c, range(3).map((k) => [((xs[i] - 5 + k * 5) + 64) % 64, GY - h - 4 - (ph - 0.08) * 30 - rnd(105, i, k) * 5 + (k === 1 ? -3 : 0), k === 1 ? 3 : 2]));
    }
    rubble(c, 0, 64, GY, 140, { wrap: true, count: 9 });
    return c;
  });
  return sprite('stream', 'Earth stream: spike row (tileable)', [0, 32], { fly: loop(frames) });
}

/** Stream head: the spike row ends in a big eruption of three spikes and flying rock. */
function streamHead(): WorldSprite {
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    const shake = [0, 1, 0, -1, 0, 1][f];
    for (let i = 0; i < 7; i++) {
      const ph = fract(rnd(151, i) + t);
      const a = -Math.PI / 2 + (rnd(152, i) - 0.5) * 2;
      const p = polar(34, GY - 16, 14 + ph * 20, a);
      if (rnd(153, i) < 0.5) grit(c, [[p[0], p[1] + ph * ph * 10, 3]]);
      else stone(c, p[0], p[1] + ph * ph * 10, 2.8, 160 + i, f + i, { n: 5 });
    }
    spike(c, 5, GY, 13, 9, 2, 150);
    spike(c, 21 + shake, GY, 26, 12, -6, 170);
    spike(c, 48 - shake, GY, 24, 12, 7, 171);
    spike(c, 34, GY, 40 + [0, 2, 1, 2, 0, 1][f], 16, 2, 172);
    dust(c, [
      { x: 15, y: GY - 1, r: 5 + (f % 2) },
      { x: 53, y: GY - 1, r: 5 - (f % 2) },
      { x: 26, y: GY + 1, r: 4 },
      { x: 43, y: GY + 1, r: 4.5 },
    ], { seed: 180 + f });
    rubble(c, 0, 64, GY, 141, { count: 9 });
    return c;
  });
  return sprite('stream_head', 'Earth stream head: spike eruption', [32, 32], { fly: loop(frames) });
}

/** Hit: a flash of grit, a dust cloud bursting out and chunks thrown and falling. */
function hit(): WorldSprite {
  const cx = 32, cy = 32;
  const frames = range(6).map((f) => {
    const c = new Canvas(64, 64);
    if (f >= 1) {
      const d = [0, 4, 8, 12, 15, 17][f], pr = [0, 7, 7.5, 6.5, 5, 3.2][f];
      const st = [[], [5, 6, 7, 8, 8], [3, 4, 5, 6, 7, 8], [2, 3, 4, 5, 6, 7], [2, 3, 4, 5], [1, 2, 3, 4]][f];
      const list: Puff[] = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + 0.3 + rnd(202, k) * 0.4;
        const p = polar(cx, cy + f * 0.8, d * (0.8 + rnd(203, k) * 0.4), a, 0.85);
        list.push({ x: p[0], y: p[1], r: pr * (0.75 + rnd(204, k) * 0.45) });
      }
      if (f <= 3) list.push({ x: cx, y: cy + f * 0.5, r: pr * 0.9 });
      list.sort((p, q) => p.y - q.y);
      dust(c, list, { seed: 205, steps: st, alpha: f >= 5 ? 180 : 255 });
    }
    if (f <= 1) {
      const l = new L(64, 64);
      const pts: Pt[] = [];
      const n = 8;
      for (let k = 0; k < n * 2; k++) {
        const a = (k / (n * 2)) * TAU + 0.2;
        const r = k % 2 ? (f ? 6 : 4.5) : (f ? 19 : 14) * (0.7 + rnd(201, k) * 0.45);
        pts.push(polar(cx, cy, r, a));
      }
      l.poly(pts, 1);
      l.bands(f ? [1, 2, 3.2] : [1, 1.8, 2.8, 3.8], f ? [5, 6, 7, 8] : [5, 6, 7, 8, 8]);
      l.render(c, E, { outline: E[2] });
    }
    if (f >= 1 && f <= 2) {
      const sl = new L(64, 64);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU + 0.15;
        const p0 = polar(cx, cy, 12 + f * 6, a), p1 = polar(cx, cy, 17 + f * 7, a);
        sl.line(p0[0], p0[1], p1[0], p1[1], 7);
      }
      sl.render(c, E, { outline: null });
    }
    if (f >= 1)
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * TAU - 0.4 + rnd(206, k) * 0.5;
        const d = [0, 11, 18, 23, 26, 28][f] * (0.85 + rnd(207, k) * 0.3);
        const p = polar(cx, cy, d, a);
        if (f === 5 && k % 2) continue;
        stone(c, p[0], p[1] + f * f * 0.45, 2.4 + rnd(208, k) * 1.8, 210 + k, f * 1.3 + k, { n: 6 });
      }
    if (f >= 2)
      grit(c, range(8).map((k) => {
        const a = (k / 8) * TAU + rnd(209, k);
        const p = polar(cx, cy, 10 + f * 4.5, a);
        return [p[0], p[1] + f * f * 0.5, 2];
      }));
    return c;
  });
  return sprite('hit', 'Earth hit: rubble burst', [32, 32], { hit: once(frames, 15) });
}

/** A slab of stone tilted out of the ground (blast rim), drawn with its base at (x, gy). */
function slab(c: Canvas, x: number, gy: number, h: number, w: number, lean: number, seed: number, broken: boolean): void {
  if (h < 2) return;
  const l = new L(c.w, c.h);
  const pts: Pt[] = [[x - w / 2, gy + 1], [x - w * 0.42 + lean * 0.7, gy - h * 0.7], [x - w * 0.05 + lean, gy - h], [x + w * 0.32 + lean * 0.8, gy - h * 0.78], [x + w / 2, gy + 1]];
  if (broken) pts.splice(2, 1, [x - w * 0.12 + lean * 0.8, gy - h * 0.7], [x + lean * 0.8, gy - h * 0.62], [x + w * 0.1 + lean * 0.8, gy - h * 0.74]);
  facetRock(l, pts, [x - w * 0.1 + lean * 0.6, gy - h * 0.55], w * 0.55, FACETS, 0, { ring: 0.5, jitter: 0.25, seed });
  l.bevel({ lit: 1, shade: 0, max: 7 });
  l.erase((xx, yy) => yy > gy + 1);
  l.render(c, E);
}

/** Jagged crack polyline from radius r0 outward along angle a, with one branch. */
function crackPath(ax: number, ay: number, rx: number, ry: number, a: number, r0: number, r1: number, seed: number): Pt[][] {
  const main: Pt[] = [];
  let r = r0, aa = a, i = 0;
  while (r < r1) {
    main.push([ax + Math.cos(aa) * rx * r, ay + Math.sin(aa) * ry * r]);
    r += 0.07 + rnd(seed, i) * 0.06;
    aa = a + (rnd(seed, i++, 1) - 0.5) * 0.4;
  }
  const bi = Math.floor(main.length * 0.5);
  const br: Pt[] = [main[bi]];
  const ba = a + (rnd(seed, 50) < 0.5 ? -0.5 : 0.5);
  for (let k = 1; k < 4; k++) br.push([main[bi][0] + Math.cos(ba) * rx * 0.07 * k, main[bi][1] + Math.sin(ba) * ry * 0.07 * k + (rnd(seed, 60 + k) - 0.5) * 2]);
  return [main, br];
}

/** Blast: the ground splits, a rim of slabs and a crown of great spikes erupt in dust, then settle. */
function blast(): WorldSprite {
  const W = 176, H = 144, ax = 88, ay = 88, rx = 80, ry = 53;
  const ringN = 11;
  const rim = range(ringN).map((k) => {
    const a = (k / ringN) * TAU + 0.2 + (rnd(301, k) - 0.5) * 0.22;
    const d = 0.84 + rnd(302, k) * 0.1;
    const front = Math.sin(a);
    return { x: ax + Math.cos(a) * rx * d, y: ay + Math.sin(a) * ry * d, h: (front > 0.3 ? 16 : 27) + rnd(303, k) * 10, w: 14 + rnd(304, k) * 5, lean: Math.cos(a) * 7 };
  });
  const cracks = range(7).flatMap((k) => crackPath(ax, ay, rx, ry, (k / 7) * TAU + rnd(305, k) * 0.5, 0.16, 0.8, 306 + k));
  const frames = range(8).map((f) => {
    const c = new Canvas(W, H);
    const g = new L(W, H);
    const crackLen = [0.4, 0.8, 1, 1, 1, 1, 1, 1][f];
    for (const pts of cracks) {
      const seg = pts.slice(0, Math.max(2, Math.round(pts.length * crackLen)));
      g.path(seg.map(([x, y]) => [x, y + 1] as Pt), 7);
      g.path(seg, 1);
      g.path(seg.map(([x, y]) => [x + 1, y] as Pt), 1);
    }
    g.render(c, E, { outline: E[0], alpha: f >= 7 ? 210 : 255, outlineAlpha: f >= 7 ? 160 : 230 });
    const items: { y: number; draw: () => void }[] = [];
    const hk = [0, 0.6, 1, 1, 1, 0.85, 0.7, 0.55][f];
    for (const [k, s] of rim.entries()) items.push({ y: s.y, draw: () => slab(c, s.x, s.y, s.h * hk, s.w, s.lean, 310 + k, f >= 4) });
    const colH = [10, 34, 56, 64, 60, 46, 26, 10][f];
    const spread = [6, 9, 13, 16, 20, 24, 27, 29][f];
    const size = [0.8, 1, 1.1, 1.2, 1.2, 1.05, 0.8, 0.6][f];
    const age = [0, 0, 0.1, 0.25, 0.45, 0.65, 0.85, 1][f];
    items.push({
      y: ay - 1,
      draw: () => {
        // A churning dust cloud behind the crown, billowing wider as it rises.
        const k = size;
        const L2: [number, number, number, number][] = [
          [0, -colH - 4, 19 * k, 14 * k],
          [-spread - 10, -colH * 0.62, 15 * k, 11 * k],
          [spread + 11, -colH * 0.58, 15 * k, 11 * k],
          [-5, -colH * 0.35, 14 * k, 15 * k],
          [-spread - 16, -10, 11 * k, 8 * k],
          [spread + 17, -11, 11 * k, 8 * k],
        ];
        const steps = age < 0.3 ? [3, 4, 5, 6, 7, 8] : age < 0.65 ? [2, 3, 4, 5, 6, 7] : [2, 3, 4, 5, 6];
        dustGas(c, (x, y) => lobes(ax, ay, L2, x, y) * (f >= 6 ? 0.85 : 1), f / 8, { seed: 330, alpha: f >= 7 ? 180 : 255, steps, thr: 0.4, scale: 0.7 });
      },
    });
    const sk = [0.25, 0.75, 1, 1.02, 0.95, 0.7, 0.4, 0.2][f];
    const cluster: [number, number, number, number, number][] = [
      [-16, 1, 46, 18, -12],
      [17, 0, 50, 18, 12],
      [-4, 3, 74, 24, -2],
      [10, 5, 58, 20, 6],
      [-27, 7, 26, 14, -13],
      [28, 7, 29, 14, 13],
    ];
    for (const [k, [dx, dy, h, w, lean]] of cluster.entries())
      items.push({ y: ay + dy, draw: () => spike(c, ax + dx, ay + dy, h * sk, w, lean * sk, 345 + k, { broken: f >= 4 && k % 2 === 0 }) });
    if (f >= 1 && f <= 6)
      items.push({
        y: ay + 10,
        draw: () => {
          const sp = 1 + f * 0.12;
          const L3: [number, number, number, number][] = [
            [-27 * sp, 6, 8 * size, 5 * size],
            [-11 * sp, 9, 10 * size, 6 * size],
            [8 * sp, 8, 9 * size, 5.5 * size],
            [25 * sp, 6, 7 * size, 4.5 * size],
          ];
          dustGas(c, (x, y) => lobes(ax, ay, L3, x, y), f / 8 + 0.3, { seed: 337, alpha: f >= 6 ? 190 : 255, steps: age < 0.3 ? [3, 4, 5, 6, 7, 8] : [2, 3, 4, 5, 6, 7] });
          if (f > 5) return;
          for (let k = 0; k < 7; k++) {
            const a = -Math.PI / 2 + (rnd(331, k) - 0.5) * 2.2;
            const p = polar(ax, ay - 26, 8 + f * (6 + rnd(332, k) * 4), a);
            stone(c, p[0], p[1] + (f - 1) * (f - 1) * 1.8, 2.8 + rnd(333, k) * 2.6, 340 + k, f + k, { n: 6 });
          }
        },
      });
    // Dust rolling out along the rim in ragged clusters.
    if (f >= 3) {
      const pr = [0, 0, 0, 5.5, 6.5, 6, 5, 3.6][f];
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU + rnd(350, k) * 0.3;
        const p = polar(ax, ay, rx * (0.74 + f * 0.035), a, ry / rx);
        const cl: Puff[] = range(3).map((j) => ({ x: p[0] + (j - 1) * pr * 0.9 + (rnd(351, k, j) - 0.5) * 3, y: p[1] - pr * 0.5 - (j === 1 ? pr * 0.5 : 0), r: pr * (j === 1 ? 1 : 0.65 + rnd(354, k, j) * 0.2), steps: dustAge((f - 3) / 5 + (j === 1 ? 0 : 0.2)) }));
        items.push({ y: p[1] + 1, draw: () => dust(c, cl, { seed: 352 + k, alpha: f >= 7 ? 170 : 255 }) });
      }
    }
    items.sort((p, q) => p.y - q.y);
    for (const it of items) it.draw();
    if (f >= 1 && f <= 6)
      grit(c, range(18).map((k) => {
        const a = -Math.PI / 2 + (rnd(360, k) - 0.5) * 2.6;
        const p = polar(ax, ay - 30, (f - 0.4) * (11 + rnd(361, k) * 9), a);
        return [p[0], p[1] + (f - 1) * (f - 1) * 2.4, rnd(362, k) < 0.5 ? 3 : 2];
      }));
    return c;
  });
  return sprite('blast', 'Earth blast: split ground, slab rim and spike crown', [ax, ay], { blast: once(frames, 12) });
}

const WW = 272, WH = 128, WGY = 120, WALL_H = 103, WALL_W = 257;

/** The stacked-rock wall: irregular stones (Voronoi cells) with mortar gaps, moss on top. */
function wallArt(c: Canvas, gy: number, seed: number): void {
  const x0 = Math.round((WW - WALL_W) / 2), x1 = x0 + WALL_W, top = gy - WALL_H;
  const sites: { x: number; y: number; top: number; row: number; tilt: number; tone: number }[] = [];
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const yc = gy - (r + 0.5) * (WALL_H / rows);
    let x = x0 + 6 + rnd(seed, r) * 12 - (r % 2 ? 16 : 0);
    let k = 0;
    while (x < x1 + 10) {
      sites.push({ x, y: yc + (rnd(seed, r, k) - 0.5) * 9, top: top + rnd(seed + 1, r, k) * 9, row: r, tilt: (rnd(seed + 2, r, k) - 0.5) * 0.5, tone: (rnd(seed + 12, r, k) - 0.5) * 0.16 });
      x += 24 + rnd(seed + 3, r, k) * 18;
      k++;
    }
  }
  const stones = new L(WW, WH), mortar = new L(WW, WH), owner = new Int16Array(WW * WH).fill(-1);
  for (let y = top; y <= gy; y++)
    for (let x = x0; x < x1; x++) {
      let d1 = Infinity, d2 = Infinity, i1 = -1;
      for (let i = 0; i < sites.length; i++) {
        const s = sites[i];
        const d = Math.hypot((x + 0.5 - s.x) * 0.8, (y + 0.5 - s.y) * 1.15);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          i1 = i;
        } else if (d < d2) d2 = d;
      }
      const s = sites[i1];
      if (s.row === rows - 1 && y < s.top + Math.abs(x - s.x) * 0.12) continue;
      const edge = x <= x0 + 1 || x >= x1 - 2;
      if (d2 - d1 < 1.5 || edge) {
        mortar.set(x, y, 1);
        continue;
      }
      owner[y * WW + x] = i1;
      const u = (x + 0.5 - s.x) / 18, v = (y + 0.5 - s.y) / 14;
      const nx = u * 0.75 + s.tilt, ny = v * 0.75 - 0.1, nz = Math.sqrt(Math.max(0.15, 1 - u * u * 0.5 - v * v * 0.5));
      const ln = Math.hypot(nx, ny, nz);
      let li = lambert(nx / ln, ny / ln, nz / ln, 0.12) + s.tone + (pnoise(x, y, 3, WW, seed + 4) - 0.5) * 0.16;
      const b = d2 - d1;
      if (b < 3.2) li += (x + 0.5 - s.x) * 0.55 + (y + 0.5 - s.y) < 0 ? 0.16 : -0.18;
      stones.set(x, y, FACETS[clamp(Math.floor(li * 7), 0, 6)]);
    }
  for (let x = x0; x < x1; x++)
    for (let y = top; y < gy; y++)
      if (stones.get(x, y) >= 0) {
        if (y < gy - WALL_H * 0.6) {
          stones.set(x, y, 7);
          if (stones.get(x, y + 1) >= 0) stones.set(x, y + 1, 6);
        }
        break;
      }
  for (let k = 0; k < 10; k++) {
    let x = x0 + 10 + rnd(seed + 5, k) * (WALL_W - 20), y = top + 20 + rnd(seed + 6, k) * (WALL_H - 30);
    for (let s = 0; s < 6; s++) {
      const nx = x + (rnd(seed + 7, k, s) - 0.3) * 4, ny = y + 1.5 + rnd(seed + 8, k, s) * 2;
      stones.line(x, y, nx, ny, (xx, yy) => (stones.get(xx, yy) >= 0 ? 1 : null));
      x = nx;
      y = ny;
    }
  }
  for (let k = 0; k < 40; k++) {
    const x = Math.round(x0 + 4 + rnd(seed + 13, k) * (WALL_W - 8)), y = Math.round(top + 8 + rnd(seed + 14, k) * (WALL_H - 12));
    if (stones.get(x, y) >= 3 && stones.get(x + 1, y + 1) >= 3) {
      stones.set(x, y, 2);
      stones.set(x + 1, y + 1, Math.min(7, stones.get(x + 1, y + 1) + 1));
    }
  }
  stones.clean();
  mortar.render(c, E, { outline: null });
  stones.render(c, E, { outline: E[0] });
  const ml = new L(WW, WH);
  ml.fill((x, y) => {
    const i = owner[y * WW + x];
    if (i < 0) return false;
    const s = sites[i];
    let d = 0;
    while (d < 12 && y - d - 1 >= 0 && owner[(y - d - 1) * WW + x] === i) d++;
    const depth = s.row === rows - 1 ? 2 + pnoise(x, 0, 2.5, WW, seed + 9) * 5 : rnd(seed + 10, i) < 0.22 ? pnoise(x, 1, 2, WW, seed + 11) * 4 - 1 : -1;
    return d <= depth;
  }, (x, y) => mossOver(stones.get(x, y)));
  ml.render(c, MOSS, { outline: null });
}

/** Wall: stacked rock grinding up out of the ground ('rise'), then trickling grit ('idle'). */
function wall(): WorldSprite {
  const full = new Canvas(WW, WH);
  wallArt(full, WGY, 400);
  const rise = range(6).map((f) => {
    const c = new Canvas(WW, WH);
    const p = [0.16, 0.48, 0.8, 1.04, 1, 1][f];
    const off = Math.round((1 - p) * WALL_H);
    const sx = f < 3 ? (f % 2 ? 1 : -1) : 0;
    for (let y = 0; y < WH; y++)
      for (let x = 0; x < WW; x++) {
        const sy = y - off;
        if (y > WGY + 1 || sy < 0) continue;
        const col = full.get(x - sx, sy);
        if (col[3]) c.set(x, y, col);
      }
    const list: Puff[] = [];
    const pr = [7, 9, 9.5, 8.5, 6.5, 4.5][f];
    for (let k = 0; k < 22; k++) {
      const big = rnd(412, k) < 0.4;
      list.push({ x: 8 + rnd(410, k) * 256, y: WGY - 2 - rnd(411, k) * 5 - (f >= 3 ? (f - 2) * 1.5 : 0) - (big ? 2 : 0), r: pr * (big ? 1 : 0.55 + rnd(413, k) * 0.25), steps: dustAge(f / 6 + (big ? 0 : 0.2)) });
    }
    list.sort((p, q) => p.y - q.y);
    dust(c, list, { seed: 413 + f, alpha: f >= 5 ? 210 : 255 });
    if (f <= 3) grit(c, range(24).map((k) => [8 + rnd(414, k) * 256, WGY - off - 4 - rnd(415, k) * 18 - f * 3, rnd(416, k) < 0.4 ? 3 : 2]));
    if (f >= 1 && f <= 3)
      for (let k = 0; k < 5; k++) stone(c, 20 + rnd(417, k) * 232, WGY - off - 10 - f * 5 - rnd(418, k) * 8, 3 + rnd(419, k) * 1.5, 430 + k, f + k, { n: 6 });
    return c;
  });
  const idle = range(N).map((f) => {
    const c = full.clone();
    grit(c, range(8).map((k) => [20 + rnd(420, k) * 232, WGY - WALL_H + 12 + fract(rnd(421, k) + f / N) * (WALL_H - 16), 2]));
    const list: Puff[] = [];
    for (let k = 0; k < 6; k++) {
      const ph = fract(rnd(422, k) + f / N);
      list.push({ x: 20 + k * 46 + ph * 6, y: WGY - 1 - ph * 3, r: 3.8 * (1 - ph * 0.6), steps: dustAge(ph) });
    }
    dust(c, list, { seed: 423, alpha: 220 });
    return c;
  });
  return sprite('wall', 'Earth wall: stacked rock', [WW / 2, WGY], { rise: once(rise, 12), idle: loop(idle, 8) });
}

/** Aura (the owner approved this look: keep it): dust whirlwind walls at the sides, levitating stones, a cracked ring. */
function aura(): WorldSprite {
  const W = 80, H = 120, ax = 40, ay = 112;
  const frames = range(6).map((f) => {
    const c = new Canvas(W, H), t = f / 6;
    const g = new L(W, H);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU + 0.1;
      const p = polar(ax, ay, 27, a, 0.28), q = polar(ax, ay, 35, a + 0.07, 0.28);
      g.line(p[0], p[1], q[0], q[1], 1);
    }
    g.render(c, E, { outline: E[4], outlineAlpha: 150 });
    for (const side of [-1, 1]) {
      const list: Puff[] = [];
      const NL = 11;
      for (let k = 0; k < NL; k++) {
        const h = fract(k / NL + t / 2 + (side > 0 ? 0.045 : 0));
        const x = ax + side * (25 + h * 7 + Math.sin(h * 9 - t * TAU + (side > 0 ? 1.5 : 0)) * 3.5);
        list.push({ x, y: ay - 6 - h * 94, r: 5.6 - h * 2.6, steps: dustAge(h * 0.9) });
      }
      list.sort((p, q) => p.y - q.y);
      dust(c, list, { seed: 506 + side });
    }
    const sl = new L(W, H);
    for (let k = 0; k < 8; k++) {
      const ph = fract(rnd(505, k) + t);
      const x = ax + (k % 2 ? 1 : -1) * (20 + rnd(506, k) * 16), y = ay - 12 - ph * 88;
      sl.line(x, y, x, y + 6 + (1 - ph) * 4, (xx, yy) => (yy < y + 3 ? 8 : 7));
    }
    sl.render(c, E, { outline: null });
    grit(c, range(14).map((k) => {
      const ph = fract(rnd(510, k) + t);
      const side = k % 2 ? 1 : -1;
      return [ax + side * (21 + rnd(511, k) * 14) + Math.sin(ph * TAU + k) * 2, ay - 4 - ph * 96, ph < 0.6 ? 2 : 1];
    }));
    const rocks: [number, number, number, number][] = [
      [ax - 31, 56, 6.2, 0],
      [ax + 31, 42, 6.8, 2],
      [ax - 30, 86, 5, 4],
      [ax + 30, 78, 4.6, 1],
      [ax - 26, 26, 4, 3],
      [ax + 25, 16, 3.6, 5],
    ];
    for (const [k, [x, y, r, p0]] of rocks.entries()) {
      const bob = Math.round(Math.sin(((f + p0) / 6) * TAU) * 2.5);
      stone(c, x, y + bob, r, 520 + k, ((f + p0) / 6) * TAU * (k % 2 ? 1 : -1) * 0.25, { n: 7, moss: r > 5 ? 0.9 : 0 });
    }
    return c;
  });
  return sprite('aura', 'Earth aura: sand vortex and levitating stones', [ax, ay], { idle: loop(frames, 10) });
}

export function buildEarth(): WorldSprite[] {
  return [bolt(), beast(), stream(), streamHead(), breath(), sphere(), slash(), multi(), hit(), blast(), wall(), aura()];
}
