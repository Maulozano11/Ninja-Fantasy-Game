// Prints every Kōton wall an AI raises: who, where it stands, the wall, and who sees it before/after.
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import type { EncounterId } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { applyAction, createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { aiAction } from '/home/user/Ninja-Fantasy-Game/src/battle/ai';
import { current } from '/home/user/Ninja-Fantasy-Game/src/battle/turns';
import { dist, lineOfSight } from '/home/user/Ninja-Fantasy-Game/src/battle/map';
const noUlt = <T extends { selectedJutsus: Record<string, string> }>(c: T): T => ({ ...c, effects: [], selectedJutsus: { ...c.selectedJutsus, slot5Ultimate: '' } });
const preset = (pid: string) => LEGENDARY_PRESETS.find((p) => p.character.id === pid)!.character;
const party = [
  { character: noUlt(preset('preset_founder')), controller: 'ai' as const },
  { character: noUlt(HANA), controller: 'ai' as const, aiOrder: 'support' as const },
  { character: noUlt(KENJI), controller: 'ai' as const },
  { character: noUlt(preset('preset_gentle')), controller: 'ai' as const },
].slice(0, Number(process.env.PARTY ?? 4));
const id = (process.argv[2] ?? 'river_patrol') as EncounterId;
let shown = 0;
const f1 = (p: { x: number; z: number }) => `(${p.x.toFixed(1)},${p.z.toFixed(1)})`;
for (let seed = 1; seed <= 40 && shown < Number(process.argv[3] ?? 4); seed++) {
  let s = createBattle({ ...encounterSetup(id, party, { seed, difficulty: 'normal', supplies: { soldierPills: 2, bandages: 2, antidotes: 1, explosiveTags: 2 } }), stealth: false }).state;
  for (let n = 0; n < 3000 && s.phase !== 'ended'; n++) {
    const a = aiAction(s)!;
    const u = current(s)!;
    const out = applyAction(s, a);
    if (!out.ok) { console.log('REFUSED', a, out.reason); break; }
    if (a.type === 'jutsu' && a.jutsu === 'koton_wall') {
      const w = out.state.walls.find((x) => x.kind === 'metal' && x.owner === u.id)!;
      const intent = u.intent ? `${u.intent.kind}:${u.intent.what}->${u.intent.target}` : 'replanned';
      console.log(`seed ${seed} r${s.round} ${u.id} hp ${u.hp}/${u.maxHp} at ${f1(u.pos)} moved ${u.turn.moved.toFixed(1)} plan ${intent} wall ${f1(w.a)}-${f1(w.b)}`);
      const prot = Object.values(out.state.units).filter((o) => o.team === u.team && !o.down && o.kind === 'ninja');
      for (const f of Object.values(out.state.units).filter((o) => o.team !== u.team && !o.down)) {
        console.log(`    foe ${f.id} at ${f1(f.pos)}: ` + prot.map((p) => `${p.id}@${dist(f.pos, p.pos).toFixed(1)} ${lineOfSight(s, f.pos, p.pos) ? 'seen' : 'hid'}->${lineOfSight(out.state, f.pos, p.pos) ? 'seen' : 'HID'}`).join(', '));
      }
      shown++;
    }
    s = out.state;
  }
}
