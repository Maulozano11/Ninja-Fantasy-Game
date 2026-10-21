// Cropped close-up sheets. usage: npx tsx crop.ts out.png '<cells json>' [scale] [cols]
// cells json: [{ "body": "male", "pose": "idle", "frame": 0, "slots": {...} }, ...]
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook, writePng } from '../tools/sheet';
const [out, cellsJson, sc, colsArg] = process.argv.slice(2);
const cells = JSON.parse(cellsJson);
const X0 = 22, Y0 = 14, W0 = 92, H0 = 112;
const scale = +(sc || 5);
const cols = Math.min(cells.length, +(colsArg || 4));
const rows = Math.ceil(cells.length / cols);
const W = cols * W0 * scale, H = rows * H0 * scale;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { const c = ((Math.floor((i % W) / (8 * scale)) + Math.floor(Math.floor(i / W) / (8 * scale))) % 2) ? 6 : 0; buf[i*4] = 44 + c; buf[i*4+1] = 44 + c; buf[i*4+2] = 52 + c; buf[i*4+3] = 255; }
cells.forEach((c: any, k: number) => {
  const slots: any = {};
  for (const [s, v] of Object.entries(c.slots || {})) slots[s] = typeof v === 'string' ? { id: v, colors: [] } : v;
  const f = renderSprite(baseLook({ body: c.body || 'male', slots, accessories: (c.acc || []).map((id: string) => ({ id, colors: [] })) } as any), c.pose || 'idle', c.frame || 0);
  const ox = (k % cols) * W0 * scale, oy = Math.floor(k / cols) * H0 * scale;
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
    const i = ((y + Y0) * GRID + x + X0) * 4; if (!f.rgba[i + 3]) continue;
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const j = ((oy + y * scale + sy) * W + ox + x * scale + sx) * 4;
      buf[j] = f.rgba[i]; buf[j+1] = f.rgba[i+1]; buf[j+2] = f.rgba[i+2]; buf[j+3] = 255;
    }
  }
});
writePng(out, W, H, buf);
