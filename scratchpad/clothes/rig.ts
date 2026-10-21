import { buildRig } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
const r = buildRig((process.argv[2]||'male') as any, (process.argv[3]||'idle') as any, +(process.argv[4]||0));
const f = (v:any)=>`(${v.x.toFixed(1)},${v.y.toFixed(1)})`;
for (const k of ['pelvis','neck','head','shoulderN','elbowN','wristN','handN','shoulderF','elbowF','wristF','hipN','kneeN','ankleN','hipF','kneeF','ankleF']) console.log(k, f((r as any)[k]));
console.log('up', f(r.up), 'T(0,0)', f(r.T(0,0)));
