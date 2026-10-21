import { ALL_ITEMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
const by: Record<string, string[]> = {};
for (const d of ALL_ITEMS) (by[d.slot] ||= []).push(d.id);
console.log(JSON.stringify(by, null, 0));
