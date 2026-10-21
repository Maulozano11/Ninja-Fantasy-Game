import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
for (const s of Object.values(JUTSU)) {
  if (!s.dice) continue;
  console.log([s.id, s.dice, s.save ? 'save:' + s.save : 'ATTACK', s.special ?? '', s.shape, s.melee ? 'melee' : ''].join('\t'));
}
