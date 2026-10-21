import { drawRig, POSES, RigPose } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { BodyType } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';

const f2 = (n: number) => n.toFixed(2);
const P = (p: { x: number; y: number }) => `(${f2(p.x)},${f2(p.y)})`;
const poses: [RigPose, number[]][] = [
  ['lean', [0, 2]],
  ['sit', [0]],
  ['read', [0, 9, 10]],
  ['train', [0, 1, 2, 3, 4, 5, 6, 7]],
  ['trainPole', [0, 3]],
  ['trainFist', [0, 1, 3, 6]],
  ['castBook', [0]],
  ['idle', [0]],
];
for (const body of ['male', 'female', 'slender', 'bulky'] as BodyType[]) {
  console.log(`=== ${body}`);
  for (const [pose, frames] of poses) {
    for (const fr of frames) {
      const r = drawRig(body, pose, fr);
      const info = (s: 'N' | 'F') => {
        const w = s === 'N' ? r.wristN : r.wristF;
        const h = s === 'N' ? r.handN : r.handF;
        const e = s === 'N' ? r.elbowN : r.elbowF;
        const sh = s === 'N' ? r.shoulderN : r.shoulderF;
        const dx = h.x - w.x, dy = h.y - w.y;
        const theta = (Math.atan2(dy, dx) * 180) / Math.PI;
        const raw = ((theta - 90 + 540) % 360) - 180;
        const rot = Math.abs(raw) <= 30 ? 0 : raw;
        const tr = (rot * Math.PI) / 180;
        const tx = Math.cos(tr), ty = Math.sin(tr);
        const flipX = tx < -0.25 || (Math.abs(tx) <= 0.25 && ty > 0);
        const reach = Math.hypot(w.x - sh.x, w.y - sh.y);
        return `${s}: sh${P(sh)} el${P(e)} wr${P(w)} hand${P(h)} fore=${f2(theta)}deg rot=${f2(rot)} flip=${flipX} shape=${s === 'N' ? r.shapeN : r.shapeF} reach=${f2(reach)}/${f2(r.bp.upperArm + r.bp.forearm)}`;
      };
      console.log(`${pose}#${fr} lean=${r.lean} pelvis${P(r.pelvis)} neck${P(r.neck)} head${P(r.head)} kneeN${P(r.kneeN)} kneeF${P(r.kneeF)} hipN${P(r.hipN)}`);
      console.log('   ' + info('N'));
      console.log('   ' + info('F'));
    }
  }
}
void POSES;
