// Prototype pose variants: tsx proto.mts <root> <outDir> <rigPose> <spritePose> <variants.json> <presets> <bodies> [weapon]
// variants.json: [{ "name": "...", "frame": { ...PoseFrame overrides merged over the pose's frame 0 } }]
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const [root, out, rigPose, spritePose, vfile, presetArg, bodyArg, weapon = 'none'] = process.argv.slice(2);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const rig = await import(root + '/src/sprite/rig.ts');
const { v } = await import(root + '/src/sprite/raster.ts');
const variants = JSON.parse(readFileSync(vfile, 'utf8'));
const orig = [...rig.POSES[rigPose]];
const list: string[] = [];
const fix = (o: any): any => {
  // {"v":[x,y]} -> Vec
  if (o && typeof o === 'object' && Array.isArray(o.v)) return v(o.v[0], o.v[1]);
  if (o && typeof o === 'object') for (const k of Object.keys(o)) o[k] = fix(o[k]);
  return o;
};
for (const vr of variants) {
  const k = vr.index ?? 0;
  rig.POSES[rigPose] = orig.map((f: any, i: number) => (i === k ? { ...f, ...fix(vr.frame) } : f));
  for (const i of presetArg.split(',').map(Number)) {
    const p = LEGENDARY_PRESETS[i];
    const base = getAppearance(p.character);
    for (const body of bodyArg.split(',')) {
      const look: any = { ...base, body, slots: { ...base.slots } };
      if (weapon === 'none') delete look.slots.held;
      if (weapon === 'pole') look.slots.held = { id: 'held_naginata', colors: [] };
      const name = `${vr.name}-p${i}-${body}`;
      writeFileSync(`${out}/${name}.rgba`, Buffer.from(renderSprite(look, spritePose, k, dojutsuToEye(p.character.dojutsu)).rgba));
      list.push(name);
    }
  }
  const r = rig.drawRig('male', rigPose, k);
  const P = (q: any) => `(${(q.x * 2).toFixed(0)},${(q.y * 2).toFixed(0)})`;
  console.log(vr.name, 'shN', P(r.shoulderN), 'elN', P(r.elbowN), 'wrN', P(r.wristN), '| shF', P(r.shoulderF), 'elF', P(r.elbowF), 'wrF', P(r.wristF), '| kN', P(r.kneeN), 'kF', P(r.kneeF), 'hipN', P(r.hipN));
}
writeFileSync(`${out}/list.txt`, list.join('\n'));
