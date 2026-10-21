import { createBattle } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/battle/engine';
import { encounterSetup } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/battle/encounters';
import { waterAtPt } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/battle/map';
const rows: string[] = [];
for (let z = 0.25; z < 24; z += 0.5) {
  let line = '';
  for (let x = 0.25; x < 40; x += 0.5) {
    const w = waterAtPt({ mapId: 'river_forest' } as never, { x, z });
    line += w === 'deep' ? 'D' : w === 'shallow' ? 's' : w ? String(w)[0] : '.';
  }
  rows.push(`${z.toFixed(2).padStart(5)} ${line}`);
}
console.log(rows.join('\n'));
void createBattle; void encounterSetup;
