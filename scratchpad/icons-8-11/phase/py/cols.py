"""cols.py <in.png>: the most frequent colours among the ninja candidates (solid / smear / skin), with OKLab L C h."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from collections import Counter
from lab import oklab
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
lab = oklab(a.astype(float))
L = lab[..., 0]
C = np.hypot(lab[..., 1], lab[..., 2])
H = (np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) + 360) % 360
solid = (L < 0.5) & (C < 0.1)
smear = ~solid & (L < 0.72) & (C < 0.085)
skin = (H > 20) & (H < 90) & (C > 0.03)
for name, m in (('solid', solid), ('smear', smear), ('skin', skin)):
    cnt = Counter(tuple(v) for v in a[m])
    print(name, m.sum())
    for c, n in cnt.most_common(int(sys.argv[2]) if len(sys.argv) > 2 else 16):
        l = oklab(np.array(c, float))
        print('  #%02x%02x%02x %4d  L %.3f C %.3f h %3.0f' % (c + (n, l[0], np.hypot(l[1], l[2]), (np.degrees(np.arctan2(l[2], l[1])) + 360) % 360)))
    if m.sum():
        print('  L pct 5/25/50/75/95', np.round(np.percentile(L[m], [5, 25, 50, 75, 95]), 3))
