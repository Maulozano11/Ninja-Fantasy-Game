// Our read pose next to the owner's first "leer" example at the same scale: tsx vsref.mts <root> <out.png> [frame] [preset] [body] [weapon]
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [root, out, frameArg = '0', presetArg = '0', body = 'male', weapon = 'held'] = process.argv.slice(2);
const { renderSprite } = await import(root + '/src/sprite/compose.ts');
const { getAppearance, dojutsuToEye } = await import(root + '/src/sprite/legacy.ts');
const { LEGENDARY_PRESETS } = await import(root + '/src/data/shinobiData.ts');
const p = LEGENDARY_PRESETS[+presetArg];
const base = getAppearance(p.character);
const look: any = { ...base, body, slots: { ...base.slots } };
if (weapon === 'none') delete look.slots.held;
const fn = out.replace(/\.png$/, '.rgba');
writeFileSync(fn, Buffer.from(renderSprite(look, 'read', +frameArg, dojutsuToEye(p.character.dojutsu)).rgba));
execFileSync('python3', ['-I', new URL('./vsref.py', import.meta.url).pathname, fn, out], { stdio: 'inherit' });
