// Skeleton rig: body proportions + poses solved with 2-bone IK.
// Every item is drawn against the rig, so one hairstyle or armor works on
// all body types and in every pose without being redrawn.
//
// Screen conventions: 64x64 grid, y grows downward, the character stands in
// a 3/4 view facing RIGHT. "Near" limbs are the character's right arm/leg
// (screen-left, drawn in front); "far" limbs are on screen-right, behind.

import { add, len, norm, scale, sub, v, Vec } from './raster';
import type { BodyType, SpritePose } from './types';

export const GROUND = 60; // first empty row under the soles

export interface BodyParams {
  torsoLen: number;
  shoulderHalf: number;
  chestHalf: number;
  waistHalf: number;
  hipHalf: number;
  upperArm: number;
  forearm: number;
  thigh: number;
  shin: number;
  /** upper-arm top, elbow, forearm top, wrist radii */
  armR: [number, number, number, number];
  /** thigh top, knee, calf, ankle radii */
  legR: [number, number, number, number];
  headRx: number;
  headRy: number;
  neckW: number;
  handR: number;
  footLen: number;
  bust: number;
}

export const BODY_PARAMS: Record<BodyType, BodyParams> = {
  male: {
    torsoLen: 13,
    shoulderHalf: 7.8,
    chestHalf: 7.2,
    waistHalf: 5.3,
    hipHalf: 5.9,
    upperArm: 6.8,
    forearm: 5.8,
    thigh: 10,
    shin: 9.6,
    armR: [2.2, 1.8, 1.9, 1.4],
    legR: [3.0, 2.2, 2.2, 1.5],
    headRx: 6,
    headRy: 7,
    neckW: 2,
    handR: 1.8,
    footLen: 4.6,
    bust: 0,
  },
  female: {
    torsoLen: 12.4,
    shoulderHalf: 6.6,
    chestHalf: 6.6,
    waistHalf: 4.4,
    hipHalf: 6.5,
    upperArm: 6.4,
    forearm: 5.4,
    thigh: 9.8,
    shin: 9.3,
    armR: [1.9, 1.5, 1.6, 1.2],
    legR: [3.1, 2.1, 2.0, 1.3],
    headRx: 6,
    headRy: 7,
    neckW: 1.6,
    handR: 1.6,
    footLen: 4,
    bust: 1.8,
  },
  bulky: {
    torsoLen: 13.6,
    shoulderHalf: 10,
    chestHalf: 9.2,
    waistHalf: 7.4,
    hipHalf: 7.2,
    upperArm: 7,
    forearm: 6,
    thigh: 9.6,
    shin: 9.2,
    armR: [3.0, 2.5, 2.6, 1.9],
    legR: [3.7, 2.9, 2.8, 1.9],
    headRx: 6.2,
    headRy: 7,
    neckW: 2.7,
    handR: 2.2,
    footLen: 5,
    bust: 0,
  },
};

export type HandShape = 'relaxed' | 'fist' | 'open' | 'sign' | 'grip';

/** Hand targets: relative to a landmark, in arm-length units ('arm') or pixels ('px'). */
interface HandTarget {
  from: 'shoulder' | 'chest';
  x: number;
  y: number;
  units: 'arm' | 'px';
}

interface PoseFrame {
  lean: number;
  pelvisDx?: number;
  /** Extra pixels the shoulders/head drop (breathing). */
  chestDy?: number;
  headDx?: number;
  headDy?: number;
  handN: HandTarget;
  handF: HandTarget;
  /** Ankle positions relative to each hip, in leg-length units. */
  footN: Vec;
  footF: Vec;
  shapeN: HandShape;
  shapeF: HandShape;
  /** Optional whole-sprite shake (charging). */
  jitter?: number;
}

const arm = (x: number, y: number): HandTarget => ({ from: 'shoulder', x, y, units: 'arm' });
const chest = (x: number, y: number): HandTarget => ({ from: 'chest', x, y, units: 'px' });

const IDLE: PoseFrame = {
  lean: 3,
  handN: arm(-0.14, 0.95),
  handF: arm(0.2, 0.94),
  footN: v(-0.17, 0.985),
  footF: v(0.21, 0.975),
  shapeN: 'relaxed',
  shapeF: 'relaxed',
};

export const POSES: Record<SpritePose, PoseFrame[]> = {
  idle: [IDLE, IDLE, { ...IDLE, chestDy: 1 }, { ...IDLE, chestDy: 1 }],
  handsigns: [
    { ...IDLE, lean: 5, handN: chest(1, -1), handF: chest(2, -1), shapeN: 'sign', shapeF: 'sign' },
    { ...IDLE, lean: 5, handN: chest(1, -2), handF: chest(2, -2), shapeN: 'sign', shapeF: 'sign', chestDy: 0 },
    { ...IDLE, lean: 6, handN: chest(1, 0), handF: chest(2, 0), shapeN: 'sign', shapeF: 'sign' },
  ],
  attack: [
    {
      lean: -4,
      pelvisDx: -1,
      handN: arm(-0.55, 0.55),
      handF: arm(0.45, 0.55),
      footN: v(-0.3, 0.95),
      footF: v(0.3, 0.95),
      shapeN: 'grip',
      shapeF: 'fist',
    },
    {
      lean: 14,
      pelvisDx: 2,
      handN: arm(0.98, 0.1),
      handF: arm(-0.3, 0.75),
      footN: v(-0.42, 0.9),
      footF: v(0.38, 0.92),
      shapeN: 'grip',
      shapeF: 'fist',
    },
    {
      lean: 10,
      pelvisDx: 2,
      handN: arm(0.8, 0.55),
      handF: arm(-0.2, 0.8),
      footN: v(-0.42, 0.9),
      footF: v(0.38, 0.92),
      shapeN: 'grip',
      shapeF: 'fist',
    },
  ],
  cast: [
    {
      lean: 8,
      handN: chest(-1, 1),
      handF: arm(0.98, -0.08),
      footN: v(-0.3, 0.95),
      footF: v(0.3, 0.95),
      shapeN: 'sign',
      shapeF: 'open',
    },
    {
      lean: 9,
      pelvisDx: 1,
      handN: chest(-1, 0),
      handF: arm(0.98, -0.14),
      footN: v(-0.32, 0.94),
      footF: v(0.3, 0.95),
      shapeN: 'sign',
      shapeF: 'open',
    },
  ],
  hurt: [
    {
      lean: -14,
      pelvisDx: -2,
      headDx: -1,
      handN: arm(-0.45, 0.75),
      handF: arm(0.55, 0.6),
      footN: v(-0.25, 0.96),
      footF: v(0.3, 0.95),
      shapeN: 'open',
      shapeF: 'open',
    },
    {
      lean: -10,
      pelvisDx: -1,
      handN: arm(-0.35, 0.82),
      handF: arm(0.45, 0.7),
      footN: v(-0.22, 0.97),
      footF: v(0.28, 0.96),
      shapeN: 'relaxed',
      shapeF: 'relaxed',
    },
  ],
  victory: [
    {
      lean: 0,
      handN: arm(-0.12, -0.98),
      handF: chest(5, 8),
      footN: v(-0.2, 0.98),
      footF: v(0.24, 0.97),
      shapeN: 'fist',
      shapeF: 'fist',
    },
    {
      lean: 0,
      chestDy: -1,
      handN: arm(-0.1, -1),
      handF: chest(5, 8),
      footN: v(-0.2, 0.98),
      footF: v(0.24, 0.97),
      shapeN: 'fist',
      shapeF: 'fist',
    },
  ],
  charge: [
    {
      lean: 6,
      handN: arm(-0.35, 0.82),
      handF: arm(0.45, 0.8),
      footN: v(-0.36, 0.84),
      footF: v(0.42, 0.84),
      shapeN: 'fist',
      shapeF: 'fist',
    },
    {
      lean: 6,
      jitter: 1,
      handN: arm(-0.36, 0.8),
      handF: arm(0.46, 0.79),
      footN: v(-0.36, 0.84),
      footF: v(0.42, 0.84),
      shapeN: 'fist',
      shapeF: 'fist',
    },
  ],
};

export const POSE_FPS: Record<SpritePose, number> = {
  idle: 3,
  handsigns: 5,
  attack: 6,
  cast: 5,
  hurt: 4,
  victory: 3,
  charge: 10,
};

export interface Rig {
  body: BodyType;
  bp: BodyParams;
  pose: SpritePose;
  frame: number;
  lean: number;
  pelvis: Vec;
  neck: Vec;
  up: Vec;
  right: Vec;
  head: Vec; // integer head center
  shoulderN: Vec;
  shoulderF: Vec;
  elbowN: Vec;
  elbowF: Vec;
  wristN: Vec;
  wristF: Vec;
  handN: Vec;
  handF: Vec;
  hipN: Vec;
  hipF: Vec;
  kneeN: Vec;
  kneeF: Vec;
  ankleN: Vec;
  ankleF: Vec;
  shapeN: HandShape;
  shapeF: HandShape;
  /** Torso-local point: x along the shoulder line (+ toward facing side), y up from the pelvis. */
  T: (x: number, y: number) => Vec;
}

function solve2(root: Vec, target: Vec, l1: number, l2: number, bend: 1 | -1): { mid: Vec; end: Vec } {
  const d0 = sub(target, root);
  const dist = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, len(d0)));
  const base = Math.atan2(d0.y, d0.x);
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const ang = base + bend * a;
  const mid = add(root, v(Math.cos(ang) * l1, Math.sin(ang) * l1));
  const end = add(root, scale(norm(d0), dist));
  return { mid, end };
}

export function buildRig(body: BodyType, pose: SpritePose, frame: number): Rig {
  const bp = BODY_PARAMS[body];
  const frames = POSES[pose] || POSES.idle;
  const f = frames[((frame % frames.length) + frames.length) % frames.length];

  const leanRad = (f.lean * Math.PI) / 180;
  const up = v(Math.sin(leanRad), -Math.cos(leanRad));
  const right = v(Math.cos(leanRad), Math.sin(leanRad));
  const legLen = bp.thigh + bp.shin;

  // Pelvis height is solved so the lowest ankle sits on the ground.
  const footDrop = Math.max(f.footN.y, f.footF.y) * legLen;
  const jitter = f.jitter ? (frame % 2 === 0 ? -f.jitter : f.jitter) * 0.5 : 0;
  const pelvis = v(31.5 + (f.pelvisDx || 0) + jitter, GROUND - 2.2 - footDrop);

  const T = (x: number, y: number): Vec => add(pelvis, add(scale(right, x), scale(up, y)));

  const hipN = T(-bp.hipHalf * 0.55, 0.5);
  const hipF = T(bp.hipHalf * 0.45, 0.5);
  const legN = solve2(hipN, add(hipN, scale(f.footN, legLen)), bp.thigh, bp.shin, -1);
  const legF = solve2(hipF, add(hipF, scale(f.footF, legLen)), bp.thigh, bp.shin, -1);

  const chestDy = f.chestDy || 0;
  const neck = add(T(0.6, bp.torsoLen), v(0, chestDy));
  const shoulderN = add(T(-bp.shoulderHalf * 0.82, bp.torsoLen - 2.2), v(0, chestDy));
  const shoulderF = add(T(bp.shoulderHalf * 0.55, bp.torsoLen - 2.2), v(0, chestDy));
  const chestFront = add(T(bp.chestHalf * 0.5, bp.torsoLen - 6), v(0, chestDy));

  const armLen = bp.upperArm + bp.forearm + bp.handR;
  const resolve = (t: HandTarget, shoulder: Vec): Vec => {
    if (t.from === 'chest') return add(chestFront, v(t.x, t.y));
    return add(shoulder, scale(v(t.x, t.y), armLen));
  };
  const solveArm = (shoulder: Vec, t: HandTarget) => {
    const target = resolve(t, shoulder);
    // Aim the wrist a little short of the target so the hand lands on it.
    const toT = sub(target, shoulder);
    const wristTarget = sub(target, scale(norm(toT), bp.handR * 0.8));
    const r = solve2(shoulder, wristTarget, bp.upperArm, bp.forearm, 1);
    const dir = norm(sub(r.end, r.mid));
    return { elbow: r.mid, wrist: r.end, hand: add(r.end, scale(dir, bp.handR * 0.9)) };
  };
  const aN = solveArm(shoulderN, f.handN);
  const aF = solveArm(shoulderF, f.handF);

  const headY = neck.y - bp.headRy - 1.4 + (f.headDy || 0);
  const head = v(Math.round(neck.x + 0.4 + (f.headDx || 0)), Math.round(headY));

  return {
    body,
    bp,
    pose,
    frame,
    lean: f.lean,
    pelvis,
    neck,
    up,
    right,
    head,
    shoulderN,
    shoulderF,
    elbowN: aN.elbow,
    elbowF: aF.elbow,
    wristN: aN.wrist,
    wristF: aF.wrist,
    handN: aN.hand,
    handF: aF.hand,
    hipN,
    hipF,
    kneeN: legN.mid,
    kneeF: legF.mid,
    ankleN: legN.end,
    ankleF: legF.end,
    shapeN: f.shapeN,
    shapeF: f.shapeF,
    T,
  };
}

export function frameCount(pose: SpritePose): number {
  return (POSES[pose] || POSES.idle).length;
}
