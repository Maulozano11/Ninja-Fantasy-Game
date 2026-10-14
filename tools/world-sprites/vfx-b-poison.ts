// Poison effects: venom. An acid gob, a venom cobra, an acid jet, a toxic cloud, an acid
// bubble, a fang strike, venom drops, a splat, a bubbling puddle with a toxic geyser (the
// hydra venom), a mist curtain and a fume aura.
// Palette: very dark green, forest green, toxic green, acid yellow-green, pale lime, white-lime,
// with a sickly purple accent.

import { Anim, Canvas, WorldSprite } from './kit';
import { L, Pt, Puff, TAU, clamp, fract, gasLayer, lerp, pal, pnoise, polar, puffs, rnd, rot, smooth, fadeLeft } from './vfx-b-lib';
import { DPM, HGT, LEN, Orient, PPM, orientations, proj } from './vfx-b-wall3d';

/** 0 outline, 1 very dark green, 2 deep green, 3 forest, 4 green, 5 toxic green, 6 acid yellow-green, 7 pale lime, 8 white-lime. */
export const P = pal('#0a1f0e', '#123e18', '#1b5e22', '#247e2a', '#36a42c', '#58c82a', '#9ee22c', '#d6f772', '#f6ffd4');
/** Sickly purple accent: 0 outline .. 5 light. */
const PUR = pal('#1e0a28', '#3e1656', '#642a86', '#8c44ae', '#b474d6', '#dcaaf0');
/** Fang bone: 0 outline .. 5 white. */
const BONE = pal('#1c2214', '#4e5638', '#8a9068', '#c2c49a', '#e8e6c4', '#fffef0');

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

/**
 * Liquid shading: bands by inset distance (dark rim, toxic body, acid core), a bright rim of
 * reflected light along the lower edge and white-lime highlights where the light hits the
 * upper-left edge.
 */
function liquid(l: L, o: { cuts?: number[]; steps?: number[]; wrapX?: boolean; shine?: boolean } = {}): L {
  const src = l.clone();
  l.bands(o.cuts ?? [1, 2, 3.2, 4.6, 6.5], o.steps ?? [2, 3, 4, 5, 6, 6], { jitter: 0.3, seed: 17, wrapX: o.wrapX }).clean(1, o.wrapX);
  if (o.shine !== false) {
    const g = (x: number, y: number) => (o.wrapX ? src.get(((x % l.w) + l.w) % l.w, y) : src.get(x, y));
    for (let y = 0; y < l.h; y++)
      for (let x = 0; x < l.w; x++) {
        if (src.get(x, y) < 0) continue;
        // Upper-left lit lip, two pixels in.
        if (g(x - 1, y - 1) < 0 && g(x, y - 1) < 0 && g(x, y + 1) >= 0) l.set(x, y + 1, 7);
        if (g(x, y + 1) < 0 && g(x, y - 2) >= 0) l.set(x, y - 1, 5);
      }
  }
  return l;
}

/** A specular highlight: a small white-lime crescent at the upper left of a blob. */
function shine(l: L, x: number, y: number, r: number): void {
  l.ellipse(x - r * 0.38, y - r * 0.42, Math.max(1, r * 0.3), Math.max(0.8, r * 0.18), 8);
  if (r > 5) l.set(x - r * 0.62, y - r * 0.05, 7);
}

/** Bubble rings inside liquid. */
function bubbles(c: Canvas, list: [number, number, number][], o: { purple?: boolean; alpha?: number } = {}): void {
  const l = new L(c.w, c.h);
  for (const [x, y, r] of list) {
    if (r < 1) {
      l.set(x, y, 7);
      continue;
    }
    l.disc(x, y, r, 4);
    l.erase((px, py) => Math.hypot(px + 0.5 - x, py + 0.5 - y) < r - 1);
    l.set(x - r * 0.4, y - r * 0.4, 8);
  }
  if (o.purple) l.map((v) => (v === 4 ? 4 : 5));
  l.render(c, o.purple ? PUR : P, { outline: null, alpha: o.alpha });
}

/** A falling drop: a round bottom and a pointed top (teardrop), length `len`. */
function drop(l: L, x: number, y: number, r: number, len: number, ang = Math.PI / 2): void {
  const tail = polar(x, y, len, ang + Math.PI);
  l.tube([tail, [x, y]], [0.3, r * 0.75], 1);
  l.disc(x, y, r, 1);
}

/** Drops layer rendered with liquid shading. */
function drops(c: Canvas, list: [number, number, number, number][], o: { purple?: boolean; alpha?: number } = {}): void {
  const l = new L(c.w, c.h);
  for (const [x, y, r, len] of list) drop(l, x, y, Math.max(1.5, r), len);
  l.bands([1, 2], [6, 7, 8]);
  for (const [x, y, r] of list) if (r >= 1.5) l.set(x - r * 0.4, y - r * 0.4, 8);
  l.render(c, o.purple ? PUR : P, { alpha: o.alpha, outlineAlpha: o.alpha });
}

/** Toxic fumes: green lobes, optionally purple. */
function fumes(c: Canvas, list: Puff[], o: { seed?: number; alpha?: number; purple?: boolean; steps?: number[]; wrapX?: boolean } = {}): void {
  const l = new L(c.w, c.h);
  puffs(l, list, { steps: o.steps ?? (o.purple ? [1, 2, 3, 4, 5] : [2, 3, 4, 5, 6, 7]), rim: o.purple ? 1 : 2, seed: o.seed ?? 3, wobble: 0.45, wrapX: o.wrapX });
  l.clean(1, o.wrapX);
  l.render(c, o.purple ? PUR : P, { alpha: o.alpha, outlineAlpha: o.alpha, wrapX: o.wrapX });
}

/** Speed streaks [x tail, x head, y]. */
function streaks(c: Canvas, list: [number, number, number][]): void {
  const l = new L(c.w, c.h);
  for (const [a, b, y] of list) l.line(a, y, b, y, (x) => (x > (a + b) / 2 ? 7 : x > a + (b - a) * 0.25 ? 6 : 4));
  l.render(c, P, { outline: null });
}

/** Toxic gas volume (see gasLayer), outlined in the darkest green or purple. */
function gas(c: Canvas, density: (x: number, y: number) => number, t: number, o: { seed?: number; thr?: number; alpha?: number; purple?: boolean; steps?: number[]; base?: number; amp?: number; scale?: number } = {}): L {
  const l = gasLayer(c.w, c.h, density, t, { seed: o.seed, thr: o.thr, base: o.base, amp: o.amp, scale: o.scale, steps: o.steps ?? (o.purple ? [1, 2, 3, 4] : [2, 3, 4, 5, 6, 7]) });
  l.render(c, o.purple ? PUR : P, { alpha: o.alpha, outlineAlpha: o.alpha });
  return l;
}

/** Irregular blob mask (radius wobbling with angle, loopable over t). */
function blob(l: L, cx: number, cy: number, r: number, wob: number, seed: number, t = 0, sx = 1, sy = 1): void {
  l.fill((x, y) => {
    const dx = (x + 0.5 - cx) / sx, dy = (y + 0.5 - cy) / sy;
    const a = Math.atan2(dy, dx);
    const k = pnoise(((a / TAU) * 32 + 32 + t * 32) % 32, seed, 4, 32, seed) - 0.5;
    return Math.hypot(dx, dy) <= r * (1 + k * wob);
  }, 1);
}

// --- roles ----------------------------------------------------------------------------------

/** Bolt: a dripping acid gob, its tail stretching back, drops falling, bubbles inside. */
function bolt(): WorldSprite {
  const cx = 40, cy = 31;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N, ph = t * TAU;
    fumes(c, range(4).map((i) => {
      const s = (3 - i) + t;
      return { x: cx - 14 - s * 5.2, y: cy - 7 - s * 1.5, r: Math.max(0, 4 - s * 0.95), steps: s < 2 ? [2, 3, 4, 5] : [1, 2, 3] };
    }), { purple: true, seed: 3, alpha: 220 });
    streaks(c, [[0, 20, 10], [1, 44, 9], [2, 24, 7]].map(([k, yy, len]) => {
      const x = cx - 14 - fract(t + k * 0.37) * 11;
      return [x - len, x, yy] as [number, number, number];
    }));
    const l = new L(64, 64);
    blob(l, cx, cy, 9.5, 0.22, 5, t);
    const tail: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const s = i / 14;
      tail.push([cx - 4 - s * 26, cy + 1 + Math.sin(s * 4 - ph) * 2 * s + s * s * 4]);
    }
    l.tube(tail, (s) => 7 * Math.pow(1 - s, 0.8) + 0.5, 1);
    // Hanging drips under the gob and the tail.
    for (const [k, x0] of [[0, cx - 3], [1, cx - 14], [2, cx - 22]] as [number, number][]) {
      const len = 4 + ((f + k * 2) % N) * 1.2;
      const b = tail[Math.min(14, Math.round(((cx - x0) / 26) * 14))] ?? [x0, cy];
      l.tube([[x0, b[1] + 3], [x0, b[1] + 3 + len]], [1.6, 1.2], 1);
      l.disc(x0, b[1] + 3 + len, 1.8, 1);
    }
    liquid(l);
    shine(l, cx, cy, 9.5);
    l.render(c, P);
    bubbles(c, [[cx + 2, cy + 3, 2], [cx - 5, cy - 1, 1.5], [cx - 12, cy + 2, 1]]);
    bubbles(c, [[cx + 4, cy - 4, 1.2]], { purple: true });
    drops(c, range(4).map((i) => {
      const p0 = fract(rnd(11, i) + t);
      return [cx - 8 - rnd(12, i) * 20 - p0 * 8, cy + 10 + p0 * 18, 1.4 + rnd(13, i), 2 + p0 * 3] as [number, number, number, number];
    }));
    return c;
  });
  return sprite('bolt', 'Poison bolt: acid gob', [32, 32], { fly: loop(frames) });
}

/** Multi: three venom drops flying in a staggered fan, droplet trails behind. */
function multi(): WorldSprite {
  const fan: [number, number, number][] = [
    [38, 16, -0.18],
    [48, 32, 0],
    [36, 48, 0.18],
  ];
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    for (const [k, [x, y, a]] of fan.entries()) {
      const l = new L(64, 64);
      const tip = rot([x - 18, y + Math.sin((t + k / 3) * TAU) * 1], a, [x, y]);
      l.tube([tip, rot([x - 6, y], a, [x, y]), [x, y]], [0.4, 3.6, 5], 1);
      l.disc(x, y, 5.2, 1);
      liquid(l, { cuts: [1, 2, 3, 4], steps: [2, 3, 5, 6, 7] });
      shine(l, x, y, 5.2);
      l.render(c, P);
      bubbles(c, [[x - 1, y + 1, 1.2]], { purple: true });
      drops(c, range(3).map((i) => {
        const p0 = fract(rnd(21 + k, i) + t);
        const p = rot([x - 20 - p0 * 11, y + (i - 1) * 3 + p0 * 3], a, [x, y]);
        return [p[0], p[1], 1.2 * (1 - p0 * 0.5), 1.5] as [number, number, number, number];
      }));
    }
    return c;
  });
  return sprite('multi', 'Poison multi: venom drops', [32, 32], { fly: loop(frames) });
}

/** Beast: a venom cobra of living poison: flared hood, fangs dripping, purple markings, drops falling. */
function beast(): WorldSprite {
  const W = 136, H = 96;
  const frames = range(N).map((f) => {
    const c = new Canvas(W, H), t = f / N, ph = t * TAU;
    const spine = (s: number): Pt => {
      const amp = 9 * smooth(10, 36, s);
      return [84 - s, 52 + amp * Math.sin(s * 0.11 - ph) + smooth(30, 84, s) * 4];
    };
    const rad = (s: number): number => lerp(11.5, 2.2, clamp(s / 84, 0, 1) ** 0.85);
    fumes(c, range(3).map((i) => {
      const q = 2 - i + t;
      const p = spine(76);
      return { x: p[0] - 1 - q * 2, y: p[1] - 5 - q * 3.5, r: Math.max(0, 4.2 - q * 1.2) };
    }), { seed: 7, alpha: 220 });
    // Body tube with liquid bands, a back highlight, belly scutes and purple diamonds.
    const S: { p: Pt; s: number; t: Pt }[] = [];
    for (let s = 0; s <= 78; s += 0.5) {
      const p = spine(s), q = spine(s - 0.5);
      const ln = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      S.push({ p, s, t: [(q[0] - p[0]) / ln, (q[1] - p[1]) / ln] });
    }
    const body = new L(W, H), marks = new L(W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < 92; x++) {
        let best = Infinity, bi = -1;
        for (let i = 0; i < S.length; i++) {
          const dx = x + 0.5 - S[i].p[0];
          if (Math.abs(dx) > 12) continue;
          const d = Math.hypot(dx, y + 0.5 - S[i].p[1]) - rad(S[i].s);
          if (d < best) {
            best = d;
            bi = i;
          }
        }
        if (best > 0 || bi < 0) continue;
        const { p, s, t: tg } = S[bi];
        const r = rad(s);
        const nrm = clamp(((x + 0.5 - p[0]) * -tg[1] + (y + 0.5 - p[1]) * tg[0]) / r, -1, 1);
        let v: number;
        if (nrm > 0.45) v = fract(s / 2.4) < 0.25 ? 4 : nrm > 0.8 ? 5 : 7;
        else if (nrm < -0.78) v = 2;
        else if (nrm < -0.55) v = 6;
        else v = nrm < 0 ? 5 : 4;
        // Scale texture: a diagonal lattice of darker ticks on the flank.
        if (nrm > -0.5 && nrm < 0.4 && fract(s / 2.2 + nrm * 1.4) < 0.16) v -= 1;
        body.set(x, y, v);
        // Purple diamonds along the back.
        const dq = fract(s / 9) - 0.5;
        if (s > 6 && Math.abs(dq) * 2 + Math.abs(nrm + 0.35) * 2.2 < 0.75) marks.set(x, y, Math.abs(dq) < 0.12 && nrm < -0.3 ? 4 : 2);
      }
    body.render(c, P);
    marks.render(c, PUR, { outline: null });
    bubbles(c, range(5).map((i) => {
      const ph2 = fract(rnd(31, i) + t);
      const p = spine(10 + i * 13 + ph2 * 6);
      return [p[0], p[1] + 2 - ph2 * 3, ph2 < 0.5 ? 1.4 : 0.5] as [number, number, number];
    }));
    // Hood: a flared, scalloped shield behind the head, scale rows and a purple spectacle mark.
    const hood = new L(W, H);
    hood.poly([[84, 62], [77, 50], [76, 36], [80, 24], [87, 18], [94, 19], [99, 26], [100, 40], [97, 54], [91, 63]], 1);
    liquid(hood, { cuts: [1, 2, 3.2, 4.6, 6], steps: [2, 3, 4, 5, 6, 6] });
    for (let r2 = 0; r2 < 6; r2++)
      for (let k = 0; k < 4; k++) {
        const x = 80 + k * 4.5 + (r2 % 2) * 2, y = 25 + r2 * 6;
        hood.line(x, y, x + 2, y + 1, (px, py) => (hood.get(px, py) >= 4 ? 3 : null));
      }
    hood.render(c, P);
    const spots = new L(W, H);
    spots.ellipse(88, 33, 3.6, 3, 3);
    spots.ellipse(88, 33, 1.8, 1.4, 1);
    spots.ellipse(88, 46, 3, 2.6, 3);
    spots.ellipse(88, 46, 1.4, 1.2, 1);
    spots.path([[85, 37], [88, 40], [91, 37]], 2);
    spots.render(c, PUR);
    // Head: open maw, fangs, forked tongue, lower jaw, the skull with plates and a glowing eye.
    const mouth = new L(W, H);
    mouth.poly([[98, 37], [121, 35.5], [125, 40], [119, 46], [100, 43]], (x, y) => (y > 42 ? 2 : x > 117 ? 3 : 1));
    mouth.render(c, PUR);
    const tongue = new L(W, H);
    tongue.path([[102, 41], [112, 42], [120, 43], [126, 41]], 4);
    tongue.path([[120, 43], [127, 46]], 4);
    tongue.render(c, PUR);
    const jaw = new L(W, H);
    jaw.poly([[95, 42], [106, 44.5], [116, 46], [122, 47], [117, 50.5], [104, 50], [94, 46.5]], 1);
    liquid(jaw, { cuts: [1, 2, 3], steps: [2, 3, 5, 6], shine: false });
    jaw.render(c, P);
    const lt = new L(W, H);
    for (const x of [106, 111, 116]) lt.poly([[x - 1, 45.5], [x + 1.2, 45.8], [x, 43]], 4);
    lt.render(c, BONE);
    const head = new L(W, H);
    head.poly([[93, 39], [95, 32], [101, 28.5], [111, 27.5], [119, 29.5], [124, 33.5], [122, 37], [111, 37.5], [100, 39]], 1);
    liquid(head, { cuts: [1, 2, 3.2, 4.4], steps: [2, 3, 5, 6, 7] });
    head.path([[101, 31], [107, 29.5], [114, 30]], 4);
    head.line(101, 30, 110, 28.5, 7);
    head.set(121, 32, 1);
    head.render(c, P);
    fang(c, [111.5, 36.5], [112.8, 39.5], [111.8, 43.5], 1.7, 16);
    fang(c, [117.5, 36], [118.6, 38.8], [117.6, 42.5], 1.5, 16);
    const eye = new L(W, H);
    eye.poly([[102, 32.5], [105.5, 30.6], [109, 31.8], [106, 34.2]], (x) => (x === 106 ? 0 : x < 105 ? 5 : 4));
    eye.render(c, PUR, { outline: P[0] });
    // Venom dripping from the fangs, drops falling under the belly.
    drops(c, [
      [111.8, 46 + ((f * 2) % 9), 1.7, 3],
      [117.6, 45 + ((f * 2 + 4) % 9), 1.6, 3],
      ...range(5).map((i) => {
        const p0 = fract(rnd(41, i) + t);
        const p = spine(14 + i * 13);
        return [p[0] - p0 * 6, p[1] + rad(14 + i * 13) + 3 + p0 * 22, 1.8 - p0 * 0.6, 2 + p0 * 3] as [number, number, number, number];
      }),
    ]);
    fumes(c, range(3).map((i) => {
      const p0 = fract(rnd(42, i) + t);
      return { x: 70 - i * 22 - p0 * 6, y: 30 - p0 * 14, r: 3.4 * (1 - p0 * 0.6) };
    }), { purple: true, seed: 43, alpha: 200 });
    return c;
  });
  return sprite('beast', 'Poison beast: venom cobra', [64, 48], { fly: loop(frames) });
}

/** Acid jet band with a wobbling edge (tileable when wrap). */
function jet(c: Canvas, x0: number, x1: number, t: number, wrap: boolean, period?: number): L {
  const l = new L(c.w, c.h);
  for (let x = x0; x < x1; x++) {
    const a = (x / 64) * TAU;
    const top = 32 - 6 - Math.sin(a * 2 - t * TAU) * 1.5 - Math.sin(a * 3 + t * TAU * 2) * 0.8;
    const bot = 32 + 6 + Math.sin(a * 2 - t * TAU + 1.3) * 1.5 + Math.sin(a * 5 - t * TAU) * 0.6;
    for (let y = Math.floor(top); y <= Math.ceil(bot); y++) if (y + 0.5 >= top && y + 0.5 <= bot) l.set(x, y, 1);
  }
  l.bands([1, 2, 3, 4.2, 5.4], [2, 3, 4, 5, 6, 7], { jitter: 0.25, seed: 19, wrapX: wrap, period });
  l.clean(1, wrap);
  // Shine along the top of the jet.
  for (let x = x0; x < x1; x++)
    for (let y = 0; y < c.h; y++)
      if (l.get(x, y) >= 0) {
        if (fract(x / 16 + t) < 0.55) l.set(x, y + 2, 8);
        break;
      }
  l.render(c, P, { wrapX: wrap });
  return l;
}

/** Stream: a tileable acid jet with bubbles riding inside and spray flicking off. */
function stream(): WorldSprite {
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    jet(c, 0, 64, t, true);
    bubbles(c, range(4).map((i) => [(rnd(51, i) * 64 + t * 64) % 64, 30 + (rnd(52, i) - 0.5) * 6, i % 2 ? 1.5 : 1] as [number, number, number]));
    bubbles(c, [[(rnd(53, 0) * 64 + t * 64) % 64, 33, 1.2]], { purple: true });
    const sp: [number, number, number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const x = (rnd(54, i) * 64 + t * 64) % 64;
      const up = i % 2 ? 1 : -1;
      const ph = fract(rnd(55, i) + t * 2);
      sp.push([x, 32 + up * (10 + ph * 7), 1.2, 1.5]);
    }
    drops(c, sp);
    return c;
  });
  return sprite('stream', 'Poison stream: acid jet (tileable)', [0, 32], { fly: loop(frames) });
}

/** Stream head: the jet bursts into a splash crown, drops spraying forward. */
function streamHead(): WorldSprite {
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    // The jet continues the last tile: drawn on a buffer one tile longer so the joint has no edge.
    const jb = new Canvas(128, 64);
    jet(jb, 0, 90, t, false, 64);
    c.draw(jb, -64, 0);
    const l = new L(64, 64);
    blob(l, 32, 32, 10, 0.3, 61, t, 1.1, 1);
    for (let k = 0; k < 6; k++) {
      const a = lerp(-1.1, 1.1, k / 5);
      const len = 11 + ((k + f) % 3) * 3;
      const b = polar(34, 32, 8, a), e = polar(34, 32, 8 + len, a);
      l.tube([b, e], [3, 0.8], 1);
      l.disc(e[0], e[1], 1.6, 1);
    }
    liquid(l, { cuts: [1, 2, 3, 4.5], steps: [2, 3, 5, 6, 7] });
    shine(l, 32, 32, 10);
    l.render(c, P);
    bubbles(c, [[30, 34, 2], [36, 29, 1.2], [27, 30, 1]]);
    drops(c, range(6).map((i) => {
      const ph = fract(rnd(62, i) + t);
      const a = lerp(-1, 1, rnd(63, i));
      const p = polar(34, 32, 18 + ph * 7, a);
      return [p[0], p[1] + ph * ph * 6, 1.6 - ph * 0.6, 1.5] as [number, number, number, number];
    }));
    fumes(c, [{ x: 24 + t * 4, y: 20 - t * 3, r: 3.5 }, { x: 40, y: 18 - ((t + 0.5) % 1) * 4, r: 3 }], { purple: true, seed: 64, alpha: 210 });
    return c;
  });
  return sprite('stream_head', 'Poison stream head: acid splash', [32, 32], { fly: loop(frames) });
}

/** Breath: a cone of toxic gas churning out of the mouth, purple wisps and drops inside. */
function breath(): WorldSprite {
  const ox = 11, oy = 52, BW = 112, BH = 104;
  const frames = range(N).map((f) => {
    const c = new Canvas(BW, BH), t = f / N;
    gas(c, (x, y) => {
      const dx = x + 0.5 - ox, dy = y + 0.5 - oy;
      if (dx < 0) return 0;
      const a = Math.abs(Math.atan2(dy, dx));
      const edge = 0.42 + Math.sin(dx * 0.22 - t * TAU) * 0.05;
      return (1 - smooth(edge * 0.25, edge * 1.15, a)) * (1 - smooth(78, 96, dx)) * (0.8 + 0.4 * (1 - dx / 96)) * smooth(0, 10, dx);
    }, t, { seed: 171, thr: 0.52, alpha: 230, steps: [2, 3, 4, 5, 6, 7, 8], base: 0, amp: 1.45 });
    drops(c, range(3).map((i) => {
      const s2 = 16 + fract(rnd(74, i) + t) * 70;
      const p = polar(ox, oy, s2, (rnd(75, i) - 0.5) * 0.5);
      return [p[0], p[1], 1.8, 2] as [number, number, number, number];
    }), { purple: true });
    drops(c, range(6).map((i) => {
      const s2 = 10 + fract(rnd(77, i) + t) * 80;
      const a = (rnd(78, i) - 0.5) * 0.7;
      const p = polar(ox, oy, s2, a);
      return [p[0], p[1], 1.6, 2] as [number, number, number, number];
    }));
    const core = new L(BW, BH);
    core.disc(ox + 2, oy, 6, 1);
    core.bands([1, 2, 3], [5, 6, 7, 8]);
    core.render(c, P);
    return c;
  });
  return sprite('breath', 'Poison breath: toxic cloud', [8, 52], { fly: loop(frames) });
}

/** Sphere: an acid bubble: a membrane with poison sloshing inside, bubbles rising, drops trailing. */
function sphere(): WorldSprite {
  const cx = 35, cy = 31, R = 16;
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N, ph = t * TAU;
    fumes(c, range(4).map((i) => {
      const s = 3 - i + t;
      return { x: cx - 19 - s * 3.4, y: cy - 2 + Math.sin(s * 1.6) * 4, r: Math.max(0, 3.6 - s * 0.95), steps: s < 2 ? [3, 4, 5, 6] : [2, 3, 4] };
    }), { seed: 81, alpha: 220 });
    // Interior: translucent, the liquid surface sloshing in the lower half.
    const inner = new L(64, 64);
    inner.fill((x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < R - 1.5, (x, y) => {
      const surf = cy + 1 + Math.sin((x - cx) * 0.3 + ph) * 2.2 + (x - cx) * 0.08;
      if (y + 0.5 > surf) return Math.abs(y + 0.5 - surf) < 1.2 ? 7 : y > cy + 8 ? 3 : 4;
      return Math.hypot(x + 0.5 - cx + 4, y + 0.5 - cy + 4) < 5 ? 4 : 3;
    });
    inner.render(c, P, { outline: null, alpha: (v, x, y) => (y + 0.5 > cy + 1 + Math.sin((x - cx) * 0.3 + ph) * 2.2 + (x - cx) * 0.08 ? 235 : 120) });
    // Purple swirl in the poison.
    const sw = new L(64, 64);
    for (let a = 0; a < 4.5; a += 0.05) {
      const r = 3 + a * 2;
      const p = polar(cx, cy + 6, r, a * 1.4 + ph, 0.4);
      sw.set(p[0], p[1], 3);
    }
    sw.erase((x, y) => inner.get(x, y) < 0);
    sw.render(c, PUR, { outline: null });
    bubbles(c, range(5).map((i) => {
      const p0 = fract(rnd(82, i) + t);
      return [cx - 8 + rnd(83, i) * 16, cy + 10 - p0 * 20, i % 2 ? 1.4 : 1] as [number, number, number];
    }), { alpha: 230 });
    // Membrane.
    const m = new L(64, 64);
    m.disc(cx, cy, R, 1);
    m.erase((x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < R - 2.2);
    m.map((v, x, y) => {
      const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
      return a > -2.6 && a < -1.4 ? 7 : a > 0.4 && a < 2 ? 3 : 5;
    });
    m.render(c, P);
    const hl = new L(64, 64);
    for (let a = -2.5; a < -1.5; a += 0.04) {
      const p = polar(cx, cy, R - 4, a);
      hl.set(p[0], p[1], 8);
      if (a > -2.2 && a < -1.8) hl.set(p[0] + 1, p[1] + 1, 8);
    }
    hl.set(cx + 7, cy - 9, 8);
    hl.render(c, P, { outline: null });
    drops(c, range(3).map((i) => {
      const p0 = fract(rnd(84, i) + t);
      return [cx - 6 - i * 7 - p0 * 6, cy + R + p0 * 14, 1.6, 2 + p0 * 2] as [number, number, number, number];
    }));
    return c;
  });
  return sprite('sphere', 'Poison sphere: acid bubble', [32, 32], { fly: loop(frames) });
}

/** One fang: a tapered, curving bone spike from root to tip, the front half coated in venom. */
function fang(c: Canvas, root: Pt, ctrl: Pt, tip: Pt, wid: number, venomFrom = 12): void {
  const pts: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, u = 1 - t;
    pts.push([u * u * root[0] + 2 * u * t * ctrl[0] + t * t * tip[0], u * u * root[1] + 2 * u * t * ctrl[1] + t * t * tip[1]]);
  }
  const l = new L(c.w, c.h);
  l.tube(pts, (t) => wid * Math.pow(1 - t, 0.75) * (0.55 + 0.45 * smooth(0, 0.3, t)) + 0.4, 1);
  l.bands([1, 2, 3], [2, 3, 4, 5]);
  // A glint running down the fang's lit side.
  l.path(pts.slice(2, 14).map(([x, y]) => [x - 1, y - 1] as Pt), (x, y) => (l.get(x, y) >= 3 ? 5 : null));
  l.render(c, BONE);
  const v = new L(c.w, c.h);
  for (let i = venomFrom; i <= 20; i++) v.disc(pts[i][0], pts[i][1], wid * Math.pow(1 - i / 20, 0.75) + (venomFrom > 14 ? 0.7 : 1.1), 1);
  v.bands([1, 2], [4, 6, 7]);
  if (venomFrom <= 14) v.set(pts[14][0] - 1, pts[14][1] - 1, 8);
  v.render(c, P);
}

/** Slash: a fang strike: a venom crescent with two great fangs snapping shut at its front. */
function slash(): WorldSprite {
  const frames = range(N).map((f) => {
    const c = new Canvas(64, 64), t = f / N;
    const bite = Math.sin(t * TAU) * 1.5;
    const arc = new L(64, 64);
    const ox = 14, oy = 32, R = 24, ix = 7, Ri = 23;
    arc.fill((x, y) => R - Math.hypot(x + 0.5 - ox, y + 0.5 - oy) > 0 && Math.hypot(x + 0.5 - ix, y + 0.5 - oy) - Ri > 0, 1);
    liquid(arc, { cuts: [1, 2, 3], steps: [3, 4, 6, 7], shine: false });
    arc.render(c, P, { alpha: (v) => (v >= 6 ? 245 : 215) });
    const tr = new L(64, 64);
    for (let j = 0; j < 2; j++)
      for (let a = -1.2; a <= 1.2; a += 0.012) {
        if (fract(a * 2.4 + t + j * 0.4) > 0.66) continue;
        const p = polar(ox - 5 - j * 5, oy, R - 4 - j * 3, a);
        tr.set(p[0], p[1], j ? 4 : 6);
      }
    tr.render(c, P, { outline: null });
    fang(c, [22, 9], [42, 10 + bite], [47, 27 + bite], 5);
    fang(c, [22, 55], [42, 54 - bite], [46, 37 - bite], 4.4);
    drops(c, range(5).map((i) => {
      const p0 = fract(rnd(91, i) + t);
      return [40 - p0 * 20 - i * 3, 32 + (i - 2) * 5 + p0 * 6, 1.5, 2] as [number, number, number, number];
    }));
    drops(c, [[47, 30 + ((f * 2) % 8), 1.4, 3], [46, 41 + ((f * 2 + 4) % 8), 1.3, 3]]);
    bubbles(c, [[20, 32 + Math.sin(t * TAU) * 3, 1.5]], { purple: true });
    return c;
  });
  return sprite('slash', 'Poison slash: fang strike', [32, 32], { fly: loop(frames) });
}

/** Hit: an acid splat bursts, drops fly out, the puddle fizzes into rising fumes. */
function hit(): WorldSprite {
  const cx = 32, cy = 32;
  const frames = range(6).map((f) => {
    const c = new Canvas(64, 64);
    const sz = [0.5, 1, 1.15, 1.1, 0.9, 0.7][f];
    const l = new L(64, 64);
    blob(l, cx, cy, 9 * sz, 0.5, 101, f * 0.05);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + 0.3;
      const len = (8 + rnd(102, k) * 7) * sz * (f >= 3 ? 0.7 : 1);
      const e = polar(cx, cy, 7 * sz + len, a);
      l.tube([[cx, cy], e], [3.5 * sz, 1.2], 1);
      l.disc(e[0], e[1], 2 * sz, 1);
    }
    liquid(l, { cuts: [1, 2, 3, 4.5], steps: f <= 1 ? [4, 5, 6, 7, 8] : [2, 3, 5, 6, 7] });
    if (f <= 2) shine(l, cx, cy, 9 * sz);
    l.render(c, P, { alpha: f >= 5 ? 190 : 255, outlineAlpha: f >= 5 ? 190 : 255 });
    if (f >= 2) bubbles(c, range(6).map((k) => [cx + (rnd(103, k) - 0.5) * 16, cy + (rnd(104, k) - 0.5) * 12, (k + f) % 3 === 0 ? 2 : 1.2] as [number, number, number]));
    if (f >= 1 && f <= 4)
      drops(c, range(9).map((k) => {
        const a = (k / 9) * TAU + rnd(105, k);
        const p = polar(cx, cy, 9 + f * 3, a);
        return [p[0], p[1] + f * f * 0.3, 1.6, 2] as [number, number, number, number];
      }));
    if (f >= 2) {
      const fy = cy - 8 - (f - 2) * 5, fr = 7 + (f - 2) * 2;
      gas(c, (x, y) => {
        const u = (x + 0.5 - cx) / fr, v = (y + 0.5 - fy) / (fr * 0.6);
        return (1 - smooth(0.5, 1.05, Math.hypot(u, v))) * (f >= 5 ? 0.8 : 1);
      }, f / 6, { seed: 106, thr: 0.45, base: 0.05, amp: 1.4, scale: 0.4, purple: k2(f), steps: k2(f) ? [1, 2, 3, 4, 5] : [3, 4, 5, 6, 7], alpha: f >= 5 ? 180 : 235 });
    }
    return c;
  });
  return sprite('hit', 'Poison hit: acid splat', [32, 32], { hit: once(frames, 15) });
}
const k2 = (f: number): boolean => f % 2 === 1;

/** Blast: hydra venom: an acid geyser erupts in a crown of drops, a toxic cloud billows, the pool bubbles. */
function blast(): WorldSprite {
  const W = 176, H = 144, ax = 88, ay = 88, rx = 80, ry = 53;
  const frames = range(8).map((f) => {
    const c = new Canvas(W, H);
    // The pool: dark and glossy, a ragged splashy rim, satellite splats.
    const sp = [0.3, 0.6, 0.85, 0.95, 1, 1, 0.98, 0.95][f];
    const pud = new L(W, H);
    pud.fill((x, y) => {
      const u = (x + 0.5 - ax) / (rx * sp), v = (y + 0.5 - ay) / (ry * sp);
      const a = Math.atan2(v, u);
      const k = pnoise(((a / TAU) * 48 + 48) % 48, 3, 4, 48, 111) - 0.5;
      return Math.hypot(u, v) <= 0.9 + k * 0.26;
    }, 1);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + rnd(112, k);
      const p = polar(ax, ay, rx * sp * (0.98 + rnd(113, k) * 0.1), a, ry / rx);
      pud.ellipse(p[0], p[1], 4 * sp, 2.4 * sp, 1);
    }
    pud.bands([1, 2, 4, 8], [3, 2, 1, 2, 3]);
    pud.map((v, x, y) => {
      const d = Math.hypot((x + 0.5 - ax) / rx, (y + 0.5 - ay) / ry);
      return v <= 2 && Math.abs(fract(d * 3.5 - f * 0.2) - 0.5) < 0.05 ? 4 : v;
    });
    pud.render(c, P, { alpha: f >= 7 ? 215 : 245 });
    const glint = new L(W, H);
    for (let k = 0; k < 6; k++) {
      const p = polar(ax, ay, rx * sp * (0.35 + rnd(114, k) * 0.45), rnd(115, k) * TAU, ry / rx);
      glint.line(p[0], p[1], p[0] + 4, p[1], 7);
    }
    glint.erase((x, y) => pud.get(x, y) < 0);
    glint.render(c, P, { outline: null });
    bubbles(c, range(18).map((k) => {
      const a = rnd(116, k) * TAU, d = Math.sqrt(rnd(117, k)) * 0.8 * sp;
      return [ax + Math.cos(a) * rx * d, ay + Math.sin(a) * ry * d, (k + f) % 4 === 0 ? 3 : (k + f) % 4 === 1 ? 2 : 1] as [number, number, number];
    }));
    bubbles(c, range(5).map((k) => {
      const a = rnd(118, k) * TAU, d = Math.sqrt(rnd(119, k)) * 0.7 * sp;
      return [ax + Math.cos(a) * rx * d, ay + Math.sin(a) * ry * d, (k + f) % 3 === 0 ? 2.4 : 1.4] as [number, number, number];
    }), { purple: true });
    // Toxic cloud billowing up behind and around the geyser.
    const cloud = [0, 0.4, 0.75, 1, 1.15, 1.2, 1.1, 0.9][f];
    if (cloud) {
      const top = ay - [0, 30, 56, 72, 78, 78, 74, 68][f];
      const lobes: [number, number, number, number][] = [
        [0, 20, 26, 19],
        [-24, 32, 19, 14],
        [25, 30, 20, 15],
        [-10, 44, 15, 11],
        [12, 46, 14, 10],
      ];
      gas(c, (x, y) => {
        let d = 0;
        for (const [dx, dy, rx2, ry2] of lobes) {
          const u = (x + 0.5 - (ax + dx * cloud)) / (rx2 * cloud), v = (y + 0.5 - (top + dy * Math.min(1, cloud))) / (ry2 * cloud);
          d = Math.max(d, 1 - smooth(0.55, 1.05, Math.hypot(u, v)));
        }
        return d * (f >= 6 ? 0.85 : 1);
      }, f / 8, { seed: 121, thr: 0.33, alpha: f >= 7 ? 200 : 240 });
      fumes(c, range(3).map((k) => ({ x: ax + (k - 1) * 22 * cloud, y: top + 12 + (k % 2) * 16, r: 3 * cloud })), { purple: true, seed: 126 + f, alpha: 190 });
    }
    // The geyser: a column of acid with a crown of drops.
    const gh = [12, 44, 66, 70, 50, 24, 0, 0][f];
    if (gh) {
      const g = new L(W, H);
      g.tube([[ax, ay + 2], [ax + Math.sin(f) * 2, ay - gh * 0.5], [ax, ay - gh]], [11, 7, 5], 1);
      g.disc(ax, ay - gh, 7, 1);
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.42;
        const e = polar(ax, ay - gh, 10 + ((k + f) % 3) * 3, a);
        g.tube([polar(ax, ay - gh, 5, a), e], [2.6, 0.8], 1);
        g.disc(e[0], e[1], 1.8, 1);
      }
      g.ellipse(ax, ay + 1, 16, 6, 1);
      liquid(g, { cuts: [1, 2, 3, 4.5], steps: [3, 4, 5, 6, 7] });
      shine(g, ax, ay - gh, 7);
      g.render(c, P);
    }
    if (f >= 1 && f <= 6)
      drops(c, range(18).map((k) => {
        const a = -Math.PI / 2 + (rnd(123, k) - 0.5) * 2.8;
        const p = polar(ax, ay - 34, (f - 0.3) * (9 + rnd(124, k) * 8), a);
        return [p[0], p[1] + (f - 1) * (f - 1) * 2.2, 1.9, 2.5] as [number, number, number, number];
      }));
    return c;
  });
  return sprite('blast', 'Poison blast: hydra venom geyser', [ax, ay], { blast: once(frames, 12) });
}

const WW = 272, WH = 128, WGY = 120, WALL_H = 103, WALL_W = 257;

/** Mist curtain: a churning wall of toxic gas up to height hk (0..1), purple wisps inside. */
function curtain(c: Canvas, hk: number, t: number): void {
  const x0 = (WW - WALL_W) / 2, x1 = x0 + WALL_W;
  const h = (x: number): number => WALL_H * hk * (0.68 + 0.24 * pnoise(x, 0, 20, WW, 141) + 0.1 * Math.abs(Math.sin((x / WW) * TAU * 7 + t * TAU)));
  const dens = (x: number, y: number): number => {
    if (y > WGY + 2) return 0;
    const ends = smooth(x0 - 4, x0 + 16, x) * (1 - smooth(x1 - 16, x1 + 4, x));
    const k = (WGY - y) / Math.max(1, h(x));
    return ends * (1 - smooth(0.62, 1.08, k)) * (0.85 + 0.25 * (1 - smooth(0, 0.25, k)));
  };
  gas(c, dens, t, { seed: 142, thr: 0.34, alpha: 235, steps: [2, 3, 3, 4, 5, 6, 7] });

  fumes(c, range(4).map((k) => {
    const ph = fract(rnd(145, k) + t);
    return { x: x0 + 30 + k * 64 + Math.sin(ph * TAU) * 6, y: WGY - 22 - (rnd(146, k) * 0.5 + ph * 0.4) * WALL_H * hk * 0.8, r: 6 * (1 - ph * 0.35) };
  }), { purple: true, seed: 147, alpha: 165 });
}

/** Wall: a curtain of toxic mist boiling up ('rise'), then rolling with drips ('idle'). */
function wall(): WorldSprite {
  const rise = range(6).map((f) => {
    const c = new Canvas(WW, WH);
    curtain(c, [0.2, 0.45, 0.7, 0.92, 1.02, 1][f], f / 6);
    drops(c, range(10).map((k) => [12 + rnd(141, k, f) * 248, WGY - 10 - rnd(142, k, f) * 90 * [0.2, 0.45, 0.7, 0.92, 1, 1][f], 1.6, 2]));
    return c;
  });
  const idle = range(N).map((f) => {
    const c = new Canvas(WW, WH);
    curtain(c, 1, f / N);
    drops(c, range(8).map((k) => {
      const ph = fract(rnd(143, k) + f / N);
      return [16 + rnd(144, k) * 240, WGY - 60 + ph * 56, 1.6, 2 + ph * 2] as [number, number, number, number];
    }));
    bubbles(c, range(6).map((k) => [16 + rnd(145, k) * 240, WGY - 6 - ((rnd(146, k) + f / N) % 1) * 12, (k + f) % 3 === 0 ? 2 : 1.2] as [number, number, number]));
    return c;
  });
  return sprite('wall', 'Poison wall: mist curtain', [WW / 2, WGY], { rise: once(rise, 12), idle: loop(idle, 8) });
}

// --- the mist curtain in 3/4 and depth -----------------------------------------------------

/** Half thickness of the curtain at its base (px): a dense core and a soft skin. */
const MIST_HALF = 15;

/**
 * The curtain as a gas volume in wall-local space (u along, s across, v up), seen through: every
 * pixel takes the densest point on its view ray (plus a little for how much gas it crosses), so
 * the top, the near end and the soft skin all fall out of one density function. The height
 * profile along u is the horizontal curtain's, so the three views share the same peaks.
 */
function mist3d(o: Orient, hk: number, t: number): Canvas {
  const c = new Canvas(o.w, o.h);
  const hu = new Float32Array(LEN + 41);
  for (let i = 0; i < hu.length; i++) {
    const x = i - 20 + (WW - WALL_W) / 2;
    hu[i] = Math.max(1, WALL_H * hk * (0.68 + 0.24 * pnoise(x, 0, 20, WW, 141) + 0.1 * Math.abs(Math.sin((x / WW) * TAU * 7 + t * TAU))));
  }
  const D = (u: number, s: number, v: number): number => {
    if (u < -20 || u > LEN + 20 || v < -2) return 0;
    const k = v / hu[Math.round(u) + 20];
    if (k > 1.08) return 0;
    // Thick and pooling at the ground, thinning to a crest of tongues at the top.
    const half = (MIST_HALF + 5 * (1 - smooth(0, 12, v))) * (1 - 0.55 * smooth(0.25, 1, k));
    const as = Math.abs(s);
    if (as > half) return 0;
    const ends = smooth(-4, 16, u) * (1 - smooth(LEN - 16, LEN + 4, u));
    return ends * (1 - smooth(half * 0.55, half, as)) * (1 - smooth(0.62, 1.08, k)) * (0.85 + 0.25 * (1 - smooth(0, 0.25, k)));
  };
  const N2 = o.w * o.h;
  const sd = new Float32Array(N2), ua = new Float32Array(N2).fill(-99);
  const uB = (o.dz * PPM) / DPM, sB = (o.nz * PPM) / DPM, vMax = HGT * 1.12;
  for (let py = 0; py < o.h; py++)
    for (let px = 0; px < o.w; px++) {
      const x = (px + 0.5 - o.ax) / PPM, Y = py + 0.5 - o.ay;
      const u0 = ((x - o.ox) * o.dx + (Y / DPM - o.oz) * o.dz) * PPM;
      const s0 = ((x - o.ox) * o.nx + (Y / DPM - o.oz) * o.nz) * PPM;
      let mx = 0, acc = 0, um = -99;
      for (let v = -2; v <= vMax; v += 1) {
        const d = D(u0 + uB * v, s0 + sB * v, v);
        acc += d;
        if (d > mx) {
          mx = d;
          um = u0 + uB * v;
        }
      }
      const i = py * o.w + px;
      sd[i] = mx * (0.82 + 0.22 * (1 - Math.exp(-acc / 10)));
      ua[i] = um;
    }
  const dens = (x: number, y: number): number => (x < 0 || y < 0 || x >= o.w || y >= o.h ? 0 : sd[y * o.w + x]);
  // Top light (the renderer mirrors the 3/4 view), the far third a touch darker, the near end crisper.
  const g = gasLayer(o.w, o.h, dens, t, { seed: 142, thr: 0.34, steps: [2, 3, 3, 4, 5, 6, 7], lx: 0 });
  g.map((st, x, y) => {
    const u = ua[y * o.w + x];
    if (u > LEN * 0.66) return Math.max(2, st - 1);
    if (u < LEN * 0.2 && st >= 6) return st + 1;
    return st;
  });
  g.render(c, P, { alpha: 235, outlineAlpha: 235 });
  fumes(c, range(4).map((k) => {
    const ph = fract(rnd(145, k) + t);
    const q = proj(o, 22 + k * 64 + Math.sin(ph * TAU) * 6, 0, 22 + (rnd(146, k) * 0.5 + ph * 0.4) * WALL_H * hk * 0.8);
    return { x: q[0], y: q[1], r: 6 * (1 - ph * 0.35) };
  }), { purple: true, seed: 147, alpha: 165 });
  return c;
}

/** Mist curtain in 3/4 or depth: 'rise' (6, boiling up from the ground) then 'idle' (4, rolling). */
function mistWall(key: 'wall_diag' | 'wall_depth'): WorldSprite {
  const o = orientations()[key];
  const hks = [0.2, 0.45, 0.7, 0.92, 1.02, 1];
  const at = (u: number, s: number, v: number): Pt => proj(o, u, s, v);
  const rise = range(6).map((f) => {
    const c = mist3d(o, hks[f], f / 6);
    drops(c, range(10).map((k) => {
      const q = at(4 + rnd(141, k, f) * 248, MIST_HALF * 0.6, 10 + rnd(142, k, f) * 90 * Math.min(1, hks[f]));
      return [q[0], q[1], 1.6, 2] as [number, number, number, number];
    }));
    return c;
  });
  const idle = range(4).map((f) => {
    const t = f / 4;
    const c = mist3d(o, 1, t);
    drops(c, range(8).map((k) => {
      const ph = fract(rnd(143, k) + t);
      const q = at(8 + rnd(144, k) * 240, MIST_HALF * 0.6, 60 - ph * 56);
      return [q[0], q[1], 1.6, 2 + ph * 2] as [number, number, number, number];
    }));
    bubbles(c, range(8).map((k) => {
      const q = at(8 + rnd(145, k) * 240, (k % 2 ? 1 : -1) * (MIST_HALF + 2 + rnd(148, k) * 4), 3 + fract(rnd(146, k) + t) * 12);
      return [q[0], q[1], (k + f) % 3 === 0 ? 2 : 1.2] as [number, number, number];
    }));
    return c;
  });
  const label = key === 'wall_diag' ? 'Poison wall (3/4): mist curtain' : 'Poison wall (depth): mist curtain';
  return sprite(key, label, [o.ax, o.ay], { rise: once(rise, 12), idle: loop(idle, 8) });
}

/** Aura: toxic fume tongues rising at both sides, a bubbling puddle ring, drops and purple wisps. */
function aura(): WorldSprite {
  const W = 80, H = 128, ax = 40, ay = 112;
  const frames = range(6).map((f) => {
    const c = new Canvas(W, H), t = f / 6;
    const g = new L(W, H);
    g.ellipse(ax, ay, 33, 8, 1);
    g.erase((x, y) => ((x + 0.5 - ax) / 27) ** 2 + ((y + 0.5 - ay) / 5.5) ** 2 < 1);
    liquid(g, { cuts: [1, 2], steps: [3, 5, 6], shine: false });
    g.render(c, P);
    bubbles(c, range(8).map((k) => {
      const p = polar(ax, ay, 30, (k / 8) * TAU + 0.2, 0.24);
      return [p[0], p[1], (k + f) % 3 === 0 ? 1.8 : 0.5] as [number, number, number];
    }));
    for (const side of [-1, 1]) {
      const l = new L(W, H);
      for (let k = 0; k < 3; k++) {
        const pts: Pt[] = [];
        for (let i = 0; i <= 20; i++) {
          const s = i / 20;
          const sway = Math.sin(s * 5 - t * TAU + k * 2.1 + (side > 0 ? 1 : 0)) * (3 + s * 4);
          pts.push([ax + side * (26 + k * 3 - s * 4) + sway, ay - 4 - s * (66 + k * 14)]);
        }
        l.tube(pts, (s) => (4.2 - k * 0.7) * (1 - s) + 0.6, 1);
      }
      l.bands([1, 2, 3.2], [2, 4, 5, 6], { jitter: 0.25, seed: 7 }).clean();
      l.render(c, P, { alpha: (v) => (v >= 5 ? 240 : 205), outlineAlpha: 205 });
    }
    fumes(c, range(4).map((k) => {
      const ph = fract(rnd(151, k) + t);
      return { x: ax + (k % 2 ? 1 : -1) * (22 + rnd(152, k) * 10), y: ay - 20 - ph * 80, r: 3.5 * (1 - ph * 0.5) };
    }), { purple: true, seed: 153, alpha: 220 });
    drops(c, range(4).map((k) => {
      const ph = fract(rnd(154, k) + t);
      return [ax + (k % 2 ? 1 : -1) * (24 + rnd(155, k) * 8), 40 + ph * 64, 1.5, 2 + ph * 2] as [number, number, number, number];
    }));
    return c;
  });
  return sprite('aura', 'Poison aura: toxic fumes', [ax, ay], { idle: loop(frames, 10) });
}

export function buildPoison(): WorldSprite[] {
  return [bolt(), beast(), stream(), streamHead(), breath(), sphere(), slash(), multi(), hit(), blast(), wall(), aura(), mistWall('wall_diag'), mistWall('wall_depth')];
}
