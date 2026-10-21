// Sandbox: alternating tilted lobes, each with its own outline ring, later lobes on top.
// args: W P a b angle dx reps
const W = +(process.argv[2] || 6);
const P = +(process.argv[3] || 8);
const a = +(process.argv[4] || 3.4);
const b = +(process.argv[5] || 2.2);
const ang = +(process.argv[6] || 50);
const dx = +(process.argv[7] || 0.6);
const reps = +(process.argv[8] || 3);
const H = P * reps;
const LX = -0.72, LY = -0.69;
const out: number[][] = Array.from({ length: H }, () => new Array(W).fill(-1));
for (let k = -2; k < reps * 2 + 1; k++) {
  const side = ((k % 2) + 2) % 2 === 0 ? -1 : 1;
  const cx = W / 2 + side * dx;
  const cy = k * (P / 2) + P / 4 + 0.5;
  const th = ((side < 0 ? ang : 180 - ang) * Math.PI) / 180;
  const ux = Math.cos(th), uy = Math.sin(th);
  const inside = (x: number, y: number) => {
    const px = x + 0.5 - cx, py = y + 0.5 - cy;
    const u = (px * ux + py * uy) / a, v = (-px * uy + py * ux) / b;
    return u * u + v * v <= 1;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    const ring = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    const px = x + 0.5 - cx, py = y + 0.5 - cy;
    const u = (px * ux + py * uy) / a, v = (-px * uy + py * ux) / b;
    const d = Math.min(1, u * u + v * v);
    const nz = Math.sqrt(1 - d);
    const gx = (u / a) * ux - (v / b) * uy, gy = (u / a) * uy + (v / b) * ux;
    const gl = Math.hypot(gx, gy) || 1;
    const lt = ((gx / gl) * LX + (gy / gl) * LY) * Math.sqrt(d) + 0.25 * nz;
    let s = lt > 0.45 ? 4 : lt > 0.05 ? 3 : lt > -0.4 ? 2 : 1;
    if (ring) s = 0;
    out[y][x] = s;
  }
}
for (const r of out) console.log(r.map((s) => (s < 0 ? '.' : String(s))).join(''));
