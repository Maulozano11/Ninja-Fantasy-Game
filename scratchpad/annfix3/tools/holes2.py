# like holes.py, but splits the holes: above the wall's bottom (under the dragon) vs the ground patches below it
import sys, os
import numpy as np
from PIL import Image
X0, X1, Y0, Y1 = 180, 940, 430, 940
R = 9
def shift_or(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r: continue
            out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out
wall = np.array(Image.open(sys.argv[1]).convert('RGBA'))[..., 3] > 0  # the s_wall piece in frame coords
H, W = wall.shape
bottom = np.full(W, -1)
for x in range(W):
    ys = np.nonzero(wall[:, x])[0]
    if len(ys): bottom[x] = ys.max()
# the glowing bed's bottom line: smooth over columns (the ground patches hang below it)
d = sys.argv[2]
names = sys.argv[3:] or sorted(n[:-4] for n in os.listdir(d) if n.endswith('.png'))
yy = np.arange(H)[:, None]
for n in names:
    f = np.array(Image.open(os.path.join(d, n + '.png')).convert('RGBA'))
    a = f[..., 3]
    if f.shape[1] != W:
        pad = np.zeros((H, f.shape[1]), bool); pad[:, :W] = wall; 
    op = a == 255
    roi = np.zeros_like(op); roi[Y0:Y1, X0:X1] = True
    holes = ~shift_or(~shift_or(op, R), R) & ~op & roi
    b = np.zeros(op.shape[1]); b[:W] = np.where(bottom < 0, 0, bottom)
    ground = yy > (b[None, :] - 40)
    print(f'{n:8s} holes {int(holes.sum()):6d} = under-dragon {int((holes & ~ground).sum()):6d} + ground-edge {int((holes & ground).sum()):5d}   border-px {int((a[0]>0).sum()+(a[-1]>0).sum()+(a[:,0]>0).sum()+(a[:,-1]>0).sum())}')
