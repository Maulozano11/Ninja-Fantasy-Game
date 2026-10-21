import { characterRef, CHARACTER_FEET } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const c = characterRef();
c.save(process.argv[2]);
console.log(c.w, c.h, CHARACTER_FEET, c.bounds());
