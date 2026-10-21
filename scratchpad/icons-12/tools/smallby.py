"""Counts the 1-2 px areas of one colour of an icon by colour, and how many are lighter than their ring by >= 0.1.

usage: python3 -I smallby.py <png> [<png> ...]
"""
import sys
from collections import Counter

import numpy as np
from PIL import Image

exec(open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-12/tools/measure12.py').read().split('S, A, TAG')[0].split('WT = ')[0])


def oklab(a):
    a = a / 255.0
    l = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    R, G, B = l[..., 0], l[..., 1], l[..., 2]
    L_ = np.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
    M_ = np.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
    S_ = np.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
    return 0.2104542553 * L_ + 0.793617785 * M_ - 0.0040720468 * S_


def comps(idx):
    h, w = idx.shape
    lab = -np.ones((h, w), int)
    sizes = []
    for y in range(h):
        for x in range(w):
            if lab[y, x] >= 0:
                continue
            n = len(sizes)
            st = [(y, x)]
            lab[y, x] = n
            c = 0
            while st:
                cy, cx = st.pop()
                c += 1
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = cy + dy, cx + dx
                        if 0 <= yy < h and 0 <= xx < w and lab[yy, xx] < 0 and idx[yy, xx] == idx[cy, cx]:
                            lab[yy, xx] = n
                            st.append((yy, xx))
            sizes.append(c)
    return lab, np.array(sizes)


for f in sys.argv[1:]:
    rgb = np.asarray(Image.open(f).convert('RGB'))
    key = (rgb[..., 0].astype(int) << 16) | (rgb[..., 1].astype(int) << 8) | rgb[..., 2].astype(int)
    L = oklab(rgb.astype(float))
    lab, sz = comps(key)
    h, w = key.shape
    allc, brc = Counter(), Counter()
    for n in np.nonzero(sz <= 2)[0]:
        ys, xs = np.nonzero(lab == n)
        col = '#%06x' % key[ys[0], xs[0]]
        allc[col] += 1
        ring = [L[y + dy, x + dx] for y, x in zip(ys, xs) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if 0 <= y + dy < h and 0 <= x + dx < w and lab[y + dy, x + dx] != n]
        if ring and L[ys[0], xs[0]] - np.mean(ring) >= 0.1:
            brc[col] += 1
    print(f, 'small', sum(allc.values()), 'bright', sum(brc.values()))
    for col, n in sorted(allc.items(), key=lambda kv: -kv[1]):
        r, g, b = int(col[1:3], 16), int(col[3:5], 16), int(col[5:7], 16)
        print('  %s L %.2f small %4d bright %4d' % (col, oklab(np.array([r, g, b], float)), n, brc[col]))
