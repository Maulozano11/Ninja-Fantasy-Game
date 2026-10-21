// AI-only battles on the shipped encounters: how often the clan signatures come up.
import { createBattle, applyAction } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import type { EncounterId } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { DEFAULT_CHARACTER, LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import type { BattleState, Action } from '/home/user/Ninja-Fantasy-Game/src/battle/types';

const preset = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const parties = {
  practice: [DEFAULT_CHARACTER, HANA, KENJI],
  shiori: [preset('preset_gentle'), preset('preset_ember'), HANA, KENJI],
};
const SUP = { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 };
const counts: Record<string, number> = {};
const inc = (k: string) => (counts[k] = (counts[k] ?? 0) + 1);
const N = Number(process.argv[2] ?? 20);
for (const enc of ['cedar_rogues', 'night_raid'] as EncounterId[]) {
  for (const [pn, party] of Object.entries(parties)) {
    for (let seed = 1; seed <= N; seed++) {
      let s: BattleState = createBattle(encounterSetup(enc, party.map((c) => ({ character: { ...c, effects: [] }, controller: 'ai' as const, aiOrder: 'aggressive' as const })), { seed, difficulty: 'normal', supplies: { ...SUP } })).state;
      let steps = 0, last = '', same = 0;
      while (s.phase === 'combat' && steps < 3000) {
        steps++;
        if (s.pending) { const out = applyAction(s, { type: 'react', unit: s.pending.reactor, take: true }); s = out.state; continue; }
        const a = aiAction(s);
        if (!a) break;
        const u = current(s)!;
        same = u.id === last ? same + 1 : 0; last = u.id;
        const act: Action = same > 6 ? { type: 'endTurn', unit: u.id } : a;
        const out = applyAction(s, act);
        if (!out.ok) { inc(`refused:${u.team}:${a.type}:${out.reason}`); s = applyAction(s, { type: 'endTurn', unit: u.id }).state; continue; }
        if (act.type === 'jutsu') inc(`${u.team === 'enemy' ? 'enemy' : 'party'}:${u.commanded ? 'cmd:' : ''}${act.jutsu}`);
        for (const e of out.events) if (e.t === 'evade') inc(`evade:${s.units[e.unit].team}`); else if (e.t === 'node' && e.on) inc('node');
        s = out.state;
      }
      inc(`end:${enc}:${pn}:${s.outcome ?? 'stalled'}`);
    }
  }
}
console.log(Object.entries(counts).sort().map(([k, v]) => `${k}=${v}`).join('\n'));
