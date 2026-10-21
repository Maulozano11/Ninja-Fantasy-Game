import sys
import numpy as np

WINS = {
    '8': [(14, 64, 157, 191), (179, 64, 307, 191), (331, 64, 466, 191)],
    '9': [(14, 83, 112, 179), (132, 83, 230, 179), (250, 83, 348, 179), (368, 83, 466, 179)],
    '10': [(14, 83, 112, 179), (132, 83, 230, 179), (250, 83, 348, 179), (368, 83, 466, 179)],
    '11': [(16, 61, 150, 191), (173, 61, 307, 191), (330, 61, 464, 191)],
}
d = sys.argv[1]
for s, wins in WINS.items():
    nat = np.load('%s/native-%s.npy' % (d, s))
    L = nat.mean(2)
    for (x0, y0, x1, y1) in wins:
        sides = [L[y0:y1, x0 - 1], L[y0:y1, x1], L[y0 - 1, x0:x1], L[y1, x0:x1]]
        inner = [L[y0:y1, x0], L[y0:y1, x1 - 1], L[y0, x0:x1], L[y1 - 1, x0:x1]]
        print(s, (x0, y0, x1, y1), (x1 - x0, y1 - y0), 'outside line dark', [round(float(np.mean(v < 30)), 2) for v in sides], 'first art line dark', [round(float(np.mean(v < 30)), 2) for v in inner])
