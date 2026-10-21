import { JUTSUS_DATA, LEGENDARY_PRESETS, CLANS_DATA } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src/data/shinobiData';
import { COMPANIONS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src/data/missions';
import { natureOf } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src/rules/ninja';
import { offNatureJutsus } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src/rules/jutsuNature';
for (const j of JUTSUS_DATA) console.log(j.category.padEnd(10), j.nature.padEnd(10), j.rank, j.id, j.requiredClan ?? '', '|', j.name);
console.log('---');
for (const c of COMPANIONS) console.log(c.id, natureOf(c), JSON.stringify(c.appearance?.chakra), JSON.stringify(c.selectedJutsus), offNatureJutsus(c.selectedJutsus, natureOf(c)));
console.log('---');
for (const [k, v] of Object.entries(CLANS_DATA)) console.log(k, (v as any).signatureJutsuId);
