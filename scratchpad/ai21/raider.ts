// The cedar raider's actions per seed (for comparing before/after): npx tsx raider.ts [n]
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
for (let seed = 1; seed <= Number(process.argv[2] ?? 20); seed++) {
  let s = createBattle({ ...encounterSetup('cedar_rogues', party, { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state;
  const acts: string[] = [];
  for (let n = 0; n < 3000 && s.phase !== 'ended'; n++) {
    const a = aiAction(s)!;
    const u = current(s)!;
    if (u.id === 'raider_0' && a.type !== 'endTurn') {
      const t = 'target' in a && a.target ? s.units[a.target] : undefined;
      acts.push(`r${s.round}:${a.type}${'jutsu' in a ? '/' + a.jutsu : ''}${'ranged' in a && a.ranged ? '/k' : ''}${t ? '@' + dist(u.pos, t.pos).toFixed(1) : ''}`);
    }
    s = applyAction(s, a).state;
  }
  console.log(seed, s.units.raider_0.down ? `down` : 'up', acts.join(' '));
}
