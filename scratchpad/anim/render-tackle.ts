// npx tsx render-tackle.ts out.png  (from the worktree root)
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bcf55ec3-efd-2/src/data/shinobiData';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bcf55ec3-efd-2/src/sprite/compose';
import { dojutsuToEye, getAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bcf55ec3-efd-2/src/sprite/legacy';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bcf55ec3-efd-2/src/sprite/raster';
import { writePng } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bcf55ec3-efd-2/tools/world-sprites/kit';
import type { SpritePose } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bcf55ec3-efd-2/src/sprite/types';

const ids = (process.argv[3] ?? 'preset_reference_aiden,preset_shiori,preset_raiga').split(',');
const cells: { pose: SpritePose; frame: number; stowed: boolean }[] = [
  { pose: 'idle', frame: 0, stowed: false },
  { pose: 'run', frame: 2, stowed: true },
  { pose: 'tackle', frame: 0, stowed: true },
  { pose: 'tackle', frame: 1, stowed: true },
  { pose: 'tackle', frame: 2, stowed: true },
  { pose: 'tackle', frame: 3, stowed: true },
  { pose: 'tackle', frame: 4, stowed: true },
];
const crop = { x: 40, y: 40, w: 176, h: 176 };
const k = 3;
const W = cells.length * crop.w * k, H = ids.length * crop.h * k;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([34, 52, 40, 255], i * 4);
ids.forEach((id, r) => {
  const p = LEGENDARY_PRESETS.find((x) => x.character.id === id);
  if (!p) throw new Error(`no preset ${id}; have ${LEGENDARY_PRESETS.map((x) => x.character.id).join(',')}`);
  const c = p.character;
  cells.forEach((cell, col) => {
    const look = { ...getAppearance(c), ...(cell.stowed ? { stowed: true } : {}) };
    const f = renderSprite(look, cell.pose, cell.frame, dojutsuToEye(c.dojutsu));
    for (let y = 0; y < crop.h * k; y++)
      for (let x = 0; x < crop.w * k; x++) {
        const s = ((crop.y + ((y / k) | 0)) * GRID + crop.x + ((x / k) | 0)) * 4;
        const a = f.rgba[s + 3];
        if (!a) continue;
        const d = ((r * crop.h * k + y) * W + col * crop.w * k + x) * 4;
        for (let ch = 0; ch < 3; ch++) out[d + ch] = Math.round((f.rgba[s + ch] * a + out[d + ch] * (255 - a)) / 255);
      }
  });
});
writePng(process.argv[2], W, H, out);
