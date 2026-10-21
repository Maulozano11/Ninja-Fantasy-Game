// Width/height of the head silhouette (hair + head) per style, male idle, plus head zoom image.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const ids: [string, string][] = [['hair_midnight', '#2f3c54'], ['hair_scholar', '#7a3f1d'], ['hair_long', '#1d1a2e'], ['hair_crest', '#7a4524'], ['hair_none', '#222']];
const CW = 44, CH = 40, k = +(process.env.K || 7); const W = ids.length * (CW + 2) * k, H = CH * k; const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([58, 58, 68, 255], i * 4);
ids.forEach(([id, col], n) => {
  const f = renderSprite(baseLook({ skin: '#f3c39c', slots: { hair: { id, colors: [col] } } } as any), 'idle', 0);
  const hy = Math.round(f.rig.head.y * 2), hx = Math.round(f.rig.head.x * 2);
  // silhouette width at rows from the top of the head down to the lash row
  let minX = 999, maxX = -1, top = 999;
  for (let y = hy - 24; y <= hy + 2; y++) for (let x = hx - 30; x < hx + 30; x++) { const i = (y * 128 + x) * 4; if (f.rgba[i + 3]) { const nonBody = y < hy + 2; if (nonBody) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); top = Math.min(top, y); } } }
  console.log(id.padEnd(14), 'width', maxX - minX + 1, 'left', hx - minX, 'right', maxX - hx, 'top', hy - top);
  const x0 = hx - CW / 2, y0 = hy - 24;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const i = ((y0 + y) * 128 + x0 + x) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((y * k + j) * W + n * (CW + 2) * k + x * k + q) * 4); }
});
writePng(process.argv[2], W, H, o);
