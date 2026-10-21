// =============================================================================================
// PHOENIX (fire)
// =============================================================================================
//
// The owner's phoenix (his reference sheet): a majestic bird of prey, chest up and head high, both
// wings raised in a V in the key pose. Every wing is built feather by feather, so each one reads on
// its own: long primaries fanned at the tips, the secondaries along the arm, a row of greater coverts
// over their roots and small marginal coverts on the leading edge. The feathers are orange and gold
// with yellow edges, crimson at the roots and on the far wing, and end in flickering flame tips. The
// body is deep red with an orange breast of scalloped feathers; the head is an eagle in profile with
// a hooked yellow-orange beak, a fierce eye under a heavy brow and a crest of flame feathers. The
// legs hang with the talons spread, and a long tail of four flame plumes with yellow cores streams
// down and back and curls up at the tips. Embers drift off the wings and the tail.
//
// Three animations share one frame: 'fly' (8 frames: the V, the down-sweep with the wingtips curling
// in, a glide with the wings level and back, rising again, a dark smoky trail starting behind the
// tail), 'dive' (a steep glide with the wings swept back, looping) and 'attack' (once: wings up, the
// head rears and spits a fireball forward).

const PHX = (() => ({
  ramp: ['#3a0610', '#640c16', '#921420', '#be2218', '#e44818', '#f6801e', '#ffb232', '#ffdc66', '#fff4be'].map((c) => hex(c)) as Color[],
  outline: hex('#4a0810'),
  line: hex('#6a0c16'),
  beak: ['#7a3008', '#b86010', '#ec9a1e', '#ffcc4a', '#fff0a0'].map((c) => hex(c)) as Color[],
  talon: [hex('#3a0a08'), hex('#6a2410')] as Color[],
  eye: [hex('#3a0608'), hex('#ffcc3a'), hex('#fff6c8')] as Color[],
  smoke: [hex('#3c302c'), hex('#5a4a42'), hex('#7a665a')] as Color[],
}))();

interface PhxPose {
  /** Body rotation (radians, negative lifts the chest) and bob (px, negative rises). */
  pitch: number;
  bob: number;
  /** Near and far wing: arm and hand directions (degrees on screen: -90 up, 180 back), spread 0..1. */
  arm: number;
  hand: number;
  spread: number;
  farArm: number;
  farHand: number;
  farSpread: number;
  /** Extra head tilt (radians, positive looks down) and how wide the beak is open (0..1). */
  head: number;
  beak: number;
  /** Tail: turn of the plumes (degrees, negative streams them higher). */
  tail: number;
  /** Smoky trail behind the tail (0..1), and a fireball ahead of the beak: [distance px, radius px]. */
  smoke: number;
  fire?: [number, number];
}
const PHX_BASE = { pitch: -0.38, bob: 0, spread: 1, farSpread: 1, head: 0, beak: 0.15, tail: 0, smoke: 0 };
// The owner's loop: the V (0), sweeping forward and down with the wingtips curling in (1-2), a glide
// with the wings level and back (3-4), rising again (5-6), the smoke trail starting (6-7).
const PHX_FLY: PhxPose[] = [
  { ...PHX_BASE, arm: -104, hand: -124, farArm: -62, farHand: -80, bob: 1 },
  { ...PHX_BASE, arm: -132, hand: 160, spread: 0.85, farArm: 18, farHand: 52, farSpread: 0.8, bob: -1, pitch: -0.32 },
  { ...PHX_BASE, arm: -158, hand: 132, spread: 0.8, farArm: 34, farHand: 68, farSpread: 0.75, bob: -2, pitch: -0.28, tail: 6 },
  { ...PHX_BASE, arm: 176, hand: 172, spread: 0.9, farArm: 22, farHand: 34, farSpread: 0.85, bob: -1, pitch: -0.18, tail: -8 },
  { ...PHX_BASE, arm: -164, hand: -172, spread: 1, farArm: -14, farHand: -6, farSpread: 0.9, bob: 0, pitch: -0.2, tail: -4 },
  { ...PHX_BASE, arm: -134, hand: -150, farArm: -42, farHand: -58, bob: 1, pitch: -0.3 },
  { ...PHX_BASE, arm: -108, hand: -128, farArm: -66, farHand: -84, bob: 2, smoke: 0.6 },
  { ...PHX_BASE, arm: -168, hand: -176, spread: 0.95, farArm: -24, farHand: -16, farSpread: 0.9, bob: 0, pitch: -0.2, tail: -6, smoke: 1 },
];
// A steep dive: nose down, wings swept back, the tail streaming above.
const PHX_DIVE: PhxPose[] = [0, 1, 2, 3, 4].map((k) => {
  const w = Math.sin((k / 5) * TAU);
  return { ...PHX_BASE, pitch: 0.55, bob: 0, arm: -164 + w * 4, hand: -174 + w * 6, spread: 0.55, farArm: -146 + w * 4, farHand: -158 + w * 5, farSpread: 0.5, head: -0.25, beak: 0.1, tail: -52 + w * 4, smoke: 0 };
});
// Attack (once): wings up, the head rears back, lunges and spits a fireball, then settles.
const PHX_ATTACK: PhxPose[] = [
  { ...PHX_BASE, arm: -112, hand: -132, farArm: -66, farHand: -84, head: -0.2, beak: 0.2 },
  { ...PHX_BASE, arm: -100, hand: -118, farArm: -58, farHand: -74, head: -0.42, beak: 0.6, bob: 1, fire: [4, 2.5] },
  { ...PHX_BASE, arm: -104, hand: -122, farArm: -60, farHand: -78, head: 0.18, beak: 1, bob: 0, fire: [9, 4.5] },
  { ...PHX_BASE, arm: -110, hand: -130, farArm: -64, farHand: -82, head: 0.12, beak: 0.8, fire: [30, 6] },
  { ...PHX_BASE, arm: -128, hand: -148, farArm: -46, farHand: -62, head: 0.05, beak: 0.4, fire: [50, 5] },
  { ...PHX_BASE, arm: -112, hand: -132, farArm: -64, farHand: -82, head: 0, beak: 0.15 },
];

/** Heat (0 crimson shadow .. 1 white-yellow) to the phoenix ramp. */
const phxHeat = (heat: number, x: number, y: number, seed: number): Color => {
  const v = heat + (noise(x, y, 2.2, seed) - 0.5) * 0.05;
  let s = 0;
  for (const c of [0.1, 0.2, 0.31, 0.43, 0.55, 0.67, 0.79, 0.91]) if (v >= c) s++;
  return PHX.ramp[s];
};

/** A flight feather: crimson at the root, orange and gold toward the edges and the flame tip, a dark shaft. */
function phxFeather(seed: number, far: boolean, hot = 0) {
  return (h: Hit): Color => {
    const L = lit(h, 0.4);
    let heat = 0.3 + h.u * 0.32 + smooth(0.45, 1, Math.abs(h.v)) * 0.2 + (L - 0.5) * 0.34 + hot - (far ? 0.18 : 0);
    if (h.u > 0.8) heat += (h.u - 0.8) * 1.2;
    if (Math.abs(h.v) < 0.13 && h.u > 0.05 && h.u < 0.8) heat -= 0.12;
    return phxHeat(heat, h.x, h.y, seed);
  };
}

/** Fire: a yellow core, orange, red at the rim; brighter toward the tip. */
function phxFlame(seed: number, far = false) {
  return (h: Hit): Color => phxHeat(0.42 + (1 - Math.abs(h.v)) * 0.5 + h.u * 0.08 - (far ? 0.14 : 0), h.x, h.y, seed);
}

/** The side of a wing bone its trailing feathers grow toward: the perpendicular nearest straight back. */
function trailSide(arm: number): number {
  const back = (a: number): number => Math.abs((((a - 180) % 360) + 540) % 360 - 180);
  return back(arm + 90) <= back(arm - 90) ? 1 : -1;
}

/**
 * One phoenix wing as parts, back to front: primaries (each with a flickering flame tip), then the
 * secondaries, greater coverts and marginal coverts. Returns the feather tips (embers start there).
 */
function phxWing(f: Frame, S: P2, arm: number, hand: number, spread: number, k: number, fi: number, far: boolean): P2[] {
  const style = { outline: PHX.outline, line: PHX.line, solid: 150 };
  const sg = trailSide(arm);
  const tr = arm + sg * 90;
  const fa = 20 * k, ha = 13 * k * (0.75 + 0.25 * spread);
  const Wr: P2 = [S[0] + dirOf(arm)[0] * fa, S[1] + dirOf(arm)[1] * fa];
  const T: P2 = [Wr[0] + dirOf(hand)[0] * ha, Wr[1] + dirOf(hand)[1] * ha];
  const tips: P2[] = [];
  const flick = (j: number): number => noise(j * 3.1, fi * 1.7, 1, 4400 + (far ? 50 : 0));
  // Primaries: long and separate, fanned apart at the tips; the outermost lies along the hand.
  for (let j = 6; j >= 0; j--) {
    const u = j / 6;
    const root: P2 = [lerp(Wr[0], T[0], 1 - u * 0.8), lerp(Wr[1], T[1], 1 - u * 0.8)];
    const a = hand + sg * (4 + lerp(0, 60, u) * spread);
    const len = lerp(33, 22, u) * k * (0.82 + 0.18 * spread);
    const d = dirOf(a);
    const tip: P2 = [root[0] + d[0] * len, root[1] + d[1] * len];
    f.part_([lens(root, tip, lerp(3.2, 3, u) * k, { bend: -sg * 1 * k, peak: 0.4, tip: 1.3, base: 0.6 })], phxFeather(5000 + j, far), style);
    // The flame tip, flickering.
    const fl = (2 + flick(j) * 5) * k;
    const fd = dirOf(a - sg * (6 + flick(j + 9) * 10));
    const f0: P2 = [tip[0] - d[0] * 3 * k, tip[1] - d[1] * 3 * k];
    const fe: P2 = [f0[0] + fd[0] * (fl + 3 * k), f0[1] + fd[1] * (fl + 3 * k)];
    f.part_([lens(f0, fe, 1.6 * k, { peak: 0.3, tip: 1.6, base: 0.8, bend: sg * 0.7 })], phxFlame(5100 + j, far), style);
    tips.push(fe);
  }
  // Secondaries along the arm, trailing back, turning toward the hand near the wrist.
  for (let j = 0; j < 6; j++) {
    const u = 0.1 + j * 0.16;
    const root: P2 = [lerp(S[0], Wr[0], u), lerp(S[1], Wr[1], u)];
    const a = tr - sg * 26 * u;
    const len = (18 + (j % 2) * 2) * k * (0.85 + 0.15 * spread);
    const d = dirOf(a);
    const tip: P2 = [root[0] + d[0] * len, root[1] + d[1] * len];
    f.part_([lens(root, tip, 3.5 * k, { bend: -sg * 0.8, peak: 0.4, tip: 1.2, base: 0.7 })], phxFeather(5200 + j, far, -0.04), style);
    if (j % 2 === 0) tips.push(tip);
  }
  // Greater coverts over the roots of the secondaries and the inner primaries.
  for (let j = 0; j < 7; j++) {
    const u = j / 6;
    const root: P2 = u < 0.7 ? [lerp(S[0], Wr[0], 0.1 + (u / 0.7) * 0.9), lerp(S[1], Wr[1], 0.1 + (u / 0.7) * 0.9)] : [lerp(Wr[0], T[0], ((u - 0.7) / 0.3) * 0.6), lerp(Wr[1], T[1], ((u - 0.7) / 0.3) * 0.6)];
    const a = u < 0.7 ? tr - sg * 20 * u : hand + sg * 42;
    const d = dirOf(a);
    const len = lerp(10.5, 8.5, u) * k;
    f.part_([lens(root, [root[0] + d[0] * len, root[1] + d[1] * len], 3 * k, { peak: 0.35, tip: 1, base: 0.8, bend: -sg * 0.5 })], phxFeather(5300 + j, far, 0.02), style);
  }
  // Marginal coverts and the leading edge: small scalloped feathers, the edge lit gold.
  const marg: Prim[] = [tube([S, Wr, T], (u) => lerp(4.2, 2.1, u) * k)];
  for (let j = 0; j < 6; j++) {
    const u = j / 5;
    const root: P2 = u < 0.7 ? [lerp(S[0], Wr[0], u / 0.7), lerp(S[1], Wr[1], u / 0.7)] : [lerp(Wr[0], T[0], (u - 0.7) / 0.3), lerp(Wr[1], T[1], (u - 0.7) / 0.3)];
    const a = u < 0.7 ? tr - sg * (8 + 14 * u) : hand + sg * 62;
    const d = dirOf(a);
    marg.push(lens(root, [root[0] + d[0] * 6 * k, root[1] + d[1] * 6 * k], 2.8 * k, { peak: 0.3, tip: 0.9, base: 0.9 }));
  }
  f.part_(marg, (h) => {
    const L = lit(h, 0.4);
    const scal = fract((h.u * h.len) / (3.6 * k));
    return phxHeat(0.42 + (L - 0.5) * 0.5 + (h.k === 0 ? 0.12 : 0) + (scal > 0.72 ? -0.08 : 0) - (far ? 0.18 : 0), h.x, h.y, 5400);
  }, style);
  return tips;
}

/** One phoenix frame on a W x H canvas, the body centre at (cx, cy). */
function phxFrame(g: PhxPose, fi: number, t: number, W: number, H: number, cx: number, cy: number): Canvas {
  const K = 0.95; // wing scale
  const f = new Frame(W, H);
  const style = { outline: PHX.outline, line: PHX.line, solid: 150 };
  const cp = Math.cos(g.pitch), sp = Math.sin(g.pitch);
  const P = (x: number, y: number): P2 => [cx + x * cp - y * sp, cy + g.bob + x * sp + y * cp];
  // --- far wing, behind everything ----------------------------------------------------------
  const farTips = phxWing(f, P(6, -8), g.farArm, g.farHand, g.farSpread, K * 0.92, fi, true);
  // --- tail: four flame plumes streaming down and back, curling up at the tips -------------
  const plumeTips: P2[] = [];
  for (let i = 3; i >= 0; i--) {
    const root = P(-13, 3 + i * 0.7);
    const len = [44, 50, 47, 38][i];
    const a0 = 132 + i * 9 + g.tail - g.pitch / D2R * 0.6;
    const pts: P2[] = [root];
    let [x, y] = root;
    const n = 12;
    for (let s = 1; s <= n; s++) {
      const u = s / n;
      const a = a0 + u * (26 + i * 6) - smooth(0.55, 1, u) * (95 + i * 12) + Math.sin(TAU * t - u * 3.2 + i * 1.3) * (4 + u * 9);
      x += Math.cos(a * D2R) * (len / n);
      y += Math.sin(a * D2R) * (len / n);
      pts.push([x, y]);
    }
    plumeTips.push([x, y]);
    const seed = 6000 + i * 13;
    f.part_([tube(pts, (u) => (u < 0.68 ? lerp(2, 4.4, smooth(0, 0.68, u)) : lerp(4.4, 0.5, smooth(0.68, 1, u))))], (h) => {
      // The end breaks up into flame: ragged, flickering edges.
      if (h.u > 0.6 && Math.abs(h.v) > 0.4 && noise(h.x * 0.9 - fi * 3, h.y * 0.9, 1.6, seed) < (h.u - 0.6) * 1.5) return null;
      const core = 1 - Math.abs(h.v);
      return phxHeat(0.3 + core * 0.46 + h.u * 0.22 + (lit(h, 0.4) - 0.5) * 0.14 - (i === 3 ? 0.08 : 0), h.x, h.y, seed);
    }, style);
  }
  // --- legs hanging, talons spread ------------------------------------------------------------
  const leg = (hip: P2, far: boolean): void => {
    const knee = P(hip[0] + 2, hip[1] + 4);
    const foot = P(hip[0] + 5, hip[1] + 10);
    f.part_([blob(...P(hip[0], hip[1]), 4.4, 4, g.pitch + 0.5)], (h) => phxHeat(0.3 + (lit(h) - 0.5) * 0.4 - (far ? 0.14 : 0), h.x, h.y, 6100), style);
    f.part_([tube([knee, foot], () => 1.3)], (h) => PHX.beak[clamp(stepOf(lit(h), h.x, h.y) - (far ? 2 : 1), 0, 3)], style);
    const toes: Prim[] = [], claws: Prim[] = [];
    for (const [a, l] of [[20, 4.2], [55, 4.4], [92, 3.8], [200, 2.8]] as P2[]) {
      const d = dirOf(a + g.pitch / D2R * 0.5);
      const e: P2 = [foot[0] + d[0] * l, foot[1] + d[1] * l];
      toes.push(tube([foot, e], () => 0.9));
      const c = dirOf(a + 60);
      claws.push(lens(e, [e[0] + c[0] * 2.6, e[1] + c[1] * 2.6], 0.85, { tip: 1.2, base: 1, bend: 0.6 }));
    }
    f.part_(toes, (h) => PHX.beak[clamp(stepOf(lit(h), h.x, h.y) - (far ? 2 : 1), 0, 3)], style);
    f.part_(claws, (h) => PHX.talon[h.v < 0 ? 1 : 0], style);
  };
  leg([-3, 6], true);
  // --- body, neck and head as one smooth volume ---------------------------------------------------
  const HD = P(17, -13);
  const ht = g.pitch * 0.45 + g.head + 0.08;
  const hc = Math.cos(ht), hs = Math.sin(ht);
  const HZ = (x: number, y: number): P2 => [HD[0] + x * hc - y * hs, HD[1] + x * hs + y * hc];
  f.part_([fused([
    blob(...P(-1, 0), 14, 9, g.pitch),
    blob(...P(7, -1), 9, 8.6, g.pitch - 0.3),
    blob(...P(-10, 2), 7, 6, g.pitch),
    tube([P(8, -5), P(13, -10), HZ(-1, 1)], (u) => lerp(5.6, 4.6, u)),
    blob(HD[0], HD[1], 6, 5.4, ht),
  ], 3)], (h) => {
    const L = lit(h, 0.4);
    // Orange breast of scalloped feathers in front and below; the back deep red.
    const lx = (h.x - cx) * cp + (h.y - cy - g.bob) * sp, ly = -(h.x - cx) * sp + (h.y - cy - g.bob) * cp;
    const breast = smooth(-1, 9, lx) * smooth(-7, 3, ly) * (1 - smooth(14, 20, lx));
    const row = Math.floor((ly + 40) / 3);
    const sc = fract((lx + 40 + (row % 2) * 2) / 4), sy = fract((ly + 40) / 3);
    const scallop = sy > 0.6 + Math.abs(sc - 0.5) * 0.6 ? -0.1 : 0;
    return phxHeat(0.3 + (L - 0.5) * 0.48 + breast * 0.24 + scallop * (0.4 + breast), h.x, h.y, 6300);
  }, style);
  // Crest: flame feathers off the back of the head.
  const ruffle = (j: number): number => noise(j * 2.3, fi * 1.9, 1, 6200);
  for (let j = 0; j < 4; j++) {
    const r = HZ(-2 - j * 1.5, -3.5 + j * 1.1);
    const a = -128 - j * 13 + (ruffle(j) - 0.5) * 14 + ht / D2R;
    const l = (9 - j * 1.4) * (0.85 + ruffle(j + 5) * 0.3);
    const d = dirOf(a);
    f.part_([lens(r, [r[0] + d[0] * l, r[1] + d[1] * l], 2, { peak: 0.3, tip: 1.6, bend: 0.7 })], phxFlame(6400 + j), style);
  }
  // Beak: the lower mandible (it drops as the beak opens), the mouth, then the hooked upper mandible.
  const lowA = 0.32 + g.beak * 0.5;
  const lowEnd: P2 = [HZ(2.6, 1.6)[0] + Math.cos(ht + lowA) * 7, HZ(2.6, 1.6)[1] + Math.sin(ht + lowA) * 7];
  if (g.beak > 0.3) f.part_([poly([HZ(3, 0.8), HZ(9.5, 2.6), lowEnd, HZ(3, 2.4)])], () => PHX.ramp[1], { outline: null, line: null });
  f.part_([lens(HZ(2.6, 1.6), lowEnd, 1.4, { peak: 0.2, tip: 0.8, base: 1 })], (h) => PHX.beak[clamp(stepOf(lit(h), h.x, h.y) - 1, 0, 3)], style);
  f.part_([lens(HZ(2.4, -1.6), HZ(10.5, 3.6), 2.7, { peak: 0.2, tip: 1, base: 1, bend: -1.5 })], (h) => PHX.beak[clamp(stepOf(lit(h), h.x, h.y) + (h.v < -0.3 ? 1 : 0), 1, 4)], style);
  // A heavy brow over the eye.
  f.part_([lens(HZ(-1.5, -3.8), HZ(5, -2.2), 1.6, { peak: 0.5, tip: 0.8, base: 0.8, bend: -0.5 })], (h) => phxHeat(0.46 + (lit(h) - 0.5) * 0.4, h.x, h.y, 6500), style);
  // --- near leg and the near wing in front ------------------------------------------------------
  leg([1, 6], false);
  const tips = phxWing(f, P(2, -7), g.arm, g.hand, g.spread, K, fi, false);
  const fc = f.finish();
  // The fierce eye: gold iris, a dark pupil, a glint, under the brow's shadow.
  const [ex, ey] = HZ(1.8, -1.2).map(Math.round);
  for (const [dx, dy, c] of [[-1, -1, PHX.outline], [0, -1, PHX.outline], [1, -1, PHX.outline], [2, -1, PHX.line], [-1, 0, PHX.eye[1]], [0, 0, PHX.eye[2]], [1, 0, PHX.eye[0]], [2, 0, PHX.eye[1]], [0, 1, PHX.eye[1]], [1, 1, PHX.eye[1]]] as [number, number, Color][]) fc.set(ex + dx, ey + dy, c);
  // A smoky trail behind the tail, under the bird.
  if (g.smoke > 0) {
    for (let k = 0; k < 9; k++) {
      const p = (k + 0.5) / 9;
      const s = plumeTips[k % plumeTips.length];
      const x0 = s[0] - 4 - p * 30 + Math.sin(k * 2.1 + fi) * 3, y0 = s[1] - 2 + Math.sin(k * 1.3 + fi * 0.7) * 4 - p * 4;
      const r = (2 + p * 4) * g.smoke;
      for (let y = Math.floor(y0 - r); y <= y0 + r; y++)
        for (let x = Math.floor(x0 - r * 1.5); x <= x0 + r * 1.5; x++) {
          const d = ((x - x0) / 1.5) ** 2 + (y - y0) ** 2;
          if (d > r * r || fc.alpha(x, y) > 0) continue;
          if (noise(x * 0.8 + fi * 2, y * 0.8, 2, 6600 + k) < 0.35) continue;
          fc.plot(x, y, wa(PHX.smoke[d < r * r * 0.3 ? 1 : d < r * r * 0.7 ? 0 : 2], (170 - p * 90) * g.smoke));
        }
    }
  }
  // Embers drifting back and up off the wing tips and the tail.
  const src = [...tips, ...farTips, ...plumeTips];
  for (let k = 0; k < 16; k++) {
    const p = fract(k / 16 + t + rnd(71, k) * 0.3);
    const s = src[(k * 5) % src.length];
    const X = Math.round(s[0] - 3 - p * 18 + (rnd(72, k) - 0.5) * 8), Y = Math.round(s[1] - p * 9 + (rnd(73, k) - 0.5) * 8);
    if (X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1 || fc.alpha(X, Y) > 200) continue;
    const col = p < 0.35 ? PHX.ramp[8] : p < 0.7 ? PHX.ramp[6] : PHX.ramp[4];
    fc.plot(X, Y, wa(col, 255 * (1 - p * 0.55)));
    if (k % 3 === 0 && p < 0.5 && !fc.alpha(X + 1, Y)) fc.plot(X + 1, Y, wa(PHX.ramp[5], 180));
  }
  // The fireball spat from the beak: a white-yellow core, orange, a red rim, a short flame trail.
  if (g.fire) {
    const [dist, r] = g.fire;
    const m = HZ(10, 3);
    const fx = m[0] + dist, fy = m[1] + dist * 0.12;
    for (let y = Math.floor(fy - r - 2); y <= fy + r + 2; y++)
      for (let x = Math.floor(fx - r - 9); x <= fx + r + 2; x++) {
        const dx = x + 0.5 - fx, dy = y + 0.5 - fy;
        // An egg: round in front, drawn out into a trail behind.
        const e = dx >= 0 ? Math.hypot(dx, dy) / r : Math.hypot(dx / (1 + Math.min(2.2, dist / 12)), dy) / (r * (1 + dx / (r * 6)));
        if (e > 1.15) continue;
        const flick = (noise(x * 1.2 - fi * 5, y * 1.2, 1.4, 6700) - 0.5) * 0.3;
        const heat = 1.02 - e * 0.62 + flick;
        if (e > 1 && heat < 0.42) continue;
        fc.set(x, y, e > 1 ? PHX.outline : phxHeat(heat, x, y, 6710));
      }
    for (let k = 0; k < 5; k++) {
      const X = Math.round(fx - r - 3 - rnd(6720 + fi, k) * 10), Y = Math.round(fy + (rnd(6730 + fi, k) - 0.5) * r * 2.4);
      if (!fc.alpha(X, Y)) fc.set(X, Y, k % 2 ? PHX.ramp[7] : PHX.ramp[5]);
    }
  }
  return fc;
}

/** A beast with several animations sharing one frame: crops all of them to their union. */
function beastSprite(name: string, label: string, meters: [number, number], anims: [string, Canvas[], number, boolean][], ax: number, ay: number): WorldSprite {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [, frames] of anims)
    for (const f of frames) {
      const b = f.bounds();
      if (!b) continue;
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]);
      y1 = Math.max(y1, b[3]);
    }
  x0 -= 1;
  y0 -= 1;
  x1 += 1;
  y1 += 1;
  const crop = (f: Canvas): Canvas => {
    const c = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
    c.draw(f, -x0, -y0);
    return c;
  };
  const out: WorldSprite['anims'] = {};
  for (const [key, frames, fps, loop] of anims) out[key] = { frames: frames.map(crop), fps, loop };
  return { name, label, meters, anchor: [Math.round(ax - x0), Math.round(ay - y0)], tags: ['vfx'], anims: out };
}

function phoenix(): WorldSprite {
  const W = 260, H = 220, cx = 120, cy = 110;
  const render = (poses: PhxPose[]): Canvas[] => poses.map((g, i) => phxFrame(g, i, i / poses.length, W, H, cx, cy));
  return beastSprite('fire', 'Phoenix (fire)', [2, 1.9], [['fly', render(PHX_FLY), 12, true], ['dive', render(PHX_DIVE), 12, true], ['attack', render(PHX_ATTACK), 12, false]], cx, cy);
}

