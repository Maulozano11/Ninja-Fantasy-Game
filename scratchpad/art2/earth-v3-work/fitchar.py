import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float64)
ch = Image.open(sys.argv[2]).convert('RGBA')
# rough feet positions (his coords) for each character, refined by search
guesses = {'blast': (1690, 735), 'wall': (800, 1170), 'aura': (1020, 1135), 'wall_diag': (1830, 1255), 'wall_depth': (365, 1840)}
def fit(name, gx, gy, scales, rng, step):
    best = None
    for s in scales:
        n = int(round(128 * s))
        t = np.asarray(ch.resize((n, n), Image.BILINEAR)).astype(np.float64)
        a = t[..., 3] / 255
        m = a > 0.6
        # feet in template: (64*s, 120*s)
        fx, fy = 64 * s, 120 * s
        for dy in range(-rng, rng + 1, step):
            for dx in range(-rng, rng + 1, step):
                x0 = int(round(gx + dx - fx)); y0 = int(round(gy + dy - fy))
                if x0 < 0 or y0 < 0 or x0 + n > im.shape[1] or y0 + n > im.shape[0]:
                    continue
                win = im[y0:y0 + n, x0:x0 + n]
                e = np.abs(win[m] - t[..., :3][m]).mean()
                if best is None or e < best[0]:
                    best = (e, s, gx + dx, gy + dy)
    return best
for name, (gx, gy) in guesses.items():
    b = fit(name, gx, gy, np.arange(2.1, 2.7, 0.05), 30, 3)
    b = fit(name, b[2], b[3], np.arange(b[1] - 0.05, b[1] + 0.051, 0.01), 4, 1)
    print(name, 'err %.1f scale %.2f feet (%d, %d)' % b)
