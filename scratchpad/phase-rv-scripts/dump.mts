import { writeFileSync } from 'node:fs';
const W = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-review';
const { LEGENDARY_PRESETS } = await import(W + '/src/data/shinobiData.ts');
const { renderSprite } = await import(W + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(W + '/src/sprite/legacy.ts');
const { phaseFrame } = await import(W + '/src/sprite/phase.ts');
const out = process.argv[2];
for (let k = 0; k < LEGENDARY_PRESETS.length; k++) {
  const p = LEGENDARY_PRESETS[k];
  const look = getAppearance(p.character);
  for (const [pose, f] of [['idle', 0], ['run', 1], ['run', 2]] as const) {
    const s = renderSprite(look, pose as never, f, dojutsuToEye(p.character.dojutsu));
    const t0 = performance.now();
    const ph = phaseFrame(s);
    const ms = performance.now() - t0;
    writeFileSync(`${out}/p${k}_${pose}_${f}.raw`, ph);
    writeFileSync(`${out}/s${k}_${pose}_${f}.raw`, s.rgba);
    console.log(k, p.name, p.character.clan, pose, f, ms.toFixed(1) + 'ms');
  }
}
