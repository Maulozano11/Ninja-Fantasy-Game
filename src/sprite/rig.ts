// Skeleton rig: body proportions + poses solved with 2-bone IK.
// Every item is drawn against the rig, so one hairstyle or armor works on
// all body types and in every pose without being redrawn.
//
// Screen conventions: 64x64 design grid (rendered at 128x128), y grows downward, the character stands in
// a 3/4 view facing RIGHT. "Near" limbs are the character's right arm/leg
// (screen-left, drawn in front); "far" limbs are on screen-right, behind.

import { add, len, norm, scale, sub, v, Vec } from './raster';
import type { BodyType, CastStyle, SpritePose } from './types';

export const GROUND = 60; // ground line under the body (shadow centre)
/** Ankle heights, 3/4 front view: the near foot stands lower on screen, the far foot higher. */
export const ANKLE_N = GROUND - 4;
export const FAR_LIFT = 2;
const FAR_HIP_LIFT = 1.5;

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
  /**
   * How far the crotch of the torso shape (and of trousers and shorts) drops
   * below the hips, in torso-local units. Wide-hipped bodies keep it high so
   * no cloth webs across the gap between the thighs.
   */
  crotch: number;
  /** The head group (head, face, hair, masks, forehead gear) is drawn in head-local units and shrunk by this factor. */
  headScale: number;
}

export const BODY_PARAMS: Record<BodyType, BodyParams> = {
  male: {
    torsoLen: 14.6,
    shoulderHalf: 7.4,
    chestHalf: 6.8,
    waistHalf: 5.5,
    hipHalf: 5.4,
    upperArm: 6.3,
    forearm: 5.5,
    thigh: 8.1,
    shin: 7.7,
    armR: [2.35, 2.0, 2.25, 1.5],
    legR: [2.65, 2.0, 2.0, 1.4],
    headRx: 6,
    headRy: 7,
    neckW: 1.6,
    handR: 2.0,
    footLen: 4.4,
    bust: 0,
    crotch: -3.4,
    headScale: 0.78,
  },
  female: {
    torsoLen: 13.8,
    shoulderHalf: 6.3,
    chestHalf: 6.1,
    waistHalf: 3.9,
    hipHalf: 7.1,
    upperArm: 6.0,
    forearm: 5.2,
    thigh: 8.0,
    shin: 7.5,
    armR: [2.0, 1.7, 1.9, 1.28],
    legR: [3.2, 2.05, 1.9, 1.2],
    headRx: 6,
    headRy: 7,
    neckW: 1.35,
    handR: 1.75,
    footLen: 3.9,
    bust: 1.5,
    crotch: -1.9,
    headScale: 0.76,
  },
  // Slimmer and curvier than 'female': narrow shoulders and waist, fuller bust
  // and hips, slender arms and long legs with a full thigh and fine ankles.
  slender: {
    torsoLen: 13.8,
    shoulderHalf: 5.6,
    chestHalf: 5.6,
    waistHalf: 2.9,
    hipHalf: 7.0,
    upperArm: 6.0,
    forearm: 5.2,
    thigh: 8.3,
    shin: 7.8,
    armR: [1.7, 1.4, 1.6, 1.05],
    legR: [3.2, 1.75, 1.7, 1.0],
    headRx: 6,
    headRy: 7,
    neckW: 1.15,
    handR: 1.55,
    footLen: 3.6,
    bust: 2.2,
    crotch: -1.7,
    headScale: 0.76,
  },
  bulky: {
    torsoLen: 15.2,
    shoulderHalf: 9.6,
    chestHalf: 8.8,
    waistHalf: 7.5,
    hipHalf: 6.9,
    upperArm: 6.5,
    forearm: 5.7,
    thigh: 7.9,
    shin: 7.4,
    armR: [2.9, 2.45, 2.75, 1.85],
    legR: [3.4, 2.6, 2.5, 1.75],
    headRx: 6.2,
    headRy: 7,
    neckW: 2.3,
    handR: 2.4,
    footLen: 4.8,
    bust: 0,
    crotch: -3.4,
    headScale: 0.8,
  },
};

/**
 * fist: closed fist · grip: around a weapon handle, or a fist when empty-handed ·
 * hold: around a weapon handle, or relaxed when empty-handed · relaxed · open · sign.
 */
export type HandShape = 'relaxed' | 'fist' | 'open' | 'sign' | 'grip' | 'hold';

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
  // Upright, chest slightly out, head over the shoulders (no hunch).
  lean: -2,
  // Near arm leans out a little from shoulder to fist, like the reference.
  handN: arm(-0.27, 0.96),
  // The free hand hangs clear of the body as a fist beside the hip, like the reference.
  handF: arm(0.34, 0.9),
  footN: v(-0.1, 0.985),
  footF: v(0.14, 0.98),
  shapeN: 'hold',
  shapeF: 'fist',
};

/** Rig poses: the sprite poses plus one cast pose per cast style ('cast' itself is the runes pose). */
export type RigPose = SpritePose | 'castBook' | 'castSphere' | 'castLightning' | 'castWave' | 'castFlash';

const CAST_POSES: Record<CastStyle, RigPose> = {
  signs: 'handsigns',
  runes: 'cast',
  book: 'castBook',
  sphere: 'castSphere',
  lightning: 'castLightning',
  wave: 'castWave',
  flash: 'castFlash',
};

/** The rig pose that plays for a sprite pose: 'cast' turns into the chosen cast style's pose. */
export function rigPoseFor(pose: SpritePose, style: CastStyle = 'runes'): RigPose {
  return pose === 'cast' ? CAST_POSES[style] ?? 'cast' : pose;
}

export const POSES: Record<RigPose, PoseFrame[]> = {
  idle: [IDLE, IDLE, { ...IDLE, chestDy: 1 }, { ...IDLE, chestDy: 1 }],
  handsigns: [
    { ...IDLE, lean: 0, handN: chest(1, -1), handF: chest(2, -1), shapeN: 'sign', shapeF: 'sign' },
    { ...IDLE, lean: 0, handN: chest(1, -2), handF: chest(2, -2), shapeN: 'sign', shapeF: 'sign', chestDy: 0 },
    { ...IDLE, lean: 1, handN: chest(1, 0), handF: chest(2, 0), shapeN: 'sign', shapeF: 'sign' },
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
  // A grimoire held open before the chest, the free hand raised to cast.
  castBook: [
    { lean: 2, handN: chest(3, 3), handF: arm(0.82, -0.32), footN: v(-0.2, 0.97), footF: v(0.24, 0.97), shapeN: 'open', shapeF: 'open' },
    { lean: 2, chestDy: 1, handN: chest(3, 3.6), handF: arm(0.84, -0.38), footN: v(-0.2, 0.97), footF: v(0.24, 0.97), shapeN: 'open', shapeF: 'open' },
  ],
  // A spinning sphere held out in the near palm.
  castSphere: [
    { lean: 6, handN: arm(0.62, 0.22), handF: arm(0.26, 0.8), footN: v(-0.3, 0.95), footF: v(0.32, 0.95), shapeN: 'open', shapeF: 'fist' },
    { lean: 7, pelvisDx: 1, handN: arm(0.66, 0.2), handF: arm(0.27, 0.79), footN: v(-0.32, 0.94), footF: v(0.32, 0.95), shapeN: 'open', shapeF: 'fist' },
  ],
  // Crouched, the crackling hand held low and forward, the other gripping its wrist.
  castLightning: [
    { lean: 10, handN: arm(0.46, 0.72), handF: arm(0.2, 0.86), footN: v(-0.36, 0.9), footF: v(0.4, 0.92), shapeN: 'open', shapeF: 'fist' },
    { lean: 11, jitter: 1, handN: arm(0.48, 0.71), handF: arm(0.21, 0.85), footN: v(-0.36, 0.9), footF: v(0.4, 0.92), shapeN: 'open', shapeF: 'fist' },
  ],
  // Both palms cupped together at the back hip, charging a ball of energy.
  castWave: [
    { lean: -8, handN: chest(-10, 8), handF: chest(-8, 7), footN: v(-0.38, 0.92), footF: v(0.42, 0.94), shapeN: 'open', shapeF: 'open' },
    { lean: -8, chestDy: 1, jitter: 1, handN: chest(-10.3, 8.4), handF: chest(-8.3, 7.4), footN: v(-0.38, 0.92), footF: v(0.42, 0.94), shapeN: 'open', shapeF: 'open' },
  ],
  // Both arms thrust forward, palms open, charging a blinding flash.
  castFlash: [
    { lean: 4, handN: arm(0.96, -0.02), handF: arm(0.95, -0.06), footN: v(-0.32, 0.95), footF: v(0.34, 0.95), shapeN: 'open', shapeF: 'open' },
    { lean: 5, jitter: 1, handN: arm(0.97, 0), handF: arm(0.96, -0.04), footN: v(-0.33, 0.95), footF: v(0.34, 0.95), shapeN: 'open', shapeF: 'open' },
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
  pose: RigPose;
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

export function buildRig(body: BodyType, pose: RigPose, frame: number): Rig {
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
  const pelvis = v(31.5 + (f.pelvisDx || 0) + jitter, ANKLE_N - footDrop);

  const T = (x: number, y: number): Vec => add(pelvis, add(scale(right, x), scale(up, y)));

  const hipN = T(-bp.hipHalf * 0.5, 0.3);
  // The far side sits further back, so it is drawn higher on screen: the hip
  // a little, the foot by FAR_LIFT. Its leg stays about as straight as the near one.
  const hipF = sub(T(bp.hipHalf * 0.42, 0.3), v(0, FAR_HIP_LIFT));
  const legN = solve2(hipN, add(hipN, scale(f.footN, legLen)), bp.thigh, bp.shin, -1);
  const legF = solve2(hipF, add(hipF, add(scale(f.footF, legLen), v(0, FAR_HIP_LIFT - FAR_LIFT))), bp.thigh, bp.shin, -1);

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

  const headY = neck.y - 5.9 * bp.headScale + (f.headDy || 0);
  const head = v(Math.round(neck.x - 0.4 + (f.headDx || 0)), Math.round(headY));

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

export function frameCount(pose: RigPose): number {
  return (POSES[pose] || POSES.idle).length;
}
