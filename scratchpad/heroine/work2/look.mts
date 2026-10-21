// npx tsx look.mts <out.png> <slotsJSON> [body] [pose]
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_ee0fad47-6e0-1/src/sprite/compose';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_ee0fad47-6e0-1/src/sprite/raster';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_ee0fad47-6e0-1/tools/world-sprites/kit';

const slots = JSON.parse(process.argv[3] || '{}');
const look: any = {
  version: 1, body: process.argv[4] || 'female', skin: '#f6c7a6', eyeShape: 'standard', eyeColor: '#2f9e6a',
  slots, accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false }, pixelEdits: [],
};
const f = renderSprite(look, (process.argv[5] || 'idle') as any, 0);
writePng(process.argv[2], GRID, GRID, new Uint8Array(f.rgba.buffer, f.rgba.byteOffset, f.rgba.length));
for (const j of ['handN', 'wristN']) console.log(j, (f.rig as any)[j].x * RES, (f.rig as any)[j].y * RES);
