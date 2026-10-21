const [repo, pose, frame, body] = process.argv.slice(2);
const { drawRig, rigPoseFor } = await import(repo + '/src/sprite/rig.ts');
const r = drawRig(body ?? 'male', rigPoseFor(pose, undefined, 'held_flame_sword'), +frame);
for (const j of ['hipN', 'kneeN', 'ankleN', 'hipF', 'kneeF', 'ankleF', 'wristN', 'handN', 'wristF', 'handF']) console.log(j, (r[j].x * 2).toFixed(2), (r[j].y * 2).toFixed(2));
console.log('shapeN', r.shapeN, 'shapeF', r.shapeF);
