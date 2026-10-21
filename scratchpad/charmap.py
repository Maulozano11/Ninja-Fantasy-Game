"""A character map of part of one of his windows: each pixel by lightness and hue, to trace shapes."""
import sys
import numpy as np
from PIL import Image


def oklab(c):
    c = np.asarray(c, float) / 255
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = np.cbrt(0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2])
    m = np.cbrt(0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2])
    s = np.cbrt(0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2])
    L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    return L, a, b


src = sys.argv[1]
x0, y0, x1, y1 = map(int, sys.argv[2:6])
a = np.asarray(Image.open(src).convert('RGB'))[y0:y1, x0:x1]
L, A, B = oklab(a)
C = np.hypot(A, B)
H = (np.degrees(np.arctan2(B, A)) + 360) % 360
print('    ' + ''.join(str((x0 + i) // 10 % 10) if (x0 + i) % 10 == 0 else ' ' for i in range(x1 - x0)))
print('    ' + ''.join(str((x0 + i) % 10) for i in range(x1 - x0)))
for j in range(y1 - y0):
    row = ''
    for i in range(x1 - x0):
        l, c, h = L[j, i], C[j, i], H[j, i]
        if l < 0.2 and (c < 0.06 or 200 < h < 330):
            ch = '#'  # navy / near black
        elif l < 0.3:
            ch = 'd'  # very dark red
        elif l > 0.85 and c < 0.05:
            ch = 'W'
        elif l > 0.75:
            ch = 'p'  # pale pink
        elif l > 0.62:
            ch = 'P'  # light red / pink
        elif l > 0.52:
            ch = 'R'  # bright red
        elif l > 0.42:
            ch = 'r'  # red
        else:
            ch = 'm'  # dark red / maroon
        row += ch
    print('%3d %s' % (y0 + j, row))
