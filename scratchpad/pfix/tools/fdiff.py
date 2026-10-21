"""fdiff.py <G> <sprite> <anim> <key>: mean |RGB diff| (composited on the panel colour) of each frame against the key frame, over pixels drawn in either."""
import sys, json, os
import numpy as np
from PIL import Image
G, n, an, k = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
m = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][n]
sh = np.asarray(Image.open(os.path.join(G, m['file'])).convert('RGBA')).astype(float)
a = m['anims'][an]
fr = [sh[a['row'] * m['frameH']:(a['row'] + 1) * m['frameH'], i * m['frameW']:(i + 1) * m['frameW']] for i in range(a['frames'])]
BG = np.array([31, 33, 46.])
comp = [f[..., :3] * f[..., 3:] / 255 + BG * (1 - f[..., 3:] / 255) for f in fr]
K = comp[k]
out = []
for i, c in enumerate(comp):
    drawn = (fr[i][..., 3] > 0) | (fr[k][..., 3] > 0)
    out.append(np.abs(c - K).mean(-1)[drawn].mean())
print(n, an, 'vs', k, ' '.join('%d:%.1f' % (i, v) for i, v in enumerate(out)))
