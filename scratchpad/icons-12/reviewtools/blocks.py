import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
A, O, jid, n, B = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
def oklab(a):
    a = a / 255.0
    l = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    R, G, Bb = l[..., 0], l[..., 1], l[..., 2]
    L_ = np.cbrt(0.4122214708*R + 0.5363325363*G + 0.0514459929*Bb)
    M_ = np.cbrt(0.2119034982*R + 0.6806995451*G + 0.1073969566*Bb)
    S_ = np.cbrt(0.0883024619*R + 0.2817188376*G + 0.6299787005*Bb)
    return np.stack([0.2104542553*L_ + 0.793617785*M_ - 0.0040720468*S_, 1.9779984951*L_ - 2.428592205*M_ + 0.4505937099*S_, 0.0259040371*L_ + 0.7827717662*M_ - 0.808675766*S_], -1)
f = '@2x' if n == 88 else ''
ours = oklab(np.asarray(Image.open(os.path.join(A, jid + f + '.png')).convert('RGB')).astype(float))
his = oklab(np.load(os.path.join(O, '%s_b%d.npy' % (jid, n))))
k = n // B
mo = ours.reshape(B, k, B, k, 3).mean((1, 3)); mh = his.reshape(B, k, B, k, 3).mean((1, 3))
C = lambda x: np.hypot(x[..., 1], x[..., 2]); H = lambda x: np.degrees(np.arctan2(x[..., 2], x[..., 1])) % 360
print('block size', k, 'px; rows = y blocks')
print('dL x100'); print(np.round((mo[..., 0] - mh[..., 0]) * 100, 1))
print('dC x100'); print(np.round((C(mo) - C(mh)) * 100, 1))
dh = (H(mo) - H(mh) + 180) % 360 - 180
print('dHue deg'); print(np.round(dh).astype(int))
print('his hue'); print(np.round(H(mh)).astype(int))
de = np.sqrt(((mo - mh) ** 2).sum(-1)) * 100
print('DE x100'); print(np.round(de, 1))
