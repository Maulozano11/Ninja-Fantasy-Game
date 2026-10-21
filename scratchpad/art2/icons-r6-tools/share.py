# share.py lib work id N x0 y0 x1 y1 hi lo : per N-pixel share of his pixels with L>hi ('W' >=.5, 'w' >=.3) and L<lo ('N' >=.5, 'n' >=.3), else '.'
import sys, numpy as np
sys.path.insert(0, sys.argv[1])
from lib import *
W, iid, N = sys.argv[2], sys.argv[3], int(sys.argv[4])
x0, y0, x1, y1 = [int(v) for v in sys.argv[5:9]]
hi, lo = float(sys.argv[9]), float(sys.argv[10])
src = load_his(W + f'/out/ref/{iid}.png')
L = oklab(src)[..., 0]
H, Wd = L.shape
S = 8
def share(m):
    out = np.zeros((N, N))
    ys = ((np.arange(N * S) + 0.5) / S * H / N).astype(int); xs = ((np.arange(N * S) + 0.5) / S * Wd / N).astype(int)
    mm = m[ys][:, xs].astype(float)
    return mm.reshape(N, S, N, S).mean(axis=(1, 3))
sw, sn = share(L > hi), share(L < lo)
print('    ' + ''.join(str(x % 10) for x in range(x0, x1)))
for y in range(y0, y1):
    print(f'{y:3d} ' + ''.join('W' if sw[y, x] >= .5 else 'N' if sn[y, x] >= .5 else 'w' if sw[y, x] >= .3 else 'n' if sn[y, x] >= .3 else '.' for x in range(x0, x1)))
