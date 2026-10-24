// The owner's bronze warrior stands his own way (docs/reference/bronze-warrior-owner-reference.jpg, brought
// down to our scale by tools/refs/bronze_ref.py): his torso is a little longer than ours, his legs a little
// shorter, his feet a little smaller, and he rests his near fist on his hip where our arm hangs. Worn whole,
// his figure stands on his joints (hopliteFigureArt.ts HOPLITE_JOINTS), so at rest every piece of his is
// where he drew it, and in every other pose our joints move with the pose while keeping his proportions:
//   - his torso (neck, shoulders, pelvis, hips) where his stands from ours, turned with the torso;
//   - each foot as far from ours as his stands at rest (his smaller feet still on our ground), each knee
//     where his thigh and shin, as long as his, meet between his hip and that ankle;
//   - each hand where ours is in the pose (so hands meet, hold and point where ours do), only while the arm
//     hangs as at rest carried to where he drew it (his near fist on his hip), each elbow where his upper arm
//     and forearm, as long as his, meet.
// Seated (the camp's sit and read) his hips stay on the seat where ours are.

import { segAngle } from './painted';
import { add, len, RES, scale, sub, v, Vec } from './raster';
import { drawRig, type Rig } from './rig';
import { HOPLITE_JOINTS } from './hopliteFigureArt';
import { isFemaleBody, type BodyType, type SpriteAppearance } from './types';

/** The armours that stand a look on his figure: his cuirass or his leather chest, on a male body. */
export const HOPLITE_ARMORS = ['armor_hoplite', 'armor_hoplite_leather'];

/** Whether a look stands on his figure: a male body (male, bulky) in one of his cuirasses. */
export const onHopliteFigure = (look: SpriteAppearance): boolean => !isFemaleBody(look.body) && HOPLITE_ARMORS.includes(look.slots.armor?.id ?? '');

type Joint = keyof typeof HOPLITE_JOINTS;
const his = (k: Joint): Vec => v(HOPLITE_JOINTS[k][0] / RES, HOPLITE_JOINTS[k][1] / RES);

const IDLE = new Map<BodyType, Rig>();
/** Our rig at idle frame 0 (ours, not his). */
export const ourIdle = (body: BodyType): Rig => {
  let r = IDLE.get(body);
  if (!r) IDLE.set(body, (r = drawRig(body, 'idle', 0)));
  return r;
};

/** How far his joint stands from our male's at rest (design units). */
const off = (k: Joint): Vec => sub(his(k), ourIdle('male')[k]);

/** An angle wrapped into -180..180 degrees. */
const wrap180 = (a: number) => ((a + 540) % 360) - 180;

const turn = (d: Vec, deg: number): Vec => {
  const a = (deg * Math.PI) / 180;
  return v(d.x * Math.cos(a) - d.y * Math.sin(a), d.x * Math.sin(a) + d.y * Math.cos(a));
};

/** How much an arm hangs as at rest: 1 while its upper arm and forearm are within 30 degrees of their idle angles (the torso's turn taken off), 0 past 45. */
export function hopliteArmStill(r: Rig, s: 'N' | 'F'): number {
  const idle = ourIdle(r.body);
  const t = segAngle(r.pelvis, r.neck) - segAngle(idle.pelvis, idle.neck);
  const [sh, el, wr] = s === 'N' ? [r.shoulderN, r.elbowN, r.wristN] : [r.shoulderF, r.elbowF, r.wristF];
  const [sh0, el0, wr0] = s === 'N' ? [idle.shoulderN, idle.elbowN, idle.wristN] : [idle.shoulderF, idle.elbowF, idle.wristF];
  const du = Math.abs(wrap180(segAngle(sh, el) - t - segAngle(sh0, el0)));
  const df = Math.abs(wrap180(segAngle(el, wr) - t - segAngle(el0, wr0)));
  return Math.max(0, Math.min(1, (45 - Math.max(du, df)) / 15));
}

/**
 * The middle joint of a limb from `root` to `end` with bones `a` and `b` long, bent to the side `like`
 * (our middle joint) is bent to. Out of reach, the limb straight toward `end`.
 */
function bend(root: Vec, end: Vec, a: number, b: number, like: Vec, likeEnd: Vec, likeRoot: Vec): Vec {
  const d = sub(end, root);
  const dist = Math.max(Math.abs(a - b), Math.min(a + b, len(d)));
  const base = Math.atan2(d.y, d.x);
  const c = Math.acos(Math.max(-1, Math.min(1, (a * a + dist * dist - b * b) / (2 * a * dist))));
  // which side our joint bends to (the sign of its turn off the line from root to end)
  const ld = sub(likeEnd, likeRoot);
  const lm = sub(like, likeRoot);
  const side = ld.x * lm.y - ld.y * lm.x >= 0 ? 1 : -1;
  const ang = base + side * c;
  return add(root, v(Math.cos(ang) * a, Math.sin(ang) * a));
}

/** A body's bone in our rig at idle (design units), to grow his bones on the broader body as ours grow. */
const bone = (body: BodyType, a: Joint, b: Joint): number => {
  const r = ourIdle(body);
  return len(sub(r[b] as Vec, r[a] as Vec));
};
/** His bone, on this body (his length times how much longer the body's bone is than our male's). */
const hisBone = (body: BodyType, a: Joint, b: Joint): number => len(sub(his(b), his(a))) * (bone(body, a, b) / bone('male', a, b));

/** The rig standing on his figure (see the file's head), for a look on his figure; any other look's rig as it is. */
export function hopliteRig(rig: Rig, look: SpriteAppearance): Rig {
  if (!onHopliteFigure(look)) return rig;
  const r = rig;
  const body = r.body;
  const idle = ourIdle(body);
  const t = segAngle(r.pelvis, r.neck) - segAngle(idle.pelvis, idle.neck);
  const seated = r.pose === 'sit' || r.pose === 'read';
  const dPelvis = turn(off('pelvis'), t);
  const torso = (k: Joint): Vec => add(r[k] as Vec, seated ? sub(turn(off(k), t), dPelvis) : turn(off(k), t));
  const pelvis = seated ? r.pelvis : add(r.pelvis, dPelvis);
  const neck = torso('neck');
  const shoulderN = torso('shoulderN');
  const shoulderF = torso('shoulderF');
  const hipN = torso('hipN');
  const hipF = torso('hipF');
  const arm = (s: 'N' | 'F', shoulder: Vec) => {
    const [sh, el, wr, hd] = s === 'N' ? [r.shoulderN, r.elbowN, r.wristN, r.handN] : [r.shoulderF, r.elbowF, r.wristF, r.handF];
    const w = hopliteArmStill(r, s);
    const wrist = add(wr, scale(turn(off(`wrist${s}`), t), w));
    const elbow = bend(shoulder, wrist, hisBone(body, `shoulder${s}`, `elbow${s}`), hisBone(body, `elbow${s}`, `wrist${s}`), el, wr, sh);
    const hand = add(add(wrist, sub(hd, wr)), scale(turn(sub(off(`hand${s}`), off(`wrist${s}`)), t), w));
    return { elbow, wrist, hand };
  };
  const aN = arm('N', shoulderN);
  const aF = arm('F', shoulderF);
  const leg = (s: 'N' | 'F', hip: Vec) => {
    const [hp, kn, an] = s === 'N' ? [r.hipN, r.kneeN, r.ankleN] : [r.hipF, r.kneeF, r.ankleF];
    const ankle = add(an, off(`ankle${s}`));
    const knee = bend(hip, ankle, hisBone(body, `hip${s}`, `knee${s}`), hisBone(body, `knee${s}`, `ankle${s}`), kn, an, hp);
    return { knee, ankle };
  };
  const lN = leg('N', hipN);
  const lF = leg('F', hipF);
  const moved = sub(pelvis, r.pelvis);
  return {
    ...r,
    pelvis,
    neck,
    shoulderN,
    shoulderF,
    hipN,
    hipF,
    elbowN: aN.elbow,
    wristN: aN.wrist,
    handN: aN.hand,
    elbowF: aF.elbow,
    wristF: aF.wrist,
    handF: aF.hand,
    kneeN: lN.knee,
    ankleN: lN.ankle,
    kneeF: lF.knee,
    ankleF: lF.ankle,
    T: (x, y) => add(r.T(x, y), moved),
  };
}
