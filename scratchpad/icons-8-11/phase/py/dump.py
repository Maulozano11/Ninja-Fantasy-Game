"""dump.py <in.png> x0 y0 x1 y1 [what]: prints per pixel C*1000 (or L*100, or hue/10) as a table."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from lab import oklab
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
x0, y0, x1, y1 = map(int, sys.argv[2:6])
what = sys.argv[6] if len(sys.argv) > 6 else 'C'
lab = oklab(a)
L = lab[..., 0]
C = np.hypot(lab[..., 1], lab[..., 2])
H = (np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) + 360) % 360
print('    ' + ''.join('%4d' % x for x in range(x0, x1)))
for y in range(y0, y1):
    row = []
    for x in range(x0, x1):
        if what == 'C':
            v = int(C[y, x] * 1000)
        elif what == 'L':
            v = int(L[y, x] * 100)
        else:
            v = int(H[y, x]) if C[y, x] > 0.02 else -1
        row.append('%4d' % v)
    print('%3d ' % y + ''.join(row))
