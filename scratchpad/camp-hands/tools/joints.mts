// Prints rig joints (fine pixels) for poses: tsx joints.mts <root> pose[,pose] [frame]
const root = process.argv[2];
const poses = (process.argv[3] || 'read').split(',');
const frame = +(process.argv[4] || 0);
const { drawRig } = await import(root + '/src/sprite/rig.ts');
const P = (p: any) => `(${(p.x * 2).toFixed(1)},${(p.y * 2).toFixed(1)})`;
for (const pose of poses)
  for (const body of ['male', 'female', 'bulky', 'slender']) {
    const r = drawRig(body, pose, frame);
    const chest = r.T(r.bp.chestHalf * 0.5, r.bp.torsoLen - 6);
    console.log(
      pose.padEnd(9), body.padEnd(8),
      'pel', P(r.pelvis), 'neck', P(r.neck), 'head', P(r.head), 'chest', P(chest),
      '| shN', P(r.shoulderN), 'elN', P(r.elbowN), 'wrN', P(r.wristN), 'hN', P(r.handN),
      '| shF', P(r.shoulderF), 'elF', P(r.elbowF), 'wrF', P(r.wristF), 'hF', P(r.handF),
      '| kN', P(r.kneeN), 'kF', P(r.kneeF), 'hipN', P(r.hipN), 'hipF', P(r.hipF),
    );
  }
