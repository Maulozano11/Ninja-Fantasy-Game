import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import type { ShinobiCharacter } from '/home/user/Ninja-Fantasy-Game/src/types/shinobi';
import { ENCOUNTERS, encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import type { EncounterId } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import type { BattleState, BattleEvent } from '/home/user/Ninja-Fantasy-Game/src/battle/types';
import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';

const N = Number(process.argv[2] ?? 30);
const keepUlt = process.argv.includes('--ult');
const noUlt = (c: ShinobiCharacter): ShinobiCharacter => keepUlt ? c : ({ ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } });
const preset = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const party = [
  { character: noUlt(preset('preset_founder')), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: noUlt(HANA), controller: 'ai' as const, aiOrder: 'support' as const },
  { character: noUlt(KENJI), controller: 'ai' as const, aiOrder: 'aggressive' as const },
].slice(0, 3);

const isRoll = (e: BattleEvent) => e.t === 'attack' || e.t === 'save' || e.t === 'check' || e.t === 'deathSave';
let turns = 0, rollsTotal = 0, battles = 0, roundsTotal = 0;
const perTurnHist: Record<number, number> = {};
const perActionHist: Record<number, number> = {};
const kinds: Record<string, number> = {};
let adv = 0, dis = 0, nat20 = 0, nat1 = 0, d20s = 0;
let actions = 0, rollActions = 0;
const byWhat: Record<string, number> = {};
for (const id of Object.keys(ENCOUNTERS) as EncounterId[]) {
  for (let seed = 1; seed <= N; seed++) {
    let s: BattleState = createBattle({ ...encounterSetup(id, party, { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state;
    battles++;
    let last = '', inTurn = 0, turnRolls = 0;
    for (let step = 0; s.phase !== 'ended' && step < 6000; step++) {
      const a = aiAction(s);
      if (!a) break;
      const u = current(s)!;
      if (u.id !== last) {
        if (last) { turns++; perTurnHist[turnRolls] = (perTurnHist[turnRolls] ?? 0) + 1; }
        turnRolls = 0; inTurn = 0;
      } else inTurn++;
      last = u.id;
      if (inTurn > 12) { s = applyAction(s, { type: 'endTurn', unit: u.id }).state; continue; }
      const out = applyAction(s, a);
      if (!out.ok) { s = applyAction(s, { type: 'endTurn', unit: u.id }).state; continue; }
      if (a.type !== 'endTurn' && a.type !== 'move') {
        actions++;
        const n = out.events.filter(isRoll).length;
        if (n) rollActions++;
        perActionHist[n] = (perActionHist[n] ?? 0) + 1;
      }
      for (const e of out.events) {
        if (!isRoll(e)) continue;
        rollsTotal++;
        turnRolls++;
        const k = e.t === 'attack' ? (JUTSU[e.what] ? 'attack(jutsu)' : 'attack(weapon)') : e.t === 'check' ? `check:${e.what}` : e.t;
        kinds[k] = (kinds[k] ?? 0) + 1;
        if (e.t === 'save') byWhat[e.what] = (byWhat[e.what] ?? 0) + 1;
        const r = e.roll;
        d20s++;
        if (r.adv === 'advantage') adv++;
        if (r.adv === 'disadvantage') dis++;
        if (r.d20 === 20) nat20++;
        if (r.d20 === 1) nat1++;
      }
      s = out.state;
    }
    roundsTotal += s.round;
  }
}
console.log({ battles, roundsAvg: (roundsTotal / battles).toFixed(1), turns, rollsTotal, rollsPerTurn: (rollsTotal / turns).toFixed(2), rollsPerBattle: (rollsTotal / battles).toFixed(1), actions, rollActions });
console.log('rolls per unit turn histogram', perTurnHist);
console.log('rolls per non-move action histogram', perActionHist);
console.log('kinds', kinds);
console.log('adv %', (100 * adv / d20s).toFixed(1), 'disadv %', (100 * dis / d20s).toFixed(1), 'nat20 %', (100 * nat20 / d20s).toFixed(1), 'nat1 %', (100 * nat1 / d20s).toFixed(1));
console.log('saves by source', Object.entries(byWhat).sort((a, b) => b[1] - a[1]).slice(0, 15));
