// =============================================================================================
// SIKA DEER
// =============================================================================================
//
// A doe in summer coat, side view facing right, at real size (head 1.5 m = 86 px). Legs are
// solved per frame: each hoof follows a stance/swing path and two-bone IK places the carpus
// (front, bends forward) and hock (hind, bends back); the pastern rolls over the planted hoof.

interface LegJoints {
  P: P2; // shoulder or hip pivot (inside the body)
  S?: P2; // stifle (hind)
  J: P2; // carpus (front) or hock (hind)
  F: P2; // fetlock
  H: P2; // hoof tip on the ground
}

/** Circle-circle intersection: the point at distance r0 from a and r1 from b, on the `side` (+1 left of a->b, -1 right). */
function circles(a: P2, r0: number, b: P2, r1: number, side: number): P2 | null {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy);
  if (d > r0 + r1 || d < Math.abs(r0 - r1) || d < 1e-6) return null;
  const t = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - t * t));
  const mx = a[0] + (dx * t) / d, my = a[1] + (dy * t) / d;
  return [mx + (side * -dy * h) / d, my + (side * dx * h) / d];
}

/** Two-bone IK: joint between `a` and `b` with bone lengths l1, l2, bent toward +x (front) or -x (hind). */
function ik2(a: P2, b: P2, l1: number, l2: number, bendFront: boolean): P2 {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (d >= l1 + l2 - 1e-3) return lerp2(a, b, l1 / (l1 + l2));
  const c1 = circles(a, l1, b, l2, 1)!, c2 = circles(a, l1, b, l2, -1)!;
  if (!c1) return lerp2(a, b, l1 / (l1 + l2));
  return (c1[0] > c2[0]) === bendFront ? c1 : c2;
}

const DEER = {
  front: { L1: 21, L2: 12, p: 5 },
  hind: { L1: 24, L2: 13, p: 5, hockAngle: rad(150) },
};

/**
 * Places one leg. `hoof` is the toe on the ground (y = 0) in stance; in swing (s in 0..1) the
 * fetlock is lifted by `lift` and the hoof folds back.
 */
function deerLeg(kind: 'front' | 'hind', P: P2, hoof: P2, s: number, lift: number): LegJoints {
  const front = kind === 'front';
  const g = front ? DEER.front : DEER.hind;
  const Leff = front ? g.L1 + g.L2 : Math.sqrt(g.L1 ** 2 + g.L2 ** 2 - 2 * g.L1 * g.L2 * Math.cos(DEER.hind.hockAngle));
  let F: P2, H: P2;
  if (s <= 0) {
    // Stance: the pastern rolls so the leg keeps its length; the hoof stays planted.
    H = hoof;
    const f = circles(P, Leff, H, g.p, front ? 1 : 1);
    const f2 = circles(P, Leff, H, g.p, -1);
    let pick = f && f2 ? (f[0] < f2[0] ? f : f2) : f ?? f2;
    if (!pick) {
      // Out of reach (end of the stroke): the heel lifts a little and the leg is straight.
      const d = Math.hypot(H[0] - P[0], H[1] - P[1]);
      const t = (Leff + g.p * 0.6) / d;
      pick = [P[0] + (H[0] - P[0]) * t - 1.5, P[1] + (H[1] - P[1]) * t - 3.5];
    }
    F = pick;
  } else {
    const fold = Math.sin(Math.PI * s);
    const beta = rad(35 + 75 * fold);
    F = [hoof[0] - g.p * Math.sin(beta) * 0.9, hoof[1] - lift * fold - g.p * Math.cos(beta)];
    H = [F[0] + g.p * Math.sin(beta), F[1] + g.p * Math.cos(beta)];
  }
  const J = ik2(P, F, g.L1, g.L2, front);
  if (front) return { P, J, F, H };
  const S = ik2(P, J, 11, 15, true);
  return { P, S, J, F, H };
}

interface DeerPose {
  /** Torso offset (walk bob). */
  body: P2;
  /** Top of the neck where the head sits. */
  neck: P2;
  /** Direction of the face (radians from +x, positive turns the muzzle down). */
  headA: number;
  /** Ear angles (radians, positive = rotated back). */
  earN: number;
  earF: number;
  /** Tail: 0 hanging, 1 raised. */
  tail: number;
  /** Rump patch flared (alarm). */
  flare: number;
  /** Mouth open (nibbling). */
  chew: number;
  legs: { fn: LegJoints; ff: LegJoints; hn: LegJoints; hf: LegJoints };
}

const DEER_W = 128, DEER_H = 104, DEER_OX = 60, DEER_GY = 98;
const SHOULDER: P2 = [13, -40], HIP: P2 = [-18, -41];

function standLegs(body: P2, o: { fn?: number; ff?: number; hn?: number; hf?: number } = {}): DeerPose['legs'] {
  const sp: P2 = [SHOULDER[0] + body[0], SHOULDER[1] + body[1]];
  const hp: P2 = [HIP[0] + body[0], HIP[1] + body[1]];
  return {
    fn: deerLeg('front', sp, [17 + (o.fn ?? 0), 0], 0, 0),
    ff: deerLeg('front', [sp[0] - 1, sp[1]], [19 + (o.ff ?? 0), 0], 0, 0),
    hn: deerLeg('hind', hp, [-15 + (o.hn ?? 0), 0], 0, 0),
    hf: deerLeg('hind', [hp[0] + 1, hp[1]], [-18 + (o.hf ?? 0), 0], 0, 0),
  };
}

const DEER_STAND: DeerPose = {
  body: [0, 0],
  neck: [24, -68],
  headA: rad(32),
  earN: 0,
  earF: 0,
  tail: 0,
  flare: 0,
  chew: 0,
  legs: standLegs([0, 0]),
};

// Spots in torso space (summer coat): two neat rows beside the dorsal stripe, looser ones below.
const DEER_SPOTS: P2[] = (() => {
  const out: P2[] = [];
  const top = (x: number): number => -48.2 + 0.0035 * (x + 4) ** 2;
  for (let x = -21; x <= 7; x += 4.3) out.push([x, top(x) + 3.2]);
  for (let x = -19; x <= 3; x += 4.6) out.push([x + 0.6, top(x) + 6.6]);
  for (let x = -16; x <= -1; x += 5.2) out.push([x + 1.4 + hash(x | 0, 3, 41) * 1.2, top(x) + 10.4]);
  out.push([-11.5, top(-11.5) + 13.8], [-6, top(-6) + 14.2]);
  return out;
})();

function deerFrame(pose: DeerPose): Canvas {
  const ox = DEER_OX, gy = DEER_GY;
  const b = new Buf(DEER_W, DEER_H);
  const [bx, by] = pose.body;
  const at = (p: P2, z = 0): P3 => [ox + p[0], gy + p[1], z];
  const atB = (p: P2, z = 0): P3 => [ox + p[0] + bx, gy + p[1] + by, z];
  const org: P2 = [ox + bx, gy + by];
  const coat = P.sika;
  const cuts = [0.22, 0.44, 0.78, 0.93];
  const base = { pal: coat, origin: org, jitter: 0.06, cell: 3, cuts };

  // --- legs ---------------------------------------------------------------------------------
  const drawLeg = (L: LegJoints, kind: 'front' | 'hind', z: number, far: number): void => {
    const lo = { ...base, far, origin: [ox + L.H[0], gy] as P2, line: far ? 0 : 1, lineSide: 'shadow' as const };
    const parts: Prim[] = [];
    if (kind === 'front') {
      parts.push(cone(at(L.P, z), at(L.J, z), 4.6, 2.0));
      parts.push(ell(at(L.J, z + 0.2), [2.1, 2.2, 2.0]));
    } else {
      parts.push(cone(at(L.P, z - 0.5), at(L.S!, z), 6.5, 4.6));
      parts.push(cone(at(L.S!, z), at(L.J, z), 4.4, 2.0));
      parts.push(ell(at(L.J, z + 0.2), [2.0, 2.3, 2.0]));
    }
    parts.push(cone(at(L.J, z), at(L.F, z), 1.65, 1.45));
    parts.push(ell(at(L.F, z + 0.1), [1.75, 1.75, 1.7]));
    parts.push(cone(at(L.F, z), at(L.H, z), 1.45, 1.25));
    const leg = uni(1.4, ...parts);
    const hoofT = 0.55;
    solid(b, leg, {
      ...lo,
      paint: (h) => {
        // Hoof: the last stretch of the pastern, dark keratin.
        const vx = h.x + 0.5 - (ox + L.F[0]), vy = h.y + 0.5 - (gy + L.F[1]);
        const ex = L.H[0] - L.F[0], ey = L.H[1] - L.F[1];
        const t = (vx * ex + vy * ey) / (ex * ex + ey * ey);
        if (t > hoofT) return [P.dark, clamp(h.step + 1 - far, 2, 4)];
        // Lower leg a little paler and grayer.
        if (h.y + 0.5 > gy + L.J[1] + 1) return [P.fur, clamp(h.step, 1, 4)];
        return null;
      },
    });
  };
  drawLeg(pose.legs.hf, 'hind', -5.5, 1);
  drawLeg(pose.legs.ff, 'front', -5.5, 1);

  // --- far ear and tail ---------------------------------------------------------------------
  const nk = pose.neck;
  const ha = pose.headA;
  const hdir: P2 = [Math.cos(ha), Math.sin(ha)];
  const hperp: P2 = [-Math.sin(ha), Math.cos(ha)]; // down-side of the face
  const H0: P2 = [nk[0] + hdir[0] * 2.6 - hperp[0] * 0.6, nk[1] + hdir[1] * 2.6 - hperp[1] * 0.6]; // cranium center
  const hp = (u: number, v: number): P2 => [H0[0] + hdir[0] * u + hperp[0] * v, H0[1] + hdir[1] * u + hperp[1] * v];
  const earBase = hp(-3.0, -3.6);
  const earDir = (back: number): P2 => {
    const a = ha - rad(118) - back;
    return [Math.cos(a), Math.sin(a)];
  };
  {
    const d = earDir(pose.earF + rad(-6));
    const e0 = [earBase[0] + 1.2, earBase[1] - 0.4] as P2;
    solid(b, seg(at(e0, -2.6), at([e0[0] + d[0] * 9.5, e0[1] + d[1] * 9.5], -2.6), 2.6, 1.0), { ...base, far: 1, line: 0 });
  }
  // Tail: hangs over the rump patch, or lifts and fans out the white.
  const tailBase: P2 = [-26.5, -45.5];
  const tailTip: P2 = lerp2([-28.2, -37.5], [-33.5, -47], pose.tail);
  solid(b, cone(atB(tailBase, 0.5), atB(tailTip, 0.5), 2.2, 1.6), {
    ...base,
    pal: P.white,
    minStep: 2,
    maxStep: 4,
    line: 0,
    paint: (h) => {
      // Dark stripe down the upper side of the tail.
      const vx = h.x + 0.5 - (org[0] + tailBase[0]), vy = h.y + 0.5 - (org[1] + tailBase[1]);
      const ex = tailTip[0] - tailBase[0], ey = tailTip[1] - tailBase[1];
      const el = Math.hypot(ex, ey);
      const across = (vx * ey - vy * ex) / el;
      return across < -0.3 ? [P.dark, 3] : null;
    },
  });

  // --- torso and neck -----------------------------------------------------------------------
  const neckBase: P2 = [13 + bx, -45 + by];
  const torso = uni(
    6,
    ell(atB([12, -37.5], 0), [11.5, 11.5, 9]),
    ell(atB([-2, -38], 0), [17, 9.6, 10]),
    ell(atB([-17, -38.5], 0), [10.5, 9.8, 8.6]),
    ell(atB([7, -45], 0), [9, 4.5, 6.5], -0.1),
  );
  const neck = cone(at(neckBase, 0), at(nk, 0.4), 7.2, 4.0);
  const body = uni(5, torso, neck);
  const spotPal = P.spot;
  solid(b, body, {
    ...base,
    line: 1,
    paint: (h) => {
      const lx = h.x + 0.5 - org[0], ly = h.y + 0.5 - org[1];
      // Rump patch: white, framed by a dark crescent along its front.
      const patchX = -23.2 + 2.6 * pose.flare + 0.05 * (ly + 40) ** 2 * 0.12;
      if (lx < patchX && ly > -48 && ly < -31) {
        if (lx > patchX - 1.2 && ly < -34) return [P.dark, clamp(h.step + 1, 2, 3)];
        return [P.white, clamp(h.step, 2, 4)];
      }
      // Pale belly and inner thigh.
      if (h.ny > 0.78 && ly > -32) return [P.pale, clamp(h.step, 1, 3)];
      // Dark dorsal stripe along the spine.
      if (h.ny < -0.86 && lx > -22 && lx < 10) return [P.woodDark, clamp(h.step, 2, 4)];
      // Spots follow the coat's light.
      for (const [sx, sy] of DEER_SPOTS) {
        const dx = lx - sx, dy = ly - sy;
        if (dx * dx * 0.7 + dy * dy < 0.95) return [spotPal, clamp(h.step + 1, 2, 4)];
      }
      // Throat a little paler.
      return null;
    },
  });

  // --- near legs ----------------------------------------------------------------------------
  drawLeg(pose.legs.hn, 'hind', 5.5, 0);
  drawLeg(pose.legs.fn, 'front', 5.5, 0);

  // --- head ---------------------------------------------------------------------------------
  const cran = ell(at(H0, 0.6), [5.0, 4.6, 4.2], ha);
  const muzzle = cone(at(hp(2.5, 0.6), 0.6), at(hp(9.8, 1.6), 0.6), 3.3, 1.9);
  const jaw = ell(at(hp(3.6, 2.8 + pose.chew * 0.8), 0.6), [4.2, 1.6, 2.6], ha + 0.12);
  const head = uni(2.2, cran, muzzle, jaw);
  const nose = hp(10.6, 1.4);
  solid(b, head, {
    ...base,
    line: 1,
    lineSide: 'shadow',
    paint: (h) => {
      const px = h.x + 0.5 - (ox + H0[0]), py = h.y + 0.5 - (gy + H0[1]);
      const u = px * hdir[0] + py * hdir[1], v = px * hperp[0] + py * hperp[1];
      if (u > 9.0) return [P.dark, clamp(h.step, 2, 4)]; // nose leather
      if (v > 2.9 && u > 1) return [P.pale, clamp(h.step, 2, 3)]; // chin and jaw underside
      return null;
    },
  });
  // Near ear: a big leaf with a pale inside.
  {
    const d = earDir(pose.earN);
    const e0: P2 = [earBase[0] - 0.4, earBase[1] + 0.4];
    const e1: P2 = [e0[0] + d[0] * 10, e0[1] + d[1] * 10];
    const A = at(e0, 2.4), B = at(e1, 2.4);
    solid(b, seg(A, B, 2.7, 1.0), {
      ...base,
      line: 1,
      paint: (h) => {
        const vx = h.x + 0.5 - A[0], vy = h.y + 0.5 - A[1];
        const ex = B[0] - A[0], ey = B[1] - A[1], el = Math.hypot(ex, ey);
        const t = (vx * ex + vy * ey) / (el * el);
        const across = (vx * ey - vy * ex) / el;
        if (t > 0.88) return [P.dark, 3];
        if (t > 0.18 && t < 0.8 && across > -0.6 && across < 1.2) return [P.pale, clamp(h.step - 1, 1, 3)];
        return null;
      },
    });
  }
  // Eye: dark almond with a catchlight, pale ring, dark gland line toward the muzzle.
  {
    const e = hp(1.6, -0.9);
    const ex = Math.floor(ox + e[0]), ey = Math.floor(gy + e[1]);
    b.dot(ex - 1, ey - 1, P.pale, 3);
    b.dot(ex, ey - 1, P.pale, 3);
    b.dot(ex - 1, ey, P.dark, 2);
    b.dot(ex, ey, P.white, 4);
    b.dot(ex + 1, ey, P.dark, 2);
    b.dot(ex - 1, ey + 1, P.dark, 2);
    b.dot(ex, ey + 1, P.dark, 2);
    b.dot(ex + 1, ey + 1, P.dark, 3);
    const g = hp(4.2, 0.9);
    b.dot(ox + g[0], gy + g[1], P.dark, 3);
    const n = nose;
    b.dot(ox + n[0] - 0.6, gy + n[1] - 0.4, P.dark, 1);
  }
  return finish(b);
}

/** Walk cycle: lateral sequence (LH, LF, RH, RF a quarter apart), 62% stance. */
function deerWalk(frames: number): DeerPose[] {
  const out: DeerPose[] = [];
  const sweep = 9.5, duty = 0.62;
  const foot = (phase: number, neutral: number, lift: number): { x: number; s: number; lift: number } => {
    const t = ((phase % 1) + 1) % 1;
    if (t < duty) return { x: neutral + sweep - (2 * sweep * t) / duty, s: 0, lift };
    const u = (t - duty) / (1 - duty);
    const e = u * u * (3 - 2 * u);
    return { x: neutral - sweep + 2 * sweep * e, s: u, lift };
  };
  for (let i = 0; i < frames; i++) {
    const t = i / frames;
    const bob = Math.round(Math.cos(t * 4 * Math.PI + 0.6) * 0.6 * 2) / 2;
    const body: P2 = [0, -Math.max(0, bob)];
    const sp: P2 = [SHOULDER[0] + body[0], SHOULDER[1] + body[1]];
    const hp: P2 = [HIP[0] + body[0], HIP[1] + body[1]];
    const hn = foot(t, -15, 5), fn = foot(t - 0.25, 17, 6), hf = foot(t - 0.5, -16, 5), ff = foot(t - 0.75, 18, 6);
    const nod = Math.sin(t * 4 * Math.PI - 0.4) * 1.1;
    out.push({
      ...DEER_STAND,
      body,
      neck: [DEER_STAND.neck[0] + 0.5, DEER_STAND.neck[1] + 2.5 + nod],
      headA: rad(36),
      legs: {
        hn: deerLeg('hind', hp, [hn.x, 0], hn.s, hn.lift),
        fn: deerLeg('front', sp, [fn.x, 0], fn.s, fn.lift),
        hf: deerLeg('hind', [hp[0] + 1, hp[1]], [hf.x, 0], hf.s, hf.lift),
        ff: deerLeg('front', [sp[0] - 1, sp[1]], [ff.x, 0], ff.s, ff.lift),
      },
    });
  }
  return out;
}

function deer(): WorldSprite {
  const S = DEER_STAND;
  const earFlick: DeerPose = { ...S, earN: rad(38) };
  const earHalf: DeerPose = { ...S, earN: rad(18) };
  const tailUp: DeerPose = { ...S, tail: 0.8 };
  const tailHalf: DeerPose = { ...S, tail: 0.4 };
  const idle = [S, S, earFlick, earHalf, S, tailUp, tailHalf, S].map(deerFrame);

  // Graze: neck down to the grass in front of the forelegs, one foreleg forward.
  const gLegs = standLegs([0, 0], { fn: 3, ff: -1 });
  const G: DeerPose = { ...S, neck: [33, -20], headA: rad(100), earN: rad(-10), earF: rad(-10), legs: gLegs };
  const Gbite: DeerPose = { ...G, neck: [33, -19], chew: 1 };
  const Gear: DeerPose = { ...G, earN: rad(25) };
  const Gtail: DeerPose = { ...G, tail: 0.5 };
  const graze = [G, Gbite, G, Gbite, Gear, Gtail].map(deerFrame);

  const walk = deerWalk(8).map(deerFrame);

  // Alert: head high, ears forward, tail up and the white rump flared.
  const alert = [deerFrame({ ...S, neck: [22, -73], headA: rad(22), earN: rad(-14), earF: rad(-14), tail: 1, flare: 1 })];
  return assemble('deer', 'Sika Deer', [1.4, 1.5], ['animal', 'ambient'], { idle: { frames: idle, fps: 5 }, graze: { frames: graze, fps: 5 }, walk: { frames: walk, fps: 8 }, alert: { frames: alert, fps: 0 } }, DEER_OX + 1, DEER_GY);
}

// =============================================================================================
