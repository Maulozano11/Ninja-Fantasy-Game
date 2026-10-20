// AI-only battles on the shipped encounters (docs/CLANS_DESIGN.md, D21): how often each side uses
// each clan move, and whether the AI ever sends an action the engine refuses or stalls.
//
//   npx tsx scripts/ai-battles.ts [battles per encounter = 100] [--party=3] [--only=cedar_rogues,night_raid]
//
// The party is Solen, Hana, Kenji and Shiori (--party=3: without Shiori, a mission's party), all on
// the AI and without their S-rank ultimates (which end most fights in the first round). Seeds run
// from 1; the stealth patrol is fought in the open (the AI doesn't play the stealth phase). Each
// line: in how many battles the move was used / how many times, for the enemies and for the party.

import { LEGENDARY_PRESETS } from '../src/data/shinobiData';
import { HANA, KENJI } from '../src/data/missions';
import type { ShinobiCharacter } from '../src/types/shinobi';
import { ENCOUNTERS, encounterSetup } from '../src/battle/encounters';
import type { EncounterId } from '../src/battle/encounters';
import { applyAction, createBattle } from '../src/battle/engine';
import { aiAction } from '../src/battle/ai';
import { current } from '../src/battle/turns';
import type { BattleState } from '../src/battle/types';

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const N = Number(args.find((a) => !a.startsWith('--')) ?? 100);
const only = flag('only')?.split(',') as EncounterId[] | undefined;
const noUlt = (c: ShinobiCharacter): ShinobiCharacter => ({ ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } });
const preset = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const party = [
  { character: noUlt(preset('preset_founder')), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: noUlt(HANA), controller: 'ai' as const, aiOrder: 'support' as const },
  { character: noUlt(KENJI), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: noUlt(preset('preset_gentle')), controller: 'ai' as const, aiOrder: 'aggressive' as const },
].slice(0, flag('party') === '3' ? 3 : 4);

const CLAN_JUTSU: Record<string, string> = {
  katon_pursuing_flame: 'Pursuing Flame',
  ryusei_warp: 'Warp Strike',
  ryusei_swap: 'Spatial Swap',
  koton_block: 'Kōton Block',
  koton_wall: 'Kōton Wall',
  northstar_command: 'Command',
  northstar_submission: 'Natural Submission',
};
const ROWS = ['Pursuing Flame', 'other Mirai jutsu', 'Premonitory Evasion', 'Ryusei kunai', 'Node left', 'Warp Strike', 'blow from behind', 'Spatial Swap', 'Kōton Block', 'Kōton Wall', 'Command', 'Command taken', 'aura slowed a foe', 'attack in a foe\'s aura'];
type Side = 'enemy' | 'party';

let refusedAll = 0;
let stallsAll = 0;
let unfinishedAll = 0;
for (const id of only ?? (Object.keys(ENCOUNTERS) as EncounterId[])) {
  const uses: Record<Side, Record<string, number>> = { enemy: {}, party: {} };
  const battles: Record<Side, Record<string, number>> = { enemy: {}, party: {} };
  const outcomes: Record<string, number> = {};
  const refusals: string[] = [];
  let stalls = 0;
  let unfinished = 0;
  let rounds = 0;
  for (let seed = 1; seed <= N; seed++) {
    let s: BattleState = createBattle({ ...encounterSetup(id, party, { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state;
    const seen: Record<Side, Set<string>> = { enemy: new Set(), party: new Set() };
    let last = '';
    let inTurn = 0;
    for (let step = 0; s.phase !== 'ended'; step++) {
      const a = step < 6000 ? aiAction(s) : null;
      if (!a) {
        unfinished++;
        break;
      }
      const u = current(s)!;
      inTurn = u.id === last ? inTurn + 1 : 0;
      last = u.id;
      if (inTurn > 12) {
        stalls++;
        s = applyAction(s, { type: 'endTurn', unit: u.id }).state;
        continue;
      }
      const out = applyAction(s, a);
      if (!out.ok) {
        refusals.push(`seed ${seed}: ${u.id} ${JSON.stringify(a)} -> ${out.reason}`);
        s = applyAction(s, { type: 'endTurn', unit: u.id }).state;
        continue;
      }
      // Who did it, by the side it fought for when it acted (a commanded enemy fights for the party).
      const side = (uid: string): Side => (s.units[uid]?.team === 'enemy' ? 'enemy' : 'party');
      const clan = (uid: string) => s.units[uid]?.character?.clan;
      const add = (team: Side, k: string) => {
        uses[team][k] = (uses[team][k] ?? 0) + 1;
        seen[team].add(k);
      };
      for (const e of out.events) {
        if (e.t === 'jutsu') {
          if (CLAN_JUTSU[e.jutsu]) add(side(e.unit), CLAN_JUTSU[e.jutsu]);
          else if (clan(e.unit) === 'Mirai' && e.jutsu !== 'body_flicker') add(side(e.unit), 'other Mirai jutsu');
        }
        if (e.t === 'evade') add(side(e.unit), 'Premonitory Evasion');
        if (e.t === 'attack' && e.ranged && e.what === 'Kunai' && clan(e.unit) === 'Ryusei') add(side(e.unit), 'Ryusei kunai');
        if (e.t === 'node' && e.on) add(side(e.node.owner), 'Node left');
        if (e.t === 'attack' && e.reasons?.includes('behind')) add(side(e.unit), 'blow from behind');
        if (e.t === 'command' && e.on) add(side(e.by), 'Command taken');
        if (e.t === 'slowed') add(side(e.by), 'aura slowed a foe');
        // Credited to the Northstar's side, whose aura it is.
        if (e.t === 'attack' && e.reasons?.includes('aura')) add(side(e.unit) === 'enemy' ? 'party' : 'enemy', 'attack in a foe\'s aura');
      }
      s = out.state;
    }
    for (const team of ['enemy', 'party'] as const) for (const k of seen[team]) battles[team][k] = (battles[team][k] ?? 0) + 1;
    rounds += s.round;
    const o = s.outcome ?? s.phase;
    outcomes[o] = (outcomes[o] ?? 0) + 1;
  }
  refusedAll += refusals.length;
  stallsAll += stalls;
  unfinishedAll += unfinished;
  const enemies = Object.values(createBattle({ ...encounterSetup(id, party, { seed: 1, difficulty: 'normal', supplies: { soldierPills: 0, bandages: 0, antidotes: 0, explosiveTags: 0 } }), stealth: false }).state.units)
    .filter((u) => u.team === 'enemy' && u.kind === 'ninja')
    .map((u) => `${u.name} (${u.character?.clan})`);
  console.log(`\n== ${id}: ${N} battles, ${(rounds / N).toFixed(1)} rounds on average, ${JSON.stringify(outcomes)}`);
  console.log(`   enemies: ${enemies.join(', ') || 'the hydra'}`);
  console.log(`   refused ${refusals.length}, stalls ${stalls}, unfinished ${unfinished}`);
  for (const r of refusals.slice(0, 5)) console.log(`   REFUSED ${r}`);
  console.log(`   ${'move'.padEnd(26)}enemy: battles / uses    party: battles / uses`);
  for (const k of ROWS) {
    if (!uses.enemy[k] && !uses.party[k]) continue;
    console.log(`   ${k.padEnd(26)}${String(battles.enemy[k] ?? 0).padStart(6)} / ${String(uses.enemy[k] ?? 0).padEnd(12)}${String(battles.party[k] ?? 0).padStart(6)} / ${uses.party[k] ?? 0}`);
  }
}
console.log(`\nAll: refused ${refusedAll}, stalls ${stallsAll}, unfinished ${unfinishedAll}`);
