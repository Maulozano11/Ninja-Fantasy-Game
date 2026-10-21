import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { getAppearance } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
for (const p of LEGENDARY_PRESETS) { const c = p.character; const a = c.appearance ?? getAppearance(c); console.log(c.id, '|', (c as any).elementalNature ?? (c as any).nature ?? '', '| chakra', JSON.stringify(a.chakra), '| jutsus', (c as any).jutsus?.map((j: any) => j.id ?? j).join(',')); }
