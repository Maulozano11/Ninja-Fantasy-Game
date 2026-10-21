// Checks the camp hands reach their targets: tsx reach.mts <root>
const root = process.argv[2];
const rig = await import(root + '/src/sprite/rig.ts');
const { drawRig, chinPoint, READ_HOLD, frameCount } = rig;
const f2 = (p: any) => `(${(p.x * 2).toFixed(2)},${(p.y * 2).toFixed(2)})`;
let bad = 0;
for (const body of ['male', 'female', 'bulky', 'slender']) {
  for (let f = 0; f < frameCount('read'); f++) {
    const r = drawRig(body, 'read', f);
    const c = chinPoint(r.head, r.bp);
    const tN = { x: c.x + READ_HOLD.chin.x / 2, y: c.y + READ_HOLD.chin.y / 2 };
    const tF = { x: c.x + READ_HOLD.book.x / 2, y: c.y + READ_HOLD.book.y / 2 };
    const dN = Math.hypot(r.wristN.x - tN.x, r.wristN.y - tN.y);
    const dF = Math.hypot(r.wristF.x - tF.x, r.wristF.y - tF.y);
    const ext = Math.hypot(r.wristF.x - r.shoulderF.x, r.wristF.y - r.shoulderF.y) / (r.bp.upperArm + r.bp.forearm);
    const extN = Math.hypot(r.wristN.x - r.shoulderN.x, r.wristN.y - r.shoulderN.y) / (r.bp.upperArm + r.bp.forearm);
    if (dN > 1e-6 || dF > 1e-6) bad++;
    if (f === 0 || dN > 1e-6 || dF > 1e-6)
      console.log('read', body, f, 'wrN', f2(r.wristN), 'miss', dN.toFixed(4), 'wrF', f2(r.wristF), 'miss', dF.toFixed(4), 'extF', ext.toFixed(3), 'extN', extN.toFixed(3));
  }
  for (const pose of ['sit', 'lean']) {
    const r = drawRig(body, pose, 0);
    const extN = Math.hypot(r.wristN.x - r.shoulderN.x, r.wristN.y - r.shoulderN.y) / (r.bp.upperArm + r.bp.forearm);
    const extF = Math.hypot(r.wristF.x - r.shoulderF.x, r.wristF.y - r.shoulderF.y) / (r.bp.upperArm + r.bp.forearm);
    console.log(pose, body, 'wrN', f2(r.wristN), 'wrF', f2(r.wristF), 'span', f2({ x: r.wristF.x - r.wristN.x, y: r.wristF.y - r.wristN.y }), 'extN', extN.toFixed(3), 'extF', extF.toFixed(3));
  }
}
console.log('misses', bad);
