import { characterRef, writePng } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const c = characterRef();
writePng(process.argv[2], c.w, c.h, c.px);
