// rows = items; cols = male idle, male attack1, female cast, female hurt, bulky victory, bulky charge
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook, writePng } from '../tools/sheet';
const [out, rowsJson, sc] = process.argv.slice(2);
const rows: Record<string, string>[] = JSON.parse(rowsJson);
const cols: [string, string, number][] = [['male', 'idle', 0], ['male', 'attack', 1], ['female', 'cast', 0], ['female', 'hurt', 0], ['bulky', 'victory', 0], ['bulky', 'charge', 0]];
const X0 = 14, Y0 = 8, W0 = 100, H0 = 118, scale = +(sc || 2);
const W = cols.length * W0 * scale, H = rows.length * H0 * scale;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { const x = i % W, y = (i / W) | 0; const ch = ((Math.floor(x / (8 * scale)) + Math.floor(y / (8 * scale))) % 2) ? 6 : 0; const band = Math.floor(y / (H0 * scale)) % 2 ? 4 : 0; buf[i*4] = 40 + ch + band; buf[i*4+1] = 40 + ch + band; buf[i*4+2] = 48 + ch + band; buf[i*4+3] = 255; }
rows.forEach((r, ri) => cols.forEach(([body, pose, frame], ci) => {
  const slots: any = {};
  for (const [k, v] of Object.entries(r)) slots[k] = { id: v, colors: [] };
  const f = renderSprite(baseLook({ body: body as any, slots }), pose as any, frame);
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
    const i = ((y + Y0) * GRID + x + X0) * 4; if (!f.rgba[i + 3]) continue;
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const j = (((ri * H0 + y) * scale + sy) * W + (ci * W0 + x) * scale + sx) * 4;
      buf[j] = f.rgba[i]; buf[j+1] = f.rgba[i+1]; buf[j+2] = f.rgba[i+2];
    }
  }
}));
writePng(out, W, H, buf);
