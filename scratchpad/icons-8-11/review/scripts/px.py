import sys
import numpy as np
from PIL import Image
src, x0, y0, x1, y1 = sys.argv[1], *map(int, sys.argv[2:6])
a = np.asarray(Image.open(src).convert('RGB')).astype(int)
print('     ' + ' '.join('%6d' % x for x in range(x0, x1)))
for y in range(y0, y1):
    print('%3d  ' % y + ' '.join('%02x%02x%02x' % tuple(a[y, x]) for x in range(x0, x1)))
