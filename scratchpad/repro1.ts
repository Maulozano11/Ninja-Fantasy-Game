const R = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src';
const { LEGENDARY_PRESETS } = await import(R + '/data/shinobiData');
const { migrateCharacter, natureOf } = await import(R + '/rules/ninja');
const { withNature } = await import(R + '/sprite/chakraNature');
const { fitLoadout, offNatureJutsus } = await import(R + '/rules/jutsuNature');
for (const [id, to, burst] of [['preset_night', 'Water', undefined], ['preset_sunburst', 'Fire', 'orange']] as const) {
  const p = LEGENDARY_PRESETS.find((x: any) => x.character.id === id)!.character;
  let chakra = withNature(p.appearance.chakra, to);
  if (burst) chakra = { ...chakra, color: burst };
  const fitted = fitLoadout(p.selectedJutsus, to, p.clan);
  const edited = { ...p, appearance: { ...p.appearance, chakra }, selectedJutsus: fitted.loadout };
  // saveHero writes JSON; loadHero runs migrateCharacter
  const loaded = migrateCharacter(JSON.parse(JSON.stringify(edited)));
  console.log(id, 'picked', to, JSON.stringify(edited.appearance.chakra), 'nature', natureOf(edited), '-> after reload', JSON.stringify(loaded.appearance.chakra), 'nature', natureOf(loaded), 'jutsu', JSON.stringify(loaded.selectedJutsus), 'off-nature', offNatureJutsus(loaded.selectedJutsus, natureOf(loaded)));
}
