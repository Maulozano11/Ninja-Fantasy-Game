// Fire jutsu VFX: licking flame tongues, embers and molten heat. Palette: dark maroon outline,
// dark red, red, orange, yellow-orange, yellow, cream-white core.

import { Canvas, WorldSprite } from './kit';
import { FIRE, ROCK, SMOKE, TH, embers, erode, flow, tongue } from './vfx-a-fire-kit';
import { fireSignature } from './vfx-a-fire-sig';

export { FIRE };
import {
  Field, Pt, TAU, along, arc, bez, qbez, clamp, crop, flySprite, frames, fract, lerp, outlineIn, palette, pfbm, pnoise, render, rnd, rr, seamStack, smooth, spark, stack, vfxSprite,
} from './vfx-a-lib';

// --- bolt: a fireball with a curved tail ----------------------------------------------------

function bolt(): WorldSprite {
  // 4 px of room on the left for the tail's tip (the anchor moves with it).
  const o = 4, W = 64 + o, H = 64, cx = 36 + o, cy = 32;
  const fr = frames(4, (t) => {
    const f = new Field(W, H);
    const fl = (k: number) => Math.sin((t + k * 0.29) * TAU);
    // A comet tail that dips and curls up at the end, with tongues licking off its top edge.
    const tail = bez([cx, cy], [cx - 14, cy + 9], [cx - 26, cy + 4 + fl(0)], [cx - 33, cy - 8 + fl(1) * 2], 24);
    f.path(tail, (u) => lerp(11, 1.8, Math.pow(u, 0.8)), (u) => lerp(0.95, 0.25, u));
    for (let k = 0; k < 3; k++) {
      const { p } = along(tail, 0.18 + k * 0.22);
      tongue(f, [p[0] + 1, p[1] - lerp(8, 3, k / 2)], Math.PI + 0.32 + k * 0.1, lerp(14, 9, k / 2) + fl(k + 2) * 1.5, lerp(4.2, 2.6, k / 2), 0.72, 0.16, t * TAU + k * 1.7, -0.14);
    }
    tongue(f, [cx - 6, cy + 8], Math.PI - 0.25, 10 + fl(5) * 1.5, 3.4, 0.6, 0.2, t * TAU + 2, 0.1);
    f.disc(cx, cy, 11.5, 1, 1.5);
    erode(f, 0.6, (x, y) => pfbm(x - o + t * 64, y, 6, 2, 64, 0, 3), (x) => smooth(cx - 4, cx - 14, x));
    const body = render(f, FIRE, { th: TH, rim: [1], jitter: flow(-t * 64 + o, 0.1) });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 8; k++) {
      const p = fract(k / 8 + t);
      em.push({ x: cx - 18 - p * 24 + rr(5, k, -3, 3), y: cy + rr(6, k, -20, 16) - p * 6, s: p < 0.45 ? 2 : 1 });
    }
    return stack(W, H, body, embers(W, H, em, body));
  });
  return flySprite('bolt', 'Fire bolt (fireball)', fr, 12, [32 + o, 32]);
}

// --- beast: a phoenix with spread wings -----------------------------------------------------

// The phoenix is drawn as separately outlined parts (feathers, wings, tail ribbons, body, head)
// stacked back to front, so every feather reads on its own: a 6-frame flap where the wings go
// up, sweep down through the horizontal, come down and fold back up, and the body bobs with it.

interface WingPose {
  /** Forearm and hand angles (degrees, screen space: -90 up, 180 back). */
  arm: number;
  hand: number;
  /** Primaries fan from p0 (outermost) to p1 (innermost); secondaries point along sec. */
  p0: number;
  p1: number;
  sec: number;
  /** 1 = fully spread, less = folded (upstroke). */
  fold: number;
  /** Body bob in px (negative = up). */
  bob: number;
}
const DEG = Math.PI / 180;
const FLAP: WingPose[] = [
  { arm: -100, hand: -110, p0: -108, p1: -178, sec: 176, fold: 1, bob: 1 },
  { arm: -140, hand: -152, p0: -146, p1: -206, sec: 162, fold: 1, bob: 0 },
  { arm: 166, hand: 154, p0: 152, p1: 104, sec: 112, fold: 1, bob: -1 },
  { arm: 128, hand: 114, p0: 110, p1: 162, sec: 168, fold: 0.9, bob: -2 },
  { arm: -158, hand: -170, p0: -164, p1: -200, sec: 176, fold: 0.74, bob: -1 },
  { arm: -118, hand: -130, p0: -126, p1: -186, sec: 178, fold: 0.9, bob: 0 },
];
const dirv = (a: number): Pt => [Math.cos(a * DEG), Math.sin(a * DEG)];
const PH_LOOK = { th: TH, rim: [1], outline: false };

/** One wing as parts (secondaries, primaries one by one, coverts), back to front, unoutlined. */
function phoenixWing(W: number, H: number, S: Pt, ps: WingPose, k: number, heat: number, hi: number, t: number): Canvas[] {
  const out: Canvas[] = [];
  const look = { ...PH_LOOK, hi };
  const fa = 13 * k * ps.fold, ha = 10 * k * ps.fold;
  const Wr: Pt = [S[0] + dirv(ps.arm)[0] * fa, S[1] + dirv(ps.arm)[1] * fa];
  const T: Pt = [Wr[0] + dirv(ps.hand)[0] * ha, Wr[1] + dirv(ps.hand)[1] * ha];
  const flick = (j: number) => Math.sin(t * TAU + j * 1.3);
  const curlTo = (a: number) => (-Math.sin(a * DEG) < 0 ? 1 : -1) * 0.1;
  // Secondaries along the forearm, back to front.
  for (let j = 4; j >= 0; j--) {
    const f = new Field(W, H);
    const u = 0.15 + j * 0.2;
    const root: Pt = [lerp(S[0], Wr[0], u), lerp(S[1], Wr[1], u)];
    const a = ps.sec + (j - 2) * 5;
    tongue(f, root, a * DEG, (16 + flick(j)) * k * lerp(0.85, 1.05, u), 4.6 * k, heat * 0.98, 0.05, t * TAU + j, curlTo(a));
    out.push(render(f, FIRE, look));
  }
  // Primaries fanned from the hand, innermost first so the outer ones lie on top.
  for (let j = 5; j >= 0; j--) {
    const f = new Field(W, H);
    const u = j / 5;
    const root: Pt = [lerp(Wr[0], T[0], 1 - u * 0.8), lerp(Wr[1], T[1], 1 - u * 0.8)];
    const a = lerp(ps.p0, ps.p1, u);
    const len = lerp(33, 19, u) * k * (0.75 + 0.25 * ps.fold) + flick(j + 3) * 1.2;
    tongue(f, root, a * DEG, len, lerp(5.6, 4.6, u) * k, heat * lerp(1.12, 1.02, u), 0.05, t * TAU + j * 0.8, curlTo(a));
    out.push(render(f, FIRE, look));
  }
  // Coverts: a row of short hot feathers over the roots, with a bright leading edge.
  const cv = new Field(W, H);
  for (let j = 0; j < 5; j++) {
    const u = j / 4;
    const root: Pt = u < 0.6 ? [lerp(S[0], Wr[0], u / 0.6), lerp(S[1], Wr[1], u / 0.6)] : [lerp(Wr[0], T[0], (u - 0.6) / 0.4), lerp(Wr[1], T[1], (u - 0.6) / 0.4)];
    const a = lerp(ps.sec, lerp(ps.p0, ps.p1, 0.5), u * 0.8);
    tongue(cv, root, a * DEG, lerp(11, 8, u) * k, lerp(5, 3.8, u) * k, heat * lerp(1.1, 1, u), 0.05, t * TAU + j, curlTo(a));
  }
  cv.path([S, Wr, T], (u) => lerp(3.6, 2, u) * k, (u) => heat * lerp(1, 0.88, u), 1);
  out.push(render(cv, FIRE, look));
  return out;
}

function beast(): WorldSprite {
  const W = 128, H = 104, sx = 80, sy = 56;
  const fr = frames(6, (t, i) => {
    const ps = FLAP[i];
    const by = ps.bob;
    const parts: (Canvas | null)[] = [];
    // Far wing: behind everything, a little ahead of the near one, cooler.
    const off = (a: number, d: number) => a + (a < 0 ? d : -d);
    const farPose: WingPose = { ...ps, arm: off(ps.arm, 12), hand: off(ps.hand, 14), p0: off(ps.p0, 14), p1: off(ps.p1, 12) };
    parts.push(...phoenixWing(W, H, [sx + 6, sy - 3 + by], farPose, 0.85, 0.88, 5, t + 0.1));
    // Tail: three flowing plumes, split and waving.
    const ph = t * TAU;
    const ribbons: { end: Pt; c1: Pt; c2: Pt; w: number; amp: number }[] = [
      { end: [4, 46], c1: [50, 56], c2: [26, 38], w: 6.5, amp: 3 },
      { end: [6, 86], c1: [50, 68], c2: [26, 86], w: 6.5, amp: 3 },
      { end: [12, 66], c1: [48, 63], c2: [30, 68], w: 5.5, amp: 2.5 },
    ];
    ribbons.forEach((r, j) => {
      const f = new Field(W, H);
      const base: Pt = [70, 62 + by];
      const pts = bez(base, [r.c1[0], r.c1[1] + by * 0.5], r.c2, r.end, 28).map(([x, y], q, arr) => {
        const u = q / (arr.length - 1);
        return [x, y + Math.sin(u * Math.PI * 2.2 - ph - j) * r.amp * u] as Pt;
      });
      // A plume: wide at the rump, thin in the middle, swelling into a flame-eye near the end.
      const prof = (u: number) => (u < 0.6 ? lerp(r.w, r.w * 0.35, u / 0.6) : u < 0.85 ? lerp(r.w * 0.35, r.w * 0.85, Math.sin(((u - 0.6) / 0.25) * Math.PI * 0.5)) : r.w * 0.85 * (1 - (u - 0.85) / 0.15) + 0.4);
      f.path(pts, prof, (u) => (u < 0.6 ? lerp(0.95, 0.5, u / 0.6) : u < 0.85 ? lerp(0.5, 0.8, (u - 0.6) / 0.25) : lerp(0.8, 0.4, (u - 0.85) / 0.15)));
      for (let q = 0; q < 2; q++) {
        const at = pts[Math.round((0.25 + q * 0.3) * (pts.length - 1))];
        tongue(f, [at[0], at[1] - 1], (-150 - q * 10) * DEG, 6 + Math.sin(ph + j + q) * 1.5, 1.9, 0.55, 0.15, ph + j + q, 0.1);
      }
      erode(f, 0.3, (x, y) => pfbm(x + t * 128, y, 6, 2, 128, 0, 11 + j), (x) => smooth(60, 20, x));
      parts.push(render(f, FIRE, { ...PH_LOOK, jitter: flow(-t * 128, 0.08, 128) }));
    });
    // Body: a sleek torso, white-hot at the core, with a puffed breast.
    const bf = new Field(W, H);
    bf.ell(sx + 3, sy + 1 + by, 17, 7.5, -0.3, 1, 1.25);
    bf.ell(sx + 11, sy + by, 6.5, 6.5, 0, 0.92, 1.1);
    bf.ell(sx - 11, sy + 6 + by, 7, 4.2, 0.15, 0.8, 1);
    bf.path(bez([sx + 10, sy - 2 + by], [sx + 14, sy - 6 + by], [sx + 16, sy - 9 + by], [sx + 19, sy - 11 + by], 10), (u) => lerp(6.5, 5.5, u), (u) => lerp(0.95, 0.9, u), 1.2);
    parts.push(render(bf, FIRE, PH_LOOK));
    // Crest: four flame feathers swept back from the crown.
    const hx = sx + 21, hy = sy - 14 + by;
    [[-5, -4, -158, 18], [-7, -2.5, -147, 15], [-8, -0.5, -168, 13], [-3, -5, -132, 10]].forEach(([x, y, a, l], j) => {
      const f = new Field(W, H);
      tongue(f, [hx + x, hy + y], a * DEG, l + Math.sin(ph + j * 1.7) * 1.5, 2.8, 0.82, 0.12, ph + j, 0.12);
      parts.push(render(f, FIRE, PH_LOOK));
    });
    const hd = new Field(W, H);
    hd.ell(hx, hy, 7.5, 6.6, -0.1, 1, 1.3);
    parts.push(render(hd, FIRE, PH_LOOK));
    // Hooked beak.
    const bk = new Field(W, H);
    bk.poly([[hx + 5, hy - 3.5], [hx + 11, hy - 3], [hx + 15.5, hy - 0.5], [hx + 16, hy + 3.5], [hx + 14, hy + 2.5], [hx + 11.5, hy + 1], [hx + 6, hy + 2]], (x) => 0.86 - (x - hx - 5) * 0.02);
    bk.poly([[hx + 6, hy + 2.5], [hx + 11.5, hy + 2.5], [hx + 7, hy + 5]], 0.62);
    parts.push(render(bk, FIRE, { ...PH_LOOK, hi: 5 }));
    // Near wing in front.
    parts.push(...phoenixWing(W, H, [sx, sy - 4 + by], ps, 1, 1, 6, t));
    const all = seamStack(W, H, parts, FIRE[2], FIRE[0]);
    // Eye: dark with a white glint.
    all.set(hx + 1, hy - 2, FIRE[0]);
    all.set(hx + 2, hy - 2, FIRE[0]);
    all.set(hx + 1, hy - 1, FIRE[0]);
    all.set(hx + 2, hy - 1, FIRE[0]);
    all.set(hx + 1, hy - 2, FIRE[6]);
    all.set(hx + 3, hy - 1, FIRE[1]);
    // Sparse ember trails behind.
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 10; k++) {
      const p = fract(k / 10 + t);
      em.push({ x: 60 - p * 56 + rr(21, k, -4, 4), y: rr(22, k, 22, 94) + Math.sin(p * 4 + k) * 3, s: p < 0.35 ? 2 : 1 });
    }
    return stack(W, H, all, embers(W, H, em, all));
  });
  return flySprite('beast', 'Fire beast (phoenix)', fr);
}

// --- stream: a tileable fire jet + its flaring head -----------------------------------------

const JET_Y = 32;
/** The jet's half-thickness and centerline at x (periodic over 64 px), scrolled by s. */
const jetR = (x: number, s: number): number => 9 + 4.5 * pnoise(x - s, 3, 16, 64, 0, 41);
const jetC = (x: number, s: number): number => JET_Y + (pnoise(x - s, 9, 32, 64, 0, 43) - 0.5) * 5;
function jetField(f: Field, s: number, x0: number, x1: number, ox: number, tongues = true): void {
  f.region(x0, 0, x1, f.h - 1, (x, y) => {
    const xx = x - ox;
    const d = Math.abs(y - jetC(xx, s)) / jetR(xx, s);
    const core = 0.84 + 0.22 * pnoise(xx - s, 1, 8, 64, 0, 45);
    return d < 1 ? Math.min(1, (1 - d) * core + 0.04) : 0;
  });
  if (!tongues) return;
  // Tongues licking back off the edges (longer on top: fire rises).
  for (let k = 0; k < 3; k++)
    for (const rep of [-64, 0, 64]) {
      const bx = fract((k * 21.3 + rr(44, k, 0, 6) + s) / 64) * 64 + rep;
      if (bx + ox < x0 - 30 || bx + ox > x1 + 30) continue;
      const top = jetC(bx, s) - jetR(bx, s) + 3;
      tongue(f, [bx + ox, top], Math.PI + 0.85 + rr(45, k, -0.12, 0.12), 14 + rr(46, k, 0, 5), 4.4, 0.7, 0.14, k * 1.3 + (s / 64) * TAU, -0.12);
      if (k < 2) {
        const b2 = bx + 10;
        const bot = jetC(b2, s) + jetR(b2, s) - 3;
        tongue(f, [b2 + ox, bot], Math.PI - 0.7 + rr(47, k, -0.1, 0.1), 12 + rr(48, k, 0, 3), 4, 0.64, 0.14, k * 1.1 + (s / 64) * TAU, 0.1);
      }
    }
}
function stream(): WorldSprite[] {
  const W = 64, H = 64, PAD = 32;
  const tile = frames(4, (t) => {
    const s = t * 64;
    const f = new Field(W + PAD * 2, H);
    jetField(f, s, 0, W + PAD * 2 - 1, PAD);
    erode(f, 0.5, (x, y) => pfbm(x - PAD - s, y, 6, 2, 64, 0, 49));
    const c = render(f, FIRE, { th: TH, rim: [1], jitter: (x, y) => flow(s, 0.1)(x - PAD, y) });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 4; k++)
      for (const rep of [-64, 0, 64]) {
        const x = fract((k * 16 + 5 + s) / 64) * 64 + rep + PAD;
        em.push({ x, y: JET_Y + (k % 2 ? -1 : 1) * rr(51, k, 17, 22), s: k % 2 ? 1 : 2 });
      }
    return crop(stack(W + PAD * 2, H, c, embers(W + PAD * 2, H, em, c)), PAD, 0, W, H);
  });
  const head = frames(4, (t) => {
    const s = t * 64;
    const f = new Field(W + PAD, H);
    // The jet runs in from the left edge and swells into a rolling fireball front.
    jetField(f, s, 0, PAD + 30, PAD, false);
    const fl = (k: number) => Math.sin(t * TAU + k * 1.7);
    const hx = PAD + 38;
    f.disc(hx + 2, JET_Y, 16, 1, 1.3);
    f.disc(hx + 9, JET_Y - 8, 9 + fl(0) * 0.8, 0.72, 1);
    f.disc(hx + 9, JET_Y + 8, 9 + fl(1) * 0.8, 0.7, 1);
    f.disc(hx + 14, JET_Y, 8, 0.8, 1);
    // Flames rolling back off the top and bottom of the front.
    tongue(f, [hx - 2, JET_Y - 12], Math.PI + 0.55, 17 + fl(2) * 2, 5.5, 0.72, 0.14, t * TAU, -0.15);
    tongue(f, [hx + 6, JET_Y - 14], Math.PI + 0.95, 12 + fl(3) * 2, 4.2, 0.66, 0.16, t * TAU + 1, -0.12);
    tongue(f, [hx - 2, JET_Y + 12], Math.PI - 0.5, 14 + fl(4) * 2, 5, 0.68, 0.14, t * TAU + 2, 0.12);
    tongue(f, [hx + 6, JET_Y + 14], Math.PI - 0.9, 9 + fl(5) * 1.5, 3.8, 0.6, 0.16, t * TAU + 3, 0.1);
    tongue(f, [hx + 14, JET_Y - 8], -0.55, 7 + fl(6) * 1.5, 3.2, 0.62, 0.2, t * TAU + 4, 0);
    tongue(f, [hx + 14, JET_Y + 8], 0.5, 6 + fl(7) * 1.5, 3, 0.6, 0.2, t * TAU + 5, 0);
    erode(f, 0.5, (x, y) => pfbm(x - PAD - s, y, 6, 2, 64, 0, 49), (x) => (x > hx ? 1 : 0.5));
    const c = render(f, FIRE, { th: TH, rim: [1], jitter: (x, y) => flow(s, 0.1)(x - PAD, y) * (x < hx ? 1 : 0.3) });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 6; k++) {
      const p = fract(k / 6 + t);
      const a = rr(53, k, -1.1, 1.1);
      em.push({ x: hx + 14 + p * 10 * Math.cos(a) + 2, y: JET_Y + Math.sin(a) * (18 + p * 6), s: p < 0.5 ? 2 : 1 });
    }
    return crop(stack(W + PAD, H, c, embers(W + PAD, H, em, c)), PAD, 0, W, H);
  });
  return [flySprite('stream', 'Fire stream (fire jet, tileable 64 px)', tile), flySprite('stream_head', 'Fire stream head', head)];
}

// --- breath: a cone of flame jets rolling into billows --------------------------------------

function breath(): WorldSprite {
  // 2 px of room left of the mouth so the jets' round starts are not cut (the anchor follows).
  const o = 2, W = 96 + o, H = 64, oy = 32;
  const fr = frames(4, (t) => {
    const f = new Field(W, H);
    const fl = (k: number) => Math.sin(t * TAU + k * 1.9);
    // Five widening jets fanned out from the mouth.
    const lanes = [-0.34, -0.17, 0, 0.17, 0.34];
    lanes.forEach((a, j) => {
      const L = (a === 0 ? 70 : Math.abs(a) < 0.3 ? 63 : 50) + fl(j) * 3;
      const bend = a * 0.25;
      const pts = qbez([3 + o, oy], [o + L * 0.5 * Math.cos(a - bend), oy + L * 0.5 * Math.sin(a - bend)], [o + L * Math.cos(a), oy + L * Math.sin(a)], 18);
      f.path(pts, (u) => lerp(2.5, Math.abs(a) > 0.3 ? 8 : 10, Math.pow(u, 0.8)), (u) => lerp(1, Math.abs(a) > 0.3 ? 0.5 : 0.62, u), 1.15);
    });
    // Billows rolling out along the jets.
    const N = 4;
    lanes.forEach((a, j) => {
      for (let k = 0; k < N; k++) {
        const p = fract((k + rnd(61, j) * 0.7) / N + t);
        const x = 18 + p * 54 * (Math.abs(a) > 0.3 ? 0.8 : 1);
        const y = oy + Math.tan(a) * x;
        f.disc(x + o, y, 4 + p * 7, lerp(0.85, 0.5, p), 1.3);
      }
    });
    // Licks off the far end.
    for (let k = 0; k < 5; k++) {
      const a = lanes[k];
      const L = (a === 0 ? 70 : Math.abs(a) < 0.3 ? 63 : 50) + fl(k) * 3;
      tongue(f, [L * Math.cos(a) + 2 + o, oy + L * Math.sin(a)], a * 1.6, 9 + fl(k + 3) * 3, 4.5, 0.5, 0.2, t * TAU + k, 0);
    }
    erode(f, 0.6, (x, y) => pfbm(x - o - t * 96, y, 7, 2, 96, 0, 63), (x) => smooth(24 + o, 60 + o, x));
    const c = render(f, FIRE, { th: TH, rim: [1], jitter: (x, y) => flow(t * 96 + o, 0.1, 96)(x, y) * smooth(10 + o, 30 + o, x) });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 10; k++) {
      const p = fract(k / 10 + t);
      const a = rr(65, k, -0.55, 0.55);
      em.push({ x: 26 + p * 64 + o, y: oy + Math.tan(a) * (26 + p * 64) * 0.8, s: k % 3 === 0 ? 2 : 1 });
    }
    return stack(W, H, c, embers(W, H, em.filter((e) => e.x < W - 3 && e.y > 2 && e.y < H - 3), c));
  });
  return flySprite('breath', 'Fire breath (flame cone, origin left middle)', fr, 12, [48 + o, 32]);
}

// --- sphere: a molten core with a corona and a swirl ----------------------------------------

function sphere(): WorldSprite {
  const W = 64, H = 64, cx = 33, cy = 32, R = 17;
  // A comet-like swirl of flame orbiting the core, split into the half behind and the half in front.
  const ring = (t: number, front: boolean): Canvas => {
    const f = new Field(W, H);
    const a0 = t * TAU, span = Math.PI * 1.25, n = 36;
    let run: Pt[] = [], runU: number[] = [];
    const flush = () => {
      if (run.length > 1) {
        const us = runU.slice();
        f.path(run, (u) => {
          const g = lerp(us[0], us[us.length - 1], u);
          return 0.8 + 2.6 * g;
        }, (u) => lerp(0.4, 0.92, lerp(us[0], us[us.length - 1], u)));
      }
      run = [];
      runU = [];
    };
    for (let k = 0; k <= n; k++) {
      const a = a0 + (span * k) / n;
      const p = arc(cx, cy, 28, 9, a, a, 1, -0.38)[0];
      const isFront = Math.sin(a) >= 0;
      if (isFront === front) {
        run.push(p);
        runU.push(k / n);
      } else if (run.length) {
        run.push(p);
        runU.push(k / n);
        flush();
      }
    }
    flush();
    return render(f, FIRE, { th: TH, rim: [1] });
  };
  const fr = frames(4, (t) => {
    const f = new Field(W, H);
    // Corona: tongues all around, swept back (longer behind).
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * TAU + 0.2;
      const back = Math.max(0, -Math.cos(a));
      const base: Pt = [cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3)];
      const dir = Math.atan2(Math.sin(a), Math.cos(a) - 0.9 * back - 0.3);
      tongue(f, base, dir, 6 + back * 8 + Math.sin(t * TAU + k * 2.1) * 1.8, 4.6, 0.62, 0.16, t * TAU + k, 0);
    }
    f.disc(cx, cy, R, 1, 1.35);
    erode(f, 0.5, (x, y) => pfbm(x + t * 64, y, 5, 2, 64, 0, 71), (x, y) => (Math.hypot(x - cx, y - cy) > R - 1 ? 1 : 0));
    // Molten swirl: band edges of the core follow a turning spiral.
    const c = render(f, FIRE, {
      th: TH, rim: [1],
      jitter: (x, y) => {
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
        if (r > R) return 0;
        return 0.15 * Math.sin(Math.atan2(dy, dx) * 2 + r * 0.42 - t * TAU) * smooth(2, 7, r);
      },
    });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 7; k++) {
      const p = fract(k / 7 + t);
      em.push({ x: cx - 24 - p * 7, y: cy + rr(73, k, -24, 24), s: p < 0.5 ? 2 : 1 });
    }
    const body = stack(W, H, ring(t, false), c, ring(t, true));
    return stack(W, H, body, embers(W, H, em, body));
  });
  return flySprite('sphere', 'Fire sphere (molten core)', fr);
}

// --- slash: a crescent of flame -------------------------------------------------------------

function slash(): WorldSprite {
  const W = 64, H = 64;
  const C1: Pt = [19, 32], R1 = 29, C2: Pt = [8, 32], R2 = 27.5;
  const fr = frames(4, (t) => {
    const f = new Field(W, H);
    f.fill((x, y) => {
      const d1 = Math.hypot(x - C1[0], y - C1[1]), d2 = Math.hypot(x - C2[0], y - C2[1]);
      if (d1 > R1 || d2 < R2 || x < 15) return 0;
      const inner = d2 - R2, outer = R1 - d1;
      const u = inner / (inner + outer);
      const tip = smooth(29, 14, Math.abs(y - 32));
      return (0.32 + 0.68 * Math.pow(u, 0.8)) * lerp(0.5, 1, tip);
    });
    // Flames licking back off the inner edge, sweeping toward the tips.
    for (let k = 0; k < 5; k++) {
      const a = -0.7 + (k * 1.4) / 4 + rr(84, k, -0.06, 0.06);
      const p: Pt = [C2[0] + Math.cos(a) * (R2 + 2), C2[1] + Math.sin(a) * (R2 + 2)];
      const len = 10 + (1 - Math.abs(a)) * 7 + rr(85, k, -2, 2) + Math.sin(t * TAU + k * 1.7) * 2.5;
      tongue(f, p, Math.PI + a * 0.8, len, 4.6, 0.6, 0.16, t * TAU + k * 1.3, a * 0.25);
    }
    erode(f, 0.5, (x, y) => pfbm(x + t * 64, y, 5, 2, 64, 0, 81), (x) => smooth(36, 24, x));
    const c = render(f, FIRE, { th: TH, rim: [1] });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 7; k++) {
      const p = fract(k / 7 + t);
      em.push({ x: 22 - p * 18, y: 32 + rr(83, k, -24, 24), s: p < 0.4 ? 2 : 1 });
    }
    return stack(W, H, c, embers(W, H, em, c));
  });
  return flySprite('slash', 'Fire slash (flame crescent)', fr);
}

// --- multi: three fireballs in a staggered fan ----------------------------------------------

function multi(): WorldSprite {
  const W = 64, H = 64;
  // Fanned out from a point behind the frame, at staggered distances.
  const balls = [
    { a: -0.4, d: 46, r: 5.2 },
    { a: 0.02, d: 52, r: 6 },
    { a: 0.42, d: 40, r: 5 },
  ].map((b) => ({ ...b, x: 2 + Math.cos(b.a) * b.d, y: 32 + Math.sin(b.a) * b.d }));
  const fr = frames(4, (t) => {
    const f = new Field(W, H);
    balls.forEach((b, k) => {
      const back = Math.PI + b.a;
      tongue(f, [b.x, b.y], back - 0.06, b.r * 3.4 + Math.sin(t * TAU + k * 1.6) * 1.5, b.r * 0.95, 0.85, 0.16, t * TAU + k * 2, 0.08);
      tongue(f, [b.x - 1, b.y - b.r * 0.55], back + 0.32, b.r * 2 + Math.cos(t * TAU + k) * 1.2, b.r * 0.55, 0.62, 0.2, t * TAU + k, -0.1);
      f.disc(b.x, b.y, b.r + 0.6, 1, 1.5);
    });
    erode(f, 0.5, (x, y) => pfbm(x + t * 64, y, 4, 2, 64, 0, 91), (x, y) => (balls.some((b) => Math.hypot(x - b.x, y - b.y) < b.r + 1) ? 0 : 1));
    const c = render(f, FIRE, { th: TH, rim: [1] });
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 6; k++) {
      const p = fract(k / 6 + t);
      const b = balls[k % 3];
      em.push({ x: b.x - b.r * 3 - p * 12, y: b.y + rr(93, k, -6, 6), s: p < 0.3 ? 2 : 1 });
    }
    return stack(W, H, c, embers(W, H, em, c));
  });
  return flySprite('multi', 'Fire multi (phoenix-flower fireballs)', fr);
}

// --- hit: a burst of flame petals -----------------------------------------------------------

function hit(): WorldSprite {
  const W = 64, H = 64, cx = 32, cy = 32;
  const fr = frames(6, (_, i) => {
    const f = new Field(W, H);
    const sm = new Field(W, H);
    const em: { x: number; y: number; s: number }[] = [];
    const N = 9;
    const tongues = (rIn: number, len: number, w: number, heat: number, detach = 0) => {
      for (let k = 0; k < N; k++) {
        const a = (k / N) * TAU + 0.3 + rr(101, k, -0.15, 0.15);
        const l = len * rr(102, k, 0.75, 1.15);
        tongue(f, [cx + Math.cos(a) * (rIn + detach), cy + Math.sin(a) * (rIn + detach) - detach * 0.3], a - 0.25, l, w, heat, 0.15, k, 0.1);
      }
    };
    if (i === 0) {
      f.disc(cx, cy, 8, 1, 2);
      for (let k = 0; k < 4; k++) f.seg(cx, cy, cx + Math.cos(k * TAU / 4 + 0.78) * 14, cy + Math.sin(k * TAU / 4 + 0.78) * 14, 2.5, 0.5, 1, 0.6);
    } else if (i === 1) {
      f.disc(cx, cy, 11, 1, 1.8);
      tongues(7, 12, 4, 0.85);
    } else if (i === 2) {
      f.disc(cx, cy, 13, 0.95, 1.5);
      tongues(9, 17, 5, 0.85);
    } else if (i === 3) {
      f.disc(cx, cy, 11, 0.62, 1.2);
      tongues(10, 15, 4.5, 0.66, 3);
      sm.disc(cx - 6, cy - 12, 8, 0.6);
      sm.disc(cx + 8, cy - 10, 7, 0.5);
    } else if (i === 4) {
      f.disc(cx, cy, 6, 0.45, 1);
      tongues(14, 10, 3.5, 0.45, 5);
      sm.disc(cx - 7, cy - 15, 10, 0.6);
      sm.disc(cx + 9, cy - 13, 9, 0.55);
      sm.disc(cx + 1, cy - 6, 8, 0.45);
    } else {
      sm.disc(cx - 8, cy - 18, 9, 0.45);
      sm.disc(cx + 10, cy - 16, 8, 0.4);
      sm.disc(cx + 1, cy - 10, 6, 0.35);
    }
    if (i >= 2) {
      const p = (i - 1) / 5;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU + rr(105, k, 0, 0.6);
        const r = 14 + p * 22 * rr(106, k, 0.7, 1.2);
        em.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.9 + p * p * 6, s: i < 4 && k % 2 ? 2 : 1 });
      }
    }
    if (i >= 3) erode(f, 1.1, (x, y) => pfbm(x, y + i * 8, 5, 2, 0, 0, 107));
    const smoke = sm.any() ? render(sm, SMOKE, { th: [0, 0.15, 0.3, 0.45, 0.6, 0.8], hi: 4, jitter: (x, y) => (pfbm(x, y - i * 3, 4, 2, 0, 0, 109) - 0.5) * 0.3 }) : null;
    return stack(W, H, smoke, render(f, FIRE, { th: TH, rim: [1] }), embers(W, H, em));
  });
  return vfxSprite('hit', 'Fire hit (flame burst)', [32, 32], { hit: { frames: fr, fps: 12, loop: false } });
}

// --- blast: a fire explosion 3 m across -----------------------------------------------------

/** Flames standing on the ground ellipse (scale k of the full ring), split into back and front halves. */
function flameRing(back: Field, front: Field, cx: number, gy: number, RX: number, RY: number, k: number, heat: number, hgt: number, seed: number, t: number): void {
  // A continuous burning band on the ground...
  for (const f of [back, front])
    f.region(cx - RX * k - 6, gy - RY * k - 6, cx + RX * k + 6, gy + RY * k + 6, (x, y) => {
      if ((f === back) !== y < gy) return 0;
      const r = Math.hypot((x - cx) / (RX * k), (y - gy) / (RY * k));
      const d = Math.abs(r - 1) * RY * k;
      return d < 3.5 ? heat * 0.82 * (1 - d / 3.5) : 0;
    });
  // ...with tongues of flame of uneven height standing on it.
  const n = 40;
  for (let j = 0; j < n; j++) {
    const a = (j / n) * TAU + rr(seed, j, -0.05, 0.05);
    const x = cx + Math.cos(a) * RX * k, y = gy + Math.sin(a) * RY * k;
    const f = Math.sin(a) < 0 ? back : front;
    const h = hgt * rr(seed + 1, j, 0.45, 1.3) * (Math.sin(a) < 0 ? 0.85 : 1);
    tongue(f, [x, y + 1], -Math.PI / 2 + Math.cos(a) * 0.3, h, 4.8, heat, 0.18, t * TAU + j * 1.3, 0);
  }
}

function blast(): WorldSprite {
  // Room on every side so the ring, the cap and the smoke are never cut (the anchor follows).
  const ox = 10, oy = 12, W = 176 + ox * 2, H = 128 + oy + 8, cx = 88 + ox, gy = 72 + oy, RX = 82, RY = 54;
  const fr = frames(8, (_, i) => {
    const ringK = [0.25, 0.5, 0.74, 0.92, 1, 1, 1, 1][i];
    const ringHeat = [0.95, 0.9, 0.86, 0.8, 0.68, 0.52, 0.38, 0][i];
    const ringH = [8, 14, 18, 20, 17, 13, 9, 0][i];
    const back = new Field(W, H), front = new Field(W, H), col = new Field(W, H), sm = new Field(W, H), scorch = new Field(W, H);
    if (i >= 3) scorch.ell(cx, gy, RX * 0.94, RY * 0.94, 0, 1, 6);
    if (ringHeat > 0) flameRing(back, front, cx, gy, RX, RY, ringK, ringHeat, ringH, 121 + i * 7, i / 8);
    if (i >= 5) for (const f of [back, front]) erode(f, 1.6 + (i - 5) * 0.8, (x, y) => pnoise(x - ox, y - oy, 7, 0, 0, 129 + i), () => 1);
    // The column: a fireball dome, then a stem with a mushroom cap of billows.
    const heat = [1, 1, 0.97, 0.92, 0.8, 0.62, 0.45, 0][i];
    if (i === 0) {
      col.ell(cx, gy - 6, 24, 20, 0, 1, 1.5);
      col.ell(cx, gy, 30, 10, 0, 0.95, 1.5);
    } else if (i === 1) {
      col.ell(cx, gy - 18, 34, 32, 0, 1, 1.35);
      col.ell(cx, gy - 2, 40, 13, 0, 0.9, 1.3);
    } else if (i <= 6) {
      const top = [0, 0, 22, 14, 14, 16, 20][i] + oy;
      const capR = [0, 0, 26, 32, 33, 30, 24][i];
      const stemR = [0, 0, 16, 13, 11, 9, 6][i];
      col.path([[cx, gy + 2], [cx - 2, (gy + top) / 2 + 6], [cx + 1, top + 10]], (u) => lerp(stemR + 6, stemR, u), (u) => heat * lerp(0.92, 0.7, u), 1.6);
      col.ell(cx, gy - 2, stemR + 14, 9, 0, heat * 0.85, 1.2);
      const bil: [number, number, number][] = [[0, 0.05, 0.95], [-0.6, 0.3, 0.66], [0.6, 0.28, 0.66], [-0.3, -0.32, 0.62], [0.32, -0.3, 0.62], [-0.98, 0.55, 0.42], [1, 0.55, 0.42], [-0.6, 0.78, 0.4], [0.62, 0.8, 0.38]];
      for (const [ox, oy, s] of bil) col.disc(cx + ox * capR, top + capR * 0.55 + oy * capR * 0.7, capR * s, heat * (s > 0.9 ? 1 : 0.74), s > 0.9 ? 1.3 : 1);
      // Smoke takes over the cap from the top as the fire cools.
      if (i >= 4) {
        const sk = (i - 4) / 2;
        for (let k = 0; k < 5; k++) {
          const ox = (k - 2) * capR * 0.55;
          sm.disc(cx + ox + rr(140, k + i * 5, -3, 3), top + 4 - sk * 6 + Math.abs(k - 2) * 6 + rr(141, k + i * 5, -3, 3), capR * (0.55 + sk * 0.25) * rr(142, k, 0.85, 1.15), 0.8, 2.2);
        }
      }
      erode(col, 0.8, (x, y) => pfbm(x - ox, y - oy + i * 12, 7, 2, 0, 0, 123), (x, y) => smooth(0, 1, 1 - col.at(x, y)));
    } else {
      for (let k = 0; k < 6; k++) sm.disc(cx + (k - 2.5) * 19 + rr(137, k, -4, 4), oy + 16 + Math.abs(k - 2.5) * 4 + rr(138, k, -5, 5), rr(139, k, 10, 16), 0.55, 2.2);
    }
    if (i >= 5 && i < 7) for (let k = 0; k < 3; k++) sm.disc(cx + (k - 1) * 18, gy - 16 - (i - 5) * 6, 11, 0.5, 2.2);
    // Debris rocks on ballistic arcs (behind the fire column) and embers.
    const deb = new Field(W, H);
    const em: { x: number; y: number; s: number }[] = [];
    if (i >= 1 && i <= 6) {
      const tt = (i - 0.4) / 6;
      for (let k = 0; k < 10; k++) {
        const vx = rr(131, k, -1, 1) * 85, vy = -rr(132, k, 95, 150);
        const x = cx + vx * tt, y = gy - 6 + vy * tt + 200 * tt * tt;
        if (y > gy + RY * 0.8) continue;
        deb.disc(x, y, k % 3 === 0 ? 3.4 : 2.5, 0.8, 1);
      }
      for (let k = 0; k < 16; k++) {
        const a = rr(133, k, Math.PI * 1.08, Math.PI * 1.92), sp = rr(134, k, 50, 110);
        const x = cx + Math.cos(a) * sp * tt * 1.2, y = gy - 14 + Math.sin(a) * sp * tt + 70 * tt * tt;
        em.push({ x, y, s: k % 4 === 0 && i < 5 ? 2 : 1 });
      }
    }
    if (i === 7) for (let k = 0; k < 10; k++) em.push({ x: cx + rr(135, k, -70, 70), y: gy + rr(136, k, -36, 36), s: 1 });
    const rocks = deb.any() ? render(deb, ROCK, { th: [0, 0.3, 0.55, 0.75], hi: 4 }) : null;
    const smokeTh = [0, 0.08, 0.16, 0.3, 0.5, 0.7];
    const layers: (Canvas | null)[] = [];
    layers.push(scorch.any() ? render(scorch, SMOKE, { th: [0, 0.35, 0.7], lo: 1, hi: 2, outline: false, alpha: [0, 70, 95] }) : null);
    layers.push(back.any() ? render(back, FIRE, { th: TH, rim: [1] }) : null);
    layers.push(rocks);
    layers.push(col.any() ? render(col, FIRE, { th: TH, rim: [1] }) : null);
    layers.push(sm.any() ? render(sm, SMOKE, { th: smokeTh, hi: 6, rim: [1, 2], jitter: (x, y) => (pfbm(x - ox, y - oy - i * 4, 6, 2, 0, 0, 127) - 0.5) * 0.4, alpha: i === 7 ? [150, 140, 150, 160, 170, 180, 190] : undefined }) : null);
    layers.push(front.any() ? render(front, FIRE, { th: TH, rim: [1] }) : null);
    const body = stack(W, H, ...layers);
    return stack(W, H, body, embers(W, H, em.filter((e) => e.y - oy > 1), col.any() || sm.any() ? stack(W, H, layers[3], layers[4]) : null));
  });
  return vfxSprite('blast', 'Fire blast (explosion, 3 m)', [cx, gy], { blast: { frames: fr, fps: 12, loop: false } });
}

// --- wall: a row of tall flames 4.5 m long --------------------------------------------------

function wallFrame(t: number, grow: (x: number) => number, W: number, H: number, gy: number): Canvas {
  const backF = new Field(W, H), frontF = new Field(W, H);
  const rows = [
    { f: backF, n: 12, h: 96, w: 11, heat: 0.8, seed: 141 },
    { f: frontF, n: 13, h: 58, w: 10, heat: 0.92, seed: 151 },
  ];
  for (const r of rows)
    for (let k = 0; k < r.n; k++) {
      const x = 14 + ((k + (r.f === frontF ? 0 : 0.5)) / r.n) * (W - 28) + rr(r.seed, k, -4, 4);
      const env = Math.pow(Math.sin(((x - 2) / (W - 4)) * Math.PI), 0.3);
      const g = grow(x);
      if (g <= 0.02) continue;
      const hgt = r.h * env * rr(r.seed + 1, k, 0.8, 1.06) * g * (1 + 0.08 * Math.sin(t * TAU + k * 1.3));
      tongue(r.f, [x, gy + 1], -Math.PI / 2 + rr(r.seed + 2, k, -0.1, 0.1), hgt, r.w * Math.min(1, 0.5 + g * 0.6), r.heat, 0.14, t * TAU + k * 1.7, rr(r.seed + 3, k, -0.12, 0.12));
    }
  // Ember bed along the ground.
  frontF.region(0, gy - 7, W - 1, gy + 8, (x, y) => {
    if (grow(x) <= 0.02) return 0;
    const d = Math.abs(y - gy + 1) / 6.5;
    return d < 1 && x > 6 && x < W - 6 ? (1 - d) * (0.62 + 0.3 * pnoise(x, y, 6, 0, 0, 148)) : 0;
  });
  const er = (x: number, y: number) => pfbm(x, y + t * 120, 8, 2, 0, 120, 147);
  erode(backF, 0.6, er);
  erode(frontF, 0.5, er);
  const back = render(backF, FIRE, { th: TH, rim: [1], hi: 5, jitter: (x, y) => (pnoise(x, (y + t * 120) * 0.25, 2, 0, 30, 149) - 0.5) * 0.2 });
  const front = render(frontF, FIRE, { th: TH, rim: [1], jitter: (x, y) => (pnoise(x, (y + t * 120) * 0.25, 2, 0, 30, 150) - 0.5) * 0.2 });
  const body = stack(W, H, back, front);
  const em: { x: number; y: number; s: number }[] = [];
  for (let k = 0; k < 18; k++) {
    const p = fract(k / 18 * 3 + t);
    const x = rr(149, k, 12, W - 12) + Math.sin(p * 5 + k) * 3;
    if (grow(x) < 0.5) continue;
    em.push({ x, y: gy - 50 - p * 66, s: p < 0.3 ? 2 : 1 });
  }
  return stack(W, H, body, embers(W, H, em.filter((e) => e.y > 2), body));
}
function wall(): WorldSprite {
  // Rows below the ground line for the flames' round bases (the anchor is unchanged).
  const W = 264, H = 128, gy = 112;
  const idle = frames(4, (t) => wallFrame(t, () => 1, W, H, gy));
  // Rise: the fire catches at the middle and runs out to both ends while it climbs.
  const rise = frames(6, (_, i) => {
    const reach = [0.2, 0.45, 0.7, 0.92, 1.2, 1.2][i];
    const height = [0.12, 0.3, 0.52, 0.78, 1.08, 1][i];
    return wallFrame(i / 6, (x) => {
      const d = Math.abs(x - W / 2) / (W / 2);
      return d > reach ? 0 : height * lerp(1, 0.45, smooth(reach - 0.35, reach, d));
    }, W, H, gy);
  });
  return vfxSprite('wall', 'Fire wall (4.5 m x 1.8 m)', [W / 2, gy], { rise: { frames: rise, fps: 12, loop: false }, idle: { frames: idle, fps: 12, loop: true } });
}

// --- aura: flames licking up around a standing character ------------------------------------

function aura(): WorldSprite {
  // Rows below the feet for the ground ring (the anchor is unchanged).
  const W = 80, H = 128, cx = 40, gy = 112;
  const fr = frames(6, (t) => {
    const back = new Field(W, H), front = new Field(W, H);
    // Ground ring at the feet.
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      const x = cx + Math.cos(a) * 24, y = gy + Math.sin(a) * 6;
      const f = Math.sin(a) < 0 ? back : front;
      f.ell(x, y, 6, 3, 0, 0.9);
      tongue(f, [x, y], -Math.PI / 2 + Math.cos(a) * 0.3, 8 + 4 * Math.sin(t * TAU + k * 1.9) + (Math.sin(a) > 0 ? -3 : 4), 4, 0.85, 0.16, t * TAU + k, 0);
    }
    // A flame silhouette around the body: an outer teardrop minus an inner one, both edges
    // rippling upward with the loop, hottest next to the body, closing into a crown over the head.
    const sc = t * 120, top = 3;
    back.fill((x, y) => {
      if (y > gy + 2) return 0;
      const v = clamp((gy - y) / (gy - top), 0, 1);
      const wO = 30 * Math.pow(1 - Math.pow(v, 2.4), 0.55) * (0.86 + 0.26 * pnoise(x, y + sc, 8, 0, 120, 161));
      const vi = clamp((gy - 3 - y) / (gy - 3 - 18), 0, 1);
      const wI = vi >= 1 ? 0 : 18.5 * Math.pow(1 - Math.pow(vi, 2.6), 0.5) * (0.92 + 0.16 * pnoise(x, y + sc, 6, 0, 120, 163));
      const dx = Math.abs(x - cx);
      if (dx > wO || (y < gy - 3 && dx < wI)) return 0;
      if (dx < wI) return 0.45;
      const u = (dx - wI) / Math.max(1, wO - wI);
      return (1 - u) * lerp(0.86, 0.62, v) + 0.05;
    });
    // Tongues rising up the outer edge with their tips flicking outward.
    for (let side = -1; side <= 1; side += 2)
      for (let k = 0; k < 6; k++) {
        const p = fract(k / 6 + t + (side > 0 ? 1 / 12 : 0));
        const y = gy - 4 - p * 86;
        const v = (gy - y) / (gy - top);
        const x = cx + side * 28 * Math.pow(1 - Math.pow(v, 2.4), 0.55);
        const len = 10 + 8 * Math.sin(p * Math.PI);
        tongue(back, [x - side * 2, y], -Math.PI / 2 + side * (0.42 - p * 0.3), len, 4.4 - p * 1.4, 0.7 - p * 0.2, 0.2, t * TAU + k * 2, -side * 0.15);
      }
    erode(back, 0.4, (x, y) => pfbm(x, y + t * 120, 6, 2, 0, 120, 151));
    const body = stack(W, H, render(back, FIRE, { th: TH, rim: [1] }), render(front, FIRE, { th: TH, rim: [1] }));
    const em: { x: number; y: number; s: number }[] = [];
    for (let k = 0; k < 10; k++) {
      const p = fract(k / 10 + t);
      const side = k % 2 ? 1 : -1;
      em.push({ x: cx + side * rr(153, k, 26, 36) + Math.sin(p * 6 + k) * 2, y: gy - 14 - p * 96, s: p < 0.3 ? 2 : 1 });
    }
    return stack(W, H, body, embers(W, H, em.filter((e) => e.y > 2), body));
  });
  return vfxSprite('aura', 'Fire aura (charge / buff)', [cx, gy], { idle: { frames: fr, fps: 12, loop: true } });
}

export function fireSprites(): WorldSprite[] {
  return [bolt(), beast(), ...stream(), breath(), sphere(), slash(), multi(), hit(), blast(), wall(), aura(), ...fireSignature()];
}

void clamp;
