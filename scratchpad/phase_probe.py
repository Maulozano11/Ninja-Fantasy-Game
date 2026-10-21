"""Grid pitch and phase per region of a sheet (sheet pixels), to see if each slot sits on one grid."""
import sys
import numpy as np
from PIL import Image


def spectrum_pitch(g, lo=3.5, hi=5):
    g = g - g.mean()
    n = 1 << 16
    f = np.abs(np.fft.rfft(g, n=n))
    fr = np.fft.rfftfreq(n)
    m = (fr > 1 / hi) & (fr < 1 / lo)
    return float(1 / fr[np.argmax(np.where(m, f, 0))])


def phase(g, p, off):
    best = None
    for t in range(int(p * 40)):
        ph = t / 40
        idx = [int(np.floor(ph + k * p)) - 1 - off for k in range(1, 600)]
        idx = [i for i in idx if 0 <= i < len(g)]
        e = float(g[idx].mean())
        if best is None or e > best[0]:
            best = (e, ph)
    return round(best[1], 3), round(best[0] / float(g.mean()), 3)


path = sys.argv[1]
a = np.asarray(Image.open(path).convert('RGB')).astype(float)
L = a.mean(2)
for box in sys.argv[2:]:
    x0, y0, x1, y1 = map(int, box.split(','))
    sub = L[y0:y1, x0:x1]
    gx = np.abs(np.diff(sub, axis=1)).mean(0)
    gy = np.abs(np.diff(sub, axis=0)).mean(1)
    px, py = 2000 / 480, 1116 / 268
    print(box, 'pitch', round(spectrum_pitch(gx), 4), round(spectrum_pitch(gy), 4), 'phase x', phase(gx, px, x0), 'phase y', phase(gy, py, y0))
