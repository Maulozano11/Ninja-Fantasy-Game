p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hair.ts'
s = open(p).read()
old1 = """      for (const [c, len, w] of [[-2, 3.4, 1.8], [1.8, 3, 1.7], [0, 4.4, 2]]) {
        hlock(g, F, [...at(0, c * 0.3), ...at(len * 0.5, c * 0.7), ...at(len, c)], w, pen, { hold: 0.2, tipW: 0.5, light: 1, tipDark: false });
      }"""
new1 = """      const Q = (globalThis as any).__braidV || {};
      for (const [c, len, w, tw] of Q.tuft ?? [[-2, 3.4, 1.8, 0.5], [1.8, 3, 1.7, 0.5], [0, 4.4, 2, 0.5]]) {
        hlock(g, F, [...at(Q.t0 ?? 0, c * 0.3), ...at(len * 0.5, c * 0.7), ...at(len, c)], w, pen, { hold: Q.th ?? 0.2, tipW: tw, light: Q.tl ?? 1, tipDark: false, clumps: Q.tc });
      }"""
assert old1 in s
s = s.replace(old1, new1)
old2 = """      hpoly(g, F, band(1.55, 0.95), pen, 0);
      hpoly(g, F, band(1.15, 0.35), pen, 2);"""
new2 = """      hpoly(g, F, band(Q.bw0 ?? 1.55, Q.bh0 ?? 0.95), pen, 0);
      hpoly(g, F, band(Q.bw1 ?? 1.15, Q.bh1 ?? 0.35), pen, Q.bs ?? 2);"""
assert old2 in s
s = s.replace(old2, new2)
open(p, 'w').write(s)
