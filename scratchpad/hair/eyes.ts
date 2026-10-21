// visible fraction of near / far eye pixels per style (eye pixels = those differing between eyeColor variants)
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { HAIR_ITEMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/hair';
import { baseLook } from '../tools/sheet';
const poses: [any, number][] = [['idle', 0], ['attack', 1], ['hurt', 0], ['victory', 0], ['cast', 0]];
for (const body of ['male', 'female', 'bulky']) {
  const rows: string[] = [];
  for (const d of HAIR_ITEMS) {
    let out = '';
    for (const [pose, fr] of poses) {
      const mk = (eye: string, id: string) => renderSprite(baseLook({ body, eyeColor: eye, slots: { hair: { id, colors: [] } } } as any), pose, fr);
      const a = mk('#ff0000', 'hair_none'), b = mk('#00ff00', 'hair_none');
      const hx = a.rig.head.x * 2;
      const sa = mk('#ff0000', d.id), sb = mk('#00ff00', d.id);
      let nT = 0, nV = 0, fT = 0, fV = 0;
      for (let i = 0; i < GRID * GRID; i++) {
        const diff = a.rgba[i * 4] !== b.rgba[i * 4] || a.rgba[i * 4 + 1] !== b.rgba[i * 4 + 1];
        if (!diff) continue;
        const near = (i % GRID) < hx + 2;
        const vis = sa.rgba[i * 4] !== sb.rgba[i * 4] || sa.rgba[i * 4 + 1] !== sb.rgba[i * 4 + 1];
        if (near) { nT++; if (vis) nV++; } else { fT++; if (vis) fV++; }
      }
      out += ` ${pose}:${Math.round((100 * nV) / nT)}/${Math.round((100 * fV) / fT)}`;
    }
    rows.push(d.id.padEnd(15) + out);
  }
  console.log('==', body); console.log(rows.join('\n'));
}
