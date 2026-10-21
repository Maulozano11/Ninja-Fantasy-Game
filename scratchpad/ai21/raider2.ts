import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import { dist } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const noUlt = <T extends { selectedJutsus: Record<string, string> }>(c: T): T => ({ ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } });
const preset = (pid: string) => LEGENDARY_PRESETS.find((p) => p.character.id === pid)!.character;
const party = [
  { character: noUlt(preset('preset_founder')), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: noUlt(HANA), controller: 'ai' as const, aiOrder: 'support' as const },
  { character: noUlt(KENJI), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: noUlt(preset('preset_gentle')), controller: 'ai' as const, aiOrder: 'aggressive' as const },
];
const f1 = (p: { x: number; z: number }) => `(${p.x.toFixed(1)},${p.z.toFixed(1)})`;
for (const seed of process.argv.slice(2).map(Number)) {
  let s = createBattle({ ...encounterSetup('cedar_rogues', party, { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state;
  let lastId = '';
  for (let n = 0; n < 3000 && s.phase !== 'ended'; n++) {
    const u = current(s)!;
    if (u.id === 'raider_0' && u.id !== lastId) {
      const i = u.intent;
      console.log(`seed ${seed} r${s.round} raider at ${f1(u.pos)} hp ${u.hp} plan ${i?.kind}:${i?.target} to ${i?.to ? f1(i.to) : '-'} nodes ${s.nodes.map((x) => f1(x.pos)).join(' ')} foes ${Object.values(s.units).filter((o) => o.team === 'party' && !o.down).map((o) => `${o.id.slice(0, 8)}${f1(o.pos)} hp${o.hp}`).join(' ')}`);
    }
    lastId = u.id;
    s = applyAction(s, aiAction(s)!).state;
  }
}
