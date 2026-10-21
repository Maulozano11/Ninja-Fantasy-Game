import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/compose';
import { heldAt } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/grip';
import { defaultAppearance } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/legacy';
import { GRID, PARTS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/raster';
import { catchLook, renderThrown } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/thrown';
const l = defaultAppearance();
l.slots.held = { id: 'held_crystal', colors: [] };
l.stowed = true;
const h = heldAt('male', 'pierce', 1, 'held_kunai');
const k = renderThrown(l, h.angle);
const ox = Math.floor(h.at.x) - k.grip.x, oy = Math.floor(h.at.y) - k.grip.y;
const a = renderSprite(l, 'pierce', 1);
const b = renderSprite(catchLook(l), 'pierce', 1);
const rows: string[] = [];
for (let y = 160; y < 176; y++) {
  let r = '';
  for (let x = 108; x < 140; x++) {
    const i = (y * GRID + x) * 4;
    const t = k.rgba[((y - oy) * GRID + (x - ox)) * 4 + 3] > 0;
    const p = PARTS[b.part[y * GRID + x]] === 'held' && b.rgba[i + 3] > 0;
    const d = a.rgba[i] !== b.rgba[i] || a.rgba[i + 1] !== b.rgba[i + 1] || a.rgba[i + 2] !== b.rgba[i + 2] || a.rgba[i + 3] !== b.rgba[i + 3];
    r += t && p ? '#' : t ? 't' : p ? 'p' : d ? 'd' : '.';
  }
  rows.push(r);
}
console.log(rows.join('\n'));
