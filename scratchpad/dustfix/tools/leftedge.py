"""Left edge of the dust per row (dust-coloured pixels only, x < 120) and its longest vertical run: leftedge.py sheet.png [frames]"""
import sys
import numpy as np
from PIL import Image
a = np.array(Image.open(sys.argv[1]).convert('RGBA'))
frames = [int(f) for f in sys.argv[2].split(',')] if len(sys.argv) > 2 else [3, 4, 5, 6, 7]
for f in frames:
    t = a[:, f * 284:(f + 1) * 284]
    r, g, b, al = [t[..., i].astype(int) for i in range(4)]
    warm = (al > 0) & (r - b > 0.3 * r) & (r > g + 8)
    # the pile: the biggest 8-connected warm component's rows
    left = np.full(167, -1)
    for y in range(90, 164):
        xs = np.nonzero(warm[y, :120])[0]
        if len(xs):
            left[y] = xs.min()
    best, run, at = 0, 0, None
    for y in range(91, 164):
        if left[y] >= 0 and left[y] == left[y - 1]:
            run += 1
        else:
            run = 1 if left[y] >= 0 else 0
        if run > best:
            best, at = run, (int(left[y]), y)
    print(f'frame {f}: longest vertical run of the left edge {best} rows (x {at[0]}, ending y {at[1]})')
    print('   ', ' '.join(f'{y}:{left[y]}' for y in range(100, 164) if left[y] >= 0))
