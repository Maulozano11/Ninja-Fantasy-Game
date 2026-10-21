// Renders a list of jobs (JSON file: [{out, body, pose, frame, slots, stowed?}]) at 1x, 256 x 256 RGBA.
// Run from the worktree root: npx tsx <this> jobs.json
import { readFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-5/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-5/src/sprite/raster';
import type { SpriteAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-5/src/sprite/types';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-5/tools/world-sprites/kit';

const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const j of jobs) {
  const look: SpriteAppearance = {
    version: 1,
    body: j.body,
    skin: j.skin ?? '#f6c7a6',
    eyeShape: 'standard',
    eyeColor: '#2f9e6a',
    slots: j.slots ?? {},
    accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
    pixelEdits: [],
    stowed: !!j.stowed,
  };
  const f = renderSprite(look, j.pose, j.frame ?? 0);
  writePng(j.out, GRID, GRID, new Uint8Array(f.rgba.buffer, f.rgba.byteOffset, f.rgba.length));
}
