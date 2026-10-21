import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
import { enemyUnit } from '/home/user/Ninja-Fantasy-Game/src/battle/units';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { unitFrom } from '/home/user/Ninja-Fantasy-Game/src/battle/units';
for (const id of ['fireball_goukakyu', 'katon_pursuing_flame', 'leaf_hurricane_senpuu', 'chidori_lightning_blade', 'lightning_hound_raidon', 'body_flicker']) {
  const j = JUTSU[id]; console.log(id, j.cost, j.range, j.shape, j.dice, j.save, j.radius, j.melee, j.special);
}
for (const k of ['rogue', 'raider', 'hunter', 'jonin'] as const) { const u = enemyUnit(k, 0, { x: 0, z: 0 }, 'normal'); console.log(k, u.chakra, u.hp, u.speed, u.saveDC, u.weapon.dice, u.weapon.reach, JSON.stringify(u.stats), u.jutsus.join(',')); }
const sh = unitFrom(LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_gentle')!.character, { team: 'party', pos: { x: 0, z: 0 } });
console.log('shiori', sh.chakra, sh.saveDC, sh.jutsus.map((id) => `${id}:${JUTSU[id]?.cost}:${JUTSU[id]?.dice}:${JUTSU[id]?.range}:${JUTSU[id]?.shape}`).join(' '));
