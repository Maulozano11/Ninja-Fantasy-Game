// Prints a lone braid as shade digits (0 outline .. 5 brightest), drawn on a head-scaled layer.
import { braid } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hairkit';
import { GRID, Layer, v } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/raster';
const w = Number(process.argv[2] || 3);
const plait = Number(process.argv[3] || 2.6);
const tipW = Number(process.argv[4] || w);
const bend = Number(process.argv[5] || 0);
(globalThis as any).__braidV = JSON.parse(process.argv[6] || '{}');
const L = new Layer();
L.xf = { cx: 20, cy: 10, k: 0.76 };
braid(L, v(20, 9), v(20 - bend, 18), v(20 + bend * 0.3, 29), w, { mat: 0, part: 'back' }, { plait, tipW });
L.applyOutline();
let minX = GRID, maxX = 0, minY = GRID, maxY = 0;
for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0) { const x = i % GRID, y = (i / GRID) | 0; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
for (let y = minY; y <= Math.min(maxY, minY + 24); y++) {
  let row = '';
  for (let x = minX - 1; x <= maxX + 1; x++) row += L.has(x, y) ? String(L.getShade(x, y)) : '.';
  console.log(row);
}
