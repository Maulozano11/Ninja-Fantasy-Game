// npx tsx joints.ts <pose> <frame> [body]
import { drawRig } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-fix/src/sprite/rig';
const [pose, frame, body] = process.argv.slice(2);
const r: any = drawRig((body ?? 'male') as any, pose as any, Number(frame));
const f = (p: any) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`;
const ang = (a: any, b: any) => ((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI).toFixed(1);
console.log('lean', r.lean, 'pelvis', f(r.pelvis), 'neck', f(r.neck), 'head', f(r.head));
console.log('N sh', f(r.shoulderN), 'el', f(r.elbowN), 'wr', f(r.wristN), 'hand', f(r.handN), 'upper', ang(r.shoulderN, r.elbowN), 'fore', ang(r.elbowN, r.wristN));
console.log('F sh', f(r.shoulderF), 'el', f(r.elbowF), 'wr', f(r.wristF), 'hand', f(r.handF), 'upper', ang(r.shoulderF, r.elbowF), 'fore', ang(r.elbowF, r.wristF));
console.log('legN', f(r.hipN), f(r.kneeN), f(r.ankleN), 'thigh', ang(r.hipN, r.kneeN), 'shin', ang(r.kneeN, r.ankleN));
console.log('legF', f(r.hipF), f(r.kneeF), f(r.ankleF), 'thigh', ang(r.hipF, r.kneeF), 'shin', ang(r.kneeF, r.ankleF));
console.log('torso', ang(r.pelvis, r.neck), 'neck->head', ang(r.neck, r.head));
