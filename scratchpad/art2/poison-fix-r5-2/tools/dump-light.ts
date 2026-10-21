import { inflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { PV3_LIGHT, PV3_REF } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-poison-v3-refdata';
const name = process.argv[2], out = process.argv[3];
const r = PV3_REF[name], l = PV3_LIGHT[name];
const bytes = inflateSync(Buffer.from(l.a, 'base64'));
const a = new Uint8Array(r.w * r.h);
for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) a[(l.y + y) * r.w + l.x + x] = bytes[y * l.w + x];
writeFileSync(out, JSON.stringify({ w: r.w, h: r.h, rgb: l.rgb, box: [l.x, l.y, l.w, l.h], a: Array.from(a) }));
