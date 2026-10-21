// zoom.ts <out.png> <items,comma> [bodies=male] [poses=idle] [x0,y0,w,h=24,28,80,80] [k=4]
// item may be 'preset:<id fragment>' to render a preset's look.
// Rows = items x bodies, columns = poses.
import { itemsForSlot, getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { baseLook, writePng } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/shared/sheet';
void itemsForSlot;
const [out, itemsArg, bodiesArg = 'male', posesArg = 'idle', cropArg = '24,28,80,80', kArg = '4', colsArg = ''] = process.argv.slice(2);
const [x0, y0, w, h] = cropArg.split(',').map(Number);
const k = Number(kArg);
const items = itemsArg.split(',');
const bodies = bodiesArg.split(',');
const poses = posesArg.split(',');
const NEUTRAL: any = {
  hair: { id: 'hair_midnight', colors: ['#2f3c54'] },
  top: { id: 'top_tee', colors: ['#3a4660'] },
  bottom: { id: 'bottom_shinobi', colors: ['#2b3550', '#2b3550'] },
  feet: { id: 'feet_sandals', colors: [] },
};
const cells: { look: any; pose: string }[] = [];
for (const it of items)
  for (const body of bodies)
    for (const pose of poses) {
      let look: any;
      if (it.startsWith('preset:')) {
        const p = LEGENDARY_PRESETS.find((q) => q.character.id.includes(it.slice(7)))!.character.appearance!;
        look = { ...p, body: body === 'p' ? p.body : body };
      } else {
        const [id, ...cols] = it.split(':');
        const def = getItem(id)!;
        const slots: any = { ...NEUTRAL };
        if (def.slot === 'armor' || def.slot === 'skirt') delete slots.top;
        slots[def.slot] = { id, colors: cols.map((c) => '#' + c) };
        look = baseLook({ body, skin: '#f3c39c', slots } as any);
      }
      cells.push({ look, pose });
    }
const cols = colsArg ? Number(colsArg) : poses.length;
const rows = Math.ceil(cells.length / cols);
const cw = w * k + 6;
const ch = h * k + 6;
const W = cols * cw;
const H = rows * ch;
const o = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) o.set([40, 40, 48, 255], i * 4);
cells.forEach((c, n) => {
  const f = renderSprite(c.look, c.pose as any, c.pose === 'attack' ? 1 : 0);
  const ox = (n % cols) * cw + 3;
  const oy = Math.floor(n / cols) * ch + 3;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const X = x0 + x;
      const Y = y0 + y;
      let p: number[] = [58, 58, 68];
      if (X >= 0 && Y >= 0 && X < GRID && Y < GRID) {
        const i = (Y * GRID + X) * 4;
        if (f.rgba[i + 3]) p = [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2]];
      }
      for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) o.set([p[0], p[1], p[2], 255], ((oy + y * k + j) * W + ox + x * k + q) * 4);
    }
});
writePng(out, W, H, o);
console.log(W, H);
