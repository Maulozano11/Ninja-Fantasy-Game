import { genjutsuV3Sprites, __gjDebug as D } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3';
const sp = genjutsuV3Sprites(process.argv[2].split(','));
for (const s of sp) for (const [an, a] of Object.entries(s.anims)) console.log(s.name, an, a.frames.map((f) => D.holes(f).length).join(' '));
