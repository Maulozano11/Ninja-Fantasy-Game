# usage: python3 -I holes.py <frames_dir> [names...]  -> per-frame hole counts (same rule as annfix/check_holes.py)
import sys, os
import numpy as np
from PIL import Image
W, H = 1056, 968
X0, X1, Y0, Y1 = 180, 940, 430, 940
R = 9
def shift_or(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r: continue
            out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out
def closing(m, r):
    return ~shift_or(~shift_or(m, r), r)
d = sys.argv[1]
names = sys.argv[2:] or sorted(n[:-4] for n in os.listdir(d) if n.endswith('.png'))
tot = 0
for n in names:
    f = np.array(Image.open(os.path.join(d, n + '.png')).convert('RGBA'))
    a = f[..., 3]
    opaque = a == 255
    roi = np.zeros_like(opaque); roi[Y0:Y1, X0:X1] = True
    holes = closing(opaque, R) & ~opaque & roi
    semi = (a > 0) & (a < 255) & roi
    edge = int((a[0] > 0).sum() + (a[-1] > 0).sum() + (a[:, 0] > 0).sum() + (a[:, -1] > 0).sum())
    print(f'{n:8s} holes {int(holes.sum()):6d} (clear {int((holes & (a == 0)).sum()):6d})  translucent-in-band {int(semi.sum()):5d}  border-px {edge}')
