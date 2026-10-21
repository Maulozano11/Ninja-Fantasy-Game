import { writeFileSync, mkdirSync } from 'node:fs';
import { LEGENDARY_PRESETS } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/data/shinobiData';
import { renderSprite } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/sprite/compose';
import { getAppearance, dojutsuToEye } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/sprite/legacy';
import { phaseFrame } from '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/sprite/phase';
const out = process.argv[2];
mkdirSync(out, { recursive: true });
const poses = (process.argv[3] ?? 'idle:0,run:2,run:1').split(',').map((s) => s.split(':'));
let tot = 0, n = 0;
LEGENDARY_PRESETS.forEach((p, k) => {
  const look = getAppearance(p.character);
  for (const [pose, f] of poses) {
    const s = renderSprite(look, pose as never, Number(f), dojutsuToEye(p.character.dojutsu));
    const t0 = performance.now();
    const ph = phaseFrame(s);
    tot += performance.now() - t0; n++;
    writeFileSync(`${out}/p${k}_${pose}_${f}.raw`, ph);
    writeFileSync(`${out}/s${k}_${pose}_${f}.raw`, s.rgba);
    if (pose === poses[0][0]) console.log(k, p.name, p.character.clan);
  }
});
console.log('avg ms', (tot / n).toFixed(2));
