// Usage: npx tsx crop.ts out.png '<json cells like pick.ts>' cols scale x0 y0 w h  (fine px crop)
import { writePng, baseLook } from '../tools/sheet';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
const [out, spec, colsS, scS, x0S, y0S, wS, hS] = process.argv.slice(2);
const cellsSpec = JSON.parse(spec);
const cols = +colsS, sc = +scS, x0 = +x0S, y0 = +y0S, w = +wS, h = +hS;
const rows = Math.ceil(cellsSpec.length / cols);
const W = cols * w * sc, H = rows * h * sc;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i*4]=44; buf[i*4+1]=44; buf[i*4+2]=52; buf[i*4+3]=255; }
cellsSpec.forEach((c: any, k: number) => {
  const slots: any = c.bare ? {} : { hair: { id: c.hair || 'hair_sunburst', colors: ['#2a2f45'] }, top: { id: c.top || 'top_highcollar', colors: [] }, bottom: { id: 'bottom_shinobi', colors: [] }, feet: { id: 'feet_leather', colors: [] } };
  for (const s of ['cape', 'face', 'held', 'armor']) if (c[s]) slots[s] = { id: c[s], colors: [] };
  const look = baseLook({ body: c.body || 'male', slots, accessories: (c.acc || []).map((id: string) => ({ id, colors: [] })) });
  const f = renderSprite(look, c.pose || 'idle', c.frame || 0);
  const ox = (k % cols) * w * sc, oy = Math.floor(k / cols) * h * sc;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x0 + x, sy = y0 + y; if (sx < 0 || sy < 0 || sx >= GRID || sy >= GRID) continue;
    const i = (sy * GRID + sx) * 4; if (!f.rgba[i + 3]) continue;
    for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const j = ((oy + y * sc + a) * W + ox + x * sc + b) * 4; buf[j]=f.rgba[i]; buf[j+1]=f.rgba[i+1]; buf[j+2]=f.rgba[i+2]; }
  }
});
writePng(out, W, H, buf);
