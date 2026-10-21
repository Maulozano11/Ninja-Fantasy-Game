import sys
import numpy as np

d = sys.argv[1]
s = sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
nat = np.load('%s/native-%s.npy' % (d, s))
L = nat.mean(2)
h, w = y1 - y0, x1 - x0
ym0, ym1 = y0 + h // 4, y1 - h // 4
xm0, xm1 = x0 + w // 4, x1 - w // 4
print('cols:', ' '.join('%d:%.2f/%d' % (x, np.mean(L[ym0:ym1, x] < 30), np.median(L[ym0:ym1, x])) for x in range(x0, x1) if x < x0 + 12 or x > x1 - 13))
print('rows:', ' '.join('%d:%.2f/%d' % (y, np.mean(L[y, xm0:xm1] < 30), np.median(L[y, xm0:xm1])) for y in range(y0, y1) if y < y0 + 12 or y > y1 - 13))
