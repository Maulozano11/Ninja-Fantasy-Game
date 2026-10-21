// Charlotte proposal preview: full bodies (female idle / slender idle / female walk / female attack) and a big head.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out] = process.argv.slice(2);
const look = (body: string) => baseLook({ body, skin: '#f6d2b4', eyeShape: 'bright', eyeColor: '#3a7bd5',
  slots: { hair: { id: 'hair_charlotte', colors: ['#f2cb52'] }, top: { id: 'top_highcollar', colors: ['#2c3448'] }, bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] }, feet: { id: 'feet_sandals', colors: [] } } } as any);
const cells: [string, string, number][] = [['female', 'idle', 0], ['slender', 'idle', 0], ['female', 'walk', 2], ['female', 'attack', 1]];
const BK = 4, BW = 76, BH = 112, HK = 9, HW = 46, HH = 58;
const W = cells.length * (BW * BK + 10) + HW * HK + 20, H = Math.max(BH * BK, HH * HK) + 20;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([40, 42, 54, 255], i * 4);
const blit = (f: any, x0: number, y0: number, w: number, h: number, k: number, ox: number, oy: number) => {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((oy + y * k + j) * W + ox + x * k + q) * 4); }
};
cells.forEach(([body, pose, fr], n) => {
  const f = renderSprite(look(body), pose as any, fr);
  blit(f, 26, 10, BW, BH, BK, 10 + n * (BW * BK + 10), 10);
});
const f = renderSprite(look('female'), 'idle', 0);
blit(f, Math.round(f.rig.head.x * 2) - HW / 2, Math.round(f.rig.head.y * 2) - 26, HW, HH, HK, 10 + cells.length * (BW * BK + 10), 10);
writePng(out, W, H, o);
