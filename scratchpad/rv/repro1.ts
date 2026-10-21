import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src/data/shinobiData';
import { migrateCharacter, natureOf } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src/rules/ninja';
import { withNature } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src/sprite/chakraNature';
import { fitLoadout, offNatureJutsus } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/chakra-decisions-review/src/rules/jutsuNature';
for (const [id, to, burst] of [['preset_night', 'Water', undefined], ['preset_sunburst', 'Fire', 'orange']] as const) {
  const p: any = LEGENDARY_PRESETS.find((x: any) => x.character.id === id)!.character;
  let chakra: any = withNature(p.appearance.chakra, to as any);
  if (burst) chakra = { ...chakra, color: burst };
  const fitted = fitLoadout(p.selectedJutsus, to as any, p.clan);
  const edited = { ...p, appearance: { ...p.appearance, chakra }, selectedJutsus: fitted.loadout };
  const loaded = migrateCharacter(JSON.parse(JSON.stringify(edited)));
  console.log(id, 'picked', to, JSON.stringify(edited.appearance.chakra), natureOf(edited), JSON.stringify(edited.selectedJutsus));
  console.log('   after reload', JSON.stringify(loaded.appearance!.chakra), natureOf(loaded), 'off-nature:', offNatureJutsus(loaded.selectedJutsus, natureOf(loaded)));
}
