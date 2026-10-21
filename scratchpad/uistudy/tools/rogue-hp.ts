import { enemyUnit } from '/home/user/Ninja-Fantasy-Game/src/battle/units';
for (const n of [0, 1, 2]) {
  for (const d of ['normal', 'story'] as const) {
    const u = enemyUnit('rogue', n, { x: 0, y: 0 } as never, d as never);
    console.log(n, d, u.name, u.level, u.maxHp);
  }
}
