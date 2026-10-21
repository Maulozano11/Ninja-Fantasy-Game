// ASCII of the long hair's back curtain region, with shade-ish letters. args: body pose frame id
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { baseLook } from '../shared/sheet';
const [body, pose, fr, id] = process.argv.slice(2);
const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: { hair: { id, colors: ['#10e010'] } } } as any), pose as any, +fr);
const hy = Math.round(f.rig.head.y * 2), hx = Math.round(f.rig.head.x * 2);
for (let y = hy - 6; y <= hy + 30; y++) {
  let s = '';
  for (let x = hx - 24; x < hx + 4; x++) {
    const i = (y * 128 + x) * 4; const [r, g, b, a] = [f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], f.rgba[i + 3]];
    if (!a) s += '.'; else if (g > r + 30 && g > b + 30) s += g > 200 ? '5' : g > 160 ? '4' : g > 120 ? '3' : g > 80 ? '2' : '1'; else if (r + g + b < 150) s += 'o'; else s += 's';
  }
  console.log(String(y).padStart(3), s);
}
