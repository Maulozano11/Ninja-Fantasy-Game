import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { ALL_ITEMS as ITEMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
import { baseLook } from '../shared/sheet';
const body = process.argv[2] || 'male';
for (const it of (ITEMS as any[]).filter((d) => d.slot === 'hair')) {
  const f = renderSprite(baseLook({ body, skin: '#f3c39c', slots: { hair: { id: it.id, colors: ['#10e010'] } } } as any), 'idle', 0);
  const hy = Math.round(f.rig.head.y * 2), hx = Math.round(f.rig.head.x * 2);
  let minX = 999, maxX = -1, top = 999, skin = 0;
  for (let y = hy - 24; y <= hy + 1; y++) for (let x = hx - 30; x < hx + 30; x++) { const i = (y * 128 + x) * 4; if (f.rgba[i + 3]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); top = Math.min(top, y); } }
  // visible skin width on the eye row
  for (let x = hx - 30; x < hx + 30; x++) { const i = ((hy + 1) * 128 + x) * 4; const [r, g, b, a] = [f.rgba[i], f.rgba[i+1], f.rgba[i+2], f.rgba[i+3]]; if (a && !(g > r + 30 && g > b + 30) && r + g + b >= 150) skin++; }
  console.log(it.id.padEnd(16), 'w', String(maxX - minX + 1).padStart(2), 'L', String(hx - minX).padStart(2), 'R', String(maxX - hx).padStart(2), 'top', hy - top, 'skinRow', skin);
}
