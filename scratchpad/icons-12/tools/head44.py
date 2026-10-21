"""His box 44 beside our 44 around the wolf's head (hex per pixel).

usage: python3 -I head44.py <stage> <icon png> [x0 x1 y0 y1]
"""
import sys

import numpy as np
from PIL import Image


def box(a, n):
    a = a.astype(float)
    s = a.shape[0] / n
    o = np.zeros((n, n, 3))
    for y in range(n):
        for x in range(n):
            y0, y1, x0, x1 = y * s, (y + 1) * s, x * s, (x + 1) * s
            acc = np.zeros(3)
            wt = 0
            for yy in range(int(y0), int(np.ceil(y1))):
                wy = min(y1, yy + 1) - max(y0, yy)
                for xx in range(int(x0), int(np.ceil(x1))):
                    wx = min(x1, xx + 1) - max(x0, xx)
                    acc += a[yy, xx] * wx * wy
                    wt += wx * wy
            o[y, x] = acc / wt
    return np.clip(o + 0.5, 0, 255).astype(np.uint8)


S, f = sys.argv[1], sys.argv[2]
x0, x1, y0, y1 = (int(v) for v in sys.argv[3:7]) if len(sys.argv) > 6 else (30, 42, 17, 26)
sq = np.asarray(Image.open(S + '/ref/lightning_hound_raidon.png').convert('RGB'))
b = box(sq, 44)
o = np.asarray(Image.open(f).convert('RGB'))
print('    ', ' '.join('%6d' % x for x in range(x0, x1)))
for y in range(y0, y1):
    print('%2d his' % y, ' '.join('%02x%02x%02x' % tuple(b[y, x]) for x in range(x0, x1)))
    print('%2d our' % y, ' '.join('%02x%02x%02x' % tuple(o[y, x]) for x in range(x0, x1)))
