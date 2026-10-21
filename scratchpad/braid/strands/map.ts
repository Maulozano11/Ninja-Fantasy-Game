// Strand map of the real helper at sprite resolution: letter per fine px (upper = over lobe, lower = under), next to the final shades.
import { braid } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hairkit';
import { GRID, Layer, v } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/raster';
const w = Number(process.argv[2] || 3.9);
const plait = Number(process.argv[3] || 2.6);
(globalThis as any).__braidV = JSON.parse(process.argv[4] || '{}');
const info = new Map<number, string>();
(globalThis as any).__braidDbg = (fx: number, fy: number, k: number, p: number) => info.set(fy * GRID + fx, p < 0 ? 'abc'[k] : 'ABC'[k]);
const L = new Layer();
L.xf = { cx: 6, cy: 4, k: 0.76 };
braid(L, v(6.3, 4), v(6.3, 13), v(6.3, 26), w, { mat: 0, part: 'back' }, { plait });
L.applyOutline();
for (let y = 6; y < 28; y++) {
  let a = '', b = '';
  for (let x = 6; x < 18; x++) {
    a += info.get(y * GRID + x) ?? '.';
    b += L.has(x, y) ? String(L.getShade(x, y)) : '.';
  }
  console.log(a + '   ' + b);
}
