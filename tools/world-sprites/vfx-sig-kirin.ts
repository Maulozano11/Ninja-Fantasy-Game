// Kirin (jutsu id `kirin_thunder`): the first S-rank lightning signature effect. Two sprites in
// the group vfx_lightning_sig; the game picks `kirin_enh` when the jutsu is cast enhanced.
//
//   kirin       3 m circle (ground ellipse 342 x 228). A storm cloud churns into existence about
//               9 m above the target and the giant kanji 雷 (thunder) is written in lightning in
//               it; then a super dramatic bolt: a stepped leader feels its way down, the return
//               stroke connects (blinding core, forked branches, the sky lighting up), secondary
//               strikes hit inside the circle and the channel re-strikes.
//   kirin_enh   4.5 m circle (513 x 342). The same storm and kanji, bigger; the bolt comes down
//               as the lightning dragon: horned head with a mane of arcs and open jaws, glowing
//               eyes, forelegs with talons, and a serpentine body of lightning coiling in depth
//               all the way back up into the cloud (near coil brighter and thicker, far coil
//               dimmer and thinner). A bigger impact.
//
// Anims (both): gather (10f once, 12 fps), strike (8f once, 16 fps), impact (8f once, 14 fps),
// fade (8f once, 12 fps; the last frame is almost empty). The anchor is the impact point on the
// ground (the circle's centre); everything plays there.
//
//   WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-sig-kirin.ts <art2>
//
// Look: blue and purple lightning (white core, pale cyan, electric blue, violet, deep purple)
// with tinted outlines; a dark slate-violet storm cloud built from shaded billows, its underside
// lit from inside; hard-banded energy with stepped glow rings. Deterministic (hash noise only).

import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { Anim, CHARACTER_FEET, Canvas, Color, WorldSprite, characterRef, hex, mix, noise, previewDir, withAlpha, writeGroup } from './kit';
import { L, Pt, TAU, clamp, lerp, pal, puffs, rnd, rockPts, smooth, text, textWidth } from './vfx-b-lib';
import { borderTouches } from './vfx-b-wall3d';

const OUT = previewDir();
const PPM = 57;
const DPM = 38;
const SQ = DPM / PPM;

/** Lightning: 0 outline (deep indigo) .. 8 white core. */
const K = pal('#1b0838', '#2f0f63', '#4b1c96', '#6a32cc', '#5a55f0', '#3f8cff', '#78ccff', '#c4f0ff', '#ffffff');
/** Storm cloud: 0 outline .. 10 the brightest lit underside (lavender). */
const CL = pal('#0b0916', '#13101f', '#1b172a', '#241f37', '#2e2845', '#3a3256', '#483e6b', '#5a4d86', '#7062a6', '#8d80c8', '#b2a8ea');
/** Rock debris. */
const RK = pal('#0f0c18', '#221d2e', '#363044', '#4b445c', '#645c78', '#857c9c');
/** Dust and smoke. */
const DU = pal('#0e0b17', '#1c1828', '#2a2438', '#383049', '#483f5c', '#5c5273', '#766c90');

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

// --- the two versions --------------------------------------------------------------------

interface Cfg {
  key: 'kirin' | 'kirin_enh';
  enh: boolean;
  W: number;
  H: number;
  AX: number;
  AY: number;
  /** Centre of the cloud's swirl (screen y). */
  CY: number;
  /** Radius of the jutsu circle in px (57 px/m). */
  AREA: number;
  /** Cloud radius and billow size scales. */
  cs: number;
  ps: number;
  /** Kanji box. */
  kw: number;
  kh: number;
  /** Where the bolt or the dragon leaves the cloud (screen y). */
  exitY: number;
}
const NORMAL: Cfg = { key: 'kirin', enh: false, W: 640, H: 860, AX: 320, AY: 720, CY: 720 - 9 * PPM, AREA: 3 * PPM, cs: 1, ps: 1, kw: 184, kh: 196, exitY: 720 - 9 * PPM + 128 };
const ENH: Cfg = { key: 'kirin_enh', enh: true, W: 768, H: 960, AX: 384, AY: 750, CY: 750 - 9.5 * PPM, AREA: 4.5 * PPM, cs: 1.19, ps: 1.12, kw: 214, kh: 228, exitY: Math.round(750 - 9.5 * PPM + 150) };
let G: Cfg = NORMAL;

const PHASES: { key: string; n: number; fps: number }[] = [
  { key: 'gather', n: 10, fps: 12 },
  { key: 'strike', n: 8, fps: 16 },
  { key: 'impact', n: 8, fps: 14 },
  { key: 'fade', n: 8, fps: 12 },
];
const T_STRIKE = 10 / 12, T_IMPACT = T_STRIKE + 8 / 16, T_FADE = T_IMPACT + 8 / 14;

/** Ground-plane point: gx along x, gz in depth (both in px of 57 per meter) from the anchor. */
const gp = (gx: number, gz: number): Pt => [G.AX + gx, G.AY + gz * SQ];

// --- lightning geometry ------------------------------------------------------------------

/** Jagged path from a to b by midpoint displacement (self-similar: rough is per segment length). */
function jag(a: Pt, b: Pt, rough: number, seed: number, depth = 5): Pt[] {
  let pts: Pt[] = [a, b];
  for (let d = 0; d < depth; d++) {
    const out: Pt[] = [pts[0]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const p = pts[i], q = pts[i + 1];
      const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
      const off = (rnd(seed, d * 997 + i) - 0.5) * 2 * rough * len;
      out.push([(p[0] + q[0]) / 2 - (dy / len) * off, (p[1] + q[1]) / 2 + (dx / len) * off], q);
    }
    pts = out;
  }
  return pts;
}

function plen(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return s;
}

/** The first fraction q of a polyline, by length. */
function partial(pts: Pt[], q: number): Pt[] {
  if (q >= 1) return pts;
  if (q <= 0) return [pts[0]];
  const goal = plen(pts) * q;
  let acc = 0;
  const out: Pt[] = [pts[0]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + seg >= goal) {
      const k = (goal - acc) / (seg || 1);
      out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]);
      return out;
    }
    acc += seg;
    out.push(b);
  }
  return out;
}

/** Forks off a path: n jagged branches leaving at 20-50 degrees. */
function forkPaths(main: Pt[], seed: number, n: number, len: number, rough = 0.25, from = 0, to = 1): Pt[][] {
  const out: Pt[][] = [];
  if (main.length < 4) return out;
  for (let k = 0; k < n; k++) {
    const i = Math.min(main.length - 2, 1 + Math.floor(lerp(from, to, rnd(seed, k, 1)) * (main.length - 2)));
    const p = main[i], a = main[Math.max(0, i - 2)], b = main[Math.min(main.length - 1, i + 2)];
    const dir = Math.atan2(b[1] - a[1], b[0] - a[0]) + (rnd(seed, k, 2) < 0.5 ? -1 : 1) * (0.35 + 0.5 * rnd(seed, k, 3));
    const l = len * (0.45 + 0.55 * rnd(seed, k, 4));
    out.push(jag(p, [p[0] + Math.cos(dir) * l, p[1] + Math.sin(dir) * l], rough, seed * 7 + k, 4));
  }
  return out;
}

// --- glow and energy layers ------------------------------------------------------------

/** Chamfer distance (in thirds of a pixel) from every pixel to the nearest masked one. */
function outside(m: Uint8Array): Float32Array {
  const { W, H } = G;
  const d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = m[i] ? 0 : 1e6;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - W] + 3);
        if (x > 0) v = Math.min(v, d[i - W - 1] + 4);
        if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4);
      }
      d[i] = v;
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x < W - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < H - 1) {
        v = Math.min(v, d[i + W] + 3);
        if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + W - 1] + 4);
      }
      d[i] = v;
    }
  return d;
}

type Ring = [number, Color, number];

/** Stepped glow rings around everything in `layers` (radius px, color, alpha), scaled by k. */
function glow(c: Canvas, layers: L[], rings: Ring[], k = 1): void {
  if (k <= 0.01) return;
  const { W, H } = G;
  const m = new Uint8Array(W * H);
  let any = false;
  for (const l of layers)
    for (let i = 0; i < W * H; i++)
      if (l.idx[i] >= 0) {
        m[i] = 1;
        any = true;
      }
  if (!any) return;
  const d = outside(m);
  const rs = [...rings].sort((a, b) => a[0] - b[0]);
  const maxR = rs[rs.length - 1][0];
  for (let i = 0; i < W * H; i++) {
    if (m[i]) continue;
    const dd = d[i] / 3;
    if (dd > maxR) continue;
    for (const [r, col, a] of rs)
      if (dd <= r) {
        const aa = Math.round(a * k);
        if (aa > 0) c.plot(i % W, (i / W) | 0, withAlpha(col, Math.min(255, aa)));
        break;
      }
  }
}

const GLOW_ARC: Ring[] = [[3, K[4], 110], [7, K[2], 50]];

/** Lightning strokes sorted by thickness: thin (1 px), mid (about 3 px), thick (tubes). */
class Arcs {
  thin = new L(G.W, G.H);
  mid = new L(G.W, G.H);
  thick = new L(G.W, G.H);
  add(pts: Pt[], r: number): void {
    if (pts.length < 2) return;
    if (r < 0.9) this.thin.path(pts, 7);
    else if (r < 2.2) this.mid.tube(pts, () => r, 1);
    else this.thick.tube(pts, () => r, 1);
  }
  tube(pts: Pt[], rf: (t: number) => number): void {
    if (pts.length >= 2) this.thick.tube(pts, rf, 1);
  }
  render(c: Canvas, o: { dim?: number; alpha?: number; glow?: Ring[] | null; gk?: number } = {}): void {
    const dim = o.dim ?? 0, a = Math.round(o.alpha ?? 255);
    if (a <= 0) return;
    if (o.glow !== null) glow(c, [this.thin, this.mid, this.thick], o.glow ?? GLOW_ARC, (o.gk ?? 1) * (a / 255));
    const dm = (s: number): number => Math.max(1, s - dim);
    this.thin.map(dm).render(c, K, { outline: K[3], alpha: a, outlineAlpha: Math.round(a * 0.6) });
    this.mid.bands([1], [5, 8]).map(dm).render(c, K, { outline: K[2], alpha: a, outlineAlpha: Math.round(a * 0.85) });
    this.thick.bands([1, 2, 3, 4.5], [3, 5, 6, 7, 8]).map(dm).render(c, K, { outline: K[1], alpha: a, outlineAlpha: a });
  }
}

/** A forked bolt from a to b into `arcs`; returns the main path. */
function bolt(arcs: Arcs, a: Pt, b: Pt, seed: number, o: { r?: number; rough?: number; forks?: number; forkLen?: number; depth?: number } = {}): Pt[] {
  const r = o.r ?? 1.3;
  const main = jag(a, b, o.rough ?? 0.22, seed, o.depth ?? 5);
  arcs.add(main, r);
  const fl = o.forkLen ?? Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.4;
  for (const fp of forkPaths(main, seed + 1, o.forks ?? 2, fl)) {
    arcs.add(fp, r > 1.6 ? 1.1 : 0.5);
    for (const g2 of forkPaths(fp, seed + 2, 1, fl * 0.45)) arcs.add(g2, 0.5);
  }
  return main;
}

/** Ground bolt built on the ground plane (so every point stays inside radius `lim`). */
function groundBolt(arcs: Arcs, g0: Pt, g1: Pt, seed: number, r: number, lim: number): void {
  const clampG = (p: Pt): Pt => {
    const d = Math.hypot(p[0], p[1]);
    return d > lim ? [(p[0] / d) * lim, (p[1] / d) * lim] : p;
  };
  const main = jag(g0, g1, 0.2, seed, 5).map(clampG);
  arcs.add(main.map((p) => gp(p[0], p[1])), r);
  for (const fp of forkPaths(main, seed + 1, 2, Math.hypot(g1[0] - g0[0], g1[1] - g0[1]) * 0.3)) arcs.add(fp.map(clampG).map((p) => gp(p[0], p[1])), 0.5);
}

/** A bright spark: a small white disc with four rays. */
function spark(c: Canvas, p: Pt, s: number, k = 1): void {
  const l = new L(G.W, G.H);
  l.disc(p[0], p[1], s * 0.45, 8);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) l.line(p[0], p[1], p[0] + dx * s * 1.4, p[1] + dy * s * 1.4, 7);
  glow(c, [l], [[2, K[6], 160], [5, K[4], 80]], k);
  l.render(c, K, { outline: K[3], alpha: Math.round(255 * k), outlineAlpha: Math.round(170 * k) });
}

// --- the storm cloud --------------------------------------------------------------------

interface Billow {
  x: number;
  y: number;
  r: number;
  /** Paint order: lower is farther. */
  depth: number;
  /** Brightness of the moonlit side (1 normal). */
  tone: number;
  /** How much the light from below reaches its underside. */
  under: number;
  /** 0..1: still condensing (eroded into wisps). */
  wisp?: number;
}
interface BillowLight {
  under: number;
  /** Point lights: x, y, intensity, radius. */
  lights: [number, number, number, number][];
  alpha: number;
  dissolve: number;
  seed: number;
}

/**
 * Shaded billows, back to front. Every pixel takes its billow's sphere normal, so the moonlit
 * tops (upper left), the undersides lit from below and the point lights all shade it in hard
 * bands; a billow overlapping one behind it gets a dark separation band, the silhouette a
 * tinted outline. Used for the storm cloud and the impact smoke.
 */
function billows(c: Canvas, list: Billow[], s: BillowLight): void {
  if (s.alpha <= 0 || !list.length) return;
  const { W, H } = G;
  const sorted = [...list].sort((a, b) => a.depth - b.depth);
  const N = W * H;
  const id = new Int16Array(N).fill(-1), U = new Float32Array(N), V = new Float32Array(N);
  sorted.forEach((p, k) => {
    if (p.r < 1.5) return;
    for (let y = Math.max(1, Math.floor(p.y - p.r * 1.1)); y <= Math.min(H - 2, Math.ceil(p.y + p.r * 1.1)); y++)
      for (let x = Math.max(1, Math.floor(p.x - p.r * 1.1)); x <= Math.min(W - 2, Math.ceil(p.x + p.r * 1.1)); x++) {
        const u = (x + 0.5 - p.x) / p.r, v = (y + 0.5 - p.y) / p.r, rr = Math.sqrt(u * u + v * v);
        const lim = 1 + 0.16 * (noise(x + k * 37, y + k * 19, 7, s.seed) - 0.5);
        if (rr > lim) continue;
        const ds = Math.max(s.dissolve, p.wisp ?? 0);
        if (ds > 0 && noise(x, y, 6, s.seed + 22) < ds * 1.3 - 0.6 + 0.7 * rr) continue;
        const i = y * W + x;
        id[i] = k;
        U[i] = u / lim;
        V[i] = v / lim;
      }
  });
  for (let i = 0; i < N; i++) {
    const k = id[i];
    if (k < 0) continue;
    const x = i % W, y = (i / W) | 0, p = sorted[k];
    const u = U[i], v = V[i], w = Math.sqrt(Math.max(0, 1 - u * u - v * v));
    const key = Math.max(0, -0.45 * u - 0.68 * v + 0.58 * w);
    const und = Math.max(0, 0.85 * v + 0.3 * w - 0.15) * p.under * s.under;
    let pt = 0;
    for (const [lx, ly, li, lr] of s.lights) {
      const dd = Math.hypot(x - lx, (y - ly) * 1.4) / lr;
      if (dd < 1) pt += li * (1 - dd) * (1 - dd) * (0.5 + 0.5 * w);
    }
    const val = (0.02 + 0.72 * key * key * 1.25) * p.tone + 0.75 * und + pt;
    let st = clamp(1 + Math.floor((val + (noise(x, y, 4, 5) - 0.5) * 0.06) * 9.5), 1, 10);
    let edge = false, sep = false;
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      const q = id[j];
      if (q < 0) edge = true;
      else if (q < k) sep = true;
    }
    let col: Color;
    if (edge) col = CL[0];
    else {
      if (sep) st = Math.max(1, st - 3);
      const lit = und * 0.75 + pt;
      col = lit > 0.35 && st >= 6 ? mix(CL[st], K[Math.min(7, st - 3)], clamp((lit - 0.35) * 1.6, 0, 0.7)) : CL[st];
    }
    c.plot(x, y, s.alpha >= 255 ? col : withAlpha(col, s.alpha));
  }
}

interface CPuff {
  R: number;
  a0: number;
  r: number;
  lift: number;
  /** 0 rim wall, 1 the swirl's surface, 2 underside skirt (front), 3 back tower. */
  kind: 0 | 1 | 2 | 3;
  born: number;
}
/** Cloud radius (px) before the per-version scale. */
const RM = 244;
const CLOUD: CPuff[] = (() => {
  const out: CPuff[] = [];
  for (let k = 0; k < 30; k++) out.push({ R: RM * (0.84 + 0.16 * rnd(11, k)), a0: (k / 30) * TAU + rnd(12, k) * 0.18, r: 30 + 12 * rnd(13, k), lift: -(4 + 14 * rnd(14, k)), kind: 0, born: 0.32 + 0.22 * rnd(15, k) });
  for (let k = 0; k < 64; k++) {
    const R = RM * 0.86 * Math.sqrt((k + 0.5) / 64);
    if (R < 44) continue;
    out.push({ R, a0: k * 2.39996 + rnd(16, k) * 0.3, r: (20 + 10 * rnd(17, k)) * (0.75 + 0.35 * (R / RM)), lift: 16 * (1 - R / RM), kind: 1, born: -0.25 + 0.6 * (R / RM) + 0.08 * rnd(18, k) });
  }
  for (let k = 0; k < 14; k++) out.push({ R: RM * (0.68 + 0.28 * rnd(19, k)), a0: Math.PI * (0.1 + 0.8 * (k / 13)) + rnd(20, k) * 0.1, r: 18 + 10 * rnd(21, k), lift: 22 + 14 * rnd(22, k), kind: 2, born: 0.42 + 0.2 * rnd(23, k) });
  for (let k = 0; k < 8; k++) out.push({ R: RM * (0.35 + 0.4 * rnd(24, k)), a0: Math.PI * (1.1 + 0.8 * (k / 7)), r: 32 + 12 * rnd(25, k), lift: -(18 + 14 * rnd(26, k)), kind: 3, born: 0.25 + 0.3 * rnd(27, k) });
  return out;
})();

interface CloudState {
  /** Gather progress 0..1 (1 once formed). */
  grow: number;
  /** Global time (s) for the swirl. */
  T: number;
  /** Fade progress 0..1. */
  dissolve: number;
  /** Strength of the light from inside, lighting the undersides. */
  under: number;
  lights: [number, number, number, number][];
  alpha: number;
}

/** The storm cloud: a raised rim of billows around a swirl sloping into the eye, a lit skirt in front, towers behind. */
function cloud(c: Canvas, s: CloudState): void {
  const { AX, CY, cs, ps } = G;
  const contract = 1.12 - 0.12 * smooth(0, 1, s.grow);
  const list: Billow[] = [];
  CLOUD.forEach((p, k) => {
    const g = smooth(p.born, p.born + 0.3, s.grow);
    if (g < 0.06) return;
    const r = p.r * ps * (0.55 + 0.45 * g) * (1 - 0.38 * s.dissolve);
    const a = p.kind <= 1 ? p.a0 + 0.55 * Math.sqrt(120 / p.R) * s.T : p.a0 + 0.1 * s.T;
    const R = p.R * cs * contract * (1 + 0.12 * s.dissolve);
    const sa = Math.sin(a);
    list.push({
      x: AX + R * Math.cos(a),
      y: CY + R * sa * 0.38 + p.lift * ps - 24 * s.dissolve,
      r,
      depth: [sa, sa * 0.5 - 0.25, sa + 0.5, sa - 0.6][p.kind] + k * 1e-4,
      tone: [0.88, 0.52 + 0.33 * (p.R / RM), 0.85, 0.95][p.kind],
      under: [0.45 + 0.45 * Math.max(0, sa), 0.3, 1, 0.2][p.kind],
      wisp: 1 - g,
    });
  });
  billows(c, list, { under: s.under, lights: s.lights, alpha: s.alpha, dissolve: s.dissolve, seed: 71 });
}

/** The glowing eye of the vortex with light spiralling into it. */
function vortexEye(c: Canvas, e: number, T: number): void {
  if (e <= 0.03) return;
  const { AX, CY, cs } = G;
  const rx = (16 + 30 * e) * cs, ry = rx * 0.38;
  const l = new L(G.W, G.H);
  l.ellipse(AX, CY + 2, rx, ry, 1);
  const sp = new L(G.W, G.H);
  for (let arm = 0; arm < 3; arm++)
    for (let s = 0; s <= 1; s += 0.004) {
      const rho = rx * (1 + 1.8 * (1 - s)), phi = arm * (TAU / 3) + 2.4 * (1 - s) + T * 2.2;
      if (s > 0.15) sp.set(AX + rho * Math.cos(phi), CY + 2 + rho * Math.sin(phi) * 0.38, s > 0.7 ? 7 : 6);
    }
  glow(c, [l], [[4, K[4], 130], [10, K[3], 70], [18, K[2], 34]], e);
  l.bands([1, 2, 3.5, 5], [2, 3, 5, 7, 8]).render(c, K, { outline: K[1] });
  sp.render(c, K, { outline: K[3], alpha: Math.round(210 * e), outlineAlpha: Math.round(120 * e) });
}

/** Arcs crawling through the cloud; returns their midpoints as point lights. */
function cloudArcs(c: Canvas, n: number, seed: number, o: { alpha?: number; len?: number } = {}): [number, number, number, number][] {
  const { AX, CY, cs } = G;
  const arcs = new Arcs();
  const lights: [number, number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const R = (30 + 190 * rnd(seed, k, 1)) * cs, a = rnd(seed, k, 2) * TAU;
    const p: Pt = [AX + R * Math.cos(a), CY + R * Math.sin(a) * 0.38 + 6];
    const d = rnd(seed, k, 3) * TAU, len = (o.len ?? 1) * (60 + 90 * rnd(seed, k, 4)) * cs;
    const q: Pt = [p[0] + Math.cos(d) * len, p[1] + Math.sin(d) * len * 0.35];
    bolt(arcs, p, q, seed * 11 + k, { r: k % 2 ? 1.3 : 0.6, rough: 0.3, forks: 2 });
    lights.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 0.55, 80 * cs]);
  }
  arcs.render(c, { alpha: o.alpha ?? 220 });
  return lights;
}

/** Sky lighting up behind the cloud during a stroke. */
function skyFlash(c: Canvas, k: number): void {
  if (k <= 0.02) return;
  const { AX, CY, cs } = G;
  const l = new L(G.W, G.H);
  for (const [rx, ry, st] of [[280, 150, 2], [230, 120, 3], [170, 90, 4]] as [number, number, number][]) l.ellipse(AX, CY + 30, rx * cs, ry * cs, st);
  l.render(c, K, { outline: null, alpha: (st) => Math.round(k * ({ 2: 30, 3: 38, 4: 46 } as Record<number, number>)[st]) });
}

// --- the kanji 雷 ---------------------------------------------------------------------------

/** 雷 in a unit box, stroke by stroke in writing order (雨 over 田). */
const KANJI: Pt[][] = [
  [[0.16, 0.055], [0.84, 0.045]],
  [[0.1, 0.15], [0.1, 0.41]],
  [[0.1, 0.15], [0.9, 0.15], [0.9, 0.41], [0.84, 0.37]],
  [[0.5, 0.05], [0.5, 0.42]],
  [[0.23, 0.215], [0.36, 0.255]],
  [[0.23, 0.315], [0.36, 0.355]],
  [[0.64, 0.215], [0.77, 0.255]],
  [[0.64, 0.315], [0.77, 0.355]],
  [[0.2, 0.52], [0.2, 0.95]],
  [[0.2, 0.52], [0.8, 0.52], [0.8, 0.95]],
  [[0.2, 0.735], [0.8, 0.735]],
  [[0.5, 0.52], [0.5, 0.95]],
  [[0.2, 0.95], [0.8, 0.95]],
];

function kanjiPaths(): { pts: Pt[]; r: number }[] {
  const { AX, CY, kw, kh } = G;
  const x0 = AX - kw / 2, y0 = CY - 6 - kh / 2;
  return KANJI.map((st, k) => {
    const pts: Pt[] = [];
    for (let i = 0; i + 1 < st.length; i++) {
      const a: Pt = [x0 + st[i][0] * kw, y0 + st[i][1] * kh], b: Pt = [x0 + st[i + 1][0] * kw, y0 + st[i + 1][1] * kh];
      const seg = jag(a, b, 0.05, 400 + k * 10 + i, 4);
      if (i > 0) seg.shift();
      pts.push(...seg);
    }
    return { pts, r: (k >= 4 && k <= 7 ? 3.5 : 4.4) * (kw / 184) };
  });
}

/** The kanji written in lightning up to `write` (0..1), at brightness `bright`. */
function kanji(c: Canvas, write: number, bright: number, fseed: number): void {
  if (bright <= 0.05 || write <= 0.2) return;
  const l = new L(G.W, G.H), arcs = new Arcs();
  const tips: Pt[] = [];
  kanjiPaths().forEach((s, k) => {
    const q = clamp((write - (0.2 + k * 0.048)) / 0.1, 0, 1);
    if (q <= 0) return;
    const pts = partial(s.pts, q);
    if (pts.length < 2) return;
    l.tube(pts, (t) => s.r * (0.7 + 0.42 * Math.sin(Math.PI * clamp(t * q, 0, 1))), 1);
    if (q < 1) tips.push(pts[pts.length - 1]);
    else if (rnd(fseed, k, 3) < 0.8) for (const fp of forkPaths(s.pts, fseed * 31 + k, 2, 26 * (G.kw / 184), 0.3)) arcs.add(fp, 0.5);
  });
  // Fading out: it loses its white core first, then its alpha (no dark ghost outline is left).
  const dim = Math.round((1 - bright) * 2);
  const a = Math.round(255 * Math.min(1, Math.pow(bright, 1.5) * 1.3));
  glow(c, [l], [[3, K[5], 140], [7, K[3], 80], [13, K[2], 36]], bright * bright);
  l.bands([1, 2, 3.2], [3, 5, 7, 8])
    .map((s) => Math.max(2, s - dim))
    .render(c, K, { outline: K[2], alpha: a, outlineAlpha: Math.round(a * 0.8) });
  arcs.render(c, { dim, glow: null, alpha: a });
  for (const t of tips) spark(c, t, 5);
}

// --- ground pieces ---------------------------------------------------------------------

/** The jutsu circle telegraphed on the ground: a faint ring with crawling arc dashes. */
function telegraph(c: Canvas, k: number, seed: number): void {
  if (k <= 0.02) return;
  const A = G.AREA;
  const ring = new L(G.W, G.H);
  for (let a = 0; a < TAU; a += 0.002) {
    const p = gp(A * Math.cos(a), A * Math.sin(a));
    ring.set(p[0], p[1], 4);
  }
  ring.render(c, K, { outline: null, alpha: Math.round(150 * k) });
  const arcs = new Arcs();
  const n = Math.round(28 * (A / 171));
  for (let j = 0; j < n; j++) {
    if (rnd(seed, j) > 0.25 + 0.75 * k) continue;
    const a0 = (j / n) * TAU + rnd(seed, j, 2) * 0.1, a1 = a0 + 0.1 + 0.08 * rnd(seed, j, 3);
    arcs.add(jag(gp(A * Math.cos(a0), A * Math.sin(a0)), gp(A * Math.cos(a1), A * Math.sin(a1)), 0.3, seed * 3 + j, 3), 0.5);
  }
  arcs.render(c, { alpha: 255 * clamp(k * 1.2, 0, 1), glow: [[3, K[4], 70], [6, K[2], 34]] });
}

/** Light spilling on the ground at the target as the strike comes down. */
function groundGlow(c: Canvas, k: number): void {
  if (k <= 0.02) return;
  const l = new L(G.W, G.H);
  const R = G.AREA * (0.3 + 0.6 * k);
  for (const [f, st] of [[1, 2], [0.7, 3], [0.42, 4]] as [number, number][]) l.ellipse(G.AX, G.AY, R * f, R * f * SQ, st);
  l.render(c, K, { outline: null, alpha: (st) => Math.round(k * ({ 2: 20, 3: 28, 4: 40 } as Record<number, number>)[st]) });
}

interface Crack {
  pts: Pt[];
  len: number;
}
function cracks(): Crack[] {
  const A = G.AREA, n = G.enh ? 14 : 11;
  const out: Crack[] = [];
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * TAU + (rnd(700, k) - 0.5) * 0.4, len = A * (0.45 + 0.5 * rnd(701, k));
    const main = jag([0, 0], [len * Math.cos(ang), len * Math.sin(ang)], 0.16, 710 + k, 5);
    out.push({ pts: main, len });
    for (const fp of forkPaths(main, 720 + k, 2, len * 0.35, 0.2, 0.25, 0.8)) out.push({ pts: fp, len: len * 0.35 });
  }
  return out;
}

/** Scorched disc and glowing cracks on the ground; `grow` 0..1 (cracks opening), `heat` 0..1. */
function ground(c: Canvas, grow: number, heat: number, scorch: number): void {
  const A = G.AREA;
  if (scorch > 0.02) {
    const s = new L(G.W, G.H);
    s.fill((x, y) => {
      const gx = x + 0.5 - G.AX, gz = (y + 0.5 - G.AY) / SQ;
      return Math.hypot(gx, gz) < A * 0.5 * (0.85 + 0.3 * noise(x, y, 6, 731));
    }, 1);
    s.render(c, DU, { outline: null, alpha: Math.round(160 * scorch) });
  }
  if (heat <= 0.03 || grow <= 0) return;
  const l = new L(G.W, G.H), core = new L(G.W, G.H);
  for (const cr of cracks()) {
    const pts = partial(cr.pts, grow);
    const sp = pts.map((p) => gp(p[0], p[1]));
    for (let i = 0; i + 1 < sp.length; i++) {
      const d = Math.hypot(pts[i][0], pts[i][1]) / A;
      const hot = heat * (1 - 0.65 * d);
      const st = hot > 0.82 ? 8 : hot > 0.62 ? 7 : hot > 0.45 ? 6 : hot > 0.3 ? 5 : hot > 0.18 ? 3 : hot > 0.08 ? 2 : 1;
      const w = Math.max(0.5, (2.4 - 1.9 * d) * (cr.len < A * 0.3 ? 0.6 : 1));
      if (w < 0.9) core.line(sp[i][0], sp[i][1], sp[i + 1][0], sp[i + 1][1], st);
      else core.tube([sp[i], sp[i + 1]], [w, w], st);
      l.line(sp[i][0], sp[i][1], sp[i + 1][0], sp[i + 1][1], 1);
    }
  }
  glow(c, [core], [[2, K[5], 120], [5, K[3], 60], [9, K[2], 26]], clamp(heat * 1.2 - 0.1, 0, 1));
  core.render(c, K, { outline: K[0] });
}

/** Expanding shock ring on the ground ellipse. */
function shockRing(c: Canvas, rr: number, thick: number, a: number, seed: number): void {
  if (a <= 0.02 || rr <= 2) return;
  const l = new L(G.W, G.H);
  const x0 = Math.floor(G.AX - rr - 2), x1 = Math.ceil(G.AX + rr + 2), y0 = Math.floor(G.AY - rr * SQ - 2), y1 = Math.ceil(G.AY + rr * SQ + 2);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const gx = x + 0.5 - G.AX, gz = (y + 0.5 - G.AY) / SQ, d = Math.hypot(gx, gz);
      if (d > rr || d < rr - thick) continue;
      const ang = Math.atan2(gz, gx);
      if (noise(((ang / TAU) * 200 + 200) % 200, 0, 6, seed) < 0.3 * (1 - a)) continue;
      const q = (rr - d) / thick;
      l.set(x, y, q < 0.25 ? 8 : q < 0.5 ? 7 : q < 0.75 ? 5 : 3);
    }
  glow(c, [l], [[3, K[5], 120], [7, K[3], 55]], a);
  l.render(c, K, { outline: K[2], alpha: Math.round(255 * a), outlineAlpha: Math.round(200 * a) });
}

/** The plasma dome: a translucent crackling shell, brightest at its rim, with plasma veins and arcs. */
function dome(c: Canvas, rx: number, a: number, seed: number): void {
  if (a <= 0.02 || rx < 4) return;
  const h = rx, ry = rx * SQ;
  const l = new L(G.W, G.H);
  for (let y = Math.floor(G.AY - h * 1.05 - 1); y <= Math.ceil(G.AY + ry * 1.05 + 1); y++)
    for (let x = Math.floor(G.AX - rx * 1.05 - 1); x <= Math.ceil(G.AX + rx * 1.05 + 1); x++) {
      const dx = (x + 0.5 - G.AX) / rx, up = y + 0.5 <= G.AY;
      const dy = (y + 0.5 - G.AY) / (up ? h : ry);
      const ang = Math.atan2(dy, dx);
      const wob = 1 + 0.035 * (noise(((ang / TAU) * 160 + 160) % 160, 0, 5, seed) - 0.5);
      const e = Math.hypot(dx, dy) / wob;
      if (e > 1) continue;
      let st = e > 0.95 ? 6 : e > 0.86 ? 5 : e > 0.66 ? 4 : 3;
      if (!up) st = e > 0.95 ? 5 : 3;
      const rdg = 1 - Math.abs(2 * noise(x, y, 11, seed) - 1);
      if (rdg > 0.93 && st < 7) st = Math.min(7, st + 2);
      l.set(x, y, st);
    }
  const al: Record<number, number> = { 3: 70, 4: 92, 5: 130, 6: 175, 7: 200 };
  l.render(c, K, { outline: null, alpha: (st) => Math.round(a * al[st]) });
  // A crackling rim of lightning tracing the shell's outline and its base on the ground.
  const rim = new Arcs();
  const outline: Pt[] = [];
  for (let k = 0; k <= 48; k++) {
    const t = Math.PI + (k / 48) * Math.PI;
    outline.push([G.AX + rx * Math.cos(t), G.AY + h * Math.sin(t)]);
  }
  const base: Pt[] = [];
  for (let k = 0; k <= 48; k++) {
    const t = (k / 48) * Math.PI;
    base.push([G.AX + rx * Math.cos(t), G.AY + ry * Math.sin(t)]);
  }
  for (const [pts, sd] of [[outline, 1], [base, 2]] as [Pt[], number][])
    for (let i = 0; i + 1 < pts.length; i++) rim.add(jag(pts[i], pts[i + 1], 0.35, seed * 9 + sd * 100 + i, 2), (i + sd) % 3 ? 1.3 : 0.5);
  // Arcs running down the shell along meridians on the near side.
  const arcs = new Arcs();
  for (let k = 0; k < 6; k++) {
    const psi = Math.PI * (0.1 + 0.8 * rnd(seed, k, 1)) + (k % 2 ? Math.PI : 0) * 0;
    const pts: Pt[] = [];
    for (let s2 = 0; s2 <= 1.0001; s2 += 0.05) {
      const phi = (s2 * Math.PI) / 2;
      pts.push([G.AX + rx * Math.sin(phi) * Math.cos(psi), G.AY - h * Math.cos(phi) + ry * Math.sin(phi) * Math.sin(psi)]);
    }
    const j: Pt[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const seg = jag(pts[i], pts[i + 1], 0.3, seed * 5 + k * 40 + i, 2);
      if (i > 0) seg.shift();
      j.push(...seg);
    }
    const from = rnd(seed, k, 3) * 0.4;
    arcs.add(partial(j, from + 0.6).slice(Math.floor(j.length * from * 0.5)), k % 2 ? 1.2 : 0.5);
  }
  rim.render(c, { alpha: 255 * a, glow: [[3, K[5], 120], [7, K[3], 55]] });
  arcs.render(c, { alpha: 255 * a, gk: 0.8 });
}

/** The blinding flash: stacked ellipses of light around the impact. */
function bloom(c: Canvas, k: number): void {
  if (k <= 0.02) return;
  const s = Math.min(G.AREA / 171, (G.AX - 18) / 285);
  const l = new L(G.W, G.H);
  const rings: [number, number, number][] = [[285, 145, 3], [220, 118, 4], [160, 92, 5], [110, 70, 6], [70, 48, 7], [42, 30, 8]];
  for (const [rx, ry, st] of rings) l.ellipse(G.AX, G.AY - 50 * s, rx * s * (0.6 + 0.4 * k), ry * s * (0.6 + 0.4 * k), st);
  const al: Record<number, number> = { 3: 26, 4: 40, 5: 64, 6: 105, 7: 180, 8: 255 };
  l.render(c, K, { outline: null, alpha: (st) => Math.round(al[st] * k) });
}

/** Starburst rays from the impact. */
function rays(c: Canvas, k: number, seed: number): void {
  if (k <= 0.02) return;
  const s = Math.min(G.AREA / 171, 1.25);
  const l = new L(G.W, G.H);
  const cx = G.AX, cy = G.AY - 50 * s;
  for (let j = 0; j < 12; j++) {
    const a = (j / 12) * TAU + rnd(seed, j) * 0.25, len = (130 + 120 * rnd(seed, j, 2)) * k * s;
    const dx = Math.cos(a), dy = Math.sin(a) * 0.6, w = 4 + 3 * k;
    l.poly([[cx - dy * w, cy + dx * w], [cx + dy * w, cy - dx * w], [cx + dx * len, cy + dy * len]], 1);
  }
  l.bands([1, 2], [5, 7, 8]).render(c, K, { outline: K[3], alpha: Math.round(225 * k), outlineAlpha: Math.round(140 * k) });
}

/** A pillar of light from the cloud to the ground (the stroke's channel lingering). */
function column(c: Canvas, w: number, seed: number): void {
  if (w < 1) return;
  const l = new L(G.W, G.H);
  for (let y = G.exitY; y <= G.AY; y++) {
    const half = (w / 2) * (0.7 + 0.6 * noise(y, seed, 5, 3)) * (0.6 + 0.4 * smooth(G.exitY, G.exitY + 60, y));
    const off = (noise(y, seed, 23, 4) - 0.5) * 10;
    for (let x = Math.floor(G.AX + off - half); x <= Math.ceil(G.AX + off + half); x++) l.set(x, y, 1);
  }
  glow(c, [l], [[4, K[5], 140], [10, K[3], 70], [18, K[2], 30]], clamp(w / 16, 0.3, 1));
  l.bands([1, 2, 4, 7], [3, 5, 6, 7, 8]).render(c, K, { outline: K[1] });
}

interface Debris {
  ang: number;
  r0: number;
  vr: number;
  vy: number;
  size: number;
  spin: number;
  k: number;
}
const GRAV = 550;
function debrisList(): Debris[] {
  const A = G.AREA, n = G.enh ? 40 : 30;
  return range(n).map((k) => {
    const vy = (250 + 400 * rnd(601, k)) * (G.enh ? 1.12 : 1);
    const r0 = 6 + 0.3 * A * rnd(602, k);
    let vr = (40 + 180 * rnd(604, k)) * (A / 171);
    vr = Math.min(vr, ((A * 0.95 - r0) * GRAV) / vy);
    return { ang: rnd(603, k) * TAU, r0, vr, vy, size: 2.5 + 4.5 * rnd(605, k) ** 1.5 * (G.enh ? 1.15 : 1), spin: (rnd(606, k) - 0.5) * 16, k };
  });
}

/** Rock chunks thrown up from the impact, tumbling, falling back (landed ones stay put). */
function debris(c: Canvas, tau: number, alpha: number, lit: number): void {
  if (alpha <= 2) return;
  const rock = new L(G.W, G.H);
  for (const d of debrisList()) {
    const tt = Math.min(tau, d.vy / GRAV);
    const gr = d.r0 + d.vr * tt, hgt = Math.max(0, d.vy * tt - GRAV * tt * tt);
    const p = gp(gr * Math.cos(d.ang), gr * Math.sin(d.ang));
    rock.poly(rockPts(p[0], p[1] - hgt - d.size * 0.5, d.size, 6, 610 + d.k, d.spin * tt, 1, 0.85, 0.35), 3);
  }
  const src = rock.clone();
  rock.bevel({ lit: 1, shade: 1, max: 5, min: 2 });
  rock.render(c, RK, { alpha: Math.round(alpha), outlineAlpha: Math.round(alpha) });
  if (lit > 0.02) {
    const rim = new L(G.W, G.H);
    for (let y = 1; y < G.H; y++) for (let x = 0; x < G.W; x++) if (src.get(x, y) >= 0 && src.get(x, y - 1) < 0) rim.set(x, y, 6);
    rim.render(c, K, { outline: null, alpha: Math.round(alpha * lit) });
  }
}

/** Hot sparks flung out of the impact with short trails. */
function embers(c: Canvas, tau: number, k: number): void {
  if (k <= 0.02 || tau > 0.75) return;
  const A = G.AREA;
  const l = new L(G.W, G.H);
  const n = G.enh ? 44 : 32;
  for (let j = 0; j < n; j++) {
    const vy = 300 + 380 * rnd(640, j), ang = rnd(641, j) * TAU;
    const vr = Math.min((90 + 200 * rnd(642, j)) * (A / 171), ((A * 0.9) * GRAV) / vy);
    const life = 0.35 + 0.4 * rnd(643, j);
    if (tau > life) continue;
    const at = (t: number): Pt => {
      const p = gp(vr * t * Math.cos(ang), vr * t * Math.sin(ang));
      return [p[0], p[1] - Math.max(0, vy * t - GRAV * t * t)];
    };
    const p = at(tau), q = at(Math.max(0, tau - 0.03));
    l.line(q[0], q[1], p[0], p[1], 6);
    l.set(p[0], p[1], 8);
  }
  l.render(c, K, { outline: K[3], alpha: Math.round(255 * k), outlineAlpha: Math.round(130 * k) });
}

/** Smoke and dust billows of the impact: a wall kicked up along the ring, a column rising from the centre. */
function smokeBillows(tau: number, side: number): Billow[] {
  const A = G.AREA, sz = G.enh ? 1.2 : 1;
  const out: Billow[] = [];
  // Each puff of dust is a little cauliflower: a body and two lobes rising behind it.
  const clump = (x: number, y: number, r: number, depth: number, tone: number, k: number, wisp: number): void => {
    out.push({ x, y, r, depth, tone, under: 0.9, wisp });
    out.push({ x: x - r * 0.55, y: y - r * 0.5, r: r * (0.55 + 0.2 * rnd(630, k)), depth: depth - 0.002, tone: tone * 1.05, under: 0.6, wisp });
    out.push({ x: x + r * 0.5, y: y - r * 0.38, r: r * (0.5 + 0.2 * rnd(631, k)), depth: depth - 0.001, tone: tone * 1.05, under: 0.6, wisp });
  };
  const nr = G.enh ? 30 : 22;
  for (let k = 0; k < nr; k++) {
    const ang = (k / nr) * TAU + (rnd(620, k) - 0.5) * 0.12;
    if ((Math.sin(ang) >= 0 ? 1 : -1) !== side) continue;
    const a = tau - (0.12 + 0.1 * rnd(622, k));
    if (a <= 0) continue;
    const g = A * (0.7 + 0.22 * rnd(621, k)) + 18 * a;
    const h = 3 + (14 + 46 * rnd(623, k)) * a ** 0.7;
    const r = (8 + 14 * a ** 0.6) * sz * (0.6 + 0.9 * rnd(624, k) ** 1.5);
    const p = gp(g * Math.cos(ang), g * Math.sin(ang));
    if (p[1] - h + r * 0.6 > G.H - 6) continue;
    clump(p[0], p[1] - h - r * 0.4, r, Math.sin(ang) + p[1] * 1e-4, 1.05, k, clamp((a - 0.6) * 0.8, 0, 0.5));
  }
  if (side < 0) {
    const nc = G.enh ? 18 : 14;
    for (let k = 0; k < nc; k++) {
      const a = tau - (0.1 + 0.18 * rnd(626, k));
      if (a <= 0) continue;
      const lvl = rnd(627, k);
      const h = (16 + 190 * a ** 0.7) * (0.35 + 0.65 * lvl) * sz;
      const x = G.AX + (rnd(628, k) - 0.5) * A * 0.5 * (0.4 + a) + Math.sin(a * 3 + k) * 6;
      const r = (12 + 20 * a ** 0.6) * (0.75 + 0.5 * rnd(629, k)) * sz;
      clump(x, G.AY - h, r, -1.5 - lvl * 0.4, 0.9, k + 50, clamp((a - 0.7) * 0.8, 0, 0.5));
    }
  }
  return out;
}

/** Dust and smoke for the back (-1) or front (1) half, lit from below by the glowing ground. */
function dust(c: Canvas, tau: number, alpha: number, side: number, heat: number, dissolve = 0): void {
  if (alpha <= 2) return;
  billows(c, smokeBillows(tau, side), { under: 0.5 + 0.8 * heat, lights: [[G.AX, G.AY - 20, 0.7 * heat, G.AREA * 1.1]], alpha: Math.round(alpha), dissolve, seed: 655 });
}

/** Arcs radiating out along the ground. */
function groundArcs(c: Canvas, n: number, seed: number, reach: number, alpha = 255): void {
  if (n <= 0) return;
  const A = G.AREA;
  const arcs = new Arcs();
  for (let j = 0; j < n; j++) {
    const psi = rnd(seed, j) * TAU, len = A * reach * (0.5 + 0.5 * rnd(seed, j, 2));
    groundBolt(arcs, [8 * Math.cos(psi), 8 * Math.sin(psi)], [len * Math.cos(psi), len * Math.sin(psi)], seed * 13 + j, j % 3 ? 1.4 : 0.5, A);
  }
  arcs.render(c, { alpha, glow: [[3, K[4], 110], [7, K[2], 45]] });
}

// --- the strike, normal: a super dramatic bolt -------------------------------------------

/** The main channel: big deliberate kinks, then fine jaggedness. */
function channel(): Pt[] {
  const { AX, AY, exitY } = G;
  const knots: Pt[] = [[AX, exitY]];
  const n = 7;
  for (let k = 1; k < n; k++) knots.push([AX + (rnd(802, k) < 0.7 ? (k % 2 ? 1 : -1) : (k % 2 ? -1 : 1)) * (12 + 58 * rnd(800, k)) * (k < n - 1 ? 1 : 0.5), lerp(exitY, AY, k / n + (rnd(801, k) - 0.5) * 0.09)]);
  knots.push([AX, AY]);
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < knots.length; i++) {
    const seg = jag(knots[i], knots[i + 1], 0.2, 810 + i, 5);
    if (i > 0) seg.shift();
    pts.push(...seg);
  }
  return pts;
}

/** Plasma filaments twisting around a channel of radius r. */
function filaments(arcs: Arcs, main: Pt[], r: number, seed: number, n = 2): void {
  for (let k = 0; k < n; k++)
    arcs.add(
      main.map((p, i) => [p[0] + (noise(i * 0.7, k * 10 + seed, 4, 993) - 0.5) * 2.4 * (r + 5), p[1] + (noise(i * 0.7, k * 10 + seed, 4, 994) - 0.5) * 6] as Pt),
      0.5,
    );
}

/** Branches off the channel (fixed, so they light up with it), with sub-forks. */
function branches(main: Pt[]): { pts: Pt[]; at: number; r: number }[] {
  const out: { pts: Pt[]; at: number; r: number }[] = [];
  const n = 11;
  for (let k = 0; k < n; k++) {
    const at = 0.05 + 0.8 * rnd(820, k);
    const i = Math.floor(at * (main.length - 1));
    const p = main[i];
    const side = k % 2 ? 1 : -1;
    const dir = Math.PI / 2 + side * (0.45 + 0.5 * rnd(821, k));
    const len = (60 + 110 * rnd(822, k)) * (1 - 0.5 * at);
    const end: Pt = [p[0] + Math.cos(dir) * len, p[1] + Math.sin(dir) * len];
    const pts = jag(p, end, 0.22, 830 + k, 5);
    out.push({ pts, at, r: len > 110 ? 1.4 : 1.1 });
    for (const fp of forkPaths(pts, 840 + k, 2, len * 0.45, 0.25)) out.push({ pts: fp, at: at + 0.04, r: 0.5 });
  }
  return out;
}

/** Secondary strikes: from the cloud to points inside the circle. */
function secondary(k: number): Pt[] {
  const { AX, CY, cs } = G;
  const side = k % 2 ? 1 : -1;
  const top: Pt = [AX + side * (110 + 60 * rnd(850, k)) * cs, CY + (60 + 30 * rnd(851, k)) * cs];
  const ang = (k % 2 ? 0.2 : Math.PI - 0.2) + (rnd(852, k) - 0.5) * 0.8;
  const g = G.AREA * (0.5 + 0.3 * rnd(853, k));
  return jag(top, gp(g * Math.cos(ang), g * Math.sin(ang)), 0.2, 860 + k, 6);
}

function strikeNormal(f: number): Canvas {
  const c = new Canvas(G.W, G.H);
  const T = T_STRIKE + f / 16;
  const lead = [0.22, 0.45, 0.72, 1, 1, 1, 1, 1][f];
  const rs = [0, 0, 0, 1, 0.75, 0.35, 1, 0.95][f];
  const sec = [[], [], [], [0], [0, 1], [1], [2], [2]][f];
  const secK = [[], [], [], [1], [0.55, 1], [0.5], [1], [0.6]][f];
  skyFlash(c, rs);
  const lights: [number, number, number, number][] = [[G.AX, G.exitY - 30, 0.7 + 0.8 * rs, 170 * G.cs]];
  for (const s of sec) {
    const top = secondary(s)[0];
    lights.push([top[0], top[1], 0.8, 120 * G.cs]);
  }
  lights.push(...cloudArcsGeom(rs > 0.5 ? 5 : 3, 900 + f));
  cloud(c, { grow: 1, T, dissolve: 0, under: 0.8 + 1.2 * rs, lights, alpha: 255 });
  vortexEye(c, 1 - 0.4 * (f / 7), T);
  // Spider lightning crawling along the underside when the sky lights up.
  cloudArcs(c, rs > 0.5 ? 5 : 3, 900 + f, { len: rs > 0.5 ? 1.6 : 1 });
  kanji(c, 1, [1, 0.9, 0.75, 0.6, 0.45, 0.3, 0.2, 0.1][f], 950 + f);
  telegraph(c, 1, 970 + f);
  groundGlow(c, Math.max(lead * 0.5, rs));
  const main = channel();
  const arcs = new Arcs();
  if (rs <= 0) {
    // The stepped leader: thin, feeling its way down, its branches searching.
    const lp = partial(main, lead);
    arcs.add(lp, 1.3);
    for (const b of branches(main)) if (b.at < lead - 0.03) arcs.add(partial(b.pts, clamp((lead - b.at) * 4, 0, 1)), b.r > 1 ? 1.1 : 0.5);
    spark(c, lp[lp.length - 1], 6);
    if (lead > 0.6) {
      // An upward streamer rising from the target to meet it.
      const st = jag([G.AX, G.AY], [G.AX + 6, G.AY - 46], 0.25, 990 + f, 4);
      arcs.add(st, 1.1);
    }
    arcs.render(c, { glow: [[3, K[5], 130], [8, K[3], 60]] });
  } else {
    // The return stroke: a thick channel with a blinding core, every branch lit.
    const rmax = (5.5 + 2.5 * rs) * (f === 7 ? 1.15 : 1);
    filaments(arcs, main, rmax, f);
    arcs.tube(main, (t) => rmax * (0.5 + 0.5 * smooth(0, 0.15, t)) * (0.78 + 0.44 * noise(t * 420, f, 3, 991)));
    for (const b of branches(main)) arcs.add(b.pts, rs > 0.5 ? b.r + 0.4 : b.r);
    arcs.render(c, { dim: rs < 0.5 ? 2 : 0, glow: [[4, K[6], 160], [10, K[4], 90], [20, K[3], 48], [32, K[2], 22]], gk: rs });
    groundContact(c, rs);
  }
  sec.forEach((s, j) => {
    const a = new Arcs();
    const pts = secondary(s);
    a.tube(pts, (t) => 2.8 * (0.5 + 0.5 * smooth(0, 0.15, t)) * (0.75 + 0.5 * noise(t * 300, s, 3, 994)));
    filaments(a, pts, 2.8, 40 + s + f, 1);
    for (const fp of forkPaths(pts, 870 + s, 3, 50)) a.add(fp, 0.5);
    a.render(c, { dim: secK[j] < 0.8 ? 2 : 0, glow: [[3, K[5], 120], [8, K[3], 55]], gk: secK[j] });
    spark(c, pts[pts.length - 1], 6, secK[j]);
  });
  return c;
}

/** Midpoints of the cloud arcs for frame seed (to light the cloud before drawing it). */
function cloudArcsGeom(n: number, seed: number): [number, number, number, number][] {
  const { AX, CY, cs } = G;
  return range(n).map((k) => {
    const R = (30 + 190 * rnd(seed, k, 1)) * cs, a = rnd(seed, k, 2) * TAU;
    return [AX + R * Math.cos(a), CY + R * Math.sin(a) * 0.38 + 6, 0.55, 80 * cs] as [number, number, number, number];
  });
}

/** The burst where a stroke meets the ground: a white-hot core and arcs splashing out. */
function groundContact(c: Canvas, k: number): void {
  const l = new L(G.W, G.H);
  const r = 14 + 16 * k;
  l.ellipse(G.AX, G.AY - 3, r, r * 0.55, 1);
  l.ellipse(G.AX, G.AY - 3 - r * 0.25, r * 0.55, r * 0.6, 1);
  glow(c, [l], [[4, K[6], 150], [10, K[4], 80], [18, K[2], 34]], k);
  l.bands([1, 2, 4], [5, 6, 7, 8]).render(c, K, { outline: K[2] });
  const arcs = new Arcs();
  for (let j = 0; j < 7; j++) {
    const a = rnd(995, j) * TAU, len = G.AREA * (0.25 + 0.3 * rnd(996, j)) * k;
    groundBolt(arcs, [r * 0.6 * Math.cos(a), r * 0.6 * Math.sin(a)], [len * Math.cos(a), len * Math.sin(a)], 997 + j, j % 2 ? 1.3 : 0.5, G.AREA);
  }
  arcs.render(c, { alpha: 255 * k });
}

// --- the strike, enhanced: the lightning dragon ---------------------------------------------

interface BodyPt {
  x: number;
  y: number;
  /** Depth: +1 nearest the camera, -1 farthest. */
  z: number;
  /** Distance behind the neck (px along the fall line). */
  s: number;
  r: number;
  /** Unit tangent toward the tail and the normal. */
  t: Pt;
  n: Pt;
}

/**
 * The body behind the plunging head, from the neck back to where it leaves the cloud: it whips
 * in a helix around that line, the amplitude growing behind the neck and narrowing again at the
 * cloud; the coils travel up the body as it falls. Near coils are thicker than far ones.
 */
function dragonBody(neck: Pt, exit: Pt, T: number, S: number, f: number): BodyPt[] {
  const L0 = Math.hypot(exit[0] - neck[0], exit[1] - neck[1]);
  const u: Pt = [(exit[0] - neck[0]) / (L0 || 1), (exit[1] - neck[1]) / (L0 || 1)], v: Pt = [-u[1], u[0]];
  const raw: { x: number; y: number; z: number; s: number }[] = [];
  for (let s = 0; s <= L0; s += 2) {
    const amp = 105 * G.cs * smooth(0, 150, s) * (0.3 + 0.7 * smooth(0, 80, L0 - s));
    const ph = (TAU * s) / 240 + T * 7 + 0.4;
    const w = amp * Math.sin(ph);
    raw.push({ x: neck[0] + u[0] * s + v[0] * w, y: neck[1] + u[1] * s + v[1] * w + amp * Math.cos(ph) * 0.3, z: Math.cos(ph) * Math.min(1, amp / 25), s });
  }
  return raw.map((p, j) => {
    const a = raw[Math.min(raw.length - 1, j + 2)], b = raw[Math.max(0, j - 2)];
    const tl = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const t: Pt = [(a.x - b.x) / tl, (a.y - b.y) / tl];
    const r = lerp(19, 10, clamp(p.s / 380, 0, 1)) * S * (0.85 + 0.15 * p.z) * (1 + 0.26 * (noise(p.s * 0.5, f * 13, 3, 41) - 0.5));
    return { ...p, r, t, n: [-t[1], t[0]] as Pt };
  });
}

// Head, in local px facing +x (y down), snout tip at (122, 0).
const UPPER: Pt[] = [[0, -24], [12, -32], [26, -37], [40, -39], [50, -33], [58, -27], [70, -24], [86, -20], [100, -16], [110, -14], [117, -10], [122, -3], [121, 3], [116, 6], [104, 7], [88, 8], [70, 9], [54, 10], [40, 12], [32, 20], [18, 24], [4, 20], [-2, 4]];
const JAW: Pt[] = [[34, 12], [52, 13], [72, 14], [92, 15], [106, 16], [113, 19], [109, 26], [90, 28], [70, 29], [50, 30], [36, 30], [26, 24]];
const EYE: Pt[] = [[42, -19], [48, -23], [56, -22], [59, -18], [52, -15], [45, -15]];
const HINGE: Pt = [34, 14];
const UP_TEETH: [number, number, number][] = [[108, 12, 3.2], [96, 6, 2.2], [88, 9, 2.8], [78, 5, 2], [70, 5, 2], [62, 4.5, 2], [55, 4, 1.8]];
const LO_TEETH: [number, number, number][] = [[104, 10, 3], [94, 5, 2], [84, 7, 2.4], [72, 4.5, 2], [62, 4, 1.8]];
const HORN_N: { pts: Pt[]; r: number[] }[] = [
  { pts: [[26, -35], [14, -50], [-2, -62], [-22, -70], [-44, -74]], r: [5.6, 4.6, 3.4, 2.2, 0.8] },
  { pts: [[6, -56], [4, -70], [-2, -82]], r: [3, 2, 0.7] },
  { pts: [[-16, -67], [-22, -80], [-30, -88]], r: [2.4, 1.6, 0.6] },
];
const HORN_F: { pts: Pt[]; r: number[] }[] = [
  { pts: [[36, -37], [28, -52], [16, -66], [0, -76], [-18, -84]], r: [4.4, 3.6, 2.8, 1.8, 0.7] },
  { pts: [[22, -59], [24, -74], [20, -84]], r: [2.6, 1.6, 0.6] },
];
const FRILLS: { pts: Pt[]; r: number[] }[] = [
  { pts: [[20, 16], [4, 24], [-16, 30]], r: [4, 2.5, 0.7] },
  { pts: [[12, 8], [-6, 10], [-24, 10]], r: [3.6, 2.2, 0.7] },
  { pts: [[10, -4], [-8, -8], [-26, -12]], r: [3.4, 2, 0.7] },
  { pts: [[8, -14], [-8, -22], [-24, -30]], r: [3, 1.8, 0.6] },
];

function bez3(p0: Pt, p1: Pt, p2: Pt, p3: Pt, s: number): Pt {
  const u = 1 - s;
  return [u * u * u * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s * s * s * p3[0], u * u * u * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s * s * s * p3[1]];
}

/** Energy texture: bright veins crackling through the mid tones. */
function veins(l: L, seed: number): void {
  l.map((st, x, y) => (st >= 5 && st <= 7 && 1 - Math.abs(2 * noise(x, y, 7, seed) - 1) > 0.9 ? 8 : st));
}

/** The dragon head at `tip` pointing along `ang`; jaw open by `jaw` radians. */
function dragonHead(c: Canvas, tip: Pt, ang: number, S: number, jaw: number, T: number, seed: number): void {
  const { W, H } = G;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const tf = (p: Pt): Pt => {
    const lx = (p[0] - 122) * S, ly = p[1] * S;
    return [tip[0] + lx * ca - ly * sa, tip[1] + lx * sa + ly * ca];
  };
  const P = (pts: Pt[]): Pt[] => pts.map(tf);
  const jr = (p: Pt): Pt => {
    const dx = p[0] - HINGE[0], dy = p[1] - HINGE[1];
    return [HINGE[0] + dx * Math.cos(jaw) - dy * Math.sin(jaw), HINGE[1] + dx * Math.sin(jaw) + dy * Math.cos(jaw)];
  };
  const farHorn = new L(W, H), head = new L(W, H), jawL = new L(W, H), mouth = new L(W, H), horn = new L(W, H), frill = new L(W, H), teethU = new L(W, H), teethL = new L(W, H), eye = new L(W, H);
  for (const h of HORN_F) farHorn.tube(P(h.pts), h.r.map((r) => r * S), 1);
  head.poly(P(UPPER), 1);
  jawL.poly(P(JAW.map(jr)), 1);
  mouth.poly(P([[38, 12], [60, 10.5], [88, 8.5], [114, 6], jr([112, 18]), jr([92, 15]), jr([60, 13.5]), jr([36, 13])]), 1);
  for (const h of HORN_N) horn.tube(P(h.pts), h.r.map((r) => r * S), 1);
  for (const h of FRILLS) frill.tube(P(h.pts), h.r.map((r) => r * S), 1);
  for (const [x, len, w] of UP_TEETH) {
    const y = 10 - 0.065 * (x - 54);
    teethU.poly(P([[x - w, y - 1], [x + w, y - 1], [x - 1, y + len]]), 8);
  }
  for (const [x, len, w] of LO_TEETH) {
    const y = 13 + ((x - 34) * 3) / 72;
    teethL.poly(P([jr([x - w, y + 1]), jr([x + w, y + 1]), jr([x + 1, y - len])]), 8);
  }
  eye.poly(P(EYE), 8);
  // Mane: forked arcs streaming back from the skull and jaw.
  const mane = new Arcs();
  const starts: Pt[] = [[0, -18], [6, -24], [14, -28], [-2, -12], [-2, -4], [-2, 6], [4, 14], [14, 20], [22, 22], [30, -30], [20, -30], [8, 18]];
  starts.forEach((s0, j) => {
    const len = 55 + 50 * rnd(seed, j, 1);
    const end: Pt = [s0[0] - len, s0[1] * 1.6 + (rnd(seed, j, 2) - 0.5) * 40];
    bolt(mane, tf(s0), tf(end), seed * 17 + j, { r: j % 3 === 1 ? 1.3 : 0.5, rough: 0.2, forks: 1, forkLen: len * 0.4 });
  });
  // Whiskers: long barbels flowing back, rippling.
  const whisk = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, ph: number): Pt[] =>
    range(25).map((i) => {
      const s = i / 24, b = bez3(p0, p1, p2, p3, s);
      return tf([b[0], b[1] + 4 * Math.sin(s * 7 - T * 16 + ph) * s]);
    });
  const farW = new Arcs(), nearW = new Arcs();
  const wf = whisk([114, -9], [98, -34], [62, -48], [18, -52], 1.3);
  farW.add(wf.slice(0, 14), 1.2);
  farW.add(wf.slice(13), 0.5);
  const wn = whisk([117, 3], [100, 30], [60, 46], [4, 44], 0);
  nearW.add(wn.slice(0, 14), 1.5);
  nearW.add(wn.slice(13), 0.5);

  glow(c, [farHorn, head, jawL, horn, frill], [[3, K[5], 150], [9, K[3], 80], [16, K[2], 36]]);
  mane.render(c, { dim: 1, glow: [[3, K[4], 100], [6, K[2], 40]] });
  farHorn.bands([1, 2, 3], [2, 3, 4, 5]).render(c, K, { outline: K[0] });
  farW.render(c, { dim: 2, glow: null });
  // Mouth: deep purple with the throat glowing.
  const th = tf([44, 16]);
  mouth.map((s, x, y) => (Math.hypot(x - th[0], y - th[1]) < 9 * S ? 3 : Math.hypot(x - th[0], y - th[1]) < 15 * S ? 2 : 1)).render(c, K, { outline: K[0] });
  const inv = (x: number, y: number): Pt => {
    const dx = x + 0.5 - tip[0], dy = y + 0.5 - tip[1];
    return [(dx * ca + dy * sa) / S + 122, (-dx * sa + dy * ca) / S];
  };
  jawL.bands([1, 2.5, 4], [2, 3, 4, 5]).map((st, x, y) => (inv(x, y)[1] > 20 ? Math.max(2, st - 1) : st));
  veins(jawL, seed + 3);
  jawL.render(c, K, { outline: K[0] });
  teethL.map((s, x, y) => (jawL.get(x, y) >= 0 ? -1 : s));
  teethL.render(c, K, { outline: K[3] });
  head.bands([1, 2.5, 4.5, 7.5], [2, 3, 4, 5, 6]).map((st, x, y) => {
    const [lx, ly] = inv(x, y);
    const top = ly < -20 + 0.1 * lx;
    return top && st >= 4 ? Math.min(7, st + 2) : ly > 5 ? Math.max(2, st - 1) : st;
  });
  veins(head, seed + 5);
  // Anatomy: brow ridge with its lit crest, cheek and jaw muscle, snout ridge, lip, nostril, scales.
  const on = (v: number) => (x: number, y: number): number | null => (head.get(x, y) >= 0 ? v : null);
  head.path(P([[30, -29], [44, -29], [58, -25]]), on(4));
  head.path(P([[30, -33], [44, -35], [56, -29]]), on(8));
  head.path(P([[42, 9], [30, 1], [24, -9], [27, -19]]), on(4));
  head.path(P([[62, -18], [86, -15], [108, -10]]), on(8));
  head.path(P([[40, 10.5], [70, 8], [100, 6], [116, 4.5]]), on(4));
  const ns = tf([112, -6]);
  head.ellipse(ns[0], ns[1], 2 * S, 1.6 * S, on(2));
  head.render(c, K, { outline: K[0] });
  teethU.render(c, K, { outline: K[3] });
  horn.bands([1, 2, 3], [3, 4, 6, 7]);
  veins(horn, seed + 7);
  horn.render(c, K, { outline: K[0] });
  frill.bands([1, 2], [3, 5, 7]).render(c, K, { outline: K[0] });
  // The eye: white-hot, a slit pupil, a streak of light trailing back.
  const streak = new L(W, H);
  streak.path(P([[44, -19], [22, -22], [0, -27], [-16, -32]]), 7);
  streak.render(c, K, { outline: K[4], alpha: 210, outlineAlpha: 150 });
  glow(c, [eye], [[2, K[7], 220], [5, K[5], 120]]);
  eye.path(P([[50.5, -21.5], [51.5, -16]]), 4);
  eye.render(c, K, { outline: K[1] });
  nearW.render(c, { glow: [[2, K[4], 90]] });
}

/** Foreleg reaching forward from the body at `root`, toward `dir` (unit), bent outward along `n`. */
function foreleg(l: L, root: Pt, dir: Pt, n: Pt, S: number, ph: number): void {
  const at = (a: number, b: number): Pt => [root[0] + dir[0] * a + n[0] * b, root[1] + dir[1] * a + n[1] * b];
  const elbow = at(10 * S, 24 * S), wrist = at(34 * S, 22 * S + Math.sin(ph) * 3);
  l.tube([root, elbow], [6.2 * S, 4.6 * S], 1);
  l.tube([elbow, wrist], [4.6 * S, 3.2 * S], 1);
  const ang = Math.atan2(dir[1], dir[0]);
  for (let k = -1; k <= 1; k++) {
    const a = ang + k * 0.42 + Math.sin(ph) * 0.1, len = (12 + (k === 0 ? 3 : 0)) * S;
    const mid: Pt = [wrist[0] + Math.cos(a) * len * 0.6, wrist[1] + Math.sin(a) * len * 0.6];
    const tipP: Pt = [mid[0] + Math.cos(a + 0.5) * len * 0.5, mid[1] + Math.sin(a + 0.5) * len * 0.5];
    l.tube([wrist, mid, tipP], [2.4 * S, 1.5 * S, 0.5], 1);
  }
}

function strikeDragon(f: number): Canvas {
  const c = new Canvas(G.W, G.H);
  const T = T_STRIKE + f / 16;
  const S = 1.15;
  const prog = Math.pow((f + 1) / 8, 1.15);
  // It dives from a point of the cloud a little left of the target, along a steep line; the head
  // is tilted off that line so its profile (snout, horns, open jaws) reads.
  const exit: Pt = [G.AX - 96 * G.cs, G.exitY];
  const tip: Pt = [lerp(exit[0], G.AX, prog), lerp(exit[1] + 16, G.AY, prog)];
  const ang = Math.atan2(G.AY - exit[1], G.AX - exit[0]) - 0.45 + 0.07 * Math.sin(T * 9);
  const neck: Pt = [tip[0] - Math.cos(ang) * 112 * S, tip[1] - Math.sin(ang) * 112 * S];
  const body = neck[1] > exit[1] + 4 ? dragonBody(neck, exit, T, S, f) : [];
  const top = { x: exit[0], y: exit[1] };
  const flare = [1.4, 1.1, 0.9, 0.8, 0.75, 0.7, 0.7, 0.8][f];
  const lights: [number, number, number, number][] = [[top.x, G.exitY - 24, flare, 190 * G.cs], ...cloudArcsGeom(4, 1900 + f)];
  skyFlash(c, f === 0 ? 0.8 : 0.35);
  cloud(c, { grow: 1, T, dissolve: 0, under: 1.0 + 0.3 * rnd(1910, f), lights, alpha: 255 });
  vortexEye(c, 1 - 0.4 * (f / 7), T);
  cloudArcs(c, 4, 1900 + f);
  kanji(c, 1, [1, 0.88, 0.72, 0.56, 0.42, 0.3, 0.18, 0.08][f], 1950 + f);
  telegraph(c, 1, 1970 + f);
  groundGlow(c, 0.2 + 0.8 * prog);
  // The body, split into far and near coils, with dorsal spikes.
  const far = new L(G.W, G.H), near = new L(G.W, G.H);
  for (let k = 0; k + 1 < body.length; k++) {
    const a = body[k], b = body[k + 1];
    ((a.z + b.z) / 2 >= -0.05 ? near : far).tube([[a.x, a.y], [b.x, b.y]], [a.r, b.r], 1);
  }
  body.forEach((p, k) => {
    if (k % 7 !== 3 || p.r < 4) return;
    const base: Pt = [p.x + p.n[0] * p.r * 0.7, p.y + p.n[1] * p.r * 0.7];
    const len = 9 + 9 * (p.r / 20);
    const tp: Pt = [p.x + p.n[0] * (p.r + len) + p.t[0] * 7, p.y + p.n[1] * (p.r + len) + p.t[1] * 7];
    (p.z >= -0.05 ? near : far).poly([[base[0] - p.t[0] * 4.5, base[1] - p.t[1] * 4.5], [base[0] + p.t[0] * 4.5, base[1] + p.t[1] * 4.5], tp], 1);
  });
  // Forelegs reaching down past the head.
  const legs = new L(G.W, G.H), farLeg = new L(G.W, G.H);
  const fwd: Pt = [Math.cos(ang), Math.sin(ang)], side: Pt = [-Math.sin(ang), Math.cos(ang)];
  const root: Pt = [neck[0] - fwd[0] * 26 * S, neck[1] - fwd[1] * 26 * S];
  foreleg(farLeg, [root[0] - side[0] * 6, root[1] - side[1] * 6], fwd, [-side[0], -side[1]], S * 0.9, T * 18 + 2);
  foreleg(legs, [root[0] + side[0] * 6, root[1] + side[1] * 6], fwd, side, S, T * 18);
  // Forks crackling off the body.
  const forks = new Arcs();
  for (let k = 0; k < 9 && body.length > 10; k++) {
    const p = body[Math.floor(rnd(1920 + f, k) * (body.length - 1))];
    const sd = rnd(1921 + f, k) < 0.5 ? -1 : 1;
    const dir = Math.atan2(p.n[1] * sd, p.n[0] * sd) + (rnd(1922 + f, k) - 0.5) * 1.0;
    const len = 25 + 45 * rnd(1923 + f, k);
    const p0: Pt = [p.x + p.n[0] * sd * p.r * 0.8, p.y + p.n[1] * sd * p.r * 0.8];
    bolt(forks, p0, [p0[0] + Math.cos(dir) * len, p0[1] + Math.sin(dir) * len], 1930 + f * 20 + k, { r: k % 2 ? 1.2 : 0.5, rough: 0.28, forks: 1 });
  }
  // Speed streaks behind the head.
  const streaks = new L(G.W, G.H);
  for (let k = 0; k < 8; k++) {
    const off = (rnd(1940, k) - 0.5) * 120, back = 40 + 70 * rnd(1941, k, f), len = 40 + 60 * rnd(1942, k, f);
    const a: Pt = [tip[0] - fwd[0] * back + side[0] * off, tip[1] - fwd[1] * back + side[1] * off];
    if (a[1] - fwd[1] * len < G.exitY) continue;
    streaks.line(a[0], a[1], a[0] - fwd[0] * len, a[1] - fwd[1] * len, 7);
  }
  glow(c, [far, farLeg], [[3, K[3], 90], [7, K[2], 42]]);
  far.bands([1, 2.5, 4.5], [1, 2, 3, 4]);
  for (let k = 0; k + 1 < body.length; k++) {
    const a = body[k], b = body[k + 1];
    if (a.z >= -0.05 || b.z >= -0.05) continue;
    const w = (q: BodyPt, j: number): Pt => {
      const o = (noise(j * 1.3, f * 7 + 3, 3, 78) - 0.5) * q.r * 0.8;
      return [q.x + q.n[0] * o, q.y + q.n[1] * o];
    };
    const pa = w(a, k), pb = w(b, k + 1);
    far.line(pa[0], pa[1], pb[0], pb[1], (x, y) => (far.get(x, y) >= 3 ? 6 : null));
  }
  far.render(c, K, { outline: K[0], alpha: 240 });
  farLeg.bands([1, 2], [2, 3, 4]).render(c, K, { outline: K[0], alpha: 235 });
  streaks.render(c, K, { outline: K[3], alpha: 170, outlineAlpha: 90 });
  glow(c, [near, legs], [[3, K[5], 130], [8, K[3], 66], [15, K[2], 30]]);
  near.bands([1, 2, 3.5, 6], [2, 4, 5, 6, 7]);
  // Belly plates across the near coils, and a zigzag white-hot core: the body is pure lightning.
  body.forEach((p, k) => {
    if (k % 4 !== 0 || p.z < 0.25) return;
    near.line(p.x - p.n[0] * p.r * 0.7, p.y - p.n[1] * p.r * 0.7, p.x + p.n[0] * p.r * 0.7, p.y + p.n[1] * p.r * 0.7, (x, y) => (near.get(x, y) >= 6 ? 5 : null));
  });
  for (let k = 0; k + 1 < body.length; k++) {
    const a = body[k], b = body[k + 1];
    if (a.z < 0 || b.z < 0) continue;
    const o = (q: BodyPt, j: number): Pt => {
      const w = (noise(j * 1.3, f * 7, 3, 77) - 0.5) * q.r * 0.9;
      return [q.x + q.n[0] * w, q.y + q.n[1] * w];
    };
    const pa = o(a, k), pb = o(b, k + 1);
    near.line(pa[0], pa[1], pb[0], pb[1], (x, y) => (near.get(x, y) >= 5 ? 8 : null));
  }
  veins(near, 1960 + f);
  near.render(c, K, { outline: K[0] });
  legs.bands([1, 2, 3], [3, 5, 6, 7]).render(c, K, { outline: K[0] });
  forks.render(c, { glow: [[3, K[4], 100], [6, K[2], 40]] });
  // Where the body leaves the cloud: a flare.
  const fl = new L(G.W, G.H);
  fl.ellipse(top.x, G.exitY, 26 * flare, 11 * flare, 1);
  glow(c, [fl], [[5, K[5], 120], [12, K[3], 60]], Math.min(1, flare));
  fl.bands([1, 2, 4], [4, 6, 7, 8]).render(c, K, { outline: K[2] });
  dragonHead(c, tip, ang, S, 0.36 + 0.1 * Math.sin(T * 24), T, 1980 + f);
  if (f === 7) groundContact(c, 1);
  return c;
}

// --- gather, impact, fade ----------------------------------------------------------------

function gatherFrame(f: number): Canvas {
  const c = new Canvas(G.W, G.H);
  const p = f / 9, T = f / 12;
  const n = 1 + Math.round(4 * p);
  const lights = [[G.AX, G.CY + 4, 0.2 + 0.6 * p, 120 * G.cs] as [number, number, number, number], ...cloudArcsGeom(n, 100 + f)];
  if (f === 9) skyFlash(c, 0.4);
  cloud(c, { grow: p, T, dissolve: 0, under: 0.15 + 0.5 * p + 0.25 * rnd(110, f), lights, alpha: 255 });
  vortexEye(c, 0.15 + 0.85 * p, T);
  cloudArcs(c, n, 100 + f, { alpha: 200 + 55 * p });
  kanji(c, lerp(0.15, 0.97, smooth(0.15, 0.95, p)) + (f === 9 ? 0.03 : 0), 1, 150 + f);
  telegraph(c, smooth(0.4, 1, p), 170 + f);
  // Static crackling down from the cloud's underside.
  const st = new L(G.W, G.H);
  for (let k = 0; k < Math.round(10 * p); k++) {
    const x = G.AX + (rnd(180, k) - 0.5) * 300 * G.cs, y = G.exitY + ((rnd(181, k) + p * 1.7) % 1) * 220;
    st.line(x, y, x, y + 3, 7);
  }
  st.render(c, K, { outline: K[3], alpha: 200, outlineAlpha: 110 });
  return c;
}

function impactFrame(i: number): Canvas {
  const c = new Canvas(G.W, G.H);
  const tau = i / 14, T = T_IMPACT + tau;
  const A = G.AREA, big = G.enh ? 1.25 : 1;
  const under = [1.6, 1.25, 1, 0.82, 0.7, 0.6, 0.55, 0.5][i];
  cloud(c, { grow: 1, T, dissolve: 0, under, lights: [[G.AX, G.exitY - 24, under * 0.6, 180 * G.cs]], alpha: 255 });
  vortexEye(c, 0.6 - 0.05 * i, T);
  cloudArcs(c, i < 3 ? 4 : 2, 2100 + i);
  const ringR = [0.15, 0.42, 0.69, 0.89, 1, 1.03, 0, 0][i] * A;
  const ringT = [9, 11, 10, 8, 6, 3, 0, 0][i] * big;
  const ringA = [1, 1, 0.95, 0.85, 0.65, 0.35, 0, 0][i];
  const domeR = [0.41, 0.69, 0.87, 0.95, 0.98, 1, 1, 1][i] * A;
  const domeA = [1, 1, 0.9, 0.75, 0.55, 0.38, 0.22, 0.1][i];
  ground(c, smooth(0, 0.3, tau + 0.04), 1 - 0.015 * i, Math.min(1, (i + 1) / 3));
  dust(c, tau, 245, -1, 1 - 0.08 * i);
  shockRing(c, ringR, ringT, ringA, 2200 + i);
  dome(c, domeR, domeA, 2300 + i);
  column(c, [30, 16, 6, 0, 0, 0, 0, 0][i] * big, 2400 + i);
  debris(c, tau, 255, i < 4 ? 1 - i / 4 : 0);
  dust(c, tau, 245, 1, 1 - 0.08 * i);
  embers(c, tau, 1);
  groundArcs(c, Math.round([10, 9, 8, 6, 5, 4, 3, 2][i] * big), 2500 + i, [0.6, 0.8, 0.95, 1, 1, 0.9, 0.8, 0.7][i]);
  rays(c, [1, 0.6, 0, 0, 0, 0, 0, 0][i], 2600 + i);
  bloom(c, [1, 0.62, 0.32, 0.14, 0, 0, 0, 0][i]);
  return c;
}

function fadeFrame(f: number): Canvas {
  const c = new Canvas(G.W, G.H);
  const q = f / 7, tau = 8 / 14 + f / 12, T = T_FADE + f / 12;
  cloud(c, { grow: 1, T, dissolve: q * 0.75, under: 0.45 * (1 - q), lights: [], alpha: Math.round(255 * (1 - smooth(0.3, 1, q))) });
  const na = [2, 2, 1, 1, 1, 0, 0, 0][f];
  if (na) cloudArcs(c, na, 2700 + f, { alpha: 200 * (1 - q), len: 0.7 });
  const heat = 0.85 * Math.pow(1 - q, 1.2);
  ground(c, 1, heat, 1 - q);
  dust(c, tau, 245 * (1 - smooth(0.45, 1, q)), -1, heat * 0.6, 0.85 * smooth(0, 1, q));
  debris(c, tau, 255 * (1 - smooth(0.35, 0.95, q)), 0);
  dust(c, tau, 245 * (1 - smooth(0.45, 1, q)), 1, heat * 0.6, 0.85 * smooth(0, 1, q));
  groundArcs(c, [4, 3, 3, 2, 1, 1, 0, 0][f] * (G.enh ? 2 : 1) - (f >= 6 ? 0 : 0), 2800 + f, 0.5, 255 * (1 - q * 0.6));
  if (f === 7) {
    // A last few motes.
    const m = new L(G.W, G.H);
    for (let k = 0; k < 5; k++) {
      const p = gp((rnd(2900, k) - 0.5) * G.AREA, (rnd(2901, k) - 0.5) * G.AREA * 0.8);
      m.set(p[0], p[1] - 10 - 40 * rnd(2902, k), 6);
    }
    m.render(c, K, { outline: null, alpha: 120 });
  }
  return c;
}

// --- build ----------------------------------------------------------------------------

const once = (frames: Canvas[], fps: number): Anim => ({ frames, fps, loop: false });

function build(cfg: Cfg): WorldSprite {
  G = cfg;
  const anims: Record<string, Anim> = {
    gather: once(range(10).map(gatherFrame), 12),
    strike: once(range(8).map(cfg.enh ? strikeDragon : strikeNormal), 16),
    impact: once(range(8).map(impactFrame), 14),
    fade: once(range(8).map(fadeFrame), 12),
  };
  const label = cfg.enh ? 'Kirin, enhanced: lightning dragon from the storm (4.5 m)' : 'Kirin: storm, thunder kanji and a great bolt (3 m)';
  return { name: cfg.key, label, meters: [+(cfg.W / PPM).toFixed(2), +(cfg.H / PPM).toFixed(2)], anchor: [cfg.AX, cfg.AY], tags: ['vfx'], anims };
}

// --- review sheets ----------------------------------------------------------------------

const BG = hex('#14121a'), PANEL = hex('#1d1a26'), GROUND = hex('#2a2636'), INK = hex('#d9d4e6'), DIM = hex('#8a8499');

/** A frame composited on the dark ground with the scale character standing outside the circle. */
function staged(cfg: Cfg, fr: Canvas): Canvas {
  const c = new Canvas(cfg.W, cfg.H);
  c.fillRect(0, 0, cfg.W, cfg.H, PANEL);
  for (let a = 0; a < TAU; a += 0.002) c.set(cfg.AX + cfg.AREA * Math.cos(a), cfg.AY + cfg.AREA * SQ * Math.sin(a), GROUND);
  const ch = characterRef();
  c.draw(ch, cfg.AX - cfg.AREA - 46 - CHARACTER_FEET[0], cfg.AY + 8 - CHARACTER_FEET[1]);
  c.draw(fr, 0, 0);
  return c;
}

/** Key moments, one row each: [label, normal frame, enhanced frame]. */
const KEYS: [string, [string, number], [string, number]][] = [
  ['gather: the storm forms, the kanji is written', ['gather', 8], ['gather', 8]],
  ['strike: leader / the dragon bursts out', ['strike', 1], ['strike', 3]],
  ['strike: return stroke / the dragon lands', ['strike', 6], ['strike', 6]],
  ['impact', ['impact', 1], ['impact', 1]],
  ['fade', ['fade', 3], ['fade', 3]],
];

/** Both versions side by side (normal left, enhanced right), one key moment per row. */
function sheet(sprites: [Cfg, WorldSprite][]): Canvas {
  const pad = 10, lab = 14;
  const W = pad + sprites.reduce((a, [cfg]) => a + cfg.W + pad, 0);
  const rowH = Math.max(...sprites.map(([cfg]) => cfg.H)) + lab;
  const Hh = 24 + KEYS.length * (rowH + pad);
  const out = new Canvas(W, Hh);
  out.fillRect(0, 0, W, Hh, BG);
  text(out, 'KIRIN (kirin_thunder)  -  normal (3 m circle) left, enhanced (4.5 m) right; character for scale; frame bounds shown', pad, 8, K[6]);
  KEYS.forEach(([what, ...picks], r) => {
    const y = 24 + r * (rowH + pad);
    let x = pad;
    sprites.forEach(([cfg, s], v) => {
      const [anim, i] = picks[v];
      const t = `${cfg.key}  ${anim} ${i + 1}/${s.anims[anim].frames.length}`;
      text(out, t, x, y, INK);
      text(out, v === 0 ? what : `${cfg.W}x${cfg.H}  anchor ${cfg.AX},${cfg.AY}`, x + textWidth(t) + 8, y, DIM);
      out.draw(staged(cfg, s.anims[anim].frames[i]), x, y + lab + rowH - lab - cfg.H);
      x += cfg.W + pad;
    });
  });
  return out;
}

/** Every frame in play order, staged, as one strip, plus the frame durations (for the GIF). */
function playStrip(cfg: Cfg, s: WorldSprite, path: string): void {
  const frames: Canvas[] = [], ms: number[] = [];
  for (const ph of PHASES) for (const fr of s.anims[ph.key].frames) {
    frames.push(staged(cfg, fr));
    ms.push(Math.round(1000 / ph.fps / 10) * 10);
  }
  const strip = new Canvas(cfg.W * frames.length, cfg.H);
  frames.forEach((fr, i) => strip.draw(fr, i * cfg.W, 0));
  strip.save(path + '.png');
  writeFileSync(path + '.json', JSON.stringify({ w: cfg.W, h: cfg.H, ms }));
}

// KIRIN_PEEK=kirin_enh:strike:2,5 renders just those frames (staged, side by side) to
// <previewDir>/../kv/peek.png for review, without writing the group.
const PEEK = process.env.KIRIN_PEEK;
if (PEEK) {
  const [key, anim, frs] = PEEK.split(':');
  G = key === 'kirin_enh' ? ENH : NORMAL;
  const fn = { gather: gatherFrame, strike: G.enh ? strikeDragon : strikeNormal, impact: impactFrame, fade: fadeFrame }[anim]!;
  const list = frs.split(',').map(Number);
  const out = new Canvas(list.length * (G.W + 4), G.H);
  list.forEach((f, j) => out.draw(staged(G, fn(f)), j * (G.W + 4), 0));
  out.save(join(OUT, '..', 'kv', 'peek.png'));
  process.exit(0);
}

const built: [Cfg, WorldSprite][] = [];
for (const cfg of [NORMAL, ENH]) {
  const s = build(cfg);
  built.push([cfg, s]);
  for (const [k, a] of Object.entries(s.anims)) {
    const bad = borderTouches(a.frames);
    console.log(`${cfg.key.padEnd(10)} ${k.padEnd(7)} ${a.frames.length}f @${a.fps} frame ${cfg.W}x${cfg.H} anchor ${cfg.AX},${cfg.AY} row ${a.frames.length * cfg.W}px ${bad.length ? 'BORDER ' + bad.join(',') : 'border ok'}`);
  }
}
writeGroup('vfx_lightning_sig', built.map(([, s]) => s));
sheet(built).scaled(2).save(join(OUT, 'vfx-kirin.png'));
for (const [cfg, s] of built) {
  G = cfg;
  playStrip(cfg, s, join(OUT, '..', `kirin-play-${cfg.key}`));
}
