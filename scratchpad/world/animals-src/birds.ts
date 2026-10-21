// =============================================================================================
// BIRDS (crow, sparrow)
// =============================================================================================
//
// One rig for both: an egg-shaped body, a round head, a beak in two mandibles (so it can open),
// a folded wing over the flank and a tail of stacked feathers. In flight the wings are flat
// planforms (arm and fingered hand) rotated about the body axis and projected through the
// battle camera, so a flap shows the far wing over the back and the near wing sweeping below.

interface BirdPose {
  body: { c: P2; r: P3; a: number };
  head: { c: P2; r: P2 };
  /** Beak base, direction (radians), length, base radius, opening (radians). */
  beak: { base: P2; a: number; len: number; r: number; open: number };
  tail: { base: P2; tip: P2; w: number };
  /** Folded wing (perched); omitted in flight. */
  wing?: { base: P2; tip: P2; w: number };
  /** Legs: hip and foot (perched); omitted in flight. */
  legs?: { hip: P2; foot: P2; toe: number };
  eye: P2;
  /** Eye closed. */
  blink?: boolean;
}

interface BirdStyle {
  W: number;
  H: number;
  ox: number;
  gy: number;
  body: number;
  wing: number;
  beak: number;
  leg: number;
  cuts: number[];
  /** Extra per-part paint (pattern: cheeks, bib, streaks). */
  paintBody?: (lx: number, ly: number, h: Hit) => [number, number] | number | null;
  paintHead?: (lx: number, ly: number, h: Hit) => [number, number] | number | null;
  paintWing?: (t: number, across: number, h: Hit) => [number, number] | number | null;
  paintTail?: (t: number, across: number, h: Hit) => [number, number] | number | null;
  /** Feather fingers on the flight wing. */
  fingers: number;
  eyeDots: (b: Buf, x: number, y: number, blink: boolean) => void;
  /** Glossy rim light color step on the crest (crow sheen). */
  sheen?: boolean;
  jitter: number;
}

/** Flattens a shape along z (a feather tail, a folded wing). */
function flatZ(p: Prim, kz: number, zc: number): Prim {
  return { sd: (x, y, z) => p.sd(x, y, zc + (z - zc) / kz) * kz, box: [p.box[0], p.box[1], zc - (zc - p.box[2]) * kz, p.box[3], p.box[4], zc + (p.box[5] - zc) * kz] };
}

/** Position along a segment (0..1) and signed distance across it (+ = below/right of a->b). */
function along(x: number, y: number, a: P2, b: P2): [number, number] {
  const ex = b[0] - a[0], ey = b[1] - a[1], el = Math.hypot(ex, ey) || 1;
  const vx = x - a[0], vy = y - a[1];
  return [(vx * ex + vy * ey) / (el * el), (vx * -ey + vy * ex) / -el];
}

interface WingFrame {
  /** Arm and hand angles above horizontal (radians). */
  arm: number;
  hand: number;
  /** Span multiplier (the wing folds a little on the upstroke) and sweep back of the tip (px). */
  span: number;
  sweep: number;
}

/** Camera elevation used for the flight wings (a lower angle than the ground plane reads better). */
const WING_ELEV = rad(30);

/** Screen offset of a point `d` px out along a wing raised `th` (near side = toward the viewer). */
function wingDir(th: number, near: boolean): number {
  return -Math.sin(th) * Math.cos(WING_ELEV) + (near ? 1 : -1) * Math.cos(th) * Math.sin(WING_ELEV);
}

/** Light on a flat wing panel raised `th`, seen from the camera (top or underside). */
function wingLight(th: number, near: boolean): number {
  const sgn = near ? 1 : -1;
  // World (Y up, Z toward the viewer): the panel's top normal.
  const nY = Math.cos(th), nZ = -sgn * Math.sin(th);
  // To screen space (y down, z toward the viewer) through the tilted camera.
  let sy = -nY * Math.cos(WING_ELEV) + nZ * Math.sin(WING_ELEV);
  let sz = nY * Math.sin(WING_ELEV) + nZ * Math.cos(WING_ELEV);
  if (sz < 0) {
    sy = -sy;
    sz = -sz;
  }
  return wrapLight(0, sy, sz, 0.45);
}

/**
 * A flight wing in screen space: the arm (shoulder to wrist) and the hand (wrist to tip with
 * `fingers` primaries), as polygons with feather lines. `root` is the shoulder on screen.
 */
function drawWing(b: Buf, st: BirdStyle, root: P2, len: number, chord: number, wf: WingFrame, near: boolean, layer?: number): void {
  const arm = len * 0.42 * wf.span, hand = len * 0.58 * wf.span;
  const dA = wingDir(wf.arm, near), dH = wingDir(wf.hand, near);
  const wrist: P2 = [root[0] - wf.sweep * 0.3, root[1] + dA * arm];
  const tip: P2 = [wrist[0] - wf.sweep - chord * 0.15, wrist[1] + dH * hand];
  const la = wingLight(wf.arm, near), lh = wingLight(wf.hand, near);
  // Edge-on panels keep a sliver of thickness.
  if (Math.abs(wrist[1] - root[1]) < 1.6) wrist[1] = root[1] + (dA >= 0 ? 1.6 : -1.6);
  if (Math.abs(tip[1] - wrist[1]) < 1.2) tip[1] = wrist[1] + (dH >= 0 ? 1.2 : -1.2);
  const far = near ? 0 : 1;
  const toStep = (l: number, x: number, y: number): number => clamp(quant(l, x, y, st.cuts, st.jitter, 3, 5) - far, 1, 5);
  // Arm: leading edge from shoulder to wrist, trailing edge of secondaries.
  const armPoly: P2[] = [
    [root[0] + chord * 0.35, root[1]],
    [wrist[0] + chord * 0.3, wrist[1]],
    [wrist[0] - chord * 0.75, wrist[1] + (wrist[1] - root[1]) * 0.04],
    [root[0] - chord * 0.75, root[1] + 0.5],
  ];
  const armPart = flat(b, armPoly, {
    pal: st.wing,
    layer,
    line: 0,
    step: (x, y) => {
      // Coverts: lighter band along the leading edge; secondaries darker with feather seams.
      const u = (x + 0.5 - (root[0] - chord * 0.75)) / (chord * 1.1);
      let s = toStep(la + (u > 0.62 ? 0.08 : -0.04), x, y);
      if (Math.abs(u - 0.6) < 0.06) s = Math.max(1, s - 1);
      return s;
    },
  });
  void armPart;
  // Hand: fingered primaries fanning from the wrist to the tip.
  const n = st.fingers;
  for (let i = n - 1; i >= 0; i--) {
    const f = i / Math.max(1, n - 1); // 0 = outermost (leading), 1 = innermost
    const fl = 1 - f * 0.3;
    const a0: P2 = [wrist[0] + chord * 0.25 - f * chord * 0.85, wrist[1]];
    const tipF: P2 = [tip[0] - f * chord * 0.55 - f * f * wf.sweep * 0.3, wrist[1] + (tip[1] - wrist[1]) * fl];
    const w = chord * 0.2;
    const poly: P2[] = [
      [a0[0] + w, a0[1]],
      [tipF[0] + w * 0.35, tipF[1]],
      [tipF[0] - w * 0.25, tipF[1] + (tipF[1] - a0[1]) * 0.02],
      [a0[0] - w, a0[1]],
    ];
    flat(b, poly, { pal: st.wing, layer, line: 0, step: (x, y) => toStep(lh - f * 0.05, x, y) });
  }
}

interface BirdFlight {
  wf: WingFrame;
  /** Shoulder on screen (relative to the origin), wing length and chord (px). */
  root: P2;
  len: number;
  chord: number;
}

function birdFrame(st: BirdStyle, pose: BirdPose, fl?: BirdFlight): Canvas {
  const { ox, gy } = st;
  const b = new Buf(st.W, st.H);
  const at = (p: P2, z = 0): P3 => [ox + p[0], gy + p[1], z];
  const org: P2 = [ox + pose.body.c[0], gy + pose.body.c[1]];
  const base = { pal: st.body, origin: org, jitter: st.jitter, cuts: st.cuts };
  const rootS: P2 | null = fl ? [ox + fl.root[0], gy + fl.root[1]] : null;

  // Far wing (flight), behind everything.
  if (fl && rootS) drawWing(b, st, [rootS[0] - 1, rootS[1] - 1], fl.len, fl.chord, fl.wf, false);
  // Legs and toes (thin, dark scaled skin).
  if (pose.legs) {
    const { hip, foot, toe } = pose.legs;
    const legPart = b.newPart({ line: null });
    const put = (x: number, y: number, s: number): void => {
      b.put(x, y, st.leg, s, legPart);
    };
    const line = (a: P2, c: P2, s: number): void => {
      const n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) * 2) + 1;
      for (let i = 0; i <= n; i++) put(ox + lerp(a[0], c[0], i / n), gy + lerp(a[1], c[1], i / n), s);
    };
    // Far leg one pixel back, darker.
    line([hip[0] - 1.2, hip[1]], [foot[0] - 1.2, foot[1]], 2);
    line([foot[0] - 1.2, foot[1]], [foot[0] - 1.2 + toe * 0.8, foot[1] + 0.4], 2);
    line(hip, foot, 3);
    line(foot, [foot[0] + toe, foot[1] + 0.5], 3);
    line(foot, [foot[0] - toe * 0.45, foot[1] + 0.5], 2);
  }
  // Tail: stacked feathers, flat, behind the body.
  {
    const { base: tb, tip: tt, w } = pose.tail;
    const A = at(tb, -0.5), B = at(tt, -0.5);
    const tail = flatZ(cone(A, B, w * 0.75, w), 0.45, -0.5);
    solid(b, tail, {
      ...base,
      pal: st.wing,
      line: 0,
      paint: (h) => {
        const [t, ac] = along(h.x + 0.5, h.y + 0.5, [A[0], A[1]], [B[0], B[1]]);
        return st.paintTail ? st.paintTail(t, ac, h) : null;
      },
    });
  }
  // Body and head, one smooth form.
  const hc = at(pose.head.c, 0.3);
  const body = uni(2.6, ell(at(pose.body.c, 0), pose.body.r, pose.body.a), ell(hc, [pose.head.r[0], pose.head.r[1], Math.min(pose.head.r[0], pose.head.r[1]) * 0.95]));
  solid(b, body, {
    ...base,
    line: 1,
    paint: (h) => {
      const dxh = h.x + 0.5 - hc[0], dyh = h.y + 0.5 - hc[1];
      const inHead = dxh * dxh + dyh * dyh < (pose.head.r[0] + 0.6) ** 2 && h.y + 0.5 < hc[1] + pose.head.r[1] * 0.9;
      if (inHead && st.paintHead) {
        const r = st.paintHead(dxh, dyh, h);
        if (r !== null) return r;
      }
      return st.paintBody ? st.paintBody(h.x + 0.5 - org[0], h.y + 0.5 - org[1], h) : null;
    },
  });
  // Folded wing over the flank.
  if (pose.wing) {
    const { base: wb, tip: wt, w } = pose.wing;
    const A = at(wb, 2.6), B = at(wt, 2.6);
    solid(b, flatZ(leaf(A, B, w, w * 0.7), 0.6, 2.6), {
      ...base,
      pal: st.wing,
      line: 1,
      lineSide: 'shadow',
      paint: (h) => {
        const [t, ac] = along(h.x + 0.5, h.y + 0.5, [A[0], A[1]], [B[0], B[1]]);
        return st.paintWing ? st.paintWing(t, ac, h) : null;
      },
    });
  }
  // Beak: upper and lower mandibles from the base, opening by `open`.
  {
    const { base: bb, a, len, r, open } = pose.beak;
    const up = a - open * 0.35, lo = a + open * 0.85;
    const U0 = at([bb[0], bb[1] - r * 0.35], 0.6), U1 = at([bb[0] + Math.cos(up) * len, bb[1] - r * 0.35 + Math.sin(up) * len], 0.6);
    const L0 = at([bb[0] - 0.2, bb[1] + r * 0.45], 0.6), L1 = at([bb[0] - 0.2 + Math.cos(lo) * len * 0.88, bb[1] + r * 0.45 + Math.sin(lo) * len * 0.88], 0.6);
    const beakOpts = { ...base, pal: st.beak, cuts: [0.2, 0.42, 0.7, 0.86], line: 0, noLine: [] as number[] };
    if (open > 0.05) {
      solid(b, cone(L0, L1, r * 0.75, 0.3), beakOpts);
      // Open mouth: a dark wedge between the mandibles.
      solid(b, cone(at([bb[0] + 0.3, bb[1] + 0.2], 0.4), at([bb[0] + Math.cos(a + open * 0.3) * len * 0.55, bb[1] + 0.2 + Math.sin(a + open * 0.3) * len * 0.55], 0.4), r * 0.55, 0.3), { ...beakOpts, pal: st.leg, maxStep: 1, line: null });
      solid(b, cone(U0, U1, r, 0.3), beakOpts);
    } else {
      solid(b, uni(0.6, cone(U0, U1, r, 0.3), cone(L0, L1, r * 0.75, 0.3)), { ...beakOpts, paint: (h) => {
        // Mouth line between the mandibles.
        const [t, ac] = along(h.x + 0.5, h.y + 0.5, [U0[0], U0[1]], [U1[0], U1[1]]);
        return t > 0.05 && t < 0.75 && ac > r * 0.25 && ac < r * 0.25 + 1.0 ? 1 : null;
      } });
    }
  }
  // Eye.
  st.eyeDots(b, Math.floor(ox + pose.eye[0]), Math.floor(gy + pose.eye[1]), pose.blink ?? false);
  // Near wing (flight), in front.
  if (fl && rootS) drawWing(b, st, rootS, fl.len, fl.chord, fl.wf, true);
  return finish(b);
}

/** Flap cycle: arm angle, the hand lagging behind, folding and sweeping back on the upstroke. */
function flap(t: number, top = 70, bottom = -42): WingFrame {
  const mid = (top + bottom) / 2, amp = (top - bottom) / 2;
  const arm = rad(mid + amp * Math.cos(2 * Math.PI * t));
  const hand = rad(mid + (amp + 8) * Math.cos(2 * Math.PI * (t - 0.08)));
  const up = Math.max(0, -Math.sin(2 * Math.PI * t));
  return { arm, hand, span: 1 - 0.22 * up, sweep: 5 * up };
}

// --- crow ------------------------------------------------------------------------------------

const CROW_STYLE: BirdStyle = {
  W: 76,
  H: 84,
  ox: 36,
  gy: 72,
  body: P.crow,
  wing: P.crow,
  beak: P.beak,
  leg: P.beak,
  cuts: [0.24, 0.48, 0.8, 0.93],
  jitter: 0.05,
  fingers: 5,
  eyeDots: (b, x, y, blink) => {
    if (blink) {
      b.dot(x, y + 1, P.crow, 1);
      b.dot(x + 1, y + 1, P.crow, 1);
      return;
    }
    b.dot(x, y, P.beak, 1);
    b.dot(x + 1, y, P.beak, 1);
    b.dot(x, y + 1, P.beak, 1);
    b.dot(x + 1, y + 1, P.beak, 2);
    b.dot(x, y, P.white, 4);
  },
  paintWing: (t, ac, h) => {
    // Primaries: dark seams between the long feathers near the tip; coverts edge.
    if (t > 0.5 && Math.abs(((ac * 1.4 + t * 3) % 1.6) - 0.8) < 0.18) return Math.max(1, h.step - 1);
    if (t < 0.45 && Math.abs(ac + 0.6) < 0.4) return Math.max(1, h.step - 1);
    return null;
  },
  paintTail: (t, ac, h) => (t > 0.3 && Math.abs(ac) < 0.35 ? Math.max(1, h.step - 1) : null),
};

const CROW_PERCH: BirdPose = {
  body: { c: [-1, -10.4], r: [7.4, 4.7, 4.8], a: -0.38 },
  head: { c: [6.0, -16.4], r: [3.8, 3.4] },
  beak: { base: [8.6, -16.4], a: 0.2, len: 5.8, r: 1.55, open: 0 },
  tail: { base: [-6, -8], tip: [-15.5, -3.4], w: 2.3 },
  wing: { base: [3.6, -13.2], tip: [-12, -5.4], w: 3.4 },
  legs: { hip: [0.4, -5.6], foot: [0.8, -0.9], toe: 3.2 },
  eye: [6.8, -17.4],
};

function crow(): WorldSprite {
  const S = CROW_PERCH;
  const fr = (p: BirdPose): Canvas => birdFrame(CROW_STYLE, p);
  const tiltUp: BirdPose = { ...S, head: { c: [6.2, -16.8], r: [3.8, 3.4] }, beak: { ...S.beak, base: [8.8, -17.4], a: -0.2 }, eye: [6.8, -18.0] };
  const tiltDown: BirdPose = { ...S, head: { c: [6.4, -16.0], r: [3.8, 3.4] }, beak: { ...S.beak, base: [8.8, -15.6], a: 0.55 }, eye: [7.0, -16.9] };
  const lean: BirdPose = {
    ...S,
    body: { ...S.body, c: [-0.6, -10.2], a: -0.26 },
    head: { c: [7.0, -15.6], r: [3.8, 3.4] },
    beak: { ...S.beak, base: [9.6, -15.6], a: 0.1 },
    tail: { ...S.tail, tip: [-15.4, -5.0] },
    wing: { ...S.wing, base: [4.2, -12.8], tip: [-11.6, -6.4] },
    eye: [7.8, -16.6],
  };
  const caw: BirdPose = {
    ...lean,
    head: { c: [7.6, -15.4], r: [3.8, 3.5] },
    beak: { ...S.beak, base: [10.2, -15.6], a: -0.05, open: 0.6 },
    tail: { ...S.tail, tip: [-15.0, -6.8] },
    eye: [8.4, -16.4],
  };
  const perch = [S, S, tiltUp, tiltUp, S, tiltDown, S, lean, caw, caw, lean, S].map(fr);

  const fly: Canvas[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const wf = flap(t);
    const bob = Math.round(Math.sin(2 * Math.PI * t) * 0.9);
    const P0: BirdPose = {
      body: { c: [0, -12 + bob], r: [7.6, 4.3, 4.6], a: -0.06 },
      head: { c: [8.6, -13.8 + bob], r: [3.6, 3.2] },
      beak: { base: [11.2, -13.8 + bob], a: 0.12, len: 5.6, r: 1.5, open: 0 },
      tail: { base: [-6, -11.6 + bob], tip: [-16.5, -10.8 + bob], w: 2.8 },
      eye: [9.4, -14.8 + bob],
    };
    fly.push(birdFrame(CROW_STYLE, P0, { wf, root: [1.5, -13.5 + bob], len: 31, chord: 10 }));
  }
  return assemble('crow', 'Crow', [0.45, 0.35], ['animal', 'ambient'], { perch: { frames: perch, fps: 6 }, fly: { frames: fly, fps: 10 } }, CROW_STYLE.ox + 1, CROW_STYLE.gy);
}

// =============================================================================================
