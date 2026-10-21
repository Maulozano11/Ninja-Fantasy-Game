// Renders one pose frame for given presets/bodies/weapon and writes a zoomed PNG grid with fine-pixel coordinates.
// tsx zoom.mts <root> <out.png> <pose> <frame> <presets> <bodies> <weapon> <x0,y0,x1,y1> <scale> [parts]
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [root, out, pose, frameArg, presetArg, bodyArg, weapon, cropArg, scaleArg, partsArg] = process.argv.slice(2);
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const files: string[] = [];
const tmp = out.replace(/\.png$/, '');
let k = 0;
for (const f of frameArg.split(',').map(Number))
  for (const i of presetArg.split(',').map(Number)) {
    const p = LEGENDARY_PRESETS[i];
    const base = getAppearance(p.character);
    for (const body of bodyArg.split(',')) {
      const look: any = { ...base, body, slots: { ...base.slots } };
      if (weapon === 'none') delete look.slots.held;
      if (weapon === 'pole') look.slots.held = { id: 'held_naginata', colors: [] };
      const fr = renderSprite(look, pose, f, dojutsuToEye(p.character.dojutsu));
      const fn = `${tmp}-${k++}.rgba`;
      writeFileSync(fn, Buffer.from(fr.rgba));
      if (partsArg) writeFileSync(fn + '.part', Buffer.from(fr.part));
      files.push(`${fn}|f${f} p${i} ${body}`);
    }
  }
execFileSync('python3', ['-I', new URL('./zoom.py', import.meta.url).pathname, out, cropArg, scaleArg, partsArg || '', ...files], { stdio: 'inherit' });
