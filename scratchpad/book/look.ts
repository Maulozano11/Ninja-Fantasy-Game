// Grimoire pose renders: look.ts out.png body1,body2 chakra1,chakra2 [frame] [hair]
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, bodies = 'male', chakras = 'green', fr = '0', hair = 'hair_gale'] = process.argv.slice(2);
const k = +(process.env.K || 4), CW = 104, CH = 100, X0 = 12, Y0 = 16;
const cells: [string, string][] = [];
for (const b of bodies.split(',')) for (const c of chakras.split(',')) cells.push([b, c]);
const cols = +(process.env.COLS || cells.length);
const rowsN = Math.ceil(cells.length / cols);
const W = cols * (CW * k + 6), H = rowsN * (CH * k + 6);
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([24, 30, 30, 255], i * 4);
cells.forEach(([body, chakra], n) => {
  const look = baseLook({ body, skin: '#f3c39c', cast: { style: (process.env.STYLE || 'book') as any }, chakra: { color: chakra, onCharge: true, onCast: true, onVictory: false },
    slots: { hair: { id: hair, colors: ['#23232f'] }, top: { id: process.env.TOP || 'top_bomber', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, held: { id: 'held_katana', colors: [] } } } as any);
  const f = renderSprite(look, 'cast', +fr);
  const cx = (n % cols) * (CW * k + 6), cy = Math.floor(n / cols) * (CH * k + 6);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = X0 + x, sy = Y0 + y; if (sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((cy + y * k + j) * W + cx + x * k + q) * 4); }
});
writePng(out, W, H, o);
