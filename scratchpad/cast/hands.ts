// Close-ups of each cast pose with the hand positions marked (N = cyan dot, F = magenta dot).
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, body = 'male', ...styles] = process.argv.slice(2);
const k = 5, CW = 90, CH = 100;
const W = styles.length * (CW * k + 6), H = CH * k;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([30, 33, 44, 255], i * 4);
styles.forEach((style, n) => {
  const look = baseLook({ body, skin: '#f3c39c', cast: { style }, slots: { hair: { id: 'hair_crop', colors: [] }, top: { id: 'top_tee', colors: ['#3a4660'] }, bottom: { id: 'bottom_shinobi', colors: [] } } } as any);
  const f = renderSprite(look, 'cast', 0);
  const x0 = 19, y0 = 14;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = x0 + x, sy = y0 + y; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((y * k + j) * W + n * (CW * k + 6) + x * k + q) * 4); }
  for (const [p, c] of [[f.rig.handN, [0, 255, 255]], [f.rig.handF, [255, 0, 255]]] as const) {
    const cx = Math.round((p.x * 2 - x0) * k), cy = Math.round((p.y * 2 - y0) * k);
    for (let j = -3; j <= 3; j++) for (let q = -3; q <= 3; q++) { const X = n * (CW * k + 6) + cx + q, Y = cy + j; if (X >= 0 && Y >= 0 && X < W && Y < H) o.set([...c, 255], (Y * W + X) * 4); }
  }
});
writePng(out, W, H, o);
