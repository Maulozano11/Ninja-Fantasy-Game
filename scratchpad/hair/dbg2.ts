import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID, RES, PARTS } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { baseLook } from '../tools/sheet';
for (const id of process.argv[2].split(',')) {
  const f = renderSprite(baseLook({ slots: { hair: { id, colors: [] } } } as any), 'idle', 0);
  const bp = PARTS.indexOf('back');
  let y1 = -1;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (f.part[y * GRID + x] === bp) y1 = Math.max(y1, y);
  const r = f.rig;
  console.log(id, 'lowest back-part px', y1 / RES, 'pelvis', r.pelvis.y.toFixed(1), 'neck', r.neck.y.toFixed(1), 'T(0,4)', r.T(0, 4).y.toFixed(1), 'torsoLen', r.bp.torsoLen);
}
