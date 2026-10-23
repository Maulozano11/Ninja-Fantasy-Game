// Blood for the Bleeding Cut (the owner, 2026-10-21: "hay que añadir algun sprite de sangre
// explotando hacia el lado donde se hace el corte para efecto de sangrado", and then "las gotas de
// sangre manchan la pantalla cuando exitosamente se consigue el sangrado"). A stylised spray, no
// gore: dark-red drops with his dark line and a bright glint, shaded in clusters like his water hit.
//
//   vfx_blood/spray   burst  the blood thrown out of the cut toward the side the cut travels
//                            (drawn going right; the game mirrors it): a fan of jets from the
//                            wound that breaks into drops, which arc, fall and lie on the ground
//                            a moment, then fade. Anchor: the ground under the wound (the
//                            target's feet), the wound 54 px above it and a little forward.
//                     drip   a few drops falling from the wound when Bleeding hurts at the start
//                            of the bleeding ninja's turn.
//   vfx_blood/screen  a..d   four splats that land on the screen itself (a camera overlay) when the
//                            cut leaves Bleeding: the hit, then a run sliding down. Anchor: the
//                            splat's centre. Drawn in screen pixels, scaled with the screen.
//
//   WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-blood.ts
//
// It refuses to run without WORLD_OUT, so it never writes into src/assets: copy the staged group
// into src/assets/world/vfx_blood/ once the owner approves it. Same input, same bytes (a fixed
// seed, no Math.random).

import { Canvas, LIGHT, hash, hex, writeGroup } from './kit';
import type { Color, WorldSprite } from './kit';

/**
 * The blood ramp: 0 his dark line (a near-black red, like the line round his fire), 1 dark,
 * 2 shadow, 3 base, 4 light, 5 highlight, 6 the glint. Shadows lean cool, the lights warm.
 */
export const BLOOD = ['#2b080d', '#5b0f18', '#8a1622', '#b42229', '#dc4038', '#ff7e66', '#ffd6c8'];
const RAMP: Color[] = BLOOD.map((h) => hex(h));

/** A seeded generator (mulberry32): the same drops every run. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- shapes into a mask, then shaded as liquid --------------------------------------------

/** A shape mask the size of a frame. */
class Mask {
  readonly on: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.on = new Uint8Array(w * h);
  }
  set(x: number, y: number): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.on[y * this.w + x] = 1;
  }
  get(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.on[y * this.w + x] === 1;
  }
  /** A disc (pixel centres). */
  disc(cx: number, cy: number, r: number): void {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) this.set(x, y);
  }
  /**
   * A drop streaking along its flight: a round head of radius `r` at (hx, hy), tapering to a thin
   * tail at (tx, ty) behind it.
   */
  streak(hx: number, hy: number, tx: number, ty: number, r: number, tail = 0.3): void {
    const dx = tx - hx, dy = ty - hy, L2 = dx * dx + dy * dy;
    const x0 = Math.floor(Math.min(hx, tx) - r - 1), x1 = Math.ceil(Math.max(hx, tx) + r + 1);
    const y0 = Math.floor(Math.min(hy, ty) - r - 1), y1 = Math.ceil(Math.max(hy, ty) + r + 1);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5 - hx, py = y + 0.5 - hy;
        const u = L2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / L2)) : 0;
        const rr = r * (1 - (1 - tail) * u);
        if ((px - u * dx) ** 2 + (py - u * dy) ** 2 <= rr * rr) this.set(x, y);
      }
  }
  /** A flat ellipse (a drop lying on the ground). */
  ellipse(cx: number, cy: number, rx: number, ry: number): void {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y);
  }
}

/** Distance (in pixels, 4-way) from each pixel of the mask to the nearest pixel outside it. */
function depth(m: Mask): Float32Array {
  const { w, h } = m;
  const d = new Float32Array(w * h);
  const queue: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!m.on[i]) continue;
    const x = i % w, y = (i / w) | 0;
    if (!m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)) {
      d[i] = 1;
      queue.push(i);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], x = i % w, y = (i / w) | 0;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + ox, ny = y + oy;
      if (!m.get(nx, ny)) continue;
      const j = ny * w + nx;
      if (d[j]) continue;
      d[j] = d[i] + 1;
      queue.push(j);
    }
  }
  return d;
}

/**
 * Paints a mask as a pool of blood onto `out` (levels into the ramp): a dome as deep as `round`
 * pixels, lit from the upper left, so the lit rim sits up-left, the shadow down-right and the flat
 * middle in the base; band edges jittered into small clusters; his dark line round the outside;
 * a glint on each big drop. `fade` (0..1) is how solid it is drawn.
 */
function paint(out: Canvas, m: Mask, opts: { round?: number; seed?: number; fade?: number; glintArea?: number; dark?: number; shine?: number } = {}): void {
  const { w, h } = m;
  const R = opts.round ?? 3, seed = opts.seed ?? 1, fade = opts.fade ?? 1, shift = opts.dark ?? 0, shine = opts.shine ?? 0;
  const d = depth(m);
  const H = (x: number, y: number): number => {
    if (!m.get(x, y)) return 0;
    const k = Math.min(d[y * w + x], R) / R;
    return Math.sqrt(1 - (1 - k) ** 2);
  };
  // A wet shine (the drops on the screen): the rims that face the light are lifted a step more.
  const l0 = (nx: number, ny: number): number => nx * LIGHT[0] + ny * LIGHT[1];
  const level = new Int8Array(w * h).fill(-1);
  const light = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!m.get(x, y)) continue;
      const nx = -((H(x + 1, y) - H(x - 1, y)) / 2) * R, ny = -((H(x, y + 1) - H(x, y - 1)) / 2) * R;
      const len = Math.hypot(nx, ny, 1);
      const l = (nx * LIGHT[0] + ny * LIGHT[1] + LIGHT[2]) / len + (hash(x >> 1, y >> 1, seed) - 0.5) * 0.12 + (l0(nx, ny) > 0 ? shine : 0);
      light[y * w + x] = l;
      level[y * w + x] = Math.max(1, (l < 0.1 ? 1 : l < 0.32 ? 2 : l < 0.55 ? 3 : l < 0.74 ? 4 : 5) - shift);
    }
  // A glint on every drop big enough to hold one: its most lit pixel.
  const seen = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!m.on[i] || seen[i]) continue;
    const blob: number[] = [i];
    seen[i] = 1;
    for (let q = 0; q < blob.length; q++) {
      const j = blob[q], x = j % w, y = (j / w) | 0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ox, ny = y + oy;
        if (!m.get(nx, ny) || seen[ny * w + nx]) continue;
        seen[ny * w + nx] = 1;
        blob.push(ny * w + nx);
      }
    }
    if (blob.length < (opts.glintArea ?? 7)) {
      // A speck: one dark pixel, or a base pixel lit at its upper left.
      for (const j of blob) level[j] = Math.min(level[j], blob.length <= 2 ? 2 : 3);
      continue;
    }
    // On the body of the drop (two pixels in from its edge), not the tip of its tail.
    let best = -1;
    for (const j of blob) if (d[j] >= 2 && (best < 0 || light[j] > light[best])) best = j;
    if (shift === 0 && best >= 0) level[best] = 6;
  }
  const put = (x: number, y: number, lv: number) => {
    const c = RAMP[lv];
    out.plot(x, y, fade >= 1 ? c : [c[0], c[1], c[2], Math.round(255 * fade)]);
  };
  // His dark line: every empty pixel next to the shape (sides only, so it stays 1 px).
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (m.get(x, y)) continue;
      if (m.get(x - 1, y) || m.get(x + 1, y) || m.get(x, y - 1) || m.get(x, y + 1)) put(x, y, 0);
    }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (level[y * w + x] >= 0) put(x, y, level[y * w + x]);
}

// --- the spray ------------------------------------------------------------------------------

export const SPRAY = { w: 128, h: 96, anchor: [26, 84] as [number, number], wound: [33, 30] as [number, number] };

interface Drop {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  r: number;
  /** Where its ground is (the depth it lands at, around the anchor's row). */
  ground: number;
  /** How long a streak it leaves behind (time units). */
  trail: number;
}

/** Drag and gravity of the flight (time in "steps"; px per step). */
const K = 0.9, G = 60;

function at(d: Drop, t: number): { x: number; y: number; vx: number; vy: number } {
  const e = Math.exp(-K * t);
  const x = d.x0 + (d.vx * (1 - e)) / K;
  const y = d.y0 + (d.vy * (1 - e)) / K + (G * t) / K - (G * (1 - e)) / (K * K);
  return { x, y, vx: d.vx * e, vy: d.vy * e + (G / K) * (1 - e) };
}

/** When a drop reaches its ground (bisection on the falling side), or Infinity. */
function landing(d: Drop): number {
  let lo = 0, hi = 0;
  for (let t = 0.05; t < 20; t += 0.05) {
    if (at(d, t).y >= d.ground && at(d, t).vy > 0) {
      hi = t;
      lo = t - 0.05;
      break;
    }
  }
  if (!hi) return Infinity;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (at(d, mid).y >= d.ground) hi = mid;
    else lo = mid;
  }
  return hi;
}

function drops(): Drop[] {
  const r = rng(0xb100d);
  const [wx, wy] = SPRAY.wound;
  const gy = SPRAY.anchor[1];
  const out: Drop[] = [];
  // Big jets, middle drops, small specks: thrown forward in a fan about the cut's line, a little up.
  const kinds: [number, number, number, number, number][] = [
    // count, radius min, max, speed min, max
    [5, 2.3, 3.1, 45, 65],
    [9, 1.4, 2.1, 35, 70],
    [12, 0.7, 1.15, 30, 80],
  ];
  for (const [n, r0, r1, s0, s1] of kinds)
    for (let i = 0; i < n; i++) {
      // Mostly level and a little up: the drops thrown steeply up are slower, so none crosses the face.
      const deg = -10 + (r() - 0.5) * 70;
      const ang = (deg * Math.PI) / 180;
      const sp = (s0 + (s1 - s0) * r()) * (deg < -25 ? 0.75 : 1);
      const off = (r() - 0.5) * 2;
      out.push({ x0: wx + off * 2, y0: wy + off * 4, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: r0 + (r1 - r0) * r(), ground: gy - 6 + Math.round(r() * 11), trail: 0.1 + 0.07 * r() });
    }
  return out;
}

/** The sim time each frame shows: quick at the burst, slower as the drops settle. */
const SPRAY_T = [0.1, 0.24, 0.42, 0.64, 0.9, 1.2, 1.52, 1.86, 2.25, 2.65, 3.05, 3.45];
/** How solid the drops on the ground are in each frame (they fade at the end). */
const GROUND_FADE = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.75, 0.5, 0.25];

function sprayFrames(): Canvas[] {
  const ds = drops();
  const lands = ds.map(landing);
  const { w, h } = SPRAY;
  const [wx, wy] = SPRAY.wound;
  return SPRAY_T.map((t, f) => {
    const c = new Canvas(w, h);
    // The drops already down lie on the ground, behind the ones still flying.
    const ground = new Mask(w, h);
    const flying = new Mask(w, h);
    ds.forEach((d, i) => {
      if (t >= lands[i]) {
        const p = at(d, lands[i]);
        // A drop that lands spreads out flat; the shrink as it fades reads as it soaking in.
        const k = f >= 10 ? 0.75 : 1;
        ground.ellipse(p.x, d.ground, Math.max(1.2, d.r * 1.6 * k), Math.max(1.1, d.r * 0.75 * k));
        return;
      }
      const p = at(d, t);
      // The streak behind it, never further back than the wound (the jets of the first frames).
      const q = at(d, Math.max(0, t - d.trail));
      flying.streak(p.x, p.y, q.x, q.y, d.r, d.r > 2 ? 0.45 : 0.3);
    });
    // The burst at the wound for the first frames: the blood leaving the cut.
    const core = [3.6, 4.4, 3.2, 1.8][f];
    if (core) flying.streak(wx + 1, wy, wx - 1, wy - 1, core, 0.8);
    paint(c, ground, { round: 2, seed: 7, fade: GROUND_FADE[f], glintArea: 9, dark: 1 });
    paint(c, flying, { round: 3, seed: 3 + f });
    return c;
  });
}

/** A few drops falling from the wound, for Bleeding hurting at the start of a turn. */
const DRIP_T = [0.15, 0.4, 0.65, 0.9, 1.15, 1.4, 1.7, 2.0];
function dripFrames(): Canvas[] {
  const [wx, wy] = SPRAY.wound;
  const gy = SPRAY.anchor[1];
  const ds: (Drop & { t0: number })[] = [
    { x0: wx + 1, y0: wy + 2, vx: 8, vy: 0, r: 1.9, ground: gy + 1, trail: 0.12, t0: 0 },
    { x0: wx - 2, y0: wy + 5, vx: 4, vy: 0, r: 1.5, ground: gy - 2, trail: 0.12, t0: 0.4 },
    { x0: wx + 3, y0: wy + 4, vx: 12, vy: -6, r: 1.2, ground: gy + 3, trail: 0.12, t0: 0.75 },
  ];
  const lands = ds.map((d) => landing(d) + d.t0);
  const { w, h } = SPRAY;
  return DRIP_T.map((t, f) => {
    const c = new Canvas(w, h);
    const ground = new Mask(w, h);
    const flying = new Mask(w, h);
    // A bead swelling at the wound before the first drop goes.
    if (f < 2) flying.disc(wx + 1, wy + 2, [1.8, 2.2][f]);
    ds.forEach((d, i) => {
      if (t < d.t0) return;
      if (t >= lands[i]) {
        ground.ellipse(at(d, lands[i] - d.t0).x, d.ground, d.r * 1.6, Math.max(1.1, d.r * 0.75));
        return;
      }
      const p = at(d, t - d.t0);
      const q = at(d, Math.max(0, t - d.t0 - d.trail));
      flying.streak(p.x, p.y, q.x, q.y, d.r, 0.35);
    });
    paint(c, ground, { round: 2, seed: 11, fade: f >= 6 ? (f === 6 ? 0.7 : 0.4) : 1, glintArea: 9, dark: 1 });
    paint(c, flying, { round: 2, seed: 13 + f, glintArea: 6 });
    return c;
  });
}

// --- on the screen ---------------------------------------------------------------------------

export const SCREEN = { w: 56, h: 72, anchor: [28, 24] as [number, number] };

/**
 * One splat on the lens: a lumpy round body, spikes thrown out where it hit, a few satellite
 * drops, then a run sliding down from its lower edge. Frames: the hit (small, then full), held,
 * and the run growing.
 */
function screenSplat(seed: number): Canvas[] {
  const r = rng(seed);
  const [cx, cy] = SCREEN.anchor;
  const R = 8 + r() * 3;
  const lump = [r(), r(), r(), r()].map((v) => v * Math.PI * 2);
  const spikes = Array.from({ length: 9 + Math.floor(r() * 4) }, () => ({ a: r() * Math.PI * 2, len: R * (0.25 + r() * 0.6), w: 0.7 + r() * 0.7 }));
  const sats = Array.from({ length: 4 + Math.floor(r() * 3) }, () => ({ a: r() * Math.PI * 2, d: R * (1.5 + r() * 0.8), r: 0.9 + r() * 1.3 }));
  // Where the run leaves the body, and how far it slides.
  const runX = cx + (r() - 0.5) * R * 0.9;
  const runs = [0, 0, 0, 7, 14, 21, 28];
  const scale = [0.55, 1, 1, 1, 1, 1, 1];
  return runs.map((run, f) => {
    const m = new Mask(SCREEN.w, SCREEN.h);
    const k = scale[f];
    for (let y = 0; y < SCREEN.h; y++)
      for (let x = 0; x < SCREEN.w; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const a = Math.atan2(dy, dx);
        const rr = R * k * (1 + 0.12 * Math.sin(2 * a + lump[0]) + 0.08 * Math.sin(3 * a + lump[1]) + 0.05 * Math.sin(5 * a + lump[2]));
        if (dx * dx + dy * dy <= rr * rr) m.set(x, y);
      }
    for (const s of spikes) {
      const bx = cx + Math.cos(s.a) * R * 0.7 * k, by = cy + Math.sin(s.a) * R * 0.7 * k;
      const tx = cx + Math.cos(s.a) * (R + s.len) * k, ty = cy + Math.sin(s.a) * (R + s.len) * k;
      // A spike: thick at the body, a small drop at its tip.
      m.streak(bx, by, tx, ty, s.w * 1.5 * k, 0.25);
      if (s.len > R * 0.5) m.disc(tx + Math.cos(s.a) * 2.5 * k, ty + Math.sin(s.a) * 2.5 * k, s.w * 0.9 * k);
    }
    if (f > 0) for (const s of sats) m.disc(cx + Math.cos(s.a) * s.d, cy + Math.sin(s.a) * s.d, s.r);
    if (run) {
      // The run: a trickle down from the body's lower edge with a heavier drop at its end.
      const top = cy + R * 0.6;
      m.streak(runX, top + run, runX + 0.5, top, 2.3, 0.75);
      m.disc(runX, top + run, 2.6);
    }
    const c = new Canvas(SCREEN.w, SCREEN.h);
    paint(c, m, { round: 3, seed: seed + f, glintArea: 12, shine: 0.14 });
    return c;
  });
}

const sprite = (name: string, label: string, size: { w: number; h: number; anchor: [number, number] }, anims: WorldSprite['anims']): WorldSprite => ({
  name,
  label,
  meters: [+(size.w / 57).toFixed(2), +(size.h / 57).toFixed(2)],
  anchor: size.anchor,
  tags: ['vfx'],
  anims,
});

export function bloodSprites(): WorldSprite[] {
  return [
    sprite('spray', 'Blood spray: thrown out of the cut toward the side it travels (drawn going right), the drops arc and fall and fade on the ground; a drip when Bleeding hurts', SPRAY, {
      burst: { fps: 12, loop: false, frames: sprayFrames() },
      drip: { fps: 10, loop: false, frames: dripFrames() },
    }),
    sprite('screen', 'Blood on the screen: four splats that land on the lens when the cut leaves Bleeding, then run down (screen pixels)', SCREEN, {
      a: { fps: 12, loop: false, frames: screenSplat(0x5a1) },
      b: { fps: 12, loop: false, frames: screenSplat(0x5b2) },
      c: { fps: 12, loop: false, frames: screenSplat(0x5c3) },
      d: { fps: 12, loop: false, frames: screenSplat(0x5d4) },
    }),
  ];
}

const root = process.env.WORLD_OUT;
if (!root) throw new Error('vfx-blood: set WORLD_OUT to the staging folder (this generator never writes into src/assets)');
writeGroup('vfx_blood', bloodSprites(), root);
console.log(`vfx-blood: wrote vfx_blood under ${root}`);
