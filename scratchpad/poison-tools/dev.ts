import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Canvas } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { poisonV3Dev } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-poison-v3';
const [name, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const t0 = Date.now();
for (const s of poisonV3Dev.sprite(name)) {
  for (const [an, a] of Object.entries(s.anims)) {
    const f0 = a.frames[0];
    const sheet = new Canvas(f0.w * a.frames.length, f0.h);
    a.frames.forEach((f, i) => sheet.draw(f, i * f0.w, 0));
    sheet.save(join(outDir, `${s.name}-${an}.png`));
  }
}
console.log('faults:', poisonV3Dev.faults());
console.log('ms', Date.now() - t0);
