import { __gjDebug as D } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3';
const k = D.key('wall', { l: 2, t: 2, r: 2, b: 2 });
const cr = D.underThorns(D.piece(k, 'main'), D.piece(k, 'vines'));
const lab = D.pillarClusters(cr, k.seams);
const bits = D.piece(k, 'bits');
let s = '';
for (let y = 18; y < 48; y++) {
  let row = String(y).padStart(3) + ' ';
  for (let x = 80; x < 115; x++) {
    const n = y * k.w + x;
    const v = cr.d[n], b = bits.d[n];
    row += v ? (D.KIND[v - 1] === 'body' ? (D.LAB[v - 1][0] > 36 ? 'L' : 'b') : D.KIND[v - 1][0]) : b ? '*' : '.';
  }
  s += row + '\n';
}
console.log(s);
for (const p of D.parts(cr)) { const n = p.ix.d.reduce((a: number, v: number) => a + (v ? 1 : 0), 0); if (n < 200) console.log('part', p.b, n); }
