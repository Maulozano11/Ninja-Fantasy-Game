const R = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src';
const { heldAt, throwRelease } = await import(`${R}/sprite/grip`);
const { FEET } = await import(`${R}/sprite/rig`);
for (const held of ['held_crystal', 'held_katana', 'held_naginata', 'held_kunai', 'held_flame_sword']) {
  for (const body of ['male', 'slender', 'bulky'] as const) {
    const rel = throwRelease(body, held);
    const h1 = heldAt(body, 'pierce', 1, held);
    const h2 = heldAt(body, 'pierce', 2, held);
    console.log(held, body, 'FEET', FEET, 'fist', rel.lastHeld.x.toFixed(1), rel.lastHeld.y.toFixed(1), 'ang', rel.weaponAngle, 'catch p1', h1.at.x.toFixed(1), h1.at.y.toFixed(1), h1.angle.toFixed(1), 'p2', h2.at.x.toFixed(1), h2.at.y.toFixed(1));
  }
}
