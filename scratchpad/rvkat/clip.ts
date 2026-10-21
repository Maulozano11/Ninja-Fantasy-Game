import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { getAppearance } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { drawPaintedWeapon } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/weapons';
import { katanaTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/katana';
import { chakraHex } from '/home/user/Ninja-Fantasy-Game/src/sprite/chakraInfo';
import { v } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
const lerp = (a: any, b: any, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const item = getItem('held_katana')!;
const real = item.draw;
for (const preset of [0, 1, 2]) {
  const base: any = getAppearance(LEGENDARY_PRESETS[preset].character);
  for (const parts of [{ steel: 'a', blade: 'a', guard: 'a', hilt: 'a' }, { steel: 'a', blade: 'a', guard: 'b', hilt: 'a' }, { steel: 'a', blade: 'a', guard: 'a', hilt: 'b' }, { steel: 'a', blade: 'a', guard: 'a', hilt: 'c' }]) {
    const look = { ...base, body: base.body, slots: { ...base.slots, held: { id: 'held_katana', colors: [], parts } } };
    const count = (shift: number) => {
      item.draw = (g: any) => {
        const r = g.rig;
        const x = (r.lay?.groundX ?? r.pelvis.x + 4) - 1.2 - shift;
        const t = katanaTemplate(parts, chakraHex(g.look.chakra));
        // draw only the katana: use a far-away figure? count all opaque pixels instead
        drawPaintedWeapon(g, 'nearArm.held', t, v(x, lerp(r.pelvis, r.ankleN, 0.55).y), -86);
      };
      const f = renderSprite(look, 'downed', 0);
      item.draw = real;
      let n = 0, maxy = 0;
      for (let i = 0; i < 128 * 128; i++) if (f.rgba[i * 4 + 3]) { n++; maxy = Math.max(maxy, Math.floor(i / 128)); }
      return [n, maxy];
    };
    const none = { ...look, slots: { ...look.slots, held: undefined } };
    const fn = renderSprite(none, 'downed', 0);
    let nb = 0; for (let i = 0; i < 128 * 128; i++) if (fn.rgba[i * 4 + 3]) nb++;
    console.log(preset, JSON.stringify(parts), 'body', nb, 'real', count(0), 'raised12', count(12));
  }
}
