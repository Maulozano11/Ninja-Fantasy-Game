# ours.py file.rgba x0 y0 x1 y1 [part]: our render's pixels as hex (and part ids with 'part').
import sys
import numpy as np
G = 256
f = sys.argv[1]
x0, y0, x1, y1 = map(int, sys.argv[2:6])
im = np.frombuffer(open(f, 'rb').read(), np.uint8).reshape(G, G, 4)
print('     ' + ' '.join('%6d' % x for x in range(x0, x1)))
for y in range(y0, y1):
    print('%4d ' % y + ' '.join(('%02x%02x%02x' % tuple(im[y, x, :3])) if im[y, x, 3] else '......' for x in range(x0, x1)))
