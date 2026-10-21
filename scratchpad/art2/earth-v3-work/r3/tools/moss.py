import sys
import numpy as np
from PIL import Image
rev, name = sys.argv[1:3]
d = np.load('%s/k-%s.npz' % (rev, name))
idx, pal = d['idx'], d['pal']
his = np.asarray(Image.open('%s/his-%s.png' % (rev, name)).convert('RGB')).astype(float)
rgba = np.zeros(idx.shape + (4,)); rgba[idx > 0] = pal[idx[idx > 0] - 1]
ours = rgba[..., :3][rgba[..., 3] == 255]
def stats(c, lab):
    g = c[(c[:, 1] > c[:, 0] + 4) & (c[:, 1] > c[:, 2] + 10)]
    L = 0.3 * g[:, 0] + 0.59 * g[:, 1] + 0.11 * g[:, 2]
    print(lab, 'green px', len(g), 'top40 lum %.0f' % np.sort(L)[-40:].mean(), 'mean', g.mean(0).round())
stats(his.reshape(-1, 3), 'his ')
stats(ours, 'ours')
