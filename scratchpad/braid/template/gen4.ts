// Sandbox: alternating tilted lobes; later lobes on top, the earlier lobe is
// shadowed (crease) where the next one covers it; silhouette outline at the end.
// args: W P a b angle dx reps creaseShade
const W = +(process.argv[2] || 6);
const P = +(process.argv[3] || 8);
const a = +(process.argv[4] || 3.4);
const b = +(process.argv[5] || 2.2);
const ang = +(process.argv[6] || 50);
const dx = +(process.argv[7] || 0.6);
const reps = +(process.argv[8] || 3);
const cs = +(process.argv[9] || 1);
const H = P * reps;
const LX = -0.72, LY = -0.69;
const out: number[][] = Array.from({ length: H }, () => new Array(W).fill(-1));
const own: number[][] = Array.from({ length: H }, () => new Array(W).fill(-99));
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
  const mine: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    const px = x + 0.5 - cx, py = y + 0.5 - cy;
    const u = (px * ux + py * uy) / a, v = (-px * uy + py * ux) / b;
    const d = Math.min(1, u * u + v * v);
    const nz = Math.sqrt(1 - d);
    const gx = (u / a) * ux - (v / b) * uy, gy = (u / a) * uy + (v / b) * ux;
    const gl = Math.hypot(gx, gy) || 1;
    const lt = ((gx / gl) * LX + (gy / gl) * LY) * Math.sqrt(d) + 0.3 * nz - 0.15;
    const s = lt > 0.5 ? 5 : lt > 0.25 ? 4 : lt > -0.05 ? 3 : lt > -0.4 ? 2 : 1;
    out[y][x] = s;
    own[y][x] = k;
    mine.push([x, y]);
  }
  // crease: earlier-lobe pixels right above / left of this lobe's edge
  for (const [x, y] of mine) {
    for (const [ox, oy] of [[0, -1], [-1, 0], [1, 0]]) {
      const xx = x + ox, yy = y + oy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (own[yy][xx] > -99 && own[yy][xx] < k && oy === -1) out[yy][xx] = Math.min(out[yy][xx], cs);
    }
  }
}
const res = out.map((r) => r.slice());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (out[y][x] < 0) continue;
  const e = (xx: number, yy: number) => xx < 0 || xx >= W || (yy >= 0 && yy < H && out[yy][xx] < 0);
  if (e(x - 1, y) || e(x + 1, y) || e(x, y - 1) || e(x, y + 1)) res[y][x] = 0;
}
for (const r of res) console.log(r.map((s) => (s < 0 ? '.' : String(s))).join(''));
