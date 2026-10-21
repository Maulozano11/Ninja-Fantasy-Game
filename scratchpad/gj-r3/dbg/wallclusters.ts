import { Canvas } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { __gjDebug as D } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3';
const out = process.argv[2];
const k = D.key('wall', { l: 2, t: 2, r: 2, b: 2 });
const cr = D.underThorns(D.piece(k, 'main'), D.piece(k, 'vines'));
const lab = D.pillarClusters(cr, k.seams);
const Z = 4;
const c = new Canvas(k.w * Z, k.h * Z);
const cols = [[255, 80, 80], [80, 255, 80], [80, 80, 255], [255, 255, 80], [255, 80, 255], [80, 255, 255], [255, 160, 40], [160, 40, 255], [40, 160, 120], [200, 200, 200], [120, 60, 20], [0, 120, 255]];
for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) {
  const v = cr.d[y * k.w + x];
  if (!v) continue;
  const p = D.PAL[v - 1]; const L = D.LAB[v - 1][0] / 100;
  const cc = cols[lab[y * k.w + x] % cols.length];
  for (let yy = 0; yy < Z; yy++) for (let xx = 0; xx < Z; xx++) c.set(x * Z + xx, y * Z + yy, [Math.round(cc[0] * (0.3 + 0.7 * L)), Math.round(cc[1] * (0.3 + 0.7 * L)), Math.round(cc[2] * (0.3 + 0.7 * L)), 255]);
}
for (const sx of k.seams) for (let y = 0; y < k.h * Z; y += 2) c.set(sx * Z, y, [255, 255, 255, 255]);
c.save(out);
console.log('seams', k.seams, 'clusters', [...new Set(Array.from(lab).filter((v) => v >= 0))]);
