import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/compose';
import { heldAt } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/grip';
import { defaultAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/legacy';
import { GRID, PARTS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/raster';
import { catchLook } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/thrown';
import type { BodyType } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/types';
for (const body of ['male', 'female', 'bulky', 'slender'] as BodyType[]) {
  const l = defaultAppearance();
  l.body = body;
  l.slots.held = { id: 'held_crystal', colors: [] };
  l.stowed = true;
  const c = catchLook(l);
  for (const f of [1, 2, 3, 4]) {
    const a = renderSprite(l, 'pierce', f);
    const b = renderSprite(c, 'pierce', f);
    const h = heldAt(body, 'pierce', f, 'held_kunai');
    const diffs: string[] = [];
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      const i = (y * GRID + x) * 4;
      if (a.rgba[i] !== b.rgba[i] || a.rgba[i + 1] !== b.rgba[i + 1] || a.rgba[i + 2] !== b.rgba[i + 2] || a.rgba[i + 3] !== b.rgba[i + 3]) {
        const d = Math.hypot(x - h.at.x, y - h.at.y);
        if (d > 14) diffs.push(`(${x},${y}) d${d.toFixed(0)} ${PARTS[a.part[y * GRID + x]]}->${PARTS[b.part[y * GRID + x]]}`);
      }
    }
    console.log(body, f, 'hand', h.at.x.toFixed(1), h.at.y.toFixed(1), 'far diffs', diffs.length, diffs.slice(0, 12).join(' '));
  }
}
