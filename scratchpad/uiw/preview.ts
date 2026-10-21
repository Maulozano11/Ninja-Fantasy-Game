// usage: npx tsx preview.ts out.png zoom name1 name2 ...
import { Img, hex, savePng } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-img';
import { allPieces } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-battle-pieces';
const [out, zs, ...names] = process.argv.slice(2);
const Z = Number(zs);
const ps = allPieces().filter((p) => names.includes(p.name));
const imgs = ps.map((p) => p.img.scaled(Z));
const W = imgs.reduce((t, i) => t + i.w + 20, 20), H = Math.max(...imgs.map((i) => i.h)) + 40;
const o = new Img(W, H);
o.fill(hex('#3d6b4f'));
let x = 20;
for (const im of imgs) {
  for (let y = 0; y < im.h; y += 2 * Z) for (let xx = 0; xx < im.w; xx += 2 * Z) o.rect(x + xx, 20 + y, Z, Z, hex('#467a5a'));
  o.draw(im, x, 20);
  x += im.w + 20;
}
savePng(out, o);
