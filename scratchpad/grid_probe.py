import sys, numpy as np
from PIL import Image


def spectrum(g, lo=1.8, hi=40):
    g = g - g.mean()
    n = 1 << 15
    f = np.abs(np.fft.rfft(g, n=n))
    fr = np.fft.rfftfreq(n)
    m = (fr > 1 / hi) & (fr < 1 / lo)
    idx = np.argsort(np.where(m, f, 0))[::-1][:6]
    return [(round(1 / fr[i], 3), round(float(f[i]), 1)) for i in idx]


for p in sys.argv[1:]:
    a = np.asarray(Image.open(p).convert('RGB')).astype(float)
    L = a.mean(2)
    gx = np.abs(np.diff(L, axis=1)).mean(0)
    gy = np.abs(np.diff(L, axis=0)).mean(1)
    print(p.split('/')[-1], a.shape, 'x', spectrum(gx, 1.8, 12), 'y', spectrum(gy, 1.8, 12))
