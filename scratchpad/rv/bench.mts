const R = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-review';
const { LEGENDARY_PRESETS } = await import(R + '/src/data/shinobiData.ts');
const { renderSpriteCached } = await import(R + '/src/sprite/compose.ts');
const { renderChakra } = await import(R + '/src/sprite/chakra.ts');
const look = LEGENDARY_PRESETS[0].character.appearance;
const ids = ['red','blue','green','yellow','brown','indigo','violet','white','black'];
for (let pass = 0; pass < 3; pass++) {
  const t0 = performance.now();
  const spr = renderSpriteCached(look, 'charge', 0, 'none');
  for (const id of ids) renderChakra(id, 'charge', 6, spr.rgba, spr.rig, '#ff00ff');
  console.log('9 tiles ms', (performance.now() - t0).toFixed(1));
}
