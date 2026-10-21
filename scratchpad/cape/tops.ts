import { writeFileSync } from 'fs';
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const [out, tag] = process.argv.slice(2);
const c = LEGENDARY_PRESETS[0].character;
const base = getAppearance(c);
for (const top of ['top_tee', 'top_highcollar', 'top_longsleeve', 'top_mesh', 'top_jacket', 'top_kimono', 'top_royalcoat', 'top_bomber']) {
  const s: any = { ...base.slots, top: { id: top, colors: [] } };
  delete s.armor; delete s.cape; delete s.held; delete s.skirt;
  const f = renderSpriteCached({ ...base, slots: s, accessories: [] } as any, 'idle', 0, dojutsuToEye(c.dojutsu));
  writeFileSync(`${out}/${tag}-${top}.rgba`, Buffer.from(f.rgba));
}
