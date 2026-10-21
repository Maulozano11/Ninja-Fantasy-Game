import { getAppearance } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/sprite/legacy';
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/poses-review/src/data/shinobiData';
for (const n of process.argv.slice(2)) { const p = LEGENDARY_PRESETS.find((q: any) => q.name.startsWith(n))!; const l: any = getAppearance(p.character); console.log(n, JSON.stringify({ ...l, slots: Object.fromEntries(Object.entries(l.slots).map(([k, v]: any) => [k, v.id])) })); }
