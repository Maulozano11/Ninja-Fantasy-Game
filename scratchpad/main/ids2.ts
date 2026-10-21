import { ALL_ITEMS as CATALOG } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
const by: Record<string, string[]> = {};
for (const d of CATALOG as any[]) (by[d.slot] ||= []).push(d.id);
for (const [k, v] of Object.entries(by)) console.log(k.padEnd(10), v.length, v.join(' '));
