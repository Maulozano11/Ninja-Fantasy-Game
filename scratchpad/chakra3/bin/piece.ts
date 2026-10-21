import { CK_PAL, CK_REF } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-chakra-v3-refdata';
import { Canvas } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const [name, pieces, out, k = '3'] = process.argv.slice(2);
const s = CK_REF[name];
const pal = CK_PAL.map((p) => [1, 3, 5, 7].map((i) => parseInt(p.rgba.slice(i, i + 2), 16)));
const c = new Canvas(s.w, s.h);
c.fillRect(0, 0, s.w, s.h, [32, 32, 42, 255]);
for (const pn of pieces.split(',')) {
  const pc = s.pieces[pn];
  if (!pc) continue;
  const b = Buffer.from(pc.rle, 'base64');
  let i = 0;
  for (let q = 0; q < b.length; q += 2) {
    for (let n = 0; n < b[q]; n++, i++) {
      const v = b[q + 1];
      if (!v) continue;
      const p = pal[v - 1];
      c.plot(pc.x + (i % pc.w), pc.y + Math.floor(i / pc.w), [p[0], p[1], p[2], p[3]] as any);
    }
  }
}
c.scaled(+k).save(out);
