// Lower body close-up: 3 bodies, bare base (shorts) and base + trousers, idle.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const looks: any[] = [];
for (const body of ['male', 'female', 'bulky']) {
  looks.push(baseLook({ body, skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] } } } as any));
  looks.push(baseLook({ body, skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#3a4660'] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_sandals', colors: [] } } } as any));
}
const CW = 48, CH = 62, k = 6, gap = 2;
const W = looks.length * (CW + gap) * k, H = CH * k;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([236, 236, 240, 255], i * 4);
looks.forEach((look, n) => {
  const f = renderSprite(look, (process.argv[3] || 'idle') as any, 0);
  const x0 = Math.round(f.rig.pelvis.x * 2) - CW / 2, y0 = Math.round(f.rig.pelvis.y * 2) - 14;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const X = x0 + x, Y = y0 + y; const i = (Y * 128 + X) * 4;
    const p = Y < 128 && f.rgba[i + 3] ? [...f.rgba.subarray(i, i + 3)] : ((x + y) % 2 ? [226, 226, 232] : [240, 240, 244]);
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) out.set([...p, 255], ((y * k + j) * W + n * (CW + gap) * k + x * k + q) * 4);
  }
});
writePng(process.argv[2], W, H, out);
