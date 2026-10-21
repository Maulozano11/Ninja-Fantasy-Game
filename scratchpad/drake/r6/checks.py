"""Border check for every frame of every vfx_beasts sprite, plus the drake's flash and colour numbers.
python3 -I checks.py <staged vfx_beasts dir>"""
import json
import os
import sys
import numpy as np
from PIL import Image
d = sys.argv[1]
m = json.load(open(os.path.join(d, 'manifest.json')))
bad = 0
for name, sp in m['sprites'].items():
    img = np.asarray(Image.open(os.path.join(d, sp['file'])).convert('RGBA'))
    fw, fh = sp['frameW'], sp['frameH']
    n = 0
    margin = 999
    for anim, a in sp['anims'].items():
        for i in range(a['frames']):
            f = img[a['row'] * fh:(a['row'] + 1) * fh, i * fw:(i + 1) * fw, 3]
            n += 1
            edge = np.concatenate([f[0], f[-1], f[:, 0], f[:, -1]])
            if (edge > 0).any():
                bad += 1
                print('TOUCHES', name, anim, i, 'opaque', int((edge == 255).sum()), 'any', int((edge > 0).sum()))
            ys, xs = np.nonzero(f > 0)
            margin = min(margin, xs.min(), ys.min(), fw - 1 - xs.max(), fh - 1 - ys.max())
    print(f'{name:10s} {fw}x{fh} frames checked {n}, smallest clear margin {margin} px')
print('border problems:', bad)
sp = m['sprites']['earth']
img = np.asarray(Image.open(os.path.join(d, sp['file'])).convert('RGBA')).astype(float)
fw, fh = sp['frameW'], sp['frameH']
fr = [img[:fh, i * fw:(i + 1) * fw] for i in range(sp['anims']['fly']['frames'])]
lw = np.array([0.3, 0.55, 0.15])
L = [(f[..., :3] @ lw)[f[..., 3] == 255].mean() for f in fr]
AL = [((f[..., :3] @ lw) * f[..., 3] / 255).mean() for f in fr]
print('earth mean lum of opaque px', [round(float(v), 1) for v in L])
print('earth mean alpha x lum', [round(float(v), 1) for v in AL])
n = len(fr)
print('steps lum %', [round(float(abs(L[(i + 1) % n] - L[i]) / L[i] * 100), 1) for i in range(n)])
print('steps alpha x lum %', [round(float(abs(AL[(i + 1) % n] - AL[i]) / AL[i] * 100), 1) for i in range(n)])
cols = np.unique(np.concatenate([f.reshape(-1, 4) for f in fr]), axis=0)
cols = cols[cols[:, 3] > 0]
print('earth distinct colours (RGBA, alpha > 0):', len(cols), '; distinct RGB:', len(np.unique(cols[:, :3], axis=0)))
