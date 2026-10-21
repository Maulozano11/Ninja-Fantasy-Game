"""probe.py <id> <n> <dir> Lmin Lmax Cmin Cmax Hlo Hhi [x0 y0 x1 y1]: share of pixels in an LCH band (his reduction vs ours)."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
import m
jid, n, d = sys.argv[1], int(sys.argv[2]), sys.argv[3]
Lmin, Lmax, Cmin, Cmax, Hlo, Hhi = map(float, sys.argv[4:10])
box = list(map(int, sys.argv[10:14])) if len(sys.argv) > 13 else [0, 0, n, n]


def band(a):
    a = a[box[1]:box[3], box[0]:box[2]]
    L, C, H = m.lch(a)
    hm = (H >= Hlo) & (H <= Hhi) if Hlo <= Hhi else (H >= Hlo) | (H <= Hhi)
    k = (L >= Lmin) & (L <= Lmax) & (C >= Cmin) & (C <= Cmax) & hm
    return k.sum(), k.mean() * 100


for name, a in (('his', m.his(jid, n)), ('ours', m.ours(jid, n, d))):
    c, p = band(a)
    print('%-5s %4d px %.2f%%' % (name, c, p))
