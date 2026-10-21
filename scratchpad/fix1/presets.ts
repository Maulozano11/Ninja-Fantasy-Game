import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { deriveStats } from '/home/user/Ninja-Fantasy-Game/src/rules/derived';
for (const p of LEGENDARY_PRESETS) {
  const c = p.character;
  const d = deriveStats({ level: c.level, stats: c.stats, clan: c.clan, shinobiClass: c.shinobiClass, armor: c.armorStyle, feats: c.selectedFeats });
  console.log(c.name, c.clan, c.level, 'stored', c.maxHp, c.maxChakra, c.armorClass, c.jutsuSaveDC, '| derived', d.maxHp, d.maxChakra, d.armorClass, d.jutsuSaveDC);
}
