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
import { Field, Pt, TAU, bez, clamp, dissolve, frames, fract, lerp, pfbm, pnoise, render, rr, smooth, stack, tubeShade, vfxSprite } from './vfx-a-lib';
import { drawDragon } from './vfx-a-fire-dragon';

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
  /** Room added left and above the original frame (W0 x H0): everything is drawn shifted by it
   * and noise is read at the unshifted spot, so the art is unchanged and only uncut. */
  ox: number;
  oy: number;
  W0: number;
  H0: number;
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
  const { R, great, W, H, cx, cy, ox, oy, W0, H0 } = b;
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
  erode(fire, 0.55, (x, y) => pfbm(x - ox + t * W0, y - oy, R * 0.22, 2, W0, 0, b.seed + 5), (x, y) => smooth(R * 0.95, R * 1.15, Math.hypot(x - cx, y - cy)));
  const ch = churn(b, t), fl = flow(-t * W0, 0.08, W0);
  const fireC = render(fire, FIRE, { th: TH, rim: [1], jitter: (x, y) => ch(x, y) + (Math.hypot(x - cx, y - cy) > R ? fl(x - ox, y - oy) : 0) });
  const smokeC = render(smoke, SMOKE, { th: [0, 0.14, 0.3, 0.48, 0.66], hi: great ? 4 : 5, rim: [1], jitter: (x, y) => (pfbm(x - ox + t * W0, y - oy, 6, 2, W0, 0, b.seed + 7) - 0.5) * 0.4 });
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
  return stack(W, H, body, embers(W, H, em.filter((e) => e.x - ox > 1 && e.y - oy > 1 && e.y - oy < H0 - 2), fireC));
}

function ballBurst(b: Ball, i: number, n: number): Canvas {
  const { great, W, H, cx, cy: gy, RX, RY, ox, oy, W0, H0 } = b;
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
      const n = pnoise(x - ox, y - oy, 9, 0, 0, b.seed + 21);
      if (n < 0.25 + p * 0.45) return 0;
      return (0.6 - 0.25 * r) * Math.min(1, hf * 1.6);
    });
    const step = great ? 17 : 13;
    for (let y = gy - RY; y <= gy + RY; y += step * 0.62)
      for (let x = cx - RX; x <= cx + RX; x += step) {
        const key = Math.round((x - ox) * 7 + (y - oy) * 13);
        if (rr(b.seed + 29, key, 0, 1) < 0.18 + p * 0.5) continue;
        const jx = x + rr(b.seed + 22, key, -step * 0.35, step * 0.35) + ((Math.round((y - gy) / (step * 0.62)) & 1) ? step / 2 : 0);
        const r = Math.hypot((jx - cx) / (RX * spread), (y - gy) / (RY * spread));
        if (r >= 0.96) continue;
        const f = y < gy - RY * 0.3 ? back : y < gy + RY * 0.3 ? mid : front;
        const ring = spread < 1 ? 0.45 + 0.55 * Math.exp(-(((r - 0.82) / 0.28) ** 2)) : 1 - 0.45 * r;
        const len = Hmax * hf * ring * rr(b.seed + 23, key, 0.65, 1.15);
        if (len < 4) continue;
        tongue(f, [jx, y + 1], -Math.PI / 2 + rr(b.seed + 24, key, -0.15, 0.15), len, (great ? 7 : 5.5) * (0.6 + 0.4 * hf), 0.95 - 0.3 * r, 0.16, t * TAU + (jx - ox) * 0.1, 0);
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
  erode(dome, 0.8, (x, y) => pfbm(x - ox, y - oy + i * 10, R * 0.25, 2, 0, 0, b.seed + 25));
  // Smoke climbing once the fire cools.
  if (p > 0.3) {
    const sk = (p - 0.3) / 0.7;
    const nS = great ? 9 : 6;
    for (let k = 0; k < nS; k++) {
      const x = cx + (k - (nS - 1) / 2) * (great ? 22 : 18) * (0.7 + sk * 0.4) + rr(b.seed + 26, k, -5, 5);
      const y = gy - Hmax * 0.9 - sk * 30 + Math.abs(k - (nS - 1) / 2) * 6 + rr(b.seed + 27, k, -5, 5);
      if (y - oy < 4) continue;
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
  layers.push(smoke.any() ? render(smoke, SMOKE, { th: [0, 0.12, 0.26, 0.42, 0.6], hi: great ? 5 : 6, rim: [1, 2], jitter: (x, y) => (pfbm(x - ox, y - oy - i * 4, 7, 2, 0, 0, b.seed + 28) - 0.5) * 0.4 }) : null);
  // Debris and embers flung out of the impact (the rocks fly behind the nearer flames).
  const deb = new Field(W, H);
  const em: { x: number; y: number; s: number }[] = [];
  if (i >= 1 && p < 0.9) {
    const tt = i / n;
    const nD = great ? 14 : 8;
    for (let k = 0; k < nD; k++) {
      const vx = rr(b.seed + 30, k, -1, 1) * RX * 1.4, vy = -rr(b.seed + 31, k, 110, 190) * (great ? 1.2 : 1);
      const x = cx + vx * tt, y = gy - 6 + vy * tt + 260 * tt * tt;
      if (y > gy + RY * 0.8 || y - oy < 2 || x - ox < 2 || x - ox > W0 - 3) continue;
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
  return stack(W, H, body, embers(W, H, em.filter((e) => e.x - ox > 1 && e.x - ox < W0 - 2 && e.y - oy > 1 && e.y - oy < H0 - 2), p < 0.9 ? body : null));
}

function fireball(great: boolean): WorldSprite {
  const r = great ? 2.25 : 1.5;
  const RX = Math.round(r * PX), RY = Math.round(r * DEPTH);
  // The original frames plus room for the smoke tail, the rising dome and the burst's edges.
  const [W0, H0, cx0, cy0, ox, oy, rx, by] = great ? [272, 224, 136, 124, 24, 36, 4, 4] : [176, 128, 88, 72, 8, 24, 8, 6];
  const b: Ball = { great, R: great ? 44 : 23, W: W0 + ox + rx, H: H0 + oy + by, cx: cx0 + ox, cy: cy0 + oy, RX, RY, seed: great ? 700 : 600, ox, oy, W0, H0 };
  const fly = frames(6, (t) => ballFly(b, t));
  const nB = great ? 10 : 8;
  const burst = frames(nB, (_, i) => ballBurst(b, i, nB));
  return vfxSprite(great ? 'fireball_great' : 'fireball', great ? 'Great Fireball, enhanced (radius 2.25 m)' : 'Great Fireball (radius 1.5 m)', [b.cx, b.cy], {
    fly: { frames: fly, fps: 12, loop: true },
    burst: { frames: burst, fps: 12, loop: false },
  });
}

// --- annihilation: a towering wave of fire filling a 60 degree cone -------------------------

export interface Wave {
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
export interface WaveState {
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
  phase: 'surge' | 'burn' | 'fade';
}

/** Half the cone's depth on screen at distance d px from the apex (the cone seen from the side). */
const halfDepth = (d: number) => 5 + 0.1 * d;

export function waveFrame(w: Wave, st: WaveState): Canvas {
  const { W, H, x0, gy, len, hMax, great, seed } = w;
  const t = st.t, ph = t * TAU;
  const bed = new Field(W, H), smoke = new Field(W, H), lipF = new Field(W, H);
  const rows = [new Field(W, H), new Field(W, H), new Field(W, H)];
  const rowSide = [-1, 0, 1], rowH = [1, 0.8, 0.56], rowHeat = [0.84, 0.93, 1];
  const crestX = x0 + st.crest * len;
  const step = great ? 16 : 15;
  const surging = st.crest < 1;
  // Where the fire has burnt out: a ragged line that moves away from the caster, not a straight cut.
  const deadAt = (x: number) => (st.dead <= 0 ? -1 : st.dead + 0.08 * (pnoise(x, 0, 18, 0, 0, seed + 50) - 0.5) * 2);
  // The wave's shape without the burn (the dragon is placed on this so it never jumps).
  const shapeAt = (x: number, row: number) => {
    const d = x - x0, u = d / len;
    if (x > crestX + 2 || d < 0) return 0;
    let h = hMax * lerp(0.26, 1, Math.pow(u, 0.75)) * rowH[row];
    // The rolling crest stands taller and leans forward; a second wave follows on the great one.
    h *= 1 + 0.32 * smooth(90, 10, crestX - x) * (surging ? 1 : 0.6);
    if (great) {
      const c2 = crestX - len * 0.24;
      h *= 1 + 0.38 * smooth(80, 0, Math.abs(x - c2)) * (surging ? 1 : 0.6);
    }
    // Small at the apex, growing out of the caster's hands (no slivers by the feet).
    return h * smooth(12, 64, d);
  };
  const heightAt = (x: number, row: number) => {
    const da = deadAt(x), u = (x - x0) / len;
    return shapeAt(x, row) * st.burn * (da < 0 ? 1 : smooth(da, da + 0.12, u));
  };
  const er = (x: number, y: number) => pfbm(x, y + t * 180, 9, 2, 0, 180, seed + 33);
  const bodyK = smooth(0.62, 0.85, st.burn);
  for (let row = 0; row < 3; row++) {
    const f = rows[row];
    // The wave's solid body: a wall of fire from the ground up to about 60% of the row height,
    // hottest at the base, its top edge rolling with noise and its front rounded. It shrinks
    // away as the fire dies, leaving loose tongues rather than flat slabs.
    if (bodyK > 0)
      f.region(x0 + 10, 0, Math.min(W - 1, crestX + 8), H - 1, (x, y) => {
        const d = x - x0;
        const yg = gy + rowSide[row] * halfDepth(d) + 2 - 3 * pnoise(x, row * 9, 5, 0, 0, seed + 45);
        if (y > yg) return 0;
        const hFull = heightAt(Math.min(x, crestX), row);
        if (hFull <= 0) return 0;
        const front = Math.sqrt(clamp((crestX + (surging ? 6 : 0) - x + 6 * (pnoise(y, row, 5, 0, 0, seed + 47) - 0.5)) / (surging ? 22 : 38), 0, 1));
        const hb = hFull * 0.6 * bodyK * (0.82 + 0.3 * pnoise(x - t * 90, row * 40, 22, 90, 0, seed + 40 + row)) * front;
        if (hb < 10) return 0;
        const u = (yg - y) / hb;
        if (u >= 1 || u < 0) return 0;
        return lerp(rowHeat[row] * 0.86, 0.4, Math.pow(u, 1.1));
      });
    // Tongues of flame standing on the body up to the full height; they thin out as it dies.
    for (let x = x0 + 4; x <= crestX + 2; x += step * (row === 1 ? 0.9 : 1)) {
      const jx = x + rr(seed + row, Math.round(x), -step * 0.3, step * 0.3) + (row === 1 ? step * 0.5 : 0);
      const d = jx - x0;
      if (d < 2 || jx > crestX + 2) continue;
      if (st.burn < 1 && rr(seed + 70 + row, Math.round(jx), 0, 1) > 0.3 + st.burn * 1.1) continue;
      // Dying flames scatter over the burning ground and vary more in height, so the three
      // depth rows never line up into neat bars.
      const scatter = smooth(0, 0.3, st.dead);
      const yg = gy + rowSide[row] * halfDepth(d) + rr(seed + 90 + row, Math.round(jx), -0.45, 0.45) * halfDepth(d) * scatter;
      const h = heightAt(jx, row) * rr(seed + 10 + row, Math.round(jx), 0.82, 1.12) * lerp(1, rr(seed + 91 + row, Math.round(jx), 0.4, 1.3), scatter) * (1 + 0.08 * Math.sin(ph + jx * 0.05));
      if (h < 5) continue;
      const lean = 0.42 * smooth(80, 0, crestX - jx) * (surging ? 1 : 0.35);
      const wdt = Math.min(great ? 17 : 15, 5 + h * 0.08);
      tongue(f, [jx, yg - h * 0.42 * (0.4 + 0.6 * bodyK)], -Math.PI / 2 + lean + rr(seed + 20, Math.round(jx), -0.08, 0.08), h * 0.6, wdt, rowHeat[row] * 0.85, 0.13, ph + jx * 0.07, lean * 0.4);
    }
  }
  // The crest breaks like a wave: a lip of fire rolls forward and curls down over a hollow,
  // lit along its back, dark inside the curl, with spray streaming off it.
  const lipOn = !(great && st.dragon > 0.6) && st.burn > 0.7;
  if (lipOn) {
    const ch = heightAt(crestX - 4, 0);
    if (ch > 30) {
      const yg = gy - halfDepth(crestX - x0);
      const top = yg - ch * 0.95;
      // The lip's spine: up out of the flames, over the crest and thrown forward and down.
      const sw = Math.sin(ph) * ch * 0.015;
      const lip = bez([crestX - ch * 0.38, top + ch * 0.52], [crestX - ch * 0.22, top], [crestX + ch * 0.1, top - ch * 0.1 + sw], [crestX + ch * 0.25, top + ch * 0.17 + sw], 30);
      const thick = (u: number) => ch * (u < 0.45 ? lerp(0.1, 0.14, u / 0.45) : lerp(0.14, 0.05, (u - 0.45) / 0.55));
      // Lit along its back, dark in the hollow under it, with flow lines following the curl.
      tubeShade(lipF, lip, thick, (u, sd) => {
        const base = sd > 0.4 ? 0.38 : sd > -0.3 ? 0.66 : 0.84;
        const line = fract(sd * 2.2 + 0.25 * Math.sin(u * 11 - ph) + 0.1) < 0.14 ? 0.12 : 0;
        return (base - line) * lerp(0.82, 1, smooth(0, 0.3, u)) - u * 0.08;
      });
      // The thrown edge breaks into fingers of flame that fall forward and curl under.
      for (let k = 0; k < 5; k++) {
        const q = lip[lip.length - 1 - k * 2];
        const a = (30 + k * 17) * (Math.PI / 180) + Math.sin(ph + k * 1.4) * 0.06;
        tongue(lipF, [q[0], q[1] + thick(1 - k * 0.07) * 0.3], a, ch * (0.21 - k * 0.026) * rr(seed + 62, k, 0.85, 1.1), ch * (0.042 - k * 0.004), 0.78 - k * 0.05, 0.06, ph + k * 1.7, 0.5);
      }
      // Flames streaming up and back off the top of the lip, in uneven clumps.
      [0.08, 0.2, 0.3, 0.47, 0.6, 0.74].forEach((uu, k) => {
        const i = Math.round((uu + rr(seed + 63, k, -0.03, 0.03)) * (lip.length - 1));
        const q = lip[i], n = lip[Math.min(lip.length - 1, i + 1)];
        const ang = Math.atan2(n[1] - q[1], n[0] - q[0]) - Math.PI / 2;
        const rad = thick(uu) * 0.65;
        tongue(lipF, [q[0] + Math.cos(ang) * rad, q[1] + Math.sin(ang) * rad], lerp(-2.45, -2.05, k / 5) + Math.sin(ph + k) * 0.08, ch * (0.2 - k * 0.018) * rr(seed + 61, k, 0.55, 1.25), ch * 0.034, 0.7, 0.2, ph + k * 1.3, -0.18);
      });
      // As the fire dies (or the dragon forms out of it) the lip breaks up into loose flames.
      erode(lipF, 0.5 + (st.phase === 'fade' ? (1 - st.burn) * 4 : 0), er);
    }
  }
  // Burning ground over the cone's footprint, with ragged edges; it breaks into glowing patches
  // as the fire dies and leaves only a few embers where it has burnt out.
  const edge = Math.min(crestX, W - 2);
  bed.region(x0, gy - halfDepth(len) - 9, edge, gy + halfDepth(len) + 9, (x, y) => {
    const d = x - x0, u = d / len;
    if (x > edge - 10 * pnoise(y, 0, 4, 0, 0, seed + 48) - 4) return 0;
    const hd = halfDepth(d) + 3 + 4 * (pnoise(x, y > gy ? 30 : 0, 9, 0, 0, seed + 49) - 0.5) * 2;
    if (d < 16 || Math.abs(y - gy) > hd) return 0;
    const n = pnoise(x, y, 6, 0, 0, seed + 31);
    const da = deadAt(x);
    if (st.dead > 0) {
      // Dying: the bed breaks into scattered embers, thinning out toward the caster and over time.
      const behind = da >= 0 ? smooth(da + 0.15, da - 0.1, u) : 0;
      const cut = 0.62 + st.dead * 0.22 + behind * 0.12;
      if (n < cut) return 0;
      return 0.3 + 0.4 * ((n - cut) / (1 - cut)) * (1 - behind * 0.5);
    }
    const v = (0.42 + 0.3 * pnoise(x, y, 8, 0, 0, seed + 32)) * Math.min(1, st.burn * 1.5);
    return v > 0.12 || n > 0.6 ? Math.max(v, 0.2) : 0;
  });
  rows.forEach((f) => erode(f, 0.55, er));
  // Smoke: billows rolling over the fire (plus a dark ceiling on the great one, growing in from
  // the caster's side); nothing is ever cut by the frame.
  if (st.smoke > 0) {
    const xEnd = Math.min(crestX, x0 + len) - 24;
    const sm = Math.min(1, 0.25 + st.smoke);
    const n = great ? 60 : 44;
    for (let k = 0; k < n; k++) {
      const u = rr(seed + 33, k, 0, 1);
      const x = x0 + 50 + u * (xEnd - x0 - 50);
      const uu = (x - x0) / len;
      const top = gy - halfDepth(x - x0) - hMax * lerp(0.26, 1, Math.pow(uu, 0.75)) * Math.max(0.55, st.burn);
      if (st.phase === 'fade' && rr(seed + 36, k, 0, 1) > st.smoke * 1.4) continue;
      const r = (great ? 22 : 16) * (0.6 + 0.6 * (st.phase === 'fade' ? 0.7 : st.smoke)) * rr(seed + 35, k, 0.6, 1.25) * lerp(0.55, 1, uu);
      const y = Math.max(r + 3, top - st.smoke * 20 + rr(seed + 34, k, -r * 0.9, r * 0.3) - Math.sin(ph + k) * 1.5 - (st.phase === 'fade' ? (0.7 - st.smoke) * 40 : 0));
      if (great && st.dragon > 0.01 && x > crestX - 200) continue;
      smoke.disc(x + Math.sin(ph + k * 1.7) * 2, y, r, (great ? 0.85 : 0.7) * (st.phase === 'fade' ? 1 : sm), 2.4);
    }
    if (great) {
      const xs = x0 + 100;
      const grow = smooth(0.05, 0.6, st.smoke);
      for (let k = 0; k < 30; k++) {
        const x = xs + ((k + 0.5) / 30) * (xEnd - xs);
        if (x > crestX - 40) continue;
        if (st.phase === 'fade' && rr(seed + 40, k, 0, 1) > st.smoke * 1.4) continue;
        const r = rr(seed + 39, k, 18, 28) * (st.phase === 'fade' ? 1 : 0.35 + 0.65 * grow) * smooth(xs - 20, xs + 140, x);
        if (r < 4) continue;
        smoke.disc(x + Math.sin(ph + k * 1.3) * 3, r + 4 + rr(seed + 38, k, 0, 12), r, 0.8 * (st.phase === 'fade' ? 1 : Math.min(1, st.smoke * 1.6)), 2.4);
      }
    }
  }
  // Fading smoke frays into wisps instead of shrinking to round beads.
  if (st.phase === 'fade') erode(smoke, (1 - st.smoke / 0.7) * 1.8, (x, y) => pfbm(x, y - t * 60, 7, 2, 0, 0, seed + 37));
  const layers: (Canvas | null)[] = [];
  layers.push(smoke.any() ? render(smoke, SMOKE, { th: [0, 0.12, 0.26, 0.42, 0.6, 0.78], hi: great ? 4 : 5, rim: [1, 2], jitter: (x, y) => (pfbm(x - t * 120, y, 6, 2, 120, 0, seed + 36) - 0.5) * 0.3 }) : null);
  layers.push(bed.any() ? render(bed, FIRE, { th: TH, hi: 5, rim: [1] }) : null);
  const streaks = (x: number, y: number) => (pnoise(x * 0.5, (y + t * 180) * 0.15, 2, 0, 27, seed + 46) - 0.5) * 0.26;
  layers.push(render(rows[0], FIRE, { th: TH, rim: [1], hi: 5, jitter: streaks }));
  if (lipF.any()) {
    // On the great wave the lip burns away into the dragon forming out of it.
    const lipC = render(lipF, FIRE, { th: TH, rim: [1], jitter: streaks });
    layers.push(great && st.dragon > 0 ? dissolve(lipC, 1 - st.dragon * 1.7, (x, y) => pnoise(x, y, 12, 0, 0, seed + 64), [FIRE[4], FIRE[6]], FIRE[0]).c : lipC);
  }
  const em: { x: number; y: number; s: number }[] = [];
  if (great && st.dragon > 0.01) {
    // The dragon rides the crest: placed on the wave's shape (not its burn), so it holds still
    // while the fire around it dies, and forms or burns away with the flames.
    const cx = Math.min(crestX, x0 + len);
    const chF = shapeAt(cx - 10, 0) || hMax;
    const yg = gy - halfDepth(cx - x0);
    const snoutAt: Pt = [Math.min(crestX + 46, W - 10), yg - chF * 0.95 + 4];
    const neckBase: Pt = [crestX - 120, yg - chF * 0.42];
    const dr = drawDragon(W, H, snoutAt, neckBase, 1.6, t, st.dragon, st.phase === 'fade', st.phase === 'burn' ? 3 * Math.sin(ph) : 0, seed + 80);
    layers.push(dr.c);
    // Flames wrapping the root of the neck so it rises out of the wave.
    const roots = new Field(W, H);
    const rootK = (st.phase === 'fade' ? smooth(0.7, 0.95, st.dragon) : smooth(0.1, 0.6, st.dragon)) * st.burn;
    if (rootK > 0.05)
      for (let k = 0; k < 7; k++) {
        const x = neckBase[0] - 26 + k * 9 + rr(seed + 83, k, -3, 3);
        const hgt = (34 + rr(seed + 84, k, 0, 22)) * rootK;
        tongue(roots, [x, neckBase[1] + 30 + rr(seed + 86, k, -8, 8)], -Math.PI / 2 + rr(seed + 85, k, -0.15, 0.15), hgt, 8 * Math.min(1, 0.4 + rootK), 0.9, 0.14, ph + k * 1.7, 0);
      }
    erode(roots, 0.45, er);
    layers.push(render(roots, FIRE, { th: TH, rim: [1], jitter: streaks }));
    dr.edge.forEach(([x, y], k) => {
      if (k % 2 === 0) em.push({ x: x + rr(seed + 81, Math.round(x + y), -6, 6), y: y - rr(seed + 82, Math.round(x * y), 4, 14), s: 1 });
    });
  }
  layers.push(render(rows[1], FIRE, { th: TH, rim: [1], jitter: streaks }));
  layers.push(render(rows[2], FIRE, { th: TH, rim: [1], jitter: streaks }));
  const body = stack(W, H, ...layers);
  // Embers: rising off the flames, and on the great one also raining down from the smoke; they
  // die with the fire so the last fade frame is empty.
  const nE = Math.round((great ? 46 : 26) * clamp(st.burn * 1.3, 0, 1));
  for (let k = 0; k < nE; k++) {
    const p = fract(k / Math.max(1, nE) * 3 + t);
    const x = x0 + rr(seed + 37, k, 0.1, 1) * (Math.min(crestX, x0 + len) - x0);
    const da = deadAt(x);
    if (da >= 0 && x - x0 < da * len) continue;
    const falling = great && k % 2 === 0;
    const y = falling ? 50 + p * (gy - 70) : gy - halfDepth(x - x0) - hMax * 0.5 * st.burn - p * 120;
    em.push({ x: x + Math.sin(p * 6 + k) * 3, y, s: p < 0.3 ? 2 : 1 });
  }
  return stack(W, H, body, embers(W, H, em.filter((e) => e.y > 2 && e.y < H - 2 && e.x < W - 2)));
}

/** The wave's frame layout (exported with `waveStates` and `waveFrame` for quick test renders). */
export function waveSpec(great: boolean): Wave {
  const meters = great ? 15 : 12;
  const len = Math.round(meters * PX);
  const hMax = great ? 250 : 190;
  const x0 = 12;
  // Room above for the breaking crest, the dragon's horns and the smoke ceiling, and on the
  // right for the crest rolling past the cone's end.
  const topPad = great ? 56 : 16;
  const gy = Math.round(halfDepth(len) + hMax * 1.32 + 10 + topPad);
  const H = Math.ceil((gy + halfDepth(len) + 10) / 8) * 8;
  const W = Math.ceil((x0 + len + 90) / 8) * 8;
  return { great, W, H, x0, gy, len, hMax, seed: great ? 900 : 800 };
}

/** The surge, burn and fade schedules (8, 6 and 6 frames). */
export function waveStates(): Record<'surge' | 'burn' | 'fade', WaveState[]> {
  const ease = (u: number) => 1 - Math.pow(1 - u, 1.6);
  const n = (k: number) => Array.from({ length: k }, (_, i) => i);
  return {
    surge: n(8).map((i) => ({ crest: ease((i + 1) / 8), burn: lerp(0.75, 1, i / 7), dead: 0, smoke: Math.max(0, (i - 3) / 8), t: i / 8, dragon: smooth(1.5, 6.2, i), phase: 'surge' as const })),
    burn: n(6).map((i) => ({ crest: 1, burn: 1, dead: 0, smoke: 0.6, t: i / 6, dragon: 1, phase: 'burn' as const })),
    fade: n(6).map((i) => ({ crest: 1, burn: [0.8, 0.58, 0.38, 0.2, 0.08, 0][i], dead: [0.1, 0.3, 0.5, 0.7, 0.88, 1][i], smoke: [0.7, 0.55, 0.4, 0.24, 0.1, 0][i], t: i / 6, dragon: [0.85, 0.62, 0.4, 0.2, 0.06, 0][i], phase: 'fade' as const })),
  };
}

function annihilation(great: boolean): WorldSprite {
  const w = waveSpec(great), st = waveStates();
  return vfxSprite(great ? 'annihilation_enh' : 'annihilation', great ? 'Great Fire Annihilation, enhanced (cone 15 m, 60 deg)' : 'Great Fire Annihilation (cone 12 m, 60 deg)', [w.x0, w.gy], {
    surge: { frames: st.surge.map((s) => waveFrame(w, s)), fps: 12, loop: false },
    burn: { frames: st.burn.map((s) => waveFrame(w, s)), fps: 12, loop: true },
    fade: { frames: st.fade.map((s) => waveFrame(w, s)), fps: 12, loop: false },
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
