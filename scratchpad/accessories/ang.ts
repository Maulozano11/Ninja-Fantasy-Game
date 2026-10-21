import { buildRig, frameCount } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { SPRITE_POSES } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';
const a=(p:any,q:any)=>Math.round(Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI);
for (const b of ['male','female','bulky'] as const) for (const p of SPRITE_POSES) for (let f=0;f<frameCount(p);f++){const r=buildRig(b,p,f);console.log(b,p,f,'N',a(r.elbowN,r.handN),r.shapeN,'F',a(r.elbowF,r.handF),r.shapeF, 'upN', a(r.shoulderN,r.elbowN));}
