import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { writePng, baseLook } from '../tools/sheet';
// usage: multi.ts out.png items body:pose:frame,body:pose:frame,... scale
const [out, items, cellsSpec, sc] = process.argv.slice(2);
const scale = +(sc || 5);
const X0 = 22, Y0 = 18, W = 84, H = 104;
const slots: any = {
  hair: { id: 'hair_midnight', colors: [] },
  top: { id: 'top_highcollar', colors: ['#1e2433', '#1e2433'] },
  bottom: { id: 'bottom_shinobi', colors: [] },
  feet: { id: 'feet_leather', colors: [] },
};
for (const id of items.split(',').filter(Boolean)) {
  if (id.startsWith('armor_')) slots.armor = { id, colors: [] };
  else if (id.startsWith('skirt_')) slots.skirt = { id, colors: [] };
  else if (id.startsWith('top_')) slots.top = { id, colors: [] };
  else if (id.startsWith('bottom_')) slots.bottom = { id, colors: [] };
}
const cells = cellsSpec.split(',').map((c) => c.split(':'));
const OW = cells.length * W * scale, OH = H * scale;
const buf = new Uint8Array(OW * OH * 4);
for (let i = 0; i < OW * OH; i++) { buf[i*4]=44; buf[i*4+1]=44; buf[i*4+2]=52; buf[i*4+3]=255; }
cells.forEach(([body, pose, frame], k) => {
  const f = renderSprite(baseLook({ body: body as any, slots }), pose as any, +(frame || 0));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = ((Y0 + y) * 128 + X0 + x) * 4; if (!f.rgba[i + 3]) continue;
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const j = ((y * scale + sy) * OW + k * W * scale + x * scale + sx) * 4;
      buf[j] = f.rgba[i]; buf[j+1] = f.rgba[i+1]; buf[j+2] = f.rgba[i+2];
    }
  }
});
writePng(out, OW, OH, buf);
