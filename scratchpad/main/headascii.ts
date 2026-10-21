// ASCII map of the head: H hair, o outline/dark, s skin, e eye, . empty. args: body ids...
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { faceAnchor } from '/home/user/Ninja-Fantasy-Game/src/sprite/body';
import { baseLook } from '../shared/sheet';
const [body, ...ids] = process.argv.slice(2);
const maps: string[][] = [];
for (const id of ids) {
  const look = baseLook({ body, skin: '#f3c39c', slots: { hair: { id, colors: ['#10e010'] } } } as any);
  const f = renderSprite(look, 'idle', 0);
  const hy = Math.round(f.rig.head.y * 2), hx = Math.round(f.rig.head.x * 2);
  const rows: string[] = [];
  for (let y = hy - 22; y <= hy + 10; y++) {
    let s = '';
    for (let x = hx - 20; x < hx + 18; x++) {
      const i = (y * 128 + x) * 4; const [r, g, b, a] = [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], f.rgba[i + 3]];
      if (!a) s += '.'; else if (g > r + 30 && g > b + 30) s += 'H'; else if (r + g + b < 150) s += 'o'; else if (b > r + 30) s += 'e'; else s += 's';
    }
    rows.push(s);
  }
  maps.push([id.padEnd(38), ...rows]);
}
for (let r = 0; r < maps[0].length; r++) console.log(maps.map((m) => m[r]).join('  '));
