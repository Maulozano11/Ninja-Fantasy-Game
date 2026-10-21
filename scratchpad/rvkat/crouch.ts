import { writeFileSync } from 'fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { getAppearance } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
const base: any = getAppearance(LEGENDARY_PRESETS[0].character);
for (const [n, body, pose, f] of [['crouch', 'male', 'crouch', 0], ['run', 'bulky', 'run', 0], ['train', 'female', 'train', 5]] as const) {
  const look: any = { ...base, body, slots: { ...base.slots, held: { id: 'held_katana', colors: [], parts: { steel: 'c' } } } };
  writeFileSync(`out/${n}.rgba`, Buffer.from(renderSprite(look, pose as any, f).rgba));
}
