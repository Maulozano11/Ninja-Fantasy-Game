// Dumps each piece of a sprite's refdata key frame as PNG (and an overview with piece tints).
// usage: npx tsx pieces.ts <sprite> <outdir> <scale>
import { EV3_REF } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-earth-v3-refdata';
import { Canvas, hex } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const [name, out, scs] = process.argv.slice(2);
const sc = Number(scs || 3);
const r = EV3_REF[name];
const cols = r.pal.map((p) => hex(p.rgba.slice(0, 7), parseInt(p.rgba.slice(7, 9), 16)));
const tints: [number, number, number][] = [[255, 0, 0], [0, 200, 0], [0, 100, 255], [255, 200, 0], [255, 0, 255], [0, 255, 255], [255, 128, 0], [128, 0, 255], [0, 128, 64], [200, 100, 100], [100, 200, 100], [100, 100, 200], [250, 250, 250], [120, 60, 0], [60, 120, 120], [200, 0, 100], [100, 0, 0], [0, 0, 100]];
const names = Object.keys(r.pieces);
const over = new Canvas(r.w * sc, r.h * sc);
names.forEach((p, k) => {
  const pc = r.pieces[p];
  const c = new Canvas(r.w * sc, r.h * sc);
  const bytes = Buffer.from(pc.rle, 'base64');
  let i = 0;
  for (let b = 0; b + 1 < bytes.length; b += 2) {
    const n = bytes[b], v = bytes[b + 1];
    if (v) for (let j = 0; j < n; j++) {
      const x = pc.x + ((i + j) % pc.w), y = pc.y + Math.floor((i + j) / pc.w);
      const col = cols[v - 1];
      for (let a = 0; a < sc; a++) for (let d = 0; d < sc; d++) {
        c.set(x * sc + a, y * sc + d, [col[0], col[1], col[2], 255] as any);
        const t = tints[k % tints.length];
        if (p !== 'under' && p !== 'dust' && p !== 'shade') over.set(x * sc + a, y * sc + d, [t[0], t[1], t[2], 255] as any);
        else if (!over.alpha(x * sc + a, y * sc + d)) over.set(x * sc + a, y * sc + d, [t[0] / 3, t[1] / 3, t[2] / 3, 255] as any);
      }
    }
    i += n;
  }
  c.save(`${out}/${name}-${p}.png`);
});
over.save(`${out}/${name}-overview.png`);
console.log(names.join(','));
