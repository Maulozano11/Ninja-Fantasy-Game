import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { runAi } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
const preset = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const party = [preset('preset_founder'), HANA, KENJI, preset('preset_gentle')].map((c) => ({ character: { ...c, effects: [] }, controller: 'ai' as const }));
const id = (process.argv[2] ?? 'hydra') as 'hydra';
const s = createBattle({ ...encounterSetup(id, party, { seed: 3, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state;
const out = runAi(s, 5000);
for (const e of out.events) {
  if (e.t === 'jutsu') console.log('jutsu', e.unit, e.jutsu);
  if (e.t === 'damage') console.log('  dmg', e.unit, e.amount, 'hp', e.hp, 'src', e.source);
  if (e.t === 'round') console.log('ROUND', e.round);
  if (e.t === 'end') console.log('END', e.outcome);
  if (e.t === 'down') console.log('  down', e.unit, e.state);
}
console.log('final round', out.state.round);
