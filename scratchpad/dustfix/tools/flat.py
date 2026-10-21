"""Flat-base check: per frame, the dust's lower edge (lowest drawn pixel per column, x < XMAX) and its longest flat run."""
import sys
import numpy as np
from PIL import Image
a = np.array(Image.open(sys.argv[1]).convert('RGBA'))
XMAX = 195
for f in range(8):
    t = a[:, f * 284:(f + 1) * 284, 3]
    low = np.full(284, -1)
    for x in range(XMAX):
        ys = np.nonzero(t[100:, x])[0]
        if len(ys):
            low[x] = ys.max() + 100
    xs = np.nonzero(low >= 0)[0]
    # longest run of equal lowest y over consecutive columns
    best, run, by = 0, 0, None
    for i in range(len(xs)):
        if i and xs[i] == xs[i - 1] + 1 and low[xs[i]] == low[xs[i - 1]]:
            run += 1
        else:
            run = 1
        if run > best:
            best, by = run, low[xs[i]]
    row163 = int((t[163, :XMAX] > 0).sum())
    r163 = t[163, :XMAX] > 0
    # longest run on row 163
    m, c = 0, 0
    for v in r163:
        c = c + 1 if v else 0
        m = max(m, c)
    alphas = {int(v): int((t[158:164, :XMAX] == v).sum()) for v in (95, 160, 255)}
    print(f'frame {f}: longest flat lower edge {best} px at y {by}; row 163: {row163} px, longest run {m}; alphas rows 158-163 {alphas}')
