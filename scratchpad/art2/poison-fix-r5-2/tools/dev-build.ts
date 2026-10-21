import { writeGroup } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
import { poisonV3Dev } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-poison-v3';
const [out, ...names] = process.argv.slice(2);
const sprites = names.flatMap((n) => poisonV3Dev.sprite(n));
writeGroup('dev', sprites, out);
const f = poisonV3Dev.faults();
console.log(f.length ? 'FAULTS:\n  ' + f.join('\n  ') : 'no faults');
