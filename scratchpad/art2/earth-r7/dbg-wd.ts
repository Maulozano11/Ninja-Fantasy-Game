{
  const K = key('wall_depth');
  const main = K.part('main'), bits = K.part('bits');
  console.log('K', K.w, K.h, K.ax, K.ay);
  const rubbleAt = (dx: number, dy: number) => (dx >= 47 && dy >= 21) || dy >= 82;
  const Z = 6;
  const X0 = +process.argv[2], X1 = +process.argv[3], Y0 = +process.argv[4], Y1 = +process.argv[5];
  const c = new Canvas((X1 - X0 + 1) * Z, (Y1 - Y0 + 1) * Z);
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const v = main.get(x, y) || bits.get(x, y);
    let col: Color = [60, 110, 60, 255];
    if (v) {
      const p = main.pal.cols[v - 1];
      col = [p[0], p[1], p[2], 255];
      if (rubbleAt(x - K.ax, y - K.ay) && main.get(x, y)) col = [Math.min(255, p[0] * 0.6 + 100), p[1] * 0.6, p[2] * 0.6, 255];
      if (bits.get(x, y)) col = [p[0] * 0.5, p[1] * 0.5, Math.min(255, p[2] * 0.5 + 120), 255];
    }
    for (let a = 0; a < Z; a++) for (let b = 0; b < Z; b++) c.set((x - X0) * Z + a, (y - Y0) * Z + b, col);
  }
  for (let y = Y0; y <= Y1; y += 5) for (let a = 0; a < 3; a++) c.set(a, (y - Y0) * Z, [255, 255, 0, 255]);
  c.save('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/earth-r7/wd-foot-classes.png');
}
