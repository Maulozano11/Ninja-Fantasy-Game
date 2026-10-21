p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hair.ts'
s = open(p).read()
start = s.index("      // head-local point `a` further along the end of the braid and `c` across it")
end = s.index("    },\n  ),\n  {\n    id: 'hair_ribbon',")
new = '''      const Q = (globalThis as any).__braidV || {};
      hbraid(g, F, [-3.6, -1.4, -2.8, 6, tx, ty], 4.3, pen, { tipW: 3.4 });
      hstamp(g, F, Q.stamp ?? BRAID_END, Q.ax ?? 3, Q.ay ?? 1, tx, ty, pen);
'''
s = s[:start] + new + s[end:]
s = s.replace("import { hairTemplate, hbraid, hd, hlock, hpoly, lock, LockOpts } from './hairkit';", "import { hairTemplate, hbraid, hd, hlock, hstamp, lock, LockOpts } from './hairkit';")
# the stamp, right before the hairStyle helper
anchor = "/** A templated style; `body` draws under the template, `over` on top of it. */"
stamp = '''// The tie and the short tuft at the end of a braid (fine pixels; cell (3, 1) sits on the braid's tip).
const BRAID_END = [
  '.00000.',
  '.01210.',
  '0233320',
  '0344320',
  '0343210',
  '.03020.',
  '..0.0..',
];

'''
s = s.replace(anchor, stamp + anchor)
open(p, 'w').write(s)
