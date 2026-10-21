import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
for (const p of LEGENDARY_PRESETS.slice(0, 3)) {
  const f = renderSprite(p.character.appearance!, 'idle', 0);
  let t = 999, b = -1, l = 999, r = -1;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (f.rgba[(y * GRID + x) * 4 + 3]) { t = Math.min(t, y); b = Math.max(b, y); l = Math.min(l, x); r = Math.max(r, x); }
  const R = f.rig;
  console.log(p.character.id, { t, b, l, r, h: b - t + 1, ankleN: [R.ankleN.x * RES, R.ankleN.y * RES].map(Math.round), ankleF: [R.ankleF.x * RES, R.ankleF.y * RES].map(Math.round), kneeN: [R.kneeN.x*RES, R.kneeN.y*RES].map(Math.round), pelvis: [R.pelvis.x * RES, R.pelvis.y * RES].map(Math.round), hipN: [R.hipN.x*RES, R.hipN.y*RES].map(Math.round), hipF: [R.hipF.x*RES, R.hipF.y*RES].map(Math.round), head: [R.head.x*RES, R.head.y*RES] });
}
