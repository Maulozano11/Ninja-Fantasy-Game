import numpy as np
from PIL import Image
r = np.asarray(Image.open('../art2/REF-wind-set-owner.jpg').convert('RGB')).astype(int)
line = (np.abs(r - np.array([40, 40, 50])).sum(2) <= 12)
approx = {
 'bolt': (8, 24, 93, 116), 'stream': (277, 24, 523, 115), 'breath': (531, 24, 639, 114), 'sphere': (648, 24, 732, 115),
 'slash': (8, 166, 92, 261), 'multi': (125, 165, 210, 256), 'hit': (241, 166, 327, 271), 'blast': (360, 163, 621, 341),
 'wall': (7, 352, 403, 504), 'wall_diag': (412, 352, 739, 653), 'wall_depth': (8, 664, 149, 1015), 'aura': (211, 664, 335, 826),
}
for k, (x0, y0, x1, y1) in approx.items():
    x0 -= 3; x1 += 3; y1 += 3
    sub = line[y0:y1, x0:x1]
    colsum = sub.sum(0); rowsum = sub.sum(1)
    H, W = sub.shape
    cx = [x0 + i for i in range(W) if colsum[i] > 0.5 * H * 0.6]
    ry = [y0 + i for i in range(H) if rowsum[i] > 0.5 * W * 0.8]
    print(k, 'cols', cx, 'rows', ry)
