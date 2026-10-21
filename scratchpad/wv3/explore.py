import numpy as np, colorsys, sys
from PIL import Image
IM = np.asarray(Image.open('../art2/REF-wind-set-owner.jpg').convert('RGB')).astype(np.float64)
def gauss(a, s):
    r = max(1, int(round(s * 3)))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    out = a.astype(np.float64)
    for ax in (0, 1):
        pad = [(0, 0)] * out.ndim; pad[ax] = (r, r)
        p = np.pad(out, pad, mode='edge')
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            sl = [slice(None)] * out.ndim; sl[ax] = slice(i, i + out.shape[ax])
            acc += w * p[tuple(sl)]
        out = acc
    return out
def hsv(c):
    r, g, b = c[..., 0] / 255, c[..., 1] / 255, c[..., 2] / 255
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0)
    return h, s, mx
x0, y0, x1, y1 = map(int, sys.argv[1:5]); k = int(sys.argv[5]); out = sys.argv[6]
c = gauss(IM, 0.6)[y0:y1, x0:x1]
h, s, v = hsv(c)
L = 0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]
B = np.array([32, 32, 42.])
dif = np.abs(c - B).sum(-1)
cls = np.zeros(L.shape, int)
wind = (h > 140) & (h < 200) & (c[..., 1] - c[..., 0] > 8)
leaf = (h >= 70) & (h <= 140) & (s > 0.18) & (L > 45)
dust = (h >= 20) & (h < 70) & (L > 50) & (s < 0.35)
cls[wind & (L >= 58)] = 1
cls[wind & (L < 58)] = 2
cls[leaf] = 3
cls[dust] = 4
cols = np.array([[0, 0, 0], [120, 230, 190], [30, 90, 80], [230, 230, 40], [170, 110, 60]])
vis = cols[cls].astype(np.uint8)
both = np.concatenate([c.astype(np.uint8), vis], 1)
Image.fromarray(both).resize((both.shape[1] * k, both.shape[0] * k), Image.NEAREST).save(out)
