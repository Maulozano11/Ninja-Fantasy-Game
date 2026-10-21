// The owner's Solen (docs/reference/solen-owner-reference.jpg) stands his own way: he drew the far arm
// thinner and nearer the body than our far arm hangs, and the legs wider than ours (his near leg further
// back, his far leg lower). His pieces of those limbs stay where he drew them; while our limbs hang or stand
// as at rest, they are moved there under his pieces (tools/refs/solen_ref.py FAR_OUT and LEG_OUT).

import type { DrawCtx, Side } from '../ctx';
import { segAngle } from '../painted';
import { GRID, Layer, partIndex, PartId, RES, v, Vec } from '../raster';
import { drawRig, type Rig } from '../rig';
import type { BodyType } from '../types';
import { FOUNDER_LEG_OUT } from './founderTrousersArt';
import { FOUNDER_FAR_OUT } from './founderTunicArt';

const IDLE = new Map<BodyType, Rig>();
const idleRig = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};

/** An angle wrapped into -180..180 degrees. */
const wrap180 = (a: number) => ((a + 540) % 360) - 180;

/**
 * How far his far arm hangs from ours (rig units), while his tunic dresses it: at rest FOUNDER_FAR_OUT,
 * turned with the torso. While our far arm hangs about as at rest (its upper arm and forearm within 30
 * degrees of their idle angles, the torso's turn taken off) the whole of it; as it reaches further (45
 * degrees: a throw, a cast, hand signs) back to our far arm's own joints, so a far hand meets the other
 * hand or a jutsu where ours does. `w` is how much of it applies.
 */
export function founderFarOut(g: DrawCtx): { out: Vec; w: number } {
  if (!g.has('top', 'top_founder')) return { out: v(0, 0), w: 0 };
  const w = founderArmStill(g, 'F');
  const r = g.rig;
  const idle = idleRig(r.body);
  const a = ((segAngle(r.pelvis, r.neck) - segAngle(idle.pelvis, idle.neck)) * Math.PI) / 180;
  const [dx, dy] = FOUNDER_FAR_OUT;
  return { out: v((w * (dx * Math.cos(a) - dy * Math.sin(a))) / RES, (w * (dx * Math.sin(a) + dy * Math.cos(a))) / RES), w };
}

/**
 * How much an arm hangs as at rest: 1 while its upper arm and forearm are within 30 degrees of their idle
 * angles (the torso's turn taken off), down to 0 at 45 degrees.
 */
export function founderArmStill(g: DrawCtx, s: Side): number {
  const r = g.rig;
  const idle = idleRig(r.body);
  const t = segAngle(r.pelvis, r.neck) - segAngle(idle.pelvis, idle.neck);
  const [sh, el, wr] = s === 'N' ? [r.shoulderN, r.elbowN, r.wristN] : [r.shoulderF, r.elbowF, r.wristF];
  const [sh0, el0, wr0] = s === 'N' ? [idle.shoulderN, idle.elbowN, idle.wristN] : [idle.shoulderF, idle.elbowF, idle.wristF];
  const du = Math.abs(wrap180(segAngle(sh, el) - t - segAngle(sh0, el0)));
  const df = Math.abs(wrap180(segAngle(el, wr) - t - segAngle(el0, wr0)));
  return Math.max(0, Math.min(1, (45 - Math.max(du, df)) / 15));
}

/** Within this many degrees of its idle angles, a leg stands as at rest. */
const LEG_STILL = 6;

/**
 * How far his leg stands from ours (rig units), while his trousers and his sandals dress it: FOUNDER_LEG_OUT while our legs
 * stand as at rest (each thigh and shin within LEG_STILL degrees of their idle angles: standing, signing), none as
 * soon as they move (walking, running, striking, kneeling), so a step never slides by
 * half of it. `w` is 1 or 0.
 */
export function founderLegOut(g: DrawCtx, s: Side): { out: Vec; w: number } {
  const r = g.rig;
  // Only on his sandals: any other footwear is drawn on our legs where they are.
  if (!g.has('bottom', 'bottom_founder') || !g.has('feet', 'feet_gladiator_sandals')) return { out: v(0, 0), w: 0 };
  const idle = idleRig(r.body);
  // Both legs stand as at rest, or neither is moved (a kick passing through the stance moves no leg).
  const turn = (a: Vec, b: Vec, a0: Vec, b0: Vec) => Math.abs(wrap180(segAngle(a, b) - segAngle(a0, b0)));
  const d = Math.max(
    turn(r.hipN, r.kneeN, idle.hipN, idle.kneeN),
    turn(r.kneeN, r.ankleN, idle.kneeN, idle.ankleN),
    turn(r.hipF, r.kneeF, idle.hipF, idle.kneeF),
    turn(r.kneeF, r.ankleF, idle.kneeF, idle.ankleF),
  );
  if (d > LEG_STILL) return { out: v(0, 0), w: 0 };
  const [dx, dy] = FOUNDER_LEG_OUT[s];
  return { out: v(dx / RES, dy / RES), w: 1 };
}

/** The pixels of these parts in a layer moved by `out` (rig units, whole fine pixels). */
export function moveParts(L: Layer, parts: PartId[], out: Vec): void {
  const ox = Math.round(out.x * RES);
  const oy = Math.round(out.y * RES);
  if ((!ox && !oy) || !L.used) return;
  const ids = new Set(parts.map((p) => partIndex(p)));
  const moved: [number, number, number, number, number][] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (L.mat[i] < 0 || !ids.has(L.part[i])) continue;
    moved.push([i, L.mat[i], L.shade[i], L.part[i], L.flags[i]]);
    L.mat[i] = -1;
  }
  for (const [i, mat, shade, part, flags] of moved) {
    const x = (i % GRID) + ox;
    const y = ((i / GRID) | 0) + oy;
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
    const j = y * GRID + x;
    L.mat[j] = mat;
    L.shade[j] = shade;
    L.part[j] = part;
    L.flags[j] = flags;
  }
}

/** Takes away the pixels of these parts in a layer that lie outside `keep` (a layer whose mat is 2 inside his pieces' line). */
export function clipParts(L: Layer, parts: PartId[], keep: Layer): void {
  const ids = new Set(parts.map((p) => partIndex(p)));
  for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids.has(L.part[i]) && keep.mat[i] !== 2) L.mat[i] = -1;
}
