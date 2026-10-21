// Prints the chin point and arm joints (fine pixels) of the read pose: tsx chin.mts <root>
const root = process.argv[2];
const { drawRig, chinPoint } = await import(root + '/src/sprite/rig.ts');
const P = (p: any) => `(${(p.x * 2).toFixed(2)},${(p.y * 2).toFixed(2)})`;
for (const body of ['male', 'female', 'bulky', 'slender'])
  for (const f of [0, 3]) {
    const r = drawRig(body, 'read', f);
    console.log(body.padEnd(8), f, 'head', P(r.head), 'chin', P(chinPoint(r.head, r.bp)), 'shN', P(r.shoulderN), 'elN', P(r.elbowN), 'wrN', P(r.wristN), 'hN', P(r.handN), '| shF', P(r.shoulderF), 'elF', P(r.elbowF), 'wrF', P(r.wristF), 'hF', P(r.handF), 'arm', r.bp.upperArm, r.bp.forearm);
  }
