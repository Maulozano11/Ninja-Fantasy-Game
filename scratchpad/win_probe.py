import sys
import numpy as np

SLOTS = {
    '8': [(7, 57, 166, 198), (171, 57, 314, 198), (323, 57, 473, 198)],
    '9': [(6, 76, 119, 186), (124, 76, 237, 186), (243, 76, 355, 186), (361, 76, 473, 186)],
    '10': [(6, 76, 119, 186), (124, 76, 237, 186), (243, 76, 355, 186), (361, 76, 473, 186)],
    '11': [(8, 52, 158, 200), (165, 52, 315, 200), (322, 52, 472, 200)],
}
d = sys.argv[1]
for s, slots in SLOTS.items():
    nat = np.load('%s/native-%s.npy' % (d, s))
    L = nat.mean(2)
    for (x0, y0, x1, y1) in slots:
        h, w = y1 - y0, x1 - x0
        ym0, ym1 = y0 + h // 4, y1 - h // 4
        xm0, xm1 = x0 + w // 4, x1 - w // 4
        colf = [(x, round(float(np.mean(L[ym0:ym1, x] < 30)), 2)) for x in range(x0, x1)]
        rowf = [(y, round(float(np.mean(L[y, xm0:xm1] < 30)), 2)) for y in range(y0, y1)]
        dc = [x for x, f in colf if f >= 0.9]
        dr = [y for y, f in rowf if f >= 0.9]
        print('sheet', s, 'slot', (x0, y0, x1, y1), 'dark cols', dc, 'dark rows', dr)
