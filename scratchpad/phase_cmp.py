"""Block spread (std inside his pixels' blocks) per window, for the sheet's one grid phase and for
each phase in a fine sweep: if a window's best phase differs from the sheet's, its pixels are taken
back better with its own."""
import importlib.util, sys
import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location('ifr', sys.argv[1])
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
path = sys.argv[2]
a = np.asarray(Image.open(path).convert('RGB')).astype(float)
g = m.grid(a)
px, py = g['pitch']


def spread(phx, phy, box):
    x0, y0, x1, y1 = box
    xs = [int(np.floor(phx + k * px)) for k in range(481)]
    ys = [int(np.floor(phy + k * py)) for k in range(269)]
    s = []
    for j in range(y0, y1):
        for i in range(x0, x1):
            c = a[ys[j] + 1:ys[j + 1] - 1, xs[i] + 1:xs[i + 1] - 1].reshape(-1, 3)
            s.append(c.std(0).mean())
    return float(np.mean(s))


for box in sys.argv[3:]:
    b = tuple(map(int, box.split(',')))
    base = spread(g['phase'][0], g['phase'][1], b)
    best = min(((spread(fx / 10, fy / 10, b), fx / 10, fy / 10) for fx in range(0, 42, 2) for fy in range(0, 42, 2)))
    print(box, 'sheet phase', g['phase'], round(base, 3), 'best', best)
