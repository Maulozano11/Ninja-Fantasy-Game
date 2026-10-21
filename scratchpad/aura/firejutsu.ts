import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
for (const j of Object.values(JUTSU)) if (j.element === 'fire') console.log(j.id, '|', j.name, '|', j.rank, '|', j.shape, '|', j.vfx, '|', j.sig ?? '', '|', j.special ?? '');
