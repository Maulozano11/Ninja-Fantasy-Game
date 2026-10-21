// Renders the compare outfit (SAMPLE_LOOK) cropped & zoomed. Usage: ref.ts out.png pose frame scale x0 y0 w h
import { writePng } from '../tools/sheet';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook } from '../tools/sheet';
const [out, pose, frame, scS, x0S, y0S, wS, hS, body] = process.argv.slice(2);
const look = baseLook({ body: (body || 'male') as any, skin: '#f3c39c', eyeColor: '#2f7fe0', slots: {
  hair: { id: 'hair_midnight', colors: ['#1c2233'] }, top: { id: 'top_royalcoat', colors: ['#22304d', '#d4af37'] },
  bottom: { id: 'bottom_shinobi', colors: ['#22304d', '#22304d'] }, cape: { id: 'cape_shadow', colors: [] },
  waist: { id: 'waist_sash', colors: ['#2f6fd6'] }, feet: { id: 'feet_sandals', colors: [] }, held: { id: 'held_crystal', colors: [] } },
  accessories: [{ id: 'acc_scarf', colors: ['#1f1e26'] }, { id: 'acc_chest_strap', colors: [] }] } as any);
const f = renderSprite(look, (pose || 'idle') as any, +(frame || 0));
const sc = +scS, x0 = +x0S, y0 = +y0S, w = +wS, h = +hS;
const W = w * sc, H = h * sc; const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i*4]=236; buf[i*4+1]=236; buf[i*4+2]=240; buf[i*4+3]=255; }
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = x0 + x, sy = y0 + y; if (sx<0||sy<0||sx>=GRID||sy>=GRID) continue; const i = (sy*GRID+sx)*4; if (!f.rgba[i+3]) continue;
  for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const j = ((y*sc+a)*W + x*sc+b)*4; buf[j]=f.rgba[i]; buf[j+1]=f.rgba[i+1]; buf[j+2]=f.rgba[i+2]; } }
writePng(out, W, H, buf);
