// Close-ups of the nature orb at the fingertip: orbz.ts out.png frame
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, fr = '0'] = process.argv.slice(2);
const ids = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'white', 'black'];
const k = 6, CW = 40, CH = 52;
const W = ids.length * (CW * k + 6), H = CH * k + 6;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([24, 30, 30, 255], i * 4);
ids.forEach((id, n) => {
  const look = baseLook({ body: 'male', cast: { style: 'book' }, chakra: { color: id, onCharge: true, onCast: true, onVictory: false }, slots: { hair: { id: 'hair_gale', colors: [] }, top: { id: 'top_bomber', colors: [] } } } as any);
  const f = renderSprite(look, 'cast', +fr);
  const x0 = 88, y0 = 14;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = x0 + x, sy = y0 + y; if (sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((3 + y * k + j) * W + n * (CW * k + 6) + 3 + x * k + q) * 4); }
});
writePng(out, W, H, o);
