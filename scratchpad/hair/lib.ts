import { writePng, baseLook } from '../tools/sheet';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import type { SpriteAppearance, SpritePose } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';
export interface C { look: SpriteAppearance; pose: SpritePose; frame: number; crop?: [number, number, number, number] }
export function dressed(body: any, hair: string, extra: any = {}): SpriteAppearance {
  const slots: any = { hair: { id: hair, colors: extra.colors || [] } };
  if (extra.clothes === true || process.env.CLOTHES) {
    for (const [s, id] of [['top', 'top_highcollar'], ['bottom', 'bottom_shinobi'], ['feet', 'feet_leather']] as const)
      if (getItem(id)) slots[s] = { id, colors: [] };
  }
  return baseLook({ body, slots, skin: extra.skin || '#f2c7a0' });
}
// crop: [x, y, w, h] relative to the head center (x,y = offset of top-left from head)
export function grid(path: string, cells: C[], cols: number, scale: number, crop?: [number, number, number, number]) {
  const cw = (crop ? crop[2] : 64) * RES, ch = (crop ? crop[3] : 64) * RES;
  const pad = 2 * RES;
  const rows = Math.ceil(cells.length / cols);
  const W = cols * (cw + pad) * scale, H = rows * (ch + pad) * scale;
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { const X = i % W, Y = Math.floor(i / W); const ck = ((Math.floor(X / (4 * RES * scale)) + Math.floor(Y / (4 * RES * scale))) % 2) ? 8 : 0; out[i*4]=52+ck; out[i*4+1]=54+ck; out[i*4+2]=64+ck; out[i*4+3]=255; }
  cells.forEach((c, k) => {
    let f;
    try { f = renderSprite(c.look, c.pose, c.frame); } catch (e) { console.error('render fail', e); return; }
    const ox = (k % cols) * (cw + pad) * scale, oy = Math.floor(k / cols) * (ch + pad) * scale;
    const x0 = crop ? (f.rig.head.x + crop[0]) * RES : 0, y0 = crop ? (f.rig.head.y + crop[1]) * RES : 0;
    for (let yy = 0; yy < ch; yy++) for (let xx = 0; xx < cw; xx++) {
      const x = x0 + xx, y = y0 + yy; if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
      const i = (y * GRID + x) * 4; if (!f.rgba[i + 3]) continue;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const j = ((oy + yy * scale + sy) * W + ox + xx * scale + sx) * 4;
        out[j] = f.rgba[i]; out[j+1] = f.rgba[i+1]; out[j+2] = f.rgba[i+2]; out[j+3] = 255;
      }
    }
  });
  writePng(path, W, H, out);
}
