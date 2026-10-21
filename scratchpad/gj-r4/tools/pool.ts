import { __gjDebug as D } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3';
const k = D.key('blast', { l: 2, t: 2, r: 2, b: 2 });
const pool = D.piece(k, 'pool'), sm = D.piece(k, 'smoke'), col = D.piece(k, 'column'), mn = D.piece(k, 'main'), fe = D.piece(k, 'feathers');
const b = D.bounds(pool)!;
console.log('pool bounds', b, 'anchor', k.ax, k.ay, 'size', k.w, k.h);
const rows: string[] = [];
for (let y = 84; y <= 122; y++) {
  let s = '';
  for (let x = 0; x < k.w; x += 1) {
    const p = pool.d[y * k.w + x], m = sm.d[y * k.w + x], c = col.d[y * k.w + x];
    s += p ? 'P' : c ? 'c' : m ? 's' : mn.d[y * k.w + x] ? 'M' : fe.d[y * k.w + x] ? 'F' : '.';
  }
  rows.push(`${String(y).padStart(3)} ${s}`);
}
console.log(rows.join('\n'));
// width per row
for (let y = b[1]; y <= b[3]; y++) {
  let x0 = -1, x1 = -1;
  for (let x = 0; x < k.w; x++) if (pool.d[y * k.w + x]) { if (x0 < 0) x0 = x; x1 = x; }
  process.stdout.write(`${y}:${x0}-${x1} `);
}
console.log();
