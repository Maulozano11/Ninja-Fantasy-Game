import { characterRef } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const c = characterRef();
console.log(c.bounds());
c.save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/gj/char.png');
// column/row counts
const rows: number[] = [];
for (let y = 0; y < c.h; y++) { let n = 0; for (let x = 0; x < c.w; x++) if (c.alpha(x, y)) n++; rows.push(n); }
console.log(rows.join(' '));
