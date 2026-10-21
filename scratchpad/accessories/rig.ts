import { buildRig } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
const f=(v:any)=>`(${v.x.toFixed(1)},${v.y.toFixed(1)})`;
for (const [p,fr] of [['idle',0],['attack',0],['attack',1],['cast',0],['hurt',0],['victory',0],['charge',0]] as any) {
  const r = buildRig('male', p, fr);
  console.log(p,fr,'pel',f(r.pelvis),'neck',f(r.neck),'head',f(r.head),'shN',f(r.shoulderN),'shF',f(r.shoulderF),'elN',f(r.elbowN),'wrN',f(r.wristN),'hN',f(r.handN),'hF',f(r.handF),'knN',f(r.kneeN),'anN',f(r.ankleN), 'anF', f(r.ankleF));
}
