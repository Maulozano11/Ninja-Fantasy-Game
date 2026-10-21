// Prints the release frame's limb angles next to the reference's measured ones.
import { drawRig, THROW_RELEASE_FRAME } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cdaab36b-c8d-1/src/sprite/rig';
import { throwRelease } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_cdaab36b-c8d-1/src/sprite/grip';
type V = { x: number; y: number };
// angle of a segment: degrees, 0 = pointing forward (right), + = below horizontal
const ang = (a: V, b: V) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
const desc = (d: number) => {
  // describe as "N° above/below horizontal, forward/back"
  const back = Math.abs(d) > 90;
  const elev = back ? (d > 0 ? 180 - d : -180 - d) : d;
  return `${Math.abs(elev).toFixed(0)}° ${elev < 0 ? 'above' : 'below'} level, ${back ? 'back' : 'forward'}`;
};
const REF: Record<string, [V, V]> = {
  torso: [{ x: 128, y: 140 }, { x: 167, y: 77 }],
  upperArmThrow: [{ x: 160, y: 66 }, { x: 145, y: 46 }],
  forearmThrow: [{ x: 145, y: 46 }, { x: 95, y: 14 }],
  otherArm: [{ x: 108, y: 74 }, { x: 88, y: 62 }],
  frontThigh: [{ x: 138, y: 142 }, { x: 165, y: 160 }],
  frontShin: [{ x: 165, y: 160 }, { x: 118, y: 208 }],
  backThigh: [{ x: 112, y: 140 }, { x: 88, y: 172 }],
  backShin: [{ x: 88, y: 172 }, { x: 72, y: 200 }],
};
for (const body of ['male', 'female', 'bulky', 'slender'] as const) {
  const r = drawRig(body, 'throw', THROW_RELEASE_FRAME);
  const ours: Record<string, [V, V]> = {
    torso: [r.pelvis, r.neck],
    upperArmThrow: [r.shoulderN, r.elbowN],
    forearmThrow: [r.elbowN, r.handN],
    otherArm: [r.shoulderF, r.handF],
    frontThigh: [r.hipF, r.kneeF],
    frontShin: [r.kneeF, r.ankleF],
    backThigh: [r.hipN, r.kneeN],
    backShin: [r.kneeN, r.ankleN],
  };
  if (body === 'male') {
    console.log('segment'.padEnd(15), 'reference'.padEnd(30), 'ours (male)');
    for (const k of Object.keys(REF)) console.log(k.padEnd(15), desc(ang(...REF[k])).padEnd(30), desc(ang(...ours[k])));
  }
  console.log(body, JSON.stringify(throwRelease(body)), JSON.stringify(throwRelease(body, 'held_naginata').weaponAngle));
}
