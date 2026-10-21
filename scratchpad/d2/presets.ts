import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { deriveStats } from '/home/user/Ninja-Fantasy-Game/src/rules/derived';
for (const p of LEGENDARY_PRESETS) {
  const c = p.character;
  const b = { level: c.level, stats: c.stats, clan: c.clan, shinobiClass: c.shinobiClass, armor: c.armorStyle, feats: c.selectedFeats };
  const d0 = deriveStats(b, { clanBonus: false }), d1 = deriveStats(b);
  const keys = ['maxHp', 'maxChakra', 'armorClass', 'jutsuSaveDC', 'jutsuAttackBonus'] as const;
  console.log(c.id, c.clan, c.sheetVersion, keys.map((k) => `${k} ${c[k]}->${c[k] + d1[k] - d0[k]}`).join(', '));
}
