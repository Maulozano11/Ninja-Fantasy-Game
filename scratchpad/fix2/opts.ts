import { createBattle, applyAction } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { ninjaOptions } from '/home/user/Ninja-Fantasy-Game/src/battle/intent';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
const fresh = (c: any) => ({ ...c, currentHp: c.maxHp, currentChakra: c.maxChakra, effects: [] });
const P = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const enc = (process.argv[2] ?? 'night_raid') as any;
const who = process.argv[3] ?? 'preset_gentle';
const party = [P('preset_gentle'), HANA, KENJI, P('preset_founder'), P('preset_ember')];
let { state } = createBattle(encounterSetup(enc, party.map((c) => ({ character: fresh(c) })), { seed: 3, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 3, antidotes: 1, explosiveTags: 2 } }));
for (const u of Object.values(state.units)) if (u.team === 'party') { const o = applyAction(state, { type: 'setController', unit: u.id, controller: 'ai' } as any); if (o.ok) state = o.state; }
const u0 = Object.values(state.units).find((u) => u.character?.id === who)!;
console.log(u0.id, u0.character?.clan, u0.jutsus, u0.chakra, 'saveDC', u0.saveDC);
for (const e of Object.values(state.units).filter((x) => x.team === 'enemy')) console.log(' enemy', e.id, e.character?.clan, e.rank, e.weapon.name, e.weapon.dice, 'wis', e.stats.wis, e.jutsus);
let shown = 0;
for (let step = 0; step < 600 && state.phase !== 'ended' && shown < 6; step++) {
  if (state.pending) { state = applyAction(state, { type: 'react', unit: state.pending.reactor, take: false } as any).state; continue; }
  if (state.phase === 'stealth') { state = applyAction(state, { type: 'endTurn', unit: state.order[state.turn] } as any).state; continue; }
  const u = current(state)!;
  if (u.id === u0.id && u.turn.action && u.turn.move === u.speed) {
    shown++;
    console.log('round', state.round, ninjaOptions(state, u).slice(0, 8).map((o) => `${o.intent.kind}:${o.intent.what}->${o.intent.target} ${o.value.toFixed(2)}`).join(' | '));
  }
  const a = aiAction(state) ?? { type: 'endTurn', unit: u.id };
  let o = applyAction(state, a as any);
  if (!o.ok) o = applyAction(state, { type: 'endTurn', unit: u.id } as any);
  state = o.state;
}
