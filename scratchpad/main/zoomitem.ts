// zoomitem.ts out slot id pose frame x0 y0 w h k [body]
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, slot, id, pose, fr, x0, y0, w, h, k, body = 'male'] = process.argv.slice(2);
const slots: any = { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#3a4660'] }, bottom: { id: 'bottom_shinobi', colors: ['#2b3550', '#2b3550'] }, feet: { id: 'feet_sandals', colors: [] }, [slot]: { id, colors: [] } };
const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots } as any), pose as any, +fr);
const [X0, Y0, W, H, K] = [x0, y0, w, h, k].map(Number);
const o = new Uint8Array(W * K * H * K * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((Y0 + y) * 128 + X0 + x) * 4; const p = f.rgba[i + 3] ? [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]] : (x + y) % 2 ? [226, 226, 232] : [240, 240, 244];
  for (let j = 0; j < K; j++) for (let q = 0; q < K; q++) o.set([...p, 255], ((y * K + j) * W * K + x * K + q) * 4); }
writePng(out, W * K, H * K, o);
