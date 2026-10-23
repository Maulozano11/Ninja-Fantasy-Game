// Skeleton rig: body proportions + poses solved with 2-bone IK.
// Every item is drawn against the rig, so one hairstyle or armor works on
// all body types and in every pose without being redrawn.
//
// Screen conventions: the figure's 64x64 design box sits at PAD in the frame (raster.ts), y grows downward, the character stands in
// a 3/4 view facing RIGHT. "Near" limbs are the character's right arm/leg
// (screen-left, drawn in front); "far" limbs are on screen-right, behind.

import { FEMALE_BASE_JOINTS } from './femaleBaseArt';
import { add, len, norm, PAD, RES, scale, sub, v, Vec } from './raster';
import type { ArmType, BodyType, CastStyle, SpritePose } from './types';

export const GROUND = PAD.y + 60; // ground line under the body (shadow centre)
/** The design x the feet stand on (the middle of the figure's box). */
export const FEET_X = PAD.x + 32;
/** Where the feet touch the ground in a frame, in fine pixels (frames are drawn from here). */
export const FEET = { x: FEET_X * RES, y: GROUND * RES };
/** Ankle heights, 3/4 front view: the near foot stands lower on screen, the far foot higher. */
export const ANKLE_N = GROUND - 4;
export const FAR_LIFT = 2;
const FAR_HIP_LIFT = 1.5;

/**
 * How much lower than our usual ankles a body's ankle stands on side `s`, in design units: the near
 * ankle by BodyParams.ankleLift, the far one (higher on screen, its foot shorter) by half of it.
 */
export function ankleLiftOf(bp: BodyParams, s: 'N' | 'F'): number {
  const a = bp.ankleLift || 0;
  return s === 'N' ? a : a / 2;
}

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
  /**
   * How much lower than ANKLE_N the near ankle stands, in design units (the far ankle half as much,
   * see ankleLiftOf). The female bodies stand on the owner's small feet (his game-scale heroines:
   * about 8 rows from the ankle to the sole, against our 12), so their ankles sit nearer the ground
   * and every foot template is drawn that many rows shorter (ctx.ts footDraw).
   */
  ankleLift?: number;
  /**
   * Where the waist (the narrowest point of the torso shape) sits above the hips, in torso-local
   * units; 5.4 when not given. The female bodies' long torso takes its waist higher, as the owner
   * draws it, so the waist curves in under the bust and the hips flare below it.
   */
  waistY?: number;
  /**
   * How much longer the far arm's forearm is than the near one's, in design units. The owner's
   * heroines at our scale (docs/reference/{lyra,aurelia,saya}-game-scale-owner-reference.jpg) hang
   * the far fist lower than the near one, beside the far hip.
   */
  farLonger?: number;
  /**
   * How many degrees further out from the body a hanging arm hangs, [near, far]: his heroines' free
   * hands hang clear of the hips (see hangsDown).
   */
  hangOut?: [number, number];
  /**
   * On a body fitted to the owner's joints (`fit`): how many degrees (with the clock) each forearm,
   * [near, far], turns about his elbow at rest from where his bare woman holds it. Only a look's own
   * arms set it (LONG_ARMS).
   */
  restTurn?: [number, number];
  /**
   * A body painted by the owner piece by piece (the female bodies: his bare female body,
   * femaleBaseArt.ts): his joints at rest, in design units of the frame. The rig is fitted to them:
   * at idle every joint is his (so the body is his picture), and in every other pose the torso keeps
   * his neck, shoulders and hips and each limb his lengths, so his pieces meet at the joints. See
   * solveFit.
   */
  fit?: BodyFit;
}

/** The joints of a fitted body (BodyParams.fit). */
export type FitJoint = keyof typeof FEMALE_BASE_JOINTS;
export type BodyFit = Record<FitJoint, Vec>;

/** His joints from the art module (fine pixels) in design units. */
const fitFrom = (j: Record<FitJoint, readonly [number, number]>): BodyFit =>
  Object.fromEntries(Object.entries(j).map(([k, [x, y]]) => [k, v(x / RES, y / RES)])) as BodyFit;

/** The owner's bare female body (docs/reference/female-base-owner-reference.jpg) at rest. */
const FEMALE_BASE_FIT = fitFrom(FEMALE_BASE_JOINTS);

/** A fitted body's limb lengths, the same as his at rest (design units). */
function fitLen(fit: BodyFit) {
  const d = (a: FitJoint, b: FitJoint) => len(sub(fit[b], fit[a]));
  return {
    upperArmN: d('shoulderN', 'elbowN'),
    upperArmF: d('shoulderF', 'elbowF'),
    forearmN: d('elbowN', 'wristN'),
    forearmF: d('elbowF', 'wristF'),
    thighN: d('hipN', 'kneeN'),
    thighF: d('hipF', 'kneeF'),
    shinN: d('kneeN', 'ankleN'),
    shinF: d('kneeF', 'ankleF'),
  };
}

/**
 * Whether a hand target is a hanging arm (BodyParams.hangOut): aimed from the shoulder within
 * HANG_SPREAD degrees of straight down and at least HANG_REACH of the arm's length away, nearly
 * straight. A fist drawn up to a guard, a punch or an arm swung far back is not.
 */
const HANG_SPREAD = 35;
const HANG_REACH = 0.85;
function hangsDown(t: HandTarget): boolean {
  if (t.from !== 'shoulder' || Math.hypot(t.x, t.y) < HANG_REACH) return false;
  return Math.abs((Math.atan2(t.y, t.x) * 180) / Math.PI - 90) <= HANG_SPREAD;
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
  // The female bodies are the owner's bare female body (docs/reference/female-base-owner-reference.jpg,
  // 2026-10-21: "una base del cuerpo femenino sin ropa para que entiendas la base del cuerpo"): his
  // pieces ride the rig fitted to his joints (`fit`, solveFit), so the lengths below are his (the near
  // side's; the far side's come from the fit) and the widths are his, for the items drawn on the limbs.
  // Hands and feet are his pieces too (body.ts drawBaseBody); his heroines' small hands
  // (femaleBodyArt.ts FEMALE_HANDS) hold a weapon, point, open and cradle.
  female: {
    torsoLen: 13.3,
    shoulderHalf: 5.1,
    chestHalf: 5.3,
    waistHalf: 3.5,
    hipHalf: 6.4,
    upperArm: 6.8,
    forearm: 4.61,
    thigh: 10.89,
    shin: 7.52,
    armR: [1.9, 1.4, 1.6, 1.0],
    legR: [2.9, 1.75, 2.0, 1.0],
    headRx: 6,
    headRy: 7,
    neckW: 1.35,
    handR: 1.4,
    footLen: 3.9,
    bust: 1.5,
    crotch: -1.9,
    headScale: 0.7,
    ankleLift: 0.5,
    waistY: 5.5,
    hangOut: [8, 0],
    fit: FEMALE_BASE_FIT,
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
export type HandShape = 'relaxed' | 'fist' | 'open' | 'sign' | 'grip' | 'hold' | 'point' | 'cradle';

/**
 * Hand targets: relative to a landmark, in arm-length units ('arm') or pixels ('px'); 'frame' is a
 * point of the frame itself (design units), where the owner drew the hand (PoseFrame.at).
 */
interface HandTarget {
  from: 'shoulder' | 'chest' | 'kneeN' | 'kneeF' | 'frame';
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
  /**
   * On a body fitted to the owner's joints (BodyParams.fit) the head stays on his neck at his neck's
   * length, the neck turned this many degrees forward from his at rest; headDx/headDy are not used
   * there. The throw pitches the body far forward and his heroines keep the head up on the neck, looking
   * at the target (docs/reference/poses/lyra-throw-owner-reference.jpg): a head moved by a fixed offset
   * stretched his neck to twice its length.
   */
  neckPitch?: number;
  handN: HandTarget;
  handF: HandTarget;
  /** Ankle positions relative to each hip, in leg-length units. */
  footN: Vec;
  footF: Vec;
  shapeN: HandShape;
  shapeF: HandShape;
  /** Optional whole-sprite shake (charging). */
  jitter?: number;
  /** The far hand works in front of the body (hand signs, a two-handed charge): draw it over the torso. */
  farHandFront?: boolean;
  /** -1 bends the near elbow down instead of out (an arm carrying something at the side). */
  bendN?: 1 | -1;
  /**
   * The held weapon (or technique) has left the near hand: it was thrown ('throw'). The hand is
   * drawn open and the weapon is not drawn on the body; the battle draws it in flight.
   */
  released?: boolean;
  /**
   * The body is pitched so far forward that a cape cannot hang straight down from the shoulders:
   * it is hung from the body standing upright and turned forward with it, so it lies along the back
   * and streams out behind (compose.ts drawPitchedCape).
   */
  streamBack?: boolean;
  /**
   * Pelvis height above the ankle line, in leg lengths. When set it replaces
   * the ground solve and the feet hang from level hips (the lean no longer
   * tips one foot up and the other down), so a step cycle places every foot
   * exactly: planted feet at `hip` (plus the ground's depth slope), raised
   * ones above it.
   */
  hip?: number;
  /** Sitting on the camp seat: the hips stay at the seat's height on every body (see BodyParams.ankleLift). */
  seat?: boolean;
  /**
   * Raises the whole body this many design units above the ground, so both
   * feet leave it (the flight phase of a run); negative lowers it (a pose that
   * stands on the far foot alone puts that foot on the ground line).
   */
  lift?: number;
  /**
   * Lowers the pelvis this many design units while the feet stay where the
   * pose puts them (the knees bend to take it): the "down" of a step.
   */
  sink?: number;
  /**
   * Keeps the body on the fine pixel grid: the pelvis drops onto the nearest
   * fine pixel row (the planted feet still reach the ground) and the head sits
   * on half design units, so a looping cycle moves in clean 1 px steps
   * instead of shimmering.
   */
  snap?: boolean;
  /**
   * The figure is drawn upright and then laid on the ground for display: the
   * finished sprite is transposed (head toward the back, light still from
   * the upper left) and set on the ground line. See Rig.lay.
   */
  lie?: boolean;
  /**
   * A pose copied from the owner's own frames: where he put the body, in design units of the frame
   * (PoseAt). Every body is posed toward the same points, so they all sit or move as he drew it.
   */
  at?: PoseAt;
}

/**
 * Where an owner's frame puts the body (design units of the frame; fine pixels are twice these). The
 * pelvis stands at `pelvis`, or, `seated`, rests on a seat whose top is `pelvis.y` (each body's hips
 * that far above it: seatedHip); the torso leans so that the neck is on the line from the pelvis to
 * `neck` (each body keeps its own torso length); the ankles go to `ankleN` and `ankleF`, or with
 * `ground` to those x on each body's own ground (the ankle heights it stands at); a foot its leg cannot
 * reach slides back toward the seat, or on legs too short for the seat hangs below a knee brought
 * forward toward his (solveAt). The hands take 'frame' targets.
 */
interface PoseAt {
  pelvis: Vec;
  seated?: boolean;
  neck: Vec;
  ankleN: Vec;
  ankleF: Vec;
  ground?: boolean;
  /** Where his knees are, seated: a body whose legs are too short for the seat brings its knees toward them. */
  kneeN?: Vec;
  kneeF?: Vec;
}

/**
 * Seated, how steeply a thigh may hang (its drop from the hip over its length) with the foot on the
 * ground: steeper than that the body would stand against the seat, not sit on it, so its feet hang.
 */
const SEAT_STEEP = 0.8;

/** A point of the frame, in fine pixels, as a hand target (PoseAt). */
const at = (x: number, y: number): HandTarget => ({ from: 'frame', x: x / RES, y: y / RES, units: 'px' });
/** A point of the frame, in fine pixels, in design units. */
const fp = (x: number, y: number): Vec => v(x / RES, y / RES);

/**
 * How far above a seat's top a body's pelvis sits (design units): the male and bulky bodies' as the
 * camp seat has always had them (0.74 leg lengths above the ankles, on a seat 26 px above the feet),
 * the fitted female bodies' 4.5 px (his pelvis is his hip joints, that far above the seat of his
 * briefs).
 */
const seatedHip = (bp: BodyParams): number => (bp.fit ? 2.25 : 2.7);

/**
 * The lean (degrees) that puts the neck on the line from the pelvis to `neck`, for a torso whose neck
 * sits at `local` (Rig.T coordinates): the angle of that line from the vertical, less the neck's own
 * angle in the torso.
 */
function leanToward(neck: Vec, pelvis: Vec, local: Vec): number {
  const phi = Math.atan2(neck.x - pelvis.x, pelvis.y - neck.y);
  return ((phi - Math.atan2(local.x, local.y)) * 180) / Math.PI;
}

const arm = (x: number, y: number): HandTarget => ({ from: 'shoulder', x, y, units: 'arm' });
const chest = (x: number, y: number): HandTarget => ({ from: 'chest', x, y, units: 'px' });
/** A hand resting on (or near) a knee, in pixels from the knee joint. */
const knee = (side: 'N' | 'F', x: number, y: number): HandTarget => ({ from: side === 'N' ? 'kneeN' : 'kneeF', x, y, units: 'px' });

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

/**
 * Rig poses: the sprite poses plus one cast pose per cast style ('cast' itself
 * is the runes pose) and one training drill per kind of weapon ('train' itself
 * is the blade kata).
 */
export type RigPose = SpritePose | 'castBook' | 'castSphere' | 'castLightning' | 'castWave' | 'castFlash' | 'castEye' | 'castScript' | 'trainPole' | 'trainFist';

const CAST_POSES: Record<CastStyle, RigPose> = {
  signs: 'handsigns',
  runes: 'cast',
  book: 'castBook',
  sphere: 'castSphere',
  lightning: 'castLightning',
  wave: 'castWave',
  flash: 'castFlash',
  eye: 'castEye',
  script: 'castScript',
};

/**
 * The rig pose that plays for a sprite pose: 'cast' turns into the chosen cast
 * style's pose, and 'train' into the drill for the held item (`held`: its item
 * id, missing when the hands are empty or the weapon is stowed). Every drill
 * has the same number of frames, so frameCount(rigPoseFor('train')) holds for
 * any weapon.
 */
export function rigPoseFor(pose: SpritePose, style: CastStyle = 'runes', held?: string): RigPose {
  if (pose === 'cast') return CAST_POSES[style] ?? 'cast';
  if (pose === 'train') return trainingFor(held);
  return pose;
}

/** Blades train a sword kata, polearms a staff drill, everything else (bare hands, held techniques) strikes and kicks. */
function trainingFor(held: string | undefined): RigPose {
  if (held === 'held_gilded_rapier') return 'train';
  if (held === 'held_naginata' || held === 'held_dawn_staff') return 'trainPole';
  if (held === 'held_katana' || held === 'held_crystal' || held === 'held_ice_crystal' || held === 'held_flame_sword' || held === 'held_kunai') return 'train';
  return 'trainFist';
}

/** Both grimoire styles: the open book carried at the side (elbow down), the far arm straight out pointing. */
const GRIMOIRE_POSE: PoseFrame[] = [
  { lean: 0, handN: arm(-0.55, 0.76), bendN: -1, handF: arm(1.0, -0.06), footN: v(-0.34, 0.96), footF: v(0.36, 0.96), shapeN: 'cradle', shapeF: 'point' },
  { lean: 0, chestDy: 1, handN: arm(-0.55, 0.78), bendN: -1, handF: arm(1.0, -0.04), footN: v(-0.34, 0.96), footF: v(0.36, 0.96), shapeN: 'cradle', shapeF: 'point' },
];

/** Grimoire II holds the same stance for its 8-frame writing animation. */
const SCRIPT_POSE: PoseFrame[] = [0, 0, 1, 1, 0, 0, 1, 1].map((i) => GRIMOIRE_POSE[i]);

// ---------------------------------------------------------------------------
// Battle-map movement: walk, run, crouch, sneak, downed
// ---------------------------------------------------------------------------

/** A foot in a step cycle: [forward of its hip, raised off the ground], in leg lengths. */
type Foot = [number, number];

/**
 * 3/4 ground plane: a foot set down further forward is also nearer the
 * viewer, so it stands this much lower on screen (leg lengths per leg length
 * forward). It keeps the near foot reading in front when it crosses the far one.
 */
const DEPTH = 0.12;

/** Planted foot height under a level hip (leg lengths) at `x` forward, on the sloped ground. */
const groundY = (h: number, x: number) => h + DEPTH * x;
/** Lowest a foot `x` forward of its hip can reach. */
const reachY = (x: number) => Math.sqrt(Math.max(0, 0.992 * 0.992 - x * x));

/**
 * A step cycle: one leg's feet per frame, the other leg the same `half` a
 * cycle later. Planted feet (raise 0) stand on the ground plane, raised ones
 * hang that much above it. The hips are carried at one height for the whole
 * cycle, so the body only moves where a frame asks for it (sink, lift): as
 * high as every planted leg can reach, counting the `sunk` leg lengths a
 * frame's sink brings the hips down by.
 */
function stepCycle(hip: number, leg: Foot[], half: number, sunk: (i: number) => number = () => 0): { hip: number; footN: Vec; footF: Vec }[] {
  const n = leg.length;
  let h = hip;
  leg.forEach((_, i) => {
    for (const [x, up] of [leg[i], leg[(i + half) % n]]) if (!up) h = Math.min(h, reachY(x) - DEPTH * x + sunk(i));
  });
  const at = ([x, up]: Foot, i: number) => v(x, Math.min(groundY(h, x) - up, reachY(x) + sunk(i)));
  return leg.map((f, i) => ({ hip: h, footN: at(f, i), footF: at(leg[(i + half) % n], i) }));
}

/** A hand `x` arm lengths in front of (+) or behind (-) its shoulder, `reach` arm lengths away (1 = straight arm). */
const swing = (x: number, reach: number): HandTarget => arm(x, Math.sqrt(Math.max(0.02, reach * reach - x * x)));

/**
 * Walk, 8 frames: contact, down, passing and up for each leg. The legs swap
 * every 4 frames, the arms swing against them, and the body is 1 px lower on
 * contact and down than on passing and up. Upright and light.
 */
const WALK_LEG: Foot[] = [
  [0.2, 0], // contact: the heel lands in front
  [0.1, 0], // down: the weight comes on, the knee gives
  [0.0, 0], // passing: under the hip
  [-0.1, 0], // up: pushing off
  [-0.2, 0], // the other foot lands: the toes leave the ground behind
  [-0.13, 0.07], // the foot comes up behind, the knee bending
  [0.02, 0.085], // passing: knee forward, the foot under the body
  [0.14, 0.04], // reaching forward to land
];
// The 1 px sink on contact and down lets the spread legs stay nearly straight.
const WALK_STEPS = stepCycle(0.975, WALK_LEG, 4, (i) => (i % 4 < 2 ? 0.03 : 0));
const WALK: PoseFrame[] = WALK_STEPS.map((legs, i) => {
  const c = Math.cos((i / 8) * Math.PI * 2); // +1 when the near leg is forward
  return {
    lean: 1.5,
    snap: true,
    sink: i % 4 < 2 ? 0.5 : 0,
    ...legs,
    // The arms swing against the legs; the near (weapon) arm a little less.
    handN: swing(-0.12 - 0.15 * c, 0.94),
    handF: swing(0.2 + 0.2 * c, 0.93 - 0.05 * Math.max(0, c)),
    shapeN: 'hold',
    shapeF: 'relaxed',
  };
});

/**
 * Run, 6 frames: contact, down and a flight (both feet off the ground) for
 * each leg, leaning into it. The free arm pumps with the elbow bent; the near
 * arm swings low and back, so a weapon is carried trailing behind.
 */
const RUN_LEG: Foot[] = [
  [0.18, 0], // contact under the body
  [-0.05, 0], // down: the knee takes the weight
  [-0.34, 0], // push-off: the toes leave the ground (flight)
  [-0.3, 0.34], // the heel kicks up behind
  [0.12, 0.4], // the knee drives through, high
  [0.33, 0.13], // reaching forward to land (flight)
];
const RUN_STEPS = stepCycle(0.9, RUN_LEG, 3);
const RUN: PoseFrame[] = RUN_STEPS.map((legs, i) => {
  const a = (i / 6) * Math.PI * 2;
  const c = Math.cos(a); // +1 when the near leg is forward
  const s = Math.sin(a);
  return {
    lean: 10,
    snap: true,
    sink: i % 3 === 1 ? 1 : 0,
    lift: i % 3 === 2 ? 1.5 : 0,
    ...legs,
    handN: arm(-0.18 - 0.27 * c + 0.05 * s, 0.6 - 0.08 * c),
    handF: arm(0.22 + 0.36 * c - 0.05 * s, 0.46 - 0.16 * c),
    shapeN: 'grip',
    shapeF: 'fist',
  };
});

/**
 * Sneak, 6 frames: a crouched walk on the balls of the feet, knees lifted,
 * the weapon hand low and ready, the free hand forward for balance.
 */
const SNEAK_LEG: Foot[] = [
  [0.15, 0], // the foot set down in front
  [0.03, 0], // the weight comes over it
  [-0.09, 0], // rolling off behind
  [-0.15, 0.04], // the other foot is down: this one peels off
  [-0.02, 0.14], // passing, knee high
  [0.1, 0.08], // feeling forward
];
const SNEAK_STEPS = stepCycle(0.78, SNEAK_LEG, 3);
const SNEAK: PoseFrame[] = SNEAK_STEPS.map((legs, i) => {
  const c = Math.cos((i / 6) * Math.PI * 2);
  return {
    lean: 15,
    snap: true,
    sink: i % 3 === 1 ? 0.5 : 0,
    ...legs,
    handN: arm(0.26 - 0.05 * c, 0.78),
    handF: arm(0.55 + 0.05 * c, 0.42),
    shapeN: 'grip',
    shapeF: 'relaxed',
  };
});

/** Crouch, 2 frames: low behind cover, knees bent, leaning in, the weapon ready and the free palm out against the cover; breathing. */
const CROUCH_BASE: PoseFrame = {
  lean: 30,
  snap: true,
  hip: 0.42,
  footN: v(0.2, groundY(0.42, 0.2)),
  footF: v(-0.06, groundY(0.42, -0.06)),
  handN: arm(0.42, 0.62),
  handF: arm(0.6, 0.5),
  shapeN: 'grip',
  shapeF: 'open',
};
const CROUCH: PoseFrame[] = [CROUCH_BASE, { ...CROUCH_BASE, chestDy: 0.5, handN: arm(0.42, 0.63), handF: arm(0.6, 0.51) }];

/**
 * Downed, 2 frames: knocked out. Drawn upright as a limp figure, then laid
 * on the ground (see PoseFrame.lie): the near arm flops down in front of the
 * body, the far one lies along it, the near knee is drawn up. Very slow breathing.
 */
const DOWNED_BASE: PoseFrame = {
  lie: true,
  lean: -5,
  footN: v(0.24, 0.9),
  footF: v(-0.04, 0.985),
  handN: arm(0.62, 0.68),
  handF: arm(0.14, 0.95),
  shapeN: 'relaxed',
  shapeF: 'relaxed',
};
const DOWNED: PoseFrame[] = [DOWNED_BASE, { ...DOWNED_BASE, lean: -6.5 }];

// ---------------------------------------------------------------------------
// Camp: lean, sit, read, train
// ---------------------------------------------------------------------------

/**
 * Where the camp props go, for the scene that places them (design units from
 * the feet anchor at x FEET_X, y GROUND; fine pixels are twice these).
 * - SEAT_TOP: the top of the log seat under the male and bulky 'sit' (26 px above the feet; 'read', and
 *   'sit' on the fitted female bodies, sit on a seat prop whose top is READ_SEAT_TOP, seats.ts).
 * - SEAT_X: the middle of the seat under the hips, behind the feet.
 * - LEAN_X: the front face of the trunk, rock or pole a 'lean' rests against.
 */
export const CAMP_PROPS = { SEAT_TOP: GROUND - 13, SEAT_X: FEET_X - 9, LEAN_X: FEET_X - 16 };

/** Breathing for the resting poses: the chest rises 1 px on half the loop. */
const breathe = (f: PoseFrame, n: number): PoseFrame[] => Array.from({ length: n }, (_, i) => (i < n / 2 ? f : { ...f, chestDy: 0.5 }));

/**
 * Lean, 4 frames: leaning back against something behind (the scene puts its
 * front face at CAMP_PROPS.LEAN_X), arms crossed, the near foot planted back
 * flat against it, the far foot on the ground at the anchor. Slow breathing.
 */
const LEAN_BASE: PoseFrame = {
  lean: -13,
  pelvisDx: -6,
  // standing on the far foot alone: the body comes down so it is on the ground line
  lift: -2.5,
  snap: true,
  footN: v(-0.24, 0.52),
  footF: v(0.34, 0.94),
  // Arms crossed: the near forearm across the chest, the far hand tucked under its elbow.
  handN: chest(3, 1.5),
  handF: chest(-2.5, 2.5),
  shapeN: 'relaxed',
  shapeF: 'fist',
  farHandFront: true,
};
const LEAN = breathe(LEAN_BASE, 4);

/**
 * Sit, 4 frames: on a log seat (CAMP_PROPS: its top 26 px above the feet,
 * under the hips), the feet on the ground at the anchor, leaning in a little
 * toward the fire: the near hand on the knee, the far palm out to the
 * flames. Gentle breathing. (The male and bulky bodies' sit; the fitted
 * female bodies sit as the owner's Lyra does, FIT_SIT below.)
 */
const SEAT_HIP = 0.74;
/** How much of a body's ankleLift its hips sink into the camp seat (see solveRig). */
const SEAT_SINK = 0.7;
const SIT_LEGS = { seat: true, hip: SEAT_HIP, footN: v(0.5, groundY(SEAT_HIP, 0.5)), footF: v(0.47, groundY(SEAT_HIP, 0.47)) };
const SIT_BASE: PoseFrame = {
  lean: 14,
  pelvisDx: -8.5,
  snap: true,
  ...SIT_LEGS,
  handN: knee('N', 0.6, -1.4),
  handF: arm(0.82, 0.42),
  shapeN: 'relaxed',
  shapeF: 'open',
};
const SIT = breathe(SIT_BASE, 4);

/**
 * Read: the owner's three frames of his Lyra reading (docs/reference/lyra-read-owner-reference.jpg, drawn
 * at our scale: his pixel (x, y) of the first frame is our fine pixel (x + 74, y + 123)), the standard
 * read pose for every character (2026-10-22: "copialo exacto me encanta estas poses nuevas de sentado y
 * leyendo es el nuevo standard"). She sits upright on his rock (the seat prop, seats.ts, its top on row
 * READ_SEAT_TOP), the knees forward and the boots straight down to the ground, an open book (campfx.ts)
 * held in both hands before the chest: "Atenta" (looking over it), "Leyendo" (reading), "Pasando
 * pagina" (the far hand lifts the far page). Every body is posed toward his joints (PoseAt): the pelvis
 * on the seat, the neck, the ankles and both hands where he drew them (fine pixels of the frame).
 */
export const READ_SEAT_TOP = 184;
const READ_AT: PoseAt = { pelvis: fp(108, READ_SEAT_TOP), seated: true, neck: fp(114, 150), ankleN: fp(123, 0), ankleF: fp(133, 0), ground: true, kneeN: fp(125, 186), kneeF: fp(134, 185) };
const READ_KEY_FRAMES: PoseFrame[] = [
  // Atenta: both hands under the book, the near one by the spine, the far one at its far end.
  { lean: 0, at: READ_AT, footN: v(0, 1), footF: v(0, 1), handN: at(117.5, 165), handF: at(129.5, 162), shapeN: 'cradle', shapeF: 'cradle' },
  // Leyendo: the same hold, the far hand a little further in under the cover.
  { lean: 0, at: READ_AT, footN: v(0, 1), footF: v(0, 1), handN: at(117.5, 166), handF: at(127.5, 163.5), shapeN: 'cradle', shapeF: 'cradle' },
  // Pasando pagina: the far hand up at the top of the far page, lifting it; the near hand holds the book a row lower.
  { lean: 0, at: READ_AT, footN: v(0, 1), footF: v(0, 1), handN: at(117, 167.5), handF: at(130, 152), shapeN: 'cradle', shapeF: 'open' },
];
/**
 * His three frames over the loop: 12 frames at POSE_FPS.read (3 a second, 4 seconds), looking up for two
 * frames, reading for six, turning the page for two and reading on for two.
 */
export const READ_KEYS = [0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1] as const;
const READ: PoseFrame[] = READ_KEYS.map((k) => READ_KEY_FRAMES[k]);

/**
 * Sit on the fitted female bodies (the owner's bare female body, BodyParams.fit, and those that follow it):
 * his picture of his Lyra sitting (docs/reference/lyra-sit-owner-reference.jpg, drawn at our scale: his pixel
 * (x, y) is our fine pixel (x + 59, y + 120)), the women's standard sit, with his read pose (2026-10-22). She
 * sits on his rock as she reads on it (the seat prop, seats.ts, its top on READ_SEAT_TOP; her head, torso and
 * hips as his read frames have them, a row lower, her boots on the ground), the near arm hanging at her side,
 * the far arm reaching out forward with the hand open, the near boot straight down and the far leg stretched
 * out forward. Every fitted body is posed toward his joints (PoseAt). He drew one frame, and the loop holds it
 * (SIT_KEYS), as the read pose holds each of his keys: the breathing of SIT (the chest up 1 px on half the
 * loop) is not in his picture. The male and bulky bodies keep SIT (their own standard is the owner's sit
 * paint-over on a branch of its own).
 */
const SIT_AT: PoseAt = { ...READ_AT, ankleF: fp(143, 0), kneeF: fp(137, 186) };
const FIT_SIT_KEY_FRAMES: PoseFrame[] = [
  // the near hand by the hip (hidden behind her tabard in his picture), the far one open, reaching out
  { lean: 0, at: SIT_AT, footN: v(0, 1), footF: v(0, 1), handN: at(110, 174), handF: at(144, 166), shapeN: 'relaxed', shapeF: 'open' },
];
/** His one frame over the sit loop of the fitted bodies: 4 frames at POSE_FPS.sit, as many as SIT. */
export const SIT_KEYS = [0, 0, 0, 0] as const;
const FIT_SIT: PoseFrame[] = SIT_KEYS.map((k) => FIT_SIT_KEY_FRAMES[k]);

/** Stance for the drills: feet apart, the near foot back. */
const STANCE = { footN: v(-0.32, 0.94), footF: v(0.36, 0.93) };

/**
 * Train, 8 frames per drill. Blades: a sword kata (ready guard, raise,
 * downward cut, follow-through, side guard, level cut, rising guard, back to
 * ready). The weapon angles per frame are in grip.ts.
 */
const TRAIN_BLADE: PoseFrame[] = [
  { lean: 4, ...STANCE, handN: arm(0.6, 0.45), handF: chest(2, 1), shapeN: 'grip', shapeF: 'fist' },
  { lean: -3, ...STANCE, handN: arm(0.12, -0.86), handF: chest(1, -1), shapeN: 'grip', shapeF: 'fist' },
  { lean: 12, pelvisDx: 1.5, footN: v(-0.4, 0.91), footF: v(0.4, 0.92), handN: arm(0.8, 0.26), handF: arm(-0.3, 0.75), shapeN: 'grip', shapeF: 'fist' },
  { lean: 15, pelvisDx: 2, footN: v(-0.42, 0.9), footF: v(0.4, 0.92), handN: arm(0.62, 0.74), handF: arm(-0.32, 0.72), shapeN: 'grip', shapeF: 'fist' },
  { lean: 2, ...STANCE, handN: arm(-0.3, 0.82), handF: chest(3, 0), shapeN: 'grip', shapeF: 'open' },
  { lean: 10, pelvisDx: 1, footN: v(-0.38, 0.92), footF: v(0.38, 0.93), handN: arm(0.76, 0.12), handF: arm(-0.25, 0.8), shapeN: 'grip', shapeF: 'open' },
  { lean: 5, ...STANCE, handN: arm(0.7, -0.5), handF: chest(2, 1), shapeN: 'grip', shapeF: 'fist' },
  { lean: 4, ...STANCE, handN: arm(0.58, 0.5), handF: chest(2, 1), shapeN: 'grip', shapeF: 'fist' },
];

/** Polearms: thrust, recoil, raise overhead, chop down, low sweep, spin upright, back to guard. */
const TRAIN_POLE: PoseFrame[] = [
  { lean: 4, ...STANCE, handN: arm(0.4, 0.7), handF: chest(2, 1), shapeN: 'grip', shapeF: 'fist' },
  { lean: 11, pelvisDx: 1.5, footN: v(-0.4, 0.91), footF: v(0.4, 0.92), handN: arm(0.96, 0.15), handF: arm(-0.25, 0.78), shapeN: 'grip', shapeF: 'fist' },
  { lean: 4, ...STANCE, handN: arm(0.3, 0.76), handF: chest(2, 1), shapeN: 'grip', shapeF: 'fist' },
  { lean: -4, ...STANCE, handN: arm(0.18, -0.84), handF: chest(1, -1), shapeN: 'grip', shapeF: 'fist' },
  { lean: 12, pelvisDx: 1.5, footN: v(-0.4, 0.91), footF: v(0.4, 0.92), handN: arm(0.7, 0.42), handF: arm(-0.3, 0.75), shapeN: 'grip', shapeF: 'fist' },
  { lean: 14, pelvisDx: 1, footN: v(-0.42, 0.88), footF: v(0.42, 0.88), handN: arm(0.6, 0.76), handF: arm(-0.3, 0.72), shapeN: 'grip', shapeF: 'open' },
  { lean: 2, ...STANCE, handN: arm(0.32, 0.28), handF: chest(2, 0), shapeN: 'grip', shapeF: 'open' },
  { lean: 4, ...STANCE, handN: arm(0.38, 0.72), handF: chest(2, 1), shapeN: 'grip', shapeF: 'fist' },
];

/**
 * Bare hands (and held techniques): guard, jab, guard, cross, guard, knee up,
 * front kick, back to guard.
 */
const GUARD: PoseFrame = { lean: 5, ...STANCE, handN: chest(4.5, -2.5), handF: chest(2.5, -4), shapeN: 'fist', shapeF: 'fist', farHandFront: true };
const TRAIN_FIST: PoseFrame[] = [
  GUARD,
  { lean: 9, pelvisDx: 1, ...STANCE, handN: arm(0.98, -0.1), handF: chest(2.5, -3.5), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
  { ...GUARD, chestDy: 0.5 },
  { lean: 12, pelvisDx: 1.5, footN: v(-0.38, 0.93), footF: v(0.34, 0.94), handN: chest(3, -1.5), handF: arm(0.98, -0.08), shapeN: 'fist', shapeF: 'fist' },
  GUARD,
  { lean: -2, footN: v(0.3, 0.52), footF: v(0.12, 0.97), handN: chest(4, -2), handF: chest(2, -3.5), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
  { lean: -12, pelvisDx: -1.5, footN: v(0.95, 0.12), footF: v(0.1, 0.97), handN: arm(-0.4, 0.6), handF: chest(3, -3), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
  { lean: -2, footN: v(0.3, 0.55), footF: v(0.12, 0.97), handN: chest(4, -2), handF: chest(2, -3.5), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
];

// ---------------------------------------------------------------------------
// Weapon techniques: throw, pierce
// ---------------------------------------------------------------------------

/**
 * Throw, 5 frames: a short wind-up (coiled low with the weapon drawn back at the hip, then the
 * weapon raised behind the head while the free hand points at the target), THE THROW (the arm
 * whips forward and flings the weapon level at the target, the body pitching after it), THE
 * RELEASE, where the phase starts, and a follow-through into the leap. The release is the owner's
 * reference (docs/reference/poses/warp-throw-owner-reference.jpg, a figure of blue light leaping
 * as it throws), its angles measured on his picture: the body pitched forward 32 degrees (pelvis to
 * neck), the head hung ahead of the chest and below the shoulders (31 degrees below level from the
 * neck; his 33); the throwing arm flung up and back behind the head, the hand open (upper arm 50
 * degrees above level, forearm 30); the front knee driven forward (thigh 31 degrees below level)
 * with its shin folded back under the body; the back leg stretched out behind, pushing off. His
 * free arm is swept back on the far side of his back, which our three-quarter front view puts
 * behind the torso: it is swept back and down out of sight there (a hand showing behind the back
 * would sit under the throwing elbow, like a second hand on that arm). From the release on the
 * weapon is out of the hand (PoseFrame.released): the battle draws it in flight from where the
 * throw flung it (throwRelease() in grip.ts). Bare hands throw a kunai from the pouch (grip.ts
 * throwsKunai). The female bodies keep the head up on the neck instead, as the owner repainted the
 * release and follow-through on his heroine Lyra (docs/reference/poses/lyra-throw-owner-reference.jpg):
 * the neck turned only a little forward of his at rest (neckPitch), the head above the shoulders.
 */
const THROW: PoseFrame[] = [
  // Coil: crouched over the front foot, the weapon drawn back low behind the hip, the free hand out at the target.
  { lean: 14, pelvisDx: -1, sink: 1.5, footN: v(-0.42, 0.9), footF: v(0.4, 0.9), handN: arm(-0.62, 0.52), handF: arm(0.86, 0.24), shapeN: 'grip', shapeF: 'point' },
  // Cock: rising, the weapon raised behind the head with the elbow back, the free hand pointing the way.
  { lean: 9, footN: v(-0.46, 0.91), footF: v(0.4, 0.88), handN: arm(-0.42, -0.6), bendN: -1, handF: arm(0.96, -0.1), shapeN: 'grip', shapeF: 'point' },
  // Throw: the arm whips forward under the chin and flings the weapon level at the target, the body
  // pitching after it halfway to the release, the free arm swinging back.
  { lean: 21, pelvisDx: 1.5, headDx: 3, headDy: 4.5, neckPitch: 4, footN: v(-0.52, 0.87), footF: v(0.25, 0.8), handN: arm(0.78, 0.68), handF: arm(-0.55, 0.5), shapeN: 'grip', shapeF: 'fist' },
  // RELEASE: the owner's reference; the phase starts here.
  { lean: 32, pelvisDx: 2, headDx: 6, headDy: 8, neckPitch: 6, footN: v(-0.56, 0.83), footF: v(0.087, 0.637), handN: arm(-0.73, -0.62), handF: arm(-0.62, 0.55), shapeN: 'open', shapeF: 'open', released: true, streamBack: true },
  // Follow-through: carried on into the leap, both feet leaving the ground.
  { lean: 34, pelvisDx: 2.5, headDx: 6, headDy: 8, neckPitch: 8, lift: 1.5, footN: v(-0.6, 0.78), footF: v(0.1, 0.6), handN: arm(-0.77, -0.6), handF: arm(-0.66, 0.5), shapeN: 'open', shapeF: 'open', released: true, streamBack: true },
];

/**
 * The first 'throw' frame without the weapon in the hand: the owner's reference pose, where the
 * phase starts. The frame before it flings the weapon.
 */
export const THROW_RELEASE_FRAME = THROW.findIndex((f) => f.released);

/**
 * Pierce, 5 frames: a thrust. Guard (the point raised at the target), chamber (drawn back to the
 * hip, the point level and forward, the weight on the back foot), the lunge (the front foot far
 * forward, the body low and long, the weapon arm straight and the weapon level at the target, the
 * free hand thrown back for balance), a hold on the hit, and the recoil back toward the guard.
 * Blades, the kunai and the naginata thrust from the near hand (polearms are carried one-handed
 * everywhere, as in 'attack'); bare hands drive a straight punch the same way.
 */
const PIERCE: PoseFrame[] = [
  // Guard: the point raised at the target, the free fist before the chest.
  { lean: 5, footN: v(-0.34, 0.94), footF: v(0.36, 0.93), handN: arm(0.62, 0.42), handF: chest(3, 0), shapeN: 'grip', shapeF: 'fist' },
  // Chamber: the weapon drawn back to the near hip (the elbow behind), its point level and forward; the free fist out front.
  { lean: -2, pelvisDx: -1.5, footN: v(-0.38, 0.93), footF: v(0.36, 0.93), handN: arm(0.06, 0.6), handF: arm(0.7, 0.35), shapeN: 'grip', shapeF: 'fist' },
  // Lunge: the front foot far forward, low and long, the weapon arm straight at chest height (clear of the face), the free hand back.
  { lean: 20, pelvisDx: 4, headDy: -1, footN: v(-0.64, 0.75), footF: v(0.46, 0.74), handN: arm(0.97, 0.22), handF: arm(-0.9, 0.3), shapeN: 'grip', shapeF: 'relaxed' },
  // Hold on the hit.
  { lean: 21, pelvisDx: 4.5, headDy: -1, footN: v(-0.65, 0.75), footF: v(0.46, 0.74), handN: arm(0.98, 0.22), handF: arm(-0.92, 0.28), shapeN: 'grip', shapeF: 'relaxed' },
  // Recoil: drawing back toward the guard.
  { lean: 8, pelvisDx: 1, footN: v(-0.42, 0.9), footF: v(0.42, 0.91), handN: arm(0.7, 0.4), handF: chest(3, 0), shapeN: 'grip', shapeF: 'fist' },
];

/**
 * Tackle, 5 frames: the Rush (Taijutsu Technique: Rush; the owner, 2026-10-21: the weapon is put
 * away and the ninja tackles). Set (dropped low, fists tucked before the chest), the drive
 * (pitched forward off the back foot, the head tucked down behind the leading shoulder, the arms
 * braced in), THE IMPACT (shoulder first, the body at its longest, the front knee driving, both feet
 * off the ground), a hold on it, and the recovery back onto both feet. The hands are busy (grip.ts):
 * a held weapon is drawn stowed.
 */
// On the fitted female bodies the head stays up on the neck at its length (neckPitch, as in the throw):
// headDx/headDy there sank the head below the shoulders, the neck folded under it.
const TACKLE: PoseFrame[] = [
  // Set: low over the front foot, the fists tucked in before the chest.
  { lean: 20, sink: 1.5, headDx: 1, headDy: 1.5, neckPitch: 6, footN: v(-0.44, 0.88), footF: v(0.36, 0.88), handN: chest(4, 1.5), handF: chest(5, -0.5), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
  // Drive: off the back foot, pitched forward, the head down behind the shoulder.
  { lean: 32, pelvisDx: 2.5, headDx: 1.5, headDy: 6.5, neckPitch: 9, footN: v(-0.62, 0.8), footF: v(0.3, 0.72), handN: chest(3.5, 2.5), handF: arm(0.42, 0.55), shapeN: 'fist', shapeF: 'fist', streamBack: true },
  // IMPACT: shoulder first, the body long, the front knee driving, off the ground.
  { lean: 38, pelvisDx: 4.5, headDx: 1, headDy: 8.5, neckPitch: 12, lift: 1.5, footN: v(-0.68, 0.74), footF: v(0.2, 0.62), handN: chest(3, 3), handF: arm(0.36, 0.6), shapeN: 'fist', shapeF: 'fist', streamBack: true },
  // Hold on the hit.
  { lean: 38, pelvisDx: 5, headDx: 1, headDy: 8.5, neckPitch: 12, lift: 1, chestDy: 0.5, footN: v(-0.68, 0.75), footF: v(0.2, 0.64), handN: chest(3, 3), handF: arm(0.36, 0.6), shapeN: 'fist', shapeF: 'fist', streamBack: true },
  // Recovery: back onto both feet, guard up.
  { lean: 14, pelvisDx: 2, headDx: 1, headDy: 1, neckPitch: 4, footN: v(-0.42, 0.9), footF: v(0.38, 0.9), handN: chest(4.5, -1.5), handF: chest(3, -3), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
];

/** The tackle's frame where the shoulder hits (the battle lands the blow on it). */
export const TACKLE_IMPACT_FRAME = 2;

/**
 * Combo, 8 frames: the Leaf Hurricane (the owner, 2026-10-21: "este ataque no es con arma es un
 * combo cuerpo a cuerpo que debería tener animación"), struck with the weapon put away. Guard, a jab,
 * a cross, the spin (COMBO_TURNED: the battle shows these two frames mirrored, the back to the
 * target) into a spinning back kick, coming round, a high finishing kick, and back to guard. The
 * wind crescents go out on the kicks (COMBO_KICKS).
 */
const COMBO: PoseFrame[] = [
  // Guard: fists up before the chin, the near one drawn back to throw the jab.
  { lean: 6, footN: v(-0.36, 0.93), footF: v(0.38, 0.93), handN: chest(1.5, -2.5), handF: chest(2.5, -4), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
  // Jab: the near fist straight out at the target.
  { lean: 12, pelvisDx: 1.5, footN: v(-0.42, 0.9), footF: v(0.4, 0.92), handN: arm(0.98, -0.12), handF: chest(2.5, -3.5), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
  // Cross: the far fist follows through, the hips turned into it.
  { lean: 15, pelvisDx: 2, footN: v(-0.46, 0.88), footF: v(0.4, 0.92), handN: chest(3, -1.5), handF: arm(0.98, -0.06), shapeN: 'fist', shapeF: 'fist' },
  // The spin (shown mirrored): turned away, the near knee drawn up behind, fists tucked.
  { lean: 10, sink: 1, footN: v(-0.32, 0.55), footF: v(0.14, 0.96), handN: chest(3.5, -1.5), handF: chest(2, -3), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
  // Spinning back kick (shown mirrored): the body pitched away, the near heel driven back into the target.
  { lean: 26, pelvisDx: 2, headDy: 3, neckPitch: 8, footN: v(-0.97, -0.08), footF: v(0.2, 0.95), handN: arm(0.62, 0.48), handF: chest(3, -2), shapeN: 'fist', shapeF: 'fist', streamBack: true },
  // Coming round to face the target, the near knee chambered high.
  { lean: -4, footN: v(0.36, 0.5), footF: v(0.12, 0.97), handN: chest(4, -2), handF: chest(2, -3.5), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
  // Finishing kick: the near foot high at the target's head, leaning back from it.
  { lean: -20, pelvisDx: -2, footN: v(0.8, -0.58), footF: v(0.08, 0.97), handN: arm(-0.42, 0.6), handF: chest(3, -3), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
  // Back to guard.
  { lean: 6, footN: v(-0.36, 0.93), footF: v(0.38, 0.93), handN: chest(4.5, -2.5), handF: chest(2.5, -4), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
];

/** The combo's frames the battle shows mirrored (the spin: the back to the target). */
export const COMBO_TURNED: readonly number[] = [3, 4];
/** The combo's kicks (the spinning back kick, the finishing kick): the wind crescents go out on them. */
export const COMBO_KICKS: readonly number[] = [4, 6];

export const POSES: Record<RigPose, PoseFrame[]> = {
  idle: [IDLE, IDLE, { ...IDLE, chestDy: 1 }, { ...IDLE, chestDy: 1 }],
  handsigns: [
    { ...IDLE, lean: 0, handN: chest(1, -1), handF: chest(2, -1), shapeN: 'sign', shapeF: 'sign', farHandFront: true },
    { ...IDLE, lean: 0, handN: chest(1, -2), handF: chest(2, -2), shapeN: 'sign', shapeF: 'sign', chestDy: 0, farHandFront: true },
    { ...IDLE, lean: 1, handN: chest(1, 0), handF: chest(2, 0), shapeN: 'sign', shapeF: 'sign', farHandFront: true },
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
  castBook: GRIMOIRE_POSE,
  castScript: SCRIPT_POSE,
  // A spinning sphere held out in the near palm.
  castSphere: [
    { lean: 6, handN: arm(0.62, 0.22), handF: arm(0.26, 0.8), footN: v(-0.3, 0.95), footF: v(0.32, 0.95), shapeN: 'open', shapeF: 'fist' },
    { lean: 7, pelvisDx: 1, handN: arm(0.66, 0.2), handF: arm(0.27, 0.79), footN: v(-0.32, 0.94), footF: v(0.32, 0.95), shapeN: 'open', shapeF: 'fist' },
  ],
  // Crouched, the crackling hand held low and forward, the other gripping its wrist.
  castLightning: [
    { lean: 10, handN: arm(0.46, 0.72), handF: arm(0.2, 0.86), footN: v(-0.36, 0.9), footF: v(0.4, 0.92), shapeN: 'open', shapeF: 'fist', farHandFront: true },
    { lean: 11, jitter: 1, handN: arm(0.48, 0.71), handF: arm(0.21, 0.85), footN: v(-0.36, 0.9), footF: v(0.4, 0.92), shapeN: 'open', shapeF: 'fist', farHandFront: true },
  ],
  // Leaning back, palms cupped at the hip, one below and one above a ball of energy.
  castWave: [
    { lean: -6, handN: chest(-4, 11), handF: chest(-3, 3.4), footN: v(-0.38, 0.92), footF: v(0.42, 0.94), shapeN: 'open', shapeF: 'open', farHandFront: true },
    { lean: -6, chestDy: 1, jitter: 1, handN: chest(-4.2, 11.4), handF: chest(-3.2, 3.6), footN: v(-0.38, 0.92), footF: v(0.42, 0.94), shapeN: 'open', shapeF: 'open', farHandFront: true },
  ],
  // Both arms thrust forward, the far palm just above the near one, charging a blinding flash.
  castFlash: [
    { lean: 4, handN: arm(0.96, 0.04), handF: arm(0.8, -0.2), footN: v(-0.32, 0.95), footF: v(0.34, 0.95), shapeN: 'open', shapeF: 'open' },
    { lean: 5, jitter: 1, handN: arm(0.97, 0.06), handF: arm(0.81, -0.18), footN: v(-0.33, 0.95), footF: v(0.34, 0.95), shapeN: 'open', shapeF: 'open' },
  ],
  // Standing tall, chin up, a one-handed seal before the chest while the eyes blaze.
  castEye: [
    { lean: -3, handN: chest(2, 1), handF: arm(0.3, 0.88), footN: v(-0.22, 0.97), footF: v(0.26, 0.97), shapeN: 'sign', shapeF: 'fist' },
    { lean: -3, chestDy: 1, jitter: 1, handN: chest(2, 1.4), handF: arm(0.3, 0.89), footN: v(-0.22, 0.97), footF: v(0.26, 0.97), shapeN: 'sign', shapeF: 'fist' },
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
  // Weapon techniques.
  throw: THROW,
  pierce: PIERCE,
  tackle: TACKLE,
  combo: COMBO,
  // Battle-map movement poses.
  walk: WALK,
  run: RUN,
  crouch: CROUCH,
  sneak: SNEAK,
  downed: DOWNED,
  // Camp poses.
  lean: LEAN,
  sit: SIT,
  read: READ,
  train: TRAIN_BLADE,
  trainPole: TRAIN_POLE,
  trainFist: TRAIN_FIST,
};

/** Poses the fitted female bodies (BodyParams.fit) take apart from the others, with as many frames. */
const FIT_POSES: Partial<Record<RigPose, PoseFrame[]>> = {
  sit: FIT_SIT,
};

export const POSE_FPS: Record<SpritePose, number> = {
  idle: 3,
  handsigns: 5,
  attack: 6,
  cast: 5,
  hurt: 4,
  victory: 3,
  charge: 10,
  throw: 8,
  pierce: 8,
  tackle: 10,
  combo: 10,
  walk: 10,
  run: 12,
  crouch: 3,
  sneak: 8,
  downed: 2,
  lean: 2,
  sit: 2,
  read: 3,
  train: 8,
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
  head: Vec; // head center: whole design units (half units on snapped poses)
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
  /** See PoseFrame.farHandFront. */
  farHandFront: boolean;
  /** See PoseFrame.released: the held weapon has been thrown and is not in the hand. */
  released: boolean;
  /** See PoseFrame.streamBack. */
  streamBack: boolean;
  /** Torso-local point: x along the shoulder line (+ toward facing side), y up from the pelvis. */
  T: (x: number, y: number) => Vec;
  /** Set for poses laid on the ground for display ('downed', see PoseFrame.lie). */
  lay?: Lay;
  /**
   * The held weapon's angle, in place of the pose's (grip.ts swordAngle and poleAngle): the
   * battle's thrown weapon is drawn alone at any angle of its flight (sprite/thrown.ts).
   */
  aim?: number;
}

/**
 * How a figure drawn upright is laid on the ground: the finished sprite is
 * transposed, so a drawn fine pixel (x, y) lands on (y + dx, x + dy). The
 * head goes to the left (the back), the front of the body faces the ground
 * and the near limbs lie on top; the light stays in the upper left.
 */
export interface Lay {
  dx: number;
  dy: number;
  /** Middle of the lying body (design x): where its ground shadow goes. */
  cx: number;
  /** Design x, in the UPRIGHT drawing, that lands on the ground line (for things dropped on the ground). */
  groundX: number;
}

/** Design x of the middle of the figure's box (a lying figure is centred on it). */
const FRAME_MID = FEET_X;

/** Moves a design y down onto the next fine pixel row (when `snap`). */
const snapDown = (y: number, snap: boolean): number => (snap ? Math.ceil(y * RES - 1e-6) / RES : y);

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

/**
 * The rig as the sprite shows it. For most poses this is the rig the figure is
 * drawn with; a pose laid on the ground ('downed') returns its joints where
 * they land in the lying sprite (see Lay), so anchors such as the head or the
 * pelvis match the pixels.
 */
export function buildRig(body: BodyType, pose: RigPose, frame: number): Rig {
  const r = drawRig(body, pose, frame);
  return r.lay ? layRig(r) : r;
}

/** The upright rig every layer is drawn with (compose.ts lays a 'downed' figure down afterwards). */
export function drawRig(body: BodyType, pose: RigPose, frame: number, arms?: ArmType): Rig {
  const bp = paramsFor(body, arms);
  const frames = (bp.fit && FIT_POSES[pose]) || POSES[pose] || POSES.idle;
  const f = frames[((frame % frames.length) + frames.length) % frames.length];
  const r = solveRig(body, bp, pose, frame, f);
  if (f.lie) r.lay = layFor(solveRig(body, bp, pose, 0, frames[0]));
  return r;
}

/**
 * The 'long' arms (appearance `arms`), his Lyra's: in his picture of her at our scale
 * (docs/reference/lyra-game-scale-owner-reference.jpg, laid at (x + 74, y + 121)) her elbows are where
 * the female body's are, but her forearms, bracer and cuff to the fist, are longer than the body's (his
 * near fist starts on row 176, the body's on 173; his far hand on 177, the body's on 174). The forearm
 * is `forearm` design units longer, the far one `farLonger` more, and the near arm hangs `hangIn`
 * degrees less far out (BodyParams.hangOut), so at rest both wrists are where his are and her fists
 * (the female body's hands, cut from his Lyra) are his, where he drew them. Her free far hand then
 * hangs open, as he drew it (ctx.ts handPose), not as a fist.
 *
 * On the owner's bare female body (BodyParams.fit) her forearms are as long as his bare woman's plus
 * these, but he drew Lyra's hanging further out than his bare woman's: at rest the near forearm turns
 * `restTurn[0]` degrees out about his elbow and the far one `restTurn[1]`, so her wrists, and the
 * fists, cuffs and sword on them, are where he drew them (her near wrist on the cell (107, 175), the
 * far one on (141, 177)).
 */
export const LONG_ARMS = { forearm: 1.15, farLonger: 0.4, hangIn: 1, restTurn: [8.5, -4.65] as [number, number] };

const ARM_PARAMS = new Map<string, BodyParams>();
function paramsFor(body: BodyType, arms?: ArmType): BodyParams {
  const bp = BODY_PARAMS[body];
  if (arms !== 'long') return bp;
  let p = ARM_PARAMS.get(body);
  if (!p) {
    p = {
      ...bp,
      forearm: bp.forearm + LONG_ARMS.forearm,
      farLonger: (bp.farLonger ?? 0) + LONG_ARMS.farLonger,
      hangOut: bp.hangOut ? [bp.hangOut[0] - LONG_ARMS.hangIn, bp.hangOut[1]] : undefined,
      restTurn: LONG_ARMS.restTurn,
    };
    ARM_PARAMS.set(body, p);
  }
  return p;
}

/**
 * Where a lying figure goes: its front (the chest, toward +x in the upright
 * drawing) rests on the ground line, and the body from the hair to the soles
 * is centred in the frame. Taken from the pose's first frame, so breathing
 * never shifts the body.
 */
function layFor(r: Rig): Lay {
  const b = r.bp;
  const groundX = r.pelvis.x + b.chestHalf * 0.62 + b.bust * 0.4 + 2.2;
  const top = r.head.y - b.headRy * b.headScale - 2.4;
  const bottom = ANKLE_N + ankleLiftOf(b, 'N') + 6;
  const mid = (top + bottom) / 2;
  const dx = Math.round(FRAME_MID * RES - mid * RES);
  const dy = Math.round(GROUND * RES - 1 - groundX * RES);
  return { dx, dy, cx: (mid * RES + dx) / RES, groundX };
}

/** The rig's joints moved to where the transpose of Lay puts them. */
export function layRig(r: Rig): Rig {
  const lay = r.lay;
  if (!lay) return r;
  const P = (p: Vec): Vec => v(p.y + lay.dx / RES, p.x + lay.dy / RES);
  const D = (d: Vec): Vec => v(d.y, d.x);
  return {
    ...r,
    pelvis: P(r.pelvis),
    neck: P(r.neck),
    up: D(r.up),
    right: D(r.right),
    head: P(r.head),
    shoulderN: P(r.shoulderN),
    shoulderF: P(r.shoulderF),
    elbowN: P(r.elbowN),
    elbowF: P(r.elbowF),
    wristN: P(r.wristN),
    wristF: P(r.wristF),
    handN: P(r.handN),
    handF: P(r.handF),
    hipN: P(r.hipN),
    hipF: P(r.hipF),
    kneeN: P(r.kneeN),
    kneeF: P(r.kneeF),
    ankleN: P(r.ankleN),
    ankleF: P(r.ankleF),
    T: (x: number, y: number) => P(r.T(x, y)),
  };
}

/**
 * Turns a point `deg` degrees around `about` (screen degrees: + turns clockwise on screen, the
 * way a positive lean pitches the body forward).
 */
export function turnPoint(p: Vec, about: Vec, deg: number): Vec {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const d = sub(p, about);
  return add(about, v(d.x * c - d.y * s, d.x * s + d.y * c));
}

/**
 * The whole rig turned `deg` degrees around its pelvis (see turnPoint): turnRig(r, -r.lean) is the
 * body standing upright, its torso exactly as drawn but not pitched (compose.ts hangs a cape from
 * it on the pitched frames, then turns the cloth back with the body).
 */
export function turnRig(r: Rig, deg: number): Rig {
  const o = r.pelvis;
  const P = (p: Vec): Vec => turnPoint(p, o, deg);
  const D = (d: Vec): Vec => sub(turnPoint(add(o, d), o, deg), o);
  const up = D(r.up);
  const right = D(r.right);
  return {
    ...r,
    lean: r.lean + deg,
    neck: P(r.neck),
    up,
    right,
    head: P(r.head),
    shoulderN: P(r.shoulderN),
    shoulderF: P(r.shoulderF),
    elbowN: P(r.elbowN),
    elbowF: P(r.elbowF),
    wristN: P(r.wristN),
    wristF: P(r.wristF),
    handN: P(r.handN),
    handF: P(r.handF),
    hipN: P(r.hipN),
    hipF: P(r.hipF),
    kneeN: P(r.kneeN),
    kneeF: P(r.kneeF),
    ankleN: P(r.ankleN),
    ankleF: P(r.ankleF),
    T: (x: number, y: number) => add(o, add(scale(right, x), scale(up, y))),
  };
}

function solveRig(body: BodyType, bp: BodyParams, pose: RigPose, frame: number, f: PoseFrame): Rig {
  if (f.at) return solveAt(body, bp, pose, frame, f, f.at);
  if (bp.fit) return solveFit(body, bp, pose, frame, f, bp.fit);

  const leanRad = (f.lean * Math.PI) / 180;
  const up = v(Math.sin(leanRad), -Math.cos(leanRad));
  const right = v(Math.cos(leanRad), Math.sin(leanRad));
  const legLen = bp.thigh + bp.shin;

  // Pelvis height is solved so the lowest ankle sits on the ground (or given
  // by `hip`); `lift` raises the whole body off it.
  const footDrop = (f.hip ?? Math.max(f.footN.y, f.footF.y)) * legLen;
  const jitter = f.jitter ? (frame % 2 === 0 ? -f.jitter : f.jitter) * 0.5 : 0;
  // A seated pose keeps its hips on the seat and the lower ankles of a body with `ankleLift` reach
  // down to the ground from there; standing, the whole body stands lower on its near ankle and the
  // far ankle comes back up by the difference (footLowN/F).
  const liftN = ankleLiftOf(bp, 'N');
  const liftF = ankleLiftOf(bp, 'F');
  // Seated, those hips settle SEAT_SINK of the lift into the seat, so the shorter legs reach the ground
  // with the knees still forward (sitting, not standing against the seat).
  const seatSink = liftN * SEAT_SINK;
  const ankle = ANKLE_N + (f.seat ? seatSink : liftN);
  const footLowN = v(0, f.seat ? liftN - seatSink : 0);
  const footLowF = v(0, f.seat ? liftF - seatSink : liftF - liftN);
  const stand = v(FEET_X - 0.5 + (f.pelvisDx || 0) + jitter, ankle - footDrop - (f.lift || 0));
  // `sink` and `snap` lower the pelvis while the feet stay where the pose puts
  // them (the knees take it up), `snap` onto the fine pixel grid.
  const moved = !!(f.sink || f.snap);
  const pelvis = moved ? v(stand.x, snapDown(stand.y + (f.sink || 0), !!f.snap)) : stand;

  const T = (x: number, y: number): Vec => add(pelvis, add(scale(right, x), scale(up, y)));

  const hipN = T(-bp.hipHalf * 0.5, 0.3);
  // The far side sits further back, so it is drawn higher on screen: the hip
  // a little, the foot by FAR_LIFT. Its leg stays about as straight as the near one.
  const hipF = sub(T(bp.hipHalf * 0.42, 0.3), v(0, FAR_HIP_LIFT));
  // Foot targets hang from where the hips stood before sinking or snapping
  // (level hips when the pose gives its hip height).
  let fromN = hipN;
  let fromF = hipF;
  if (f.hip !== undefined) {
    fromN = v(hipN.x, stand.y - 0.3);
    fromF = v(hipF.x, stand.y - 0.3 - FAR_HIP_LIFT);
  } else if (moved) {
    const back = sub(stand, pelvis);
    fromN = add(hipN, back);
    fromF = add(hipF, back);
  }
  // Seated, a foot the leg cannot reach (a body with shorter legs than the seat was set for) slides
  // back toward the seat along the ground instead of hanging above it.
  const onGround = (hip: Vec, t: Vec): Vec => {
    const reach = bp.thigh + bp.shin - 0.05;
    const dy = t.y - hip.y;
    if (!f.seat || Math.hypot(t.x - hip.x, dy) <= reach || Math.abs(dy) >= reach) return t;
    return v(hip.x + Math.sign(t.x - hip.x) * Math.sqrt(reach * reach - dy * dy), t.y);
  };
  const legN = solve2(hipN, onGround(hipN, add(add(fromN, scale(f.footN, legLen)), footLowN)), bp.thigh, bp.shin, -1);
  const legF = solve2(hipF, onGround(hipF, add(add(fromF, add(scale(f.footF, legLen), v(0, FAR_HIP_LIFT - FAR_LIFT))), footLowF)), bp.thigh, bp.shin, -1);

  const chestDy = f.chestDy || 0;
  const neck = add(T(0.6, bp.torsoLen), v(0, chestDy));
  const shoulderN = add(T(-bp.shoulderHalf * 0.82, bp.torsoLen - 2.2), v(0, chestDy));
  const shoulderF = add(T(bp.shoulderHalf * 0.55, bp.torsoLen - 2.2), v(0, chestDy));
  const chestFront = add(T(bp.chestHalf * 0.5, bp.torsoLen - 6), v(0, chestDy));

  const resolve = (t: HandTarget, shoulder: Vec, armLen: number): Vec => {
    if (t.from === 'frame') return v(t.x, t.y);
    if (t.from === 'chest') return add(chestFront, v(t.x, t.y));
    if (t.from === 'kneeN') return add(legN.mid, v(t.x, t.y));
    if (t.from === 'kneeF') return add(legF.mid, v(t.x, t.y));
    return add(shoulder, scale(v(t.x, t.y), armLen));
  };
  const solveArm = (shoulder: Vec, t: HandTarget, bend: 1 | -1, fore: number, out: number) => {
    // A hanging arm turned further out from the body (BodyParams.hangOut; out > 0 turns it clockwise on screen).
    let aim = t;
    if (out && hangsDown(t)) {
      const a = (out * Math.PI) / 180;
      aim = { ...t, x: t.x * Math.cos(a) - t.y * Math.sin(a), y: t.x * Math.sin(a) + t.y * Math.cos(a) };
    }
    const target = resolve(aim, shoulder, bp.upperArm + fore + bp.handR);
    // Aim the wrist a little short of the target so the hand lands on it.
    const toT = sub(target, shoulder);
    const wristTarget = sub(target, scale(norm(toT), bp.handR * 0.8));
    const r = solve2(shoulder, wristTarget, bp.upperArm, fore, bend);
    const dir = norm(sub(r.end, r.mid));
    return { elbow: r.mid, wrist: r.end, hand: add(r.end, scale(dir, bp.handR * 0.9)) };
  };
  const [outN, outF] = bp.hangOut ?? [0, 0];
  const aN = solveArm(shoulderN, f.handN, f.bendN ?? 1, bp.forearm, outN);
  const aF = solveArm(shoulderF, f.handF, 1, bp.forearm + (bp.farLonger ?? 0), -outF);

  const headY = neck.y - 5.9 * bp.headScale + (f.headDy || 0);
  const headX = neck.x - 0.4 + (f.headDx || 0);
  // Whole design units, or half units (whole fine pixels) on snapped poses.
  const head = f.snap ? v(Math.round(headX * RES) / RES, Math.round(headY * RES) / RES) : v(Math.round(headX), Math.round(headY));

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
    farHandFront: !!f.farHandFront,
    released: !!f.released,
    streamBack: !!f.streamBack,
    T,
  };
}

/**
 * Where a fitted body's torso joints sit in its torso (Rig.T coordinates: x along the shoulders, y up
 * from the pelvis), taken from his joints at rest with the idle lean, and the head's offset from the neck.
 */
const FIT_LOCAL = new WeakMap<BodyFit, Record<'neck' | 'shoulderN' | 'shoulderF' | 'hipN' | 'hipF', Vec> & { head: Vec }>();
function fitLocal(fit: BodyFit) {
  let l = FIT_LOCAL.get(fit);
  if (!l) {
    const a = (IDLE.lean * Math.PI) / 180;
    const up = v(Math.sin(a), -Math.cos(a));
    const right = v(Math.cos(a), Math.sin(a));
    const loc = (p: Vec) => {
      const d = sub(p, fit.pelvis);
      return v(d.x * right.x + d.y * right.y, d.x * up.x + d.y * up.y);
    };
    l = { neck: loc(fit.neck), shoulderN: loc(fit.shoulderN), shoulderF: loc(fit.shoulderF), hipN: loc(fit.hipN), hipF: loc(fit.hipF), head: sub(fit.head, fit.neck) };
    FIT_LOCAL.set(fit, l);
  }
  return l;
}

/**
 * The neck's foot in the torso (Rig.T coordinates, before breathing): his on a fitted body, (0.6,
 * torsoLen) on the others. Items that follow the breathing chest measure it from here.
 */
export function neckLocal(bp: BodyParams): Vec {
  return bp.fit ? fitLocal(bp.fit).neck : v(0.6, bp.torsoLen);
}

/**
 * How far below the male body's seated hips a fitted body's hips sit on the camp seat (design units):
 * his pelvis is his hip joints, 4.5 px above the seat of his briefs, which rests on the seat's top
 * (CAMP_PROPS.SEAT_TOP).
 */
const FIT_SEAT_SINK = 0.45;


/**
 * How close to its hip a fitted body's foot may be asked to come (design units past thigh - shin): his
 * thigh is much longer than his shin, so a foot drawn in right under the hip (a deep crouch, a knee
 * driven up) cannot be reached by bending the knee alone. Such a foot goes forward along its row until
 * the knee can fold over it, as his legs fold.
 */
const FIT_FOLD = 1.6;
function foldable(hip: Vec, t: Vec, thigh: number, shin: number): Vec {
  const min = thigh - shin + FIT_FOLD;
  const dy = t.y - hip.y;
  if (Math.hypot(t.x - hip.x, dy) >= min) return t;
  return v(hip.x + Math.sqrt(Math.max(0, min * min - dy * dy)), t.y);
}

/**
 * The rig of a body fitted to the owner's joints (BodyParams.fit). At idle every joint is his (the
 * chest, shoulders, arms and head rise and fall with the breath, the arms carried with them). In every
 * other pose the frame is solved as solveRig solves it, with his torso (neck, shoulders and hips where
 * he drew them in the torso) and his limb lengths on each side: his far leg and arm are drawn shorter
 * on screen, so the far foot stands a little higher without a lift of its own. Standing, the lower ankle
 * reaches his ankle's height; seated, the hips sit on the camp seat and the feet reach the ground.
 *
 * `bp` may be a look's own params on the body's (longer forearms): a forearm longer than the body's
 * by `forearm` (the far one by `farLonger` more) is that much longer than his, at idle too, its wrist
 * further along his forearm (body.ts draws his forearm piece on along it).
 */
function solveFit(body: BodyType, bp: BodyParams, pose: RigPose, frame: number, f: PoseFrame, fit: BodyFit): Rig {
  const loc = fitLocal(fit);
  const base = BODY_PARAMS[body];
  const extraN = bp.forearm - base.forearm;
  const extraF = extraN + (bp.farLonger ?? 0) - (base.farLonger ?? 0);
  const len = fitLen(fit);
  len.forearmN += extraN;
  len.forearmF += extraF;
  const leanRad = (f.lean * Math.PI) / 180;
  const up = v(Math.sin(leanRad), -Math.cos(leanRad));
  const right = v(Math.cos(leanRad), Math.sin(leanRad));
  const legN = len.thighN + len.shinN;
  const legF = len.thighF + len.shinF;
  const chestDy = f.chestDy || 0;
  const breath = v(0, chestDy);

  if (pose === 'idle') {
    // His joints, the upper body carried by the breath.
    // a longer forearm reaches further along his, turned about his elbow by the look's restTurn
    const longer = (e: FitJoint, w: FitJoint, extra: number, deg: number) => {
      const d = add(sub(fit[w], fit[e]), scale(norm(sub(fit[w], fit[e])), extra));
      const a = (deg * Math.PI) / 180;
      return add(fit[e], v(d.x * Math.cos(a) - d.y * Math.sin(a), d.x * Math.sin(a) + d.y * Math.cos(a)));
    };
    const [turnN, turnF] = bp.restTurn ?? [0, 0];
    const at = (k: FitJoint) => add(k === 'wristN' ? longer('elbowN', 'wristN', extraN, turnN) : k === 'wristF' ? longer('elbowF', 'wristF', extraF, turnF) : fit[k], breath);
    const T = (x: number, y: number): Vec => add(fit.pelvis, add(scale(right, x), scale(up, y)));
    const hand = (e: Vec, w: Vec) => add(w, scale(norm(sub(w, e)), bp.handR * 0.9));
    return {
      body,
      bp,
      pose,
      frame,
      lean: f.lean,
      pelvis: fit.pelvis,
      neck: at('neck'),
      up,
      right,
      head: at('head'),
      shoulderN: at('shoulderN'),
      shoulderF: at('shoulderF'),
      elbowN: at('elbowN'),
      elbowF: at('elbowF'),
      wristN: at('wristN'),
      wristF: at('wristF'),
      handN: hand(at('elbowN'), at('wristN')),
      handF: hand(at('elbowF'), at('wristF')),
      hipN: fit.hipN,
      hipF: fit.hipF,
      kneeN: fit.kneeN,
      kneeF: fit.kneeF,
      ankleN: fit.ankleN,
      ankleF: fit.ankleF,
      shapeN: f.shapeN,
      shapeF: f.shapeF,
      farHandFront: !!f.farHandFront,
      released: !!f.released,
      streamBack: !!f.streamBack,
      T,
    };
  }

  const jitter = f.jitter ? (frame % 2 === 0 ? -f.jitter : f.jitter) * 0.5 : 0;
  // Where the pelvis stands so that the lower foot is on its ground (his ankle's height on that side),
  // each hip at its own height at this lean; a pose that gives its hip height measures it on the near leg.
  const hipDy = (l: Vec) => l.x * right.y + l.y * up.y;
  const standOn = (l: Vec, ft: Vec, leg: number, ground: number) => ground - ft.y * leg - hipDy(l);
  const standing =
    f.hip !== undefined
      ? fit.ankleN.y - f.hip * legN - hipDy(loc.hipN)
      : Math.min(standOn(loc.hipN, f.footN, legN, fit.ankleN.y), standOn(loc.hipF, f.footF, legF, fit.ankleF.y));
  // Seated: the male body's hips on the seat (its legs are the seat's measure), a little lower.
  const maleLeg = BODY_PARAMS.male.thigh + BODY_PARAMS.male.shin;
  const standY = f.seat ? ANKLE_N - (f.hip ?? 0) * maleLeg + FIT_SEAT_SINK : standing;
  // Standing on the far foot alone (a lift below the ground: 'lean') the male body comes down FAR_LIFT
  // and half a unit more, onto that foot; his far foot already stands on its own ground, so only what
  // goes past FAR_LIFT and the half unit is taken.
  const lift = (f.lift || 0) < 0 ? f.lift! + FAR_LIFT + 0.5 : f.lift || 0;
  const stand = v(fit.pelvis.x + (f.pelvisDx || 0) + jitter, standY - lift);
  const moved = !!(f.sink || f.snap);
  const pelvis = moved ? v(stand.x, snapDown(stand.y + (f.sink || 0), !!f.snap)) : stand;
  const T = (x: number, y: number): Vec => add(pelvis, add(scale(right, x), scale(up, y)));

  const hipN = T(loc.hipN.x, loc.hipN.y);
  const hipF = T(loc.hipF.x, loc.hipF.y);
  // Feet hang from where the hips stood before sinking or snapping; a pose that gives its hip height
  // (crouching, sitting) sets its feet on the ground at his ankles' heights.
  const back = moved ? sub(stand, pelvis) : v(0, 0);
  const foot = (hip: Vec, ft: Vec, leg: number, ground: number): Vec =>
    f.hip !== undefined ? v(hip.x + ft.x * leg, ground + (ft.y - f.hip) * leg) : add(add(hip, back), scale(ft, leg));
  const onGround = (hip: Vec, t: Vec, reach: number): Vec => {
    const dy = t.y - hip.y;
    if (!f.seat || Math.hypot(t.x - hip.x, dy) <= reach || Math.abs(dy) >= reach) return t;
    return v(hip.x + Math.sign(t.x - hip.x) * Math.sqrt(reach * reach - dy * dy), t.y);
  };
  const lN = solve2(hipN, foldable(hipN, onGround(hipN, foot(hipN, f.footN, legN, fit.ankleN.y), legN - 0.05), len.thighN, len.shinN), len.thighN, len.shinN, -1);
  const lF = solve2(hipF, foldable(hipF, onGround(hipF, foot(hipF, f.footF, legF, fit.ankleF.y), legF - 0.05), len.thighF, len.shinF), len.thighF, len.shinF, -1);

  const neck = add(T(loc.neck.x, loc.neck.y), breath);
  const shoulderN = add(T(loc.shoulderN.x, loc.shoulderN.y), breath);
  const shoulderF = add(T(loc.shoulderF.x, loc.shoulderF.y), breath);
  const chestFront = add(T(bp.chestHalf * 0.5, bp.torsoLen - 6), breath);

  const resolve = (t: HandTarget, shoulder: Vec, armLen: number): Vec => {
    if (t.from === 'frame') return v(t.x, t.y);
    if (t.from === 'chest') return add(chestFront, v(t.x, t.y));
    if (t.from === 'kneeN') return add(lN.mid, v(t.x, t.y));
    if (t.from === 'kneeF') return add(lF.mid, v(t.x, t.y));
    return add(shoulder, scale(v(t.x, t.y), armLen));
  };
  const solveArm = (shoulder: Vec, t: HandTarget, bend: 1 | -1, upper: number, fore: number, out: number) => {
    let aim = t;
    if (out && hangsDown(t)) {
      const a = (out * Math.PI) / 180;
      aim = { ...t, x: t.x * Math.cos(a) - t.y * Math.sin(a), y: t.x * Math.sin(a) + t.y * Math.cos(a) };
    }
    const target = resolve(aim, shoulder, upper + fore + bp.handR);
    const toT = sub(target, shoulder);
    const wristTarget = sub(target, scale(norm(toT), bp.handR * 0.8));
    const r = solve2(shoulder, wristTarget, upper, fore, bend);
    const dir = norm(sub(r.end, r.mid));
    return { elbow: r.mid, wrist: r.end, hand: add(r.end, scale(dir, bp.handR * 0.9)) };
  };
  const [outN, outF] = bp.hangOut ?? [0, 0];
  const aN = solveArm(shoulderN, f.handN, f.bendN ?? 1, len.upperArmN, len.forearmN, outN);
  const aF = solveArm(shoulderF, f.handF, 1, len.upperArmF, len.forearmF, -outF);

  let head: Vec;
  if (f.neckPitch !== undefined) {
    // His head on his neck at its length, the neck turned forward (PoseFrame.neckPitch), on whole fine
    // pixels so the length stays his.
    const a = (f.neckPitch * Math.PI) / 180;
    const at = add(neck, v(loc.head.x * Math.cos(a) - loc.head.y * Math.sin(a), loc.head.x * Math.sin(a) + loc.head.y * Math.cos(a)));
    head = v(Math.round(at.x * RES) / RES, Math.round(at.y * RES) / RES);
  } else {
    const headX = neck.x + loc.head.x + (f.headDx || 0);
    const headY = neck.y + loc.head.y + (f.headDy || 0);
    head = f.snap ? v(Math.round(headX * RES) / RES, Math.round(headY * RES) / RES) : v(Math.round(headX), Math.round(headY));
  }

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
    kneeN: lN.mid,
    kneeF: lF.mid,
    ankleN: lN.end,
    ankleF: lF.end,
    shapeN: f.shapeN,
    shapeF: f.shapeF,
    farHandFront: !!f.farHandFront,
    released: !!f.released,
    streamBack: !!f.streamBack,
    T,
  };
}

/**
 * A pose copied from the owner's frames (PoseFrame.at), on any body: the pelvis where he put it (seated,
 * each body's hips the same height above the seat's top), the torso leaning toward his neck, each foot
 * at his ankle (or on the body's own ground under it) and each hand at his hand, the body's own torso,
 * limb lengths and head on them.
 */
function solveAt(body: BodyType, bp: BodyParams, pose: RigPose, frame: number, f: PoseFrame, a: PoseAt): Rig {
  const fit = bp.fit;
  const base = BODY_PARAMS[body];
  // the body's torso joints (Rig.T coordinates) and limb lengths, as solveRig and solveFit have them
  const loc = fit
    ? fitLocal(fit)
    : {
        neck: v(0.6, bp.torsoLen),
        shoulderN: v(-bp.shoulderHalf * 0.82, bp.torsoLen - 2.2),
        shoulderF: v(bp.shoulderHalf * 0.55, bp.torsoLen - 2.2),
        hipN: v(-bp.hipHalf * 0.5, 0.3),
        hipF: v(bp.hipHalf * 0.42, 0.3),
        head: v(-0.4, -5.9 * bp.headScale),
      };
  const extraN = bp.forearm - base.forearm;
  const extraF = extraN + (bp.farLonger ?? 0) - (base.farLonger ?? 0);
  const L = fit
    ? fitLen(fit)
    : { upperArmN: bp.upperArm, upperArmF: bp.upperArm, forearmN: base.forearm, forearmF: base.forearm + (base.farLonger ?? 0), thighN: bp.thigh, thighF: bp.thigh, shinN: bp.shin, shinF: bp.shin };
  L.forearmN += extraN;
  L.forearmF += extraF;

  const pelvis = a.seated ? v(a.pelvis.x, a.pelvis.y - seatedHip(bp)) : a.pelvis;
  const lean = leanToward(a.neck, pelvis, loc.neck);
  const leanRad = (lean * Math.PI) / 180;
  const up = v(Math.sin(leanRad), -Math.cos(leanRad));
  const right = v(Math.cos(leanRad), Math.sin(leanRad));
  const T = (x: number, y: number): Vec => add(pelvis, add(scale(right, x), scale(up, y)));
  const breath = v(0, f.chestDy || 0);

  const hipN = T(loc.hipN.x, loc.hipN.y);
  // (the far hip of the male and bulky bodies sits further back, higher on screen, as solveRig has it)
  const hipF = fit ? T(loc.hipF.x, loc.hipF.y) : sub(T(loc.hipF.x, loc.hipF.y), v(0, FAR_HIP_LIFT));
  // each body's own ground: the heights its ankles stand at
  const groundN = fit ? fit.ankleN.y : ANKLE_N + ankleLiftOf(bp, 'N');
  const groundF = fit ? fit.ankleF.y : ANKLE_N - FAR_LIFT + ankleLiftOf(bp, 'F');
  const ankleN = a.ground ? v(a.ankleN.x, groundN) : a.ankleN;
  const ankleF = a.ground ? v(a.ankleF.x, groundF) : a.ankleF;
  // A foot the leg cannot reach slides back along the ground toward the hip, until the shin stands
  // straight up from it. Seated on a seat too high for the body's legs to sit with the thigh forward and
  // the foot on the ground (the thigh would hang steeper than SEAT_STEEP of its length), the knee goes
  // forward toward his (PoseAt.kneeN/F) and the shin hangs straight down from it, the foot off the ground.
  const leg = (hip: Vec, t: Vec, knee: Vec | undefined, thigh: number, shin: number) => {
    const l = thigh + shin - 0.05;
    const dy = t.y - hip.y;
    if (a.seated && knee && dy - shin > thigh * SEAT_STEEP) {
      const k = add(hip, scale(norm(sub(knee, hip)), thigh));
      return { mid: k, end: v(k.x, Math.min(t.y, k.y + shin)) };
    }
    if (Math.hypot(t.x - hip.x, dy) <= l) return solve2(hip, t, thigh, shin, -1);
    const kneeY = t.y - shin;
    const dx = Math.sqrt(Math.max(0, thigh * thigh - (kneeY - hip.y) ** 2));
    const x = dy - shin < thigh ? hip.x + Math.sign(t.x - hip.x) * dx : t.x;
    return solve2(hip, v(x, t.y), thigh, shin, -1);
  };
  const lN = leg(hipN, ankleN, a.kneeN, L.thighN, L.shinN);
  const lF = leg(hipF, ankleF, a.kneeF, L.thighF, L.shinF);

  const neck = add(T(loc.neck.x, loc.neck.y), breath);
  const shoulderN = add(T(loc.shoulderN.x, loc.shoulderN.y), breath);
  const shoulderF = add(T(loc.shoulderF.x, loc.shoulderF.y), breath);
  const chestFront = add(T(bp.chestHalf * 0.5, bp.torsoLen - 6), breath);
  const resolve = (t: HandTarget, shoulder: Vec, armLen: number): Vec => {
    if (t.from === 'frame') return v(t.x, t.y);
    if (t.from === 'chest') return add(chestFront, v(t.x, t.y));
    if (t.from === 'kneeN') return add(lN.mid, v(t.x, t.y));
    if (t.from === 'kneeF') return add(lF.mid, v(t.x, t.y));
    return add(shoulder, scale(v(t.x, t.y), armLen));
  };
  const solveArm = (shoulder: Vec, t: HandTarget, bend: 1 | -1, upper: number, fore: number) => {
    const target = resolve(t, shoulder, upper + fore + bp.handR);
    const wristTarget = sub(target, scale(norm(sub(target, shoulder)), bp.handR * 0.8));
    const r = solve2(shoulder, wristTarget, upper, fore, bend);
    return { elbow: r.mid, wrist: r.end, hand: add(r.end, scale(norm(sub(r.end, r.mid)), bp.handR * 0.9)) };
  };
  const aN = solveArm(shoulderN, f.handN, f.bendN ?? 1, L.upperArmN, L.forearmN);
  const aF = solveArm(shoulderF, f.handF, 1, L.upperArmF, L.forearmF);
  const headX = neck.x + loc.head.x + (f.headDx || 0);
  const headY = neck.y + loc.head.y + (f.headDy || 0);
  const head = v(Math.round(headX * RES) / RES, Math.round(headY * RES) / RES);

  return {
    body,
    bp,
    pose,
    frame,
    lean,
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
    kneeN: lN.mid,
    kneeF: lF.mid,
    ankleN: lN.end,
    ankleF: lF.end,
    shapeN: f.shapeN,
    shapeF: f.shapeF,
    farHandFront: !!f.farHandFront,
    released: !!f.released,
    streamBack: !!f.streamBack,
    T,
  };
}

export function frameCount(pose: RigPose): number {
  return (POSES[pose] || POSES.idle).length;
}
