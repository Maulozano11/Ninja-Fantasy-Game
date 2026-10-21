import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
for (const s of Object.values(JUTSU)) console.log([s.id, s.rank || '-', s.element, s.shape, s.vfx, s.sig ?? '', s.melee ? 'melee' : '', s.special ?? '', s.nameEs ?? s.name].join(' | '));
