import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float64)
ch = Image.open(sys.argv[2]).convert('RGBA').crop((24, 24, 88, 126))  # 64x102, feet (40,96)
areas = {'blast': (1630, 480, 1800, 760), 'wall': (760, 1000, 900, 1230), 'aura': (990, 920, 1150, 1200),
         'wall_diag': (1800, 1050, 1980, 1300), 'wall_depth': (310, 1620, 460, 1900)}
def search(name, x0, y0, x1, y1, scales, step):
    best = None
    for s in scales:
        w, h = int(round(64 * s)), int(round(102 * s))
        t = np.asarray(ch.resize((w, h), Image.BOX)).astype(np.float64)
        m = t[..., 3] > 220
        tc = t[..., :3][m]
        for y in range(y0, y1 - h + 1, step):
            for x in range(x0, x1 - w + 1, step):
                e = np.abs(im[y:y + h, x:x + w][m] - tc).mean()
                if best is None or e < best[0]:
                    best = (e, s, x, y)
    return best
for name, (x0, y0, x1, y1) in areas.items():
    b = search(name, x0 - 20, y0 - 20, x1 + 20, y1 + 20, np.arange(2.1, 2.62, 0.04), 3)
    e, s, x, y = b
    b = search(name, x - 6, y - 6, x + int(64 * (s + .05)) + 6, y + int(102 * (s + .05)) + 6, np.arange(s - 0.04, s + 0.041, 0.01), 1)
    e, s, x, y = b
    print(name, 'err %.1f scale %.2f feet (%.0f,%.0f)' % (e, s, x + 40 * s, y + 96 * s))
