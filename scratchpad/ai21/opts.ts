import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import type { EncounterId } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { ninjaOptions } from '/home/user/Ninja-Fantasy-Game/src/battle/intent';
import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
import { saveMod } from '/home/user/Ninja-Fantasy-Game/src/battle/combat';
const noUlt = <T extends { selectedJutsus: Record<string, string> }>(c: T): T => ({ ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } });
const preset = (pid: string) => LEGENDARY_PRESETS.find((p) => p.character.id === pid)!.character;
const party = [
  { character: noUlt(preset('preset_founder')), controller: 'ai' as const },
  { character: noUlt(HANA), controller: 'ai' as const, aiOrder: 'support' as const },
  { character: noUlt(KENJI), controller: 'ai' as const },
  { character: noUlt(preset('preset_gentle')), controller: 'ai' as const },
];
const id = (process.argv[2] ?? 'cedar_rogues') as EncounterId;
const s = createBattle({ ...encounterSetup(id, party, { seed: 1, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state;
for (const u of Object.values(s.units)) {
  if (u.kind !== 'ninja') continue;
  console.log(u.id, u.character?.clan, 'DC', u.saveDC, 'saves dex/wis/str/con', ['dex','wis','str','con'].map((a) => saveMod(u, a as 'dex')).join('/'), 'stats', JSON.stringify(u.stats));
  for (const o of ninjaOptions(s, u).slice(0, 6)) console.log('   ', o.value.toFixed(2), JSON.stringify(o.intent));
}
for (const j of ['taki_sixtyfour_palms','leaf_hurricane_senpuu','crescent_moon_dance','wood_dragon_jutsu','temple_of_nirvana','adamantine_sealing_chains']) console.log(j, JUTSU[j].dice, JUTSU[j].save, JUTSU[j].cost, JUTSU[j].range, JUTSU[j].shape);
