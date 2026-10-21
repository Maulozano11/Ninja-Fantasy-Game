import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { writePng, baseLook } from '../tools/sheet';
// usage: grid.ts out.png "itemsRow1;itemsRow2;..." scale
const [out, spec, sc] = process.argv.slice(2);
const scale = +(sc || 2);
const X0 = 20, Y0 = 16, W = 88, H = 106;
const cells: [string, string, number][] = [['male', 'idle', 0], ['male', 'attack', 1], ['female', 'cast', 0], ['female', 'victory', 0], ['bulky', 'charge', 0], ['bulky', 'idle', 2]];
const rows = spec.split(';');
const OW = cells.length * W * scale, OH = rows.length * H * scale;
const buf = new Uint8Array(OW * OH * 4);
for (let i = 0; i < OW * OH; i++) { const x = i % OW, y = Math.floor(i / OW); const ch = ((Math.floor(x / (W*scale)) + Math.floor(y / (H*scale))) % 2) ? 6 : 0; buf[i*4]=44+ch; buf[i*4+1]=44+ch; buf[i*4+2]=52+ch; buf[i*4+3]=255; }
rows.forEach((grp, r) => {
  const slots: any = {
    hair: { id: 'hair_midnight', colors: [] },
    top: { id: 'top_highcollar', colors: ['#1e2433', '#1e2433'] },
    bottom: { id: 'bottom_shinobi', colors: [] },
    feet: { id: 'feet_leather', colors: [] },
  };
  for (const id of grp.split(',').filter(Boolean)) {
    if (id.startsWith('armor_')) slots.armor = { id, colors: [] };
    else if (id.startsWith('skirt_')) slots.skirt = { id, colors: [] };
  }
  cells.forEach(([body, pose, frame], k) => {
    const f = renderSprite(baseLook({ body: body as any, slots }), pose as any, frame);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = ((Y0 + y) * 128 + X0 + x) * 4; if (!f.rgba[i + 3]) continue;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const j = ((r * H * scale + y * scale + sy) * OW + k * W * scale + x * scale + sx) * 4;
        buf[j] = f.rgba[i]; buf[j+1] = f.rgba[i+1]; buf[j+2] = f.rgba[i+2];
      }
    }
  });
});
writePng(out, OW, OH, buf);
