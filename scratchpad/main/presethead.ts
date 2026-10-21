// Head close-ups of presets at 8x: presethead.ts out id1 id2 ...
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { dojutsuToEye } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { writePng } from '../shared/sheet';
const [out, ...ids] = process.argv.slice(2);
const CW = 46, CH = 46, k = 8;
const W = ids.length * (CW + 2) * k, H = CH * k; const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([58, 58, 68, 255], i * 4);
ids.forEach((id, n) => {
  const p = LEGENDARY_PRESETS.find((x) => x.character.id.includes(id))!.character;
  const f = renderSprite(p.appearance!, 'idle', 0, dojutsuToEye(p.dojutsu));
  const x0 = Math.round(f.rig.head.x * 2) - CW / 2, y0 = Math.round(f.rig.head.y * 2) - 26;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const i = ((y0 + y) * 128 + x0 + x) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((y * k + j) * W + n * (CW + 2) * k + x * k + q) * 4); }
});
writePng(out, W, H, o);
