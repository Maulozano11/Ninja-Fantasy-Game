import { readFileSync } from 'fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { getAppearance } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { getItem } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { katanaTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/katana';
import { rotateTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/rotsprite';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { gripPoint, swordAngle, handsBusy, handsLimp } from '/home/user/Ninja-Fantasy-Game/src/sprite/grip';
const src = readFileSync('oldkat.txt', 'utf8');
const OLD = eval('(' + src.replace(/^export const KATANA: PixelTemplate = /, '').replace(/;\s*$/, '') + ')');
const item = getItem('held_katana')!;
const real = item.draw;
const poses: [any, number][] = [];
for (const p of ['idle', 'attack', 'cast', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'lean', 'sit', 'read', 'train']) for (let f = 0; f < 8; f++) poses.push([p, f]);
const tally: Record<string, [number, number]> = {};
for (const body of ['male', 'female', 'bulky', 'slender'] as const) {
  const base: any = getAppearance(LEGENDARY_PRESETS[0].character);
  const look: any = { ...base, body, slots: { ...base.slots, held: { id: 'held_katana', colors: [], parts: {} } } };
  for (const [pose, f] of poses) {
    let r = '';
    item.draw = (g: any, c: any, p: any) => {
      if (handsBusy(g) || handsLimp(g)) return;
      const a0 = swordAngle(g); const hand = gripPoint(g);
      const a = ((a0 % 360) + 540) % 360 - 180;
      const flip = Math.abs(a) > 90;
      const count = (t: any, deg: number) => {
        let tt = t;
        if (flip) tt = { rows: [...t.rows].reverse(), pivot: [t.pivot[0], t.rows.length - 1 - t.pivot[1]] };
        const ax = Math.floor(hand.x * RES), ay = Math.floor(hand.y * RES);
        let out = 0;
        for (const q of rotateTemplate(tt, deg)) { if (q.ch === '.') continue; const x = ax + q.dx, y = ay + q.dy; if (x < 0 || y < 0 || x >= GRID || y >= GRID) out++; }
        return out;
      };
      const nw = count(katanaTemplate({}, '#fff'), a);
      const od = count(OLD, a);
      r = `${nw} ${od}`;
    };
    try { renderSprite(look, pose, f); } catch (e) { item.draw = real; continue; }
    item.draw = real;
    if (!r) continue;
    const [nw, od] = r.split(' ').map(Number);
    if (nw > 0 || od > 0) console.log(body, pose, f, 'new clipped', nw, 'old clipped', od);
  }
}
