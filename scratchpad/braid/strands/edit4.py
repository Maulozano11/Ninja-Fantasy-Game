p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hairkit.ts'
s = open(p).read()
s = s.replace("""  const cells = new Map<number, [number, number]>(); // fine pixel → [plait, shade]""",
"""  const cells = new Map<number, [number, number, number]>(); // fine pixel → [plait, shade, outer-ness]""")
s = s.replace("""    cells.set(fy * GRID + fx, [k, Math.max(1, Math.min(5, s + (pen.bias || 0)))]);""",
"""    cells.set(fy * GRID + fx, [k, Math.max(1, Math.min(5, s + (pen.bias || 0))), X * (k & 1 ? 1 : -1)]);""")
old = s[s.index("  // The outline, and the crease along the top of every plait that crosses over another."):s.index("/** `braid` in head-local coordinates")]
new = """  // The outline, and the crease along the top of every plait that crosses over another.
  const V = (globalThis as any).__braidV || {};
  for (const [i, [k, s, o]] of cells) {
    let shade = s;
    if (near(i).some((j) => !cells.has(j))) shade = 0;
    else if (near(i).some((j) => cells.get(j)![0] === k + 1)) {
      if (V.cr === 'grad') shade = o > (V.o0 ?? 0.25) ? 0 : o > (V.o1 ?? -0.35) ? 1 : 2;
      else if (V.cr === 'grad1') shade = o > (V.o0 ?? 0) ? 0 : 1;
      else shade = 0;
    }
    L.set(i % GRID, (i / GRID) | 0, pen.mat, shade, pen.part, (pen.flags || 0) | F_NO_TEXTURE);
  }
}

"""
s = s.replace(old, new)
open(p, 'w').write(s)
