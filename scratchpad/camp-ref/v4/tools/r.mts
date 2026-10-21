// Renders frames: tsx r.mts <root> <outDir> <poses> <frames|all> <presets> <bodies> <weapons> [hands]
// weapon 'pole' gives a naginata; hands: 'own' (default), 'bare' (no gloves), or a hands item id.
import { mkdirSync, writeFileSync } from 'node:fs';

const [root, out, poseArg, frameArg, presetArg, bodyArg, weaponArg, handArg = 'own'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { frameCount, rigPoseFor } = await import(root + '/src/sprite/rig.ts');
const list: string[] = [];
for (const i of presetArg.split(',').map(Number)) {
  const p = LEGENDARY_PRESETS[i];
  const base = getAppearance(p.character);
  const eye = dojutsuToEye(p.character.dojutsu);
  for (const body of bodyArg.split(','))
    for (const w of weaponArg.split(','))
      for (const h of handArg.split(','))
        for (const pose of poseArg.split(',')) {
          const look: any = { ...base, body, slots: { ...base.slots } };
          if (w === 'none') delete look.slots.held;
          if (w === 'pole') look.slots.held = { id: 'held_naginata', colors: [] };
          if (h === 'bare') delete look.slots.hands;
          else if (h !== 'own') look.slots.hands = { id: h, colors: [] };
          const fc = frameCount(rigPoseFor(pose, look.cast?.style, look.slots.held?.id));
          const frames = frameArg === 'all' ? [...Array(fc).keys()] : frameArg.split(',').map(Number).filter((f) => f < fc);
          for (const f of frames) {
            const name = `p${i}-${body}-${w}-${h}-${pose}-${f}`;
            writeFileSync(`${out}/${name}.rgba`, Buffer.from(renderSprite(look, pose, f, eye).rgba));
            list.push(name);
          }
        }
}
writeFileSync(`${out}/list.txt`, list.join('\n'));
console.log('rendered', list.length);
