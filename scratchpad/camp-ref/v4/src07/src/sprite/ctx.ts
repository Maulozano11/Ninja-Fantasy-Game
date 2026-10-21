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
import { HAND_BOOK, HAND_CHIN } from './readArt';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';
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
    // under the bust the front curves back in toward the waist
    ...(b.bust > 0 ? [sh(T(b.chestHalf * 0.62 + 0.3 + i + b.bust * 0.55, Lt - 7.6), 0.5)] : []),
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
/**
 * Both hands clasped in front, fingers interlaced, after the owner's picture
 * (the "sentado" in docs/reference/camp-poses-owner-reference.webp): the near
 * hand's back on the left, the far hand's on the right, their fingers
 * alternating along the bottom. The pivot is the near wrist; the far wrist
 * comes in at the top right, CLASP_SPAN to the right of it (rig.ts).
 */
const HAND_CLASP: PixelTemplate = {
  pivot: [3, 1],
  rows: [
    '..ooo...ooo..',
    '.olbbo.osbso.',
    'olbbbbobbbDo.',
    'obbbbbbbbbsDo',
    'osbbbbbbbbsso',
    'obDbDbDbDbDso',
    'oDsDsDsDsDsDo',
    '.oDoDoDoDoDo.',
    '..o.o.o.o.o..',
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
  kind: 'grip' | 'fist' | 'open' | 'point' | 'relaxed' | 'cradle' | 'chin' | 'clasp' | 'book';
  rot: number;
  flipX: boolean;
}

export function handPose(g: DrawCtx, s: Side): HandPose {
  const j = armJoints(g.rig, s);
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
  const kind: HandPose['kind'] =
    j.shape === 'cradle' || j.shape === 'chin' || j.shape === 'clasp' || j.shape === 'book'
      ? j.shape
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
  const flags = F_NO_OUTLINE | F_NO_TEXTURE;
  const { kind, rot, flipX } = handPose(g, s);
  if (kind === 'cradle') {
    stampTemplate(L, HAND_CRADLE, j.wrist, 0, pal, pen.part, { flags });
    return;
  }
  if (kind === 'chin') {
    // The owner's fist under the chin (readArt.ts), level at the end of the
    // forearm rising to it.
    stampTemplate(L, HAND_CHIN, j.wrist, 0, pal, pen.part, { flags });
    return;
  }
  if (kind === 'clasp') {
    if (s === 'N') stampTemplate(L, HAND_CLASP, j.wrist, 0, pal, pen.part, { flags });
    return;
  }
  if (kind === 'book') {
    // The owner's hand on the book's right board (readArt.ts). It lies in
    // front of the book (campfx.ts), so even the far hand is drawn in the
    // light, shaded as he shaded it.
    const lit: TemplatePalette = { ...pal, D: [pen.mat, 1], x: [pen.mat, 1], s: [pen.mat, 2], b: [pen.mat, 3], l: [pen.mat, 4] };
    stampTemplate(L, HAND_BOOK, j.wrist, 0, lit, pen.part, { flags });
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
