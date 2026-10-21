// Renders caster and target poses at 1x (256x256 frames) for the jutsu mockups.
// Run from the repo root: npx tsx <this> <outdir>
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { dojutsuToEye } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { FEET, frameCount, POSE_FPS, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { writePng } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import type { SpritePose } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';
const out = process.argv[2];
const who: [string, string][] = [['caster', 'preset_reference_aiden'], ['target', process.env.TGT ?? 'preset_storm']];
const poses: [SpritePose, boolean][] = [['idle', false], ['cast', true], ['attack', false], ['charge', true], ['run', false], ['hurt', false], ['throw', true], ['pierce', false]];
console.log(JSON.stringify({ FEET, GRID }));
for (const [tag, id] of who) {
  const c = LEGENDARY_PRESETS.find((p) => p.character.id === id)!.character;
  console.log(tag, id, JSON.stringify(c.appearance!.cast));
  for (const [pose, stow] of poses) {
    const look = { ...c.appearance!, stowed: stow };
    const n = frameCount(rigPoseFor(pose, look.cast?.style, stow ? undefined : look.slots.held?.id));
    for (let f = 0; f < n; f++) {
      const fr = renderSprite(look, pose, f, dojutsuToEye(c.dojutsu));
      writePng(`${out}/${tag}-${pose}-${f}.png`, GRID, GRID, fr.rgba as unknown as Uint8Array);
    }
    console.log(tag, pose, 'frames', n, 'fps', POSE_FPS[pose]);
  }
}
