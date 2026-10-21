import { GJ_REF } from '/home/user/Ninja-Fantasy-Game/tools/world-sprites/vfx-genjutsu-v3-refdata';
const s = GJ_REF['breath'];
const p = s.pieces['main'];
const bytes = Buffer.from(p.rle, 'base64');
const d = new Uint8Array(p.w * p.h); let i = 0;
for (let k = 0; k < bytes.length; k += 2) { d.fill(bytes[k + 1], i, i + bytes[k]); i += bytes[k]; }
const lab = new Int32Array(p.w * p.h); let n = 0; const sizes: number[] = []; const cents: string[] = [];
for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
  if (!d[y * p.w + x] || lab[y * p.w + x]) continue;
  n++; let c = 0, sx = 0, sy = 0; const st = [[x, y]]; lab[y * p.w + x] = n;
  while (st.length) { const [a, b] = st.pop()!; c++; sx += a; sy += b;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = a + dx, v = b + dy;
      if (u >= 0 && v >= 0 && u < p.w && v < p.h && d[v * p.w + u] && !lab[v * p.w + u]) { lab[v * p.w + u] = n; st.push([u, v]); } } }
  if (c >= 40) { sizes.push(c); cents.push(`${(sx / c + p.x).toFixed(0)},${(sy / c + p.y).toFixed(0)}`); }
}
console.log(n, sizes, cents, s.pieces['orb']);
