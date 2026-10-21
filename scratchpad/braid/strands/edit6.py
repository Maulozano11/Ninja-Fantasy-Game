p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hair.ts'
s = open(p).read()
old = s[s.index("      // a braid from the near temple down over the chest, tied off above a short tuft"):s.index("    },\n  ),\n  {\n    id: 'hair_ribbon',")]
new = '''      // a braid from the near temple down over the chest, tied off above a short tuft
      const F = g.L('hairFront');
      const pen: Pen = { ...P.f, part: 'back' };
      const [tx, ty] = toHead(g, g.rig.T(0, g.bp.torsoLen - 9));
      // head-local point `a` further along the end of the braid and `c` across it
      const l = Math.hypot(tx + 2.8, ty - 6) || 1;
      const [ux, uy] = [(tx + 2.8) / l, (ty - 6) / l];
      const at = (a: number, c: number): [number, number] => [tx + ux * a + uy * c, ty + uy * a - ux * c];
      for (const [c, len, w] of [[-2, 3.4, 1.8], [1.8, 3, 1.7], [0, 4.4, 2]]) {
        hlock(g, F, [...at(0, c * 0.3), ...at(len * 0.5, c * 0.7), ...at(len, c)], w, pen, { hold: 0.2, tipW: 0.5, light: 1, tipDark: false });
      }
      hbraid(g, F, [-3.6, -1.4, -2.8, 6, tx, ty], 4.3, pen, { tipW: 3.4 });
      // the tie: a dark band pinching the end of the braid
      const band = (w: number, h: number): [number, number][] => [at(-h, -w), at(-h, w), at(h, w), at(h, -w)];
      hpoly(g, F, band(1.55, 0.95), pen, 0);
      hpoly(g, F, band(1.15, 0.35), pen, 2);
'''
s = s.replace(old, new)
open(p, 'w').write(s)

p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hairkit.ts'
s = open(p).read()
old = s[s.index("  // The outline, and the crease along the top of every plait that crosses over another."):s.index("/** `braid` in head-local coordinates")]
new = '''  // The outline, and a crease where each plait tucks under the next: dark on
  // the plait's own side, fading out where the next plait comes over the top.
  for (const [i, [k, s, o]] of cells) {
    let shade = s;
    if (near(i).some((j) => !cells.has(j))) shade = 0;
    else if (near(i).some((j) => cells.get(j)![0] === k + 1)) shade = o > 0.25 ? 0 : o > -0.35 ? 1 : 2;
    L.set(i % GRID, (i / GRID) | 0, pen.mat, shade, pen.part, (pen.flags || 0) | F_NO_TEXTURE);
  }
}

'''
s = s.replace(old, new)
open(p, 'w').write(s)
