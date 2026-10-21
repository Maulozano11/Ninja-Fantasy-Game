import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/data/shinobiData';
import { renderSpriteCached } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/compose';
import { renderChakra } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/chakra';
import { CHAKRA_CHOICES } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_5ab99f4f-ae1-1/src/sprite/chakraInfo';

const look = DEFAULT_CHARACTER.appearance!;
const spr = renderSpriteCached(look, 'charge', 0, 'none');
for (let rep = 0; rep < 2; rep++)
  for (const c of CHAKRA_CHOICES) {
    const t = Date.now();
    renderChakra(c.id, 'charge', 6, spr.rgba, spr.rig, 'green');
    console.log(rep, c.id, Date.now() - t);
  }
