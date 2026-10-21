import { renderThrown } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/thrown';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/compose';
import { phaseBody } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/phase';
import { LEGENDARY_PRESETS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/data/shinobiData';
import { GRID } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_aee30df4-8c1-3/src/sprite/raster';
for (const id of ['preset_reference_aiden', 'preset_founder']) {
  const p = LEGENDARY_PRESETS.find((p) => p.character.id === id);
  if (!p) { console.log('no', id); continue; }
  const look = p.character.appearance!;
  for (let i = 0; i < 3; i++) renderThrown(look, 4 + i);
  let t0 = performance.now();
  for (let a = 0; a < 20; a += 2) renderThrown(look, a);
  const tt = (performance.now() - t0) / 10;
  t0 = performance.now();
  const t = renderThrown(look, 10);
  for (let i = 0; i < 10; i++) phaseBody(t.rgba, GRID, GRID);
  const tp = (performance.now() - t0 - tt) / 10;
  t0 = performance.now();
  for (let i = 0; i < 5; i++) renderSprite(look, 'throw', 3);
  console.log(id, look.slots.held?.id, 'thrown', tt.toFixed(1), 'phaseBody', tp.toFixed(1), 'sprite', ((performance.now() - t0) / 5).toFixed(1));
}
