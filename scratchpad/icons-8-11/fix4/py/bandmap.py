"""bandmap.py <id> <N> <dir> Lmin Lmax Cmin Cmax Hlo Hhi: for cells where his box is in the band, what ours are (counts), and
for cells where ours are in the band, what his are."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
import m
from collections import Counter

jid, N, d = sys.argv[1], int(sys.argv[2]), sys.argv[3]
Lmin, Lmax, Cmin, Cmax, Hlo, Hhi = map(float, sys.argv[4:10])


def band(a):
    L, C, H = m.lch(a)
    hm = (H >= Hlo) & (H <= Hhi) if Hlo <= Hhi else (H >= Hlo) | (H <= Hhi)
    return (L >= Lmin) & (L <= Lmax) & (C >= Cmin) & (C <= Cmax) & hm


his, ours = m.his(jid, N), m.ours(jid, N, d)
bh, bo = band(his), band(ours)
print('his in band', bh.sum(), 'ours in band', bo.sum(), 'both', (bh & bo).sum())
c = Counter(m.hexc(ours[y, x]) for y, x in zip(*np.nonzero(bh & ~bo)))
print('his in band, ours not:', ' '.join(f'{k}:{v}' for k, v in c.most_common(12)))
c = Counter(m.hexc(his[y, x]) for y, x in zip(*np.nonzero(bh & ~bo)))
print('  (his there):', ' '.join(f'{k}:{v}' for k, v in c.most_common(12)))
c = Counter(m.hexc(ours[y, x]) for y, x in zip(*np.nonzero(bo)))
print('ours in band:', ' '.join(f'{k}:{v}' for k, v in c.most_common(12)))
