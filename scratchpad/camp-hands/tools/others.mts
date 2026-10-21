// Hashes every non-camp pose frame (all cast styles), to prove they are unchanged: tsx others.mts <root>
import { createHash } from 'node:crypto';

const root = process.argv[2];
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { frameCount, rigPoseFor } = await import(root + '/src/sprite/rig.ts');
const poses = ['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed'];
const styles = ['signs', 'runes', 'book', 'sphere', 'lightning', 'wave', 'flash', 'eye', 'script'];
const h = createHash('sha256');
let n = 0;
for (const i of [0, 1, 2]) {
  const p = LEGENDARY_PRESETS[i];
  const base = getAppearance(p.character);
  for (const body of ['male', 'slender']) {
    for (const pose of poses) {
      for (const style of pose === 'cast' ? styles : [base.cast?.style ?? 'runes']) {
        const look: any = { ...base, body, cast: { ...(base.cast || {}), style } };
        const fc = frameCount(rigPoseFor(pose, style, look.slots.held?.id));
        for (let f = 0; f < fc; f++) {
          h.update(renderSprite(look, pose, f, dojutsuToEye(p.character.dojutsu)).rgba);
          n++;
        }
      }
    }
  }
}
console.log(n, h.digest('hex'));
