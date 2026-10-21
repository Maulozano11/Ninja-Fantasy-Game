// Camp poses lean / sit / read from a source tree, for a progress peek.
import { mkdirSync, writeFileSync } from 'node:fs';
const [root, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { frameCount, rigPoseFor } = await import(root + '/src/sprite/rig.ts');
for (const [i, body] of [[0, 'male'], [1, 'female']] as const) {
  const p = LEGENDARY_PRESETS[i];
  const look = { ...getAppearance(p.character), body };
  const eye = dojutsuToEye(p.character.dojutsu);
  for (const pose of ['read', 'lean', 'sit']) {
    const fc = frameCount(rigPoseFor(pose, look.cast?.style, look.slots.held?.id));
    for (let f = 0; f < fc; f++) writeFileSync(`${out}/${i}-${pose}-${f}.rgba`, Buffer.from(renderSprite(look, pose, f, eye).rgba));
  }
}
console.log('ok');
