// Skeleton rig: body proportions + poses solved with 2-bone IK.
// Every item is drawn against the rig, so one hairstyle or armor works on
// all body types and in every pose without being redrawn.
//
// Screen conventions: the figure's 64x64 design box sits at PAD in the frame (raster.ts), y grows downward, the character stands in
// a 3/4 view facing RIGHT. "Near" limbs are the character's right arm/leg
// (screen-left, drawn in front); "far" limbs are on screen-right, behind.

import { FEMALE_BASE_JOINTS } from './femaleBaseArt';
import { add, len, norm, PAD, RES, scale, sub, v, Vec } from './raster';
import { isFemaleBody, type ArmType, type BodyType, type CastStyle, type SpritePose } from './types';

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
   * and every foot template is drawn that many rows shorter (ctx.ts footDraw). The bulky body stands on
   * his low feet too (his boots are 8 rows high).
   */
  ankleLift?: number;
  /**
   * How much higher on screen the far hip and the far foot stand than the near ones, in design units
   * (the 3/4 view's depth); FAR_HIP_LIFT and FAR_LIFT when not given.
   */
  farHipLift?: number;
  farLift?: number;
  /** How far below the top of the torso the shoulder joints sit, in design units; 2.2 when not given. */
  shoulderDrop?: number;
  /** How far the head sits forward of (+) or behind (-) its usual place over the neck, in design units. */
  headDx?: number;
  /**
   * The arms at rest ('idle') for a body whose owner's picture holds them otherwise: hand targets
   * (from the shoulder, in arm lengths) that replace the idle pose's.
   */
  idleHands?: { N: Vec; F: Vec };
  /**
   * The body's legs are the owner's painted pieces, each riding one bone (the bulky body, bulkyBody.ts). A
   * pose copied from his frames (PoseAt) lengthens its legs to his knees as the male's thighs are, but thigh
   * and shin alike, in the body's own proportion (kneeLegScaled), and the painted thigh and shin are
   * lengthened with their bones (stretchPiece: rows of his repeated), so they still meet at the knee (the
   * owner on the bulky sit, 2026-10-23: "que hagas que se le hagan mas largas como romano para alcanzar el
   * suelo ... pero a su proporcion").
   */
  paintedLegs?: boolean;
  /**
   * The male read (READ_MALE, his Trunks frame 2) on a body built bigger than the male he drew it on: his
   * book, his hands and the hand targets moved by this many fine pixels (x, y), so the book is held before
   * this body's chest and its arms hold it as his do.
   */
  readShift?: [number, number];
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
  // The owner's broad, muscular man (docs/reference/bulky-owner-reference.jpg, 2026-10-21): "este
  // seria la base para cuerpo masculino mas grueso". Measured on his picture, one of his pixels one
  // fine pixel of ours: a long torso with the shoulders well below its top, broad shoulders, long
  // heavy arms whose fists hang at the crotch, shorter legs on his low feet, and the head forward
  // over the neck. At rest the near hand rests on the hip, as he drew it (idleHands).
  bulky: {
    torsoLen: 16.2,
    shoulderHalf: 9.6,
    chestHalf: 8.0,
    waistHalf: 6.0,
    hipHalf: 7.2,
    upperArm: 8.45,
    forearm: 5.95,
    thigh: 8.9,
    shin: 6.1,
    armR: [2.6, 2.2, 2.4, 1.7],
    legR: [3.5, 2.7, 2.6, 1.8],
    headRx: 6.2,
    headRy: 7,
    neckW: 2.6,
    handR: 2.4,
    footLen: 4.8,
    bust: 0,
    crotch: -3.6,
    headScale: 0.8,
    ankleLift: 2,
    farHipLift: 1,
    farLift: 0,
    shoulderDrop: 3.2,
    headDx: 1.5,
    idleHands: { N: { x: 0.109, y: 0.914 }, F: { x: 0.3, y: 0.927 } },
    paintedLegs: true,
    readShift: [4, -2],
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
  /**
   * The same on the male bodies (male, bulky): the head stays on the neck at its length at rest, the neck
   * turned this many degrees forward from rest (headDx/headDy are not used). A head moved by a fixed offset
   * hung it ahead of the chest with no neck to it (the owner: "hay que arreglarle el cuello y la cabeza a
   * las ultimas 2 poses de arrojar").
   */
  maleNeckPitch?: number;
  /**
   * The same on the bulky body only, where the male body keeps its headDx/headDy: the broad man's neck and
   * shoulders are his painted torso, broad and high at the back, and a head sunk ahead of them by a fixed
   * offset left his neck standing up behind it as a hump above the hair (the owner on Solen there: "solen
   * sigue teniendo problemas de cuello").
   */
  bulkyNeckPitch?: number;
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
 * forward toward his (solveAt, the fitted bodies). On the male bodies (solveRig) `kneeN`/`kneeF` are his
 * knees where his legs are longer than ours: the thigh lengthens for the frame so the knee comes as near
 * his as our shin, standing on its ankle, lets it (kneeLeg); it never shortens. The hands take 'frame'
 * targets.
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
  /**
   * Where his figure's neck is in his frame, when it is not where our torso can bring ours (`neck` is
   * only the way the torso leans). His Lyra reading sits taller than the fitted female body can: her
   * head stands higher over her shoulders as he drew her seated than his bare woman's. On a fitted body
   * that is not his own figure in his painted frames (drawRig `painted`), the hands' 'frame' targets
   * move with the neck from his to ours, so the book is held before the chest, under the chin, as she
   * holds it, not before the face. (His sit picture's hands stay where he drew them: the far arm reaches
   * out level from the shoulder, which is at his height.)
   */
  hisNeck?: Vec;
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
  bulkyNeckPitch: 22,
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
 * - SEAT_TOP: the top of the log seat (26 px above the feet). 'sit' sits on a seat prop (seats.ts): the male
 *   bodies' at SIT_SEAT_TOP (his Roman sit), the fitted female bodies' and their 'read' at READ_SEAT_TOP (his
 *   Lyra); the male read's hips are at READ_MALE_SEAT_TOP, 6 px lower, his read rock's top behind them.
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

const SEAT_HIP = 0.74;
const SIT_LEGS = { seat: true, hip: SEAT_HIP, footN: v(0.5, groundY(SEAT_HIP, 0.5)), footF: v(0.47, groundY(SEAT_HIP, 0.47)) };
/** How much of a body's ankleLift its hips sink into the camp seat (see solveRig). */
const SEAT_SINK = 0.7;

/**
 * Sit, 4 frames: the owner's four frames of his Roman legionary seated on a rock
 * (docs/reference/roman-sit-owner-reference.jpg, "Cuadro 1" to "Cuadro 4"), the standard sit for every
 * character ("es el nuevo standard"). He drew the figure at 80% of ours; he chose "romano sentado a": his
 * pose as the guide, at our scale, so a seated character is the size of a standing one. His joints are
 * read off his frames scaled by 1.25 (his head on our male's head, then 6 px up so his soles stand on our
 * ground line; SIT_JOINTS): the pelvis on his rock (the seat prop, seats.ts), the knees up and both feet
 * on the ground where he drew them, the near fist on the lap, the far arm reaching forward with the palm
 * open. Frame 3 is his "mouth open" frame (no face of ours opens its mouth yet); in frame 4 the near arm
 * hangs lower, its fist lower on the lap. Every body is posed toward his joints (PoseAt; fine pixels).
 *
 * His legs are a fifth longer than ours at this scale. He chose "romano sentado opcion a" (2026-10-22): seated,
 * the thighs lengthen so the knees sit where he put them (PoseAt kneeN/kneeF), and the seat's top is his,
 * row 184, so the hips, the knees and the feet are all where he drew them. (Our shins stay ours, so each
 * knee comes as near his as the shin standing on his ankle lets it.)
 */
export const SIT_SEAT_TOP = 184;
/** How straight his far arm reaches out on the seat: the wrist this share of the arm's length from the shoulder (about his, 0.95, on the male). */
const SIT_REACH = 0.95;
const sitAt = (neck: [number, number], ankleN: number, ankleF: number, kneeN: [number, number], kneeF: [number, number]): PoseAt => ({
  pelvis: fp(110, SIT_SEAT_TOP),
  seated: true,
  neck: fp(neck[0], neck[1]),
  ankleN: fp(ankleN, 0),
  ankleF: fp(ankleF, 0),
  ground: true,
  kneeN: fp(kneeN[0], kneeN[1]),
  kneeF: fp(kneeF[0], kneeF[1]),
});
const SIT_KEY = { lean: 0, footN: v(0, 1), footF: v(0, 1), snap: true, shapeN: 'fist', shapeF: 'open' } as const;
/** His neck, hands, knees and ankles per frame (fine pixels of our frame, his seat on row 184), that SIT poses toward (seats.test.ts). */
const SIT_JOINTS = [
  { neck: [118, 151], handN: [114.5, 177], handF: [147, 167.5], kneeN: [119, 191], kneeF: [134, 185], ankleN: 124, ankleF: 136 },
  { neck: [119, 151], handN: [115, 177], handF: [148, 167.5], kneeN: [118, 191], kneeF: [133, 185], ankleN: 124, ankleF: 136 },
  { neck: [117.5, 151], handN: [113.5, 177.5], handF: [147, 168.5], kneeN: [116, 191], kneeF: [130, 185], ankleN: 121, ankleF: 134 },
  { neck: [117.5, 151], handN: [113, 180.5], handF: [147, 167.5], kneeN: [121, 191], kneeF: [136, 185], ankleN: 125, ankleF: 137 },
] as const;
const SIT: PoseFrame[] = SIT_JOINTS.map((j) => ({
  ...SIT_KEY,
  at: sitAt([j.neck[0], j.neck[1]], j.ankleN, j.ankleF, [j.kneeN[0], j.kneeN[1]], [j.kneeF[0], j.kneeF[1]]),
  handN: at(j.handN[0], j.handN[1]),
  handF: at(j.handF[0], j.handF[1]),
}));

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
// (his Lyra's neck in his read frames: her near iris starts at (112, 138), and the fitted body's neck is
// 3.5 px behind and 6.5 px below its near iris)
const READ_AT: PoseAt = { pelvis: fp(108, READ_SEAT_TOP), seated: true, neck: fp(114, 150), ankleN: fp(123, 0), ankleF: fp(133, 0), ground: true, kneeN: fp(125, 186), kneeF: fp(134, 185), hisNeck: fp(108.5, 144.5) };
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
 * loop) is not in his picture. The male and bulky bodies sit as his Roman does (SIT above, his own sit
 * paint-over).
 */
const SIT_AT: PoseAt = { ...READ_AT, ankleF: fp(143, 0), kneeF: fp(137, 186), hisNeck: undefined };
const FIT_SIT_KEY_FRAMES: PoseFrame[] = [
  // the near hand by the hip (hidden behind her tabard in his picture), the far one open, reaching out
  { lean: 0, at: SIT_AT, footN: v(0, 1), footF: v(0, 1), handN: at(110, 174), handF: at(144, 166), shapeN: 'relaxed', shapeF: 'open' },
];
/** His one frame over the sit loop of the fitted bodies: 4 frames at POSE_FPS.sit, as many as SIT. */
export const SIT_KEYS = [0, 0, 0, 0] as const;
const FIT_SIT: PoseFrame[] = SIT_KEYS.map((k) => FIT_SIT_KEY_FRAMES[k]);

/**
 * Read on the male bodies (male, bulky), 12 frames: the owner's two frames of his Trunks reading on a rock
 * (docs/reference/trunks-read-owner-reference.jpg), his answer for the Roman: "leer mira la referencia de
 * trunks y copiala a leer de romano". He painted them over our read at our scale (one of his pixels is one
 * fine pixel: his cell (x, y) is our pixel (x + 83, y + 130), in his second frame (x + 84, y + 130)), so his
 * joints are read off his figure one for one (READ_JOINTS, fine pixels of our frame):
 * - frame 1, "Leyendo": the open book held up before him in both hands, the fingers over its lower edge, both
 *   arms bent, the far forearm coming up from the lap;
 * - frame 2 (labelled "Libro cerrado", but its pages face him: he reads it): the book raised in the near hand,
 *   tilted toward his face, the near forearm across the body, the far hand behind the book.
 * His decision (2026-10-23): "pon como estas poniendo (libro cerrado) en todas las poses de leer esa es la
 * idea": the read is his frame 2 in every frame (READ_MALE_KEYS), the male read standard. His frame 1 stays in
 * READ_JOINTS and maleReadArt.ts, unused, in case he wants it later as a pose of its own.
 * His hips are where our read had them, on a seat whose top is READ_MALE_SEAT_TOP (row 190, the camp seat's:
 * his read rock under him, seats.ts, keeps its place, its top on READ_SEAT_TOP, so it shows behind his hips as his rock does behind his
 * Trunks). The thighs lengthen to reach his knees (kneeLeg) and the feet stand on the ground under his boots.
 * His book and his hands, in the Roman's skin, are campfx.ts's (maleReadArt.ts). The female bodies read as his
 * Lyra does (READ).
 */
export const READ_MALE_SEAT_TOP = 190;
/**
 * His neck, hands, knees and ankles in his two read frames (fine pixels of our frame), that READ_MALE poses
 * toward (seats.test.ts); `head`: how far (fine px) his head is lowered and moved forward from where our neck
 * puts it, so that our eyes are on his.
 */
export const READ_JOINTS = [
  { neck: [120, 157.4], head: [1, 2], handN: [118.5, 175], handF: [134, 176.5], kneeN: [114, 198], kneeF: [129, 193], ankleN: 115.5, ankleF: 129 },
  { neck: [118, 157.4], head: [1, 3], handN: [122, 173.5], handF: [129, 168], kneeN: [114, 198], kneeF: [129, 193], ankleN: 115.5, ankleF: 129 },
] as const;
/**
 * His frame 2 over the whole loop (12 frames at POSE_FPS.read, 4 seconds), held still: he drew one pose for it,
 * and the loop holds it as the sit of his Lyra holds her one frame (no breathing or page turn he did not draw).
 */
export const READ_MALE_KEYS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] as const;
const READ_MALE: PoseFrame[] = READ_MALE_KEYS.map((k) => {
  const j = READ_JOINTS[k];
  return {
    lean: 0,
    footN: v(0, 1),
    footF: v(0, 1),
    snap: true,
    headDx: j.head[0] / RES,
    headDy: j.head[1] / RES,
    shapeN: 'cradle',
    shapeF: 'cradle',
    at: {
      pelvis: fp(110, READ_MALE_SEAT_TOP),
      seated: true,
      neck: fp(j.neck[0], j.neck[1]),
      ankleN: fp(j.ankleN, 0),
      ankleF: fp(j.ankleF, 0),
      ground: true,
      kneeN: fp(j.kneeN[0], j.kneeN[1]),
      kneeF: fp(j.kneeF[0], j.kneeF[1]),
    },
    handN: at(j.handN[0], j.handN[1]),
    handF: at(j.handF[0], j.handF[1]),
  };
});

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
 * neck); the head up on the neck at its rest length, the neck turned forward (maleNeckPitch: the head
 * hung ahead of the chest, as his figure of light shows it, read as a broken neck on our figures, and
 * he had it put back: "hay que arreglarle el cuello y la cabeza a las ultimas 2 poses de arrojar");
 * the throwing arm flung up and back behind the head, the hand open (upper arm 50 degrees above
 * level, forearm 30); the front knee driven forward (thigh 31 degrees below level)
 * with its shin folded back under the body; the back leg stretched out behind, pushing off. His
 * free arm is swept back on the far side of his back, which our three-quarter front view puts
 * behind the torso: it is swept back and down out of sight there (a hand showing behind the back
 * would sit under the throwing elbow, like a second hand on that arm). From the release on the
 * weapon is out of the hand (PoseFrame.released): the battle draws it in flight from where the
 * throw flung it (throwRelease() in grip.ts). Bare hands throw a kunai from the pouch (grip.ts
 * throwsKunai). The female bodies keep the head up on the neck their own way, as the owner repainted the
 * release and follow-through on his heroine Lyra (docs/reference/poses/lyra-throw-owner-reference.jpg):
 * the neck turned only a little forward of his at rest (neckPitch), the head above the shoulders.
 */
const THROW: PoseFrame[] = [
  // Coil: crouched over the front foot, the weapon drawn back low behind the hip, the free hand out at the target.
  { lean: 14, pelvisDx: -1, sink: 1.5, footN: v(-0.42, 0.9), footF: v(0.4, 0.9), handN: arm(-0.62, 0.52), handF: arm(0.86, 0.24), shapeN: 'grip', shapeF: 'point' },
  // Cock: rising, the weapon raised behind the head with the elbow back, the free hand pointing the way.
  { lean: 9, footN: v(-0.46, 0.91), footF: v(0.4, 0.88), handN: arm(-0.42, -0.6), bendN: -1, handF: arm(0.96, -0.1), shapeN: 'grip', shapeF: 'point' },
  // Throw: the arm whips forward under the chin and flings the weapon level at the target, the body
  // pitching after it halfway to the release, the free arm swinging back; on the male bodies the head up on
  // the neck, turned forward on the way to the release's (maleNeckPitch; the owner on Solen's Arrojar 3,
  // once a fixed offset sank it into the chest: "ahi se quedo igual la cabeza hay que corregirla").
  { lean: 21, pelvisDx: 1.5, headDx: 3, headDy: 4.5, neckPitch: 4, maleNeckPitch: 18, footN: v(-0.52, 0.87), footF: v(0.25, 0.8), handN: arm(0.78, 0.68), handF: arm(-0.55, 0.5), shapeN: 'grip', shapeF: 'fist' },
  // RELEASE: the owner's reference; the phase starts here.
  { lean: 32, pelvisDx: 2, headDx: 6, headDy: 8, neckPitch: 6, maleNeckPitch: 26, footN: v(-0.56, 0.83), footF: v(0.087, 0.637), handN: arm(-0.73, -0.62), handF: arm(-0.62, 0.55), shapeN: 'open', shapeF: 'open', released: true, streamBack: true },
  // Follow-through: carried on into the leap, both feet leaving the ground.
  { lean: 34, pelvisDx: 2.5, headDx: 6, headDy: 8, neckPitch: 8, maleNeckPitch: 28, lift: 1.5, footN: v(-0.6, 0.78), footF: v(0.1, 0.6), handN: arm(-0.77, -0.6), handF: arm(-0.66, 0.5), shapeN: 'open', shapeF: 'open', released: true, streamBack: true },
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
  { lean: 20, sink: 1.5, headDx: 1, headDy: 1.5, neckPitch: 6, bulkyNeckPitch: 20, footN: v(-0.44, 0.88), footF: v(0.36, 0.88), handN: chest(4, 1.5), handF: chest(5, -0.5), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
  // Drive: off the back foot, pitched forward, the head down behind the shoulder.
  { lean: 32, pelvisDx: 2.5, headDx: 1.5, headDy: 6.5, neckPitch: 9, bulkyNeckPitch: 32, footN: v(-0.62, 0.8), footF: v(0.3, 0.72), handN: chest(3.5, 2.5), handF: arm(0.42, 0.55), shapeN: 'fist', shapeF: 'fist', streamBack: true },
  // IMPACT: shoulder first, the body long, the front knee driving, off the ground.
  { lean: 38, pelvisDx: 4.5, headDx: 1, headDy: 8.5, neckPitch: 12, lift: 1.5, bulkyNeckPitch: 38, footN: v(-0.68, 0.74), footF: v(0.2, 0.62), handN: chest(3, 3), handF: arm(0.36, 0.6), shapeN: 'fist', shapeF: 'fist', streamBack: true },
  // Hold on the hit.
  { lean: 38, pelvisDx: 5, headDx: 1, headDy: 8.5, neckPitch: 12, lift: 1, chestDy: 0.5, bulkyNeckPitch: 38, footN: v(-0.68, 0.75), footF: v(0.2, 0.64), handN: chest(3, 3), handF: arm(0.36, 0.6), shapeN: 'fist', shapeF: 'fist', streamBack: true },
  // Recovery: back onto both feet, guard up.
  { lean: 14, pelvisDx: 2, headDx: 1, headDy: 1, neckPitch: 4, bulkyNeckPitch: 14, footN: v(-0.42, 0.9), footF: v(0.38, 0.9), handN: chest(4.5, -1.5), handF: chest(3, -3), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
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
  { lean: -20, pelvisDx: -2, bulkyNeckPitch: -10, footN: v(0.8, -0.58), footF: v(0.08, 0.97), handN: arm(-0.42, 0.6), handF: chest(3, -3), shapeN: 'fist', shapeF: 'fist', farHandFront: true },
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
  /** See PoseFrame.maleNeckPitch: the head turned forward on the neck on the male bodies (the throw's release). */
  neckPitch?: number;
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
/** Poses the male bodies (male, bulky) play in place of POSES' own: the owner's male standard where the female bodies keep theirs. */
const MALE_POSES: Partial<Record<RigPose, PoseFrame[]>> = { read: READ_MALE };

export function drawRig(body: BodyType, pose: RigPose, frame: number, arms?: ArmType, painted = false): Rig {
  const bp = paramsFor(body, arms);
  const frames = (bp.fit && FIT_POSES[pose]) || (!isFemaleBody(body) && MALE_POSES[pose]) || POSES[pose] || POSES.idle;
  const f = frames[((frame % frames.length) + frames.length) % frames.length];
  const r = solveRig(body, bp, pose, frame, f, painted);
  if (f.lie) r.lay = layFor(solveRig(body, bp, pose, 0, frames[0], painted));
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

/**
 * A leg toward an ankle target (PoseAt): a foot the leg cannot reach slides back along the ground toward
 * the hip until the leg reaches it.
 */
function reachLeg(hip: Vec, t: Vec, thigh: number, shin: number): { mid: Vec; end: Vec } {
  const l = thigh + shin - 0.05;
  const dy = t.y - hip.y;
  if (Math.hypot(t.x - hip.x, dy) <= l) return solve2(hip, t, thigh, shin, -1);
  const dx = Math.sqrt(Math.max(0, l * l - dy * dy));
  return solve2(hip, v(hip.x + Math.sign(t.x - hip.x) * dx, t.y), thigh, shin, -1);
}

/**
 * A leg toward an ankle target with a knee target (PoseAt kneeN/kneeF): the ankle on its target, the knee
 * on the point nearest the knee target that the shin, standing on the ankle, reaches, and the thigh as
 * long as getting there takes; never shorter than the body's (then it is reachLeg's leg).
 */
function kneeLeg(hip: Vec, t: Vec, k: Vec, thigh: number, shin: number): { mid: Vec; end: Vec } {
  const mid = add(t, scale(norm(sub(k, t)), shin));
  return len(sub(mid, hip)) > thigh ? { mid, end: t } : reachLeg(hip, t, thigh, shin);
}

/**
 * kneeLeg for a body of his painted legs (the bulky body, BodyParams.paintedLegs), in its own proportion:
 * the thigh and the shin lengthened alike (by the one factor that brings the knee onto the line from the
 * ankle toward his knee), never shorter than the body's (then it is reachLeg's leg). The painted thigh and
 * shin are lengthened with them (bulkyBody.ts).
 */
function kneeLegScaled(hip: Vec, t: Vec, k: Vec, thigh: number, shin: number): { mid: Vec; end: Vec } {
  const u = norm(sub(k, t));
  const d = sub(t, hip);
  const a = thigh * thigh - shin * shin;
  if (a <= 0) return kneeLeg(hip, t, k, thigh, shin);
  const b = -2 * shin * (d.x * u.x + d.y * u.y);
  const c = -(d.x * d.x + d.y * d.y);
  const s = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return s > 1 ? { mid: add(t, scale(u, s * shin)), end: t } : reachLeg(hip, t, thigh, shin);
}

/** Where the head sits from the neck's foot at rest, in design units (the neck's length and lean). */
export const NECK_REST = (bp: BodyParams): Vec => v(-0.4, -5.9 * bp.headScale);

function solveRig(body: BodyType, bp: BodyParams, pose: RigPose, frame: number, f: PoseFrame, painted = false): Rig {
  // The fitted female bodies: his heroines' frames (PoseAt) and his fitted body.
  if (f.at && bp.fit) return solveAt(body, bp, pose, frame, f, f.at, painted);
  if (bp.fit) return solveFit(body, bp, pose, frame, f, bp.fit);
  // A pose copied from the owner's frames (PoseAt) on the male bodies: the pelvis where he put it (seated,
  // on the seat's top), the torso leaning toward his neck.
  const a = f.at;
  const atPelvis = a ? (a.seated ? v(a.pelvis.x, a.pelvis.y - seatedHip(bp)) : a.pelvis) : null;
  const lean = a && atPelvis ? leanToward(a.neck, atPelvis, v(0.6, bp.torsoLen)) : f.lean;

  const leanRad = (lean * Math.PI) / 180;
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
  // with the knees still forward (sitting, not standing against the seat); the bulky body's painted legs
  // reach the ground from the seat's top as they are (kneeLegScaled).
  const seatSink = bp.paintedLegs ? 0 : liftN * SEAT_SINK;
  const ankle = ANKLE_N + (f.seat ? seatSink : liftN);
  const footLowN = v(0, f.seat ? liftN - seatSink : 0);
  const footLowF = v(0, f.seat ? liftF - seatSink : liftF - liftN);
  const stand = v(FEET_X - 0.5 + (f.pelvisDx || 0) + jitter, ankle - footDrop - (f.lift || 0));
  // `sink` and `snap` lower the pelvis while the feet stay where the pose puts
  // them (the knees take it up), `snap` onto the fine pixel grid.
  const moved = !!(f.sink || f.snap);
  const pelvis = atPelvis ?? (moved ? v(stand.x, snapDown(stand.y + (f.sink || 0), !!f.snap)) : stand);

  const T = (x: number, y: number): Vec => add(pelvis, add(scale(right, x), scale(up, y)));

  const hipN = T(-bp.hipHalf * 0.5, 0.3);
  // The far side sits further back, so it is drawn higher on screen: the hip
  // a little, the foot by FAR_LIFT. Its leg stays about as straight as the near one.
  const farHipLift = bp.farHipLift ?? FAR_HIP_LIFT;
  const hipF = sub(T(bp.hipHalf * 0.42, 0.3), v(0, farHipLift));
  // Foot targets hang from where the hips stood before sinking or snapping
  // (level hips when the pose gives its hip height).
  let fromN = hipN;
  let fromF = hipF;
  if (f.hip !== undefined) {
    fromN = v(hipN.x, stand.y - 0.3);
    fromF = v(hipF.x, stand.y - 0.3 - farHipLift);
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
  // (PoseAt: each ankle where he drew it, or on the ground under it, the far one FAR_LIFT higher; on a body
  // with `ankleLift` the ground ankles stand as low as its standing ones)
  // (and with his knees, the thigh as long as reaching them takes: kneeLeg; a body of his painted legs
  // lengthens thigh and shin alike, in its own proportion: kneeLegScaled)
  const atLeg = (hip: Vec, t: Vec, k?: Vec) => (k ? (bp.paintedLegs ? kneeLegScaled : kneeLeg)(hip, t, k, bp.thigh, bp.shin) : reachLeg(hip, t, bp.thigh, bp.shin));
  const farLift = bp.farLift ?? FAR_LIFT;
  const legN = a
    ? atLeg(hipN, a.ground ? v(a.ankleN.x, ANKLE_N + liftN) : a.ankleN, a.kneeN)
    : solve2(hipN, onGround(hipN, add(add(fromN, scale(f.footN, legLen)), footLowN)), bp.thigh, bp.shin, -1);
  const legF = a
    ? atLeg(hipF, a.ground ? v(a.ankleF.x, ANKLE_N + liftF - farLift) : a.ankleF, a.kneeF)
    : solve2(hipF, onGround(hipF, add(add(fromF, add(scale(f.footF, legLen), v(0, farHipLift - farLift))), footLowF)), bp.thigh, bp.shin, -1);

  const chestDy = f.chestDy || 0;
  const neck = add(T(0.6, bp.torsoLen), v(0, chestDy));
  const drop = bp.shoulderDrop ?? 2.2;
  // Reading on a body of `readShift`, the near shoulder comes forward with the book as far as the book came
  // (along the torso): reaching across the chest to it from where it rests, the upper arm would swing so far
  // forward that the back of its shoulder rose off the torso (the owner on the bulky read, 2026-10-23: "tiene
  // el hombro derecho del personaje desfasado del cuerpo para arriba"); from there its upper arm leans as far
  // forward of the torso as the male's does under his book (about 7 degrees), and the shoulder sits on the
  // torso as in his sit.
  const readReach = pose === 'read' && bp.readShift ? bp.readShift[0] / RES : 0;
  const shoulderN = add(T(-bp.shoulderHalf * 0.82 + readReach, bp.torsoLen - drop), v(0, chestDy));
  const shoulderF = add(T(bp.shoulderHalf * 0.55, bp.torsoLen - drop), v(0, chestDy));
  const chestFront = add(T(bp.chestHalf * 0.5, bp.torsoLen - 6), v(0, chestDy));

  const resolve = (t: HandTarget, shoulder: Vec, armLen: number): Vec => {
    if (t.from === 'frame') return pose === 'read' && bp.readShift ? v(t.x + bp.readShift[0] / RES, t.y + bp.readShift[1] / RES) : v(t.x, t.y);
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
  // (a hanging arm turned out by BodyParams.hangOut; the far forearm BodyParams.farLonger longer)
  const [outN, outF] = bp.hangOut ?? [0, 0];
  const foreF = bp.forearm + (bp.farLonger ?? 0);
  const armLenF = bp.upperArm + foreF + bp.handR;
  // At rest a body may hold its arms as its owner's picture does (BodyParams.idleHands).
  const rest = pose === 'idle' ? bp.idleHands : undefined;
  const aN = solveArm(shoulderN, rest ? arm(rest.N.x, rest.N.y) : f.handN, f.bendN ?? 1, bp.forearm, outN);
  // Reading, the far hand is behind the book close under its shoulder: its elbow folds back behind the body,
  // as his Trunks holds it, never out past the book. On an arm whose upper arm is too much longer than its
  // forearm to fold that close (the bulky body's), the hand goes down behind the book until it can.
  const foldF = (t: HandTarget): HandTarget => {
    if (pose !== 'read' || t.from !== 'frame') return t;
    const p = resolve(t, shoulderF, armLenF);
    const least = bp.upperArm - bp.forearm + bp.handR * 0.8 + 1;
    const dx = p.x - shoulderF.x;
    const dy = Math.max(p.y - shoulderF.y, Math.sqrt(Math.max(0, least * least - dx * dx)));
    return { from: 'frame', x: shoulderF.x + dx, y: shoulderF.y + dy, units: 'px' };
  };
  // Seated, the far arm reaches out to his open hand (SIT_JOINTS, measured on the male): an arm longer than
  // the male's reaches as far further out, so it is as straight as his (the bulky body's, in its proportion).
  // (the hand as far out as holds this arm as straight as his, SIT_REACH of its length)
  const reachF = (t: HandTarget): HandTarget => {
    const male = BODY_PARAMS.male;
    // (the bulky body only: the male and female bodies' sit is approved as it is, long arms too)
    if (body !== 'bulky' || pose !== 'sit' || t.from !== 'frame' || bp.upperArm + bp.forearm <= male.upperArm + male.forearm) return t;
    const p = resolve(t, shoulderF, armLenF);
    const d = len(sub(p, shoulderF));
    const k = (SIT_REACH * (bp.upperArm + bp.forearm) + bp.handR * 0.8) / d;
    return { from: 'frame', x: shoulderF.x + (p.x - shoulderF.x) * k, y: shoulderF.y + (p.y - shoulderF.y) * k, units: 'px' };
  };
  // An arm whose upper arm is much longer than its forearm (the bulky body's) cannot fold its hand close
  // to its shoulder: folded all the way, its elbow points wherever the hand is, up beside the head or out
  // to the side (the owner on Solen there, 2026-10-23: "algunos de sus brazos mal dibujados"). Then the
  // hand goes down the torso until the folded arm hangs, its elbow down, as the male's does.
  const male = BODY_PARAMS.male;
  const longUpper = bp.upperArm - bp.forearm > male.upperArm - male.forearm + 1;
  const hangFolded = (shoulder: Vec, t: HandTarget, a: ReturnType<typeof solveArm>) => {
    if (!longUpper) return a;
    const least = bp.upperArm - bp.forearm + bp.handR * 0.8 + 1;
    const p = sub(resolve(t, shoulder, armLenF), shoulder);
    const down = norm(v(-up.x, -up.y));
    const across = norm(right);
    const e = norm(sub(a.elbow, shoulder));
    if (len(p) >= least || e.x * down.x + e.y * down.y >= Math.SQRT1_2) return a;
    const dx = p.x * across.x + p.y * across.y;
    const dd = Math.max(p.x * down.x + p.y * down.y, Math.sqrt(Math.max(0, least * least - dx * dx)));
    const to = add(shoulder, add(scale(across, dx), scale(down, dd)));
    return solveArm(shoulder, { from: 'frame', x: to.x - (pose === 'read' && bp.readShift ? bp.readShift[0] / RES : 0), y: to.y - (pose === 'read' && bp.readShift ? bp.readShift[1] / RES : 0), units: 'px' }, 1, foreF, -outF);
  };
  const aF =
    pose === 'sit'
      ? solveArm(shoulderF, reachF(f.handF), 1, foreF, -outF)
      : pose === 'read'
      ? [solveArm(shoulderF, foldF(f.handF), 1, foreF, -outF), solveArm(shoulderF, foldF(f.handF), -1, foreF, -outF)].reduce((a, b) => (b.elbow.x < a.elbow.x ? b : a))
      : rest
      ? solveArm(shoulderF, arm(rest.F.x, rest.F.y), 1, foreF, -outF)
      : hangFolded(shoulderF, f.handF, solveArm(shoulderF, f.handF, 1, foreF, -outF));

  let head: Vec;
  const pitch = f.maleNeckPitch ?? (body === 'bulky' ? f.bulkyNeckPitch : undefined);
  if (pitch !== undefined) {
    // The head at the neck's rest length, the neck turned forward (PoseFrame.maleNeckPitch, bulkyNeckPitch),
    // on whole fine pixels so the length stays.
    const at = turnPoint(add(neck, NECK_REST(bp)), neck, pitch);
    head = v(Math.round(at.x * RES) / RES, Math.round(at.y * RES) / RES);
  } else {
    const headY = neck.y + NECK_REST(bp).y + (f.headDy || 0);
    const headX = neck.x + NECK_REST(bp).x + (f.headDx || 0) + (bp.headDx || 0);
    // Whole design units, or half units (whole fine pixels) on snapped poses.
    head = f.snap ? v(Math.round(headX * RES) / RES, Math.round(headY * RES) / RES) : v(Math.round(headX), Math.round(headY));
  }

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
    neckPitch: pitch,
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
function solveAt(body: BodyType, bp: BodyParams, pose: RigPose, frame: number, f: PoseFrame, a: PoseAt, painted = false): Rig {
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
  // (a fitted body other than his own figure holds its hands where his figure does from its own neck: PoseAt.hisNeck)
  const held = fit && a.hisNeck && !painted ? sub(neck, a.hisNeck) : v(0, 0);
  const resolve = (t: HandTarget, shoulder: Vec, armLen: number): Vec => {
    if (t.from === 'frame') return add(v(t.x, t.y), held);
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
