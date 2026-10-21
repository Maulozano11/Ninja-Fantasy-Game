// A sheet of every chakra burst in the charge pose (one per column), for looking at what each shows.
// npx tsx <this> out.png [tint]
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/compose';
import { renderChakra } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/chakra';
import { CHAKRA_CHOICES } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/chakraInfo';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/raster';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/tools/world-sprites/kit';

const look = DEFAULT_CHARACTER.appearance!;
const ids = CHAKRA_CHOICES.map((c) => c.id);
const k = 2;
const W = GRID * k * ids.length;
const H = GRID * k;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([20, 18, 26, 255], i * 4);
const tint = process.argv[3];
ids.forEach((id, col) => {
  const spr = renderSprite({ ...look, chakra: { ...look.chakra, color: id } }, 'charge', 0, 'none');
  const fx = renderChakra(id, 'charge', 6, spr.rgba, spr.rig, tint);
  for (const buf of [fx.back, spr.rgba, fx.front]) {
    for (let y = 0; y < H; y++) for (let x = 0; x < GRID * k; x++) {
      const s = (((y / k) | 0) * GRID + ((x / k) | 0)) * 4;
      const a = buf[s + 3] / 255;
      if (!a) continue;
      const d = (y * W + col * GRID * k + x) * 4;
      for (let c = 0; c < 3; c++) out[d + c] = Math.round(buf[s + c] * a + out[d + c] * (1 - a));
    }
  }
});
writePng(process.argv[2], W, H, out);
console.log(ids.join(' '));
