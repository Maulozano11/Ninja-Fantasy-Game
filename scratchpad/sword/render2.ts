import { writeFileSync } from 'fs';
import { renderSpriteCached } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
// args: out name slotsJSON pose frame preset
const [out, name, slots, pose = 'idle', frame = '0', preset = '0'] = process.argv.slice(2);
const c = LEGENDARY_PRESETS[+preset].character;
const base = getAppearance(c);
const over = JSON.parse(slots || '{}');
const s: any = { ...base.slots };
for (const [k, v] of Object.entries(over)) { if (v === null) delete s[k]; else s[k] = { id: v, colors: [] }; }
const f = renderSpriteCached({ ...base, slots: s } as any, pose as any, +frame, dojutsuToEye(c.dojutsu));
writeFileSync(`${out}/${name}.rgba`, Buffer.from(f.rgba));
