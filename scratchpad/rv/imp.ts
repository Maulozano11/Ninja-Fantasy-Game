import { readFileSync } from 'node:fs';
import { migrateCharacter, natureOf } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src/rules/ninja';
import { getAppearance } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src/sprite/legacy';
const k = JSON.parse(readFileSync('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions/kaien-old.json', 'utf8'));
const { appearance, ...noLook } = k;
const c2 = migrateCharacter(noLook);
console.log('kaien without appearance:', JSON.stringify(getAppearance(c2).chakra), natureOf(c2), 'aura', k.palette?.chakraAuraColor, 'jutsu', k.selectedJutsus.slot2Elemental);
