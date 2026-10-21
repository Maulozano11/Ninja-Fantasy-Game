// D21 measurement: AI-only battles on every shipped encounter. Per ability (enemy side, and the
// party's AI for reference): in how many battles it is used and how many times; refused actions;
// stalls (a unit acting more than 12 times in one turn); battles that never end.
// Usage: npx tsx measure.ts [battlesPerEncounter=100] [label]
import { writeFileSync } from 'node:fs';
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/data/shinobiData';
import { HANA, KENJI } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/data/missions';
import { ENCOUNTERS, encounterSetup } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/encounters';
import type { EncounterId } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/encounters';
import { applyAction, createBattle } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/engine';
import { aiAction } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/ai';
import { current } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/turns';
import type { BattleState, Unit } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/src_before/battle/types';

const N = Number(process.argv[2] ?? 100);
const LABEL = process.argv[3] ?? 'run';
const noUlt = <T extends { selectedJutsus: Record<string, string> }>(c: T): T => ({ ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } });
const preset = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
// PARTY=3: the mission's party (a preset leader, Hana and Kenji); otherwise step 1's four (with Shiori).
const party = [
  { character: noUlt(preset('preset_founder')), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: noUlt(HANA), controller: 'ai' as const, aiOrder: 'support' as const },
  { character: noUlt(KENJI), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: noUlt(preset('preset_gentle')), controller: 'ai' as const, aiOrder: 'aggressive' as const },
].slice(0, process.env.PARTY === '3' ? 3 : 4);

const KEYS = [
  'Pursuing Flame',
  'bigger jutsu (Mirai)',
  'Evasion',
  'kunai (Ryusei)',
  'Node planted',
  'Warp Strike',
  'Warp edge won',
  'blow from behind',
  'Spatial Swap',
  'Kōton Block',
  'Kōton Wall',
  'Command',
  'Command taken',
  'Submission',
  'aura slowed a foe',
  'attack w/ aura disadv.',
];

interface Tally { uses: Record<string, number>; battles: Record<string, number> }
const blank = (): Tally => ({ uses: {}, battles: {} });

const out: Record<string, unknown> = {};
const totals = { refused: 0, stalls: 0, unfinished: 0, battles: 0 };
for (const id of (process.env.ONLY ? process.env.ONLY.split(',') : Object.keys(ENCOUNTERS)) as EncounterId[]) {
  const side: Record<'enemy' | 'party', Tally> = { enemy: blank(), party: blank() };
  const outcomes: Record<string, number> = {};
  const refusedList: string[] = [];
  let refused = 0, stalls = 0, unfinished = 0, rounds = 0;
  for (let seed = 1; seed <= N; seed++) {
    const setup = { ...encounterSetup(id, party, { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false };
    let s: BattleState = createBattle(setup).state;
    const seen: Record<'enemy' | 'party', Set<string>> = { enemy: new Set(), party: new Set() };
    const add = (team: 'enemy' | 'party', k: string) => {
      side[team].uses[k] = (side[team].uses[k] ?? 0) + 1;
      seen[team].add(k);
    };
    // The side a unit acts for when it acts (a commanded enemy acts for the party), read before the action.
    let before: BattleState = s;
    const home = (u: Unit | undefined): 'enemy' | 'party' => ((u ? before.units[u.id]?.team : undefined) === 'enemy' ? 'enemy' : 'party');
    let steps = 0, perTurn = 0, last = '';
    while (s.phase !== 'ended') {
      if (steps > 6000) { unfinished++; break; }
      const a = aiAction(s);
      if (!a) { unfinished++; break; }
      const u = current(s)!;
      perTurn = u.id === last ? perTurn + 1 : 0;
      last = u.id;
      if (perTurn > 12) { stalls++; s = applyAction(s, { type: 'endTurn', unit: u.id }).state; continue; }
      const res = applyAction(s, a);
      before = s;
      steps++;
      if (!res.ok) {
        refused++;
        refusedList.push(`seed ${seed} ${u.id} ${JSON.stringify(a)} -> ${res.reason}`);
        s = applyAction(s, { type: 'endTurn', unit: u.id }).state;
        continue;
      }
      const clanOf = (uid: string) => s.units[uid]?.character?.clan;
      for (const e of res.events) {
        if (e.t === 'jutsu') {
          const t = home(s.units[e.unit]);
          const name = { katon_pursuing_flame: 'Pursuing Flame', ryusei_warp: 'Warp Strike', ryusei_swap: 'Spatial Swap', koton_block: 'Kōton Block', koton_wall: 'Kōton Wall', northstar_command: 'Command', northstar_submission: 'Submission' }[e.jutsu];
          if (name) add(t, name);
          else if (clanOf(e.unit) === 'Mirai' && e.jutsu !== 'body_flicker') add(t, 'bigger jutsu (Mirai)');
        }
        if (e.t === 'evade') add(home(s.units[e.unit]), 'Evasion');
        if (e.t === 'attack' && e.ranged && e.what === 'Kunai' && clanOf(e.unit) === 'Ryusei') add(home(s.units[e.unit]), 'kunai (Ryusei)');
        if (e.t === 'node' && e.on) add(home(s.units[e.node.owner]), 'Node planted');
        if (e.t === 'note' && e.key === 'warpEdge') add(home(u), 'Warp edge won');
        if (e.t === 'attack' && e.reasons?.includes('behind')) add(home(s.units[e.unit]), 'blow from behind');
        if (e.t === 'command' && e.on) add(home(s.units[e.by]), 'Command taken');
        if (e.t === 'slowed') add(home(s.units[e.by]), 'aura slowed a foe');
        if (e.t === 'attack' && e.reasons?.includes('aura')) add(home(s.units[e.unit]) === 'enemy' ? 'party' : 'enemy', 'attack w/ aura disadv.');
      }
      s = res.state;
    }
    for (const t of ['enemy', 'party'] as const) for (const k of seen[t]) side[t].battles[k] = (side[t].battles[k] ?? 0) + 1;
    rounds += s.round;
    outcomes[s.outcome ?? s.phase] = (outcomes[s.outcome ?? s.phase] ?? 0) + 1;
  }
  totals.refused += refused;
  totals.stalls += stalls;
  totals.unfinished += unfinished;
  totals.battles += N;
  const enemies = Object.values(createBattle({ ...encounterSetup(id, party, { seed: 1, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state.units)
    .filter((u) => u.team === 'enemy' && u.kind === 'ninja')
    .map((u) => `${u.nameEs ?? u.name} (${u.character?.clan})`);
  console.log(`\n== ${id}: ${N} battles, avg rounds ${(rounds / N).toFixed(1)}, outcomes ${JSON.stringify(outcomes)}`);
  console.log(`   enemies: ${enemies.join(', ') || 'the hydra'}`);
  console.log(`   refused ${refused}, stalls ${stalls}, unfinished ${unfinished}`);
  for (const r of refusedList.slice(0, 8)) console.log('   REFUSED', r);
  console.log('   ability                    enemy: battles / uses     party: battles / uses');
  for (const k of KEYS) {
    const e = side.enemy, p = side.party;
    if (!e.uses[k] && !p.uses[k]) continue;
    console.log(`   ${k.padEnd(26)} ${String(e.battles[k] ?? 0).padStart(5)} / ${String(e.uses[k] ?? 0).padEnd(10)} ${String(p.battles[k] ?? 0).padStart(5)} / ${p.uses[k] ?? 0}`);
  }
  out[id] = { N, rounds: rounds / N, outcomes, refused, stalls, unfinished, enemy: side.enemy, party: side.party, enemies };
}
console.log(`\nTOTAL ${totals.battles} battles: refused ${totals.refused}, stalls ${totals.stalls}, unfinished ${totals.unfinished}`);
writeFileSync(`/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/ai21/${LABEL}.json`, JSON.stringify({ totals, ...out }, null, 1));
