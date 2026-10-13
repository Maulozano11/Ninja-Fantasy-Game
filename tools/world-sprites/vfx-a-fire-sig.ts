// Signature fire jutsu (vfx_fire), each with a normal and an enhanced version; the renderer
// picks the `_great` / `_enh` sprite when the jutsu event carries `enhanced`.
//
//   fireball          Great Fireball, circle radius 1.5 m. 'fly' (6f loop) + 'burst' (8f once).
//   fireball_great    enhanced: radius 2.25 m, ball twice the size, white-hot core, heat-shimmer
//                     ring, heavier smoke tail; 'burst' (10f) with a shock ring and scorched ground.
//   annihilation      Great Fire Annihilation, 60 deg cone 12 m long (684 px): 'surge' (8f once, the
//                     wave rolls out), 'burn' (6f loop), 'fade' (6f once).
//   annihilation_enh  enhanced: 15 m (855 px), taller, a second wave, a fire dragon in the crest,
//                     a dark smoke ceiling and falling embers.
//
// The fireballs share one anchor for both anims: the ball's center while flying and the ground
// center of the burst, so the renderer swaps 'fly' for 'burst' at the impact point. The
// annihilation sprites are pre-assembled right-facing cones: the anchor is the caster's feet
// (the cone's apex, on the ground) and the cone's axis runs right along the anchor row; the
// renderer mirrors them for casts to the left (see vfx-vfx-a-NOTES.md).

import { Canvas, WorldSprite, withAlpha } from './kit';
import { FIRE, ROCK, SMOKE, TH, embers, erode, flow, tongue } from './vfx-a-fire-kit';
import { Field, Pt, TAU, clamp, frames, fract, lerp, pfbm, pnoise, render, rr, seamStack, smooth, stack, vfxSprite } from './vfx-a-lib';

const PX = 57;
const DEPTH = 38;

// --- fireballs ------------------------------------------------------------------------------

interface Ball {
  great: boolean;
  /** Ball radius in px while flying. */
  R: number;
  W: number;
  H: number;
  /** Anchor: ball center in flight, ground center of the burst. */
  cx: number;
  cy: number;
  /** Burst ground ellipse radii (the jutsu's circle). */
  RX: number;
  RY: number;
  seed: number;
}

/** The churning surface: band edges follow noise that turns with the ball (loops over t). */
function churn(b: Ball, t: number) {
  return (x: number, y: number): number => {
    const dx = x - b.cx, dy = y - b.cy, r = Math.hypot(dx, dy);
    if (r > b.R) return 0;
    const a = (Math.atan2(dy, dx) / TAU + 1) % 1;
    const n = pnoise(a * 48 - t * 48, r * 0.5, 4, 48, 0, b.seed + 3);
    return (n - 0.5) * 0.36 * smooth(b.R * 0.15, b.R * 0.45, r);
  };
}

function ballFly(b: Ball, t: number): Canvas {
  const { R, great, W, H, cx, cy } = b;
  const ph = t * TAU;
  const fire = new Field(W, H), smoke = new Field(W, H);
  // A smoke tail, much heavier on the great fireball.
  const nS = great ? 10 : 5;
  for (let k = 0; k < nS; k++) {
    const p = fract(k / nS + t);
    const x = cx - R * 1.5 - p * (great ? 66 : 40);
    const y = cy + rr(b.seed + 1, k, -R * 0.45, R * 0.35) - p * R * 0.3;
    smoke.disc(x, y, (great ? 8 : 4) + p * (great ? 11 : 6), great ? 0.8 : 0.55, 1.2);
  }
  // The fire tail: big tongues streaming off the back half.
  const nT = great ? 11 : 7;
  for (let k = 0; k < nT; k++) {
    const u = k / (nT - 1);
    const a = Math.PI + lerp(-1.3, 1.3, u);
    const mid = 1 - Math.abs(u - 0.5) * 2;
    const len = R * (0.8 + 0.95 * mid) * (1 + 0.12 * Math.sin(ph + k * 1.7));
    const dir = Math.atan2(Math.sin(a) * 0.5, -1);
    tongue(fire, [cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78], dir, len, R * 0.3, 0.86, 0.14, ph + k * 1.3, Math.sin(a) * 0.12);
  }
  // Corona of short tongues all round, swept back.
  const nC = great ? 24 : 14;
  for (let k = 0; k < nC; k++) {
    const a = (k / nC) * TAU + 0.13;
    const back = Math.max(0, -Math.cos(a));
    const len = R * (0.22 + 0.3 * back + (great ? 0.12 : 0)) * (1 + 0.25 * Math.sin(ph * 2 + k * 2.3));
    tongue(fire, [cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9], Math.atan2(Math.sin(a), Math.cos(a) - 0.75 * back), len, R * 0.17, 0.8, 0.14, ph + k, 0);
  }
  fire.disc(cx, cy, R, 1, great ? 2.8 : 1.9);
  erode(fire, 0.55, (x, y) => pfbm(x + t * W, y, R * 0.22, 2, W, 0, b.seed + 5), (x, y) => smooth(R * 0.95, R * 1.15, Math.hypot(x - cx, y - cy)));
  const ch = churn(b, t), fl = flow(-t * W, 0.08, W);
  const fireC = render(fire, FIRE, { th: TH, rim: [1], jitter: (x, y) => ch(x, y) + (Math.hypot(x - cx, y - cy) > R ? fl(x, y) : 0) });
  const smokeC = render(smoke, SMOKE, { th: [0, 0.14, 0.3, 0.48, 0.66], hi: great ? 4 : 5, rim: [1], jitter: (x, y) => (pfbm(x + t * W, y, 6, 2, W, 0, b.seed + 7) - 0.5) * 0.4 });
  const layers: (Canvas | null)[] = [smokeC];
  if (great) {
    // A heat-shimmer ring: a pale, wavy, see-through halo around the ball.
    const ring = new Canvas(W, H);
    const rr0 = R + R * 0.42;
    for (let k = 0; k < 540; k++) {
      const a = (k / 540) * TAU;
      const r = rr0 + 2.5 * Math.sin(a * 7 + ph) + 1.4 * Math.sin(a * 13 - ph * 2);
      const on = (k + Math.round(t * 54)) % 18 < 13;
      if (on) {
        ring.set(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), withAlpha(FIRE[6], 150));
        ring.set(Math.round(cx + Math.cos(a) * (r + 1)), Math.round(cy + Math.sin(a) * (r + 1)), withAlpha(FIRE[5], 95));
      }
      const r2 = r + 6 + 1.5 * Math.sin(a * 5 - ph);
      if ((k + Math.round(t * 54)) % 6 < 2) ring.set(Math.round(cx + Math.cos(a) * r2), Math.round(cy + Math.sin(a) * r2), withAlpha(FIRE[5], 70));
    }
    layers.push(ring);
  }
  layers.push(fireC);
  const em: { x: number; y: number; s: number }[] = [];
  const nE = great ? 18 : 9;
  for (let k = 0; k < nE; k++) {
    const p = fract(k / nE + t);
    em.push({ x: cx - R * 0.8 - p * (great ? 120 : 70) + rr(b.seed + 9, k, -6, 6), y: cy + rr(b.seed + 10, k, -R * 1.3, R * 1.3) - p * 10, s: p < 0.4 ? 2 : 1 });
  }
  const body = stack(W, H, ...layers);
  return stack(W, H, body, embers(W, H, em.filter((e) => e.x > 1 && e.y > 1 && e.y < H - 2), fireC));
}

function ballBurst(b: Ball, i: number, n: number): Canvas {
  const { great, W, H, cx, cy: gy, RX, RY } = b;
  const p = i / (n - 1);
  const spread = great ? [0.3, 0.55, 0.78, 0.95, 1, 1, 1, 1, 1, 1][i] : [0.32, 0.62, 0.88, 1, 1, 1, 1, 1][i];
  const hf = great ? [0.45, 0.8, 1, 1.05, 1, 0.82, 0.62, 0.42, 0.22, 0.06][i] : [0.5, 0.88, 1, 0.95, 0.75, 0.52, 0.28, 0.08][i];
  const Hmax = great ? 78 : 50;
  const bed = new Field(W, H), back = new Field(W, H), mid = new Field(W, H), front = new Field(W, H), dome = new Field(W, H), smoke = new Field(W, H), scorch = new Field(W, H);
  const t = i / n;
  // Scorched ground.
  if (p > 0.15) scorch.ell(cx, gy, RX * spread * 0.98, RY * spread * 0.98, 0, 1, 6);
  // A patchy bed of fire over the circle, and flames standing inside it (back rows first): a
  // ring of tall flames races out to the edge, then the whole circle burns and dies down in patches.
  if (hf > 0.05) {
    if (hf > 0.25) bed.region(cx - RX, gy - RY, cx + RX, gy + RY, (x, y) => {
      const r = Math.hypot((x - cx) / (RX * spread), (y - gy) / (RY * spread));
      if (r >= 1) return 0;
      const n = pnoise(x, y, 9, 0, 0, b.seed + 21);
      if (n < 0.25 + p * 0.45) return 0;
      return (0.6 - 0.25 * r) * Math.min(1, hf * 1.6);
    });
    const step = great ? 17 : 13;
    for (let y = gy - RY; y <= gy + RY; y += step * 0.62)
      for (let x = cx - RX; x <= cx + RX; x += step) {
        const key = Math.round(x * 7 + y * 13);
        if (rr(b.seed + 29, key, 0, 1) < 0.18 + p * 0.5) continue;
        const jx = x + rr(b.seed + 22, key, -step * 0.35, step * 0.35) + ((Math.round((y - gy) / (step * 0.62)) & 1) ? step / 2 : 0);
        const r = Math.hypot((jx - cx) / (RX * spread), (y - gy) / (RY * spread));
        if (r >= 0.96) continue;
        const f = y < gy - RY * 0.3 ? back : y < gy + RY * 0.3 ? mid : front;
        const ring = spread < 1 ? 0.45 + 0.55 * Math.exp(-(((r - 0.82) / 0.28) ** 2)) : 1 - 0.45 * r;
        const len = Hmax * hf * ring * rr(b.seed + 23, key, 0.65, 1.15);
        if (len < 4) continue;
        tongue(f, [jx, y + 1], -Math.PI / 2 + rr(b.seed + 24, key, -0.15, 0.15), len, (great ? 7 : 5.5) * (0.6 + 0.4 * hf), 0.95 - 0.3 * r, 0.16, t * TAU + jx * 0.1, 0);
      }
  }
  // The ball itself: a flash, then a rolling dome of fire that rises and cools.
  const R = b.R;
  if (i === 0) dome.ell(cx, gy - R * 0.5, R * 1.45, R * 1.05, 0, 1, 2.2);
  else if (p < 0.75) {
    const rise = p * Hmax * 1.4;
    const rD = R * lerp(1.35, 0.8, p);
    dome.ell(cx, gy - R * 0.4 - rise, rD * 1.15, rD, 0, lerp(1, 0.75, p), 1.6);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + p * 2;
      dome.disc(cx + Math.cos(a) * rD * 0.8, gy - R * 0.4 - rise + Math.sin(a) * rD * 0.6, rD * 0.5, lerp(0.85, 0.6, p), 1.2);
    }
  }
  erode(dome, 0.8, (x, y) => pfbm(x, y + i * 10, R * 0.25, 2, 0, 0, b.seed + 25));
  // Smoke climbing once the fire cools.
  if (p > 0.3) {
    const sk = (p - 0.3) / 0.7;
    const nS = great ? 9 : 6;
    for (let k = 0; k < nS; k++) {
      const x = cx + (k - (nS - 1) / 2) * (great ? 22 : 18) * (0.7 + sk * 0.4) + rr(b.seed + 26, k, -5, 5);
      const y = gy - Hmax * 0.9 - sk * 30 + Math.abs(k - (nS - 1) / 2) * 6 + rr(b.seed + 27, k, -5, 5);
      if (y < 4) continue;
      smoke.disc(x, y, (great ? 15 : 11) * (0.8 + sk * 0.5), lerp(0.8, 0.45, sk), 1.2);
    }
  }
  const layers: (Canvas | null)[] = [];
  layers.push(scorch.any() ? render(scorch, SMOKE, { th: [0, 0.3, 0.7], lo: 1, hi: 2, outline: false, alpha: [0, great ? 120 : 80, great ? 150 : 100] }) : null);
  // Shock ring racing over the ground.
  const shockK = great ? [0.25, 0.55, 0.82, 1.0][i] : [0.3, 0.65, 0.95][i];
  if (shockK) {
    const ring = new Canvas(W, H);
    const a0 = great ? 230 : 200;
    for (let k = 0; k < 720; k++) {
      const a = (k / 720) * TAU;
      for (const dr of great ? [0, 1, 2] : [0, 1]) {
        const x = Math.round(cx + Math.cos(a) * (RX * shockK - dr)), y = Math.round(gy + Math.sin(a) * (RY * shockK - dr * 0.66));
        ring.set(x, y, withAlpha(FIRE[dr === 0 ? 6 : dr === 1 ? 5 : 4], Math.round(a0 * (1 - i * 0.18))));
      }
    }
    layers.push(ring);
  }
  layers.push(bed.any() ? render(bed, FIRE, { th: TH, rim: [1], hi: 5 }) : null);
  layers.push(back.any() ? render(back, FIRE, { th: TH, rim: [1] }) : null);
  layers.push(smoke.any() ? render(smoke, SMOKE, { th: [0, 0.12, 0.26, 0.42, 0.6], hi: great ? 5 : 6, rim: [1, 2], jitter: (x, y) => (pfbm(x, y - i * 4, 7, 2, 0, 0, b.seed + 28) - 0.5) * 0.4 }) : null);
  // Debris and embers flung out of the impact (the rocks fly behind the nearer flames).
  const deb = new Field(W, H);
  const em: { x: number; y: number; s: number }[] = [];
  if (i >= 1 && p < 0.9) {
    const tt = i / n;
    const nD = great ? 14 : 8;
    for (let k = 0; k < nD; k++) {
      const vx = rr(b.seed + 30, k, -1, 1) * RX * 1.4, vy = -rr(b.seed + 31, k, 110, 190) * (great ? 1.2 : 1);
      const x = cx + vx * tt, y = gy - 6 + vy * tt + 260 * tt * tt;
      if (y > gy + RY * 0.8 || y < 2 || x < 2 || x > W - 3) continue;
      deb.disc(x, y, k % 3 === 0 ? 3.4 : 2.5, 0.8, 1);
    }
    const nE = great ? 26 : 14;
    for (let k = 0; k < nE; k++) {
      const a = rr(b.seed + 32, k, Math.PI * 1.05, Math.PI * 1.95), sp = rr(b.seed + 33, k, 60, 140) * (great ? 1.3 : 1);
      em.push({ x: cx + Math.cos(a) * sp * tt * 1.3, y: gy - 16 + Math.sin(a) * sp * tt + 80 * tt * tt, s: k % 4 === 0 && p < 0.5 ? 2 : 1 });
    }
  }
  if (p >= 0.9) for (let k = 0; k < 12; k++) em.push({ x: cx + rr(b.seed + 34, k, -RX * 0.8, RX * 0.8), y: gy + rr(b.seed + 35, k, -RY * 0.7, RY * 0.7), s: 1 });
  layers.push(deb.any() ? render(deb, ROCK, { th: [0, 0.3, 0.55, 0.75], hi: 4 }) : null);
  layers.push(mid.any() ? render(mid, FIRE, { th: TH, rim: [1] }) : null);
  layers.push(dome.any() ? render(dome, FIRE, { th: TH, rim: [1] }) : null);
  layers.push(front.any() ? render(front, FIRE, { th: TH, rim: [1] }) : null);
  const body = stack(W, H, ...layers);
  return stack(W, H, body, embers(W, H, em.filter((e) => e.x > 1 && e.x < W - 2 && e.y > 1 && e.y < H - 2), p < 0.9 ? body : null));
}

function fireball(great: boolean): WorldSprite {
  const r = great ? 2.25 : 1.5;
  const RX = Math.round(r * PX), RY = Math.round(r * DEPTH);
  const b: Ball = great
    ? { great, R: 44, W: 272, H: 224, cx: 136, cy: 124, RX, RY, seed: 700 }
    : { great, R: 23, W: 176, H: 128, cx: 88, cy: 72, RX, RY, seed: 600 };
  const fly = frames(6, (t) => ballFly(b, t));
  const nB = great ? 10 : 8;
  const burst = frames(nB, (_, i) => ballBurst(b, i, nB));
  return vfxSprite(great ? 'fireball_great' : 'fireball', great ? 'Great Fireball, enhanced (radius 2.25 m)' : 'Great Fireball (radius 1.5 m)', [b.cx, b.cy], {
    fly: { frames: fly, fps: 12, loop: true },
    burst: { frames: burst, fps: 12, loop: false },
  });
}

// --- annihilation: a towering wave of fire filling a 60 degree cone -------------------------

interface Wave {
  great: boolean;
  W: number;
  H: number;
  /** Apex (caster's feet) and cone length in px. */
  x0: number;
  gy: number;
  len: number;
  /** Tallest flames (px) at the far end. */
  hMax: number;
  seed: number;
}
interface WaveState {
  /** How far the crest has rolled (0..1 of the length). */
  crest: number;
  /** Overall flame height (0..1). */
  burn: number;
  /** Flames nearer the caster than this (0..1) have burnt out. */
  dead: number;
  /** Smoke amount (0..1). */
  smoke: number;
  t: number;
  /** Dragon in the crest (0..1 visibility), enhanced only. */
  dragon: number;
}

/** Half the cone's depth on screen at distance d px from the apex (the cone seen from the side). */
const halfDepth = (d: number) => 5 + 0.1 * d;

/** Turns a filled mask into heat by distance from its edge: a dark rim banding in to a hot core. */
function formHeat(f: Field, depth: number, lo = 0.3, hi = 1): void {
  const W = f.w, H = f.h, INF = 1e9;
  const d = new Float32Array(W * H);
  for (let i = 0; i < d.length; i++) d[i] = f.v[i] > 0 ? INF : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[y * W + x]);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.4, at(x + 1, y - 1) + 1.4);
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.4, at(x - 1, y + 1) + 1.4);
    }
  for (let i = 0; i < d.length; i++) if (f.v[i] > 0) f.v[i] = lerp(lo, hi, Math.min(1, d[i] / depth));
}

/** A fire dragon's head made of flame, facing right, drawn into a local canvas. */
export function dragonHead(s: number, heat: number, t: number): Canvas {
  const W = Math.round(200 * s), H = Math.round(120 * s);
  const hx = 76 * s, hy = 50 * s;
  const P = (x: number, y: number): Pt => [hx + x * s, hy + y * s];
  const ph = t * TAU;
  const parts: Canvas[] = [];
  const streak = (x: number, y: number) => (pnoise(x * 0.3 + t * 40, y, 2.5 * s, 40, 0, 951) - 0.5) * 0.22;
  const look = { th: TH, rim: [1], outline: false, jitter: streak };
  // Mane: flame tongues swept back from the skull and cheek.
  for (let k = 0; k < 8; k++) {
    const f = new Field(W, H);
    const a = (-148 - k * 7) * (Math.PI / 180);
    tongue(f, P(-26 + k * 1.5, -20 + k * 5.5), a, (58 - k * 3.5) * s + Math.sin(ph + k) * 3, 7.5 * s, heat * 0.9, 0.14, ph + k, 0.12);
    parts.push(render(f, FIRE, look));
  }
  // Horns: two long curved horns swept back.
  for (let k = 0; k < 2; k++) {
    const f = new Field(W, H);
    const base = P(-6 + k * 10, -20 - k * 2);
    const pts = [base, P(-26 + k * 8, -34 - k * 2), P(-50 + k * 8, -40 - k * 4), P(-70 + k * 12, -38 - k * 6)];
    f.path(pts, (u) => lerp(5.5, 1.2, u) * s, (u) => heat * lerp(0.62, 0.4, u), 1);
    parts.push(render(f, FIRE, { ...look, hi: 4, jitter: undefined }));
  }
  // The open mouth: a dark hollow with a fire glowing deep inside.
  const mouth = new Field(W, H);
  mouth.poly([P(2, 8), P(42, 5.5), P(32, 28), P(-2, 22)], 1);
  const mouthC = render(mouth, [FIRE[0], FIRE[0], FIRE[1], FIRE[2], FIRE[3]], { th: [0], outline: false });
  const glow = new Field(W, H);
  glow.ell(hx + 10 * s, hy + 16 * s, 12 * s, 6 * s, 0.25, 0.9, 1.5);
  parts.push(stack(W, H, mouthC, render(glow, FIRE, { th: TH, outline: false, lo: 2 })));
  // Lower jaw, hanging open.
  const lj = new Field(W, H);
  lj.poly([P(-4, 16), P(22, 19), P(50, 31), P(60, 37), P(52, 42), P(20, 36), P(-8, 29)], 1);
  formHeat(lj, 6 * s, 0.32, heat * 0.72);
  parts.push(render(lj, FIRE, look));
  // Skull and snout in one form, with a brow bump and a nose bump.
  const hd = new Field(W, H);
  hd.poly([P(-34, 10), P(-30, -12), P(-18, -24), P(-2, -27), P(10, -21), P(30, -15), P(54, -10), P(62, -12), P(70, -6), P(71, 1), P(62, 4), P(32, 6), P(12, 9), P(-2, 15), P(-18, 20), P(-32, 16)], 1);
  formHeat(hd, 9 * s, 0.34, heat * 0.8);
  hd.map((h, x, y) => (h > 0 ? h + 0.22 * Math.max(0, 1 - Math.hypot((x - hx + 14 * s) / (14 * s), (y - hy - 2 * s) / (9 * s))) : 0));
  parts.push(render(hd, FIRE, look));
  // Brow ridge and cheek frill.
  const br = new Field(W, H);
  br.path([P(-12, -16), P(4, -18), P(16, -13)], 2.6 * s, heat * 0.55, 1);
  parts.push(render(br, FIRE, look));
  const c = seamStack(W, H, parts, FIRE[2], FIRE[0]);
  // Fangs on both jaws.
  const fang = (x: number, y: number, down: boolean, len: number) => {
    for (let k = 0; k < len; k++) {
      const yy = Math.round(y + (down ? k : -k));
      const half = Math.max(0, Math.floor((len - k) / 3));
      for (let o = -half; o <= half; o++) c.set(Math.round(x) + o, yy, k === len - 1 ? FIRE[5] : FIRE[6]);
    }
  };
  for (let k = 0; k < 5; k++) fang(hx + (8 + k * 11) * s, hy + (8.6 - k * 1) * s, true, Math.round((k === 0 || k === 3 ? 6 : 4) * s));
  for (let k = 0; k < 4; k++) fang(hx + (6 + k * 11) * s, hy + (17.5 + k * 3.1) * s, false, Math.round((k === 1 ? 5 : 3.5) * s));
  // A burning eye under the brow: a slanted almond with a dark slit pupil, and a nostril.
  const ex = Math.round(hx + 6 * s), ey = Math.round(hy - 10 * s);
  const ew = Math.round(6 * s), eh = Math.max(2, Math.round(1.6 * s));
  for (let yy = -eh - 1; yy <= eh + 1; yy++)
    for (let xx = -ew - 1; xx <= ew + 1; xx++) {
      const slant = Math.round(xx * 0.25);
      const inside = Math.abs(yy + slant) <= eh * (1 - (xx / (ew + 0.5)) ** 2);
      const ring = !inside && Math.abs(yy + slant) <= eh * (1 - (xx / (ew + 1.5)) ** 2) + 1;
      if (inside) c.set(ex + xx, ey + yy, Math.abs(xx) <= 1 ? FIRE[0] : Math.abs(xx) < ew * 0.5 ? FIRE[6] : FIRE[5]);
      else if (ring) c.set(ex + xx, ey + yy, FIRE[0]);
    }
  const nx = Math.round(hx + 62 * s), ny = Math.round(hy - 6 * s);
  c.set(nx, ny, FIRE[0]);
  c.set(nx + 1, ny, FIRE[0]);
  c.set(nx, ny + 1, FIRE[1]);
  return c;
}

function waveFrame(w: Wave, st: WaveState): Canvas {
  const { W, H, x0, gy, len, hMax, great, seed } = w;
  const t = st.t, ph = t * TAU;
  const bed = new Field(W, H), smoke = new Field(W, H);
  const rows = [new Field(W, H), new Field(W, H), new Field(W, H)];
  const rowSide = [-1, 0, 1], rowH = [1, 0.8, 0.56], rowHeat = [0.84, 0.93, 1];
  const crestX = x0 + st.crest * len;
  const step = great ? 16 : 15;
  const heightAt = (x: number, row: number) => {
    const u = (x - x0) / len;
    if (x > crestX + 2 || u < 0) return 0;
    let h = hMax * lerp(0.26, 1, Math.pow(u, 0.75)) * rowH[row];
    // The rolling crest stands taller and leans forward; a second wave follows on the great one.
    const dc = crestX - x;
    h *= 1 + 0.32 * smooth(90, 10, dc) * (st.crest < 1 ? 1 : 0.6);
    if (great) {
      const c2 = crestX - len * 0.24;
      h *= 1 + 0.38 * smooth(80, 0, Math.abs(x - c2)) * (st.crest < 1 ? 1 : 0.6);
    }
    // Near the apex the cone is narrow and the flames are lower; behind a fresh crest they settle.
    h *= st.burn * (1 - smooth(st.dead - 0.08, st.dead + 0.06, u) * 0) * smooth(st.dead, st.dead + 0.12, u);
    return h;
  };
  const surging = st.crest < 1;
  for (let row = 0; row < 3; row++) {
    const f = rows[row];
    // The wave's solid body: a wall of fire from the ground up to about 60% of the row height,
    // hottest at the base, its top edge rolling with noise and its front rounded.
    f.region(x0, 0, Math.min(W - 1, crestX + 8), H - 1, (x, y) => {
      const d = x - x0;
      if (d < 0) return 0;
      const yg = gy + rowSide[row] * halfDepth(d) + 2 - 3 * pnoise(x, row * 9, 5, 0, 0, seed + 45);
      if (y > yg) return 0;
      const hFull = heightAt(Math.min(x, crestX), row);
      if (hFull <= 0) return 0;
      const front = Math.sqrt(clamp((crestX + (surging ? 6 : 0) - x + 6 * (pnoise(y, row, 5, 0, 0, seed + 47) - 0.5)) / (surging ? 22 : 38), 0, 1));
      const hb = hFull * 0.6 * (0.82 + 0.3 * pnoise(x - t * 90, row * 40, 22, 90, 0, seed + 40 + row)) * front;
      const u = (yg - y) / Math.max(1, hb);
      if (u >= 1 || u < 0) return 0;
      return lerp(rowHeat[row] * 0.86, 0.4, Math.pow(u, 1.1));
    });
    // Tongues of flame standing on the body up to the full height.
    for (let x = x0 + 4; x <= crestX + 2; x += step * (row === 1 ? 0.9 : 1)) {
      const jx = x + rr(seed + row, Math.round(x), -step * 0.3, step * 0.3) + (row === 1 ? step * 0.5 : 0);
      const d = jx - x0;
      if (d < 2 || jx > crestX + 2) continue;
      const yg = gy + rowSide[row] * halfDepth(d);
      const h = heightAt(jx, row) * rr(seed + 10 + row, Math.round(jx), 0.82, 1.12) * (1 + 0.08 * Math.sin(ph + jx * 0.05));
      if (h < 5) continue;
      const lean = 0.42 * smooth(80, 0, crestX - jx) * (surging ? 1 : 0.35);
      const wdt = Math.min(great ? 17 : 15, 5 + h * 0.08);
      tongue(f, [jx, yg - h * 0.42], -Math.PI / 2 + lean + rr(seed + 20, Math.round(jx), -0.08, 0.08), h * 0.6, wdt, rowHeat[row] * 0.85, 0.13, ph + jx * 0.07, lean * 0.4);
    }
  }
  // The crest's rolling head: the front of the back row curls over like a breaking wave.
  if (st.burn > 0.2 && st.dead < 0.85 && !(great && st.dragon > 0.5)) {
    const ch = heightAt(crestX - 4, 0);
    if (ch > 20) {
      const yg = gy - halfDepth(crestX - x0);
      const top = yg - ch * 0.92;
      const f = rows[0];
      const lip: Pt[] = [[crestX - ch * 0.35, top + ch * 0.12], [crestX - ch * 0.12, top - ch * 0.02], [crestX + ch * 0.08, top + ch * 0.06], [crestX + ch * 0.18, top + ch * 0.26], [crestX + ch * 0.14, top + ch * 0.42]];
      f.path(lip, (u) => ch * lerp(0.16, 0.05, u), (u) => lerp(0.95, 0.6, u), 1.2);
      f.disc(crestX - ch * 0.12, top + ch * 0.2, ch * 0.2, 0.9, 1.3);
      for (let k = 0; k < 4; k++) tongue(f, [crestX - ch * 0.2 + k * ch * 0.08, top + k * ch * 0.06], (-60 + k * 30) * (Math.PI / 180), ch * (0.2 - k * 0.025), ch * 0.045, 0.72, 0.15, ph + k, 0.25);
    }
  }
  // Burning ground over the cone's footprint.
  const edge = Math.min(crestX, W - 2);
  bed.region(x0, gy - halfDepth(len) - 4, edge, gy + halfDepth(len) + 4, (x, y) => {
    const d = x - x0, u = d / len;
    if (x > edge - 10 * pnoise(y, 0, 4, 0, 0, seed + 48) - 4) return 0;
    if (d < 16 || Math.abs(y - gy) > halfDepth(d) + 3) return 0;
    const n = pnoise(x, y, 6, 0, 0, seed + 31);
    if (u < st.dead + 0.06 * (n - 0.5) * 2) return n > 0.74 ? 0.3 : 0;
    const k = st.dead > 0 ? smooth(st.dead, st.dead + 0.2, u) : 1;
    const v = (0.42 + 0.3 * pnoise(x, y, 8, 0, 0, seed + 32)) * Math.min(1, st.burn * 1.5) * k;
    return v > 0.12 || n > 0.6 ? Math.max(v, 0.2) : 0;
  });
  const er = (x: number, y: number) => pfbm(x, y + t * 180, 9, 2, 0, 180, seed + 33);
  rows.forEach((f) => erode(f, 0.55, er));
  // Smoke: billows rolling over the fire (plus a dark ceiling on the great one).
  if (st.smoke > 0) {
    const xEnd = Math.min(crestX, x0 + len) - 24;
    const sm = Math.min(1, 0.25 + st.smoke);
    const n = great ? 60 : 44;
    for (let k = 0; k < n; k++) {
      const u = rr(seed + 33, k, 0, 1);
      const x = x0 + 50 + u * (xEnd - x0 - 50);
      const uu = (x - x0) / len;
      const top = gy - halfDepth(x - x0) - hMax * lerp(0.26, 1, Math.pow(uu, 0.75)) * Math.max(0.55, st.burn);
      const r = (great ? 22 : 16) * (0.6 + 0.6 * st.smoke) * rr(seed + 35, k, 0.6, 1.25) * lerp(0.55, 1, uu);
      const y = top - st.smoke * 20 + rr(seed + 34, k, -r * 0.9, r * 0.3) - Math.sin(ph + k) * 1.5;
      if (y < r * 0.4) continue;
      smoke.disc(x + Math.sin(ph + k * 1.7) * 2, y, r, (great ? 0.85 : 0.7) * sm, 2.4);
    }
    if (great) {
      const xs = x0 + 90;
      for (let k = 0; k < 30; k++) {
        const x = xs + ((k + 0.5) / 30) * (xEnd - xs);
        const r = rr(seed + 39, k, 18, 30) * (0.6 + 0.5 * st.smoke) * smooth(xs - 20, xs + 140, x);
        if (r < 4) continue;
        smoke.disc(x + Math.sin(ph + k * 1.3) * 3, rr(seed + 38, k, 6, 22), r, 0.8 * Math.min(1, st.smoke * 1.4), 2.4);
      }
      smoke.region(xs + 60, 0, xEnd - 30, 14, () => 0.8 * Math.min(1, st.smoke * 1.4));
    }
  }
  const layers: (Canvas | null)[] = [];
  layers.push(smoke.any() ? render(smoke, SMOKE, { th: [0, 0.12, 0.26, 0.42, 0.6, 0.78], hi: great ? 4 : 5, rim: [1, 2], jitter: (x, y) => (pfbm(x - t * 120, y, 6, 2, 120, 0, seed + 36) - 0.5) * 0.3 }) : null);
  layers.push(bed.any() ? render(bed, FIRE, { th: TH, hi: 5, rim: [1] }) : null);
  const streaks = (x: number, y: number) => (pnoise(x * 0.5, (y + t * 180) * 0.15, 2, 0, 27, seed + 46) - 0.5) * 0.26;
  layers.push(render(rows[0], FIRE, { th: TH, rim: [1], hi: 5, jitter: streaks }));
  if (great && st.dragon > 0.05) {
    // The dragon rides the crest, jaws open, its snout just ahead of the wave, its neck a
    // column of flame rising out of the wave.
    const ch = heightAt(Math.min(crestX, x0 + len) - 10, 0) || hMax;
    const sc = 1.45;
    const head = dragonHead(sc, 0.8 + 0.25 * st.dragon, t);
    const snout = Math.min(crestX + 34, W - 6);
    const hx = Math.round(snout - 148 * sc), hy = Math.max(-10, Math.round(gy - halfDepth(crestX - x0) - ch * 1.0 - 30 * sc));
    const neck = new Field(W, H);
    const skull: Pt = [hx + 66 * sc, hy + 54 * sc];
    const base: Pt = [skull[0] - 70, gy - halfDepth(crestX - x0) - ch * 0.45];
    const npts: Pt[] = [];
    for (let k = 0; k <= 16; k++) {
      const u = k / 16;
      npts.push([lerp(base[0], skull[0], u) - Math.sin(u * Math.PI) * 26, lerp(base[1], skull[1], u) + Math.sin(u * Math.PI * 2 + ph) * 3]);
    }
    neck.path(npts, (u) => lerp(30, 20, u) * sc * 0.6, (u) => lerp(0.9, 1, u) * st.dragon, 1.8);
    for (let k = 0; k < 6; k++) {
      const { 0: nx, 1: ny } = npts[2 + k * 2];
      tongue(neck, [nx - 6, ny - 10], (-150 - k * 4) * (Math.PI / 180), 30 + Math.sin(ph + k) * 4, 7, 0.75 * st.dragon, 0.14, ph + k, 0.1);
    }
    erode(neck, 0.25, er);
    layers.push(render(neck, FIRE, { th: TH, rim: [1], jitter: streaks }));
    layers.push(stackAt(W, H, head, hx, hy));
  }
  layers.push(render(rows[1], FIRE, { th: TH, rim: [1], jitter: streaks }));
  layers.push(render(rows[2], FIRE, { th: TH, rim: [1], jitter: streaks }));
  const body = stack(W, H, ...layers);
  // Embers: rising off the flames, and on the great one also raining down from the smoke.
  const em: { x: number; y: number; s: number }[] = [];
  const nE = great ? 46 : 26;
  for (let k = 0; k < nE; k++) {
    const p = fract(k / nE * 3 + t);
    const x = x0 + rr(seed + 37, k, 0.1, 1) * (Math.min(crestX, x0 + len) - x0);
    if (x - x0 < st.dead * len) continue;
    const falling = great && k % 2 === 0;
    const y = falling ? 20 + p * (gy - 40) : gy - halfDepth(x - x0) - hMax * 0.5 * st.burn - p * 120;
    em.push({ x: x + Math.sin(p * 6 + k) * 3, y, s: p < 0.3 ? 2 : 1 });
  }
  return stack(W, H, body, embers(W, H, em.filter((e) => e.y > 2 && e.y < H - 2 && e.x < W - 2)));
}
function stackAt(W: number, H: number, c: Canvas, x: number, y: number): Canvas {
  const out = new Canvas(W, H);
  out.draw(c, x, y);
  return out;
}

function annihilation(great: boolean): WorldSprite {
  const meters = great ? 15 : 12;
  const len = Math.round(meters * PX);
  const hMax = great ? 250 : 190;
  const x0 = 12;
  const gy = Math.round(halfDepth(len) + hMax * 1.32 + 10);
  const H = Math.ceil((gy + halfDepth(len) + 10) / 8) * 8;
  const W = Math.ceil((x0 + len + 48) / 8) * 8;
  const w: Wave = { great, W, H, x0, gy, len, hMax, seed: great ? 900 : 800 };
  const ease = (u: number) => 1 - Math.pow(1 - u, 1.6);
  const surge = frames(8, (_, i) => waveFrame(w, { crest: ease((i + 1) / 8), burn: lerp(0.75, 1, i / 7), dead: 0, smoke: Math.max(0, (i - 3) / 8), t: i / 8, dragon: smooth(1, 5, i) }));
  const burn = frames(6, (t) => waveFrame(w, { crest: 1, burn: 1, dead: 0, smoke: 0.6, t, dragon: 1 }));
  const fade = frames(6, (_, i) => waveFrame(w, { crest: 1, burn: [0.85, 0.66, 0.48, 0.3, 0.16, 0.06][i], dead: [0.08, 0.24, 0.42, 0.6, 0.78, 0.94][i], smoke: [0.8, 0.95, 1, 0.85, 0.6, 0.3][i], t: i / 6, dragon: [0.7, 0.35, 0, 0, 0, 0][i] }));
  return vfxSprite(great ? 'annihilation_enh' : 'annihilation', great ? 'Great Fire Annihilation, enhanced (cone 15 m, 60 deg)' : 'Great Fire Annihilation (cone 12 m, 60 deg)', [x0, gy], {
    surge: { frames: surge, fps: 12, loop: false },
    burn: { frames: burn, fps: 12, loop: true },
    fade: { frames: fade, fps: 12, loop: false },
  });
}

export function fireSignature(): WorldSprite[] {
  // VFX_SIG=fireball,annihilation limits the build while iterating (the full set is the default).
  const want = process.env.VFX_SIG ? process.env.VFX_SIG.split(',') : ['fireball', 'annihilation'];
  return [
    ...(want.includes('fireball') ? [fireball(false), fireball(true)] : []),
    ...(want.includes('annihilation') ? [annihilation(false), annihilation(true)] : []),
  ];
}

void clamp;
