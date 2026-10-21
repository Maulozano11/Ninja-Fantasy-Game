// Sandbox: plaits as alternating wedges between slanted crease lines.
// args: W(interior) P(period) slope reps
const Wi = +(process.argv[2] || 4);
const P = +(process.argv[3] || 8);
const slope = +(process.argv[4] || 0.8);
const reps = +(process.argv[5] || 3);
const H = P * reps;
const c = Wi / 2;
const rows: string[] = [];
for (let y = 0; y < H; y++) {
  let row = '';
  for (let xi = -1; xi <= Wi; xi++) {
    const x = xi + 0.5 - c; // -c..c
    const yy = y + 0.5;
    // crease k at y = (P/2)k + s_k * x * slope, s alternating; find segment
    let k = Math.floor(yy / (P / 2)) + 2;
    const crease = (k: number) => (P / 2) * k + (k % 2 === 0 ? 1 : -1) * x * slope;
    while (crease(k) > yy) k--;
    // segment k lies between crease(k) and crease(k+1)
    const t0 = crease(k), t1 = crease(k + 1);
    const v = (yy - t0) / (t1 - t0);
    const right = k % 2 !== 0; // which side the wedge bulges
    const tall = (right ? x : -x) / c; // +1 at the tall side
    // silhouette: tall side bulges by one px, short side pulled in
    if (xi === -1 || xi === Wi) {
      const outer = xi === -1 ? -1 : 1;
      const isTall = (outer > 0) === right;
      row += isTall && v > 0.15 && v < 0.85 ? '0' : '.';
      continue;
    }
    let s: number;
    if (yy - t0 < 0.9) s = 1; // crease just under the boundary
    else if (v < 0.45) s = tall > -0.2 ? 4 : 3;
    else if (v < 0.75) s = 3;
    else s = 2;
    if (xi === 0 || xi === Wi - 1) {
      // outer columns: outline unless the tall side bulges here
      const outer = xi === 0 ? -1 : 1;
      const isTall = (outer > 0) === right;
      if (!isTall) s = 0;
    }
    row += String(s);
  }
  rows.push(row);
}
for (const r of rows) console.log(r);
