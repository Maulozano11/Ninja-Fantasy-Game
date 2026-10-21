import sys, json, os
import numpy as np
from PIL import Image
old, new = sys.argv[1:3]
def frames(G):
    m = json.load(open(os.path.join(G, 'manifest.json')))['sprites']['wall_depth']
    sh = np.asarray(Image.open(os.path.join(G, m['file'])).convert('RGBA'))
    out = {}
    for an, a in m['anims'].items():
        out[an] = [sh[a['row'] * m['frameH']:(a['row'] + 1) * m['frameH'], i * m['frameW']:(i + 1) * m['frameW']] for i in range(a['frames'])]
    return out, m
O, mo = frames(old); N, mn = frames(new)
print('old', mo['frameW'], mo['frameH'], mo['anchor'], {k: len(v) for k, v in O.items()}, 'new', mn['frameW'], mn['frameH'], mn['anchor'], {k: len(v) for k, v in N.items()})
for j, f in [(3, 0), (5, 1), (7, 2), (9, 3), (10, 4), (11, 5)]:
    print('rise new', j, '== old', f, bool((N['rise'][j] == O['rise'][f]).all()))
for j in range(0, 8, 2):
    print('idle new', j, '== old', j // 2, bool((N['idle'][j] == O['idle'][j // 2]).all()))
