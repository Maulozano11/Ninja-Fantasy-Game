// Real-item previews for the three candidates: heads (female, slender, male) and bodies.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out] = process.argv.slice(2);
const ROWS: [string, string[], string][] = [
  ['hair_crown', ['#e3c25a', '#2a4aa6'], 'Crowned Braid (Saber)'],
  ['hair_regal', ['#1b1b26'], 'Regal Fringe (Lelouch)'],
  ['hair_scarlet', ['#c8343a'], 'Scarlet Flick (Kallen)'],
];
const heads: [string, string, number][] = [['female', 'idle', 0], ['slender', 'idle', 0], ['male', 'idle', 0], ['female', 'attack', 1]];
const HK = 5, HW = 40, HH = 40;
const W = heads.length * (HW * HK + 10) + 10, H = ROWS.length * (HH * HK + 10) + 10;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([40, 44, 56, 255], i * 4);
ROWS.forEach(([id, colors], r) => heads.forEach(([body, pose, fr], n) => {
  const look = baseLook({ body, skin: '#f3c39c', eyeShape: body === 'male' ? 'sharp' : 'bright', eyeColor: id === 'hair_crown' ? '#3d7a52' : id === 'hair_regal' ? '#7a3fb0' : '#2f6fd0',
    slots: { hair: { id, colors }, top: { id: 'top_highcollar', colors: ['#2c3448'] } } } as any);
  const f = renderSprite(look, pose as any, fr);
  const x0 = Math.round(f.rig.head.x * 2) - HW / 2, y0 = Math.round(f.rig.head.y * 2) - 24;
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) { const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < HK; j++) for (let q = 0; q < HK; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((10 + r * (HH * HK + 10) + y * HK + j) * W + 10 + n * (HW * HK + 10) + x * HK + q) * 4); }
}));
writePng(out, W, H, o);
