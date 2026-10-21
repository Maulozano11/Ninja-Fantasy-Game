import { buildList, GROUPS } from '/home/user/Ninja-Fantasy-Game/tools/ui/ui-icons-list';
const l = buildList();
for (const g of GROUPS) console.log(g.es, l.filter((e) => e.group === g.id).length);
for (const e of l) console.log(e.group, '|', e.row, '|', e.id, '|', e.es, '|', e.en, '|', e.use, '|', e.esButton ?? '');
