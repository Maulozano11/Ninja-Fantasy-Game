// SAMPLE for the owner to paint over (not game art): a water jutsu that turns the ninja into a
// puddle (stealth), and a mercury version (liquid metal) for a future ability that slips through
// cracks. Design: docs/GAMEPLAY_DESIGN.md, "Puddle form: a stealth water jutsu, and mercury later".
//
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/puddle-sample.ts
//
// writes <WORLD_OUT>/charco_muestra/: every frame at 1x in our 256 x 256 sprite frame (feet at
// FEET, transparent background, so he can paint on it) and manifest.json (the sequences, their
// Spanish labels and pace). Staging only: it refuses to run without WORLD_OUT. The sheets, GIFs and
// map shots for him are made from that folder by tools/world-sprites/puddle-sample-sheets.py.
//
// Game scale: 1 m = 57 px, the ninja about 94 px tall; the puddle is about 1.1 m across, flattened
// 3.5:1 like the units' ground shadows. The ninjas are the real game sprites (the default male
// and Lyra): the melt deforms their own frames (idle, then crouch), so nothing is redrawn.
// Water uses his water v3 palette (vfx-water-v3-refdata.ts: his 24 body colours and his navy rim);
// mercury is our proposal (a cool chrome ramp, the characters' black line). The liquid is shaded
// from its own silhouette: a height from the distance to its edge (flat for water, a round lip for
// mercury's surface tension), its normal, and a reflection of the sky above a dark horizon band.
// Deterministic: no Math.random.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEGENDARY_PRESETS } from '../../src/data/shinobiData';
import { renderSprite } from '../../src/sprite/compose';
import { defaultAppearance, dojutsuToEye } from '../../src/sprite/legacy';
import { FEET } from '../../src/sprite/rig';
import { GRID } from '../../src/sprite/raster';
import type { EyeSpecial, SpriteAppearance, SpritePose } from '../../src/sprite/types';
import { Color, hash, hex, mix, noise, writePng } from './kit';
import { WV3_PAL, WV3_VEIL } from './vfx-water-v3-refdata';

const N = GRID;
const GX = FEET.x;
const GY = FEET.y;
const TAU = Math.PI * 2;
type Img = Uint8ClampedArray;
const blank = (): Img => new Uint8ClampedArray(N * N * 4);
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lum = (c: ArrayLike<number>) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;

// --- materials ----------------------------------------------------------------------------------

interface Mat {
  kind: 'water' | 'mercury';
  ramp: Color[]; // dark to light
  rim: Color;
  /** Height of the liquid's lip in px: a flat sheet for water, a round bead for mercury. */
  lip: number;
}
const byLum = (a: Color, b: Color) => lum(a) - lum(b);
const WATER: Mat = {
  kind: 'water',
  ramp: WV3_PAL.filter((p) => p.kind === 'body').map((p) => hex(p.rgba.slice(0, 7))).sort(byLum),
  rim: hex(WV3_PAL.find((p) => p.kind === 'outline')!.rgba.slice(0, 7)),
  lip: 2.5,
};
const MERCURY: Mat = {
  kind: 'mercury',
  ramp: ['#0c0d12', '#1b1d24', '#2e313a', '#474b56', '#656a76', '#8a909c', '#b0b6c0', '#d2d7de', '#eef1f4', '#ffffff'].map((h) => hex(h)),
  rim: hex('#07060b'),
  lip: 5,
};
const VEIL_DEEP = hex(WV3_VEIL.deep);
const VEIL_LIGHT = hex(WV3_VEIL.light);
const LIGHT = (() => {
  const l = [-0.55, -0.7, 0.45];
  const k = Math.hypot(l[0], l[1], l[2]);
  return l.map((v) => v / k);
})();

// --- shapes -------------------------------------------------------------------------------------

/** A metaball: an ellipse alone, and two close ones melt together with a neck between them. */
interface Ball { x: number; y: number; rx: number; ry: number; w?: number }
const BLEND = 3;

function ballsMask(balls: Ball[], wobble = 0, seed = 0, phase = 0): Uint8Array {
  const m = new Uint8Array(N * N);
  if (!balls.length) return m;
  const ox = Math.cos(phase * TAU) * 7, oy = Math.sin(phase * TAU) * 7;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    // A soft union: a plain sum would swell the lobes into one big lens; the power keeps each
    // ball's own outline and leaves only a small neck where two meet.
    let f = 0;
    for (const b of balls) {
      const dx = (x + 0.5 - b.x) / b.rx, dy = (y + 0.5 - b.y) / b.ry;
      f += ((b.w ?? 1) / Math.max(0.01, dx * dx + dy * dy)) ** BLEND;
    }
    f = f ** (1 / BLEND);
    if (wobble) f += (noise(x + ox, y * 2 + oy, 6, seed) - 0.5) * wobble;
    if (f >= 1) m[y * N + x] = 1;
  }
  return m;
}

/** Chamfer distance from each inside pixel to the nearest outside one (edge pixels are 1). */
function distOf(mask: Uint8Array): Float32Array {
  const d = new Float32Array(N * N);
  const INF = 1e6, D = Math.SQRT2;
  for (let i = 0; i < N * N; i++) d[i] = mask[i] ? INF : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : d[y * N + x]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + D, at(x + 1, y - 1) + D);
  }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) {
    const i = y * N + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + D, at(x - 1, y + 1) + D);
  }
  return d;
}

/** A silhouette melted round: its mask blurred and cut at half (corners and thin bits go). */
function rounded(mask: Uint8Array, r: number): Uint8Array {
  if (r <= 0) return mask;
  let a = Float32Array.from(mask);
  for (let pass = 0; pass < 2; pass++) {
    const h = new Float32Array(N * N), v = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < N) { s += a[y * N + xx]; n++; } }
      h[y * N + x] = s / n;
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < N) { s += h[yy * N + x]; n++; } }
      v[y * N + x] = s / n;
    }
    a = v;
  }
  return Uint8Array.from(a, (v) => (v >= 0.5 ? 1 : 0));
}

// --- the ninja ----------------------------------------------------------------------------------

interface Ninja { id: string; label: string; look: SpriteAppearance; eye: EyeSpecial }
const lyra = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_lyra')!.character;
const NINJAS: Ninja[] = [
  { id: 'hombre', label: 'ninja por defecto', look: defaultAppearance(), eye: 'none' },
  { id: 'lyra', label: 'Lyra', look: lyra.appearance!, eye: dojutsuToEye(lyra.dojutsu) },
];
const pose = (n: Ninja, p: SpritePose): Img => renderSprite(n.look, p, 0, n.eye).rgba;

/** Height of a frame's figure above the feet line. */
function heightOf(img: Img): number {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (img[(y * N + x) * 4 + 3]) return GY - y;
  return 1;
}

interface Melt { sy: number; spread: number; wob: number; phase: number }
/** The figure squashed down onto its feet, its lower part spread out and its sides wavering. */
function deform(src: Img, p: Melt): Img {
  const H = heightOf(src);
  const out = blank();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const h = GY - y;
    const sy = GY - h / p.sy;
    const hn = clamp(h / (H * p.sy));
    const k = 1 + p.spread * (1 - hn) ** 2;
    const sx = GX + (x - GX) / k + p.wob * Math.sin(y * 0.31 + p.phase) * (1 - 0.3 * hn);
    const ix = Math.round(sx), iy = Math.round(sy);
    if (ix < 0 || iy < 0 || ix >= N || iy >= N) continue;
    const s = (iy * N + ix) * 4, d = (y * N + x) * 4;
    if (src[s + 3]) out.set(src.subarray(s, s + 4), d);
  }
  return out;
}

// --- shading ------------------------------------------------------------------------------------

interface Ring { x: number; y: number; a: number; b: number; k: number }
interface Liquid {
  mat: Mat;
  balls?: Ball[];
  /** Beads apart from the body: each its own ball, never melted into the rest. */
  beads?: Ball[];
  wobble?: number;
  phase?: number;
  /** The ninja (already deformed), its liquid level (0 feet .. 1 head; above 1 all liquid) and how round it melts. */
  fig?: { img: Img; level: number; round?: number };
  rings?: Ring[];
  glints?: [number, number, number?][];
  drops?: [number, number, number][];
  /** Moves the reflection band a little (mercury's shimmer). */
  env?: number;
  /** Pixels the liquid may not cover (a wall in front of it). */
  clip?: (x: number, y: number) => boolean;
}

function shade(L: Liquid): Img {
  const { mat } = L;
  const out = blank();
  const pud = ballsMask(L.balls ?? [], L.wobble ?? 0, mat.kind === 'water' ? 11 : 23, L.phase ?? 0);
  // Rounded by a pixel, so no lone pixel sticks out of an ellipse's top.
  const pudR = rounded(pud, 1);
  pud.set(pudR);
  for (const b of L.beads ?? []) ballsMask([b]).forEach((v, i) => { if (v) pud[i] = 1; });
  let figM: Uint8Array = new Uint8Array(N * N);
  if (L.fig) for (let i = 0; i < N * N; i++) figM[i] = L.fig.img[i * 4 + 3] ? 1 : 0;
  if (L.fig?.round) figM = rounded(figM, L.fig.round);
  const U = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) U[i] = pud[i] | figM[i] ? 1 : 0;
  if (L.clip) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (L.clip(x, y)) U[y * N + x] = 0;
  const d = distOf(U);
  const ht = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= N || y >= N) return 0;
    const v = Math.min(d[y * N + x], mat.lip) / mat.lip;
    return mat.kind === 'mercury' ? mat.lip * Math.sqrt(1 - (1 - v) ** 2) : v * mat.lip * 0.6;
  };
  // Column extents, for the sky-to-ground gradient down each column.
  const top = new Int32Array(N).fill(N), bot = new Int32Array(N).fill(-1);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (U[y * N + x]) { top[x] = Math.min(top[x], y); bot[x] = Math.max(bot[x], y); }
  const figH = L.fig ? heightOf(L.fig.img) : 1;
  const env = L.env ?? 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (!U[i]) continue;
    const o = i * 4;
    const hx = (ht(x + 1, y) - ht(x - 1, y)) / 2, hy = (ht(x, y + 1) - ht(x, y - 1)) / 2;
    const k = Math.hypot(hx, hy, 1);
    const nx = -hx / k, ny = -hy / k, nz = 1 / k;
    const relY = (y - top[x]) / Math.max(1, bot[x] - top[x]);
    const rz = 2 * nz * nz - 1, rx = 2 * nz * nx, ry = 2 * nz * ny;
    const spec = Math.max(0, rx * LIGHT[0] + ry * LIGHT[1] + rz * LIGHT[2]);
    // The ninja: where the liquid has not reached yet, its own pixels.
    const inFig = L.fig && L.fig.img[o + 3] > 0;
    let cover = 1;
    if (L.fig && figM[i] && !pud[i]) {
      const hn = (GY - y) / figH;
      const front = L.fig.level + 0.05 * Math.sin(x * 0.45 + (L.phase ?? 0) * TAU);
      cover = hn < front ? 1 : mat.kind === 'water' && hn < front + 0.08 ? 0.5 : mat.kind === 'mercury' && hn < front + 0.03 ? 0.75 : 0;
    }
    if (cover === 0 && inFig) {
      out.set(L.fig!.img.subarray(o, o + 4), o);
      continue;
    }
    const ghost = inFig ? L.fig!.img.subarray(o, o + 4) : null;
    if (cover === 0.5 && ghost) {
      // His veil: the figure seen through a film of water (his aura's tint).
      const t = lum(ghost);
      const c = mix(VEIL_DEEP, VEIL_LIGHT, clamp(t * 1.4));
      out.set(mix([ghost[0], ghost[1], ghost[2], 255], c, WV3_VEIL.fit), o);
      continue;
    }
    let v: number;
    const dd = d[i];
    const below = y + 1 < N && !U[i + N], above = y >= 1 && !U[i - N];
    if (mat.kind === 'mercury') {
      // Chrome: the flat top mirrors the sky over a dark band of distant trees; the round lip is
      // bright where it turns up to the sky, dark where it turns down to the ground, with a thin
      // line of light bounced back up off the ground along its foot.
      const b = relY + env;
      const flat = b < 0.16 ? 0.92 : b < 0.3 ? 0.76 : b < 0.42 ? 0.1 : b < 0.6 ? 0.56 : b < 0.8 ? 0.4 : 0.26;
      const t = clamp(Math.hypot(nx, ny) * 1.7);
      const slope = (ny < 0 ? 0.95 : 0.08) - nx * 0.25;
      v = flat * (1 - t) + slope * t;
      if (spec ** 18 > 0.45) v = 1;
      if (dd > 1.5 && dd <= 2.5 && (below || (y + 2 < N && !U[i + 2 * N]))) v = 0.62;
      // The ninja's own shading turned to chrome: its tones fold into hard light and dark bands
      // (metal mirrors, it has no colour of its own), over the shape's sky and horizon.
      if (ghost) v = 0.45 * v + 0.55 * (0.5 + 0.5 * Math.sin(lum(ghost) * TAU * 1.25 + 2.2));
      if (cover === 0.75) v = 0.97; // the bright front of the metal climbing the body
    } else {
      // Water (his palette): lighter where it mirrors the sky at the back, deeper at the front.
      v = 0.52 - 0.32 * relY - ny * 0.35 + env;
      if (spec ** 12 > 0.6) v = 0.97;
      const lit = (y >= 2 && !U[i - 2 * N]) || (x >= 2 && !U[i - 2]);
      if (dd > 1.5 && dd <= 2.5 && (above || lit)) v = Math.max(v, 0.88); // his light rim, upper left
      else if (dd > 1.5 && dd <= 2.5 && below) v = Math.min(v, 0.12); // the deep line along the front
      for (const r of L.rings ?? []) {
        const e = Math.hypot((x + 0.5 - r.x) / r.a, (y + 0.5 - r.y) / r.b);
        const off = (1 - e) * r.a;
        if (Math.abs(off) < 0.7) v += 0.42 * r.k;
        else if (off >= 0.7 && off < 1.8) v -= 0.16 * r.k;
      }
      v = clamp(v, 0.05, 1);
    }
    for (const [gx, gy, gl] of L.glints ?? []) if (y === gy && x >= gx && x < gx + (gl ?? 1)) v = 1;
    let c = mat.ramp[Math.round(clamp(v) * (mat.ramp.length - 1))];
    if (ghost && mat.kind === 'water') c = mix(c, [ghost[0], ghost[1], ghost[2], 255], lum(ghost) < 0.08 ? 0 : 0.22);
    if (dd < 1.5) c = ghost && lum(ghost) > 0.08 && mat.kind === 'water' ? mix(mat.rim, c, 0.3) : mat.rim;
    else if (ghost && mat.kind === 'mercury' && lum(ghost) < 0.06) c = mat.rim; // its black line stays
    out.set([c[0], c[1], c[2], 255], o);
  }
  for (const [x, y, s] of L.drops ?? []) drop(out, mat, Math.round(x), Math.round(y), s);
  return out;
}

/** A loose droplet or bead, 1 to 3 px across, with its rim. */
function drop(img: Img, mat: Mat, x: number, y: number, s: number): void {
  const R = mat.ramp, n = R.length - 1;
  const put = (px: number, py: number, c: Color) => {
    if (px < 0 || py < 0 || px >= N || py >= N) return;
    img.set([c[0], c[1], c[2], 255], (py * N + px) * 4);
  };
  const hi = R[n], lt = R[Math.round(n * 0.75)], md = R[Math.round(n * 0.45)];
  if (s <= 1) {
    put(x, y, mat.kind === 'water' ? R[n - 3] : hi);
    put(x, y + 1, mat.rim);
    return;
  }
  const rows = s === 2 ? ['.o.', 'oHo', '.o.'] : ['.oo.', 'oHLo', 'oLMo', '.oo.'];
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === 'o') put(x + i - 1, y + j - 1, mat.rim);
    else if (ch === 'H') put(x + i - 1, y + j - 1, hi);
    else if (ch === 'L') put(x + i - 1, y + j - 1, lt);
    else if (ch === 'M') put(x + i - 1, y + j - 1, md);
  }));
}

/** A ring of droplets thrown out round a point (a splash), `t` from 0 (start) to 1. */
function splash(cx: number, cy: number, t: number, n: number, reach: number, seed: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + hash(k, 1, seed) * 0.6;
    const r = reach * (0.55 + 0.45 * hash(k, 2, seed)) * t;
    const up = 18 * hash(k, 3, seed) * Math.sin(Math.PI * t);
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.3 - up, hash(k, 4, seed) > 0.6 ? 2 : 1]);
  }
  return out;
}

// --- the sequences ------------------------------------------------------------------------------

const ball = (dx: number, dy: number, rx: number, ry: number, w?: number): Ball => ({ x: GX + dx, y: GY + 1 + dy, rx, ry, w });

/** The still water puddle, frame i of n (a loop). */
const PUDDLE: Ball[] = [ball(0, 0, 23, 8), ball(-16, 2, 14, 6.5), ball(17, -1, 14, 6.5), ball(-6, -3, 14, 5.5), ball(8, 3, 14, 5.5), ball(-29, 0.5, 7, 4), ball(29, 1, 6, 3.4)];
function waterIdle(i: number, n = 6, extra: Partial<Liquid> = {}): Img {
  const t = i / n;
  const p2 = (t + 0.5) % 1;
  return shade({
    mat: WATER,
    balls: PUDDLE,
    wobble: 0.3,
    phase: t,
    rings: [
      { x: GX + 7, y: GY, a: 3 + 20 * t, b: (3 + 20 * t) * 0.27, k: 1 - t },
      { x: GX - 12, y: GY + 2, a: 2 + 12 * p2, b: (2 + 12 * p2) * 0.3, k: (1 - p2) * 0.8 },
    ],
    glints: [
      [GX - 21 + (i % 3), GY - 4, 3],
      ...(i % 2 === 0 ? [[GX + 12, GY - 4, 2] as [number, number, number]] : []),
      ...(i % 3 === 1 ? [[GX + 22, GY - 1, 1] as [number, number, number]] : []),
    ],
    env: 0.03 * Math.sin(t * TAU),
    ...extra,
  });
}

/** The still mercury puddle, frame i of n (a loop): a heavy body that wobbles, beads, a shimmering band. */
function mercuryBalls(t: number): Ball[] {
  const w = (k: number) => Math.sin((t + k) * TAU);
  return [
    ball(0, -2, 16 + w(0), 11 - 0.6 * w(0)),
    ball(-15 - w(0.3), 1.5, 11, 8 + 0.5 * w(0.3)),
    ball(15 + w(0.6), 0.5, 11 + 0.6 * w(0.6), 8),
    ball(2, 3, 14, 7),
  ];
}
function mercuryBeads(t: number): Ball[] {
  const w = (k: number) => Math.sin((t + k) * TAU);
  return [ball(-32 + w(0.2), 3, 4 + 0.3 * w(0.2), 3.4 - 0.3 * w(0.2)), ball(31, -2, 3.5, 3 + 0.3 * w(0.5)), ball(26, 6, 2.6, 2.3), ball(-25, -3, 2.4, 2.1)];
}
function mercuryIdle(i: number, n = 6, extra: Partial<Liquid> = {}): Img {
  const t = i / n;
  return shade({ mat: MERCURY, balls: mercuryBalls(t), beads: mercuryBeads(t), phase: t, env: 0.04 * Math.sin((t + 0.1) * TAU), ...extra });
}

interface Seq { id: string; label: string; frames: Img[]; fps: number; loop: boolean; wide?: boolean }

function waterSeqs(nj: Ninja): Seq[] {
  const idle = pose(nj, 'idle'), crouch = pose(nj, 'crouch');
  const melt: Img[] = [
    shade({ mat: WATER, fig: { img: idle, level: 0.22 }, balls: [ball(0, 0, 13, 4)], phase: 0.1, drops: [[GX - 14, GY - 6, 1], [GX + 15, GY - 4, 1]] }),
    shade({ mat: WATER, fig: { img: deform(idle, { sy: 0.96, spread: 0.15, wob: 0.6, phase: 0.5 }), level: 0.62 }, balls: [ball(0, 0, 19, 5.5), ball(-9, 1, 8, 3)], phase: 0.3, drops: [[GX - 17, GY - 20, 1], [GX + 18, GY - 12, 2]] }),
    shade({ mat: WATER, fig: { img: deform(crouch, { sy: 0.9, spread: 0.3, wob: 1, phase: 1 }), level: 0.8, round: 1 }, balls: [ball(0, 0, 24, 6.5), ball(-12, 1.5, 10, 3.5)], phase: 0.5, drops: [[GX - 22, GY - 10, 2], [GX + 24, GY - 16, 1]] }),
    shade({ mat: WATER, fig: { img: deform(crouch, { sy: 0.55, spread: 0.7, wob: 1.5, phase: 1.6 }), level: 2, round: 2 }, balls: [ball(0, 0, 28, 7), ball(-14, 1.5, 13, 4.5), ball(14, -1, 12, 4.5)], phase: 0.7 }),
    shade({ mat: WATER, fig: { img: deform(crouch, { sy: 0.22, spread: 1.4, wob: 1, phase: 2.1 }), level: 2, round: 3 }, balls: [...PUDDLE], phase: 0.9, drops: splash(GX, GY - 4, 0.6, 9, 40, 5) }),
    waterIdle(0, 6, { drops: splash(GX, GY - 2, 1, 9, 46, 5).filter((_, k) => k % 2 === 0) }),
  ];
  const rise: Img[] = [
    waterIdle(3, 6, { balls: [...PUDDLE, ball(0, -4, 9, 5.5)], rings: [{ x: GX, y: GY - 1, a: 20, b: 5.5, k: 1 }] }),
    shade({ mat: WATER, fig: { img: deform(crouch, { sy: 0.45, spread: 0.6, wob: 1.5, phase: 0.4 }), level: 2, round: 2 }, balls: [ball(0, 0, 28, 7), ball(-14, 1.5, 13, 4.5)], phase: 0.2, drops: splash(GX, GY - 20, 0.5, 7, 26, 9) }),
    shade({ mat: WATER, fig: { img: deform(crouch, { sy: 0.94, spread: 0.12, wob: 0.6, phase: 0.8 }), level: 0.6, round: 1 }, balls: [ball(0, 0, 24, 6.5)], phase: 0.4, drops: [[GX - 18, GY - 26, 2], [GX + 20, GY - 18, 1], [GX + 6, GY - 40, 1]] }),
    shade({ mat: WATER, fig: { img: idle, level: 0.32 }, balls: [ball(0, 0, 20, 5.5)], phase: 0.6, drops: [[GX - 12, GY - 34, 1], [GX + 13, GY - 28, 2], [GX - 15, GY - 14, 1]] }),
    shade({ mat: WATER, fig: { img: idle, level: 0.06 }, balls: [ball(0, 0, 14, 4)], phase: 0.8, drops: [[GX + 12, GY - 10, 1], [GX - 10, GY - 4, 1]] }),
  ];
  return [
    { id: `agua-transformarse-${nj.id}`, label: `Agua - transformarse (${nj.label})`, frames: melt, fps: 9, loop: false },
    { id: `agua-salir-${nj.id}`, label: `Agua - salir (${nj.label})`, frames: rise, fps: 9, loop: false },
  ];
}

function mercurySeqs(nj: Ninja): Seq[] {
  const idle = pose(nj, 'idle'), crouch = pose(nj, 'crouch');
  const bead = (dx: number, dy: number, r: number): Ball => ball(dx, dy, r, r * 0.85);
  const melt: Img[] = [
    shade({ mat: MERCURY, fig: { img: idle, level: 0.25 }, balls: [ball(0, 0, 13, 4.5)] }),
    shade({ mat: MERCURY, fig: { img: idle, level: 0.72 }, balls: [ball(0, 0, 16, 5.5)], beads: [bead(-21, 3, 2.6)] }),
    shade({ mat: MERCURY, fig: { img: deform(crouch, { sy: 0.95, spread: 0.1, wob: 0, phase: 0 }), level: 1.3 }, balls: [ball(0, 0, 18, 6)], beads: [bead(-24, 3, 3), bead(23, -1, 2.4)] }),
    shade({ mat: MERCURY, fig: { img: deform(crouch, { sy: 0.6, spread: 0.5, wob: 0.5, phase: 0.5 }), level: 2, round: 3 }, balls: [ball(0, 0, 20, 7)], beads: [bead(-29, 2, 3.6), bead(28, -3, 3), bead(-12, -30, 2.4)] }),
    shade({ mat: MERCURY, balls: [ball(0, -8, 16, 13), ball(0, 0, 24, 8), ball(-10, 1, 12, 6)], beads: [bead(-33, 3, 4), bead(31, -3, 3.4), bead(24, 7, 2.6), bead(-22, -16, 2.2)] }),
    mercuryIdle(0),
  ];
  const rise: Img[] = [
    mercuryIdle(2, 6, { balls: [...mercuryBalls(2 / 6), ball(0, -6, 12, 10)] }),
    shade({ mat: MERCURY, balls: [ball(0, 0, 22, 8), ball(0, -18, 10, 17), ball(0, -36, 8, 10)], beads: [bead(-31, 3, 3.6), bead(28, -2, 3)] }),
    shade({ mat: MERCURY, fig: { img: deform(crouch, { sy: 0.92, spread: 0.15, wob: 0, phase: 0 }), level: 2, round: 2 }, balls: [ball(0, 0, 20, 7)], beads: [bead(29, 2, 3.2)] }),
    shade({ mat: MERCURY, fig: { img: idle, level: 0.48 }, balls: [ball(0, 0, 16, 5.5)], beads: [bead(23, 3, 2.6)] }),
    shade({ mat: MERCURY, fig: { img: idle, level: 0.04 }, balls: [ball(-2, 1, 9, 3.5)], beads: [bead(-17, 3, 2.4), bead(16, 4, 2.2)] }),
  ];
  return [
    { id: `mercurio-transformarse-${nj.id}`, label: `Mercurio - transformarse (${nj.label})`, frames: melt, fps: 9, loop: false },
    { id: `mercurio-salir-${nj.id}`, label: `Mercurio - salir (${nj.label})`, frames: rise, fps: 9, loop: false },
  ];
}

// --- the crack: a stone wall with a slit under it -------------------------------------------------

const WALL = { x0: 144, x1: 168, top: 148, cap: 46, bottom: 212, gap0: 213, gap1: 219 };
const STONE = ['#4a4752', '#5e5a66', '#736f7b', '#8a8692', '#a29eaa'].map((h) => hex(h));
const MORTAR = hex('#2a2830');
const SLIT = hex('#141118');

/**
 * The wall seen end on, as the battle shows a wall that runs into the distance: its end face (the
 * stone blocks) and above it its top running back. The slit under it goes right through.
 */
function drawWall(img: Img, under: boolean): void {
  const put = (x: number, y: number, c: Color) => img.set([c[0], c[1], c[2], 255], (y * N + x) * 4);
  const { x0, x1, top, bottom, gap0, gap1, cap } = WALL;
  if (under) {
    // The dark slit under the wall, behind whatever slides through it.
    for (let y = gap0; y <= gap1; y++) for (let x = x0; x <= x1; x++) put(x, y, SLIT);
    return;
  }
  for (let y = top - cap; y <= bottom; y++) for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1 || y === top - cap || y === bottom || y === top;
    if (edge) { put(x, y, y === top ? STONE[1] : hex('#07060b')); continue; }
    if (y < top) {
      // The top, running back: lit from above, cap stones in courses that get thinner far away.
      const k = (top - y) / cap;
      const course = Math.floor(Math.sqrt(k) * 7);
      const atJoint = Math.floor(Math.sqrt((top - y - 1) / cap) * 7) !== course;
      put(x, y, atJoint ? STONE[2] : STONE[x === x0 + 1 ? 4 : hash(course, 0, 3) > 0.5 ? 4 : 3]);
      continue;
    }
    const row = Math.floor((y - top - 1) / 9);
    const off = row % 2 ? 6 : 0;
    const bx = Math.floor((x - x0 + off) / 12);
    const ly = (y - top - 1) % 9, lx = (x - x0 + off) % 12;
    if (ly === 8 || lx === 11) { put(x, y, MORTAR); continue; }
    const tone = 1 + Math.floor(hash(bx, row, 7) * 2.99);
    let c = STONE[tone];
    if (ly === 0 || lx === 0) c = STONE[Math.min(4, tone + 1)]; // lit upper-left of each block
    else if (ly === 7 || lx === 10) c = STONE[Math.max(0, tone - 1)];
    put(x, y, c);
  }
  // The lip under the slit, so it reads as a gap right through the wall.
  for (let x = x0; x <= x1; x++) put(x, gap1 + 1, hex('#07060b'));
  void gap0;
}

function crackSeq(): Seq {
  const bead = (dx: number, dy: number, r: number): Ball => ball(dx, dy, r, r * 0.85);
  // Left to right: the body leans forward as it flows, its front thins into the slit, the metal
  // runs through it as a ribbon and gathers into a bead on the far side.
  const steps: { balls: Ball[]; beads?: Ball[] }[] = [
    { balls: [ball(-56, -2, 15, 10), ball(-42, 0, 12, 8), ball(-70, 1, 10, 6), ball(-82, 2, 6, 3.5)], beads: [bead(-96, 3, 2.6)] },
    { balls: [ball(-16, -1, 15, 9.5), ball(-2, 0.5, 13, 7), ball(-30, 1, 11, 6.5), ball(-44, 2, 6, 3.5)], beads: [bead(-58, 3, 2.6)] },
    { balls: [ball(-12, -1, 14, 9), ball(6, 1, 12, 6), ball(26, 0, 14, 4.5), ball(46, -1, 7, 5)], beads: [bead(-34, 3, 2.4)] },
    { balls: [ball(-2, 1, 10, 6), ball(26, 0, 16, 4.5), ball(58, -2, 14, 10), ball(46, 1, 9, 5)], beads: [bead(-16, 3, 2.6)] },
    { balls: [ball(28, 0, 12, 3.5), ball(66, -2, 16, 10.5), ball(52, 1, 10, 6)], beads: [bead(84, 4, 2.8)] },
    { balls: [ball(80, -2, 16, 11), ball(66, 1.5, 11, 7.5), ball(94, 1.5, 10, 7)], beads: [bead(52, 4, 2.4)] },
  ];
  // Inside the wall's span only the slit shows the metal: the wall hides the rest.
  const clip = (x: number, y: number) => x >= WALL.x0 && x <= WALL.x1 && (y < WALL.gap0 || y > WALL.gap1);
  const frames = steps.map((s, i) => {
    const img = blank();
    drawWall(img, true);
    const liq = shade({ mat: MERCURY, balls: s.balls, beads: s.beads, env: 0.03 * Math.sin((i / 6) * TAU), clip });
    for (let p = 0; p < N * N; p++) if (liq[p * 4 + 3]) img.set(liq.subarray(p * 4, p * 4 + 4), p * 4);
    drawWall(img, false);
    return img;
  });
  return { id: 'mercurio-moverse-rendija', label: 'Mercurio - moverse / rendija', frames, fps: 7, loop: false, wide: true };
}

// --- write --------------------------------------------------------------------------------------

function main(): void {
  // Staging only: refuse to run without WORLD_OUT, so nothing is ever written into src/assets.
  const root = process.env.WORLD_OUT;
  if (!root) {
    console.error('Set WORLD_OUT=<staging dir>: this sample never writes into src/assets.');
    process.exit(1);
  }
  const dir = join(root, 'charco_muestra');
  mkdirSync(dir, { recursive: true });
  const seqs: Seq[] = [
    { id: 'agua-charco-quieto', label: 'Agua - charco quieto', frames: [0, 1, 2, 3, 4, 5].map((i) => waterIdle(i)), fps: 6, loop: true },
    ...NINJAS.flatMap(waterSeqs),
    { id: 'mercurio-charco-quieto', label: 'Mercurio - charco quieto', frames: [0, 1, 2, 3, 4, 5].map((i) => mercuryIdle(i)), fps: 6, loop: true },
    ...NINJAS.flatMap(mercurySeqs),
    crackSeq(),
  ];
  const manifest = seqs.map((s) => {
    const files = s.frames.map((f, i) => {
      const name = `${s.id}-${i + 1}.png`;
      writePng(join(dir, name), N, N, new Uint8Array(f.buffer));
      return name;
    });
    return { id: s.id, label: s.label, files, fps: s.fps, loop: s.loop, wide: !!s.wide };
  });
  // The ninjas standing, for the map shots' scale.
  for (const nj of NINJAS) writePng(join(dir, `ninja-${nj.id}.png`), N, N, new Uint8Array(pose(nj, 'idle').buffer));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ frame: N, feet: [GX, GY], pxPerM: 57, sequences: manifest }, null, 1) + '\n');
  console.log(`wrote ${manifest.reduce((n, s) => n + s.files.length, 0)} frames to ${dir}`);
}

main();
