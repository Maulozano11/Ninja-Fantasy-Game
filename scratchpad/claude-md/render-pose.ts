// Recipe test: one pose of a preset at 4x, written as a PNG.
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11bced0d-ee1-5/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11bced0d-ee1-5/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11bced0d-ee1-5/src/sprite/raster';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11bced0d-ee1-5/tools/world-sprites/kit';

const look = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character.appearance!;
const f = renderSprite(look, 'idle', 0);
const k = 4;
const out = new Uint8Array(GRID * k * GRID * k * 4);
for (let y = 0; y < GRID * k; y++)
  for (let x = 0; x < GRID * k; x++) {
    const s = ((y / k | 0) * GRID + (x / k | 0)) * 4;
    out.set(f.rgba.subarray(s, s + 4), (y * GRID * k + x) * 4);
  }
writePng(process.argv[2], GRID * k, GRID * k, out);
