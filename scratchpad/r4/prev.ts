// preview: npx tsx prev.ts <piece> <refcrop|-> <zoom> <out>
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { Img, hex, loadPng, savePng } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-img';
import { allPieces } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-battle-pieces';
const [name, ref, zs, out] = process.argv.slice(2);
const Z = Number(zs);
const p = allPieces().find((q) => q.name === name)!;
const a = p.img.scaled(2);
const bg = hex('#4a5a3a');
const parts: Img[] = [];
if (ref !== '-') {
  const f = join('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/ui_battle/ref', `${ref}@ours.png`);
  if (existsSync(f)) parts.push(loadPng(f));
}
const b = new Img(a.w, a.h); b.fill(bg); b.draw(a, 0, 0); parts.push(b);
const W = parts.reduce((t, q) => t + q.w * Z + 8, 0), H = Math.max(...parts.map((q) => q.h * Z));
const o = new Img(W, H); o.fill(hex('#202020'));
let x = 0;
for (const q of parts) { o.draw(q.scaled(Z), x, 0); x += q.w * Z + 8; }
savePng(out, o);
