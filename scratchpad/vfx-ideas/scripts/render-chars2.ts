// Extra caster frames for the corrected mockups (adds to chars/info.json):
//   aidenstow_idle    - idle with the weapon stowed (after a seal jutsu it stays stowed: engine.ts setArmed)
//   aidenburst_cast_<f>_<tick> - the stowed cast pose with the chakra burst the battle draws on every
//                       cast (unitArt.unitFrame -> renderChakra, tick = floor(now / 83) % CHAKRA_LOOP)
// Run from the repo root: npx tsx <scratch>/scripts/render-chars2.ts <chars dir>
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { dojutsuToEye } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { frameCount, POSE_FPS, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import { renderChakra, CHAKRA_LOOP } from '/home/user/Ninja-Fantasy-Game/src/sprite/chakra';
import { writePng } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { readFileSync, writeFileSync } from 'node:fs';
const out = process.argv[2];
const info = JSON.parse(readFileSync(`${out}/info.json`, 'utf8'));
const aiden = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character;
const eye = dojutsuToEye(aiden.dojutsu);
const stow = { ...aiden.appearance!, stowed: true };
const nIdle = frameCount(rigPoseFor('idle', stow.cast?.style));
for (let i = 0; i < nIdle; i++) {
  const f = renderSprite(stow, 'idle', i, eye);
  writePng(`${out}/aidenstow_idle_${i}.png`, GRID, GRID, new Uint8Array(f.rgba.buffer, f.rgba.byteOffset, f.rgba.length));
}
info.poses['aidenstow_idle'] = { n: nIdle, fps: (POSE_FPS as any).idle ?? 6 };
const nCast = frameCount(rigPoseFor('cast', stow.cast?.style));
for (let i = 0; i < nCast; i++) {
  const spr = renderSprite(stow, 'cast', i, eye);
  for (let tick = 0; tick < CHAKRA_LOOP; tick++) {
    const fx = renderChakra(stow.chakra.color, 'cast', tick, spr.rgba, spr.rig, stow.chakra.tint);
    const comp = new Uint8ClampedArray(GRID * GRID * 4);
    const over = (src: Uint8ClampedArray) => {
      for (let p = 0; p < GRID * GRID; p++) {
        const a = src[p * 4 + 3] / 255;
        if (!a) continue;
        const ca = comp[p * 4 + 3] / 255, oa = a + ca * (1 - a);
        for (let ch = 0; ch < 3; ch++) comp[p * 4 + ch] = (src[p * 4 + ch] * a + comp[p * 4 + ch] * ca * (1 - a)) / oa;
        comp[p * 4 + 3] = oa * 255;
      }
    };
    over(fx.back); over(spr.rgba); over(fx.front);
    writePng(`${out}/aidenburst_cast_${i}_${tick}.png`, GRID, GRID, new Uint8Array(comp.buffer));
  }
}
info.burst = { color: stow.chakra.color, onCast: stow.chakra.onCast, loop: CHAKRA_LOOP, tickMs: 83, castFrames: nCast };
writeFileSync(`${out}/info.json`, JSON.stringify(info, null, 1));
console.log(JSON.stringify(info.burst), nIdle, nCast);
