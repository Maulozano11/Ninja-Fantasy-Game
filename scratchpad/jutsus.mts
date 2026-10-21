import { JUTSUS_DATA, ARMOR_STYLES } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/data/shinobiData.ts';
for (const j of JUTSUS_DATA) console.log(j.id, '|', j.name, '|', j.nameEs, '|', j.rank, j.category, j.nature, j.requiredClan ?? '', j.chakraCost);
console.log(ARMOR_STYLES.map(a => a.id + ':' + a.acBonus).join(', '));
