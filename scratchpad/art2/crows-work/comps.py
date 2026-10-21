import sys, runpy, io, contextlib
ts = sys.argv[1]
sys.argv = ['m', ts]
with contextlib.redirect_stdout(io.StringIO()):
    g = runpy.run_path('measure.py', run_name='x')
import numpy as np
from collections import deque
def comps(mask):
    H, W = mask.shape
    lab = -np.ones((H, W), int); out = []
    for y, x in zip(*np.nonzero(mask)):
        if lab[y, x] >= 0: continue
        q = deque([(y, x)]); lab[y, x] = len(out); pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and lab[ny, nx] < 0:
                        lab[ny, nx] = len(out); q.append((ny, nx))
        out.append(pts)
    return out
for anim, fr in g['frames'].items():
    for i, f in enumerate(fr):
        small = []
        for pts in comps(f[..., 3] > 0):
            if len(pts) < 30:
                P = np.array(pts)
                c = f[P[:, 0], P[:, 1], :3].astype(int)
                small.append((len(pts), int(P[:, 1].mean()), int(P[:, 0].mean()), int(np.mean(c @ [0.3, 0.55, 0.15]))))
        print(anim, i, sorted(small))
