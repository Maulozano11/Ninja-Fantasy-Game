// Grimoire I and II with the Earth chakra (and Fire for comparison): npx tsx <this> out.png
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/compose';
import { GRID, BOX } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/raster';
import type { CastStyle, ChakraColorId } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/types';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/tools/world-sprites/kit';

const base = DEFAULT_CHARACTER.appearance!;
const cells: [CastStyle, ChakraColorId, number][] = [
  ['book', 'brown', 0], ['book', 'brown', 1], ['book', 'red', 0], ['script', 'brown', 3], ['script', 'brown', 5], ['script', 'red', 3],
];
const k = 3;
const cw = 150, ch = 150, x0 = BOX.x + 10, y0 = BOX.y - 20;
const W = cw * k * cells.length;
const H = ch * k;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([58, 52, 44, 255], i * 4);
cells.forEach(([style, burst, frame], col) => {
  const spr = renderSprite({ ...base, cast: { style }, chakra: { ...base.chakra, color: burst } }, 'cast', frame, 'none');
  for (let y = 0; y < H; y++) for (let x = 0; x < cw * k; x++) {
    const sx = x0 + ((x / k) | 0);
    const sy = y0 + ((y / k) | 0);
    if (sx >= GRID || sy >= GRID || sx < 0 || sy < 0) continue;
    const s = (sy * GRID + sx) * 4;
    const a = spr.rgba[s + 3] / 255;
    if (!a) continue;
    const d = (y * W + col * cw * k + x) * 4;
    for (let c = 0; c < 3; c++) out[d + c] = Math.round(spr.rgba[s + c] * a + out[d + c] * (1 - a));
  }
});
writePng(process.argv[2], W, H, out);
