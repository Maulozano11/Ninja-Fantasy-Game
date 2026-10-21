// Renders jobs from a JSON file: [{ out, body?, eyeShape?, eyeColor?, skin?, faceShape?, slots?, pose?, frame?, eye?, crop?: [x,y,w,h] }]
// writes raw RGBA PNG at 1x (crop or full). Run from the worktree root.
import { readFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-2/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-2/src/sprite/raster';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_7487bce9-1b7-2/tools/world-sprites/kit';

const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const j of jobs) {
  const look: any = {
    version: 1,
    body: j.body ?? 'female',
    skin: j.skin ?? '#f4c8a5',
    eyeShape: j.eyeShape ?? 'shade',
    eyeColor: j.eyeColor ?? '#088cce',
    faceShape: j.faceShape,
    neck: j.neck,
    slots: j.slots ?? {},
    accessories: [],
    headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
    chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
    pixelEdits: [],
  };
  const f = renderSprite(look, j.pose ?? 'idle', j.frame ?? 0, j.eye ?? 'none');
  const [x0, y0, w, h] = j.crop ?? [0, 0, GRID, GRID];
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((y0 + y) * GRID + (x0 + x)) * 4;
    out.set(f.rgba.subarray(s, s + 4), (y * w + x) * 4);
  }
  writePng(j.out, w, h, out);
}
