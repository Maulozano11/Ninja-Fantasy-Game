import sys, os, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

D = sys.argv[1]
S = 115


def oklab(a):
    a = a / 255.0
    l = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    R, G, B = l[..., 0], l[..., 1], l[..., 2]
    L_ = np.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
    M_ = np.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
    S_ = np.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
    return np.stack([0.2104542553 * L_ + 0.793617785 * M_ - 0.0040720468 * S_, 1.9779984951 * L_ - 2.428592205 * M_ + 0.4505937099 * S_, 0.0259040371 * L_ + 0.7827717662 * M_ - 0.808675766 * S_], -1)


def morph(v, r, mx):
    h, w = v.shape
    p = np.pad(v, r, mode='edge')
    st = [p[r + dy:r + dy + h, r + dx:r + dx + w] for dy in range(-r, r + 1) for dx in range(-r, r + 1)]
    return np.max(st, 0) if mx else np.min(st, 0)


for j in sys.argv[2:]:
    a = np.asarray(Image.open(f'{D}/{j}@window.png').convert('RGB')).astype(float)
    L = oklab(a)[..., 0]
    h, w = L.shape
    for r in (1, 2, 3):
        th = np.clip(L - morph(morph(L, r, False), r, True), 0, None)
        print(j, 'tophat r=%d sum lost:' % r, ' '.join('%d:%.2f' % (o, th[:, [c for c in range(w) if not o <= c < o + S]].sum()) for o in range(0, w - S + 1)))
    ab = np.clip(L - 0.5, 0, None)
    print(j, 'L-0.5 sum lost:', ' '.join('%d:%.2f' % (o, ab[:, [c for c in range(w) if not o <= c < o + S]].sum()) for o in range(0, w - S + 1)))
