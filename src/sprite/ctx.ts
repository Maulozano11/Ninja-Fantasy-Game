// Shared drawing context handed to every item drawer, plus limb helpers that
// clothing and armor reuse so everything lines up with the base body.

import { RampKind } from './color';
import {
  add,
  capsule,
  ellipse,
  Layer,
  lerp,
  MaterialTable,
  norm,
  PartId,
  Pen,
  perp,
  poly,
  scale,
  sub,
  v,
  Vec,
} from './raster';
import { BodyParams, GROUND, Rig } from './rig';
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
  const bottom = opts.bottom ?? -2.6;
  const flare = opts.flare ?? 0;
  const pts: Vec[] = [
    sh(T(-b.shoulderHalf * 0.86 - i, Math.min(top, Lt - 1.2) + i * 0.5), 1),
    sh(T(-1.6, Math.min(top, Lt + 0.2) + i), 1),
    sh(T(2.8, Math.min(top, Lt + 0.2) + i), 1),
    sh(T(b.shoulderHalf * 0.58 + 0.6 + i, Math.min(top, Lt - 1.4) + i * 0.5), 1),
    sh(T(b.chestHalf * 0.62 + 0.8 + i + b.bust * 0.4, Lt - 4.4), 0.8),
    sh(T(b.chestHalf * 0.62 + 0.6 + i + b.bust, Lt - 6.2), 0.6),
    T(b.waistHalf * 0.64 + 0.7 + i, 5),
    T(b.hipHalf * 0.62 + 0.6 + i + flare * 0.6, Math.max(bottom, 0.5)),
    T(b.hipHalf * 0.3 + i * 0.5 + flare * 0.6, bottom - i * 0.3),
    T(-b.hipHalf * 0.45 - i * 0.5 - flare, bottom - i * 0.3),
    T(-b.hipHalf * 0.86 - 0.3 - i - flare, Math.max(bottom, 0)),
    T(-b.waistHalf * 0.86 - i, 5),
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

export function handDraw(g: DrawCtx, L: Layer, s: Side, pen: Pen, grow = 0): void {
  const j = armJoints(g.rig, s);
  const dir = norm(sub(j.hand, j.wrist));
  const R = g.bp.handR + grow;
  switch (j.shape) {
    case 'fist':
    case 'grip':
      ellipse(L, j.hand.x, j.hand.y, R * 1.05, R * 1.05, pen);
      break;
    case 'open': {
      capsule(L, j.wrist, add(j.hand, scale(dir, R * 0.8)), R * 0.9, R * 0.75, pen);
      break;
    }
    case 'sign':
      ellipse(L, j.hand.x, j.hand.y, R * 0.95, R * 1.1, pen);
      break;
    default: {
      capsule(L, j.wrist, add(j.hand, scale(dir, R * 0.35)), R * 0.85, R * 0.95, pen);
      // thumb
      const th = add(j.hand, scale(perp(dir), s === 'N' ? R * 0.9 : -R * 0.9));
      ellipse(L, th.x, th.y, 0.7, 0.7, pen, 3);
    }
  }
}
