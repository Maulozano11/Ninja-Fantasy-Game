import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID, RES, PARTS } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook } from '../tools/sheet';
const ids = process.argv[2].split(',');
for (const id of ids) {
  const f = renderSprite(baseLook({ slots: { hair: { id, colors: [] } } } as any), 'idle', 0);
  const hp = PARTS.indexOf('head');
  let x0 = 999, x1 = -1, y0 = 999, y1 = -1;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (f.part[y * GRID + x] === hp && f.rgba[(y * GRID + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  console.log(id, 'w', x1 - x0 + 1, 'h', y1 - y0 + 1, 'head', f.rig.head.x * RES, f.rig.head.y * RES, 'top', y0, 'left', x0, 'right', x1);
}
