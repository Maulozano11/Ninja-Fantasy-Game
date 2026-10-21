"""Scratch viewer: python3 -I view.py <stageDir> <sprite> <anim> <frames|all> <scale> <out.png> [bg=21,21,29] [crop=x0,y0,x1,y1] [alpha]
Also prints per-step changed px, light, and interior holes."""
import json, os, sys
import numpy as np
from PIL import Image

stage, name, anim, frames, scale, out = sys.argv[1:7]
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in sys.argv[7:])
man = json.load(open(os.path.join(stage, 'manifest.json')))['sprites'][name]
im = np.array(Image.open(os.path.join(stage, man['file'])).convert('RGBA')).astype(np.float64)
fw, fh = man['frameW'], man['frameH']
a = man['anims'][anim]
row, n = a['row'], a['frames']
F = [im[row * fh:(row + 1) * fh, i * fw:(i + 1) * fw] for i in range(n)]
idx = list(range(n)) if frames == 'all' else [int(v) for v in frames.split(',')]
bg = np.array([float(v) for v in opts.get('bg', '21,21,29').split(',')])
crop = [int(v) for v in opts['crop'].split(',')] if 'crop' in opts else [0, 0, fw, fh]
k = int(scale)


def comp(f):
    al = f[..., 3:4] / 255
    return f[..., :3] * al + bg * (1 - al)


tiles = []
for i in idx:
    f = F[i][crop[1]:crop[3], crop[0]:crop[2]]
    c = comp(f) if 'alpha' not in opts else np.repeat(f[..., 3:4], 3, 2)
    t = np.kron(c, np.ones((k, k, 1)))
    lab = np.full((12, t.shape[1], 3), 60.0)
    # frame number as tick marks
    for j in range(i + 1):
        lab[2:10, 3 + j * 4:5 + j * 4] = 230
    tiles.append(np.concatenate([lab, t], 0))
    tiles.append(np.full((tiles[-1].shape[0], 4, 3), 90.0))
strip = np.concatenate(tiles, 1)
Image.fromarray(np.clip(strip, 0, 255).astype(np.uint8)).save(out)


def light(f):
    return (f[..., 3] / 255 * (0.3 * f[..., 0] + 0.59 * f[..., 1] + 0.11 * f[..., 2]) / 255).mean() * 1000


L = [light(f) for f in F]
pk = max(L) or 1
ch = []
for i in range(n):
    j = (i + 1) % n
    if j == 0 and not a.get('loop', True):
        break
    ch.append(int((np.abs(F[i] - F[j]).sum(2) > 24).sum()))
print('light', ' '.join('%.0f' % v for v in L), ' maxstep %.1f%%' % (max(abs(L[i] - L[(i + 1) % n]) for i in range(n - (0 if a.get('loop', True) else 1))) / pk * 100))
print('changed', ch)
holes = []
for f in F:
    al = f[..., 3] > 0
    h = ~al[1:-1, 1:-1] & al[:-2, 1:-1] & al[2:, 1:-1] & al[1:-1, :-2] & al[1:-1, 2:]
    holes.append(int(h.sum()))
print('holes', holes)
