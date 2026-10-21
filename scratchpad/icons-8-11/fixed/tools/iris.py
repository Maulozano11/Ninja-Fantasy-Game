"""iris.py <dir>...: bright-red pixels inside Command's iris (his reduction vs ours), several thresholds."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
import m
J = 'northstar_command'
for n in (88, 44):
    k = n / 127
    cx, cy, r = 60 * k, 59 * k, 16.5 * k
    yy, xx = np.mgrid[0:n, 0:n]
    disk = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy) <= r
    rows = [('his', m.his(J, n))] + [(d.split('/')[-1], m.ours(J, n, d)) for d in sys.argv[1:]]
    for nm, a in rows:
        L, C, H = m.lch(a)
        out = []
        for lmin, cmin in ((0.55, 0.21), (0.58, 0.22), (0.6, 0.23)):
            kk = disk & (L >= lmin) & (C >= cmin) & (H > 15) & (H < 40)
            out.append('L>=%.2f C>=%.2f: %3d' % (lmin, cmin, kk.sum()))
        print(n, '%-6s' % nm, ' | '.join(out), '| disk', disk.sum())
