// ASCII of head+neck: o outline, s skin, c cloth, H hair, e eye. args: body hairId [top]
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { faceAnchor } from '/home/user/Ninja-Fantasy-Game/src/sprite/body';
import { baseLook } from '../shared/sheet';
const [body, id, top] = process.argv.slice(2);
const slots: any = { hair: { id, colors: ['#10e010'] } };
if (top) slots.top = { id: top, colors: ['#3050ff'] };
const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots } as any), 'idle', 0);
const hy = Math.round(f.rig.head.y * 2), hx = Math.round(f.rig.head.x * 2);
console.log('head fine', hx, hy, 'neck', (f.rig as any).neck);
for (let y = hy - 4; y <= hy + 20; y++) {
  let s = '';
  for (let x = hx - 16; x < hx + 14; x++) {
    const i = (y * 128 + x) * 4; const [r, g, b, a] = [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], f.rgba[i + 3]];
    if (!a) s += '.'; else if (g > r + 30 && g > b + 30) s += 'H'; else if (b > r + 60 && b > g + 30) s += 'c'; else if (r + g + b < 150) s += 'o'; else s += 's';
  }
  console.log(String(y).padStart(3), String(y - hy).padStart(3), s);
}
