"""Draft: her waist, belts and skirt brought to our frame by a column map fitted to our body
(her waist on ours, her crotch on ours), nearest sampling of her native pixels quantized to her
palette. Writes a PNG at 1x (our frame) and at 10x beside her native at 5x, and prints the rows as
palette indices.

  python3 -I draft.py <outdir>   (run from the worktree root)
"""
import sys
import os
sys.path.insert(0, 'tools/refs')
import numpy as np
from PIL import Image
import heroine_ref as R

out = sys.argv[1]
N = R.native('saya')
fig = R.figure('saya')
Q = R.quantize(N, 'saya')
P = R.rgb('saya')

# knots: her y, our y, her mid x, our mid x, sx (our px per hers across)
KN = np.array([
    (76.0, 165.0, 106.0, 126.5, 0.40),
    (82.0, 168.0, 106.0, 126.5, 0.42),
    (100.0, 177.0, 105.0, 126.5, 0.54),
    (118.0, 185.5, 106.0, 127.0, 0.50),
])
seg = {'kind': 'column', 'knots': [tuple(k) for k in KN]}
img = np.zeros((256, 256, 4), np.uint8)
idx = np.full((256, 256), 255, np.int32)
ys, xs = np.mgrid[150:200, 95:160]
q = np.stack([xs.ravel() + 0.5, ys.ravel() + 0.5], 1)
h = R.backward(seg, q)
hx = np.floor(h[:, 0]).astype(int)
hy = np.floor(h[:, 1]).astype(int)
ok = (hx >= 0) & (hx < N.shape[1]) & (hy >= 0) & (hy < N.shape[0])
for (x, y), a, b, o in zip(q.astype(int), hx, hy, ok):
    if not o or not fig[b, a] or b < 74 or b > 122:
        continue
    idx[y, x] = Q[b, a]
    img[y, x, :3] = P[Q[b, a]]
    img[y, x, 3] = 255
Image.fromarray(img).save(os.path.join(out, 'draft@1.png'))
np.save(os.path.join(out, 'draft-idx.npy'), idx)
