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
export function armSpan(g: DrawCtx, L: Layer, s: Side, from: number, to: number, inflate: number, pen: Pen, shade?: number | 'skin'): void {
  const j = armJoints(g.rig, s);
  const R = g.bp.armR;
  const at = (t: number) => (t <= 1 ? lerp(j.shoulder, j.elbow, t) : lerp(j.elbow, j.wrist, t - 1));
  const rad = (t: number) => (t <= 1 ? R[0] + (R[1] - R[0]) * t : R[2] + (R[3] - R[2]) * (t - 1));
  spans(L, at, rad, from, to, inflate, pen, shade);
}

/** Capsules along a limb, split at the joint; 'skin' uses the reference cylinder shading. */
function spans(L: Layer, at: (t: number) => Vec, rad: (t: number) => number, from: number, to: number, inflate: number, pen: Pen, shade?: number | 'skin'): void {
  const cuts = [from, ...[1].filter((c) => c > from && c < to), to];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = at(cuts[i]);
    const b = at(cuts[i + 1]);
    const ra = rad(cuts[i]) + inflate;
    const rb = rad(cuts[i + 1]) + inflate;
    capsule(L, a, b, ra, rb, pen, shade === 'skin' ? cylShade(a, b, ra, rb) : shade);
  }
}

/** Same as armSpan for legs: 0 = hip, 1 = knee, 2 = ankle. */
export function legSpan(g: DrawCtx, L: Layer, s: Side, from: number, to: number, inflate: number, pen: Pen, shade?: number | 'skin'): void {
  const j = legJoints(g.rig, s);
  const R = g.bp.legR;
  const at = (t: number) => (t <= 1 ? lerp(j.hip, j.knee, t) : lerp(j.knee, j.ankle, t - 1));
  const rad = (t: number) => (t <= 1 ? R[0] + (R[1] - R[0]) * t : R[2] + (R[3] - R[2]) * (t - 1));
  spans(L, at, rad, from, to, inflate, pen, shade);
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
    '...obbbso...',
    '..osbbbbso..',
    '.osbbbbbsDo.',
    'osblbbbbssDo',
    'osbblbbbbsDo',
    'osbbbblbssDo',
    'oDxbxbxbxsDo',
    '.oDsDsDsxDo.',
    '..oDxoDxoo..',
    '...oo.oo....',
  ],
};
const HAND_FIST_FRONT: PixelTemplate = {
  pivot: [4, 0],
  rows: [
    '..obbbo..',
    '.osbbbbo.',
    'oDbblbbso',
    'oDblbbbso',
    'oxDbbxDso',
    'osbxDbbDo',
    'oDsbxDsso',
    '.oDxsxDo.',
    '..ooooo..',
  ],
};
const HAND_OPEN: PixelTemplate = {
  pivot: [5, 0],
  rows: [
    '..obbbso...',
    '.osbbbbso..',
    'osbbbbbbsoo',
    'oslbbbbsDso',
    'oblbbbbsDbo',
    'osbbbbsDobo',
    'osxbxbxso..',
    'obxbxsxDo..',
    'osxbxsxDo..',
    '.oDoDoDo...',
    '..o.o.o....',
  ],
};
const HAND_RELAXED: PixelTemplate = {
  pivot: [5, 0],
  rows: [
    '..obbbso...',
    '.osbbbbso..',
    'osbbbbbbso.',
    'oslbbbbsDso',
    'oblbbbbsDbo',
    'osbxbxbsoo.',
    'oDbxbxsDo..',
    '.oDsDsDo...',
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
  if (body === 'female') return { pivot: t.pivot, rows: t.rows.map((r) => r.slice(0, col) + r.slice(col + 1)) };
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
