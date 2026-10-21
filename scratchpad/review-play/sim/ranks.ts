import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
for (const e of ['river_patrol', 'cedar_rogues', 'night_raid', 'hydra'] as const) {
  const { state } = createBattle(encounterSetup(e, [HANA, KENJI].map((c) => ({ character: c })), { seed: 1, difficulty: 'normal', supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } }));
  console.log(e, Object.values(state.units).filter((u) => u.team === 'enemy').map((u) => `${u.name}:${u.character?.clan ?? u.kind}:${u.rank}:wis${u.stats.wis}:${u.jutsus.join('/')}`).join(' | '));
}
