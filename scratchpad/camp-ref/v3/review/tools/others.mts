// Hashes every non-camp pose frame (all cast styles) plus every training drill, to prove they are unchanged:
// tsx others.mts <root> [per-pose json out]
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const root = process.argv[2];
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { frameCount, rigPoseFor } = await import(root + '/src/sprite/rig.ts');
const poses = ['lean', 'sit', 'idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed', 'train'];
const styles = ['signs', 'runes', 'book', 'sphere', 'lightning', 'wave', 'flash', 'eye', 'script'];
const h = createHash('sha256');
const per: Record<string, string> = {};
let n = 0;
for (const i of [0, 1, 2]) {
  const p = LEGENDARY_PRESETS[i];
  const base = getAppearance(p.character);
  for (const body of ['male', 'female', 'bulky', 'slender']) {
    for (const w of ['own', 'none', 'pole']) {
      for (const pose of poses) {
        if (w !== 'own' && !['idle', 'attack', 'train', 'walk', 'cast'].includes(pose)) continue;
        for (const style of pose === 'cast' ? styles : [base.cast?.style ?? 'runes']) {
          const look: any = { ...base, body, slots: { ...base.slots }, cast: { ...(base.cast || {}), style } };
          if (w === 'none') delete look.slots.held;
          if (w === 'pole') look.slots.held = { id: 'held_naginata', colors: [] };
          const fc = frameCount(rigPoseFor(pose, style, look.slots.held?.id));
          const hp = createHash('sha256');
          for (let f = 0; f < fc; f++) {
            const rgba = renderSprite(look, pose, f, dojutsuToEye(p.character.dojutsu)).rgba;
            h.update(rgba);
            hp.update(rgba);
            n++;
          }
          per[`p${i}-${body}-${w}-${pose}-${style}`] = hp.digest('hex').slice(0, 16);
        }
      }
    }
  }
}
console.log(n, h.digest('hex'));
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(per, null, 1));
