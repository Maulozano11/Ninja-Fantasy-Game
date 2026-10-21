const R = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-review';
const { LEGENDARY_PRESETS, JUTSUS_DATA } = await import(R + '/src/data/shinobiData.ts');
const M = await import(R + '/src/data/missions.ts');
const { natureOf } = await import(R + '/src/rules/ninja.ts');
const { chakraHex } = await import(R + '/src/sprite/chakraInfo.ts');
const show = (c: any, tag: string) => {
  const js = Object.entries(c.selectedJutsus).map(([k, id]) => { const j = JUTSUS_DATA.find((x: any) => x.id === id); return `${k}=${id}(${j?.nature}/${j?.rank})`; });
  console.log(tag, c.id, c.name, 'clan', c.clan, '| chakra', JSON.stringify(c.appearance?.chakra), '| nature', natureOf(c), chakraHex(c.appearance?.chakra ?? {color:'blue'}), '| aura', c.palette?.chakraAuraColor, '\n   ', js.join(' '));
};
for (const p of LEGENDARY_PRESETS) show(p.character, 'L');
for (const [k, v] of Object.entries(M)) if (v && typeof v === 'object' && (v as any).selectedJutsus) show(v, 'C:' + k);
