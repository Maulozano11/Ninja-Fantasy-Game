// The owner's samurai (docs/reference/samurai-owner-reference.jpg) stands his own way: his shoulders a
// little broader than our male's, his near forearm hanging straight down, his legs further apart and the
// far one lower. His pieces (items/samurai.ts) are his pixels where he drew them, so while he wears his set
// the rig's joints are moved under them: at rest every joint is his (SAMURAI_HIS, read off his picture by
// tools/refs/samurai_ref.py), in every other pose the limb keeps the move that stays with it:
//   - each arm is moved as far as his shoulder stands from ours (the whole arm, so it keeps its length);
//     while the arm hangs about as at rest his elbow, wrist and hand are where he drew them, and as it
//     reaches out (45 degrees from rest) back to our arm moved, so a hand meets a weapon or a jutsu where
//     ours does;
//   - each leg is moved as far as his leg stands from ours on average (hip, knee and ankle: the whole
//     leg), and while both legs stand as at rest each joint is his;
//   - with his face the head stands where he drew it, SAMURAI_HEAD_UP higher on his longer neck.

import { segAngle } from './painted';
import { add, RES, sub, v, type Vec } from './raster';
import { drawRig, type Rig } from './rig';
import { SAMURAI_HIS } from './items/samuraiDoArt';
import { SAMURAI_HEAD_UP } from './samuraiHeadArt';
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
const his = (name: string): Vec => v(SAMURAI_HIS[name][0] / RES, SAMURAI_HIS[name][1] / RES);

/** The bodies his set is cut for: the men's (the owner: women never wear the men's sets). */
export const SAMURAI_BODIES: BodyType[] = ['male', 'bulky'];

/** Whether this look wears his arms (the sleeves, kote and gloves), which stand the arms where he drew them. */
export const samuraiArms = (look: SpriteAppearance): boolean => SAMURAI_BODIES.includes(look.body) && look.slots.hands?.id === 'hands_samurai';

/** Whether this look wears his legs (the hakama and the shin guards together), which stand the legs where he drew them. */
export const samuraiLegs = (look: SpriteAppearance): boolean => SAMURAI_BODIES.includes(look.body) && look.slots.bottom?.id === 'bottom_samurai_hakama' && look.slots.feet?.id === 'feet_samurai_suneate';

/** Whether this look has his face on a man's body (the head stands where he drew it). */
export const samuraiFace = (look: SpriteAppearance): boolean => SAMURAI_BODIES.includes(look.body) && look.faceShape === 'samurai';

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

type Joint = 'shoulderN' | 'shoulderF' | 'elbowN' | 'elbowF' | 'wristN' | 'wristF' | 'handN' | 'handF' | 'hipN' | 'hipF' | 'kneeN' | 'kneeF' | 'ankleN' | 'ankleF';

/** The rig with its joints moved under his pieces (see the top of this file); any other look's rig as it is. */
export function samuraiRig(rig: Rig, look: SpriteAppearance): Rig {
  const arms = samuraiArms(look);
  const legs = samuraiLegs(look);
  const face = samuraiFace(look);
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
    // his face anchor's column on every man's body (the bulky head is drawn a little larger)
    const male = idleRig('male');
    const col = (r: Rig) => Math.floor((r.head.x - 1.9 * r.bp.headScale) * RES);
    const dx = (col(male) - col(idle)) / RES;
    out.head = v(rig.head.x + dx, rig.head.y - SAMURAI_HEAD_UP / RES);
  }
  return out;
}

const REST = new Map<string, Rig>();

/** The rig this look stands in at rest (idle frame 0, moved under his pieces where he wears them). */
export function samuraiRestRig(look: SpriteAppearance): Rig {
  const key = `${look.body}|${samuraiArms(look)}|${samuraiLegs(look)}|${samuraiFace(look)}`;
  let r = REST.get(key);
  if (!r) REST.set(key, (r = samuraiRig(idleRig(look.body), look)));
  return r;
}
