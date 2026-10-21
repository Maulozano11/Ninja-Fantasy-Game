// Renders only the fire walls into a staging-like folder (sheet + manifest) for quick looks.
import { walls } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-a-fire-v3';
import { Canvas } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import * as fs from 'fs';
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const man: any = { sprites: {} };
for (const s of walls()) {
  if (s.name !== 'wall_diag') continue;
  const an = Object.entries(s.anims);
  const f0 = an[0][1].frames[0], n = Math.max(...an.map(([, a]) => a.frames.length));
  const sheet = new Canvas(f0.w * n, f0.h * an.length);
  const anims: any = {};
  an.forEach(([k, a], r) => { a.frames.forEach((f, i) => sheet.draw(f, i * f0.w, r * f0.h)); anims[k] = { row: r, frames: a.frames.length, fps: a.fps, loop: !!a.loop }; });
  sheet.save(`${out}/${s.name}.png`);
  man.sprites[s.name] = { file: `${s.name}.png`, frameW: f0.w, frameH: f0.h, anchor: s.anchor, anims };
}
fs.writeFileSync(`${out}/manifest.json`, JSON.stringify(man));
