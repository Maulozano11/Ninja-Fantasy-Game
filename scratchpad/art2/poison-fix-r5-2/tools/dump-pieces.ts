import { poisonV3Dev } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-poison-v3';
const [name, out, ...ps] = process.argv.slice(2);
for (const p of ps) poisonV3Dev.piece(name, p).save(`${out}/piece-${name}-${p}.png`);
