// The arms of the owner's Wild Jacket (his Joven salvaje paint-over, docs/reference/joven-salvaje-owner-
// reference.jpg; wildJacketArt.ts): his sleeves and his bare fists turned whole about our joints in every
// pose, never our arm beside or instead of them (the owner on this jacket: "checa los brazos de joven
// salvaje tienen el error similar como los de ren y solen").

import { armDepth, armJoints, type DrawCtx, type Side } from '../ctx';
import { type PaintedPiece, segAngle, stampBent, stampPiece } from '../painted';
import { GRID, type PartId, type Vec } from '../raster';
import type { Rig } from '../rig';
import type { BodyType } from '../types';
import { WILD_FIST_F, WILD_FIST_N, WILD_JACKET_SLOT, WILD_SLEEVE_FORE_F, WILD_SLEEVE_FORE_N, WILD_SLEEVE_UP_F, WILD_SLEEVE_UP_F_FULL, WILD_SLEEVE_UP_N } from './wildJacketArt';
import { broadened, partsOff, stampCells, wildArmBends } from './youthKit';

/** Within this many degrees of the way he drew it (shoulder and elbow), an arm is at rest. */
const ARM_REST = 3;

/**
 * Whether a hand is open in this pose: the hand signs, a cradled book, a pointing finger, the palm that
 * casts and the hand that lets a weapon fly. Those are our hand pictures in the character's skin; every
 * other hand is his fist (he drew only fists), turned with the forearm.
 */
export function wildPalm(r: Rig, s: Side): boolean {
  const shape = s === 'N' ? r.shapeN : r.shapeF;
  const cast = r.pose.startsWith('cast');
  if (shape === 'cradle' || shape === 'point') return true;
  if (shape === 'sign') return !cast;
  return shape === 'open' && (r.pose === 'throw' || cast);
}

/** One of his pieces where an arm stamps it: about which joint, along which angle (stampPiece). */
export interface WildArmStamp {
  piece: PaintedPiece;
  at: Vec;
  deg: number;
  part: PartId;
  name: 'fore' | 'upper' | 'fist';
}

const BROAD = new Map<PaintedPiece, PaintedPiece>();
/** His piece broadened for the bulky body's broader arms (the sleeves by 2 columns a side, the fists by 1). */
function fit(body: BodyType, p: PaintedPiece, by: number): PaintedPiece {
  if (body !== 'bulky') return p;
  let q = BROAD.get(p);
  if (!q) BROAD.set(p, (q = broadened(p, by, by)));
  return q;
}

/**
 * His arm on our arm, back to front: his forearm sleeve (with the cuff) turned whole about our elbow, his
 * upper sleeve about our shoulder, and his fist on our wrist turned with the hand (no hand rule turning it
 * apart from the forearm or mirroring it), unless the hand is open (wildPalm) or `fist` is false. The far
 * upper sleeve is his strip as he drew it while the arm hangs at rest; as it moves out from behind the body,
 * his strip continued to the arm's whole breadth (WILD_SLEEVE_UP_F_FULL).
 */
export function wildArmStamps(r: Rig, s: Side, fist = !wildPalm(r, s)): WildArmStamp[] {
  const j = armJoints(r, s);
  const b = wildArmBends(r, s);
  const rest = Math.abs(b.shoulder) < ARM_REST && Math.abs(b.elbow) < ARM_REST;
  const up = s === 'N' ? WILD_SLEEVE_UP_N : rest ? WILD_SLEEVE_UP_F : WILD_SLEEVE_UP_F_FULL;
  const fore = s === 'N' ? WILD_SLEEVE_FORE_N : WILD_SLEEVE_FORE_F;
  const out: WildArmStamp[] = [
    { piece: fit(r.body, fore, 2), at: j.elbow, deg: segAngle(j.elbow, j.wrist), part: `forearm${s}` as PartId, name: 'fore' },
    { piece: fit(r.body, up, 2), at: j.shoulder, deg: segAngle(j.shoulder, j.elbow), part: `upperArm${s}` as PartId, name: 'upper' },
  ];
  if (fist) out.push({ piece: fit(r.body, s === 'N' ? WILD_FIST_N : WILD_FIST_F, 1), at: j.wrist, deg: segAngle(j.wrist, j.hand), part: `hand${s}` as PartId, name: 'fist' });
  return out;
}

/** How near a joint (fine pixels) his sleeve's cells turn with it when it bends: about half the sleeve's width. */
const JOINT_R: Record<Side, number> = { N: 6, F: 4 };

const isLine = (hex: string) => WILD_JACKET_SLOT[hex] === 'line';

/** How far (degrees) an elbow bends past his before the forearm comes across in front of the upper arm. */
const FOLDED = -45;

/**
 * Draws one of his arms in place of ours (wildArmStamps): our upper arm and forearm are taken away (his
 * sleeves are the arm at his thickness), and our hand where his fist takes its place. Where his shoulder
 * and elbow bend past the way he drew them, his own sleeve cells next to the joint fill the bend
 * (stampBent), so the sleeve folds round the elbow and the shoulder instead of breaking there; an elbow
 * folded up in front (FOLDED) brings the forearm over the upper arm. With gloves on, the gloves draw the
 * hand over ours.
 */
export function drawWildArm(g: DrawCtx, s: Side, tint: (ch: string, hex: string) => string): void {
  const r = g.rig;
  const j = armJoints(r, s);
  const fist = !wildPalm(r, s) && !g.has('hands');
  const cloth = armDepth(s, 'cloth');
  partsOff(g, [armDepth(s, 'body'), cloth], [`upperArm${s}` as PartId, `forearm${s}` as PartId, ...(fist ? [`hand${s}` as PartId] : [])]);
  const stamps = wildArmStamps(r, s, fist);
  const [fore, upper] = stamps;
  const under = stampCells(fore.piece, fore.at, fore.deg);
  const b = wildArmBends(r, s);
  const R = JOINT_R[s];
  // Folded up in front (the forearm across the chest, raised in guard), his forearm sleeve crosses over the
  // end of his upper sleeve, its line showing where it does; otherwise the upper sleeve's end lies over it.
  const folded = b.elbow <= FOLDED;
  if (!folded) stampPiece(g, cloth, fore.piece, fore.at, fore.deg, fore.part, tint);
  stampBent(
    g,
    cloth,
    upper.piece,
    upper.at,
    upper.deg,
    upper.part,
    [
      { about: j.elbow, r: R, bend: b.elbow, carry: true },
      { about: j.shoulder, r: R, bend: b.shoulder },
    ],
    isLine,
    tint,
    (x, y) => under.has(y * GRID + x),
  );
  if (folded) stampPiece(g, cloth, fore.piece, fore.at, fore.deg, fore.part, tint);
  const f = stamps.find((t) => t.name === 'fist');
  if (f) stampPiece(g, armDepth(s, 'armor'), f.piece, f.at, f.deg, f.part, tint);
}
