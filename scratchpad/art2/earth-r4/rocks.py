"""rocks.py <group> <sprite> <anim>: per frame, opaque rock pieces (8-connected, alpha 255) >= 15 px: size@centre (relative to anchor)."""
import json, sys
import numpy as np
from PIL import Image
G, name, anim = sys.argv[1:4]
m = json.load(open(G + '/manifest.json'))['sprites'][name]
im = np.asarray(Image.open(G + '/' + m['file']).convert('RGBA'))
W, H = m['frameW'], m['frameH']; ax, ay = m['anchor']
d = m['anims'][anim]
def comps(a):
    seen = np.zeros(a.shape, bool); out = []
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x] and not seen[y, x]:
                st = [(y, x)]; seen[y, x] = True; px = []
                while st:
                    j, i = st.pop(); px.append((j, i))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            v, u = j + dy, i + dx
                            if 0 <= v < a.shape[0] and 0 <= u < a.shape[1] and a[v, u] and not seen[v, u]:
                                seen[v, u] = True; st.append((v, u))
                out.append(px)
    return out
for i in range(d['frames']):
    f = im[d['row'] * H:(d['row'] + 1) * H, i * W:(i + 1) * W]
    op = f[..., 3] == 255
    cs = [c for c in comps(op) if len(c) >= 15]
    cs.sort(key=lambda c: -len(c))
    print('f%-2d opaque %5d  ' % (i, op.sum()) + ' '.join('%d@(%d,%d)' % (len(c), np.mean([p[1] for p in c]) - ax, np.mean([p[0] for p in c]) - ay) for c in cs[:9]))
