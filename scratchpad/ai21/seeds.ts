import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import type { EncounterId } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import type { ShinobiCharacter } from '/home/user/Ninja-Fantasy-Game/src/types/shinobi';
const hero = (o: Partial<ShinobiCharacter>): ShinobiCharacter => ({ ...DEFAULT_CHARACTER, effects: [], ...o });
const noUlt = (c: ShinobiCharacter): ShinobiCharacter => ({ ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } });
const party = [
  { character: noUlt(hero({ id: 'a', name: 'Aki' })), controller: 'ai' as const },
  { character: noUlt(HANA), controller: 'ai' as const, aiOrder: 'support' as const },
  { character: noUlt(KENJI), controller: 'ai' as const },
  { character: noUlt(hero({ id: 'n', name: 'Shiori', clan: 'Northstar' })), controller: 'ai' as const },
].slice(0, Number(process.env.PARTY ?? 4));
for (const id of ['river_patrol', 'cedar_rogues', 'night_raid'] as EncounterId[]) {
  for (let seed = 1; seed <= 8; seed++) {
    let s = createBattle({ ...encounterSetup(id, party, { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state;
    const seen = new Set<string>();
    for (let n = 0; n < 4000 && s.phase !== 'ended'; n++) {
      const a = aiAction(s)!;
      const out = applyAction(s, a);
      if (!out.ok) { seen.add('REFUSED'); break; }
      for (const e of out.events) {
        const by = (uid: string) => s.units[uid]?.team === 'enemy';
        if (e.t === 'jutsu' && by(e.unit)) seen.add(e.jutsu);
        if (e.t === 'evade' && by(e.unit)) seen.add('evade');
        if (e.t === 'node' && e.on && by(e.node.owner)) seen.add('node');
        if (e.t === 'attack' && by(e.unit) && e.reasons?.includes('behind')) seen.add('behind');
      }
      s = out.state;
    }
    console.log(id, seed, [...seen].filter((k) => ['katon_pursuing_flame', 'evade', 'node', 'ryusei_warp', 'behind', 'koton_block', 'koton_wall', 'ryusei_swap', 'REFUSED'].includes(k)).sort().join(' '));
  }
}
