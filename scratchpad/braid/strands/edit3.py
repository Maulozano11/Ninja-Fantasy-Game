p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hair.ts'
s = open(p).read()
old = s[s.index("      // the braid from the near temple down over the shoulder, tied off with a short tuft"):s.index("    },\n  ),\n  {\n    id: 'hair_ribbon',")]
new = '''      // a braid from the near temple down over the chest, tied off above a short tuft
      const F = g.L('hairFront');
      const pen: Pen = { ...P.f, part: 'back' };
      const [tx, ty] = toHead(g, g.rig.T(-g.bp.shoulderHalf * 0.25, g.bp.torsoLen - 9));
      for (const [dx, len, w] of [[-1.5, 2.6, 1.6], [1.4, 2.3, 1.5], [0, 3.6, 1.8]]) {
        hlock(g, F, [tx + dx * 0.3, ty, tx + dx * 0.7, ty + len * 0.5, tx + dx, ty + len], w, pen, { hold: 0.2, tipW: 0.5, light: 1, tipDark: false });
      }
      hbraid(g, F, [-3.6, -1.4, -3.4, 6, tx, ty], 4.3, pen, { tipW: 3.4 });
      // the tie: a dark band pinching the end of the braid
      const l = Math.hypot(tx + 3.4, ty - 6) || 1;
      const [ux, uy] = [(tx + 3.4) / l, (ty - 6) / l];
      const band = (hw: number, hh: number): [number, number][] => [
        [tx - uy * hw - ux * hh, ty + ux * hw - uy * hh],
        [tx + uy * hw - ux * hh, ty - ux * hw - uy * hh],
        [tx + uy * hw + ux * hh, ty - ux * hw + uy * hh],
        [tx - uy * hw + ux * hh, ty + ux * hw + uy * hh],
      ];
      hpoly(g, F, band(1.55, 0.95), pen, 0);
      hpoly(g, F, band(1.15, 0.35), pen, 2);
'''
s = s.replace(old, new)
s = s.replace("import { hairTemplate, hbraid, hd, hlock, lock, LockOpts } from './hairkit';", "import { hairTemplate, hbraid, hd, hlock, hpoly, lock, LockOpts } from './hairkit';")
open(p, 'w').write(s)
