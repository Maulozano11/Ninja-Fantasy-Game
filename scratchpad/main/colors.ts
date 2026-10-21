import { ALL_ITEMS } from '/home/user/Ninja-Fantasy-Game/src/sprite/catalog';
for (const d of ALL_ITEMS) console.log(d.id.padEnd(22), d.name.padEnd(26), d.colors.map((c) => `${c.key}:${c.default}`).join(' '));
