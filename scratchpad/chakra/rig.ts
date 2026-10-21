import { buildRig } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
for (const pose of ['idle','charge','cast','victory'] as const) for (const body of ['male','female','bulky'] as const) {
  const r = buildRig(body, pose, 0);
  const f = (p: any) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`;
  console.log(pose, body, 'head', f(r.head), 'pelvis', f(r.pelvis), 'handN', f(r.handN), 'handF', f(r.handF), 'ankleN', f(r.ankleN));
}
