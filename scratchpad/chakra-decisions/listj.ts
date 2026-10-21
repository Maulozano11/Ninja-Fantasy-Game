import { JUTSUS_DATA, LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e52913af-893-1/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e52913af-893-1/src/data/missions';
import { natureOf } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e52913af-893-1/src/rules/ninja';
for (const j of JUTSUS_DATA) console.log([j.id, j.category, j.nature, j.rank, j.requiredClan ?? '', j.nameEs ?? j.name].join(' | '));
console.log('---');
for (const c of [...LEGENDARY_PRESETS.map((p) => p.character), HANA, KENJI]) {
  const js = Object.entries(c.selectedJutsus).map(([k, id]) => {
    const j = JUTSUS_DATA.find((x) => x.id === id)!;
    return `${k.replace('slot', '')}=${id}(${j.category}/${j.nature}/${j.rank})`;
  });
  console.log(c.id, natureOf(c), c.appearance?.chakra.color, c.appearance?.chakra.tint, '\n    ' + js.join('\n    '));
}
