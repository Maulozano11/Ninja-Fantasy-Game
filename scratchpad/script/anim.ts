// Grimoire II animation strip: anim.ts out.png chakra
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, chakra = 'red'] = process.argv.slice(2);
const k = 3, X0 = 40, Y0 = 0, CW = 88, CH = 80;
const W = 8 * (CW * k + 4), H = CH * k + 4;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([24, 30, 30, 255], i * 4);
for (let fr = 0; fr < 8; fr++) {
  const look = baseLook({ body: 'male', cast: { style: 'script' }, chakra: { color: chakra, onCharge: true, onCast: true, onVictory: false }, slots: { hair: { id: 'hair_gale', colors: [] }, top: { id: 'top_bomber', colors: [] } } } as any);
  const f = renderSprite(look, 'cast', fr);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = X0 + x, sy = Y0 + y; if (sx >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((2 + y * k + j) * W + fr * (CW * k + 4) + 2 + x * k + q) * 4); }
}
writePng(out, W, H, o);
