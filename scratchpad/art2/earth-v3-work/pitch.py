import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
panels = {
    'bolt': (40, 130, 260, 300), 'stream': (660, 180, 1280, 310), 'breath': (1325, 110, 1630, 355), 'sphere': (1670, 130, 1915, 330),
    'slash': (40, 440, 260, 670), 'multi': (305, 460, 570, 650), 'mhit': (600, 440, 790, 650), 'hit': (820, 440, 1110, 670),
    'blast': (1170, 450, 1640, 795), 'wall': (60, 880, 740, 1240), 'aura': (940, 890, 1185, 1205), 'diag': (1240, 900, 1820, 1470),
    'depth': (35, 1370, 300, 1960),
}
def err(reg, p, ox, oy):
    H, W = reg.shape[:2]
    n_w = int((W - ox) / p) - 1
    n_h = int((H - oy) / p) - 1
    box = (ox, oy, ox + n_w * p, oy + n_h * p)
    img = Image.fromarray(reg.astype(np.uint8))
    small = img.resize((n_w, n_h), Image.BOX, box=box)
    # back up: nearest at the same grid
    xs = ((np.arange(int(box[0]), int(box[2])) + 0.5 - ox) / p).astype(int).clip(0, n_w - 1)
    ys = ((np.arange(int(box[1]), int(box[3])) + 0.5 - oy) / p).astype(int).clip(0, n_h - 1)
    s = np.asarray(small).astype(np.float32)
    up = s[ys][:, xs]
    o = reg[int(box[1]):int(box[3]), int(box[0]):int(box[2])]
    hh, ww = min(up.shape[0], o.shape[0]), min(up.shape[1], o.shape[1])
    return float(np.abs(up[:hh, :ww] - o[:hh, :ww]).mean())
for name, (x0, y0, x1, y1) in panels.items():
    reg = im[y0:y1, x0:x1]
    res = []
    for p in np.arange(2.20, 2.62, 0.02):
        best = min((err(reg, p, ox, oy), ox, oy) for ox in np.arange(0, p, p / 6) for oy in np.arange(0, p, p / 6))
        res.append((best[0], round(p, 2), round(best[1], 2), round(best[2], 2)))
    res.sort()
    print(name, res[:4], 'worst', max(res)[0:2])
