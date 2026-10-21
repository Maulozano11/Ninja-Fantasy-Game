// Fuzz: AI-driven battles where the party is player-controlled (so opportunity attacks ask), with
// random answers to the prompts. Checks after every action that no two units share a cell, and
// that no AI action is refused.
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import { ENCOUNTERS, encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import type { EncounterId } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { cellOf } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
import { canStop, isOnMap, occupancy, reachable } from '/home/user/Ninja-Fantasy-Game/src/battle/nav';
import { gridFor } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
import type { BattleState } from '/home/user/Ninja-Fantasy-Game/src/battle/types';
const N = Number(process.argv[2] ?? 30);
const preset = (id: string) => LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
const party = [preset('preset_founder'), HANA, KENJI, preset('preset_ember')].map((c) => ({ character: { ...c, effects: [] }, controller: 'player' as const }));
let rnd = 12345;
const rand = () => ((rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
function shared(s: BattleState): string | null {
  const seen = new Map<string, string>();
  for (const u of Object.values(s.units)) {
    if (!isOnMap(u) || u.kind === 'hydra_head' || u.bulk) continue;
    const c = cellOf(u.pos);
    const k = `${c.c},${c.r}`;
    if (seen.has(k)) return `${seen.get(k)} & ${u.id} at ${k} (${s.units[seen.get(k)!].down ?? 'up'}/${u.down ?? 'up'}) pending=${s.pending?.kind ?? '-'}`;
    seen.set(k, u.id);
  }
  return null;
}
let bad = 0, refused = 0, prompts = 0, battles = 0;
for (const id of Object.keys(ENCOUNTERS) as EncounterId[]) {
  for (let seed = 1; seed <= N; seed++) {
    battles++;
    let s = createBattle({ ...encounterSetup(id, party, { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state;
    let reported = false;
    for (let step = 0; step < 4000 && s.phase !== 'ended'; step++) {
      let a;
      if (s.pending) {
        prompts++;
        a = { type: 'react' as const, unit: s.pending.reactor, take: rand() < 0.5 };
      } else {
        const u = current(s);
        if (!u) break;
        if (u.kind === 'ninja' && !u.down && u.turn.move > 1 && rand() < 0.45) {
          // A random walk somewhere it can stop (often through others' cells).
          const r = reachable(s, u, u.turn.move);
          const g = gridFor(s.mapId);
          const occ = occupancy(s);
          const cells = [...r.cost.keys()].map((i) => ({ c: i % g.cols, r: Math.floor(i / g.cols) })).filter((c) => canStop(s, u, c, occ));
          if (cells.length) {
            const out = applyAction(s, { type: 'move', unit: u.id, to: cells[Math.floor(rand() * cells.length)] });
            if (out.ok) {
              s = out.state;
              const why = shared(s);
              if (why && !reported) { bad++; reported = true; if (bad < 15) console.log('shared(walk)', id, seed, step, why); }
              continue;
            }
          }
        }
        if (u.controller === 'player') {
          const t = structuredClone(s);
          t.units[u.id].controller = 'ai';
          a = aiAction(t) ?? { type: 'endTurn' as const, unit: u.id };
        } else a = aiAction(s) ?? { type: 'endTurn' as const, unit: u.id };
      }
      const out = applyAction(s, a);
      if (!out.ok) {
        refused++;
        if (refused < 15) console.log('refused', id, seed, JSON.stringify(a), out.reason);
        const u = current(s);
        s = u ? applyAction(s, { type: 'endTurn', unit: u.id }).state : s;
        continue;
      }
      s = out.state;
      const why = shared(s);
      if (why && !reported) {
        bad++;
        reported = true;
        if (bad < 15) console.log('shared', id, seed, step, JSON.stringify(a), why);
      }
    }
  }
}
console.log('battles', battles, 'shared-cell battles', bad, 'refused', refused, 'prompts', prompts);
