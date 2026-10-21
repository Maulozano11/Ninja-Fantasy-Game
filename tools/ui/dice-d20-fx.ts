// The d20's animations: the throw (a fast spin in the air with a motion smear, three bounces each
// lower and slower, then the die rolls over an edge onto the rolled number, wobbles and settles with
// a squash and a click), the result pop, the natural 20 (gold flash, rays, sparkles, a shine sweep)
// and the natural 1 (dull red, a crack, chips, a shake), plus the halo, shadow and dust sprites the
// screen lays under and around the die.
//
// Frames hold only the die (centred in its frame); where the die is in the throw is data (dx, dy
// per frame), so the same frames serve the small die over the actor and the big one in the window.

import { Img, RGBA, hex, mixc } from './ui-img';
import {
  DULL1, FACES, GOLD20, IDENTITY, Look, M3, Rendered, STYLES, StyleId, V3, VERTS, WHITE,
  axisAngle, faceOf, lcg, mmul, mul, norm, renderDie, restRotation,
} from './dice-d20-art';

export type Size = 'small' | 'big';
/** Circumradius and frame size per die size (art pixels; the HUD doubles them on screen). */
export const SIZES: Record<Size, { R: number; box: number; fx: number; k: number }> = {
  small: { R: 15, box: 44, fx: 72, k: 1 },
  big: { R: 46, box: 128, fx: 200, k: 3 },
};

export interface RollFrame {
  /** Where the die's centre is, from where it lands (art pixels). */
  dx: number;
  dy: number;
  ms: number;
  /** 1 to 3 on the frames the die hits the ground (the dust puff's size). */
  contact?: number;
  /** The shadow: 0 (high in the air) .. 1 (on the ground). */
  ground: number;
  /** The click: the frame the die stops on its face. */
  click?: boolean;
}

interface Key {
  dx: number;
  dy: number;
  /** Spin left before the die reaches the ground for the last time, about the throw's axes (degrees). */
  a1: number;
  a2: number;
  /** How far the die still leans over the edge it rolls on (degrees; the angle between two faces is 41.8). */
  tip: number;
  /** Size (the die comes in from the far side, a little smaller). */
  s: number;
  sx?: number;
  sy?: number;
  ms: number;
  contact?: number;
  /** A motion smear behind the die (the fast frames). */
  smear?: boolean;
}

/** The angle the die turns rolling from one face onto the next (180 minus the dihedral angle). */
const OVER = 41.81;

// The throw, frame by frame (small-die pixels; the big die moves k times as far). It flies in from
// above to one side spinning fast, hits the ground three times (each bounce lower, each turn slower),
// lands on a face next to the result, rolls over the edge between them (faster as it falls), clicks
// down on the result, wobbles back and forth and stops.
const THROW: Key[] = [
  { dx: -42, dy: -30, a1: 260, a2: 700, tip: OVER, s: 0.82, ms: 30, smear: true },
  { dx: -37, dy: -31, a1: 200, a2: 620, tip: OVER, s: 0.87, ms: 30, smear: true },
  { dx: -32, dy: -26, a1: 145, a2: 545, tip: OVER, s: 0.92, ms: 30, smear: true },
  { dx: -28, dy: -15, a1: 95, a2: 475, tip: OVER, s: 0.96, ms: 30 },
  { dx: -24, dy: 0, a1: 55, a2: 410, tip: OVER, s: 1, sx: 1.09, sy: 0.86, ms: 44, contact: 3 },
  { dx: -20, dy: -9, a1: 30, a2: 352, tip: OVER, s: 1, sx: 0.96, sy: 1.05, ms: 36 },
  { dx: -16, dy: -12, a1: 12, a2: 300, tip: OVER, s: 1, ms: 36 },
  { dx: -12.5, dy: -10, a1: 0, a2: 252, tip: OVER, s: 1, ms: 36 },
  { dx: -9.5, dy: -5, a1: 0, a2: 208, tip: OVER, s: 1, ms: 36 },
  { dx: -7, dy: 0, a1: 0, a2: 168, tip: OVER, s: 1, sx: 1.06, sy: 0.91, ms: 44, contact: 2 },
  { dx: -5, dy: -4, a1: 0, a2: 118, tip: OVER, s: 1, ms: 40 },
  { dx: -3.5, dy: -4, a1: 0, a2: 72, tip: OVER, s: 1, ms: 40 },
  { dx: -2.5, dy: -1.5, a1: 0, a2: 32, tip: OVER, s: 1, ms: 40 },
  { dx: -2, dy: 0, a1: 0, a2: 0, tip: OVER, s: 1, sx: 1.03, sy: 0.95, ms: 60, contact: 1 },
  { dx: -1.5, dy: 0, a1: 0, a2: 0, tip: 34, s: 1, ms: 55 },
  { dx: -1, dy: 0, a1: 0, a2: 0, tip: 20, s: 1, ms: 45 },
  { dx: 0, dy: 0, a1: 0, a2: 0, tip: 0, s: 1, sx: 1.03, sy: 0.95, ms: 60 },
  { dx: 0, dy: 0, a1: 0, a2: 0, tip: -5, s: 1, ms: 55 },
  { dx: 0, dy: 0, a1: 0, a2: 0, tip: 2.5, s: 1, ms: 55 },
  { dx: 0, dy: 0, a1: 0, a2: 0, tip: -1, s: 1, ms: 60 },
  { dx: 0, dy: 0, a1: 0, a2: 0, tip: 0, s: 1, ms: 0 },
];
export const ROLL_FRAMES = THROW.length;
/** The frame where the die stops on its face (the click). */
export const CLICK_FRAME = 16;

/** The throw's two spin axes for a result: varied per number, so rolls do not repeat. */
function throwAxes(result: number, fromRight: boolean): [V3, V3] {
  const r = lcg(1000 + result * 37);
  const pick = (zMax: number): V3 => {
    const a = r() * Math.PI * 2;
    const z = (r() * 2 - 1) * zMax;
    const q = Math.sqrt(1 - z * z);
    return norm([Math.cos(a) * q, Math.sin(a) * q, z]);
  };
  // Mostly tumbling end over end (an axis across the screen), with some spin.
  const a1 = pick(0.6), a2 = pick(0.45);
  // Rolling forward along the throw: the second axis leans to turn the die the way it travels.
  const along: V3 = norm([0.25 * a2[0], 1, -0.35 + 0.2 * a2[2]]);
  const s = fromRight ? -1 : 1;
  return [a1, norm([along[0] * 0.6 + a2[0] * 0.4, (along[1] * 0.6 + a2[1] * 0.4) * s, (along[2] * 0.6 + a2[2] * 0.4) * s])];
}

/** Which side a result's throw comes from (odd from the left, even from the right). */
export const fromRight = (result: number): boolean => result % 2 === 0;

/**
 * The edge the die rolls over at the end: the face it lands on first is the result's neighbour on
 * the side it travels toward, so the last roll carries it on the way it was going. Returns the
 * edge's axis and middle (camera space, die radii) and which way turns it back over.
 */
function tipEdge(result: number): { axis: V3; mid: V3; sign: number } {
  const fi = faceOf(result);
  const rest = restRotation(fi);
  const side = fromRight(result) ? -1 : 1;
  const f = FACES[fi];
  const a = f.adj.reduce((best, g) => (mul(rest, FACES[g].n)[0] * side > mul(rest, FACES[best].n)[0] * side ? g : best), f.adj[0]);
  const sh = f.v.filter((v) => FACES[a].v.includes(v));
  const va = mul(rest, VERTS[sh[0]]), vb = mul(rest, VERTS[sh[1]]);
  const axis = norm([vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]]);
  const mid: V3 = [(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2];
  // The sign that brings the first face round to the eye.
  const na = mul(rest, FACES[a].n);
  const sign = mul(axisAngle(axis, OVER), na)[2] >= mul(axisAngle(axis, -OVER), na)[2] ? 1 : -1;
  return { axis, mid, sign };
}

/** The die's centre moved by turning `deg` about the edge (the edge stays put on the ground). */
function tipShift(result: number, deg: number): [number, number] {
  const e = tipEdge(result);
  const m = mul(axisAngle(e.axis, e.sign * deg), e.mid);
  return [e.mid[0] - m[0], e.mid[1] - m[1]];
}

/** The throw's path for a result (the same for every style). */
export function rollPath(result: number, size: Size): RollFrame[] {
  const z = SIZES[size], side = fromRight(result) ? -1 : 1;
  return THROW.map((f, i) => {
    const [tx, ty] = tipShift(result, f.tip);
    return {
      dx: Math.round(f.dx * z.k * side + tx * z.R * 0.5),
      dy: Math.round(f.dy * z.k + ty * z.R * 0.25),
      ms: f.ms,
      contact: f.contact,
      ground: Math.max(0, 1 + f.dy / 30),
      click: i === CLICK_FRAME,
    };
  });
}

/** The die's turn for a throw key (fractional keys blend two frames, for the smear). */
function keyRotation(result: number, f: { a1: number; a2: number; tip: number }): M3 {
  const [ax1, ax2] = throwAxes(result, fromRight(result));
  const e = tipEdge(result);
  let m = mmul(axisAngle(e.axis, e.sign * f.tip), restRotation(faceOf(result)));
  if (f.a2) m = mmul(axisAngle(ax2, f.a2), m);
  if (f.a1) m = mmul(axisAngle(ax1, f.a1), m);
  return m;
}

/** The die's turn in throw frame `i` for a result. */
export function rollRotation(result: number, i: number): M3 {
  return keyRotation(result, THROW[i]);
}

export interface DieOpts {
  style: StyleId;
  size: Size;
  look?: Look;
  goldness?: number;
  numberGlow?: boolean;
  numberGold?: boolean;
  /** Size multiplier (the pop). */
  grow?: number;
  /** Frame size (default the size's die box). */
  box?: number;
}

/** The nearest colour of the style's palette (smear pixels snap back to it, so a gem keeps its keys). */
function snap(style: StyleId, c: [number, number, number]): RGBA {
  let best = STYLES[style].palette[0], bd = Infinity;
  for (const p of STYLES[style].palette) {
    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

/** One throw frame. */
export function rollFrame(result: number, i: number, o: DieOpts): Rendered {
  const z = SIZES[o.size], f = THROW[i];
  const fi = faceOf(result);
  const box = o.box ?? z.box;
  const die = renderDie({
    style: o.style, R: z.R * f.s, rot: rollRotation(result, i), w: box, h: box, sx: f.sx, sy: f.sy,
    // The number reads upright once the die is down on its face (and while it wobbles there).
    upright: i >= CLICK_FRAME ? fi : undefined,
    look: o.look, goldness: o.goldness,
  });
  if (!f.smear) return die;
  // The smear: the die a moment earlier, three times, fading behind it (a deliberate blur, snapped
  // back to the style's palette and to three steps of opacity).
  const prev = THROW[Math.max(0, i - 1)];
  const back = i === 0 ? { ...f, dx: f.dx - 5, dy: f.dy + 1, a1: f.a1 + 60, a2: f.a2 + 80, s: f.s - 0.05 } : prev;
  const side = fromRight(result) ? -1 : 1;
  const acc = new Float32Array(box * box * 4);
  const W = [0.5, 0.36, 0.24];
  [0.25, 0.5, 0.75].forEach((t, j) => {
    const k = { a1: f.a1 + (back.a1 - f.a1) * t, a2: f.a2 + (back.a2 - f.a2) * t, tip: f.tip };
    const ox = (back.dx - f.dx) * t * z.k * side, oy = (back.dy - f.dy) * t * z.k;
    const g = renderDie({ style: o.style, R: z.R * (f.s + (back.s - f.s) * t), rot: keyRotation(result, k), w: box, h: box, cx: box / 2 + ox, cy: box / 2 + oy, plain: true, look: o.look, goldness: o.goldness });
    for (let p = 0; p < box * box; p++) {
      const a = g.img.px[p * 4 + 3];
      if (!a) continue;
      for (let c = 0; c < 3; c++) acc[p * 4 + c] += g.img.px[p * 4 + c] * W[j];
      acc[p * 4 + 3] += W[j];
    }
  });
  const img = new Img(box, box);
  for (let p = 0; p < box * box; p++) {
    const wsum = acc[p * 4 + 3];
    if (!wsum) continue;
    const c = snap(o.style, [acc[p * 4] / wsum, acc[p * 4 + 1] / wsum, acc[p * 4 + 2] / wsum]);
    const a = wsum > 0.8 ? 150 : wsum > 0.4 ? 100 : 55;
    img.set(p % box, Math.floor(p / box), [c[0], c[1], c[2], a]);
  }
  img.draw(die.img, 0, 0);
  return { ...die, img };
}

/** The die at rest on a result. */
export function restDie(result: number, o: DieOpts): Rendered {
  const z = SIZES[o.size];
  const box = o.box ?? z.box;
  const fi = faceOf(result);
  return renderDie({
    style: o.style, R: z.R * (o.grow ?? 1), rot: restRotation(fi), w: box, h: box, upright: fi,
    look: o.look, goldness: o.goldness, numberGlow: o.numberGlow, numberGold: o.numberGold,
  });
}

// --- the result pop --------------------------------------------------------------------------------

export interface FxFrame {
  img: Img;
  ms: number;
  /** Extra offset of the die (the natural 1's shake). */
  dx?: number;
  dy?: number;
}

/** The pop when the number lands: a quick swell with the number lit, back to rest. */
export function popFrames(result: number, style: StyleId, size: Size): FxFrame[] {
  const box = SIZES[size].box;
  return [
    { img: restDie(result, { style, size, grow: 1.1, numberGlow: true, box }).img, ms: 50, dy: -1 },
    { img: restDie(result, { style, size, grow: 1.05, numberGlow: true, box }).img, ms: 60 },
    { img: restDie(result, { style, size, box }).img, ms: 90 },
  ];
}

// --- shared effect bits ---------------------------------------------------------------------------

/** A soft ring of light (alpha bands, no blur): the halo under a die that just landed. */
export function halo(w: number, r: number, colour: RGBA, strength: number): Img {
  const img = new Img(w, w);
  const c = w / 2;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      // Three flat bands, brightest inside.
      const a = d <= r * 0.8 ? 0.55 : d <= r ? 0.36 : d <= r * 1.18 ? 0.18 : 0;
      if (a > 0) img.set(x, y, [colour[0], colour[1], colour[2], Math.round(255 * a * strength)]);
    }
  return img;
}

/** A 4-point star: arms of `arm` pixels, white core, gold (or `col`) arms. */
export function star(img: Img, x: number, y: number, arm: number, col: RGBA = GOLD20[6], core: RGBA = WHITE): void {
  x = Math.round(x);
  y = Math.round(y);
  for (let k = 1; k <= arm; k++) {
    const c = k === 1 ? core : k === arm ? mixc(col, GOLD20[4], 0.5) : col;
    img.set(x + k, y, c);
    img.set(x - k, y, c);
    img.set(x, y + k, c);
    img.set(x, y - k, c);
  }
  if (arm >= 3) {
    img.set(x + 1, y + 1, col);
    img.set(x - 1, y - 1, col);
    img.set(x + 1, y - 1, col);
    img.set(x - 1, y + 1, col);
  }
  img.set(x, y, core);
}

/** Thin tapering rays from the centre (behind the die), `n` of them, turned by `turn` radians. */
export function rays(img: Img, cx: number, cy: number, n: number, r0: number, r1: number, width: number, turn: number, col: RGBA, core: RGBA): void {
  for (let i = 0; i < n; i++) {
    const a = turn + (i * Math.PI * 2) / n;
    const long = i % 2 === 0 ? 1 : 0.62;
    const end = r0 + (r1 - r0) * long;
    const dx = Math.cos(a), dy = Math.sin(a);
    for (let t = r0; t <= end; t += 0.35) {
      const w = width * (1 - (t - r0) / (end - r0 + 0.001)) * long;
      for (let s = -w; s <= w; s += 0.35) {
        const x = Math.floor(cx + dx * t - dy * s), y = Math.floor(cy + dy * t + dx * s);
        img.set(x, y, Math.abs(s) < Math.max(0.5, w * 0.35) ? core : col);
      }
    }
  }
}

/** Lays `die` (a Rendered in its own frame) into `img` with its centre at (cx, cy). */
function lay(img: Img, die: Rendered, cx: number, cy: number): void {
  img.draw(die.img, Math.round(cx - die.centre[0]), Math.round(cy - die.centre[1]));
}

/** A diagonal shine band over the die's own pixels: `pos` 0..1 from upper left to lower right. */
function shine(img: Img, die: Rendered, ox: number, oy: number, pos: number, width: number): void {
  const w = die.img.w, h = die.img.h;
  const span = w + h;
  const at = -0.15 * span + pos * span * 1.3;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (die.faceAt[y * w + x] < 0) continue;
      const d = x + y - at;
      if (d < 0 || d >= width) continue;
      const c = img.get(ox + x, oy + y);
      img.set(ox + x, oy + y, d < width * 0.45 ? WHITE : mixc(c, WHITE, 0.6));
    }
}

// --- natural 20 ----------------------------------------------------------------------------------

/**
 * The natural 20: a white-gold flash, rays and sparkles bursting out, the die turned to gold with a
 * shine sweeping across it, then the die's own colours back with the 20 left in gold.
 */
export function nat20Frames(style: StyleId, size: Size): FxFrame[] {
  const z = SIZES[size], W = z.fx, c = W / 2, big = size === 'big';
  const out: FxFrame[] = [];
  const r = lcg(2020 + (big ? 1 : 0));
  // Sparkles: angle, speed, size, twinkle phase.
  const sparks = Array.from({ length: big ? 12 : 8 }, (_, i) => ({ a: (i / (big ? 12 : 8)) * Math.PI * 2 + r() * 0.4, v: 0.75 + r() * 0.5, arm: big ? 2 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2), ph: Math.floor(r() * 3) }));
  const steps: { look: Look; gold: number; grow: number; rays: number; shine: number | null; spark: number; ms: number; halo: number }[] = [
    { look: 'flash', gold: 1, grow: 1.14, rays: 1, shine: null, spark: 0, ms: 50, halo: 1 },
    { look: 'gold', gold: 1, grow: 1.09, rays: 0.9, shine: null, spark: 0.15, ms: 50, halo: 1 },
    { look: 'gold', gold: 1, grow: 1.04, rays: 0.72, shine: null, spark: 0.3, ms: 50, halo: 0.9 },
    { look: 'gold', gold: 1, grow: 1, rays: 0.55, shine: 0, spark: 0.45, ms: 50, halo: 0.8 },
    { look: 'gold', gold: 1, grow: 1, rays: 0.4, shine: 0.25, spark: 0.58, ms: 50, halo: 0.75 },
    { look: 'gold', gold: 1, grow: 1, rays: 0.28, shine: 0.5, spark: 0.7, ms: 50, halo: 0.7 },
    { look: 'gold', gold: 1, grow: 1, rays: 0.16, shine: 0.75, spark: 0.8, ms: 50, halo: 0.65 },
    { look: 'gold', gold: 0.75, grow: 1, rays: 0, shine: 1, spark: 0.88, ms: 60, halo: 0.6 },
    { look: 'gold', gold: 0.5, grow: 1, rays: 0, shine: null, spark: 0.95, ms: 70, halo: 0.45 },
    { look: 'gold', gold: 0.25, grow: 1, rays: 0, shine: null, spark: 1, ms: 80, halo: 0.3 },
    { look: 'normal', gold: 0, grow: 1, rays: 0, shine: null, spark: -1, ms: 0, halo: 0.2 },
  ];
  steps.forEach((s, i) => {
    const img = new Img(W, W);
    if (s.halo) img.draw(halo(W, z.R * 1.25, GOLD20[6], s.halo), 0, 0);
    if (s.rays > 0) rays(img, c, c, 12, z.R * 0.6, z.R * (1.25 + 0.9 * s.rays), (big ? 3.2 : 1.6) * s.rays + 0.6, i * 0.06, GOLD20[6], WHITE);
    const die = restDie(20, { style, size, look: s.look, goldness: s.gold, grow: s.grow, numberGold: true, box: z.box + 8 });
    lay(img, die, c, c);
    if (s.shine !== null) shine(img, die, Math.round(c - die.centre[0]), Math.round(c - die.centre[1]), s.shine, big ? 7 : 3);
    if (s.spark >= 0)
      for (const p of sparks) {
        const t = s.spark;
        const dist = z.R * (0.9 + 1.0 * p.v * t);
        // Twinkle: each sparkle's arms grow and shrink on its own beat; they shrink away at the end.
        const tw = [1, 0.6, 0.85][(i + p.ph) % 3];
        const arm = Math.max(0, Math.round(p.arm * tw * (t > 0.85 ? (1 - t) / 0.15 + 0.3 : 1)));
        if (t > 0 && arm > 0) star(img, c + Math.cos(p.a) * dist, c + Math.sin(p.a) * dist, arm);
      }
    out.push({ img, ms: s.ms });
  });
  return out;
}

// --- natural 1 ------------------------------------------------------------------------------------

/** The crack across the landed face, as a jagged path in the die frame's pixels. */
function crackPath(die: Rendered, size: Size): [number, number][] {
  const fi = faceOf(1);
  const [a, b, c] = FACES[fi].v.map((i) => die.proj[i]);
  // From near the top corner, down past the right of the number to the lower right edge.
  const top: [number, number] = [a[0] + (b[0] - a[0]) * 0.12 + 1, a[1] + (b[1] - a[1]) * 0.12];
  const end: [number, number] = [b[0] - (b[0] - c[0]) * 0.18, b[1] + (size === 'big' ? 6 : 3)];
  const r = lcg(111 + (size === 'big' ? 1 : 0));
  const n = size === 'big' ? 8 : 4;
  const pts: [number, number][] = [top];
  let side = 1;
  for (let i = 1; i < n; i++) {
    const t = (i + (r() - 0.5) * 0.5) / n;
    // Uneven zigzag: it mostly alternates, sometimes runs on the same way.
    if (r() < 0.75) side = -side;
    const jig = side * (size === 'big' ? 1.2 + r() * 2.4 : 0.6 + r() * 0.9);
    pts.push([top[0] + (end[0] - top[0]) * t + jig + (size === 'big' ? 5 : 2.5) * Math.sin(t * Math.PI), top[1] + (end[1] - top[1]) * t]);
  }
  pts.push(end);
  return pts;
}

function drawCrack(img: Img, die: Rendered, ox: number, oy: number, pts: [number, number][], upto: number): void {
  const w = die.img.w;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < die.img.h && die.faceAt[y * w + x] >= 0;
  const total = pts.length - 1;
  const segs = Math.floor(total * upto);
  for (let i = 0; i < segs; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 1.5) + 1;
    for (let k = 0; k <= n; k++) {
      const x = Math.floor(x0 + ((x1 - x0) * k) / n), y = Math.floor(y0 + ((y1 - y0) * k) / n);
      if (!inside(x, y)) continue;
      img.set(ox + x, oy + y, DULL1[0]);
      // The broken edge catches the light on its upper-left lip.
      if (inside(x - 1, y) && img.get(ox + x - 1, oy + y)[0] !== DULL1[0][0]) img.set(ox + x - 1, oy + y, DULL1[7]);
    }
  }
}

/**
 * The natural 1: the die drains to a dull red with a shudder, a crack runs across its face, two
 * chips fall away with a puff of grey dust, and it stays cracked.
 */
export function nat1Frames(style: StyleId, size: Size): FxFrame[] {
  const z = SIZES[size], W = z.fx, c = W / 2, big = size === 'big';
  const steps: { look: Look; crack: number; shake: number; chips: number; puff: number; ms: number }[] = [
    { look: 'dull', crack: 0, shake: 1, chips: -1, puff: -1, ms: 50 },
    { look: 'dull', crack: 0.4, shake: -1, chips: -1, puff: -1, ms: 50 },
    { look: 'dull', crack: 0.75, shake: 1, chips: 0, puff: 0, ms: 50 },
    { look: 'dull', crack: 1, shake: 0, chips: 1, puff: 1, ms: 60 },
    { look: 'dull', crack: 1, shake: 0, chips: 2, puff: 2, ms: 70 },
    { look: 'dull', crack: 1, shake: 0, chips: 3, puff: 3, ms: 70 },
    { look: 'dull', crack: 1, shake: 0, chips: 4, puff: -1, ms: 80 },
    { look: 'dull', crack: 1, shake: 0, chips: -1, puff: -1, ms: 0 },
  ];
  const k = z.k;
  return steps.map((s) => {
    const img = new Img(W, W);
    const die = restDie(1, { style, size, look: s.look, box: z.box + 8 });
    const ox = Math.round(c - die.centre[0]), oy = Math.round(c - die.centre[1]);
    img.draw(die.img, ox, oy);
    const pts = crackPath(die, size);
    if (s.crack > 0) drawCrack(img, die, ox, oy, pts, s.crack);
    // Chips: little shards from the crack's lower end, falling and turning.
    if (s.chips >= 0) {
      const [ex, ey] = pts[Math.floor(pts.length * 0.7)];
      const chips = [
        { vx: 1.5, vy: -1.4, sz: big ? 3 : 2 },
        { vx: 0.6, vy: -0.8, sz: big ? 2 : 1 },
      ];
      for (const ch of chips) {
        const t = s.chips;
        const x = Math.round(ox + ex + ch.vx * t * 2.2 * k), y = Math.round(oy + ey + (ch.vy * t + 0.75 * t * t) * 2.2 * k);
        // A little triangle shard, turning over as it falls: lit edge, body, dark rim.
        const flip = t % 2 === 1;
        const shard: [number, number][] = [];
        for (let yy = 0; yy < ch.sz; yy++) for (let xx = 0; xx < ch.sz; xx++) if (flip ? xx >= yy : xx <= yy) shard.push([xx, yy]);
        for (const [xx, yy] of shard)
          for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
            if (!shard.some(([qx, qy]) => qx === xx + ax && qy === yy + ay)) img.set(x + xx + ax, y + yy + ay, DULL1[0]);
        for (const [xx, yy] of shard) img.set(x + xx, y + yy, xx + yy === 0 || (flip && yy === 0) ? DULL1[8] : DULL1[5]);
      }
    }
    // Grey grit where the face split, drifting up and thinning.
    if (s.puff >= 0) {
      const [px, py] = pts[0];
      const puff = [hex('#a59c8e', 230), hex('#857c70', 200), hex('#655d54', 160), hex('#4d4740', 120)];
      const grit = [[-1.2, -1.0], [0.4, -1.6], [1.5, -0.7], [-0.3, -2.2]];
      grit.forEach(([gx, gy], i) => {
        if (i > 3 - Math.floor(s.puff / 2)) return;
        const t = s.puff + 1;
        const x = Math.round(ox + px + gx * t * 1.3 * k), y = Math.round(oy + py + gy * t * 1.1 * k);
        const sz = big ? (s.puff < 2 ? 2 : 1) : 1;
        for (let yy = 0; yy < sz; yy++) for (let xx = 0; xx < sz; xx++) img.plot(x + xx, y + yy, puff[Math.min(3, s.puff)]);
      });
    }
    return { img, ms: s.ms, dx: s.shake * (big ? 2 : 1) };
  });
}

// --- the die advantage did not keep ---------------------------------------------------------------

export function dimDie(result: number, style: StyleId, size: Size): Img {
  return restDie(result, { style, size, look: 'dim' }).img;
}

// --- shadow and dust ------------------------------------------------------------------------------

/**
 * The die's shadow on the ground, `w` wide: soft and pale high in the air; on the ground (`contact`)
 * it tightens, with a dark core where the die touches (the ambient occlusion under it).
 */
export function shadowSprite(w: number, contact = false): Img {
  const h = Math.max(3, Math.round(w / 4));
  const img = new Img(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5 - w / 2) / (w / 2), v = (y + 0.5 - h / 2) / (h / 2);
      const q = u * u + v * v;
      const core = contact && (u * 1.6) ** 2 + ((v + 0.15) * 1.3) ** 2 <= 1;
      if (core) img.set(x, y, hex('#07060b', 175));
      else if (q <= 0.5) img.set(x, y, hex('#07060b', contact ? 125 : 105));
      else if (q <= 1) img.set(x, y, hex('#07060b', contact ? 70 : 55));
    }
  return img;
}

/** A dust puff where the die hits the ground: `strength` 1..3, frame 0..3. */
export function dustSprite(size: Size, strength: number, frame: number): Img {
  const k = SIZES[size].k;
  const W = Math.round(40 * k), H = Math.round(12 * k);
  const img = new Img(W, H);
  const cols = [hex('#e9dfc6', 230), hex('#bdb39b', 200), hex('#8e8676', 160), hex('#6a6357', 110)];
  const r = lcg(77 + strength * 5);
  const n = 3 + strength * 2;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const sp = 0.6 + r() * 0.7;
    const x = W / 2 + side * (3 + (frame + 1) * 3.2 * sp * (0.5 + strength * 0.25)) * k;
    const y = H - 2 * k - (frame * 1.3 * sp + r() * 1.5) * k;
    const sz = Math.max(0, Math.round(((size === 'big' ? 3.4 : 1.4) * (1 - frame / 4) + strength * 0.2) * (0.7 + r() * 0.5)));
    const col = cols[Math.min(3, frame)];
    for (let yy = 0; yy <= sz; yy++) for (let xx = 0; xx <= sz; xx++) if (xx + yy <= sz + 1) img.plot(x + xx, y - yy, col);
  }
  return img;
}

export { IDENTITY, STYLES };
