// The fire dragon that rides the crest of the enhanced Great Fire Annihilation.
//
// Built like a sculpted head, not a silhouette: separate planes (cranium, brow ridge, eye socket,
// snout top, snout side, cheek plate, lower jaw), each with its own light and shadow and joined by
// inner seam lines; scales on the top planes and plates along the snout; an open mouth with both
// tooth rows, a tongue and a glow deep in the throat; a glowing eye under a shadowing brow; two
// horns layered front and back; a mane of flame locks in three depth layers; a scaled neck with
// belly plates rising out of the wave; and a rim light from the fire below. The head is rigid
// from frame to frame (only the jaw, the eye and the flames move), it forms out of the flames
// in the surge and burns away into flame and embers in the fade.

import { Canvas, Color } from './kit';
import { FIRE, TH, tongue } from './vfx-a-fire-kit';
import { Field, Pt, TAU, bez, clamp, dissolve, fract, lerp, pnoise, render, rr, seamStack, stack, tubeShade } from './vfx-a-lib';

const D = Math.PI / 180;
const PLANE = { th: TH, outline: false };

/** Scales on a top plane: a darker scallop edge in a staggered grid (local units). */
function scales(u: number, v: number): number {
  const row = Math.floor(v / 4.5);
  const fu = fract(u / 7.5 + (row % 2) * 0.5) - 0.5, fv = fract(v / 4.5);
  return Math.abs(Math.hypot(fu * 1.5, fv * 1.05 - 0.2) - 0.62) < 0.09 ? -0.12 : 0;
}

export interface DragonHead {
  /** Behind the neck: the far horn and the back layer of mane locks. */
  back: Canvas;
  /** In front of the neck: the head, near horn and the front mane. */
  front: Canvas;
  /** Local point where the neck joins (behind the jaw hinge) and the snout tip. */
  joint: Pt;
  snout: Pt;
}

/**
 * The head at scale s, facing right. t is the loop phase (flames, eye) and `jaw` opens the lower
 * jaw a few degrees more.
 */
export function dragonHead(s: number, t: number, jaw = 0): DragonHead {
  const W = Math.round(200 * s), H = Math.round(140 * s);
  const ox = 82 * s, oy = 80 * s;
  const P = (x: number, y: number): Pt => [ox + x * s, oy + y * s];
  const ph = t * TAU;
  const back: Canvas[] = [], front: Canvas[] = [];
  const poly = (pts: [number, number][], heat: (u: number, v: number) => number): Field => {
    const f = new Field(W, H);
    f.poly(pts.map(([x, y]) => P(x, y)), (x, y) => heat((x - ox) / s, (y - oy) / s));
    return f;
  };
  const curlTo = (a: number) => (-Math.sin(a) < 0 ? 1 : -1) * 0.06;

  // --- back layer: mane locks behind everything, dark and red ---
  {
    const f = new Field(W, H);
    for (let k = 0; k < 8; k++) {
      const a = (160 + k * 7) * D;
      tongue(f, P(-14 - k * 1.2, -16 + k * 4), a, (62 - Math.abs(k - 3) * 5) * s + Math.sin(ph + k) * 3, 4.8 * s, 0.42, 0.14, ph + k * 1.3, curlTo(a));
    }
    back.push(render(f, FIRE, { ...PLANE, hi: 4, jitter: (x, y) => (pnoise(x * 0.4 + t * 30, y, 2, 30, 0, 961) - 0.5) * 0.16 }));
  }
  // The far horn: behind the skull, darker, a little higher and shorter.
  {
    const f = new Field(W, H);
    const pts = bez(P(-4, -17), P(-16, -30), P(-30, -40), P(-46, -42), 18);
    f.path(pts, (u) => lerp(5, 1, u) * s, (u) => lerp(0.3, 0.17, u) - (fract(u * 6) < 0.16 ? 0.08 : 0), 1);
    back.push(render(f, FIRE, { ...PLANE, hi: 3 }));
  }

  // --- front: middle mane, jaw, mouth, head planes, horn, front mane ---
  {
    const f = new Field(W, H);
    for (let k = 0; k < 5; k++) {
      const a = (166 + k * 9) * D;
      tongue(f, P(-14 + k * 1, -10 + k * 5), a, (44 - Math.abs(k - 2) * 5) * s + Math.sin(ph * 1.3 + k) * 2.5, 4.4 * s, 0.64, 0.14, ph + k, curlTo(a));
    }
    front.push(render(f, FIRE, { ...PLANE, jitter: (x, y) => (pnoise(x * 0.4 + t * 30, y, 2, 30, 0, 962) - 0.5) * 0.16 }));
  }
  // Lower jaw: hinged under the cheek, opened down; lit along its top, dark under, rim lit below.
  const ja = (4 + jaw) * D;
  const hinge: Pt = [4, 8];
  const rot = ([x, y]: [number, number]): [number, number] => {
    const dx = x - hinge[0], dy = y - hinge[1];
    return [hinge[0] + dx * Math.cos(ja) - dy * Math.sin(ja), hinge[1] + dx * Math.sin(ja) + dy * Math.cos(ja)];
  };
  const jawPts: [number, number][] = ([[0, 8], [18, 10], [40, 16], [56, 21], [63, 23], [62, 27], [56, 29], [40, 27], [20, 24], [4, 22], [-6, 16]] as [number, number][]).map(rot);
  const jawTop = ([[20, 12], [57, 21.5]] as [number, number][]).map(rot);
  // Mouth interior with a glow deep in the throat (behind the jaw so the jaw's edge reads).
  {
    const f = new Field(W, H);
    const m: [number, number][] = [[12, 7], [26, 5], [46, 4], [64, 3], ...([[56, 22], [40, 17], [20, 13]] as [number, number][]).map(rot)];
    f.poly(m.map(([x, y]) => P(x, y)), (x, y) => {
      const u = (x - ox) / s, v = (y - oy) / s;
      const g = Math.hypot((u - 18) / 18, (v - 10) / 6);
      return lerp(0.92, 0.07, clamp(g, 0, 1));
    });
    front.push(render(f, FIRE, PLANE));
    // Tongue lying in the jaw, curling up at its tip.
    const tg = new Field(W, H);
    const tpts = bez(P(...rot([10, 13])), P(...rot([22, 15])), P(...rot([34, 18])), P(...rot([42, 14])), 14);
    tubeShade(tg, tpts, (u) => lerp(3.2, 1.4, u) * s, (_u, sd) => 0.3 - 0.12 * sd);
    front.push(render(tg, FIRE, PLANE));
  }
  front.push(render(poly(jawPts, (u, v) => {
    const [tx, ty] = jawTop[0];
    const depth = (v - ty - (u - tx) * 0.25) / 9;
    return lerp(0.52, 0.17, clamp(depth, 0, 1));
  }), FIRE, PLANE));
  // Cheek plate (behind the jaw hinge), darker, with two curved plate seams drawn later.
  front.push(render(poly([[-21, -3], [-10, -5], [4, -7], [18, -3], [24, 4], [14, 8], [6, 12], [-8, 13], [-20, 7]], (u, v) => 0.36 - v * 0.006 + (u > 6 ? 0.04 : 0)), FIRE, PLANE));
  // Cranium: the top and back of the skull, lit from above, scaled.
  front.push(render(poly([[-22, -3], [-18, -14], [-6, -20], [12, -22], [15, -13], [4, -7], [-10, -5]], (u, v) => 0.7 - (v + 20) * 0.008 + scales(u, v)), FIRE, PLANE));
  // Snout side: from under the brow to the upper lip, a mid tone.
  front.push(render(poly([[26, -9], [42, -8], [62, -8], [72, -7], [76, -4], [74, 1], [64, 3], [44, 4], [26, 5], [18, -2]], (u, v) => 0.48 + (v < -4 ? 0.04 : 0) - (u < 30 ? 0.06 : 0)), FIRE, PLANE));
  // Snout top: the long lit plane along the bridge to the nose bump, scaled.
  front.push(render(poly([[24, -16], [50, -13], [60, -15], [67, -13], [72, -7], [62, -8], [42, -8], [27, -9]], (u, v) => 0.82 + scales(u, v * 1.4)), FIRE, PLANE));
  // Eye socket: a shadowed hollow under the brow.
  front.push(render(poly([[10, -14], [24, -13], [27, -9], [18, -5.5], [9, -8.5]], () => 0.24), FIRE, PLANE));
  // Brow ridge: overhanging the eye, bright on top.
  front.push(render(poly([[4, -21], [14, -25], [25, -20], [32, -15], [24, -12], [12, -14], [5, -15]], (_u, v) => (v < -19 ? 0.86 : 0.5)), FIRE, PLANE));
  // Near horn: in front, lit, ridged.
  {
    const f = new Field(W, H);
    const pts = bez(P(6, -20), P(-6, -36), P(-22, -50), P(-40, -54), 20);
    f.path(pts, (u) => lerp(6, 1.2, u) * s, (u) => lerp(0.78, 0.44, u) - (fract(u * 7) < 0.14 ? 0.18 : 0), 1);
    front.push(render(f, FIRE, PLANE));
  }
  // Front mane: short bright locks over the join with the neck.
  for (let k = 0; k < 3; k++) {
    const f = new Field(W, H);
    const a = (172 + k * 9) * D;
    tongue(f, P(-14 + k * 2, 1 + k * 5), a, (28 - k * 3) * s + Math.sin(ph * 1.7 + k) * 2, 3 * s, 0.9, 0.12, ph + k * 2, 0);
    front.push(render(f, FIRE, PLANE));
  }
  // Flames licking off the brow and crown.
  for (let k = 0; k < 3; k++) {
    const f = new Field(W, H);
    tongue(f, P(-8 + k * 9, -20 - k * 1.5), (-130 - k * 8) * D, (12 + Math.sin(ph + k * 2) * 3) * s, 2.6 * s, 0.7, 0.2, ph + k, 0.1);
    front.push(render(f, FIRE, PLANE));
  }
  const backC = seamStack(W, H, back, FIRE[1], FIRE[0]);
  const frontC = seamStack(W, H, front, FIRE[1], FIRE[0]);
  const c = frontC;
  const set = (x: number, y: number, col: Color) => {
    const [px, py] = P(x, y);
    c.set(Math.round(px), Math.round(py), col);
  };
  const line = (a: [number, number], b: [number, number], col: Color, onlyOpaque = true) => {
    const [ax, ay] = P(...a), [bx, by] = P(...b);
    const n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(lerp(ax, bx, k / n)), y = Math.round(lerp(ay, by, k / n));
      if (!onlyOpaque || c.alpha(x, y)) c.set(x, y, col);
    }
  };
  // Plates along the snout side and seams on the cheek.
  line([30, -3], [70, -3.5], FIRE[2]);
  line([28, 1], [62, 1], FIRE[2]);
  for (let k = 0; k < 3; k++) {
    const x0 = -16 + k * 9;
    line([x0, -2 + k], [x0 + 5, 10 - k], FIRE[1]);
  }
  // Teeth: the upper row hangs from the lip, the lower row stands on the jaw; fangs at the front.
  const tooth = (bx: number, by: number, dir: number, len: number) => {
    const [x0, y0] = P(bx, by);
    const L = Math.round(len * s);
    for (let k = 0; k < L; k++) {
      const half = Math.round(((L - k) / L) * 1.1 * s);
      for (let o = -half; o <= half; o++) c.set(Math.round(x0) + o, Math.round(y0 + dir * k), k === L - 1 ? FIRE[5] : FIRE[6]);
    }
  };
  [[28, 4.6, 4], [36, 4.4, 6], [44, 3.9, 4], [52, 3.5, 4], [60, 3, 7], [68, 2.2, 4]].forEach(([x, y, l]) => tooth(x, y, 1, l));
  [[0.15, 3.5], [0.35, 4.5], [0.55, 4], [0.75, 6], [0.92, 3.5]].forEach(([u, l]) => {
    const [ax, ay] = jawTop[0], [bx, by] = jawTop[1];
    tooth(lerp(ax, bx, u), lerp(ay, by, u) - 0.5, -1, l);
  });
  // A glowing eye: an almond slit with a dark pupil, under the brow's shadow.
  {
    const [ex, ey] = P(17, -9.5);
    const ew = Math.round(6 * s), eh = Math.max(2, Math.round(1.8 * s));
    for (let yy = -eh - 1; yy <= eh + 1; yy++)
      for (let xx = -ew - 1; xx <= ew + 1; xx++) {
        const sl = Math.round(xx * 0.28);
        const fill = Math.abs(yy + sl) <= eh * (1 - (xx / (ew + 0.5)) ** 2);
        const ring = !fill && Math.abs(yy + sl) <= eh * (1 - (xx / (ew + 1.5)) ** 2) + 1;
        const X = Math.round(ex) + xx, Y = Math.round(ey) + yy;
        if (fill) c.set(X, Y, Math.abs(xx) <= 1 ? FIRE[0] : Math.abs(xx) < ew * 0.55 ? FIRE[6] : FIRE[5]);
        else if (ring) c.set(X, Y, FIRE[0]);
      }
    const fl = 0.5 + 0.5 * Math.sin(ph * 2);
    set(17 + (fl > 0.5 ? 2 : 3), -10.5, FIRE[6]);
  }
  // Nostril with a wisp.
  set(68, -8, FIRE[0]);
  set(69, -8, FIRE[0]);
  set(68, -7, FIRE[1]);
  // Rim light from the fire below: the lowest lit pixel of each column under the jaw and cheek.
  for (let x = 0; x < W; x++) {
    let y = H - 1;
    while (y > 0 && !c.alpha(x, y)) y--;
    const u = (x - ox) / s;
    if (y <= 0 || u < -20 || u > 70) continue;
    // y is the outline; the pixel above it gets the rim.
    if (c.alpha(x, y - 1) && c.get(x, y - 1)[0] !== FIRE[0][0]) c.set(x, y - 1, FIRE[5]);
  }
  return { back: backC, front: stack(W, H, c), joint: P(-12, 6), snout: P(76, -3) };
}

/** A neck of scaled fire rising from `base` to the head's joint: back spikes, belly plates, rim light. */
export function dragonNeck(Wd: number, Hd: number, base: Pt, joint: Pt, s: number, t: number, seed: number): Canvas {
  const f = new Field(Wd, Hd), sp = new Field(Wd, Hd);
  const ph = t * TAU;
  const pts = bez(base, [base[0] + 6, base[1] - 70 * s * 0.6], [joint[0] - 46 * s * 0.6, joint[1] + 30 * s * 0.6], joint, 24).map(([x, y], k, a) => {
    const u = k / (a.length - 1);
    return [x + Math.sin(u * Math.PI * 2 + ph) * 1.5 * (1 - u), y] as Pt;
  });
  const R = (u: number) => lerp(17, 12, u) * s * 0.75;
  tubeShade(f, pts, R, (u, sd) => {
    // sd > 0 is the throat (front/under side), sd < 0 the back.
    if (sd > 0.84) return 0.86; // rim light from the fire below
    if (sd > 0.22) return fract(u * 12) < 0.16 ? 0.3 : 0.64 - (sd - 0.22) * 0.1; // belly plates
    // Scales on the back: staggered rows, each lit on top and shadowed at its lower edge.
    const rowN = Math.floor((sd + 1) * 2.2);
    const f2 = fract(u * 17 + (rowN % 2) * 0.5);
    const sc = f2 < 0.22 ? -0.14 : f2 > 0.75 ? 0.06 : 0;
    return 0.38 + 0.1 * (sd + 1) * 0.5 + sc;
  });
  // Spikes of flame along the back of the neck, swept back.
  for (let k = 0; k < 7; k++) {
    const u = 0.12 + k * 0.12;
    const i = Math.round(u * (pts.length - 1));
    const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)];
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
    // The back side is the right-hand normal (-s).
    const nx = dy / l, ny = -dx / l;
    const r = R(u);
    const b: Pt = [p[0] + nx * (r - 2), p[1] + ny * (r - 2)];
    const a = Math.atan2(ny * 0.7 - dy / l * 0.7, nx * 0.7 - dx / l * 0.7);
    tongue(sp, b, a, (16 - k * 1.2) * s * 0.75 + Math.sin(ph + k) * 2, 4 * s * 0.75, 0.5, 0.12, ph + k + seed, 0.1);
  }
  const spikes = render(sp, FIRE, { th: TH, outline: false });
  const neck = render(f, FIRE, { th: TH, outline: false });
  return seamStack(Wd, Hd, [spikes, neck], FIRE[1], FIRE[0]);
}

/**
 * The whole dragon placed in a frame: back layer, neck, head. vis (0..1) forms it out of the
 * flames bottom-up (surge) or burns it away (fade, `fading`), leaving burning edges and embers.
 */
export function drawDragon(W: number, H: number, snoutAt: Pt, neckBase: Pt, s: number, t: number, vis: number, fading: boolean, jaw: number, seed: number): { c: Canvas; edge: Pt[] } {
  const head = dragonHead(s, t, jaw);
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
  return dissolve(all, vis, key, [FIRE[4], FIRE[6]], FIRE[0]);
}

void rr;
