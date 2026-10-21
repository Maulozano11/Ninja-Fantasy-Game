import { JUTSU } from '/home/user/Ninja-Fantasy-Game/src/battle/jutsu';
for (const [id, j] of Object.entries(JUTSU)) if (j.element === 'fire') console.log(id, j.shape, j.vfx, j.sig ?? '', j.melee ? 'melee' : '');
