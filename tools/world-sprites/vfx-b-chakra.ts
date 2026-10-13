// Chakra effects: pure chakra and seals. An energy shuriken, a fox spirit, a beam bound by a
// sealing chain of hexagonal links, a gentle-fist palm wave, a spiral sphere, a glyph crescent,
// seal discs, a hexagram burst, a sealing circle with a pillar of chakra, a honeycomb seal
// barrier and a chakra-flame aura.
// Palette: deep blue, blue, sky cyan, light cyan, ice white, white, with gold for the seals.

import { Anim, Canvas, WorldSprite } from './kit';
import { L, Pt, TAU, clamp, fract, lerp, pal, pnoise, polar, rnd, rot, smooth } from './vfx-b-lib';

/** 0 outline, 1 deep blue, 2 royal, 3 blue, 4 azure, 5 sky cyan, 6 light cyan, 7 ice white, 8 white. */
export const C = pal('#081040', '#12288c', '#1a46c8', '#2a6cf0', '#2fa0ff', '#3cc8ff', '#8ae8ff', '#d4f8ff', '#ffffff');
/** Seal gold: 0 outline .. 5 pale. */
const GOLD = pal('#4a2a06', '#8a560a', '#c8861a', '#f0b42c', '#ffd866', '#fff3c0');

const N = 6;
const loop = (frames: Canvas[], fps = 12): Anim => ({ frames, fps, loop: true });
const once = (frames: Canvas[], fps = 12): Anim => ({ frames, fps, loop: false });
const sprite = (name: string, label: string, anchor: [number, number], anims: Record<string, Anim>): WorldSprite => {
  const f0 = Object.values(anims)[0].frames[0];
  return { name, label, meters: [+(f0.w / 57).toFixed(2), +(f0.h / 57).toFixed(2)], anchor, tags: ['vfx'], anims };
};
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

// --- building blocks ------------------------------------------------------------------------

/** Standard chakra banding: blue rim, cyan body, white only where the shape is thick. */
const BAND_CUTS = [1, 2, 3, 4.4, 6, 8];
const BAND_STEPS = [2, 3, 4, 5, 6, 7, 8];
function energy(l: L, o: { cuts?: number[]; steps?: number[]; mod?: (x: number, y: number, d: number) => number; wrapX?: boolean } = {}): L {
  return l.bands(o.cuts ?? BAND_CUTS, o.steps ?? BAND_STEPS, { mod: o.mod, jitter: 0.3, seed: 13, wrapX: o.wrapX }).clean(1, o.wrapX);
}

/**
 * Adds licking chakra-flame tongues around a mask: pixels just outside the shape (up to
 * `len` px, looking against `dir`) join it where a rising noise pattern is strong. `t` in
 * [0, 1) loops seamlessly.
 */
function flames(l: L, t: number, o: { len?: number; dir?: Pt; seed?: number; thr?: number } = {}): L {
  const len = o.len ?? 5, dir = o.dir ?? [-0.55, -0.83], thr = o.thr ?? 0.42;
  const out = l.clone();
  for (let y = 0; y < l.h; y++)
    for (let x = 0; x < l.w; x++) {
      if (l.get(x, y) >= 0) continue;
      let hit = 0;
      for (let k = 1; k <= len; k++)
        if (l.get(Math.round(x - dir[0] * k), Math.round(y - dir[1] * k)) >= 0) {
          hit = k;
          break;
        }
      if (!hit) continue;
      const n = pnoise(y + t * 24, x * 0.8, 3, 24, o.seed ?? 3);
      if (n > thr + (hit / len) * 0.42) out.set(x, y, 1);
    }
  return out;
}

/** A sparkle chip: plus shape in light cyan with a white center. */
function spark(l: L, x: number, y: number, s: number): void {
  x = Math.round(x);
  y = Math.round(y);
  l.set(x, y, 8);
  if (s < 1) return;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) l.set(x + dx, y + dy, s > 1 ? 7 : 6);
  if (s > 1) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) l.set(x + dx, y + dy, 5);
}
function sparks(c: Canvas, pts: [number, number, number][]): void {
  const l = new L(c.w, c.h);
  for (const [x, y, s] of pts) spark(l, x, y, s);
  l.render(c, C, { outline: null });
}

/** Speed streaks [x tail, x head, y]. */
function streaks(c: Canvas, list: [number, number, number][]): void {
  const l = new L(c.w, c.h);
  for (const [a, b, y] of list) l.line(a, y, b, y, (x) => (x > (a + b) / 2 ? 8 : x > a + (b - a) * 0.25 ? 6 : 4));
  l.render(c, C, { outline: null });
}

/** Abstract seal glyphs (no real text): 5x5 brush marks built from bars, boxes and ticks. */
const GLYPHS = [
  ['#####', '..#..', '.###.', '..#..', '.#.#.'],
  ['.###.', '.#.#.', '#####', '..#..', '.##..'],
  ['#.#.#', '#####', '..#..', '.###.', '#...#'],
  ['..#..', '#####', '#.#.#', '#.#.#', '.#.#.'],
  ['.#.#.', '#####', '..#..', '#####', '.#.#.'],
  ['#...#', '.###.', '.#.#.', '.###.', '#...#'],
  ['.#.#.', '#####', '.#.#.', '.###.', '..#..'],
  ['#####', '#...#', '#.#.#', '#...#', '##.##'],
];
function glyph(l: L, x: number, y: number, seed: number, v: number): void {
  const g = GLYPHS[Math.floor(rnd(seed, 0) * GLYPHS.length)];
  const flip = rnd(seed, 1) < 0.5;
  x = Math.round(x) - 2;
  y = Math.round(y) - 2;
  for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) if (g[r][flip ? 4 - q : q] === '#') l.set(x + q, y + r, v);
}

/** Hexagram (two triangles) outline at (x, y), radius r, rotation a. */
function hexagram(l: L, x: number, y: number, r: number, a: number, v: number, sy = 1): void {
  for (const off of [0, Math.PI / 3]) {
    const pts = range(3).map((k) => polar(x, y, r, a + off + (k / 3) * TAU, sy));
    l.path([...pts, pts[0]], v);
  }
}

/** A gold seal ring (ellipse band) with glyph ticks. */
function sealRing(c: Canvas, x: number, y: number, r: number, sy: number, spin: number, o: { glyphs?: number; width?: number; alpha?: number } = {}): void {
  const l = new L(c.w, c.h);
  const w = o.width ?? 2;
  l.fill((px, py) => {
    const u = (px + 0.5 - x) / r, v = (py + 0.5 - y) / (r * sy);
    const d = Math.sqrt(u * u + v * v) * r;
    return d <= r && d >= r - w;
  }, (px, py) => (py < y ? 4 : 3));
  const n = o.glyphs ?? 0;
  for (let k = 0; k < n; k++) {
    const p = polar(x, y, r - w - 3.5, spin + (k / n) * TAU, sy);
    glyph(l, p[0], p[1], 40 + k, 3);
  }
  l.render(c, GOLD, { alpha: o.alpha, outlineAlpha: o.alpha });
}

// --- roles ----------------------------------------------------------------------------------

/** Shuriken mask: a hub and four curved, tapered blades. */
function shuriken(l: L, cx: number, cy: number, R: number, spin: number): void {
  l.fill((x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    const r = Math.hypot(dx, dy);
    if (r <= R * 0.42) return true;
    if (r > R) return false;
    const th = Math.atan2(dy, dx);
    for (let k = 0; k < 4; k++) {
      const c0 = spin + (k * TAU) / 4 + (r / R) * 0.8;
      let d = th - c0;
      d = ((d + Math.PI * 3) % TAU) - Math.PI;
      const hw = 0.62 * Math.pow(1 - r / R, 0.9) + 0.04;
      if (d > -hw * 0.55 && d < hw) return true;
    }
    return false;
  }, 1);
}

/** Bolt: a spinning shuriken of chakra with a comet tail and spiral wake. */
function bolt(): WorldSprite {
  const cx = 39, cy = 32, R = 15;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N, spin = (f / N) * (TAU / 4);
    // Afterimage of the blades, one step behind.
    const ghost = new L(64, 64);
    shuriken(ghost, cx - 6, cy, R - 1, spin - 0.35);
    ghost.map(() => 3);
    ghost.render(c, C, { alpha: 120, outlineAlpha: 110 });
    // Spiral wake: arcs left by the blade tips.
    const wake = new L(64, 64);
    for (let j = 0; j < 3; j++) {
      const r2 = R + 2 + j * 2.5;
      for (let a = 1.8; a < 4.4; a += 0.02) {
        if (fract(a * 0.9 + t + j * 0.33) > 0.55) continue;
        const p = polar(cx - 4 - j * 3, cy, r2, a);
        wake.set(p[0], p[1], j ? 5 : 7);
      }
    }
    wake.render(c, C, { outline: null });
    streaks(c, [[0, 18, 12], [1, 20, 10], [2, 47, 12]].map(([k, yy, len]) => {
      const x = cx - 14 - fract(t + k * 0.37) * 16;
      return [x - len, x, yy] as [number, number, number];
    }));
    const l = new L(64, 64);
    shuriken(l, cx, cy, R, spin);
    energy(l, { cuts: [1, 1.8, 2.6, 3.6, 4.6], steps: [2, 3, 4, 5, 6, 7] });
    // The hub: a white ring with a dark eye.
    l.disc(cx, cy, 4, 7);
    l.disc(cx, cy, 2.6, 8);
    l.render(c, C);
    sparks(c, range(5).map((i) => {
      const ph = fract(rnd(11, i) + t);
      return [cx - 10 - ph * 30, cy - 12 + rnd(12, i) * 24, ph < 0.5 ? 1 : 0];
    }));
    return c;
  });
  return sprite('bolt', 'Chakra bolt: energy shuriken', [32, 32], { fly: loop(frames) });
}

/** Multi: three spinning seal discs (gold rim, hexagram of light) in a staggered fan. */
function multi(): WorldSprite {
  const fan: [number, number][] = [
    [38, 15],
    [49, 32],
    [36, 49],
  ];
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    for (const [k, [x, y]] of fan.entries()) {
      const tl = new L(64, 64);
      tl.tube([[x - 3, y], [x - 14, y], [x - 26, y + (k - 1) * 3]], [5, 3, 0.5], 1);
      energy(tl, { cuts: [1, 2, 3], steps: [3, 4, 5, 6] });
      tl.render(c, C, { alpha: 215, outlineAlpha: 200 });
    }
    for (const [k, [x, y]] of fan.entries()) {
      const r = 8.5;
      const disc = new L(64, 64);
      disc.disc(x, y, r - 1.5, 1);
      disc.bands([1, 2, 3.5], [3, 4, 5, 6]);
      disc.render(c, C);
      const hx = new L(64, 64);
      hexagram(hx, x, y, r - 2.2, (f / N) * (TAU / 6) + k, 8);
      hx.disc(x, y, 1.2, 8);
      hx.render(c, C, { outline: null });
      sealRing(c, x, y, r, 1, 0, { width: 1.6 });
    }
    sparks(c, range(4).map((i) => [22 - fract(t + i * 0.25) * 18, 8 + i * 15, 1]));
    return c;
  });
  return sprite('multi', 'Chakra multi: seal discs', [32, 32], { fly: loop(frames) });
}

/** Beast: a fox spirit of chakra leaping forward, jaws open, three bushy tails fanning behind. */
function beast(): WorldSprite {
  const W = 128, H = 96;
  const frames = range(N).map((f) => {
    const c = new Canvas(W, H), t = f / N, ph = t * TAU;
    const part = (draw: (l: L) => void, o: { flame?: number; dim?: number; seed?: number; mod?: (x: number, y: number, d: number) => number } = {}): L => {
      const l = new L(W, H);
      draw(l);
      const fl = o.flame ? flames(l, t, { len: o.flame, seed: o.seed ?? 5 }) : l;
      energy(fl, { mod: o.mod });
      if (o.dim) fl.map((v) => Math.max(2, v - o.dim!));
      fl.render(c, C);
      return fl;
    };
    // Three bushy tails fanning back: up, straight, down.
    const tails: [number, number, number, number][] = [
      [-34, 50, 0, 1],
      [22, 50, 2.1, 1],
      [-8, 52, 4.2, 0],
    ];
    for (const [k, [dy, reach, p0, dim]] of tails.entries()) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 24; i++) {
        const s = i / 24;
        pts.push([50 - s * reach, 44 + dy * s * 0.75 + Math.sin(s * 5 - ph + p0) * 6 * s - Math.pow(s, 3) * 10]);
      }
      const tl = part((l) => l.tube(pts, (s) => (s < 0.35 ? lerp(4, 7, s / 0.35) : 7 * Math.pow((1 - s) / 0.65, 0.7)) + 0.5, 1), { flame: 5, dim, seed: 10 + k, mod: (x, y, d) => d * 0.9 });
      // Flow lines along the tail.
      const fl2 = new L(W, H);
      fl2.path(pts.slice(4, 22).map(([x, y], i) => [x, y + Math.sin(i * 0.8 - ph) * 2] as Pt), (x, y) => (tl.get(x, y) >= 4 ? 7 : null));
      fl2.render(c, C, { outline: null });
    }
    // Far legs, a shade darker.
    part((l) => {
      l.tube([[82, 55], [90, 66], [100, 70], [104, 69]], [4, 3.2, 2.5, 2.2], 1);
      l.tube([[48, 50], [42, 58], [31, 59], [27, 58]], [4.5, 3.4, 2.4, 2], 1);
    }, { dim: 1 });
    // Body, chest, neck and head.
    const body = part((l) => {
      l.ellipse(50, 47, 8.5, 8, 1);
      l.tube([[52, 46], [66, 45], [82, 47]], [8, 8.5, 10], 1);
      l.ellipse(85, 48, 11, 10, 1);
      l.tube([[88, 44], [97, 37]], [8, 7], 1);
      l.ellipse(99, 34, 9.5, 7.5, 1);
      l.poly([[103, 29], [117, 34], [125, 38], [122, 40.5], [105, 41]], 1);
      l.poly([[103, 43], [116, 45], [122, 49], [117, 50.5], [104, 47.5]], 1);
      l.poly([[91, 31], [86, 11], [99, 27]], 1);
      l.poly([[98, 28], [104, 9], [108, 30]], 1);
      l.tube([[52, 52], [44, 60], [34, 64], [28, 63]], [5, 3.8, 2.8, 2.2], 1);
    }, { flame: 4, seed: 5, mod: (x, y, d) => d * (0.62 + 0.5 * smooth(55, 105, x)) });
    // Chakra flow lines along the body.
    const flow = new L(W, H);
    for (let k = 0; k < 4; k++) {
      const pts: Pt[] = [];
      for (let x = 46; x <= 92; x += 2) pts.push([x, 40 + k * 3.5 + Math.sin(x * 0.18 - ph + k) * 1.5 + (x > 80 ? (x - 80) * -0.2 : 0)]);
      flow.path(pts, (x, y) => (body.get(x, y) >= 4 && body.get(x, y) <= 6 && fract(x / 9 + t + k * 0.3) < 0.55 ? 7 : null));
    }
    flow.render(c, C, { outline: null });
    // Near foreleg over the chest.
    part((l) => {
      l.tube([[88, 54], [98, 62], [110, 64], [116, 62]], [4.4, 3.4, 2.8, 2.4], 1);
      l.ellipse(116, 62.5, 3.4, 2.6, 1);
    });
    // Inner ears, mouth, fangs, nose, eye, cheek marks, claws.
    const face = new L(W, H);
    face.poly([[92, 28], [88.5, 16], [96, 26]], 3);
    face.poly([[100, 27], [104, 14], [106, 28]], 3);
    face.poly([[104, 41.5], [123, 40.5], [119, 44.5], [105, 44.5]], 0);
    face.poly([[110, 41], [112.5, 41], [111.2, 44.2]], 8);
    face.poly([[116, 40.6], [118.4, 40.6], [117.3, 43.5]], 8);
    face.poly([[109, 46], [111.4, 46], [110.2, 43.4]], 7);
    face.set(124, 37, 0);
    face.set(125, 37, 0);
    face.set(124, 38, 1);
    for (let k = 0; k < 3; k++) face.line(99 + k, 37 + k * 2, 103 + k, 37 + k * 2, 2);
    for (const [x, y] of [[118, 61], [119, 63], [105, 69]] as [number, number][]) face.set(x, y, 8);
    face.render(c, C, { outline: null });
    const eye = new L(W, H);
    eye.poly([[98, 30], [103, 28], [108, 29.5], [104, 32.5], [99, 32]], (x) => (x === 103 ? 0 : x < 102 ? 5 : 4));
    eye.render(c, GOLD, { outline: C[0] });
    // Wisps peeling off the back and tails (outside the body only).
    const wisps = new L(W, H);
    for (let i = 0; i < 10; i++) {
      const p0 = fract(rnd(31, i) + t);
      const x = 80 - rnd(32, i) * 72 - p0 * 16, y = 22 + rnd(33, i) * 50 - p0 * 16;
      wisps.ellipse(x, y, 2.3 * (1 - p0 * 0.6), 1.7 * (1 - p0 * 0.6), 1);
    }
    wisps.erase((x, y) => body.get(x, y) >= 0);
    energy(wisps, { cuts: [1], steps: [4, 6] });
    wisps.render(c, C);
    sparks(c, range(7).map((i) => {
      const p0 = fract(rnd(34, i) + t);
      return [96 - rnd(35, i) * 86 - p0 * 20, 14 + rnd(36, i) * 66, p0 < 0.4 ? 2 : 1];
    }));
    return c;
  });
  return sprite('beast', 'Chakra beast: fox spirit', [64, 48], { fly: loop(frames) });
}

/** One sealing-chain link: a hexagon ring seen face-on, or edge-on as a bar. */
function link(l: L, x: number, y: number, face: boolean): void {
  if (face) {
    const pts = range(6).map((k) => polar(x, y, 6.5, (k / 6) * TAU, 0.72));
    l.poly(pts, 4);
    const inner = range(6).map((k) => polar(x, y, 3.6, (k / 6) * TAU, 0.6));
    l.poly(inner, -1);
    l.path([pts[3], pts[4], pts[5], pts[0]], 5);
  } else {
    l.thick(x - 6, y, x + 6, y, 3.2, 3);
    l.line(x - 5, y - 1, x + 5, y - 1, 5);
  }
}

/** Stream: a chakra beam bound by a gold sealing chain (tileable). */
function stream(): WorldSprite {
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    const b = new L(64, 64);
    for (let x = 0; x < 64; x++) {
      const w = 6 + Math.sin((x / 64) * TAU * 2 - t * TAU) * 1.2 + Math.sin((x / 64) * TAU * 3 + t * TAU * 2) * 0.8;
      for (let y = Math.floor(32 - w); y <= Math.ceil(32 + w); y++) if (Math.abs(y + 0.5 - 32) <= w) b.set(x, y, 1);
    }
    energy(b, { cuts: [1, 2, 3, 4, 5], steps: [2, 3, 4, 5, 6, 8], wrapX: true });
    b.render(c, C, { wrapX: true });
    // Chain sliding along the beam.
    const ch = new L(64, 64);
    const shift = t * 32;
    for (let k = -1; k < 5; k++) {
      const x = k * 16 + 8 + shift;
      for (const ox of [-64, 0, 64]) link(ch, x + ox, 32, k % 2 === 0);
    }
    ch.render(c, GOLD, { wrapX: true });
    streaks(c, range(4).map((i) => {
      const x = (rnd(41, i) * 64 + t * 64) % 64;
      return [x - 8, x, i % 2 ? 22 : 42] as [number, number, number];
    }));
    sparks(c, range(3).map((i) => [(rnd(42, i) * 64 + t * 64) % 64, 32 + (i - 1) * 13, 1]));
    return c;
  });
  return sprite('stream', 'Chakra stream: chained beam (tileable)', [0, 32], { fly: loop(frames) });
}

/** Stream head: a kunai of chakra leading the chain, a seal ring turning around its base. */
function streamHead(): WorldSprite {
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    const b = new L(64, 64);
    b.tube([[0, 32], [24, 32]], [6, 6], 1);
    energy(b, { cuts: [1, 2, 3, 4, 5], steps: [2, 3, 4, 5, 6, 8] });
    b.render(c, C);
    const ch = new L(64, 64);
    for (let k = 0; k < 2; k++) link(ch, k * 16 + 4 + t * 16 * 0, 32, k % 2 === 0);
    ch.render(c, GOLD);
    const blade = new L(64, 64);
    blade.poly([[24, 32], [34, 23], [58, 32], [34, 41]], 1);
    blade.thick(18, 32, 26, 32, 5, 1);
    const fl = flames(blade, t, { len: 4, dir: [-1, 0], seed: 9, thr: 0.38 });
    energy(fl, { cuts: [1, 2, 3, 4, 5.5], steps: [2, 3, 5, 6, 7, 8] });
    fl.render(c, C);
    const edge = new L(64, 64);
    edge.line(35, 25, 56, 32, 8);
    edge.render(c, C, { outline: null });
    // Seal ring around the base (back half, then front half).
    sealRing(c, 25, 32, 9, 1, (f / N) * TAU, { width: 2 });
    const tick = new L(64, 64);
    for (let k = 0; k < 4; k++) {
      const p = polar(25, 32, 8, (f / N) * (TAU / 2) + (k * TAU) / 4);
      tick.set(p[0], p[1], 5);
    }
    tick.render(c, GOLD, { outline: null });
    sparks(c, range(4).map((i) => {
      const a = (i / 4) * TAU + t * TAU;
      const p = polar(54, 32, 6 + (i % 2) * 3, a);
      return [p[0], p[1], i % 2];
    }));
    return c;
  });
  return sprite('stream_head', 'Chakra stream head: chakra kunai', [32, 32], { fly: loop(frames) });
}

/** A palm imprint (fingers up) mask centered at (x, y), height h. */
function palm(l: L, x: number, y: number, h: number, v: number): void {
  const u = h / 40;
  l.ellipse(x, y + 6 * u, 9 * u, 10 * u, v);
  const fingers: [number, number, number][] = [
    [-6, 14, -0.12],
    [-2, 17, -0.03],
    [2.5, 16, 0.05],
    [6.5, 12, 0.14],
  ];
  for (const [dx, len, a] of fingers) {
    const b: Pt = [x + dx * u, y - 1 * u];
    const tip = rot([b[0], b[1] - len * u], a, b);
    l.thick(b[0], b[1], tip[0], tip[1], 4.4 * u, v);
  }
  const tb: Pt = [x - 8 * u, y + 8 * u];
  const tt = rot([tb[0], tb[1] - 11 * u], -0.75, tb);
  l.thick(tb[0], tb[1], tt[0], tt[1], 4.6 * u, v);
}

/** Breath: a gentle-fist palm wave: a cone of chakra pressure with a giant palm imprint at its front. */
function breath(): WorldSprite {
  const ox = 2, oy = 32;
  const frames = range(N).map((f) => {
    const c = new Canvas(96, 64), t = f / N;
    const cone = new L(96, 64);
    cone.fill((x, y) => {
      const dx = x + 0.5 - ox, dy = y + 0.5 - oy;
      if (dx < 0) return false;
      const a = Math.atan2(dy, dx);
      return Math.abs(a) < 0.42 + Math.sin(dx * 0.3 - t * TAU) * 0.03 && dx < 92;
    }, 1);
    energy(cone, { cuts: [1, 2.5, 4.5, 7, 10], steps: [2, 3, 4, 5, 6, 7], mod: (x, y, d) => d * (1.2 - x / 140) });
    cone.render(c, C, { alpha: (v) => (v <= 3 ? 170 : 225), outlineAlpha: 190 });
    // Pressure rings rolling outward.
    for (let k = 0; k < 4; k++) {
      const r = 10 + (k + t) * 22;
      if (r > 90) continue;
      const l = new L(96, 64);
      for (let a = -0.42; a <= 0.42; a += 0.5 / r) for (let d = 0; d < 2; d += 0.5) {
        const p = polar(ox, oy, r + d, a);
        l.set(p[0], p[1], d < 1 ? 8 : 6);
      }
      l.render(c, C, { outline: C[3] });
    }
    // The palm imprint, pulsing.
    const pl = new L(96, 64);
    palm(pl, 74 + Math.sin(t * TAU) * 1, 30, 42, 1);
    energy(pl, { cuts: [1, 2, 3, 4.5], steps: [3, 5, 6, 7, 8] });
    pl.render(c, C);
    const lines = new L(96, 64);
    lines.line(68, 37, 80, 34, 3);
    lines.line(67, 40, 78, 40, 3);
    lines.render(c, C, { outline: null });
    streaks(c, range(6).map((i) => {
      const a = (rnd(51, i) - 0.5) * 0.6;
      const s0 = 6 + fract(rnd(52, i) + t) * 60;
      const p = polar(ox, oy, s0, a);
      return [p[0], p[0] + 10, Math.round(p[1])] as [number, number, number];
    }));
    const core = new L(96, 64);
    core.disc(ox + 2, oy, 6, 1);
    energy(core, { cuts: [1, 2, 3], steps: [5, 6, 7, 8] });
    core.render(c, C);
    return c;
  });
  return sprite('breath', 'Chakra breath: gentle-fist palm wave', [0, 32], { fly: loop(frames) });
}

/** Sphere: a spiral sphere: churning arms of chakra inside, a ring of wind tearing around it. */
function sphere(): WorldSprite {
  const cx = 34, cy = 32, R = 15.5;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N, spin = t * (TAU / 3);
    streaks(c, [[0, 20, 10], [1, 44, 9], [2, 27, 7]].map(([k, yy, len]) => {
      const x = cx - 20 - fract(t + k * 0.37) * 12;
      return [x - len, x, yy] as [number, number, number];
    }));
    const ring = (front: boolean): void => {
      const l = new L(64, 64);
      for (let a = 0; a < TAU; a += 0.01) {
        if (Math.sin(a) > 0 !== front) continue;
        if (fract((a / TAU) * 4 - t) > 0.68) continue;
        const p = rot([cx + Math.cos(a) * 23, cy + Math.sin(a) * 7], -0.25, [cx, cy]);
        l.set(p[0], p[1], front ? 8 : 5);
        l.set(p[0] - 1, p[1], front ? 6 : 4);
      }
      l.render(c, C, { outline: front ? C[2] : C[1] });
    };
    ring(false);
    const orb = new L(64, 64);
    orb.disc(cx, cy, R, 1);
    orb.bands([1, 2, 3.5, 5.5, 8], [2, 3, 4, 5, 6, 7]);
    // Spiral arms.
    orb.map((v, x, y) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy) / R;
      const arm = fract((Math.atan2(dy, dx) - spin) / (TAU / 3) - d * 0.9);
      if (d < 0.22) return 8;
      if (arm < 0.16) return d < 0.6 ? 8 : 7;
      if (arm < 0.26) return Math.max(v, 6);
      return v;
    });
    orb.render(c, C);
    ring(true);
    sparks(c, range(5).map((i) => {
      const a = (i / 5) * TAU + t * TAU * 0.6;
      const p = polar(cx, cy, R + 4 + (i % 2) * 3, a);
      return [p[0], p[1], i % 3 === 0 ? 2 : 1];
    }));
    return c;
  });
  return sprite('sphere', 'Chakra sphere: spiral sphere', [32, 32], { fly: loop(frames) });
}

/** Slash: a crescent blade of chakra, a white cutting edge, gold seal glyphs along its spine. */
function slash(): WorldSprite {
  const ox = 18, oy = 32, R = 26, ix = 9, Ri = 25;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    const arcs = new L(64, 64);
    for (let j = 0; j < 3; j++) {
      const rr = R - 5 - j * 3.5, ax = ox - 4 - j * 4.5;
      const span = 1.3 - j * 0.22;
      for (let a = -span; a <= span; a += 0.01) {
        if (fract(a * 2.6 + t + j * 0.37) > 0.7) continue;
        const p = polar(ax, oy, rr, a);
        arcs.set(p[0], p[1], Math.abs(a) < span * 0.5 ? 7 : 5);
      }
    }
    arcs.render(c, C, { outline: null });
    const l = new L(64, 64);
    l.fill((x, y) => R - Math.hypot(x + 0.5 - ox, y + 0.5 - oy) > 0 && Math.hypot(x + 0.5 - ix, y + 0.5 - oy) - Ri > 0, 1);
    const fl = flames(l, t, { len: 3, dir: [-1, 0], seed: 21, thr: 0.4 });
    energy(fl, { cuts: [1, 1.8, 2.8, 4], steps: [2, 3, 5, 6, 7] });
    fl.map((v, x, y) => (R - Math.hypot(x + 0.5 - ox, y + 0.5 - oy) < 1.3 && l.get(x, y) >= 0 ? 8 : v));
    fl.render(c, C);
    const gl = new L(64, 64);
    for (let k = 0; k < 4; k++) {
      const a = lerp(-0.75, 0.75, k / 3);
      const p = polar(ox, oy, R - 6, a);
      glyph(gl, p[0], p[1], 60 + k + (f % 2) * 7, 4);
    }
    gl.render(c, GOLD);
    sparks(c, range(4).map((i) => {
      const ph = fract(rnd(61, i) + t);
      const p = polar(ox - ph * 14, oy, R + 1, lerp(-1.2, 1.2, rnd(62, i)));
      return [p[0], p[1], ph < 0.4 ? 1 : 0];
    }));
    return c;
  });
  return sprite('slash', 'Chakra slash: glyph crescent', [32, 32], { fly: loop(frames) });
}

/** Hit: a white flash, a hexagram seal snapping open, a shock ring and sparks. */
function hit(): WorldSprite {
  const cx = 32, cy = 32;
  const frames = range(6).map((f) => {
    const c = new Canvas(64, 64);
    if (f <= 1) {
      const l = new L(64, 64);
      l.disc(cx, cy, f ? 11 : 7, 1);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + 0.2;
        const p = polar(cx, cy, (f ? 22 : 15) * (k % 2 ? 0.7 : 1), a);
        l.thick(cx, cy, p[0], p[1], k % 2 ? 2.5 : 3.5, 1);
      }
      energy(l, { cuts: [1, 1.8, 2.6, 3.6], steps: [4, 5, 6, 7, 8] });
      l.render(c, C);
    }
    if (f >= 1 && f <= 4) {
      const r = [0, 12, 16, 18, 19][f];
      const disc = new L(64, 64);
      disc.disc(cx, cy, r - 2, 1);
      disc.bands([1, 2.5], [3, 4, 5]);
      disc.render(c, C, { alpha: f >= 3 ? 150 : 210, outlineAlpha: f >= 3 ? 150 : 210 });
      const hx = new L(64, 64);
      hexagram(hx, cx, cy, r - 3, f * 0.25, f >= 3 ? 6 : 8);
      hx.render(c, C, { outline: null, alpha: f >= 4 ? 180 : 255 });
      sealRing(c, cx, cy, r, 1, f * 0.3, { width: 2, glyphs: f >= 2 ? 6 : 0, alpha: f >= 4 ? 180 : 255 });
    }
    if (f >= 2) {
      const rr = [0, 0, 22, 26, 29, 31][f];
      const ring = new L(64, 64);
      ring.disc(cx, cy, rr, 1);
      ring.erase((x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < rr - (f < 4 ? 2 : 1.2));
      ring.map(() => (f < 4 ? 7 : 5));
      ring.render(c, C, { alpha: f >= 5 ? 160 : 255, outlineAlpha: f >= 5 ? 160 : 255 });
      sparks(c, range(10).map((k) => {
        const p = polar(cx, cy, 8 + f * 5 + rnd(71, k) * 4, (k / 10) * TAU + rnd(72, k) * 0.4);
        return [p[0], p[1], f < 4 ? 2 : f < 5 ? 1 : 0];
      }));
    }
    return c;
  });
  return sprite('hit', 'Chakra hit: hexagram burst', [32, 32], { hit: once(frames, 15) });
}

/** Blast: a sealing circle draws itself on the ground, a pillar of chakra erupts and fades. */
function blast(): WorldSprite {
  const W = 176, H = 144, ax = 88, ay = 88, rx = 80, ry = 53;
  const frames = range(8).map((f) => {
    const c = new Canvas(W, H);
    const draw = [0.35, 0.75, 1, 1, 1, 1, 1, 1][f];
    const fade = [255, 255, 255, 240, 220, 200, 160, 110][f];
    // Sealing circle: outer and inner gold rings, glyph band, a hexagram of light.
    const g = new L(W, H);
    const ringBand = (r: number, w: number, v: number): void => {
      g.fill((x, y) => {
        const u = (x + 0.5 - ax) / rx, vv = (y + 0.5 - ay) / ry;
        const d = Math.sqrt(u * u + vv * vv);
        const a = fract(Math.atan2(vv, u) / TAU + 0.25);
        return d <= r && d >= r - w && a <= draw;
      }, v);
    };
    ringBand(0.98, 0.04, 3);
    ringBand(0.8, 0.03, 3);
    ringBand(0.5, 0.03, 4);
    g.render(c, GOLD, { alpha: fade, outlineAlpha: fade });
    const gl = new L(W, H);
    const ng = Math.round(16 * draw);
    for (let k = 0; k < ng; k++) {
      const p = polar(ax, ay, rx * 0.89, (k / 16) * TAU - Math.PI / 2 + f * 0.05, ry / rx);
      glyph(gl, p[0], p[1], 80 + k, 4);
    }
    gl.render(c, GOLD, { alpha: fade, outlineAlpha: fade });
    if (f >= 1) {
      const hx = new L(W, H);
      hexagram(hx, ax, ay, rx * 0.78, f * 0.06, 7, ry / rx);
      hexagram(hx, ax, ay, rx * 0.48, -f * 0.08, 6, ry / rx);
      hx.render(c, C, { outline: C[3], alpha: fade, outlineAlpha: fade });
    }
    // Pillar.
    const ph = [0, 0, 70, 76, 76, 62, 36, 0][f];
    const pw = [0, 0, 16, 20, 17, 11, 6, 0][f];
    if (ph) {
      const l = new L(W, H);
      l.fill((x, y) => {
        const top = ay - ph;
        if (y > ay + 4 || y < top - pw * 0.6) return false;
        const hw = pw * (y < top ? Math.sqrt(Math.max(0, 1 - ((top - y) / (pw * 0.6)) ** 2)) : 1) * (1 + 0.15 * Math.sin(y * 0.35 + f * 1.3));
        return Math.abs(x + 0.5 - ax) <= hw;
      }, 1);
      l.ellipse(ax, ay, pw + 12, (pw + 12) * 0.38, 1);
      const fl = flames(l, f / 8, { len: 6, dir: [0, -1], seed: 33 });
      energy(fl, { cuts: [1, 2, 3.2, 4.8, 7, 10], steps: [2, 3, 4, 5, 6, 7, 8] });
      fl.render(c, C);
      // Spiral streaks wrapping the pillar.
      const sl = new L(W, H);
      for (let k = 0; k < 2; k++) {
        let prev: Pt | null = null;
        for (let y = ay - ph + 4; y < ay - 2; y += 1) {
          const a = (y / 16) * TAU + f * 0.9 + k * Math.PI;
          const p: Pt = [ax + Math.cos(a) * (pw + 2), y];
          if (Math.sin(a) > 0 && prev) sl.line(prev[0], prev[1], p[0], p[1], 8);
          prev = p;
        }
      }
      sl.render(c, C, { outline: null });
    }
    if (f === 1) {
      const l = new L(W, H);
      l.ellipse(ax, ay, 16, 6, 1);
      energy(l, { cuts: [1, 2, 3], steps: [5, 6, 7, 8] });
      l.render(c, C);
    }
    // Hex chips rising.
    if (f >= 2 && f <= 7) {
      const hl = new L(W, H);
      for (let k = 0; k < 14; k++) {
        const a = rnd(91, k) * TAU;
        const d = 0.3 + rnd(92, k) * 0.6;
        const rise = (f - 2) * (6 + rnd(93, k) * 6);
        const x = ax + Math.cos(a) * rx * d, y = ay + Math.sin(a) * ry * d - rise;
        hl.poly(range(6).map((j) => polar(x, y, 2.6, (j / 6) * TAU)), k % 3 ? 6 : 7);
      }
      hl.render(c, C, { alpha: f >= 6 ? 170 : 255, outlineAlpha: f >= 6 ? 170 : 255 });
    }
    if (f >= 2 && f <= 6) sparks(c, range(10).map((k) => [ax + (rnd(94, k, f) - 0.5) * 120, ay - rnd(95, k, f) * 100, k % 3 === 0 ? 2 : 1]));
    return c;
  });
  return sprite('blast', 'Chakra blast: sealing circle and pillar', [ax, ay], { blast: once(frames, 12) });
}

const WW = 272, WH = 128, WGY = 120, WALL_H = 103, WALL_W = 257;

/** Seal barrier art: glowing honeycomb up to height `hk` (0..1), a crest of chakra on top, gold seal base. */
function barrier(c: Canvas, hk: number, sh: number, f: number, t: number): void {
  const x0 = (WW - WALL_W) / 2, x1 = x0 + WALL_W, top = WGY - WALL_H;
  const cell = 9;
  const lim = WGY - WALL_H * hk;
  const crest = (x: number): number => lim + 2 + Math.sin((x / WW) * TAU * 4 - t * TAU) * 1.6;
  const mask = new L(WW, WH);
  mask.fill((x, y) => x >= x0 + 5 && x < x1 - 5 && y >= crest(x) && y <= WGY - 6, 1);
  const fl = flames(mask, t, { len: 5, dir: [0, -1], seed: 61, thr: 0.5 });
  const fillL = new L(WW, WH), edge = new L(WW, WH);
  for (let y = 0; y <= WGY; y++)
    for (let x = Math.floor(x0); x < x1; x++) {
      if (fl.get(x, y) < 0) continue;
      const q = (x - x0) / (cell * 1.732), r = (y - top) / (cell * 1.5);
      const row = Math.round(r);
      const col = Math.round(q - (row % 2 ? 0.5 : 0));
      let best = Infinity, b2 = Infinity, bid = 0, bx = 0, by = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = row + dr, cc = col + dc;
          const cx = x0 + (cc + (rr % 2 ? 0.5 : 0)) * cell * 1.732, cy = top + rr * cell * 1.5;
          const d = Math.max(Math.abs(x + 0.5 - cx) * 0.866 + Math.abs(y + 0.5 - cy) * 0.5, Math.abs(y + 0.5 - cy));
          if (d < best) {
            b2 = best;
            best = d;
            bid = rr * 100 + cc;
            bx = cx;
            by = cy;
          } else if (d < b2) b2 = d;
        }
      const sweep = Math.abs(x - (sh * (WW + 60) - 30) + (WGY - y) * 0.4);
      const fromTop = y - crest(x);
      if (fromTop < 1.5) {
        fillL.set(x, y, 8);
        continue;
      }
      if (fromTop < 3) {
        fillL.set(x, y, 7);
        continue;
      }
      if (b2 - best < 1.2) {
        const node = b2 - best < 0.5 && best > cell * 0.7;
        edge.set(x, y, node || sweep < 8 ? 8 : 6);
      } else {
        const lit = (x + 0.5 - bx) + (y + 0.5 - by) < -cell * 0.55;
        let v = (WGY - y) < 30 ? 4 : 3;
        if (lit) v += 1;
        if (best < 1.6 && rnd(101, bid, f % 3) < 0.35) v = 7;
        if (sweep < 7) v += 2;
        fillL.set(x, y, Math.min(8, v));
      }
    }
  fillL.render(c, C, { outline: null, alpha: (v, x, y) => (v >= 7 ? 240 : Math.round(lerp(175, 95, clamp((WGY - y) / WALL_H, 0, 1))) + (v >= 5 ? 40 : 0)) });
  edge.render(c, C, { outline: C[3], alpha: 235, outlineAlpha: 130 });
  // Crest tongues.
  const tongues = fl.clone();
  tongues.erase((x, y) => mask.get(x, y) >= 0);
  tongues.map(() => 6);
  tongues.render(c, C, { outline: C[3], alpha: 220, outlineAlpha: 160 });
  // Gold seal base with glyphs, and the two seal posts.
  const band = new L(WW, WH);
  band.fill((x, y) => x >= x0 && x < x1 && y >= WGY - 7 && y <= WGY, (x, y) => (y === WGY - 7 || y === WGY ? 4 : 2));
  for (const px of [x0, x1 - 6]) band.fill((x, y) => x >= px && x < px + 6 && y >= Math.min(lim, WGY - 10) - 4 && y <= WGY, (x, y) => (x === px || x === px + 5 ? 2 : (y % 8 === 0 ? 4 : 3)));
  band.render(c, GOLD);
  const gl = new L(WW, WH);
  for (let k = 0; k < 19; k++) glyph(gl, x0 + 12 + ((k * 13 + f * 2) % (WALL_W - 22)), WGY - 3.5, 110 + k, 5);
  gl.render(c, GOLD, { outline: null });
  for (const px of [x0 + 7, x1 - 14]) {
    const tag = new L(WW, WH);
    const ty = Math.max(lim + 6, WGY - 40);
    tag.fill((x, y) => x >= px && x < px + 7 && y >= ty && y < ty + 16, (x, y) => (x === px || x === px + 6 ? 3 : 5));
    glyph(tag, px + 3.5, ty + 5, 170, 1);
    glyph(tag, px + 3.5, ty + 11, 171, 2);
    tag.render(c, GOLD);
  }
}

/** Wall: a honeycomb seal barrier assembling cell row by cell row ('rise'), then shimmering ('idle'). */
function wall(): WorldSprite {
  const rise = range(6).map((f) => {
    const c = new Canvas(WW, WH);
    barrier(c, [0.15, 0.4, 0.65, 0.88, 1, 1][f], 0.5, f, f / 6);
    sparks(c, range(14).map((k) => [12 + rnd(201, k, f) * 248, WGY - WALL_H * [0.15, 0.4, 0.65, 0.88, 1, 1][f] + (rnd(202, k, f) - 0.5) * 10, k % 3 === 0 ? 2 : 1]));
    return c;
  });
  const idle = range(N).map((f) => {
    const c = new Canvas(WW, WH);
    barrier(c, 1, f / N, f, f / N);
    sparks(c, range(4).map((k) => [20 + ((rnd(203, k) * 232 + (f / N) * 232) % 232), WGY - 20 - rnd(204, k) * 70, 1]));
    return c;
  });
  return sprite('wall', 'Chakra wall: seal barrier', [WW / 2, WGY], { rise: once(rise, 12), idle: loop(idle, 8) });
}

/** Aura: chakra flame tongues licking up both sides, a gold seal ring turning at the feet, sparks. */
function aura(): WorldSprite {
  const W = 80, H = 120, ax = 40, ay = 112;
  const frames = range(6).map((f) => {
    const c = new Canvas(W, H), t = f / 6;
    sealRing(c, ax, ay, 33, 0.25, t * (TAU / 6), { width: 2.5, glyphs: 0 });
    const tick = new L(W, H);
    for (let k = 0; k < 12; k++) {
      const p = polar(ax, ay, 30, (k / 12) * TAU + t * (TAU / 6), 0.25);
      tick.set(p[0], p[1], 4);
      tick.set(p[0] + 1, p[1], 3);
    }
    tick.render(c, GOLD, { outline: null });
    for (const side of [-1, 1]) {
      const l = new L(W, H);
      for (let k = 0; k < 3; k++) {
        const pts: Pt[] = [];
        for (let i = 0; i <= 20; i++) {
          const s = i / 20;
          const sway = Math.sin(s * 5.5 - t * TAU + k * 2.1 + (side > 0 ? 1 : 0)) * (2.5 + s * 3.5);
          pts.push([ax + side * (25 + k * 3 - s * 5) + sway, ay - 3 - s * (64 + k * 16)]);
        }
        l.tube(pts, (s) => (4.4 - k * 0.8) * (1 - s) + 0.6, 1);
      }
      const fl = flames(l, t, { len: 4, dir: [0, -1], seed: 40 + side, thr: 0.45 });
      energy(fl, { cuts: [1, 2, 3.2, 4.4], steps: [2, 4, 5, 6, 7] });
      fl.render(c, C, { alpha: (v) => (v >= 5 ? 245 : 210), outlineAlpha: 210 });
    }
    sparks(c, range(10).map((k) => {
      const ph = fract(rnd(301, k) + t);
      return [ax + (k % 2 ? 1 : -1) * (19 + rnd(302, k) * 14), ay - 6 - ph * 100, ph < 0.4 ? 2 : ph < 0.8 ? 1 : 0];
    }));
    return c;
  });
  return sprite('aura', 'Chakra aura: chakra flames and seal ring', [ax, ay], { idle: loop(frames, 10) });
}

export function buildChakra(): WorldSprite[] {
  return [bolt(), beast(), stream(), streamHead(), breath(), sphere(), slash(), multi(), hit(), blast(), wall(), aura()];
}
