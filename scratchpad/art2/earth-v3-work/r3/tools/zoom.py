"""zoom.py <revdir> <name> <x0> <y0> <w> <h> <out> [k]: his | ours dark | ours light | old light (bak rev) zoom."""
import sys
import numpy as np
from PIL import Image
rev, name = sys.argv[1:3]
x0, y0, w, h = map(int, sys.argv[3:7])
out = sys.argv[7]
k = int(sys.argv[8]) if len(sys.argv) > 8 else 6
def comp(rgba, bg):
    A = rgba[..., 3:] / 255
    return rgba[..., :3] * A + np.array(bg, float) * (1 - A)
def ours(revd):
    d = np.load('%s/k-%s.npz' % (revd, name))
    idx, pal = d['idx'], d['pal']
    rgba = np.zeros(idx.shape + (4,)); rgba[idx > 0] = pal[idx[idx > 0] - 1]
    return rgba
his = np.asarray(Image.open('%s/his-%s.png' % (rev, name)).convert('RGB')).astype(float)
n = ours(rev)
o = ours('rev')
ims = [his[y0:y0 + h, x0:x0 + w], comp(n, (34, 34, 45))[y0:y0 + h, x0:x0 + w], comp(n, (222, 214, 190))[y0:y0 + h, x0:x0 + w], comp(o, (222, 214, 190))[y0:y0 + h, x0:x0 + w]]
ims = [np.pad(i, ((0, h - i.shape[0]), (0, w - i.shape[1]), (0, 0))) for i in ims]
row = np.concatenate([np.concatenate([i, np.zeros((h, 2, 3))], 1) for i in ims], 1)
Image.fromarray(np.clip(row, 0, 255).astype(np.uint8)).resize((row.shape[1] * k, row.shape[0] * k), Image.NEAREST).save(out)
