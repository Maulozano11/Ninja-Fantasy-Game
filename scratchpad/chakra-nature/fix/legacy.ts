// Writes a pre-sprite hero (no look, Northstar, aura #06b6d4) as JSON: npx tsx legacy.ts <out.json>
import { writeFileSync } from 'node:fs';
import { DEFAULT_CHARACTER } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-fix/src/data/shinobiData';
const { appearance: _a, ...rest } = DEFAULT_CHARACTER;
const hero = { ...rest, id: 'legacy_hero', name: 'Viejo Norte', clan: 'Northstar', palette: { ...rest.palette, chakraAuraColor: '#06b6d4' } };
writeFileSync(process.argv[2], JSON.stringify(hero));
