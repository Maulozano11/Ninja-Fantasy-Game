// The owner's heroine knights (docs/reference/heroine-knights-owner-reference.jpg) stand their own way: her
// shoulders a little broader than our female's, her near arm hanging closer, her legs a little lower. Her
// pieces (items/heroineKnights.ts) are his pixels where he drew them, so while she wears his sets the rig's
// joints are moved under them: at rest every joint is his (HK_HIS, read off his picture by
// tools/refs/heroine_knights_ref.py), in every other pose the limb keeps the move that stays with it (as the
// samurai's rig does, samuraiRig.ts):
//   - each arm is moved as far as his shoulder stands from ours (the whole arm, so it keeps its length); while
//     the arm hangs about as at rest his elbow, wrist and hand are where he drew them, and as it reaches out
//     (45 degrees from rest) back to our arm moved, so a hand meets a weapon or a jutsu where ours does;
//   - each leg is moved as far as his leg stands from ours on average (hip, knee and ankle: the whole leg),
//     and while both legs stand as at rest each joint is his;
//   - with her face ('gallant') the head stands where he drew it: its face anchor on his.
// Only the fitted female body wears them (the owner: the women's sets are never shown on the men's bodies).

import { segAngle } from './painted';
import { add, RES, sub, v, type Vec } from './raster';
import { drawRig, type Rig } from './rig';
import { HK_FACE_ANCHOR, HK_HIS } from './heroineKnightsJointsArt';
import type { BodyType, SpriteAppearance } from './types';

const IDLE = new Map<BodyType, Rig>();
const idleRig = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};

/** An angle wrapped into -180..180 degrees. */
const wrap180 = (a: number) => ((a + 540) % 360) - 180;

const turn = (p: Vec, deg: number): Vec => {
  const t = (deg * Math.PI) / 180;
  return v(p.x * Math.cos(t) - p.y * Math.sin(t), p.x * Math.sin(t) + p.y * Math.cos(t));
};

/** His joint (rig units). */
const his = (name: string): Vec => v(HK_HIS[name][0] / RES, HK_HIS[name][1] / RES);

/** The bodies his heroines' sets are cut for: the fitted female body only. */
export const HK_BODIES: BodyType[] = ['female'];

/** The three sets. */
export const HK_SETS = ['paladin', 'rogue', 'dragon'] as const;
export type HkSet = (typeof HK_SETS)[number];

/** The set an item of his heroines belongs to (its id is `<slot>_heroine_<set>`), if any. */
export const hkSetOf = (id: string | undefined): HkSet | undefined => HK_SETS.find((s) => id?.endsWith(`_heroine_${s}`));

/** Whether this look wears his arms (any set's), which stand the arms where he drew them. */
export const hkArms = (look: SpriteAppearance): boolean => HK_BODIES.includes(look.body) && !!hkSetOf(look.slots.hands?.id);

/** Whether this look wears his legs (any set's thighs and lower legs together), which stand the legs where he drew them. */
export const hkLegs = (look: SpriteAppearance): boolean => HK_BODIES.includes(look.body) && !!hkSetOf(look.slots.bottom?.id) && !!hkSetOf(look.slots.feet?.id);

/** Whether this look has her face on the female body (the head stands where he drew it). */
export const hkFace = (look: SpriteAppearance): boolean => HK_BODIES.includes(look.body) && look.faceShape === 'gallant';

/**
 * How much an arm hangs as at rest: 1 while its upper arm and forearm are within 30 degrees of their idle
 * angles (the torso's turn taken off), down to 0 at 45 degrees (founderArmStill's rule).
 */
function armStill(r: Rig, idle: Rig, s: 'N' | 'F', t: number): number {
  const [sh, el, wr] = s === 'N' ? [r.shoulderN, r.elbowN, r.wristN] : [r.shoulderF, r.elbowF, r.wristF];
  const [sh0, el0, wr0] = s === 'N' ? [idle.shoulderN, idle.elbowN, idle.wristN] : [idle.shoulderF, idle.elbowF, idle.wristF];
  const du = Math.abs(wrap180(segAngle(sh, el) - t - segAngle(sh0, el0)));
  const df = Math.abs(wrap180(segAngle(el, wr) - t - segAngle(el0, wr0)));
  return Math.max(0, Math.min(1, (45 - Math.max(du, df)) / 15));
}

/** Within this many degrees of their idle angles both legs stand as at rest. */
const LEG_STILL = 6;

function legsStill(r: Rig, idle: Rig): boolean {
  const d = (a: Vec, b: Vec, a0: Vec, b0: Vec) => Math.abs(wrap180(segAngle(a, b) - segAngle(a0, b0)));
  return (
    Math.max(d(r.hipN, r.kneeN, idle.hipN, idle.kneeN), d(r.kneeN, r.ankleN, idle.kneeN, idle.ankleN), d(r.hipF, r.kneeF, idle.hipF, idle.kneeF), d(r.kneeF, r.ankleF, idle.kneeF, idle.ankleF)) <=
    LEG_STILL
  );
}

/** Whether both legs of a rig moved under his pieces stand as at rest (each thigh and shin within LEG_STILL degrees of this look's rest). */
export const hkLegsStill = (r: Rig, look: SpriteAppearance): boolean => legsStill(r, hkRestRig(look));

type Joint = 'shoulderN' | 'shoulderF' | 'elbowN' | 'elbowF' | 'wristN' | 'wristF' | 'handN' | 'handF' | 'hipN' | 'hipF' | 'kneeN' | 'kneeF' | 'ankleN' | 'ankleF';

/** The rig with its joints moved under his pieces (see the top of this file); any other look's rig as it is. */
export function heroineKnightsRig(rig: Rig, look: SpriteAppearance): Rig {
  const arms = hkArms(look);
  const legs = hkLegs(look);
  const face = hkFace(look);
  if (!arms && !legs && !face) return rig;
  const idle = idleRig(rig.body);
  const t = segAngle(rig.pelvis, rig.neck) - segAngle(idle.pelvis, idle.neck);
  const out: Rig = { ...rig };
  const off = (j: Joint): Vec => sub(his(j), idle[j]);
  if (arms) {
    for (const s of ['N', 'F'] as const) {
      const w = armStill(rig, idle, s, t);
      const base = off(`shoulder${s}`);
      for (const j of [`shoulder${s}`, `elbow${s}`, `wrist${s}`, `hand${s}`] as const) {
        // at rest exactly his joint (no sum of ours lands it a pixel off)
        if (w === 1 && t === 0 && rig[j].x === idle[j].x && rig[j].y === idle[j].y) out[j] = his(j);
        else out[j] = add(rig[j], turn(add(base, v((off(j).x - base.x) * w, (off(j).y - base.y) * w)), t));
      }
    }
  }
  if (legs) {
    const still = legsStill(rig, idle);
    for (const s of ['N', 'F'] as const) {
      const js = [`hip${s}`, `knee${s}`, `ankle${s}`] as const;
      const mean = v(js.reduce((a, j) => a + off(j).x, 0) / 3, js.reduce((a, j) => a + off(j).y, 0) / 3);
      for (const j of js) {
        if (still && rig[j].x === idle[j].x && rig[j].y === idle[j].y) out[j] = his(j);
        else out[j] = add(rig[j], still ? off(j) : mean);
      }
    }
  }
  if (face) {
    // the head moved so that its face anchor (body.ts faceAnchor) lands on his: the anchor is a whole fine
    // pixel, so the head moves by whole pixels and keeps its place on the neck in every pose
    const k = rig.bp.headScale;
    const nx = Math.floor((idle.head.x - 1.9 * k) * RES);
    const ny = Math.floor((idle.head.y + 1.0 * k) * RES);
    // (a hundredth of a pixel on, so that no sum lands the anchor on the pixel before)
    out.head = add(rig.head, v((HK_FACE_ANCHOR[0] - nx + 0.01) / RES, (HK_FACE_ANCHOR[1] - ny + 0.01) / RES));
  }
  return out;
}

const REST = new Map<string, Rig>();

/** The rig this look stands in at rest (idle frame 0, moved under his pieces where she wears them). */
export function hkRestRig(look: SpriteAppearance): Rig {
  const key = `${look.body}|${hkArms(look)}|${hkLegs(look)}|${hkFace(look)}`;
  let r = REST.get(key);
  if (!r) REST.set(key, (r = heroineKnightsRig(idleRig(look.body), look)));
  return r;
}
