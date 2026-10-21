// Both hands in every pose (base look with a katana and without), cropped around each hand at 8x.
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { SPRITE_POSES } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';
import { baseLook, writePng } from '../shared/sheet';
const C = 22, k = 8, gap = 2;
const looks = [true, false].map((w) => baseLook({ skin: '#f3c39c', slots: { hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_tee', colors: ['#22304d'] }, bottom: { id: 'bottom_shinobi', colors: [] }, ...(w ? { held: { id: 'held_katana', colors: [] } } : {}) } } as any));
const cells: ((x: number, y: number) => number[] | null)[] = [];
for (const look of looks) for (const pose of SPRITE_POSES) {
  const f = renderSprite(look, pose, pose === 'attack' ? 1 : 0);
  for (const h of [f.rig.handN, f.rig.handF]) {
    const x0 = Math.round(h.x * 2) - C / 2, y0 = Math.round(h.y * 2) - C / 2;
    cells.push((x, y) => { const X = x0 + x, Y = y0 + y; if (X < 0 || Y < 0 || X > 127 || Y > 127) return null; const i = (Y * 128 + X) * 4; return f.rgba[i + 3] ? [...f.rgba.subarray(i, i + 3)] : null; });
  }
}
const cols = 14, rows = Math.ceil(cells.length / cols);
const W = cols * (C + gap) * k, H = rows * (C + gap) * k; const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([236, 236, 240, 255], i * 4);
cells.forEach((px, n) => { const ox = (n % cols) * (C + gap) * k, oy = Math.floor(n / cols) * (C + gap) * k;
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const p = px(x, y) || ((x + y) % 2 ? [226, 226, 232] : [240, 240, 244]); for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) out.set([...p, 255], ((oy + y * k + j) * W + ox + x * k + q) * 4); } });
writePng(process.argv[2], W, H, out);
