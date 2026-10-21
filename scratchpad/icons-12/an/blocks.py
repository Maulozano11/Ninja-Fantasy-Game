"""8x8 block colour difference (mean OKLab x100) of an 88 icon against his square box-reduced to 88.

usage: blocks.py <ref dir> <icon@2x.png> [id]
"""
import sys
import numpy as np
from PIL import Image

ref, icon = sys.argv[1], sys.argv[2]
jid = sys.argv[3] if len(sys.argv) > 3 else 'lightning_hound_raidon'


def oklab(a):
    a = a / 255.0
    l = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    R, G, B = l[..., 0], l[..., 1], l[..., 2]
    L_ = np.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
    M_ = np.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
    S_ = np.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
    return np.stack([0.2104542553 * L_ + 0.793617785 * M_ - 0.0040720468 * S_, 1.9779984951 * L_ - 2.428592205 * M_ + 0.4505937099 * S_, 0.0259040371 * L_ + 0.7827717662 * M_ - 0.808675766 * S_], -1)


def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(float)


def box(a, n):
    """area mean to n x n (exact coverage weights)."""
    h, w = a.shape[:2]
    def wts(src, n):
        m = np.zeros((n, src))
        s = src / n
        for i in range(n):
            x0, x1 = i * s, (i + 1) * s
            for j in range(int(np.floor(x0)), int(np.ceil(x1))):
                m[i, j] = min(x1, j + 1) - max(x0, j)
        return m / m.sum(1, keepdims=True)
    Wy, Wx = wts(h, n), wts(w, n)
    return np.einsum('yh,hwc,xw->yxc', Wy, a, Wx)


def blocks(a, b, k=8, rgbmean=False):
    n = a.shape[0] // k
    if rgbmean:
        A = oklab(a[:n * k, :n * k].reshape(n, k, n, k, 3).mean((1, 3)))
        B = oklab(b[:n * k, :n * k].reshape(n, k, n, k, 3).mean((1, 3)))
    else:
        A = oklab(a)[:n * k, :n * k].reshape(n, k, n, k, 3).mean((1, 3))
        B = oklab(b)[:n * k, :n * k].reshape(n, k, n, k, 3).mean((1, 3))
    d = np.linalg.norm(A - B, axis=-1) * 100
    dl = (A[..., 0] - B[..., 0]) * 100
    return d.mean(), dl


ours = load(icon)
hisSq = load(f'{ref}/{jid}.png')        # his pixels
sheet = load(f'{ref}/{jid}@sheet.png')  # the sheet's crop
H1 = box(hisSq, 88)
H2 = box(sheet, 88)
for name, H in (('his pixels box88', H1), ('sheet crop box88', H2)):
    for rm in (False, True):
        m, dl = blocks(ours, H, rgbmean=rm)
        print('%-18s %s: ours %.2f' % (name, 'rgb-mean' if rm else 'lab-mean', m))
m, dl = blocks(ours, H1)
np.set_printoptions(precision=1, suppress=True, linewidth=200)
print('lightness diff per 8x8 block (ours - his, x100):')
print(dl)
