// Chakra bursts with tints: chakratint.ts out.png  (pairs of burst:tint, tint '-' = natural)
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { renderChakra } from '/home/user/Ninja-Fantasy-Game/src/sprite/chakra';
import { baseLook, writePng } from '../shared/sheet';
const [out, ...pairs] = process.argv.slice(2);
const k = 3, CW = 100, CH = 116;
const W = pairs.length * (CW * k + 8), H = CH * k + 8;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([22, 24, 32, 255], i * 4);
const look = baseLook({ skin: '#f3c39c', slots: { hair: { id: 'hair_windward', colors: ['#232f36'] }, top: { id: 'top_tee', colors: ['#2c3448'] }, bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] } } } as any);
const spr = renderSprite(look, 'charge', 0);
const blend = (dst: Float32Array, src: Uint8ClampedArray) => { for (let i = 0; i < 128 * 128; i++) { const a = src[i * 4 + 3] / 255; if (!a) continue; for (let c = 0; c < 3; c++) dst[i * 3 + c] = dst[i * 3 + c] * (1 - a) + src[i * 4 + c] * a; } };
pairs.forEach((p, n) => {
  const [burst, tint] = p.split(':');
  const fx = renderChakra(burst as any, 'charge', +(process.env.T || 6), spr.rgba, spr.rig, tint === '-' ? undefined : tint);
  const img = new Float32Array(128 * 128 * 3); for (let i = 0; i < 128 * 128; i++) img.set([22, 24, 32], i * 3);
  blend(img, fx.back); blend(img, spr.rgba); blend(img, fx.front);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = 14 + x, sy = 8 + y; const i = sy * 128 + sx;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([img[i * 3], img[i * 3 + 1], img[i * 3 + 2], 255], ((4 + y * k + j) * W + n * (CW * k + 8) + 4 + x * k + q) * 4); }
});
writePng(out, W, H, o);
