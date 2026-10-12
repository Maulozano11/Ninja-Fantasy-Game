// Shared drawing context handed to every item drawer, plus limb helpers that
// clothing and armor reuse so everything lines up with the base body.

import { RampKind } from './color';
import {
  add,
  capsule,
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
  scale,
  seam,
  sub,
  v,
  Vec,
} from './raster';
import { BodyParams, GROUND, Rig } from './rig';
import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';
import type { EyeSpecial, SlotId, SpriteAppearance } from './types';

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
export function armSpan(g: DrawCtx, L: Layer, s: Side, from: number, to: number, inflate: number, pen: Pen, shade?: number): void {
  const j = armJoints(g.rig, s);
  const R = g.bp.armR;
  const at = (t: number) => (t <= 1 ? lerp(j.shoulder, j.elbow, t) : lerp(j.elbow, j.wrist, t - 1));
  const rad = (t: number) => (t <= 1 ? R[0] + (R[1] - R[0]) * t : R[2] + (R[3] - R[2]) * (t - 1));
  const cuts = [from, ...[1].filter((c) => c > from && c < to), to];
  for (let i = 0; i < cuts.length - 1; i++) {
    capsule(L, at(cuts[i]), at(cuts[i + 1]), rad(cuts[i]) + inflate, rad(cuts[i + 1]) + inflate, pen, shade);
  }
}

/** Same as armSpan for legs: 0 = hip, 1 = knee, 2 = ankle. */
export function legSpan(g: DrawCtx, L: Layer, s: Side, from: number, to: number, inflate: number, pen: Pen, shade?: number): void {
  const j = legJoints(g.rig, s);
  const R = g.bp.legR;
  const at = (t: number) => (t <= 1 ? lerp(j.hip, j.knee, t) : lerp(j.knee, j.ankle, t - 1));
  const rad = (t: number) => (t <= 1 ? R[0] + (R[1] - R[0]) * t : R[2] + (R[3] - R[2]) * (t - 1));
  const cuts = [from, ...[1].filter((c) => c > from && c < to), to];
  for (let i = 0; i < cuts.length - 1; i++) {
    capsule(L, at(cuts[i]), at(cuts[i + 1]), rad(cuts[i]) + inflate, rad(cuts[i + 1]) + inflate, pen, shade);
  }
}

export function armPoint(g: DrawCtx, s: Side, t: number): Vec {
  const j = armJoints(g.rig, s);
  return t <= 1 ? lerp(j.shoulder, j.elbow, t) : lerp(j.elbow, j.wrist, t - 1);
}

export function legPoint(g: DrawCtx, s: Side, t: number): Vec {
  const j = legJoints(g.rig, s);
  return t <= 1 ? lerp(j.hip, j.knee, t) : lerp(j.knee, j.ankle, t - 1);
}

/** Foot outline for a side, optionally enlarged for shoes. */
export function footPoly(g: DrawCtx, s: Side, grow = 0, toeExtra = 0): Vec[] {
  const a = legJoints(g.rig, s).ankle;
  const fl = g.bp.footLen * (s === 'F' ? 0.85 : 1) + toeExtra;
  const sole = GROUND;
  return [
    v(a.x - 1.6 - grow, a.y - 0.8 - grow),
    v(a.x + 1.2 + grow * 0.5, a.y - 0.8 - grow),
    v(a.x + fl * 0.75 + grow, sole - 2.6 - grow * 0.6),
    v(a.x + fl + grow, sole - 1.6 - grow * 0.3),
    v(a.x + fl + 0.4 + grow, sole),
    v(a.x - 1.8 - grow, sole),
  ];
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
  const crotch = opts.bottom ?? -3.4;
  const flare = opts.flare ?? 0;
  // Lower points never go below a hem the caller asked for.
  const lo = (y: number) => Math.max(y, crotch);
  const wa = b.waistHalf;
  const hp = b.hipHalf;
  const pts: Vec[] = [
    sh(T(-b.shoulderHalf * 0.86 - i, Math.min(top, Lt - 1.2) + i * 0.5), 1),
    sh(T(-1.6, Math.min(top, Lt + 0.2) + i), 1),
    sh(T(2.8, Math.min(top, Lt + 0.2) + i), 1),
    sh(T(b.shoulderHalf * 0.58 + 0.6 + i, Math.min(top, Lt - 1.4) + i * 0.5), 1),
    sh(T(b.chestHalf * 0.62 + 0.8 + i + b.bust * 0.4, Lt - 4.4), 0.8),
    sh(T(b.chestHalf * 0.62 + 0.6 + i + b.bust, Lt - 6.2), 0.6),
    // Waist, then hips as wide as both thighs, then the legs' tops and a low crotch,
    // so the legs come out from under the pelvis (as in the reference).
    T(wa * 0.64 + 0.7 + i, lo(5.4)),
    T(hp * 0.75 + 0.6 + i + flare * 0.6, lo(1.6)),
    T(hp * 0.66 + 0.5 + i + flare * 0.6, lo(-0.8)),
    T(1.0 + i * 0.3 + flare * 0.3, crotch - i * 0.3),
    T(-1.4 - i * 0.3 - flare * 0.3, crotch - i * 0.3),
    T(-hp * 0.9 - 0.4 - i - flare, lo(-0.8)),
    T(-hp * 0.98 - 0.6 - i - flare, lo(1.6)),
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
// and the thumb on the right, after the reference sprite's fists. They are
// rotated to the forearm angle with RotSprite and mirrored so the thumb faces
// forward. o outline · D dark · x finger crease · s shadow · b base · l light
const HAND_GRIP: PixelTemplate = {
  pivot: [6, 0],
  rows: [
    '...obbbbo...',
    '..obbbbbso..',
    '.osbbbbbbDo.',
    'olbbbbbbbbbo',
    'olbbbbbbbbbo',
    'osbbbbbbssbo',
    'oDsbbsbsooDo',
    '.oDbsDsDo.o.',
    '..oDsoDo....',
    '...oo.o.....',
  ],
};
const HAND_FIST_FRONT: PixelTemplate = {
  pivot: [5, 0],
  rows: [
    '..obbbbo..',
    '.obbbbbbo.',
    'oDsbbbbbso',
    'oDxDbxbbso',
    'olbbxsbbbo',
    'olbxxsbbbo',
    'oDbxbbsbDo',
    '.oDbxbDoo.',
    '..ooooo...',
  ],
};
const HAND_OPEN: PixelTemplate = {
  pivot: [5, 0],
  rows: [
    '..obbbbo...',
    '.obbbbbbo..',
    'obbbbbbbsoo',
    'oblbbbbbsbo',
    'oblbbbbbsbo',
    'obbbbbbsobo',
    'obxbxbxbo..',
    'obxbxbxbo..',
    'obxbxbxbo..',
    '.oDoDoDo...',
    '..o.o.o....',
  ],
};
const HAND_RELAXED: PixelTemplate = {
  pivot: [5, 0],
  rows: [
    '..obbbbo...',
    '.obbbbbbo..',
    'obbbbbbbso.',
    'oblbbbbbsbo',
    'oblbbbbbsbo',
    'osbxbxbsoo.',
    'oDbxbxbDo..',
    '.oDbDbDo...',
    '..ooooo....',
  ],
};

/**
 * Draws a hand from a pixel template matched to the reference sprite. The
 * pen's material recolors it (skin, gloves); `grow` is accepted for gloves
 * but the silhouette stays the same.
 */
export function handDraw(g: DrawCtx, L: Layer, s: Side, pen: Pen, grow = 0): void {
  void grow;
  const j = armJoints(g.rig, s);
  const dir = norm(sub(j.hand, j.wrist));
  const theta = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
  const rot = theta - 90;
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
        : s === 'N'
          ? HAND_GRIP
          : HAND_FIST_FRONT;
  const b = pen.bias || 0;
  const pal: TemplatePalette = {
    o: [pen.mat, 0],
    D: [pen.mat, 1 + b],
    x: [pen.mat, 0], // finger creases are near-black, like the reference
    s: [pen.mat, 2 + b],
    b: [pen.mat, 3 + b],
    l: [pen.mat, 4 + b],
  };
  stampTemplate(L, t, j.wrist, rot, pal, pen.part, { flipX, flags: F_NO_OUTLINE | F_NO_TEXTURE });
}
