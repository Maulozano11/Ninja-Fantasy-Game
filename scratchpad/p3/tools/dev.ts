// dev.ts <outdir> <sprite> [pieces...]: builds one sprite alone into <outdir>/<sprite>/ (manifest like writeGroup) and dumps pieces
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { writeGroup } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { poisonV3Dev } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-poison-v3';
const [out, name, ...pcs] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
if (pcs.length) {
  for (const p of pcs) poisonV3Dev.piece(name, p).save(join(out, `piece-${name}-${p}.png`));
} else {
  const t = Date.now();
  writeGroup(name, poisonV3Dev.sprite(name), out);
  console.log('built', name, Date.now() - t, 'ms', poisonV3Dev.faults());
}
