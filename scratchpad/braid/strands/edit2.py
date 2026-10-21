p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hairkit.ts'
s = open(p).read()
start = s.index("export interface BraidOpts {")
end = s.index("/** `braid` in head-local coordinates")
new = '''export interface BraidOpts {
  /** Length of braid holding one plait on each side, in design units (default 5). */
  plait?: number;
  /** Width at the tip, in design units (default: no taper). */
  tipW?: number;
}

/**
 * A three-strand braid along a quadratic bezier root → ctrl → tip, `w` design
 * units wide. The outer strands take turns crossing over the middle one (left
 * over middle, right over middle), so the front shows a column of plaits
 * alternating left and right: each is widest and bulges out at its own edge
 * and thins toward the far edge, where the next plait crosses over it. Plaits
 * are lit from the upper-left, with a dark crease where each one tucks under
 * the next. The braid draws its own outline, so it reads over other hair, and
 * keeps its shading clean (no texture pass).
 */
export function braid(L: Layer, root: Vec, ctrl: Vec, tip: Vec, w: number, pen: Pen, opts: BraidOpts = {}): void {
  const N = 64;
  const pts: Vec[] = [];
  const tan: Vec[] = [];
  const arc: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(qb(root, ctrl, tip, t));
    const d = v(2 * (1 - t) * (ctrl.x - root.x) + 2 * t * (tip.x - ctrl.x), 2 * (1 - t) * (ctrl.y - root.y) + 2 * t * (tip.y - ctrl.y));
    const l = Math.hypot(d.x, d.y) || 1;
    tan.push(v(d.x / l, d.y / l));
    arc.push(i ? arc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) : 0);
  }
  const step = (opts.plait ?? 5) / 2; // a new plait every half `plait`, the sides taking turns
  const tipW = opts.tipW ?? w;
  const bulge = 0.3; // how far a plait bulges past the edge, in half widths
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const r = (Math.max(w, tipW) / 2) * (1 + bulge) + 0.5;
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
    const across = dx * tg.y - dy * tg.x; // toward the screen right when the braid hangs down
    if (Math.abs(across) > hw * (1 + bulge)) return;
    const X = Math.max(-1, Math.min(1, across / hw));
    // Plait k (even: left, odd: right) lies between creases k and k + 1; each
    // crease climbs toward the edge of the plait below it.
    const crease = (k: number) => k + 0.45 * X * (k & 1 ? -1 : 1);
    const a = (arc[best] + along) / step;
    let k = Math.floor(a);
    if (a < crease(k)) k--;
    else if (a >= crease(k + 1)) k++;
    const t = (a - crease(k)) / (crease(k + 1) - crease(k)); // 0 at the top of the plait, 1 at its crease
    const out = across * (k & 1 ? 1 : -1) > 0 ? 1 + bulge * Math.sin(Math.PI * Math.min(1, t * 1.15)) : 1;
    if (Math.abs(across) > hw * out) return;
    const b = 1 - 0.6 * t - 0.2 * (X + 1);
    const s = b > 0.78 ? 5 : b > 0.58 ? 4 : b > 0.32 ? 3 : 2;
    cells.set(fy * GRID + fx, [k, Math.max(1, Math.min(5, s + (pen.bias || 0)))]);
  });
  const near = (i: number) => [i + 1, i - 1, i + GRID, i - GRID];
  // Drop lone pixels left in the notches between plaits.
  for (const i of [...cells.keys()]) if (near(i).filter((j) => cells.has(j)).length < 2) cells.delete(i);
  // The outline, and the crease along the top of every plait that crosses over another.
  for (const [i, [k, s]] of cells) {
    const line = near(i).some((j) => {
      const n = cells.get(j);
      return !n || n[0] === k + 1;
    });
    L.set(i % GRID, (i / GRID) | 0, pen.mat, line ? 0 : s, pen.part, (pen.flags || 0) | F_NO_TEXTURE);
  }
}

'''
s = s[:start] + new + s[end:]
open(p, 'w').write(s)
