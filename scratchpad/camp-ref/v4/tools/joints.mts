// tsx joints.mts <root>: the read pose's arm joints in fine pixels, per body and frame.
const root = process.argv[2];
const rig = await import(root + '/src/sprite/rig.ts');
const { RES } = await import(root + '/src/sprite/raster.ts');
const f = (p: any) => `(${(p.x * RES).toFixed(2)},${(p.y * RES).toFixed(2)})`;
for (const body of ['male', 'female', 'bulky', 'slender']) {
  for (const fr of [0, 3, 6, 9]) {
    const r = rig.buildRig(body, "read", fr);
    const bp = rig.BODY_PARAMS[body];
    const chin = rig.chinPixel(r.head, bp);
    console.log(body, fr, 'chin', f(chin), 'shN', f(r.shoulderN), 'elN', f(r.elbowN), 'wrN', f(r.wristN), 'hN', f(r.handN), '| shF', f(r.shoulderF), 'elF', f(r.elbowF), 'wrF', f(r.wristF), 'armR', bp.armR.join(','));
  }
}
