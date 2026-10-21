// Every cast style on a body, two frames each: styles.ts out.png [body]
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { CAST_STYLES } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';
import { baseLook, writePng } from '../shared/sheet';
const [out, body = 'male', held = 'held_katana'] = process.argv.slice(2);
const k = +(process.env.K || 3), CW = 100, CH = 112;
const cells: [string, number][] = [];
for (const s of (process.env.ST ? process.env.ST.split(",") : CAST_STYLES) as any) for (const f of (process.env.FR || "0,1").split(",").map(Number)) cells.push([s, f]);
const W = cells.length * (CW * k + 6), H = CH * k + 6;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([30, 33, 44, 255], i * 4);
cells.forEach(([style, fr], n) => {
  const look = baseLook({ body, skin: '#f3c39c', cast: { style }, chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false },
    slots: { hair: { id: 'hair_drifter', colors: [] }, top: { id: 'top_bomber', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, held: { id: held, colors: [] } } } as any);
  const f = renderSprite(look, 'cast', fr);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = 14 + x, sy = 12 + y; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((3 + y * k + j) * W + n * (CW * k + 6) + 3 + x * k + q) * 4); }
});
writePng(out, W, H, o);
