const R = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-review';
const { DEFAULT_CHARACTER } = await import(R + '/src/data/shinobiData.ts');
const { appearance, ...rest } = DEFAULT_CHARACTER;
const c = { ...rest, id: 'ninja_legacy', name: 'Viejo', clan: 'Northstar', palette: { ...rest.palette, chakraAuraColor: '#06b6d4' } };
console.log(JSON.stringify(c));
