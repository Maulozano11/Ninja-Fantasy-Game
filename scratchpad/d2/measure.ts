// AI-only battles on the shipped encounters: outcomes, refused actions, and clan-ability use.
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { ENCOUNTERS, encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import type { EncounterId } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import type { BattleState } from '/home/user/Ninja-Fantasy-Game/src/battle/types';

const N = Number(process.argv[2] ?? 30);
const NO_ULT = process.argv[3] === 'noult';
const strip = <T extends { selectedJutsus: Record<string, string> }>(c: T): T => (NO_ULT ? { ...c, selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } } : c);
const preset = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const party = [
  { character: strip({ ...preset('preset_founder'), effects: [] }), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: strip({ ...HANA, effects: [] }), controller: 'ai' as const, aiOrder: 'support' as const },
  { character: strip({ ...KENJI, effects: [] }), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: strip({ ...preset('preset_gentle'), effects: [] }), controller: 'ai' as const, aiOrder: 'aggressive' as const },
];
const ABIL = ['katon_pursuing_flame', 'koton_block', 'koton_wall', 'ryusei_warp', 'ryusei_swap', 'northstar_command', 'northstar_submission'];
for (const id of Object.keys(ENCOUNTERS) as EncounterId[]) {
  const tally: Record<string, number> = {};
  const add = (k: string, n = 1) => (tally[k] = (tally[k] ?? 0) + n);
  let rounds = 0;
  const clans = new Set<string>();
  for (let seed = 1; seed <= N; seed++) {
    const setup = { ...encounterSetup(id, party, { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false };
    let s: BattleState = createBattle(setup).state;
    for (const u of Object.values(s.units)) if (u.team === 'enemy' && u.kind === 'ninja') clans.add(`${u.id}:${u.character?.clan}:${u.nameEs ?? u.name}`);
    let steps = 0, perTurn = 0, last = '';
    while (s.phase !== 'ended' && steps < 6000) {
      const a = aiAction(s);
      if (!a) { add('stopped(no ai action)'); break; }
      const u = current(s)!;
      perTurn = u.id === last ? perTurn + 1 : 0; last = u.id;
      if (perTurn > 12) { add('stall'); const o = applyAction(s, { type: 'endTurn', unit: u.id }); s = o.state; continue; }
      const out = applyAction(s, a);
      steps++;
      if (!out.ok) { add(`REFUSED ${a.type}${'jutsu' in a ? ':' + a.jutsu : ''} ${out.reason}`); s = applyAction(s, { type: 'endTurn', unit: u.id }).state; continue; }
      for (const e of out.events) {
        const side = (uid: string) => (out.state.units[uid]?.commanded ? out.state.units[uid].commanded!.team : out.state.units[uid]?.team) ?? '?';
        if (e.t === 'jutsu' && ABIL.includes(e.jutsu)) add(`${side(e.unit)} ${e.jutsu}`);
        if (e.t === 'jutsu' && !ABIL.includes(e.jutsu)) add(`${side(e.unit)} other jutsu`);
        if (e.t === 'evade') add(`${side(e.unit)} evade`);
        if (e.t === 'slowed') add(`${side(e.unit)} slowed by ${side(e.by)} aura`);
        if (e.t === 'attack' && e.reasons?.includes('aura')) add(`${side(e.unit)} attack w/ aura disadv`);
        if (e.t === 'node' && e.on) add(`node by ${side(e.node.owner)}`);
        if (e.t === 'command' && e.on) add(`commanded (${side(e.by)} side)`);
      }
      s = out.state;
    }
    rounds += s.round;
    add(`outcome ${s.outcome ?? s.phase}`);
  }
  console.log(`\n== ${id}: ${N} battles, avg rounds ${(rounds / N).toFixed(1)}`);
  console.log('  enemies:', [...clans].join(', '));
  for (const [k, v] of Object.entries(tally).sort()) console.log(`  ${k}: ${v}`);
}
