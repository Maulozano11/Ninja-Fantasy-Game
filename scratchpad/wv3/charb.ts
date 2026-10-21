import { characterRef } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const c = characterRef();
console.log(c.bounds());
c.scaled(4).save(process.argv[2]);
