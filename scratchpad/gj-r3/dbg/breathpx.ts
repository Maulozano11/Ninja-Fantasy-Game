import { genjutsuV3Sprites, __gjDebug as D } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3';
process.env.GJ_NOSEAL = '1';
const s = genjutsuV3Sprites(['breath'])[0];
const k = D.key('breath');
const names = ['main', 'smoke', 'orb', 'eyes', 'orbs'];
for (const [x, y] of [[85, 46], [86, 47], [88, 16], [73, 94], [47, 29]]) {
  console.log(x, y, 'f0', s.anims.fly.frames[0].get(x, y), 'f6', s.anims.fly.frames[6].get(x, y), names.map((n) => n + ':' + (D.piece(k, n).d[y * k.w + x])).join(' '));
}
