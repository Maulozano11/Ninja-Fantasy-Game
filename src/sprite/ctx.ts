// Shared drawing context handed to every item drawer, plus limb helpers that
// clothing and armor reuse so everything lines up with the base body.

import { RampKind } from './color';
import {
  add,
  capsule,
  cylShade,
  ellipse,
  F_NO_OUTLINE,
  F_NO_TEXTURE,
  Layer,
  lerp,
  MaterialTable,
  norm,
  PartId,
  Pen,
  perp,
  poly,
  RES,
  scale,
  seam,
  sub,
  v,
  Vec,
} from './raster';
import { ankleLiftOf, BodyParams, drawRig, neckLocal, Rig } from './rig';
import { gripAngle } from './grip';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';
import { FEMALE_HANDS } from './femaleBodyArt';
import { isFemaleBody, type BodyType, type EyeSpecial, type SlotId, type SpriteAppearance } from './types';

/**
 * Back-to-front draw order. Each item writes into whichever depths it needs
 * (a long coat writes both the torso and the tails over the legs, a scarf
 * writes the neck wrap and the tail in front).
 */
export const DEPTHS = [
  'capeBack',
  'backGear',
  'hairBack',
  'farArm.held',
  'farArm.body',
  'farArm.cloth',
  'farArm.armor',
  'farLeg.body',
  'farLeg.cloth',
  'farLeg.feet',
  'farLeg.armor',
  'nearLeg.body',
  'nearLeg.cloth',
  'nearLeg.feet',
  'nearLeg.armor',
  'torso.body',
  'torso.under',
  'torso.bottom',
  'torso.top',
  'skirt',
  'torso.armor',
  'torso.over',
  'waist',
  'torso.acc',
  // the far hand when it works in front of the body (see PoseFrame.farHandFront)
  'farHand.front',
  'neck',
  'head.body',
  'head.face',
  'head.mask',
  'hairFront',
  'head.gear',
  'capeFront',
  'nearArm.held',
  'nearArm.body',
  'nearArm.cloth',
  'nearArm.armor',
  'nearArm.over',
  'top',
] as const;
export type Depth = (typeof DEPTHS)[number];

/** Depths that should not get an automatic outline (thin details, glows). */
export const NO_OUTLINE_DEPTHS = new Set<Depth>(['top', 'head.face']);

export interface DrawCtx {
  rig: Rig;
  bp: BodyParams;
  look: SpriteAppearance;
  eyeSpecial: EyeSpecial;
  mats: MaterialTable;
  /** Layer for a depth (created on first use). */
  L(depth: Depth): Layer;
  /** Material index for a color. */
  m(hex: string, kind?: RampKind): number;
  pen(hex: string, kind: RampKind, part: PartId, bias?: number, flags?: number): Pen;
  skin: number;
  /** Which single-choice slots are filled (items use this to adapt, e.g. hair under a helm). */
  has(slot: SlotId, id?: string): boolean;
  /**
   * Work that needs the whole figure (every layer, as the items after this one leave it): run once all
   * is drawn, before the layers are flattened. The Roman skirt closes what the figure leaves open behind it.
   */
  after(fn: (layers: ReadonlyMap<Depth, Layer>) => void): void;
}

export type Side = 'N' | 'F';

export interface ColorSlot {
  key: string;
  label: string;
  default: string;
  kind?: RampKind;
}

/** A part of an item the player picks from a few versions (a katana's steel, blade, guard and hilt). */
export interface PartSlot {
  key: string;
  label: string;
  /** The versions; the first is the default. */
  options: { id: string; label: string; desc: string }[];
}

/** A pixel picture of an item on its own, for the creator's part pickers. */
export interface PartsPreview {
  rows: string[];
  colors: Record<string, string>;
}

export interface ItemDef {
  id: string;
  slot: SlotId | 'accessory';
  name: string;
  desc: string;
  colors: ColorSlot[];
  /** Parts the player picks a version of; `draw` gets the choice (every key, defaults filled in). */
  parts?: PartSlot[];
  /** The item on its own with these parts, for the part pickers' thumbnails. */
  partsPreview?: (look: SpriteAppearance, parts: Record<string, string>) => PartsPreview;
  draw: (g: DrawCtx, colors: string[], parts: Record<string, string>) => void;
  /** For armor: which legacy armor style supplies the AC bonus. */
  statsArmor?: string;
  /** Hides the hair layers (full helmets). */
  hidesHair?: boolean;
  /** Body types that can wear it (all when missing): fitted pieces made for one figure. */
  bodies?: BodyType[];
}

/** An item's parts as chosen, every part filled in (unknown or missing versions take the default). */
export function resolveParts(def: ItemDef, parts: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of def.parts ?? []) {
    const id = parts?.[p.key];
    out[p.key] = p.options.some((o) => o.id === id) ? id! : p.options[0].id;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Limb geometry helpers
// ---------------------------------------------------------------------------

export function armJoints(r: Rig, s: Side) {
  return s === 'N'
    ? { shoulder: r.shoulderN, elbow: r.elbowN, wrist: r.wristN, hand: r.handN, shape: r.shapeN }
    : { shoulder: r.shoulderF, elbow: r.elbowF, wrist: r.wristF, hand: r.handF, shape: r.shapeF };
}

export function legJoints(r: Rig, s: Side) {
  return s === 'N'
    ? { hip: r.hipN, knee: r.kneeN, ankle: r.ankleN }
    : { hip: r.hipF, knee: r.kneeF, ankle: r.ankleF };
}

export const armDepth = (s: Side, k: 'held' | 'body' | 'cloth' | 'armor'): Depth =>
  (s === 'N' ? `nearArm.${k}` : `farArm.${k}`) as Depth;
export const legDepth = (s: Side, k: 'body' | 'cloth' | 'feet' | 'armor'): Depth =>
  (s === 'N' ? `nearLeg.${k}` : `farLeg.${k}`) as Depth;
export const sideBias = (s: Side): number => (s === 'F' ? -1 : 0);

/**
 * Draws part of an arm as a tapered capsule. `from`/`to` run along the whole
 * arm: 0 = shoulder, 1 = elbow, 2 = wrist.
 */
export function armSpan(g: DrawCtx, L: Layer, s: Side, from: number, to: number, inflate: number, pen: Pen, shade?: number | 'skin'): void {
  const j = armJoints(g.rig, s);
  const at = (t: number) => (t <= 1 ? lerp(j.shoulder, j.elbow, t) : lerp(j.elbow, j.wrist, t - 1));
  const reach = armReaches(g.rig, s);
  spans(L, at, (t) => armRadius(g, t, s), from, to, inflate, pen, shade, reach ? REACH_CUTS : ARM_CUTS);
}

/**
 * The owner's forearm on an arm reaching out (the rule, docs/SPRITE_STYLE_GUIDE.md section 5, "The extended
 * forearm"): how many rows across it is, his 1 px line on both sides included, from the elbow to
 * FOREARM_TAPER of the way down, and at the wrist; straight between, no swell. Measured on his pictures:
 * Ren's far forearm casting (nightCastArmsArt.ts, 8 rows after "1-2 pixels less", 6 at the wrist; the
 * owner on the combo: "pon como el antebrazo del modelo de lanzar jutsu"), Ren's near forearm (8 to 6),
 * the bare female forearm he drew (7 to 5, body/female-v2 femaleBaseArt.ts). The bulky body has no picture
 * of his: his 8 and 6 grown as our bulky arm is from the male one (armR 2.75 / 2.25, 1.85 / 1.5).
 */
export const FOREARM_RULE: Record<BodyType, { rows: number; wrist: number }> = {
  male: { rows: 8, wrist: 6 },
  female: { rows: 7, wrist: 5 },
  bulky: { rows: 10, wrist: 7 },
};
/** How far down the forearm (0 elbow, 1 wrist) it keeps its rows before tapering to the wrist. */
export const FOREARM_TAPER = 2 / 3;
/** Forearm radius (design units) at t (1 elbow, 2 wrist) under the rule: a capsule of radius r is 2 * r * RES rows across. */
export function forearmRuleR(body: BodyType, t: number): number {
  const { rows, wrist } = FOREARM_RULE[body];
  const k = Math.max(0, Math.min(1, (t - 1 - FOREARM_TAPER) / (1 - FOREARM_TAPER)));
  return (rows + (wrist - rows) * k) / (2 * RES);
}

/**
 * Forearm radius at `f` of the way from the elbow to the wrist, for armour and cloth that run straight down
 * the forearm (its top to its wrist radius): under the rule (FOREARM_RULE) on an arm reaching out.
 */
export function forearmR(g: DrawCtx, s: Side, f: number): number {
  if (armReaches(g.rig, s)) return forearmRuleR(g.rig.body, 1 + f);
  const R = g.bp.armR;
  return R[2] + (R[3] - R[2]) * f;
}

/** How straight (wrist from shoulder over the arm's length) and how near level (degrees, the torso's turn taken off) an arm reaching out is. */
const REACH_STRAIGHT = 0.85;
const REACH_LEVEL = 45;
const IDLE_RIGS = new Map<BodyType, Rig>();
const wrap180 = (a: number) => ((a + 540) % 360) - 180;
const segDeg = (a: Vec, b: Vec): number => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

/**
 * Whether an arm reaches out forward: straight, its upper arm within REACH_LEVEL degrees of level, the
 * torso's turn taken off (the cast at the runes, the combo's jab and cross, the attack's follow-through, the
 * pierce, the throw's pointing arm). Its forearm follows FOREARM_RULE. (Solen's far arm is his near arm
 * mirrored on the same arms: founderFarReach.)
 */
export function armReaches(r: Rig, s: Side): boolean {
  let idle = IDLE_RIGS.get(r.body);
  if (!idle) IDLE_RIGS.set(r.body, (idle = drawRig(r.body, 'idle', 0)));
  const t = segDeg(r.pelvis, r.neck) - segDeg(idle.pelvis, idle.neck);
  const j = armJoints(r, s);
  const len = Math.hypot(j.elbow.x - j.shoulder.x, j.elbow.y - j.shoulder.y) + Math.hypot(j.wrist.x - j.elbow.x, j.wrist.y - j.elbow.y);
  const straight = Math.hypot(j.wrist.x - j.shoulder.x, j.wrist.y - j.shoulder.y) / len;
  return straight >= REACH_STRAIGHT && Math.abs(wrap180(segDeg(j.shoulder, j.elbow) - t)) <= REACH_LEVEL;
}

/**
 * Natural limb tapering as control points [t, weights over R0..R3]: arms stay
 * full through the deltoid and biceps, pinch at the elbow, swell just below
 * it (forearm muscle) and taper to a slim wrist; legs keep a full thigh, a
 * narrower knee, a calf swell and a slim ankle.
 */
type Profile = [number, (R: number[]) => number][];
const ARM_PROFILE: Profile = [
  [0, (R) => R[0]],
  [0.45, (R) => R[0] * 0.62 + R[1] * 0.38],
  [1, (R) => R[1]],
  [1.0001, (R) => R[2] * 0.88],
  [1.3, (R) => R[2]],
  [2, (R) => R[3]],
];
const LEG_PROFILE: Profile = [
  [0, (R) => R[0]],
  [0.5, (R) => R[0] * 0.55 + R[1] * 0.45],
  [1, (R) => R[1]],
  [1.0001, (R) => R[2] * 0.94],
  [1.32, (R) => R[2] * 1.04],
  [2, (R) => R[3]],
];
const profileR = (P: Profile, R: number[]) => (t: number): number => {
  for (let i = 1; i < P.length; i++) {
    if (t <= P[i][0]) {
      const [t0, f0] = P[i - 1];
      const [t1, f1] = P[i];
      const k = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
      return f0(R) + (f1(R) - f0(R)) * Math.max(0, Math.min(1, k));
    }
  }
  return P[P.length - 1][1](R);
};
/**
 * Radius of the bare arm at t (0 shoulder, 1 elbow, 2 wrist), following the natural taper; with the arm's
 * side, a forearm reaching out follows the owner's forearm (FOREARM_RULE).
 */
export const armRadius = (g: DrawCtx, t: number, s?: Side): number =>
  t > 1 && s && armReaches(g.rig, s) ? forearmRuleR(g.rig.body, t) : profileR(ARM_PROFILE, g.bp.armR)(t);
/** Control points of the profiles, used as extra capsule cuts so the outline follows the curve. */
const ARM_CUTS = [0.45, 1, 1.3];
/** The same for an arm reaching out: its forearm keeps its rows to FOREARM_TAPER, then tapers. */
export const REACH_CUTS = [0.45, 1, 1 + FOREARM_TAPER];
const LEG_CUTS = [0.5, 1, 1.32];

/** Capsules along a limb, split at the joint and profile points; 'skin' uses the reference cylinder shading. */
function spans(L: Layer, at: (t: number) => Vec, rad: (t: number) => number, from: number, to: number, inflate: number, pen: Pen, shade?: number | 'skin', cutsAt: number[] = ARM_CUTS): void {
  const cuts = [from, ...cutsAt.filter((c) => c > from && c < to), to];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = at(cuts[i]);
    const b = at(cuts[i + 1]);
    // Just past the elbow/knee the second bone's radius applies.
    const ra = rad(cuts[i] === 1 ? 1.0001 : cuts[i]) + inflate;
    const rb = rad(cuts[i + 1]) + inflate;
    capsule(L, a, b, ra, rb, pen, shade === 'skin' ? cylShade(a, b, ra, rb) : shade);
  }
}

/** Same as armSpan for legs: 0 = hip, 1 = knee, 2 = ankle. */
export function legSpan(g: DrawCtx, L: Layer, s: Side, from: number, to: number, inflate: number, pen: Pen, shade?: number | 'skin'): void {
  const j = legJoints(g.rig, s);
  const at = (t: number) => (t <= 1 ? lerp(j.hip, j.knee, t) : lerp(j.knee, j.ankle, t - 1));
  spans(L, at, profileR(LEG_PROFILE, g.bp.legR), from, to, inflate, pen, shade, LEG_CUTS);
}

export function armPoint(g: DrawCtx, s: Side, t: number): Vec {
  const j = armJoints(g.rig, s);
  return t <= 1 ? lerp(j.shoulder, j.elbow, t) : lerp(j.elbow, j.wrist, t - 1);
}

export function legPoint(g: DrawCtx, s: Side, t: number): Vec {
  const j = legJoints(g.rig, s);
  return t <= 1 ? lerp(j.hip, j.knee, t) : lerp(j.knee, j.ankle, t - 1);
}

/** The neck's foot in the torso, before breathing (see rig.ts neckLocal). */
export const torsoNeck = (g: DrawCtx): Vec => neckLocal(g.bp);

/**
 * Torso outline in torso-local space (see Rig.T), grown by `inflate` pixels.
 * `top`/`bottom` trim the shape in local y (0 = hips, torsoLen = neck).
 */
export function torsoPoly(g: DrawCtx, inflate = 0, opts: { top?: number; bottom?: number; flare?: number } = {}): Vec[] {
  const b = g.bp;
  const T = g.rig.T;
  const Lt = b.torsoLen;
  const i = inflate;
  const nl = neckLocal(b);
  const dy = g.rig.neck.y - T(nl.x, nl.y).y; // breathing offset
  const sh = (p: Vec, k: number): Vec => add(p, v(0, dy * k));
  const top = opts.top ?? Lt + 0.2;
  const crotch = opts.bottom ?? b.crotch;
  const flare = opts.flare ?? 0;
  // Lower points never go below a hem the caller asked for.
  const lo = (y: number) => Math.max(y, crotch);
  const wa = b.waistHalf;
  const hp = b.hipHalf;
  const wy = b.waistY ?? 5.4;
  // Outer edges of the thighs at the hip joints (see buildRig: hipN, hipF).
  const nO = -(hp * 0.5 + b.legR[0] * 0.96);
  const fO = hp * 0.42 + b.legR[0] * 0.9;
  const pts: Vec[] = [
    sh(T(-b.shoulderHalf * 0.86 - i, Math.min(top, Lt - 1.2) + i * 0.5), 1),
    sh(T(-1.6, Math.min(top, Lt + 0.2) + i), 1),
    sh(T(2.8, Math.min(top, Lt + 0.2) + i), 1),
    sh(T(b.shoulderHalf * 0.58 + 0.6 + i, Math.min(top, Lt - 1.4) + i * 0.5), 1),
    sh(T(b.chestHalf * 0.62 + 0.8 + i + b.bust * 0.4, Lt - 4.4), 0.8),
    sh(T(b.chestHalf * 0.62 + 0.6 + i + b.bust, Lt - 6.2), 0.6),
    // under the bust the front curves back in toward the waist
    ...(b.bust > 0 ? [sh(T(b.chestHalf * 0.62 + 0.3 + i + b.bust * 0.55, Lt - 7.6), 0.5)] : []),
    // Waist, then hips exactly as wide as the two thighs (their outer edges,
    // never wider: no bell), then a narrow crotch so the legs separate right
    // under the pelvis.
    T(wa * 0.64 + 0.7 + i, lo(wy)),
    T(fO + i + flare * 0.6, lo(1.6)),
    T(fO - 0.2 + i + flare * 0.6, lo(-0.8)),
    T(0.5 + i * 0.3 + flare * 0.3, crotch - i * 0.3),
    T(-0.8 - i * 0.3 - flare * 0.3, crotch - i * 0.3),
    T(nO - 0.1 - i - flare, lo(-0.8)),
    T(nO - i - flare, lo(1.6)),
    T(-wa * 0.86 - i, lo(wy)),
    sh(T(-b.chestHalf * 0.86 - i, Lt - 5), 0.8),
  ];
  return pts;
}

/** Fills the torso shape clipped to local y in [bottom, top]. */
export function fillTorso(g: DrawCtx, L: Layer, inflate: number, pen: Pen, opts: { top?: number; bottom?: number; flare?: number } = {}): void {
  const pts = torsoPoly(g, inflate, opts);
  const T = g.rig.T;
  const top = opts.top ?? 99;
  const bottom = opts.bottom ?? -99;
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const w = Math.max(1, maxX - minX);
  const origin = T(0, 0);
  const upv = g.rig.up;
  poly(
    L,
    pts,
    pen,
    (x) => {
      const t = (x + 0.5 - minX) / w;
      return t < 0.2 ? 4 : t < 0.8 ? 3 : 2;
    },
    (x, y) => {
      const local = (x + 0.5 - origin.x) * upv.x + (y + 0.5 - origin.y) * upv.y;
      return local <= top + 0.01 && local >= bottom - 0.01;
    },
  );
}

// Hand templates (fine pixels), drawn hanging down with the wrist at the top
// and the thumb on the right; rotated to the forearm angle with RotSprite and
// mirrored so the thumb faces forward. Sized like the owner's crystal sword
// picture: a fist is about 8-9 px across, smooth light skin shaded along its
// edges, creases in dark skin.
// o outline · D dark · x crease (dark skin) · s shadow · b base · l light
/**
 * Fist wrapped around a weapon handle that passes through it (the pommel
 * shows above-left, the guard below-right), copied from the owner's crystal
 * sword picture (docs/reference/crystal-sword-owner-reference.jpg, 2026-10-20):
 * a broad round fist in smooth light skin, shadow only along its edges, the
 * fingers wrapped under the grip (their knuckles in dark skin, bending down to
 * the left, the little finger curled under the handle), no dark creases.
 */
const HAND_GRIP: PixelTemplate = {
  pivot: [5, 3],
  rows: [
    // the wrist, shaded on its far edge as his is
    '...osbbbso.',
    '...osbbsDo.',
    '...osbbDo..',
    '..osbbbDo..',
    '.osbbbbso..',
    'osbbbbbbDo.',
    'obbbbbbbbo.',
    'osbbbbssbo.',
    'oDsbbDooDo.',
    '.oDbso..o..',
    '..oDso.....',
    '...oo......',
  ],
};
/** Closed fist, the owner's grip fist without the handle: broad and round, light, edges shaded. */
const HAND_FIST: PixelTemplate = {
  pivot: [4, 0],
  rows: [
    '.osbbbo..',
    'osbbbbso.',
    'osbbbbbDo',
    'obbbbbbbo',
    'osbbbbsbo',
    'oDsbbsDso',
    '.oDsssDo.',
    '..ooooo..',
  ],
};
/**
 * The far hand's fist, copied from the owner's picture: small, on the shaded
 * side, lit along the thumb, its knuckle creases in dark skin (not black).
 * Drawn without the far-side darkening.
 */
const HAND_FIST_FAR: PixelTemplate = {
  pivot: [3, 0],
  rows: [
    '.oDbbDo.',
    'osbbbbo.',
    'oDsDsbDo',
    'olsDDbso',
    'olDDDsso',
    '.oDsbbo.',
    '..osso..',
    '...oo...',
  ],
};
/** Open palm, fingers spread (casting). */
const HAND_OPEN: PixelTemplate = {
  pivot: [5, 0],
  rows: [
    '..obbbbo...',
    '.osbbbbbo..',
    'osbbbbbbso.',
    'olbbbbbbbsoo',
    'olbbbbbbsDbo',
    'osbbbbbsDobo',
    'osDbDbDbo...',
    'obDbDbDbo...',
    'osDbDbDso...',
    '.obobobo....',
    '..o.o.o.....',
  ],
};
/** Fist with the index finger out (pointing), the finger on the thumb side. */
const HAND_POINT: PixelTemplate = {
  pivot: [4, 0],
  rows: [
    '..obbbo...',
    '.osbbbbo..',
    'osbbblbso.',
    'olbbbbbDo.',
    'obxbxbbbo.',
    'oDsDsbbso.',
    '.oDoDbbso.',
    '..ooobbo..',
    '....obbo..',
    '....olbo..',
    '.....oo...',
  ],
};
/**
 * A hand under something it carries, fingers up and curled over its lower
 * edge (a book held open at the side). Stamped upright, the wrist at the
 * bottom, whatever the forearm angle.
 */
const HAND_CRADLE: PixelTemplate = {
  pivot: [4, 8],
  rows: [
    '.o.o.o.o.',
    'obobobobo',
    'obDbDbDbo',
    'osDsDsDso',
    'olbbbbbso',
    'osbbbbbso',
    '.osbbbso.',
    '..osbso..',
    '..obbbo..',
  ],
};
/** Small relaxed hand, fingers loosely curled. */
const HAND_RELAXED: PixelTemplate = {
  pivot: [4, 0],
  rows: [
    '.obbbbo..',
    'osbbbbbo.',
    'osbbbbbso',
    'olbbbbbbo',
    'osbbbbbDo',
    'obDbDbDDo',
    'osbsbsbo.',
    '.oDsDsDo.',
    '..oo.oo..',
  ],
};

/**
 * Which of handDraw's pictures a hand is drawn with, and how it is turned:
 * `rot` degrees from hanging straight down (0 while it hangs within 30
 * degrees of it), mirrored with `flipX` to keep the thumb on the facing side.
 * 'grip' is the near fist round a weapon's handle, 'fist' a closed fist
 * without one; gloves that paint their own fists stamp them the same way.
 */
export interface HandPose {
  kind: 'grip' | 'fist' | 'open' | 'point' | 'relaxed' | 'cradle';
  rot: number;
  flipX: boolean;
}

/** How far (degrees) a hand hangs from straight down, along its forearm. */
function hangOf(r: Rig, s: Side): number {
  const j = armJoints(r, s);
  const dir = norm(sub(j.hand, j.wrist));
  const theta = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
  return ((theta - 90 + 540) % 360) - 180;
}

/**
 * His Lyra's hands (the 'long' arms, rig.ts LONG_ARMS: her near hand round her sword's grip, her open far
 * hand, femaleBodyArt.ts) are cut from his picture of her, where they hang from her forearms at rest: on
 * his fitted body they turn from that angle, so at rest every pixel is his, where he drew it.
 */
const LONG_REST = new Map<string, number>();
function longRest(body: BodyType, s: Side): number {
  const k = body + s;
  let a = LONG_REST.get(k);
  if (a === undefined) LONG_REST.set(k, (a = hangOf(drawRig(body, 'idle', 0, 'long'), s)));
  return a;
}

export function handPose(g: DrawCtx, s: Side): HandPose {
  const j = armJoints(g.rig, s);
  const holding = s === 'N' && gripAngle(g) !== null;
  // A hand hanging within 30 degrees of straight down is stamped unrotated,
  // so every pixel stays exactly as drawn (the wrist bends a little instead).
  const long = !!g.bp.fit && g.look.arms === 'long';
  const raw = long ? ((hangOf(g.rig, s) - longRest(g.rig.body, s) + 540) % 360) - 180 : hangOf(g.rig, s);
  // The female bodies' hands are the owner's small ones (5-7 px): turned a little they lose his
  // pixels for little gain, so they hang as drawn up to 45 degrees.
  // On a body fitted to the owner's pieces (BodyParams.fit) the hand turns with the forearm, always:
  // hung straight while the forearm turns it would come away from the wrist.
  const rot = g.bp.fit ? raw : Math.abs(raw) <= (isFemaleBody(g.rig.body) ? 45 : 30) ? 0 : raw;
  // Keep the thumb on the facing side (+x), or on top when the arm is level.
  const tr = (rot * Math.PI) / 180;
  const tx = Math.cos(tr);
  const ty = Math.sin(tr);
  const flipX = tx < -0.25 || (Math.abs(tx) <= 0.25 && ty > 0);
  const kind: HandPose['kind'] =
    j.shape === 'cradle'
      ? 'cradle'
      : j.shape === 'open'
        ? 'open'
        : j.shape === 'point'
          ? 'point'
          : j.shape === 'relaxed' || j.shape === 'sign'
            ? 'relaxed'
            : holding
              ? 'grip'
              : j.shape === 'hold'
                ? 'relaxed'
                : // his Lyra's free far hand hangs open (the 'long' arms, rig.ts LONG_ARMS)
                  s === 'F' && g.look.arms === 'long' && (long ? Math.abs(rot) <= 45 : rot === 0)
                  ? 'relaxed'
                  : 'fist';
  return { kind, rot, flipX };
}

/**
 * Draws a hand from a pixel template matched to the reference sprite. The
 * pen's material recolors it (skin, gloves); `grow` is accepted for gloves
 * but the silhouette stays the same. A near hand holding a weapon grips it at
 * gripPoint (grip.ts), the middle of the fist.
 */
export function handDraw(g: DrawCtx, L: Layer, s: Side, pen: Pen, grow = 0): void {
  void grow;
  const j = armJoints(g.rig, s);
  const b = pen.bias || 0;
  const pal: TemplatePalette = {
    o: [pen.mat, 0],
    D: [pen.mat, 1 + b],
    x: [pen.mat, 1 + b], // finger creases in dark skin: the owner's hands have no black lines
    s: [pen.mat, 2 + b],
    b: [pen.mat, 3 + b],
    l: [pen.mat, 4 + b],
  };
  let flags = F_NO_OUTLINE | F_NO_TEXTURE;
  const { kind, rot, flipX } = handPose(g, s);
  if (isFemaleBody(g.rig.body)) {
    // The owner's small hands (femaleBodyArt.ts). His far hands (relaxedFar, fistFar) are drawn in
    // their own darker tones and keep them; a near-side shape used on the far side goes one shade
    // darker, but his deep shadow never turns into the line.
    const H = FEMALE_HANDS;
    const far: TemplatePalette = { ...pal, D: [pen.mat, 1], s: [pen.mat, Math.max(1, 2 + b)], b: [pen.mat, 3 + b], l: [pen.mat, 3 + b] };
    const own: TemplatePalette = { ...pal, D: [pen.mat, 1], s: [pen.mat, 2], b: [pen.mat, 3], l: [pen.mat, 3] };
    // Turned by an odd angle his 5-7 px hands lose rows (the open hand flung back at the throw's
    // release came out a cut-off stub), so a hand that is not round a weapon's grip turns by a
    // quarter turn at a time, which moves every pixel and loses none.
    // On his fitted body the hand turns with the forearm exactly, so it never comes away from the wrist;
    // where turning loses a pixel of his line the layer's outline closes the hand again.
    const turn = g.bp.fit || kind === 'grip' ? rot : Math.round(rot / 90) * 90;
    if (g.bp.fit) flags = F_NO_TEXTURE;
    if (kind === 'cradle') stampTemplate(L, H.cradle, j.wrist, 0, s === 'F' ? far : pal, pen.part, { flags });
    else if (s === 'F' && kind === 'fist') stampTemplate(L, H.fistFar, j.wrist, turn, own, pen.part, { flipX, flags });
    else if (s === 'F' && kind === 'relaxed') stampTemplate(L, H.relaxedFar, j.wrist, turn, own, pen.part, { flipX, flags });
    else stampTemplate(L, H[kind], j.wrist, turn, s === 'F' ? far : pal, pen.part, { flipX, flags });
    return;
  }
  if (kind === 'cradle') {
    stampTemplate(L, HAND_CRADLE, j.wrist, 0, pal, pen.part, { flags });
    return;
  }
  const t = { open: HAND_OPEN, point: HAND_POINT, relaxed: HAND_RELAXED, grip: HAND_GRIP, fist: HAND_FIST }[kind];
  if (s === 'F' && t === HAND_FIST) {
    // Far fist: authored in far-side values (no lit knuckles), so no extra bias.
    const far: TemplatePalette = { ...pal, D: [pen.mat, 1], s: [pen.mat, 2], b: [pen.mat, 3], l: [pen.mat, 3] };
    stampTemplate(L, HAND_FIST_FAR, j.wrist, rot, far, pen.part, { flipX, flags });
    return;
  }
  stampTemplate(L, t, j.wrist, rot, pal, pen.part, { flipX, flags });
}

// ---------------------------------------------------------------------------
// Feet: pixel templates in 3/4 front view, in the shape of the owner's crystal
// sword picture (2026-10-20: "copy the shape of the feet, all characters"). The
// near foot is seen from the front (toes toward the viewer, so it reaches
// lower on screen); the far foot points right and is authored a shade darker.
// The layer outline pass adds the outer outline, so templates hold only the
// inside. The pivot is the ankle.
//
// Legend: 0-5 main material shade · a-f second material shade 0-5 ·
// p-u skin shade 0-5 · v-z third material shade 1-5.
// ---------------------------------------------------------------------------

export interface FootArt {
  N: PixelTemplate;
  F: PixelTemplate;
}

/**
 * Bare feet in the shape of the owner's (docs/reference/crystal-sword-owner-reference.jpg): the near
 * foot from the front widening to the toes, the far foot long and pointing right, toes split in
 * light and shadow, a darker sole.
 */
export const FOOT_BARE: FootArt = {
  N: {
    pivot: [5, 0],
    rows: [
      '..ssssssqs',
      '.sssssssss',
      '.srsssssss',
      '.sssssssss',
      'srssssssss',
      'ssssssssss',
      'ssssssssss',
      'rsttttsrrr',
      'stststrttr',
      'rsrsrsrsrr',
      'qqqqqqqqqq',
      '.qqqqqqqqq',
    ],
  },
  F: {
    pivot: [3, 0],
    rows: [
      'sssssssss......',
      'sssssssssss....',
      'ssssssssssss...',
      'ssssssstssssss.',
      'ssrsssssssqrtrs',
      'ssssssssssttrss',
      'qqqqqqqqqqqqqqq',
      '....qqqqqqqqqq.',
    ],
  },
};

/**
 * A foot for a body whose ankle stands `drop` rows lower (BodyParams.ankleLift: the female bodies
 * on the owner's small feet, his heroines at our scale): the template loses `drop` of its rows, the
 * ones most like the row above them (the ankle and instep repeat; the ankle row, the toes and the
 * two sole rows always stay), and `cols` columns just in front of the ankle. Every pixel left is the
 * template's own, so the bare foot keeps his crystal-sword foot's toes and a boot its toe cap, welt
 * and sole, only smaller.
 */
function shortFoot(t: PixelTemplate, drop: number, cols: number): PixelTemplate {
  const key = `${drop},${cols}`;
  let byKey = SHORT_FEET.get(t);
  if (!byKey) SHORT_FEET.set(t, (byKey = new Map()));
  const hit = byKey.get(key);
  if (hit) return hit;
  const w = Math.max(...t.rows.map((r) => r.length));
  let rows = t.rows.map((r) => r.padEnd(w, '.'));
  const same = (a: string, b: string) => [...a].filter((c, i) => c === b[i]).length;
  for (let k = 0; k < drop && rows.length > 4; k++) {
    // Rows 1 .. length-3: the ankle row (0, the pivot) and the last two (welt and sole) stay.
    let best = 1;
    for (let i = 2; i < rows.length - 2; i++) if (same(rows[i], rows[i - 1]) > same(rows[best], rows[best - 1])) best = i;
    rows = rows.filter((_, i) => i !== best);
  }
  const col = t.pivot[0] + 1;
  const out = { pivot: t.pivot, rows: rows.map((r) => r.slice(0, col) + r.slice(col + cols)) };
  byKey.set(key, out);
  return out;
}
const SHORT_FEET = new WeakMap<PixelTemplate, Map<string, PixelTemplate>>();

/** Variant for slimmer (female) or broader (bulky) feet: drops or doubles one column. */
function footWidth(t: PixelTemplate, body: string): PixelTemplate {
  const col = t.pivot[0] + 1;
  if (isFemaleBody(body)) return { pivot: t.pivot, rows: t.rows.map((r) => r.slice(0, col) + r.slice(col + 1)) };
  if (body === 'bulky') return { pivot: t.pivot, rows: t.rows.map((r) => r.slice(0, col + 1) + r.slice(col)) };
  return t;
}

/**
 * Stamps a foot template under the ankle. `mats` gives the material for each
 * legend range (main, second, third); skin always uses the body's skin.
 */
export function footDraw(
  g: DrawCtx,
  L: Layer,
  s: Side,
  art: FootArt,
  mats: { main?: number; second?: number; third?: number } = {},
  flags = F_NO_TEXTURE,
): void {
  const drop = Math.round(ankleLiftOf(g.bp, s) * RES);
  const t = drop > 0 ? shortFoot(art[s], drop, s === 'N' ? 1 : 2) : footWidth(art[s], g.rig.body);
  const a = legJoints(g.rig, s).ankle;
  const ax = Math.floor(a.x * RES) - t.pivot[0];
  const ay = Math.floor(a.y * RES) - t.pivot[1];
  const part: PartId = s === 'N' ? 'footN' : 'footF';
  t.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      let mat: number | undefined;
      let shade = 0;
      if (ch >= '0' && ch <= '5') [mat, shade] = [mats.main, +ch];
      else if (ch >= 'a' && ch <= 'f') [mat, shade] = [mats.second, ch.charCodeAt(0) - 97];
      else if (ch >= 'p' && ch <= 'u') [mat, shade] = [g.skin, ch.charCodeAt(0) - 112];
      else if (ch >= 'v' && ch <= 'z') [mat, shade] = [mats.third, ch.charCodeAt(0) - 117];
      if (mat === undefined) continue;
      L.set(ax + x, ay + y, mat, shade, part, flags);
    }
  });
}
