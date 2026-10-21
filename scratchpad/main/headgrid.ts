// Head crops: rows = hair ids, cols = body/pose combos. headgrid.ts out.png id1 id2 ...
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook, writePng } from '../shared/sheet';
const [out, ...ids] = process.argv.slice(2);
const COLS: [string, string, number][] = [['male', 'idle', 0], ['female', 'idle', 0], ['bulky', 'idle', 0], ['male', 'attack', 0], ['male', 'attack', 2], ['female', 'hurt', 1], ['male', 'victory', 0], ['female', 'cast', 0], ['bulky', 'charge', 0]];
const CW = 40, CH = 40, k = 5;
const W = COLS.length * (CW + 2) * k, H = ids.length * (CH + 2) * k; const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([58, 58, 68, 255], i * 4);
const HC: Record<string, string> = { hair_scholar: '#7a3f1d', hair_long: '#1d1a2e', hair_crest: '#7a4524', hair_midnight: '#2f3c54', hair_bristle: '#cfc8b2', hair_windward: '#232f36', hair_bowl: '#171a24', hair_exile: '#9a5a32', hair_chosen: '#6b4528', hair_drifter: '#938fc0', hair_surge: '#f8ac01', hair_youth: '#33333d', hair_ascended: '#e6c020', hair_storm2: '#e6c020' };
ids.forEach((id, r) => COLS.forEach(([body, pose, fr], c) => {
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: { hair: { id, colors: [HC[id] || '#553322'] } } } as any), pose as any, fr);
  const x0 = Math.round(f.rig.head.x * 2) - CW / 2, y0 = Math.round(f.rig.head.y * 2) - 24;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128) continue; const i = (sy * 128 + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((r * (CH + 2) * k + y * k + j) * W + c * (CW + 2) * k + x * k + q) * 4); }
}));
writePng(out, W, H, o);
