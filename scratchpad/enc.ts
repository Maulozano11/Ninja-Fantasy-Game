import { ENCOUNTERS, encounterSetup } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import type { EncounterId } from '/home/user/Ninja-Fantasy-Game/src/battle/encounters';
import { createBattle } from '/home/user/Ninja-Fantasy-Game/src/battle/engine';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
import { parseDice } from '/home/user/Ninja-Fantasy-Game/src/rules/dice';
import { abilityMod } from '/home/user/Ninja-Fantasy-Game/src/rules/checks';
const party = [{ character: HANA }, { character: KENJI }];
for (const id of Object.keys(ENCOUNTERS) as EncounterId[]) {
  const s = createBattle({ ...encounterSetup(id, party as any, { seed: 1, difficulty: 'normal' }), stealth: false } as any).state;
  for (const u of Object.values(s.units)) {
    const d = parseDice(u.weapon.dice)!;
    const mod = u.weapon.finesse ? Math.max(abilityMod(u.stats.str), abilityMod(u.stats.dex)) : abilityMod(u.stats.str);
    const critOld = `${d.count*2}d${d.sides}+${mod}`;
    const critMax = 2*d.count*d.sides + mod;
    console.log([id, u.id, u.team, u.kind, 'hp', u.maxHp, u.weapon.name, u.weapon.dice, 'mod', mod, 'power', u.power, 'critNow', critOld, 'critMax', critMax, 'x power', Math.round(critMax*u.power)].join(' '));
  }
}
