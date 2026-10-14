// Renders party members with the game's own sprite code, for scene previews:
//
//   npx tsx tools/scenes/party_sprites.ts <outDir> [preset:pose ...]
//
// Writes <outDir>/<n>.png (128 x 128, feet at x 64, y 120) for each preset (matched by the start of
// its character name in LEGENDARY_PRESETS) and pose, plus party.json listing them.

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEGENDARY_PRESETS } from '../../src/data/shinobiData';
import { renderSprite } from '../../src/sprite/compose';
import { getAppearance } from '../../src/sprite/legacy';
import { GRID } from '../../src/sprite/raster';
import type { SpritePose } from '../../src/sprite/types';
import { Canvas } from '../world-sprites/kit';

const out = process.argv[2] ?? 'party-preview';
const wanted = process.argv.slice(3).length ? process.argv.slice(3) : ['Akira:idle', 'Shiori:idle', 'Ren:idle'];
mkdirSync(out, { recursive: true });
const list: { name: string; file: string; pose: string; feet: [number, number] }[] = [];
wanted.forEach((w, k) => {
  const [who, pose = 'idle'] = w.split(':');
  const preset = LEGENDARY_PRESETS.find((p) => p.character.name.startsWith(who)) ?? LEGENDARY_PRESETS[k % LEGENDARY_PRESETS.length];
  const fr = renderSprite(getAppearance(preset.character), pose as SpritePose, 0);
  const c = Canvas.fromRgba(GRID, GRID, fr.rgba);
  const file = `${k}.png`;
  c.save(join(out, `.${file}.tmp`));
  renameSync(join(out, `.${file}.tmp`), join(out, file));
  list.push({ name: preset.character.name, file, pose, feet: [64, 120] });
});
writeFileSync(join(out, 'party.json'), JSON.stringify(list, null, 1) + '\n');
console.log(list.map((l) => `${l.file} ${l.name} (${l.pose})`).join('\n'));
