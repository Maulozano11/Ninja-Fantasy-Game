"""Zoom a region of the reduced reference and our render side by side.
python3 -I zoom.py <repo> <render.png> <out.png> x0 y0 x1 y1 k"""
import sys
import os
repo, ren, out = sys.argv[1:4]
x0, y0, x1, y1, k = map(int, sys.argv[4:9])
sys.path.insert(0, os.path.join(repo, 'tools/refs'))
os.chdir(repo)
import numpy as np
from PIL import Image
import scarlet_ref as S

red = S.reduced()
ours = np.asarray(Image.open(ren).convert('RGBA'))
bg = np.array([236, 230, 220, 255], np.uint8)
def on_bg(a):
    o = np.empty_like(a)
    o[:] = bg
    m = a[..., 3] > 0
    o[m] = a[m]
    return o
def up(a):
    return np.kron(a, np.ones((k, k, 1), np.uint8))
def grid(a):
    a = a.copy()
    a[::k, :, :3] = (a[::k, :, :3] * 0.85).astype(np.uint8)
    a[:, ::k, :3] = (a[:, ::k, :3] * 0.85).astype(np.uint8)
    return a
A = grid(up(on_bg(red)[y0:y1, x0:x1]))
B = grid(up(on_bg(ours)[y0:y1, x0:x1]))
row = np.concatenate([A, np.full((A.shape[0], 10, 4), 255, np.uint8), B], 1)
Image.fromarray(row).save(out)
