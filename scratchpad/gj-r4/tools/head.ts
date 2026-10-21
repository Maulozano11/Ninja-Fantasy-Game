import { __gjDebug as D } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3';
const h = D.key('stream_head', { l: 0, t: 0, r: 0, b: 0 });
const t = D.key('stream');
for (const [n, ix] of Object.entries(h.p)) console.log(n, D.bounds(ix));
const sp = D.piece(h, 'spiral');
const sb = D.bounds(sp)!;
console.log('spiral centre', (sb[0] + sb[2] + 1) / 2, (sb[1] + sb[3] + 1) / 2);
const main = D.piece(h, 'main'), sm = D.piece(h, 'smoke'), spk = D.piece(h, 'sparks');
const L = (v: number) => (v ? D.LAB[v - 1][0] : -1);
const ch = (x: number, y: number) => {
  const a = main.d[y * h.w + x], b = sp.d[y * h.w + x], c = sm.d[y * h.w + x], e = spk.d[y * h.w + x];
  const v = a || b || c || e;
  if (!v) return '  .';
  const tag = a ? 'm' : b ? 'S' : c ? 's' : 'k';
  return tag + String(Math.round(L(v) / 10)).padStart(2);
};
for (let y = 0; y < 64; y++) {
  let s = String(y).padStart(2) + ' ';
  for (let x = 0; x < 67; x++) s += ch(x, y);
  console.log(s);
}
