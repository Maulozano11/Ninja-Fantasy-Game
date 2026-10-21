import os
import sys
sys.path.insert(0, os.path.abspath('tools/refs'))
import numpy as np
from PIL import Image, ImageDraw
import heroine_ref as R


def cluster(px, tol):
    keys, inv, cnt = np.unique((px // 6).astype(int), axis=0, return_inverse=True, return_counts=True)
    inv = inv.ravel()
    cs = []
    for o in np.argsort(-cnt, kind='stable'):
        c = px[inv == o].mean(0)
        if all(R.colour_distance(c, q) > tol for q in cs):
            cs.append(c)
    cs = np.array(cs)
    for _ in range(10):
        lab = np.stack([R.colour_distance(px, c) for c in cs], 1).argmin(1)
        cs = np.array([np.median(px[lab == i], 0) for i in range(len(cs)) if (lab == i).any()])
    lab = np.stack([R.colour_distance(px, c) for c in cs], 1).argmin(1)
    cnt = np.bincount(lab, minlength=len(cs))
    MIN = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    while cnt.min() < MIN:
        cs = np.delete(cs, cnt.argmin(), 0)
        for _ in range(3):
            lab = np.stack([R.colour_distance(px, c) for c in cs], 1).argmin(1)
            cs = np.array([np.median(px[lab == i], 0) for i in range(len(cs)) if (lab == i).any()])
        lab = np.stack([R.colour_distance(px, c) for c in cs], 1).argmin(1)
        cnt = np.bincount(lab, minlength=len(cs))
    return np.round(cs).astype(int), cnt


w = sys.argv[1]
tol = float(sys.argv[2])
N = R.native(w)
fig = ~R.background(N)
px = N[fig].reshape(-1, 3).astype(float)
cs, cnt = cluster(px, tol)
o = np.argsort(R.luma(cs), kind='stable')
cs, cnt = cs[o], cnt[o]
print(w, len(cs))
print(['#%02x%02x%02x' % tuple(c) for c in cs])
print(list(cnt))
# error
d = np.stack([R.colour_distance(px, c) for c in cs], 1).min(1)
print('err median %.1f p95 %.1f max %.1f' % (np.median(d), np.percentile(d, 95), d.max()))
k = 20
im = Image.new('RGB', (min(len(cs), 30) * k, ((len(cs) + 29) // 30) * k), (255, 255, 255))
dr = ImageDraw.Draw(im)
for i, c in enumerate(cs):
    dr.rectangle(((i % 30) * k, (i // 30) * k, (i % 30) * k + k - 2, (i // 30) * k + k - 2), fill=tuple(int(v) for v in c))
im.save(f'/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/heroine/work2/pal-{w}.png')
