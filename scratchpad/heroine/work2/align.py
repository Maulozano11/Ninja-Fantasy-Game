"""Best similarity (scale, dx, dy) laying picture B's figure on A's (silhouette IoU), and an overlay."""
import os
import sys
sys.path.insert(0, os.path.abspath('tools/refs'))
import numpy as np
from PIL import Image
import heroine_ref as R

W = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/work2'
a, b = sys.argv[1], sys.argv[2]
NA, NB = np.load(f'{W}/{a}-native.npy'), np.load(f'{W}/{b}-native.npy')
fa, fb = ~R.background(NA), ~R.background(NB)
# rows: only the body region (skip nothing); compare masks after warping B into A's frame
H, Wd = fa.shape
yy, xx = np.mgrid[0:H, 0:Wd]
best = None
ra, rb = np.nonzero(fa.any(1))[0], np.nonzero(fb.any(1))[0]
ca, cb = np.nonzero(fa)[1].mean(), np.nonzero(fb)[1].mean()
for s in np.arange(float(sys.argv[3]), float(sys.argv[4]), 0.005):
    dy0 = ra.min() - rb.min() * s
    dx0 = ca - cb * s
    for dy in np.arange(dy0 - 6, dy0 + 6.1, 1):
        for dx in np.arange(dx0 - 10, dx0 + 10.1, 1):
            bx = ((xx - dx) / s).astype(int)
            by = ((yy - dy) / s).astype(int)
            ok = (bx >= 0) & (bx < fb.shape[1]) & (by >= 0) & (by < fb.shape[0])
            m = np.zeros_like(fa)
            m[ok] = fb[by[ok], bx[ok]]
            iou = (m & fa).sum() / (m | fa).sum()
            if best is None or iou > best[0]:
                best = (iou, s, dx, dy)
    print('s %.3f best so far' % s, best, flush=True) if abs(s * 100 % 2) < 0.01 else None
print('BEST', best)
iou, s, dx, dy = best
bx = ((xx - dx) / s).astype(int)
by = ((yy - dy) / s).astype(int)
ok = (bx >= 0) & (bx < fb.shape[1]) & (by >= 0) & (by < fb.shape[0])
m = np.zeros_like(fa)
m[ok] = fb[by[ok], bx[ok]]
LA = R.luma(NA) < 70
LB = np.zeros_like(fa)
lb = R.luma(NB) < 70
LB[ok] = lb[by[ok], bx[ok]]
img = np.full(NA.shape, 255, np.uint8)
img[fa & ~m] = (255, 200, 200)
img[m & ~fa] = (200, 230, 255)
img[fa & m] = (235, 235, 235)
img[LA & ~LB] = (220, 0, 0)
img[LB & ~LA] = (0, 150, 220)
img[LA & LB] = (0, 0, 0)
R.save(img, f'{W}/overlay-{a}-{b}@4.png', 4)
