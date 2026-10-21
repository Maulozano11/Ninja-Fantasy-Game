// River patrol forced into combat by a loud block; watch the AI Kōton hunter's blocks.
import { createBattle, applyAction } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import { coverBetween, dist } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const fresh = (c: any) => ({ ...c, currentHp: c.maxHp, currentChakra: c.maxChakra, effects: [] });
const P = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const party = [P('preset_founder'), HANA, KENJI, P('preset_ember')];
const hj: Record<string, number> = {}; let rounds: number[] = []; let blocks = 0, perBattle: number[] = [], dists: number[] = [], crumbles = 0, wallsCast = 0, stalls = 0, refused = 0;
const N = Number(process.argv[2] ?? 20);
for (let seed = 1; seed <= N; seed++) {
  let { state } = createBattle(encounterSetup('river_patrol', party.map((c) => ({ character: fresh(c) })), { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 3, antidotes: 1, explosiveTags: 2 } }));
  const hana = state.units.companion_hana;
  let o: any = applyAction(state, { type: 'jutsu', unit: 'companion_hana', jutsu: 'koton_block', at: { x: hana.pos.x + 2, z: hana.pos.z } } as any);
  if (!o.ok) { console.log('block refused', o.reason, state.order[state.turn]); continue; }
  state = o.state;
  for (const u of Object.values(state.units)) if (u.team === 'party') { const r = applyAction(state, { type: 'setController', unit: u.id, controller: 'ai' } as any); if (r.ok) state = r.state; }
  let mine = 0, steps = 0;
  while (state.phase !== 'ended' && steps++ < 4000) {
    if (state.pending) { const r = applyAction(state, { type: 'react', unit: state.pending.reactor, take: false } as any); if (!r.ok) { stalls++; break; } state = r.state; continue; }
    const a = aiAction(state); const u = current(state);
    if (!a) { if (u) { const r = applyAction(state, { type: 'endTurn', unit: u.id } as any); if (r.ok) { state = r.state; continue; } } stalls++; break; }
    let r: any = applyAction(state, a);
    if (!r.ok) { refused++; r = applyAction(state, { type: 'endTurn', unit: u!.id } as any); if (!r.ok) { stalls++; break; } }
    for (const e of r.events) {
      if (e.t === 'jutsu' && e.unit.startsWith('hunter') && e.jutsu === 'koton_block') {
        blocks++; mine++;
        const h = r.state.units[e.unit];
        dists.push(+dist(h.pos, e.at).toFixed(2));
      }
      if (e.t === 'jutsu' && e.unit.startsWith('hunter') && e.jutsu === 'koton_wall') wallsCast++;
      if ((e.t === 'jutsu' || e.t === 'attack') && e.unit.startsWith('hunter')) { const k = e.t === 'jutsu' ? e.jutsu : 'attack'; hj[k] = (hj[k] ?? 0) + 1; }
      if (e.t === 'wall' && !e.on && e.wall.hp > 0 && e.wall.owner?.startsWith('hunter')) crumbles++;
    }
    state = r.state;
  }
  perBattle.push(mine); rounds.push(state.round); (globalThis as any).oc = [...((globalThis as any).oc ?? []), (state as any).outcome ?? state.phase + ":" + Object.values(state.units).filter((u) => u.team === "enemy").map((u) => u.id + "=" + (u.down ?? "up")).join(",")];
}
console.log(JSON.stringify((globalThis as any).oc.slice(0,4))); console.log(JSON.stringify({ hj, rounds, N, blocks, perBattle, crumbles, wallsCast, stalls, refused, dists: dists.slice(0, 30) }));
