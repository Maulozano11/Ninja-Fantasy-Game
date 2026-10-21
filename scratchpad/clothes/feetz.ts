// zoom on the feet area: rows of items, cols of poses
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook, writePng } from '../tools/sheet';
const [out, ids, base, body] = process.argv.slice(2);
const items = ids.split(',');
const poses: [any, number][] = [['idle', 0], ['attack', 1], ['charge', 0]];
const X0 = 20, Y0 = 78, W0 = 84, H0 = 44, scale = 5;
const W = poses.length * W0 * scale, H = items.length * H0 * scale;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i*4] = 44; buf[i*4+1] = 44; buf[i*4+2] = 52; buf[i*4+3] = 255; }
const bs = JSON.parse(base || '{}');
items.forEach((id, r) => poses.forEach(([pose, frame], c) => {
  const slots: any = {};
  for (const [k, v] of Object.entries(bs)) slots[k] = { id: v, colors: [] };
  slots.feet = { id, colors: [] };
  const f = renderSprite(baseLook({ body: (body || 'male') as any, slots }), pose, frame);
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
    const i = ((y + Y0) * GRID + x + X0) * 4; if (!f.rgba[i + 3]) continue;
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const j = (((r * H0 + y) * scale + sy) * W + (c * W0 + x) * scale + sx) * 4;
      buf[j] = f.rgba[i]; buf[j+1] = f.rgba[i+1]; buf[j+2] = f.rgba[i+2];
    }
  }
}));
writePng(out, W, H, buf);
