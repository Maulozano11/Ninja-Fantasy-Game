import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { getAppearance } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { katanaTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/katana';
import { rotateTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/rotsprite';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
const item = getItem('held_katana')!;
const real = item.draw;
const lerp = (a: any, b: any, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
for (const body of ['male', 'female', 'bulky', 'slender']) for (let pi = 0; pi < LEGENDARY_PRESETS.length; pi++) {
  const base: any = getAppearance(LEGENDARY_PRESETS[pi].character);
  if (base.body?.type !== undefined && false) continue;
  for (const parts of [{ guard: 'a' }, { guard: 'b' }, { hilt: 'b' }, { hilt: 'c' }, { blade: 'b' }]) {
    const look: any = { ...base, body, slots: { ...base.slots, held: { id: 'held_katana', colors: [], parts } } };
    let res = '';
    item.draw = (g: any, c: any, p: any) => {
      real(g, c, p);
      const r = g.rig;
      if (!r.lay) return;
      const hand = { x: (r.lay.groundX) - 1.2, y: lerp(r.pelvis, r.ankleN, 0.55).y };
      const ax = Math.floor(hand.x * RES), ay = Math.floor(hand.y * RES);
      const t = katanaTemplate(p, '#e8321e');
      let maxY = -1, minX = 999, out = 0;
      for (const q of rotateTemplate(t, -86)) {
        const ux = ax + q.dx, uy = ay + q.dy;
        const X = uy + r.lay.dx, Y = ux + r.lay.dy;
        maxY = Math.max(maxY, Y); minX = Math.min(minX, X);
        if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) out++;
      }
      res = `maxY ${maxY} minX ${minX} clipped ${out}`;
    };
    renderSprite(look, 'downed', 0);
    item.draw = real;
    if (!res.endsWith('clipped 0') || pi === 0) console.log(body, pi, JSON.stringify(parts), res);
  }
}
