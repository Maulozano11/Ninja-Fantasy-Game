// usage: tsx rend.mts <root> <outDir> [all]
// Renders read/lean/sit for presets 0..2 x 4 bodies x held/none as raw RGBA; with 'all', every pose frame hash too.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = process.argv[2];
const out = process.argv[3];
const all = process.argv[4] === 'all';
mkdirSync(out, { recursive: true });
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const { frameCount, rigPoseFor, drawRig } = await import(root + '/src/sprite/rig.ts');
const bodies = ['male', 'female', 'bulky', 'slender'];
const hashes: Record<string, string> = {};
const joints: Record<string, any> = {};
const camp = ['lean', 'sit', 'read'];
const others = ['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed', 'train'];
const styles = ['runes', 'signs', 'book', 'sphere', 'lightning', 'wave', 'flash', 'script'];
LEGENDARY_PRESETS.slice(0, 3).forEach((p: any, i: number) => {
  const base = getAppearance(p.character);
  const eye = dojutsuToEye(p.character.dojutsu);
  for (const body of bodies) for (const w of ['held', 'none']) {
    const look = { ...base, body, slots: { ...base.slots } };
    if (w === 'none') delete look.slots.held;
    for (const pose of camp) {
      const rp = rigPoseFor(pose, look.cast?.style, look.slots.held?.id);
      const fc = frameCount(rp);
      for (let f = 0; f < fc; f++) {
        const fr = renderSprite(look, pose, f, eye);
        writeFileSync(`${out}/p${i}-${body}-${w}-${pose}-${f}.rgba`, Buffer.from(fr.rgba));
        const r = drawRig(body, rp, f);
        joints[`${body}-${pose}-${f}`] = r;
      }
    }
    if (all) {
      for (const pose of others) {
        const sts = pose === 'cast' ? styles : [undefined];
        for (const st of sts) {
          const lk = st ? { ...look, cast: { ...(look.cast || {}), style: st } } : look;
          const fc = frameCount(rigPoseFor(pose, lk.cast?.style, lk.slots.held?.id));
          for (let f = 0; f < fc; f++) {
            const fr = renderSprite(lk, pose, f, eye);
            hashes[`p${i}-${body}-${w}-${pose}${st ? '-' + st : ''}-${f}`] = createHash('md5').update(Buffer.from(fr.rgba)).digest('hex');
          }
        }
      }
    }
  }
});
writeFileSync(`${out}/hashes.json`, JSON.stringify(hashes));
writeFileSync(`${out}/joints.json`, JSON.stringify(joints, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)));
console.log('ok', Object.keys(hashes).length);
