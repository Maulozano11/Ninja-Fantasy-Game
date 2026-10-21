import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11bced0d-ee1-7/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11bced0d-ee1-7/src/sprite/compose';
import { dojutsuToEye } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11bced0d-ee1-7/src/sprite/legacy';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11bced0d-ee1-7/src/sprite/raster';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11bced0d-ee1-7/tools/world-sprites/kit';
const c = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character;
// any SpritePose, frame; the eye argument is what the game passes (unitArt.ts), so the eyes match
const f = renderSprite(c.appearance!, 'idle', 0, dojutsuToEye(c.dojutsu));
const k = 4, W = GRID * k, out = new Uint8Array(W * W * 4);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
  const s = (((y / k) | 0) * GRID + ((x / k) | 0)) * 4;
  out.set(f.rgba.subarray(s, s + 4), (y * W + x) * 4);
}
writePng(process.argv[2], W, W, out);
console.log('eye', dojutsuToEye(c.dojutsu));
