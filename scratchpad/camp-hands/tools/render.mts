// Renders the camp poses (and the grimoire cast pose) from a source tree as raw 256x256 RGBA files.
// usage: tsx render.mts <root> <outDir> [quick]
import { mkdirSync, writeFileSync } from 'node:fs';

const root = process.argv[2];
const out = process.argv[3];
const quick = process.argv[4] === 'quick';
mkdirSync(out, { recursive: true });
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { frameCount, rigPoseFor } = await import(root + '/src/sprite/rig.ts');

const bodies = quick ? ['male', 'female'] : ['male', 'female', 'bulky', 'slender'];
const poses = ['lean', 'sit', 'read', 'train'];
let n = 0;
const put = (name: string, look: any, pose: string, f: number, eye: string) => {
  const fr = renderSprite(look, pose, f, eye);
  writeFileSync(`${out}/${name}.rgba`, Buffer.from(fr.rgba));
  n++;
};
LEGENDARY_PRESETS.slice(0, 3).forEach((p: any, i: number) => {
  const base = getAppearance(p.character);
  const eye = dojutsuToEye(p.character.dojutsu);
  for (const body of bodies) {
    for (const w of ['held', 'none']) {
      const look = { ...base, body, slots: { ...base.slots } };
      if (w === 'none') delete look.slots.held;
      for (const pose of poses) {
        const fc = frameCount(rigPoseFor(pose, look.cast?.style, look.slots.held?.id));
        for (let f = 0; f < fc; f++) {
          if (quick && pose !== 'read' && f % 2) continue;
          if (quick && pose === 'read' && ![0, 3, 9, 10, 11].includes(f)) continue;
          put(`p${i}-${body}-${w}-${pose}-${f}`, look, pose, f, eye);
        }
      }
    }
    // the grimoire cast pose for comparison
    const book = { ...base, body, cast: { ...(base.cast || {}), style: 'book' } };
    for (let f = 0; f < 2; f++) put(`p${i}-${body}-held-castbook-${f}`, book, 'cast', f, eye);
  }
  // the polearm drill
  const pole = { ...base, body: 'male', slots: { ...base.slots, held: { id: 'held_naginata', colors: [] } } };
  for (let f = 0; f < 8; f++) if (!quick || f % 2 === 0) put(`p${i}-male-pole-train-${f}`, pole, 'train', f, eye);
});
console.log('rendered', n);
