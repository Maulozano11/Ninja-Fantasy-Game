import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
for (const s of Object.values(JUTSU)) {
  if (s.special || s.save) continue;
  console.log([s.id, s.dice ?? '-', s.shape, s.effect ?? '', s.cast].join('\t'));
}
