// The fire dragon that rides the crest of the enhanced Great Fire Annihilation.
//
// Sculpted, not assembled from blocks: the upper head is one smooth form (crown, a brow ridge
// arching over the eye, the stop, a long bridge, a nostril bump and a snout that tapers and curls
// up to a rounded tip) shaded as a rounded volume with a plane break down the side of the snout;
// the lower jaw is a curved wedge, thick at the hinge, with a chin. The lip line undulates over
// the teeth. Scales follow the form (big plates on the cranium, small scales on the snout) with a
// row of lit scale edges along the top. The colour runs the whole fire ramp: deep red in the
// shadow planes and the eye socket, orange and yellow-orange on the lit planes, white-yellow only
// for the hottest spots (the eye, the throat glow, the rim light from the fire below). Two horns
// (far one dark behind the skull, near one lit in front), a mane of flame locks in three layers,
// and a scaled neck rising out of the flames in an S, the head leaning forward into the cone.
// The head is rigid from frame to frame (only the jaw, the eye and the flames move); it forms out
// of the flames in the surge and burns away into flame and embers in the fade.

import { Canvas, Color } from './kit';
import { FIRE, TH, tongue } from './vfx-a-fire-kit';
import { Field, Pt, TAU, bez, clamp, dissolve, fract, lerp, pnoise, render, rr, seamStack, smooth, stack, tubeShade } from './vfx-a-lib';

const D = Math.PI / 180;
const PLANE = { th: TH, outline: false };

/** Linear interpolation of y along a polyline sorted by x. */
function yAt(pts: Pt[], x: number): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++)
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return lerp(y0, y1, (x - x0) / Math.max(1e-6, x1 - x0));
    }
  return pts[pts.length - 1][1];
}

/** Catmull-Rom spline through the points (n samples per span). */
function spline(pts: Pt[], n = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * Scales that follow the form: rows run along the head, cells grow from small on the snout to
 * big plates on the cranium; each scale has a shadowed lower rim and, on the lit top of the
 * head, a bright upper edge catching the light. u is along the head, w down its side (0..1).
 */
function scaleAt(u: number, w: number): number {
  const size = lerp(4.6, 8.5, smooth(52, 0, u));
  const rowH = size * 0.62;
  const vy = w * 26;
  const row = Math.floor(vy / rowH);
  const fu = fract(u / size + (row % 2) * 0.5) - 0.5, fv = fract(vy / rowH);
  const r = Math.hypot(fu * 1.3, (fv - 0.25) * 1.1);
  if (r > 0.55 && r < 0.7 && fv > 0.35) return -0.11;
  if (w < 0.42 && fv < 0.2 && Math.abs(fu) < 0.3) return 0.1;
  return 0;
}

export interface DragonHead {
  /** Behind the neck: the far horn and the back layer of mane locks. */
  back: Canvas;
  /** In front of the neck: the head, near horn and the front mane. */
  front: Canvas;
  /** Where the neck joins (behind the jaw hinge) and the snout tip, in the head's canvas. */
  joint: Pt;
  snout: Pt;
}

/**
 * The head at scale s, facing right, tilted nose-down by `tilt` (radians). t is the loop phase
 * (flames, eye) and `jaw` opens the lower jaw a few degrees more.
 */
export function dragonHead(s: number, t: number, jaw = 0, tilt = 0): DragonHead {
  const W = Math.round(214 * s), H = Math.round(156 * s);
  const ox = 88 * s, oy = 86 * s;
  const cs = Math.cos(tilt), sn = Math.sin(tilt);
  const P = (x: number, y: number): Pt => [ox + s * (x * cs - y * sn), oy + s * (x * sn + y * cs)];
  const local = (X: number, Y: number): Pt => {
    const dx = (X - ox) / s, dy = (Y - oy) / s;
    return [dx * cs + dy * sn, -dx * sn + dy * cs];
  };
  const ph = t * TAU;
  const back: Canvas[] = [], front: Canvas[] = [];
  const polyF = (pts: Pt[], heat: (u: number, v: number) => number): Field => {
    const f = new Field(W, H);
    f.poly(pts.map(([x, y]) => P(x, y)), (X, Y) => heat(...local(X, Y)));
    return f;
  };
  const pathP = (pts: Pt[]) => pts.map(([x, y]) => P(x, y));
  const curlTo = (a: number) => (-Math.sin(a) < 0 ? 1 : -1) * 0.06;

  // --- back layer: mane locks behind everything, deep red ---
  {
    const f = new Field(W, H);
    for (let k = 0; k < 8; k++) {
      const a = (160 + k * 7) * D;
      tongue(f, P(-16 - k * 1.2, -15 + k * 4), a + tilt, (62 - Math.abs(k - 3) * 5) * s + Math.sin(ph + k) * 3, 4.8 * s, 0.34, 0.14, ph + k * 1.3, curlTo(a));
    }
    back.push(render(f, FIRE, { ...PLANE, hi: 4, jitter: (x, y) => (pnoise(x * 0.4 + t * 30, y, 2, 30, 0, 961) - 0.5) * 0.16 }));
  }
  // The far horn: behind the skull, in shadow, a little higher and shorter.
  {
    const f = new Field(W, H);
    tubeShade(f, pathP(bez([-6, -17], [-16, -31], [-30, -42], [-46, -43], 20)), (u) => lerp(4.6, 0.9, u) * s, (u, sd) => (sd > 0.3 ? 0.3 : 0.17) - u * 0.06 - (fract(u * 6) < 0.16 ? 0.07 : 0));
    back.push(render(f, FIRE, { ...PLANE, hi: 3 }));
  }

  // --- front: middle mane ---
  {
    const f = new Field(W, H);
    for (let k = 0; k < 5; k++) {
      const a = (166 + k * 9) * D;
      tongue(f, P(-16 + k * 1, -9 + k * 5), a + tilt, (44 - Math.abs(k - 2) * 5) * s + Math.sin(ph * 1.3 + k) * 2.5, 4.4 * s, 0.5, 0.14, ph + k, curlTo(a));
    }
    front.push(render(f, FIRE, { ...PLANE, jitter: (x, y) => (pnoise(x * 0.4 + t * 30, y, 2, 30, 0, 962) - 0.5) * 0.16 }));
  }

  // --- the lower jaw: a curved wedge, thick at the hinge, with a chin; hinged open ---
  const ja = (8 + jaw) * D;
  const hinge: Pt = [2, 10];
  const rot = ([x, y]: Pt): Pt => {
    const dx = x - hinge[0], dy = y - hinge[1];
    return [hinge[0] + dx * Math.cos(ja) - dy * Math.sin(ja), hinge[1] + dx * Math.sin(ja) + dy * Math.cos(ja)];
  };
  const gum: Pt[] = spline([[0, 10], [14, 12.6], [28, 15], [42, 18], [54, 20.6], [63, 22.4]], 6);
  const chinPts: Pt[] = spline([[63, 22.4], [67, 23.8], [67.6, 27], [63.5, 30]], 4);
  const jawBot: Pt[] = spline([[63.5, 30], [56, 30.4], [46, 31.6], [34, 31.4], [22, 29.6], [10, 26.4], [1, 22.6], [-5, 17], [-7, 11]], 6);
  const jawOutline = [...gum, ...chinPts.slice(1), ...jawBot.slice(1)].map(rot);
  const gumR = gum.map(rot);
  // The upper lip: undulating over the teeth, from the tip back to the corner of the mouth.
  const lip: Pt[] = spline([[75, 0.6], [70.5, 1.8], [66.5, 4.2], [62.5, 4.4], [58.5, 2.9], [53.5, 3.6], [48.5, 5.2], [43.5, 4.3], [37.5, 5.4], [31, 6.3], [24, 7.2], [17, 8.6]], 5);
  // Mouth interior: dark red at the front, a white-hot glow deep in the throat.
  {
    const f = new Field(W, H);
    const m: Pt[] = [...lip.slice().reverse(), ...gumR.slice().reverse().filter(([x]) => x > 8)].map(([x, y]) => [x, y] as Pt);
    f.poly(m.map(([x, y]) => P(x, y)), (X, Y) => {
      const [u, v] = local(X, Y);
      const g = Math.hypot((u - 15) / 22, (v - 11) / 7);
      return lerp(0.95, 0.06, clamp(g, 0, 1) ** 0.8);
    });
    front.push(render(f, FIRE, PLANE));
    // Tongue lying in the jaw, curling up at its tip.
    const tg = new Field(W, H);
    tubeShade(tg, pathP(bez(rot([12, 14]), rot([24, 16.5]), rot([36, 19]), rot([45, 15.5]), 16)), (u) => lerp(3.2, 1.3, u) * s, (_u, sd) => (sd < -0.2 ? 0.32 : 0.17));
    front.push(render(tg, FIRE, PLANE));
  }
  front.push(render(polyF(jawOutline, (u, v) => {
    // Rotate back into the jaw's own frame to shade it as a rounded wedge.
    const dx = u - hinge[0], dy = v - hinge[1];
    const ju = hinge[0] + dx * Math.cos(-ja) - dy * Math.sin(-ja), jv = hinge[1] + dx * Math.sin(-ja) + dy * Math.cos(-ja);
    const top = yAt(gum, ju), bot = yAt(jawBot.slice().reverse(), ju);
    const w = clamp((jv - top) / Math.max(1, bot - top), 0, 1);
    let h = w < 0.2 ? 0.4 : lerp(0.3, 0.1, smooth(0.2, 0.95, w));
    // Small plates along the jaw.
    if (w > 0.25 && w < 0.8 && fract(ju / 6.5) < 0.12) h -= 0.07;
    // The chin catches a little light.
    if (ju > 58 && w < 0.6) h += 0.06;
    return h;
  }), FIRE, PLANE));

  // --- the upper head: one rounded form ---
  const topProfile: Pt[] = spline([[-23, -1], [-21, -11], [-12, -18.5], [0, -20.5], [10, -22], [19, -22.5], [27, -17.5], [33, -14], [44, -12.6], [55, -12.2], [62, -12.6], [66, -14.8], [70, -14], [73, -11], [77, -9.6], [79.6, -6.6], [79.6, -3]], 6);
  const lowProfile: Pt[] = spline([[-23, -1], [-21, 8], [-12, 13], [-2, 15], [8, 13.4], [17, 8.6]], 6).concat(lip.slice().reverse().slice(1));
  const headOutline: Pt[] = [...topProfile, ...spline([[79.6, -3], [79, -0.4], [75, 0.6]], 4).slice(1), ...lip.slice(1), ...spline([[17, 8.6], [8, 13.4], [-2, 15], [-12, 13], [-21, 8], [-23, -1]], 6).slice(1)];
  const lowSorted = lowProfile.slice().sort((a, b) => a[0] - b[0]);
  const eye: Pt = [16.5, -10];
  front.push(render(polyF(headOutline, (u, v) => {
    const top = yAt(topProfile, u), bot = yAt(lowSorted, u);
    const w = clamp((v - top) / Math.max(1, bot - top), 0, 1);
    let h: number;
    if (u > 30) {
      // The snout: a lit top plane and a side plane, split by a crisp plane break.
      const brk = lerp(0.36, 0.42, smooth(30, 70, u));
      h = w < brk ? lerp(0.58, 0.46, w / brk) : lerp(0.36, 0.13, smooth(brk, 1, w));
      // A hot highlight running along the bridge and over the nostril bump.
      if (w < 0.09 && u > 34 && u < 74) h = 0.66;
    } else {
      // Cranium and cheek: rounded, lit from above, falling to deep red at the jowl.
      h = lerp(0.56, 0.12, smooth(0.04, 0.95, w) ** 0.85);
      if (u < 14 && w > 0.55) h -= 0.05;
    }
    // The brow ridge's shadow: cast down over the eye from above, fading out below it.
    const es = Math.hypot((u - eye[0] - 1) / 12, (v - eye[1] + 2.6) / (v < eye[1] + 1 ? 6.4 : 3.6));
    if (es < 1) h = Math.min(h, lerp(0.06, 0.3, es ** 1.5));
    else if (w < 0.85) h += scaleAt(u, w);
    // The cheek plate seam behind the mouth.
    if (u < 14 && u > -14 && Math.abs(v - (6 - (u + 14) * 0.08) - Math.sin(u * 0.3) * 0.6) < 0.6) h = Math.min(h, 0.14);
    return h;
  }), FIRE, PLANE));
  // The brow ridge: an arch over the eye, lit on top, a hard shadow under it.
  front.push(render(polyF([...spline([[1, -17], [7, -25], [17, -29], [26, -25], [33, -16]], 6), ...spline([[33, -16], [26, -16.6], [17, -18.4], [8, -17.4], [1, -14.5]], 6).slice(1)], (u, v) => {
    const top = lerp(-24.5, -29, 1 - Math.min(1, Math.abs(u - 17) / 16));
    return v < top + 2.6 ? 0.68 : v < top + 5.2 ? 0.46 : 0.24;
  }), FIRE, PLANE));
  // The near horn: in front, lit along its top, ridged.
  {
    const f = new Field(W, H);
    tubeShade(f, pathP(bez([4, -21], [-8, -36], [-24, -50], [-42, -54], 22)), (u) => lerp(6, 1.1, u) * s, (u, sd) => (sd > 0.35 ? 0.62 : sd > -0.35 ? 0.42 : 0.2) - u * 0.1 - (fract(u * 7) < 0.14 ? 0.16 : 0));
    front.push(render(f, FIRE, PLANE));
  }
  // Front mane: short locks over the join with the neck.
  for (let k = 0; k < 3; k++) {
    const f = new Field(W, H);
    const a = (172 + k * 9) * D;
    tongue(f, P(-16 + k * 2, 2 + k * 5), a + tilt, (28 - k * 3) * s + Math.sin(ph * 1.7 + k) * 2, 3 * s, 0.6, 0.12, ph + k * 2, 0);
    front.push(render(f, FIRE, PLANE));
  }
  // Flames licking off the brow and crown.
  for (let k = 0; k < 3; k++) {
    const f = new Field(W, H);
    tongue(f, P(-8 + k * 9, -21 - k * 1.5), (-130 - k * 8) * D + tilt, (12 + Math.sin(ph + k * 2) * 3) * s, 2.6 * s, 0.56, 0.2, ph + k, 0.1);
    front.push(render(f, FIRE, PLANE));
  }
  const backC = seamStack(W, H, back, FIRE[1], FIRE[0]);
  const c = seamStack(W, H, front, FIRE[1], FIRE[0]);
  const put = (x: number, y: number, col: Color) => {
    const [px, py] = P(x, y);
    c.set(Math.round(px), Math.round(py), col);
  };

  // Teeth: the upper row hangs from the lip (a fang at the bump), the lower row stands on the
  // jaw; yellow with a hot tip, shading with the head's tilt.
  const tooth = (bx: number, by: number, dir: number, len: number, wide = 1.1) => {
    const L = Math.max(2, Math.round(len * s));
    for (let k = 0; k < L; k++) {
      const half = ((L - k) / L) * wide;
      for (let o = -half; o <= half + 0.01; o += 0.5) {
        const [px, py] = P(bx + o, by + (dir * k) / s);
        c.set(Math.round(px), Math.round(py), k >= L - 1 ? FIRE[6] : k > L * 0.4 ? FIRE[5] : FIRE[4]);
      }
    }
  };
  [[24, 7, 3.2], [30, 6.3, 3.6], [36, 5.6, 4], [42, 4.6, 3.6], [47, 5, 4.4], [53, 3.8, 3.6], [64.5, 4.4, 7.4, 1.6], [69.5, 2.4, 3.6], [73.5, 1, 2.6]].forEach(([x, y, l, wd]) => tooth(x, y - 0.4, 1, l, wd ?? 1.1));
  [[0.12, 3], [0.3, 3.6], [0.46, 3.4], [0.62, 4], [0.82, 6.2, 1.5], [0.95, 3]].forEach(([u, l, wd]) => {
    const i = Math.round(u * (gumR.length - 1));
    const [gx, gy] = gumR[i];
    tooth(gx, gy + 0.6, -1, l, wd ?? 1.1);
  });
  // The eye: an almond of white heat with a slit pupil, under the brow's shadow.
  {
    const [ex, ey] = P(eye[0], eye[1]);
    const ew = 4.4 * s, eh = Math.max(1.5, 1.5 * s);
    for (let yy = -Math.ceil(eh) - 2; yy <= Math.ceil(eh) + 2; yy++)
      for (let xx = -Math.ceil(ew) - 2; xx <= Math.ceil(ew) + 2; xx++) {
        const lx = xx * cs + yy * sn, ly = -xx * sn + yy * cs;
        const sl = ly + lx * 0.3;
        const e = Math.abs(sl) / Math.max(0.01, eh * (1 - (lx / (ew + 0.5)) ** 2));
        const X = Math.round(ex) + xx, Y = Math.round(ey) + yy;
        if (Math.abs(lx) <= ew + 0.5 && e <= 1) c.set(X, Y, Math.abs(lx) <= 0.8 ? FIRE[0] : e < 0.55 && Math.abs(lx) < ew * 0.55 ? FIRE[6] : FIRE[5]);
        else if (Math.abs(lx) <= ew + 1 && e <= 1.6) c.set(X, Y, FIRE[1]);
      }
    const fl = Math.sin(ph * 2) > 0 ? 2 : 3;
    put(eye[0] + fl, eye[1] - 1, FIRE[6]);
  }
  // The nostril on its bump, with a hot rim.
  put(67.5, -10.5, FIRE[0]);
  put(68.5, -10.5, FIRE[0]);
  put(69, -11.3, FIRE[1]);
  put(67, -11.4, FIRE[5]);
  // Rim light from the fire below: the lowest lit pixel of each column under the jaw and cheek.
  for (let x = 0; x < W; x++) {
    let y = H - 1;
    while (y > 0 && !c.alpha(x, y)) y--;
    const [u] = local(x, y);
    if (y <= 0 || u < -20 || u > 66) continue;
    if (c.alpha(x, y - 1)) c.set(x, y - 1, u > 6 && u < 50 ? FIRE[6] : FIRE[5]);
  }
  return { back: backC, front: stack(W, H, c), joint: P(-14, 5), snout: P(79.6, -4) };
}

/**
 * A neck of scaled fire rising from `base` in an S to the head's joint: belly plates following
 * the curve on its front, scales on its back, flame spikes along the back, rim light below.
 */
export function dragonNeck(Wd: number, Hd: number, base: Pt, joint: Pt, s: number, t: number, seed: number): Canvas {
  const f = new Field(Wd, Hd), sp = new Field(Wd, Hd);
  const ph = t * TAU;
  const dx = joint[0] - base[0], h = base[1] - joint[1];
  // An S: forward out of the flames, back under the head, then forward into the skull.
  const sway = Math.sin(ph) * 1.5;
  const pts = spline([
    base,
    [base[0] + dx * 0.36 + sway, base[1] - h * 0.26],
    [base[0] + dx * 0.16 - sway, base[1] - h * 0.56],
    [base[0] - dx * 0.06 + sway * 0.5, base[1] - h * 0.8],
    [base[0] + dx * 0.36, base[1] - h * 0.98],
    joint,
  ], 8);
  const R = (u: number) => lerp(17, 12, u) * s * 0.75;
  tubeShade(f, pts, R, (u, sd) => {
    // sd > 0 is the throat (front/under side), sd < 0 the back.
    if (sd > 0.86) return 0.7; // rim light from the fire below
    if (sd > 0.2) return fract(u * 13) < 0.17 ? 0.16 : lerp(0.52, 0.38, (sd - 0.2) / 0.66); // belly plates
    // Scales on the back: overlapping scallops in staggered rows along the curve, each with a
    // shadowed rim and a lit crown on the side toward the light.
    const rv = (sd + 1) * 1.7, rowN = Math.floor(rv), fv = fract(rv);
    const fu = fract(u * 15 + (rowN % 2) * 0.5) - 0.5;
    const r = Math.hypot(fu * 1.25, (fv - 0.15) * 1.05);
    const sc = r > 0.5 && r < 0.66 ? -0.11 : r < 0.24 && sd < 0.05 ? 0.08 : 0;
    return 0.18 + 0.18 * (sd + 1) * 0.5 + sc;
  });
  // Spikes of flame along the back of the neck, swept back.
  for (let k = 0; k < 8; k++) {
    const u = 0.1 + k * 0.105;
    const i = Math.round(u * (pts.length - 1));
    const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)];
    const ddx = q[0] - p[0], ddy = q[1] - p[1], l = Math.hypot(ddx, ddy) || 1;
    // The back side is the right-hand normal (-s).
    const nx = ddy / l, ny = -ddx / l;
    const r = R(u);
    const b: Pt = [p[0] + nx * (r - 2), p[1] + ny * (r - 2)];
    const a = Math.atan2(ny * 0.7 - (ddy / l) * 0.7, nx * 0.7 - (ddx / l) * 0.7);
    tongue(sp, b, a, (16 - k * 1.1) * s * 0.75 + Math.sin(ph + k) * 2, 4 * s * 0.75, 0.46, 0.12, ph + k + seed, 0.1);
  }
  const spikes = render(sp, FIRE, { th: TH, outline: false });
  const neck = render(f, FIRE, { th: TH, outline: false });
  return seamStack(Wd, Hd, [spikes, neck], FIRE[1], FIRE[0]);
}

/** The head's lean into the cone (nose down), radians. */
export const DRAGON_TILT = 12 * D;

/**
 * The whole dragon placed in a frame: back layer, neck, head. vis (0..1) forms it out of the
 * flames bottom-up (surge) or burns it away (fade, `fading`), its burning edge running through
 * the fire ramp (red rim, orange, a yellow core) and throwing embers.
 */
export function drawDragon(W: number, H: number, snoutAt: Pt, neckBase: Pt, s: number, t: number, vis: number, fading: boolean, jaw: number, seed: number): { c: Canvas; edge: Pt[] } {
  const head = dragonHead(s, t, jaw, DRAGON_TILT);
  const dx = Math.round(snoutAt[0] - head.snout[0]), dy = Math.round(snoutAt[1] - head.snout[1]);
  const joint: Pt = [head.joint[0] + dx, head.joint[1] + dy];
  const neck = dragonNeck(W, H, neckBase, joint, s, t, seed);
  const all = new Canvas(W, H);
  all.draw(head.back, dx, dy);
  all.draw(neck, 0, 0);
  all.draw(head.front, dx, dy);
  if (vis >= 1) return { c: all, edge: [] };
  // Forming: the lower parts (nearest the wave) appear first. Fading: it burns away from the
  // neck's root upward as the wave under it dies, the head going last, in broad ragged patches.
  const top = snoutAt[1] - 60 * s, bottom = neckBase[1];
  const key = (x: number, y: number) => {
    const n = pnoise(x, y, 14, 0, 0, seed + 3) * 0.55 + pnoise(x, y, 30, 0, 0, seed + 4) * 0.45;
    const hgt = clamp((bottom - y) / Math.max(1, bottom - top), 0, 1);
    return fading ? clamp((1 - hgt) * 0.7 + (n - 0.5) * 0.34 + 0.15, 0, 1) : clamp(hgt * 0.65 + n * 0.35, 0, 1);
  };
  return dissolve(all, vis, key, [FIRE[2], FIRE[3], FIRE[4], FIRE[5]], FIRE[0]);
}

void rr;
