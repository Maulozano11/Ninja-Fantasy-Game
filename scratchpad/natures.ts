import { JUTSU } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-6/src/battle/jutsu';
import { JUTSUS_DATA } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-6/src/data/shinobiData';
const nat = Object.fromEntries(JUTSUS_DATA.map((j: any) => [j.id, j.nature]));
for (const s of Object.values(JUTSU) as any[]) console.log(s.id.padEnd(30), String(nat[s.id]).padEnd(10), s.element.padEnd(10), s.vfx, s.sig ?? '', s.special ?? '', s.shape);
