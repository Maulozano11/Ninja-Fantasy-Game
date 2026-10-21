"""His pixels under some 44 cells: for each cell (x, y) of the 44 grid, the hex of his pixels whose centres fall in it, and the box mean.

usage: cells.py <his square png> <our 44 png> x0 y0 x1 y1   (44 coordinates, inclusive)
"""
import sys
import numpy as np
from PIL import Image

his = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
ours = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(int)
x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
N = 44
s = his.shape[0] / N
for y in range(y0, y1 + 1):
    for x in range(x0, x1 + 1):
        px = []
        for yy in range(his.shape[0]):
            if min(N - 1, int((yy + 0.5) / s)) != y:
                continue
            for xx in range(his.shape[1]):
                if min(N - 1, int((xx + 0.5) / s)) == x:
                    px.append((xx, yy, '#%02x%02x%02x' % tuple(his[yy, xx])))
        o = '#%02x%02x%02x' % tuple(ours[y, x])
        print('(%d,%d) ours %s | his %s' % (x, y, o, ' '.join('%d,%d %s' % p for p in px)))
