// The cedar raider's actions per seed (for comparing before/after): npx tsx raider.ts [n]
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/data/shinobiData';
import { HANA, KENJI } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/data/missions';
import { encounterSetup } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/encounters';
import { applyAction, createBattle } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/engine';
import { aiAction } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/ai';
import { current } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/turns';
import { dist } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/map';
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
