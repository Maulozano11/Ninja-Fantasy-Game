// =============================================================================================
// SPARROW
// =============================================================================================
//
// Eurasian tree sparrow at 1.6x so the face reads: chestnut cap, white cheek with the black spot,
// black bib, streaked brown back, white wing bar, pale gray-buff breast.

const SPARROW_STYLE: BirdStyle = {
  W: 44,
  H: 44,
  ox: 22,
  gy: 32,
  body: P.sparrow,
  wing: P.sparrow,
  beak: P.beak,
  leg: P.legPink,
  cuts: [0.2, 0.42, 0.8, 0.94],
  jitter: 0.04,
  fingers: 1,
  wingTaper: 0.3,
  tailFeathers: 2,
  tailBias: -0.08,
  eyeDots: (b, x, y, blink) => {
    if (blink) b.dot(x, y, P.cap, 1);
    else b.dot(x, y, P.beak, 1);
  },
  paintBody: (lx, ly, h) => {
    // Pale breast and belly; streaked brown back.
    if (h.ny > -0.05 && lx > -3.2) return [P.sparBelly, clamp(h.step, 2, 4)];
    const k = Math.floor((lx + 20) / 1.7);
    if (h.ny < -0.25 && hash(k, Math.floor(ly + 20), 77) > 0.55) return Math.max(1, h.step - 1);
    return null;
  },
  paintHead: (dx, dy, h) => {
    // Bib under the beak, cheek with its black spot, chestnut cap.
    if (dy > 0.9 && dx > -0.6) return [P.beak, 2];
    if (dy > -0.6 && dx > -2.0 && dx < 0.9 && dy < 1.6) {
      if (dx > -1.4 && dx < -0.4 && dy > 0.1 && dy < 1.1) return [P.beak, 2];
      return [P.white, clamp(h.step, 2, 4)];
    }
    if (dy <= -0.6) return [P.cap, clamp(h.step, 2, 4)];
    return null;
  },
  paintWing: (t, ac, h) => {
    // White wing bar across the coverts, dark feather centers behind it.
    if (t > 0.26 && t < 0.38) return [P.white, clamp(h.step, 2, 3)];
    if (t > 0.42 && ac > -0.4 && ac < 0.9) return [P.beak, clamp(h.step, 2, 3)];
    return null;
  },
};

const SPARROW_PERCH: BirdPose = {
  body: { c: [-0.6, -5.0], r: [4.0, 3.0, 3.0], a: -0.25 },
  head: { c: [2.7, -7.9], r: [2.7, 2.6] },
  beak: { base: [5.0, -7.7], a: 0.25, len: 1.9, r: 0.95, open: 0 },
  tail: { base: [-3.4, -4.8], tip: [-8.4, -6.4], w: 1.3 },
  wing: { base: [1.6, -6.5], tip: [-5.0, -3.9], w: 2.0 },
  legs: { hip: [0.3, -2.8], foot: [0.5, -0.7], toe: 1.8 },
  eye: [3.3, -8.6],
};

/** Moves a whole bird pose by (dx, dy) (hops), legs excluded. */
function birdShift(p: BirdPose, dx: number, dy: number): BirdPose {
  const s = (q: P2): P2 => [q[0] + dx, q[1] + dy];
  return {
    ...p,
    body: { ...p.body, c: s(p.body.c) },
    head: { ...p.head, c: s(p.head.c) },
    beak: { ...p.beak, base: s(p.beak.base) },
    tail: { ...p.tail, base: s(p.tail.base), tip: s(p.tail.tip) },
    wing: p.wing ? { ...p.wing, base: s(p.wing.base), tip: s(p.wing.tip) } : undefined,
    eye: s(p.eye),
  };
}

function sparrow(): WorldSprite {
  const st = SPARROW_STYLE;
  const S = SPARROW_PERCH;
  const fr = (p: BirdPose): Canvas => birdFrame(st, p);
  const peck: BirdPose = {
    ...S,
    body: { c: [0, -4.6], r: [4.0, 3.0, 3.0], a: 0.2 },
    head: { c: [4.0, -3.8], r: [2.7, 2.6] },
    beak: { base: [5.4, -2.4], a: 1.15, len: 1.9, r: 0.95, open: 0 },
    tail: { base: [-3.4, -5.6], tip: [-7.8, -8.6], w: 1.3 },
    wing: { base: [2.0, -5.8], tip: [-4.6, -5.0], w: 2.0 },
    eye: [4.6, -4.4],
  };
  const crouch: BirdPose = { ...birdShift(S, 0, 0.8), legs: { hip: [0.3, -2.0], foot: [0.6, -0.7], toe: 1.8 } };
  const hop: BirdPose = { ...birdShift(S, 0.4, -3.0), tail: { base: [-3.0, -7.6], tip: [-8.0, -8.6], w: 1.3 }, legs: { hip: [0.7, -5.8], foot: [0.2, -3.9], toe: 1.6 } };
  const land: BirdPose = { ...birdShift(S, 0, 0.5), tail: { base: [-3.4, -4.3], tip: [-8.0, -7.6], w: 1.3 }, legs: { hip: [0.3, -2.3], foot: [0.5, -0.7], toe: 1.8 } };
  const perch = [S, peck, S, crouch, hop, land].map(fr);

  const fly: Canvas[] = [];
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    const wf = flap(t, 58, -40);
    const bob = i === 2 ? -1 : 0;
    const P0: BirdPose = {
      body: { c: [0, -6 + bob], r: [4.3, 2.8, 2.9], a: -0.06 },
      head: { c: [3.7, -7.2 + bob], r: [2.6, 2.5] },
      beak: { base: [6.0, -7.0 + bob], a: 0.15, len: 1.9, r: 0.95, open: 0 },
      tail: { base: [-3.0, -6.2 + bob], tip: [-8.4, -6.0 + bob], w: 1.6 },
      eye: [4.3, -7.9 + bob],
    };
    fly.push(birdFrame(st, P0, { wf, root: [0.4, -7.2 + bob], len: 11.5, chord: 4.6 }));
  }
  return assemble('sparrow', 'Sparrow', [0.15, 0.1], ['animal', 'ambient'], { perch: { frames: perch, fps: 6 }, fly: { frames: fly, fps: 12 } }, st.ox + 1, st.gy);
}

// =============================================================================================
