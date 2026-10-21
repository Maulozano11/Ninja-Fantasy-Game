import { katanaTemplate } from '/home/user/Ninja-Fantasy-Game/src/sprite/items/katana';
for (const p of [{ guard: 'b' }, { hilt: 'b' }, { hilt: 'c' }, {}]) {
  const t = katanaTemplate(p as any, '#e8321e');
  console.log(JSON.stringify(p), t.pivot);
  t.rows.forEach((r, i) => console.log(String(i).padStart(2), r.slice(0, 40)));
}
