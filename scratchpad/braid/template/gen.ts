// Sandbox: procedurally lay out tilted plait lobes on a small grid and print
// them as shade strings, to get a starting point for the hand-made tile.
const W = +(process.argv[2] || 6);
const P = +(process.argv[3] || 8);
const a = +(process.argv[4] || 2.9); // long semi-axis
const b = +(process.argv[5] || 1.7); // short semi-axis
const ang = +(process.argv[6] || 50); // tilt degrees from horizontal
const dx = +(process.argv[7] || 0.7); // lobe center offset from the middle
const H = P * 3;
const grid: number[][] = Array.from({ length: H }, () => new Array(W).fill(-1));
const owner: number[][] = Array.from({ length: H }, () => new Array(W).fill(-1));
const LX = -0.72, LY = -0.69;
for (let k = -1; k < 7; k++) {
  const side = k % 2 === 0 ? -1 : 1; // -1 left lobe, +1 right lobe
  const cx = W / 2 + side * dx;
  const cy = k * (P / 2) + P / 4;
  // left lobe runs from upper-left to lower-right ("\"), right lobe "/"
  const th = ((side < 0 ? ang : 180 - ang) * Math.PI) / 180;
  const ux = Math.cos(th), uy = Math.sin(th);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + 0.5 - cx, py = y + 0.5 - cy;
    const u = (px * ux + py * uy) / a, v = (-px * uy + py * ux) / b;
    const d = u * u + v * v;
    if (d > 1) continue;
    // normal of the ellipse surface (as a dome)
    const nz = Math.sqrt(Math.max(0, 1 - d));
    const nx = (u / a) * ux - (v / b) * uy, ny = (u / a) * uy + (v / b) * ux;
    const nl = Math.hypot(nx, ny, nz * 0.9);
    const lt = (nx * LX + ny * LY) / nl + 0.35 * (nz / nl);
    let s = lt > 0.55 ? 4 : lt > 0.15 ? 3 : lt > -0.25 ? 2 : 1;
    if (d > 0.72) s = 0;
    grid[y][x] = s;
    owner[y][x] = k;
  }
}
for (let y = 0; y < H; y++) console.log("'" + grid[y].map((s) => (s < 0 ? '.' : String(s))).join('') + "',");
