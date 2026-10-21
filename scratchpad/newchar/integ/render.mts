// Renders the Valen preset: npx tsx render.mts <out.png> <pose> <frame> [k]
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/sprite/compose';
import { dojutsuToEye } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/sprite/legacy';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/src/sprite/raster';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-8/tools/world-sprites/kit';
const c = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_scarlet')!.character;
const pose = (process.argv[3] ?? 'idle') as any, fr = Number(process.argv[4] ?? 0), k = Number(process.argv[5] ?? 1);
const f = renderSprite(c.appearance!, pose, fr, dojutsuToEye(c.dojutsu));
const W = GRID * k, out = new Uint8Array(W * W * 4);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
  const s = (((y / k) | 0) * GRID + ((x / k) | 0)) * 4;
  out.set(f.rgba.subarray(s, s + 4), (y * W + x) * 4);
}
writePng(process.argv[2], W, W, out);
