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
import { BodyParams, Rig } from './rig';
import { gripAngle } from './grip';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';
import { isFemaleBody, type EyeSpecial, type SlotId, type SpriteAppearance } from './types';

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
}

export type Side = 'N' | 'F';

export interface ColorSlot {
  key: string;
  label: string;
  default: string;
  kind?: RampKind;
}

export interface ItemDef {
  id: string;
  slot: SlotId | 'accessory';
  name: string;
  desc: string;
  colors: ColorSlot[];
  draw: (g: DrawCtx, colors: string[]) => void;
  /** For armor: which legacy armor style supplies the AC bonus. */
  statsArmor?: string;
  /** Hides the hair layers (full helmets). */
  hidesHair?: boolean;
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
  spans(L, at, profileR(ARM_PROFILE, g.bp.armR), from, to, inflate, pen, shade);
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
/** Radius of the bare arm at t (0 shoulder, 1 elbow, 2 wrist), following the natural taper. */
export const armRadius = (g: DrawCtx, t: number): number => profileR(ARM_PROFILE, g.bp.armR)(t);
/** Control points of the profiles, used as extra capsule cuts so the outline follows the curve. */
const ARM_CUTS = [0.45, 1, 1.3];
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

/**
 * Torso outline in torso-local space (see Rig.T), grown by `inflate` pixels.
 * `top`/`bottom` trim the shape in local y (0 = hips, torsoLen = neck).
 */
export function torsoPoly(g: DrawCtx, inflate = 0, opts: { top?: number; bottom?: number; flare?: number } = {}): Vec[] {
  const b = g.bp;
  const T = g.rig.T;
  const Lt = b.torsoLen;
  const i = inflate;
  const dy = g.rig.neck.y - T(0.6, Lt).y; // breathing offset
  const sh = (p: Vec, k: number): Vec => add(p, v(0, dy * k));
  const top = opts.top ?? Lt + 0.2;
  const crotch = opts.bottom ?? b.crotch;
  const flare = opts.flare ?? 0;
  // Lower points never go below a hem the caller asked for.
  const lo = (y: number) => Math.max(y, crotch);
  const wa = b.waistHalf;
  const hp = b.hipHalf;
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
    // Waist, then hips exactly as wide as the two thighs (their outer edges,
    // never wider: no bell), then a narrow crotch so the legs separate right
    // under the pelvis.
    T(wa * 0.64 + 0.7 + i, lo(5.4)),
    T(fO + i + flare * 0.6, lo(1.6)),
    T(fO - 0.2 + i + flare * 0.6, lo(-0.8)),
    T(0.5 + i * 0.3 + flare * 0.3, crotch - i * 0.3),
    T(-0.8 - i * 0.3 - flare * 0.3, crotch - i * 0.3),
    T(nO - 0.1 - i - flare, lo(-0.8)),
    T(nO - i - flare, lo(1.6)),
    T(-wa * 0.86 - i, lo(5.4)),
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
// mirrored so the thumb faces forward. Sized like the reference: a fist is
// about 9-10 px across, fingers are 1 px wide with a dark crease between them.
// o outline · D dark · x crease (near-black) · s shadow · b base · l light
/**
 * Fist wrapped around a weapon handle that passes through it (the pommel
 * shows above-left, the guard below-right): knuckles, a thumb over the grip
 * split off by a crease, three 1px fingers wrapping the handle with dark
 * creases between them, and rounded fingertips.
 */
const HAND_GRIP: PixelTemplate = {
  pivot: [5, 0],
  rows: [
    '..obbbbo..',
    '.osbbbbbo.',
    'osbbbbbbso',
    'olbbbbbxlo',
    'oDbbbbbxbo',
    'obxbxbxbDo',
    'osDsDsDsDo',
    '.oDoDoDoo.',
  ],
};
/** Small closed fist with a rounded bottom. */
const HAND_FIST: PixelTemplate = {
  pivot: [4, 0],
  rows: [
    '..obbbo..',
    '.osbbbbo.',
    'osbbblbso',
    'olbbbbbDo',
    'obxbxbxDo',
    'oDsDsDsso',
    '.oDoDoDo.',
    '..ooooo..',
  ],
};
/**
 * The far hand's fist, after the reference's: small and round, knuckles
 * toward the viewer, one curled-finger crease. Drawn without the far-side
 * darkening, which would turn its creases into a black blob.
 */
const HAND_FIST_FAR: PixelTemplate = {
  pivot: [3, 0],
  rows: [
    '.osbbo..',
    'osbbbbo.',
    'olbbbbso',
    'osbxbbso',
    'obbbxsso',
    'osDxDsso',
    '.osDsso.',
    '..oooo..',
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
    x: [pen.mat, 0], // finger creases are near-black, like the reference
    s: [pen.mat, 2 + b],
    b: [pen.mat, 3 + b],
    l: [pen.mat, 4 + b],
  };
  const flags = F_NO_OUTLINE | F_NO_TEXTURE;
  const holding = s === 'N' && gripAngle(g) !== null;
  const dir = norm(sub(j.hand, j.wrist));
  const theta = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
  // A hand hanging within 30 degrees of straight down is stamped unrotated,
  // so every pixel stays exactly as drawn (the wrist bends a little instead).
  const raw = ((theta - 90 + 540) % 360) - 180;
  const rot = Math.abs(raw) <= 30 ? 0 : raw;
  // Keep the thumb on the facing side (+x), or on top when the arm is level.
  const tr = (rot * Math.PI) / 180;
  const tx = Math.cos(tr);
  const ty = Math.sin(tr);
  const flipX = tx < -0.25 || (Math.abs(tx) <= 0.25 && ty > 0);
  const t =
    j.shape === 'open'
      ? HAND_OPEN
      : j.shape === 'relaxed' || j.shape === 'sign'
        ? HAND_RELAXED
        : holding
          ? HAND_GRIP
          : j.shape === 'hold'
            ? HAND_RELAXED
            : HAND_FIST;
  if (s === 'F' && t === HAND_FIST) {
    // Far fist: authored in far-side values (no lit knuckles), so no extra bias.
    const far: TemplatePalette = { ...pal, D: [pen.mat, 1], s: [pen.mat, 2], b: [pen.mat, 3], l: [pen.mat, 3] };
    stampTemplate(L, HAND_FIST_FAR, j.wrist, rot, far, pen.part, { flipX, flags });
    return;
  }
  stampTemplate(L, t, j.wrist, rot, pal, pen.part, { flipX, flags });
}

// ---------------------------------------------------------------------------
// Feet: pixel templates in 3/4 front view, after the reference sprite. The
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

/** Bare feet: ankle bone, lit instep, toes split by dark gaps, big toe on the inside. */
export const FOOT_BARE: FootArt = {
  N: {
    pivot: [5, 0],
    rows: [
      '...rstsrq',
      '...rstsrq',
      '...rsttrq',
      '..qrsttrq',
      '..rssttrq',
      '.qrssstsr',
      '.rsttttsq',
      'rstttttsq',
      'rsttttrtq',
      'rsrsrsqts',
      'qrqrqrqrr',
      'pqqqqqpqq',
    ],
  },
  F: {
    pivot: [3, 0],
    rows: [
      'qrsrq........',
      'qrssrq.......',
      'qrssrrq......',
      'qrsssrrq.....',
      'qrssssrrqq...',
      'qrrsssssrrq..',
      'qqrrsssssrsr.',
      'pqqrrrrrqrqrq',
      '.pqqqqqqqqqq.',
    ],
  },
};

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
  const t = footWidth(art[s], g.rig.body);
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
