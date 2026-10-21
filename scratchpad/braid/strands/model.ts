// Prints the strand-on-top map of the braid model: letter = strand (upper case while it runs over the top, lower case while it runs under).
const wpx = Number(process.argv[2] || 4); // px across
const per = Number(process.argv[3] || 12); // rows per full turn
const A = Number(process.argv[4] || 0.8), R = Number(process.argv[5] || 0.62);
for (let y = 0; y < per * 1.5; y++) {
  let row = '';
  for (let x = 0; x < wpx; x++) {
    const X = ((x + 0.5) / wpx) * 2 - 1;
    const a = (2 * Math.PI * (y + 0.5)) / per;
    let top = -1, z = -Infinity, ph = 0;
    for (let k = 0; k < 3; k++) {
      const f = a + (2 * Math.PI * k) / 3;
      const d = (X - A * Math.sin(f)) / R;
      const zk = -Math.sin(2 * f);
      if (Math.abs(d) <= 1 && zk > z) { top = k; z = zk; ph = f; }
    }
    const q = (((ph % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 2);
    const over = (q >= 1 && q < 2) || q >= 3;
    row += top < 0 ? '.' : over ? 'ABC'[top] : 'abc'[top];
  }
  console.log(row);
}
