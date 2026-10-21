p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hairkit.ts'
s = open(p).read()
start = s.index("  const r = (Math.max(w, tipW) / 2) * (1 + shift) + 0.5;")
end = s.index("/** `braid` in head-local coordinates")
new = '''  const r = (Math.max(w, tipW) / 2) * (1 + shift) + 0.5;
  const cells = new Map<number, [number, number]>(); // fine pixel → [plait, shade]
  eachFine(L, minX - r, minY - r, maxX + r, maxY + r, (fx, fy, cx, cy) => {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i <= N; i++) {
      const d = (cx - pts[i].x) ** 2 + (cy - pts[i].y) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    const tg = tan[best];
    const dx = cx - pts[best].x;
    const dy = cy - pts[best].y;
    const along = dx * tg.x + dy * tg.y;
    if (best === 0 && along < -0.2) return;
    if (best === N && along > 0.15) return;
    const hw = (w + (tipW - w) * (best / N)) / 2;
    const across = dx * tg.y - dy * tg.x;
    if (Math.abs(across) > hw * (1 + shift)) return;
    const X = Math.max(-1, Math.min(1, across / hw));
    const a = (arc[best] + along) / step;
    const crease = (k: number) => k + slant * X * (k & 1 ? -1 : 1);
    let k = Math.floor(a);
    if (a < crease(k)) k--;
    else if (a >= crease(k + 1)) k++;
    const side = k & 1 ? 1 : -1;
    const t = (a - crease(k)) / (crease(k + 1) - crease(k));
    if (V.lump) {
      const lim = across * side > 0 ? hw * (1 + shift * Math.sin(Math.PI * Math.min(1, t * (V.lt ?? 1.15)))) : hw * (V.inner ?? 1);
      if (Math.abs(across) > lim) return;
    } else if (Math.abs(across - side * shift * hw) > hw) return;
    let s: number;
    if (V.sh === 2) {
      const u = (1 - X * side) / 2; // 0 at the plait's outer edge, 1 at its inner end
      const b = 1 - ((V.wt ?? 0.55) * t + (1 - (V.wt ?? 0.55)) * u);
      s = b > (V.b4 ?? 0.62) ? 4 : b > (V.b3 ?? 0.38) ? 3 : 2;
      if (side < 0 && b > (V.b5 ?? 0.8)) s = 5;
      if (side > 0 && s > 3 && X > 0.5) s = 3;
    } else {
      s = t < (V.t1 ?? 0.4) ? 4 : t < (V.t2 ?? 0.72) ? 3 : 2;
      if (side < 0 && t > (V.h0 ?? 0.1) && t < (V.h1 ?? 0.45) && X > (V.hx0 ?? -0.75) && X < (V.hx1 ?? 0.1)) s = 5;
      if (X > (V.dx ?? 0.55) && s > 2) s -= 1;
    }
    cells.set(fy * GRID + fx, [k, Math.max(1, Math.min(5, s + (pen.bias || 0)))]);
  });
  const near = (i: number) => [i + 1, i - 1, i + GRID, i - GRID];
  // Drop lone pixels left at the notches between plaits.
  if (V.clean !== false) for (const i of [...cells.keys()]) if (near(i).filter((j) => cells.has(j)).length < 2) cells.delete(i);
  // A dark crease where each plait tucks under the next one; an outline around the whole braid.
  for (const [i, [k, s]] of cells) {
    let shade = s;
    for (const j of near(i)) {
      const n = cells.get(j);
      if (!n) shade = 0;
      else if (n[0] === k + 1 && shade > 0) shade = V.crease ?? 1;
    }
    L.set(i % GRID, (i / GRID) | 0, pen.mat, shade, pen.part, flags);
  }
}

'''
s = s[:start] + new + s[end:]
s = s.replace("  const mine = new Map<number, number>(); // fine pixel → plait\n", "")
open(p, 'w').write(s)
