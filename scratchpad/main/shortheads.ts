// Short-haired heads at 8x (male) + midnight for comparison: shortheads.ts out body
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, body = 'male'] = process.argv.slice(2);
const ids: [string, string][] = [['hair_midnight', '#2f3c54'], ['hair_none', '#222'], ['hair_crop', '#3a2a22'], ['hair_crest', '#7a4524'], ['hair_tousled', '#f1cf7a'], ['hair_scholar', '#7a4a2a'], ['hair_sunburst', '#f5c518'], ['hair_lion', '#6b4a32']];
const CW = 40, CH = 40, k = 6;
const W = ids.length * (CW + 2) * k, H = CH * k; const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([58, 58, 68, 255], i * 4);
ids.forEach(([id, col], n) => {
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: { hair: { id, colors: [col] }, top: { id: 'top_tee', colors: ['#2b4a8a'] } } } as any), 'idle', 0);
  const x0 = Math.round(f.rig.head.x * 2) - CW / 2, y0 = Math.round(f.rig.head.y * 2) - 22;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const i = ((y0 + y) * 128 + x0 + x) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((y * k + j) * W + n * (CW + 2) * k + x * k + q) * 4); }
});
writePng(out, W, H, o);
