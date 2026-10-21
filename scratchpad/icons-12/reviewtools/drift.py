import sys, os
import numpy as np
from PIL import Image

def gaussian_filter(a, s):
    r = int(np.ceil(3*s)); x = np.arange(-r, r+1); k = np.exp(-x*x/(2*s*s)); k /= k.sum()
    p = np.pad(a, r, mode='reflect')
    p = np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 0, p)
    return np.apply_along_axis(lambda v: np.convolve(v, k, 'valid'), 1, p)
A, O = sys.argv[1:3]
def oklab(a):
    a = a / 255.0
    l = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    R, G, B = l[..., 0], l[..., 1], l[..., 2]
    L_ = np.cbrt(0.4122214708*R + 0.5363325363*G + 0.0514459929*B)
    M_ = np.cbrt(0.2119034982*R + 0.6806995451*G + 0.1073969566*B)
    S_ = np.cbrt(0.0883024619*R + 0.2817188376*G + 0.6299787005*B)
    return np.stack([0.2104542553*L_ + 0.793617785*M_ - 0.0040720468*S_, 1.9779984951*L_ - 2.428592205*M_ + 0.4505937099*S_, 0.0259040371*L_ + 0.7827717662*M_ - 0.808675766*S_], -1)
for jid in ['lightning_hound_raidon', 'crescent_moon_dance', 'temple_of_nirvana']:
    for n, f in ((88, '@2x'), (44, '')):
        ours = np.asarray(Image.open(os.path.join(A, jid + f + '.png')).convert('RGB')).astype(float)
        his = np.load(os.path.join(O, '%s_b%d.npy' % (jid, n)))
        lo, lh = oklab(ours), oklab(his)
        s = n / 30
        bo = np.stack([gaussian_filter(lo[..., k], s) for k in range(3)], -1)
        bh = np.stack([gaussian_filter(lh[..., k], s) for k in range(3)], -1)
        d = bo - bh
        de = np.sqrt((d ** 2).sum(-1)) * 100
        C = lambda x: np.hypot(x[..., 1], x[..., 2])
        H = lambda x: np.degrees(np.arctan2(x[..., 2], x[..., 1])) % 360
        print(jid, n, 'meanDE %.2f p95 %.2f max %.2f' % (de.mean(), np.percentile(de, 95), de.max()),
              'dL %+.3f dC %+.3f' % (d[..., 0].mean(), (C(bo) - C(bh)).mean()), 'hue ours %.0f his %.0f' % (np.median(H(lo)), np.median(H(lh))))
        # where the drift is: quadrants
        q = n // 4
        grid = de.reshape(4, q, 4, q).mean((1, 3))
        print('   DE by 4x4 cells:\n', np.round(grid, 1))
        dl = d[..., 0].reshape(4, q, 4, q).mean((1, 3)) * 100
        dc = (C(bo) - C(bh)).reshape(4, q, 4, q).mean((1, 3)) * 100
        print('   dL x100:\n', np.round(dl, 1)); print('   dC x100:\n', np.round(dc, 1))
        hm = np.clip(de / 8 * 255, 0, 255).astype(np.uint8)
        Image.fromarray(hm).resize((n * 4, n * 4), Image.NEAREST).save(os.path.join(O, '%s-drift%d.png' % (jid, n)))
