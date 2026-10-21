p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hair.ts'
s = open(p).read()
old = s[s.index("      const [tx, ty] = toHead(g, g.rig.T(-g.bp.shoulderHalf * 0.25, g.bp.torsoLen - 9));"):s.index("      // the tie: a dark band pinching the end of the braid")]
new = """      const Q = (globalThis as any).__braidV || {};
      const [tx, ty] = toHead(g, g.rig.T(-g.bp.shoulderHalf * (Q.tipK ?? 0.25), g.bp.torsoLen - (Q.tipY ?? 9)));
      for (const [dx, len, w] of Q.tuft ?? [[-1.5, 2.6, 1.6], [1.4, 2.3, 1.5], [0, 3.6, 1.8]]) {
        hlock(g, F, [tx + dx * 0.3, ty, tx + dx * 0.7, ty + len * 0.5, tx + dx, ty + len], w, pen, { hold: 0.2, tipW: 0.5, light: Q.tlight ?? 1, tipDark: false, clumps: Q.tclumps });
      }
      const CX = Q.cx ?? -3.4;
      hbraid(g, F, [Q.rx ?? -3.6, Q.ry ?? -1.4, CX, 6, tx, ty], 4.3, pen, { tipW: 3.4 });
"""
s = s.replace(old, new)
s = s.replace("      const l = Math.hypot(tx + 3.4, ty - 6) || 1;\n      const [ux, uy] = [(tx + 3.4) / l, (ty - 6) / l];",
              "      const l = Math.hypot(tx - CX, ty - 6) || 1;\n      const [ux, uy] = [(tx - CX) / l, (ty - 6) / l];")
s = s.replace("      hpoly(g, F, band(1.55, 0.95), pen, 0);\n      hpoly(g, F, band(1.15, 0.35), pen, 2);",
              "      hpoly(g, F, band(Q.tw0 ?? 1.55, Q.th0 ?? 0.95), pen, 0);\n      hpoly(g, F, band(Q.tw1 ?? 1.15, Q.th1 ?? 0.35), pen, Q.tsh ?? 2);")
open(p, 'w').write(s)
