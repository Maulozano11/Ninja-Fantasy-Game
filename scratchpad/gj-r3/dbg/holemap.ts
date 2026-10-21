// holemap.ts <sprite> <anim> <frame> <out> [zoom]: the frame (before the safety net) on green, holes boxed red
import { Canvas } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { genjutsuV3Sprites, __gjDebug as D } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3';
process.env.GJ_NOSEAL = '1';
const [name, an, fi, out, zs] = process.argv.slice(2);
const Z = Number(zs ?? 4);
const s = genjutsuV3Sprites([name]).find((x) => x.name === name)!;
const f = s.anims[an].frames[Number(fi)];
const hs = D.holes(f);
const c = new Canvas(f.w * Z, f.h * Z);
for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
  const p = f.get(x, y), a = p[3] / 255;
  const col = [0, 1, 2].map((i) => Math.round(p[i] * a + [0, 255, 0][i] * (1 - a)));
  for (let yy = 0; yy < Z; yy++) for (let xx = 0; xx < Z; xx++) c.set(x * Z + xx, y * Z + yy, [col[0], col[1], col[2], 255]);
}
for (const r of hs) for (const n of r) { const x = n % f.w, y = Math.floor(n / f.w); for (let k = -2; k < Z + 2; k++) { c.set(x * Z + k, y * Z - 2, [255, 0, 0, 255]); c.set(x * Z + k, y * Z + Z + 1, [255, 0, 0, 255]); c.set(x * Z - 2, y * Z + k, [255, 0, 0, 255]); c.set(x * Z + Z + 1, y * Z + k, [255, 0, 0, 255]); } }
c.save(out);
console.log(hs.length, hs.map((r) => [r[0] % f.w, Math.floor(r[0] / f.w), r.length]));
