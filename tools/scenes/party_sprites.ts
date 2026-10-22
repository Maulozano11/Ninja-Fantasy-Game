// Renders party members with the game's own sprite code, for scene previews:
//
//   npx tsx tools/scenes/party_sprites.ts <outDir> [who:pose[:frame] ...]
//
// Writes <outDir>/<n>.png (128 x 128, feet at x 64, y 120) for each member and pose, plus party.json
// listing them. <who> matches the start of a character's name among the mission companions (Aurelia,
// Lyra, Saya, Kenji) and the legendary presets (Solen, Akira, Aiden, ...). Any sprite pose works, the camp poses
// included (lean, sit, read, train); <frame> picks the animation frame (default 0).

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMPANIONS } from '../../src/data/missions';
import { renderSprite } from '../../src/sprite/compose';
import { dojutsuToEye, getAppearance } from '../../src/sprite/legacy';
import { BOX } from '../../src/sprite/raster';
import type { SpritePose } from '../../src/sprite/types';
import { boxOf, Canvas } from '../world-sprites/kit';

const out = process.argv[2] ?? 'party-preview';
const wanted = process.argv.slice(3).length ? process.argv.slice(3) : ['Akira:idle', 'Aurelia:idle', 'Ren:idle'];
mkdirSync(out, { recursive: true });
const list: { name: string; file: string; pose: string; frame: number; feet: [number, number] }[] = [];
wanted.forEach((w, k) => {
  const [who, pose = 'idle', frame = '0'] = w.split(':');
  const member = COMPANIONS.find((c) => c.name.startsWith(who)) ?? COMPANIONS[k % COMPANIONS.length];
  const fr = renderSprite(getAppearance(member), pose as SpritePose, Number(frame), dojutsuToEye(member.dojutsu));
  const c = Canvas.fromRgba(BOX.w, BOX.h, boxOf(fr.rgba));
  const file = `${k}.png`;
  c.save(join(out, `.${file}.tmp`));
  renameSync(join(out, `.${file}.tmp`), join(out, file));
  list.push({ name: member.name, file, pose, frame: Number(frame), feet: [64, 120] });
});
writeFileSync(join(out, 'party.json'), JSON.stringify(list, null, 1) + '\n');
console.log(list.map((l) => `${l.file} ${l.name} (${l.pose} ${l.frame})`).join('\n'));
