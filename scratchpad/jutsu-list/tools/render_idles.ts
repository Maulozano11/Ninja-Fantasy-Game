// The caster's idle with the weapon stowed (as it stands after a jutsu with hand seals), 1x.
// Run from the repo root: npx tsx <this> <outdir>
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { dojutsuToEye } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { frameCount, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { writePng } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const out = process.argv[2];
const c = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character;
const look = { ...c.appearance!, stowed: true };
const n = frameCount(rigPoseFor('idle', look.cast?.style, undefined));
for (let f = 0; f < n; f++) {
  const fr = renderSprite(look, 'idle', f, dojutsuToEye(c.dojutsu));
  writePng(`${out}/caster-idles-${f}.png`, GRID, GRID, fr.rgba as unknown as Uint8Array);
}
console.log('idle stowed frames', n);
