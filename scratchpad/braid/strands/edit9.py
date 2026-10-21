p = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-2/src/sprite/items/hair.ts'
s = open(p).read()
old = """      const Q = (globalThis as any).__braidV || {};
      hbraid(g, F, [-3.6, -1.4, -2.8, 6, tx, ty], 4.3, pen, { tipW: 3.4 });
      hstamp(g, F, Q.stamp ?? BRAID_END, Q.ax ?? 3, Q.ay ?? 1, tx, ty, pen);
"""
new = """      hbraid(g, F, [-3.6, -1.4, -2.8, 6, tx, ty], 4.3, pen, { tipW: 3.4 });
      hstamp(g, F, BRAID_END, 3, 1, tx, ty, pen);
"""
assert old in s
s = s.replace(old, new)
old2 = """const BRAID_END = [
  '.00000.',
  '.01210.',
  '0233320',
  '0344320',
  '0343210',
  '.03020.',
  '..0.0..',
];"""
new2 = """const BRAID_END = [
  '.00000.',
  '.01210.',
  '.00000.',
  '0344320',
  '0342210',
  '.03020.',
  '..0.0..',
];"""
assert old2 in s
s = s.replace(old2, new2)
open(p, 'w').write(s)
