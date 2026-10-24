// The owner's three new male outfits (docs/reference/three-outfits-owner-reference.jpg: the armoured
// one, the leather rogue and the tactical one) stand their own way: their shoulders a little broader than
// our male's, the arms hanging closer in, the legs further apart. Their pieces (items/outfits.ts) are his
// pixels where he drew them, so while a look wears a figure's arms or legs the rig's joints are moved under
// them (the samurai's way): at rest every joint is his (OUTFIT_HIS, read off his picture by
// tools/refs/outfits_ref.py), in every other pose the limb keeps the move that stays with it:
//   - each arm is moved as far as his shoulder stands from ours (the whole arm, so it keeps its length);
//     while the arm hangs about as at rest his elbow, wrist and hand are where he drew them, and as it
//     reaches out (45 degrees from rest) back to our arm moved, so a hand meets a weapon or a jutsu where
//     ours does;
//   - each leg is moved as far as his leg stands from ours on average (hip, knee and ankle: the whole
//     leg), and while both legs stand as at rest each joint is his.
// His head stands where our face template stands: on the male body it is not moved; on the bulky body
// (whose head is drawn a little larger) it is moved to the male's face column, so his face lands there too.

import { OUTFIT_HIS } from './outfitJointsArt';
import { segAngle } from './painted';
import { add, RES, sub, v, type Vec } from './raster';
import { drawRig, type Rig } from './rig';
import type { BodyType, SpriteAppearance } from './types';

/** His three figures. */
export type OutfitFigure = 'armored' | 'rogue' | 'tactical';

/** The bodies his outfits are cut for: the men's (the owner: women never wear the men's sets). */
export const OUTFIT_BODIES: BodyType[] = ['male', 'bulky'];

/** The items that carry a figure's arms (its sleeves), its hands (its forearms and gloves), its trousers and its footwear. */
const ARMS: Record<string, OutfitFigure> = { top_warden_mail: 'armored', top_drifter_jacket: 'rogue', top_vanguard_sleeves: 'tactical' };
const HANDS: Record<string, OutfitFigure> = { hands_warden_gauntlets: 'armored', hands_drifter_gloves: 'rogue', hands_vanguard_wraps: 'tactical' };
const LEGS: Record<string, OutfitFigure> = { bottom_warden_cuisses: 'armored', bottom_drifter_trousers: 'rogue', bottom_vanguard_cargo: 'tactical' };
const FEET: Record<string, OutfitFigure> = { feet_warden_greaves: 'armored', feet_drifter_boots: 'rogue', feet_vanguard_boots: 'tactical' };

/** Whose arms this look stands in: the figure of its sleeves, else of its gloves; none on a woman's body. */
export function outfitArms(look: SpriteAppearance): OutfitFigure | undefined {
  if (!OUTFIT_BODIES.includes(look.body)) return undefined;
  return ARMS[look.slots.top?.id ?? ''] ?? HANDS[look.slots.hands?.id ?? ''];
}

/** Whose legs this look stands in: the figure of its trousers, else of its footwear; none on a woman's body. */
export function outfitLegs(look: SpriteAppearance): OutfitFigure | undefined {
  if (!OUTFIT_BODIES.includes(look.body)) return undefined;
  return LEGS[look.slots.bottom?.id ?? ''] ?? FEET[look.slots.feet?.id ?? ''];
}

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
const his = (fig: OutfitFigure, name: string): Vec => v(OUTFIT_HIS[fig][name][0] / RES, OUTFIT_HIS[fig][name][1] / RES);

/**
 * How much an arm hangs as at rest: 1 while its upper arm and forearm are within 30 degrees of their idle
 * angles (the torso's turn taken off), down to 0 at 45 degrees.
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
export const outfitLegsStill = (r: Rig, look: SpriteAppearance): boolean => legsStill(r, outfitRestRig(look));

type Joint = 'shoulderN' | 'shoulderF' | 'elbowN' | 'elbowF' | 'wristN' | 'wristF' | 'handN' | 'handF' | 'hipN' | 'hipF' | 'kneeN' | 'kneeF' | 'ankleN' | 'ankleF';

/** The rig with its joints moved under his pieces (see the top of this file); any other look's rig as it is. */
export function outfitRig(rig: Rig, look: SpriteAppearance): Rig {
  const arms = outfitArms(look);
  const legs = outfitLegs(look);
  const face = OUTFIT_BODIES.includes(look.body) && look.faceShape === 'wanderer';
  if (!arms && !legs && !face) return rig;
  const idle = idleRig(rig.body);
  const t = segAngle(rig.pelvis, rig.neck) - segAngle(idle.pelvis, idle.neck);
  const out: Rig = { ...rig };
  if (face) {
    // his face anchor's column on every man's body (body.ts faceAnchor: the bulky head is drawn larger)
    const male = idleRig('male');
    const col = (r: Rig) => Math.floor((r.head.x - 1.9 * r.bp.headScale) * RES);
    out.head = v(rig.head.x + (col(male) - col(idle)) / RES, rig.head.y);
  }
  if (arms) {
    const off = (j: Joint): Vec => sub(his(arms, j), idle[j]);
    for (const s of ['N', 'F'] as const) {
      const w = armStill(rig, idle, s, t);
      const base = off(`shoulder${s}`);
      for (const j of [`shoulder${s}`, `elbow${s}`, `wrist${s}`, `hand${s}`] as const) {
        // at rest exactly his joint (no sum of ours lands it a pixel off)
        if (w === 1 && t === 0 && rig[j].x === idle[j].x && rig[j].y === idle[j].y) out[j] = his(arms, j);
        else out[j] = add(rig[j], turn(add(base, v((off(j).x - base.x) * w, (off(j).y - base.y) * w)), t));
      }
    }
  }
  if (legs) {
    const off = (j: Joint): Vec => sub(his(legs, j), idle[j]);
    const still = legsStill(rig, idle);
    for (const s of ['N', 'F'] as const) {
      const js = [`hip${s}`, `knee${s}`, `ankle${s}`] as const;
      const mean = v(js.reduce((a, j) => a + off(j).x, 0) / 3, js.reduce((a, j) => a + off(j).y, 0) / 3);
      for (const j of js) {
        if (still && rig[j].x === idle[j].x && rig[j].y === idle[j].y) out[j] = his(legs, j);
        else out[j] = add(rig[j], still ? off(j) : mean);
      }
    }
  }
  return out;
}

const REST = new Map<string, Rig>();

/** The rig this look stands in at rest (idle frame 0, moved under his pieces where he wears them). */
export function outfitRestRig(look: SpriteAppearance): Rig {
  const key = `${look.body}|${outfitArms(look)}|${outfitLegs(look)}|${look.faceShape}`;
  let r = REST.get(key);
  if (!r) REST.set(key, (r = outfitRig(idleRig(look.body), look)));
  return r;
}
