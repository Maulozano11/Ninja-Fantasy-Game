"""The distinct colours of a region of one of his windows, most frequent first, with OKLab L and C."""
import sys
from collections import Counter
import numpy as np
from PIL import Image


def oklab(rgb):
    c = np.asarray(rgb, float) / 255
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = np.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2])
    m = np.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2])
    s = np.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2])
    L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    return L, np.hypot(a, b), (np.degrees(np.arctan2(b, a)) + 360) % 360


src = sys.argv[1]
x0, y0, x1, y1 = map(int, sys.argv[2:6])
n = int(sys.argv[6]) if len(sys.argv) > 6 else 40
a = np.asarray(Image.open(src).convert('RGB'))[y0:y1, x0:x1].reshape(-1, 3)
cnt = Counter(tuple(int(v) for v in p) for p in a)
rows = []
for c, k in cnt.most_common():
    L, C, h = oklab(c)
    rows.append((L, C, h, k, c))
rows.sort(key=lambda r: -r[3])
for L, C, h, k, c in rows[:n]:
    print('#%02x%02x%02x  n=%3d  L=%.2f C=%.3f h=%3.0f' % (c + (k, L, C, h)))
