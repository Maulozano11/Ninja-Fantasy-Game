"""Side by side, nearest-scaled: his square (his pixels), his box to N, and each given icon file at N.

usage: python3 -I zoom.py <stage> <jid> <N> <scale> <out.png> <sq0> <file1> [<file2> ...] [--crop x0,y0,x1,y1 (in N coords)]
"""
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-12/tools')
args = sys.argv[1:]
crop = None
if '--crop' in args:
    i = args.index('--crop')
    crop = [int(v) for v in args[i + 1].split(',')]
    args = args[:i] + args[i + 2:]
S, jid, N, k, out, sq0 = args[0], args[1], int(args[2]), int(args[3]), args[4], int(args[5])
files = args[6:]
win = np.asarray(Image.open(f'{S}/ref/{jid}@window.png').convert('RGB'))
sq = win[:, sq0:sq0 + 115]


def box(a, n):
    a = a.astype(float)
    s = a.shape[0] / n
    o = np.zeros((n, n, 3))
    for y in range(n):
        for x in range(n):
            y0, y1, x0, x1 = y * s, (y + 1) * s, x * s, (x + 1) * s
            acc = np.zeros(3)
            wt = 0
            for yy in range(int(y0), int(np.ceil(y1))):
                wy = min(y1, yy + 1) - max(y0, yy)
                for xx in range(int(x0), int(np.ceil(x1))):
                    wx = min(x1, xx + 1) - max(x0, xx)
                    acc += a[yy, xx] * wx * wy
                    wt += wx * wy
            o[y, x] = acc / wt
    return np.clip(o + 0.5, 0, 255).astype(np.uint8)


panels = [box(sq, N)] + [np.asarray(Image.open(f).convert('RGB')) for f in files]
if crop:
    x0, y0, x1, y1 = crop
    panels = [p[y0:y1, x0:x1] for p in panels]
    hs = sq[int(y0 * 115 / N):int(np.ceil(y1 * 115 / N)), int(x0 * 115 / N):int(np.ceil(x1 * 115 / N))]
    hk = (y1 - y0) * k / hs.shape[0]
    hisimg = Image.fromarray(hs).resize((round(hs.shape[1] * hk), round(hs.shape[0] * hk)), Image.NEAREST)
else:
    hisimg = Image.fromarray(sq).resize((panels[0].shape[1] * k, panels[0].shape[0] * k), Image.NEAREST)
ims = [hisimg] + [Image.fromarray(p).resize((p.shape[1] * k, p.shape[0] * k), Image.NEAREST) for p in panels]
W = sum(i.size[0] for i in ims) + 10 * (len(ims) + 1)
H = max(i.size[1] for i in ims) + 20
o = Image.new('RGB', (W, H), (30, 30, 36))
x = 10
for i in ims:
    o.paste(i, (x, 10))
    x += i.size[0] + 10
o.save(out)
print(out, o.size)
