interface Oval {
  c: P2;
  r: P2;
  a: number;
}
interface RabbitPose {
  tail: P2;
  haunch: Oval;
  body: Oval;
  chest: Oval;
  head: { c: P2; a: number };
  /** Ear base and tip, near and far. */
  earN: [P2, P2];
  earF: [P2, P2];
  /** Front legs: shoulder and paw. */
  armN: [P2, P2];
  armF: [P2, P2];
  /** Hind leg: knee (inside the haunch) to heel, then heel to toe. The far foot trails by `farFoot`. */
  shin: [P2, P2];
  foot: [P2, P2];
  farFoot?: P2;
  /** Nose wiggle (0 rest, 1 up). */
  nose: number;
  /** Eye: 1 open, 0 closed. */
  eye: number;
}

const RABBIT_SIT: RabbitPose = {
  tail: [-9.2, -4.2],
  haunch: { c: [-4.2, -4.6], r: [4.9, 4.4], a: -0.15 },
  body: { c: [-0.8, -7.2], r: [6.2, 4.6], a: -0.5 },
  chest: { c: [3.3, -8], r: [3, 3.6], a: 0 },
  head: { c: [5.6, -12.2], a: 0.25 },
  earN: [[4.6, -14.4], [3.0, -21.2]],
  earF: [[3.3, -14.6], [-0.6, -20.2]],
  armN: [[3.9, -6.2], [5.4, -1.0]],
  armF: [[2.8, -6.2], [4.2, -1.0]],
  shin: [[-4.5, -4.5], [-6.8, -1.3]],
  foot: [[-7.2, -1.1], [1.2, -0.9]],
  nose: 0,
  eye: 1,
};

const RABBIT_W = 52, RABBIT_H = 44, RABBIT_OX = 26, RABBIT_GY = 38;

function rabbitFrame(pose: RabbitPose): Canvas {
  const ox = RABBIT_OX, gy = RABBIT_GY;
  const b = new Buf(RABBIT_W, RABBIT_H);
  const at = (p: P2, z = 0): P3 => [ox + p[0], gy + p[1], z];
  const org: P2 = [ox + pose.body.c[0], gy + pose.body.c[1]];
  const fur = P.rabbit;
  const base = { pal: fur, origin: org, jitter: 0.05, cuts: [0.2, 0.42, 0.78, 0.93] };

  // Far side first: ear, front leg, hind foot.
  const [ef0, ef1] = pose.earF;
  solid(b, seg(at(ef0, -1.6), at(ef1, -1.6), 1.25, 0.8), { ...base, far: 1, line: 1 });
  solid(b, cone(at(pose.armF[0], -1.8), at(pose.armF[1], -1.8), 1.2, 0.95), { ...base, far: 1 });
  if (pose.farFoot) {
    const [dx, dy] = pose.farFoot;
    const sh: [P2, P2] = [[pose.shin[0][0] + dx, pose.shin[0][1] + dy], [pose.shin[1][0] + dx, pose.shin[1][1] + dy]];
    const ft: [P2, P2] = [[pose.foot[0][0] + dx, pose.foot[0][1] + dy], [pose.foot[1][0] + dx, pose.foot[1][1] + dy]];
    solid(b, uni(1, cone(at(sh[0], -2), at(sh[1], -2), 1.5, 1.1), cone(at(ft[0], -2), at(ft[1], -2), 1.2, 0.9)), { ...base, far: 1 });
  }
  // Tail puff behind the haunch.
  solid(b, ell(at(pose.tail, 0), [2.1, 2.0, 2]), { pal: P.white, origin: org, minStep: 2, maxStep: 4, line: null });
  // Torso: body and chest merged, pale belly.
  const torso = uni(2.5, ell(at(pose.body.c, 0), [pose.body.r[0], pose.body.r[1], 4.2], pose.body.a), ell(at(pose.chest.c, 0.4), [pose.chest.r[0], pose.chest.r[1], 3.6], pose.chest.a));
  solid(b, torso, { ...base, line: 1, paint: (h) => (h.ny > 0.72 && h.x < ox + pose.chest.c[0] - 1 ? [P.pale, clamp(h.step, 1, 3)] : null) });
  // Hind leg: shin under the haunch, then the long foot.
  const leg = uni(1, cone(at(pose.shin[0], 1.5), at(pose.shin[1], 1.8), 1.6, 1.15), cone(at(pose.foot[0], 2.0), at(pose.foot[1], 2.2), 1.25, 0.95));
  solid(b, leg, { ...base, bias: 0.04, line: 1, lineSide: 'shadow' });
  // Near haunch over the torso and the top of the leg: the thigh line runs along its front.
  solid(b, ell(at(pose.haunch.c, 1.2), [pose.haunch.r[0], pose.haunch.r[1], 3.6], pose.haunch.a), { ...base, line: 1, lineSide: 'shadow' });
  // Near front leg.
  solid(b, cone(at(pose.armN[0], 1.8), at(pose.armN[1], 1.8), 1.3, 1.0), { ...base, bias: 0.05, line: 1, lineSide: 'shadow' });
  // Head with muzzle.
  const hc = at(pose.head.c, 0.6);
  const ha = pose.head.a;
  const rot = (dx: number, dy: number): P3 => [hc[0] + dx * Math.cos(ha) - dy * Math.sin(ha), hc[1] + dx * Math.sin(ha) + dy * Math.cos(ha), hc[2]];
  const local = (x: number, y: number): P2 => {
    const dx = x + 0.5 - hc[0], dy = y + 0.5 - hc[1];
    return [dx * Math.cos(ha) + dy * Math.sin(ha), -dx * Math.sin(ha) + dy * Math.cos(ha)];
  };
  const head = uni(1.8, ell(hc, [3.7, 3.2, 3.2], ha), ell(rot(2.8, 0.9), [2.0, 1.9, 2.3], ha));
  solid(b, head, {
    ...base,
    line: 1,
    paint: (h) => {
      const [lx, ly] = local(h.x, h.y);
      if (ly > 2.1 && lx > 0.6 && lx < 3.6) return [P.pale, clamp(h.step, 2, 3)];
      return null;
    },
  });
  // Near ear: a long leaf with a pale inner groove down its middle and a darker tip.
  const [en0, en1] = pose.earN;
  const earA = at(en0, 1.4), earB = at(en1, 1.4);
  const ex0 = earB[0] - earA[0], ey0 = earB[1] - earA[1], elen = Math.hypot(ex0, ey0);
  solid(b, seg(earA, earB, 1.4, 0.9), {
    ...base,
    line: 1,
    paint: (h) => {
      const vx = h.x + 0.5 - earA[0], vy = h.y + 0.5 - earA[1];
      const t = (vx * ex0 + vy * ey0) / (elen * elen);
      const across = (vx * ey0 - vy * ex0) / elen;
      if (t > 0.86) return Math.max(1, h.step - 1);
      if (t > 0.2 && t < 0.74 && Math.abs(across + 0.15) < 0.55) return [P.pink, 2];
      return null;
    },
  });
  // Eye: dark 2x2 with a catchlight toward the light.
  const ec = rot(0.6, -0.7);
  const ex = Math.floor(ec[0]), ey = Math.floor(ec[1]);
  if (pose.eye > 0.5) {
    b.dot(ex, ey, P.cream, 5);
    b.dot(ex + 1, ey, P.dark, 2);
    b.dot(ex, ey + 1, P.dark, 2);
    b.dot(ex + 1, ey + 1, P.dark, 2);
  } else {
    b.dot(ex, ey + 1, P.dark, 2);
    b.dot(ex + 1, ey + 1, P.dark, 2);
  }
  // Nose: the tip of the muzzle, wiggling a pixel.
  const nc = rot(4.5, 0.3 - pose.nose * 0.9);
  b.dot(Math.floor(nc[0]), Math.floor(nc[1]), P.pink, 3);
  return finish(b);
}

/** A pose with some parts replaced. */
function rp(base: RabbitPose, patch: Partial<RabbitPose>): RabbitPose {
  return { ...base, ...patch };
}
const shift2 = (pts: [P2, P2], dx: number, dy: number): [P2, P2] => [[pts[0][0] + dx, pts[0][1] + dy], [pts[1][0] + dx, pts[1][1] + dy]];

function rabbit(): WorldSprite {
  const S = RABBIT_SIT;
  // Idle: hold, nose twitches twice, the near ear flicks back and returns.
  const noseUp = rp(S, { nose: 1 });
  const earFlick = rp(S, { earN: [[4.4, -14.4], [-0.2, -20.4]] });
  const earHalf = rp(S, { earN: [[4.5, -14.4], [1.4, -21.0]] });
  const idle = [S, S, noseUp, S, noseUp, earFlick, earHalf, S].map(rabbitFrame);

  // Graze: leaning forward with the head down at the grass, nibbling.
  const G = rp(S, {
    body: { c: [-0.4, -6.6], r: [6.4, 4.5], a: -0.2 },
    chest: { c: [3.8, -6.4], r: [3, 3.4], a: 0 },
    head: { c: [7.6, -5.2], a: 1.0 },
    earN: [[5.6, -8.0], [1.6, -13.6]],
    earF: [[4.6, -8.2], [0.0, -12.6]],
    armN: [[4.4, -5.0], [6.4, -1.0]],
    armF: [[3.4, -5.0], [5.2, -1.0]],
    tail: [-9.4, -4.6],
  });
  const Gdown = rp(G, { head: { c: [7.6, -4.6], a: 1.05 }, nose: 1 });
  const Gear = rp(G, { earN: [[5.6, -8.0], [0.4, -12.8]] });
  const graze = [G, Gdown, G, Gdown, Gear, G].map(rabbitFrame);

  // Hop (in place; the engine moves the rabbit): push, stretch in the air, front paws land,
  // hind legs swing forward, hind feet land ahead, rise into the next push.
  const push = rp(S, {
    tail: [-9.2, -9.6],
    haunch: { c: [-4.6, -7.4], r: [4.5, 4.0], a: -0.35 },
    body: { c: [0, -8.4], r: [7.0, 4.2], a: -0.32 },
    chest: { c: [4.4, -10.2], r: [2.8, 3.3], a: 0 },
    head: { c: [7.8, -14.2], a: 0.1 },
    earN: [[6.6, -16.4], [1.4, -20.8]],
    earF: [[5.6, -16.6], [0.2, -19.8]],
    armN: [[5.0, -9.4], [9.8, -6.4]],
    armF: [[4.4, -9.4], [8.8, -7.4]],
    shin: [[-5.2, -6.6], [-8.4, -3.8]],
    foot: [[-8.4, -3.8], [-11.6, -0.9]],
    farFoot: [1.4, -0.4],
  });
  const fly = rp(S, {
    tail: [-9.8, -12.4],
    haunch: { c: [-5.0, -10.4], r: [4.2, 3.9], a: -0.2 },
    body: { c: [0, -11.0], r: [7.4, 4.0], a: -0.1 },
    chest: { c: [5.0, -11.4], r: [2.8, 3.2], a: 0 },
    head: { c: [8.8, -14.8], a: 0.25 },
    earN: [[7.4, -17.2], [2.0, -21.0]],
    earF: [[6.4, -17.4], [0.8, -20.0]],
    armN: [[5.6, -10.2], [10.4, -6.2]],
    armF: [[5.0, -10.2], [9.4, -7.2]],
    shin: [[-6.0, -9.4], [-9.6, -8.0]],
    foot: [[-9.6, -8.0], [-13.4, -6.8]],
    farFoot: [1.2, -0.6],
  });
  const land = rp(S, {
    tail: [-8.6, -11.4],
    haunch: { c: [-4.2, -9.6], r: [4.4, 4.0], a: 0.1 },
    body: { c: [1.0, -7.8], r: [7.0, 4.2], a: 0.22 },
    chest: { c: [5.0, -6.6], r: [2.8, 3.3], a: 0 },
    head: { c: [8.6, -9.6], a: 0.4 },
    earN: [[7.0, -12.0], [2.0, -17.4]],
    earF: [[6.0, -12.2], [0.8, -16.4]],
    armN: [[5.6, -6.0], [7.4, -1.0]],
    armF: [[5.0, -6.0], [6.2, -1.0]],
    shin: [[-4.8, -8.6], [-6.4, -6.0]],
    foot: [[-6.4, -6.0], [-2.6, -5.0]],
    farFoot: [1.2, -0.5],
  });
  const gather = rp(S, {
    tail: [-7.6, -9.2],
    haunch: { c: [-2.8, -7.6], r: [4.6, 4.2], a: 0 },
    body: { c: [0.6, -7.6], r: [6.0, 4.8], a: -0.08 },
    chest: { c: [4.6, -6.6], r: [2.8, 3.3], a: 0 },
    head: { c: [8.0, -10.6], a: 0.3 },
    earN: [[6.6, -13.0], [1.8, -18.6]],
    earF: [[5.6, -13.2], [0.6, -17.6]],
    armN: [[5.2, -5.6], [3.4, -1.0]],
    armF: [[4.6, -5.6], [2.4, -1.0]],
    shin: [[-3.2, -6.2], [-1.6, -3.6]],
    foot: [[-1.6, -3.6], [3.2, -2.6]],
    farFoot: [1.2, -0.4],
  });
  const bunch = rp(S, {
    tail: [-8.0, -6.4],
    haunch: { c: [-3.0, -5.2], r: [4.8, 4.4], a: 0 },
    body: { c: [0, -6.8], r: [5.8, 4.8], a: -0.35 },
    chest: { c: [3.6, -7.8], r: [2.8, 3.4], a: 0 },
    head: { c: [6.6, -11.8], a: 0.2 },
    earN: [[5.6, -14.0], [1.4, -19.8]],
    earF: [[4.6, -14.2], [0.2, -18.8]],
    armN: [[4.6, -7.0], [7.4, -3.6]],
    armF: [[4.0, -7.0], [6.6, -4.4]],
    shin: [[-3.4, -4.2], [-5.0, -1.2]],
    foot: [[-5.0, -1.1], [2.6, -0.9]],
    farFoot: [1.0, 0],
  });
  const rise = rp(S, {
    tail: [-8.8, -7.4],
    haunch: { c: [-4.0, -6.2], r: [4.7, 4.2], a: -0.25 },
    body: { c: [0, -7.6], r: [6.6, 4.5], a: -0.45 },
    chest: { c: [4.0, -9.6], r: [2.8, 3.4], a: 0 },
    head: { c: [7.2, -13.6], a: 0.15 },
    earN: [[6.0, -15.8], [1.2, -21.0]],
    earF: [[5.0, -16.0], [0.0, -20.0]],
    armN: [[4.8, -8.6], [8.8, -5.2]],
    armF: [[4.2, -8.6], [7.8, -6.2]],
    shin: [[-4.4, -5.4], [-6.8, -2.4]],
    foot: [[-6.8, -2.4], [-2.0, -0.9]],
    farFoot: [1.2, -0.3],
  });
  const hop = [push, fly, land, gather, bunch, rise].map(rabbitFrame);
  void shift2;
  return assemble('rabbit', 'Wild Rabbit', [0.35, 0.3], ['animal', 'ambient'], { idle: { frames: idle, fps: 6 }, graze: { frames: graze, fps: 6 }, hop: { frames: hop, fps: 12 } }, RABBIT_OX, RABBIT_GY);
}

// =============================================================================================
