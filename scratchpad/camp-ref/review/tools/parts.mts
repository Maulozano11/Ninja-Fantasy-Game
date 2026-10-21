import { mkdirSync, writeFileSync } from 'node:fs';
const root = process.argv[2]; const out = process.argv[3];
mkdirSync(out, { recursive: true });
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { frameCount, rigPoseFor } = await import(root + '/src/sprite/rig.ts');
LEGENDARY_PRESETS.slice(0, 3).forEach((p: any, i: number) => {
  const base = getAppearance(p.character); const eye = dojutsuToEye(p.character.dojutsu);
  for (const body of ['male', 'female', 'bulky', 'slender']) for (const w of ['held', 'none']) {
    const look = { ...base, body, slots: { ...base.slots } };
    if (w === 'none') delete look.slots.held;
    for (const pose of ['read', 'sit', 'lean']) {
      const fc = frameCount(rigPoseFor(pose, look.cast?.style, look.slots.held?.id));
      for (let f = 0; f < fc; f++) writeFileSync(`${out}/p${i}-${body}-${w}-${pose}-${f}.part`, Buffer.from(renderSprite(look, pose, f, eye).part));
    }
  }
});
console.log('ok');
