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
