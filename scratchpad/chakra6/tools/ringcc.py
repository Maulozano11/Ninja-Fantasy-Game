# Pieces of the third ring per frame: pixels on its ellipse (|d| <= 1.2) brighter than the haze
# just inside and outside it (3-5 px off the line), 8-connected; pieces of >= 3 px.
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
import ck, numpy as np
from goldcc import cc
fs = ck.frames('blast', 'blast')
cx, cy, rx, ry = 94.13, 134.79, 39.47, 25.29
H, W = fs[0].shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
X = xx + .5 - cx; Y = yy + .5 - cy
th = np.arctan2(Y / ry, X / rx)
d = (np.hypot(X / rx, Y / ry) - 1) * np.hypot(rx * np.cos(th), ry * np.sin(th))
band = np.abs(d) <= 1.2
off = (np.abs(d) >= 3) & (np.abs(d) <= 5)
res = []
for f in fs:
    L = ck.on_bg(f, (30, 29, 37))[..., :3] @ [0.3, 0.59, 0.11]
    # local haze level by angle sector
    sec = ((th + np.pi) / (2 * np.pi) * 24).astype(int) % 24
    lit = np.zeros_like(band)
    for s in range(24):
        hz = np.median(L[off & (sec == s)]) if (off & (sec == s)).any() else 0
        lit |= band & (sec == s) & (L > hz + 12)
    sizes = [v for v in cc(lit) if v >= 3]
    res.append(len(sizes))
print('third-ring pieces per frame:', res)
