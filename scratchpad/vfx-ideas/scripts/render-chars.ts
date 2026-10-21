// Renders the caster (Aiden preset) and a target (rogue enemy look) at 1x, every frame of the poses
// the mockups need, plus a JSON with frame counts and fps. Run from the repo root:
//   npx tsx <scratch>/scripts/render-chars.ts <outdir>
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { dojutsuToEye } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { FEET, frameCount, POSE_FPS, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { enemyCharacter } from '/home/user/Ninja-Fantasy-Game/src/battle/units';
import { writePng } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { writeFileSync } from 'node:fs';
const out = process.argv[2];
const aiden = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character;
const rogue = enemyCharacter('rogue', 0);
const info: any = { feet: FEET, grid: GRID, poses: {} };
const save = (who: string, look: any, eye: any, pose: any) => {
  const n = frameCount(rigPoseFor(pose, look.cast?.style));
  for (let i = 0; i < n; i++) {
    const f = renderSprite(look, pose, i, eye);
    writePng(`${out}/${who}_${pose}_${i}.png`, GRID, GRID, new Uint8Array(f.rgba.buffer, f.rgba.byteOffset, f.rgba.length));
  }
  info.poses[`${who}_${pose}`] = { n, fps: (POSE_FPS as any)[pose] ?? 6 };
};
const ae = dojutsuToEye(aiden.dojutsu);
for (const p of ['idle', 'cast', 'attack', 'pierce', 'run', 'throw', 'hurt', 'charge']) save('aiden', aiden.appearance!, ae, p);
save('aidenstow', { ...aiden.appearance!, stowed: true }, ae, 'cast');
save('aidenlight', { ...aiden.appearance!, cast: { style: 'lightning' } }, ae, 'cast');
const re = dojutsuToEye(rogue.dojutsu);
for (const p of ['idle', 'hurt']) save('rogue', rogue.appearance!, re, p);
info.aidenCast = aiden.appearance!.cast;
writeFileSync(`${out}/info.json`, JSON.stringify(info, null, 1));
console.log(JSON.stringify(info));
