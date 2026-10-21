"""keyview.py <revdir> <name> <out.png> [k]: his crop | ours on his bg | ours on light | ours on grass, from k-<name>.npz."""
import sys
import numpy as np
from PIL import Image
rev, name, out = sys.argv[1:4]
k = int(sys.argv[4]) if len(sys.argv) > 4 else 4
d = np.load('%s/k-%s.npz' % (rev, name))
idx, pal = d['idx'], d['pal']
his = np.asarray(Image.open('%s/his-%s.png' % (rev, name)).convert('RGB')).astype(float)
rgba = np.zeros(idx.shape + (4,))
rgba[idx > 0] = pal[idx[idx > 0] - 1]
def comp(bg):
    A = rgba[..., 3:] / 255
    return rgba[..., :3] * A + np.array(bg, float) * (1 - A)
H, W = idx.shape
hh = np.zeros((H, W, 3)); hh[:min(H, his.shape[0]), :min(W, his.shape[1])] = his[:H, :W]
ims = [hh, comp((34, 34, 45)), comp((222, 214, 190)), comp((90, 120, 60))]
row = np.concatenate([np.concatenate([im, np.zeros((H, 3, 3))], 1) for im in ims], 1)
Image.fromarray(np.clip(row, 0, 255).astype(np.uint8)).resize((row.shape[1] * k, row.shape[0] * k), Image.NEAREST).save(out)
