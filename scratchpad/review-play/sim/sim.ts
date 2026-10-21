// AI-only battles on the real encounters, with the Battle practice party (Solen, Hana, Kenji, Akira or Shiori):
// counts each clan ability the AI uses, per team, and refusals/stalls.
import { createBattle, applyAction } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';

const fresh = (c: any) => ({ ...c, currentHp: c.maxHp, currentChakra: c.maxChakra, effects: [] });
const P = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const parties: Record<string, any[]> = {
  practice: [P('preset_founder'), HANA, KENJI, P('preset_ember')],
  shiori: [P('preset_gentle'), HANA, KENJI, P('preset_founder')],
};
const enc = (process.argv[2] ?? 'cedar_rogues') as any;
const which = process.argv[3] ?? 'practice';
const N = Number(process.argv[4] ?? 30);
const tally: Record<string, number> = {};
const add = (k: string) => (tally[k] = (tally[k] ?? 0) + 1);
let refused = 0, stalls = 0, outcomes: Record<string, number> = {};
for (let seed = 1; seed <= N; seed++) {
  let { state } = createBattle(encounterSetup(enc, parties[which].map((c) => ({ character: fresh(c) })), { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 3, antidotes: 1, explosiveTags: 2 } }));
  for (const u of Object.values(state.units)) if (u.team === 'party') { const o = applyAction(state, { type: 'setController', unit: u.id, controller: 'ai' } as any); if (o.ok) state = o.state; }
  let steps = 0;
  while (state.phase !== 'ended' && steps < 4000) {
    steps++;
    if (state.pending) {
      const o = applyAction(state, { type: 'react', unit: state.pending.reactor, take: false } as any);
      if (!o.ok) { stalls++; break; }
      state = o.state; continue;
    }
    if (state.phase === 'stealth') { const o = applyAction(state, { type: 'endTurn', unit: state.order[state.turn] } as any); if (o.ok) { state = o.state; continue; } }
    const a = aiAction(state);
    const u = current(state);
    if (!a) { if (u) { const o = applyAction(state, { type: 'endTurn', unit: u.id } as any); if (o.ok) { state = o.state; continue; } } stalls++; break; }
    let o = applyAction(state, a);
    if (!o.ok) { refused++; add(`REFUSED ${a.type}:${(a as any).jutsu ?? ''}:${(o as any).reason ?? ''}`); o = applyAction(state, { type: 'endTurn', unit: u!.id } as any); if (!o.ok) { stalls++; break; } }
    for (const e of o.events) {
      const team = (id?: string) => (id && state.units[id] ? state.units[id].team : '?');
      if (e.t === 'jutsu' && /^(mirai_|katon_|koton_|ryusei_|northstar_)/.test(e.jutsu)) add(`${team(e.unit)} ${e.jutsu}`);
      if (e.t === 'evade') add(`${team(e.unit)} evade`);
      if (e.t === 'node' && e.on) add(`${team(e.node.owner)} node`);
      if (e.t === 'command' && e.on) add(`command on ${e.unit}`);
      if (e.t === 'slowed') add(`slowed ${team(e.unit)}`);
      if (e.t === 'kawarimi') add(`${team(e.unit)} kawarimi`);
      if (e.t === 'jutsu' && !/^(mirai_|katon_|koton_|ryusei_|northstar_)/.test(e.jutsu) && state.units[e.unit]?.team === 'enemy') add(`enemy other-jutsu ${e.jutsu}`);
    }
    state = o.state;
  }
  if (steps >= 4000) add('step-limit');
  const out = (state as any).outcome ?? state.phase;
  outcomes[out] = (outcomes[out] ?? 0) + 1;
}
console.log(enc, which, N, JSON.stringify({ refused, stalls, outcomes }));
for (const [k, v] of Object.entries(tally).sort()) console.log('  ', k, v);
