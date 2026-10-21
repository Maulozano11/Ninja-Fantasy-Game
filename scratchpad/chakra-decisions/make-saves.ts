// Writes the two saved heroes the screenshots load: Kaien as saved before his type followed his
// jutsu, and an own ninja with Spirit. npx tsx make-saves.ts
import { writeFileSync } from 'node:fs';
import { LEGENDARY_PRESETS, DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e52913af-893-1/src/data/shinobiData';

const OUT = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions';
const kaien = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_storm')!.character;
const { tint: _t, ...chakra } = kaien.appearance!.chakra;
writeFileSync(`${OUT}/kaien-old.json`, JSON.stringify({ ...kaien, appearance: { ...kaien.appearance!, chakra: { ...chakra, color: 'violet' } } }));
writeFileSync(
  `${OUT}/spirit-own.json`,
  JSON.stringify({ ...DEFAULT_CHARACTER, id: 'ninja_spirit', name: 'Yume', appearance: { ...DEFAULT_CHARACTER.appearance!, chakra: { ...DEFAULT_CHARACTER.appearance!.chakra, color: 'violet' } } }),
);
console.log('ok');
