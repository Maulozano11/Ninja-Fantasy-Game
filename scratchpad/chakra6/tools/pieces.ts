import { writeFileSync } from 'node:fs';
import { CK_PAL, CK_REF } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-chakra-v3-refdata';
const name = process.argv[2], out = process.argv[3];
const s = CK_REF[name];
const PAL = CK_PAL.map((p) => { const h = p.rgba.slice(1); return [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16)); });
const meta: any = { w: s.w, h: s.h, anchor: s.anchor, pieces: {} };
for (const [pn, pc] of Object.entries(s.pieces)) {
  const buf = Buffer.alloc(s.w * s.h * 4);
  const bytes = Buffer.from(pc.rle, 'base64');
  let i = 0;
  for (let k = 0; k + 1 < bytes.length; k += 2) {
    for (let r = 0; r < bytes[k]; r++) {
      const v = bytes[k + 1];
      const x = (i % pc.w) + pc.x, y = Math.floor(i / pc.w) + pc.y;
      if (v) { const p = PAL[v - 1]; buf.set(p, (y * s.w + x) * 4); }
      i++;
    }
  }
  writeFileSync(`${out}/${name}-${pn}.rgba`, buf);
  meta.pieces[pn] = [pc.x, pc.y, pc.w, pc.h];
}
writeFileSync(`${out}/${name}.json`, JSON.stringify(meta));
