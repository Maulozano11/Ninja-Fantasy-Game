// Trace the enemies' actions in one AI-only battle: npx tsx trace.ts <encounter> <seed> [all]
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import type { EncounterId } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import { dist } from '/home/user/Ninja-Fantasy-Game/src/battle/map';

const id = (process.argv[2] ?? 'cedar_rogues') as EncounterId;
const seed = Number(process.argv[3] ?? 1);
const all = process.argv[4] === 'all';
const noUlt = <T extends { selectedJutsus: Record<string, string> }>(c: T): T => ({ ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } });
const preset = (pid: string) => LEGENDARY_PRESETS.find((p) => p.character.id === pid)!.character;
const party = [
  { character: noUlt(preset('preset_founder')), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: noUlt(HANA), controller: 'ai' as const, aiOrder: 'support' as const },
  { character: noUlt(KENJI), controller: 'ai' as const, aiOrder: 'aggressive' as const },
  { character: noUlt(preset('preset_gentle')), controller: 'ai' as const, aiOrder: 'aggressive' as const },
];
let s = createBattle({ ...encounterSetup(id, party, { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state;
for (const u of Object.values(s.units)) if (u.kind === 'ninja') console.log(u.id, u.name, u.team, u.character?.clan, 'lvl', u.level, 'hp', u.maxHp, 'ch', u.chakra, 'ac', u.ac, 'spd', u.speed, 'wpn', u.weapon.name, u.weapon.reach, 'jutsu', u.jutsus.join(','), 'at', JSON.stringify(u.pos));
let last = '';
for (let n = 0; n < 3000 && s.phase !== 'ended'; n++) {
  const a = aiAction(s)!;
  const u = current(s)!;
  const out = applyAction(s, a);
  if (!out.ok) { console.log('REFUSED', JSON.stringify(a), out.reason); s = applyAction(s, { type: 'endTurn', unit: u.id }).state; continue; }
  if (all || u.team === 'enemy' || u.commanded) {
    if (u.id !== last) console.log(`-- r${s.round} ${u.id} (${u.character?.clan}) hp ${u.hp}/${u.maxHp} ch ${u.chakra} intent ${JSON.stringify(u.intent)}`);
    const nearest = Object.values(s.units).filter((o) => o.team !== u.team && !o.down).map((o) => `${o.id}@${dist(u.pos, o.pos).toFixed(1)}`).join(' ');
    const evs = out.events.filter((e) => ['jutsu', 'attack', 'evade', 'node', 'slowed', 'command', 'down', 'note', 'damage', 'wall'].includes(e.t)).map((e) => {
      const x = e as Record<string, unknown>;
      return `${e.t}${x.jutsu ? ':' + x.jutsu : ''}${x.what ? ':' + x.what : ''}${x.unit ? ' ' + x.unit : ''}${x.target ? '>' + x.target : ''}${x.amount !== undefined ? ' ' + x.amount : ''}${x.key ? ' ' + x.key : ''}${'roll' in x ? ((x.roll as { success: boolean }).success ? ' ok' : ' miss') : ''}`;
    });
    console.log(`   ${JSON.stringify(a)}  [foes ${nearest}]  ${evs.join(' | ')}`);
  }
  last = u.id;
  s = out.state;
}
console.log('END', s.outcome, 'round', s.round);
