"""The wolf: his lightning kept by a 115 square at each placement, and by wider sources squeezed to 88x88."""
import sys, os, numpy as np
from PIL import Image

D = sys.argv[1]


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


a = np.asarray(Image.open(f'{D}/lightning_hound_raidon@window.png').convert('RGB')).astype(float)
L = oklab(a)[..., 0]
h, w = L.shape
th = L - morph(morph(L, 1, False), 1, True)
defs = {'white L>=0.86': L >= 0.86, 'cyan+white L>=0.6': L >= 0.6, 'bright union': (L >= 0.86) | ((th >= 0.08) & (L >= 0.5))}
print('per column L>=0.86, cols 130..143:', [int((L[:, c] >= 0.86).sum()) for c in range(130, 144)])
print('per column L>=0.6,  cols 130..143:', [int((L[:, c] >= 0.6).sum()) for c in range(130, 144)])
for name, m in defs.items():
    tot = m.sum()
    print(name, 'total', tot)
    for x0, x1 in [(29, 144), (25, 140), (20, 140), (15, 140), (10, 140), (0, 140), (0, 144)]:
        lost = tot - m[:, x0:x1].sum()
        print('   source columns %3d..%3d (%3d wide, squeeze %5.1f%%): lost %4d (%.1f%%), columns 0..24 hold %d' % (x0, x1 - 1, x1 - x0, 100 * ((x1 - x0) / 115 - 1), lost, 100 * lost / tot, m[:, 0:25].sum()))
