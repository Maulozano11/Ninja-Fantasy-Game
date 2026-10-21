// The Earth burst over a loop and in every mode: npx tsx <this> out.png [tint] [burst]
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/compose';
import { renderChakra, type ChakraMode } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/chakra';
import { GRID, BOX } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/raster';
import type { ChakraColorId, SpritePose } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/types';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/tools/world-sprites/kit';

const look = DEFAULT_CHARACTER.appearance!;
const tint = process.argv[3] && process.argv[3] !== '-' ? process.argv[3] : undefined;
const burst = (process.argv[4] ?? 'brown') as ChakraColorId;
const cells: [SpritePose, ChakraMode, number][] = [
  ['charge', 'charge', 0], ['charge', 'charge', 3], ['charge', 'charge', 6], ['charge', 'charge', 9],
  ['charge', 'charge', 12], ['charge', 'charge', 18], ['cast', 'cast', 4], ['victory', 'victory', 4], ['idle', 'aura', 4],
];
const k = 3;
const cw = 150, ch = 170, x0 = BOX.x - 10, y0 = BOX.y - 30;
const W = cw * k * cells.length;
const H = ch * k;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([58, 52, 44, 255], i * 4);
cells.forEach(([pose, mode, tick], col) => {
  const spr = renderSprite({ ...look, chakra: { ...look.chakra, color: burst, tint } }, pose, 0, 'none');
  const fx = renderChakra(burst, mode, tick, spr.rgba, spr.rig, tint);
  for (const buf of [fx.back, spr.rgba, fx.front]) {
    for (let y = 0; y < H; y++) for (let x = 0; x < cw * k; x++) {
      const sx = x0 + ((x / k) | 0);
      const sy = y0 + ((y / k) | 0);
      if (sx >= GRID || sy >= GRID) continue;
      const s = (sy * GRID + sx) * 4;
      const a = buf[s + 3] / 255;
      if (!a) continue;
      const d = (y * W + col * cw * k + x) * 4;
      for (let c = 0; c < 3; c++) out[d + c] = Math.round(buf[s + c] * a + out[d + c] * (1 - a));
    }
  }
});
writePng(process.argv[2], W, H, out);
