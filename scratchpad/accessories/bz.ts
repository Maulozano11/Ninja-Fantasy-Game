// Usage: bz.ts out.png '<json [{pose,frame,body,cape}]>' scale  -> renders the lead's body-zoom outfit, crops to union bbox
import { writePng, baseLook } from '../tools/sheet';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
const [out, spec, scS] = process.argv.slice(2);
const sc = +(scS || 4);
const cells = JSON.parse(spec || '[{}]');
const frames = cells.map((c: any) => {
  const slots: any = {
    hair: { id: 'hair_midnight', colors: ['#2f3c54'] }, top: { id: 'top_royalcoat', colors: ['#22304d', '#d4af37'] },
    bottom: { id: 'bottom_shinobi', colors: ['#22304d', '#22304d'] }, cape: { id: c.cape || 'cape_shadow', colors: [] },
    waist: { id: 'waist_sash', colors: ['#2f6fd6'] }, feet: { id: 'feet_sandals', colors: [] },
    hands: { id: 'hands_bracers', colors: ['#2a2a33', '#1a1a22'] } };
  if (c.held !== null) slots.held = { id: c.held || 'held_crystal', colors: [] };
  const acc = c.noacc ? [] : [{ id: 'acc_scarf', colors: ['#2a2a32'] }, { id: 'acc_chest_strap', colors: [] }];
  return renderSprite(baseLook({ body: c.body || 'male', skin: '#f3c39c', eyeColor: '#2f7fe0', slots, accessories: acc } as any), c.pose || 'idle', c.frame || 0);
});
const x0 = 4, y0 = 16, w = 120, h = 108;
const W = w * sc * frames.length, H = h * sc;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i*4]=236; buf[i*4+1]=236; buf[i*4+2]=240; buf[i*4+3]=255; }
frames.forEach((f: any, k: number) => {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y0 + y) * GRID + x0 + x) * 4; if (!f.rgba[i+3]) continue;
    for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const j = ((y*sc+a)*W + (k*w + x)*sc+b)*4; buf[j]=f.rgba[i]; buf[j+1]=f.rgba[i+1]; buf[j+2]=f.rgba[i+2]; } }
});
writePng(out, W, H, buf);
