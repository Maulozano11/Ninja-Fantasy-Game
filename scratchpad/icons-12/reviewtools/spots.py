import sys, os
import numpy as np
from PIL import Image
A, O, jid, n = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
def oklab(a):
    a = a / 255.0
    l = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    R, G, Bb = l[..., 0], l[..., 1], l[..., 2]
    L_ = np.cbrt(0.4122214708*R + 0.5363325363*G + 0.0514459929*Bb)
    M_ = np.cbrt(0.2119034982*R + 0.6806995451*G + 0.1073969566*Bb)
    S_ = np.cbrt(0.0883024619*R + 0.2817188376*G + 0.6299787005*Bb)
    return np.stack([0.2104542553*L_ + 0.793617785*M_ - 0.0040720468*S_, 1.9779984951*L_ - 2.428592205*M_ + 0.4505937099*S_, 0.0259040371*L_ + 0.7827717662*M_ - 0.808675766*S_], -1)
def blur(a, s):
    r = int(np.ceil(3*s)); x = np.arange(-r, r+1); k = np.exp(-x*x/(2*s*s)); k /= k.sum()
    p = np.pad(a, ((r, r), (r, r), (0, 0)), mode='reflect')
    p = np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 0, p)
    return np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 1, p)
f = '@2x' if n == 88 else ''
o = oklab(np.asarray(Image.open(os.path.join(A, jid + f + '.png')).convert('RGB')).astype(float))
h = oklab(np.load(os.path.join(O, '%s_b%d.npy' % (jid, n))))
s = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
d = blur(o, s) - blur(h, s)
de = np.sqrt((d ** 2).sum(-1)) * 100
idx = np.argsort(de.ravel())[::-1]
seen = []
for i in idx:
    y, x = divmod(i, n)
    if any(abs(y - yy) < 4 and abs(x - xx) < 4 for yy, xx in seen): continue
    seen.append((y, x))
    print('x=%d y=%d DE=%.1f dL=%+.1f' % (x, y, de[y, x], d[y, x, 0] * 100))
    if len(seen) >= 10: break
