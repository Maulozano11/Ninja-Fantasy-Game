"""Compare our idle render with the reduced reference: python3 -I diff.py <repo> <render.png> <out.png>"""
import sys
import os
repo, ren, out = sys.argv[1:4]
sys.path.insert(0, os.path.join(repo, 'tools/refs'))
os.chdir(repo)
import numpy as np
from PIL import Image
import scarlet_ref as S

red = S.reduced()
ours = np.asarray(Image.open(ren).convert('RGBA'))
mr = red[..., 3] > 0
mo = ours[..., 3] > 0
both = mr & mo
same = both & np.all(red[..., :3] == ours[..., :3], -1)
print('ref px', mr.sum(), 'ours px', mo.sum(), 'both', both.sum(), 'same colour', same.sum())
print('ref only', (mr & ~mo).sum(), 'ours only', (mo & ~mr).sum(), 'colour differs', (both & ~same).sum())
pal = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in S.PALETTE}
cols = {tuple(c) for c in ours[mo][:, :3]}
print('our colours not his:', len(cols - pal), sorted('#%02x%02x%02x' % c for c in cols - pal)[:40])
ys, xs = np.nonzero(mr | mo)
y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
print('box', x0, y0, x1, y1)
k = 6
def up(a):
    return np.kron(a, np.ones((k, k, 1), np.uint8))
bg = np.array([236, 230, 220, 255], np.uint8)
def on_bg(a):
    o = np.empty_like(a)
    o[:] = bg
    m = a[..., 3] > 0
    o[m] = a[m]
    return o
diff = np.zeros_like(red)
diff[:] = bg
diff[both & ~same] = [230, 40, 40, 255]
diff[mr & ~mo] = [40, 90, 230, 255]
diff[mo & ~mr] = [40, 170, 60, 255]
diff[same] = [150, 150, 150, 255]
crop = lambda a: a[y0:y1, x0:x1]
row = np.concatenate([up(crop(on_bg(red))), np.full(((y1 - y0) * k, 8, 4), 255, np.uint8), up(crop(on_bg(ours))), np.full(((y1 - y0) * k, 8, 4), 255, np.uint8), up(crop(diff))], 1)
Image.fromarray(row).save(out)
# where are differences, grouped by part
parts = S.reduced_parts()
for name, m in parts.items():
    d = m & ((both & ~same) | (mr & ~mo))
    if d.sum():
        print(name, 'differs', int(d.sum()))
