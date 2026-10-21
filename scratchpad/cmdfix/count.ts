import { ALL_ITEMS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_11bced0d-ee1-7/src/sprite/catalog';
const by: Record<string, { all: number; none: number; ids: string[] }> = {};
for (const d of ALL_ITEMS) {
  const s = (by[d.slot] ??= { all: 0, none: 0, ids: [] });
  s.all++; if (d.id.endsWith('_none')) s.none++; else s.ids.push(d.id);
}
for (const [k, v] of Object.entries(by)) console.log(k, 'all', v.all, 'none', v.none, 'pickable', v.all - v.none, k === 'held' ? v.ids.join(',') : '');
