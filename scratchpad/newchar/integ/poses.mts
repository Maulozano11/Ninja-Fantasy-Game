// Renders the Valen preset in a list of pose frames: npx tsx poses.mts <outDir> [body]
// Writes <outDir>/<i>.png (256x256, 1x) and prints the list with frame counts.
import { mkdirSync } from 'node:fs';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/sprite/compose';
import { dojutsuToEye } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/sprite/legacy';
import { frameCount, rigPoseFor } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/sprite/rig';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/sprite/raster';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/tools/world-sprites/kit';
const c = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_scarlet')!.character;
const out = process.argv[2];
const body = process.argv[3];
mkdirSync(out, { recursive: true });
const look = body ? { ...c.appearance!, body: body as any } : c.appearance!;
const list: [string, string, number][] = JSON.parse(process.argv[4] ?? 'null') ?? [
  ['reposo', 'idle', 0],
  ['ataque 1', 'attack', 0],
  ['ataque 2', 'attack', 1],
  ['ataque 3', 'attack', 2],
  ['jutsu', 'cast', 1],
  ['herido', 'hurt', 0],
  ['victoria', 'victory', 1],
  ['carga', 'charge', 1],
  ['caminar', 'walk', 1],
  ['correr', 'run', 1],
  ['agachado', 'crouch', 0],
  ['sellos', 'handsigns', 1],
  ['sentado', 'sit', 0],
  ['caído', 'downed', 0],
];
list.forEach(([label, pose, fr], i) => {
  const n = frameCount(rigPoseFor(pose as any, look.cast?.style, look.slots.held?.id));
  const f = renderSprite(look, pose as any, fr % n, dojutsuToEye(c.dojutsu));
  writePng(`${out}/${i}.png`, GRID, GRID, new Uint8Array(f.rgba.buffer, f.rgba.byteOffset, f.rgba.length));
  console.log(JSON.stringify([i, label, pose, fr % n, n]));
});
